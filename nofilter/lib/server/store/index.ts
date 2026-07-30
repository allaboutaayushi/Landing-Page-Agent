import { createGoogleSheetsStore, googleSheetsConfigured } from './googleSheets';
import { createFileStore } from './file';
import type { SignupStore } from './types';

export * from './types';

let cached: SignupStore | null = null;

/**
 * Picks a destination for captured numbers.
 *
 * Google Sheets when it's configured; CSV otherwise. The CSV path is refused
 * in production unless explicitly opted into, because a serverless filesystem
 * would silently drop every row on the next deploy — losing signups quietly is
 * far worse than failing loudly at boot.
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

  const allowFile =
    process.env.NODE_ENV !== 'production' || process.env.CAPTURE_ALLOW_CSV === 'true';

  if (!allowFile) {
    throw new Error(
      'No signup store configured. Set GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL ' +
        'and GOOGLE_PRIVATE_KEY, or set CAPTURE_ALLOW_CSV=true to accept the ' +
        'ephemeral CSV fallback.',
    );
  }

  cached = createFileStore();
  return cached;
}
