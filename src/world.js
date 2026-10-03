// One simulation step: player, enemies, projectiles, pickups, debris, wave script.
import { PURPLE, W, WAVES } from './config.js';
import { clamp, rnd } from './util.js';
import { G, P } from './state.js';
import { SFX } from './audio.js';
import { floatTxt, motes } from './fx.js';
import { addRage, hitPlayer, hurtEnemy } from './combat.js';
import { updPlayer } from './player.js';
import { spawn, updEnemy } from './enemies.js';

export function updWaves(dt) {
  if (G.wave) {
    G.wave.t += dt;
    for (const s of G.wave.sp)
      if (!s.done && G.wave.t >= s[2] && G.enemies.length < 6) {
        s.done = true;
        spawn(s[0], s[1]);
      }
    if (G.wave.sp.every((s) => s.done) && G.enemies.length === 0) {
      G.wave = null;
      G.waveI++;
      G.goT = 6;
      if (G.waveI >= WAVES.length) {
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
      G.wave = { sp: WAVES[G.waveI].sp.map((s) => s.slice()), t: 0 };
      G.goT = 0;
    }
  }
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
  updPlayer(dt);
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
        if (Math.abs(e.x - q.x) < e.w + 16 && Math.abs(e.y - q.y) < 22 && e.z < 90) {
          if (hurtEnemy(e, 7, Math.sign(q.vx), false, 'bone')) {
            if (!e.isProp) addRage(2);
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
      if (Math.random() < 0.9)
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
        if (
          Math.abs(e.x - q.x) < e.w + [34, 50, 74][q.lv - 1] &&
          Math.abs(e.y - q.y) < [32, 46, 72][q.lv - 1]
        ) {
          q.hit.add(e);
          if (hurtEnemy(e, [30, 60, 110][q.lv - 1], Math.sign(q.vx), true, 'hado')) {
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
        if (o.k === 'ebone' && Math.abs(o.x - q.x) < 40 && Math.abs(o.y - q.y) < 40) o.life = 0;
      if (q.x < G.cam - 120 || q.x > G.cam + W + 120) q.life = 0;
    } else {
      q.rot += dt * 16 * Math.sign(q.vx);
      if (Math.abs(P.x - q.x) < 24 && Math.abs(P.y - q.y) < 19 && P.z < 95) {
        if (hitPlayer(7, Math.sign(q.vx), false)) q.life = 0;
      }
      if (q.x < G.cam - 100 || q.x > G.cam + W + 100) q.life = 0;
    }
  }
  G.projs = G.projs.filter((q) => q.life > 0);
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
        floatTxt(it.x, it.y - 120, '+35 здоровья', '#ff8f9d');
      } else {
        addRage(50);
        floatTxt(it.x, it.y - 120, '+50 ярости', '#d9b8ff');
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
      if (Math.abs(d.vx) > 90 && Math.random() < 0.5)
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
