import { NextResponse } from 'next/server';
import { describeStores } from '@/lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Diagnostic for the capture pipeline.
 *
 * Exists because the failure mode we kept hitting — "we couldn't save that" —
 * is indistinguishable from the outside no matter which backend broke, and the
 * deploy logs are not always reachable by whoever is debugging.
 *
 * It reports only which backends are *available* and what each one said when
 * asked to write. It never returns a captured signup, a credential, or the
 * value of any environment variable — only whether one is present.
 */
export async function GET() {
  const report = await describeStores();

  return NextResponse.json(report, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
