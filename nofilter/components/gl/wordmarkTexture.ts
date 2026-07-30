import * as THREE from 'three';

/**
 * Draws the wordmark to a canvas at runtime instead of shipping a 3D font.
 *
 * Keeps the WebGL wordmark on exactly the same font stack as the DOM, and
 * means the finale needs no network fetch for a typeface.
 */
export function makeWordmarkTexture(
  lines: string[],
  opts: { width?: number; height?: number; colour?: string } = {},
) {
  const width = opts.width ?? 2048;
  const height = opts.height ?? 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = opts.colour ?? '#F4F1EA';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lineHeight = height / (lines.length + 0.35);
    const fontSize = lineHeight * 0.92;
    const stack = `800 ${fontSize}px "NF Display", "Helvetica Neue", Helvetica, Arial, sans-serif`;

    lines.forEach((line, i) => {
      ctx.font = stack;
      // Tighten to the reference's display tracking by drawing per character.
      const tracking = -fontSize * 0.045;
      const chars = [...line];
      const total =
        chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) +
        tracking * (chars.length - 1);

      let x = width / 2 - total / 2;
      const y = lineHeight * (i + 0.68);
      for (const ch of chars) {
        const w = ctx.measureText(ch).width;
        ctx.fillText(ch, x + w / 2, y);
        x += w + tracking;
      }
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
