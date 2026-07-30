import * as THREE from 'three';
import { clamp, mapRange, smoothstep } from '@/lib/rig';

/**
 * The ride.
 *
 * Scroll maps to one continuous camera flight rather than a stack of
 * independent section animations — that's what makes it read as a journey
 * instead of a sequence of reveals.
 *
 * Act boundaries are *measured from the DOM*, not hardcoded. Section heights
 * can change (copy edits, a new breakpoint, a different viewport) without the
 * camera drifting out of sync with the type — `setActs` rebuilds the keyframes
 * whenever the layout is measured.
 */

export const STATION_COUNT = 6;

/** Where each station ring sits on the Z axis. */
export const STATION_Z = Array.from({ length: STATION_COUNT }, (_, i) => -14 - i * 13);

export type ActName = 'hero' | 'whatIs' | 'experience' | 'expect' | 'getIn';
export type Acts = Record<ActName, [number, number]>;

/** Fallback split, used for the first frame before the DOM is measured. */
export const ACTS: Acts = {
  hero: [0.0, 0.11],
  whatIs: [0.11, 0.3],
  experience: [0.3, 0.74],
  expect: [0.74, 0.87],
  getIn: [0.87, 1.0],
};

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

let CAM_KEYS: Array<[number, THREE.Vector3]> = [];
let LOOK_KEYS: Array<[number, THREE.Vector3]> = [];

/** Scroll position at which the camera is level with station `i`. */
export const stationT = (i: number) => {
  const [a, b] = ACTS.experience;
  return a + ((b - a) * (i + 0.5)) / STATION_COUNT;
};

function buildKeys() {
  const [, heroEnd] = ACTS.hero;
  const [, whatEnd] = ACTS.whatIs;
  const [expStart] = ACTS.experience;
  const [, expectEnd] = ACTS.expect;
  const [getInStart, getInEnd] = ACTS.getIn;

  // Lateral drift between stations is deliberate — a dead straight dolly reads
  // as a slideshow, a weaving one reads as flight. Signs alternate to match
  // the side each station ring is offset to.
  const sway = [
    V(1.4, -0.6, 0),
    V(-1.6, 0.7, 0),
    V(1.2, 0.9, 0),
    V(-1.3, -0.8, 0),
    V(1.5, 0.4, 0),
    V(-0.9, -0.3, 0),
  ];

  CAM_KEYS = [
    [0, V(0, 0, 9)],
    [heroEnd, V(0.6, 0.5, 5.5)],
    [expStart, V(-0.8, 0.2, -2)],
    ...sway.map(
      (v, i) => [stationT(i), V(v.x, v.y, STATION_Z[i] + 4)] as [number, THREE.Vector3],
    ),
    [expectEnd, V(0, 0.4, STATION_Z[5] - 12)],
    [getInEnd, V(0, 0, STATION_Z[5] - 20)],
  ];

  // Always aiming a little further down the tunnel than we are.
  LOOK_KEYS = [
    [0, V(0, 0, 0)],
    [heroEnd, V(0, 0, -3)],
    [whatEnd, V(0, 0, -12)],
    [stationT(1), V(0, 0, STATION_Z[1] - 6)],
    [stationT(3), V(0, 0, STATION_Z[3] - 6)],
    [stationT(5), V(0, 0, STATION_Z[5] - 6)],
    [getInStart, V(0, 0, STATION_Z[5] - 20)],
    [getInEnd, V(0, 0, STATION_Z[5] - 26)],
  ];

  // Keys must be strictly increasing or the sampler will stall on a segment.
  const fix = (keys: Array<[number, THREE.Vector3]>) => {
    for (let i = 1; i < keys.length; i++) {
      if (keys[i][0] <= keys[i - 1][0]) keys[i][0] = keys[i - 1][0] + 1e-4;
    }
  };
  fix(CAM_KEYS);
  fix(LOOK_KEYS);
}

buildKeys();

/** Called after the layout is measured; rebuilds the flight to match. */
export function setActs(next: Partial<Acts>) {
  Object.assign(ACTS, next);
  buildKeys();
}

const sampleKeys = (keys: Array<[number, THREE.Vector3]>, t: number, out: THREE.Vector3) => {
  const p = clamp(t);
  if (p <= keys[0][0]) return out.copy(keys[0][1]);
  const last = keys[keys.length - 1];
  if (p >= last[0]) return out.copy(last[1]);
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (p >= t0 && p <= t1) {
      const k = (p - t0) / (t1 - t0);
      // Smoothstep between keys so direction changes ease instead of corner.
      return out.copy(v0).lerp(v1, k * k * (3 - 2 * k));
    }
  }
  return out.copy(last[1]);
};

export const cameraAt = (t: number, out: THREE.Vector3) => sampleKeys(CAM_KEYS, t, out);
export const lookAt = (t: number, out: THREE.Vector3) => sampleKeys(LOOK_KEYS, t, out);

/** Continuous station index, e.g. 2.4 = 40% of the way past station 2. */
export const stationAt = (t: number) => {
  const [a, b] = ACTS.experience;
  return clamp(mapRange(t, a, b, -0.5, STATION_COUNT - 0.5), -0.5, STATION_COUNT - 0.5);
};

/**
 * How far the lens has stepped aside for the statements section, 0 → 1.
 *
 * Shared with the lens itself so its position and its scale come off the same
 * curve — otherwise it shrinks and moves on two different clocks and reads as
 * two separate animations.
 */
export const asideAmount = (t: number) => {
  const span = ACTS.whatIs[1] - ACTS.whatIs[0];
  const inWhatIs = smoothstep(ACTS.hero[1], ACTS.whatIs[0] + span * 0.35, t);
  const leaving = smoothstep(ACTS.whatIs[1] - span * 0.15, ACTS.experience[0] + 0.04, t);
  return inWhatIs * (1 - leaving);
};

/**
 * The lens leads the camera down the tunnel — it's the thing you're following,
 * so it stays in front of you rather than being welded to the camera.
 *
 * Through the statements it swings out to the right and further away. That
 * section is carried by type, and a metre of glass parked over the middle of
 * the screen makes the copy unreadable.
 */
export const lensAt = (t: number, out: THREE.Vector3) => {
  cameraAt(t, out);
  out.z -= t < ACTS.hero[1] ? 9 : 7.5;
  out.x *= 0.35;
  out.y *= 0.35;

  const aside = asideAmount(t);
  out.x += aside * 4.6;
  out.y += aside * 1.4;
  out.z -= aside * 4.5;

  return out;
};
