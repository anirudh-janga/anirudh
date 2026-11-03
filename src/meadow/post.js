import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Soft bloom (the painted sky stays in a controlled range, so it only catches the sun,
// highlights and petals), then a warm, gently saturated grade with lifted shadows.
export function createPost(renderer, scene, camera, { bloom = true } = {}) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.75, 0.82);
  bloomPass.enabled = bloom;
  composer.addPass(bloomPass);
  composer.addPass(
    new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; varying vec2 vUv;
        void main(){
          vec3 col = texture2D(tDiffuse, vUv).rgb;
          float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col = mix(vec3(l), col, 1.12);                 // a touch more saturation
          col = col * vec3(1.05, 1.0, 0.92) + vec3(0.012, 0.008, 0.004); // warm, shadows never black
          col *= 1.0 - 0.28 * smoothstep(0.55, 1.1, length((vUv - 0.5) * vec2(1.15, 1.0)));
          gl_FragColor = vec4(max(col, 0.0), 1.0);
        }`,
    })
  );
  composer.addPass(new OutputPass());
  return {
    composer,
    setSize(w, h, pr) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
    },
  };
}
