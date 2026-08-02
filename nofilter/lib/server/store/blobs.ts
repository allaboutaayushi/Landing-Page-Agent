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

export function blobsConfigured() {
  // Set by Netlify in both build and function runtimes. Without it the SDK
  // has no site context and would need manual credentials.
  return Boolean(process.env.NETLIFY);
}

function store() {
  return getBlobStore({ name: STORE_NAME, consistency: 'strong' });
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
 * Reads every signup back, newest first.
 *
 * Only ever called from the admin route, which refuses to run without a token.
 */
export async function readAllSignups(): Promise<StoredSignup[]> {
  const s = store();
  const { blobs } = await s.list();

  const rows = await Promise.all(
    blobs.map(async ({ key }) => {
      const value = (await s.get(key, { type: 'json' })) as Signup | null;
      return value ? { ...value, key } : null;
    }),
  );

  return rows
    .filter((r): r is StoredSignup => r !== null)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/** Escaped so a name beginning = + - or @ cannot execute when opened in Excel. */
export function toCsv(rows: StoredSignup[]) {
  const cell = (value: string | boolean) => {
    const str = String(value);
    const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const header = SIGNUP_COLUMNS.join(',');
  const body = rows.map((row) => SIGNUP_COLUMNS.map((c) => cell(row[c])).join(','));
  return [header, ...body].join('\n');
}
