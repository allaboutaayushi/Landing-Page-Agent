/**
 * NO FILTER colour system.
 *
 * The reference exercises heavy restraint — near-monochrome ground with colour
 * used as punctuation, never as decoration. We keep that discipline: the page
 * ground stays ink/bone, and these hues appear only on accented words, the
 * station index, and the WebGL dispersion.
 */
export const PALETTE = {
  red: '#E6182A',
  green: '#00A650',
  magenta: '#E0207A',
  yellow: '#FFD23F',
  darkBlue: '#1A3794',
  purple: '#912B90',
  cyan: '#00BBD2',
  orange: '#F7921E',
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** Ground tones — deliberately not part of the brand palette. */
export const GROUND = {
  ink: '#0B0B0C',
  bone: '#F4F1EA',
} as const;

/** Ordered hue ring used by the WebGL stations and the index counters. */
export const HUE_ORDER: PaletteKey[] = [
  'red',
  'cyan',
  'yellow',
  'magenta',
  'green',
  'orange',
];

export const hueAt = (i: number) => PALETTE[HUE_ORDER[i % HUE_ORDER.length]];
