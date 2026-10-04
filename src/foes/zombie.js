// Zombies come in crowds: they grab the player, lose their heads to hits and now and then
// tear the head off themselves and throw it.
import { ACID, OL, TAU, ZOMBIE } from '../config.js';
import { clamp } from '../util.js';
import { P } from '../state.js';
import { SFX } from '../audio.js';
import { grabPlayer, popHead } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go, lob } from './kit.js';
import { ctx } from '../gfx.js';

function zombieArms(o, e, k) {
  o.aF = [1.4 + 0.06 * k.br, 1.5];
  o.aB = [1.3 - 0.06 * k.br, 1.45];
  o.lean = 0.2;
  o.head = 0.3 + 0.1 * k.br;
}

export default defineFoe('zombie', {
  look: {
    torso(c) {
      const { fl, sh } = c;
      // torn shirt over the ribs
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      ctx.fillStyle = fl ? '#fff' : '#56687a';
      ctx.beginPath();
      ctx.moveTo(sh[0] - 13, sh[1] - 1);
      ctx.lineTo(sh[0] + 12, sh[1]);
      ctx.lineTo(16, -4);
      ctx.lineTo(12, 6);
      ctx.lineTo(6, 1);
      ctx.lineTo(0, 9);
      ctx.lineTo(-6, 2);
      ctx.lineTo(-12, 8);
      ctx.lineTo(-15, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2a2532';
      ctx.beginPath();
      ctx.ellipse(sh[0] * 0.5 + 4, sh[1] * 0.5, 4, 6, 0.3, 0, TAU);
      ctx.fill();
      ctx.restore();
    },
    head() {
      // a few strands of hair and a stitched cheek
      ctx.strokeStyle = '#2b2a22';
      ctx.lineWidth = 2;
      for (const [a, b] of [
        [-8, -12],
        [-3, -14],
        [3, -13],
      ]) {
        ctx.beginPath();
        ctx.moveTo(a, b);
        ctx.quadraticCurveTo(a - 6, b - 6, a - 10, b + 2);
        ctx.stroke();
      }
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.lineTo(7, 5);
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(1.5 + i * 2.5, 2);
        ctx.lineTo(2 + i * 2.5, 6);
      }
      ctx.stroke();
    },
  },
  engageCap: 4,
  moves: [
    {
      // rarely: tear off its own head and lob it
      when: (e, s, dt) =>
        !e.headless &&
        !s.pdown &&
        e.cd <= 0 &&
        s.adx > 170 &&
        s.adx < 420 &&
        s.ady < 60 &&
        Math.random() < ZOMBIE.throwRate * dt,
      go: (e) => go(e, 'hwind', 0, { engage: false }),
    },
  ],
  connect(e) {
    if (!grabPlayer(e)) return false;
    go(e, 'grab');
    return true;
  },
  guard(e, knock, src, dir) {
    if (!e.headless && (knock || src === 'hado' || Math.random() < ZOMBIE.headOff)) popHead(e, dir);
    return false;
  },
  pose: {
    // arms stretched out in front, head lolling
    guard: {
      chase: { fn: zombieArms },
      recover: { fn: zombieArms },
    },
    states: {
      grab: {
        set: { aF: [1.55, 1.6], aB: [1.45, 1.55], lean: 0.35, head: 0.35 },
        fn: (o, e) => (o.jaw = 6 * Math.abs(Math.sin(e.t * 9))),
      },
      hwind: {
        set: { jaw: 6 },
        tween: {
          dur: 0.4,
          from: { aF: 'pre', aB: [0.02, 0.95], lean: 0 },
          to: { aF: [2.9, 3.3], aB: [2.7, 3.1], lean: -0.1 },
        },
      },
    },
  },
  states: {
    // holds on while the player is stuck; lets go when the player breaks free or gets hit
    grab(e) {
      faceP(e);
      if (P.state !== 'grabbed' || P.grabber !== e) go(e, 'recover');
    },
    hwind(e) {
      faceP(e);
      if (e.t <= 0.55) return;
      const x0 = e.x + e.face * 20,
        f = ZOMBIE.headFlight;
      e.headless = true;
      SFX.swing();
      lob(e, 'zhead', x0, 160 * e.T.scale, f, ACID.g, clamp((P.x - x0) * e.face, 120, 420), 100, {
        col: e.T.col,
        eye: e.T.eye,
        life: 3,
      });
      go(e, 'recover');
    },
  },
});
