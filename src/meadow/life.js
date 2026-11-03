import * as THREE from 'three';
import { seeded } from './noise.js';

// Pollen and dust motes, glowing when they catch the low sun.
export function createPollen(count) {
  const rand = seeded(9);
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set([(rand() - 0.5) * 40, rand() * 6, -rand() * 50 + 20], i * 3);
    seed[i] = rand();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3() }, uPixelRatio: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime; uniform float uPixelRatio; uniform vec3 uSunDir;
      varying float vA;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.21 + aSeed * 40.0) * 1.2;
        p.y += mod(uTime * (0.05 + aSeed * 0.08) + aSeed * 6.0, 6.0);
        p.z += cos(uTime * 0.17 + aSeed * 23.0) * 1.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec3 V = normalize((modelMatrix * vec4(p, 1.0)).xyz - cameraPosition);
        float lit = 0.25 + pow(max(dot(V, uSunDir), 0.0), 6.0) * 2.5;
        vA = lit * (0.5 + 0.5 * sin(uTime * 2.0 + aSeed * 50.0));
        gl_PointSize = (1.4 + aSeed * 1.8) * uPixelRatio * 22.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA;
        gl_FragColor = vec4(vec3(1.0, 0.9, 0.65) * a, a);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return {
    points,
    update(t, sunDir, pr) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uSunDir.value.copy(sunDir);
      mat.uniforms.uPixelRatio.value = pr;
    },
  };
}
