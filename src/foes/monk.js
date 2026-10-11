// Jawacorp's omnic monk (TYPES.monk, MONK): a robot in a saffron robe, floating cross-legged, a
// ring of orbs round its neck and a row of blue lights on its brow. It keeps behind the others
// and puts shields of light on them, one at a time: a shielded robot takes only a third of the
// harm of a blow for a while (a crushing blow ends the shield). Beat it first.
import { MONK, OL, TAU } from '../config.js';
import { rnd } from '../util.js';
import { APP, G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { inView } from '../level.js';
import { defineFoe } from './registry.js';
import { faceP, go, moveTo } from './kit.js';
import { isRobot, robotDie } from './robot.js';

const float = (e) => go(e, 'mfloat', 0, { engage: false });
/** Its next ward: the nearest robot on screen without a shield (never itself). */
function ward(e) {
  let best = null,
    bd = Infinity;
  for (const o of G.enemies) {
    if (o === e || o.dying || o.dead || !isRobot(o) || o.type === 'monk') continue;
    if ((o.orbUntil ?? 0) > G.time || !inView(o.x, o.y)) continue;
    const d = Math.abs(o.x - e.x) + Math.abs(o.y - e.y);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}

export default defineFoe('monk', {
  walksIn: true,
  init: { castCd: [1.5, 3] },
  timers: ['castCd'],
  moves: [{ when: () => true, go: float }],
  attacks: ['mcast'],
  die: robotDie,
  states: {
    mfloat(e, dt) {
      faceP(e);
      const side = e.x >= P.x ? 1 : -1;
      moveTo(e, P.x + side * MONK.keep, P.y + Math.sin(e.anim * 0.7) * 40, e.T.speed, dt);
      e.moving = false;
      const o = e.castCd <= 0 && ward(e);
      if (o) {
        go(e, 'mcast', 0, { ward: o });
        SFX.rise();
      }
    },
    mcast(e) {
      const o = e.ward;
      e.face = o.x >= e.x ? 1 : -1;
      if (o.dead || o.dying) {
        e.castCd = 1;
        float(e);
      } else if (e.t > MONK.cast) {
        o.orbUntil = G.time + MONK.shieldT;
        e.castCd = rnd(...MONK.cd);
        SFX.rank();
        float(e);
      }
    },
  },
  // the thread of light to the one it shields, as it casts
  over(e) {
    if (e.state !== 'mcast' || !e.ward) return;
    const k = Math.min(1, e.t / MONK.cast),
      x0 = e.x - G.cam + e.face * 30,
      y0 = e.y - 100,
      x1 = e.ward.x - G.cam,
      y1 = e.ward.y - e.ward.z - 90 * e.ward.T.scale;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(150,240,255,${0.3 + 0.5 * k})`;
    ctx.lineWidth = 2 + 4 * k;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 60, x1, y1);
    ctx.stroke();
    ctx.restore();
  },
  look: {
    sleeves: (fl) => [fl ? '#fff' : '#a35f1e', fl ? '#fff' : '#d98a2b'],
    back(c) {
      // the ring of orbs, its far half
      orbs(c, false);
    },
    torso(c) {
      const { o, fl } = c;
      ctx.save();
      ctx.rotate(o.lean);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      // the robe over the chest, a sash across it
      ctx.fillStyle = fl ? '#fff' : '#d98a2b';
      ctx.beginPath();
      ctx.moveTo(-16, -54);
      ctx.quadraticCurveTo(8, -60, 20, -50);
      ctx.quadraticCurveTo(26, -24, 22, 6);
      ctx.lineTo(-20, 6);
      ctx.quadraticCurveTo(-24, -26, -16, -54);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : '#a35f1e';
      ctx.beginPath();
      ctx.moveTo(-14, -52);
      ctx.lineTo(-6, -54);
      ctx.lineTo(20, -6);
      ctx.lineTo(12, -2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      orbs(c, true);
    },
    legs(c) {
      // the robe's skirt over its crossed legs
      const { fl } = c;
      ctx.fillStyle = fl ? '#fff' : '#c27a24';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-26, -6);
      ctx.quadraticCurveTo(0, -12, 40, -4);
      ctx.quadraticCurveTo(48, 10, 36, 22);
      ctx.quadraticCurveTo(0, 28, -30, 20);
      ctx.quadraticCurveTo(-36, 6, -26, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    },
    head(c) {
      // a smooth metal head, a face plate, a row of blue lights on the brow
      const { fl, e } = c;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      ctx.fillStyle = fl ? '#fff' : '#c9c2a8';
      ctx.beginPath();
      ctx.ellipse(1, -2, 16, 17, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : '#3a3528';
      ctx.beginPath();
      ctx.ellipse(8, 4, 8, 9, 0.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = e.T.eye;
      if (!APP.lowFx) {
        ctx.shadowColor = e.T.eye;
        ctx.shadowBlur = 6;
      }
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.arc(-8 + k * 5, -10, 1.8, 0, TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(10, 1, 1.8, 0, TAU);
      ctx.arc(15, 1, 1.4, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    },
    arm(c) {
      // metal hands out of the sleeves
      const { fl, L } = c;
      ctx.fillStyle = fl ? '#fff' : '#c9c2a8';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(L[2][0], L[2][1], 6, 0, TAU);
      ctx.fill();
      ctx.stroke();
    },
  },
  // cross-legged in the air, bobbing; casting, both hands reach out
  pose: {
    base: {
      set: {
        lF: [1.5, -1.35],
        lB: [1.35, -1.55],
        aF: [0.45, 1.75],
        aB: [0.3, 1.7],
        lean: 0.02,
        hipH: (e) => 92 + 8 * Math.sin(e.anim * 2),
      },
    },
    states: { mcast: { set: { aF: [1.35, 2.3], aB: [1.2, 2.2], head: -0.15 } } },
  },
});
/** The ring of orbs round its neck, turning: the near half (`front`) or the far one. */
function orbs(c, front) {
  const { e, fl, neck } = c;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + e.anim * 1.2,
      z = Math.sin(a);
    if (z > 0 !== front) continue;
    const x = neck[0] + Math.cos(a) * 26,
      y = neck[1] + 6 + z * 6;
    ctx.fillStyle = fl ? '#fff' : '#2b2a33';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}
