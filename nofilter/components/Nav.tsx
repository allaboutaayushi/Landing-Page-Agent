'use client';

import { useEffect, useRef } from 'react';
import { NAV, BRAND } from '@/lib/content';
import { useStore } from '@/lib/store';
import { rig } from '@/lib/rig';
import { cursorProps } from './Cursor';
import { scrollTo } from './ScrollRig';
import s from './Nav.module.css';

/**
 * Header stays out of the way: it retracts as you go down and comes back the
 * moment you scroll up, so it's never competing with the flight but is always
 * one gesture away.
 */
export default function Nav() {
  const entered = useStore((st) => st.entered);
  const openCapture = useStore((st) => st.openCapture);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!entered) return;
    let raf = 0;
    let hidden = false;

    const loop = () => {
      const el = root.current;
      if (el) {
        const shouldHide = rig.velocity > 0.06 && rig.progress > 0.05;
        const shouldShow = rig.velocity < -0.02 || rig.progress < 0.02;
        if (shouldHide && !hidden) {
          hidden = true;
          el.dataset.hidden = 'true';
        } else if (shouldShow && hidden) {
          hidden = false;
          el.dataset.hidden = 'false';
        }
        el.dataset.solid = rig.progress > 0.02 ? 'true' : 'false';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [entered]);

  return (
    <header ref={root} className={s.root} data-entered={entered} data-hidden="false">
      <a
        href="#top"
        className={s.brand}
        onClick={(e) => {
          e.preventDefault();
          scrollTo(0);
        }}
        {...cursorProps('hover')}
      >
        <span className={s.brandMark}>{BRAND}</span>
      </a>

      <nav className={s.links} aria-label="Sections">
        {NAV.map((item) => (
          <a
            key={item.target}
            href={item.target}
            className={`micro ${s.link}`}
            onClick={(e) => {
              e.preventDefault();
              scrollTo(item.target);
            }}
            {...cursorProps('hover')}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <button
        type="button"
        className={`micro ${s.cta}`}
        onClick={openCapture}
        {...cursorProps('hover', 'GET IN')}
      >
        GET IN
      </button>
    </header>
  );
}
