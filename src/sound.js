// Ambient sound for the meadow: generated with Web Audio, no files, and never on by default.
// A wind bed that swells with the gusts and your glide, a warm low pad, and a soft chime for
// every bloom (pitched by flower colour, panned towards the board).

// D major pentatonic, two octaves: each flower colour picks its notes.
const NOTES = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0, 987.77];
const VOICE = { lupine: [0, 2, 4], paintbrush: [1, 3, 5], paintbrushMagenta: [2, 4, 6], arnica: [3, 5, 7], lily: [4, 6, 8], daisy: [5, 7, 9] };

export function createSound() {
  let ctx = null;
  let master, wind, windFilter, padGain;
  let on = false;
  let motion = 0;

  function build() {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // wind: looping noise through a gently wandering band-pass
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const ch = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < ch.length; i++) {
      brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      ch[i] = brown * 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 420;
    windFilter.Q.value = 0.7;
    wind = ctx.createGain();
    wind.gain.value = 0.25;
    noise.connect(windFilter).connect(wind).connect(master);
    noise.start();

    // pad: a soft open chord, low-passed, breathing slowly
    padGain = ctx.createGain();
    padGain.gain.value = 0.045;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    padFilter.connect(padGain).connect(master);
    for (const [f, type] of [[146.83, 'sine'], [220.0, 'triangle'], [369.99, 'sine'], [293.66, 'sine']]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 8;
      o.connect(padFilter);
      o.start();
    }
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain).connect(padGain.gain);
    lfo.start();

    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend();
      else if (on) ctx.resume();
    });
  }

  function setOn(value) {
    if (value && !ctx) build();
    on = value;
    if (!ctx) return;
    if (on) ctx.resume();
    master.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.6);
    if (!on) setTimeout(() => !on && ctx.suspend(), 1500);
  }

  // called every frame: the wind swells with gusts and with how fast you're drifting
  function update(t, speed) {
    if (!ctx || !on) return;
    motion += (Math.min(1, speed / 9) - motion) * 0.05;
    const gust = Math.pow(0.5 + 0.5 * Math.sin(t * 0.55), 3);
    const now = ctx.currentTime;
    wind.gain.setTargetAtTime(0.16 + gust * 0.2 + motion * 0.35, now, 0.4);
    windFilter.frequency.setTargetAtTime(330 + gust * 260 + motion * 380, now, 0.5);
  }

  // a bloom: three soft notes, rising, panned towards the board (-1 left … 1 right)
  function chime(kinds, pan = 0) {
    if (!ctx || !on) return;
    const steps = VOICE[kinds[0]] ?? VOICE.daisy;
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-0.8, Math.min(0.8, pan));
    panner.connect(master);
    steps.forEach((n, i) => {
      const t0 = ctx.currentTime + 0.05 + i * 0.22;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = NOTES[n];
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.12, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 2.6);
      o.connect(g).connect(panner);
      o.start(t0);
      o.stop(t0 + 2.7);
    });
  }

  return {
    setOn,
    update,
    chime,
    get on() {
      return on;
    },
  };
}
