import * as THREE from 'three';
import { STANDS } from './meadow/path.js';

// Scrolling walks you into the meadow. Each section has a viewpoint; the camera eases between
// them, and a few small "moments" happen as sections come into view.
// pos = [x, z, eye height] from STANDS; look = a point to face; sun elevation; breeze strength
const VIEWS = {
  top: { pos: STANDS.top, look: [0, 5, -60], sun: 11, breeze: 0.45 },
  work: { pos: STANDS.work, look: [7, 3, -42], sun: 10.5, breeze: 0.95 },
  making: { pos: STANDS.making, look: [-5, 1.2, -26], sun: 10, breeze: 0.5 },
  photos: { pos: STANDS.photos, look: [10, 4.5, -48], sun: 9, breeze: 0.45 },
  contact: { pos: STANDS.contact, look: [6, 6, -60], sun: 6, breeze: 0.35 },
};
const ORDER = ['top', 'work', 'making', 'photos', 'contact'];

export function createWalk(meadow, { reducedMotion }) {
  const stops = ORDER.map((id) => ({ id, el: document.getElementById(id), at: 0, view: VIEWS[id] }));

  function measure() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    for (const s of stops) {
      const top = s.el.getBoundingClientRect().top + scrollY;
      s.at = THREE.MathUtils.clamp((top - innerHeight * 0.25) / max, 0, 1);
    }
    stops[0].at = 0;
  }
  addEventListener('resize', measure);
  measure();
  // fonts and layout can shift section positions after load
  document.fonts?.ready.then(measure);

  const ease = (x) => x * x * (3 - 2 * x);
  const target = { pos: new THREE.Vector3(), look: new THREE.Vector3(), sun: 11, breeze: 0.45 };
  const current = { pos: new THREE.Vector3(...VIEWS.top.pos), look: new THREE.Vector3(...VIEWS.top.look), sun: 11, breeze: 0.45 };

  function targetFor(p) {
    let i = 0;
    while (i < stops.length - 2 && p > stops[i + 1].at) i++;
    const a = stops[i], b = stops[i + 1];
    const k = ease(THREE.MathUtils.clamp((p - a.at) / Math.max(1e-4, b.at - a.at), 0, 1));
    target.pos.fromArray(a.view.pos).lerp(new THREE.Vector3(...b.view.pos), k);
    target.look.fromArray(a.view.look).lerp(new THREE.Vector3(...b.view.look), k);
    target.sun = THREE.MathUtils.lerp(a.view.sun, b.view.sun, k);
    target.breeze = THREE.MathUtils.lerp(a.view.breeze, b.view.breeze, k);
  }

  // ---- moments ----
  let liftButterflies = false;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.target.id === 'making') liftButterflies = e.isIntersecting;
    },
    { threshold: 0.35 }
  );
  observer.observe(document.getElementById('making'));

  // ---- pointer: a little parallax, and the grass parts around the cursor ----
  const pointer = { x: 0, y: 0, active: 0, last: -10 };
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
    pointer.last = performance.now();
  });
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hit = new THREE.Vector3();
  // march along the view ray until it dips below the ground
  function groundUnderPointer() {
    ndc.set(pointer.x, -pointer.y);
    ray.setFromCamera(ndc, meadow.camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    if (d.y > -0.01) return false;
    for (let t = 0.5; t < 45; t += 0.35) {
      hit.copy(o).addScaledVector(d, t);
      if (hit.y <= meadow.heightAt(hit.x, hit.z)) return true;
    }
    return false;
  }

  const lookWithParallax = new THREE.Vector3();
  function update(dt) {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    targetFor(reducedMotion ? 0 : scrollY / max);
    const k = 1 - Math.exp(-dt * 2.6);
    current.pos.lerp(target.pos, k);
    current.look.lerp(target.look, k);
    current.sun += (target.sun - current.sun) * k;
    current.breeze += (target.breeze - current.breeze) * k;

    const par = reducedMotion ? 0 : 1;
    lookWithParallax.copy(current.look).add(new THREE.Vector3(pointer.x * 2.2 * par, -pointer.y * 1.2 * par, 0));
    meadow.setView(current.pos.x, current.pos.y, current.pos.z, lookWithParallax.x, lookWithParallax.y, lookWithParallax.z);
    meadow.setSunElevation(current.sun);
    meadow.uniforms.uBreeze.value = reducedMotion ? 0.2 : current.breeze;

    // the grass bends away from the cursor while it's moving
    const moving = performance.now() - pointer.last < 1200;
    const onGround = !reducedMotion && moving && groundUnderPointer();
    if (onGround) meadow.uniforms.uPointer.value.copy(hit);
    pointer.active += ((onGround ? 1 : 0) - pointer.active) * Math.min(1, dt * 4);
    meadow.uniforms.uPointerOn.value = pointer.active;

    // a couple of butterflies come close while you read about making things
    if (!reducedMotion) {
      meadow.butterflies.flies.forEach((f, i) => {
        if (i > 2) return;
        f.home ??= { cx: f.cx, cz: f.cz };
        const near = liftButterflies;
        const tx = near ? current.pos.x + (i - 1) * 1.6 : f.home.cx;
        const tz = near ? current.pos.y - 4 - i : f.home.cz;
        f.cx += (tx - f.cx) * Math.min(1, dt * 0.8);
        f.cz += (tz - f.cz) * Math.min(1, dt * 0.8);
        f.lift += ((near ? 0.6 : 0) - f.lift) * Math.min(1, dt);
      });
    }
  }

  return { update, measure };
}
