// The things to break in Frostfang Pass (DECOR kinds marked `k4`): wooden crates, clay pots, a
// haystack, a market cart, a stretch of fence, boulders by the mountain road, piles of logs and
// carved wooden idols in the forest. The sturdy ones crack with every blow before they break.
import { DECOR, OL, TAU } from './config.js';
import { ctx } from './gfx.js';

/** Draws one of Frostfang Pass's breakables at the origin (the spot on the floor). */
export function drawDecor4(u, fl) {
  const D = DECOR[u.decor],
    cracked = D.hp - u.hp;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  const fill = (c) => {
    ctx.fillStyle = fl ? '#fff' : c;
    ctx.fill();
    ctx.stroke();
  };
  const rect = (x, y, w, h, c) => {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    fill(c);
  };
  const crack = (pts) => {
    if (!cracked) return;
    ctx.save();
    ctx.strokeStyle = OL;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    pts
      .slice(0, 2 + cracked * 2)
      .forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.restore();
  };
  switch (u.decor) {
    case 'crate': {
      // planks in a frame, a cross brace
      rect(-28, -58, 56, 58, '#9a6a3a');
      ctx.strokeStyle = OL;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const y of [-40, -20]) {
        ctx.moveTo(-28, y);
        ctx.lineTo(28, y);
      }
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.strokeStyle = fl ? '#fff' : '#6a4630';
      ctx.beginPath();
      ctx.moveTo(-24, -4);
      ctx.lineTo(24, -54);
      ctx.stroke();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = OL;
      ctx.strokeRect(-28, -58, 56, 58);
      crack([
        [-10, -58],
        [-4, -40],
        [-12, -24],
        [-2, -8],
      ]);
      break;
    }
    case 'pot': {
      // a clay pot with a painted band
      ctx.beginPath();
      ctx.moveTo(-8, -44);
      ctx.lineTo(8, -44);
      ctx.lineTo(9, -38);
      ctx.quadraticCurveTo(22, -28, 18, -10);
      ctx.quadraticCurveTo(14, 0, 0, 0);
      ctx.quadraticCurveTo(-14, 0, -18, -10);
      ctx.quadraticCurveTo(-22, -28, -9, -38);
      ctx.closePath();
      fill('#b8643a');
      ctx.fillStyle = fl ? '#fff' : '#e8d0a0';
      ctx.fillRect(-18, -26, 36, 5);
      ctx.fillStyle = OL;
      for (let k = 0; k < 4; k++) ctx.fillRect(-14 + k * 9, -25, 3, 3);
      break;
    }
    case 'hay': {
      // a haystack, straws sticking out
      ctx.beginPath();
      ctx.moveTo(-40, 0);
      ctx.quadraticCurveTo(-44, -60, 0, -70);
      ctx.quadraticCurveTo(44, -60, 40, 0);
      ctx.closePath();
      fill('#e3c25a');
      ctx.strokeStyle = fl ? '#fff' : '#a8862a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k < 9; k++) {
        const x = -30 + k * 7.5;
        ctx.moveTo(x, -6);
        ctx.lineTo(x + (k % 2 ? 6 : -4), -40 - (k % 3) * 8);
      }
      ctx.stroke();
      ctx.strokeStyle = fl ? '#fff' : '#8a5a32';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-38, -30);
      ctx.quadraticCurveTo(0, -22, 38, -30);
      ctx.stroke();
      break;
    }
    case 'cart': {
      // a market cart: a box on two wheels, cabbages heaped in it, its shafts on the ground
      ctx.beginPath();
      ctx.moveTo(30, -20);
      ctx.lineTo(70, -2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = OL;
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = fl ? '#fff' : '#6a4630';
      ctx.stroke();
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      rect(-52, -64, 92, 40, '#8a5a32');
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.arc(-40 + k * 18, -68 - (k % 2) * 6, 10, 0, TAU);
        fill(k % 2 ? '#6aa84a' : '#88c05a');
      }
      for (const wx of [-30, 18]) {
        ctx.beginPath();
        ctx.arc(wx, -18, 18, 0, TAU);
        fill('#6a4630');
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI;
          ctx.moveTo(wx - Math.cos(a) * 16, -18 - Math.sin(a) * 16);
          ctx.lineTo(wx + Math.cos(a) * 16, -18 + Math.sin(a) * 16);
        }
        ctx.stroke();
      }
      crack([
        [-20, -64],
        [-14, -50],
        [-22, -38],
        [-10, -26],
        [-18, -24],
        [-8, -40],
      ]);
      break;
    }
    case 'fence': {
      for (const x of [-38, -12, 14, 34]) rect(x - 4, -62, 8, 62, '#9a7a52');
      rect(-44, -50, 88, 7, '#8a6a46');
      rect(-44, -26, 88, 7, '#8a6a46');
      break;
    }
    case 'rock': {
      // a boulder: three blows crack it, the fourth... (D.hp)
      ctx.beginPath();
      ctx.moveTo(-40, 0);
      ctx.lineTo(-42, -30);
      ctx.lineTo(-24, -60);
      ctx.lineTo(6, -66);
      ctx.lineTo(32, -50);
      ctx.lineTo(42, -20);
      ctx.lineTo(38, 0);
      ctx.closePath();
      fill('#7d8590');
      ctx.fillStyle = fl ? '#fff' : 'rgba(255,255,255,.18)';
      ctx.beginPath();
      ctx.moveTo(-20, -56);
      ctx.lineTo(4, -60);
      ctx.lineTo(-10, -44);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = fl ? '#fff' : '#5f8a4e';
      ctx.beginPath();
      ctx.ellipse(-26, -4, 12, 5, 0, 0, TAU);
      ctx.fill();
      crack([
        [4, -66],
        [-4, -44],
        [8, -30],
        [-6, -12],
        [4, -2],
      ]);
      break;
    }
    case 'log': {
      // a pile of logs, their cut ends towards us
      for (const [x, y] of [
        [-22, -14],
        [0, -14],
        [22, -14],
        [-11, -36],
        [11, -36],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, TAU);
        fill('#9a7a52');
        ctx.strokeStyle = fl ? '#fff' : '#6a4630';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = OL;
        ctx.lineWidth = 2.4;
      }
      crack([
        [-11, -48],
        [-6, -30],
        [0, -20],
      ]);
      break;
    }
    case 'idol': {
      // a carved wooden idol: a post with a grim face, horns, a skull at its foot
      rect(-14, -110, 28, 110, '#8a6a46');
      ctx.beginPath();
      ctx.moveTo(-14, -104);
      ctx.quadraticCurveTo(-30, -112, -28, -132);
      ctx.quadraticCurveTo(-20, -116, -10, -110);
      fill('#efe6cf');
      ctx.beginPath();
      ctx.moveTo(14, -104);
      ctx.quadraticCurveTo(30, -112, 28, -132);
      ctx.quadraticCurveTo(20, -116, 10, -110);
      fill('#efe6cf');
      ctx.fillStyle = fl ? '#fff' : '#3a2a1e';
      ctx.fillRect(-9, -92, 6, 6);
      ctx.fillRect(3, -92, 6, 6);
      ctx.fillRect(-8, -74, 16, 4);
      ctx.fillStyle = fl ? '#fff' : '#b02a3a';
      ctx.fillRect(-14, -58, 28, 6);
      ctx.beginPath();
      ctx.arc(10, -8, 8, 0, TAU);
      fill('#efe6cf');
      crack([
        [-2, -110],
        [4, -90],
        [-4, -70],
        [2, -50],
      ]);
      break;
    }
  }
}
