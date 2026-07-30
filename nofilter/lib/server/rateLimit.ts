/**
 * Per-IP fixed-window limiter.
 *
 * In-process, so it resets on redeploy and does not span instances — that is
 * fine for what it defends against here (a single script hammering the form),
 * and it costs no infrastructure. If this ever runs behind several always-on
 * instances, swap the map for Redis/Upstash; the interface below is the only
 * thing callers depend on.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = Number(process.env.CAPTURE_RATE_LIMIT ?? 6);

/** Evict expired buckets so the map cannot grow without bound. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(key: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }

  existing.count += 1;

  if (existing.count > MAX_PER_WINDOW) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }

  return { ok: true, retryAfter: 0 };
}

/**
 * Best-effort client IP.
 *
 * Only trusts the leftmost x-forwarded-for entry, which is what Vercel and
 * most managed proxies set. Behind a different proxy chain, set
 * CAPTURE_IP_HEADER to whichever header that platform guarantees.
 */
export function clientIp(headers: Headers): string {
  const custom = process.env.CAPTURE_IP_HEADER;
  if (custom) {
    const v = headers.get(custom);
    if (v) return v.split(',')[0].trim();
  }
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'unknown';
}
