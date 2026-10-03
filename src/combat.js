// Damage rules: who can be hit, what a hit does, rage, the boss interrupt immunity.
import { DECOR, MAXR, RL, RW, SUPER_DMG, SWIND_LOCK, TAU, W, ZOMBIE } from './config.js';
import { rnd } from './util.js';
import { G, P } from './state.js';
import { SFX } from './audio.js';
import { floatTxt, motes, shatter, spark } from './fx.js';
import { t } from './i18n.js';
import { spawn } from './enemies.js';
import { DRAGON, dragonZone, headPoint } from './dragon.js';
import { dmgMult, scoreMult, styleBreak, styleGain } from './style.js';

export function hadoLevel(rage) {
  return rage >= RL[2] ? 3 : rage >= RL[1] ? 2 : rage >= RL[0] ? 1 : 0;
}
export function addRage(n) {
  P.rage = Math.min(MAXR, P.rage + n);
}
export function hurtEnemy(e, dmg, dir, knock, src) {
  if (e.isProp) {
    if (e.hp > 1) {
      // sturdy scenery (a gravestone) cracks first and breaks on the next hit
      e.hp--;
      e.flashT = G.time + 0.15;
      spark(e.x - dir * 6, e.y - 30, '#dfe9e2', false);
      SFX.clack();
      G.shake = Math.max(G.shake, 3);
    } else breakProp(e);
    return true;
  }
  if (
    e.dead ||
    e.state === 'down' ||
    (e.state === 'getup' && e.t < 0.25) ||
    (e.state === 'rise' && e.t < 0.45) ||
    (e.T.dragon && e.state === 'intro')
  )
    return false;
  if (e.state === 'ride' && e.t < RW) return false;
  e.hp -= dmg;
  e.flash = 0.12;
  G.lastFoe = e;
  G.lastFoeT = 3;
  G.freeze = Math.max(G.freeze, knock ? 0.09 : 0.05);
  G.shake = Math.max(G.shake, knock ? 7 : 3);
  spark(
    e.x - dir * 8,
    e.y - e.z - 100 * e.T.scale + rnd(-14, 14),
    knock ? '#fff2a8' : '#ffffff',
    knock,
  );
  knock ? SFX.heavy() : SFX.punch();
  SFX.clack();
  if (e.T.dragon) {
    // nothing the player does interrupts the dragon
    if (e.hp <= 0) killEnemy(e, dir);
    return true;
  }
  if (e.mounted) {
    // knocked off the bike
    e.mounted = false;
    e.w = 16 * e.T.scale;
    G.debris.push({
      k: 'bike',
      x: e.x,
      gy: e.y,
      z: 0,
      vx: e.rdir * 380,
      vz: 0,
      rot: 0,
      vr: 0,
      dir: e.rdir,
      tilt: 0,
      life: 2.6,
    });
    floatTxt(e.x, e.y - 200, t('unhorsed'), '#ffe9a8');
    G.shake = Math.max(G.shake, 8);
    if (e.hp <= 0) {
      killEnemy(e, dir);
      return true;
    }
    e.state = 'air';
    e.t = 0;
    e.z = 56;
    e.vx = e.rdir * 150;
    e.vz = 430;
    e.chCd = rnd(2, 3.5);
    return true;
  }
  if (e.hp <= 0) {
    killEnemy(e, dir);
    return true;
  }
  e.engage = false;
  if (e.T.zombie && !e.headless && (knock || src === 'hado' || Math.random() < ZOMBIE.headOff))
    popHead(e, dir);
  if (e.type === 'boss') {
    // charging, summoning, roaring and breathing acid cannot be stopped
    if (['charge', 'summon', 'rise', 'roar', 'breath'].includes(e.state)) return true;
    const atk = ['windup', 'attack', 'cwind', 'bwind'].includes(e.state),
      combo = src === 'punch' || src === 'air';
    if (combo) {
      if (e.armor > 0) return true;
      if (atk) {
        e.state = 'hurt';
        e.t = 0;
        e.vx = dir * 110;
        e.brCd = Math.max(e.brCd || 0, 1.2);
        e.breaks++;
        if (e.breaks >= 2) {
          e.breaks = 0;
          e.armor = 4;
          floatTxt(e.x, e.y - 280, t('immuneShort'), '#e3c8ff');
          SFX.boss();
        } else floatTxt(e.x, e.y - 280, t('interrupted'), '#ffe9a8');
      } else if (knock) {
        e.state = 'hurt';
        e.t = 0;
        e.vx = dir * 110;
      }
    } else if (src === 'hado' || src === 'super') {
      e.state = 'hurt';
      e.t = 0;
      e.vx = dir * 110;
    }
    return true;
  }
  // Past the last third of the wind-up the fatso's ground slam can no longer be stopped.
  if (e.state === 'swind' && e.t >= SWIND_LOCK) return true;
  const busy = e.state === 'windup' || e.state === 'attack' || e.state === 'swind';
  if (knock || e.state === 'leap') {
    e.state = 'air';
    e.t = 0;
    e.slammed = false;
    e.vx = dir * (e.T.heavy ? 170 : 270);
    e.vz = e.T.heavy ? 320 : 430;
  } else if (e.T.heavy && busy) {
    e.x += dir * 4;
  } else {
    e.state = 'hurt';
    e.t = 0;
    e.z = 0;
    e.vx = dir * 95;
  }
  return true;
}
export function killEnemy(e, dir) {
  e.dead = true;
  P.score += Math.round(e.T.score * scoreMult());
  shatter(e, dir);
  if (e.T.bigBoss) {
    G.slow = 1.4;
    G.shake = 16;
    G.flash = 0.6;
    SFX.nova();
    for (const o of G.enemies)
      if (!o.dead && o !== e) {
        o.dead = true;
        shatter(o, o.x < e.x ? -1 : 1);
      }
    G.projs = G.projs.filter((p) => p.k !== 'ebone' && p.k !== 'acid');
    G.pools = [];
  } else if (Math.random() < 0.12)
    G.items.push({ kind: 'rage', x: e.x, y: e.y, z: 60, vz: 200, t: 0 });
}
// A zombie's head flies off; the body keeps fighting.
export function popHead(e, dir) {
  e.headless = true;
  G.debris.push({
    k: 'skull',
    x: e.x,
    gy: e.y + 2,
    z: e.z + 150 * e.T.scale,
    vx: dir * rnd(140, 260),
    vz: rnd(320, 460),
    rot: 0,
    vr: dir * rnd(8, 14),
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
      vx: rnd(-120, 120),
      vy: rnd(-220, -60),
      g: 700,
      t: 0,
      life: rnd(0.3, 0.5),
      s: rnd(3, 5),
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
    G.state !== 'play' ||
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
      x: e.x + rnd(-8, 8),
      gy: e.y + rnd(-4, 6),
      z: rnd(8, 40),
      vx: rnd(-160, 160),
      vz: rnd(150, 340),
      rot: rnd(TAU),
      vr: rnd(-12, 12),
      len: rnd(6, 11) * (D ? 1.3 : 1),
      col: D ? D.col : '#6f8b8f',
      life: 2.2,
    });
  if (e.drop) G.items.push({ kind: e.drop, x: e.x, y: e.y + 4, z: 30, vz: 260, t: 0 });
  if (D && D.big)
    // a big grave bursts into heavy slabs of stone
    for (let i = 0; i < 9; i++)
      G.debris.push({
        k: 'shard',
        x: e.x + rnd(-24, 24),
        gy: e.y + rnd(-6, 8),
        z: rnd(20, 90),
        vx: rnd(-220, 220),
        vz: rnd(220, 420),
        rot: rnd(TAU),
        vr: rnd(-8, 8),
        len: rnd(18, 30),
        col: i % 3 ? D.col : '#566266',
        life: 3,
      });
  if (D && D.big) {
    // a big grave: a zombie (25%) or a skeleton (25%) may climb out, or nothing (50%)
    const r = Math.random();
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
      if (hurtEnemy(e, o.dmg * dmgMult() * headBonus(e, zone), p.face, o.knock, src) && !e.isProp) {
        addRage(o.rage);
        styleGain(10);
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
  if (p.inv > 0 || G.state !== 'play' || ['ko', 'down', 'getup', 'dead', 'win'].includes(p.state))
    return false;
  p.hp = Math.max(0, p.hp - dmg);
  styleBreak();
  addRage(4);
  G.freeze = Math.max(G.freeze, 0.07);
  G.shake = Math.max(G.shake, knock ? 10 : 5);
  spark(p.x, p.y - p.z - 105, '#ff4a5e', knock);
  SFX.hurt();
  p.buf = null;
  p.puller = null;
  p.grabber = null;
  if (p.hp <= 0 || knock || p.z > 0 || p.state === 'jump') {
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
// One bite of an acid puddle: drains health without staggering. A bite that would kill goes
// through hitPlayer so that the usual knockdown and death follow.
export function acidBite(dmg) {
  const p = P;
  if (p.inv > 0 || G.state !== 'play' || ['ko', 'down', 'getup', 'dead', 'win'].includes(p.state))
    return false;
  if (p.hp <= dmg) return hitPlayer(dmg, p.face, false);
  p.hp -= dmg;
  styleBreak();
  SFX.splash();
  for (let i = 0; i < 4; i++)
    G.parts.push({
      k: 'dot',
      x: p.x + rnd(-18, 18),
      y: p.y - rnd(4, 30),
      vx: rnd(-40, 40),
      vy: rnd(-120, -60),
      g: 300,
      t: 0,
      life: rnd(0.3, 0.5),
      s: rnd(3, 5),
      col: '#9dff4a',
    });
  return true;
}
