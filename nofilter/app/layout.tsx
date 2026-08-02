import type { Metadata, Viewport } from 'next';
import './globals.css';

const title = 'NO FILTER';
const description =
  'A new-age pop culture experience where music, nightlife, creators, fashion, food, art and interactive experiences come together — without being divided into separate worlds.';

export const metadata: Metadata = {
  title: { default: title, template: '%s — NO FILTER' },
  description,
  applicationName: title,
  openGraph: {
    title,
    description,
    siteName: title,
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description },
  /*
   * Kept out of search while the site is still being built.
   *
   * `noimageindex` and `nocache` matter as much as `noindex` here: without
   * them a crawler that has already seen the page can keep serving a cached
   * copy and the images from it long after the tag goes up. Flip all of this
   * to true — and change app/robots.ts to match — on launch.
   */
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0C',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  // The page is a scroll-driven flight; pinch-zoom is still allowed, but the
  // browser must not rescale on orientation change mid-ride.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
