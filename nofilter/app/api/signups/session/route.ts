import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Name of the cookie that stands in for the password once it's been proven. */
export const SESSION_COOKIE = 'nf_admin';

/**
 * What the cookie has to contain to count.
 *
 * A hash of the secret rather than the secret itself, so a leaked cookie does
 * not hand over the password that also works in the URL and in Netlify.
 */
export function expectedCookieValue(secret: string) {
  return createHash('sha256').update(`nf-admin:${secret}`).digest('hex');
}

export function cookieMatches(supplied: string | undefined, secret: string) {
  if (!supplied) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expectedCookieValue(secret));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Exchanges the password for a session cookie.
 *
 * Taking it as a POST body rather than a query string keeps it out of browser
 * history, out of the address bar, and out of any referrer header — which is
 * the whole reason this exists alongside the token URL.
 */
export async function POST(request: Request) {
  const secret = process.env.CAPTURE_ADMIN_TOKEN;
  if (!secret) {
    return NextResponse.json(
      { error: 'No password is set for this site yet.' },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const supplied = typeof body.password === 'string' ? body.password : '';

  const a = Buffer.from(supplied);
  const b = Buffer.from(secret);
  const ok = a.length === b.length && timingSafeEqual(a, b);

  if (!ok) {
    // Deliberately slow, so guessing is expensive even over a fast link.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: 'Wrong password.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, expectedCookieValue(secret), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return res;
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
