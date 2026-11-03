import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt } from './terrain.js';
import { seeded } from './noise.js';

// You arrive looking down -z across the valley; the sun hangs low ahead and to the right.
export const SUN = { elevation: 11, azimuth: 0.35 };
export function sunDirection(elevationDeg = SUN.elevation, azimuth = SUN.azimuth, out = new THREE.Vector3()) {
  const el = THREE.MathUtils.degToRad(elevationDeg);
  return out.set(Math.sin(azimuth) * Math.cos(el), Math.sin(el), -Math.cos(azimuth) * Math.cos(el));
}
export const HAZE = new THREE.Color('#f0c9a2');

/* ---------- a painted sky: apricot horizon, rose, soft blue, a big gentle sun ---------- */
export function createSky() {
  const uniforms = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uTime: { value: 0 },
    uZenith: { value: new THREE.Color('#4f86cc') },
    uMid: { value: new THREE.Color('#ee9f95') },
    uHorizon: { value: new THREE.Color('#ffc77e') },
    uSunColor: { value: new THREE.Color('#fff0cf') },
    uGold: { value: 0 }, // 0 → afternoon, 1 → golden hour (all boards read)
  };
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(4000, 48, 24),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSunDir, uZenith, uMid, uHorizon, uSunColor; uniform float uTime, uGold;
        varying vec3 vDir;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p){
          vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.0), f.x), f.y);
        }
        float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * vnoise(p); p *= 2.1; a *= 0.5; } return v; }
        void main(){
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 horizon = mix(uHorizon, vec3(1.0, 0.62, 0.38), uGold);
          vec3 mid = mix(uMid, vec3(0.95, 0.5, 0.48), uGold);
          vec3 col = mix(horizon, mid, smoothstep(0.0, 0.2, h));
          col = mix(col, uZenith, smoothstep(0.16, 0.75, h));
          col = mix(col, horizon * 0.92, smoothstep(0.0, -0.25, h));
          float s = max(dot(d, normalize(uSunDir)), 0.0);
          col += uSunColor * (pow(s, 8.0) * 0.18 + pow(s, 64.0) * 0.45);
          col += uSunColor * smoothstep(0.9991, 0.9996, s) * 1.6;
          // painterly cloud bands, lit from the sun side
          vec2 cp = d.xz / max(h + 0.15, 0.05);
          float c = fbm(vec2(cp.x * 0.35 + uTime * 0.003, cp.y * 1.1));
          float cloud = smoothstep(0.52, 0.78, c) * smoothstep(0.03, 0.16, h) * (1.0 - smoothstep(0.45, 0.8, h));
          vec3 cloudCol = mix(vec3(1.0, 0.88, 0.82), vec3(1.0, 0.78, 0.6), pow(s, 2.0));
          col = mix(col, cloudCol, cloud * 0.6);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  );
  mesh.frustumCulled = false;
  return {
    mesh,
    uniforms,
    setSun(dir) {
      uniforms.uSunDir.value.copy(dir);
    },
  };
}

/* ---------- lone trees on the crests: round, soft canopies ---------- */
function coloured(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.attributes.uv) g.deleteAttribute('uv');
  const c = new THREE.Color(color);
  const arr = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < arr.length; i += 3) arr.set([c.r, c.g, c.b], i);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function roundTree(rand) {
  const parts = [coloured(new THREE.CylinderGeometry(0.22, 0.38, 4.2, 7).translate(0, 2.1, 0), '#5b4330')];
  const blobs = 6 + Math.floor(rand() * 3);
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + rand();
    const r = i === 0 ? 0 : 1.4 + rand() * 1.0;
    const s = 1.6 + rand() * 1.1;
    const shade = ['#7aa83c', '#8cb847', '#9cc452', '#6c9a36'][i % 4];
    parts.push(coloured(new THREE.IcosahedronGeometry(s, 1).translate(Math.cos(a) * r, 5 + rand() * 1.6, Math.sin(a) * r), shade));
  }
  const geo = mergeGeometries(parts);
  geo.computeVertexNormals();
  return geo;
}

// Landmarks: a few near the boards, a few silhouetted on far crests.
export const TREE_SPOTS = [
  [-46, 27], [-30, -44], [26, -68], [55, 8], [-88, 58], [94, -24], [-12, -104], [70, 78],
];

export function createTrees() {
  const rand = seeded(77);
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  for (const [x, z] of TREE_SPOTS) {
    const tree = new THREE.Mesh(roundTree(rand), mat);
    const s = 1.1 + rand() * 0.6;
    tree.scale.setScalar(s);
    tree.rotation.y = rand() * Math.PI * 2;
    tree.position.set(x, heightAt(x, z) - 0.2, z);
    group.add(tree);
  }
  return group;
}
