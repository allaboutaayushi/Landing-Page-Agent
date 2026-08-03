'use client';

import { useRef } from 'react';
import { HERO } from '@/lib/content';
import { Chars } from '@/components/Reveal';
import { cursorProps } from '@/components/Cursor';
import { scrollTo } from '@/components/ScrollRig';
import { SparkleField } from '@/components/Motifs';
import s from './sections.module.css';

export default function Hero() {
  const ref = useRef<HTMLElement>(null);

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

      {/* The wordmark carries the screen on its own — no lede, no sub, no CTA.
          Everyone arriving has already been through the door, so a button
          asking them in again was inviting them somewhere they already were. */}

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
