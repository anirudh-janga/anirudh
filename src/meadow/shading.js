import * as THREE from 'three';

// Shared GLSL: wind, the pointer pushing plants aside, simple sun lighting and fog.
export const WIND_GLSL = /* glsl */ `
  uniform float uTime, uBreeze, uPointerOn, uWake;
  uniform vec3 uPointer;
  vec2 windDir(){ return normalize(vec2(1.0, -0.35)); }
  // returns a horizontal offset for a point at normalised height k (0 root → 1 tip)
  // broad bands of wind rolling across the hills (0..1); also used to brighten the tips
  float gustAt(vec2 xz){
    float phase = dot(xz, windDir()) * 0.11 - uTime * 1.1;
    float wobble = sin(dot(xz, vec2(-0.35, 1.0)) * 0.05 + uTime * 0.3) * 0.8;
    return pow(0.5 + 0.5 * sin(phase + wobble), 4.0) * uBreeze;
  }
  vec2 sway(vec3 root, float k, float stiffness){
    float gust = gustAt(root.xz);
    float flutter = sin(uTime * 2.1 + root.x * 1.7 + root.z * 1.3) * 0.07;
    vec2 bend = windDir() * (0.12 + gust * 0.6 + flutter) * k * k / stiffness;
    vec2 d = root.xz - uPointer.xz;
    float dl = length(d);
    bend += (d / max(dl, 1e-3)) * smoothstep(2.4, 0.0, dl) * 0.75 * uPointerOn * k * k;
    // the wind you are: grass parts around the camera as you drift through it
    vec2 dc = root.xz - cameraPosition.xz;
    float dcl = length(dc);
    bend += (dc / max(dcl, 1e-3)) * smoothstep(3.0, 0.4, dcl) * 0.7 * uWake * k * k;
    return bend;
  }
`;
export const LIGHT_GLSL = /* glsl */ `
  uniform vec3 uSunDir, uSunColor, uSkyColor, uFogColor;
  uniform float uFogDensity;
  vec3 shade(vec3 albedo, vec3 n, vec3 world, float translucency){
    vec3 V = normalize(world - cameraPosition);
    float diff = 0.45 + 0.55 * max(dot(n, uSunDir), 0.0);
    float back = pow(max(dot(V, uSunDir), 0.0), 5.0) * translucency;
    vec3 col = albedo * (uSkyColor * 0.55 + uSunColor * diff * 0.95) + albedo * uSunColor * back * 1.6;
    float dist = length(world - cameraPosition);
    float f = 1.0 - exp(-pow(uFogDensity * dist, 2.0));
    return mix(col, uFogColor, f);
  }
`;

// Colour returning to the land: the valley starts dusky and muted; a "life" field painted
// around each board you read (and everything, once all are read) brings back full colour.
export const LIFE_GLSL = /* glsl */ `
  uniform sampler2D uLife;
  uniform float uLifeExtent, uLifeAll;
  float lifeAt(vec2 xz){
    return max(texture(uLife, xz / uLifeExtent + 0.5).r, uLifeAll);
  }
  vec3 alive(vec3 c, vec2 xz){
    float l = smoothstep(0.0, 1.0, lifeAt(xz));
    float lum = dot(c, vec3(0.3, 0.59, 0.11));
    vec3 dusk = mix(vec3(lum), c, 0.32) * vec3(0.84, 0.82, 0.92);
    return mix(dusk, c, l);
  }
`;

export function sharedUniforms() {
  return {
    uTime: { value: 0 },
    uBreeze: { value: 0.45 },
    uPointer: { value: new THREE.Vector3(9999, 0, 9999) },
    uPointerOn: { value: 0 },
    uWake: { value: 0.5 },
    uHeightMap: { value: null },
    uHeightExtent: { value: 1 },
    uLife: { value: null },
    uLifeExtent: { value: 1 },
    uLifeAll: { value: 0 },
    uBloom: { value: [0, 0, 0, 0, 0, 0] }, // how open each board's buds are, in BOARDS order
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color('#ffd7a0') },
    uSkyColor: { value: new THREE.Color('#9fb8d8') },
    uFogColor: { value: new THREE.Color('#c4c9c4') },
    uFogDensity: { value: 0.0024 },
  };
}
