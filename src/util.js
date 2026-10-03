// Small pure helpers: random, clamp, interpolation, seeded RNG, animation timelines.
export const rnd = (a = 1, b) =>
  b === undefined ? Math.random() * a : a + Math.random() * (b - a);
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
