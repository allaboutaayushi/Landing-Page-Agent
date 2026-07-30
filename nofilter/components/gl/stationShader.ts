import * as THREE from 'three';

/**
 * Station imagery shader.
 *
 * Three jobs: warp the plane so it curves into the tunnel, split the channels
 * by scroll velocity so movement smears the picture, and wipe the image in
 * from the centre as you approach rather than fading it. When no photograph
 * has been supplied yet it draws an explicit holding frame instead — never a
 * fake image.
 */

export const stationVertex = /* glsl */ `
  uniform float uProximity;
  uniform float uVelocity;
  uniform float uTime;

  varying vec2 vUv;
  varying float vRadial;

  void main() {
    vUv = uv;

    vec3 p = position;
    vec2 c = uv - 0.5;
    float r = length(c);
    vRadial = r;

    // Barrel the plane away from the viewer at the edges so it reads as a
    // curved surface inside the ring, not a flat card.
    p.z -= r * r * 2.4;

    // Scroll velocity bows it further — the faster you move, the more it gives.
    p.z -= r * r * uVelocity * 2.0;

    // Slow breathing so a parked plane is never completely still.
    p.z += sin(uTime * 0.6 + r * 4.0) * 0.06;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const stationFragment = /* glsl */ `
  precision highp float;

  uniform sampler2D uTex;
  uniform float uHasTex;
  uniform float uProximity;
  uniform float uVelocity;
  uniform float uTime;
  uniform vec3 uHue;
  uniform float uIndex;

  varying vec2 vUv;
  varying float vRadial;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;

    // Chromatic split, strongest at the edges and with fast scroll.
    float amt = (0.004 + abs(uVelocity) * 0.03) * (0.35 + vRadial);
    vec2 dir = normalize(uv - 0.5 + 1e-5);

    vec3 col;
    if (uHasTex > 0.5) {
      col.r = texture2D(uTex, uv + dir * amt).r;
      col.g = texture2D(uTex, uv).g;
      col.b = texture2D(uTex, uv - dir * amt).b;
    } else {
      // Holding frame: a flat accent field with a rule grid and grain, clearly
      // a placeholder awaiting real photography.
      vec2 g = fract(uv * vec2(18.0, 11.0));
      float grid = step(0.97, g.x) + step(0.97, g.y);
      float diag = step(0.5, fract((uv.x + uv.y) * 9.0));
      col = mix(uHue * 0.16, uHue * 0.42, diag * 0.35);
      col += grid * 0.10;
    }

    // Grain — ties the WebGL layer to the grain overlay on the DOM.
    float n = hash(uv * 900.0 + uTime * 30.0);
    col += (n - 0.5) * 0.055;

    // Vignette into the ink ground so planes never show a hard rectangle edge.
    float vig = smoothstep(0.72, 0.24, vRadial);

    // Centre-out wipe driven by how close the camera is to this station.
    float wipe = smoothstep(vRadial - 0.18, vRadial + 0.02, uProximity * 0.95);

    // A thin accent bloom on the leading edge of the wipe.
    float edge = smoothstep(0.06, 0.0, abs(uProximity * 0.95 - vRadial));
    col = mix(col, uHue, edge * 0.55);

    float alpha = vig * wipe * uProximity;
    if (alpha < 0.002) discard;

    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;

export const makeStationMaterial = (hue: string) =>
  new THREE.ShaderMaterial({
    vertexShader: stationVertex,
    fragmentShader: stationFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTex: { value: null },
      uHasTex: { value: 0 },
      uProximity: { value: 0 },
      uVelocity: { value: 0 },
      uTime: { value: 0 },
      uHue: { value: new THREE.Color(hue) },
      uIndex: { value: 0 },
    },
  });
