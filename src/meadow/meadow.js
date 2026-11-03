import * as THREE from 'three';
import { createTerrain, createHeightTexture, heightAt, HEIGHTMAP } from './terrain.js';
import { createSky, createTrees, sunDirection, SUN, HAZE } from './landscape.js';
import { createGrass, sharedUniforms } from './grass.js';
import { createFlowers } from './flowers.js';
import { createButterflies, createPollen } from './life.js';
import { createPost } from './post.js';
import { createBoards } from './boards.js';
import { BOARDS, PATH } from './places.js';

// The whole scene: an open valley of rolling hills under a warm, painted sky.
export function createMeadow(canvas, { quality = 1, reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(HAZE, 0.0018);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 12000);

  const sunDir = sunDirection();
  const sky = createSky();
  sky.setSun(sunDir);
  scene.add(sky.mesh);

  const sun = new THREE.DirectionalLight('#ffe2b8', 2.4);
  sun.position.copy(sunDir).multiplyScalar(200);
  scene.add(sun, new THREE.HemisphereLight('#ffdcc8', '#5d6e32', 1.1));

  const uniforms = sharedUniforms();
  uniforms.uSunDir.value.copy(sunDir);
  uniforms.uFogColor.value.copy(HAZE);
  uniforms.uFogDensity.value = 0.0018;
  uniforms.uSkyColor.value.set('#ffd2bc');
  uniforms.uSunColor.value.set('#ffe6c0');
  uniforms.uHeightMap.value = createHeightTexture();
  uniforms.uHeightExtent.value = HEIGHTMAP.extent;
  uniforms.uPath = { value: PATH.map(([x, z]) => new THREE.Vector2(x, z)) };

  const terrain = createTerrain(uniforms);
  const boards = createBoards(BOARDS);
  scene.add(terrain, createTrees(), boards.group);
  // the field around you: fewer blades and a smaller tile on lighter devices
  scene.add(createGrass(uniforms, Math.round(130000 * quality), Math.round(40 + 26 * quality)));
  scene.add(createFlowers(uniforms, Math.round(9000 * quality)));
  const butterflies = createButterflies(quality < 0.6 ? 4 : 7);
  const pollen = createPollen(Math.round(700 * quality));
  scene.add(butterflies.group, pollen.points);

  const post = createPost(renderer, scene, camera, { bloom: quality >= 0.3 });

  let pixelRatio = 1;
  function resize(w, h, maxPr = 2) {
    pixelRatio = Math.min(window.devicePixelRatio, maxPr);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    post.setSize(w, h, pixelRatio);
  }

  // Place the camera at (x, z) a given height above the ground, looking at a point.
  const look = new THREE.Vector3();
  function setView(x, z, eye, lx, ly, lz) {
    camera.position.set(x, heightAt(x, z) + eye, z);
    look.set(lx, ly, lz);
    camera.lookAt(look);
  }

  function setSunElevation(deg) {
    sunDirection(deg, SUN.azimuth, sunDir);
    sky.setSun(sunDir);
    sun.position.copy(sunDir).multiplyScalar(200);
    uniforms.uSunDir.value.copy(sunDir);
    // lower sun → warmer light
    const warm = THREE.MathUtils.clamp((12 - deg) / 8, 0, 1);
    uniforms.uSunColor.value.set('#ffe6c0').lerp(new THREE.Color('#ffb478'), warm);
    sky.uniforms.uGold.value = warm;
    sun.color.copy(uniforms.uSunColor.value);
  }

  function render(t) {
    uniforms.uTime.value = reducedMotion ? 0 : t;
    butterflies.update(t, reducedMotion);
    pollen.update(reducedMotion ? 0 : t, sunDir, pixelRatio);
    sky.uniforms.uTime.value = t;
    post.composer.render();
  }

  return { renderer, scene, camera, uniforms, butterflies, boards, resize, setView, setSunElevation, render, heightAt };
}
