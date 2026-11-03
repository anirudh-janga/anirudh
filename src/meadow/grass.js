import * as THREE from 'three';
import { seeded } from './noise.js';
import { WIND_GLSL, LIGHT_GLSL } from './shading.js';
import { HEIGHT_GLSL } from './terrain.js';
import { PATH_GLSL } from './places.js';

export { sharedUniforms } from './shading.js';

// A sea of grass that is always around you: blades live in one square tile and each wraps
// to the copy nearest the camera, finds the ground in the heightmap, and fades out at the
// tile's edge into the grassy terrain shader. Wherever you drift, the field is there.
export function createGrass(uniforms, count, tile = 64) {
  // one blade: 3 segments tapering to a point, unit width and height
  const ys = [0, 0.3, 0.62, 1];
  const ws = [1, 0.82, 0.5, 0];
  const pos = [];
  ys.forEach((y, i) => {
    pos.push(-0.5 * ws[i], y, 0);
    if (i < 3) pos.push(0.5 * ws[i], y, 0);
  });
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6]);

  const rand = seeded(7);
  const offsets = new Float32Array(count * 2);
  const params = new Float32Array(count * 4);
  for (let n = 0; n < count; n++) {
    offsets.set([rand() * tile, rand() * tile], n * 2);
    // rotation, height, width, dryness
    params.set([rand() * Math.PI, 0.45 + rand() * 0.55, 0.04 + rand() * 0.035, rand()], n * 4);
  }
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 2));
  geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
  geo.instanceCount = count;

  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uTile: { value: tile } },
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec2 aOffset; attribute vec4 aParams;
      uniform float uTile;
      varying float vK; varying float vDry; varying vec3 vWorld; varying float vGust;
      ${WIND_GLSL}
      ${HEIGHT_GLSL}
      ${PATH_GLSL}
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p){
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.0), f.x), f.y);
      }
      void main(){
        // wrap this blade to the copy of the tile nearest the camera
        vec2 cam = cameraPosition.xz;
        vec2 xz = aOffset + uTile * floor((cam - aOffset) / uTile + 0.5);
        vec3 root = vec3(xz.x, groundAt(xz) - 0.03, xz.y);

        // fade out towards the tile edge; thin into tussocks so the field isn't uniform
        float edge = 1.0 - smoothstep(0.62, 0.98, length(xz - cam) / (uTile * 0.5));
        float tussock = smoothstep(0.18, 0.55, vnoise(xz * 0.12) * 0.7 + vnoise(xz * 0.5) * 0.3);
        float lush = 0.75 + 0.5 * vnoise(xz * 0.04 + 3.0);
        float worn = smoothstep(0.7, 1.7, pathDistance(xz)); // short grass along the path
        float h = aParams.y * edge * mix(0.35, 1.0, tussock) * lush * mix(0.08, 1.0, worn);

        float k = position.y;
        vec3 p = vec3(position.x * aParams.z, k * h, 0.0);
        float c = cos(aParams.x), s = sin(aParams.x);
        p = vec3(p.x * c, p.y, p.x * s);
        vec2 b = sway(root, k, 1.0) * h;
        p.xz += b;
        p.y -= dot(b, b) * 0.45; // keep the blade roughly its length as it bends
        vec3 world = root + p;
        vK = k; vDry = aParams.w; vWorld = world; vGust = gustAt(xz);
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vK; varying float vDry; varying vec3 vWorld; varying float vGust;
      ${LIGHT_GLSL}
      void main(){
        vec3 root = vec3(0.06, 0.16, 0.035);
        vec3 tip = mix(vec3(0.36, 0.56, 0.13), vec3(0.64, 0.62, 0.24), smoothstep(0.6, 1.0, vDry));
        vec3 albedo = mix(root, tip, smoothstep(0.0, 0.85, vK));
        albedo += vec3(0.16, 0.15, 0.05) * vGust * vK * vK; // the sheen of a passing gust
        gl_FragColor = vec4(shade(albedo, vec3(0.0, 1.0, 0.0), vWorld, vK), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  return mesh;
}
