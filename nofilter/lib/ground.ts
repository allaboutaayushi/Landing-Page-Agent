import * as THREE from 'three';
import { GROUND, PALETTE } from './palette';
import { STATIONS } from './content';
import { ACTS, stationT, STATION_COUNT } from '@/components/gl/path';

/**
 * The page's ground colour, as a function of scroll position.
 *
 * Shared between the sky and the fog so they can never disagree — when they
 * did, the far end of the tunnel kept the previous colour and left a seam.
 *
 * Through the tunnel the ground takes each station's own hue rather than
 * holding one neutral, so passing a ring changes the whole world instead of
 * swapping a detail on a cream field. That is also what removes the beige
 * that used to sit around a station filling the screen.
 *
 * Built on demand rather than as a constant, because the acts are re-measured
 * from the real DOM after layout and the station positions move with them.
 */
function groundKeys(): Array<[number, THREE.Color]> {
  const [expStart] = ACTS.experience;
  const [expectStart] = ACTS.expect;

  const keys: Array<[number, THREE.Color]> = [
    [0.0, new THREE.Color(PALETTE.red)],
    [0.1, new THREE.Color(PALETTE.red)],
    // Cream survives as the breath between the hero and the tunnel.
    [0.18, new THREE.Color(GROUND.cream)],
    [Math.max(expStart - 0.02, 0.19), new THREE.Color(GROUND.cream)],
  ];

  // One key per station, each a shade deepened so the ring and the type still
  // read against it — the sky is the room, not the light in it.
  for (let i = 0; i < STATION_COUNT; i++) {
    const hue = new THREE.Color(PALETTE[STATIONS[i].accent]).offsetHSL(0, 0.04, -0.14);
    keys.push([stationT(i), hue]);
  }

  keys.push([expectStart, new THREE.Color(PALETTE.yellow)]);
  keys.push([Math.min(expectStart + 0.07, 0.9), new THREE.Color(PALETTE.yellow)]);
  keys.push([0.94, new THREE.Color(PALETTE.pink)]);
  keys.push([1.0, new THREE.Color(PALETTE.pink)]);

  return keys.sort((a, b) => a[0] - b[0]);
}

/** Blooms take a hue off the ground, so they read as light rather than fill. */
function glowKeys(): Array<[number, THREE.Color]> {
  const keys: Array<[number, THREE.Color]> = [
    [0.0, new THREE.Color(PALETTE.yellow)],
    [0.18, new THREE.Color(PALETTE.teal)],
  ];
  for (let i = 0; i < STATION_COUNT; i++) {
    // A step along the ring, so the bloom is never the ground's own colour.
    const next = STATIONS[(i + 2) % STATION_COUNT].accent;
    keys.push([stationT(i), new THREE.Color(PALETTE[next]).offsetHSL(0, 0.1, 0.16)]);
  }
  keys.push([1.0, new THREE.Color(PALETTE.purple)]);
  return keys.sort((a, b) => a[0] - b[0]);
}

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

/*
 * Both curves are rebuilt only when the acts move, not per frame. Building
 * them on every call allocated a dozen Colors sixty times a second, which is
 * exactly the kind of churn that shows up as stutter on a mid-range phone.
 */
let cachedGround: Array<[number, THREE.Color]> | null = null;
let cachedGlow: Array<[number, THREE.Color]> | null = null;
let cacheStamp = '';

function refresh() {
  const stamp = `${ACTS.experience[0]}:${ACTS.experience[1]}:${ACTS.expect[0]}`;
  if (stamp === cacheStamp && cachedGround && cachedGlow) return;
  cacheStamp = stamp;
  cachedGround = groundKeys();
  cachedGlow = glowKeys();
}

export const groundAt = (p: number, out: THREE.Color) => {
  refresh();
  return sampleKeys(cachedGround!, p, out);
};

export const glowAt = (p: number, out: THREE.Color) => {
  refresh();
  return sampleKeys(cachedGlow!, p, out);
};
