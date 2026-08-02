'use client';

import { GET_IN, FOOTER } from '@/lib/content';
import { Chars, Lines } from '@/components/Reveal';
import { cursorProps } from '@/components/Cursor';
import { useStore } from '@/lib/store';
import { SparkleField } from '@/components/Motifs';
import s from './sections.module.css';

/**
 * The close.
 *
 * The wordmark behind this is the WebGL finale — glass balls sit over it and
 * you push them aside to read it. So this layer stays deliberately sparse:
 * an eyebrow, the ask, one line, and the door.
 */
export default function GetIn() {
  const openCapture = useStore((st) => st.openCapture);

  return (
    <section data-act="getIn" data-skin="pink" id="get-in" className={s.getIn}>
      <SparkleField variant="corner" />
      <div className={s.getInInner}>
        <span className={`micro dim ${s.eyebrow}`}>{GET_IN.eyebrow}</span>

        <h2 className={`display ${s.getInHead}`}>
          <span className="sr-only">{GET_IN.heading.join(' ')}</span>
          <span aria-hidden="true" className={s.headLine}>
            <Chars text={GET_IN.heading[0]} />
          </span>
          <span aria-hidden="true" className={s.headLine}>
            <Chars text={GET_IN.heading[1]} delay={0.07} />
          </span>
        </h2>

        <Lines lines={[GET_IN.line]} className={`lede ${s.getInLine} dim`} />

        <button
          type="button"
          className={`${s.pill} ${s.pillLarge}`}
          onClick={openCapture}
          {...cursorProps('hover', 'GET IN')}
        >
          <span>{GET_IN.cta}</span>
          <i aria-hidden="true" />
        </button>

        {/* Was "DRAG THE GLASS ASIDE" — that instructed a WebGL lens that no
            longer exists, so it told visitors to do something impossible. */}
        <p className={`micro dim ${s.getInHint}`}>NO BOXES. NO CATEGORIES.</p>
      </div>

      <footer className={s.footer}>
        <hr className="rule" />
        <div className={s.footerRow}>
          <span className={`display ${s.footerMark}`}>{FOOTER.wordmark}</span>
          <span className={`micro dim`}>{FOOTER.line}</span>
          <span className={`micro dim`}>© {FOOTER.year}</span>
        </div>
      </footer>
    </section>
  );
}
