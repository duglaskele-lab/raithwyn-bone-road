// One simulation step: player, enemies, projectiles, pickups, debris, wave script.
import {
  BIG_GUN,
  BULLET,
  LUCY,
  GRENADE,
  ACID,
  CHAIN_GAP,
  DYNAMITE,
  GB,
  GT,
  HADO,
  PURPLE,
  RAGE,
  SECRET_HOLD,
  STAGE_HOLD,
  W,
  ZOMBIE,
  PROS,
} from './config.js';
import { clamp, fxRandom, fxRnd, random, rnd } from './util.js';
import { G, P } from './state.js';
import { SFX } from './audio.js';
import { keys, pressed } from './input.js';
import { dust, floatTxt, motes } from './fx.js';
import { t } from './i18n.js';
import { acidBite, addRage, headBonus, hitPlayer, hurtEnemy } from './combat.js';
import { DRAGON, dragonZone, plasmaBlast, updShocks } from './dragon.js';
import { dmgMult, styleGain, updStyle } from './style.js';
import { updPlayer } from './player.js';
import { spawn, updEnemy } from './enemies.js';
import { waveSpawns } from './waves.js';
import { dandies, evilHitP, evilHurt } from './foes/evil.js';
import { explode, updFuses } from './blast.js';
import { camTo, floorClamp, followPath, levelWaves, pathAt, pathPx, startLevel } from './level.js';

// How full the screen is: zombies come in crowds and count as half an enemy each. The bodies
// of the dead (a lizard or a power armour lying where it fell) do not count.
const crowd = () => G.enemies.reduce((n, e) => n + (e.dying ? 0 : e.T.crowd || 1), 0);
/** Enemies still fighting: the fight is over when there are none, bodies or not. */
export const alive = () => G.enemies.filter((e) => !e.dying);
export function updWaves(dt) {
  const WAVES = levelWaves();
  if (G.wave) {
    G.wave.t += dt;
    const W0 = WAVES[G.waveI];
    for (const s of G.wave.sp)
      if (!s.done && G.wave.t >= s[2] && crowd() < 6) {
        s.done = true;
        const e = spawn(s[0], s[1]);
        if (W0?.mid && !G.wave.midT) {
          e.wave0 = true;
          G.wave.max0 = (G.wave.max0 ?? 0) + e.T.hp;
        }
      }
    // a fight with a `mid` group: once its first enemies have lost half of their health,
    // the others come (their delays counted from then)
    if (W0?.mid && !G.wave.midT && G.wave.sp.every((s) => s.done)) {
      const hp = G.enemies.reduce((n, e) => n + (e.wave0 ? Math.max(0, e.hp) : 0), 0);
      if (hp <= G.wave.max0 * 0.5) {
        G.wave.midT = G.wave.t;
        G.wave.sp.push(...W0.mid.map((s) => [s[0], s[1], G.wave.t + s[2]]));
      }
    }
    if (G.wave.sp.every((s) => s.done) && alive().length === 0 && (!W0?.mid || G.wave.midT)) {
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
    if (G.level === 2) {
      if (followPath(dt, WAVES[G.waveI].s)) {
        G.wave = { sp: waveSpawns(G.waveI), t: 0 };
        G.goT = 0;
        if (WAVES[G.waveI].final) {
          G.banner = { a: '@prospector', b: 'prospectorBanner', t: 0 };
          SFX.boss();
        }
      }
      return;
    }
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
// folds away — the player lands at the gate of the final boss's arena (on either stage).
function secretWarp(dt) {
  if (G.waveI !== 0 || G.wave || G.secretDone) return;
  if (G.level === 1) {
    stageWarp(dt);
    if (G.secretDone) return;
  }
  if (!keys.secret) {
    G.secretT = 0;
    return;
  }
  G.secretT = (G.secretT || 0) + dt;
  if (fxRandom() < G.secretT * 0.3) motes(P.x, P.y - 90, 1, 80);
  if (G.secretT < SECRET_HOLD) return;
  G.secretDone = true;
  const WAVES = levelWaves(),
    last = WAVES.length - 1;
  G.waveI = last;
  if (G.level === 2) {
    // Old Quarry: straight to the Prospector's arena, along the road
    const d = pathPx(WAVES[last].s),
      c = pathAt(d);
    camTo(d);
    Object.assign(P, { x: c.x, y: c.y });
  } else {
    G.cam = WAVES[last].x;
    P.x = G.cam + 260;
    P.y = 450;
  }
  G.enemies = [];
  G.projs = [];
  G.pools = [];
  G.shocks = [];
  G.flash = 0.6;
  G.shake = 10;
  SFX.nova();
}
// The other secret: hold Z and 2 together for STAGE_HOLD seconds on the first screen of the
// Bone Road, and the player is taken to the gates of Old Quarry.
function stageWarp(dt) {
  if (!(keys.lvlZ && keys.lvl2)) {
    G.stageT = 0;
    return;
  }
  G.stageT = (G.stageT || 0) + dt;
  if (fxRandom() < G.stageT * 0.4) motes(P.x, P.y - 90, 1, 80);
  if (G.stageT < STAGE_HOLD) return;
  G.stageT = 0;
  startLevel(2);
  G.flash = 0.6;
  G.shake = 10;
  SFX.nova();
}
export function update(dt) {
  G.time += dt;
  // the Bone Road won: a moment of triumph, then on to Old Quarry (J, or by itself)
  if (G.state === 'win' && G.level === 1 && G.endT > 2.4 && (pressed.atk || G.endT > 7)) {
    startLevel(2);
    G.state = 'play';
    return;
  }
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
    } else if (q.k === 'bullet' && !q.spent) {
      // Lucy's bullet: the first thing in its way takes it, as the bullet reaches its middle
      // (it went from `from` to q.x this frame; an enemy right up against her counts too)
      const s = Math.sign(q.vx),
        from = q.x - q.vx * dt;
      const targets = G.enemies
        .concat(G.props)
        .filter((e) => !e.dead)
        .map((e) => {
          if (e.T?.dragon) return [e, dragonZone(e, q.x - 20, q.x + 20, q.y, 22), q.x];
          const ahead = (e.x - from) * s,
            hit = Math.abs(e.y - q.y) < 22 && e.z < 120 && (q.x - e.x) * s >= 0 && ahead >= -e.w;
          return [e, hit ? 'body' : null, e.x];
        })
        .filter(([, zone]) => zone)
        .sort((a, b) => (a[2] - b[2]) * s);
      // her own grenade in the air, in the bullet's way before any enemy: it goes off up there
      const nade =
        !q.big &&
        G.projs.find(
          (n) =>
            n.k === 'nade' &&
            n.life > 0 &&
            Math.abs(n.y - q.y) < 26 &&
            Math.abs(n.z - q.z) < 45 &&
            (n.x - from) * s >= -12 &&
            (q.x - n.x) * s >= -12,
        );
      if (nade && (!targets.length || (nade.x - targets[0][2]) * s <= 0)) {
        nade.life = 0;
        explode(nade.x, nade.y, 'airburst', nade.z);
        styleGain(15);
        P.streak = Math.min(P.streak + 1, Math.round(LUCY.streakMax / LUCY.streak));
        targets.length = 0;
        q.x = nade.x;
        q.d = s;
        q.vx = 0;
        q.spent = 1;
        q.life = Math.min(q.life, dt * 0.5);
      }
      for (const [e, zone, at] of targets) {
        // the big gun's bullet goes on through, weaker each time: each one is hit once
        if (q.big && q.hit.has(e)) continue;
        const power = q.big ? q.power : 1,
          // a pistol hit may be a lucky one: the more hits in a row, the likelier
          lucky = !q.big && random() < Math.min(LUCY.streakMax, LUCY.streak * P.streak);
        if (
          hurtEnemy(
            e,
            (q.dmg ?? BULLET.dmg) *
              power *
              (lucky ? LUCY.crit : 1) *
              dmgMult() *
              headBonus(e, zone),
            Math.sign(q.vx),
            !!q.big,
            q.big ? 'punch' : 'bone',
          )
        ) {
          if (!e.isProp) {
            addRage(RAGE.bone);
            styleGain(8);
          }
          if (!q.big) {
            P.streak = Math.min(P.streak + 1, Math.round(LUCY.streakMax / LUCY.streak));
            if (lucky) {
              SFX.rank();
              G.parts.push({ k: 'neon', x: e.x, y: e.y - 200, t: 0, life: 0.63 });
            }
          }
          if (q.big) {
            q.hit.add(e);
            q.power = Math.max(0, power - BIG_GUN.loss);
            for (let k = 0; k < 10; k++)
              G.parts.push({
                k: 'dot',
                x: at,
                y: q.y - q.z + fxRnd(-8, 8),
                vx: s * fxRnd(-120, 260),
                vy: fxRnd(-220, 80),
                g: 500,
                t: 0,
                life: fxRnd(0.2, 0.4),
                s: fxRnd(2.5, 4.5),
                col: k % 2 ? '#ffe9a0' : '#ffb34a',
              });
            if (q.power > 1e-6) continue; // on it goes
          }
          // it stops in the enemy's middle and is drawn there for one last frame
          q.x = at;
          q.d = s;
          q.vx = 0;
          q.spent = 1;
          q.life = Math.min(q.life, dt * 0.5);
          for (let k = 0; k < 6; k++)
            G.parts.push({
              k: 'dot',
              x: q.x,
              y: q.y - q.z,
              vx: -s * fxRnd(40, 200),
              vy: fxRnd(-160, 60),
              g: 500,
              t: 0,
              life: 0.25,
              s: 3,
              col: '#ffe9a0',
            });
          break;
        }
      }
      // gone without hitting anything: a miss, and the run of hits is over
      if (!q.big && !q.spent && q.life <= 0) P.streak = 0;
    } else if (q.k === 'hado') {
      if (fxRandom() < 0.9)
        G.parts.push({
          k: 'glow',
          x: q.x - Math.sign(q.vx) * fxRnd(10, 40),
          y: q.y - q.z + fxRnd(-18, 18),
          vx: -q.vx * 0.15,
          vy: fxRnd(-30, 30),
          g: 0,
          t: 0,
          life: fxRnd(0.2, 0.4),
          s: fxRnd(2, 5),
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
      if (fxRandom() < 0.8)
        G.parts.push({
          k: 'glow',
          x: q.x - Math.sign(q.vx) * fxRnd(4, 14),
          y: q.y - q.z + fxRnd(-6, 6),
          vx: -q.vx * 0.1,
          vy: fxRnd(-20, 20),
          g: 0,
          t: 0,
          life: fxRnd(0.2, 0.35),
          s: fxRnd(2, 5),
          col: '#d7a8ff',
        });
      if (q.z <= 0) {
        q.life = 0;
        plasmaBlast(q);
      }
    } else if (q.k === 'nade') {
      // Lucy's grenade: an arc, spinning, and a blast where it lands
      q.vz -= GRENADE.g * dt;
      q.z += q.vz * dt;
      q.rot += dt * GRENADE.spin * Math.PI * 2 * Math.sign(q.vx || 1);
      // the screen's edges: it bounces back off them
      const lo = G.cam + 20,
        hi = G.cam + W - 20;
      if (q.x < lo || q.x > hi) {
        q.x = clamp(q.x, lo, hi);
        q.vx = -q.vx * 0.5;
      }
      floorClamp(q);
      if (q.z <= 0) {
        q.z = 0;
        if ((q.hops = (q.hops ?? 0) + 1) > GRENADE.bounces) {
          q.life = 0;
          explode(q.x, q.y, 'grenade');
        } else {
          // a little hop along the ground
          q.vz = -q.vz * GRENADE.bounce;
          q.vx *= GRENADE.roll;
          dust(q.x, q.y, 1);
        }
      }
    } else if (q.k === 'shell') {
      // a mortar shell of the Prospector: up in an arc, down on its marked spot, a blast
      q.t += dt;
      const u = Math.min(1, q.t / q.T);
      q.x = q.x0 + (q.tx - q.x0) * u;
      q.y = q.y0 + (q.ty - q.y0) * u;
      q.z = q.z0 * (1 - u) + 4 * q.h * u * (1 - u);
      // nose along its flight, on screen
      q.rot = Math.atan2(q.z0 - 4 * q.h * (1 - 2 * u), q.tx - q.x0 || 1);
      if (fxRandom() < 0.5)
        G.parts.push({
          k: 'smoke',
          x: q.x,
          y: q.y - q.z,
          vx: fxRnd(-15, 15),
          vy: fxRnd(-30, 0),
          g: 0,
          t: 0,
          life: fxRnd(0.4, 0.7),
          s: fxRnd(5, 8),
        });
      if (u >= 1) {
        q.life = 0;
        explode(q.tx, q.ty, 'mortar');
      }
    } else if (q.k === 'tnt') {
      // a lit stick of dynamite: it flies, bounces, lies there and blows up
      q.fuse -= dt;
      if (q.z > 0 || q.vz > 0) {
        q.y += q.vy * dt;
        q.vz -= DYNAMITE.g * dt;
        q.z += q.vz * dt;
        q.rot += dt * 14 * Math.sign(q.vx || 1);
        if (q.z <= 0) {
          q.z = 0;
          q.vz = Math.abs(q.vz) > 160 ? -q.vz * 0.3 : 0;
          q.vx *= 0.35;
          q.vy *= 0.35;
        }
      } else q.vx *= Math.pow(0.02, dt);
      floorClamp(q);
      if (fxRandom() < 0.6)
        G.parts.push({
          k: 'dot',
          x: q.x + Math.cos(q.rot) * 14,
          y: q.y - q.z - 6 + Math.sin(q.rot) * 14,
          vx: fxRnd(-50, 50),
          vy: fxRnd(-120, -40),
          g: 300,
          t: 0,
          life: 0.25,
          s: 2.5,
          col: '#ffcf5a',
        });
      if (q.fuse <= 0) {
        q.life = 0;
        explode(q.x, q.y, 'dynamite');
      }
    } else if (q.k === 'zspit') {
      // a zombie spat out by the slime: it lands, and gets up to fight
      q.rot += dt * 10 * Math.sign(q.vx);
      q.y += q.vy * dt;
      q.vz -= ACID.g * dt;
      q.z += q.vz * dt;
      if (fxRandom() < 0.6)
        G.parts.push({
          k: 'dot',
          x: q.x,
          y: q.y - q.z,
          vx: fxRnd(-40, 40),
          vy: fxRnd(10, 60),
          g: 600,
          t: 0,
          life: 0.4,
          s: fxRnd(3, 5),
          col: '#9dff4a',
        });
      if (!q.hitP && Math.abs(P.x - q.x) < 30 && Math.abs(P.y - q.y) < 22 && q.z < 130 && P.z < 110)
        q.hitP = hitPlayer(10, Math.sign(q.vx), true);
      if (q.z <= 0) {
        q.life = 0;
        SFX.splash();
        const o = { x: q.x, y: q.y };
        floorClamp(o);
        const e = spawn(q.kind, 0, o.x, o.y);
        Object.assign(e, { state: 'down', t: 0.2, fromSlime: true, face: P.x >= o.x ? 1 : -1 });
      }
    } else if (q.k === 'acid') {
      // The necromancer's acid ball: flies in an arc and leaves a puddle where it lands.
      q.rot += dt;
      q.y += q.vy * dt;
      q.vz -= ACID.g * dt;
      q.z += q.vz * dt;
      if (fxRandom() < 0.5)
        G.parts.push({
          k: 'dot',
          x: q.x - Math.sign(q.vx) * fxRnd(6, 16),
          y: q.y - q.z + fxRnd(-6, 6),
          vx: -q.vx * 0.1,
          vy: fxRnd(10, 60),
          g: 300,
          t: 0,
          life: fxRnd(0.2, 0.4),
          s: fxRnd(2, 4),
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
              vx: fxRnd(-200, 200),
              vy: fxRnd(-260, -40),
              g: 700,
              t: 0,
              life: fxRnd(0.3, 0.55),
              s: fxRnd(3, 6),
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
            vx: fxRnd(-160, 160),
            vy: fxRnd(-220, -60),
            g: 700,
            t: 0,
            life: fxRnd(0.3, 0.5),
            s: fxRnd(3, 5),
            col: '#9dff4a',
          });
      }
      if (q.x < G.cam - 100 || q.x > G.cam + W + 100) q.life = 0;
    } else if (q.k === 'ehado') {
      // Raithwyn's own dark ball (the boss): it hurts the player, and her skeleton too
      if (fxRandom() < 0.9)
        G.parts.push({
          k: 'glow',
          x: q.x - Math.sign(q.vx) * fxRnd(10, 40),
          y: q.y - q.z + fxRnd(-18, 18),
          vx: -q.vx * 0.15,
          vy: fxRnd(-30, 30),
          g: 0,
          t: 0,
          life: fxRnd(0.2, 0.4),
          s: fxRnd(2, 5),
          col: PURPLE,
        });
      const r = [34, 50, 74][q.lv - 1],
        dy = [26, 36, 56][q.lv - 1];
      if (!q.hitP && Math.abs(P.x - q.x) < r && Math.abs(P.y - q.y) < dy && P.z < 130)
        if (evilHitP(q.owner, q.dmg, Math.sign(q.vx), q.lv > 1)) {
          q.hitP = true;
          if (q.lv < 3) q.life = 0;
        }
      for (const d of dandies())
        if (!q.hit.has(d) && Math.abs(d.x - q.x) < d.w + r && Math.abs(d.y - q.y) < dy) {
          q.hit.add(d);
          evilHurt(d, q.dmg * 2, Math.sign(q.vx), true);
        }
      if (q.x < G.cam - 120 || q.x > G.cam + W + 120) q.life = 0;
    } else {
      // an enemy's bone; Raithwyn's (with an owner) may drift in depth and hits her skeleton
      q.rot += dt * 16 * Math.sign(q.vx);
      q.y += (q.vy ?? 0) * dt;
      if (Math.abs(P.x - q.x) < 24 && Math.abs(P.y - q.y) < 19 && P.z < 95) {
        const dmg = q.dmg ?? 7;
        if (
          q.owner
            ? evilHitP(q.owner, dmg, Math.sign(q.vx), false)
            : hitPlayer(dmg, Math.sign(q.vx), false)
        )
          q.life = 0;
      }
      if (q.owner)
        for (const d of dandies())
          if (q.life > 0 && Math.abs(d.x - q.x) < d.w + 16 && Math.abs(d.y - q.y) < 22) {
            evilHurt(d, q.dmg ?? 7, Math.sign(q.vx), false);
            q.life = 0;
          }
      if (q.x < G.cam - 100 || q.x > G.cam + W + 100) q.life = 0;
    }
  }
  G.projs = G.projs.filter((q) => q.life > 0);
  // acid puddles bite the player standing in them
  // and the Prospector's fire on the ground burns her
  let inAcid = false,
    inFire = false;
  for (const a of G.pools) {
    a.t += dt;
    const R = a.fire ? PROS.fire : ACID,
      ex = (P.x - a.x) / R.rx,
      ey = (P.y - a.y) / R.ry;
    if (a.t < a.life - 0.3 && ex * ex + ey * ey < 1 && P.z < 8) {
      if (a.fire) inFire = true;
      else inAcid = true;
    }
  }
  G.pools = G.pools.filter((a) => a.t < a.life);
  if (!inAcid) P.acidT = 0.15;
  else if ((P.acidT -= dt) <= 0) {
    P.acidT = ACID.tick;
    acidBite(ACID.dmg);
  }
  if (!inFire) P.fireT = 0.1;
  else if ((P.fireT -= dt) <= 0) {
    P.fireT = PROS.fire.tick;
    acidBite(PROS.fire.dmg, true);
  }
  updFuses(dt);
  G.enemies = G.enemies.filter((e) => !e.dead);
  G.props = G.props.filter((e) => !e.dead);
  if (G.lastFoe && G.lastFoe.dead && G.lastFoeT > 1) G.lastFoeT = 1;
  // G.items
  for (const it of G.items) {
    it.t += dt;
    it.vz -= 900 * dt;
    it.z += it.vz * dt;
    if (it.vx && it.z > 0) {
      // flung out of an enemy; the screen's edges throw it back
      it.x += it.vx * dt;
      const lo = G.cam + 24,
        hi = G.cam + W - 24;
      if (it.x < lo || it.x > hi) {
        it.x = clamp(it.x, lo, hi);
        it.vx = -it.vx * 0.6;
      }
    }
    // a magazine does not lie about for long
    if (it.kind === 'ammo' && it.z <= 0 && (it.lie = (it.lie ?? 0) + dt) > LUCY.lies)
      it.dead = true;
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
        P.hp = Math.min(P.maxHp, P.hp + 35);
        floatTxt(it.x, it.y - 120, t('plusHp'), '#ff8f9d');
      } else if (it.kind === 'ammo') {
        P.ammo = LUCY.ammo;
        floatTxt(it.x, it.y - 120, t('plusAmmo'), '#ffd76a');
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
      if (Math.abs(d.vx) > 90 && fxRandom() < 0.5)
        G.parts.push({
          k: 'dot',
          x: d.x,
          y: d.gy - 4,
          vx: -d.vx * 0.3 + fxRnd(-60, 60),
          vy: fxRnd(-160, -40),
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
