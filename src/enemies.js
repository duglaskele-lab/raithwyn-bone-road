// Spawning enemies and running their AI. What each enemy does lives in src/foes (one file per
// type, see foes/registry.js); this file holds what they all share.
import { GAPHOP, GB, GT, H, W, TYPES } from './config.js';
import { clamp, rnd } from './util.js';
import { G, P } from './state.js';
import { SFX } from './audio.js';
import { FOES, STATES } from './foes/index.js';
import { sense } from './foes/kit.js';
import {
  entryPoint,
  floorClamp,
  groundPoint,
  inView,
  level,
  onFloor,
  overPit,
  robotEntry,
} from './level.js';
import { scoreMult } from './style.js';
import { random } from './util.js';

export { inBreath } from './foes/baron.js';
export { bikeReach } from './foes/biker.js';

/**
 * A new enemy of `type`. `side` -1/1: it walks in from that edge of the screen; 0: it climbs
 * out of the ground somewhere on screen. `x`, `y` place it exactly.
 */
export function spawn(type, side, x, y) {
  const T = TYPES[type],
    placed = x !== undefined;
  let entry = null;
  if (!placed && level().robots) {
    // Midnight City: in from a side, out of a door, or down from above
    entry = robotEntry(side, random);
    ({ x, y } = entry);
    if (entry.how !== 'walk') side = x > P.x ? 1 : -1;
  } else if (!placed && level().floor) {
    // Old Quarry: from off the screen where the floor goes on, else out of the ground
    const F = FOES[type];
    // some never climb out of the ground: they always walk in from a side
    if (side === 0 && F.walksIn) side = random() < 0.5 ? -1 : 1;
    const at = side !== 0 && entryPoint(side, random);
    if (!at && F.walksIn) {
      x = side > 0 ? G.cam + W + 60 : G.cam - 60;
      y = G.camY + 300 + random() * 200;
    } else {
      if (!at) side = 0;
      [x, y] = at || groundPoint(random);
    }
  } else if (!placed) {
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
    mounted: false,
    rdir: 1,
    slammed: false,
    vyd: 0,
    rev: 0,
  };
  const F = FOES[type];
  if (entry?.how === 'door') Object.assign(e, { state: 'door', door: entry.door });
  else if (entry?.how === 'drop')
    Object.assign(e, { state: 'drop', z: e.y - G.camY + 120, vz: -200 });
  // its own countdowns start somewhere in a range
  for (const [k, [a, b]] of Object.entries(F.init ?? {})) e[k] = rnd(a, b);
  F.spawn?.(e, side, placed);
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
  if (e.heavyT > 0) e.heavyT -= dt; // the window for a medium enemy's second heavy blow
  // how long it has been on screen without a break
  e.shown = inView(e.x, e.y) ? (e.shown ?? 0) + dt : 0;
  e.moving = false;
  STATES[e.state]?.tick(e, dt, sense(e), ctxE);
  F.tick?.(e, dt);
  if (level().pits && e.state === 'chase') gapHop(e);
  if (e.state === 'pitfall');
  else if (level().pits && !e.T.bigBoss) {
    // Midnight City's roofs: thrown over a gap it may land in it, and is gone
    const air = e.z > 0,
      landed = e.wasAir && !air;
    e.wasAir = air;
    if (landed && overPit(e.x, e.y)) pitfall(e);
    else floorClamp(e, 2, 0, air);
  } else floorClamp(e, 2, 0);
  // flying, staggering or rushing about, an enemy stays on screen
  if (STATES[e.state]?.pin) {
    e.x = clamp(e.x, G.cam + 24, G.cam + W - 24);
    if (level().floor) e.y = clamp(e.y, G.camY + 200, G.camY + H - 6);
  }
}
/** Into a gap between the roofs: it falls out of the fight, and counts as beaten. */
export function pitfall(e) {
  if (!e.dying) P.score += Math.round(e.T.score * scoreMult());
  Object.assign(e, { state: 'pitfall', t: 0, dying: true, engage: false, vx: 0 });
  e.vz = Math.min(e.vz, 0);
  SFX.fall();
}
/** At the edge of a roof, the player across the gap: a robot that walks leaps over it (if the
 *  far side is a roof). Flyers and shooters keep their side; bosses stay in their arena. */
function gapHop(e) {
  if (e.z > 0 || e.T.flyer || e.T.keep || e.T.bigBoss || P.state === 'plunge') return;
  const dir = P.x >= e.x ? 1 : -1,
    reach = (GAPHOP.vx * 2 * GAPHOP.vz) / GAPHOP.g;
  if (
    Math.abs(P.x - e.x) > 80 &&
    overPit(e.x + dir * 40, e.y) &&
    onFloor(e.x + dir * reach * 0.9, e.y)
  ) {
    Object.assign(e, { state: 'gaphop', t: 0, face: dir, vx: dir * GAPHOP.vx, vz: GAPHOP.vz });
    e.engage = false;
  }
}
