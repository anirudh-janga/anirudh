import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { seeded } from './noise.js';

// Hand-built wooden signboards: two posts, a weathered plank face with the title
// hand-painted on it, a little moss. The full text opens in a reading card (HTML).

const W = 1024, H = 576;

function drawWood(ctx, rand) {
  const planks = 3;
  for (let p = 0; p < planks; p++) {
    const y0 = (p * H) / planks, h = H / planks;
    const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
    const base = [128 + rand() * 16, 88 + rand() * 12, 54 + rand() * 8];
    g.addColorStop(0, `rgb(${base[0] + 12},${base[1] + 10},${base[2] + 6})`);
    g.addColorStop(1, `rgb(${base[0] - 18},${base[1] - 16},${base[2] - 12})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, h);
    // grain
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = `rgba(80,50,26,${0.08 + rand() * 0.14})`;
      ctx.beginPath();
      const yy = y0 + rand() * h;
      ctx.moveTo(0, yy);
      for (let x = 0; x <= W; x += 32) ctx.lineTo(x, yy + Math.sin(x * 0.01 + i) * (3 + rand() * 4));
      ctx.stroke();
    }
    // gaps between planks, and nails
    ctx.fillStyle = 'rgba(40,24,12,0.55)';
    ctx.fillRect(0, y0 + h - 4, W, 4);
    ctx.fillStyle = 'rgba(60,50,40,0.8)';
    for (const x of [46, W - 46]) {
      ctx.beginPath();
      ctx.arc(x, y0 + h / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // weathered edges
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(40,22,8,0.35)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function drawIcon(ctx, icon, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = ctx.fillStyle = '#fbf3e3';
  ctx.lineWidth = s * 0.09;
  ctx.lineCap = ctx.lineJoin = 'round';
  const line = (pts) => {
    ctx.beginPath();
    pts.forEach(([a, b], i) => (i ? ctx.lineTo(a * s, b * s) : ctx.moveTo(a * s, b * s)));
    ctx.stroke();
  };
  if (icon === 'sun') {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.26, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      line([[Math.cos(a) * 0.4, Math.sin(a) * 0.4], [Math.cos(a) * 0.55, Math.sin(a) * 0.55]]);
    }
  } else if (icon === 'hash') {
    line([[-0.15, -0.5], [-0.25, 0.5]]);
    line([[0.25, -0.5], [0.15, 0.5]]);
    line([[-0.5, -0.17], [0.5, -0.17]]);
    line([[-0.5, 0.17], [0.5, 0.17]]);
  } else if (icon === 'hammer') {
    line([[-0.35, 0.5], [0.2, -0.15]]);
    ctx.save();
    ctx.rotate(-Math.PI / 4);
    ctx.fillRect(-s * 0.05, -s * 0.48, s * 0.42, s * 0.2);
    ctx.restore();
  } else if (icon === 'camera') {
    ctx.strokeRect(-s * 0.48, -s * 0.28, s * 0.96, s * 0.64);
    line([[-0.2, -0.28], [-0.12, -0.42], [0.12, -0.42], [0.2, -0.28]]);
    ctx.beginPath();
    ctx.arc(0, s * 0.04, s * 0.18, 0, Math.PI * 2);
    ctx.stroke();
  } else if (icon === 'wave') {
    // a speech bubble
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.06, s * 0.48, s * 0.34, 0, 0, Math.PI * 2);
    ctx.stroke();
    line([[-0.18, 0.24], [-0.3, 0.48], [0.02, 0.27]]);
  } else if (icon === 'flower') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * s * 0.24, Math.sin(a) * s * 0.24, s * 0.17, s * 0.1, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function paintFace(canvas, board, rand, titled) {
  const ctx = canvas.getContext('2d');
  drawWood(ctx, rand);
  if (!titled) return;
  const size = board.title.length > 10 ? 104 : 132;
  ctx.font = `600 ${size}px Fraunces, Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textW = ctx.measureText(board.title).width;
  const iconS = size * 0.9;
  const total = iconS + 36 + textW;
  const x0 = W / 2 - total / 2;
  // painted lettering: a soft dark shadow, then cream paint
  ctx.shadowColor = 'rgba(30,16,4,0.55)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  drawIcon(ctx, board.icon, x0 + iconS / 2, H / 2, iconS);
  const tx = x0 + iconS + 36 + textW / 2, ty = H / 2 + size * 0.04;
  // a dark outline under the paint keeps the letters crisp against the wood
  ctx.lineWidth = size * 0.07;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(38, 20, 6, 0.85)';
  ctx.strokeText(board.title, tx, ty);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#fff6e2';
  ctx.fillText(board.title, tx, ty);
}

export function createBoards(boards) {
  const rand = seeded(31);
  const group = new THREE.Group();
  const faces = [];
  const wood = new THREE.MeshStandardMaterial({ color: '#7a5636', roughness: 0.85 });
  const moss = new THREE.MeshStandardMaterial({ color: '#5f8a2e', roughness: 1 });
  const painters = [];

  for (const b of boards) {
    const scale = b.small ? 0.55 : 1;
    const board = new THREE.Group();
    const fw = 2.6, fh = (2.6 * H) / W;

    const front = document.createElement('canvas');
    front.width = W;
    front.height = H;
    const back = document.createElement('canvas');
    back.width = W;
    back.height = H;
    paintFace(back, b, seeded(b.id.length), false);
    const frontTex = new THREE.CanvasTexture(front);
    const backTex = new THREE.CanvasTexture(back);
    for (const t of [frontTex, backTex]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    }
    // repaint the front once the lettering font has loaded
    const paint = () => {
      paintFace(front, b, seeded(b.id.length * 97 + b.x * 13), true);
      frontTex.needsUpdate = true;
    };
    paint();
    painters.push(paint);

    const faceMats = [wood, wood, wood, wood, new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.8, emissive: '#ffffff', emissiveMap: frontTex, emissiveIntensity: 0.32 }), new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.85 })];
    const face = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.09), faceMats);
    face.position.y = 1.75;
    face.userData.boardId = b.id;
    faces.push(face);
    board.add(face);

    for (const x of [-fw * 0.38, fw * 0.38]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 2.5, 8), wood);
      post.position.set(x, 1.15, -0.08);
      post.userData.boardId = b.id;
      board.add(post);
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09 + rand() * 0.08, 0), moss);
        m.position.set(x + (rand() - 0.5) * 0.3, 0.04, -0.08 + (rand() - 0.5) * 0.3);
        board.add(m);
      }
    }
    // a little moss on the top edge
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05 + rand() * 0.05, 0), moss);
      m.position.set((rand() - 0.5) * fw * 0.9, 1.75 + fh / 2 + 0.01, (rand() - 0.5) * 0.06);
      m.scale.y = 0.5;
      board.add(m);
    }

    board.scale.setScalar(scale);
    board.position.set(b.x, heightAt(b.x, b.z) - 0.05, b.z);
    board.rotation.y = b.yaw;
    group.add(board);
  }

  document.fonts?.load('600 132px Fraunces').then(() => painters.forEach((p) => p())).catch(() => {});
  return { group, faces };
}
