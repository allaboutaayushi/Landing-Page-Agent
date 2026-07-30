/**
 * Per-frame state shared between the DOM and the WebGL layer.
 *
 * Deliberately NOT React state. Scroll progress and pointer position change
 * every frame; routing them through a store would re-render the tree 60x a
 * second. Lenis and the pointer listeners write here, `useFrame` reads here.
 */
export type Rig = {
  /** Global document scroll, 0 → 1. */
  progress: number;
  /** Raw scroll offset in px. */
  scroll: number;
  /** Normalised scroll velocity, roughly -1 → 1, smoothed. */
  velocity: number;
  /** Pointer in NDC, -1 → 1 on both axes. */
  pointer: { x: number; y: number };
  /**
   * False until the pointer has actually moved.
   *
   * Matters because (0, 0) is dead centre, not "nowhere". Anything that
   * pushes away from the pointer would otherwise be shoving at full strength
   * from the middle of the screen before the user has touched anything.
   */
  pointerActive: boolean;
  /** Smoothed pointer — what the camera parallax actually follows. */
  pointerLerp: { x: number; y: number };
  /** 0 while the preloader holds, 1 once the lens has shattered. */
  reveal: number;
  /** Continuous station position, e.g. 2.4 = 40% between station 2 and 3. */
  station: number;
  /** Viewport, kept here so shaders don't need a resize subscription. */
  viewport: { w: number; h: number; dpr: number };
  /** Set when the user drags/throws the reveal balls. */
  impulse: number;
};

export const rig: Rig = {
  progress: 0,
  scroll: 0,
  velocity: 0,
  pointer: { x: 0, y: 0 },
  pointerActive: false,
  pointerLerp: { x: 0, y: 0 },
  reveal: 0,
  station: 0,
  viewport: { w: 1, h: 1, dpr: 1 },
  impulse: 0,
};

export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export const mapRange = (v: number, a: number, b: number, c: number, d: number) =>
  c + ((clamp(v, Math.min(a, b), Math.max(a, b)) - a) / (b - a)) * (d - c);

/** Smoothstep, used everywhere a reveal needs an ease instead of a ramp. */
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
