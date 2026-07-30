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
  robots: { index: true, follow: true },
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
