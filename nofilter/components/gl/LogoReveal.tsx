'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rig, clamp, smoothstep } from '@/lib/rig';
import { PALETTE, HUE_ORDER } from '@/lib/palette';
import { STATION_Z, ACTS } from './path';
import { makeWordmarkTexture } from './wordmarkTexture';

/**
 * The finale.
 *
 * The wordmark is behind a curtain of glass balls, so at rest it's smeared
 * and unreadable. Push the balls out of the way with the pointer and NO
 * FILTER resolves — the name of the thing is literally what you get once the
 * lenses are gone. Hand-rolled sim rather than a physics engine: the whole
 * behaviour is a spring back to rest, pointer repulsion and separation.
 */

/**
 * Depths are measured back from where the camera comes to rest at the end of
 * the flight (STATION_Z[5] − 20). The wordmark has to sit comfortably in front
 * of that, with the glass roughly half way between — put either behind the
 * camera and the finale simply never renders.
 */
const CAMERA_REST_Z = STATION_Z[5] - 20;
const WORDMARK_Z = CAMERA_REST_Z - 20;
const BALL_Z = CAMERA_REST_Z - 11;
const COUNT = 15;

type Ball = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rest: THREE.Vector3;
  r: number;
  hue: THREE.Color;
  spin: THREE.Euler;
};

export default function LogoReveal({ quality }: { quality: 'high' | 'low' }) {
  const count = quality === 'high' ? COUNT : 9;
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<THREE.Mesh[]>([]);
  const plane = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const pointerWorld = useMemo(() => new THREE.Vector3(), []);
  const scratch = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    // Fonts may still be swapping in; wait for them so the wordmark is drawn
    // in the real typeface rather than the fallback.
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      setTexture((prev) => {
        prev?.dispose();
        return makeWordmarkTexture(['NO', 'FILTER']);
      });
    };
    draw();
    document.fonts?.ready.then(draw).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => texture?.dispose(), [texture]);

  const balls = useMemo<Ball[]>(() => {
    const out: Ball[] = [];
    for (let i = 0; i < count; i++) {
      // Rest positions spread across the wordmark so it starts fully obscured.
      const col = i % 5;
      const row = Math.floor(i / 5);
      const rest = new THREE.Vector3(
        (col - 2) * 2.15 + (row % 2 ? 1.05 : 0),
        (1 - row) * 2.0,
        BALL_Z + (i % 3) * 0.55,
      );
      out.push({
        pos: rest.clone(),
        vel: new THREE.Vector3(),
        rest,
        r: 0.82 + (i % 4) * 0.12,
        hue: new THREE.Color(PALETTE[HUE_ORDER[i % HUE_ORDER.length]]),
        spin: new THREE.Euler(Math.random() * 6.28, Math.random() * 6.28, 0),
      });
    }
    return out;
  }, [count]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 20);

    // Only alive at the end of the ride; everything sleeps until then. Tied to
    // the measured act rather than a fixed fraction, so it still lands if the
    // section's height changes.
    const alive = smoothstep(ACTS.expect[1], ACTS.getIn[0] + (ACTS.getIn[1] - ACTS.getIn[0]) * 0.35, rig.progress);
    if (group.current) group.current.visible = alive > 0.001;
    if (alive <= 0.001) return;

    // Project the screen pointer onto the balls' plane so the shove happens
    // where the cursor actually is, at that depth.
    const persp = state.camera as THREE.PerspectiveCamera;
    const depth = Math.max(Math.abs(persp.position.z - BALL_Z), 0.5);
    const halfH = Math.tan((persp.fov * Math.PI) / 360) * depth;
    const halfW = halfH * persp.aspect;
    pointerWorld.set(
      persp.position.x + rig.pointer.x * halfW,
      persp.position.y + rig.pointer.y * halfH,
      BALL_Z,
    );

    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];

      // Spring home.
      scratch.copy(b.rest).sub(b.pos).multiplyScalar(5.5);
      b.vel.addScaledVector(scratch, d);

      // Pointer shove — inverse square, capped so it can't fling them to orbit.
      // Gated on the pointer having actually moved: at rest it reads as (0, 0),
      // which is the centre of the screen, so without this the curtain blows
      // itself apart before the user has done anything and there's nothing
      // left to uncover.
      if (rig.pointerActive) {
        scratch.copy(b.pos).sub(pointerWorld);
        const dist = Math.max(scratch.length(), 0.25);
        if (dist < 5.5) {
          const force = Math.min(42 / (dist * dist), 90);
          b.vel.addScaledVector(scratch.normalize(), force * d);
        }
      }

      // Idle drift so the curtain is never perfectly still.
      b.vel.x += Math.sin(state.clock.elapsedTime * 0.7 + i) * 0.35 * d;
      b.vel.y += Math.cos(state.clock.elapsedTime * 0.55 + i * 1.7) * 0.35 * d;

      b.vel.multiplyScalar(Math.exp(-2.6 * d));
      b.pos.addScaledVector(b.vel, d);
    }

    // Separation — one relaxation pass is plenty at this count.
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        scratch.copy(b.pos).sub(a.pos);
        const min = a.r + b.r;
        const dist = scratch.length();
        if (dist > 1e-4 && dist < min) {
          const push = (min - dist) * 0.5;
          scratch.multiplyScalar(push / dist);
          a.pos.sub(scratch);
          b.pos.add(scratch);
          a.vel.addScaledVector(scratch, -6);
          b.vel.addScaledVector(scratch, 6);
        }
      }
    }

    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const m = meshes.current[i];
      if (!m) continue;
      m.position.copy(b.pos);
      m.rotation.x += b.vel.y * d * 0.7;
      m.rotation.y -= b.vel.x * d * 0.7;
      m.scale.setScalar(b.r * alive);
    }

    if (plane.current) {
      // Faded via colour, not opacity — see the material below for why it has
      // to stay out of the transparent queue. Against an ink background,
      // darkening to black is indistinguishable from fading out.
      const mat = plane.current.material as THREE.MeshBasicMaterial;
      mat.color.setScalar(alive);
    }
  });

  return (
    <group ref={group} visible={false}>
      {/* The wordmark itself, flat and unlit so it reads as type, not an object. */}
      <mesh ref={plane} position={[0, 0, WORDMARK_Z]}>
        <planeGeometry args={[15, 7.5]} />
        {/*
          Alpha-tested rather than transparent, deliberately.

          three renders opaque → transmissive → transparent. A transparent
          wordmark lands in the last pass, so it paints *over* the glass and is
          left out of the transmission buffer the spheres sample — the type
          floats in front of the balls and none of it refracts, which reads
          backwards for a reveal. Alpha testing keeps it in the opaque pass,
          where it writes depth and shows up behind and through the glass.
        */}
        <meshBasicMaterial
          map={texture ?? undefined}
          alphaTest={0.5}
          color="#000000"
          toneMapped={false}
        />
      </mesh>

      {balls.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) meshes.current[i] = el;
          }}
          position={b.pos}
        >
          <sphereGeometry args={[1, 32, 32]} />
          {/* Thin and lightly tinted on purpose — these have to read as glass
              you can see the wordmark through, not as coloured marbles. */}
          <meshPhysicalMaterial
            color="#ffffff"
            transmission={0.98}
            thickness={0.55}
            ior={1.42}
            roughness={0.03}
            metalness={0}
            attenuationColor={b.hue}
            attenuationDistance={7}
            clearcoat={1}
            clearcoatRoughness={0.03}
            iridescence={0.45}
            iridescenceIOR={1.45}
            envMapIntensity={2.2}
          />
        </mesh>
      ))}
    </group>
  );
}
