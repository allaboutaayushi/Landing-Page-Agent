'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import s from './Preloader.module.css';

/**
 * The greeting.
 *
 * You arrive on a sealed shell with the lens inside it. The counter runs, the
 * rule closes, and on 100 the shell breaks — the WebGL shatter and this
 * curtain leave on the same beat, so the intro hands off to the page rather
 * than cutting to it.
 */
export default function Preloader() {
  const loadProgress = useStore((st) => st.loadProgress);
  const setShattered = useStore((st) => st.setShattered);
  const setEntered = useStore((st) => st.setEntered);
  const [stage, setStage] = useState<'loading' | 'breaking' | 'gone'>('loading');
  const fired = useRef(false);

  const pct = Math.round(loadProgress * 100);

  useEffect(() => {
    if (loadProgress < 1 || fired.current) return;
    fired.current = true;

    // Beat on 100 before anything moves — the pause is what makes the break land.
    const t1 = window.setTimeout(() => {
      setStage('breaking');
      setShattered();
    }, 420);

    // Curtain clears while the shards are still flying outward.
    const t2 = window.setTimeout(() => setEntered(), 1000);
    const t3 = window.setTimeout(() => setStage('gone'), 1900);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [loadProgress, setShattered, setEntered]);

  if (stage === 'gone') return null;

  return (
    <div className={s.root} data-stage={stage} role="status" aria-live="polite">
      <span className="sr-only">
        {pct < 100 ? `Loading NO FILTER, ${pct} percent` : 'Loaded'}
      </span>

      {/* Slabs part vertically rather than the whole layer fading — the ink
          behaves like the shell it is. */}
      <div className={s.slab} data-half="top" />
      <div className={s.slab} data-half="bottom" />

      <div className={s.inner} aria-hidden="true">
        <div className={s.markWrap}>
          <span className={s.mark}>NO</span>
          <span className={s.mark}>FILTER</span>
        </div>

        <div className={s.meter}>
          <span className={s.meterFill} style={{ transform: `scaleX(${loadProgress})` }} />
        </div>

        <div className={s.count}>
          <span className={s.countNum}>{String(pct).padStart(3, '0')}</span>
        </div>
      </div>
    </div>
  );
}
