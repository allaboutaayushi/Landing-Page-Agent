'use client';

import { useRef } from 'react';
import { WHAT_IS } from '@/lib/content';
import { PALETTE } from '@/lib/palette';
import { Chars, Lines, useDrift } from '@/components/Reveal';
import Unfilter from './Unfilter';
import StampHeading from './StampHeading';
import s from './sections.module.css';

/*
 * The arrow's coil, shared by the shaft and the spark so the two can never
 * drift apart. Three large-arc sweeps that each end lower than they start —
 * a descending corkscrew — then a short bezier easing out of the last loop
 * into the tip at (69, 202), which is where the arrowhead's vertex sits.
 */
const SPIRAL = 'M104 8a30 30 0 1 1-3 54a30 30 0 1 1-3 54a26 26 0 1 1-3 46c-4 20-14 30-26 40';

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

        The coil is three elliptical arcs rather than beziers. Each one is a
        large-arc sweep whose end point sits below its start, so it closes most
        of a revolution and steps down — three of them stacked make a corkscrew
        that descends. Writing this as cubics means guessing control points that
        cross over themselves, and the guesses are what make hand-authored loops
        come out lopsided.
      */}
      <svg
        className={s.arrow}
        viewBox="0 0 150 232"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className={s.arrowPath}
          d={SPIRAL}
          stroke="currentColor"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
        />
        <path
          className={s.arrowHead}
          d="M95 200l-26 2 7-25"
          stroke="currentColor"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
        />
        {/*
          The spark. A second copy of the shaft carrying a very short dash, so
          animating the offset walks that one dash down the coil — no
          `offset-path`, which Safari only took recently, and no second element
          to keep in sync with the curve.
        */}
        <path
          className={s.arrowSpark}
          d={SPIRAL}
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
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
