import { START } from './terrain.js';

// The boards in the meadow, in their suggested order. `section` is the id of the HTML
// section that holds the board's full text. Positions sit near the lone trees.
export const BOARDS = [
  { id: 'hello', section: 'top', title: 'Hello', icon: 'sun', x: 0, z: 58 },
  { id: 'work', section: 'work', title: 'At Slack', icon: 'hash', x: -39, z: 20 },
  { id: 'making', section: 'making', title: 'Making things', icon: 'hammer', x: 40, z: 2 },
  { id: 'photos', section: 'photos', title: 'Photography', icon: 'camera', x: -22, z: -37 },
  { id: 'contact', section: 'contact', title: 'Say hello', icon: 'wave', x: 19, z: -60 },
  { id: 'about', section: 'about', title: 'About this meadow', icon: 'flower', x: 50, z: -31, small: true },
];

// Each board faces the way you arrive from (the previous stop), so its title greets you.
const route = [START, ...BOARDS.slice(0, 5)];
for (const b of BOARDS) {
  const i = route.indexOf(b);
  const from = i > 0 ? route[i - 1] : BOARDS[3];
  b.yaw = Math.atan2(from.x - b.x, from.z - b.z); // rotation about y so +z faces `from`
  // where you stand to read it: a few metres in front, facing the board
  const d = b.small ? 3.4 : 5.2;
  b.view = { x: b.x + Math.sin(b.yaw) * d, z: b.z + Math.cos(b.yaw) * d };
}

// The trodden path: start → each board in order.
export const PATH = route.map((p) => [p.x, p.z]);

export function distanceToPath(x, z) {
  let best = Infinity;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  }
  return best;
}

// GLSL: distance to the path, for the worn earth and shorter grass along it.
export const PATH_GLSL = /* glsl */ `
  uniform vec2 uPath[${PATH.length}];
  float pathDistance(vec2 p){
    float best = 1e9;
    for (int i = 0; i < ${PATH.length - 1}; i++) {
      vec2 a = uPath[i], b = uPath[i + 1], ab = b - a;
      float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
      best = min(best, length(p - (a + t * ab)));
    }
    return best;
  }
`;
