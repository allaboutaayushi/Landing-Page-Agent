import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { blobsConfigured, readSignupPage, streamAllSignups, csvHeader, csvRow } from '@/lib/server/store/blobs';
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

  // The export needs every row, so it streams rather than buffering the lot:
  // the response starts before the last record is read, and memory stays flat
  // however many signups have accumulated.
  if (url.searchParams.get('format') === 'csv') {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`${csvHeader()}\n`));
        for await (const batch of streamAllSignups()) {
          controller.enqueue(encoder.encode(batch.map(csvRow).join('\n') + '\n'));
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="nofilter-signups.csv"',
        'Cache-Control': 'no-store',
      },
    });
  }

  const per = Math.min(Math.max(Number(url.searchParams.get('per') ?? 50), 1), 200);
  const page = Math.max(Number(url.searchParams.get('page') ?? 1), 1);
  const { rows, total } = await readSignupPage((page - 1) * per, per);

  return NextResponse.json(
    { total, page, per, pages: Math.max(Math.ceil(total / per), 1), signups: rows },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
