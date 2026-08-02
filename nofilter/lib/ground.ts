import * as THREE from 'three';
import { GROUND, PALETTE } from './palette';

/**
 * The page's ground colour, as a function of scroll position.
 *
 * Shared between the sky and the fog so they can never disagree — when they
 * did, the far end of the tunnel kept the previous colour and left a seam.
 * Each keyframe matches the [data-skin] of the section at that point, so the
 * ink chosen for a section is always the one sitting on its actual ground.
 */
export const GROUND_KEYS: Array<[number, THREE.Color]> = [
  [0.0, new THREE.Color(PALETTE.red)],
  [0.1, new THREE.Color(PALETTE.red)],
  [0.18, new THREE.Color(GROUND.cream)],
  [0.72, new THREE.Color(GROUND.cream)],
  [0.78, new THREE.Color(PALETTE.yellow)],
  [0.85, new THREE.Color(PALETTE.yellow)],
  [0.92, new THREE.Color(PALETTE.pink)],
  [1.0, new THREE.Color(PALETTE.pink)],
];

/** Which hue the blooms take at a given point — always a step off the ground. */
export const GLOW_KEYS: Array<[number, THREE.Color]> = [
  [0.0, new THREE.Color(PALETTE.yellow)],
  [0.18, new THREE.Color(PALETTE.teal)],
  [0.5, new THREE.Color(PALETTE.pink)],
  [0.78, new THREE.Color(PALETTE.orange)],
  [1.0, new THREE.Color(PALETTE.purple)],
];

export function sampleKeys(
  keys: Array<[number, THREE.Color]>,
  progress: number,
  out: THREE.Color,
) {
  const p = Math.min(Math.max(progress, 0), 1);
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, c0] = keys[i];
    const [t1, c1] = keys[i + 1];
    if (p >= t0 && p <= t1) {
      const span = t1 - t0;
      const raw = span === 0 ? 0 : (p - t0) / span;
      // Smoothstep, so a keyframe boundary is never a visible corner.
      return out.copy(c0).lerp(c1, raw * raw * (3 - 2 * raw));
    }
  }
  return out.copy(keys[keys.length - 1][1]);
}

export const groundAt = (p: number, out: THREE.Color) => sampleKeys(GROUND_KEYS, p, out);
export const glowAt = (p: number, out: THREE.Color) => sampleKeys(GLOW_KEYS, p, out);
