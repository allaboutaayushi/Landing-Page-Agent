'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { rig, damp, smoothstep } from '@/lib/rig';
import { useStore } from '@/lib/store';
import { cameraAt, lookAt, stationAt, ACTS } from './path';

/**
 * Drives the camera straight from scroll. Two things stop it feeling robotic:
 * a damped pointer parallax layered on top of the path, and a velocity-driven
 * FOV kick so fast scrolling actually feels fast.
 */
export default function CameraRig() {
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(0, 0, 9));
  const target = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const lookSmooth = useRef(new THREE.Vector3(0, 0, 0));
  const setActiveStation = useStore((s) => s.setActiveStation);

  useFrame((_, dt) => {
    const d = Math.min(dt, 1 / 20);
    const t = rig.progress;

    rig.pointerLerp.x = damp(rig.pointerLerp.x, rig.pointer.x, 3.5, d);
    rig.pointerLerp.y = damp(rig.pointerLerp.y, rig.pointer.y, 3.5, d);
    rig.station = stationAt(t);

    cameraAt(t, target.current);

    // Parallax is strongest in the hero and tapers off once we're in the
    // tunnel, where the flight itself supplies the motion.
    const parallax = 1 - smoothstep(ACTS.hero[1], ACTS.experience[0], t) * 0.65;
    target.current.x += rig.pointerLerp.x * 1.05 * parallax;
    target.current.y += rig.pointerLerp.y * 0.7 * parallax;

    pos.current.x = damp(pos.current.x, target.current.x, 6, d);
    pos.current.y = damp(pos.current.y, target.current.y, 6, d);
    // Z is followed harder so the flight stays locked to the scrollbar.
    pos.current.z = damp(pos.current.z, target.current.z, 14, d);
    camera.position.copy(pos.current);

    lookAt(t, look.current);
    look.current.x += rig.pointerLerp.x * 0.4 * parallax;
    look.current.y += rig.pointerLerp.y * 0.25 * parallax;
    lookSmooth.current.lerp(look.current, 1 - Math.exp(-11 * d));

    // The flight only ever travels toward −Z, so the aim point must stay in
    // front of the camera. Without this clamp a long frame — a background tab
    // waking, a slow device, a nav link jumping half the page — lets the
    // damped aim point fall behind the camera, which spins it a full 180° and
    // renders the tunnel you already flew through instead of what's ahead.
    lookSmooth.current.z = Math.min(lookSmooth.current.z, camera.position.z - 3);

    camera.lookAt(lookSmooth.current);

    // Roll into the direction of travel — subtle, but it sells the flight.
    camera.rotation.z += rig.pointerLerp.x * 0.02 - rig.velocity * 0.015;

    const persp = camera as THREE.PerspectiveCamera;
    const targetFov = 42 + Math.abs(rig.velocity) * 7;
    persp.fov = damp(persp.fov, targetFov, 5, d);
    persp.updateProjectionMatrix();

    const nearest = Math.round(Math.max(0, rig.station));
    setActiveStation(nearest);
  });

  return null;
}
