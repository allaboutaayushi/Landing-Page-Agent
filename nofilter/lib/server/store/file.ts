import { appendFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { SIGNUP_COLUMNS, type Signup, type SignupStore } from './types';

/**
 * CSV fallback for local development.
 *
 * Deliberately not a production target — serverless filesystems are ephemeral,
 * so a deploy would quietly lose rows. The route refuses to use this in
 * production unless it is asked for explicitly.
 */

/**
 * Unlike the Sheets API (which stores RAW values verbatim), a CSV is likely to
 * be double-clicked into Excel, which *will* evaluate a cell starting with
 * = + - or @. The apostrophe forces it to stay text.
 */
const csvCell = (value: string | boolean) => {
  const s = String(value);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function createFileStore(): SignupStore {
  const file = process.env.CAPTURE_CSV_PATH || path.join(process.cwd(), 'data', 'signups.csv');

  return {
    name: 'csv',
    async append(signup: Signup) {
      await mkdir(path.dirname(file), { recursive: true });

      let needsHeader = false;
      try {
        await access(file);
      } catch {
        needsHeader = true;
      }

      const header = needsHeader ? `${SIGNUP_COLUMNS.join(',')}\n` : '';
      const row = SIGNUP_COLUMNS.map((col) => csvCell(signup[col])).join(',');

      await appendFile(file, `${header}${row}\n`, 'utf8');
    },
  };
}
