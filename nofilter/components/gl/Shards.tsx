'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rig, damp } from '@/lib/rig';
import { lensAt } from './path';
import { PALETTE, HUE_ORDER } from '@/lib/palette';

/**
 * The shell that breaks.
 *
 * Before the reveal these sit shoulder to shoulder as a sphere around the
 * lens. On the shatter they're thrown outward, and from then on they never
 * leave — they trail the lens for the rest of the page, each on its own lag,
 * so the debris of the intro is still with you at the last section.
 */

const COUNT = 46;

type Shard = {
  /** Resting point on the intact shell. */
  shell: THREE.Vector3;
  /** Where it drifts to once free, relative to the lens. */
  orbit: THREE.Vector3;
  vel: THREE.Vector3;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  spin: THREE.Vector3;
  scale: number;
  lag: number;
  phase: number;
};

export default function Shards({ quality }: { quality: 'high' | 'low' }) {
  const count = quality === 'high' ? COUNT : Math.round(COUNT * 0.5);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lensPos = useMemo(() => new THREE.Vector3(), []);
  const scratch = useMemo(() => new THREE.Vector3(), []);
  const exploded = useRef(false);

  const shards = useMemo<Shard[]>(() => {
    const out: Shard[] = [];
    // Fibonacci sphere so the intact shell has no visible seams or clumps.
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      const shell = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(1.75);
      const orbit = shell
        .clone()
        .normalize()
        .multiplyScalar(2.6 + Math.random() * 5.5);
      orbit.y += (Math.random() - 0.5) * 3;
      out.push({
        shell,
        orbit,
        vel: new THREE.Vector3(),
        pos: shell.clone(),
        quat: new THREE.Quaternion().setFromEuler(
          new THREE.Euler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28),
        ),
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 1.6,
          (Math.random() - 0.5) * 1.6,
          (Math.random() - 0.5) * 1.6,
        ),
        scale: 0.1 + Math.random() * 0.17,
        lag: 0.6 + Math.random() * 2.6,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return out;
  }, [count]);

  // Tint a handful of shards from the palette; the rest stay clear so the
  // colour reads as an accent rather than confetti.
  const colours = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      if (i % 7 === 0) c.set(PALETTE[HUE_ORDER[(i / 7) % HUE_ORDER.length]]);
      else c.set('#dfe9f5');
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [count]);

  const geo = useMemo(() => {
    // Irregular faceted chips — an icosahedron squashed on one axis reads as
    // broken glass far better than a regular solid.
    const g = new THREE.IcosahedronGeometry(1, 0);
    g.scale(1, 0.42, 1);
    return g;
  }, []);

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 20);
    const m = mesh.current;
    if (!m) return;

    lensAt(rig.progress, lensPos);
    lensPos.x += rig.pointerLerp.x * 1.5;
    lensPos.y += rig.pointerLerp.y * 1.0;

    const free = rig.reveal > 0.001;
    if (free && !exploded.current) {
      exploded.current = true;
      for (const sh of shards) {
        sh.vel.copy(sh.shell).normalize().multiplyScalar(5 + Math.random() * 7);
      }
    }

    const time = state.clock.elapsedTime;

    for (let i = 0; i < shards.length; i++) {
      const sh = shards[i];

      if (!free) {
        // Intact: the shell breathes very slightly, tightening as load completes.
        scratch.copy(sh.shell).multiplyScalar(1 + Math.sin(time * 1.2 + sh.phase) * 0.02);
        sh.pos.copy(lensPos).add(scratch);
      } else {
        // Free: ballistic for a beat, then settle into a lagging orbit.
        scratch
          .copy(sh.orbit)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), time * 0.08 + sh.phase * 0.3);
        scratch.x += Math.sin(time * 0.5 + sh.phase) * 0.7;
        scratch.y += Math.cos(time * 0.42 + sh.phase * 1.3) * 0.7;
        scratch.z += Math.sin(time * 0.33 + sh.phase * 0.7) * 0.7;
        scratch.add(lensPos);
        // Scroll velocity smears them backwards down the tunnel.
        scratch.z += rig.velocity * 3.5;

        sh.vel.multiplyScalar(Math.exp(-2.2 * d));
        sh.pos.addScaledVector(sh.vel, d);
        sh.pos.x = damp(sh.pos.x, scratch.x, sh.lag, d);
        sh.pos.y = damp(sh.pos.y, scratch.y, sh.lag, d);
        sh.pos.z = damp(sh.pos.z, scratch.z, sh.lag * 1.4, d);
      }

      const spinRate = free ? 1 + Math.abs(rig.velocity) * 3 : 0.15;
      sh.quat.multiply(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(sh.spin.x * d * spinRate, sh.spin.y * d * spinRate, sh.spin.z * d * spinRate),
        ),
      );

      dummy.position.copy(sh.pos);
      dummy.quaternion.copy(sh.quat);
      dummy.scale.setScalar(sh.scale * (free ? 1 : 0.85 + rig.reveal * 0.15));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }

    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, count]} frustumCulled={false}>
      <instancedBufferAttribute attach="geometry-attributes-color" args={[colours, 3]} />
      <meshPhysicalMaterial
        vertexColors
        transparent
        opacity={0.62}
        roughness={0.06}
        metalness={0}
        // Iridescence gives the dispersion read of real glass without paying
        // for a transmission render pass on 46 instances.
        iridescence={1}
        iridescenceIOR={1.7}
        iridescenceThicknessRange={[100, 640]}
        clearcoat={1}
        clearcoatRoughness={0.05}
        envMapIntensity={2.2}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
