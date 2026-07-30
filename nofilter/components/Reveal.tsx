'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Tags `Lines` is allowed to render as — kept small so the props stay typed. */
type RevealTag = 'div' | 'p' | 'span' | 'h2' | 'h3' | 'blockquote';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore } from '@/lib/store';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Type never cross-fades here — it wipes out from behind a hard edge, the way
 * the reference introduces every line. Fading is the one motion we avoid,
 * because it's what makes a site read as generic.
 */
export function Lines({
  lines,
  as = 'div',
  className,
  lineClassName,
  delay = 0,
  stagger = 0.075,
  start = 'top 88%',
  style,
}: {
  lines: ReactNode[];
  as?: RevealTag;
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  start?: string;
  style?: React.CSSProperties;
}) {
  const root = useRef<HTMLDivElement>(null);
  const entered = useStore((s) => s.entered);

  useEffect(() => {
    const el = root.current;
    if (!el || !entered) return;

    const targets = el.querySelectorAll<HTMLElement>('.line-mask > span');
    if (!targets.length) return;

    if (reducedMotion()) {
      gsap.set(targets, { yPercent: 0, rotate: 0, opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { yPercent: 112, rotate: 2.5, opacity: 0 },
        {
          yPercent: 0,
          rotate: 0,
          opacity: 1,
          duration: 1.05,
          ease: 'expo.out',
          stagger,
          delay,
          scrollTrigger: { trigger: el, start, once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [entered, delay, stagger, start]);

  // Narrowed to a single tag type for TS; the runtime value is whichever of
  // the allowed tags the caller picked.
  const Tag = as as 'div';

  return (
    <Tag ref={root} className={className} style={style}>
      {lines.map((line, i) => (
        <span className="line-mask" key={i}>
          <span className={lineClassName}>{line}</span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * Per-character entrance for the loud display type. Used sparingly — the
 * reference has exactly one or two moments where letters move individually,
 * and doing it everywhere would cheapen both.
 */
export function Chars({
  text,
  className,
  delay = 0,
  start = 'top 85%',
  style,
}: {
  text: string;
  className?: string;
  delay?: number;
  start?: string;
  style?: React.CSSProperties;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const entered = useStore((s) => s.entered);

  useEffect(() => {
    const el = root.current;
    if (!el || !entered) return;
    const chars = el.querySelectorAll<HTMLElement>('.char');
    if (!chars.length) return;

    if (reducedMotion()) {
      gsap.set(chars, { yPercent: 0, opacity: 1, scaleY: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        chars,
        { yPercent: 118, opacity: 0, scaleY: 1.25 },
        {
          yPercent: 0,
          opacity: 1,
          scaleY: 1,
          duration: 1.15,
          ease: 'expo.out',
          // From the middle outward, so the word resolves rather than types.
          stagger: { each: 0.032, from: 'center' },
          delay,
          scrollTrigger: { trigger: el, start, once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [entered, delay, start]);

  return (
    <span ref={root} className={className} style={style}>
      <span className="line-mask">
        <span>
          {[...text].map((ch, i) => (
            <span className="char" key={i}>
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

/**
 * Parallax drift for anything that should move against the scroll rather than
 * with it. Small values only — this is texture, not a feature.
 */
export function useDrift(ref: React.RefObject<HTMLElement | null>, distance = 60) {
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: distance },
        {
          y: -distance,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    });
    return () => ctx.revert();
  }, [ref, distance]);
}
