// The necromancer keeps its distance and lobs balls of acid that leave puddles; cornered, it
// swings its staff.
import { ACID, OL, TAU } from '../config.js';
import { clamp } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { hitPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go, inFront, lob } from './kit.js';
import { ctx } from '../gfx.js';

// the grey robe and its shadowed folds
const robe = (fl) => (fl ? '#ffffff' : '#77727c'),
  robeDk = (fl) => (fl ? '#ffd9d9' : '#57525d');

export default defineFoe('necro', {
  look: {
    sleeves: (fl) => [robeDk(fl), robe(fl)],
    legs(c) {
      const { e, fl, hipH, sh } = c;
      // grey cassock over the body, the hem swaying with the steps
      const sw = e.moving ? Math.sin(e.walkT) * 6 : Math.sin(e.anim * 2) * 2,
        hem = hipH - 14;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      ctx.fillStyle = robe(fl);
      ctx.beginPath();
      ctx.moveTo(sh[0] - 13, sh[1] - 2);
      ctx.lineTo(sh[0] + 11, sh[1] - 1);
      ctx.quadraticCurveTo(16, 0, 24 + sw, hem);
      ctx.lineTo(10 + sw * 0.6, hem + 4);
      ctx.lineTo(-6 + sw * 0.3, hem);
      ctx.lineTo(-24 + sw * 0.2, hem + 3);
      ctx.quadraticCurveTo(-18, 0, sh[0] - 13, sh[1] - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = robeDk(fl);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(2, 4);
      ctx.lineTo(4 + sw * 0.5, hem - 2);
      ctx.moveTo(-10, 6);
      ctx.lineTo(-14 + sw * 0.3, hem - 1);
      ctx.stroke();
      // rope belt
      ctx.strokeStyle = '#3b3640';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-15, -2);
      ctx.lineTo(15, -1);
      ctx.moveTo(6, -1);
      ctx.lineTo(8 + sw * 0.4, 22);
      ctx.stroke();
    },
    head(c) {
      const { e, T, fl } = c;
      // grey hood: the face is lost in shadow, only the burning red eyes show
      ctx.fillStyle = robe(fl);
      ctx.beginPath();
      ctx.moveTo(-6, 8);
      ctx.quadraticCurveTo(-24, -6, -12, -20);
      ctx.quadraticCurveTo(2, -30, 16, -14);
      ctx.quadraticCurveTo(22, 2, 16, 15);
      ctx.lineTo(4, 18);
      ctx.lineTo(-18, 30 + Math.sin(e.anim * 4) * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#120e16';
      ctx.beginPath();
      ctx.ellipse(8, 0, 8.5, 11.5, 0.1, 0, TAU);
      ctx.fill();
      const glow = 0.75 + 0.25 * Math.sin(G.time * 8 + e.seed);
      ctx.fillStyle = T.eye;
      ctx.shadowColor = T.eye;
      ctx.shadowBlur = 14 * glow;
      ctx.beginPath();
      ctx.arc(6, -1.5, 2.3, 0, TAU);
      ctx.arc(12.2, -1.5, 1.8, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    },
    weapon(c) {
      const { e, T, fl, h, wa } = c;
      // the staff, topped with a bubble of acid that swells while a spell is cast
      const casting = e.state === 'windup' && T.style === 'cast';
      ctx.save();
      ctx.translate(h[0], h[1]);
      ctx.rotate(-(wa - 1.6) * 0.9);
      ctx.lineCap = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-2, 52);
      ctx.lineTo(2, -78);
      ctx.stroke();
      ctx.strokeStyle = fl ? '#fff' : '#6b4a32';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      const r = casting ? 6 + 6 * Math.min(1, e.t / T.wind) : 5.5;
      ctx.fillStyle = '#9dff4a';
      ctx.shadowColor = '#9dff4a';
      ctx.shadowBlur = casting ? 22 : 10;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(2, -84, r, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();
    },
  },
  aimDy: 90,
  moves: [
    {
      when: (e, s) => !s.pdown && e.cd <= 0 && s.adx < e.T.reach + 10 && s.ady < 18,
      go: (e) => go(e, 'staff', 0, { hitDone: false }),
    },
  ],
  // lobbed at where the player stands now, landing after ACID.flight seconds
  strike(e) {
    SFX.acid();
    const x0 = e.x + e.face * 40 * e.T.scale;
    lob(
      e,
      'acid',
      x0,
      150 * e.T.scale,
      ACID.flight,
      ACID.g,
      clamp((P.x - x0) * e.face, 120, 460),
      120,
      {
        life: 3.2,
      },
    );
  },
  pose: {
    // the staff held in front
    guard: {
      chase: { set: { aF: (e, k) => [0.45, 1.6 + 0.04 * k.br], lean: 0.04 } },
      rise: { set: { aF: (e, k) => [0.45, 1.6 + 0.04 * k.br], lean: 0.04 } },
    },
    states: {
      // raised, then brought down
      staff: [
        {
          until: 0.32,
          set: { lF: [0.4, 0.1], lB: [-0.4, -0.6], jaw: 4 },
          tween: { dur: 0.3, from: { aF: 'pre', lean: 0 }, to: { aF: [2.9, 3.4], lean: -0.12 } },
        },
        { set: { aF: [1.15, 0.95], lean: 0.3, lF: [0.4, 0.1], lB: [-0.4, -0.6], jaw: 4 } },
      ],
    },
  },
  states: {
    staff(e) {
      faceP(e);
      if (!e.hitDone && e.t > 0.32) {
        e.hitDone = true;
        SFX.swing();
        if (inFront(e, 14, e.T.reach + 18, 24, 70)) hitPlayer(e.T.dmg, e.face, false);
      }
      if (e.t > 0.5) go(e, 'recover');
    },
  },
});
