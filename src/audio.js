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
  rank() {
    tone('triangle', 520, 1040, 0.16, 0.16);
    tone('triangle', 780, 1560, 0.2, 0.12, 0.07);
  },
  grab() {
    tone('sawtooth', 110, 70, 0.3, 0.16, 0, 600);
    noise(0.25, 0.18, 300, 120, 1);
  },
  breath() {
    noise(1.1, 0.4, 500, 1600, 0.8);
    tone('sawtooth', 90, 60, 1.1, 0.14, 0, 500);
  },
  charge() {
    tone('sawtooth', 120, 720, 1, 0.12, 0, 1400);
    noise(1, 0.12, 400, 3000, 2);
  },
  laser() {
    tone('sawtooth', 880, 220, 1.1, 0.16);
    tone('square', 440, 110, 1.1, 0.08);
    noise(1.1, 0.35, 5000, 1500, 0.6);
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
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// Music themes. Each one plays a single 16th-note step `n` at `d` seconds from now; `step` is
// the length of a 16th in seconds (the tempo).
export const THEMES = {
  // The first theme of the road: a brooding graveyard groove. It now plays on the main menu.
  graveyard: {
    step: 60 / 116 / 4,
    bass: [38, 38, 50, 38, 41, 38, 50, 45, 36, 36, 48, 36, 43, 36, 46, 45],
    lead: [
      74, 0, 0, 77, 0, 74, 0, 0, 72, 0, 0, 69, 0, 70, 72, 0, 74, 0, 0, 77, 0, 81, 0, 0, 79, 0, 77,
      0, 76, 0, 72, 0,
    ],
    play(n, d, soft = 1, withLead = true) {
      const st = this.step;
      if (n % 2 === 0) {
        const f = hz(this.bass[(n / 2) % 16]);
        tone('sawtooth', f, f, st * 1.7, 0.14 * soft, d, 520);
      }
      if (n % 8 === 0) tone('sine', 130, 42, 0.14, 0.4 * soft, d);
      if (n % 8 === 4) noise(0.1, 0.13 * soft, 1800, 900, 0.8, d);
      if (n % 2 === 1) noise(0.03, 0.04 * soft, 7000, 6000, 2, d, 'highpass');
      const l = this.lead[n % 32];
      if (l && withLead) tone('square', hz(l), hz(l), st * 1.6, 0.028, d, 1800);
    },
  },
  // The level theme: a fighting spaghetti-western ride in E minor. A galloping bass, a snare
  // on the backbeat, offbeat chord stabs, a twangy lead doubled an octave down like a
  // trumpet, and a whip crack at the end of every four bars.
  western: {
    step: 60 / 140 / 4,
    roots: [40, 40, 36, 35], // Em Em C B, one per bar
    chords: [
      [64, 67, 71],
      [64, 67, 71],
      [60, 64, 67],
      [59, 63, 66],
    ],
    lead: [
      76, 0, 0, 0, 79, 0, 81, 0, 83, 0, 0, 81, 79, 0, 76, 0, 74, 0, 0, 0, 76, 0, 79, 0, 76, 0, 0, 0,
      0, 0, 0, 0, 72, 0, 0, 72, 74, 0, 76, 0, 79, 0, 76, 0, 74, 0, 72, 0, 71, 0, 0, 0, 74, 0, 72, 0,
      71, 0, 0, 0, 75, 0, 78, 0,
    ],
    play(n, d) {
      const st = this.step,
        bar = Math.floor(n / 16) % 4,
        root = this.roots[bar],
        beat = n % 4;
      // gallop: DUM da-da on every beat, the fifth on the off-beats
      if (beat !== 1) {
        const f = hz(beat === 0 ? root : root + 7);
        tone('sawtooth', f, f, st * 0.85, beat === 0 ? 0.16 : 0.1, d, 700);
      }
      if (n % 8 === 0) tone('sine', 140, 40, 0.16, 0.45, d);
      if (n % 8 === 4) {
        noise(0.12, 0.22, 2200, 900, 0.9, d);
        tone('triangle', 200, 140, 0.06, 0.1, d);
      }
      noise(0.025, beat === 2 ? 0.06 : 0.03, 8000, 6500, 2, d, 'highpass');
      if (beat === 2)
        for (const m of this.chords[bar]) tone('triangle', hz(m), hz(m), st * 0.7, 0.025, d, 2600);
      const l = this.lead[n % 64];
      if (l) {
        tone('square', hz(l), hz(l) * 0.995, st * 1.8, 0.04, d, 2400);
        tone('sawtooth', hz(l - 12), hz(l - 12), st * 1.8, 0.03, d, 1300);
      }
      if (n % 64 === 62) {
        noise(0.09, 0.5, 6000, 900, 3, d);
        noise(0.05, 0.3, 3000, 8000, 2, d + 0.03);
      }
    },
  },
  // Character select: tense — a pulsing low ostinato that leans on a minor second, a heartbeat
  // kick, ticking hats and a slow dissonant swell.
  tense: {
    step: 60 / 116 / 4,
    notes: [38, 38, 39, 38, 38, 38, 39, 41, 38, 38, 39, 38, 36, 37, 38, 39],
    play(n, d) {
      const st = this.step,
        f = hz(this.notes[n % 16]);
      tone('square', f, f, st * 0.9, 0.07, d, 380);
      if (n % 8 === 0 || n % 8 === 3) tone('sine', 120, 38, 0.18, n % 8 ? 0.28 : 0.42, d);
      noise(0.025, n % 4 === 2 ? 0.07 : 0.035, 8000, 6500, 2, d, 'highpass');
      if (n % 32 === 0)
        for (const m of [62, 63, 69]) tone('sawtooth', hz(m), hz(m) * 1.01, st * 30, 0.018, d, 900);
      if (n % 64 === 48) noise(st * 14, 0.06, 300, 3200, 1.2, d);
    },
  },
};
/** Which theme plays now: the western in the fight, the old theme on the menu. */
export function themeFor(state) {
  if (state === 'select') return 'tense';
  if (state === 'play') return 'western';
  if (state === 'title') return 'graveyard';
  return null;
}
export function music() {
  let n = 0,
    next = AC.currentTime + 0.1,
    playing = null;
  setInterval(() => {
    if (!AC) return;
    if (next < AC.currentTime) next = AC.currentTime + 0.05;
    while (next < AC.currentTime + 0.25) {
      const id = G.muted ? null : themeFor(G.state);
      if (id !== playing) {
        playing = id;
        n = 0; // every theme starts from its first bar
      }
      const th = id && THEMES[id];
      if (th) th.play(n, next - AC.currentTime, id === 'graveyard' ? 0.5 : 1, id !== 'graveyard');
      next += th ? th.step : THEMES.graveyard.step;
      n++;
    }
  }, 50);
}
