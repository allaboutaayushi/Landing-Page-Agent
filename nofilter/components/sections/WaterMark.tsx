'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import s from './watermark.module.css';

/**
 * The hero wordmark, filling with water.
 *
 * The letterforms are SVG text used as a mask, and everything that reads as
 * liquid is drawn behind that mask — so nothing can ever paint outside a
 * letter, whatever the surface does. The type itself is never filtered or
 * displaced; only what shows through it is.
 *
 * There is no viewBox. The SVG's user units are CSS pixels, which lets the
 * text keep `--t-wordmark` — the exact clamp the HTML wordmark used — instead
 * of being scaled to fit a box. The trade is that the height has to be
 * measured rather than declared, so the geometry is read back with getBBox
 * once the display face has actually loaded. Measuring before then returns the
 * fallback face's metrics and the water sits at the wrong height.
 *
 * Per frame the component writes four path strings straight to the DOM and
 * nothing else. React does not re-render during the animation: at this size a
 * state update per frame costs more than everything the water does.
 */

const LINES = ['NO', 'FILTER'];

/** Where the surface starts — a shallow pool, not empty. */
const REST_LEVEL = 0.07;
/** Never quite 1, so the surface stays inside the letters and keeps moving. */
const FULL_LEVEL = 0.99;
/** How long the pour takes once the page is visible. */
const FILL_MS = 2600;
/** Bubbles run for this long after it is full, then stop for good. */
const BUBBLE_MS = 2200;

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

/*
 * Hand-placed rather than random. A random scatter clusters and leaves gaps,
 * and gaps read as a bug in something this short; these sit across the width
 * with their sizes and delays deliberately uneven.
 *
 *   x    across the wordmark, as a percentage
 *   r    radius, as a fraction of the type size
 *   rise how far up the letters it travels before it goes
 *   d    when it starts, in seconds
 *   dur  how long it takes
 */
const BUBBLES = [
  { x: 14, r: 0.075, rise: 0.62, d: 0.0, dur: 1.15 },
  { x: 27, r: 0.05, rise: 0.78, d: 0.22, dur: 1.35 },
  { x: 39, r: 0.1, rise: 0.55, d: 0.08, dur: 1.0 },
  { x: 48, r: 0.058, rise: 0.72, d: 0.5, dur: 1.25 },
  { x: 58, r: 0.045, rise: 0.84, d: 0.34, dur: 1.45 },
  { x: 66, r: 0.088, rise: 0.6, d: 0.66, dur: 1.1 },
  { x: 77, r: 0.055, rise: 0.75, d: 0.15, dur: 1.3 },
  { x: 86, r: 0.072, rise: 0.66, d: 0.78, dur: 1.2 },
  { x: 33, r: 0.042, rise: 0.8, d: 0.92, dur: 1.4 },
  { x: 71, r: 0.047, rise: 0.7, d: 1.04, dur: 1.25 },
  { x: 21, r: 0.062, rise: 0.68, d: 0.58, dur: 1.2 },
  { x: 93, r: 0.045, rise: 0.74, d: 0.42, dur: 1.35 },
];

type Box = { x: number; y: number; w: number; h: number; line: number; size: number };

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

/**
 * The surface, as a closed shape from the crest down to the floor.
 *
 * Two sines of different periods rather than one: a single sine reads as a
 * mechanical ripple, and beating two against each other never quite repeats
 * inside the width of a word.
 */
function surface(box: Box, level: number, t: number, amp: number, freq: number, phase: number) {
  const top = box.y - amp * 2;
  const bottom = box.y + box.h;
  const left = box.x - 14;
  const right = box.x + box.w + 14;
  const y0 = bottom - (bottom - top) * level;

  const steps = 30;
  let body = `M ${left.toFixed(1)} ${y0.toFixed(1)}`;
  let crest = body;

  for (let i = 1; i <= steps; i++) {
    const x = left + ((right - left) * i) / steps;
    const k = (i / steps) * Math.PI * 2 * freq + phase;
    const y = y0 + Math.sin(k + t) * amp + Math.sin(k * 0.47 - t * 0.62) * amp * 0.5;
    const seg = ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    body += seg;
    crest += seg;
  }

  body += ` L ${right.toFixed(1)} ${bottom.toFixed(1)} L ${left.toFixed(1)} ${bottom.toFixed(1)} Z`;
  return { body, crest };
}

export default function WaterMark() {
  const svgRef = useRef<SVGSVGElement>(null);
  const typeRef = useRef<SVGTextElement>(null);
  const bodyRef = useRef<SVGPathElement>(null);
  const deepRef = useRef<SVGPathElement>(null);
  const crestRef = useRef<SVGPathElement>(null);
  const crestGlowRef = useRef<SVGPathElement>(null);
  const clipRef = useRef<SVGPathElement>(null);

  // Held in a ref as well as in state: state drives the render, the ref is
  // what the animation loop reads without re-subscribing every measurement.
  const boxRef = useRef<Box | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [height, setHeight] = useState(0);
  const [shift, setShift] = useState(0);

  // The timestamp the pour began, or 0 while the shell is still up. Held as a
  // number rather than a flag so the loop can measure elapsed time from it.
  const [entered, setEntered] = useState(0);
  const [bubbling, setBubbling] = useState(false);

  const shellOpen = useStore((st) => st.entered);

  /*
   * Guarded with a ref, not with the state it sets.
   *
   * Keying this off `entered` meant the effect re-ran the moment it stored the
   * timestamp, and React tears down the previous run before the next — so the
   * cleanup cancelled both timers a frame after they were set and the bubbles
   * never arrived. The ref settles within the same tick and is not a dependency.
   */
  const startedRef = useRef(false);

  useEffect(() => {
    if (!shellOpen || startedRef.current) return;
    startedRef.current = true;
    setEntered(performance.now());

    // Bubbles are the last beat, not a loop: they break the surface once the
    // glass is full and then the wordmark is left alone.
    const t1 = window.setTimeout(() => setBubbling(true), FILL_MS - 250);
    const t2 = window.setTimeout(() => setBubbling(false), FILL_MS - 250 + BUBBLE_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [shellOpen]);

  // --- measure ------------------------------------------------------------
  useEffect(() => {
    const svg = svgRef.current;
    const type = typeRef.current;
    if (!svg || !type) return;

    let alive = true;

    const measure = () => {
      if (!alive || !svgRef.current || !typeRef.current) return;
      const size = parseFloat(getComputedStyle(typeRef.current).fontSize) || 100;
      const pad = size * 0.14;
      // Measured with the group untransformed; the offset is applied after.
      const b = typeRef.current.getBBox();
      if (!b.width) return;

      setShift(pad - b.y);
      setHeight(b.height + pad * 2);
      const next = { x: b.x, y: pad, w: b.width, h: b.height, line: size * 0.92, size };
      boxRef.current = next;
      setBox(next);
    };

    // The face has to be resolved first — see the note above.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts) fonts.ready.then(measure);
    else measure();

    const ro = new ResizeObserver(measure);
    ro.observe(svg);

    return () => {
      alive = false;
      ro.disconnect();
    };
  }, []);

  // --- animate ------------------------------------------------------------
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let level = REST_LEVEL;
    const start = performance.now();
    // Pours from the moment the shell is off, not from a scroll position. The
    // clock only starts once the page is actually visible — begun on mount it
    // would run its whole length behind the preloader and be over before
    // anyone saw the wordmark.
    const pourFrom = entered ? entered : 0;

    const frame = (now: number) => {
      const b = boxRef.current;
      if (b) {
        if (reduced) {
          level = FULL_LEVEL;
        } else if (pourFrom) {
          // Eased on elapsed time rather than chased toward a target: a pour
          // has a beginning and an end, and a lerp never quite arrives.
          const p = clamp((now - pourFrom) / FILL_MS);
          level = REST_LEVEL + easeOut(p) * (FULL_LEVEL - REST_LEVEL);
        }

        const t = reduced ? 0 : (now - start) / 1000;
        const amp = b.size * 0.035;

        const main = surface(b, level, t * 1.15, amp, 1.6, 0);
        const under = surface(b, level - 0.012, t * 0.8, amp * 0.75, 2.4, 2.1);

        bodyRef.current?.setAttribute('d', main.body);
        clipRef.current?.setAttribute('d', main.body);
        deepRef.current?.setAttribute('d', under.body);
        crestRef.current?.setAttribute('d', main.crest);
        crestGlowRef.current?.setAttribute('d', main.crest);
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [box, entered]);

  const lineY = box ? box.line : 0;
  /* Matches the 0.045em/0.09em pair the CSS wordmark used. */
  const off = box ? box.size * 0.05 : 0;

  return (
    <svg
      ref={svgRef}
      className={s.root}
      style={height ? { height } : undefined}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Letterforms as the mask. Nothing below can reach outside them. */}
        <mask id="nf-wm-letters">
          <g transform={`translate(0 ${shift})`}>
            <text ref={typeRef} className={s.type} x="50%" y="0" textAnchor="middle" fill="#fff">
              <tspan x="50%" dy="0">
                {LINES[0]}
              </tspan>
              <tspan x="50%" dy={lineY}>
                {LINES[1]}
              </tspan>
            </text>
          </g>
        </mask>

        {/* Highlights are clipped to the water itself so none of them float in
            the empty part of a letter. */}
        <mask id="nf-wm-body">
          <path ref={clipRef} fill="#fff" />
        </mask>

        {/*
         * The inverse: everything except the letterforms.
         *
         * The drop shadow needs this. Drawn plainly it is a solid dark copy
         * sitting behind glyphs that are now mostly transparent, so it read
         * straight through the letters and turned the whole wordmark muddy —
         * the offset was invisible because the shadow was filling the type
         * rather than sitting behind it. Knocking the letters out of it leaves
         * only the part that was ever meant to show.
         */}
        <mask id="nf-wm-outside">
          <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
          <g transform={`translate(0 ${shift})`}>
            <text className={s.type} x="50%" y="0" textAnchor="middle" fill="#000">
              <tspan x="50%" dy="0">
                {LINES[0]}
              </tspan>
              <tspan x="50%" dy={lineY}>
                {LINES[1]}
              </tspan>
            </text>
          </g>
        </mask>

        {/*
         * Warm, not blue. The deck has no blue and a cyan pool inside a yellow
         * wordmark on a red ground would read as a different brand — this is
         * the wordmark's own yellow going amber with depth, which is what a
         * lit liquid does anyway.
         */}
        <linearGradient id="nf-wm-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--yellow)" stopOpacity="0.96" />
          <stop offset="45%" stopColor="var(--yellow)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--orange)" stopOpacity="1" />
        </linearGradient>

        <linearGradient id="nf-wm-deep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--orange)" stopOpacity="0.75" />
          <stop offset="100%" stopColor="var(--red)" stopOpacity="0.9" />
        </linearGradient>

        {/* The glass the water sits in. Barely there — the letter has to read
            as empty at rest but still read as a letter. */}
        <linearGradient id="nf-wm-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cream)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--yellow)" stopOpacity="0.28" />
        </linearGradient>

        {/*
         * Refraction. A coarse turbulence displacing only what is behind the
         * letters — one octave and a low frequency, because this re-evaluates
         * on every frame the surface moves and a fine noise field at wordmark
         * size is the one thing here that would cost real time.
         */}
        <filter id="nf-wm-refract" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.028" numOctaves="1" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      {/* The offset shadow the CSS wordmark carried, kept so the mark still
          punches off the red at every fill level — knocked out where the
          letters themselves are, so it cannot show through them. */}
      <g mask="url(#nf-wm-outside)">
        <g transform={`translate(${off} ${shift + off})`} className={s.shadow}>
          <text className={s.type} x="50%" y="0" textAnchor="middle">
            <tspan x="50%" dy="0">
              {LINES[0]}
            </tspan>
            <tspan x="50%" dy={lineY}>
              {LINES[1]}
            </tspan>
          </text>
        </g>
      </g>

      <g mask="url(#nf-wm-letters)">
        {/* empty glass */}
        <rect x="0" y="0" width="100%" height="100%" fill="url(#nf-wm-glass)" />

        <g className={s.water}>
          <path ref={deepRef} fill="url(#nf-wm-deep)" opacity="0.75" />
          <path ref={bodyRef} fill="url(#nf-wm-fill)" />

          {/* Light moving under the surface. Masked by the water body so it
              cannot appear above the line. */}
          <g mask="url(#nf-wm-body)" className={s.caustics}>
            <ellipse cx="22%" cy="62%" rx="16%" ry="7%" fill="var(--cream)" opacity="0.16" />
            <ellipse cx="58%" cy="78%" rx="22%" ry="6%" fill="var(--white)" opacity="0.1" />
            <ellipse cx="84%" cy="55%" rx="14%" ry="8%" fill="var(--teal)" opacity="0.12" />
          </g>

          {/*
            Bubbles. Inside the body mask so they are only ever seen through
            water — one that outran the surface would otherwise pop in mid-air
            above the line. Unmounted once they are done rather than left
            paused, so nothing keeps a compositor layer alive for the rest of
            the session.
          */}
          {bubbling && box && (
            <g mask="url(#nf-wm-body)">
              {BUBBLES.map((bub, i) => (
                <circle
                  key={i}
                  className={s.bubble}
                  /* Across the wordmark, not across the SVG. As a percentage
                     of the element the outer bubbles landed in the empty
                     margin either side of the type, where the letter mask
                     hides them — half of them were never going to be seen. */
                  cx={box.x + (box.w * bub.x) / 100}
                  cy={box.y + box.h - box.size * 0.06}
                  r={bub.r * box.size}
                  style={{
                    ['--rise' as string]: `${-(box.h * bub.rise)}px`,
                    animationDelay: `${bub.d}s`,
                    animationDuration: `${bub.dur}s`,
                  }}
                />
              ))}
            </g>
          )}

          {/* The meniscus: a bright line riding the crest, with a soft one
              under it so the surface has thickness rather than being an edge. */}
          <path ref={crestGlowRef} className={s.crestGlow} fill="none" />
          <path ref={crestRef} className={s.crest} fill="none" />
        </g>
      </g>

      {/* Outline last, over everything, so the typography is never softened by
          what is happening inside it. */}
      <g transform={`translate(0 ${shift})`}>
        <text className={`${s.type} ${s.outline}`} x="50%" y="0" textAnchor="middle" fill="none">
          <tspan x="50%" dy="0">
            {LINES[0]}
          </tspan>
          <tspan x="50%" dy={lineY}>
            {LINES[1]}
          </tspan>
        </text>
      </g>

    </svg>
  );
}
