'use client';

import { EXPECT } from '@/lib/content';
import { PALETTE } from '@/lib/palette';
import { Chars, Lines } from '@/components/Reveal';
import s from './sections.module.css';

export default function Expect() {
  return (
    <section data-act="expect" data-skin="yellow" id="expect" className={s.expect}>
      <header className={s.expectHead}>
        <span className={`micro dim ${s.eyebrow}`}>03 — ON THE NIGHT</span>
        <h2 className={`display ${s.sectionHead}`}>
          <span className="sr-only">{EXPECT.heading}</span>
          <span aria-hidden="true" className={s.headLine}>
            <Chars text="WHAT TO" />
          </span>
          <span aria-hidden="true" className={s.headLine}>
            <Chars text="EXPECT" delay={0.08} />
          </span>
        </h2>
      </header>

      {/* Ruled rows, not cards. Hairlines carry the structure. */}
      <dl className={s.expectList}>
        {EXPECT.items.map((item, i) => (
          <div
            key={item.key}
            className={s.expectRow}
            style={{ '--accent': PALETTE[item.accent] } as React.CSSProperties}
          >
            <hr className="rule" />
            <div className={s.expectRowInner}>
              <span className={`micro dim ${s.expectIndex}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <dt className={`display ${s.expectKey}`}>{item.key}</dt>
              <dd className={s.expectVal}>
                <Lines lines={[item.line]} className="dim" />
              </dd>
            </div>
          </div>
        ))}
        <hr className="rule" />
      </dl>
    </section>
  );
}
