import { createGoogleSheetsStore, googleSheetsConfigured } from './googleSheets';
import { createNetlifyFormsStore, netlifyFormsConfigured } from './netlifyForms';
import { createBlobsStore, blobsConfigured } from './blobs';
import { createFileStore } from './file';
import type { Signup, SignupStore } from './types';

export * from './types';

/**
 * Every backend that could take a signup here, most durable first.
 *
 *   1. Google Sheets — yours, portable, survives changing host.
 *   2. Netlify Blobs — no credentials, persists, readable via /api/signups.
 *   3. Netlify Forms — no credentials, readable in the dashboard.
 *   4. CSV — local development only.
 *
 * "Configured" is not the same as "working". A backend can look available from
 * its environment variables and still refuse the write — Blobs needs a context
 * the runtime does not always inject, and Forms needs a form the build scanner
 * may never have registered. Both fail at write time, not at selection time,
 * which is why this returns a list rather than a single choice.
 */
function candidates(): SignupStore[] {
  const found: SignupStore[] = [];

  if (googleSheetsConfigured()) {
    const s = createGoogleSheetsStore();
    if (s) found.push(s);
  }

  if (blobsConfigured()) {
    const s = createBlobsStore();
    if (s) found.push(s);
  }

  if (netlifyFormsConfigured()) {
    const s = createNetlifyFormsStore();
    if (s) found.push(s);
  }

  const allowFile =
    process.env.NODE_ENV !== 'production' || process.env.CAPTURE_ALLOW_CSV === 'true';
  if (allowFile) found.push(createFileStore());

  return found;
}

/**
 * Writes a signup to the first backend that accepts it.
 *
 * Trying them in turn rather than committing to one is deliberate: a signup
 * lost because the chosen backend happened to be misconfigured is the worst
 * outcome here, and every alternative is strictly better than dropping it.
 * Only if all of them fail does this throw, and then the reasons travel with
 * the error so the log says which ones were tried and why each refused.
 */
export async function persistSignup(signup: Signup): Promise<{ store: string }> {
  const stores = candidates();

  if (!stores.length) {
    throw new Error(
      'No signup store available. Set GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL ' +
        'and GOOGLE_PRIVATE_KEY for Google Sheets, deploy to Netlify for Blobs, or set ' +
        'CAPTURE_ALLOW_CSV=true to accept the ephemeral CSV fallback.',
    );
  }

  const failures: string[] = [];

  for (const store of stores) {
    try {
      await store.append(signup);
      return { store: store.name };
    } catch (error) {
      failures.push(`${store.name}: ${(error as Error).message}`);
    }
  }

  throw new Error(`All signup stores failed — ${failures.join(' | ')}`);
}

/**
 * What each backend says when asked to prove it works.
 *
 * Reports availability and the exact write error per backend, and nothing
 * else — no credentials, no environment values, no captured signups.
 */
export async function describeStores() {
  const probe: Signup = {
    name: 'health check',
    phone: '+910000000000',
    timestamp: new Date().toISOString(),
    source: 'health-check',
    referrer: '',
    consent: true,
    consentText: 'health check — not a real signup',
    consentVersion: 'health',
    country: 'IN',
    ipHash: 'health',
    userAgent: 'health',
  };

  const stores = candidates();

  const results = await Promise.all(
    stores.map(async (store) => {
      try {
        await store.append(probe);
        return { store: store.name, writable: true, error: null };
      } catch (error) {
        return { store: store.name, writable: false, error: (error as Error).message.slice(0, 300) };
      }
    }),
  );

  return {
    // Presence only — never the value.
    env: {
      NETLIFY: Boolean(process.env.NETLIFY),
      NETLIFY_BLOBS_CONTEXT: Boolean(process.env.NETLIFY_BLOBS_CONTEXT),
      URL: Boolean(process.env.URL),
      GOOGLE_SHEETS_ID: Boolean(process.env.GOOGLE_SHEETS_ID),
      CAPTURE_ALLOW_CSV: process.env.CAPTURE_ALLOW_CSV === 'true',
      CAPTURE_ADMIN_TOKEN: Boolean(process.env.CAPTURE_ADMIN_TOKEN),
      NODE_ENV: process.env.NODE_ENV,
    },
    candidates: stores.map((s) => s.name),
    results,
    // A health-check row is written to whichever backend works, so these are
    // safe to delete from wherever they land.
    note: 'Rows named "health check" are from this endpoint and can be deleted.',
  };
}

/** Kept for callers that only need a destination, not the fallback chain. */
export function getStore(): SignupStore {
  const [first] = candidates();
  if (!first) throw new Error('No signup store available.');
  return first;
}
