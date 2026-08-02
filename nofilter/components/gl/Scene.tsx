'use client';

import { Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, AdaptiveDpr, Preload } from '@react-three/drei';
import * as THREE from 'three';
import { rig, damp } from '@/lib/rig';
import { useStore } from '@/lib/store';
import { GROUND, PALETTE } from '@/lib/palette';
import { groundAt } from '@/lib/ground';
import { ACTS } from './path';
import Backdrop from './Backdrop';
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
 * Keeps the fog on the same colour curve as the sky.
 *
 * The clear colour is no longer what you see — Backdrop paints the sky — but
 * fog still has to track it, or the far end of the tunnel keeps the previous
 * colour and leaves a seam where the two meet.
 */
const fogScratch = new THREE.Color();

function GroundColour() {
  useFrame((state, delta) => {
    const target = groundAt(rig.progress, fogScratch);
    const dt = Math.min(delta, 1 / 20);
    const fog = state.scene.fog;
    if (fog instanceof THREE.Fog) {
      fog.color.setRGB(
        damp(fog.color.r, target.r, 6, dt),
        damp(fog.color.g, target.g, 6, dt),
        damp(fog.color.b, target.b, 6, dt),
      );
    }
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
        <Backdrop />
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
