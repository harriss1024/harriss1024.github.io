let audioCtx = null;
let unlocked = false;

function ensureCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function unlockAudio() {
  if (unlocked) return;
  ensureCtx();
  unlocked = true;
}

export function isUnlocked() { return unlocked; }

function envelope(node, t0, attack, decay, peak) {
  const g = node.gain;
  g.cancelScheduledValues(t0);
  g.setValueAtTime(0, t0);
  g.linearRampToValueAtTime(peak, t0 + attack);
  g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function tone({ freq, freqEnd, type = 'sine', duration = 0.2, volume = 0.3, attack = 0.01 }) {
  const c = ensureCtx();
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 0.001), t0 + duration);
  }
  envelope(gain, t0, attack, Math.max(duration - attack, 0.05), volume);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noiseBurst({ duration = 0.2, volume = 0.4, lowpass = 1500 }) {
  const c = ensureCtx();
  const t0 = c.currentTime;
  const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * duration)), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(lowpass, t0);
  const gain = c.createGain();
  envelope(gain, t0, 0.005, duration, volume);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

const SOUNDS = {
  collectSun: () => tone({ freq: 1200, freqEnd: 1600, type: 'sine', duration: 0.25, volume: 0.35 }),
  plant:      () => tone({ freq: 220,  freqEnd: 110,  type: 'triangle', duration: 0.2, volume: 0.4 }),
  shoot:      () => tone({ freq: 320,  freqEnd: 580,  type: 'sine', duration: 0.08, volume: 0.22 }),
  hit:        () => noiseBurst({ duration: 0.06, volume: 0.3, lowpass: 800 }),
  iceHit:     () => tone({ freq: 1800, freqEnd: 2400, type: 'sine', duration: 0.2, volume: 0.28 }),
  explode:    () => {
    noiseBurst({ duration: 0.5, volume: 0.6, lowpass: 500 });
    tone({ freq: 80, freqEnd: 30, type: 'sawtooth', duration: 0.4, volume: 0.4 });
  },
  bite: () => {
    tone({ freq: 200, type: 'square', duration: 0.05, volume: 0.18 });
    setTimeout(() => tone({ freq: 240, type: 'square', duration: 0.05, volume: 0.18 }), 90);
  },
  zombieMoan: () => tone({ freq: 110, freqEnd: 70, type: 'sawtooth', duration: 0.6, volume: 0.2 }),
  mower:      () => {
    tone({ freq: 100, freqEnd: 400, type: 'sawtooth', duration: 0.35, volume: 0.4 });
    noiseBurst({ duration: 0.3, volume: 0.2, lowpass: 1200 });
  },
  alert: () => {
    const seq = [800, 400, 800, 400];
    seq.forEach((f, i) => {
      setTimeout(() => tone({ freq: f, type: 'square', duration: 0.18, volume: 0.4 }), i * 200);
    });
  },
  victory: () => {
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => tone({ freq: f, type: 'sine', duration: i === 2 ? 0.5 : 0.18, volume: 0.5 }), i * 180);
    });
  },
  defeat: () => tone({ freq: 200, freqEnd: 60, type: 'sawtooth', duration: 0.9, volume: 0.5 }),
};

export function play(name) {
  if (!unlocked) return;
  const fn = SOUNDS[name];
  if (fn) try { fn(); } catch (e) { /* ignore audio errors */ }
}
