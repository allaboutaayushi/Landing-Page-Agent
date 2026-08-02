'use client';

import { Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, AdaptiveDpr, Preload } from '@react-three/drei';
import * as THREE from 'three';
import { rig, damp } from '@/lib/rig';
import { useStore } from '@/lib/store';
import { GROUND, PALETTE } from '@/lib/palette';
import { ACTS } from './path';
import CameraRig from './CameraRig';
import Lens from './Lens';
import Shards from './Shards';
import Stations from './Stations';
import LogoReveal from './LogoReveal';
import Dust from './Dust';

/** Cheap capability read — enough to decide how much glass we can afford. */
function useQuality(): 'high' | 'low' {
  const [quality, setQuality] = useState<'high' | 'low'>('low');
  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.innerWidth < 900;
    const cores = navigator.hardwareConcurrency ?? 4;
    const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
    setQuality(coarse || narrow || cores <= 4 || memory <= 4 ? 'low' : 'high');
  }, []);
  return quality;
}

/**
 * Bridges the store's reveal flag into the per-frame rig, and eases it rather
 * than snapping so the shatter has a ramp to ride.
 */
/**
 * Drives the scene's ground colour from scroll position.
 *
 * The canvas is one continuous surface behind the whole page, so a single
 * clear colour painted every section alike — which is why everything past the
 * hero read as the logo's dark green. The ground now walks the brand's
 * colourways instead, and each keyframe matches the [data-skin] on the section
 * above it, so the DOM's ink is always the one chosen to sit on that ground.
 *
 * The tunnel runs on cream rather than a dark interior. Coloured rings on a
 * light field is the higher-contrast reading, but it does mean the stations
 * are lit differently — see Stations for the exposure that goes with this.
 */
const GROUND_KEYS: Array<[number, THREE.Color]> = [
  [0.0, new THREE.Color(PALETTE.red)],
  [0.1, new THREE.Color(PALETTE.red)],
  [0.18, new THREE.Color(GROUND.cream)],
  [0.72, new THREE.Color(GROUND.cream)],
  [0.78, new THREE.Color(PALETTE.yellow)],
  [0.85, new THREE.Color(PALETTE.yellow)],
  [0.92, new THREE.Color(PALETTE.pink)],
  [1.0, new THREE.Color(PALETTE.pink)],
];

const scratch = new THREE.Color();

/** The ground colour at a given scroll position, interpolated between keys. */
function groundAt(progress: number, out: THREE.Color) {
  const p = Math.min(Math.max(progress, 0), 1);

  for (let i = 0; i < GROUND_KEYS.length - 1; i++) {
    const [t0, c0] = GROUND_KEYS[i];
    const [t1, c1] = GROUND_KEYS[i + 1];
    if (p >= t0 && p <= t1) {
      const span = t1 - t0;
      // Smoothstep, so a keyframe boundary is not a visible corner.
      const raw = span === 0 ? 0 : (p - t0) / span;
      const eased = raw * raw * (3 - 2 * raw);
      return out.copy(c0).lerp(c1, eased);
    }
  }
  return out.copy(GROUND_KEYS[GROUND_KEYS.length - 1][1]);
}

function GroundColour() {
  useFrame((state, delta) => {
    const target = groundAt(rig.progress, scratch);
    const scene = state.scene;

    if (!(scene.background instanceof THREE.Color)) {
      scene.background = target.clone();
      return;
    }

    // Damped, so a fast scroll eases rather than strobing.
    const dt = Math.min(delta, 1 / 20);
    scene.background.setRGB(
      damp(scene.background.r, target.r, 6, dt),
      damp(scene.background.g, target.g, 6, dt),
      damp(scene.background.b, target.b, 6, dt),
    );
    // Fog has to track the ground or the far end of the tunnel keeps the old
    // colour and leaves a seam where the two meet.
    if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(scene.background);
  });
  return null;
}

function RevealBridge() {
  const shattered = useStore((s) => s.shattered);
  useEffect(() => {
    if (!shattered) return;
    let raf = 0;
    const start = performance.now();
    const step = () => {
      const t = Math.min((performance.now() - start) / 1400, 1);
      rig.reveal = 1 - Math.pow(1 - t, 3);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [shattered]);
  return null;
}

export default function Scene() {
  const quality = useQuality();
  const setLoadProgress = useStore((s) => s.setLoadProgress);

  // The scene is procedural, so there's no asset graph to wait on. Report a
  // short deterministic warm-up instead of faking a loader against nothing.
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = () => {
      const t = Math.min((performance.now() - start) / 1200, 1);
      setLoadProgress(t);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [setLoadProgress]);

  return (
    <div className="gl-root" aria-hidden="true">
      <Canvas
        dpr={quality === 'high' ? [1, 1.75] : [1, 1.25]}
        gl={{
          antialias: quality === 'high',
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        camera={{ fov: 42, near: 0.1, far: 220, position: [0, 0, 9] }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          // Opens on the brand red; GroundColour takes it from here.
          scene.background = new THREE.Color(PALETTE.red);
          // Fog eats the far end of the tunnel so stations arrive out of black.
          scene.fog = new THREE.Fog(PALETTE.red, 18, 88);
        }}
      >
        <RevealBridge />
        <GroundColour />
        <CameraRig />

        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 6]} intensity={1.1} />
        <directionalLight position={[-6, -2, -4]} intensity={0.5} color="#7aa2ff" />

        <Suspense fallback={null}>
          {/* Built from lightformers rather than an HDRI so the glass has
              something to reflect without fetching an environment map. */}
          <Environment resolution={quality === 'high' ? 256 : 128}>
            <color attach="background" args={[GROUND.ink]} />
            <Lightformer intensity={2.6} position={[0, 4, -6]} scale={[10, 6, 1]} color="#ffffff" />
            <Lightformer intensity={1.6} position={[-6, 1, -2]} scale={[3, 8, 1]} color={PALETTE.teal} />
            <Lightformer intensity={1.8} position={[6, -1, -2]} scale={[3, 8, 1]} color={PALETTE.red} />
            <Lightformer intensity={1.1} position={[0, -5, 2]} scale={[10, 3, 1]} color={PALETTE.yellow} />
            <Lightformer
              form="ring"
              intensity={2.2}
              position={[0, 0, 6]}
              scale={5}
              color="#f4f1ea"
            />
          </Environment>

          <Dust quality={quality} />
          <Stations />
          <Shards quality={quality} />
          <Lens quality={quality} />
          <LogoReveal quality={quality} />
          <Preload all />
        </Suspense>

        <AdaptiveDpr pixelated={false} />
      </Canvas>
    </div>
  );
}
