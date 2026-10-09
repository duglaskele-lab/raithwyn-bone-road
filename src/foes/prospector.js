// The Prospector, the boss of Old Quarry (numbers in PROS and TYPES.prospector): a giant of a
// zombie in rusty, riveted power armour, 1.3 times the size of the others, under a round brass
// diver's helmet with a glowing porthole. On its back two fuel tanks feed a flamethrower on its
// arm through a hose, and two short mortars sit over its shoulders; a pressure gauge on its
// chest creeps into the red as it loses health, and steam hisses out of its joints.
// It burns the road in front of it (the pilot light flares first), lobs mortar shells that come
// down on spots marked on the ground, leaps on its jets onto the player and kicks up close.
// At half health its helmet flies off: a zombie's head in miner's goggles, and it fights
// harder (its flame sweeps across the road, its mortars fire a fork of shells).
// Heavy: only crushing blows move it, and its flame, mortars, jump and the loss of its helmet
// go on through anything (a red outline).
import { CORPSE_T, OL, PROS, TAU, W } from '../config.js';
import { clamp, ease, random, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { breakProp, finale, hitPlayer } from '../combat.js';
import { styleBreak, scoreMult } from '../style.js';
import { ctx, rr } from '../gfx.js';
import { drawAura } from '../skeleton.js';
import { floorClamp, groundPoint } from '../level.js';
import { defineFoe } from './registry.js';
import { faceP, go, moveTo } from './kit.js';
import { chain } from './lizard.js';
import {
  armLimb,
  drawJets,
  gauntlet,
  geo,
  joint,
  jumpMark,
  jetTrail,
  jumpTo,
  kickWarning,
  leg,
  plate,
  toWorld,
  usePal,
} from './armor.js';

const UARM = 34,
  FARM = 32;
// what no hit can stop (and what no blow throws it out of)
const UNSTOPPABLE = [
  'fwind',
  'flame',
  'fwalk',
  'mwind',
  'mortar',
  'jcrouch',
  'jump',
  'ramwind',
  'ram',
  'unmask',
];
/** A cooldown out of a range: shorter once it has lost its helmet. */
const cd = (e, [a, b]) => rnd(a, b) / (e.phase2 ? PROS.fast : 1);
/** It is well on screen (it starts nothing from off its edge). */
const onScreen = (e) => e.x > G.cam + 60 && e.x < G.cam + W - 60;

function prosPose(e) {
  const br = Math.sin(e.anim * 1.6 + e.seed),
    o = {
      lean: 0.06,
      head: 0,
      rot: 0,
      hipH: null,
      lF: [0.2, -0.05],
      lB: [-0.22, -0.32],
      aF: [0.45 + 0.03 * br, 1.3],
      aB: [0.1, 0.7],
      bob: br * 1.5 + (e.kick ?? 0) * 5,
    };
  if (e.moving && (e.state === 'chase' || e.state === 'fwalk')) {
    // slow, heavy strides
    const s = Math.sin(e.walkT),
      c = Math.cos(e.walkT);
    o.lF = [0.38 * s, 0.38 * s - 0.1 - 0.5 * Math.max(0, c)];
    o.lB = [-0.38 * s, -0.38 * s - 0.1 - 0.5 * Math.max(0, -c)];
    o.bob = Math.abs(c) * 5;
    o.aB = [0.1 + 0.22 * s, 0.7];
  }
  const t = e.t;
  switch (e.state) {
    case 'fwind':
    case 'flame': {
      // the flamethrower up and level, the body braced against it
      const u = e.state === 'fwind' ? ease(clamp(t / 0.35, 0, 1)) : 1;
      o.aF = [0.45 + (1.15 - 0.45) * u, 1.3 + (1.62 - 1.3) * u];
      o.lF = [0.45, 0.05];
      o.lB = [-0.45, -0.55];
      o.lean = 0.06 + 0.08 * u;
      if (e.state === 'flame') {
        o.aF[1] += Math.sin(e.anim * 70) * 0.015 + ((e.fdy ?? 0) / PROS.flame.sweep) * 0.12;
        o.bob += Math.sin(e.anim * 55) * 1.2;
      }
      break;
    }
    case 'fwalk': {
      // the flamethrower aimed down at the road just in front, as it walks
      const u = ease(clamp(e.t / 0.3, 0, 1));
      o.aF = [0.45 + 0.5 * u, 1.3 - 0.2 * u + Math.sin(e.anim * 60) * 0.01];
      o.lean = 0.12;
      break;
    }
    case 'ramwind': {
      // down low, leaning in, the arms swung back; it shakes on its hydraulics
      const u = ease(clamp(e.t / 0.4, 0, 1)),
        k = e.t > 0.4 ? Math.sin(e.t * 55) * 0.03 : 0;
      o.hipH = 88 - 18 * u;
      o.lean = 0.06 + 0.4 * u + k;
      o.lF = [0.2 + 0.45 * u, -0.05 - 0.6 * u];
      o.lB = [-0.22 - 0.3 * u, -0.32 - 0.5 * u];
      o.aF = [0.45 - 0.75 * u, 1.3 - 0.9 * u];
      o.aB = [0.1 - 0.6 * u, 0.7 - 0.3 * u];
      break;
    }
    case 'ram': {
      // a headlong rush, shoulder first, legs pounding
      const s = Math.sin(e.anim * 18);
      o.lean = 0.5;
      o.lF = [0.6 * s, 0.6 * s - 0.3];
      o.lB = [-0.6 * s, -0.6 * s - 0.3];
      o.aF = [-0.3, 0.4];
      o.aB = [-0.4, 0.3];
      o.bob = Math.abs(s) * 5;
      break;
    }
    case 'rstop': {
      // skidding to a stop, leaning back
      const u = ease(clamp(e.t / PROS.ram.stop, 0, 1));
      o.lean = -0.2 + 0.26 * u;
      o.lF = [0.7 - 0.5 * u, 0.3 - 0.35 * u];
      o.lB = [-0.4, -0.5];
      o.aF = [0.9 - 0.45 * u, 1.6 - 0.3 * u];
      break;
    }
    case 'mwind':
    case 'mortar': {
      // squatting and leaning back, the arms braced, while the mortars go up
      const u = e.state === 'mwind' ? ease(clamp(t / 0.4, 0, 1)) : 1;
      o.lF = [0.2 + 0.25 * u, -0.05 - 0.2 * u];
      o.lB = [-0.22 - 0.25 * u, -0.32 - 0.35 * u];
      o.lean = 0.06 - 0.16 * u;
      o.aF = [0.45 - 0.1 * u, 1.3 - 0.4 * u];
      o.aB = [0.1 + 0.3 * u, 0.7 + 0.4 * u];
      break;
    }
    case 'windup': {
      // the kick: the knee up, the foot cocked back
      const u = ease(clamp(t / 0.35, 0, 1)),
        k = t > 0.35 ? Math.sin(t * 60) * 0.04 : 0;
      o.lF = [0.2 + (1.25 - 0.2) * u + k, -0.05 + (-0.75 + 0.05) * u];
      o.lB = [-0.1, -0.15];
      o.lean = 0.06 - 0.26 * u;
      o.aB = [0.1 + 0.5 * u, 0.7 + 0.4 * u];
      break;
    }
    case 'attack': {
      const u = clamp(t / 0.07, 0, 1);
      o.lF = [1.25 + (1.55 - 1.25) * u, -0.75 + (1.6 + 0.75) * u];
      o.lB = [-0.2, -0.25];
      o.lean = -0.2 - 0.1 * u;
      o.aB = [0.6, 1.1];
      break;
    }
    case 'recover': {
      const u = ease(clamp(t / e.T.rec, 0, 1));
      o.lF = [1.55 + (0.2 - 1.55) * u, 1.6 + (-0.05 - 1.6) * u];
      o.lean = -0.3 + 0.36 * u;
      break;
    }
    case 'unmask': {
      if (t < 0.45) {
        // it reels, a hand up to the helmet...
        const u = ease(clamp(t / 0.3, 0, 1));
        o.aB = [0.1 + 2.5 * u, 0.7 + 2.3 * u];
        o.lean = 0.06 - 0.12 * u;
        o.head = 0.2 * u + Math.sin(t * 50) * 0.05 * u;
      } else {
        // ...it tears it off and roars
        const u = ease(clamp((t - 0.45) / 0.25, 0, 1)),
          sh = Math.sin(t * 45) * 0.04;
        o.head = -0.45 * u + sh;
        o.lean = -0.06 - 0.16 * u;
        o.aB = [2.6 - 0.6 * u, 3 - 0.8 * u];
        o.aF = [0.45 + 1.3 * u, 1.3 + 0.9 * u];
        o.lF = [0.45, 0.05];
        o.lB = [-0.45, -0.55];
      }
      break;
    }
    case 'fall':
    case 'air':
      o.rot = -Math.min(1.35, t * 4.5);
      o.hipH = 50;
      o.lF = [0.9, 0.3];
      o.lB = [0.5, -0.1];
      o.aF = [0.3, 2.9];
      o.aB = [0.4, 1.9];
      break;
    case 'corpse':
    case 'down':
      o.rot = -1.5;
      o.hipH = 18;
      o.lF = [0.2, 0.1];
      o.lB = [0.1, 0.05];
      o.aF = [0.2, 3.0];
      o.aB = [0.3, 1.8];
      break;
    case 'getup': {
      const u = ease(clamp(t / 0.6, 0, 1));
      o.rot = -1.5 * (1 - u);
      o.hipH = 18 + 70 * u;
      break;
    }
    case 'jcrouch': {
      const u = ease(clamp(t / PROS.jump.crouch, 0, 1));
      o.hipH = 88 - 26 * u;
      o.lean = 0.06 + 0.24 * u;
      o.lF = [0.2 + 0.5 * u, -0.05 - 1.0 * u];
      o.lB = [-0.22 + 0.3 * u, -0.32 - 0.8 * u];
      o.aB = [0.1 - 0.6 * u, 0.7];
      break;
    }
    case 'jump':
    case 'phop':
      o.lF = [0.7, -1.1];
      o.lB = [0.1, -1.2];
      o.lean = 0.12;
      o.aF = [1.0, 1.5];
      o.aB = [0.6, 1.0];
      break;
    case 'jland': {
      const u = ease(clamp(t / PROS.jump.rec, 0, 1));
      o.hipH = 60 + 28 * u;
      o.lF = [0.7 - 0.5 * u, -1.1 + 1.05 * u];
      o.lB = [-0.2, -1.0 + 0.7 * u];
      o.lean = 0.3 - 0.24 * u;
      break;
    }
  }
  return o;
}
/** A point of the torso's own frame, in the body's frame (as the torso is drawn). */
function torsoPt(o, g, [x, y]) {
  const c = Math.cos(o.lean),
    n = Math.sin(o.lean);
  return [g.neck[0] * 0.5 + x * c - y * n, g.neck[1] * 0.5 + x * n + y * c];
}
/** A point of the flamethrower's own frame (x along the gun), in the body's frame. */
function gunPt(g, a, [x, y]) {
  const h = g.A[2],
    c = Math.sin(a),
    n = Math.cos(a);
  return [h[0] + x * c - y * n, h[1] + x * n + y * c];
}
/** How far up its mortars are: 0 laid back at rest, 1 raised to fire. */
function mortarUp(e) {
  if (e.state === 'mwind') return ease(clamp(e.t / PROS.mortar.wind, 0, 1));
  return e.state === 'mortar' ? 1 : 0;
}
/** The pivot of mortar i (0 the far one) and its barrel's direction, in the torso's frame. */
function mortarAt(e, i) {
  const a = -0.8 + 1.0 * mortarUp(e) + i * 0.08;
  return { p: [-40 + i * 12, -58 + i * 3], a, d: [Math.sin(a), -Math.cos(a)] };
}
const MORTAR_L = 40,
  HEAD = 1.1; // the head's size
/** The mouth of mortar i on the road (world x, screen y). */
export function mortarMouth(e, i) {
  const o = prosPose(e),
    g = geo(o),
    m = mortarAt(e, i);
  return toWorld(e, o, g, torsoPt(o, g, [m.p[0] + m.d[0] * MORTAR_L, m.p[1] + m.d[1] * MORTAR_L]));
}
/** The flamethrower's nozzle on the road (where the flame comes out). */
export function nozzleAt(e) {
  const o = prosPose(e),
    g = geo(o);
  return toWorld(e, o, g, gunPt(g, o.aF[1], [86, 0]));
}
/** Is the player in the flame? A cone along the road from the nozzle on, as long as it has
 *  grown (`flen`), sweeping in depth (`fdy`). */
export function inFlame(e) {
  const F = PROS.flame,
    L = e.flen ?? F.len,
    f = (P.x - nozzleAt(e)[0]) * e.face,
    c = e.y + (e.fdy ?? 0) * clamp(f / F.len, 0, 1);
  return f > -10 && f < L && Math.abs(P.y - c) < F.w0 + Math.max(0, f) * F.spread && P.z < 110;
}

// --- drawing ----------------------------------------------------------------------------------

export function palette(fl) {
  return fl
    ? { pl: '#fff', pl2: '#fff', dk: '#ffe0d0', jt: '#fff', tr: '#fff', gl: '#fff' }
    : {
        pl: '#6d737a', // grey gunmetal plates
        pl2: '#8f979f', // their lit edges
        dk: '#43484e', // the shadowed side
        jt: '#222529', // joints, the suit under the plates
        tr: '#d8822a', // orange trim
        gl: '#ff9a3a', // the visor's glow
      };
}
let PAL = palette(false);
/** A dent knocked into a plate: a dark hollow with a lit lower rim. */
function dent(x, y, r) {
  ctx.fillStyle = 'rgba(40,18,8,.35)';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.7, -0.3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,170,.4)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.7, -0.3, 0.3, 2.6);
  ctx.stroke();
}
/** Yellow and black hazard stripes over a rectangle. */
function hazard(x, y, w, h, fl) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = fl ? '#fff' : '#1e1a18';
  ctx.fillRect(x, y, w, h);
  for (let i = x - h; i < x + w; i += 10) {
    ctx.fillStyle = fl ? '#fff' : '#e8c35a';
    ctx.beginPath();
    ctx.moveTo(i, y + h);
    ctx.lineTo(i + 5, y + h);
    ctx.lineTo(i + 5 + h, y);
    ctx.lineTo(i + h, y);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(x, y, w, h);
}
/** A fuel tank on its back: a red cylinder with brass bands and a valve on top. */
function tank(x, y, w, h, body, lit, fl) {
  rr(x, y, w, h, w / 2);
  ctx.fillStyle = fl ? '#fff' : body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = fl ? '#fff' : lit;
  ctx.fillRect(x + w * 0.62, y, w * 0.18, h);
  ctx.fillStyle = PAL.tr;
  ctx.fillRect(x, y + h * 0.22, w, 4);
  ctx.fillRect(x, y + h * 0.72, w, 4);
  ctx.restore();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  rr(x, y, w, h, w / 2);
  ctx.stroke();
  // the valve and its wheel
  ctx.fillStyle = PAL.jt;
  ctx.fillRect(x + w / 2 - 3, y - 7, 6, 8);
  ctx.strokeRect(x + w / 2 - 3, y - 7, 6, 8);
  ctx.strokeStyle = PAL.tr;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y - 8, 6, 2, 0, 0, TAU);
  ctx.stroke();
}
/** A mortar over its shoulder: a stubby tube on a bracket, a brass ring at its mouth. */
function mortar(e, i, fl) {
  const m = mortarAt(e, i),
    far = i === 0;
  ctx.save();
  ctx.translate(m.p[0], m.p[1]);
  // the bracket it pivots on
  plate(
    [
      [-9, -2],
      [9, -2],
      [11, 10],
      [-11, 10],
    ],
    far ? PAL.jt : PAL.dk,
    PAL.pl,
    [[0, 4]],
  );
  ctx.rotate(m.a);
  const kick = e.shotI === i ? (e.kick ?? 0) * 6 : 0;
  ctx.translate(0, kick);
  plate(
    [
      [-8, 0],
      [8, 0],
      [8, -MORTAR_L + 4],
      [-8, -MORTAR_L + 4],
    ],
    fl ? '#fff' : far ? '#3a3d44' : '#555a64',
    fl ? '#fff' : '#8a909c',
    [
      [-4, -6],
      [4, -6],
    ],
  );
  // the muzzle ring and the dark bore
  ctx.fillStyle = PAL.tr;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.fillRect(-10, -MORTAR_L - 1, 20, 6);
  ctx.strokeRect(-10, -MORTAR_L - 1, 20, 6);
  ctx.fillStyle = '#120e0c';
  ctx.beginPath();
  ctx.ellipse(0, -MORTAR_L - 1, 7, 2.4, 0, 0, TAU);
  ctx.fill();
  // a flash out of its mouth as it fires
  if (e.shotI === i && (e.kick ?? 0) > 0.5) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, -MORTAR_L - 8, 2, 0, -MORTAR_L - 8, 26);
    g.addColorStop(0, 'rgba(255,240,180,.95)');
    g.addColorStop(1, 'rgba(255,130,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-26, -MORTAR_L - 34, 52, 52);
    ctx.restore();
  }
  ctx.restore();
}
/** The pilot light at the nozzle: a blue bead with an orange lick, bigger as it flares. */
function pilot(size) {
  const f = 1 + 0.15 * Math.sin(G.time * 40);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(90,160,255,.85)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 3 * size, 2.4 * size, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,170,60,.9)';
  ctx.beginPath();
  ctx.moveTo(0, -2.5 * size);
  ctx.quadraticCurveTo(9 * size * f, -2 * size, 12 * size * f, 0);
  ctx.quadraticCurveTo(9 * size * f, 2 * size, 0, 2.5 * size);
  ctx.fill();
  ctx.restore();
}
function flamethrower(e, h, a, fl) {
  ctx.save();
  ctx.translate(h[0], h[1]);
  ctx.rotate(-a + Math.PI / 2);
  // the fuel chamber along the forearm
  plate(
    [
      [-32, -12],
      [14, -12],
      [18, -8],
      [18, 10],
      [-32, 10],
    ],
    PAL.dk,
    PAL.pl,
    [
      [-26, -6],
      [-26, 5],
      [8, -6],
      [8, 5],
    ],
  );
  ctx.fillStyle = PAL.tr;
  ctx.fillRect(-22, -12, 4, 22);
  ctx.fillRect(4, -12, 4, 22);
  // the grip
  plate(
    [
      [-20, 10],
      [-6, 10],
      [-8, 26],
      [-20, 26],
    ],
    PAL.jt,
    PAL.dk,
  );
  // the barrel inside its slotted heat shield, a flared brass nozzle
  ctx.fillStyle = fl ? '#fff' : '#33343a';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.fillRect(18, -5, 54, 10);
  ctx.strokeRect(18, -5, 54, 10);
  ctx.fillStyle = fl ? '#fff' : '#5a5d66';
  ctx.fillRect(24, -8, 40, 16);
  ctx.strokeRect(24, -8, 40, 16);
  ctx.fillStyle = '#16141a';
  for (let x = 28; x < 62; x += 6) ctx.fillRect(x, -6, 2.5, 12);
  if (e.state === 'flame' || e.state === 'fwalk') {
    ctx.fillStyle = `rgba(255,110,30,${Math.min(0.55, e.t * 0.5)})`;
    ctx.fillRect(18, -8, 54, 16);
  }
  ctx.fillStyle = PAL.tr;
  ctx.beginPath();
  ctx.moveTo(72, -5);
  ctx.lineTo(84, -8);
  ctx.lineTo(84, 8);
  ctx.lineTo(72, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.translate(86, 0);
  if (e.state !== 'flame' && e.state !== 'fwalk')
    pilot(e.state === 'fwind' ? 1 + 1.6 * clamp(e.t / PROS.flame.wind, 0, 1) : 1);
  ctx.restore();
}
/** Its helmet, in the head's frame: the power armour's rounded dome with a glowing visor
 *  slit (`eye`), cracked over a dead face, a breathing hose and two antennas. */
export function drawHelmet(fl, eye, lit = true) {
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
  // an orange band over the brow
  ctx.fillStyle = PAL.tr;
  ctx.beginPath();
  ctx.moveTo(-17, -16);
  ctx.lineTo(8, -25);
  ctx.lineTo(20, -16);
  ctx.lineTo(18, -13);
  ctx.lineTo(7, -21);
  ctx.lineTo(-17, -12);
  ctx.closePath();
  ctx.fill();
  // the visor
  ctx.fillStyle = OL;
  ctx.fillRect(2, -12, 22, 10);
  ctx.fillStyle = fl ? '#fff' : lit ? eye : '#3a2a20';
  if (lit) {
    ctx.shadowColor = eye;
    ctx.shadowBlur = 12;
  }
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
  // two antennas
  ctx.strokeStyle = PAL.jt;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -22);
  ctx.lineTo(-18, -44);
  ctx.moveTo(-4, -25);
  ctx.lineTo(-8, -40);
  ctx.stroke();
  ctx.fillStyle = lit && Math.floor(G.time * 2) % 2 ? '#ff4a3a' : '#5a1a14';
  ctx.beginPath();
  ctx.arc(-18, -45, 2.5, 0, TAU);
  ctx.fill();
}
/** Under the helmet: a rotten head in miner's goggles, jaw hanging open. */
function zombieHead(e, fl) {
  // the collar, a broken bolt sticking up
  ctx.fillStyle = fl ? '#fff' : '#9a7434';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(2, 13, 25, 8, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAL.jt;
  ctx.fillRect(-14, 3, 4, 7);
  // the neck and the head
  const skin = fl ? '#fff' : '#8fa06a',
    dark = fl ? '#fff' : '#5f7048';
  ctx.fillStyle = dark;
  ctx.fillRect(-4, 0, 12, 12);
  ctx.strokeRect(-4, 0, 12, 12);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.quadraticCurveTo(-16, -26, 2, -30);
  ctx.quadraticCurveTo(20, -32, 22, -14);
  ctx.lineTo(23, -4);
  ctx.quadraticCurveTo(18, 4, 8, 6);
  ctx.quadraticCurveTo(-8, 8, -12, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // a sunken cheek and a torn ear
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(10, -2, 6, 4, 0.3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-6, -10, 4, 6, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // the jaw hangs open: a dark mouth and broken teeth
  const open = 4 + (e.state === 'unmask' ? 4 : 0) + Math.sin(e.anim * 3) * 1;
  ctx.fillStyle = '#1a0e0c';
  ctx.beginPath();
  ctx.moveTo(12, -2);
  ctx.lineTo(23, -3);
  ctx.lineTo(21, -3 + open);
  ctx.lineTo(13, -1 + open);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8e0c4';
  for (const x of [15, 18, 21]) ctx.fillRect(x, -3, 2, 2.5);
  // a few strands of white hair
  ctx.strokeStyle = fl ? '#fff' : '#d8d8cc';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const [x, y, dx] of [
    [-6, -27, -8],
    [0, -30, -6],
    [6, -31, -3],
  ]) {
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + dx, y - 6, x + dx * 1.6, y + 2);
  }
  ctx.stroke();
  // the goggles: a strap round the head, two brass-rimmed lenses glowing amber
  ctx.strokeStyle = PAL.jt;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-13, -14);
  ctx.quadraticCurveTo(2, -20, 12, -16);
  ctx.stroke();
  const glow = e.state === 'windup' ? '#ff3a2a' : PAL.gl;
  for (const [x, y, r] of [
    [21, -15, 4.5],
    [13, -16, 6],
  ]) {
    ctx.fillStyle = PAL.tr;
    ctx.strokeStyle = OL;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = fl ? '#fff' : glow;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,240,.7)';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, TAU);
    ctx.fill();
  }
}
/** Tongues of flame roaring out backwards from the bottom of its tanks as it gets ready to
 *  ram and as it rushes (in the torso's frame, the back to -x). */
function backJets(e, lean) {
  const u = e.state === 'ramwind' ? ease(clamp(e.t / PROS.ram.wind, 0, 1)) : 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [y, k] of [
    [-6, 1],
    [-30, 0.8],
  ]) {
    const L = (24 + 86 * u) * k * (1 + 0.15 * Math.sin(G.time * 47 + y)),
      w = (6 + 6 * u) * k,
      x0 = 0,
      g = ctx.createLinearGradient(x0, 0, x0 - L, 0);
    g.addColorStop(0, 'rgba(255,250,220,.95)');
    g.addColorStop(0.3, 'rgba(255,190,70,.85)');
    g.addColorStop(1, 'rgba(255,80,20,0)');
    // out of the tank's bottom, levelled out to blow straight back whatever its lean
    ctx.save();
    ctx.translate(-60, y);
    ctx.rotate(-lean);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, -w);
    ctx.quadraticCurveTo(x0 - L * 0.5, -w * 1.3 + Math.sin(G.time * 31 + y) * 3, x0 - L, 0);
    ctx.quadraticCurveTo(x0 - L * 0.5, w * 1.3 - Math.sin(G.time * 29 + y) * 3, x0, w);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
/** The flame: a roaring cone from the nozzle down onto the road, white-hot near the gun. */
function drawFlame(e) {
  const F = PROS.flame,
    [mx, my] = nozzleAt(e),
    L = e.flen ?? 0,
    grow = L / F.len,
    x0 = mx - G.cam,
    x1 = mx + e.face * L - G.cam,
    gy = e.y + (e.fdy ?? 0) * grow,
    y1 = gy - (e.state === 'fwalk' ? 8 : 46),
    flick = Math.sin(G.time * 37) * 6,
    half = 18 + (F.w0 + L * F.spread) * 0.42;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // a glow on the ground where it burns
  const gg = ctx.createRadialGradient(x1, gy, 4, x1, gy, half * 2.2);
  gg.addColorStop(0, 'rgba(255,140,40,.45)');
  gg.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.ellipse(x1, gy, half * 2.2, half * 0.9, 0, 0, TAU);
  ctx.fill();
  for (const [w, a, c0, c1] of [
    [1, 0.75, '255,200,90', '255,70,20'],
    [0.5, 0.9, '255,250,220', '255,170,60'],
  ]) {
    const g = ctx.createLinearGradient(x0, my, x1, y1);
    g.addColorStop(0, `rgba(${c0},${a})`);
    g.addColorStop(0.6, `rgba(${c1},${a * 0.8})`);
    g.addColorStop(1, `rgba(${c1},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, my - 5 * w);
    ctx.quadraticCurveTo(
      (x0 + x1) / 2,
      (my + y1) / 2 - half * w - flick,
      x1 + e.face * 20 * w,
      y1 - half * w + flick,
    );
    ctx.quadraticCurveTo(x1 + e.face * 40 * w, y1, x1 + e.face * 20 * w, y1 + half * w * 0.8);
    ctx.quadraticCurveTo((x0 + x1) / 2, (my + y1) / 2 + half * 0.6 * w + flick, x0, my + 5 * w);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
export function drawProspector(e, aura = true) {
  const T = e.T,
    s = T.scale,
    o = prosPose(e),
    fl = e.flash > 0;
  PAL = palette(fl);
  usePal(PAL);
  if (e.state === 'windup' || e.state === 'ramwind') kickWarning(e, 250);
  if (e.state === 'jcrouch' || e.state === 'jump') jumpMark(e);
  if (e.state === 'jump' || e.state === 'phop') drawJets(e);
  if (aura) drawAura(e);
  ctx.save();
  if (e.state === 'corpse') ctx.globalAlpha = clamp((CORPSE_T - e.t) / 0.5, 0, 1);
  ctx.translate(e.x - G.cam, e.y - e.z);
  ctx.scale(e.face * s, s);
  const g = geo(o),
    { hipH, neck, sh, A } = g;
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
  armLimb(B[0], B[1], 13, 12, PAL.dk);
  armLimb(B[1], B[2], 12, 13, PAL.dk);
  joint(B[1], 9);
  gauntlet(B[2], o.aB[1], PAL.dk);
  // its back: the far mortar, the two fuel tanks, the near mortar
  ctx.save();
  ctx.translate(neck[0] * 0.5, neck[1] * 0.5);
  ctx.rotate(o.lean);
  if (e.state === 'ramwind' || e.state === 'ram') backJets(e, o.lean);
  mortar(e, 0, fl);
  tank(-52, -54, 20, 62, '#86301f', '#a8442c', fl);
  tank(-62, -50, 22, 64, '#b8402e', '#de6a4c', fl);
  mortar(e, 1, fl);
  ctx.restore();
  // pelvis and a hazard-striped belt
  plate(
    [
      [-22, -8],
      [24, -8],
      [20, 15],
      [-20, 15],
    ],
    PAL.pl,
    PAL.pl2,
    [
      [-14, 6],
      [14, 6],
    ],
  );
  hazard(-22, -8, 46, 6, fl);
  // the torso: belly segments and a broad, dented chest plate
  ctx.save();
  ctx.translate(neck[0] * 0.5, neck[1] * 0.5);
  ctx.rotate(o.lean);
  for (let i = 0; i < 3; i++)
    plate(
      [
        [-27 + i, i * 10 - 8],
        [29 - i, i * 10 - 8],
        [28 - i, i * 10 + 2],
        [-26 + i, i * 10 + 2],
      ],
      PAL.dk,
      PAL.pl,
      [
        [-20, i * 10 - 3],
        [22, i * 10 - 3],
      ],
    );
  plate(
    [
      [-34, -52],
      [32, -58],
      [46, -30],
      [36, -2],
      [-30, -2],
      [-42, -28],
    ],
    PAL.pl,
    PAL.pl2,
    [
      [-28, -46],
      [26, -50],
      [-30, -9],
      [28, -9],
      [40, -30],
      [-36, -28],
    ],
  );
  ctx.strokeStyle = 'rgba(30,14,6,.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-2, -55);
  ctx.lineTo(0, -40);
  ctx.moveTo(-38, -28);
  ctx.lineTo(44, -30);
  ctx.stroke();
  if (!fl) {
    dent(-16, -40, 6);
    dent(-6, -14, 4.5);
    dent(30, -20, 3.5);
  }
  // the pressure gauge: its needle creeps into the red as it loses health
  const hp = clamp(e.hp / T.hp, 0, 1),
    na = -2.3 + 3.2 * (1 - hp) + Math.sin(G.time * 17) * 0.06;
  ctx.fillStyle = PAL.tr;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(18, -40, 9, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : '#f2ead8';
  ctx.beginPath();
  ctx.arc(18, -40, 6.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#c0302a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(18, -40, 5, -0.2, 0.9);
  ctx.stroke();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(18, -40);
  ctx.lineTo(18 + Math.cos(na) * 5.5, -40 + Math.sin(na) * 5.5);
  ctx.stroke();
  // a vent grille, a hazard stripe across the chest
  ctx.fillStyle = PAL.jt;
  for (let i = 0; i < 4; i++) ctx.fillRect(4, -24 + i * 4, 22, 2);
  hazard(-34, -34, 30, 7, fl);
  ctx.restore();
  // the near leg
  leg(o.lF, 6, PAL.pl);
  // the flamethrower arm, the hose from the tanks into the back of the gun
  armLimb(A[0], A[1], 13, 12, PAL.pl);
  joint(A[1], 9);
  armLimb(A[1], A[2], 12, 13, PAL.pl);
  flamethrower(e, A[2], o.aF[1], fl);
  const h0 = torsoPt(o, g, [-50, 10]),
    h1 = gunPt(g, o.aF[1], [-32, 4]);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(h0[0], h0[1]);
  ctx.bezierCurveTo(h0[0] - 6, h0[1] + 50, h1[0] - 40, h1[1] + 40, h1[0], h1[1]);
  ctx.stroke();
  ctx.strokeStyle = fl ? '#fff' : '#3a3430';
  ctx.lineWidth = 5.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  // the big shoulder plate, brass-edged and striped
  ctx.save();
  ctx.translate(sh[0] - 4, sh[1] + 4);
  ctx.rotate(o.aF[0] * 0.3 - 0.2);
  ctx.scale(0.92, 0.92);
  plate(
    [
      [-28, -18],
      [22, -24],
      [36, -4],
      [30, 20],
      [-26, 18],
    ],
    PAL.pl,
    PAL.pl2,
    [
      [-20, -10],
      [14, -15],
      [26, 8],
      [-18, 9],
    ],
  );
  ctx.fillStyle = PAL.tr;
  ctx.fillRect(-24, 4, 52, 4);
  if (!fl) dent(4, -6, 4);
  ctx.restore();
  // the head: the diver's helmet, or (once it is off) the zombie under it
  ctx.save();
  ctx.translate(neck[0] + 8, neck[1] - 20);
  ctx.rotate(o.lean * 0.5 + o.head);
  ctx.scale(HEAD, HEAD);
  if (e.helmetOff) zombieHead(e, fl);
  else drawHelmet(fl, ['windup', 'ramwind'].includes(e.state) ? '#ff3a2a' : PAL.gl);
  ctx.restore();
  ctx.restore();
}
/** Its helmet lying on the road once it has come off (a piece of debris). */
export function drawHelmetDebris(d) {
  PAL = palette(false);
  usePal(PAL);
  ctx.scale(d.s * HEAD, d.s * HEAD);
  ctx.translate(0, -14);
  drawHelmet(false, '#7a5a30', false);
}

// --- behaviour --------------------------------------------------------------------------------

/** A lick of the flame: health off without a stagger (a bite that would kill knocks down). */
function burn(e, dmg) {
  if (P.inv > 0 || G.state !== 'play' || ['ko', 'down', 'getup', 'dead', 'win'].includes(P.state))
    return;
  if (P.hp <= dmg) {
    hitPlayer(dmg, P.x >= e.x ? 1 : -1, true);
    return;
  }
  P.hp -= dmg;
  styleBreak();
  SFX.hurt();
  for (let i = 0; i < 5; i++)
    G.parts.push({
      k: 'glow',
      x: P.x + rnd(-18, 18),
      y: P.y - rnd(10, 90),
      vx: rnd(-40, 40),
      vy: rnd(-160, -60),
      g: 0,
      t: 0,
      life: rnd(0.25, 0.45),
      s: rnd(4, 7),
      col: random() < 0.5 ? '#ffcf5a' : '#ff6a2a',
    });
}
/** Steam out of its joints: a puff now and then, more once it has lost its helmet. */
function steam(e, dt) {
  const s = e.T.scale;
  if (e.dying || random() > dt * (e.phase2 ? 7 : 3)) return;
  const spots = [
    [-30, 60],
    [10, 62],
    [-20, 150],
    [26, 140],
  ];
  const [dx, h] = spots[Math.floor(random() * spots.length)];
  G.parts.push({
    k: 'smoke',
    x: e.x + e.face * dx * s,
    y: e.y - e.z - h * s,
    vx: rnd(-30, 30) - e.face * 20,
    vy: rnd(-90, -50),
    g: 0,
    t: 0,
    life: rnd(0.5, 0.8),
    s: rnd(6, 10),
    col: '#e4ecef',
  });
}
/** A mortar shell from tube i, to come down at (tx, ty) (kept on screen and on the floor). */
function shell(e, i, tx, ty) {
  const M = PROS.mortar,
    to = floorClamp({ x: clamp(tx, G.cam + 60, G.cam + W - 60), y: ty }),
    [mx, my] = mortarMouth(e, i);
  G.projs.push({
    k: 'shell',
    x: mx,
    y: e.y,
    z: e.y - my,
    x0: mx,
    y0: e.y,
    z0: e.y - my,
    tx: to.x,
    ty: to.y,
    T: M.flight,
    h: M.h,
    t: 0,
    vx: 0,
    rot: 0,
    life: M.flight + 1,
  });
  for (let k = 0; k < 4; k++)
    G.parts.push({
      k: 'smoke',
      x: mx + rnd(-6, 6),
      y: my + rnd(-6, 6),
      vx: rnd(-30, 30),
      vy: rnd(-80, -30),
      g: 0,
      t: 0,
      life: rnd(0.6, 1),
      s: rnd(8, 12),
    });
  e.shotI = i;
  e.kick = 1;
  G.shake = Math.max(G.shake, 4);
  SFX.mortar();
}
/** Where the shells of a volley fall: around the player, or a fork across the road. */
function volley(e) {
  const M = PROS.mortar;
  if (e.phase2) {
    const f = M.fork;
    return [
      [0, 0],
      [-f, 0],
      [f, 0],
      [-f / 2, 55],
      [f / 2, -55],
    ];
  }
  return [
    [0, 0],
    ...Array.from({ length: M.shots - 1 }, () => [rnd(-M.spread, M.spread), rnd(-40, 40)]),
  ];
}
/** It loses its helmet: it flies off, and the boss gets faster. */
function unmask(e) {
  const s = e.T.scale;
  e.helmetOff = true;
  G.debris.push({
    k: 'helmet',
    x: e.x,
    gy: e.y + 2,
    z: e.z + 250 * s,
    vx: -e.face * rnd(140, 220),
    vz: rnd(460, 560),
    rot: 0,
    vr: -e.face * rnd(6, 10),
    s,
    life: 14,
  });
  for (let i = 0; i < 14; i++)
    G.parts.push({
      k: i % 2 ? 'dot' : 'smoke',
      x: e.x + e.face * 10 * s,
      y: e.y - 240 * s,
      vx: rnd(-160, 160),
      vy: rnd(-260, -60),
      g: i % 2 ? 700 : 0,
      t: 0,
      life: rnd(0.4, 0.9),
      s: i % 2 ? rnd(3, 5) : rnd(10, 16),
      col: i % 2 ? '#ffe9a0' : '#e4ecef',
    });
  G.shake = Math.max(G.shake, 10);
  SFX.clang();
  SFX.hiss();
}

/** The flame pours out `L` long (aimed at the ground just in front if `down`): fire and smoke
 *  along it, patches of fire left burning on the road, and a lick of it for whoever is in it. */
function pour(e, L, dt, down) {
  const F = PROS.flame,
    Fi = PROS.fire,
    [mx, my] = nozzleAt(e),
    fdy = e.fdy ?? 0;
  for (let i = 0; i < 4; i++) {
    const life = rnd(0.3, 0.5),
      reach = L * Math.sqrt(rnd(0.05, 1)),
      gy = e.y + fdy * (reach / F.len) + rnd(-1, 1) * (F.w0 + reach * F.spread) * 0.6;
    G.parts.push({
      k: 'glow',
      x: mx,
      y: my,
      vx: (e.face * (reach + 10)) / life,
      vy: (gy - (down ? 8 : 40) - my) / life,
      g: 0,
      t: 0,
      life,
      s: rnd(5, 10),
      col: random() < 0.5 ? '#ffcf5a' : '#ff6a2a',
    });
  }
  if (random() < 0.5)
    G.parts.push({
      k: 'smoke',
      x: mx + e.face * rnd(20, Math.max(30, L)),
      y: e.y + fdy - rnd(60, 110),
      vx: rnd(-20, 20),
      vy: rnd(-70, -30),
      g: 0,
      t: 0,
      life: rnd(0.8, 1.2),
      s: rnd(12, 20),
    });
  // the road catches fire under it, behind the flame's front
  if ((e.fireT = (e.fireT ?? 0) - dt) <= 0 && L > 40) {
    e.fireT = Fi.every;
    const f = L * rnd(down ? 0.35 : 0.5, 1),
      o = floorClamp({
        x: mx + e.face * f,
        y: e.y + fdy * (f / F.len) + rnd(-1, 1) * (F.w0 + f * F.spread) * 0.5,
      });
    G.pools.push({ fire: true, x: o.x, y: o.y, t: 0, life: Fi.life, seed: rnd(6) });
  }
  G.shake = Math.max(G.shake, 2);
  if ((e.tick = (e.tick ?? 0) - dt) <= 0) {
    e.tick = F.tick;
    if (inFlame(e)) burn(e, F.dmg);
  }
}
/** A jet hop from where it stands to (x, y) on the floor (kept on screen): `T` long, `h` high. */
function hop(e, x, y, T, h) {
  const to = floorClamp({ x: clamp(x, G.cam + 80, G.cam + W - 80), y });
  go(e, 'phop', 0, {
    engage: false,
    hx0: e.x,
    hy0: e.y,
    hx1: to.x,
    hy1: to.y,
    hopT: T,
    hopH: h,
  });
  e.face = to.x >= e.x ? 1 : -1;
  dust(e.x, e.y, 6);
  SFX.jump();
  SFX.hiss();
}
/** Up close, one of its ways to get somewhere else: a hop back, a slide aside in depth, a leap
 *  over the player to her other side, or the big jet jump to another spot on the arena. */
function reposition(e) {
  const M = PROS.move,
    away = P.x >= e.x ? -1 : 1,
    r = random() * (M.back + M.side + M.over + M.jump);
  if (r < M.back) hop(e, e.x + away * M.backDist, e.y, 0.45, 60);
  else if (r < M.back + M.side) {
    const dy = (P.y > e.y ? -1 : 1) * M.sideDist;
    hop(e, e.x + away * 50, e.y + dy, 0.35, 30);
  } else if (r < M.back + M.side + M.over) hop(e, P.x - away * M.overDist, e.y, 0.6, 140);
  else jumpTo(e, ...groundPoint(random));
}
/** Where a ram that starts now would stop: `dist` ahead, or at the screen's edge. */
const ramEnd = (e) => clamp(e.x + e.face * PROS.ram.dist, G.cam + 70, G.cam + W - 70);

export default defineFoe('prospector', {
  draw: drawProspector,
  over: (e) => (e.state === 'flame' || e.state === 'fwalk') && drawFlame(e),
  walksIn: true,
  corpse: true,
  jump: PROS.jump,
  init: {
    flameCd: PROS.flame.first,
    mortCd: PROS.mortar.first,
    jumpCd: PROS.jump.first,
    ramCd: PROS.ram.first,
    walkCd: PROS.walk.first,
  },
  timers: ['flameCd', 'mortCd', 'jumpCd', 'ramCd', 'walkCd'],
  spawn(e) {
    e.w = 44;
    e.kick = 0;
  },
  engageCap: Infinity,
  stand: 84,
  moves: [
    {
      // half its health gone: off comes the helmet
      when: (e) => !e.phase2 && e.hp < e.T.hp * PROS.phase,
      go(e) {
        e.phase2 = true;
        e.T = { ...e.T, speed: e.T.speed * PROS.fast, cd: e.T.cd.map((c) => c / PROS.fast) };
        faceP(e);
        go(e, 'unmask', 0, { engage: false });
        SFX.hiss();
      },
    },
    {
      // at a distance: the jump, straight onto the player
      when: (e, s) =>
        e.jumpCd <= 0 && !s.pdown && s.adx > PROS.jump.min && s.adx < PROS.jump.max && onScreen(e),
      go: (e) => jumpTo(e, P.x, P.y),
    },
    {
      // lined up with the player and room to run: the ram
      when: (e, s) =>
        e.ramCd <= 0 &&
        !s.pdown &&
        s.adx > PROS.ram.min &&
        s.ady < PROS.ram.dy &&
        onScreen(e) &&
        Math.abs(ramEnd({ x: e.x, face: s.dx >= 0 ? 1 : -1 }) - e.x) > s.adx,
      go(e) {
        faceP(e);
        go(e, 'ramwind', 0, { engage: false, rend: ramEnd(e) });
        SFX.hiss();
      },
    },
    {
      // the player out of reach of its fists: a volley from the mortars
      when: (e, s) => e.mortCd <= 0 && !s.pdown && s.adx > PROS.mortar.min && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'mwind', 0, { engage: false });
        SFX.hiss();
      },
    },
    {
      // in front of it and close enough: the flame
      when: (e, s) =>
        e.flameCd <= 0 &&
        !s.pdown &&
        s.adx > PROS.flame.from + 10 &&
        s.adx < PROS.flame.from + PROS.flame.len * 0.85 &&
        s.ady < 100 &&
        onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'fwind', 0, { engage: false, walkMode: false });
        SFX.hiss();
      },
    },
    {
      // further off: it comes walking at the player, setting the road alight before it
      when: (e, s) =>
        e.walkCd <= 0 && !s.pdown && s.adx > PROS.walk.min && s.adx < PROS.walk.max && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'fwind', 0, { engage: false, walkMode: true });
        SFX.hiss();
      },
    },
  ],
  attacks: [...UNSTOPPABLE, 'jland', 'rstop', 'phop'],
  unstoppable: (e) => UNSTOPPABLE.includes(e.state),
  // in those, nothing throws it (not even a crushing blow); otherwise it is a heavy enemy
  guard: (e) => UNSTOPPABLE.includes(e.state),
  immune: (e) => e.state === 'unmask',
  die(e, dir) {
    P.score += Math.round(e.T.score * scoreMult());
    Object.assign(e, {
      dying: true,
      engage: false,
      state: 'fall',
      t: 0,
      vx: dir * 120,
      vz: 300,
      hp: 0,
    });
    finale(e);
    SFX.thud();
  },
  tick(e, dt) {
    e.kick = Math.max(0, (e.kick ?? 0) - dt * 5);
    steam(e, dt);
  },
  on: {
    windup(e) {
      // up close, most of the time it moves somewhere else instead of kicking
      if (e.t < 0.05 && !e.rolled) {
        e.rolled = true;
        if (random() < PROS.move.chance) {
          reposition(e);
          return;
        }
      } else if (e.t >= 0.05) e.rolled = false;
      if (e.t < 0.05 && !e.hissed) {
        e.hissed = true;
        SFX.hiss();
      } else if (e.t >= 0.05) e.hissed = false;
    },
  },
  states: {
    fwind(e, dt, s) {
      // the pilot light flares; it turns to face the player until just before it fires
      const wind = e.walkMode ? PROS.walk.wind : PROS.flame.wind;
      if (e.t < wind * 0.6) e.face = s.dx >= 0 ? 1 : -1;
      if (e.t > wind) {
        // the second phase sweeps the flame across the road, from the far side to the near
        const sw = e.phase2 && !e.walkMode ? PROS.flame.sweep * (random() < 0.5 ? -1 : 1) : 0;
        go(e, e.walkMode ? 'fwalk' : 'flame', 0, {
          tick: 0,
          fireT: 0,
          flen: 0,
          sweep0: sw,
          fdy: sw,
        });
        SFX.flame();
      }
    },
    flame(e, dt) {
      // the flame grows out slowly to its full length, and burns on
      const F = PROS.flame,
        dur = e.phase2 ? F.time2 : F.time;
      if (e.phase2) e.fdy = e.sweep0 * Math.cos((e.t / dur) * Math.PI);
      e.flen = F.len * Math.min(1, e.t / F.grow);
      pour(e, e.flen, dt, false);
      if (e.t > dur)
        go(e, 'chase', 0, { flameCd: cd(e, F.cd), fdy: 0, flen: 0, cd: Math.max(e.cd, 0.5) });
    },
    fwalk(e, dt, s) {
      // walking at the player, the flame aimed at the road just in front
      const Wk = PROS.walk;
      faceP(e);
      e.flen = Wk.len * Math.min(1, e.t / 0.4);
      if (s.adx > PROS.flame.from * 0.7)
        moveTo(e, P.x, P.y, Wk.speed * (e.phase2 ? PROS.fast : 1), dt);
      pour(e, e.flen, dt, true);
      if (random() < 0.3) dust(e.x - e.face * 10, e.y, 1);
      if (e.t > Wk.time) {
        go(e, 'chase', 0, { walkCd: cd(e, Wk.cd), flen: 0, cd: Math.max(e.cd, 0.5) });
        e.flameCd = Math.max(e.flameCd, 1.5);
      }
    },
    phop(e, dt) {
      // a short hop on its jets to a new place: back, aside in depth, or over the player
      const u = Math.min(1, e.t / e.hopT);
      if (u < 1) jetTrail(e, dt);
      e.x = e.hx0 + (e.hx1 - e.hx0) * ease(u);
      e.y = e.hy0 + (e.hy1 - e.hy0) * ease(u);
      e.z = 4 * e.hopH * u * (1 - u);
      if (u >= 1) {
        e.z = 0;
        dust(e.x, e.y, 8);
        G.shake = Math.max(G.shake, 4);
        SFX.thud();
        faceP(e);
        // landed: what it does from there is its own choice, not a kick at once
        go(e, 'chase', 0, { cd: Math.max(e.cd, PROS.move.after) });
      }
    },
    ramwind(e, dt, s) {
      // crouched to charge; it turns after the player until just before it goes
      const R = PROS.ram;
      if (e.t < R.wind * 0.6) {
        e.face = s.dx >= 0 ? 1 : -1;
        e.rend = ramEnd(e);
      }
      if (random() < 0.4) dust(e.x - e.face * 30, e.y, 1);
      if (random() < 0.3 + 0.6 * (e.t / R.wind))
        G.parts.push({
          k: 'glow',
          x: e.x - e.face * 90 * e.T.scale,
          y: e.y - 105 * e.T.scale + rnd(-15, 15),
          vx: -e.face * rnd(120, 280),
          vy: rnd(-60, 20),
          g: 0,
          t: 0,
          life: rnd(0.15, 0.3),
          s: rnd(3, 6),
          col: random() < 0.5 ? '#ffcf5a' : '#ff7a2a',
        });
      if (e.t > R.wind) {
        go(e, 'ram', 0, { x0: e.x, hitDone: false });
        SFX.charge();
        G.shake = Math.max(G.shake, 6);
      }
    },
    ram(e, dt) {
      const R = PROS.ram;
      e.x += e.face * R.speed * dt;
      dust(e.x - e.face * 30, e.y, 1);
      if (random() < 0.6)
        G.parts.push({
          k: 'glow',
          x: e.x - e.face * 50 * e.T.scale,
          y: e.y - 150 * e.T.scale + rnd(-10, 10),
          vx: -e.face * rnd(150, 300),
          vy: rnd(-40, 40),
          g: 0,
          t: 0,
          life: rnd(0.15, 0.3),
          s: rnd(4, 7),
          col: random() < 0.5 ? '#ffcf5a' : '#ff7a2a',
        });
      // in the second phase it leaves a wide cone of fire behind it, dying down fast
      if (e.phase2 && (e.trailT = (e.trailT ?? 0) - dt) <= 0) {
        const C = R.trail;
        e.trailT = C.every;
        for (let i = 0; i < 2; i++) {
          const d = rnd(30, C.len),
            o = floorClamp({
              x: e.x - e.face * d,
              y: e.y + rnd(-1, 1) * (C.w0 + d * C.spread),
            });
          G.pools.push({ fire: true, x: o.x, y: o.y, t: 0, life: C.life, seed: rnd(6) });
        }
      }
      // barrels in the way burst
      for (const u of G.props)
        if (!u.dead && u.decor && Math.abs(u.x - e.x) < 50 && Math.abs(u.y - e.y) < 30)
          breakProp(u);
      if (!e.hitDone && Math.abs(P.x - e.x) < 60 && Math.abs(P.y - e.y) < R.dy && P.z < 100) {
        e.hitDone = true;
        if (hitPlayer(R.dmg, e.face, true)) {
          G.shake = Math.max(G.shake, 12);
          SFX.heavy();
        }
      }
      if ((e.x - e.rend) * e.face >= 0 || Math.abs(e.x - e.x0) >= R.dist) {
        e.x = e.rend;
        go(e, 'rstop');
        G.shake = Math.max(G.shake, 9);
        dust(e.x, e.y, 10);
        SFX.thud();
      }
    },
    rstop(e) {
      if (e.t < 0.3 && random() < 0.6) dust(e.x + e.face * 20, e.y, 1);
      if (e.t > PROS.ram.stop)
        go(e, 'chase', 0, { ramCd: cd(e, PROS.ram.cd), cd: Math.max(e.cd, 0.4) });
    },
    mwind(e) {
      if (e.t > PROS.mortar.wind) go(e, 'mortar', 0, { shots: volley(e), shotT: 0 });
    },
    mortar(e, dt) {
      const M = PROS.mortar;
      e.shotT -= dt;
      if (e.shots.length && e.shotT <= 0) {
        const [ox, oy] = e.shots.shift();
        e.shotT = M.gap;
        // each shell aims where the player is now
        shell(e, (e.shots.length + 1) % 2, P.x + ox, P.y + oy);
      }
      if (!e.shots.length && e.shotT <= -0.35)
        go(e, 'chase', 0, { mortCd: cd(e, M.cd), cd: Math.max(e.cd, 0.4) });
    },
    unmask(e) {
      if (e.t >= 0.45 && !e.helmetOff) unmask(e);
      if (e.t >= 0.75 && !e.roared) {
        e.roared = true;
        SFX.boss();
      }
      if (random() < 0.4) dust(e.x + rnd(-50, 50), e.y, 1);
      if (e.t > PROS.unmask) go(e, 'chase', 0, { cd: 0.4 });
    },
  },
});
