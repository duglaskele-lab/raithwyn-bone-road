// Jawacorp's turret robot (TYPES.turret, TURRET), a medium foe that fights in two modes.
//   As a robot: a squat olive war machine, a boxy sensor head with one red eye, its front arm a
//     rotary gun. It walks up and clubs with the gun; from a distance it raises the gun (a red
//     sight along her lane) and fires a short burst.
//   As a turret: it plants itself and transforms — its legs splay into a braced stance, two
//     stabiliser struts slam down behind it, its head sinks under an armoured cowl, a shield
//     plate closes over its chest and its other arm unfolds into a second gun. Then it fires
//     long bursts from both barrels down her lane, turning slowly after her if she goes
//     behind it; its armour takes half the harm of a blow. After a while it packs up and
//     walks again.
// Its bullets fly from the muzzles of its guns. Light blows do not stop it.
import { OL, TAU, TURRET, W } from '../config.js';
import { clamp, rnd } from '../util.js';
import { APP, G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { armPoint } from '../skeleton.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';
import { fireBolt, robotDie, robotLook } from './robot.js';

const A = { body: '#7a8762', trim: '#3e4532', glow: '#ff3b4b', w: 15, chest: 1.2 };
const T = TURRET;
/** The muzzle: this far past the hand along the forearm. */
const MUZZLE = 60;
const TURRET_STATES = ['tdeploy', 'tfire', 'tturn', 'tpack'];
const onScreen = (e) => e.x > G.cam + 30 && e.x < G.cam + W - 30;
/** How far into its turret form it is now: 0 a robot, 1 a turret (eased, for the drawing). */
const form = (e) => e.tm ?? 0;

/** A burst's bullet, out of the muzzle of the front gun (or the back one). */
function shoot(e, back, quiet) {
  const [x, z] = armPoint(e, back, MUZZLE);
  fireBolt(e, x, z, T.boltV, T.dmg, '#ffd23a', false, quiet);
  e.flashF = back ? 0 : 0.06;
  e.flashB = back ? 0.06 : 0;
}

/** A rotary gun at a hand: barrels along the forearm, spinning while it fires; the muzzle
 *  flash; its red sight along the lane while it aims. */
function gunAt(e, h, wa, fl, spin, flash, sight) {
  ctx.save();
  ctx.translate(h[0], h[1]);
  ctx.rotate(-wa);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillStyle = fl ? '#fff' : A.trim;
  ctx.fillRect(-13, -10, 26, 28);
  ctx.strokeRect(-13, -10, 26, 28);
  // the ammunition belt into it
  ctx.fillStyle = fl ? '#fff' : '#c9a24a';
  for (let k = 0; k < 4; k++) ctx.fillRect(-18, -6 + k * 6, 5, 4);
  for (let k = 0; k < 3; k++) {
    const o = Math.sin(spin + (k * TAU) / 3) * 6;
    ctx.fillStyle = fl ? '#fff' : '#2b2f36';
    ctx.fillRect(o - 3, 18, 6, MUZZLE - 22);
    ctx.strokeRect(o - 3, 18, 6, MUZZLE - 22);
  }
  ctx.fillStyle = fl ? '#fff' : '#5a6250';
  ctx.fillRect(-11, MUZZLE - 8, 22, 8);
  ctx.strokeRect(-11, MUZZLE - 8, 22, 8);
  if (flash > 0 && !fl) {
    ctx.fillStyle = '#fff6c0';
    if (!APP.lowFx) {
      ctx.shadowColor = '#ffd23a';
      ctx.shadowBlur = 16;
    }
    ctx.beginPath();
    ctx.moveTo(-10, MUZZLE);
    ctx.lineTo(-4, MUZZLE + 14);
    ctx.lineTo(0, MUZZLE + 30);
    ctx.lineTo(4, MUZZLE + 14);
    ctx.lineTo(10, MUZZLE);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  if (sight > 0 && !fl) {
    ctx.strokeStyle = `rgba(255,60,80,${0.2 + 0.6 * sight})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, MUZZLE + 4);
    ctx.lineTo(0, MUZZLE + 520 / e.T.scale);
    ctx.stroke();
  }
  ctx.restore();
}
/** The front gun. */
function gun(c) {
  const { e, fl, h, wa } = c;
  const firing = e.state === 'tfire' || e.state === 'tburst',
    spin = firing || e.state === 'tdeploy' || e.state === 'taim' ? e.anim * 40 : 0,
    sight =
      e.state === 'taim'
        ? clamp(e.t / T.aim, 0, 1)
        : e.state === 'tfire' && e.burstLeft === 0
          ? clamp(1 - e.gapT / T.gap, 0, 1)
          : 0;
  gunAt(e, h, wa, fl, spin, e.flashF ?? 0, sight);
}
/** The boxy sensor head with its one red eye; in turret form, sunk under an armoured cowl. */
function head(c) {
  const { e, fl } = c,
    u = form(e);
  ctx.save();
  ctx.translate(-2 * u, 10 * u);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillStyle = fl ? '#fff' : A.body;
  ctx.fillRect(-14, -14, 32, 24);
  ctx.strokeRect(-14, -14, 32, 24);
  ctx.fillStyle = fl ? '#fff' : A.trim;
  ctx.fillRect(-16, -18, 22, 6);
  ctx.strokeRect(-16, -18, 22, 6);
  ctx.fillStyle = '#0b0d14';
  ctx.beginPath();
  ctx.arc(10, -2, 7, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = e.T.eye;
  if (!APP.lowFx) {
    ctx.shadowColor = e.T.eye;
    ctx.shadowBlur = u > 0.5 ? 14 : 6;
  }
  ctx.beginPath();
  ctx.arc(11, -2, 3.5, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  if (u > 0.05) {
    // the cowl closing over it, a slit left for the eye
    ctx.save();
    ctx.globalAlpha = Math.min(1, u * 1.5);
    ctx.fillStyle = fl ? '#fff' : A.trim;
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-22, 18);
    ctx.lineTo(-20, -20 + 8 * (1 - u));
    ctx.quadraticCurveTo(4, -32, 24, -14 + 8 * (1 - u));
    ctx.lineTo(26, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0b0d14';
    ctx.fillRect(2, 2, 22, 6);
    ctx.fillStyle = e.T.eye;
    ctx.fillRect(10, 3, 8, 4);
    ctx.restore();
  }
}
/** The shield plate closing over the chest, in turret form. */
function plateOver(c) {
  const { e, fl } = c,
    u = form(e);
  if (u < 0.05) return;
  ctx.fillStyle = fl ? '#fff' : A.trim;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  const h = 58 * u;
  ctx.fillRect(-6, -54, 34, h);
  ctx.strokeRect(-6, -54, 34, h);
  ctx.strokeStyle = 'rgba(255,255,255,.2)';
  ctx.lineWidth = 2;
  for (let y = -46; y < -54 + h; y += 10) {
    ctx.beginPath();
    ctx.moveTo(-2, y);
    ctx.lineTo(24, y);
    ctx.stroke();
  }
}
const base = robotLook(A, head, gun, plateOver);
const look = {
  ...base,
  back(c) {
    const { e, fl, o, limb, sh, UA, FA } = c,
      u = form(e);
    if (u > 0.05) {
      // the stabiliser struts slamming down behind it
      ctx.save();
      ctx.strokeStyle = OL;
      ctx.lineCap = 'round';
      for (const [k, dx] of [
        [0, -44],
        [1, -64],
      ]) {
        const fx = -6 + (dx - -6) * u,
          fy = -20 + (c.hipH + 2 - -20) * u;
        for (const [w, col] of [
          [9, OL],
          [5, fl ? '#fff' : k ? A.trim : '#5a6250'],
        ]) {
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(-6, -26);
          ctx.lineTo(fx, fy);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    base.back(c);
    // the back arm unfolds into a second gun
    if (u > 0.3) {
      const L = limb([sh[0] - 3, sh[1]], o.aB[0], o.aB[1], UA, FA);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (u - 0.3) * 2);
      gunAt(e, L[2], o.aB[1], fl, e.state === 'tfire' ? e.anim * 40 : 0, e.flashB ?? 0, 0);
      ctx.restore();
    }
  },
};

export default defineFoe('turret', {
  init: { modeCd: [2, 4], burstCd: [1, 2] },
  timers: ['modeCd', 'burstCd'],
  attacks: ['taim', 'tburst', ...TURRET_STATES],
  // in turret form its armour turns half the harm of a blow
  soak: (e) => (TURRET_STATES.includes(e.state) ? T.soak : 1),
  moves: [
    {
      // from a distance, along her lane: plant itself and become a turret
      when: (e, s) =>
        e.modeCd <= 0 && !s.pdown && s.adx > T.min && s.adx < T.max && s.ady < 60 && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'tdeploy', 0, { engage: false });
        SFX.spin();
      },
    },
    {
      // as a robot: raise the gun and fire a short burst
      when: (e, s) =>
        e.burstCd <= 0 && !s.pdown && s.adx > 150 && s.adx < 520 && s.ady < 40 && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'taim', 0, { engage: false });
      },
    },
  ],
  die: robotDie,
  tick(e, dt) {
    // its form follows its state, a little behind (the transformation takes time)
    const target = TURRET_STATES.includes(e.state) && e.state !== 'tpack' ? 1 : 0;
    e.tm = clamp((e.tm ?? 0) + Math.sign(target - (e.tm ?? 0)) * dt * (1 / T.deploy), 0, 1);
    e.flashF = Math.max(0, (e.flashF ?? 0) - dt);
    e.flashB = Math.max(0, (e.flashB ?? 0) - dt);
  },
  states: {
    taim(e) {
      faceP(e);
      if (e.t > T.aim) go(e, 'tburst', 0, { shots: 0 });
    },
    tburst(e) {
      const n = Math.floor(e.t / T.rate);
      while (e.shots <= n && e.shots < T.rburst) {
        shoot(e, false, e.shots > 0);
        e.shots++;
      }
      if (e.t > T.rate * T.rburst + 0.25) go(e, 'recover', 0, { burstCd: rnd(...T.rcd) });
    },
    tdeploy: {
      pin: true,
      tick(e) {
        if (e.t > T.deploy) {
          SFX.thud();
          G.shake = Math.max(G.shake, 4);
          go(e, 'tfire', 0, { burstLeft: T.burst, gapT: 0.3, held: 0, shots: 0 });
        }
      },
    },
    tfire: {
      pin: true,
      tick(e, dt) {
        e.held += dt;
        // she went round behind it: it turns, slowly
        if ((P.x - e.x) * e.face < -30) {
          go(e, 'tturn', 0, { held: e.held });
          return;
        }
        if (e.burstLeft > 0) {
          e.shotT = (e.shotT ?? 0) - dt;
          if (e.shotT <= 0) {
            e.shotT = T.rate;
            // the two guns in turn
            shoot(e, e.burstLeft % 2 === 0, (e.shots = (e.shots ?? 0) + 1) % 3 !== 1);
            e.burstLeft--;
            if (!e.burstLeft) e.gapT = T.gap;
          }
        } else if ((e.gapT -= dt) <= 0) e.burstLeft = T.burst;
        if (e.held > T.hold) go(e, 'tpack');
      },
    },
    tturn: {
      pin: true,
      tick(e) {
        if (e.t > T.turn) {
          faceP(e);
          go(e, 'tfire', 0, { held: e.held, burstLeft: 0, gapT: 0.2 });
        }
      },
    },
    tpack: {
      pin: true,
      tick(e) {
        if (e.t > T.deploy) go(e, 'chase', 0, { modeCd: rnd(...T.cd), burstCd: rnd(...T.rcd) });
      },
    },
  },
  look,
  pose: {
    guard: { chase: { set: { aF: (e, k) => [0.7, 1.3 + 0.04 * k.br] } } },
    states: {
      taim: { set: { aF: [1.5, 1.57], aB: [0.9, 1.3], lean: 0.05 } },
      tburst: {
        set: { aF: [1.5, 1.57], aB: [0.9, 1.3] },
        fn: (o, e) => (o.lean = 0.02 + Math.sin(e.t * 60) * 0.02),
      },
      // the transformation: legs splaying wide and low, both arms out level
      tdeploy: {
        tween: {
          dur: T.deploy,
          from: { lF: [0.16, -0.02], lB: [-0.22, -0.34], aF: 'pre', aB: [0.02, 0.95], lean: 0.1 },
          to: {
            lF: [1.05, 0.45],
            lB: [-1.05, -0.45],
            aF: [1.5, 1.57],
            aB: [1.4, 1.57],
            lean: -0.05,
          },
        },
      },
      tfire: {
        set: { lF: [1.05, 0.45], lB: [-1.05, -0.45], aF: [1.5, 1.57], aB: [1.4, 1.57] },
        fn: (o, e) => (o.lean = -0.05 + Math.sin(e.t * 60) * 0.015),
      },
      tturn: {
        set: { lF: [1.05, 0.45], lB: [-1.05, -0.45], aF: [1.2, 1.3], aB: [1.1, 1.3], lean: -0.05 },
      },
      tpack: {
        tween: {
          dur: T.deploy,
          from: {
            lF: [1.05, 0.45],
            lB: [-1.05, -0.45],
            aF: [1.5, 1.57],
            aB: [1.4, 1.57],
            lean: -0.05,
          },
          to: {
            lF: [0.16, -0.02],
            lB: [-0.22, -0.34],
            aF: [0.7, 1.3],
            aB: [0.02, 0.95],
            lean: 0.1,
          },
        },
      },
    },
  },
});
