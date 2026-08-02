'use client';

import { useRef } from 'react';
import { WHAT_IS } from '@/lib/content';
import { PALETTE } from '@/lib/palette';
import { Chars, Lines, useDrift } from '@/components/Reveal';
import s from './sections.module.css';

export default function WhatIs() {
  const driftRef = useRef<HTMLParagraphElement>(null);
  useDrift(driftRef, 40);

  return (
    <section data-act="whatIs" data-solid data-skin="cream" id="what-is" className={s.whatIs}>
      <header className={s.whatIsHead}>
        <span className={`micro dim ${s.eyebrow}`}>01 — THE IDEA</span>
        <h2 className={`display ${s.sectionHead}`}>
          <span className="sr-only">{WHAT_IS.heading}</span>
          <span aria-hidden="true" className={s.headLine}>
            <Chars text="WHAT IS" />
          </span>
          <span aria-hidden="true" className={s.headLine}>
            <Chars text="NO FILTER?" delay={0.08} />
          </span>
        </h2>
      </header>

      <div className={s.whatIsBody}>
        <Lines lines={[WHAT_IS.lede]} className={`lede ${s.whatIsLede}`} />
        <p ref={driftRef} className={`${s.whatIsCopy} dim`}>
          {WHAT_IS.body}
        </p>
      </div>

      {/* Each statement is its own scroll beat — the name, then what it means,
          separated by a hairline. No cards, no boxes. */}
      <ol className={s.statements}>
        {WHAT_IS.statements.map((st, i) => (
          <li
            key={st.key}
            className={s.statement}
            style={{ '--accent': PALETTE[st.accent] } as React.CSSProperties}
          >
            <hr className="rule" />
            <div className={s.statementRow}>
              <span className={`micro dim ${s.statementIndex}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className={`display ${s.statementTitle}`}>
                <span className="sr-only">{`NO FILTER ${st.key}.`}</span>
                <span aria-hidden="true">
                  NO FILTER <em className="accent">{st.key}</em>.
                </span>
              </h3>
              <Lines lines={[st.line]} className={`${s.statementLine} dim`} />
            </div>
          </li>
        ))}
      </ol>

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
