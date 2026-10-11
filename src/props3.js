// The things to break in Neon Kyoto (DECOR kinds marked `k3`): lamp posts with a neon sign
// hung off their arm (break the post and the sign comes down on whoever is under it), neon
// signs on stands, paper lanterns on poles, vending machines (three blows, then food spills
// out), Jawacorp's power cells (an electric blast that throws robots about) and holographic
// projectors on the roofs. Drawing them, and the sign falling.
import { DECOR, OL, TAU } from './config.js';
import { fxRnd } from './util.js';
import { APP, G } from './state.js';
import { ctx } from './gfx.js';
import { SFX } from './audio.js';
import { spark } from './fx.js';
import { hurtEnemy } from './combat.js';
import { jawaLogo } from './bg3.js';

/** A falling sign's harm and reach: whoever stands under it when it lands is hit hard. */
export const FSIGN = { dmg: 32, h: 190, rx: 70, ry: 34, g: 1700 };
const NEON = ['#ff4fb4', '#4fe3ff', '#ffd23a'];
/** Which side of its post a sign hangs on, and its colour: fixed by where the post stands. */
const side = (u) => (Math.floor(u.x / 97) % 2 ? 1 : -1);
const neonOf = (u) => NEON[Math.floor(u.x / 53) % 3];

/** A made-up glyph, as on the city's signs. */
function glyph(x, y, s, seed) {
  let a = (seed * 9301 + 49297) % 233280;
  const r = () => (a = (a * 9301 + 49297) % 233280) / 233280,
    pt = () => [x + (((r() * 3) | 0) - 1) * s * 0.4, y + (((r() * 3) | 0) - 1) * s * 0.4];
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const [p, q] = pt(),
      [c, d] = pt();
    ctx.moveTo(p, q);
    ctx.lineTo(c, d === q && c === p ? d + s * 0.4 : d);
  }
  ctx.stroke();
}
/** A neon panel of glyphs, `w`×`h`, centred on (x, y). */
function panel(x, y, w, h, col, fl, seed) {
  ctx.fillStyle = fl ? '#fff' : '#17121f';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  if (!APP.lowFx) {
    ctx.shadowColor = col;
    ctx.shadowBlur = 8;
  }
  ctx.strokeRect(x - w / 2 + 4, y - h / 2 + 4, w - 8, h - 8);
  const n = Math.max(1, Math.round((w - 10) / 24));
  for (let k = 0; k < n; k++) glyph(x - ((n - 1) * 24) / 2 + k * 24, y, 16, seed + k);
  ctx.restore();
}

/** Draws one of Neon Kyoto's breakables at the origin (the spot on the floor). */
export function drawDecor3(u, fl) {
  const D = DECOR[u.decor],
    cracked = D.hp - u.hp;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  const box = (x, y, w, h, c) => {
    ctx.fillStyle = fl ? '#fff' : c;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  };
  switch (u.decor) {
    case 'post': {
      // a lamp post, its arm out to one side, a neon sign hung off it on two chains
      const s = side(u),
        lean = cracked ? 0.05 * s : 0;
      ctx.rotate(lean);
      box(-5, -FSIGN.h - 20, 10, FSIGN.h + 20, '#3a3f4c');
      box(-12, -14, 24, 14, '#2b2f3a');
      box(s > 0 ? 0 : -76, -FSIGN.h - 20, 76, 7, '#3a3f4c');
      ctx.strokeStyle = '#1b1b22';
      ctx.lineWidth = 2;
      for (const cx of [s * 34, s * 66]) {
        ctx.beginPath();
        ctx.moveTo(cx, -FSIGN.h - 13);
        ctx.lineTo(cx, -FSIGN.h + 8);
        ctx.stroke();
      }
      panel(s * 50, -FSIGN.h + 32, 64, 48, neonOf(u), fl, Math.floor(u.x));
      if (cracked) {
        ctx.strokeStyle = OL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, -60);
        ctx.lineTo(3, -70);
        ctx.lineTo(-2, -80);
        ctx.stroke();
      }
      break;
    }
    case 'sign': {
      // a neon sign on a stand
      box(-4, -70, 8, 70, '#2b2f3a');
      box(-16, -6, 32, 6, '#2b2f3a');
      panel(0, -104, 40, 72, neonOf(u), fl, Math.floor(u.x) + 3);
      break;
    }
    case 'paper': {
      // a paper lantern on a wooden pole
      box(-3, -96, 6, 96, '#5a3a24');
      box(-14, -6, 28, 6, '#3a2618');
      const sw = Math.sin(G.time * 1.6 + u.x) * 2;
      ctx.fillStyle = fl ? '#fff' : '#e8402f';
      ctx.beginPath();
      ctx.ellipse(sw, -118, 16, 22, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2b1a14';
      ctx.fillRect(sw - 9, -142, 18, 5);
      ctx.fillRect(sw - 9, -99, 18, 5);
      ctx.fillStyle = 'rgba(255,220,150,.45)';
      ctx.beginPath();
      ctx.ellipse(sw, -118, 8, 14, 0, 0, TAU);
      ctx.fill();
      break;
    }
    case 'vend': {
      // a vending machine: a lit front of cans, a slot, Jawacorp's sign; cracks with every blow
      box(-32, -118, 64, 118, D.col);
      box(-26, -110, 36, 70, '#cfe9ff');
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++) {
          ctx.fillStyle = fl ? '#fff' : ['#ff4fb4', '#4fe3ff', '#ffd23a', '#7dff8a'][(r + c) % 4];
          ctx.fillRect(-23 + c * 8, -106 + r * 16, 6, 12);
        }
      box(14, -100, 12, 22, '#2b2f3a');
      box(-24, -30, 34, 14, '#1b1b22');
      if (!fl) jawaLogo(20, -56, 8);
      ctx.strokeStyle = OL;
      ctx.lineWidth = 1.8;
      const cracks = [
        [-24, -100, -10, -84, -18, -64],
        [8, -108, -4, -88, 6, -70],
      ];
      for (const c of cracks.slice(0, cracked)) {
        ctx.beginPath();
        ctx.moveTo(c[0], c[1]);
        ctx.lineTo(c[2], c[3]);
        ctx.lineTo(c[4], c[5]);
        ctx.stroke();
      }
      break;
    }
    case 'cell': {
      // a Jawacorp power cell: a squat cylinder, a glowing band, hazard stripes; struck, it
      // crackles and goes off a moment later
      const lit = u.fuseT !== undefined,
        on = lit && Math.floor(G.time * 16) % 2;
      box(-20, -64, 40, 64, '#30343e');
      ctx.fillStyle = fl || on ? '#ffffff' : D.col;
      ctx.fillRect(-20, -44, 40, 12);
      ctx.strokeRect(-20, -44, 40, 12);
      ctx.fillStyle = '#e8c23a';
      for (let k = -20; k < 20; k += 10) {
        ctx.beginPath();
        ctx.moveTo(k, -14);
        ctx.lineTo(k + 5, -14);
        ctx.lineTo(k + 10, -4);
        ctx.lineTo(k + 5, -4);
        ctx.closePath();
        ctx.fill();
      }
      box(-12, -72, 24, 8, '#1b1b22');
      if (lit) {
        ctx.strokeStyle = '#bff6ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = G.time * 30 + k * 2.1;
          ctx.moveTo(0, -38);
          ctx.lineTo(Math.cos(a) * 18, -38 + Math.sin(a) * 18);
          ctx.lineTo(Math.cos(a + 0.6) * 30, -38 + Math.sin(a + 0.6) * 30);
        }
        ctx.stroke();
      }
      break;
    }
    case 'holo': {
      // a holographic projector: a squat base and Jawacorp's sign hovering, flickering
      box(-22, -16, 44, 16, '#2b2f3a');
      ctx.fillStyle = fl ? '#fff' : D.col;
      ctx.fillRect(-12, -20, 24, 4);
      const k = Math.floor(G.time * 9 + u.x) % 37 === 0 ? 0.3 : 1;
      ctx.save();
      ctx.globalAlpha = 0.25 * k;
      ctx.fillStyle = '#5fd0ff';
      ctx.beginPath();
      ctx.moveTo(-10, -20);
      ctx.lineTo(10, -20);
      ctx.lineTo(34, -120);
      ctx.lineTo(-34, -120);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.75 * k;
      jawaLogo(0, -96 + Math.sin(G.time * 2) * 4, 26);
      ctx.restore();
      break;
    }
  }
}

/** A post is broken: its sign comes down, from its arm, onto the floor below. */
export function dropSign(u, dir = 1) {
  G.projs.push({
    k: 'fsign',
    x: u.x + side(u) * 50,
    y: u.y,
    z: FSIGN.h - 32,
    vz: 0,
    vx: dir * 40,
    rot: 0,
    col: neonOf(u),
    seed: Math.floor(u.x),
    life: 6,
  });
}
/** The sign falling: it lands with a crash on whoever is under it, and shatters. */
export function fallSign(q, dt) {
  q.x += q.vx * dt;
  q.vz -= FSIGN.g * dt;
  q.z += q.vz * dt;
  q.rot += dt * 2.5;
  if (q.z > 0) return;
  q.life = 0;
  for (const e of G.enemies)
    if (
      !e.dead &&
      !e.dying &&
      Math.abs(e.x - q.x) < FSIGN.rx &&
      Math.abs(e.y - q.y) < FSIGN.ry &&
      e.z < 60
    )
      hurtEnemy(e, FSIGN.dmg, e.x >= q.x ? 1 : -1, true, 'sign');
  SFX.shatter();
  SFX.thud();
  G.shake = Math.max(G.shake, 8);
  spark(q.x, q.y - 20, q.col, true);
  for (let i = 0; i < 14; i++)
    G.debris.push({
      k: 'shard',
      x: q.x + fxRnd(-30, 30),
      gy: q.y + fxRnd(-6, 8),
      z: fxRnd(4, 30),
      vx: fxRnd(-220, 220),
      vz: fxRnd(140, 360),
      rot: fxRnd(TAU),
      vr: fxRnd(-12, 12),
      len: fxRnd(6, 12),
      col: i % 3 ? '#17121f' : q.col,
      life: 2,
    });
}
/** The falling sign, at (x, y) on the screen. */
export function drawFallingSign(q, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(q.rot) * 0.25);
  panel(0, 0, 64, 48, q.col, false, q.seed);
  ctx.restore();
}
