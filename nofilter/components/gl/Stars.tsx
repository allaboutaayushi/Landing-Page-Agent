'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rig, damp } from '@/lib/rig';
import { PALETTE, GROUND } from '@/lib/palette';

/**
 * The starfield.
 *
 * Stars sit in world space rather than travelling with the camera, so the
 * flight through the tunnel actually passes them — a field pinned to the
 * camera reads as wallpaper no matter how it moves. They span the whole
 * camera path with room either end, which is cheaper and steadier than
 * recycling them behind the camera every frame.
 *
 * Each is a box rather than a point, because points cannot be stretched.
 * Scaling one along its own Z elongates it toward the camera's direction of
 * travel, which is what produces the radial warp streaks when the scroll runs
 * fast — and points would also cost a second draw path for the same result.
 */

/** Additive, so stars read as light over whatever colour the sky is. */
const TINTS = [
  GROUND.white,
  GROUND.white,
  GROUND.cream,
  PALETTE.yellow,
  PALETTE.teal,
  PALETTE.pink,
];

type Props = { count?: number };

export default function Stars({ count = 520 }: Props) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const stretch = useRef(0);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const { seeds, colours } = useMemo(() => {
    const seeds = new Float32Array(count * 4);
    const colours = new Float32Array(count * 3);
    const c = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // A hollow cylinder around the flight path: nothing in the middle, or
      // stars would sit inside the rings and read as dirt on the lens.
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.pow(Math.random(), 0.6) * 34;

      seeds[i * 4 + 0] = Math.cos(angle) * radius;
      seeds[i * 4 + 1] = Math.sin(angle) * radius * 0.7;
      // Spanning the whole camera path, with headroom at both ends.
      seeds[i * 4 + 2] = 20 - Math.random() * 150;
      // Own size and twinkle phase, so the field never pulses in unison.
      seeds[i * 4 + 3] = Math.random();

      c.set(TINTS[(Math.random() * TINTS.length) | 0]);
      colours[i * 3 + 0] = c.r;
      colours[i * 3 + 1] = c.g;
      colours[i * 3 + 2] = c.b;
    }
    return { seeds, colours };
  }, [count]);

  useFrame((state, delta) => {
    const m = mesh.current;
    if (!m) return;

    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;

    // Damped, so stopping a fast scroll lets the streaks retract rather than
    // snapping back to points.
    stretch.current = damp(stretch.current, Math.min(Math.abs(rig.velocity) * 2.2, 1), 7, dt);

    // Parallax. The whole field leans with the pointer; because the stars are
    // at very different depths, a small rotation reads as real depth rather
    // than as a layer sliding.
    if (group.current) {
      group.current.rotation.y = damp(group.current.rotation.y, rig.pointerLerp.x * 0.08, 4, dt);
      group.current.rotation.x = damp(group.current.rotation.x, -rig.pointerLerp.y * 0.06, 4, dt);
    }

    for (let i = 0; i < count; i++) {
      const x = seeds[i * 4 + 0];
      const y = seeds[i * 4 + 1];
      const z = seeds[i * 4 + 2];
      const seed = seeds[i * 4 + 3];

      dummy.position.set(x, y, z);

      // Twinkle: a slow breath on each star's own phase.
      const twinkle = 0.55 + Math.sin(t * (0.6 + seed) + seed * 12) * 0.45;
      const size = (0.05 + seed * 0.11) * (0.6 + twinkle * 0.7);

      // Nearer stars streak further, which is what sells the parallax during
      // a fast scroll — everything stretching equally reads as a zoom blur.
      const depth = 1 - Math.min(Math.abs(z - state.camera.position.z) / 90, 1);
      dummy.scale.set(size, size, size * (1 + stretch.current * (6 + depth * 26)));

      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, count]}
        frustumCulled={false}
        renderOrder={-900}
      >
        <boxGeometry args={[1, 1, 1]}>
          <instancedBufferAttribute attach="attributes-color" args={[colours, 3]} />
        </boxGeometry>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
