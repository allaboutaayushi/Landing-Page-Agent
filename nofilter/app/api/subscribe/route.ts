import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { normalisePhone } from '@/lib/server/phone';
import { rateLimit, clientIp } from '@/lib/server/rateLimit';
import { getStore, type Signup } from '@/lib/server/store';
import { CAPTURE } from '@/lib/content';

/** Needs Node crypto and the Google JWT signer, so not the edge runtime. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Bump when the consent wording changes, so old rows stay attributable. */
const CONSENT_VERSION = '2026-07-v1';

const MAX_BODY = 4 * 1024;

const json = (body: unknown, status: number) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

/**
 * Salted hash of the client IP.
 *
 * Consent has to be provable, but that doesn't require keeping raw addresses
 * indefinitely. A salted hash still lets us show two signups came from the
 * same origin without the list itself being a pile of IP addresses.
 */
function hashIp(ip: string) {
  const salt = process.env.CAPTURE_HASH_SALT;
  if (!salt) return 'unsalted';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

export async function POST(request: Request) {
  const ip = clientIp(request.headers);

  const limit = rateLimit(ip);
  if (!limit.ok) {
    return json(
      { error: 'Too many attempts. Try again a bit later.' },
      429,
    );
  }

  // Cap the body before parsing so a large payload can't be used to burn CPU.
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'Payload too large.' }, 413);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return json({ error: 'Malformed request.' }, 400);
  }

  // Honeypot and time-trap. Both are silently accepted so a bot gets no signal
  // about which check caught it — but nothing is written.
  const trapped =
    (typeof body.website === 'string' && body.website.trim() !== '') ||
    (typeof body.elapsed === 'number' && body.elapsed < 1200);
  if (trapped) return json({ ok: true }, 200);

  if (body.consent !== true) {
    return json({ error: 'We need your consent before we can message you.' }, 400);
  }

  // Collapse runs of whitespace so a name can't be padded out to look like
  // separate columns once it lands in a spreadsheet.
  const name = typeof body.name === 'string' ? body.name.replace(/\s+/g, ' ').trim() : '';
  if (name.length < 2) {
    return json({ error: 'We need a name to put to the number.' }, 400);
  }
  if (name.length > 80) {
    return json({ error: 'That name is longer than we can store.' }, 400);
  }

  const phone = normalisePhone(body.phone);
  if (!phone.ok) return json({ error: phone.reason }, 400);

  const str = (v: unknown, max: number) =>
    typeof v === 'string' ? v.slice(0, max) : '';

  const signup: Signup = {
    name,
    phone: phone.e164,
    timestamp: new Date().toISOString(),
    source: str(body.source, 300) || 'direct',
    referrer: str(body.referrer, 300),
    consent: true,
    consentText: CAPTURE.consent,
    consentVersion: CONSENT_VERSION,
    country: phone.country,
    ipHash: hashIp(ip),
    userAgent: str(request.headers.get('user-agent'), 300),
  };

  try {
    await getStore().append(signup);
  } catch (error) {
    // The real reason goes to the server log; the client gets nothing that
    // would reveal the storage backend or its configuration.
    console.error('[subscribe] failed to persist signup:', error);
    return json({ error: 'We couldn’t save that. Try again in a moment.' }, 502);
  }

  return json({ ok: true }, 200);
}

export async function GET() {
  return json({ error: 'Method not allowed.' }, 405);
}
