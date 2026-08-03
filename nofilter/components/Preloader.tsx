'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import s from './Preloader.module.css';

/**
 * The greeting.
 *
 * You arrive on a sealed shell with the lens inside it. The counter runs, the
 * rule closes, and on 100 the shell opens — a hole widens out of the centre
 * while the shell pushes past the camera and the page settles out of a slight
 * zoom behind it. The WebGL shatter fires on the same beat, so the intro hands
 * off to the page rather than cutting to it.
 *
 * The page's zoom is driven from a `data-intro` stamp on the root element
 * rather than from a class on `main`, so the transform can be taken off
 * entirely once it has played. A transform left on an ancestor makes it a
 * containing block for everything under it, and the stations further down the
 * page are `position: sticky`.
 */
export default function Preloader() {
  const loadProgress = useStore((st) => st.loadProgress);
  const setShattered = useStore((st) => st.setShattered);
  const setEntered = useStore((st) => st.setEntered);
  const [stage, setStage] = useState<'loading' | 'breaking' | 'gone'>('loading');
  const fired = useRef(false);

  const pct = Math.round(loadProgress * 100);

  // Hold the page slightly enlarged behind the shell for as long as the shell
  // is up, so there is something for it to settle out of.
  useEffect(() => {
    document.documentElement.dataset.intro = 'held';
    return () => {
      delete document.documentElement.dataset.intro;
    };
  }, []);

  useEffect(() => {
    if (loadProgress < 1 || fired.current) return;
    fired.current = true;

    // Beat on 100 before anything moves — the pause is what makes the break land.
    const t1 = window.setTimeout(() => {
      setStage('breaking');
      setShattered();
      document.documentElement.dataset.intro = 'settling';
    }, 420);

    // Curtain clears while the shards are still flying outward.
    const t2 = window.setTimeout(() => setEntered(), 1000);
    const t3 = window.setTimeout(() => setStage('gone'), 1900);
    // Transform comes off once it has finished, not just at scale(1) — see the
    // note on sticky above.
    const t4 = window.setTimeout(() => {
      delete document.documentElement.dataset.intro;
    }, 2100);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [loadProgress, setShattered, setEntered]);

  if (stage === 'gone') return null;

  return (
    <div
      className={s.root}
      data-stage={stage}
      role="status"
      aria-live="polite"
      /* Drives the slab colour. The shell opens neon blue and bleeds to red as
         the count climbs, so it is already the page's own red by the time it
         splits — the colour is the progress bar, and the hand-off has nothing
         left to cut between. */
      style={{ ['--load' as string]: loadProgress }}
    >
      <span className="sr-only">
        {pct < 100 ? `Loading NO FILTER, ${pct} percent` : 'Loaded'}
      </span>

      {/* A hole opens in the middle of the shell and widens past the frame
          while the shell itself pushes toward you — the page is arrived at
          rather than uncovered. */}
      <div className={s.curtain} />

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
