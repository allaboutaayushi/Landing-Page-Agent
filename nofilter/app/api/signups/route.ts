import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { blobsConfigured, readAllSignups, toCsv } from '@/lib/server/store/blobs';
import { SESSION_COOKIE, cookieMatches } from './session/route';

/** Needs Node crypto and the Blobs SDK, so not the edge runtime. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reads captured signups back out.
 *
 * This endpoint hands out names and phone numbers, so it refuses to run at all
 * unless CAPTURE_ADMIN_TOKEN is set — an unset secret disables the route
 * rather than leaving it open, because the failure mode of the alternative is
 * publishing everyone's contact details.
 */

const deny = () =>
  NextResponse.json({ error: 'Not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

/** Constant-time compare, so the token cannot be recovered by timing guesses. */
function tokenMatches(supplied: string, expected: string) {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const expected = process.env.CAPTURE_ADMIN_TOKEN;
  if (!expected) return deny();

  const url = new URL(request.url);
  // A session cookie from /signups counts as well as a token in the URL, so
  // the password can be typed into a form instead of living in the address bar.
  const cookieStore = await cookies();
  const viaCookie = cookieMatches(cookieStore.get(SESSION_COOKIE)?.value, expected);

  const supplied =
    url.searchParams.get('token') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    '';

  // Same 404 for a wrong token as for no token, so the route's existence is
  // not confirmed to someone guessing.
  if (!viaCookie && (!supplied || !tokenMatches(supplied, expected))) return deny();

  if (!blobsConfigured()) {
    return NextResponse.json(
      { error: 'Blob storage is only available on Netlify.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const rows = await readAllSignups();

  if (url.searchParams.get('format') === 'csv') {
    return new NextResponse(toCsv(rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="nofilter-signups.csv"',
        'Cache-Control': 'no-store',
      },
    });
  }

  return NextResponse.json(
    { count: rows.length, signups: rows },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
