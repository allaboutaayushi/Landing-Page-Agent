'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rig } from '@/lib/rig';
import { groundAt, glowAt } from '@/lib/ground';

/**
 * The sky.
 *
 * A flat clear colour gave the page a single value at any moment, which is
 * what made the section changes read as a hard horizontal edge rather than a
 * transition. This is an inverted sphere around the camera carrying a vertical
 * gradient instead, so the ground always has somewhere to travel — the edge
 * becomes a fade, and there is depth behind the geometry rather than paper.
 *
 * It also carries two slow-moving aurora blooms. They are the cheapest way to
 * get a surface that feels alive without another pass of geometry: two soft
 * radial fields drifting on their own clocks, never quite repeating.
 */
const vert = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uGlow;
  uniform float uTime;
  uniform float uEnergy;
  varying vec3 vPos;

  // Cheap value noise — enough to break up a gradient without banding.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec3 dir = normalize(vPos);

    // Vertical gradient, eased so the horizon is a long fade not a line.
    float h = dir.y * 0.5 + 0.5;
    h = smoothstep(0.05, 0.95, h);
    vec3 col = mix(uBottom, uTop, h);

    // Two aurora blooms on different clocks, so the pattern never repeats.
    float a = 1.0 - length(dir.xy - vec2(sin(uTime * 0.07) * 0.5, cos(uTime * 0.05) * 0.35));
    float b = 1.0 - length(dir.xy - vec2(cos(uTime * 0.043) * -0.6, sin(uTime * 0.061) * 0.4));
    float bloom = pow(max(a, 0.0), 2.4) * 0.55 + pow(max(b, 0.0), 3.0) * 0.4;
    col = mix(col, uGlow, bloom * (0.35 + uEnergy * 0.4));

    // A little grain, or the gradient bands on wide flat areas.
    col += (hash(gl_FragCoord.xy) - 0.5) * 0.012;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const scratchA = new THREE.Color();
const scratchB = new THREE.Color();

export default function Backdrop() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color('#ed1c25') },
      uBottom: { value: new THREE.Color('#ed1c25') },
      uGlow: { value: new THREE.Color('#f5bd18') },
      uTime: { value: 0 },
      uEnergy: { value: 0 },
    }),
    [],
  );

  useFrame((state) => {
    if (!mat.current) return;

    // The sky travels with the camera, so the tunnel never reaches its edge.
    if (mesh.current) mesh.current.position.copy(state.camera.position);

    const ground = groundAt(rig.progress, scratchA);
    const glow = glowAt(rig.progress, scratchB);

    // Top slightly lifted, bottom slightly deepened — a flat fill in two
    // directions is what a gradient needs to be legible as one.
    mat.current.uniforms.uTop.value.copy(ground).offsetHSL(0, 0.02, 0.06);
    mat.current.uniforms.uBottom.value.copy(ground).offsetHSL(0, -0.02, -0.08);
    mat.current.uniforms.uGlow.value.copy(glow);

    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    // Blooms lift while you're moving, so scrolling feels like stirring it.
    mat.current.uniforms.uEnergy.value = Math.min(Math.abs(rig.velocity), 1);
  });

  return (
    // Rendered first and depth-free, so everything else sits in front of it
    // regardless of how far the camera travels down the tunnel.
    <mesh ref={mesh} renderOrder={-1000} frustumCulled={false} scale={90}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}
