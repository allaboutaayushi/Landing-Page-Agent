/**
 * One captured signup.
 *
 * The shape is designed around what a compliant WhatsApp opt-in has to be able
 * to prove later: who, when, what exactly they agreed to, and where they were
 * when they agreed to it. Dropping any of these fields makes the record much
 * harder to defend if the opt-in is ever challenged.
 */
export type Signup = {
  /** Whatever they typed, trimmed and length-capped. Never used as an identifier. */
  name: string;
  /** E.164, the only format worth storing. */
  phone: string;
  /** ISO 8601, UTC. */
  timestamp: string;
  /** Where they came from — the landing query string, or 'direct'. */
  source: string;
  /** Referring URL, if the browser gave us one. */
  referrer: string;
  /** True only if the box was actually ticked. */
  consent: boolean;
  /** Verbatim wording they agreed to, so we can show it later. */
  consentText: string;
  /** Bumped whenever the consent wording changes. */
  consentVersion: string;
  /** ISO 3166 region resolved from the number. */
  country: string;
  /** Salted hash — proof of origin without holding raw IPs. */
  ipHash: string;
  userAgent: string;
};

export interface SignupStore {
  readonly name: string;
  append(signup: Signup): Promise<void>;
}

export const SIGNUP_COLUMNS: Array<keyof Signup> = [
  'timestamp',
  'name',
  'phone',
  'consent',
  'source',
  'referrer',
  'country',
  'consentVersion',
  'consentText',
  'ipHash',
  'userAgent',
];
