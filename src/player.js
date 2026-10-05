// Raithwyn: movement, combo, air punch, bone throw, hadouken, super attack, getting hit.
import {
  BONE_COST,
  D,
  HADO,
  RAGE,
  GB,
  GT,
  MAXR,
  RL,
  RUN_FRAME,
  SUPER_HOLD,
  W,
  WAVES,
  ZOMBIE,
} from './config.js';
import { clamp, random, tl } from './util.js';
import { G, P } from './state.js';
import { keys, pressed } from './input.js';
import { SFX } from './audio.js';
import { dust, motes } from './fx.js';
import { floorClamp, viewClamp } from './level.js';
import { hadoLevel, strike, superNova } from './combat.js';

export function toIdle() {
  P.state = 'idle';
  P.t = 0;
  P.an = ['idle', 0];
}
export function startAtk(mx) {
  const p = P;
  p.buf = null;
  if (mx) p.face = mx;
  if (p.comboT <= 0) p.combo = 0;
  const fin = p.combo >= 2;
  p.state = fin ? 'atk2' : 'atk1';
  p.t = 0;
  p.hit = new Set();
  p.sw = 0;
  p.combo = fin ? 0 : p.combo + 1;
  p.comboT = 0.7;
}
/** The hidden motion before L: down, down, then toward the throw (S S D or S S A). 1/-1 or 0. */
function hadoMotion(seq) {
  if (seq.length < 3 || G.time - seq[0].t > HADO.motion) return 0;
  const [a, b, c] = seq.map((s) => s.a);
  return a === 'd' && b === 'd' ? (c === 'r' ? 1 : c === 'l' ? -1 : 0) : 0;
}

// The dark ball of level p.hl leaves her hands: its rage is spent now.
function throwHado(p) {
  p.rage -= RL[p.hl - 1];
  p.state = 'hado';
  p.t = 0;
  p.sw = 0;
  p.inv = Math.max(p.inv, 0.35);
}
export function updPlayer(dt) {
  const p = P;
  p.t += dt;
  if (p.inv > 0) p.inv -= dt;
  p.comboT -= dt;
  p.boneCd -= dt;
  p.bufT -= dt;
  p.hpLag += (p.hp - p.hpLag) * Math.min(1, dt * 3);
  const mx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0),
    my = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
  // the last direction presses, for the hidden dark ball motion (see HADO)
  for (const a of ['u', 'd', 'l', 'r'])
    if (pressed[a]) p.seq = [...p.seq, { a, t: G.time }].slice(-3);
  // a slide across the dark ball's button on a touch screen: the hidden move, that way
  if (pressed.hadoR || pressed.hadoL) {
    p.buf = 'hado';
    p.bufT = 0.2;
    p.bufDir = pressed.hadoR ? 1 : -1;
    p.seq = [];
  }
  for (const a of ['atk', 'jump', 'bone', 'hado', 'super'])
    if (pressed[a]) {
      p.buf = a;
      p.bufT = 0.2;
      if (a === 'hado') {
        p.bufDir = hadoMotion(p.seq);
        p.seq = [];
      }
    }
  if (!mx) G.runLatch = false;
  switch (p.state) {
    case 'idle':
    case 'walk':
    case 'run': {
      const run = (keys.run || G.runLatch) && mx !== 0,
        sp = run ? 435 : 180;
      if (mx) p.face = mx;
      p.x += mx * sp * dt;
      p.y += my * (run ? 150 : 128) * dt;
      const ns = mx || my ? (run ? 'run' : 'walk') : 'idle';
      if (ns !== p.state) {
        p.state = ns;
        p.t = 0;
      }
      p.an =
        ns === 'idle'
          ? ['idle', 0]
          : ns === 'walk'
            ? ['walk', Math.floor(p.t / 0.085) % 8]
            : ['run', Math.floor(p.t / RUN_FRAME) % 6];
      if (
        ns === 'run' &&
        Math.floor(p.t / (RUN_FRAME * 3)) !== Math.floor((p.t - dt) / (RUN_FRAME * 3))
      )
        dust(p.x - p.face * 14, p.y, 1);
      const b = p.bufT > 0 ? p.buf : null;
      if (b === 'jump') {
        p.buf = null;
        p.state = 'jump';
        p.t = 0;
        p.ph = 0;
        p.vx = mx * sp;
        p.vyd = my * 70;
        p.airT = null;
        p.airUsed = 0;
      } else if (b === 'atk') startAtk(mx);
      else if (b === 'bone' && p.boneCd <= 0) {
        p.buf = null;
        if (p.rage >= BONE_COST) {
          p.rage -= BONE_COST;
          p.state = 'throw';
          p.t = 0;
          p.sw = 0;
          p.boneCd = 0.5;
        } else {
          SFX.deny();
        }
      } else if (b === 'super') {
        p.buf = null;
        if (p.rage < MAXR) {
          SFX.deny();
        } else if (keys.super) {
          // Charging: rage is only spent when the blast goes off, so a hit here costs nothing.
          p.state = 'super';
          p.t = 0;
          p.sup = 0;
          p.sw = 0;
        }
      } else if (b === 'hado') {
        p.buf = null;
        const most = hadoLevel(p.rage);
        if (!most) SFX.deny();
        else {
          // a plain L throws level I; the hidden motion throws the strongest the rage pays for
          p.hl = p.bufDir ? most : 1;
          if (p.bufDir) p.face = p.bufDir;
          throwHado(p);
        }
      }
      break;
    }
    case 'jump':
      if (p.ph === 0) {
        p.an = ['jump', 0];
        if (p.t > 0.06) {
          p.ph = 1;
          p.vz = 660;
          SFX.jump();
        }
      } else if (p.ph === 1) {
        p.vz -= 1900 * dt;
        p.z += p.vz * dt;
        p.x += p.vx * dt;
        p.y += p.vyd * dt;
        p.an = ['jump', p.vz > 230 ? 1 : p.vz > -230 ? 2 : 3];
        if (!p.airUsed && p.buf === 'atk' && p.bufT > 0) {
          p.buf = null;
          p.airUsed = 1;
          p.airT = 0;
          p.hit = new Set();
          SFX.swing();
        }
        if (p.airT !== null && p.airT < 0.3) {
          p.an = ['punch2', p.airT < 0.07 ? 1 : 2];
          p.airT += dt;
          strike({ x0: 0, x1: 122, dy: 28, dmg: 12, knock: true, rage: RAGE.air, src: 'air' });
        }
        if (p.z <= 0) {
          p.z = 0;
          p.ph = 2;
          p.t = 0;
          dust(p.x, p.y, 4);
        }
      } else {
        p.an = ['jump', 4];
        if (p.t > 0.07) toIdle();
      }
      break;
    case 'atk1': {
      const i = tl(D.atk1, p.t);
      if (i < 0) {
        toIdle();
        break;
      }
      p.an = ['punch1', i];
      if (i === 2) {
        p.x += p.face * 70 * dt;
        if (!p.sw) {
          p.sw = 1;
          SFX.swing();
        }
        strike({ x0: 0, x1: 100, dy: 27, dmg: 8, knock: false, rage: RAGE.punch });
      }
      if (i >= 3 && p.buf === 'atk' && p.bufT > 0) startAtk(mx);
      break;
    }
    case 'atk2': {
      const i = tl(D.atk2, p.t);
      if (i < 0) {
        toIdle();
        break;
      }
      p.an = ['punch2', i];
      if (i === 1 || i === 2) {
        p.x += p.face * 130 * dt;
        if (!p.sw) {
          p.sw = 1;
          SFX.swing();
        }
        // with up held the finisher is a launcher: it throws the enemy up, not away
        strike({
          x0: 0,
          x1: 124,
          dy: 28,
          dmg: 16,
          knock: true,
          rage: RAGE.finisher,
          launch: !!keys.u,
        });
      }
      break;
    }
    case 'throw': {
      const i = tl(D.thr, p.t);
      if (i < 0) {
        toIdle();
        break;
      }
      p.an = ['throw', i];
      if (i >= 2 && !p.sw) {
        p.sw = 1;
        SFX.swing();
        G.projs.push({
          k: 'bone',
          x: p.x + p.face * 62,
          y: p.y,
          z: 116,
          vx: p.face * 650,
          rot: 0,
          life: 1.05,
        });
      }
      break;
    }
    case 'hado': {
      const i = tl(D.hado, p.t);
      if (i < 0) {
        toIdle();
        break;
      }
      p.an = ['hado', i];
      if (i >= 1 && i <= 3 && random() < 0.6)
        motes(p.x + p.face * (i === 1 ? 40 : 150), p.y - 102, 1, 90);
      if (i >= 4 && !p.sw) {
        p.sw = 1;
        SFX.hado();
        G.shake = 5 * p.hl;
        if (p.hl === 3) {
          SFX.nova();
          G.flash = 0.25;
        }
        G.projs.push({
          k: 'hado',
          lv: p.hl,
          x: p.x + p.face * (150 + 20 * p.hl),
          y: p.y,
          z: 104,
          vx: p.face * 660,
          life: 2.4,
          hit: new Set(),
        });
      }
      break;
    }
    case 'super': {
      if (!p.sw) {
        // Letting go of I early calls the charge off.
        if (!keys.super) {
          toIdle();
          break;
        }
        p.sup = Math.min(1, p.t / SUPER_HOLD);
        p.an = ['orb', Math.min(5, Math.floor(p.sup * 6))];
        if (random() < 0.3 + 0.6 * p.sup) motes(p.x + p.face * 52, p.y - 112, 1, 60 + 140 * p.sup);
        if (p.t >= SUPER_HOLD) {
          p.sw = 1;
          p.t = 0;
          p.rage = 0;
          p.inv = Math.max(p.inv, 0.7);
          superNova();
        }
      } else {
        p.an = ['orb', 6];
        if (p.t > 0.45) toIdle();
      }
      break;
    }
    case 'grabbed': {
      // held by a zombie: stuck until the hold runs out; mashing buttons breaks free sooner
      const e = p.grabber;
      p.an = ['hurt', p.t % 0.3 < 0.15 ? 0 : 1];
      p.buf = null;
      for (const a of ['atk', 'jump', 'bone', 'hado', 'l', 'r'])
        if (pressed[a]) p.hold -= ZOMBIE.mash;
      if (!e || e.dead || e.state !== 'grab' || p.t > p.hold) {
        p.grabber = null;
        toIdle();
        p.inv = Math.max(p.inv, 0.5);
        if (e && !e.dead && e.state === 'grab') {
          e.state = 'recover';
          e.t = 0;
          e.x -= e.face * 20;
        }
      }
      break;
    }
    case 'pulled': {
      const e = p.puller;
      p.an = ['hurt', 0];
      if (!e || e.dead || e.state !== 'pull' || p.t > 1.4) {
        p.puller = null;
        toIdle();
        break;
      }
      const d = e.x - p.x;
      p.face = d >= 0 ? 1 : -1;
      p.x += Math.sign(d) * Math.min(Math.abs(d), 740 * dt);
      p.y += clamp(e.y - p.y, -220 * dt, 220 * dt);
      if (random() < 0.5) dust(p.x, p.y, 1);
      if (Math.abs(e.x - p.x) < 82) {
        p.puller = null;
        toIdle();
        e.state = 'windup';
        e.t = e.T.wind - 0.14;
      }
      break;
    }
    case 'hurt':
      p.x += p.vx * dt;
      p.vx *= Math.pow(0.02, dt);
      p.an = ['hurt', p.t < 0.12 ? 0 : 1];
      if (p.t > 0.3) toIdle();
      break;
    case 'ko':
      p.vz -= 1500 * dt;
      p.z += p.vz * dt;
      p.x += p.vx * dt;
      p.an = ['ko', p.t < 0.08 ? 0 : p.vz > 0 ? 1 : 2];
      if (p.z <= 0 && p.vz < 0) {
        p.z = 0;
        p.state = 'down';
        p.t = 0;
        SFX.thud();
        dust(p.x, p.y, 7);
        G.shake = Math.max(G.shake, 5);
      }
      break;
    case 'down':
      p.an = ['ko', p.t < 0.1 ? 3 : p.t < 0.2 ? 4 : 5];
      if (p.t < 0.2) p.x += p.vx * 0.4 * dt;
      if (p.t > (p.hp <= 0 ? 1.2 : 0.65)) {
        if (p.hp <= 0) {
          if (p.lives > 0) {
            p.lives--;
            p.hp = 100;
            p.rage = Math.max(p.rage, RAGE.revive);
            p.rev = 1;
            p.state = 'getup';
            p.t = 0;
          } else {
            p.state = 'dead';
            G.state = 'over';
            G.endT = 0;
          }
        } else {
          p.rev = 0;
          p.state = 'getup';
          p.t = 0;
        }
      }
      break;
    case 'getup':
      p.an = ['ko', p.t < 0.1 ? 4 : 3];
      if (p.t > 0.24) {
        toIdle();
        p.inv = p.rev ? 2.6 : 1.1;
      }
      break;
    case 'dead':
      p.an = ['ko', 5];
      break;
    case 'win':
      p.an = ['laugh', [0, 1, 2, 1, 2, 1, 2, 1][Math.floor(p.t / 0.13) % 8]]; // never frame 3
      break;
  }
  if (G.level === 2) {
    // Old Quarry: on the floor and on screen (the camera comes along between fights)
    floorClamp(p);
    viewClamp(p);
    floorClamp(p);
  } else {
    const maxX = G.wave || G.waveI >= WAVES.length ? G.cam + W - 30 : G.cam + W + 200;
    p.x = clamp(p.x, G.cam + 30, Math.min(maxX, WAVES[WAVES.length - 1].x + W - 30));
    p.y = clamp(p.y, GT, GB);
  }
}
