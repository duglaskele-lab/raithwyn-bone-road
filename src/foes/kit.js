// The toolkit every enemy is built from: sensing the player, turning, moving, switching
// state, melee hit boxes and lobbed projectiles.
import { GB, GT, H, W } from '../config.js';
import { clamp } from '../util.js';
import { G, P } from '../state.js';
import { level } from '../level.js';

/** The player is on the ground or out of the fight: nobody should start an attack. */
export const playerDown = () => ['ko', 'down', 'getup', 'dead', 'win'].includes(P.state);
/** What an enemy sees of the player at the start of its frame. */
export function sense(e) {
  const dx = P.x - e.x,
    dy = P.y - e.y;
  return { dx, dy, adx: Math.abs(dx), ady: Math.abs(dy), pdown: playerDown() };
}
/** Switch to a state; its clock starts at `t` (negative = a pause before it counts). */
export function go(e, state, t = 0, extra) {
  e.state = state;
  e.t = t;
  if (extra) Object.assign(e, extra);
}
export const faceP = (e) => (e.face = P.x - e.x >= 0 ? 1 : -1);
/** The player's distance in front of the enemy (negative = behind it). */
export const ahead = (e) => (P.x - e.x) * e.face;
/** Walk towards a point on the road (kept on screen), at `sp` pixels a second. */
export function moveTo(e, tx, ty, sp, dt) {
  tx = clamp(tx, G.cam + 40, G.cam + W - 40);
  ty = level().floor ? clamp(ty, G.camY + 220, G.camY + H - 8) : clamp(ty, GT + 4, GB - 2);
  const a = tx - e.x,
    b = ty - e.y,
    d = Math.hypot(a, b);
  if (d > 6) {
    e.x += (a / d) * sp * dt;
    e.y += (b / d) * sp * 0.75 * dt;
    e.moving = true;
    e.walkT += (dt * sp * 0.085) / Math.sqrt(e.T.scale);
  }
}
/**
 * Is the player inside a hit box in front of the enemy: from `back` behind it to `reach`
 * in front, `dy` deep either way, below height `z`?
 */
export function inFront(e, back, reach, dy, z) {
  const f = ahead(e);
  return f > -back && f < reach && Math.abs(P.y - e.y) < dy && P.z < z;
}
/**
 * A projectile thrown in an arc: from (x0, z0) at the enemy's depth, landing `dist` pixels in
 * front after `flight` seconds, drifting in depth towards the player by at most `maxDy`.
 */
export function lob(e, k, x0, z0, flight, g, dist, maxDy, extra) {
  G.projs.push({
    k,
    x: x0,
    y: e.y,
    z: z0,
    vx: (e.face * dist) / flight,
    vy: clamp(P.y - e.y, -maxDy, maxDy) / flight,
    vz: (g * flight) / 2 - z0 / flight,
    rot: 0,
    ...extra,
  });
}
