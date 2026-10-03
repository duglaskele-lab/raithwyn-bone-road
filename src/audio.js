// Synthesised sound effects and the music loop (Web Audio, no audio files).
import { rnd } from './util.js';
import { G } from './state.js';

let AC = null,
  MG = null,
  NB = null;
export function audioInit() {
  if (AC) {
    if (AC.state === 'suspended') AC.resume();
    return;
  }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    MG = AC.createGain();
    MG.gain.value = 0.55;
    MG.connect(AC.destination);
    NB = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = NB.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    music();
  } catch (e) {
    AC = null;
  }
}
export function tone(type, f0, f1, dur, vol, delay = 0, lp = 0) {
  if (!AC || G.muted) return;
  const t = AC.currentTime + delay,
    o = AC.createOscillator(),
    g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  let n = o;
  if (lp) {
    const f = AC.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lp;
    o.connect(f);
    n = f;
  }
  n.connect(g);
  g.connect(MG);
  o.start(t);
  o.stop(t + dur + 0.03);
}
export function noise(dur, vol, f0, f1, q = 1, delay = 0, type = 'bandpass') {
  if (!AC || G.muted) return;
  const t = AC.currentTime + delay,
    s = AC.createBufferSource(),
    f = AC.createBiquadFilter(),
    g = AC.createGain();
  s.buffer = NB;
  s.loop = true;
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(MG);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.03);
}
export const SFX = {
  punch() {
    noise(0.09, 0.55, 900, 220);
    tone('sine', 170, 50, 0.12, 0.5);
  },
  heavy() {
    noise(0.18, 0.8, 700, 120);
    tone('sine', 140, 34, 0.24, 0.8);
  },
  swing() {
    noise(0.11, 0.16, 500, 1900, 2);
  },
  clack() {
    tone('square', 900, 380, 0.05, 0.13);
    noise(0.04, 0.22, 2600, 1500, 3);
  },
  shatter() {
    for (let i = 0; i < 5; i++) tone('square', rnd(500, 1300), rnd(200, 420), 0.06, 0.1, i * 0.035);
    noise(0.26, 0.32, 1900, 400);
  },
  hado() {
    tone('sawtooth', 150, 950, 0.36, 0.18);
    noise(0.42, 0.34, 400, 2800, 1.4);
  },
  nova() {
    tone('sine', 110, 26, 1.2, 0.9);
    noise(1, 0.5, 3200, 140, 0.7);
    tone('sawtooth', 60, 420, 0.5, 0.16);
  },
  hurt() {
    tone('square', 320, 110, 0.16, 0.2);
    noise(0.08, 0.3, 700, 300);
  },
  pick() {
    tone('triangle', 660, 660, 0.08, 0.22);
    tone('triangle', 990, 990, 0.15, 0.22, 0.08);
  },
  deny() {
    tone('square', 140, 105, 0.12, 0.14);
  },
  jump() {
    tone('triangle', 250, 520, 0.12, 0.1);
  },
  thud() {
    tone('sine', 110, 40, 0.16, 0.5);
    noise(0.1, 0.28, 320, 100);
  },
  boss() {
    tone('sawtooth', 73, 44, 1.2, 0.35);
    tone('sawtooth', 55, 40, 1.2, 0.3);
    noise(1, 0.2, 200, 900, 1);
  },
  rise() {
    noise(0.5, 0.2, 200, 700, 1.2);
  },
  acid() {
    tone('sine', 520, 180, 0.22, 0.16);
    noise(0.3, 0.2, 1200, 300, 2);
  },
  splash() {
    noise(0.22, 0.35, 900, 200, 1.5);
    tone('sine', 300, 90, 0.14, 0.22);
  },
  engine() {
    tone('sawtooth', 60, 135, 0.95, 0.2, 0, 520);
    tone('square', 45, 98, 0.95, 0.09, 0, 300);
    noise(0.9, 0.1, 200, 700, 1);
  },
};
export function music() {
  const st = 60 / 116 / 4;
  let n = 0,
    next = AC.currentTime + 0.1;
  const bass = [38, 38, 50, 38, 41, 38, 50, 45, 36, 36, 48, 36, 43, 36, 46, 45];
  const lead = [
    74, 0, 0, 77, 0, 74, 0, 0, 72, 0, 0, 69, 0, 70, 72, 0, 74, 0, 0, 77, 0, 81, 0, 0, 79, 0, 77, 0,
    76, 0, 72, 0,
  ];
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  setInterval(() => {
    if (!AC) return;
    if (next < AC.currentTime) next = AC.currentTime + 0.05;
    while (next < AC.currentTime + 0.25) {
      if (!G.muted && (G.state === 'play' || G.state === 'title')) {
        const d = next - AC.currentTime,
          soft = G.state === 'title' ? 0.5 : 1;
        if (n % 2 === 0) {
          const f = hz(bass[(n / 2) % 16]);
          tone('sawtooth', f, f, st * 1.7, 0.14 * soft, d, 520);
        }
        if (n % 8 === 0) tone('sine', 130, 42, 0.14, 0.4 * soft, d);
        if (n % 8 === 4) noise(0.1, 0.13 * soft, 1800, 900, 0.8, d);
        if (n % 2 === 1) noise(0.03, 0.04 * soft, 7000, 6000, 2, d, 'highpass');
        const l = lead[n % 32];
        if (l && G.state === 'play') {
          const f = hz(l);
          tone('square', f, f, st * 1.6, 0.028, d, 1800);
        }
      }
      next += st;
      n++;
    }
  }, 50);
}
