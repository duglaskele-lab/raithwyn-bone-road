// The zombie miner of Old Quarry: a hard hat with a lamp, a flannel shirt and a pickaxe. It
// swings the pick from above; now and then it raises the pick for a moment (MINER.wind) and
// runs straight ahead to ram the player down.
import { MINER, OL, TAU, W } from '../config.js';
import { fxRandom, random, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { hitPlayer } from '../combat.js';
import { walkCycle } from '../anim.js';
import { ctx } from '../gfx.js';
import { defineFoe } from './registry.js';
import { faceP, go, inFront } from './kit.js';

/** A hard hat with a lamp: in head space (the skull at 0,-1, facing +x). */
export function hardHat(fl, lamp = true) {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillStyle = fl ? '#fff' : '#e3b23c';
  ctx.beginPath();
  ctx.ellipse(1, -7, 16, 12, 0, Math.PI, TAU);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-18, -7);
  ctx.lineTo(22, -7);
  ctx.lineTo(22, -4);
  ctx.lineTo(-18, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(23,21,29,.45)';
  ctx.beginPath();
  ctx.moveTo(1, -19);
  ctx.lineTo(1, -8);
  ctx.stroke();
  if (!lamp) return;
  ctx.fillStyle = '#4a4850';
  ctx.fillRect(12, -16, 8, 7);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(12, -16, 8, 7);
  ctx.fillStyle = '#fff6c0';
  ctx.fillRect(18, -15, 3, 5);
  // the beam of the lamp
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(20, 0, 90, 0);
  g.addColorStop(0, 'rgba(255,240,170,.35)');
  g.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(20, -13);
  ctx.lineTo(90, -32);
  ctx.lineTo(90, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
/** A torn flannel shirt with braces, over the ribs. */
export function flannel(c, col = '#8a3a2a', dk = '#5a2218') {
  const { fl, sh } = c;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillStyle = fl ? '#fff' : col;
  ctx.beginPath();
  ctx.moveTo(sh[0] - 14, sh[1] - 1);
  ctx.lineTo(sh[0] + 13, sh[1]);
  ctx.lineTo(17, -2);
  ctx.lineTo(13, 8);
  ctx.lineTo(5, 3);
  ctx.lineTo(-1, 10);
  ctx.lineTo(-7, 3);
  ctx.lineTo(-13, 9);
  ctx.lineTo(-16, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!fl) {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = dk;
    ctx.lineWidth = 2;
    for (let i = -30; i < 30; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, -60);
      ctx.lineTo(i, 20);
      ctx.moveTo(-30, i - 20);
      ctx.lineTo(30, i - 20);
      ctx.stroke();
    }
    ctx.restore();
  }
  // braces
  ctx.strokeStyle = '#3a2a22';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sh[0] - 6, sh[1]);
  ctx.lineTo(-6, 8);
  ctx.moveTo(sh[0] + 6, sh[1]);
  ctx.lineTo(8, 8);
  ctx.stroke();
  ctx.restore();
}
/** A pickaxe in the hand (hand at h, forearm angle wa). */
function pickaxe(h, wa, fl) {
  ctx.save();
  ctx.translate(h[0], h[1]);
  ctx.rotate(-wa);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillStyle = fl ? '#fff' : '#7a5232';
  ctx.beginPath();
  ctx.rect(-3, -12, 6, 66);
  ctx.fill();
  ctx.stroke();
  // the iron head, curved, across the end of the handle
  ctx.fillStyle = fl ? '#fff' : '#8e9098';
  ctx.beginPath();
  ctx.moveTo(-30, 48);
  ctx.quadraticCurveTo(0, 60, 30, 46);
  ctx.lineTo(4, 58);
  ctx.lineTo(-4, 58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#5c5e66';
  ctx.fillRect(-5, 50, 10, 10);
  ctx.restore();
}

export default defineFoe('miner', {
  init: { chCd: [2, 5] },
  timers: ['chCd'],
  look: {
    torso: (c) => flannel(c),
    head: (c) => hardHat(c.fl),
    weapon: (c) => pickaxe(c.h, c.wa, c.fl),
  },
  moves: [
    {
      // now and then: the pick goes up, and it charges
      when: (e, s, dt) =>
        e.chCd <= 0 &&
        !s.pdown &&
        s.adx > 200 &&
        s.adx < 560 &&
        s.ady < 50 &&
        e.x > G.cam + 40 &&
        e.x < G.cam + W - 40 &&
        random() < MINER.rate * dt,
      go: (e) => go(e, 'pwind', 0, { engage: false }),
    },
  ],
  pose: {
    // the pick over the shoulder while it walks
    guard: { chase: { set: { aF: (e, k) => [-0.4 + 0.04 * k.br, 2.4] } } },
    states: {
      pwind: {
        set: { lF: [0.4, 0.1], lB: [-0.45, -0.6], jaw: 6 },
        tween: {
          dur: 0.35,
          from: { aF: 'pre', aB: [0.02, 0.95], lean: 0.1 },
          to: { aF: [2.95, 3.4], aB: [2.7, 3.1], lean: -0.15 },
        },
        shake: { after: 0.35, amp: 0.05, rate: 60, fields: ['aF', 'aB'] },
      },
      pcharge: {
        set: { aF: [2.2, 2.7], aB: [2.0, 2.5], jaw: 7, head: 0.2 },
        fn(o, e) {
          walkCycle(o, e, 0.85, 0.5);
          o.aF = [2.2, 2.7];
          o.aB = [2.0, 2.5];
        },
      },
    },
  },
  states: {
    pwind(e) {
      faceP(e);
      if (e.t > MINER.wind) {
        go(e, 'pcharge', 0, { hitDone: false, cdir: e.face });
        SFX.swing();
      }
    },
    pcharge: {
      pin: true,
      tick(e, dt) {
        e.face = e.cdir;
        e.x += e.cdir * MINER.speed * dt;
        e.moving = true;
        e.walkT += dt * 18;
        if (fxRandom() < 0.45) dust(e.x - e.face * 18, e.y, 1);
        if (!e.hitDone && inFront(e, 10, 60, 24, 110)) {
          e.hitDone = true;
          hitPlayer(MINER.dmg, e.face, true);
        }
        const past = (e.x - P.x) * e.cdir > 170,
          edge = e.x < G.cam + 40 || e.x > G.cam + W - 40;
        if (e.t > MINER.run || (past && e.t > 0.3) || (edge && e.t > 0.2)) {
          go(e, 'recover', -0.35, { chCd: rnd(MINER.cd[0], MINER.cd[1]) });
          dust(e.x, e.y, 5);
        }
      },
    },
  },
});
