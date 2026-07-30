import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

/** Default region for bare national numbers — the form's dial code is +91. */
const DEFAULT_REGION: CountryCode = (process.env.CAPTURE_DEFAULT_REGION as CountryCode) || 'IN';

export type PhoneResult =
  | { ok: true; e164: string; country: string; national: string }
  | { ok: false; reason: string };

/**
 * Normalises to E.164 before anything is stored.
 *
 * Storing whatever the user typed makes the list unusable later — WhatsApp
 * and every SMS gateway want E.164, and de-duplication is impossible across
 * mixed formats. Reject here rather than clean up at send time.
 */
export function normalisePhone(raw: unknown): PhoneResult {
  if (typeof raw !== 'string') return { ok: false, reason: 'Missing number.' };

  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: 'Missing number.' };
  if (trimmed.length > 32) return { ok: false, reason: 'That number is too long.' };

  const parsed = parsePhoneNumberFromString(trimmed, DEFAULT_REGION);

  if (!parsed) return { ok: false, reason: 'We couldn’t read that number.' };
  if (!parsed.isValid()) return { ok: false, reason: 'That number isn’t valid.' };

  // Fixed lines can't receive WhatsApp; better to say so now than to collect a
  // number we can never legitimately message.
  const type = parsed.getType();
  if (type === 'FIXED_LINE') {
    return { ok: false, reason: 'Use a mobile number so we can message you.' };
  }

  return {
    ok: true,
    e164: parsed.number,
    country: parsed.country ?? DEFAULT_REGION,
    national: parsed.nationalNumber,
  };
}
