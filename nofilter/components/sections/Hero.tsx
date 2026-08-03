'use client';

import { useRef } from 'react';
import { HERO } from '@/lib/content';
import { cursorProps } from '@/components/Cursor';
import { scrollTo } from '@/components/ScrollRig';
import { SparkleField } from '@/components/Motifs';
import WaterMark from './WaterMark';
import s from './sections.module.css';

export default function Hero() {
  const ref = useRef<HTMLElement>(null);

  return (
    <section ref={ref} data-act="hero" data-skin="red" id="top" className={s.hero}>
      <SparkleField variant="hero" />
      {/* The wordmark is the only thing at this size anywhere on the page. It
          is drawn as SVG so the letterforms can be used as a mask — see
          WaterMark. The heading itself stays here for the document outline. */}
      <h1 className={s.heroMark}>
        <span className="sr-only">NO FILTER</span>
        <WaterMark />
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
