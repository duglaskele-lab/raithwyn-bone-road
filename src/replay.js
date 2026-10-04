// Every run is recorded, and a recorded run plays back exactly.
//
// The simulation is deterministic: all of its chance comes from one seeded generator
// (random() in util.js) and all it takes from outside is, frame by frame, the time step and
// the buttons. So a run is stored as its seed plus, for every frame in which the world was
// updated, [count, dt, held, pressed, runLatch], where held and pressed are bit masks of
// BUTTONS and identical frames in a row are folded into one with a count.
//
// F7 watches the last run again (or a loaded one), F8 saves it to a file, and a saved file
// dropped on the page plays it. A replay is tied to the version of the game it was made with.
import { G, reset } from './state.js';
import { keys, pressed } from './input.js';
import { seedRandom } from './util.js';
import { startLevel } from './level.js';

export const REPLAY_VERSION = 1;
// The buttons the simulation reads (the rest belong to menus).
export const BUTTONS = [
  'l',
  'r',
  'u',
  'd',
  'run',
  'atk',
  'jump',
  'bone',
  'hado',
  'super',
  'secret',
  'lvlZ',
  'lvl2',
];

let rec = null, // the run being recorded, or the last one
  play = null; // the replay being watched: { run, i, n }

const mask = (o) => BUTTONS.reduce((m, b, i) => (o[b] ? m | (1 << i) : m), 0);
function unmask(m, o) {
  for (const b of BUTTONS) delete o[b];
  BUTTONS.forEach((b, i) => {
    if (m & (1 << i)) o[b] = true;
  });
}

/** Start a fresh run: a new seed, a fresh world (at stage `level`), and a new recording. */
export function newRun(seed = (Math.random() * 2 ** 32) >>> 0, level = 1) {
  play = null;
  seedRandom(seed);
  reset();
  if (level !== 1) startLevel(level);
  G.state = 'play';
  rec = { v: REPLAY_VERSION, seed, level, frames: [] };
}
/** Note this frame's input, just before the world is updated with `dt`. */
export function recordFrame(dt) {
  if (!rec || play) return;
  const f = [1, dt, mask(keys), mask(pressed), G.runLatch ? 1 : 0],
    last = rec.frames[rec.frames.length - 1];
  if (last && last[1] === f[1] && last[2] === f[2] && last[3] === f[3] && last[4] === f[4])
    last[0]++;
  else rec.frames.push(f);
}
export const lastRun = () => (rec && rec.frames.length ? rec : null);
export const replaying = () => play !== null;
/** How far the replay has got, 0..1. */
export function replayProgress() {
  if (!play) return 0;
  const total = play.run.frames.reduce((n, f) => n + f[0], 0);
  return Math.min(1, play.done / total);
}

/** Watch a run: the world starts over from its seed and its inputs are fed back in. */
export function startReplay(run = rec) {
  if (!run) return false;
  play = { run, i: 0, n: 0, done: 0 };
  seedRandom(run.seed);
  reset();
  if (run.level > 1) startLevel(run.level);
  G.state = 'play';
  return true;
}
/**
 * Puts the next recorded frame's buttons into `keys` / `pressed` and returns its time step,
 * or null when the replay is over.
 */
export function replayFrame() {
  const f = play?.run.frames[play.i];
  if (!f) return null;
  unmask(f[2], keys);
  unmask(f[3], pressed);
  G.runLatch = !!f[4];
  play.done++;
  if (++play.n >= f[0]) {
    play.i++;
    play.n = 0;
  }
  return f[1];
}
export function stopReplay() {
  play = null;
  for (const b of BUTTONS) delete keys[b];
}

/** A run as text, for a file. */
export const runToText = (run) => JSON.stringify(run);
/** A run from a file's text; throws if it is not one this version can play. */
export function runFromText(text) {
  const run = JSON.parse(text);
  if (run?.v !== REPLAY_VERSION || !Number.isFinite(run.seed) || !Array.isArray(run.frames))
    throw new Error('not a replay of this version of the game');
  return run;
}
/** Save the last run as a .json file. */
export function saveRun(run = rec) {
  if (!run || typeof document === 'undefined') return false;
  const a = document.createElement('a'),
    d = new Date(),
    p = (n) => String(n).padStart(2, '0');
  a.href = URL.createObjectURL(new Blob([runToText(run)], { type: 'application/json' }));
  a.download = `raithwyn-replay-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}-${p(d.getMinutes())}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}
