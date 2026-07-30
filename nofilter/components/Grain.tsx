'use client';

import s from './Grain.module.css';

/**
 * A single film-grain layer over the whole page.
 *
 * Ties the DOM and the WebGL together — without it the type looks pasted onto
 * the render instead of living in the same image. Generated as an inline SVG
 * turbulence so it costs no request and no bitmap.
 */
const NOISE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="220" height="220" filter="url(#n)" opacity="0.42"/>
    </svg>`,
  );

export default function Grain() {
  return (
    <div
      className={s.grain}
      style={{ backgroundImage: `url("${NOISE}")` }}
      aria-hidden="true"
    />
  );
}
