import * as THREE from 'three';
import { BOARDS } from './meadow/places.js';
import { START, VALLEY_RADIUS } from './meadow/terrain.js';

// Exploring the meadow: you are the wind, gliding a little above the grass.
// Click or tap the ground to drift there, click a board to go and read it, drag to look,
// W/A/S/D or arrows to glide and turn, Tab through the compass to visit boards.
const EYE = 1.75;
const MAX_SPEED = 9;
const TAU = Math.PI * 2;
const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

export function createExplore(meadow, { reducedMotion, touch, onVisit = () => {}, onMove = () => {} }) {
  const camera = meadow.camera;
  const s = { x: START.x, z: START.z, yaw: 0, pitch: -0.05, vx: 0, vz: 0, bob: 0 };
  let target = null; // { x, z, yaw?, board? }
  let openId = null;
  const visited = new Set();
  const keys = new Set();
  const byId = Object.fromEntries(BOARDS.map((b) => [b.id, b]));

  // ---------- reading cards: the existing HTML sections ----------
  const cards = Object.fromEntries(BOARDS.map((b) => [b.id, document.getElementById(b.section)]));
  BOARDS.forEach((b, i) => {
    const card = cards[b.id];
    card.classList.add('card');
    card.setAttribute('aria-label', b.title);
    const heading = card.querySelector('h1, h2');
    heading?.setAttribute('tabindex', '-1');
    const nav = document.createElement('div');
    nav.className = 'card-nav';
    const prev = BOARDS[i - 1], next = BOARDS[i + 1];
    nav.innerHTML = `
      ${prev ? `<button type="button" data-go="${prev.id}">← ${prev.title}</button>` : '<span></span>'}
      ${next ? `<button type="button" data-go="${next.id}">${next.title} →</button>` : '<span></span>'}
      <button type="button" class="card-close" aria-label="Close ${b.title}">×</button>`;
    (card.querySelector('.hero-panel') ?? card).appendChild(nav);
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.go) goTo(btn.dataset.go, { open: true, focus: true });
      else close({ returnFocus: true });
    });
  });

  // ---------- HUD: a compass (where each board lies), a trail of board buttons, a toolbar ----------
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <div class="compass" aria-hidden="true">
      ${BOARDS.map((b) => `<span class="mark${b.small ? ' small' : ''}" data-board="${b.id}"><span class="dot"></span><span class="mark-label">${b.title}</span></span>`).join('')}
    </div>
    <nav class="trail" aria-label="Boards in the meadow">
      ${BOARDS.map((b) => `<button type="button" data-board="${b.id}"><span class="dot" aria-hidden="true"></span>${b.title}</button>`).join('')}
    </nav>
    <div class="tools">
      <button type="button" data-tool="start">↺ Back to start</button>
    </div>
    <p class="hint" aria-hidden="true">${touch ? 'Tap the grass to drift · drag to look · tap a sign to read it' : 'Click the grass to drift · drag to look · or pick a board below'}</p>`;
  document.body.appendChild(hud);
  const marks = Object.fromEntries([...hud.querySelectorAll('.compass .mark')].map((m) => [m.dataset.board, m]));
  const trail = Object.fromEntries([...hud.querySelectorAll('.trail button')].map((m) => [m.dataset.board, m]));
  hud.querySelector('.trail').addEventListener('click', (e) => {
    const m = e.target.closest('button');
    if (m) goTo(m.dataset.board, { open: true, focus: e.detail === 0 });
  });
  // keyboard: tabbing onto a board drifts towards it; Enter opens it
  hud.querySelector('.trail').addEventListener('focusin', (e) => {
    const m = e.target.closest('button');
    if (m && m.matches(':focus-visible') && openId !== m.dataset.board) goTo(m.dataset.board, { open: false });
  });
  hud.querySelector('[data-tool="start"]').addEventListener('click', () => {
    close();
    travel({ x: START.x, z: START.z, yaw: 0 });
  });

  // in-page links (#work, #contact…) become journeys to their boards
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || !document.body.classList.contains('explore')) return;
    const b = BOARDS.find((x) => `#${x.section}` === a.getAttribute('href'));
    if (b) {
      e.preventDefault();
      goTo(b.id, { open: true, focus: true });
    }
  });

  // ---------- movement ----------
  let moved = false;
  function firstMove() {
    if (moved) return;
    moved = true;
    hud.classList.add('moved');
    onMove();
  }

  function travel(t) {
    target = t;
    firstMove();
    if (reducedMotion) {
      // no glides: arrive at once
      s.x = t.x;
      s.z = t.z;
      if (t.yaw != null) s.yaw = t.yaw;
      s.vx = s.vz = 0;
      arrive();
    }
  }

  // While reading, turn a little so the board sits beside the card (above it on phones).
  const narrow = window.matchMedia('(max-width: 640px)');
  const readYaw = (b) => b.yaw - (narrow.matches ? 0 : 0.34);
  const readPitch = () => (narrow.matches ? -0.24 : -0.06);

  function goTo(id, { open = true, focus = false } = {}) {
    const b = byId[id];
    if (openId && openId !== id) close();
    travel({ x: b.view.x, z: b.view.z, yaw: readYaw(b), board: open ? { id, focus } : null });
  }

  function arrive() {
    const t = target;
    target = null;
    if (t?.board) open(t.board.id, t.board.focus);
  }

  function open(id, focus) {
    if (openId === id) return;
    if (openId) cards[openId].classList.remove('open');
    openId = id;
    cards[id].classList.add('open');
    cards[id].scrollTop = 0;
    visited.add(id);
    marks[id].classList.add('visited');
    trail[id].classList.add('visited');
    trail[id].setAttribute('aria-current', 'location');
    if (focus) cards[id].querySelector('h1, h2')?.focus({ preventScroll: true });
    onVisit(id, visited);
  }

  function close({ returnFocus = false } = {}) {
    if (!openId) return;
    const id = openId;
    cards[id].classList.remove('open');
    trail[id].removeAttribute('aria-current');
    openId = null;
    if (returnFocus) trail[id].focus();
  }

  // ---------- input ----------
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') return close({ returnFocus: true });
    const inCard = e.target.closest?.('.card');
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (['w', 'a', 's', 'd'].includes(k) || (!inCard && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k))) {
      if (!document.body.classList.contains('explore')) return;
      keys.add(k);
      e.preventDefault();
    }
  });
  addEventListener('keyup', (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
  addEventListener('blur', () => keys.clear());

  const canvas = meadow.renderer.domElement;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hit = new THREE.Vector3();
  let drag = null;

  function pick(cx, cy) {
    ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const b = ray.intersectObjects(meadow.boards.faces, false)[0];
    if (b) return { board: b.object.userData.boardId };
    // march along the view ray until it dips below the ground
    const o = ray.ray.origin, d = ray.ray.direction;
    if (d.y > 0.02) return null;
    for (let t = 0.5; t < 160; t += Math.max(0.3, t * 0.02)) {
      hit.copy(o).addScaledVector(d, t);
      if (hit.y <= meadow.heightAt(hit.x, hit.z)) return { x: hit.x, z: hit.z };
    }
    return null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  // the cursor is wind too: grass bows away from it while it moves
  let pointerSeen = -10;
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) {
      const p = pick(e.clientX, e.clientY);
      canvas.style.cursor = p?.board ? 'pointer' : p ? 'crosshair' : 'grab';
      if (p && !p.board && !reducedMotion) {
        meadow.uniforms.uPointer.value.set(p.x, meadow.heightAt(p.x, p.z), p.z);
        pointerSeen = performance.now();
      }
      return;
    }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 6) drag.moved = true;
    if (drag.moved) {
      s.yaw += e.movementX * 0.005;
      s.pitch = THREE.MathUtils.clamp(s.pitch + e.movementY * 0.004, -0.45, 0.3);
      if (target && target.yaw != null && !target.board) target.yaw = null;
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    const wasDrag = drag?.moved;
    drag = null;
    if (wasDrag) return;
    const p = pick(e.clientX, e.clientY);
    if (!p) return;
    if (p.board) goTo(p.board, { open: true });
    else {
      close();
      travel({ x: p.x, z: p.z });
    }
  });

  // ---------- per frame ----------
  const fwd = new THREE.Vector3();
  function update(dt, t) {
    // keyboard glide
    const ahead = (keys.has('w') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('s') || keys.has('ArrowDown') ? 1 : 0);
    const turn = (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('d') || keys.has('ArrowRight') ? 1 : 0);
    if (ahead || turn) {
      if (openId) close();
      target = null;
      firstMove();
      s.yaw += turn * dt * 1.5;
    }
    let wantX = ahead * -Math.sin(s.yaw) * 6, wantZ = ahead * -Math.cos(s.yaw) * 6;

    if (target) {
      const dx = target.x - s.x, dz = target.z - s.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.12) {
        s.x = target.x;
        s.z = target.z;
        s.vx = s.vz = 0;
        const yawDone = target.yaw == null || Math.abs(wrap(target.yaw - s.yaw)) < 0.02;
        if (yawDone) arrive();
      } else {
        const speed = Math.min(MAX_SPEED, dist * 1.4 + 0.4);
        wantX = (dx / dist) * speed;
        wantZ = (dz / dist) * speed;
      }
      // face where we're going; turn to face the board on the final approach
      if (target) {
        const heading = Math.atan2(-dx, -dz);
        const aim = target.yaw != null && dist < 7 ? target.yaw : dist > 0.5 && !drag?.moved ? heading : null;
        if (aim != null) s.yaw += wrap(aim - s.yaw) * Math.min(1, dt * 2.6);
        if (target?.board) s.pitch += (readPitch() - s.pitch) * Math.min(1, dt * 2);
      }
    }

    const k = Math.min(1, dt * 3);
    s.vx += (wantX - s.vx) * k;
    s.vz += (wantZ - s.vz) * k;
    s.x += s.vx * dt;
    s.z += s.vz * dt;

    // soft bounds: the wind turns you back at the valley's edge
    const r = Math.hypot(s.x, s.z);
    if (r > VALLEY_RADIUS) {
      const push = (r - VALLEY_RADIUS) * 2 * dt;
      s.x -= (s.x / r) * push;
      s.z -= (s.z / r) * push;
    }

    const speed = Math.hypot(s.vx, s.vz);
    s.bob = reducedMotion ? 0 : Math.sin(t * 0.9) * 0.06 + Math.sin(t * 2.3) * 0.02 * Math.min(1, speed / 4);
    camera.position.set(s.x, meadow.heightAt(s.x, s.z) + EYE + s.bob, s.z);
    camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
    meadow.uniforms.uWake.value = 0.35 + Math.min(1, speed / MAX_SPEED) * 0.65;
    const pointerOn = performance.now() - pointerSeen < 1200 ? 1 : 0;
    meadow.uniforms.uPointerOn.value += (pointerOn - meadow.uniforms.uPointerOn.value) * Math.min(1, dt * 4);

    // compass: place each board's marker by its bearing relative to where we're facing;
    // name only the board most nearly ahead
    let nearest = null, nearestRel = 0.3;
    for (const b of BOARDS) {
      const rel = Math.abs(wrap(Math.atan2(-(b.x - s.x), -(b.z - s.z)) - s.yaw));
      if (rel < nearestRel) (nearest = b.id), (nearestRel = rel);
    }
    for (const b of BOARDS) {
      const rel = wrap(Math.atan2(-(b.x - s.x), -(b.z - s.z)) - s.yaw);
      // boards behind you rest just inside the strip's ends, still visible and clickable
      const x = THREE.MathUtils.clamp(50 - (rel / (Math.PI / 2)) * 50, 7, 93);
      const m = marks[b.id];
      m.style.left = `${x}%`;
      m.classList.toggle('behind', Math.abs(rel) > Math.PI / 2);
      m.classList.toggle('ahead', b.id === nearest);
    }
    fwd.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
    return { x: s.x, z: s.z, speed, forward: fwd, openId, visited };
  }

  // arrive at the start, the Hello board just ahead, with its card open
  s.yaw = narrow.matches ? 0 : -0.12;
  s.pitch = narrow.matches ? -0.16 : -0.05;
  open('hello', false);
  return { update, goTo, close, get visited() { return visited; }, get position() { return s; } };
}
