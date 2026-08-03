'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { damp } from '@/lib/rig';
import s from './Cursor.module.css';

/**
 * Two-part cursor: a dot pinned to the pointer and a ring that trails it.
 * The lag on the ring is what makes it feel physical rather than drawn.
 *
 * Behind them, a trail of sparks. They are a fixed pool that is cycled rather
 * than elements created and thrown away — at this spawn rate the churn is the
 * only part that would ever be felt — and each one is driven by the Web
 * Animations API rather than a CSS class. Restarting a CSS animation means
 * clearing it, forcing a reflow and setting it back, which is a layout thrash
 * every few pixels of pointer movement; `animate()` simply replaces whatever
 * that element was doing.
 */

/** Palette to draw from, in order. Cream and white are the majority so the
 *  trail reads as light with colour in it rather than as confetti. */
const SPARK_TONES = [
  'var(--cream)',
  'var(--yellow)',
  'var(--white)',
  'var(--teal)',
  'var(--cream)',
  'var(--pink)',
  'var(--white)',
  'var(--yellow)',
];

const POOL = 30;
/** Pointer travel between spawns. Time-based spawning gives a dense clot when
 *  the pointer stops; distance keeps the spacing even at any speed. */
const SPAWN_EVERY = 18;

export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const sparkLayer = useRef<HTMLDivElement>(null);
  const mode = useStore((st) => st.cursorMode);
  const label = useStore((st) => st.cursorLabel);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduced.matches) return;

    document.documentElement.classList.add('nf-cursor-ready');

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;
    let last = performance.now();
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
    };

    // --- sparks ---------------------------------------------------------
    const sparks = sparkLayer.current
      ? (Array.from(sparkLayer.current.children) as HTMLElement[])
      : [];
    let nextSpark = 0;
    let sx = x;
    let sy = y;

    const emit = (px: number, py: number) => {
      const el = sparks[nextSpark];
      if (!el) return;
      nextSpark = (nextSpark + 1) % sparks.length;

      // Clear whatever this element was doing before reusing it. `animate()`
      // stacks a new animation rather than replacing the old, and the previous
      // ones are `fill: forwards` — so without this they pile up on the
      // element for the life of the session, all still holding a final value.
      el.getAnimations().forEach((a) => a.cancel());

      // Uneven on purpose. A trail whose every mark is the same size and
      // travels the same way reads as a texture rather than as sparks.
      const size = 7 + Math.random() * 13;
      const spin = Math.random() * 360;
      const drift = (Math.random() - 0.5) * 46;
      const fall = 10 + Math.random() * 34;
      const life = 900 + Math.random() * 620;
      // Half the size off, so the star is centred on the point it was
      // emitted from rather than hanging below and right of it.
      const jx = px + (Math.random() - 0.5) * 18 - size / 2;
      const jy = py + (Math.random() - 0.5) * 18 - size / 2;

      // Size only. The colour is baked into each pooled element at mount —
      // writing `background` on every spawn dirties style on an element the
      // compositor is already animating, and the tone does not need to change
      // for the trail to read as varied.
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;

      el.animate(
        [
          {
            transform: `translate3d(${jx}px, ${jy}px, 0) rotate(${spin}deg) scale(0.2)`,
            opacity: 0,
          },
          {
            transform: `translate3d(${jx}px, ${jy}px, 0) rotate(${spin + 30}deg) scale(1)`,
            opacity: 0.95,
            offset: 0.22,
          },
          {
            transform: `translate3d(${jx + drift}px, ${jy + fall}px, 0) rotate(${spin + 150}deg) scale(0.1)`,
            opacity: 0,
          },
        ],
        { duration: life, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'forwards' },
      );
    };

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      rx = damp(rx, x, 11, dt);
      ry = damp(ry, y, 11, dt);
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;

      // Walk the gap since the last spark rather than dropping one per frame,
      // so a fast flick leaves a continuous trail instead of a dotted line.
      let gap = Math.hypot(x - sx, y - sy);
      let guard = 0;
      while (gap >= SPAWN_EVERY && guard < 6) {
        const k = SPAWN_EVERY / gap;
        sx += (x - sx) * k;
        sy += (y - sy) * k;
        emit(sx, sy);
        gap = Math.hypot(x - sx, y - sy);
        guard++;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener('pointermove', onMove, { passive: true });

    // Leaving the window should hide it rather than park it at the edge.
    const onLeave = () => document.documentElement.classList.add('nf-cursor-out');
    const onEnter = () => document.documentElement.classList.remove('nf-cursor-out');
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerenter', onEnter);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerenter', onEnter);
      document.documentElement.classList.remove('nf-cursor-ready', 'nf-cursor-out');
    };
  }, []);

  return (
    <>
      {/*
        Its own layer, outside the cursor's. The cursor blends in difference
        mode, and difference over the brand red turns anything light into cyan
        — the sparks would have come out off-palette everywhere. This one
        paints normally.
      */}
      <div ref={sparkLayer} className={s.sparks} aria-hidden="true">
        {Array.from({ length: POOL }, (_, i) => (
          <i key={i} className={s.spark} style={{ background: SPARK_TONES[i % SPARK_TONES.length] }} />
        ))}
      </div>

      <div className={s.root} data-mode={mode} aria-hidden="true">
        <div ref={ring} className={s.ring}>
          <span className={s.label}>{label}</span>
        </div>
        <div ref={dot} className={s.dot} />
      </div>
    </>
  );
}

/** Attach to any interactive element to drive the cursor state. */
export function cursorProps(mode: 'hover' | 'drag' | 'view', label = '') {
  const set = useStore.getState().setCursor;
  return {
    onPointerEnter: () => set(mode, label),
    onPointerLeave: () => set('default'),
  };
}
