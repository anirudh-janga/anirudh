import * as THREE from 'three';
import { seeded } from './noise.js';

// The wind made visible: a ribbon of petals following a "leader" through the meadow.
// While you glide it streams alongside you; when you pause it drifts out towards the next
// board you haven't read and curls back, like "this way"; while you read, it circles the board.

const HISTORY = 320;

export function createPetals(max, { reducedMotion = false } = {}) {
  // a small curved petal
  const geo = new THREE.PlaneGeometry(0.12, 0.075, 4, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, (p.getX(i) / 0.06) ** 2 * 0.02);
  geo.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0.4 });
  // emissive follows each petal's own colour, so the stream glows softly in its blooms' hues
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec3 totalEmissiveRadiance = emissive;',
      'vec3 totalEmissiveRadiance = emissive * vColor.rgb;'
    );
  };
  const mesh = new THREE.InstancedMesh(geo, material, max);
  mesh.frustumCulled = false;

  const rand = seeded(19);
  const petals = Array.from({ length: max }, () => ({
    phase: rand() * Math.PI * 2,
    swirl: 0.6 + rand() * 0.9,
    radius: 0.25 + rand() * 0.9,
    lag: rand(),
    spin: new THREE.Vector3(rand() * 4 - 2, rand() * 4 - 2, rand() * 4 - 2),
    born: -10,
  }));
  const start = new THREE.Color('#ffc2d6');
  for (let i = 0; i < max; i++) mesh.setColorAt(i, start.clone().offsetHSL((rand() - 0.5) * 0.04, 0, (rand() - 0.5) * 0.08));
  let active = 0;
  mesh.count = 0;

  // grow the stream; each bloom adds petals of its own colour
  function add(color, n, t = 0) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n && active < max; k++, active++) {
      mesh.setColorAt(active, c.clone().offsetHSL((rand() - 0.5) * 0.05, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.1));
      petals[active].born = t;
    }
    mesh.count = active;
    mesh.instanceColor.needsUpdate = true;
  }

  // ---- the leader and its trail ----
  const leader = new THREE.Vector3();
  const goal = new THREE.Vector3();
  const history = Array.from({ length: HISTORY }, () => new THREE.Vector3());
  let head = 0;
  let initialised = false;
  let outward = 0; // 0 → by you, 1 → at the next board (the idle "this way" loop)
  let idleTime = 0;

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const tmp = new THREE.Vector3();

  // view: { camPos, forward, speed, next (board {x,y,z}) | null, reading (board) | null, pointer | null, ground(x,z) }
  function update(t, dt, view) {
    const { camPos, forward, speed, next, reading, ground } = view;
    const near = tmp.copy(camPos).addScaledVector(forward, 4.5);
    near.x += -forward.z * 1.4;
    near.z += forward.x * 1.4; // a little to the right of you
    near.y = ground(near.x, near.z) + 1.3;

    if (reading) {
      // circle the board you're reading
      const a = t * 0.6;
      goal.set(reading.x + Math.cos(a) * 2.2, reading.y + 2.4 + Math.sin(a * 1.7) * 0.4, reading.z + Math.sin(a) * 2.2);
      idleTime = 0;
      outward = 0;
    } else if (speed > 0.6 || !next) {
      goal.copy(near);
      if (view.pointer) goal.lerp(view.pointer, 0.25);
      idleTime = 0;
      outward = Math.max(0, outward - dt);
    } else {
      // idle: after a moment, drift out towards the next unread board, then curl back
      idleTime += dt;
      const target = reducedMotion ? 1 : 0.5 - 0.5 * Math.cos(Math.max(0, idleTime - 2.5) * 0.45);
      outward += (target - outward) * Math.min(1, dt * 2);
      goal.set(next.x, next.y + 2.6, next.z);
      goal.lerp(near, 1 - outward);
      goal.y += Math.sin(outward * Math.PI) * 3; // arc up and over the grass
    }

    if (!initialised) {
      leader.copy(goal);
      history.forEach((h) => h.copy(goal));
      initialised = true;
    }
    const follow = reducedMotion ? 1 : Math.min(1, dt * 2.2);
    leader.lerp(goal, follow);
    head = (head + 1) % HISTORY;
    history[head].copy(leader);

    for (let i = 0; i < active; i++) {
      const pt = petals[i];
      // later petals ride further back along the ribbon
      const back = Math.min(HISTORY - 1, Math.floor((i / Math.max(1, active)) * 140 + pt.lag * 30));
      const base = history[(head - back + HISTORY) % HISTORY];
      const a = (reducedMotion ? 0 : t) * pt.swirl + pt.phase;
      const r = pt.radius * (0.5 + back / 140);
      pos.set(base.x + Math.cos(a) * r, base.y + Math.sin(a * 1.3) * r * 0.45, base.z + Math.sin(a) * r);
      const floor = ground(pos.x, pos.z) + 0.35;
      if (pos.y < floor) pos.y = floor;
      const tt = reducedMotion ? pt.phase : t;
      e.set(tt * pt.spin.x, tt * pt.spin.y, tt * pt.spin.z);
      q.setFromEuler(e);
      // new petals grow in over half a second
      const s = Math.min(1, (t - pt.born) * 2);
      m4.compose(pos, q, one.setScalar(Math.max(0.001, s)));
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, add, update, get count() { return active; } };
}
