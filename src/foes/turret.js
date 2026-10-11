// Jawacorp's turret robot (TYPES.turret, TURRET), a medium foe: a squat olive war machine, a
// boxy sensor head with one red eye, its front arm a rotary gun. It walks up and punches with
// the gun; now and then, from a distance, it plants itself (its legs brace, the barrels start
// to spin) and fires a stream of bolts straight down its lane for two seconds, then packs up.
// Step up or down the road out of the lane. Light blows do not stop it.
import { OL, TAU, TURRET, W } from '../config.js';
import { rnd } from '../util.js';
import { APP, G } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';
import { fireBolt, robotDie, robotLook } from './robot.js';

const A = { body: '#7a8762', trim: '#3e4532', glow: '#ff3b4b', w: 15, chest: 1.2 };

/** The rotary gun on the front arm: barrels along the forearm, spinning as it fires. */
function gun(c) {
  const { e, fl, h, wa } = c;
  const firing = e.state === 'tfire',
    spin = firing || e.state === 'tdeploy' ? e.anim * 40 : 0;
  ctx.save();
  ctx.translate(h[0], h[1]);
  ctx.rotate(-wa);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillStyle = fl ? '#fff' : A.trim;
  ctx.fillRect(-12, -10, 24, 26);
  ctx.strokeRect(-12, -10, 24, 26);
  for (let k = 0; k < 3; k++) {
    const o = Math.sin(spin + (k * TAU) / 3) * 6;
    ctx.fillStyle = fl ? '#fff' : '#2b2f36';
    ctx.fillRect(o - 3, 16, 6, 40);
    ctx.strokeRect(o - 3, 16, 6, 40);
  }
  ctx.fillStyle = fl ? '#fff' : '#5a6250';
  ctx.fillRect(-10, 50, 20, 6);
  ctx.strokeRect(-10, 50, 20, 6);
  if (firing && Math.floor(e.anim * 30) % 2) {
    ctx.fillStyle = '#fff6c0';
    if (!APP.lowFx) {
      ctx.shadowColor = '#ffd23a';
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.moveTo(-8, 58);
    ctx.lineTo(0, 78);
    ctx.lineTo(8, 58);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
/** The boxy sensor head with its one red eye. */
function head(c) {
  const { e, fl } = c;
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
    ctx.shadowBlur = e.state === 'tfire' ? 14 : 6;
  }
  ctx.beginPath();
  ctx.arc(11, -2, 3.5, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
}

export default defineFoe('turret', {
  init: { gunCd: [1.5, 3] },
  timers: ['gunCd'],
  attacks: ['tdeploy', 'tfire', 'tpack'],
  moves: [
    {
      // from a distance, along her lane: plant and fire
      when: (e, s) =>
        e.gunCd <= 0 &&
        !s.pdown &&
        s.adx > TURRET.min &&
        s.adx < TURRET.max &&
        s.ady < 60 &&
        e.x > G.cam + 30 &&
        e.x < G.cam + W - 30,
      go(e) {
        faceP(e);
        go(e, 'tdeploy', 0, { engage: false });
        SFX.spin();
      },
    },
  ],
  die: robotDie,
  states: {
    tdeploy: {
      pin: true,
      tick(e) {
        if (e.t > TURRET.deploy) go(e, 'tfire', 0, { shotT: 0 });
      },
    },
    tfire: {
      pin: true,
      tick(e, dt) {
        e.shotT -= dt;
        if (e.shotT <= 0) {
          e.shotT += TURRET.rate;
          fireBolt(
            e,
            e.x + e.face * 92 * e.T.scale,
            74 * e.T.scale,
            TURRET.boltV,
            TURRET.dmg,
            '#ffd23a',
            false,
            (e.shots = (e.shots ?? 0) + 1) % 3 !== 1,
          );
        }
        if (e.t > TURRET.fire) go(e, 'tpack');
      },
    },
    tpack: {
      pin: true,
      tick(e) {
        if (e.t > TURRET.pack) go(e, 'chase', 0, { gunCd: rnd(...TURRET.cd) });
      },
    },
  },
  look: robotLook(A, head, gun),
  pose: {
    guard: { chase: { set: { aF: (e, k) => [0.7, 1.3 + 0.04 * k.br] } } },
    states: {
      // braced, the gun level, rocking a little as it fires
      tdeploy: { set: { lF: [0.75, -0.55], lB: [-0.8, -1.2], lean: 0.12, aF: [1.5, 1.57] } },
      tfire: {
        set: { lF: [0.75, -0.55], lB: [-0.8, -1.2], lean: 0.1, aF: [1.5, 1.57], aB: [1, 1.4] },
        fn: (o, e) => (o.lean = 0.1 + Math.sin(e.t * 60) * 0.02),
      },
      tpack: { set: { lF: [0.4, -0.2], lB: [-0.5, -0.8], aF: [1, 1.4] } },
    },
  },
});
