// What Jawacorp's robots (Neon Kyoto) share: metal armour drawn over the skeleton rig (plates
// on the limbs, a chest plate with a glowing core, the maker's sign on it), dying in a burst of
// parts and sparks instead of bones, and the plasma bolts their guns fire.
import { OL, TAU, W } from '../config.js';
import { fxRnd } from '../util.js';
import { APP, G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { spark } from '../fx.js';
import { hitPlayer } from '../combat.js';
import { scoreMult } from '../style.js';
import { jawaLogo } from '../bg3.js';

/** A point a fraction `u` of the way from `p` to `q`. */
export const along = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
/** An armour plate along a limb from `p` to `q`, `w` wide: the outline, the metal, a sheen. */
export function plate(p, q, w, col, fl, sheen = 'rgba(255,255,255,.35)') {
  ctx.lineCap = 'round';
  for (const [lw, c] of [
    [w + 4, OL],
    [w, fl ? '#fff' : col],
  ]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(...p);
    ctx.lineTo(...q);
    ctx.stroke();
  }
  if (fl) return;
  const n = [q[1] - p[1], p[0] - q[0]],
    d = Math.hypot(...n) || 1,
    o = (w * 0.22) / d;
  ctx.strokeStyle = sheen;
  ctx.lineWidth = Math.max(1.5, w * 0.18);
  ctx.beginPath();
  ctx.moveTo(p[0] + n[0] * o, p[1] + n[1] * o);
  ctx.lineTo(q[0] + n[0] * o, q[1] + n[1] * o);
  ctx.stroke();
}
/** A joint: a round metal knob. */
function knob(p, r, col, fl) {
  ctx.fillStyle = fl ? '#fff' : col;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p[0], p[1], r, 0, TAU);
  ctx.fill();
  ctx.stroke();
}
/** A limb (hip/shoulder, knee/elbow, foot/hand) plated: thick upper part, slimmer lower. */
function limbPlates(L, w, A, fl, foot) {
  const [a, b, c] = L;
  plate(along(a, b, 0.08), along(a, b, 0.92), w, A.body, fl);
  plate(along(b, c, 0.1), along(b, c, foot ? 0.85 : 0.95), w * 0.82, A.body, fl);
  knob(b, w * 0.42, A.trim, fl);
  if (foot) {
    // the boot
    ctx.fillStyle = fl ? '#fff' : A.trim;
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c[0] - 8, c[1] - 6);
    ctx.lineTo(c[0] + 16, c[1] - 4);
    ctx.lineTo(c[0] + 18, c[1] + 6);
    ctx.lineTo(c[0] - 9, c[1] + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
/**
 * The look hooks of a robot in armour `A` = { body, trim, glow, w (plate width), chest }:
 * plates on every limb, a chest plate with its core and Jawacorp's sign; `head` and `weapon`
 * draw its own head and what it holds; `chest(c)` adds to the chest (over the plate).
 */
export function robotLook(A, head, weapon, chest) {
  const w = A.w ?? 10;
  return {
    back(c) {
      const { o, fl, limb, TH, SH, UA, FA, sh } = c;
      limbPlates(limb([-3, 0], o.lB[0], o.lB[1], TH, SH), w, dim(A), fl, true);
      limbPlates(limb([sh[0] - 3, sh[1]], o.aB[0], o.aB[1], UA, FA), w * 0.9, dim(A), fl);
    },
    torso(c) {
      const { o, fl } = c;
      ctx.save();
      ctx.rotate(o.lean);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      // the waist, in segments
      ctx.fillStyle = fl ? '#fff' : A.trim;
      ctx.fillRect(-9, -16, 18, 18);
      ctx.strokeRect(-9, -16, 18, 18);
      // the chest plate
      const cw = A.chest ?? 1;
      ctx.fillStyle = fl ? '#fff' : A.body;
      ctx.beginPath();
      ctx.moveTo(-16 * cw, -54);
      ctx.quadraticCurveTo(10, -60, 22 * cw, -50);
      ctx.quadraticCurveTo(28 * cw, -32, 16, -16);
      ctx.lineTo(-12, -16);
      ctx.quadraticCurveTo(-20 * cw, -34, -16 * cw, -54);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (!fl) {
        ctx.strokeStyle = 'rgba(255,255,255,.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, -50);
        ctx.quadraticCurveTo(8, -54, 18, -46);
        ctx.stroke();
        // the core, glowing
        ctx.fillStyle = A.glow;
        if (!APP.lowFx) {
          ctx.shadowColor = A.glow;
          ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.arc(8, -32, 4.5, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        jawaLogo(-6, -40, 6);
      }
      chest?.(c);
      ctx.restore();
      // the pelvis plate
      ctx.fillStyle = fl ? '#fff' : A.trim;
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-12, -4);
      ctx.lineTo(13, -4);
      ctx.lineTo(10, 9);
      ctx.lineTo(-10, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    },
    legs(c) {
      const { o, fl, limb, TH, SH } = c;
      limbPlates(limb([3, 0], o.lF[0], o.lF[1], TH, SH), w, A, fl, true);
    },
    head,
    weapon,
    arm(c) {
      const { fl, L } = c;
      limbPlates(L, w * 0.9, A, fl);
      knob(L[0], w * 0.6, A.trim, fl);
      // a gauntlet
      knob(L[2], w * 0.55, A.trim, fl);
    },
  };
}
/** The back limbs are in shade. */
const dimmed = new Map();
function dim(A) {
  if (!dimmed.has(A)) {
    const d = (h) => {
      const n = parseInt(h.slice(1), 16),
        f = (v) => Math.round(v * 0.72);
      return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
    };
    dimmed.set(A, { ...A, body: d(A.body), trim: d(A.trim) });
  }
  return dimmed.get(A);
}
/** A helmet with a visor band glowing across it: in head space (the skull at 0,-1, facing +x).
 *  `ears` adds a cat's pointed ears. */
export function visorHelm(fl, A, ears = false) {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  if (ears)
    for (const [x, s] of [
      [-8, 1],
      [6, 1.1],
    ]) {
      ctx.fillStyle = fl ? '#fff' : A.body;
      ctx.beginPath();
      ctx.moveTo(x - 7 * s, -11);
      ctx.lineTo(x - 2 * s, -30 * s);
      ctx.lineTo(x + 7 * s, -12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (!fl) {
        ctx.fillStyle = A.glow;
        ctx.beginPath();
        ctx.moveTo(x - 3 * s, -13);
        ctx.lineTo(x - 1.5 * s, -24 * s);
        ctx.lineTo(x + 3 * s, -13);
        ctx.closePath();
        ctx.fill();
      }
    }
  ctx.fillStyle = fl ? '#fff' : A.body;
  ctx.beginPath();
  ctx.arc(1, -1, 16, Math.PI * 0.55, Math.PI * 2.1);
  ctx.lineTo(14, 12);
  ctx.lineTo(2, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : '#0b0d14';
  ctx.beginPath();
  ctx.moveTo(-2, -7);
  ctx.lineTo(17, -6);
  ctx.lineTo(17, 3);
  ctx.lineTo(-1, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!fl) {
    ctx.fillStyle = A.glow;
    if (!APP.lowFx) {
      ctx.shadowColor = A.glow;
      ctx.shadowBlur = 8;
    }
    ctx.fillRect(2, -4, 14, 3.5);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(1, -1, 12, Math.PI * 1.1, Math.PI * 1.5);
    ctx.stroke();
  }
}

/** A robot destroyed: it bursts into plates, bolts and sparks (no bones), a puff of smoke. */
export function robotDie(e, dir) {
  P.score += Math.round(e.T.score * scoreMult());
  e.dead = true;
  const s = e.T.scale;
  SFX.shatter();
  SFX.clang();
  spark(e.x, e.y - e.z - 90 * s, '#bff6ff', true);
  G.shake = Math.max(G.shake, 5);
  for (let i = 0; i < 16; i++)
    G.debris.push({
      k: 'shard',
      x: e.x + fxRnd(-14, 14),
      gy: e.y + fxRnd(-8, 8),
      z: e.z + fxRnd(20, 140) * s,
      vx: dir * fxRnd(60, 320) + fxRnd(-90, 90),
      vz: fxRnd(180, 480),
      rot: fxRnd(TAU),
      vr: fxRnd(-15, 15),
      len: fxRnd(8, 18) * s,
      col: i % 3 ? e.T.col : e.T.dk,
      life: fxRnd(2, 3),
    });
  for (let i = 0; i < 12; i++)
    G.parts.push({
      k: 'dot',
      x: e.x + fxRnd(-20, 20),
      y: e.y - e.z - fxRnd(30, 140) * s,
      vx: fxRnd(-260, 260),
      vy: fxRnd(-320, 40),
      g: 700,
      t: 0,
      life: fxRnd(0.3, 0.6),
      s: fxRnd(2, 4),
      col: i % 2 ? '#bff6ff' : '#ffd27a',
    });
  for (let i = 0; i < 4; i++)
    G.parts.push({
      k: 'smoke',
      x: e.x + fxRnd(-20, 20),
      y: e.y - e.z - fxRnd(40, 100),
      vx: fxRnd(-20, 20),
      vy: fxRnd(-60, -20),
      g: 0,
      t: 0,
      life: fxRnd(0.8, 1.2),
      s: fxRnd(14, 24),
    });
}

/** A plasma bolt from a robot's gun, flying straight along its lane. */
export function fireBolt(e, x, z, speed, dmg, col = '#ff4fb4', knock = false, quiet = false) {
  G.projs.push({ k: 'rbolt', x, y: e.y, z, vx: e.face * speed, dmg, col, knock, life: 3 });
  if (!quiet) SFX.zap();
}
/** The bolt flies on; it hurts the player it meets, and is gone off the screen. */
export function boltFly(q) {
  if (Math.abs(P.x - q.x) < 24 && Math.abs(P.y - q.y) < 20 && P.z < q.z + 30)
    if (hitPlayer(q.dmg, Math.sign(q.vx), q.knock)) {
      q.life = 0;
      spark(q.x, q.y - q.z, q.col, false);
    }
  if (q.x < G.cam - 100 || q.x > G.cam + W + 100) q.life = 0;
}
/** The bolt: a bright streak with a glowing head. */
export function drawBolt(q, x, y) {
  const d = Math.sign(q.vx) || 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(x - d * 60, y, x, y);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, q.col);
  ctx.strokeStyle = g;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - d * 60, y);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Jawacorp's robots, by type. */
const ROBOTS = new Set([
  'guard',
  'catguard',
  'drone',
  'ninja',
  'monk',
  'turret',
  'barrier',
  'chef',
]);
export const isRobot = (e) => ROBOTS.has(e.type);
/** A shield of light put on a robot by an omnic monk: a bubble of hexagons round it, fading
 *  and flickering in its last second. */
export function drawOrb(e) {
  const left = e.orbUntil - G.time;
  if (!(left > 0) || e.dead) return;
  const s = e.T.scale,
    x = e.x - G.cam,
    y = e.y - e.z - 92 * s,
    r = 74 * s,
    a = left < 1 && Math.floor(G.time * 14) % 2 ? 0.25 : 0.55;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(110,220,255,${a * 0.25})`;
  ctx.strokeStyle = `rgba(170,240,255,${a})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.62, r, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = -3; k <= 3; k++) {
    const yy = y + k * r * 0.26,
      w = r * 0.62 * Math.sqrt(Math.max(0, 1 - (k * 0.26) ** 2));
    ctx.moveTo(x - w, yy);
    ctx.lineTo(x + w, yy);
  }
  ctx.stroke();
  ctx.restore();
}
