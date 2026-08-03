'use client';

import { useRef } from 'react';
import { WHAT_IS } from '@/lib/content';
import { PALETTE } from '@/lib/palette';
import { Chars, Lines, useDrift } from '@/components/Reveal';
import Unfilter from './Unfilter';
import StampHeading from './StampHeading';
import s from './sections.module.css';

/*
 * The arrow's sweep, shared by the shaft and the spark so the two can never
 * drift apart. It runs the width of the block rather than dropping down it:
 * a long rise from the left, one loop turned over in the middle, then a fall
 * to the right that lands on the lines below.
 *
 * The loop is a single large-arc sweep. Its end point sits down and to the
 * right of its start, so the arc closes most of a revolution and comes out
 * travelling the same way it went in — which is what keeps it reading as one
 * continuous line with a knot in it rather than as two strokes meeting.
 *
 * The tail hooks back on itself rather than running straight off to the right.
 * Ending on the outward sweep put the tip past the end of the line it is meant
 * to be pointing at, since the far edge of a block this wide sits beyond the
 * text inside it; turning back brings the tip over the words.
 *
 * That tail used to finish almost vertically while the curve visibly arrived
 * from the upper right, so barbs squared to the true end tangent lay along the
 * shaft and the head read as a tick rather than an arrow. It now runs out on
 * the diagonal it looks like it is travelling, and the barbs are symmetric
 * about that.
 */
const SPIRAL =
  'M16 44C96 6 190 14 252 54a34 34 0 1 1 42 24C372 116 470 104 546 66C596 41 618 92 570 118C530 146 486 158 452 178';

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

        The loop is an elliptical arc rather than a bezier. A large-arc sweep
        closes most of a revolution on its own; written as cubics it would need
        control points that cross over themselves, and guessing those is what
        makes hand-authored loops come out lopsided.
      */}
      <svg
        className={s.arrow}
        viewBox="0 0 630 195"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className={s.arrowPath}
          d={SPIRAL}
          stroke="currentColor"
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
        />
        <path
          className={s.arrowHead}
          d="M482 182l-30-4 11-28"
          stroke="currentColor"
          strokeWidth="3.8"
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
          strokeWidth="5.5"
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
