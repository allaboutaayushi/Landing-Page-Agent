'use client';

import { useRef } from 'react';
import { HERO } from '@/lib/content';
import { Chars, Lines } from '@/components/Reveal';
import { cursorProps } from '@/components/Cursor';
import { scrollTo } from '@/components/ScrollRig';
import { useStore } from '@/lib/store';
import { SparkleField } from '@/components/Motifs';
import s from './sections.module.css';

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const openCapture = useStore((st) => st.openCapture);

  return (
    <section ref={ref} data-act="hero" data-skin="red" id="top" className={s.hero}>
      <SparkleField variant="hero" />
      {/* The wordmark is the only thing at this size anywhere on the page. */}
      <h1 className={`display wordmark ${s.heroMark}`}>
        <span className="sr-only">NO FILTER</span>
        <span aria-hidden="true" className={s.heroMarkLine}>
          <Chars text="NO" delay={0.15} start="top bottom" />
        </span>
        <span aria-hidden="true" className={s.heroMarkLine}>
          <Chars text="FILTER" delay={0.24} start="top bottom" />
        </span>
      </h1>

      <div className={s.heroMeta}>
        <Lines
          lines={[HERO.lede]}
          className={`lede ${s.heroLede}`}
          delay={0.4}
          start="top bottom"
        />
        <Lines
          lines={[HERO.sub]}
          className={`${s.heroSub} dim`}
          delay={0.52}
          start="top bottom"
        />
      </div>

      <div className={s.heroCta}>
        <button
          type="button"
          className={s.pill}
          onClick={openCapture}
          {...cursorProps('hover', 'GET IN')}
        >
          <span>{HERO.cta}</span>
          <i aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        className={s.scrollHint}
        onClick={() => scrollTo('#what-is')}
        {...cursorProps('hover', 'SCROLL')}
      >
        <span className="micro">{HERO.scrollHint}</span>
        <span className={s.scrollRule} aria-hidden="true" />
      </button>
    </section>
  );
}
