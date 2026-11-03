import * as THREE from 'three';

// Shared GLSL: wind, the pointer pushing plants aside, simple sun lighting and fog.
export const WIND_GLSL = /* glsl */ `
  uniform float uTime, uBreeze, uPointerOn;
  uniform vec3 uPointer;
  vec2 windDir(){ return normalize(vec2(1.0, -0.35)); }
  // returns a horizontal offset for a point at normalised height k (0 root → 1 tip)
  vec2 sway(vec3 root, float k, float stiffness){
    float phase = dot(root.xz, windDir()) * 0.16 - uTime * 1.3;
    float gust = pow(0.5 + 0.5 * sin(phase), 3.0) * uBreeze;
    float flutter = sin(uTime * 2.1 + root.x * 1.7 + root.z * 1.3) * 0.07;
    vec2 bend = windDir() * (0.12 + gust * 0.6 + flutter) * k * k / stiffness;
    vec2 d = root.xz - uPointer.xz;
    float dl = length(d);
    bend += (d / max(dl, 1e-3)) * smoothstep(2.4, 0.0, dl) * 0.75 * uPointerOn * k * k;
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

export function sharedUniforms() {
  return {
    uTime: { value: 0 },
    uBreeze: { value: 0.45 },
    uPointer: { value: new THREE.Vector3(9999, 0, 9999) },
    uPointerOn: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color('#ffd7a0') },
    uSkyColor: { value: new THREE.Color('#9fb8d8') },
    uFogColor: { value: new THREE.Color('#c4c9c4') },
    uFogDensity: { value: 0.0024 },
  };
}
