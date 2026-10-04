// Spawning enemies and running their AI. What each enemy does lives in src/foes (one file per
// type, see foes/registry.js); this file holds what they all share.
import { GB, GT, W, TYPES } from './config.js';
import { clamp, rnd } from './util.js';
import { G, P } from './state.js';
import { SFX } from './audio.js';
import { FOES, STATES } from './foes/index.js';
import { sense } from './foes/kit.js';

export { inBreath } from './foes/baron.js';
export { bikeReach } from './foes/biker.js';

/**
 * A new enemy of `type`. `side` -1/1: it walks in from that edge of the screen; 0: it climbs
 * out of the ground somewhere on screen. `x`, `y` place it exactly.
 */
export function spawn(type, side, x, y) {
  const T = TYPES[type],
    placed = x !== undefined;
  if (!placed) {
    if (side === 0) {
      let n = 0;
      do {
        x = G.cam + rnd(170, W - 170);
      } while (Math.abs(x - P.x) < 130 && n++ < 20);
    } else x = side > 0 ? G.cam + W + 60 : G.cam - 60;
    y = rnd(GT + 14, GB - 12);
  }
  const e = {
    type,
    T,
    x,
    y,
    z: 0,
    vx: 0,
    vz: 0,
    face: x > P.x ? -1 : 1,
    hp: T.hp,
    state: side === 0 ? 'rise' : 'chase',
    t: 0,
    anim: rnd(10),
    seed: rnd(6),
    cd: rnd(0.2, 1.1),
    flash: 0,
    walkT: rnd(6),
    oy: rnd(-60, 60),
    ox: rnd(90, 180),
    oyT: rnd(1, 2),
    engage: false,
    w: (T.fat ? 24 : 16) * T.scale,
    moving: false,
    next: 0.66,
    hitDone: false,
    breaks: 0,
    armor: 0,
    slamCd: rnd(1.5, 3),
    chCd: rnd(2, 4),
    mounted: false,
    rdir: 1,
    slammed: false,
    vyd: 0,
    rev: 0,
  };
  FOES[type].spawn?.(e, side, placed);
  if (e.state === 'rise') SFX.rise();
  G.enemies.push(e);
  return e;
}

export function updEnemy(e, dt, ctxE) {
  const F = FOES[e.type];
  if (F.update) return F.update(e, dt, ctxE);
  e.t += dt;
  e.anim += dt;
  e.flash -= dt;
  e.cd -= dt;
  e.armor -= dt;
  for (const k of F.timers ?? []) e[k] = (e[k] ?? 0) - dt;
  e.moving = false;
  STATES[e.state]?.tick(e, dt, sense(e), ctxE);
  e.y = clamp(e.y, GT + 2, GB);
  // flying, staggering or rushing about, an enemy stays on screen
  if (STATES[e.state]?.pin) e.x = clamp(e.x, G.cam + 24, G.cam + W - 24);
}
