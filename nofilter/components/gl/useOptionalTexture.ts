'use client';

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

/** 1×1 neutral texture, so the sampler is always bound on every driver. */
export const blankTexture = (() => {
  const t = new THREE.DataTexture(new Uint8Array([12, 12, 13, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
})();

/**
 * Loads a texture without suspending or throwing.
 *
 * The experience photography is supplied separately, so a missing file is an
 * expected state, not an error — the station falls back to its holding frame
 * and the page keeps running.
 */
export function useOptionalTexture(url: string) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  const loader = useMemo(() => new THREE.TextureLoader(), []);

  useEffect(() => {
    let cancelled = false;
    let loaded: THREE.Texture | null = null;

    loader.load(
      url,
      (t) => {
        if (cancelled) {
          t.dispose();
          return;
        }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        t.wrapS = THREE.ClampToEdgeWrapping;
        t.wrapT = THREE.ClampToEdgeWrapping;
        loaded = t;
        setTexture(t);
      },
      undefined,
      () => {
        // No file yet — stay on the holding frame, silently.
        if (!cancelled) setTexture(null);
      },
    );

    return () => {
      cancelled = true;
      loaded?.dispose();
    };
  }, [url, loader]);

  return texture;
}
