// The bone thrower keeps its distance (TYPES.thrower.keep) and throws bones along the road.
import { G } from '../state.js';
import { defineFoe } from './registry.js';
import { ctx } from '../gfx.js';
import { boneShape } from '../skeleton.js';

export default defineFoe('thrower', {
  look: {
    head(c) {
      const { e, fl } = c;
      ctx.fillStyle = fl ? '#fff' : '#3f6b5c';
      ctx.beginPath();
      ctx.arc(0, -1, 15.5, Math.PI * 0.62, Math.PI * 1.78);
      ctx.lineTo(4, -9);
      ctx.quadraticCurveTo(-6, -6, -5, 10);
      ctx.lineTo(-16, 24 + Math.sin(e.anim * 5) * 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    },
    weapon(c) {
      const { e, h, wa } = c;
      // a bone in the hand, about to be thrown
      if (e.state !== 'windup') return;
      ctx.save();
      ctx.translate(h[0], h[1]);
      ctx.rotate(-wa + 1.2);
      boneShape(20, 4.5, '#f3eeda');
      ctx.restore();
    },
  },
  strike(e) {
    G.projs.push({
      k: 'ebone',
      x: e.x + e.face * 34,
      y: e.y,
      z: 108 * e.T.scale,
      vx: e.face * 340,
      rot: 0,
      life: 3,
    });
  },
});
