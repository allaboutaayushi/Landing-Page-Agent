'use client';

import { useRef } from 'react';
import { WHAT_IS } from '@/lib/content';
import { PALETTE } from '@/lib/palette';
import { Chars, Lines, useDrift } from '@/components/Reveal';
import Unfilter from './Unfilter';
import StampHeading from './StampHeading';
import s from './sections.module.css';

export default function WhatIs() {
  const driftRef = useRef<HTMLParagraphElement>(null);
  useDrift(driftRef, 40);

  return (
    <section data-act="whatIs" data-skin="red" id="what-is" className={s.whatIs}>
      <header className={s.whatIsHead}>
        <span className={`micro dim ${s.eyebrow}`}>01 — THE IDEA</span>
        <StampHeading />
      </header>

      <div className={s.whatIsBody}>
        <Lines lines={[WHAT_IS.lede]} className={`lede ${s.whatIsLede}`} />
        <p ref={driftRef} className={`${s.whatIsCopy} dim`}>
          {WHAT_IS.body}
        </p>
      </div>

      {/* Each statement is its own scroll beat — the name, then what it means,
          separated by a hairline. No cards, no boxes. */}
      {/*
        Leads the eye from the copy into the unfilter lines. Decorative, so it
        stays out of the accessibility tree entirely.

        Both paths carry `pathLength={1}` so the draw-on dash runs against a
        length of exactly 1 rather than a guessed arc length — and neither uses
        `non-scaling-stroke`, deliberately: with it, Chromium measures the dash
        pattern in screen space while `pathLength` normalises user space, so
        the two disagree and the tail never finishes drawing. That is what left
        the head floating beside a curve that stopped short. The stroke scaling
        with the mark is the right trade here anyway, since the whole arrow is
        sized off the viewport.

        The head's vertex sits on the shaft's own end point, barbs swept back
        off the direction it arrives from, so the two read as one mark.
      */}
      <svg
        className={s.arrow}
        viewBox="0 0 120 200"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className={s.arrowPath}
          d="M96 6c4 26-30 30-44 44s10 34 30 30 26 22 6 40-52 12-56 46"
          stroke="currentColor"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
        />
        <path
          className={s.arrowHead}
          d="M20 143l12 23 17-19"
          stroke="currentColor"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
        />
      </svg>

      <Unfilter />

      <div className={s.closer}>
        <hr className="rule" />
        <Lines lines={[WHAT_IS.closer.lead]} className={`display ${s.closerLead}`} />
        <Lines
          lines={WHAT_IS.closer.kicker.map((k, i) => (
            <em key={i} className={s.closerKick}>
              {k}
            </em>
          ))}
          className={s.closerKicks}
          stagger={0.11}
        />
      </div>
    </section>
  );
}
