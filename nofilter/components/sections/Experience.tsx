'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { STATIONS } from '@/lib/content';
import { PALETTE } from '@/lib/palette';
import { useStore } from '@/lib/store';
import { rig } from '@/lib/rig';
import { ACTS } from '@/components/gl/path';
import s from './sections.module.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * The flight.
 *
 * There is no gallery here and no grid — the photographs live in the WebGL
 * tunnel, and this layer is only the type that travels with them. Each block
 * pins its caption for the length of one station, so the words hold while the
 * image comes at you and leave as it passes.
 */
function StationCaption({ index }: { index: number }) {
  const station = STATIONS[index];
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    const box = inner.current;
    if (!el || !box) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(box, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      // In on approach, out on departure — scrubbed, so it's tied to the ride
      // rather than firing once and sitting there.
      gsap
        .timeline({
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
        })
        .fromTo(
          box,
          { opacity: 0, y: 90, filter: 'blur(9px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power2.out' },
        )
        .to(box, { duration: 1.1 })
        .to(box, { opacity: 0, y: -90, filter: 'blur(9px)', duration: 1, ease: 'power2.in' });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={wrap}
      className={s.stationBlock}
      data-side={index % 2 === 0 ? 'left' : 'right'}
      data-pattern={(['dots', 'check', 'stripe'] as const)[index % 3]}
      style={{ '--accent': PALETTE[station.accent] } as React.CSSProperties}
    >
      {/*
        Each station takes its own colourway as a full panel. This used to be a
        caption floating over the WebGL ring that carried the colour; with the
        canvas gone the panel *is* the station, which is closer to how the deck
        treats them anyway.
      */}
      <div ref={inner} className={s.stationSticky} data-skin={station.accent}>
        <span className={`display ${s.stationIndex}`}>{station.index}</span>
        <h3 className={`display ${s.stationTitle}`}>{station.title}</h3>
        <p className={s.stationLine}>{station.line}</p>
        {/* Photography drops in behind this; the alt stays in the a11y tree. */}
        <span className="sr-only">{station.alt}</span>
      </div>
    </div>
  );
}

/**
 * Fixed readout of where you are in the flight. Only shown while the flight is
 * actually happening — left up, it collides with the footer and counts
 * stations you're no longer travelling through.
 */
function StationIndex() {
  const active = useStore((st) => st.activeStation);
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (el.current) {
        const [a, b] = ACTS.experience;
        const inside = rig.progress > a - 0.02 && rig.progress < b + 0.02;
        el.current.dataset.show = String(inside);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={el} className={s.indexReadout} data-show="false" aria-hidden="true">
      <span className={s.indexCurrent}>{String(active + 1).padStart(2, '0')}</span>
      <span className={s.indexRule} />
      <span className="micro dim">{String(STATIONS.length).padStart(2, '0')}</span>
    </div>
  );
}

export default function Experience() {
  return (
    <section data-act="experience" data-skin="shadow" id="experience" className={s.experience}>
      <h2 className="sr-only">The NO FILTER experience</h2>
      <StationIndex />
      {STATIONS.map((_, i) => (
        <StationCaption key={i} index={i} />
      ))}
    </section>
  );
}
