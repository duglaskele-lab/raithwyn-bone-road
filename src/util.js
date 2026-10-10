// Small helpers: the game's chance, clamp, interpolation, animation timelines.

// All the chance in the simulation comes from one seeded generator, so that a run can be
// played again exactly from its seed and its inputs (see replay.js). The look of things has a
// generator of its own (fxRandom): particles, bone debris, sparks, smoke, how many of them and
// where they fly. Nothing in the game ever reads them, so they may differ (a light picture makes
// fewer) without the game's chance moving at all. Screen shake and synth noise use Math.random.
let gen = mulberry(1),
  fxGen = mulberry(2);
/** A number in [0, 1) from the game's generator. */
export const random = () => gen();
/** A number in [0, 1) for the look of things only (never for what happens in the game). */
export const fxRandom = () => fxGen();
/** Restart the game's generator from a seed (a whole number), and the looks' one with it. */
export function seedRandom(seed) {
  gen = mulberry(seed);
  fxGen = mulberry(seed ^ 0x5bd1e995);
}
/** Replace the generator: tests use it to force an outcome. Returns the previous one. */
export function setRandom(fn) {
  const was = gen;
  gen = fn;
  return was;
}
/** rnd(a): [0, a); rnd(a, b): [a, b), from the game's generator. */
export const rnd = (a = 1, b) => (b === undefined ? random() * a : a + random() * (b - a));
/** fxRnd(a), fxRnd(a, b): the same, for the look of things (fxRandom). */
export const fxRnd = (a = 1, b) => (b === undefined ? fxRandom() * a : a + fxRandom() * (b - a));
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => t * t * (3 - 2 * t);
export function mulberry(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function tl(d, t) {
  for (let i = 0; i < d.length; i++) {
    if (t < d[i]) return i;
    t -= d[i];
  }
  return -1;
}
