import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt } from './terrain.js';
import { fbm2, seeded } from './noise.js';
// Wildflowers are scattered across the explorable valley.
const MEADOW = { x0: -100, x1: 100, z0: -105, z1: 90 };
import { WIND_GLSL, LIGHT_GLSL, LIFE_GLSL } from './shading.js';
import { distanceToPath } from './places.js';

// The wildflowers of Rainier's subalpine meadows, each built from a few primitives (metres).

function part(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.attributes.uv) g.deleteAttribute('uv');
  const c = new THREE.Color(color);
  const arr = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < arr.length; i += 3) arr.set([c.r, c.g, c.b], i);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

const stem = (h, color = '#3f6a2a') => part(new THREE.CylinderGeometry(0.004, 0.006, h, 4).translate(0, h / 2, 0), color);

// A flat many-petalled head (daisy-like), facing up, tilted towards the light.
function rayHead(petals, radius, petal, centre, tilt) {
  const shape = new THREE.Shape();
  const steps = petals * 4;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = radius * (0.35 + 0.65 * Math.pow(Math.abs(Math.cos((a * petals) / 2)), 0.6));
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const head = part(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2 + tilt), petal);
  const disc = part(new THREE.SphereGeometry(radius * 0.28, 6, 4).scale(1, 0.55, 1), centre);
  return [head, disc];
}

const SPECIES = {
  // Subalpine lupine: a spike of violet-blue pea flowers
  lupine() {
    const h = 0.55;
    const parts = [stem(h)];
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const a = i * 2.4;
      const r = 0.036 * (1 - t * 0.7);
      const c = new THREE.Color('#3f3fa8').lerp(new THREE.Color('#8a7fe6'), t);
      if (i % 4 === 0) c.lerp(new THREE.Color('#ffffff'), 0.35); // the white banner petals
      parts.push(part(new THREE.OctahedronGeometry(0.023, 0).translate(Math.cos(a) * r, h * 0.55 + t * h * 0.45, Math.sin(a) * r), c));
    }
    return { geo: mergeGeometries(parts), height: h };
  },
  // Indian paintbrush: scarlet (or magenta) bracts clustered at the top
  paintbrush(color) {
    const h = 0.36;
    const parts = [stem(h)];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.2;
      const y = h * 0.72 + (i / 8) * h * 0.25;
      const g = new THREE.ConeGeometry(0.017, 0.06, 5).rotateZ(Math.cos(a) * 0.35).rotateX(Math.sin(a) * 0.35);
      parts.push(part(g.translate(Math.cos(a) * 0.012, y, Math.sin(a) * 0.012), color));
    }
    return { geo: mergeGeometries(parts), height: h };
  },
  // Avalanche lily: white, nodding, golden centre
  lily() {
    const h = 0.26;
    const [head, disc] = rayHead(6, 0.052, '#fbfaf3', '#f2c230', 0.7);
    return { geo: mergeGeometries([stem(h), head.translate(0, h, 0), disc.translate(0, h, 0)]), height: h };
  },
  // Broadleaf arnica: bright yellow
  arnica() {
    const h = 0.4;
    const [head, disc] = rayHead(11, 0.048, '#f5c518', '#d08a10', 0.35);
    return { geo: mergeGeometries([stem(h), head.translate(0, h, 0), disc.translate(0, h, 0)]), height: h };
  },
  // A few oxeye daisies
  daisy() {
    const h = 0.48;
    const [head, disc] = rayHead(14, 0.046, '#ffffff', '#f0b81c', 0.3);
    return { geo: mergeGeometries([stem(h), head.translate(0, h, 0), disc.translate(0, h, 0)]), height: h };
  },
};

// [species, share of the total, noise seed for its drifts]
const MIX = [
  ['lupine', 0.36, 1],
  ['paintbrush', 0.16, 2, '#d8281e'],
  ['paintbrushMagenta', 0.06, 3, '#c22a6a'],
  ['arnica', 0.17, 4],
  ['lily', 0.12, 5],
  ['daisy', 0.13, 6],
];

// Which buds grow around each board (in BOARDS order), and the colours their petals add to the stream.
export const CLUSTERS = {
  hello: ['daisy', 'paintbrushMagenta'],
  work: ['lupine'],
  making: ['paintbrush', 'arnica'],
  photos: ['lily', 'daisy'],
  contact: ['lupine', 'paintbrush', 'arnica', 'lily', 'paintbrushMagenta'],
  about: ['arnica'],
};
export const PETAL_COLOURS = {
  lupine: '#7a68ec',
  paintbrush: '#ec3b2e',
  paintbrushMagenta: '#e0478c',
  arnica: '#f7c62a',
  lily: '#fff6e8',
  daisy: '#ffffff',
};

// Scattered wildflowers across the valley (always open), plus bud clusters around each board
// that open when you read it. `boards` is BOARDS; `clusterCount` is buds per board.
export function createFlowers(uniforms, total, boards, clusterCount) {
  const group = new THREE.Group();
  const rand = seeded(11);
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec3 aOffset; attribute vec4 aParams; attribute vec2 aBloom; attribute vec3 color;
      uniform float uHeight;
      uniform float uBloom[6];
      varying vec3 vColor; varying vec3 vNormalW; varying vec3 vWorld; varying float vK;
      ${WIND_GLSL}
      void main(){
        // buds: a board's flowers stay closed and green until you read it, then open
        float open = 1.0;
        if (aBloom.x >= 0.0) {
          float progress = uBloom[int(aBloom.x)];
          open = clamp((progress - aBloom.y * 0.45) / 0.55, 0.0, 1.0);
          open = open * open * (3.0 - 2.0 * open);
        }
        vec3 lp = position;
        float headStart = uHeight * 0.72;
        if (lp.y > headStart) {
          float sc = mix(0.22, 1.0, open);
          lp.xz *= sc;
          lp.y = headStart + (lp.y - headStart) * sc;
        }
        float s = aParams.y * mix(0.8, 1.0, open);
        float c = cos(aParams.x), sn = sin(aParams.x);
        vec3 p = lp * s;
        p = vec3(p.x * c - p.z * sn, p.y, p.x * sn + p.z * c);
        float k = clamp(position.y / uHeight, 0.0, 1.2);
        vec2 b = sway(aOffset, k, 1.3) * uHeight * s * 1.4;
        p.xz += b;
        vec3 world = aOffset + p;
        vec3 n = normal; n = vec3(n.x * c - n.z * sn, n.y, n.x * sn + n.z * c);
        vNormalW = normalize(n);
        vColor = mix(vec3(0.22, 0.4, 0.14), color, open) * aParams.zzz;
        vWorld = world; vK = k;
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying vec3 vNormalW; varying vec3 vWorld; varying float vK;
      ${LIGHT_GLSL}
      ${LIFE_GLSL}
      void main(){
        vec3 n = normalize(vNormalW);
        if (!gl_FrontFacing) n = -n;
        gl_FragColor = vec4(shade(alive(vColor, vWorld.xz), n, vWorld, 0.35 * vK), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });

  // where the reading spot is, so buds don't grow between you and the board
  const clear = (b, x, z) => {
    const dx = b.view.x - b.x, dz = b.view.z - b.z;
    const t = Math.max(0, Math.min(1, ((x - b.x) * dx + (z - b.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - (b.x + t * dx), z - (b.z + t * dz)) < 2.3;
  };

  for (const [name, share, seed, color] of MIX) {
    const build = name.startsWith('paintbrush') ? () => SPECIES.paintbrush(color) : SPECIES[name];
    const { geo: src, height } = build();
    const instances = [];
    // scattered across the valley, in drifts
    const count = Math.round(total * share);
    let guard = 0;
    while (instances.length < count && guard++ < count * 60) {
      const wide = rand() < 0.15 ? 1.6 : 1;
      const x = (MEADOW.x0 + rand() * (MEADOW.x1 - MEADOW.x0)) * wide;
      const z = (MEADOW.z0 + rand() * (MEADOW.z1 - MEADOW.z0)) * wide;
      const field = fbm2(x * 0.06 + seed * 31.7, z * 0.06 - seed * 17.3, 3);
      if (field < 0.05 + rand() * 0.25) continue;
      if (distanceToPath(x, z) < 1.6) continue; // keep the trodden path clear
      instances.push({ x, z, board: -1, delay: 0 });
    }
    // bud clusters around the boards that grow this species
    boards.forEach((b, index) => {
      const kinds = CLUSTERS[b.id];
      if (!kinds.includes(name)) return;
      const n = Math.round((clusterCount * (b.small ? 0.4 : 1)) / kinds.length);
      for (let k = 0, tries = 0; k < n && tries < n * 20; tries++) {
        const a = rand() * Math.PI * 2;
        const r = 1.4 + Math.pow(rand(), 0.7) * (b.small ? 3 : 7.5);
        const x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r;
        if (clear(b, x, z) || distanceToPath(x, z) < 1.2) continue;
        instances.push({ x, z, board: index, delay: Math.min(1, r / 8) * 0.7 + rand() * 0.3 });
        k++;
      }
    });

    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', src.attributes.position);
    geo.setAttribute('normal', src.attributes.normal);
    geo.setAttribute('color', src.attributes.color);
    const offsets = new Float32Array(instances.length * 3);
    const params = new Float32Array(instances.length * 4);
    const bloom = new Float32Array(instances.length * 2);
    instances.forEach((f, i) => {
      offsets.set([f.x, heightAt(f.x, f.z) - 0.01, f.z], i * 3);
      params.set([rand() * Math.PI * 2, 1.25 + rand() * 0.7, 0.85 + rand() * 0.3, 0], i * 4);
      bloom.set([f.board, f.delay], i * 2);
    });
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
    geo.setAttribute('aBloom', new THREE.InstancedBufferAttribute(bloom, 2));
    geo.instanceCount = instances.length;
    const mat = material.clone();
    mat.uniforms = { ...uniforms, uHeight: { value: height } };
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.name = name;
    group.add(mesh);
  }
  return group;
}
