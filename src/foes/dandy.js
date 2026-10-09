// The skeleton Raithwyn calls up at half health (TYPES.dandy): finer than the others, a dandy
// in a top hat and a torn tailcoat, a red rose in its teeth. It fights like a plain skeleton,
// but nothing of the player's hurts it while she lives (a purple shimmer round it shows that):
// only her own blows, bones, dark balls and beams do. Once she falls, it falls with her.
import { OL, TAU } from '../config.js';
import { G } from '../state.js';
import { ctx } from '../gfx.js';
import { defineFoe } from './registry.js';

/** Raithwyn is still standing (and so the dandy cannot be hurt by the player). */
export const evilAlive = () => G.enemies.some((o) => o.type === 'evil' && !o.dead && !o.dying);

export default defineFoe('dandy', {
  immune: (e) => !G.evilHit && evilAlive(),
  look: {
    back(c) {
      // the tails of the coat, torn into strips, swinging as it walks
      const { e, fl, sh } = c,
        sw = Math.sin(e.anim * 5) * 4 + (e.moving ? -6 : 0);
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      ctx.fillStyle = fl ? '#fff' : '#1f1b29';
      ctx.beginPath();
      ctx.moveTo(sh[0] - 10, sh[1] + 2);
      ctx.lineTo(-6, -6);
      ctx.lineTo(-10 + sw, 30);
      ctx.lineTo(-14 + sw, 24);
      ctx.lineTo(-17 + sw, 36);
      ctx.lineTo(-21 + sw, 27);
      ctx.lineTo(-25 + sw, 33);
      ctx.quadraticCurveTo(-24, 0, sh[0] - 16, sh[1] + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
    torso(c) {
      // the front of the coat: open over the ribs, wide lapels, a tear down one side
      const { fl, sh } = c;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      ctx.fillStyle = fl ? '#fff' : '#2a2436';
      ctx.beginPath();
      ctx.moveTo(sh[0] - 14, sh[1] - 1);
      ctx.lineTo(sh[0] - 2, sh[1] + 1);
      ctx.lineTo(-2, -4);
      ctx.lineTo(-6, 4);
      ctx.lineTo(-9, -2);
      ctx.lineTo(-13, 6);
      ctx.lineTo(-14, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // a lapel, a white shirt front and a red bow at the throat
      ctx.fillStyle = fl ? '#fff' : '#3c3450';
      ctx.beginPath();
      ctx.moveTo(sh[0] - 2, sh[1] + 1);
      ctx.lineTo(sh[0] + 4, sh[1] + 12);
      ctx.lineTo(sh[0] - 4, sh[1] + 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : '#c8283c';
      ctx.beginPath();
      ctx.moveTo(sh[0] + 2, sh[1] + 1);
      ctx.lineTo(sh[0] + 8, sh[1] - 3);
      ctx.lineTo(sh[0] + 8, sh[1] + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
    head(c) {
      const { e, fl } = c;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      // a rose held in the teeth, its stem along the jaw
      ctx.strokeStyle = fl ? '#fff' : '#2f6b2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(6, 8.5);
      ctx.lineTo(22, 7);
      ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : '#3f8a34';
      ctx.beginPath();
      ctx.ellipse(16, 5.5, 3.5, 1.6, -0.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = fl ? '#fff' : '#d0203a';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(24.5, 6, 4.6, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = fl ? '#fff' : '#7a1020';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(24.5, 6, 2.2, 0.5, 5.2);
      ctx.stroke();
      // a tall top hat, tipped back a little, a purple band
      ctx.save();
      ctx.translate(0, -12);
      ctx.rotate(-0.12 + Math.sin(e.anim * 3) * 0.02);
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      ctx.fillStyle = fl ? '#fff' : '#17141f';
      ctx.beginPath();
      ctx.ellipse(1, 0, 19, 4.5, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-11, -26);
      ctx.quadraticCurveTo(1, -29, 13, -26);
      ctx.lineTo(12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : '#7a3fb0';
      ctx.fillRect(-10.5, -7, 23, 4.5);
      ctx.restore();
      ctx.restore();
    },
    world(c) {
      // while Raithwyn lives, a purple shimmer shows that nothing of the player's hurts it
      const { e, s, sx, sy } = c;
      if (!evilAlive() || e.state === 'rise') return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(176,92,255,${0.35 + 0.2 * Math.sin(G.time * 6)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(sx, sy - 70 * s, 44 * s, 86 * s, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    },
  },
});
