'use client';

import { useEffect, useRef } from 'react';
import { UNFILTER } from '@/lib/content';
import Doodles from './Doodles';
import s from './unfilter.module.css';

/**
 * The three unfilter lines.
 *
 * They drift on their own clocks and bolt when the pointer gets near. Two
 * things make that read as playful rather than broken:
 *
 * The drift is CSS and the flee is JS, layered as separate transforms — the
 * float never stutters while a line is running, and a line that has been
 * pushed still breathes.
 *
 * The flee is written straight to a custom property from a rAF loop rather
 * than through React state. This runs on every pointer move, and re-rendering
 * three nodes at that rate to move them a few pixels costs far more than the
 * effect is worth.
 */
export default function Unfilter() {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = wrap.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lines = Array.from(root.querySelectorAll<HTMLElement>('[data-flee]'));
    // Current offset per line, damped toward the target so a line eases away
    // and drifts back rather than snapping to the pointer.
    const now = lines.map(() => ({ x: 0, y: 0 }));
    let px = -9999;
    let py = -9999;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
    };
    const onLeave = () => {
      px = -9999;
      py = -9999;
    };

    const loop = () => {
      for (let i = 0; i < lines.length; i++) {
        const el = lines[i];
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;

        const dx = cx - px;
        const dy = cy - py;
        const dist = Math.hypot(dx, dy);

        // Radius scales with the line, so a long line is not chased by a
        // pointer that is nowhere near the words themselves.
        const radius = Math.max(r.width * 0.55, 220);

        let tx = 0;
        let ty = 0;
        if (dist < radius) {
          // Squared falloff: the closer you get, the harder it bolts.
          const push = Math.pow(1 - dist / radius, 2) * 190;
          // A pointer resting exactly on the centre gives a zero-length
          // vector and no direction to flee in — which is precisely the case
          // where the line should be running hardest. Fall back to a fixed
          // heading so it always breaks away.
          const ux = dist > 0.001 ? dx / dist : 1;
          const uy = dist > 0.001 ? dy / dist : -0.4;
          tx = ux * push;
          ty = uy * push * 0.6;
        }

        const p = now[i];
        // Away fast, back slow — that asymmetry is what makes it feel alive
        // rather than elastic.
        const ease = Math.abs(tx) > Math.abs(p.x) ? 0.18 : 0.07;
        p.x += (tx - p.x) * ease;
        p.y += (ty - p.y) * ease;

        el.style.setProperty('--fx', `${p.x.toFixed(2)}px`);
        el.style.setProperty('--fy', `${p.y.toFixed(2)}px`);
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={s.wrap} ref={wrap}>
      <Doodles />
      {UNFILTER.lines.map((line, i) => (
        <p key={line} className={`display ${s.line}`} data-place={UNFILTER.places[i]}>
          {/*
            The float lives on an inner span and the flee on the outer one, so
            the two transforms never overwrite each other.
          */}
          <span className={s.float} style={{ animationDelay: `${i * -2.6}s` }}>
            <span className={s.flee} data-flee>
              {line}
            </span>
          </span>
        </p>
      ))}

      <p className={s.tagline}>{UNFILTER.tagline}</p>
    </div>
  );
}
