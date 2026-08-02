'use client';

import { useEffect, useRef } from 'react';
import s from './stamp.module.css';

/**
 * The stamp heading.
 *
 * Five things happen here, and they are deliberately sequenced rather than
 * fired together — everything arriving at once reads as noise:
 *
 *   1. The stamp presses in — down from above at scale, overshooting and
 *      settling, the way a rubber stamp bounces off the page.
 *   2. Its box draws itself around the words on the same beat.
 *   3. An ink splatter fires on impact and fades.
 *   4. Each letter kicks away from the pointer as it passes.
 *   5. A circular badge rotates beside it, its text set on a path.
 */

const TEXT = 'WHAT IS NO FILTER?';
const BADGE = 'NO FILTER · EST. 2026 · NO BOXES · NO CATEGORIES · ';

export default function StampHeading() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Press in when it arrives, rather than on load — a stamp that has already
    // landed before you scroll to it is just a heading.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.pressed = 'true';
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    if (reduced) return () => io.disconnect();

    // Per-letter kick. Written to custom properties from a rAF loop for the
    // same reason as the floating lines: this runs on every pointer move, and
    // eighteen React re-renders at that rate would cost more than the effect.
    const letters = Array.from(el.querySelectorAll<HTMLElement>('[data-letter]'));
    const now = letters.map(() => ({ x: 0, y: 0, r: 0 }));
    let px = -9999;
    let py = -9999;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
    };

    const loop = () => {
      for (let i = 0; i < letters.length; i++) {
        const r = letters[i].getBoundingClientRect();
        const dx = r.left + r.width / 2 - px;
        const dy = r.top + r.height / 2 - py;
        const dist = Math.hypot(dx, dy);
        const radius = 170;

        let tx = 0;
        let ty = 0;
        let tr = 0;
        if (dist < radius) {
          const push = Math.pow(1 - dist / radius, 2);
          const ux = dist > 0.001 ? dx / dist : 0.6;
          const uy = dist > 0.001 ? dy / dist : -0.8;
          tx = ux * push * 26;
          ty = uy * push * 30;
          // A little spin as it kicks, so it scatters rather than slides.
          tr = ux * push * 14;
        }

        const p = now[i];
        p.x += (tx - p.x) * 0.16;
        p.y += (ty - p.y) * 0.16;
        p.r += (tr - p.r) * 0.16;

        letters[i].style.setProperty('--lx', `${p.x.toFixed(2)}px`);
        letters[i].style.setProperty('--ly', `${p.y.toFixed(2)}px`);
        letters[i].style.setProperty('--lr', `${p.r.toFixed(2)}deg`);
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={s.root} ref={root} data-pressed="false">
      <div className={s.stampWrap}>
        {/* The box draws itself around the words as the stamp lands. */}
        <svg className={s.box} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <rect
            className={s.boxRect}
            x="1.2"
            y="1.2"
            width="97.6"
            height="97.6"
            rx="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <h2 className={s.head}>
          {/* One accessible string; the split is presentational only. */}
          <span className="sr-only">{TEXT}</span>
          <span className={s.line} aria-hidden="true">
            {TEXT.split('').map((ch, i) => (
              <span
                key={i}
                className={s.letter}
                data-letter
                style={{ transitionDelay: `${i * 12}ms` }}
              >
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </span>
        </h2>

        {/* Ink thrown off on impact. */}
        <span className={s.splatter} aria-hidden="true">
          {[...Array(7)].map((_, i) => (
            <i key={i} style={{ ['--i' as string]: i }} />
          ))}
        </span>
      </div>

      {/* The revolving badge — text on a circle, turning on its own. */}
      <svg className={s.badge} viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <path id="nf-badge-path" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0" />
        </defs>
        <circle cx="100" cy="100" r="86" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="100" cy="100" r="56" fill="none" stroke="currentColor" strokeWidth="2" />
        <text className={s.badgeText}>
          <textPath href="#nf-badge-path" startOffset="0%">
            {BADGE}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
