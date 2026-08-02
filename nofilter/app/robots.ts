import type { MetadataRoute } from 'next';

/**
 * robots.txt
 *
 * A meta tag alone is not enough: a crawler has to fetch and render the page
 * to see it, and some never do. This refuses at the door instead, which is
 * also what stops the URL appearing as a bare link in results even when the
 * page itself was never indexed.
 *
 * To launch: return `allow: '/'` here and set index/follow true in the
 * `robots` block in app/layout.tsx. Both have to change — either one left
 * behind keeps the site out of search.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  };
}
