import { SIGNUP_COLUMNS, type Signup, type SignupStore } from './types';

/**
 * Posts each signup into Netlify Forms.
 *
 * The point of this backend is that it needs no credentials. Netlify injects
 * the site's own URL at runtime, submissions land in the dashboard under
 * Forms → signups, and they can be read and exported to CSV from there
 * without a service account, a spreadsheet, or a key to rotate. That makes it
 * the sensible default for a site already deployed to Netlify.
 *
 * The trade-off is that it is Netlify's store, not yours: the free tier caps
 * submissions per month, and nothing here is portable to another host. For
 * anything long-lived, configure Google Sheets — the store picks that first.
 */

/** Netlify sets these on every build and function invocation. */
function siteUrl() {
  return process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || '';
}

export function netlifyFormsConfigured() {
  // NETLIFY is set inside the build and the function runtime; the URL is what
  // we actually need, so both have to be present.
  return Boolean(process.env.NETLIFY && siteUrl());
}

export function createNetlifyFormsStore(): SignupStore | null {
  const base = siteUrl();
  if (!base) return null;

  return {
    name: 'netlify-forms',
    async append(signup: Signup) {
      const body = new URLSearchParams();
      // Netlify keys submissions by this, and drops anything whose form-name
      // it has not seen in the deployed markup — see public/__forms.html.
      body.set('form-name', 'signups');

      for (const col of SIGNUP_COLUMNS) {
        const value = signup[col];
        body.set(col, typeof value === 'boolean' ? String(value) : value);
      }

      // Posting to the static definition rather than to the app route, so the
      // submission is handled by Netlify's form pipeline instead of coming
      // back through Next and looping.
      const res = await fetch(`${base}/__forms.html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(
          `Netlify Forms submission failed (${res.status}): ${detail.slice(0, 200)}`,
        );
      }
    },
  };
}
