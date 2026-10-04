// The zombie in power armour: an elite of Old Quarry, built twice as finely as the others.
// A walking tank in gunmetal plates with a glowing reactor on its back and a minigun on its
// arm. It spins the gun up, then sprays the ground in front of it, close in first and further
// and further out (the bullets kick up dust where they land). Up close it winds up a kick
// (0.6 s, a red patch on the ground shows where it lands) that knocks the player down. It
// always walks in from the side of the screen, and falls down dead rather than into bones.
// Heavy: only crushing blows move it.
import { ARMOR, CORPSE_T, OL, TAU, W } from '../config.js';
import { clamp, ease, random, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { hitPlayer } from '../combat.js';
import { ctx } from '../gfx.js';
import { drawAura } from '../skeleton.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';
import { chain, seg } from './lizard.js';

const THIGH = 44,
  SHIN = 44,
  UARM = 34,
  FARM = 32;

function armorPose(e) {
  const br = Math.sin(e.anim * 2 + e.seed),
    o = {
      lean: 0.08,
      head: 0,
      rot: 0,
      hipH: null,
      lF: [0.18, -0.05],
      lB: [-0.2, -0.3],
      aF: [0.5 + 0.03 * br, 1.35],
      aB: [0.1, 0.7],
      bob: br * 1.5,
      spin: e.spinA ?? 0,
      recoil: 0,
      flash: false,
    };
  if (e.moving && e.state === 'chase') {
    // heavy stomping steps
    const s = Math.sin(e.walkT),
      c = Math.cos(e.walkT);
    o.lF = [0.4 * s, 0.4 * s - 0.1 - 0.5 * Math.max(0, c)];
    o.lB = [-0.4 * s, -0.4 * s - 0.1 - 0.5 * Math.max(0, -c)];
    o.bob = Math.abs(c) * 4;
    o.aB = [0.1 + 0.25 * s, 0.7];
  }
  const t = e.t;
  switch (e.state) {
    case 'spin':
    case 'fire':
    case 'cool': {
      // the gun up and level, the body braced
      const u = e.state === 'spin' ? ease(clamp(t / 0.35, 0, 1)) : 1;
      o.aF = [0.5 + (1.25 - 0.5) * u, 1.35 + (1.57 - 1.35) * u];
      o.lF = [0.45, 0.05];
      o.lB = [-0.45, -0.55];
      o.lean = 0.12 - 0.1 * u;
      if (e.state === 'fire') {
        o.recoil = Math.sin(e.anim * 90) * 2.5;
        o.flash = Math.floor(e.anim * 30) % 2 === 0;
        o.lean = -0.04 + Math.sin(e.anim * 60) * 0.01;
      }
      break;
    }
    case 'windup': {
      // the kick: the knee comes up and the foot cocks back, the body leans away; it shakes
      // on the hydraulics just before the blow
      const u = ease(clamp(t / 0.35, 0, 1)),
        k = t > 0.35 ? Math.sin(t * 60) * 0.04 : 0;
      o.lF = [0.18 + (1.25 - 0.18) * u + k, -0.05 + (-0.75 + 0.05) * u];
      o.lB = [-0.1, -0.15];
      o.lean = 0.08 - 0.26 * u;
      o.aB = [0.1 + 0.5 * u, 0.7 + 0.4 * u];
      break;
    }
    case 'attack': {
      // the foot shoots straight out
      const u = clamp(t / 0.07, 0, 1);
      o.lF = [1.25 + (1.55 - 1.25) * u, -0.75 + (1.6 + 0.75) * u];
      o.lB = [-0.2, -0.25];
      o.lean = -0.18 - 0.1 * u;
      o.aB = [0.6, 1.1];
      break;
    }
    case 'recover': {
      const u = ease(clamp(t / e.T.rec, 0, 1));
      o.lF = [1.55 + (0.18 - 1.55) * u, 1.6 + (-0.05 - 1.6) * u];
      o.lean = -0.28 + 0.36 * u;
      break;
    }
    case 'hurt':
      o.lean = -0.18;
      o.head = -0.2;
      break;
    case 'fall':
    case 'air':
      o.rot = -Math.min(1.35, t * 4.5);
      o.hipH = 50;
      o.lF = [0.9, 0.3];
      o.lB = [0.5, -0.1];
      o.aF = [1.6, 2.0];
      break;
    case 'corpse':
    case 'down':
      o.rot = -1.5;
      o.hipH = 18;
      o.lF = [0.2, 0.1];
      o.lB = [0.1, 0.05];
      o.aF = [2.4, 2.6];
      break;
    case 'getup': {
      const u = ease(clamp(t / 0.6, 0, 1));
      o.rot = -1.5 * (1 - u);
      o.hipH = 18 + 70 * u;
      break;
    }
    case 'rise':
      o.aF = [2.5, 2.8];
      o.aB = [2.3, 2.7];
      break;
  }
  // the gun: aimed at where its bullets land. As it spins up it tips down to the ground just
  // in front, and fires from there, lifting as the stream walks out.
  if (e.state === 'spin' || e.state === 'fire') {
    o.aF[0] = 0.9;
    const fire = e.state === 'fire',
      a = aimAt(e, o, e.x + e.face * (fire ? e.reachD : ARMOR.reach0), fire ? e.aimY : e.y),
      u = fire ? 1 : ease(clamp(e.t / 0.45, 0, 1));
    o.aF[1] = 1.35 + (a - 1.35) * u;
  }
  return o;
}
/** Where its parts are, in its own frame (feet at 0,0, facing +x, before scaling). */
function geo(o) {
  const lh = (l) => THIGH * Math.cos(l[0]) + SHIN * Math.cos(l[1]),
    hipH = (o.hipH ?? Math.max(lh(o.lF), lh(o.lB))) + 10,
    neck = [Math.sin(o.lean) * 62, -Math.cos(o.lean) * 62],
    sh = [neck[0] * 0.86, neck[1] * 0.86],
    A = chain(
      [sh[0] + 4, sh[1] + 4],
      [
        [o.aF[0], UARM],
        [o.aF[1], FARM],
      ],
    );
  return { hipH, neck, sh, A };
}
/** A point of its frame (hip at 0,0 after the body's lift) on the road. */
function toWorld(e, o, g, p) {
  const s = e.T.scale,
    c = Math.cos(o.rot),
    n = Math.sin(o.rot),
    x = p[0] * c - p[1] * n,
    y = p[0] * n + p[1] * c;
  return [e.x + e.face * s * x, e.y - e.z + s * (y - g.hipH + o.bob)];
}
/** The forearm angle that points the gun from the elbow at (tx, ty) on the road. */
function aimAt(e, o, tx, ty) {
  const s = e.T.scale,
    g = geo(o),
    el = g.A[1],
    lx = ((tx - e.x) * e.face) / s,
    ly = (ty - e.y + e.z) / s + g.hipH - o.bob;
  return Math.atan2(lx - el[0], ly - el[1]);
}
/** The end of the gun's barrels, on the road (where the bullets come from). */
export function muzzle(e) {
  const o = armorPose(e),
    g = geo(o),
    a = o.aF[1],
    h = g.A[2],
    L = 86 - o.recoil;
  return toWorld(e, o, g, [h[0] + Math.sin(a) * L, h[1] + Math.cos(a) * L]);
}

// --- drawing ----------------------------------------------------------------------------------

let PAL = null;
function palette(fl) {
  return fl
    ? { pl: '#fff', pl2: '#fff', dk: '#ffe0e0', jt: '#fff', tr: '#fff', gl: '#fff' }
    : {
        pl: '#646d76', // plates
        pl2: '#7e8892', // their lit edges
        dk: '#3a4047', // the shadowed side
        jt: '#24282e', // joints, the suit under the plates
        tr: '#d8822a', // orange trim
        gl: '#7dff5a', // the reactor's glow
      };
}
/** A plate: a filled outline with a lit upper edge and rivets. */
function plate(pts, fill, lit, rivets = []) {
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = lit;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1] + 2);
  ctx.lineTo(pts[1][0], pts[1][1] + 2);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.fillStyle = PAL.pl2;
  for (const [x, y] of rivets) {
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, TAU);
    ctx.fill();
  }
}
/** An armoured limb along a bone from a to b: a joint ball and a long tapered plate. */
function armLimb(a, b, w0, w1, fill) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    L = Math.hypot(dx, dy),
    nx = -dy / L,
    ny = dx / L;
  seg([a, b], w1 * 0.9, PAL.jt);
  plate(
    [
      [a[0] + nx * w0 + dx * 0.08, a[1] + ny * w0 + dy * 0.08],
      [b[0] + nx * w1 - dx * 0.06, b[1] + ny * w1 - dy * 0.06],
      [b[0] - nx * w1 - dx * 0.06, b[1] - ny * w1 - dy * 0.06],
      [a[0] - nx * w0 + dx * 0.08, a[1] - ny * w0 + dy * 0.08],
    ],
    fill,
    PAL.pl2,
    [
      [a[0] + dx * 0.25 + nx * (w0 - 4), a[1] + dy * 0.25 + ny * (w0 - 4)],
      [a[0] + dx * 0.25 - nx * (w0 - 4), a[1] + dy * 0.25 - ny * (w0 - 4)],
    ],
  );
  // a seam across the plate
  ctx.strokeStyle = 'rgba(16,14,24,.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(a[0] + dx * 0.55 + nx * w1, a[1] + dy * 0.55 + ny * w1);
  ctx.lineTo(a[0] + dx * 0.55 - nx * w1, a[1] + dy * 0.55 - ny * w1);
  ctx.stroke();
}
function joint(p, r) {
  ctx.fillStyle = PAL.pl;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(p[0], p[1], r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAL.pl2;
  ctx.beginPath();
  ctx.arc(p[0] - r * 0.3, p[1] - r * 0.3, r * 0.35, 0, TAU);
  ctx.fill();
}
function leg(l, off, fill) {
  const pts = chain(
    [off, 0],
    [
      [l[0], THIGH],
      [l[1], SHIN],
    ],
  );
  armLimb(pts[0], pts[1], 17, 14, fill);
  // a hydraulic piston down the back of the shin
  ctx.strokeStyle = '#9aa4ae';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pts[1][0] - 12, pts[1][1] + 4);
  ctx.lineTo(pts[2][0] - 12, pts[2][1] - 12);
  ctx.stroke();
  armLimb(pts[1], pts[2], 14, 13, fill);
  joint(pts[1], 10);
  ctx.fillStyle = PAL.tr;
  ctx.fillRect(pts[1][0] - 7, pts[1][1] - 2, 14, 4);
  // the boot: a heavy block with a toe cap
  const f = pts[2];
  plate(
    [
      [f[0] - 16, f[1] - 10],
      [f[0] + 18, f[1] - 8],
      [f[0] + 30, f[1] + 2],
      [f[0] + 30, f[1] + 8],
      [f[0] - 18, f[1] + 8],
    ],
    fill,
    PAL.pl2,
    [[f[0] + 10, f[1] - 2]],
  );
  ctx.fillStyle = PAL.tr;
  ctx.fillRect(f[0] - 16, f[1] + 3, 46, 4);
  return pts;
}
function gauntlet(h, a, fill) {
  // a big armoured fist
  ctx.save();
  ctx.translate(h[0], h[1]);
  ctx.rotate(-a);
  plate(
    [
      [-11, -4],
      [11, -4],
      [12, 16],
      [-12, 16],
    ],
    fill,
    PAL.pl2,
    [[0, 2]],
  );
  ctx.strokeStyle = 'rgba(16,14,24,.6)';
  ctx.lineWidth = 1.5;
  for (const x of [-6, 0, 6]) {
    ctx.beginPath();
    ctx.moveTo(x, 9);
    ctx.lineTo(x, 16);
    ctx.stroke();
  }
  ctx.restore();
}
function minigun(h, a, o) {
  // mounted along the forearm: a drum body, an ammo feed and six spinning barrels
  ctx.save();
  ctx.translate(h[0], h[1]);
  ctx.rotate(-a + Math.PI / 2);
  ctx.translate(-o.recoil, 0);
  plate(
    [
      [-34, -15],
      [18, -15],
      [24, -10],
      [24, 12],
      [-34, 12],
    ],
    PAL.dk,
    PAL.pl,
    [
      [-26, -8],
      [-26, 6],
      [12, -8],
      [12, 6],
    ],
  );
  ctx.fillStyle = PAL.tr;
  ctx.fillRect(-30, -2, 40, 4);
  // the handle and the ammo box underneath
  plate(
    [
      [-28, 12],
      [-4, 12],
      [-6, 30],
      [-26, 30],
    ],
    PAL.pl,
    PAL.pl2,
    [[-16, 20]],
  );
  // barrels: lines that wheel round as the gun spins
  ctx.fillStyle = PAL.jt;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.fillRect(24, -10, 8, 20);
  ctx.strokeRect(24, -10, 8, 20);
  for (let i = 0; i < 6; i++) {
    const ang = o.spin + (i / 6) * TAU,
      y = Math.sin(ang) * 7,
      front = Math.cos(ang) > 0;
    ctx.fillStyle = front ? '#9aa4ae' : '#4c535a';
    ctx.fillRect(30, y - 2, 54, 4);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 1;
    ctx.strokeRect(30, y - 2, 54, 4);
  }
  ctx.fillStyle = PAL.jt;
  ctx.fillRect(54, -10, 6, 20);
  ctx.fillRect(80, -9, 6, 18);
  // hot barrels glow after a long burst
  if (o.hot > 0) {
    ctx.fillStyle = `rgba(255,120,40,${o.hot * 0.6})`;
    ctx.fillRect(30, -9, 54, 18);
  }
  if (o.flash) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#fff2b0';
    ctx.beginPath();
    ctx.moveTo(86, 0);
    ctx.lineTo(112, -12);
    ctx.lineTo(104, 0);
    ctx.lineTo(118, 10);
    ctx.lineTo(96, 4);
    ctx.closePath();
    ctx.fill();
    const g = ctx.createRadialGradient(98, 0, 2, 98, 0, 34);
    g.addColorStop(0, 'rgba(255,220,120,.9)');
    g.addColorStop(1, 'rgba(255,160,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(64, -34, 68, 68);
    ctx.restore();
  }
  ctx.restore();
}

/** The kick's warning: a red patch on the ground where it lands, filling up, and a '!'. */
function kickWarning(e) {
  const T = e.T,
    u = clamp(e.t / T.wind, 0, 1),
    x = e.x - G.cam + e.face * (T.reach * 0.75 * T.scale),
    rx = T.reach * 0.55 * T.scale,
    ry = 22;
  ctx.save();
  ctx.fillStyle = `rgba(255,60,40,${0.12 + 0.2 * u})`;
  ctx.beginPath();
  ctx.ellipse(x, e.y, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = u > 0.7 ? '#ff3a3a' : 'rgba(255,140,110,.9)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, e.y, rx * u, ry * u, 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#ff4a5e';
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(e.t * 30);
  ctx.font = '900 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', e.x - G.cam, e.y - e.z - 225 * T.scale);
  ctx.restore();
}
export function drawArmor(e, aura = true) {
  const T = e.T,
    s = T.scale,
    o = armorPose(e),
    fl = e.flash > 0;
  PAL = palette(fl);
  if (e.state === 'windup') kickWarning(e);
  o.hot = e.state === 'cool' ? 1 - e.t / ARMOR.cool : e.state === 'fire' ? e.t / ARMOR.fire : 0;
  if (aura) drawAura(e);
  ctx.save();
  // a dead one fades away where it lies
  if (e.state === 'corpse') ctx.globalAlpha = clamp((CORPSE_T - e.t) / 0.5, 0, 1);
  ctx.translate(e.x - G.cam, e.y - e.z);
  if (e.state === 'rise') {
    const p = ease(Math.min(1, e.t / 0.85));
    ctx.beginPath();
    ctx.rect(-220, -420, 440, 422);
    ctx.clip();
    ctx.translate(0, (1 - p) * 240 * s);
  }
  ctx.scale(e.face * s, s);
  const { hipH, neck, sh, A } = geo(o);
  ctx.translate(0, -hipH + o.bob);
  ctx.rotate(o.rot);
  // the far leg and arm, darker
  leg(o.lB, -6, PAL.dk);
  const B = chain(
    [sh[0] - 8, sh[1] + 4],
    [
      [o.aB[0], UARM],
      [o.aB[1], FARM],
    ],
  );
  armLimb(B[0], B[1], 12, 11, PAL.dk);
  armLimb(B[1], B[2], 11, 12, PAL.dk);
  joint(B[1], 8);
  gauntlet(B[2], o.aB[1], PAL.dk);
  // the reactor pack on its back: a cylinder glowing green, pipes to the shoulders
  ctx.save();
  ctx.translate(neck[0] * 0.5 - 34, neck[1] * 0.5 - 8);
  ctx.rotate(o.lean);
  plate(
    [
      [-24, -46],
      [16, -46],
      [18, 34],
      [-26, 34],
    ],
    PAL.dk,
    PAL.pl,
    [
      [-16, -32],
      [8, -32],
      [-16, 22],
      [8, 22],
    ],
  );
  // the reactor's gauge is its health: it drains, from green through amber to red
  const pulse = 0.75 + 0.25 * Math.sin(G.time * 5 + e.seed),
    hp = clamp(e.hp / T.hp, 0, 1),
    gc = hp > 0.5 ? '125,255,90' : hp > 0.25 ? '255,200,60' : '255,70,50',
    gh = 46 * hp;
  ctx.fillStyle = '#10140e';
  ctx.fillRect(-14, -28, 18, 46);
  ctx.fillStyle = fl ? '#fff' : `rgba(${gc},${pulse})`;
  ctx.shadowColor = `rgb(${gc})`;
  ctx.shadowBlur = 14;
  ctx.fillRect(-14, 18 - gh, 18, gh);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.strokeRect(-14, -28, 18, 46);
  for (let y = -22; y < 18; y += 8) {
    ctx.fillStyle = 'rgba(20,40,16,.5)';
    ctx.fillRect(-14, y, 18, 2);
  }
  // exhaust pipes
  for (const x of [-18, 8]) {
    ctx.fillStyle = PAL.jt;
    ctx.fillRect(x, -56, 8, 18);
    ctx.strokeRect(x, -56, 8, 18);
  }
  ctx.restore();
  // pelvis and belt
  plate(
    [
      [-20, -8],
      [22, -8],
      [18, 14],
      [-18, 14],
    ],
    PAL.pl,
    PAL.pl2,
    [
      [-12, 2],
      [12, 2],
    ],
  );
  ctx.fillStyle = PAL.tr;
  ctx.fillRect(-20, -8, 42, 4);
  // the torso: belly segments and a broad chest plate
  ctx.save();
  ctx.translate(neck[0] * 0.5, neck[1] * 0.5);
  ctx.rotate(o.lean);
  for (let i = 0; i < 3; i++)
    plate(
      [
        [-24 + i, i * 10 - 8],
        [26 - i, i * 10 - 8],
        [25 - i, i * 10 + 2],
        [-23 + i, i * 10 + 2],
      ],
      PAL.dk,
      PAL.pl,
      [
        [-18, i * 10 - 3],
        [20, i * 10 - 3],
      ],
    );
  plate(
    [
      [-30, -46],
      [30, -50],
      [40, -26],
      [30, -4],
      [-26, -4],
      [-36, -26],
    ],
    PAL.pl,
    PAL.pl2,
    [
      [-24, -40],
      [24, -43],
      [-26, -10],
      [24, -10],
      [34, -26],
    ],
  );
  // panel lines and a vent grille
  ctx.strokeStyle = 'rgba(16,14,24,.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.lineTo(2, -36);
  ctx.moveTo(-34, -26);
  ctx.lineTo(38, -26);
  ctx.stroke();
  ctx.fillStyle = PAL.jt;
  for (let i = 0; i < 4; i++) ctx.fillRect(10, -20 + i * 4, 18, 2);
  // a hazard stripe and the unit's stencil number
  ctx.save();
  ctx.beginPath();
  ctx.rect(-30, -38, 64, 8);
  ctx.clip();
  for (let x = -40; x < 40; x += 10) {
    ctx.fillStyle = fl ? '#fff' : '#e8c35a';
    ctx.beginPath();
    ctx.moveTo(x, -30);
    ctx.lineTo(x + 5, -30);
    ctx.lineTo(x + 13, -38);
    ctx.lineTo(x + 8, -38);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(16,14,24,.55)';
  ctx.font = '900 9px sans-serif';
  ctx.fillText('07', -24, -14);
  // a chest light
  ctx.fillStyle = fl ? '#fff' : PAL.gl;
  ctx.shadowColor = PAL.gl;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(-6, -16, 3.5, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  // the near leg
  leg(o.lF, 6, PAL.pl);
  // the gun arm, with its big shoulder plate
  armLimb(A[0], A[1], 12, 11, PAL.pl);
  joint(A[1], 8);
  armLimb(A[1], A[2], 11, 12, PAL.pl);
  minigun(A[2], o.aF[1], o);
  // the ammo belt from the pack over the shoulder to the gun
  ctx.strokeStyle = '#b8902a';
  ctx.lineWidth = 5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(sh[0] - 30, sh[1] + 10);
  ctx.quadraticCurveTo(sh[0], sh[1] + 40, A[2][0] - 6, A[2][1] + 6);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.save();
  ctx.translate(sh[0] - 4, sh[1] + 4);
  ctx.rotate(o.aF[0] * 0.3 - 0.2);
  ctx.scale(0.8, 0.8);
  plate(
    [
      [-26, -16],
      [22, -22],
      [34, -4],
      [28, 18],
      [-24, 16],
    ],
    PAL.pl,
    PAL.pl2,
    [
      [-18, -8],
      [14, -13],
      [24, 8],
      [-16, 8],
    ],
  );
  plate(
    [
      [-22, 10],
      [26, 12],
      [24, 24],
      [-20, 22],
    ],
    PAL.dk,
    PAL.pl,
  );
  ctx.fillStyle = PAL.tr;
  ctx.fillRect(-22, 4, 48, 4);
  ctx.restore();
  // the helmet: a rounded dome, a glowing visor slit, cracked to show the dead face inside
  ctx.save();
  ctx.translate(neck[0] + 8, neck[1] - 10);
  ctx.rotate(o.lean * 0.5 + o.head);
  ctx.scale(1.25, 1.25);
  // a breathing hose from the jaw to the chest
  ctx.strokeStyle = OL;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(10, 6);
  ctx.quadraticCurveTo(20, 24, 6, 36);
  ctx.stroke();
  ctx.strokeStyle = PAL.jt;
  ctx.lineWidth = 4;
  ctx.stroke();
  plate(
    [
      [-16, -22],
      [8, -30],
      [22, -18],
      [24, 2],
      [16, 12],
      [-14, 12],
      [-20, -4],
    ],
    PAL.pl,
    PAL.pl2,
    [
      [-12, 4],
      [-14, -12],
      [16, 6],
    ],
  );
  // the visor
  ctx.fillStyle = OL;
  ctx.fillRect(2, -12, 22, 10);
  const eye = e.state === 'windup' ? '#ff3a2a' : T.eye;
  ctx.fillStyle = fl ? '#fff' : eye;
  ctx.shadowColor = eye;
  ctx.shadowBlur = 12;
  ctx.fillRect(4, -10, 18, 5);
  ctx.shadowBlur = 0;
  // the crack, and a rotten eye socket behind it
  ctx.fillStyle = fl ? '#fff' : '#8a9a6a';
  ctx.beginPath();
  ctx.moveTo(12, -5);
  ctx.lineTo(20, -2);
  ctx.lineTo(16, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(12, -5);
  ctx.lineTo(18, 2);
  ctx.lineTo(14, 8);
  ctx.moveTo(18, 2);
  ctx.lineTo(23, 0);
  ctx.stroke();
  // an antenna
  ctx.strokeStyle = PAL.jt;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -22);
  ctx.lineTo(-18, -44);
  ctx.stroke();
  ctx.fillStyle = Math.floor(G.time * 2) % 2 ? '#ff4a3a' : '#5a1a14';
  ctx.beginPath();
  ctx.arc(-18, -45, 2.5, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// --- behaviour --------------------------------------------------------------------------------

/** One bullet: it lands at the aim point, kicking up dust; on the player it hurts. */
function bullet(e) {
  const x = e.x + e.face * e.reachD + rnd(-14, 14),
    y = e.aimY + rnd(-10, 10),
    [mx, my] = muzzle(e);
  G.parts.push({ k: 'tracer', x: mx, y: my, x2: x, y2: y, t: 0, life: 0.06 });
  G.parts.push({
    k: 'dust',
    x,
    y,
    vx: rnd(-40, 40),
    vy: rnd(-90, -30),
    g: 120,
    t: 0,
    life: rnd(0.25, 0.4),
    s: rnd(4, 8),
    col: '#d9b88a',
  });
  G.parts.push({
    k: 'dot',
    x,
    y: y - 2,
    vx: rnd(-80, 80),
    vy: rnd(-200, -80),
    g: 600,
    t: 0,
    life: 0.2,
    s: 2.5,
    col: '#ffe9a0',
  });
  // spent casings fly from the gun
  if (random() < 0.4)
    G.debris.push({
      k: 'shard',
      x: e.x + e.face * 40,
      gy: e.y + 2,
      z: 110 * e.T.scale,
      vx: -e.face * rnd(60, 160),
      vz: rnd(120, 260),
      rot: rnd(TAU),
      vr: rnd(-20, 20),
      len: 5,
      col: '#d8b04a',
      life: 0.8,
    });
  if (Math.abs(P.x - x) < 26 && Math.abs(P.y - y) < 22 && P.z < 60) {
    e.hits = (e.hits ?? 0) + 1;
    if (hitPlayer(ARMOR.dmg, e.face, e.hits % 3 === 0)) SFX.clang();
  }
}

export default defineFoe('armor', {
  draw: drawArmor,
  walksIn: true,
  corpse: true,
  init: { gunCd: [1, 2.5] },
  timers: ['gunCd'],
  spawn(e) {
    e.w = 34;
    e.spinA = 0;
  },
  engageCap: Infinity,
  stand: 70,
  moves: [
    {
      // in range and roughly lined up: spin the gun up
      when: (e, s) =>
        e.gunCd <= 0 &&
        !s.pdown &&
        s.adx > 110 &&
        s.adx < ARMOR.reach1 &&
        s.ady < 90 &&
        e.x > G.cam + 30 &&
        e.x < G.cam + W - 30,
      go(e) {
        faceP(e);
        go(e, 'spin', 0, { engage: false });
        SFX.spin();
      },
    },
  ],
  // its own attacks go on through any hit (a heavy enemy is never interrupted)
  attacks: ['spin', 'fire', 'cool'],
  pose: {},
  on: {
    windup(e) {
      // the kick's wind-up begins with a hiss of the hydraulics
      if (e.t < 0.05 && !e.hissed) {
        e.hissed = true;
        SFX.hiss();
      } else if (e.t >= 0.05) e.hissed = false;
    },
  },
  states: {
    spin(e, dt) {
      e.spinA = (e.spinA + dt * 40 * Math.min(1, e.t / ARMOR.spin)) % TAU;
      if (random() < 0.3) dust(e.x - e.face * 10, e.y, 1);
      if (e.t > ARMOR.spin) {
        go(e, 'fire', 0, { reachD: ARMOR.reach0, aimY: e.y, shot: 0, hits: 0 });
      }
    },
    fire(e, dt) {
      e.spinA = (e.spinA + dt * 40) % TAU;
      // the stream walks out from the feet; it drifts in depth after the player
      e.reachD = ARMOR.reach0 + (ARMOR.reach1 - ARMOR.reach0) * (e.t / ARMOR.fire);
      e.aimY += clamp(P.y - e.aimY, -ARMOR.aimSpeed * dt, ARMOR.aimSpeed * dt);
      e.shot -= dt;
      while (e.shot <= 0) {
        e.shot += ARMOR.rate;
        bullet(e);
        SFX.gun();
      }
      G.shake = Math.max(G.shake, 2);
      if (e.t > ARMOR.fire) go(e, 'cool');
    },
    cool(e, dt) {
      e.spinA = (e.spinA + dt * 40 * (1 - e.t / ARMOR.cool)) % TAU;
      if (random() < 0.3)
        G.parts.push({
          k: 'smoke',
          x: muzzle(e)[0],
          y: muzzle(e)[1],
          vx: rnd(-10, 10),
          vy: rnd(-50, -20),
          g: 0,
          t: 0,
          life: 0.8,
          s: 8,
        });
      if (e.t > ARMOR.cool) go(e, 'chase', 0, { gunCd: rnd(ARMOR.gunCd[0], ARMOR.gunCd[1]) });
    },
  },
});
