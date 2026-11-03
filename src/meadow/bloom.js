import * as THREE from 'three';
import { CLUSTERS, PETAL_COLOURS } from './flowers.js';

// Bringing back the colour. Reading a board opens its buds with a burst of light, sends their
// petals into the stream, and paints "life" outward from it into a small texture that every
// shader uses to turn the dusky valley back into full colour. Read them all and it's golden hour.

const SIZE = 128;
const EXTENT = 320; // metres covered by the life texture, centred on the valley
const REACH = 48; // how far colour spreads from a board
const SPREAD = 7; // metres per second

function burstTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,248,220,1)');
  grad.addColorStop(0.35, 'rgba(255,214,150,0.55)');
  grad.addColorStop(1, 'rgba(255,200,140,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function createBloom({ uniforms, petals, boards, scene, heightAt, onGolden = () => {}, reducedMotion = false, mainBoards = 5 }) {
  const data = new Uint8Array(SIZE * SIZE);
  const life = new THREE.DataTexture(data, SIZE, SIZE, THREE.RedFormat, THREE.UnsignedByteType);
  life.minFilter = life.magFilter = THREE.LinearFilter;
  life.needsUpdate = true;
  uniforms.uLife.value = life;
  uniforms.uLifeExtent.value = EXTENT;

  const pending = [];
  const sources = [];
  const opened = new Set();
  const burstTex = burstTexture();
  const bursts = [];
  let golden = 0;
  let goldenStarted = false;

  function visit(id) {
    if (!opened.has(id)) pending.push(id);
    opened.add(id);
  }

  function paint(src, radius) {
    const toPx = SIZE / EXTENT;
    const cx = (src.x / EXTENT + 0.5) * SIZE, cz = (src.z / EXTENT + 0.5) * SIZE;
    const rp = radius * toPx;
    const x0 = Math.max(1, Math.floor(cx - rp)), x1 = Math.min(SIZE - 2, Math.ceil(cx + rp));
    const z0 = Math.max(1, Math.floor(cz - rp)), z1 = Math.min(SIZE - 2, Math.ceil(cz + rp));
    for (let j = z0; j <= z1; j++) {
      for (let i = x0; i <= x1; i++) {
        const d = Math.hypot(i - cx, j - cz) / toPx;
        if (d > radius) continue;
        // full colour near the board, softening towards the spreading edge
        const v = Math.round(255 * Math.min(1, (1 - d / REACH) * 1.6) * Math.min(1, (radius - d) / 6));
        const k = j * SIZE + i;
        if (v > data[k]) data[k] = v;
      }
    }
    life.needsUpdate = true;
  }

  function update(t, dt) {
    // new visits: buds start opening, a burst of light, petals join the stream
    while (pending.length) {
      const id = pending.shift();
      const index = boards.findIndex((b) => b.id === id);
      const b = boards[index];
      sources.push({ x: b.x, z: b.z, start: t, index });
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: burstTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.6, 1.4, 1.1) }));
      sprite.position.set(b.x, heightAt(b.x, b.z) + 1.2, b.z);
      scene.add(sprite);
      bursts.push({ sprite, start: t });
      for (const kind of CLUSTERS[id]) petals.add(PETAL_COLOURS[kind], Math.round(48 / CLUSTERS[id].length), t);
    }

    // buds open over about a second and a half
    for (const src of sources) {
      const v = uniforms.uBloom.value;
      v[src.index] = reducedMotion ? 1 : Math.min(1, v[src.index] + dt / 1.5);
      const radius = reducedMotion ? REACH : Math.min(REACH, (t - src.start) * SPREAD);
      if (!src.done) paint(src, radius);
      if (radius >= REACH) src.done = true;
    }

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      const k = (t - b.start) / 1.4;
      if (k >= 1 || reducedMotion) {
        scene.remove(b.sprite);
        b.sprite.material.dispose();
        bursts.splice(i, 1);
        continue;
      }
      b.sprite.scale.setScalar(1 + k * 9);
      b.sprite.material.opacity = (1 - k) * (1 - k);
    }

    // every main board read: the whole valley comes into colour, and the sun sinks to golden hour
    const allRead = boards.slice(0, mainBoards).every((b) => opened.has(b.id));
    if (allRead) {
      if (!goldenStarted) (goldenStarted = true), onGolden();
      golden = reducedMotion ? 1 : Math.min(1, golden + dt / 6);
      uniforms.uLifeAll.value = golden;
    }
    return golden;
  }

  return { visit, update, opened };
}
