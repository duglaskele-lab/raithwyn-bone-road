// Enemy spawning and AI state machines for every skeleton type.
import { CHAIN, GB, GT, RW, SLAM_R, TAU, TYPES, W } from './config.js';
import { clamp, rnd } from './util.js';
import { G, P } from './state.js';
import { SFX } from './audio.js';
import { dust } from './fx.js';
import { hitPlayer } from './combat.js';

export function spawn(type, side, x, y) {
  const T = TYPES[type];
  if (x === undefined) {
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
    slamCd: rnd(1.5, 3),
    chCd: rnd(2, 4),
    mounted: false,
    rdir: 1,
    slammed: false,
    vyd: 0,
    rev: 0,
  };
  if (type === 'biker') {
    const d = side < 0 ? 1 : -1;
    e.state = 'ride';
    e.mounted = true;
    e.rdir = e.face = d;
    e.x = d > 0 ? G.cam - 150 : G.cam + W + 150;
    e.y = clamp(P.y, GT + 8, GB - 4);
    e.w = 32;
  }
  if (e.state === 'rise') {
    SFX.rise();
  }
  if (type === 'boss') {
    e.x = G.cam + W - 230;
    e.y = GT + 70;
    e.face = -1;
    SFX.boss();
    G.banner = { a: 'Могильный барон', b: 'Хозяин тракта', t: 0 };
    G.shake = 8;
  }
  G.enemies.push(e);
  return e;
}
export function updEnemy(e, dt, ctxE) {
  const T = e.T;
  e.t += dt;
  e.anim += dt;
  e.flash -= dt;
  e.cd -= dt;
  e.slamCd -= dt;
  e.chCd -= dt;
  e.armor -= dt;
  e.moving = false;
  const dx = P.x - e.x,
    dy = P.y - e.y,
    adx = Math.abs(dx);
  const pdown = ['ko', 'down', 'getup', 'dead', 'win'].includes(P.state);
  const moveTo = (tx, ty, sp) => {
    tx = clamp(tx, G.cam + 40, G.cam + W - 40);
    ty = clamp(ty, GT + 4, GB - 2);
    const a = tx - e.x,
      b = ty - e.y,
      d = Math.hypot(a, b);
    if (d > 6) {
      e.x += (a / d) * sp * dt;
      e.y += (b / d) * sp * 0.75 * dt;
      e.moving = true;
      e.walkT += (dt * sp * 0.085) / Math.sqrt(T.scale);
    }
  };
  switch (e.state) {
    case 'rise':
      if (Math.random() < 0.5)
        G.parts.push({
          k: 'dust',
          x: e.x + rnd(-22, 22),
          y: e.y + rnd(-2, 4),
          vx: rnd(-50, 50),
          vy: rnd(-110, -30),
          g: 260,
          t: 0,
          life: rnd(0.3, 0.5),
          s: rnd(3, 7),
          col: '#4d6661',
        });
      e.face = dx >= 0 ? 1 : -1;
      if (e.t > (e.type === 'boss' ? 1.6 : 0.9)) {
        e.state = 'chase';
        e.t = 0;
      }
      break;
    case 'chase': {
      e.face = dx >= 0 ? 1 : -1;
      const side = e.x >= P.x ? 1 : -1;
      if (e.type === 'boss') {
        if (e.hp < T.hp * e.next) {
          e.next -= 0.33;
          e.state = 'summon';
          e.t = 0;
          SFX.boss();
          break;
        }
        if (e.cd <= 0 && adx > 270 && Math.abs(dy) < 60 && !pdown && Math.random() < dt * 1.6) {
          e.state = 'cwind';
          e.t = 0;
          break;
        }
      }
      if (T.fat && e.slamCd <= 0 && adx < 200 && Math.abs(dy) < 80 && !pdown) {
        e.state = 'swind';
        e.t = 0;
        e.engage = false;
        break;
      }
      if (
        T.rocker &&
        e.chCd <= 0 &&
        adx > 170 &&
        adx < CHAIN - 10 &&
        Math.abs(dy) < 18 &&
        !pdown &&
        P.inv <= 0
      ) {
        e.state = 'chwind';
        e.t = 0;
        e.engage = false;
        break;
      }
      if (T.keep) {
        if (
          !pdown &&
          e.cd <= 0 &&
          Math.abs(dy) < 15 &&
          adx > 150 &&
          e.x > G.cam + 25 &&
          e.x < G.cam + W - 25
        ) {
          e.state = 'windup';
          e.t = 0;
          break;
        }
        moveTo(P.x + side * T.keep, P.y, T.speed);
      } else {
        if (pdown) e.engage = false;
        else if (!e.engage && e.cd <= 0 && (ctxE.n < 2 || e.type === 'boss')) {
          e.engage = true;
          ctxE.n++;
        }
        if (e.engage) {
          if (adx < T.reach && Math.abs(dy) < 15) {
            e.state = 'windup';
            e.t = 0;
            break;
          }
          if (T.monkey && adx > 110 && adx < 340 && Math.abs(dy) < 34) {
            e.state = 'lwind';
            e.t = 0;
            break;
          }
          moveTo(P.x + side * (T.monkey ? 215 : T.reach * 0.72), P.y, T.speed);
        } else {
          e.oyT -= dt;
          if (e.oyT <= 0) {
            e.oyT = rnd(1, 2.2);
            e.oy = rnd(-75, 75);
            e.ox = rnd(80, 190);
          }
          moveTo(P.x + side * (T.reach + e.ox), P.y + e.oy, T.speed * 0.8);
        }
      }
      break;
    }
    case 'windup':
      if (e.t > T.wind) {
        e.state = 'attack';
        e.t = 0;
        e.hitDone = false;
        SFX.swing();
        if (T.style === 'throw')
          G.projs.push({
            k: 'ebone',
            x: e.x + e.face * 34,
            y: e.y,
            z: 108 * T.scale,
            vx: e.face * 340,
            rot: 0,
            life: 3,
          });
      }
      break;
    case 'attack':
      if (T.style !== 'throw' && !e.hitDone) {
        const f = (P.x - e.x) * e.face;
        if (f > -14 && f < T.reach + 20 && Math.abs(dy) < 24 && P.z < (T.knock ? 120 : 70)) {
          e.hitDone = true;
          hitPlayer(T.dmg, e.face, T.knock);
        }
        if (T.style === 'smash' && e.t > 0.06) {
          e.hitDone = true;
          dust(e.x + e.face * T.reach * 0.8, e.y, 6);
          G.shake = Math.max(G.shake, 6);
          SFX.thud();
        }
      }
      if (e.t > T.act) {
        e.state = 'recover';
        e.t = 0;
      }
      break;
    case 'recover':
      if (e.t > T.rec) {
        e.state = 'chase';
        e.engage = false;
        e.slammed = false;
        e.cd = rnd(T.cd[0], T.cd[1]);
      }
      break;
    case 'swind': {
      e.face = dx >= 0 ? 1 : -1;
      const h = e.t - 0.55;
      e.z = h > 0 ? Math.sin(Math.min(1, h / 0.35) * Math.PI) * 60 : 0;
      if (e.t >= 0.9) {
        e.z = 0;
        e.state = 'recover';
        e.t = -0.5;
        e.slammed = true;
        e.slamCd = rnd(4.5, 7);
        SFX.heavy();
        SFX.thud();
        G.shake = Math.max(G.shake, 12);
        G.parts.push({ k: 'gring', x: e.x, y: e.y, t: 0, life: 0.4, s: SLAM_R, col: '#ffe2b0' });
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU;
          dust(e.x + Math.cos(a) * SLAM_R * 0.8, e.y + Math.sin(a) * SLAM_R * 0.29, 1);
        }
        const ex = (P.x - e.x) / SLAM_R,
          ey = (P.y - e.y) / (SLAM_R * 0.36);
        if (ex * ex + ey * ey < 1 && P.z < 24) hitPlayer(16, P.x >= e.x ? 1 : -1, true);
      }
      break;
    }
    case 'lwind':
      e.face = dx >= 0 ? 1 : -1;
      if (e.t > 0.3) {
        e.state = 'leap';
        e.t = 0;
        e.hitDone = false;
        e.vx = clamp(dx / 0.72, -480, 480);
        e.vyd = clamp(dy / 0.72, -80, 80);
        e.vz = 540;
        SFX.jump();
      }
      break;
    case 'leap':
      e.x += e.vx * dt;
      e.y += e.vyd * dt;
      e.vz -= 1500 * dt;
      e.z += e.vz * dt;
      if (
        !e.hitDone &&
        Math.abs(P.x - e.x) < 40 &&
        Math.abs(P.y - e.y) < 24 &&
        Math.abs(P.z - e.z) < 95
      ) {
        e.hitDone = true;
        hitPlayer(T.dmg, Math.sign(e.vx) || 1, false);
      }
      if (e.z <= 0 && e.vz < 0) {
        e.z = 0;
        e.state = 'recover';
        e.t = 0;
        dust(e.x, e.y, 3);
      }
      break;
    case 'ride':
      if (e.t < RW) {
        e.x = e.rdir > 0 ? G.cam - 150 : G.cam + W + 150;
        e.y += clamp(P.y - e.y, -1, 1) * 170 * dt;
        if (!e.rev && e.t > 0.12) {
          e.rev = 1;
          SFX.engine();
        }
      } else {
        e.x += e.rdir * 560 * dt;
        if (Math.random() < 0.7)
          G.parts.push({
            k: 'dust',
            x: e.x - e.rdir * 58,
            y: e.y - 26 + rnd(-4, 4),
            vx: -e.rdir * 70,
            vy: -30,
            g: -40,
            t: 0,
            life: 0.4,
            s: rnd(4, 8),
            col: '#d5dcdc',
          });
        if (!e.hitDone && Math.abs(P.x - e.x) < 58 && Math.abs(P.y - e.y) < 22 && P.z < 46) {
          if (hitPlayer(14, e.rdir, true)) e.hitDone = true;
        }
        if ((e.rdir > 0 && e.x > G.cam + W + 150) || (e.rdir < 0 && e.x < G.cam - 150)) {
          e.rdir *= -1;
          e.face = e.rdir;
          e.t = 0;
          e.rev = 0;
          e.hitDone = false;
        }
      }
      break;
    case 'chwind':
      e.face = dx >= 0 ? 1 : -1;
      if (e.t > 0.55) {
        e.state = 'chain';
        e.t = 0;
        e.hitDone = false;
        SFX.swing();
      }
      break;
    case 'chain': {
      const tip = Math.min(CHAIN, e.t * 1150);
      if (
        dx * e.face > 0 &&
        adx <= tip + 10 &&
        adx > 40 &&
        Math.abs(dy) < 22 &&
        P.z < 70 &&
        P.inv <= 0 &&
        G.state === 'play' &&
        !['ko', 'down', 'getup', 'dead', 'win', 'pulled'].includes(P.state)
      ) {
        P.state = 'pulled';
        P.puller = e;
        P.t = 0;
        P.z = 0;
        P.vz = 0;
        P.buf = null;
        e.state = 'pull';
        e.t = 0;
        e.chCd = rnd(4, 6);
        SFX.clack();
        SFX.clack();
        G.shake = Math.max(G.shake, 4);
      } else if (e.t > CHAIN / 1150 + 0.18) {
        e.state = 'recover';
        e.t = 0;
        e.chCd = rnd(3.5, 5.5);
      }
      break;
    }
    case 'pull':
      if (P.state !== 'pulled' || P.puller !== e) {
        e.state = 'recover';
        e.t = 0;
      }
      break;
    case 'hurt':
      e.x += e.vx * dt;
      e.vx *= Math.pow(0.01, dt);
      if (e.t > 0.32) {
        e.state = 'chase';
        e.t = 0;
      }
      break;
    case 'air':
      e.x += e.vx * dt;
      e.vz -= 1500 * dt;
      e.z += e.vz * dt;
      if (e.z <= 0) {
        e.z = 0;
        e.state = 'down';
        e.t = 0;
        dust(e.x, e.y, 6);
        SFX.thud();
        SFX.clack();
        G.shake = Math.max(G.shake, 4);
      }
      break;
    case 'down':
      if (e.t > 0.75) {
        e.state = 'getup';
        e.t = 0;
      }
      break;
    case 'getup':
      if (e.t > 0.45) {
        e.state = 'chase';
        e.t = 0;
        e.cd = Math.max(e.cd, 0.5);
      }
      break;
    case 'cwind':
      e.face = dx >= 0 ? 1 : -1;
      if (e.t > 0.75) {
        e.state = 'charge';
        e.t = 0;
        e.hitDone = false;
        SFX.hado();
      }
      break;
    case 'charge':
      e.x += e.face * 560 * dt;
      e.y += clamp(dy, -1, 1) * 40 * dt;
      e.moving = true;
      e.walkT += dt * 17;
      if (Math.random() < 0.5) dust(e.x - e.face * 20, e.y, 1);
      if (!e.hitDone && adx < 64 && Math.abs(dy) < 26) {
        e.hitDone = true;
        hitPlayer(T.dmg, e.face, true);
      }
      if (e.t > 0.8 || e.x < G.cam + 70 || e.x > G.cam + W - 70) {
        e.state = 'recover';
        e.t = -0.35;
        e.cd = rnd(1.2, 2);
      }
      break;
    case 'summon':
      if (e.t > 0.6 && !e.hitDone) {
        e.hitDone = true;
        const a = e.next > 0.3 ? ['grunt', 'monkey'] : ['monkey', 'thrower', 'grunt'];
        for (const t of a) spawn(t, 0);
        G.flash = 0.15;
      }
      if (e.t > 1.2) {
        e.state = 'chase';
        e.t = 0;
        e.hitDone = false;
        e.cd = 0.6;
      }
      break;
  }
  e.y = clamp(e.y, GT + 2, GB);
  if (e.state === 'air' || e.state === 'hurt' || e.state === 'charge' || e.state === 'leap')
    e.x = clamp(e.x, G.cam + 24, G.cam + W - 24);
}
