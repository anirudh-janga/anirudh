import * as THREE from 'three';
import { fbm2, smoothstep } from './noise.js';
import { LIGHT_GLSL, WIND_GLSL } from './shading.js';

// The explorable valley: broad, soft swells, a low rise where you arrive,
// and hills climbing gently all around into warm haze.
export const START = { x: 0, z: 72 };
export const VALLEY_RADIUS = 115;

export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  let h = fbm2(x * 0.007, z * 0.007, 4) * 7;
  h += fbm2(x * 0.02 + 5, z * 0.02 - 9, 3) * 1.1;
  h += smoothstep(95, 650, r) * 42 * (0.55 + 0.45 * fbm2(x * 0.003 + 2, z * 0.003, 2));
  h += 3.5 * Math.exp(-((x - START.x) ** 2 + (z - START.z) ** 2) / 900);
  return h;
}

// The same heights baked into a texture, so shaders (grass that follows you) can find the ground.
export const HEIGHTMAP = { size: 512, extent: 360 };
export function createHeightTexture() {
  const { size, extent } = HEIGHTMAP;
  const data = new Float32Array(size * size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i / (size - 1) - 0.5) * extent;
      const z = (j / (size - 1) - 0.5) * extent;
      data[j * size + i] = heightAt(x, z);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// GLSL twin of heightAt, via the baked texture.
export const HEIGHT_GLSL = /* glsl */ `
  uniform sampler2D uHeightMap;
  uniform float uHeightExtent;
  float groundAt(vec2 xz){
    vec2 uv = xz / uHeightExtent + 0.5;
    return texture(uHeightMap, uv).r;
  }
`;

export function createTerrain(uniforms) {
  const size = 1600;
  const seg = 400;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();

  // Painted grassland: deep green hollows, sunlit yellow-green crests, a sheen where the gusts pass.
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWorld; varying vec3 vNormal;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz; vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vWorld; varying vec3 vNormal;
      ${WIND_GLSL}
      ${LIGHT_GLSL}
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p){
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.0), f.x), f.y);
      }
      void main(){
        vec2 xz = vWorld.xz;
        float patches = vnoise(xz * 0.035) * 0.6 + vnoise(xz * 0.11) * 0.4;
        vec3 hollow = vec3(0.13, 0.27, 0.07);
        vec3 crest = vec3(0.42, 0.55, 0.15);
        vec3 albedo = mix(hollow, crest, smoothstep(0.25, 0.85, patches));
        // fine streaks so distant slopes still read as grass
        albedo *= 0.9 + 0.2 * vnoise(vec2(xz.x * 1.7, xz.y * 0.6));
        // the gust sheen travelling over the hills
        albedo += vec3(0.11, 0.1, 0.03) * gustAt(xz);
        gl_FragColor = vec4(shade(albedo, normalize(vNormal), vWorld, 0.4), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'terrain';
  return mesh;
}
