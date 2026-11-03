import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { fbm2, seeded } from './noise.js';
import { WIND_GLSL, LIGHT_GLSL } from './shading.js';

export { sharedUniforms } from './shading.js';

// The meadow's area: where grass and flowers grow densely.
export const MEADOW = { x0: -34, x1: 34, z0: -52, z1: 32 };

export function createGrass(uniforms, count) {
  // one blade: 3 segments tapering to a point, unit width and height
  const ys = [0, 0.3, 0.62, 1];
  const ws = [1, 0.82, 0.5, 0];
  const pos = [];
  ys.forEach((y, i) => {
    pos.push(-0.5 * ws[i], y, 0);
    if (i < 3) pos.push(0.5 * ws[i], y, 0);
  });
  const idx = [0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6];
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);

  const rand = seeded(7);
  const offsets = new Float32Array(count * 3);
  const params = new Float32Array(count * 4);
  let n = 0;
  while (n < count) {
    const x = MEADOW.x0 + rand() * (MEADOW.x1 - MEADOW.x0);
    const z = MEADOW.z0 + rand() * (MEADOW.z1 - MEADOW.z0);
    // tussocks: denser where the noise is high
    if (rand() > 0.35 + 0.65 * (0.5 + 0.5 * fbm2(x * 0.09, z * 0.09, 3))) continue;
    offsets.set([x, heightAt(x, z) - 0.02, z], n * 3);
    const tall = 0.5 + 0.5 * fbm2(x * 0.04 + 3, z * 0.04, 2);
    params.set([rand() * Math.PI, 0.25 + rand() * 0.35 + tall * 0.3, 0.035 + rand() * 0.03, rand()], n * 4);
    n++;
  }
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
  geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
  geo.instanceCount = count;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -10), 80);

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec3 aOffset; attribute vec4 aParams;
      varying float vK; varying float vDry; varying vec3 vWorld;
      ${WIND_GLSL}
      void main(){
        float k = position.y;
        vec3 p = vec3(position.x * aParams.z, k * aParams.y, 0.0);
        float c = cos(aParams.x), s = sin(aParams.x);
        p = vec3(p.x * c, p.y, p.x * s);
        vec2 b = sway(aOffset, k, 1.0) * aParams.y;
        p.xz += b;
        p.y -= dot(b, b) * 0.45; // keep the blade roughly its length as it bends
        vec3 world = aOffset + p;
        vK = k; vDry = aParams.w; vWorld = world;
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vK; varying float vDry; varying vec3 vWorld;
      ${LIGHT_GLSL}
      void main(){
        vec3 root = vec3(0.07, 0.15, 0.04);
        vec3 tip = mix(vec3(0.34, 0.5, 0.14), vec3(0.62, 0.55, 0.26), smoothstep(0.55, 1.0, vDry));
        vec3 albedo = mix(root, tip, smoothstep(0.0, 0.9, vK));
        gl_FragColor = vec4(shade(albedo, vec3(0.0, 1.0, 0.0), vWorld, vK), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  return mesh;
}
