// The bonebreaker: a slow club swing that smashes the ground in front of it.
import { G } from '../state.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { defineFoe } from './registry.js';
import { OL, TAU } from '../config.js';
import { ctx } from '../gfx.js';

export default defineFoe('brute', {
  look: {
    head(c) {
      const { fl, col } = c;
      ctx.fillStyle = fl ? '#fff' : '#9a6a3e';
      ctx.beginPath();
      ctx.arc(0, -2, 15, Math.PI * 0.95, Math.PI * 1.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-9, -13);
      ctx.quadraticCurveTo(-22, -18, -18, -30);
      ctx.quadraticCurveTo(-12, -20, -2, -17);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    },
    weapon(c) {
      const { fl, col, h, wa } = c;
      ctx.save();
      ctx.translate(h[0], h[1]);
      ctx.rotate(-wa);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      ctx.fillStyle = fl ? '#fff' : '#7c5335';
      ctx.beginPath();
      ctx.moveTo(-3, -8);
      ctx.lineTo(3, -8);
      ctx.lineTo(9, 40);
      ctx.quadraticCurveTo(0, 50, -9, 40);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col;
      for (const [a, b] of [
        [-9, 30],
        [9, 24],
        [-8, 40],
      ]) {
        ctx.beginPath();
        ctx.arc(a, b, 2.6, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  // the club held up over the shoulder
  pose: { guard: { chase: { set: { aF: (e, k) => [0.4, 2.1 + 0.05 * k.br] } } } },
  attackTick(e) {
    if (e.t > 0.06) {
      e.hitDone = true;
      dust(e.x + e.face * e.T.reach * 0.8, e.y, 6);
      G.shake = Math.max(G.shake, 6);
      SFX.thud();
    }
  },
});
