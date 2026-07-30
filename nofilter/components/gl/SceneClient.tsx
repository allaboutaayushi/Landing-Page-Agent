'use client';

import dynamic from 'next/dynamic';

/**
 * Client boundary for the WebGL layer.
 *
 * The canvas is the heaviest thing on the page and useless without a browser,
 * so it never enters the server bundle. `ssr: false` is only legal below a
 * client boundary, which is the entire reason this file exists.
 */
const Scene = dynamic(() => import('./Scene'), {
  ssr: false,
  loading: () => null,
});

export default function SceneClient() {
  return <Scene />;
}
