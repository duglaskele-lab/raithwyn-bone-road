// Frostfang Pass's hazard on the climb (BOULDER): while a fight is on the trail up the
// mountainside, boulders come rolling down it now and then. A shadow at the top of the screen
// shows the lane first; then down it rolls, hitting the heroine and her foes alike (a foe it
// hits is knocked flying) — jump it or step aside.
import { BOULDER, OL, TAU } from './config.js';
import { clamp, fxRandom, fxRnd, rnd } from './util.js';
import { G, P } from './state.js';
import { ctx } from './gfx.js';
import { SFX } from './audio.js';
import { dust } from './fx.js';
import { hitPlayer, hurtEnemy } from './combat.js';
import { L4 } from './level4.js';
import { pathPx } from './level.js';

/** Is the fight on the climb (the camera looking up the trail)? */
const onClimb = () => G.level === 4 && G.wave && G.camS > pathPx(3) + 1 && G.camS < pathPx(4) - 1;
/** Every frame on Frostfang Pass: now and then a boulder sets off down the trail. */
export function updHazards4(dt) {
  if (!onClimb()) {
    G.rockT = rnd(1.5, 3);
    return;
  }
  if ((G.rockT -= dt) > 0) return;
  G.rockT = rnd(...BOULDER.gap);
  // a lane across the trail, more often near her
  const x = clamp(P.x + rnd(-160, 160), L4.CLIMB[0] + 50, L4.CLIMB[1] - 50);
  G.projs.push({
    k: 'boulder',
    x,
    y: G.camY + 150,
    z: 0,
    vx: 0,
    vy: 0,
    t: 0,
    rot: 0,
    life: 9,
    hits: new Set(),
  });
}
/** A boulder's frame: waiting at the top (its shadow showing), then rolling down. */
export function boulderRoll(q, dt) {
  q.t += dt;
  if (q.t < BOULDER.warn) return;
  if (!q.rolling) {
    q.rolling = true;
    SFX.thud();
  }
  q.y += BOULDER.speed * dt;
  q.rot += (BOULDER.speed / BOULDER.r) * dt;
  q.z = Math.abs(Math.sin(q.t * 9)) * 8;
  if (fxRandom() < 0.4) dust(q.x + fxRnd(-20, 20), q.y - 6, 1);
  if (q.y > G.camY + 600) {
    q.life = 0;
    return;
  }
  const r = BOULDER.r;
  if (!q.hits.has(P) && Math.abs(P.x - q.x) < r + 10 && Math.abs(P.y - q.y) < 22 && P.z < 50) {
    q.hits.add(P);
    hitPlayer(BOULDER.dmgP, P.x >= q.x ? 1 : -1, true);
  }
  for (const e of G.enemies) {
    if (e.dead || e.dying || q.hits.has(e) || e.neutral) continue;
    if (Math.abs(e.x - q.x) < r + e.w && Math.abs(e.y - q.y) < 22 && e.z < 50) {
      q.hits.add(e);
      hurtEnemy(e, BOULDER.dmgE, e.x >= q.x ? 1 : -1, true, 'blast2');
    }
  }
  for (const u of G.props)
    if (!u.dead && !q.hits.has(u) && Math.abs(u.x - q.x) < r + u.w && Math.abs(u.y - q.y) < 20) {
      q.hits.add(u);
      hurtEnemy(u, 1, 1, true, 'blast');
    }
}
/** The boulder: its shadow at the top while it waits, then a round grey stone rolling. */
export function drawBoulder(q) {
  const x = q.x - G.cam,
    r = BOULDER.r;
  if (q.t < BOULDER.warn) {
    // the warning: a shaking shadow and the lane it will take
    const u = q.t / BOULDER.warn;
    ctx.save();
    ctx.fillStyle = `rgba(255,80,60,${0.12 + 0.16 * u})`;
    ctx.fillRect(x - r, q.y, r * 2, 520);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(x + (q.t < BOULDER.warn ? Math.sin(q.t * 50) * 2 : 0), q.y - q.z - r);
  ctx.rotate(q.rot);
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU,
      k = 0.86 + ((i * 37) % 10) / 70;
    ctx.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k);
  }
  ctx.closePath();
  ctx.fillStyle = '#8a8478';
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.2);
  ctx.lineTo(r * 0.1, r * 0.1);
  ctx.lineTo(r * 0.4, -r * 0.4);
  ctx.stroke();
  ctx.restore();
}
