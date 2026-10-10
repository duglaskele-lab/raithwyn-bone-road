// The shield bearer (TYPES.shield, SHIELD): a skeleton behind a rusty round shield, with a
// spear it pokes from a little further off than a plain skeleton punches. The shield stops
// every blow and shot that comes from the front, in a clang of sparks; from behind (it turns
// round only slowly) it is a plain skeleton. Heavy blows wear the shield down (it cracks), and
// the third (SHIELD.heavy) splinters it; a crushing blow splinters it at once and goes on
// through.
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
const shieldAt = (e) => [e.x + e.face * 24 * e.T.scale, e.y - e.z - 96 * e.T.scale];

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
      z: e.z + 96 * e.T.scale + fxRnd(-30, 30),
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
    spark(x, y + fxRnd(-12, 12), knock ? '#ffe08a' : '#fff4d0', knock);
    for (let k = 0; k < 6; k++)
      G.parts.push({
        k: 'dot',
        x,
        y: y + fxRnd(-14, 14),
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
      // the shield, strapped in front of the body: rusty iron, a rim, a boss, its cracks
      const { e, fl } = c;
      if (!(e.shieldHp > 0)) return;
      const j = e.shieldT > 0 ? Math.sin(e.shieldT * 120) * 2 : 0;
      ctx.save();
      ctx.translate(24 + j, -36);
      ctx.scale(1.15, 1.15);
      ctx.rotate(0.06);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.6;
      ctx.fillStyle = fl ? '#fff' : '#6e4a2c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 33, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : '#8f5f36';
      ctx.beginPath();
      ctx.ellipse(1.5, 0, 11, 28, 0, 0, TAU);
      ctx.fill();
      // rust patches
      ctx.fillStyle = fl ? '#fff' : '#a0522d';
      for (const [x, y, r] of [
        [-3, -14, 4],
        [4, 10, 5],
        [-2, 20, 3],
      ]) {
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.6, r, 0, 0, TAU);
        ctx.fill();
      }
      // the iron boss
      ctx.fillStyle = fl ? '#fff' : '#9aa0a8';
      ctx.beginPath();
      ctx.ellipse(3, 0, 5, 8, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // cracks, one more for every heavy blow it has taken
      ctx.strokeStyle = OL;
      ctx.lineWidth = 1.8;
      const cracks = [
        [
          [2, -6],
          [-4, -16],
          [1, -24],
        ],
        [
          [3, 7],
          [-5, 15],
          [-2, 26],
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
