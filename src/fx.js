// Particles, floating text and the bone debris a skeleton leaves behind.
import { PURPLE, TAU } from './config.js';
import { rnd } from './util.js';
import { G } from './state.js';
import { SFX } from './audio.js';

export function spark(x, y, col, big) {
  G.parts.push({
    k: 'star',
    x,
    y,
    t: 0,
    life: big ? 0.22 : 0.16,
    s: big ? 46 : 28,
    col,
    rot: rnd(TAU),
  });
  for (let i = 0; i < (big ? 9 : 5); i++) {
    const a = rnd(TAU),
      v = rnd(120, big ? 420 : 280);
    G.parts.push({
      k: 'dot',
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 40,
      g: 500,
      t: 0,
      life: rnd(0.2, 0.4),
      s: rnd(2, 4),
      col,
    });
  }
}
export function dust(x, y, n = 6) {
  for (let i = 0; i < n; i++)
    G.parts.push({
      k: 'dust',
      x: x + rnd(-18, 18),
      y: y + rnd(-3, 3),
      vx: rnd(-60, 60),
      vy: rnd(-50, -10),
      g: 40,
      t: 0,
      life: rnd(0.3, 0.6),
      s: rnd(5, 11),
      col: '#cfe0d2',
    });
}
export function motes(x, y, n, v = 120) {
  for (let i = 0; i < n; i++) {
    const a = rnd(TAU),
      s = rnd(20, v);
    G.parts.push({
      k: 'glow',
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      g: -60,
      t: 0,
      life: rnd(0.25, 0.6),
      s: rnd(2, 5),
      col: PURPLE,
    });
  }
}
export function floatTxt(x, y, txt, col) {
  G.floats.push({ x, y, txt, col, t: 0 });
}
export function shatter(e, dir) {
  const s = e.T.scale,
    n = e.type === 'boss' ? 26 : 13;
  for (let i = 0; i < n; i++)
    G.debris.push({
      k: 'bone',
      x: e.x + rnd(-12, 12),
      gy: e.y + rnd(-8, 8),
      z: e.z + rnd(20, 150) * s,
      vx: dir * rnd(60, 340) + rnd(-90, 90),
      vz: rnd(160, 500),
      rot: rnd(TAU),
      vr: rnd(-15, 15),
      len: rnd(12, 26) * s,
      col: e.T.col,
      life: rnd(2.6, 3.8),
    });
  G.debris.push({
    k: 'skull',
    x: e.x,
    gy: e.y + 2,
    z: e.z + 150 * s,
    vx: dir * rnd(160, 300),
    vz: rnd(300, 460),
    rot: 0,
    vr: dir * rnd(8, 14),
    len: 12 * s,
    col: e.T.col,
    eye: e.T.eye,
    life: 4,
  });
  SFX.shatter();
}
