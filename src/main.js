import './style.css';

// The page's words are plain HTML and are readable immediately. With WebGL, the meadow grows
// after the first paint and the page becomes a place to explore: the sections turn into boards
// standing in the grass. "Read as a page" (the first Tab stop) switches back to plain reading.

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hasWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

// Device class sets the starting quality; a frame-rate watcher can lower the resolution later.
function startingQuality() {
  const forced = Number(new URLSearchParams(location.search).get('quality'));
  if (forced > 0) return Math.min(forced, 1);
  const phone = window.matchMedia('(pointer: coarse)').matches || innerWidth < 760;
  const cores = navigator.hardwareConcurrency || 4;
  if (phone) return 0.4;
  return cores <= 4 ? 0.65 : 1;
}

async function grow() {
  const [{ createMeadow }, { createExplore }, { createSound }, { CLUSTERS }, { BOARDS }] = await Promise.all([
    import('./meadow/meadow.js'),
    import('./explore.js'),
    import('./sound.js'),
    import('./meadow/flowers.js'),
    import('./meadow/places.js'),
  ]);
  const canvas = document.createElement('canvas');
  canvas.id = 'meadow';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const quality = startingQuality();
  const meadow = createMeadow(canvas, { quality, reducedMotion });
  const pixelRatios = [2, 1.5, 1.25, 1, 0.75];
  let prStep = quality < 0.6 ? 1 : 0;
  const resize = () => meadow.resize(innerWidth, innerHeight, pixelRatios[prStep]);
  addEventListener('resize', resize);
  resize();
  const touch = window.matchMedia('(pointer: coarse)').matches;
  document.body.classList.add('explore');
  const sound = createSound();
  let explore = null;
  const onVisit = (id) => {
    meadow.bloom.visit(id);
    // chime towards the board: pan by its bearing from where you're facing
    const b = BOARDS.find((x) => x.id === id);
    const s = explore?.position;
    const rel = s ? Math.atan2(-(b.x - s.x), -(b.z - s.z)) - s.yaw : 0;
    sound.chime(CLUSTERS[id], -Math.sin(rel));
  };
  explore = createExplore(meadow, { reducedMotion, touch, onVisit });
  setUpSoundToggle(sound);
  setUpPageToggle();

  // Lower the resolution if frames are slow (measured over 2 s windows, after a warm-up).
  let frames = 0, windowStart = 0, slowWindows = 0;
  function watchFrameRate(now) {
    if (frames < 30) return;
    if (!windowStart) windowStart = now;
    const elapsed = now - windowStart;
    if (elapsed < 2000) return;
    const fps = ((frames - 30) * 1000) / elapsed;
    frames = 30;
    windowStart = now;
    slowWindows = fps < 40 ? slowWindows + 1 : 0;
    if (slowWindows >= 1 && prStep < pixelRatios.length - 1) {
      prStep++;
      slowWindows = 0;
      resize();
    }
  }

  // plain timing: keeps three.js out of the entry chunk so the text paints with almost no JS
  const start = performance.now();
  let last = start;
  meadow.renderer.setAnimationLoop((now) => {
    if (document.hidden) return (last = now);
    const t = (now - start) / 1000;
    const dt = Math.min((now - last) / 1000, 0.1);
    const here = explore.update(dt, t);
    sound.update(t, here.speed);
    last = now;
    meadow.petals.update(t, dt, {
      camPos: meadow.camera.position,
      forward: here.forward,
      speed: here.speed,
      next: here.next,
      reading: here.reading,
      pointer: meadow.uniforms.uPointerOn.value > 0.5 ? meadow.uniforms.uPointer.value : null,
      ground: meadow.heightAt,
    });
    meadow.render(t);
    frames++;
    if (frames === 2) canvas.classList.add('ready'); // fade in once there's a real frame
    watchFrameRate(now);
  });
}

// Sound is opt-in: a quiet toggle in the toolbar, remembered for this visit. Browsers only let
// audio start from a user gesture, so a remembered "on" waits for the first click or key.
function setUpSoundToggle(sound) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sound-toggle';
  const render = () => {
    btn.setAttribute('aria-pressed', String(sound.on));
    btn.textContent = sound.on ? '♪ Sound on' : '♪ Sound off';
  };
  btn.addEventListener('click', () => {
    sound.setOn(!sound.on);
    try {
      sessionStorage.setItem('meadow-sound', sound.on ? '1' : '0');
    } catch {}
    render();
  });
  render();
  document.querySelector('.hud .tools').appendChild(btn);
  let remembered = false;
  try {
    remembered = sessionStorage.getItem('meadow-sound') === '1';
  } catch {}
  if (remembered) {
    const wake = () => {
      sound.setOn(true);
      render();
    };
    addEventListener('pointerdown', wake, { once: true });
    addEventListener('keydown', wake, { once: true });
  }
}

// The skip link becomes a switch between exploring the meadow and reading everything as a page.
function setUpPageToggle() {
  const skip = document.querySelector('.skip');
  const label = () => (document.body.classList.contains('explore') ? 'Read everything as a page' : 'Explore the meadow');
  skip.textContent = label();
  skip.setAttribute('href', '#top');
  skip.addEventListener('click', (e) => {
    e.preventDefault();
    const exploring = document.body.classList.toggle('explore');
    skip.textContent = label();
    if (!exploring) document.getElementById('top').scrollIntoView();
    skip.focus();
  });
}

if (hasWebGL2()) {
  // let the text paint first, then grow the meadow
  requestAnimationFrame(() => setTimeout(() => grow().catch((e) => console.warn('meadow unavailable:', e)), 0));
}
