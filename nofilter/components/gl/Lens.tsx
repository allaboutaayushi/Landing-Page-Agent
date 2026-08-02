'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { GROUND, PALETTE } from '@/lib/palette';
import { MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { rig, damp, smoothstep } from '@/lib/rig';
import { lensAt, asideAmount, ACTS } from './path';

/**
 * The lens — the object you follow through the whole page.
 *
 * A real biconvex profile rather than a sphere, because the entire brand idea
 * is a filter you're looking through and then losing. It leads the camera down
 * the tunnel, and the glass does the work: everything behind it arrives
 * refracted and split before you see it plainly.
 */
function useLensGeometry() {
  return useMemo(() => {
    const R = 1;
    const h = 0.34;
    const seg = 48;
    const pts: THREE.Vector2[] = [];
    // Front face: apex to rim.
    for (let i = 0; i <= seg; i++) {
      const k = i / seg;
      const r = R * Math.sin((k * Math.PI) / 2);
      pts.push(new THREE.Vector2(r, h * Math.cos((k * Math.PI) / 2)));
    }
    // Back face: rim back to apex, mirrored.
    for (let i = seg; i >= 0; i--) {
      const k = i / seg;
      const r = R * Math.sin((k * Math.PI) / 2);
      pts.push(new THREE.Vector2(r, -h * Math.cos((k * Math.PI) / 2)));
    }
    const geo = new THREE.LatheGeometry(pts, 96);
    geo.computeVertexNormals();
    return geo;
  }, []);
}

export default function Lens({ quality }: { quality: 'high' | 'low' }) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const rim = useRef<THREE.Mesh>(null);
  const geo = useLensGeometry();
  const pos = useRef(new THREE.Vector3(0, 0, 0));
  const tmp = useRef(new THREE.Vector3());
  const spin = useRef(0);

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 20);
    const t = rig.progress;
    const g = group.current;
    if (!g) return;

    lensAt(t, tmp.current);
    // Pointer pushes the lens around; it trails the camera rather than being
    // welded to it, which is what makes it feel like a separate object.
    tmp.current.x += rig.pointerLerp.x * 1.5;
    tmp.current.y += rig.pointerLerp.y * 1.0;
    pos.current.x = damp(pos.current.x, tmp.current.x, 3.2, d);
    pos.current.y = damp(pos.current.y, tmp.current.y, 3.2, d);
    pos.current.z = damp(pos.current.z, tmp.current.z, 9, d);
    g.position.copy(pos.current);

    // Scroll spins it. Idle, it keeps a slow drift so it never sits dead.
    spin.current += (0.12 + Math.abs(rig.velocity) * 2.4) * d;
    const wobble = state.clock.elapsedTime;
    g.rotation.set(
      Math.PI / 2 + Math.sin(wobble * 0.4) * 0.18 + rig.pointerLerp.y * 0.25,
      Math.sin(wobble * 0.28) * 0.2 - rig.pointerLerp.x * 0.3,
      spin.current,
    );

    // Four sizes across the page: full in the hero, small while it's stood
    // aside for the statements, mid through the tunnel — and then gone.
    //
    // It closing out at zero is the point of the whole thing. You spend the
    // page following a lens, and by the last section it isn't there any more:
    // the finale is the only thing you look at without a filter in the way.
    //
    // Each stage is a lerp *from the running value*, not a sum of offsets.
    // Summing looks equivalent and isn't: `aside` falls back to 0 once the
    // statements are behind you, which would spring the size back to full.
    const whatIsSpan = ACTS.whatIs[1] - ACTS.whatIs[0];
    const toWhatIs = smoothstep(ACTS.hero[1], ACTS.whatIs[0] + whatIsSpan * 0.35, t);
    const toTunnel = smoothstep(ACTS.whatIs[1] - whatIsSpan * 0.15, ACTS.experience[0] + 0.05, t);
    const toFinale = smoothstep(ACTS.expect[0], ACTS.getIn[0], t);

    let size = 1;
    size += (0.34 - size) * toWhatIs;
    size += (0.52 - size) * toTunnel;
    size += (0 - size) * toFinale;

    const s = rig.reveal * size;
    if (inner.current) inner.current.scale.setScalar(damp(inner.current.scale.x, s, 7, d));

    if (rim.current) {
      const m = rim.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.25 + Math.abs(rig.velocity) * 1.8;
    }
  });

  return (
    <group ref={group}>
      <group ref={inner} scale={0}>
        <mesh geometry={geo} castShadow={false} receiveShadow={false}>
          <MeshTransmissionMaterial
            samples={quality === 'high' ? 6 : 2}
            resolution={quality === 'high' ? 512 : 192}
            transmission={1}
            thickness={1.15}
            ior={1.52}
            roughness={0.04}
            // Dispersion is the whole point — you should see the split.
            chromaticAberration={0.42}
            anisotropicBlur={0.28}
            distortion={0.3}
            distortionScale={0.4}
            temporalDistortion={0.08}
            backside
            backsideThickness={0.6}
            color="#ffffff"
            attenuationColor="#cfe6ff"
            attenuationDistance={3.2}
          />
        </mesh>

        {/* Rim — reads as hardware, keeps the glass from looking like a bubble. */}
        <mesh ref={rim} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.005, 0.022, 12, 128]} />
          <meshStandardMaterial
            color={GROUND.shadow}
            metalness={0.9}
            roughness={0.25}
            emissive={PALETTE.red}
            emissiveIntensity={0.25}
          />
        </mesh>
      </group>
    </group>
  );
}
