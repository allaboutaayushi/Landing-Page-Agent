'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rig } from '@/lib/rig';
import { STATION_Z } from './path';

/**
 * Tunnel dust.
 *
 * Without something suspended in the volume the flight has no reference and
 * reads as objects sliding past a static camera. These particles are the
 * parallax cue that tells you *you* are the one moving.
 */
export default function Dust({ quality }: { quality: 'high' | 'low' }) {
  const count = quality === 'high' ? 900 : 350;
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const far = STATION_Z[STATION_Z.length - 1] - 30;
    for (let i = 0; i < count; i++) {
      // Hollow cylinder — nothing dead centre, or it fogs the lens.
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.5 + Math.random() * 12;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = Math.sin(angle) * radius * 0.7;
      pos[i * 3 + 2] = 14 - Math.random() * (14 - far);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.z = state.clock.elapsedTime * 0.008;
    }
    if (material.current) {
      // Streak out on fast scroll.
      material.current.size = 0.022 + Math.abs(rig.velocity) * 0.06;
      material.current.opacity = 0.22 + Math.abs(rig.velocity) * 0.35;
    }
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        ref={material}
        color="#f4f1ea"
        size={0.022}
        sizeAttenuation
        transparent
        opacity={0.22}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
