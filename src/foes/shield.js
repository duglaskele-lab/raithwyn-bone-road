// The shield bearer (TYPES.shield, SHIELD): a skeleton behind a rusty tower shield held low,
// from its shins up to its chest, with a spear it pokes from a little further off than a
// plain skeleton punches. The shield stops every blow and shot that comes from the front, in
// a clang of sparks; from behind (it turns round only slowly) it is a plain skeleton. Heavy
// blows wear the shield down (it cracks), and the third (SHIELD.heavy) splinters it; a
// crushing blow splinters it at once and goes on through.
import { OL, SHIELD, TAU } from '../config.js';
import { fxRnd } from '../util.js';
import { G } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { spark } from '../fx.js';
import { defineFoe } from './registry.js';

/** Is its shield up between it and a blow pushing it `dir`-wards? */
const shieldUp = (e, dir) =>
  e.shieldHp > 0 && dir === -e.face && !['air', 'down', 'getup', 'rise'].includes(e.state);
/** Where the shield is, in the world (its middle). */
const shieldAt = (e) => [e.x + e.face * 26 * e.T.scale, e.y - e.z - 66 * e.T.scale];

/** The shield gives way: rusty splinters and planks fly. */
function splinter(e) {
  const [x, y] = shieldAt(e);
  e.shieldHp = 0;
  SFX.shatter();
  SFX.clang();
  spark(x, y, '#ffcf7a', true);
  G.shake = Math.max(G.shake, 6);
  for (let k = 0; k < 12; k++)
    G.debris.push({
      k: 'shard',
      x: x + fxRnd(-10, 10),
      gy: e.y + fxRnd(-6, 6),
      z: e.z + 66 * e.T.scale + fxRnd(-50, 50),
      vx: -e.face * fxRnd(-80, 260),
      vz: fxRnd(160, 380),
      rot: fxRnd(TAU),
      vr: fxRnd(-18, 18),
      len: fxRnd(5, 10),
      col: k % 3 ? '#8a5a32' : '#a0522d',
      life: 1.1,
    });
}

export default defineFoe('shield', {
  spawn(e) {
    e.shieldHp = SHIELD.heavy;
  },
  /** The shield: a blow or a shot from the front only rings on it. */
  block(e, dir, knock, src, crush) {
    if (!shieldUp(e, dir)) return false;
    if (crush) {
      splinter(e); // a crushing blow smashes it and goes on through
      return false;
    }
    const [x, y] = shieldAt(e);
    if (knock && --e.shieldHp <= 0) {
      splinter(e);
      return true;
    }
    // a clang, sparks glancing off back the way the blow came
    SFX.clang();
    spark(x, y + fxRnd(-30, 20), knock ? '#ffe08a' : '#fff4d0', knock);
    for (let k = 0; k < 6; k++)
      G.parts.push({
        k: 'dot',
        x,
        y: y + fxRnd(-40, 30),
        vx: -dir * fxRnd(120, 320),
        vy: fxRnd(-220, 40),
        g: 600,
        t: 0,
        life: fxRnd(0.2, 0.35),
        s: fxRnd(2, 3.5),
        col: '#ffd27a',
      });
    e.shieldT = 0.15; // (it shudders)
    e.x += dir * (knock ? 10 : 3);
    G.shake = Math.max(G.shake, knock ? 5 : 2);
    return true;
  },
  // it turns round only after the player has been behind it a moment (the way past it)
  tick(e, dt) {
    e.shieldT = (e.shieldT ?? 0) - dt;
    if (e.held === undefined || !(e.shieldHp > 0) || !['chase', 'windup'].includes(e.state)) {
      e.held = e.face;
      e.turnT = 0;
      return;
    }
    if (e.face === e.held) e.turnT = 0;
    else if ((e.turnT += dt) < SHIELD.turn) e.face = e.held;
    else {
      e.held = e.face;
      e.turnT = 0;
    }
  },
  look: {
    head(c) {
      // a dented iron cap
      const { fl } = c;
      ctx.fillStyle = fl ? '#fff' : '#5c5a63';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, -2, 14.5, Math.PI * 1.02, Math.PI * 1.98);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : '#8a5a32';
      ctx.fillRect(-14, -5, 28, 3.5);
    },
    weapon(c) {
      // the spear along the forearm, its point forward
      const { fl, h, wa } = c;
      ctx.save();
      ctx.translate(h[0], h[1]);
      ctx.rotate(-wa);
      ctx.lineCap = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, -46);
      ctx.lineTo(0, 64);
      ctx.stroke();
      ctx.strokeStyle = fl ? '#fff' : '#7c5335';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : '#9aa0a8';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, 62);
      ctx.lineTo(0, 84);
      ctx.lineTo(5, 62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
    legs(c) {
      // the tower shield, held low in front of the body, from the shins up to the chest:
      // rusty planks in an iron rim, two iron bands with rivets, a skull boss; its cracks
      const { e, fl } = c;
      if (!(e.shieldHp > 0)) return;
      const j = e.shieldT > 0 ? Math.sin(e.shieldT * 120) * 2 : 0,
        w = 15,
        top = -56,
        bot = 58;
      const outline = () => {
        ctx.beginPath();
        ctx.moveTo(-w, top + 6);
        ctx.quadraticCurveTo(0, top - 4, w, top + 6);
        ctx.lineTo(w + 1, bot - 6);
        ctx.quadraticCurveTo(0, bot + 4, -w + 1, bot - 6);
        ctx.closePath();
      };
      ctx.save();
      ctx.translate(26 + j, 2);
      ctx.rotate(0.03);
      ctx.lineJoin = 'round';
      // its thickness, seen past its edge
      ctx.fillStyle = fl ? '#fff' : '#3e2a18';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.6;
      ctx.save();
      ctx.translate(-5, 2);
      outline();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      // the iron rim
      ctx.fillStyle = fl ? '#fff' : '#5d5f66';
      outline();
      ctx.fill();
      ctx.stroke();
      // the planks
      ctx.save();
      ctx.translate(0.5, 0);
      ctx.scale(0.82, 0.93);
      outline();
      ctx.restore();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = fl ? '#fff' : '#7a5230';
      ctx.fillRect(-w, top - 6, w * 2 + 2, bot - top + 12);
      if (!fl) {
        // the light on its bulge, rust patches
        ctx.fillStyle = 'rgba(255,220,170,.16)';
        ctx.fillRect(2, top, 6, bot - top);
        ctx.fillStyle = '#9c4f28';
        for (const [x, y, r] of [
          [-6, -34, 5],
          [6, 22, 6],
          [-4, 40, 4],
          [8, -14, 3],
        ]) {
          ctx.beginPath();
          ctx.ellipse(x, y, r * 0.8, r * 1.3, 0, 0, TAU);
          ctx.fill();
        }
      }
      ctx.strokeStyle = 'rgba(30,20,12,.55)';
      ctx.lineWidth = 1.4;
      for (const x of [-6, 3]) {
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bot);
        ctx.stroke();
      }
      ctx.restore();
      // two iron bands across it, riveted
      for (const y of [-32, 32]) {
        ctx.fillStyle = fl ? '#fff' : '#6b6e76';
        ctx.strokeStyle = OL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(-w + 1, y - 3.5, w * 2, 7);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = fl ? '#fff' : '#b8bcc4';
        for (const x of [-8, 0, 8]) {
          ctx.beginPath();
          ctx.arc(x + 1, y, 1.6, 0, TAU);
          ctx.fill();
        }
      }
      // the boss: a skull hammered out of iron
      ctx.fillStyle = fl ? '#fff' : '#9aa0a8';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(1, -2, 8, Math.PI * 0.85, Math.PI * 2.15);
      ctx.lineTo(5, 9);
      ctx.lineTo(-3, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (!fl) {
        ctx.fillStyle = OL;
        for (const x of [-2, 4.5]) {
          ctx.beginPath();
          ctx.ellipse(x, -2, 2.2, 2.8, 0, 0, TAU);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.moveTo(1, 2);
        ctx.lineTo(2.4, 5);
        ctx.lineTo(-0.4, 5);
        ctx.fill();
      }
      // cracks, one more for every heavy blow it has taken
      ctx.strokeStyle = OL;
      ctx.lineWidth = 1.8;
      const cracks = [
        [
          [2, -14],
          [-6, -24],
          [1, -38],
          [-5, -50],
        ],
        [
          [3, 12],
          [-7, 24],
          [0, 40],
          [-6, 52],
        ],
      ];
      for (let k = 0; k < SHIELD.heavy - e.shieldHp && k < cracks.length; k++) {
        ctx.beginPath();
        cracks[k].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  // the spear held level, the shield arm tucked in
  pose: {
    base: { set: { aF: (e, k) => [1.15, 1.45 + 0.03 * k.br], aB: [0.5, 1.6] } },
    guard: { chase: { set: { aF: (e, k) => [1.15, 1.45 + 0.03 * k.br], aB: [0.5, 1.6] } } },
  },
});
