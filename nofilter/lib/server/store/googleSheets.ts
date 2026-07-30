import { JWT } from 'google-auth-library';
import { SIGNUP_COLUMNS, type Signup, type SignupStore } from './types';

/**
 * Appends each signup as a row in a Google Sheet.
 *
 * A service account is used rather than an API key, because the sheet must not
 * be public for this to work — you share the sheet with the service account's
 * address and nothing else changes. The private key never leaves the server:
 * this module is only ever imported from a route handler.
 */

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let cachedClient: JWT | null = null;

function credentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEETS_ID;

  if (!email || !rawKey || !sheetId) return null;

  // Dashboards and .env files store the key with literal \n; PEM needs real ones.
  const key = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

  return { email, key, sheetId };
}

export function googleSheetsConfigured() {
  return credentials() !== null;
}

function client(email: string, key: string) {
  if (!cachedClient) {
    cachedClient = new JWT({ email, key, scopes: SCOPES });
  }
  return cachedClient;
}

export function createGoogleSheetsStore(): SignupStore | null {
  const creds = credentials();
  if (!creds) return null;

  const tab = process.env.GOOGLE_SHEETS_TAB || 'Signups';

  return {
    name: 'google-sheets',
    async append(signup: Signup) {
      const auth = client(creds.email, creds.key);
      const { token } = await auth.getAccessToken();
      if (!token) throw new Error('Google auth returned no access token');

      // valueInputOption=RAW below means Sheets stores every cell verbatim and
      // never parses formulas, so no escaping is needed here — and crucially
      // the phone lands as a clean +E.164 string rather than something a
      // downstream WhatsApp integration has to strip a quote prefix off.
      const row = SIGNUP_COLUMNS.map((col) => {
        const value = signup[col];
        return typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : value;
      });

      const range = encodeURIComponent(`${tab}!A:J`);
      const url =
        `https://sheets.googleapis.com/v4/spreadsheets/${creds.sheetId}` +
        `/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [row] }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Sheets append failed (${res.status}): ${detail.slice(0, 300)}`);
      }
    },
  };
}
