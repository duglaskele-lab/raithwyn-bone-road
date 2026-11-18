// The things to break in the Wastelands (DECOR kinds marked `k4`): rusty oil drums with a
// radiation sign (two blows: dented first), stacks of old tyres, a road sign of the old highway
// bent over on its post.
import { DECOR, OL, TAU } from './config.js';
import { ctx } from './gfx.js';

/** Draws one of the Wastelands' breakables at the origin (the spot on the floor). */
export function drawDecor4(u, fl) {
  const D = DECOR[u.decor],
    dented = D.hp - u.hp;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  const fill = (c) => {
    ctx.fillStyle = fl ? '#fff' : c;
    ctx.fill();
    ctx.stroke();
  };
  if (u.decor === 'drum') {
    // a rusty oil drum: hoops, a yellow radiation sign, a dent once struck
    ctx.beginPath();
    ctx.roundRect(-14, -58, 28, 58, 4);
    fill('#a0552e');
    ctx.fillStyle = fl ? '#fff' : '#7a3a1c';
    ctx.fillRect(-13, -42, 26, 4);
    ctx.fillRect(-13, -18, 26, 4);
    ctx.beginPath();
    ctx.ellipse(0, -58, 14, 4, 0, 0, TAU);
    fill('#8a4523');
    ctx.beginPath();
    ctx.arc(0, -30, 7, 0, TAU);
    fill('#e2b13a');
    ctx.fillStyle = OL;
    for (let i = 0; i < 3; i++) {
      const a = (i * TAU) / 3 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.arc(0, -30, 6, a - 0.45, a + 0.45);
      ctx.closePath();
      ctx.fill();
    }
    if (dented) {
      ctx.beginPath();
      ctx.moveTo(-14, -50);
      ctx.quadraticCurveTo(-4, -46, -8, -36);
      ctx.stroke();
    }
  } else if (u.decor === 'tyres') {
    // three old tyres in a stack
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -8 - i * 16, 18, 9, 0, 0, TAU);
      fill(i % 2 ? '#34302e' : '#2c2a2a');
      ctx.beginPath();
      ctx.ellipse(0, -10 - i * 16, 8, 3.5, 0, 0, TAU);
      fill('#121014');
    }
  } else {
    // a road sign of the old highway, bent on its post, bullet holes in it
    ctx.save();
    ctx.rotate(-0.12);
    ctx.beginPath();
    ctx.rect(-3, -100, 6, 100);
    fill('#7d8590');
    ctx.beginPath();
    ctx.moveTo(0, -132);
    ctx.lineTo(20, -112);
    ctx.lineTo(0, -92);
    ctx.lineTo(-20, -112);
    ctx.closePath();
    fill('#c9a23a');
    ctx.fillStyle = OL;
    ctx.fillRect(-2, -122, 4, 12);
    ctx.fillRect(-2, -106, 4, 4);
    for (const [x, y] of [
      [-9, -114],
      [8, -104],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
