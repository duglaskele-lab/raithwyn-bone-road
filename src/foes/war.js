// The war in the Wastelands (stage 4): the Children of the Crater (mutants, TYPES side 'mut')
// and the Rust Legion (robots, side 'bot') fight each other as well as the heroine (WAR).
//
// A fighter of either side looks round now and then for whom to fight: her, or the nearest
// rival of the other side; whoever hit it last it goes after for a while. Its blows land on
// whoever is in front of it — her, or any rival there (never its own side). A foe finished
// by a rival is worth half its score, unless she had a hand in it ("SET ON!", a bonus).
// Over a fighter busy with a rival hang two crossed blades in its side's colour.
//
// A robot that falls lies as a wreck a while: a welder can raise it, a scavenger strip it.
import { OL, WAR } from '../config.js';
import { rnd } from '../util.js';
import { G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { hurtEnemy, hitPlayer } from '../combat.js';
import { floatTxt } from '../fx.js';
import { scoreMult, styleGain } from '../style.js';
import { t } from '../i18n.js';
import { go, inFront, moveTo, playerDown } from './kit.js';
import { meetsPlayer } from '../height.js';
import { SFX } from '../audio.js';
import { levelWaves } from '../level.js';

export const MUT = '#9dff5a',
  BOT = '#ffb02e';
/** The colour of a side. */
export const sideCol = (side) => (side === 'mut' ? MUT : BOT);

/** Can this foe be fought right now (in the fight, standing, not a wreck)? */
const fightable = (o) =>
  o &&
  !o.dead &&
  !o.dying &&
  G.enemies.includes(o) &&
  !(o.state === 'rise' && o.t < 0.45) &&
  o.state !== 'wkLie';
/** The foes of the other side than `e`'s, in the fight. */
export const rivals = (e) =>
  G.enemies.filter((o) => o !== e && o.T.side && o.T.side !== e.T.side && fightable(o));
/** How far apart two fighters are (a step in depth counts double: lanes matter). */
const gap = (a, b) => Math.hypot(b.x - a.x, (b.y - a.y) * 2);
/** Is `o` (her or a foe) still worth going after? */
const worth = (o) => (o === P ? !playerDown() : fightable(o));

/**
 * Whom `e` fights now: her (P) or a rival. Kept a while once chosen (WAR.look), except when it
 * falls; whoever hit it last comes first (WAR.grudge). An unaware fighter (the first fight's)
 * does not see her until she comes close or hits it.
 */
export function pickTarget(e, dt) {
  e.lookT = (e.lookT ?? 0) - dt;
  e.grudgeT = (e.grudgeT ?? 0) - dt;
  if (e.unaware && Math.abs(P.x - e.x) < WAR.wake && Math.abs(P.y - e.y) < 40) wake(e);
  if (e.grudgeT > 0 && worth(e.grudge)) return (e.tgt = e.grudge);
  if (e.lookT > 0 && worth(e.tgt)) return e.tgt;
  e.lookT = WAR.look * rnd(0.8, 1.2);
  let best = e.unaware || playerDown() ? null : P,
    bd = best ? gap(e, P) - WAR.pBias : Infinity;
  for (const o of rivals(e)) {
    const d = gap(e, o);
    if (d < bd && (d < WAR.near || e.unaware)) {
      best = o;
      bd = d;
    }
  }
  if (!best) e.unaware = false; // nobody else left to fight: now it sees her
  return (e.tgt = best ?? P);
}
/** A fighter comes into the fight: in a fight marked `war` (the first of the stage) the two
 *  sides are at each other already and do not see her until she comes close or hits one. */
export function warSpawn(e) {
  if (levelWaves()[G.waveI]?.war) e.unaware = true;
}
/** She is noticed: from now on it fights her too. */
export function wake(e) {
  e.unaware = false;
}
/** A blow of hers on a fighter (a foe's onHit): it is hers now, and it turns on her. */
export function struckByHer(e, src) {
  if (src === 'rival') return;
  e.pHitT = G.time;
  e.grudge = P;
  e.grudgeT = WAR.grudge;
  e.lookT = 0;
  wake(e);
}

/**
 * A blow of `by` lands on the rival `o`: `dmg` (WAR.rivalK of it), thrown if `knock`. The
 * world does not freeze or shake for it, nor does the health bar turn to it. Score as WAR says.
 */
export function rivalHit(by, o, dmg, knock, dir = by.face) {
  const keep = [G.freeze, G.shake, G.lastFoe, G.lastFoeT],
    score = P.score;
  const ok = hurtEnemy(o, dmg * WAR.rivalK, dir, knock, 'rival');
  [G.freeze, G.shake, G.lastFoe, G.lastFoeT] = keep;
  if (!ok) return false;
  if (o.dying || o.dead) credit(o, score);
  else if (o.T.side) {
    o.grudge = by;
    o.grudgeT = WAR.grudge;
  }
  return true;
}
/** `o` has just fallen to a rival: half its score, or all of it and a bonus if she helped. */
function credit(o, before) {
  const got = P.score - before;
  if (G.time - (o.pHitT ?? -99) < WAR.credit) {
    P.score += Math.round(WAR.bonus * scoreMult());
    floatTxt(o.x, o.y - 160 * o.T.scale, t('setOn'), '#ffd23a');
    styleGain(10);
    SFX.rank();
  } else P.score = before + Math.round(got * WAR.half);
}

/**
 * A blow of `e` in front of it (`back` behind it to `reach` in front, `dy` deep, below `z`):
 * it lands on her if she is there and on every rival there. `onP(dir)` instead of the usual
 * hitPlayer (a zap that stuns). Returns how many it struck.
 */
export function swing(e, back, reach, dy, z, dmg, knock, onP) {
  let n = 0;
  if (inFront(e, back, reach, dy, z) && meetsPlayer(0, z)) {
    if (onP ? onP(e.face) : hitPlayer(dmg, e.face, knock)) n++;
    wake(e);
  }
  for (const o of rivals(e)) {
    const f = (o.x - e.x) * e.face;
    if (f > -back && f < reach && Math.abs(o.y - e.y) < dy && o.z < z && rivalHit(e, o, dmg, knock))
      n++;
  }
  return n;
}
/** Does a thing at (x, y, z), `r` round, strike her or a rival of `side`? Returns whom. */
export function struckAt(x, y, z, r, side) {
  if (Math.abs(P.x - x) < r && Math.abs(P.y - y) < 20 && meetsPlayer(z - r, z + r)) return P;
  for (const o of G.enemies)
    if (
      o.T.side &&
      o.T.side !== side &&
      fightable(o) &&
      Math.abs(o.x - x) < r + o.w &&
      Math.abs(o.y - y) < 22 &&
      z < (o.T.height ?? 150) + o.z
    )
      return o;
  return null;
}

/** Turn to face whom it fights. */
export const faceT = (e, o) => (e.face = o.x - e.x >= 0 ? 1 : -1);

/**
 * A brawler's frame: it picks whom to fight and walks up to them; within `reach`, lined up and
 * ready (its `cd` run out), it starts its blow: `go(e, wind)`. Against her only a couple close in
 * at a time (as everywhere), the others circle; against a rival it just goes in.
 */
export function brawl(e, dt, ctxE, reach, wind) {
  const o = pickTarget(e, dt),
    side = e.x >= o.x ? 1 : -1;
  faceT(e, o);
  if (o === P) {
    if (playerDown()) e.engage = false;
    else if (!e.engage && e.cd <= 0 && ctxE.n < 2) {
      e.engage = true;
      ctxE.n++;
    }
    if (!e.engage) {
      e.oyT -= dt;
      if (e.oyT <= 0) {
        e.oyT = rnd(1, 2.2);
        e.oy = rnd(-75, 75);
        e.ox = rnd(80, 190);
      }
      moveTo(e, P.x + side * (reach + e.ox), P.y + e.oy, e.T.speed * 0.8, dt);
      return;
    }
  } else e.engage = false;
  if (e.cd <= 0 && Math.abs(o.x - e.x) < reach && Math.abs(o.y - e.y) < 16) {
    go(e, wind);
    return;
  }
  moveTo(e, o.x + side * reach * 0.72, o.y, e.T.speed, dt);
}

// --- the wrecks of robots -------------------------------------------------------------------

/** A robot's wreck, lying, not yet stripped or raised (the nearest to `e` within `r`). */
export function nearWreck(e, r, pred = () => true) {
  let best = null,
    bd = r;
  for (const o of G.enemies)
    if (o.state === 'wkLie' && !o.dead && !o.looted && !o.claimed && pred(o)) {
      const d = gap(e, o);
      if (d < bd) {
        best = o;
        bd = d;
      }
    }
  return best;
}
/** A robot dies: thrown back, it falls and lies as a wreck WAR.wreck s. Its score as usual
 *  (half of it once it has been raised by a welder). */
export function wreck(e, dir) {
  P.score += Math.round(e.T.score * (e.raised ? 0.5 : 1) * scoreMult());
  Object.assign(e, {
    dying: true,
    engage: false,
    state: 'wkFall',
    t: 0,
    vx: dir * 170,
    vz: 300,
    hp: 0,
    claimed: null,
  });
  SFX.thud();
  SFX.clack();
}
/** A welder raises a wreck: it gets up with `k` of its health and fights again. */
export function raise(o, k) {
  Object.assign(o, {
    dying: false,
    dead: false,
    hp: Math.round(o.T.hp * k),
    state: 'getup',
    t: 0,
    raised: true,
    claimed: null,
    corrodeT: 0,
    lookT: 0,
  });
}

// --- what is drawn over a fighter ------------------------------------------------------------

/** Two crossed blades over a fighter busy with a rival, in its side's colour. */
export function warMark(e, top) {
  if (!e.tgt || e.tgt === P || e.dying || !worth(e.tgt)) return;
  const x = e.x - G.cam,
    y = e.y - e.z - top,
    c = sideCol(e.T.side);
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  for (const [lw, col] of [
    [6, OL],
    [3, c],
  ]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.lineTo(8, -8);
    ctx.moveTo(8, 8);
    ctx.lineTo(-8, -8);
    ctx.stroke();
  }
  ctx.restore();
}
