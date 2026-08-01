'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { rig, clamp, damp } from '@/lib/rig';
import { useStore } from '@/lib/store';
import { setActs, type ActName, type Acts } from '@/components/gl/path';

/**
 * Reads each act's real scroll window out of the DOM.
 *
 * Sections declare themselves with `data-act`, so the camera flight is derived
 * from where the type actually sits rather than from hardcoded fractions that
 * silently rot the moment a section's height changes.
 */
function measureActs() {
  const limit = document.documentElement.scrollHeight - window.innerHeight;
  if (limit <= 0) return;

  const next: Partial<Acts> = {};
  document.querySelectorAll<HTMLElement>('[data-act]').forEach((el) => {
    const name = el.dataset.act as ActName | undefined;
    if (!name) return;
    const top = el.offsetTop;
    next[name] = [clamp(top / limit), clamp((top + el.offsetHeight) / limit)];
  });

  if (Object.keys(next).length) setActs(next);
}

gsap.registerPlugin(ScrollTrigger);

/**
 * Single source of truth for motion timing.
 *
 * Lenis drives the scroll, GSAP's ticker drives Lenis, and ScrollTrigger is
 * told to read from Lenis rather than the native scroll position. One clock,
 * so the DOM and the WebGL layer can never drift apart mid-scroll.
 */
export default function ScrollRig() {
  const entered = useStore((s) => s.entered);
  const gateOpen = useStore((s) => s.gateOpen);
  const captureOpen = useStore((s) => s.captureOpen);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lenis = new Lenis({
      duration: reduced ? 0.01 : 1.15,
      // Long, late-settling curve — the reference's scroll coasts rather than snaps.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !reduced,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.6,
      syncTouch: false,
    });

    // Expose for programmatic jumps (nav, CTA) without prop-drilling a ref.
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    let rawVelocity = 0;

    lenis.on('scroll', ({ scroll, limit, velocity }: { scroll: number; limit: number; velocity: number }) => {
      rig.scroll = scroll;
      rig.progress = limit > 0 ? clamp(scroll / limit) : 0;
      rawVelocity = clamp(velocity / 45, -1, 1);
      ScrollTrigger.update();
    });

    const tick = (time: number, deltaMs: number) => {
      lenis.raf(time * 1000);
      const dt = Math.min(deltaMs / 1000, 1 / 20);
      // Velocity is smoothed separately from Lenis' own value so it decays
      // gracefully to zero when the wheel stops, instead of cutting out.
      rig.velocity = damp(rig.velocity, rawVelocity, 9, dt);
      rawVelocity *= 0.92;
    };

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (typeof value === 'number') lenis.scrollTo(value, { immediate: true });
        return lenis.scroll;
      },
    });

    const onResize = () => {
      rig.viewport.w = window.innerWidth;
      rig.viewport.h = window.innerHeight;
      rig.viewport.dpr = Math.min(window.devicePixelRatio || 1, 2);
      // iOS toolbar collapse changes 100vh mid-scroll; pin the real value.
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      lenis.resize();
      ScrollTrigger.refresh();
      measureActs();
    };
    onResize();
    // Re-measure once fonts land — swapped typefaces change section heights.
    document.fonts?.ready.then(measureActs).catch(() => {});
    window.addEventListener('resize', onResize);

    const onPointer = (e: PointerEvent) => {
      rig.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      rig.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      rig.pointerActive = true;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      ScrollTrigger.getAll().forEach((t) => t.kill());
      lenis.destroy();
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, []);

  /**
   * The only place the page is locked or released.
   *
   * Three things can hold the scroll — the preloader, the door and the capture
   * panel — and they overlap in time. Deciding here rather than in each overlay
   * is what stops a later `start()` from quietly undoing an earlier `stop()`:
   * when the preloader finished it used to release a page the door was still
   * holding. `overflow: hidden` alone will not do it either, since that permits
   * programmatic scrolling and programmatic scrolling is exactly how Lenis
   * moves the page — so the rig has to be stopped, not just the scrollport.
   */
  useEffect(() => {
    const held = !entered || gateOpen || captureOpen;
    document.documentElement.dataset.locked = held ? 'true' : 'false';

    const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
    if (!lenis) return;
    if (held) {
      lenis.stop();
      // Anything the visitor scrolled past before the door resolved is undone,
      // so the page they are let into starts where it is meant to.
      if (gateOpen) lenis.scrollTo(0, { immediate: true });
    } else {
      lenis.start();
    }
  }, [entered, gateOpen, captureOpen]);

  return null;
}

/** Smooth-scroll to a selector or offset from anywhere in the tree. */
export function scrollTo(target: string | number, offset = 0) {
  const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.6 });
    return;
  }
  if (typeof target === 'string') {
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  }
}
