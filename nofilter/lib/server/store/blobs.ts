import { getStore as getBlobStore } from '@netlify/blobs';
import { SIGNUP_COLUMNS, type Signup, type SignupStore } from './types';

/**
 * Netlify Blobs.
 *
 * Chosen as the default on Netlify because it depends on nothing we cannot
 * verify. Netlify Forms needs the build scanner to find a form in the publish
 * directory and needs form detection switched on in the dashboard — two things
 * that fail silently and leave the signup with nowhere to go. Blobs is
 * configured automatically inside the function, persists across deploys, and
 * either writes or throws.
 *
 * Rows are stored one blob per signup rather than as a single appended
 * document, because two submissions arriving together would otherwise
 * read-modify-write over each other and one would be lost.
 */

const STORE_NAME = 'nf-signups';

/**
 * Manual credentials, for when the runtime does not inject a blobs context.
 *
 * `NETLIFY` being set is not enough on its own — that only says we are on the
 * platform. The SDK needs NETLIFY_BLOBS_CONTEXT, which the Next runtime does
 * not always provide to a route handler, and without it every write fails with
 * "The environment has not been configured to use Netlify Blobs". Treating the
 * platform flag as proof of availability is what made the store claim it could
 * write and then refuse every signup.
 */
function manualCredentials() {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_API_TOKEN;
  return siteID && token ? { siteID, token } : null;
}

export function blobsConfigured() {
  return Boolean(process.env.NETLIFY_BLOBS_CONTEXT) || manualCredentials() !== null;
}

function store() {
  const manual = manualCredentials();
  return getBlobStore({
    name: STORE_NAME,
    consistency: 'strong',
    ...(manual ?? {}),
  });
}

export function createBlobsStore(): SignupStore | null {
  if (!blobsConfigured()) return null;

  return {
    name: 'netlify-blobs',
    async append(signup: Signup) {
      // Timestamp first so keys sort chronologically, with a random suffix so
      // two signups in the same millisecond cannot collide.
      const key = `${signup.timestamp}-${Math.random().toString(36).slice(2, 8)}`;
      await store().setJSON(key, signup);
    },
  };
}

/** One captured row, plus the key it is stored under. */
export type StoredSignup = Signup & { key: string };

/**
 * Every key, newest first.
 *
 * Listing returns keys only — no bodies — so this stays one cheap call however
 * many signups exist. Keys begin with the ISO timestamp, so sorting the
 * strings sorts chronologically without reading a single record.
 */
async function keysNewestFirst(): Promise<string[]> {
  const { blobs } = await store().list();
  return blobs.map((b) => b.key).sort((a, b) => b.localeCompare(a));
}

/** How many signups exist, without fetching any of them. */
export async function countSignups(): Promise<number> {
  return (await keysNewestFirst()).length;
}

/** Fetches the bodies for a set of keys, dropping any that have gone missing. */
async function fetchKeys(keys: string[]): Promise<StoredSignup[]> {
  const s = store();
  const rows = await Promise.all(
    keys.map(async (key) => {
      const value = (await s.get(key, { type: 'json' })) as Signup | null;
      return value ? { ...value, key } : null;
    }),
  );
  return rows.filter((r): r is StoredSignup => r !== null);
}

/**
 * One page of signups, newest first.
 *
 * Reading every record to show fifty of them was the ceiling on this page:
 * one network round-trip per signup meant the function timed out somewhere
 * around two thousand. Paging the keys first and fetching only the page being
 * displayed makes the cost of a page view constant no matter how many signups
 * have accumulated.
 */
export async function readSignupPage(
  offset: number,
  limit: number,
): Promise<{ rows: StoredSignup[]; total: number }> {
  const keys = await keysNewestFirst();
  const rows = await fetchKeys(keys.slice(offset, offset + limit));
  return { rows, total: keys.length };
}

/**
 * Every signup, yielded in batches.
 *
 * Only for the CSV export, which genuinely needs all of them. Streaming in
 * batches keeps the whole set from being held in memory at once, and lets the
 * response start before the last record has been read.
 */
export async function* streamAllSignups(batchSize = 100): AsyncGenerator<StoredSignup[]> {
  const keys = await keysNewestFirst();
  for (let i = 0; i < keys.length; i += batchSize) {
    yield await fetchKeys(keys.slice(i, i + batchSize));
  }
}

/** Escaped so a name beginning = + - or @ cannot execute when opened in Excel. */
const cell = (value: string | boolean) => {
  const str = String(value);
  const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const csvHeader = () => SIGNUP_COLUMNS.join(',');

export const csvRow = (row: StoredSignup) =>
  SIGNUP_COLUMNS.map((c) => cell(row[c])).join(',');
