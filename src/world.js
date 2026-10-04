// One simulation step: player, enemies, projectiles, pickups, debris, wave script.
import {
  ACID,
  CHAIN_GAP,
  GB,
  GT,
  HADO,
  PURPLE,
  RAGE,
  SECRET_HOLD,
  W,
  WAVES,
  ZOMBIE,
} from './config.js';
import { clamp, random, rnd } from './util.js';
import { G, P } from './state.js';
import { SFX } from './audio.js';
import { keys } from './input.js';
import { floatTxt, motes } from './fx.js';
import { t } from './i18n.js';
import { acidBite, addRage, headBonus, hitPlayer, hurtEnemy } from './combat.js';
import { DRAGON, dragonZone, plasmaBlast, updShocks } from './dragon.js';
import { dmgMult, styleGain, updStyle } from './style.js';
import { updPlayer } from './player.js';
import { spawn, updEnemy } from './enemies.js';
import { waveSpawns } from './waves.js';

// How full the screen is: zombies come in crowds and count as half an enemy each.
const crowd = () => G.enemies.reduce((n, e) => n + (e.T.crowd || 1), 0);
export function updWaves(dt) {
  if (G.wave) {
    G.wave.t += dt;
    for (const s of G.wave.sp)
      if (!s.done && G.wave.t >= s[2] && crowd() < 6) {
        s.done = true;
        spawn(s[0], s[1]);
      }
    if (G.wave.sp.every((s) => s.done) && G.enemies.length === 0) {
      G.wave = null;
      G.waveI++;
      G.goT = 6;
      if (WAVES[G.waveI]?.chain) {
        // the next wave is already on its way: no walk, a short breath and it starts here
        G.goT = 0;
        G.wave = { sp: waveSpawns(G.waveI), t: -CHAIN_GAP };
      } else if (G.waveI >= WAVES.length) {
        P.state = 'win';
        P.t = 0;
        P.z = 0;
        G.state = 'win';
        G.endT = 0;
        P.score += P.lives * 1000 + Math.round(P.hp) * 10;
      }
    }
  } else if (G.waveI < WAVES.length) {
    const lim = WAVES[G.waveI].x,
      tg = clamp(P.x - 390, G.cam, lim);
    G.cam += (tg - G.cam) * Math.min(1, dt * 7);
    if (G.cam >= lim - 1.5) {
      G.cam = lim;
      G.wave = { sp: waveSpawns(G.waveI), t: 0 };
      G.goT = 0;
    }
  }
}
// The secret: hold X for SECRET_HOLD seconds before the first fight starts, and the road
// folds away — the player lands at the gate of the final boss's arena.
function secretWarp(dt) {
  if (G.waveI !== 0 || G.wave || G.secretDone) return;
  if (!keys.secret) {
    G.secretT = 0;
    return;
  }
  G.secretT = (G.secretT || 0) + dt;
  if (random() < G.secretT * 0.3) motes(P.x, P.y - 90, 1, 80);
  if (G.secretT < SECRET_HOLD) return;
  G.secretDone = true;
  const last = WAVES.length - 1,
    lim = WAVES[last].x;
  G.waveI = last;
  G.cam = lim;
  P.x = lim + 260;
  P.y = 450;
  G.enemies = [];
  G.projs = [];
  G.pools = [];
  G.shocks = [];
  G.flash = 0.6;
  G.shake = 10;
  SFX.nova();
}
export function update(dt) {
  G.time += dt;
  if (G.banner) {
    G.banner.t += dt;
    if (G.banner.t > 3) G.banner = null;
  }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 40);
  if (G.flash > 0) G.flash -= dt;
  G.lastFoeT -= dt;
  G.goT -= dt;
  if (G.freeze > 0) {
    G.freeze -= dt;
    return;
  }
  if (G.slow > 0) {
    G.slow -= dt;
    dt *= 0.3;
  }
  secretWarp(dt);
  updPlayer(dt);
  updStyle(dt);
  updShocks(dt);
  const c = { n: 0 };
  for (const e of G.enemies) if (e.engage) c.n++;
  for (const e of G.enemies) updEnemy(e, dt, c);
  // separation
  for (let i = 0; i < G.enemies.length; i++)
    for (let j = i + 1; j < G.enemies.length; j++) {
      const a = G.enemies[i],
        b = G.enemies[j];
      if (a.state !== 'chase' || b.state !== 'chase') continue;
      const dx = b.x - a.x,
        dy = b.y - a.y;
      if (Math.abs(dx) < 46 && Math.abs(dy) < 16) {
        const p = (dx >= 0 ? 1 : -1) * 40 * dt;
        a.x -= p;
        b.x += p;
        const q = (dy >= 0 ? 1 : -1) * 24 * dt;
        a.y -= q;
        b.y += q;
      }
    }
  // projectiles
  for (const q of G.projs) {
    q.life -= dt;
    q.x += q.vx * dt;
    if (q.k === 'bone') {
      q.rot += dt * 24 * Math.sign(q.vx);
      if (q.life < 0.25) q.z -= 260 * dt;
      for (const e of G.enemies.concat(G.props)) {
        if (e.dead) continue;
        const zone = e.T?.dragon
          ? dragonZone(e, q.x - 16, q.x + 16, q.y, 22)
          : Math.abs(e.x - q.x) < e.w + 16 && Math.abs(e.y - q.y) < 22 && e.z < 90
            ? 'body'
            : null;
        if (zone) {
          if (hurtEnemy(e, 7 * dmgMult() * headBonus(e, zone), Math.sign(q.vx), false, 'bone')) {
            if (!e.isProp) {
              addRage(RAGE.bone);
              styleGain(8);
            }
            q.life = 0;
            break;
          }
        }
      }
      if (q.life <= 0)
        G.debris.push({
          k: 'bone',
          x: q.x,
          gy: q.y,
          z: Math.max(4, q.z),
          vx: -q.vx * 0.15,
          vz: 200,
          rot: q.rot,
          vr: 12,
          len: 18,
          col: '#f3eeda',
          life: 1.2,
        });
    } else if (q.k === 'hado') {
      if (random() < 0.9)
        G.parts.push({
          k: 'glow',
          x: q.x - Math.sign(q.vx) * rnd(10, 40),
          y: q.y - q.z + rnd(-18, 18),
          vx: -q.vx * 0.15,
          vy: rnd(-30, 30),
          g: 0,
          t: 0,
          life: rnd(0.2, 0.4),
          s: rnd(2, 5),
          col: PURPLE,
        });
      for (const e of G.enemies.concat(G.props)) {
        if (e.dead || q.hit.has(e)) continue;
        const r = [34, 50, 74][q.lv - 1],
          dy = [32, 46, 72][q.lv - 1],
          zone = e.T?.dragon
            ? dragonZone(e, q.x - r, q.x + r, q.y, dy)
            : Math.abs(e.x - q.x) < e.w + r && Math.abs(e.y - q.y) < dy
              ? 'body'
              : null;
        if (zone) {
          q.hit.add(e);
          const dmg = HADO.dmg[q.lv - 1] * dmgMult() * headBonus(e, zone);
          if (hurtEnemy(e, dmg, Math.sign(q.vx), true, q.lv > 1 ? `hado${q.lv}` : 'hado')) {
            if (!e.isProp) styleGain(18);
            G.parts.push({
              k: 'fxring',
              x: e.x,
              y: e.y - e.z - 95 * (e.T ? e.T.scale : 0.3),
              t: 0,
              life: 0.3,
            });
            motes(e.x, e.y - 95, 10, 260);
          }
        }
      }
      for (const o of G.projs)
        if (
          (o.k === 'ebone' || o.k === 'acid') &&
          Math.abs(o.x - q.x) < 40 &&
          Math.abs(o.y - q.y) < 40
        )
          o.life = 0;
      if (q.x < G.cam - 120 || q.x > G.cam + W + 120) q.life = 0;
    } else if (q.k === 'zhead') {
      // a zombie's thrown head: an arc, a bite on a hit, otherwise it rolls on the ground
      q.rot += dt * 14 * Math.sign(q.vx);
      q.y += q.vy * dt;
      q.vz -= ACID.g * dt;
      q.z += q.vz * dt;
      if (Math.abs(P.x - q.x) < 26 && Math.abs(P.y - q.y) < 20 && q.z < 140 && P.z < 110)
        if (hitPlayer(ZOMBIE.headDmg, Math.sign(q.vx), false)) q.life = 0;
      if (q.life > 0 && q.z <= 0) q.life = 0;
      if (q.life <= 0)
        G.debris.push({
          k: 'skull',
          x: q.x,
          gy: q.y,
          z: Math.max(0, q.z) + 12,
          vx: q.vx * 0.3,
          vz: 160,
          rot: q.rot,
          vr: Math.sign(q.vx) * 8,
          len: 12,
          col: q.col,
          eye: q.eye,
          life: 2.5,
        });
    } else if (q.k === 'plasma') {
      // the dragon's plasma ball: an arc, a blast where it lands
      q.y += q.vy * dt;
      q.vz -= DRAGON.plasma.g * dt;
      q.z += q.vz * dt;
      if (random() < 0.8)
        G.parts.push({
          k: 'glow',
          x: q.x - Math.sign(q.vx) * rnd(4, 14),
          y: q.y - q.z + rnd(-6, 6),
          vx: -q.vx * 0.1,
          vy: rnd(-20, 20),
          g: 0,
          t: 0,
          life: rnd(0.2, 0.35),
          s: rnd(2, 5),
          col: '#d7a8ff',
        });
      if (q.z <= 0) {
        q.life = 0;
        plasmaBlast(q);
      }
    } else if (q.k === 'acid') {
      // The necromancer's acid ball: flies in an arc and leaves a puddle where it lands.
      q.rot += dt;
      q.y += q.vy * dt;
      q.vz -= ACID.g * dt;
      q.z += q.vz * dt;
      if (random() < 0.5)
        G.parts.push({
          k: 'dot',
          x: q.x - Math.sign(q.vx) * rnd(6, 16),
          y: q.y - q.z + rnd(-6, 6),
          vx: -q.vx * 0.1,
          vy: rnd(10, 60),
          g: 300,
          t: 0,
          life: rnd(0.2, 0.4),
          s: rnd(2, 4),
          col: '#9dff4a',
        });
      // a hit splashes the player, but the ball keeps falling and still leaves its puddle
      if (
        !q.hitP &&
        Math.abs(P.x - q.x) < 26 &&
        Math.abs(P.y - q.y) < 20 &&
        q.z < 130 &&
        P.z < 110
      ) {
        if (hitPlayer(ACID.hit, Math.sign(q.vx), false)) {
          q.hitP = true;
          SFX.splash();
          for (let i = 0; i < 10; i++)
            G.parts.push({
              k: 'dot',
              x: P.x,
              y: P.y - 100,
              vx: rnd(-200, 200),
              vy: rnd(-260, -40),
              g: 700,
              t: 0,
              life: rnd(0.3, 0.55),
              s: rnd(3, 6),
              col: i % 2 ? '#9dff4a' : '#4fd12a',
            });
        }
      }
      if (q.life > 0 && q.z <= 0) {
        q.life = 0;
        SFX.splash();
        G.pools.push({ x: q.x, y: clamp(q.y, GT, GB), t: 0, life: ACID.pool, seed: rnd(6) });
        for (let i = 0; i < 8; i++)
          G.parts.push({
            k: 'dot',
            x: q.x,
            y: q.y - 4,
            vx: rnd(-160, 160),
            vy: rnd(-220, -60),
            g: 700,
            t: 0,
            life: rnd(0.3, 0.5),
            s: rnd(3, 5),
            col: '#9dff4a',
          });
      }
      if (q.x < G.cam - 100 || q.x > G.cam + W + 100) q.life = 0;
    } else {
      q.rot += dt * 16 * Math.sign(q.vx);
      if (Math.abs(P.x - q.x) < 24 && Math.abs(P.y - q.y) < 19 && P.z < 95) {
        if (hitPlayer(7, Math.sign(q.vx), false)) q.life = 0;
      }
      if (q.x < G.cam - 100 || q.x > G.cam + W + 100) q.life = 0;
    }
  }
  G.projs = G.projs.filter((q) => q.life > 0);
  // acid puddles bite the player standing in them
  let inAcid = false;
  for (const a of G.pools) {
    a.t += dt;
    const ex = (P.x - a.x) / ACID.rx,
      ey = (P.y - a.y) / ACID.ry;
    if (a.t < a.life - 0.3 && ex * ex + ey * ey < 1 && P.z < 8) inAcid = true;
  }
  G.pools = G.pools.filter((a) => a.t < a.life);
  if (!inAcid) P.acidT = 0.15;
  else if ((P.acidT -= dt) <= 0) {
    P.acidT = ACID.tick;
    acidBite(ACID.dmg);
  }
  G.enemies = G.enemies.filter((e) => !e.dead);
  G.props = G.props.filter((e) => !e.dead);
  if (G.lastFoe && G.lastFoe.dead && G.lastFoeT > 1) G.lastFoeT = 1;
  // G.items
  for (const it of G.items) {
    it.t += dt;
    it.vz -= 900 * dt;
    it.z += it.vz * dt;
    if (it.z < 0) {
      it.z = 0;
      it.vz = Math.abs(it.vz) > 80 ? -it.vz * 0.4 : 0;
    }
    if (
      it.t > 0.45 &&
      Math.abs(it.x - P.x) < 34 &&
      Math.abs(it.y - P.y) < 24 &&
      P.z < 40 &&
      P.hp > 0
    ) {
      it.dead = true;
      SFX.pick();
      if (it.kind === 'hp') {
        P.hp = Math.min(100, P.hp + 35);
        floatTxt(it.x, it.y - 120, t('plusHp'), '#ff8f9d');
      } else {
        addRage(RAGE.pickup);
        floatTxt(it.x, it.y - 120, t('plusRage'), '#d9b8ff');
        motes(it.x, it.y - 40, 10);
      }
    }
  }
  G.items = G.items.filter((i) => !i.dead);
  for (const d of G.debris) {
    d.life -= dt;
    if (d.k === 'bike') {
      d.x += d.vx * dt;
      d.vx *= Math.pow(0.07, dt);
      d.tilt = Math.min(1, d.tilt + dt * 2.4);
      if (Math.abs(d.vx) > 90 && random() < 0.5)
        G.parts.push({
          k: 'dot',
          x: d.x,
          y: d.gy - 4,
          vx: -d.vx * 0.3 + rnd(-60, 60),
          vy: rnd(-160, -40),
          g: 500,
          t: 0,
          life: 0.3,
          s: 3,
          col: '#ffcf6a',
        });
      continue;
    }
    d.x += d.vx * dt;
    d.vz -= 1400 * dt;
    d.z += d.vz * dt;
    d.rot += d.vr * dt;
    if (d.z <= 0) {
      d.z = 0;
      if (Math.abs(d.vz) > 90) {
        d.vz = -d.vz * 0.42;
        d.vx *= 0.55;
        d.vr *= 0.5;
      } else {
        d.vz = 0;
        d.vx *= Math.pow(0.001, dt);
        d.vr = d.k === 'skull' ? d.vx * 0.08 : 0;
      }
    }
  }
  G.debris = G.debris.filter((d) => d.life > 0);
  for (const p of G.parts) {
    p.t += dt;
    if (p.vx !== undefined) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.g || 0) * dt;
    }
  }
  G.parts = G.parts.filter((p) => p.t < p.life);
  for (const f of G.floats) f.t += dt;
  G.floats = G.floats.filter((f) => f.t < 1.1);
  updWaves(dt);
}
