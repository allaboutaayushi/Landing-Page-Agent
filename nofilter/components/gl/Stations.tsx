'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rig, clamp } from '@/lib/rig';
import { STATIONS } from '@/lib/content';
import { PALETTE } from '@/lib/palette';
import { STATION_Z, ACTS } from './path';
import { makeStationMaterial } from './stationShader';
import { blankTexture, useOptionalTexture } from './useOptionalTexture';

/**
 * One station: a ring you fly through with the photograph suspended inside it.
 *
 * Nothing here is a card or a tile — the image only exists as a surface inside
 * the tunnel, and it's only legible while the camera is near it. Approach,
 * pass, gone.
 */
function Station({ index }: { index: number }) {
  const station = STATIONS[index];
  const hue = PALETTE[station.accent];
  const z = STATION_Z[index];

  const group = useRef<THREE.Group>(null);
  const plane = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);

  const material = useMemo(() => makeStationMaterial(hue), [hue]);
  const texture = useOptionalTexture(station.image);

  // Stations alternate side-to-side so the flight weaves instead of tunnelling
  // dead straight through six identical hoops.
  const offsetX = (index % 2 === 0 ? 1 : -1) * (1.1 + (index % 3) * 0.35);
  const offsetY = index % 3 === 1 ? 0.9 : -0.55;

  useFrame((state, dt) => {
    // The tunnel belongs to its own act. Past the end of it a station plane
    // was still drifting behind the sections that follow, which is what made
    // the Expect list unreadable — the earlier fix covered it with an opaque
    // block and cut a hard edge straight through the scene instead. Fading
    // the geometry out leaves those sections on clean ground while keeping
    // the canvas continuous.
    // Keyed to where the Expect section *begins*, not where the tunnel act
    // ends — those are not the same point once the acts are measured from the
    // real DOM, and keying off the latter left station 06 still filling the
    // screen behind the Expect list. Fading across the run-up means the tunnel
    // is already gone by the time that list is on screen.
    const [expectStart] = ACTS.expect;
    const exit = clamp((expectStart - rig.progress) / 0.04);

    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uVelocity.value = rig.velocity;
    u.uTex.value = texture ?? blankTexture;
    u.uHasTex.value = texture ? 1 : 0;
    u.uIndex.value = index;

    // Proximity: 1 when the camera is level with this ring, falling away over
    // roughly one station's spacing either side.
    const camZ = state.camera.position.z;
    const dist = Math.abs(camZ - z);
    const proximity = clamp(1 - dist / 15);
    u.uProximity.value = proximity * exit;

    const g = group.current;
    if (g) {
      // Slow counter-rotation, plus a shove from scroll velocity.
      g.rotation.z = Math.sin(state.clock.elapsedTime * 0.15 + index) * 0.12 + rig.velocity * 0.15;
      g.position.x = offsetX + rig.pointerLerp.x * 0.5 * proximity;
      g.position.y = offsetY + rig.pointerLerp.y * 0.35 * proximity;
    }

    if (plane.current) {
      // The plane pushes toward you as you arrive, so passing it feels like
      // going through something rather than past it.
      const s = 0.86 + proximity * 0.2;
      plane.current.scale.set(s, s, 1);
      plane.current.rotation.z = -rig.velocity * 0.06;
    }

    // Once the ring is right on top of the camera it spans the whole screen and
    // turns into a giant coloured circle over the type. Fade it out through the
    // last stretch so you pass through it rather than into it.
    const passing = clamp(1 - (5 - Math.min(dist, 5)) / 5);
    const glow = (0.35 + proximity * 2.4 + Math.abs(rig.velocity) * 1.2) * passing * exit;

    if (ring.current) {
      (ring.current.material as THREE.MeshBasicMaterial).opacity =
        clamp(0.1 + proximity * 0.9) * passing * exit;
      ring.current.scale.setScalar(1 + proximity * 0.05);
    }
    if (ring2.current) {
      const m = ring2.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = glow;
      m.opacity = passing * exit;
      m.transparent = true;
      ring2.current.rotation.z = state.clock.elapsedTime * 0.12 * (index % 2 ? -1 : 1);
    }
  });

  return (
    <group ref={group} position={[offsetX, offsetY, z]}>
      {/* Outer hoop — the thing you pass through. */}
      <mesh ref={ring2}>
        <torusGeometry args={[5.2, 0.035, 10, 160]} />
        {/*
          The hoop used to be a near-black body lit by an emissive rim, which
          read as a glowing ring against a dark interior. On the cream ground
          that reads as mud — an unlit dark object on a light field — so the
          body is the station's own hue now and carries the colour itself.
        */}
        <meshStandardMaterial
          color={hue}
          emissive={hue}
          emissiveIntensity={0.45}
          metalness={0.35}
          roughness={0.35}
          toneMapped={false}
        />
      </mesh>

      {/* Inner hairline hoop, offset in Z, gives the ring depth on approach. */}
      <mesh ref={ring} position={[0, 0, -0.9]}>
        <torusGeometry args={[4.6, 0.008, 8, 120]} />
        <meshBasicMaterial color={hue} transparent opacity={0.75} toneMapped={false} />
      </mesh>

      {/* The photograph, suspended just behind the hoop. */}
      <mesh ref={plane} position={[0, 0, -1.6]} material={material}>
        <planeGeometry args={[8.6, 5.4, 64, 40]} />
      </mesh>
    </group>
  );
}

export default function Stations() {
  return (
    <group>
      {STATIONS.map((_, i) => (
        <Station key={i} index={i} />
      ))}
    </group>
  );
}
