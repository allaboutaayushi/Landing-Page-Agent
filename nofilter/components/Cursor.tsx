'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { damp } from '@/lib/rig';
import s from './Cursor.module.css';

/**
 * Two-part cursor: a dot pinned to the pointer and a ring that trails it.
 * The lag on the ring is what makes it feel physical rather than drawn.
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const mode = useStore((st) => st.cursorMode);
  const label = useStore((st) => st.cursorLabel);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduced.matches) return;

    document.documentElement.classList.add('nf-cursor-ready');

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;
    let last = performance.now();
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
    };

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      rx = damp(rx, x, 11, dt);
      ry = damp(ry, y, 11, dt);
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener('pointermove', onMove, { passive: true });

    // Leaving the window should hide it rather than park it at the edge.
    const onLeave = () => document.documentElement.classList.add('nf-cursor-out');
    const onEnter = () => document.documentElement.classList.remove('nf-cursor-out');
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerenter', onEnter);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerenter', onEnter);
      document.documentElement.classList.remove('nf-cursor-ready', 'nf-cursor-out');
    };
  }, []);

  return (
    <div className={s.root} data-mode={mode} aria-hidden="true">
      <div ref={ring} className={s.ring}>
        <span className={s.label}>{label}</span>
      </div>
      <div ref={dot} className={s.dot} />
    </div>
  );
}

/** Attach to any interactive element to drive the cursor state. */
export function cursorProps(mode: 'hover' | 'drag' | 'view', label = '') {
  const set = useStore.getState().setCursor;
  return {
    onPointerEnter: () => set(mode, label),
    onPointerLeave: () => set('default'),
  };
}
