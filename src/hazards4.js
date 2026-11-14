// Frostfang Pass's hazard (BOULDER): boulders rolling down the steep trail on the mountainside.
// While she is on the trail they come after her from up the slope, one after another; and they
// go on rolling off the foot of it, along the ledge, through the fight that waits there (the
// rockslide). A red lane on the ground shows where the next one will roll; then it comes,
// hitting the heroine and her foes alike (a foe it hits is knocked flying) — step out of its
// lane or jump it.
import { BOULDER, OL, TAU, W } from './config.js';
import { clamp, fxRandom, fxRnd, rnd } from './util.js';
import { G, P } from './state.js';
import { ctx } from './gfx.js';
import { SFX } from './audio.js';
import { dust } from './fx.js';
import { hitPlayer, hurtEnemy } from './combat.js';
import { DEPTH, L4, WAVES4, topY } from './level4.js';

/** Is she on the steep trail with no fight on (boulders come one after another)? */
const onSlope = () => !G.wave && P.x > L4.SLOPE[0] - 40 && P.x < L4.SLOPE[1] + 120;
/** Is the fight at the foot of the trail on? */
const rockslide = () => !!G.wave && WAVES4[G.waveI]?.name === 'rockslide';
/** Every frame on Frostfang Pass: now and then a boulder sets off down the trail. */
export function updHazards4(dt) {
  const slope = G.level === 4 && onSlope();
  if (!slope && !(G.level === 4 && rockslide())) {
    G.rockT = 0.5;
    return;
  }
  if ((G.rockT -= dt) > 0) return;
  G.rockT = rnd(...(slope ? BOULDER.slope : BOULDER.gap));
  // a lane along the road, more often hers
  const d = clamp(P.y - topY(P.x) + rnd(-55, 55), 22, DEPTH - 22),
    x = G.cam + 4;
  G.projs.push({
    k: 'boulder',
    x,
    d,
    y: topY(x) + d,
    z: 0,
    vx: 0,
    t: 0,
    rot: 0,
    life: 9,
    hits: new Set(),
  });
}
/** A boulder's frame: its lane showing for a moment, then rolling down the road. */
export function boulderRoll(q, dt) {
  q.t += dt;
  if (q.t < BOULDER.warn) {
    // (only its lane shows yet, from the screen's edge, wherever the screen has got to)
    q.x = G.cam + 4;
    q.y = topY(q.x) + q.d;
    return;
  }
  if (!q.rolling) {
    // in it comes, from just off the screen
    q.rolling = true;
    q.x = G.cam - 60;
    SFX.thud();
  }
  q.x += BOULDER.speed * dt;
  q.y = topY(q.x) + q.d;
  q.rot += (BOULDER.speed / BOULDER.r) * dt;
  q.z = Math.abs(Math.sin(q.t * 9)) * 8;
  if (fxRandom() < 0.4) dust(q.x - fxRnd(0, 24), q.y - 4, 1);
  // off the screen, or over the edge into the gorge: gone
  if (q.x > G.cam + W + 90 || q.x > L4.FALLS[0] + 10) {
    if (q.x <= G.cam + W) dust(q.x, q.y, 8);
    q.life = 0;
    return;
  }
  const r = BOULDER.r;
  if (!q.hits.has(P) && Math.abs(P.x - q.x) < r + 10 && Math.abs(P.y - q.y) < 22 && P.z < 50) {
    q.hits.add(P);
    hitPlayer(BOULDER.dmgP, 1, true);
  }
  for (const e of G.enemies) {
    if (e.dead || e.dying || q.hits.has(e) || e.neutral) continue;
    if (Math.abs(e.x - q.x) < r + e.w && Math.abs(e.y - q.y) < 22 && e.z < 50) {
      q.hits.add(e);
      hurtEnemy(e, BOULDER.dmgE, 1, true, 'blast2');
    }
  }
  for (const u of G.props)
    if (!u.dead && !q.hits.has(u) && Math.abs(u.x - q.x) < r + u.w && Math.abs(u.y - q.y) < 20) {
      q.hits.add(u);
      hurtEnemy(u, 1, 1, true, 'blast');
    }
}
/** The boulder: the lane it will take while it waits, then a round grey stone rolling. */
export function drawBoulder(q) {
  const x = q.x - G.cam,
    r = BOULDER.r;
  if (q.t < BOULDER.warn) {
    // the warning: its lane along the road, across the screen, and a mark at the edge it
    // will come from
    const u = q.t / BOULDER.warn;
    ctx.save();
    ctx.fillStyle = `rgba(255,80,60,${0.14 + 0.2 * u})`;
    ctx.beginPath();
    for (let sx = 0; sx <= W; sx += 40) ctx.lineTo(sx, topY(G.cam + sx) + q.d - 20);
    for (let sx = W; sx >= 0; sx -= 40) ctx.lineTo(sx, topY(G.cam + sx) + q.d + 8);
    ctx.closePath();
    ctx.fill();
    if (Math.floor(G.time * 8) % 2) {
      const y = topY(G.cam) + q.d;
      ctx.fillStyle = '#ff5040';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, y - 30);
      ctx.lineTo(34, y - 12);
      ctx.lineTo(8, y + 6);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(x, q.y - q.z - r);
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
