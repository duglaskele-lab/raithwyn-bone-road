// Damage rules: who can be hit, what a hit does, rage, the boss interrupt immunity.
import {
  BLAST,
  DECOR,
  JUGGLE,
  LUCK,
  LUCY,
  MAXR,
  RAGE,
  RL,
  SUPER_DMG,
  TAU,
  W,
  WEIGHT,
  ZOMBIE,
} from './config.js';
import { fxRnd, random, rnd } from './util.js';
import { APP, G, P } from './state.js';
import { SFX } from './audio.js';
import { motes, shatter, spark } from './fx.js';
import { spawn } from './enemies.js';
import { explode } from './blast.js';
import { buzz } from './touch.js';
import { DRAGON, dragonZone, headPoint } from './dragon.js';
import { FOES } from './foes/index.js';
import { dmgMult, scoreMult, styleBreak, styleGain, styleKeep, styleRank } from './style.js';

export function hadoLevel(rage) {
  return rage >= RL[2] ? 3 : rage >= RL[1] ? 2 : rage >= RL[0] ? 1 : 0;
}
export function addRage(n) {
  P.rage = Math.min(MAXR, P.rage + n);
}
/**
 * A hit on an enemy (or a breakable prop): `dir` is the side it is hit towards, `knock` a heavy
 * blow, `src` what hit it, `launch` a launcher that throws a light enemy up instead of away.
 * A crushing blow (a dark ball of level II or III, the super) throws even the medium and the
 * heavy at once (see WEIGHT).
 */
export function hurtEnemy(e, dmg, dir, knock, src, launch = false) {
  // (Lucy's grenade, `blast2`, is a crushing blow too)
  const crush = src === 'super' || src === 'hado2' || src === 'hado3' || src === 'blast2';
  if (crush) src = src === 'super' ? 'super' : src === 'blast2' ? 'blast' : 'hado'; // the foes' own rules see a dark ball (or a blast)
  if (e.isProp) {
    // smashing scenery keeps the style meter from draining between fights
    styleKeep();
    if (DECOR[e.decor]?.boom) {
      // a red barrel: a blow lights its fuse (time to get away), a shot sets it off at once
      if (e.fuseT === undefined) {
        e.fuseT = ['bone', 'hado', 'super', 'blast'].includes(src) ? 0.05 : BLAST.barrel.lit;
        e.flashT = G.time + 0.15;
        spark(e.x - dir * 6, e.y - 30, '#ffcf5a', false);
        SFX.clack();
        SFX.fuse();
      }
      return true;
    }
    if (e.hp > 1) {
      // sturdy scenery (a big grave) cracks first and breaks after a few hits
      e.hp--;
      e.flashT = G.time + 0.15;
      spark(e.x - dir * 6, e.y - 30, '#dfe9e2', false);
      SFX.clack();
      G.shake = Math.max(G.shake, 3);
    } else breakProp(e);
    return true;
  }
  const F = FOES[e.type];
  if (
    e.dead ||
    e.dying ||
    e.state === 'down' ||
    (e.state === 'getup' && e.t < 0.25) ||
    (e.state === 'rise' && e.t < 0.45) ||
    F.immune?.(e)
  )
    return false;
  e.hp -= dmg;
  e.flash = 0.12;
  G.lastFoe = e;
  G.lastFoeT = 3;
  G.freeze = Math.max(G.freeze, knock ? 0.09 : 0.05);
  G.shake = Math.max(G.shake, knock ? 7 : 3);
  spark(
    e.x - dir * 8,
    e.y - e.z - 100 * e.T.scale + fxRnd(-14, 14),
    knock ? '#fff2a8' : '#ffffff',
    knock,
  );
  knock ? SFX.heavy() : SFX.punch();
  SFX.clack();
  // the foe's own rules first (see foes/registry.js), then the usual flinch
  if (F.onHit?.(e, dmg, dir, knock, src)) return true;
  if (e.hp <= 0) {
    killEnemy(e, dir);
    return true;
  }
  e.engage = false;
  if (F.guard?.(e, knock, src, dir, crush)) return true;
  // the rest depends on its weight class (WEIGHT in config.js)
  const w = weightOf(e);
  if (w === 'boss') return true;
  // the heavy: only a crushing blow moves it, and only on the ground (it is never juggled)
  if (w === 'heavy' && !(crush && e.state !== 'air')) return true;
  if (e.state === 'air') {
    // up in the air: juggled
    juggle(e, dir, knock, launch);
    return true;
  }
  const heavy = knock,
    busy = ['windup', 'attack', ...(F.attacks ?? [])].includes(e.state);
  if (w === 'medium' && knock) {
    // a medium enemy needs a second heavy blow in time (or a crushing one); the first only
    // makes it flinch, breaking its attack
    if (e.heavyT > 0 || crush) e.heavyT = 0;
    else {
      e.heavyT = WEIGHT.window;
      knock = false;
    }
  }
  if (knock || e.state === 'leap') {
    e.state = 'air';
    e.t = 0;
    e.slammed = false;
    if (launch && knock) {
      // the launcher: straight up, ready to be juggled
      e.vx = dir * JUGGLE.launchCarry;
      e.vz = JUGGLE.launch;
    } else {
      const [vx, vz] =
        w === 'light' ? [270, 430] : WEIGHT[w === 'heavy' ? 'knockHeavy' : 'knockMedium'];
      e.vx = dir * vx;
      e.vz = vz;
    }
  } else if (w === 'medium' && busy && !heavy) {
    e.x += dir * 4; // a plain hit: its attack goes on
  } else {
    e.state = 'hurt';
    e.t = 0;
    e.z = 0;
    e.vx = dir * 95;
  }
  return true;
}
/** Its weight class: 'light' (the default), 'medium', 'heavy' or 'boss'. */
export const weightOf = (e) => e.weight ?? e.T.weight ?? 'light';
/** Can this enemy be juggled? The light and the medium can, once they are in the air. */
export const canJuggle = (e) => ['light', 'medium'].includes(weightOf(e));
/** A hit in the air pops the enemy up again, a little less with every hit. */
function juggle(e, dir, knock, launch) {
  e.juggle = (e.juggle || 0) + 1;
  e.t = 0;
  const up = launch && knock ? JUGGLE.launch : knock ? JUGGLE.popKnock : JUGGLE.pop;
  e.vz = Math.max(JUGGLE.min, up - JUGGLE.decay * (e.juggle - 1));
  e.vx = dir * (launch && knock ? JUGGLE.launchCarry : knock ? JUGGLE.carryKnock : JUGGLE.carry);
  styleGain(JUGGLE.style);
}
export function killEnemy(e, dir) {
  const F = FOES[e.type];
  if (F.die) return F.die(e, dir);
  if (F.corpse) {
    // not a skeleton: thrown back, it falls and lies there a moment before it is gone
    P.score += Math.round(e.T.score * scoreMult());
    Object.assign(e, {
      dying: true,
      engage: false,
      state: 'fall',
      t: 0,
      vx: dir * 160,
      vz: 260,
      hp: 0,
    });
    SFX.thud();
    if (random() < 0.12) G.items.push({ kind: 'rage', x: e.x, y: e.y, z: 60, vz: 200, t: 0 });
    return;
  }
  e.dead = true;
  P.score += Math.round(e.T.score * scoreMult());
  shatter(e, dir);
  if (e.T.bigBoss) finale(e);
  else if (random() < 0.12) G.items.push({ kind: 'rage', x: e.x, y: e.y, z: 60, vz: 200, t: 0 });
}
// A boss falls: slow motion, a flash, every other enemy crumbles, the arena is cleared.
export function finale(e) {
  {
    G.slow = 1.4;
    G.shake = 16;
    G.flash = 0.6;
    SFX.nova();
    for (const o of G.enemies)
      if (!o.dead && o !== e) {
        o.dead = true;
        shatter(o, o.x < e.x ? -1 : 1);
      }
    G.projs = G.projs.filter((p) => !['ebone', 'ehado', 'acid', 'plasma', 'shell'].includes(p.k));
    G.pools = [];
    G.shocks = [];
  }
}
// A zombie's head flies off; the body keeps fighting.
export function popHead(e, dir) {
  e.headless = true;
  G.debris.push({
    k: 'skull',
    x: e.x,
    gy: e.y + 2,
    z: e.z + 150 * e.T.scale,
    vx: dir * fxRnd(140, 260),
    vz: fxRnd(320, 460),
    rot: 0,
    vr: dir * fxRnd(8, 14),
    len: 12 * e.T.scale,
    col: e.T.col,
    eye: e.T.eye,
    life: 3,
  });
  for (let i = 0; i < 6; i++)
    G.parts.push({
      k: 'dot',
      x: e.x,
      y: e.y - 150 * e.T.scale,
      vx: fxRnd(-120, 120),
      vy: fxRnd(-220, -60),
      g: 700,
      t: 0,
      life: fxRnd(0.3, 0.5),
      s: fxRnd(3, 5),
      col: '#5f7a3a',
    });
  SFX.clack();
}
// A zombie gets hold of the player: a little damage, then the player is stuck for a moment.
export function grabPlayer(e) {
  const p = P;
  if (
    p.inv > 0 ||
    p.z > 6 ||
    APP.state !== 'play' ||
    !['idle', 'walk', 'run', 'atk1', 'atk2', 'throw'].includes(p.state)
  )
    return false;
  if (p.hp <= e.T.dmg) return hitPlayer(e.T.dmg, e.face, false) && false;
  p.hp -= e.T.dmg;
  styleBreak();
  spark(p.x, p.y - 105, '#ff4a5e', false);
  SFX.hurt();
  SFX.grab();
  Object.assign(p, { state: 'grabbed', t: 0, grabber: e, hold: ZOMBIE.hold, buf: null });
  p.face = e.x >= p.x ? 1 : -1;
  return true;
}
export function breakProp(e) {
  const D = DECOR[e.decor];
  e.dead = true;
  SFX.shatter();
  if (D) {
    SFX.thud();
    P.score += D.score;
  }
  spark(e.x, e.y - 26, '#dfe9e2', false);
  for (let i = 0; i < (D ? 11 : 7); i++)
    G.debris.push({
      k: 'shard',
      x: e.x + fxRnd(-8, 8),
      gy: e.y + fxRnd(-4, 6),
      z: fxRnd(8, 40),
      vx: fxRnd(-160, 160),
      vz: fxRnd(150, 340),
      rot: fxRnd(TAU),
      vr: fxRnd(-12, 12),
      len: fxRnd(6, 11) * (D ? 1.3 : 1),
      col: D ? D.col : '#6f8b8f',
      life: 2.2,
    });
  if (e.drop) G.items.push({ kind: e.drop, x: e.x, y: e.y + 4, z: 30, vz: 260, t: 0 });
  if (D && D.big)
    // a big grave bursts into heavy slabs of stone
    for (let i = 0; i < 9; i++)
      G.debris.push({
        k: 'shard',
        x: e.x + fxRnd(-24, 24),
        gy: e.y + fxRnd(-6, 8),
        z: fxRnd(20, 90),
        vx: fxRnd(-220, 220),
        vz: fxRnd(220, 420),
        rot: fxRnd(TAU),
        vr: fxRnd(-8, 8),
        len: fxRnd(18, 30),
        col: i % 3 ? D.col : '#566266',
        life: 3,
      });
  if (D?.boom) explode(e.x, e.y, D.boom);
  if (D && D.big) {
    // a big grave: a zombie (25%) or a skeleton (25%) may climb out, or nothing (50%)
    const r = random();
    if (r < 0.5) spawn(r < 0.25 ? 'zombie' : 'grunt', 0, e.x, e.y);
    G.shake = Math.max(G.shake, 8);
  }
}
export function strike(o) {
  const p = P,
    src = o.src || 'punch';
  for (const e of G.enemies.concat(G.props)) {
    if (p.hit.has(e) || e.dead) continue;
    const dx = (e.x - p.x) * p.face,
      zone = e.T?.dragon
        ? dragonZone(e, p.x + p.face * o.x0, p.x + p.face * o.x1, p.y, o.dy)
        : dx > o.x0 - e.w && dx < o.x1 + e.w && Math.abs(e.y - p.y) < o.dy && e.z < 140
          ? 'body'
          : null;
    if (zone) {
      p.hit.add(e);
      // Lucy's fists are weaker than Raithwyn's
      const dmg = o.dmg * (p.who === 'lucy' ? LUCY.melee : 1) * dmgMult() * headBonus(e, zone);
      if (hurtEnemy(e, dmg, p.face, o.knock, src, o.launch) && !e.isProp) {
        addRage(o.rage);
        styleGain(10);
        buzz(o.knock ? 22 : 10);
        // short of rounds and none about: now and then a magazine flies out of the one she hit
        if (
          p.who === 'lucy' &&
          p.ammo < LUCY.ammo &&
          !G.items.some((it) => it.kind === 'ammo') &&
          random() < LUCY.drop
        )
          G.items.push({
            kind: 'ammo',
            x: e.x,
            y: e.y + 4,
            z: 70,
            vz: 300,
            vx: p.face * rnd(60, 140),
            t: 0,
          });
      }
    }
  }
}
/** A hit on the dragon's lowered head: 1.5x damage and a spark where it landed. */
export function headBonus(e, zone) {
  if (zone !== 'head') return 1;
  const [x, y] = headPoint(e);
  spark(x, y, '#c6ff7a', true);
  return DRAGON.headMult;
}
export function hitPlayer(dmg, dir, knock) {
  const p = P;
  if (p.inv > 0 || APP.state !== 'play' || ['ko', 'down', 'getup', 'dead', 'win'].includes(p.state))
    return false;
  p.hp = Math.max(0, p.hp - dmg);
  // Lucy's luck: the blow that would finish her may not; she still goes down
  const lucky =
    p.hp <= 0 && p.who === 'lucy' && random() < LUCK.chance + LUCK.perRank * styleRank();
  if (lucky) {
    p.hp = Math.round(p.maxHp * LUCK.hp);
    p.lucky = LUCK.sign;
    SFX.rank();
  }
  styleBreak();
  addRage(RAGE.hurt);
  buzz(knock ? 70 : 35);
  G.freeze = Math.max(G.freeze, 0.07);
  G.shake = Math.max(G.shake, knock ? 10 : 5);
  spark(p.x, p.y - p.z - 105, '#ff4a5e', knock);
  SFX.hurt();
  p.buf = null;
  p.puller = null;
  p.grabber = null;
  if (p.hp <= 0 || lucky || knock || p.z > 0 || p.state === 'jump') {
    p.state = 'ko';
    p.t = 0;
    p.vx = dir * 240;
    p.vz = 400;
    p.face = dir;
    if (knock) SFX.heavy();
  } else {
    p.state = 'hurt';
    p.t = 0;
    p.vx = dir * 150;
  }
  return true;
}
// The super attack goes off: every enemy and urn on screen takes a heavy knockdown hit and
// every enemy projectile on screen is wiped out.
export function superNova() {
  const p = P,
    onScreen = (o) => !o.dead && o.x > G.cam - 30 && o.x < G.cam + W + 30;
  G.flash = 0.7;
  G.shake = 18;
  G.freeze = 0.12;
  SFX.nova();
  SFX.hado();
  G.parts.push({ k: 'ring', x: p.x + p.face * 50, y: p.y - 112, t: 0, life: 0.6, s: W * 0.9 });
  G.parts.push({ k: 'gring', x: p.x, y: p.y, t: 0, life: 0.7, s: W * 0.8 });
  const dmg = SUPER_DMG * dmgMult();
  for (const e of G.enemies.concat(G.props).filter(onScreen)) {
    if (hurtEnemy(e, dmg, e.x >= p.x ? 1 : -1, true, 'super') && !e.isProp) {
      styleGain(25);
      G.parts.push({ k: 'fxring', x: e.x, y: e.y - e.z - 95 * e.T.scale, t: 0, life: 0.35 });
      motes(e.x, e.y - 95, 12, 280);
    }
  }
  for (const q of G.projs) if ((q.k === 'ebone' || q.k === 'acid') && onScreen(q)) q.life = 0;
  G.pools = G.pools.filter((a) => !onScreen(a));
}
// One bite of an acid puddle (or of the fire on the ground, `fire`): drains health without
// staggering. A bite that would kill goes through hitPlayer so that the usual knockdown and
// death follow.
export function acidBite(dmg, fire = false) {
  const p = P;
  if (p.inv > 0 || APP.state !== 'play' || ['ko', 'down', 'getup', 'dead', 'win'].includes(p.state))
    return false;
  if (p.hp <= dmg) return hitPlayer(dmg, p.face, false);
  p.hp -= dmg;
  styleBreak();
  fire ? SFX.hurt() : SFX.splash();
  for (let i = 0; i < 4; i++)
    G.parts.push({
      k: 'dot',
      x: p.x + fxRnd(-18, 18),
      y: p.y - fxRnd(4, 30),
      vx: fxRnd(-40, 40),
      vy: fxRnd(-120, -60),
      g: 300,
      t: 0,
      life: fxRnd(0.3, 0.5),
      s: fxRnd(3, 5),
      col: fire ? '#ff8a2a' : '#9dff4a',
    });
  return true;
}
