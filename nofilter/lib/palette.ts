/**
 * NO FILTER colour system.
 *
 * Every value here is sampled from the vector fills in the brand deck rather
 * than read off a screenshot — the logo artwork is auto-traced and carries
 * ~60 near-duplicate shades per page, so picking by eye lands a shade or two
 * off. These are the structural fills: the ones the artwork actually repeats.
 *
 * The brand uses colour as ground, not as accent. Sections take a whole
 * colourway each and the type inverts to suit — see `SKINS` below.
 */
export const PALETTE = {
  red: '#ED1C25',
  yellow: '#F5BD18',
  teal: '#53C4C5',
  pink: '#E13894',
  green: '#02B04B',
  purple: '#602A7D',
  orange: '#F26622',
} as const;

export type PaletteKey = keyof typeof PALETTE;

/**
 * Ground tones.
 *
 * `shadow` is the logo's drop shadow — a dark green-black, not pure black.
 * Keeping that cast is what stops the flat colour reading as clip art.
 */
export const GROUND = {
  /** Alias kept so the unmounted WebGL layer still compiles and can return. */
  ink: '#152B18',
  shadow: '#152B18',
  cream: '#F4E7D4',
  white: '#FBFCFC',
} as const;

/**
 * Ordered hue ring for the six experience stations and the index counters.
 * Red leads because it is the brand's default ground.
 */
export const HUE_ORDER: PaletteKey[] = [
  'red',
  'yellow',
  'teal',
  'pink',
  'green',
  'purple',
];

export const hueAt = (i: number) => PALETTE[HUE_ORDER[i % HUE_ORDER.length]];

/**
 * Which ink reads on which ground.
 *
 * Cream on the deep hues, shadow on the bright ones — decided per colour
 * rather than by a luminance formula, because yellow and teal both sit near
 * the threshold where a formula flips to the wrong answer.
 */
export const INK_ON: Record<PaletteKey | 'cream' | 'shadow', string> = {
  red: GROUND.cream,
  yellow: GROUND.shadow,
  teal: GROUND.shadow,
  pink: GROUND.cream,
  green: GROUND.cream,
  purple: GROUND.cream,
  orange: GROUND.shadow,
  cream: GROUND.shadow,
  shadow: GROUND.cream,
};
