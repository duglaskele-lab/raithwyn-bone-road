// Synthesised sound effects and the music loop (Web Audio). The fight and the dragon have
// recorded songs (songs.js); the synth themes cover the menus and stand in until those load.
import { mulberry } from './util.js';

// Synth wobble is not part of the game: it has its own chance, apart from the seeded one.
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
import { G } from './state.js';
import { songTick, songsAttach } from './songs.js';
import { levelWaves } from './level.js';

let AC = null,
  MG = null,
  NB = null;
/**
 * Points the synthesizer at an audio context. The game uses the live one; an
 * OfflineAudioContext works too, which is how a theme can be rendered to a file.
 */
export function attach(ctx) {
  AC = ctx;
  MG = AC.createGain();
  MG.gain.value = 0.55;
  MG.connect(AC.destination);
  NB = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
  const d = NB.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  songsAttach(AC, MG);
}
// A stream of everything the game plays, for the video recorder (made on first use).
let REC = null;
export function audioStream() {
  if (!AC || !AC.createMediaStreamDestination) return null;
  if (!REC) {
    REC = AC.createMediaStreamDestination();
    MG.connect(REC);
  }
  return REC.stream;
}
// A hidden page (the window minimised, another tab in front) is silent: the whole sound, the
// music and the effects alike, is put on hold and goes on where it stopped when the page is back.
let asleep = false;
export function audioInit() {
  if (AC) {
    if (AC.state === 'suspended' && !asleep) AC.resume()?.catch?.(() => {});
    return;
  }
  try {
    attach(new (window.AudioContext || window.webkitAudioContext)());
    music();
    if (asleep) AC.suspend()?.catch?.(() => {});
  } catch (e) {
    AC = null;
  }
}
/** The page is shown (true) or hidden (false). */
export function audioAwake(awake) {
  asleep = !awake;
  if (!AC || AC.state === 'closed') return;
  (awake ? AC.resume() : AC.suspend())?.catch?.(() => {});
}
/** The state of the sound: 'none' before the first touch, else the context's (for tests). */
export const audioState = () => AC?.state ?? 'none';
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
// A rough, throaty growl: detuned saws and a sub, their pitch shaken by a fast LFO (a vocal
// fry), pushed through a band-pass that opens and closes, with a breathy rasp on top.
export function growl(dur, f0, f1, vol, delay = 0) {
  if (!AC || G.muted) return;
  const t = AC.currentTime + delay,
    bp = AC.createBiquadFilter(),
    g = AC.createGain(),
    lfo = AC.createOscillator(),
    lg = AC.createGain();
  bp.type = 'bandpass';
  bp.Q.value = 1.6;
  bp.frequency.setValueAtTime(260, t);
  bp.frequency.linearRampToValueAtTime(950, t + dur * 0.35);
  bp.frequency.exponentialRampToValueAtTime(320, t + dur);
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.12, dur * 0.2));
  g.gain.setValueAtTime(vol, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  lfo.frequency.setValueAtTime(26, t);
  lfo.frequency.linearRampToValueAtTime(38, t + dur);
  lg.gain.value = f0 * 0.12;
  lfo.connect(lg);
  const oscs = [
    ['sawtooth', 1],
    ['sawtooth', 1.012],
    ['square', 0.5],
  ].map(([type, k]) => {
    const o = AC.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0 * k, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * k), t + dur);
    lg.connect(o.frequency);
    o.connect(bp);
    return o;
  });
  bp.connect(g);
  g.connect(MG);
  for (const o of [...oscs, lfo]) {
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  noise(dur * 0.9, vol * 0.5, 1400, 600, 2.5, delay);
}
// A clatter of loose bones: quick dry clicks at scattered pitches.
export function rattle(dur, n, vol, delay = 0) {
  for (let i = 0; i < n; i++) {
    const at = delay + (i / n) * dur + rnd(0, dur / n / 2);
    tone('square', rnd(700, 1700), rnd(300, 600), 0.035, vol, at, 3200);
    noise(0.03, vol * 1.4, rnd(2500, 4000), 1500, 4, at);
  }
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
  // the samurai: a ring of steel as it settles into its stance, the cut, the daze
  stance() {
    tone('triangle', 1760, 1700, 0.5, 0.05);
    tone('sine', 2640, 2600, 0.35, 0.03, 0.02);
    noise(0.18, 0.08, 3000, 6000, 3);
  },
  katana() {
    noise(0.12, 0.42, 7000, 1400, 2.5);
    tone('sawtooth', 2200, 600, 0.09, 0.05);
    tone('triangle', 3300, 3100, 0.25, 0.05, 0.05);
  },
  // the dragon's plasma: gathering in the jaws, each ball spat out, a blast on the ground
  plasmaWind() {
    tone('sawtooth', 80, 320, 0.7, 0.08, 0, 1400);
    noise(0.7, 0.12, 300, 2400, 2);
  },
  plasma() {
    tone('square', 520, 160, 0.18, 0.08);
    noise(0.16, 0.22, 2400, 600, 2);
  },
  blast() {
    noise(0.45, 0.6, 1600, 90, 0.8);
    tone('sine', 120, 30, 0.4, 0.6);
    tone('sawtooth', 300, 60, 0.25, 0.08);
  },
  daze() {
    for (let i = 0; i < 3; i++) tone('triangle', 900 - i * 160, 700 - i * 160, 0.12, 0.08, i * 0.1);
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
  // Old Quarry
  boom() {
    tone('sine', 90, 24, 0.9, 0.9);
    noise(0.9, 0.7, 1800, 80, 0.6);
    noise(0.25, 0.4, 4000, 900, 1.2);
  },
  fuse() {
    noise(0.12, 0.08, 6000, 4500, 3, 0, 'highpass');
  },
  gun() {
    noise(0.05, 0.22, 3500, 900, 1.6);
    tone('square', 180, 70, 0.04, 0.08);
  },
  spin() {
    tone('sawtooth', 40, 260, 0.8, 0.08, 0, 900);
    noise(0.8, 0.06, 600, 2400, 2);
  },
  clang() {
    tone('square', 620, 540, 0.12, 0.1);
    tone('triangle', 1240, 1180, 0.2, 0.08);
    noise(0.06, 0.2, 5000, 2500, 2);
  },
  squelch() {
    tone('sine', 220, 70, 0.25, 0.3);
    noise(0.3, 0.3, 500, 150, 2);
  },
  hiss() {
    noise(0.45, 0.3, 2400, 900, 1.5);
    tone('sawtooth', 300, 180, 0.3, 0.06, 0, 1200);
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
  // The Bone Dragon's own voice.
  dragonRoar() {
    growl(1.3, 95, 62, 0.34);
    growl(1.1, 142, 88, 0.16, 0.05);
    rattle(1, 14, 0.05, 0.1);
    tone('sine', 55, 32, 1.2, 0.35, 0);
  },
  dragonWind() {
    // bones creak and clatter as it draws back, under a short snarl
    rattle(0.4, 7, 0.07);
    growl(0.45, 120, 150, 0.18, 0.05);
    tone('sawtooth', 70, 95, 0.4, 0.07, 0, 300);
  },
  dragonCharge() {
    // an eerie, inharmonic chime that rises and beats faster: the bone heart filling up
    for (const [k, v] of [
      [1, 0.07],
      [2.41, 0.05],
      [3.93, 0.035],
      [5.37, 0.025],
    ])
      tone('sine', 180 * k, 520 * k, 1, v, 0);
    for (let i = 0; i < 9; i++) {
      const at = 1 - Math.pow(1 - i / 9, 0.55);
      tone('triangle', 900 + i * 90, 600 + i * 70, 0.08, 0.05 + i * 0.006, at * 0.95);
    }
    growl(1, 70, 110, 0.08);
  },
  dragonHurt() {
    growl(0.5, 160, 90, 0.2);
    rattle(0.3, 6, 0.06);
  },
  quake() {
    tone('sine', 70, 26, 1, 0.55);
    noise(1, 0.3, 500, 80, 0.7);
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
  // A fighting spaghetti-western ride (the level theme before the night theme) in E minor. A galloping bass, a snare
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
  // The level theme: "Night on the Bone Road", a driving fight in D minor at 150 BPM that runs
  // about 80 seconds before it loops. Riff and chorus sections alternate with two guitar-like
  // solos (written out note by note from a fixed seed, so they never sound like a loop) and a
  // half-time break where a bell tolls, wind blows and a heartbeat thumps: the unease of a
  // graveyard at night. After the first pass the intro is skipped.
  night: {
    step: 60 / 150 / 4,
    // chord: bass root, pad tones, and the scale degree the riff/solo hangs on
    chords: {
      Dm: { root: 38, pad: [62, 65, 69], deg: 0 },
      Bb: { root: 34, pad: [58, 62, 65], deg: 5 },
      A: { root: 33, pad: [57, 61, 64], deg: 4, sharp: 1 },
      Gm: { root: 31, pad: [55, 58, 62], deg: 3 },
      C: { root: 36, pad: [60, 64, 67], deg: 6 },
      F: { root: 41, pad: [57, 60, 65], deg: 2 },
    },
    sections: {
      intro: { ch: ['Dm', 'Dm', 'Bb', 'A'], drums: 'heart', pad: 1, bell: 1, wind: 1 },
      drive: { ch: ['Dm', 'Dm', 'Bb', 'A'], drums: 'build', bass: 1, pad: 1 },
      A: { ch: ['Dm', 'Dm', 'Bb', 'A'], drums: 'full', bass: 1, lead: 'riff' },
      A2: { ch: ['Dm', 'F', 'Bb', 'A'], drums: 'full', bass: 1, lead: 'riff', up: 1 },
      B: { ch: ['Gm', 'Bb', 'C', 'A'], drums: 'full', bass: 1, lead: 'hook', pad: 1 },
      B2: { ch: ['Gm', 'Bb', 'C', 'A'], drums: 'full', bass: 1, lead: 'hook', up: 1, pad: 1 },
      solo1: { ch: ['Dm', 'C', 'Bb', 'A'], drums: 'full', bass: 1, lead: 'solo', seed: 11 },
      solo1b: { ch: ['Gm', 'Dm', 'Bb', 'A'], drums: 'full', bass: 1, lead: 'solo', seed: 23 },
      brk: { ch: ['Dm', 'Dm', 'Bb', 'A'], drums: 'half', pad: 1, bell: 1, wind: 1, choir: 1 },
      solo2: {
        ch: ['Dm', 'Bb', 'Gm', 'A'],
        drums: 'full',
        bass: 1,
        lead: 'solo',
        seed: 37,
        trem: 1,
      },
      solo2b: {
        ch: ['Bb', 'C', 'A', 'A'],
        drums: 'full',
        bass: 1,
        lead: 'solo',
        seed: 41,
        trem: 1,
      },
      turn: { ch: ['Dm', 'Bb', 'A', 'A'], drums: 'fill', bass: 1, lead: 'riff' },
    },
    form: [
      'intro',
      'drive',
      'A',
      'A2',
      'B',
      'solo1',
      'solo1b',
      'A',
      'brk',
      'solo2',
      'solo2b',
      'B2',
      'A2',
      'turn',
    ],
    // the riff and the chorus hook, as scale degrees over each chord (null = rest)
    riff: [0, null, 0, 2, null, 0, 4, null, 3, null, 2, 1, 0, null, -1, null],
    hook: [7, null, null, null, 6, null, 4, null, 5, null, null, null, 4, null, 2, null],
    /** MIDI note of scale degree `d` of D minor (C sharpened over the A chord). */
    note(d, sharp) {
      const sc = [62, 64, 65, 67, 69, 70, sharp ? 73 : 72],
        o = Math.floor(d / 7);
      return sc[((d % 7) + 7) % 7] + 12 * o;
    },
    /** Section and position for step n: the first pass plays the intro, later ones skip it. */
    at(n) {
      const len = 64,
        k = Math.floor(n / len),
        idx = k < this.form.length ? k : 1 + ((k - this.form.length) % (this.form.length - 1));
      return { sec: this.sections[this.form[idx]], s: n % len, idx };
    },
    play(n, d) {
      const st = this.step,
        { sec, s } = this.at(n),
        bar = Math.floor(s / 16),
        b = s % 16,
        c = this.chords[sec.ch[bar]];
      this.drums(sec.drums, s, b, bar, d);
      // bass: galloping eighths with an octave kick on the off-beat
      if (sec.bass && b % 2 === 0) {
        const f = hz(c.root + ([0, 0, 12, 0, 0, 0, 12, 7][b / 2] || 0));
        tone('sawtooth', f, f, st * 1.6, 0.13, d, 650);
      }
      // dark organ pad and the graveyard sounds
      if (sec.pad && b === 0)
        for (const m of c.pad) tone('sawtooth', hz(m - 12), hz(m - 12), st * 15, 0.016, d, 900);
      if (sec.bell && b === 0 && bar % 2 === 0) {
        tone('sine', hz(74), hz(74), 2.4, 0.09, d);
        tone('sine', hz(74) * 2.76, hz(74) * 2.76, 1.4, 0.03, d);
      }
      if (sec.wind && s === 8) noise(st * 40, 0.05, 300, 1400, 0.6, d);
      if (sec.choir && b === 0)
        for (const m of [c.pad[0], c.pad[2] + 12])
          tone('triangle', hz(m), hz(m) * 1.004, st * 15, 0.028, d, 1200);
      // lead
      if (sec.lead === 'riff' || sec.lead === 'hook') {
        const v = this[sec.lead][b];
        if (v !== null) {
          const m = this.note(
            c.deg + v + (sec.lead === 'hook' ? 0 : 7) + (sec.up ? 7 : 0),
            c.sharp,
          );
          tone('square', hz(m), hz(m), st * (sec.lead === 'hook' ? 3.5 : 1.7), 0.034, d, 2600);
          if (sec.lead === 'hook')
            tone('sawtooth', hz(m - 12), hz(m - 12), st * 3.5, 0.02, d, 1500);
        }
      } else if (sec.lead === 'solo') this.solo(sec, c, s, bar, b, d);
    },
    // A solo bar, written from the section's seed: runs of sixteenths, eighth-note phrases and
    // a long bent note to end every second bar.
    solo(sec, c, s, bar, b, d) {
      const st = this.step,
        r = mulberry(sec.seed * 97 + bar * 13),
        kind = r() < 0.55 ? 'run' : 'phrase',
        steps = [];
      let deg = c.deg + 7 + Math.floor(r() * 3);
      for (let i = 0; i < 16; i++) {
        const play = kind === 'run' ? true : i % 2 === 0 || r() < 0.2;
        if (play) {
          deg += [-2, -1, -1, 1, 1, 2, 3][Math.floor(r() * 7)];
          deg = Math.max(c.deg + 5, Math.min(c.deg + 15, deg));
        }
        steps.push(play ? deg : null);
      }
      if (bar % 2 === 1) {
        if (b >= 12) return;
        if (b === 8) {
          const m = this.note(c.deg + 7 + 4, c.sharp);
          tone('sawtooth', hz(m), hz(m) * 0.94, st * 8, 0.04, d, 3200);
          tone('square', hz(m + 0.1), hz(m) * 0.94, st * 8, 0.015, d, 2400);
          return;
        }
        if (b > 8) return;
      }
      const v = steps[b];
      if (v === null || v === undefined) return;
      const m = this.note(v, c.sharp),
        len = kind === 'run' ? 0.9 : 1.8;
      tone('sawtooth', hz(m), hz(m) * 0.997, st * len, 0.036, d, 3200);
      if (sec.trem) tone('sawtooth', hz(m), hz(m), st * 0.4, 0.02, d + st * 0.5, 3200);
    },
    drums(kind, s, b, bar, d) {
      const hat = (v) => noise(0.025, v, 8500, 7000, 2, d, 'highpass');
      const kick = (v = 0.45) => tone('sine', 150, 40, 0.16, v, d);
      const snare = (v = 0.22) => {
        noise(0.13, v, 2000, 900, 0.9, d);
        tone('triangle', 210, 150, 0.07, 0.1, d);
      };
      if (kind === 'heart') {
        // a heartbeat in the dark
        if (b === 0) kick(0.3);
        if (b === 3) kick(0.2);
        return;
      }
      if (kind === 'half') {
        if (b === 0) kick(0.35);
        if (b === 8) snare(0.2);
        if (b % 4 === 2) hat(0.03);
        if (bar === 3 && b >= 12) tone('sine', 220 - (b - 12) * 30, 90, 0.18, 0.25, d);
        return;
      }
      if (s === 0 && kind !== 'build') noise(0.7, 0.16, 6000, 2000, 0.7, d); // crash
      if (kind === 'build') {
        if (b % 4 === 0) kick(0.35);
        if (bar === 3 && b >= 8) snare(0.08 + (b - 8) * 0.02);
        hat(0.025);
        return;
      }
      if (b % 4 === 0 || b === 6 || b === 14) kick();
      if (b === 4 || b === 12) snare();
      hat(b % 2 ? 0.025 : 0.045);
      if (kind === 'fill' && bar === 3 && b >= 8) snare(0.12 + (b - 8) * 0.015);
    },
  },
  // The Bone Dragon's fight, phase one: slow, heavy and grotesque. A bass that grinds between E,
  // F and the tritone B-flat, a lurching kick, a clanking iron hit instead of a snare, a groan
  // every two bars, a dissonant choir and a detuned music box that warbles out of key.
  dragon: {
    step: 60 / 112 / 4,
    bass: [40, 0, 40, 41, 0, 40, 0, 46, 40, 0, 40, 0, 41, 0, 39, 0],
    choir: [
      [64, 65, 70],
      [64, 67, 70],
      [63, 65, 70],
      [64, 65, 69],
    ],
    box: [76, 0, 0, 77, 0, 0, 82, 0, 81, 0, 0, 0, 77, 0, 76, 0],
    play(n, d) {
      const st = this.step,
        bar = Math.floor(n / 16) % 4,
        b = n % 16,
        m = this.bass[b];
      if (m) {
        tone('sawtooth', hz(m), hz(m) * 0.99, st * 1.8, 0.15, d, 450);
        tone('sine', hz(m - 12), hz(m - 12), st * 1.8, 0.12, d);
      }
      if (b === 0 || b === 6 || b === 10) tone('sine', 120, 34, 0.26, 0.5, d);
      if (b === 8) {
        tone('square', 1180, 1150, 0.14, 0.05, d, 5000);
        tone('square', 1730, 1700, 0.11, 0.04, d, 5000);
        noise(0.16, 0.18, 3200, 1400, 3, d);
      }
      if (b % 4 === 2) noise(0.03, 0.025, 8000, 6500, 2, d, 'highpass');
      if (n % 32 === 0) growl(1.4, 80, 55, 0.1, d);
      if (b === 0)
        for (const c of this.choir[bar])
          tone('triangle', hz(c), hz(c) * 1.006, st * 16, 0.02, d, 1400);
      const x = this.box[b];
      if (x && bar % 2 === 1) {
        tone('triangle', hz(x), hz(x) * 1.03, st * 2.5, 0.03, d);
        tone('triangle', hz(x), hz(x) * 0.97, st * 2.5, 0.012, d + st * 3);
      }
      if (bar === 3 && b >= 12) tone('sine', 190 - (b - 12) * 28, 70, 0.2, 0.3, d);
    },
  },
  // Phase two: the same grinding bass doubled into a gallop at 150 BPM, a pounding kick and
  // snare, hats on every step, funeral bells on every beat and a church organ chanting the
  // Dies irae, the hymn of the dead.
  dragon2: {
    step: 60 / 150 / 4,
    dies: [67, 66, 67, 64, 66, 62, 64, 64],
    play(n, d) {
      const st = this.step,
        bar = Math.floor(n / 16) % 4,
        b = n % 16,
        root = THEMES.dragon.bass[b - (b % 2)] || 40;
      if (b % 2 === 0) {
        const m = b % 4 === 2 ? root + 6 : root;
        tone('sawtooth', hz(m), hz(m), st * 1.6, 0.14, d, 520);
        tone('sine', hz(m - 12), hz(m - 12), st * 1.6, 0.1, d);
      }
      if (b % 4 === 0 || (bar === 3 && b % 2 === 0)) tone('sine', 140, 38, 0.17, 0.5, d);
      if (b === 4 || b === 12) {
        noise(0.13, 0.24, 2100, 900, 0.9, d);
        tone('triangle', 220, 150, 0.07, 0.1, d);
      }
      noise(0.022, b % 2 ? 0.025 : 0.04, 8500, 7000, 2, d, 'highpass');
      if (b % 4 === 0) {
        // a funeral bell on every beat
        tone('sine', hz(76), hz(76), 1.2, 0.05, d);
        tone('sine', hz(76) * 2.76, hz(76) * 2.76, 0.6, 0.018, d);
      }
      if (n % 4 === 0) {
        // the organ: Dies irae, the second time an octave higher
        const note = this.dies[Math.floor((n % 32) / 4)] + (Math.floor(n / 32) % 2 ? 12 : 0);
        for (const k of [0, 7, 12])
          tone('sawtooth', hz(note + k), hz(note + k), st * 4, 0.022, d, 1700);
      }
      if (n % 64 === 0) growl(1.2, 90, 60, 0.12, d);
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
// Old Quarry's two themes share one band: a galloping bass, a kick and snare, a shaker, a
// tremolo guitar, a whistled tune, a trumpet, bells, a choir and a whip. Each section is four
// bars (64 sixteenths) with a chord per bar and the parts it uses; a melody is written out as
// MIDI notes, 16 to a bar (0 = rest; a note rings until the next one). After the first pass
// the intro is skipped.
function westernBand(cfg) {
  return {
    step: 60 / cfg.bpm / 4,
    ...cfg,
    at(n) {
      const len = 64,
        k = Math.floor(n / len),
        f = this.form,
        idx = k < f.length ? k : 1 + ((k - f.length) % (f.length - 1));
      return { sec: this.sections[f[idx]], s: n % len };
    },
    play(n, d) {
      const st = this.step,
        { sec, s } = this.at(n),
        bar = Math.floor(s / 16),
        b = s % 16,
        c = this.chords[sec.ch[bar]],
        beat = b % 4;
      // drums
      const kick = (v = 0.42) => tone('sine', 145, 40, 0.16, v, d),
        snare = (v = 0.2) => {
          noise(0.12, v, 2200, 900, 0.9, d);
          tone('triangle', 200, 140, 0.06, 0.09, d);
        };
      if (sec.drums === 'full') {
        if (b % 8 === 0) kick();
        if (b % 8 === 4) snare();
        if (b === 14 && bar === 3) snare(0.14);
      } else if (sec.drums === 'drive') {
        if (b % 4 === 0) kick(0.45);
        if (b % 8 === 4) snare(0.24);
        if (b % 8 === 7) kick(0.25);
      } else if (sec.drums === 'half') {
        if (b === 0) kick(0.35);
        if (b === 8) snare(0.18);
      } else if (sec.drums === 'fill') {
        if (b % 8 === 0) kick();
        if (bar === 3 ? b % 2 === 0 && b > 4 : b % 8 === 4)
          snare(0.12 + (bar === 3 ? b * 0.008 : 0.08));
      }
      if (sec.drums && sec.drums !== 'half')
        noise(0.022, beat === 2 ? 0.05 : 0.025, 8200, 6800, 2, d, 'highpass');
      if (sec.drums === 'shaker')
        noise(0.03, beat === 0 ? 0.04 : 0.02, 7000, 5000, 1.5, d, 'highpass');
      // the bass: a gallop (DUM da-da) on the root and the fifth, or driving eighths
      if (sec.bass === 'gallop' && beat !== 1) {
        const f = hz(c.root + (beat === 0 ? 0 : 7));
        tone('sawtooth', f, f, st * 0.85, beat === 0 ? 0.15 : 0.09, d, 700);
      } else if (sec.bass === 'drive' && b % 2 === 0) {
        const f = hz(c.root + (b % 8 === 6 ? 12 : 0));
        tone('sawtooth', f, f, st * 1.5, 0.14, d, 650);
      } else if (sec.bass === 'pedal' && b % 8 === 0) {
        const f = hz(c.root);
        tone('sawtooth', f, f, st * 7, 0.12, d, 500);
      }
      // the guitar: stabs on the off-beat, or a shimmering tremolo
      if (sec.gtr === 'stab' && beat === 2)
        for (const m of c.pad) tone('triangle', hz(m), hz(m), st * 0.7, 0.026, d, 2600);
      if (sec.gtr === 'trem' && b % 2 === 0)
        for (const m of c.pad.slice(0, 2)) tone('sawtooth', hz(m), hz(m), st * 0.8, 0.012, d, 2200);
      // a choir and bells
      if (sec.choir && b === 0)
        for (const m of [c.pad[0], c.pad[2] + 12])
          tone('triangle', hz(m), hz(m) * 1.004, st * 15, 0.026, d, 1200);
      if (sec.bell && b === 0 && (bar % 2 === 0 || sec.bell === 2)) {
        const m = c.pad[0] + 12;
        tone('sine', hz(m), hz(m), 2.2, 0.08, d);
        tone('sine', hz(m) * 2.76, hz(m) * 2.76, 1.2, 0.025, d);
      }
      // melodies
      for (const [part, voice] of [
        ['whistle', 'whistle'],
        ['horn', 'horn'],
      ]) {
        const mel = sec[part] && this[sec[part]];
        if (!mel) continue;
        const m = mel[s];
        if (!m) continue;
        let len = 1;
        while (len < 8 && !mel[s + len] && s + len < 64) len++;
        const up = (sec.up || 0) * 12,
          f = hz(m + up),
          dur = st * len * 0.95;
        if (voice === 'whistle') {
          // a whistled tune: a pure tone with a little vibrato (two voices beating slowly)
          tone('sine', f, f, dur, 0.05, d, 0);
          tone('sine', f * 1.006, f * 1.003, dur, 0.025, d, 0);
        } else {
          // a trumpet doubled an octave down
          tone('square', f, f * 0.996, dur, 0.036, d, 2400);
          tone('sawtooth', f / 2, f / 2, dur, 0.026, d, 1300);
        }
      }
      // a whip crack at the end of the section
      if (sec.whip && s === 62) {
        noise(0.09, 0.5, 6000, 900, 3, d);
        noise(0.05, 0.3, 3000, 8000, 2, d + 0.03);
      }
    },
  };
}
const AM = {
  Am: { root: 33, pad: [57, 60, 64] },
  G: { root: 31, pad: [55, 59, 62] },
  F: { root: 29, pad: [53, 57, 60] },
  E: { root: 28, pad: [52, 56, 59] },
  Dm: { root: 38, pad: [50, 53, 57] },
  C: { root: 36, pad: [55, 60, 64] },
};
const DM = {
  Dm: { root: 38, pad: [62, 65, 69] },
  Bb: { root: 34, pad: [58, 62, 65] },
  C: { root: 36, pad: [60, 64, 67] },
  A: { root: 33, pad: [57, 61, 64] },
  Gm: { root: 31, pad: [55, 58, 62] },
  F: { root: 41, pad: [57, 60, 65] },
};
// "Old Quarry": a ride through the town and down the mine, in A minor at 136 BPM, on the
// Andalusian cadence (Am G F E) of the spaghetti westerns.
THEMES.frontier = westernBand({
  bpm: 136,
  chords: AM,
  // the whistled tune (four bars) and the trumpet's answer
  tune: [
    76, 0, 0, 0, 81, 0, 0, 0, 83, 0, 84, 0, 83, 0, 81, 0, 79, 0, 0, 0, 0, 0, 76, 0, 74, 0, 76, 0,
    79, 0, 0, 0, 77, 0, 0, 0, 76, 0, 74, 0, 72, 0, 0, 0, 74, 0, 72, 0, 71, 0, 0, 0, 0, 0, 0, 0, 68,
    0, 71, 0, 76, 0, 0, 0,
  ],
  call: [
    69, 0, 0, 72, 0, 0, 76, 0, 0, 0, 74, 0, 72, 0, 71, 0, 71, 0, 0, 74, 0, 0, 79, 0, 0, 0, 77, 0,
    76, 0, 74, 0, 72, 0, 0, 77, 0, 0, 81, 0, 0, 0, 79, 0, 77, 0, 76, 0, 76, 0, 0, 0, 0, 0, 75, 0,
    76, 0, 0, 0, 0, 0, 0, 0,
  ],
  sections: {
    intro: { ch: ['Am', 'G', 'F', 'E'], drums: 'shaker', bass: 'pedal', whistle: 'tune', bell: 1 },
    ride: { ch: ['Am', 'Am', 'G', 'E'], drums: 'full', bass: 'gallop', gtr: 'stab' },
    A: { ch: ['Am', 'G', 'F', 'E'], drums: 'full', bass: 'gallop', gtr: 'stab', whistle: 'tune' },
    B: { ch: ['Am', 'G', 'F', 'E'], drums: 'full', bass: 'gallop', gtr: 'trem', horn: 'call' },
    A2: {
      ch: ['Am', 'G', 'F', 'E'],
      drums: 'full',
      bass: 'gallop',
      gtr: 'stab',
      whistle: 'tune',
      up: 1,
    },
    bridge: { ch: ['Dm', 'Am', 'Dm', 'E'], drums: 'half', bass: 'pedal', choir: 1, bell: 2 },
    B2: {
      ch: ['Am', 'G', 'F', 'E'],
      drums: 'full',
      bass: 'gallop',
      gtr: 'trem',
      horn: 'call',
      choir: 1,
    },
    turn: { ch: ['Am', 'C', 'G', 'E'], drums: 'fill', bass: 'gallop', gtr: 'stab', whip: 1 },
  },
  form: ['intro', 'ride', 'A', 'B', 'ride', 'A2', 'bridge', 'B2', 'turn'],
});
// "Showdown in the Deep": the slime's hall and the last fight, in D minor at 156 BPM. A
// trumpet fanfare over a pedal, driving eighths, tremolo guitars, bells and a choir.
THEMES.showdown = westernBand({
  bpm: 156,
  chords: DM,
  fanfare: [
    69, 0, 0, 0, 74, 0, 0, 0, 72, 0, 74, 0, 77, 0, 0, 0, 76, 0, 0, 0, 74, 0, 72, 0, 70, 0, 0, 0, 69,
    0, 0, 0, 67, 0, 0, 0, 72, 0, 0, 0, 70, 0, 69, 0, 67, 0, 65, 0, 64, 0, 0, 0, 0, 0, 0, 0, 69, 0,
    0, 0, 0, 0, 0, 0,
  ],
  riff: [
    62, 0, 62, 65, 0, 62, 69, 0, 67, 0, 65, 0, 64, 0, 0, 0, 58, 0, 58, 62, 0, 58, 65, 0, 64, 0, 62,
    0, 60, 0, 0, 0, 60, 0, 60, 64, 0, 60, 67, 0, 65, 0, 64, 0, 62, 0, 0, 0, 61, 0, 64, 0, 69, 0, 67,
    0, 64, 0, 61, 0, 57, 0, 0, 0,
  ],
  sections: {
    call: { ch: ['Dm', 'Dm', 'Bb', 'A'], drums: 'half', bass: 'pedal', horn: 'fanfare', bell: 1 },
    drive: { ch: ['Dm', 'Bb', 'C', 'A'], drums: 'drive', bass: 'drive', gtr: 'trem' },
    A: { ch: ['Dm', 'Bb', 'C', 'A'], drums: 'drive', bass: 'drive', gtr: 'stab', horn: 'riff' },
    B: {
      ch: ['Dm', 'Dm', 'Bb', 'A'],
      drums: 'drive',
      bass: 'drive',
      gtr: 'trem',
      horn: 'fanfare',
      choir: 1,
    },
    brk: { ch: ['Gm', 'Dm', 'Bb', 'A'], drums: 'half', bass: 'pedal', choir: 1, bell: 2 },
    A2: {
      ch: ['Dm', 'Bb', 'C', 'A'],
      drums: 'drive',
      bass: 'drive',
      gtr: 'trem',
      horn: 'riff',
      up: 1,
      whip: 1,
    },
  },
  form: ['call', 'drive', 'A', 'B', 'drive', 'brk', 'A2', 'B'],
});
/** Which theme plays now: the night theme in the fight, the dragon's own theme in its fight
 * (its outro once it falls apart), the old theme on the menu. The western stays in THEMES
 * for later use. */
export function themeFor(state, enemies = G.enemies, wave = G.wave) {
  if (state === 'select') return 'tense';
  if (state === 'play' && G.level === 2)
    // Old Quarry: its ride, and the showdown for the slime and the last fight
    return wave && levelWaves()[G.waveI]?.boss ? 'showdown' : 'frontier';
  if (state === 'play') {
    // the Bone Dragon brings its own music, faster in its second phase
    const d = enemies.find((e) => e.T?.dragon);
    if (d) return d.dead || d.state === 'dying' ? 'dragonEnd' : d.phase2 ? 'dragon2' : 'dragon';
    if (wave?.sp.some((s) => s[0] === 'dragon' && s.done)) return 'dragonEnd'; // just fell apart
    return 'night';
  }
  if (state === 'win') return 'dragonEnd';
  if (state === 'title') return 'graveyard';
  return null;
}
export function music() {
  let n = 0,
    next = AC.currentTime + 0.1,
    playing = null;
  setInterval(() => {
    if (!AC) return;
    const theme = themeFor(G.state),
      song = songTick(theme, G.state === 'pause', G.muted); // a recorded song has the floor
    if (next < AC.currentTime) next = AC.currentTime + 0.05;
    while (next < AC.currentTime + 0.25) {
      const id = G.muted || song ? null : theme;
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
