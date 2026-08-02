import { createGoogleSheetsStore, googleSheetsConfigured } from './googleSheets';
import { createNetlifyFormsStore, netlifyFormsConfigured } from './netlifyForms';
import { createFileStore } from './file';
import type { SignupStore } from './types';

export * from './types';

let cached: SignupStore | null = null;

/**
 * Picks a destination for captured signups, most durable first.
 *
 *   1. Google Sheets — yours, portable, survives changing host. Needs three
 *      variables, so it only wins when someone has actually set them up.
 *   2. Netlify Forms — no credentials at all, and readable in the dashboard.
 *      Free on any Netlify deploy, which makes it the right default there
 *      rather than failing and losing the signup.
 *   3. CSV — local development only.
 *
 * The CSV path is refused in production unless explicitly opted into, because
 * a serverless filesystem silently drops every row on the next invocation, and
 * losing signups quietly is far worse than failing loudly at boot.
 */
export function getStore(): SignupStore {
  if (cached) return cached;

  if (googleSheetsConfigured()) {
    const sheets = createGoogleSheetsStore();
    if (sheets) {
      cached = sheets;
      return cached;
    }
  }

  if (netlifyFormsConfigured()) {
    const forms = createNetlifyFormsStore();
    if (forms) {
      cached = forms;
      return cached;
    }
  }

  const allowFile =
    process.env.NODE_ENV !== 'production' || process.env.CAPTURE_ALLOW_CSV === 'true';

  if (!allowFile) {
    throw new Error(
      'No signup store configured. Set GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL ' +
        'and GOOGLE_PRIVATE_KEY for Google Sheets, deploy to Netlify to use Netlify ' +
        'Forms with no configuration at all, or set CAPTURE_ALLOW_CSV=true to accept ' +
        'the ephemeral CSV fallback.',
    );
  }

  cached = createFileStore();
  return cached;
}
