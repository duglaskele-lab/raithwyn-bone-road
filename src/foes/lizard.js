// The mutant lizard of Old Quarry: a big hunched reptile on two legs with long clawed arms
// (in the spirit of the deathclaw). Fast on its feet. It sees a blow coming and hops back out
// of reach, then lunges in claws first; up close it rakes with its claws. A medium enemy:
// plain hits do not stop it (see WEIGHT).
import { LIZARD, OL, TAU } from '../config.js';
import { clamp, ease, random, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { hitPlayer } from '../combat.js';
import { ctx } from '../gfx.js';
import { drawAura } from '../skeleton.js';
import { defineFoe } from './registry.js';
import { faceP, go, inFront } from './kit.js';

/** A thick limb with a dark outline, through the points given. */
export function seg(pts, w, col) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [lw, c] of [
    [w + 4, OL],
    [w, col],
  ]) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = c;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
}
/** The end of a chain of bones from p: each [angle, length], angle 0 = down, PI/2 = forward. */
export function chain(p, parts) {
  const out = [p];
  let a = p;
  for (const [ang, len] of parts) {
    a = [a[0] + Math.sin(ang) * len, a[1] + Math.cos(ang) * len];
    out.push(a);
  }
  return out;
}
// Body parts: thigh, shin, foot; upper arm, forearm.
const LEG = [38, 40, 24],
  ARM = [34, 36];

/** Its pose this frame: lean of the body, head tilt, jaw, legs and arms, tail sway. */
function lizPose(e) {
  const br = Math.sin(e.anim * 3 + e.seed),
    o = {
      lean: 1.0 + 0.03 * br,
      head: -0.15,
      jaw: 0.1 + Math.max(0, Math.sin(e.anim * 5)) * 0.15,
      hipH: 82,
      lF: [0.35, -0.55, 0.9],
      lB: [-0.1, -0.85, 0.7],
      aF: [0.6 + 0.04 * br, 1.3],
      aB: [0.4, 1.15],
      tail: Math.sin(e.anim * 2.4) * 0.12,
      rot: 0,
    };
  const t = e.t;
  if (e.moving && (e.state === 'chase' || e.state === 'lzlunge')) {
    // a loping run: long strides, the body bobbing
    const w = e.walkT,
      s = Math.sin(w),
      c = Math.cos(w);
    o.lF = [0.3 + 0.75 * s, -0.7 - 0.6 * Math.max(0, c), 0.9];
    o.lB = [0.3 - 0.75 * s, -0.7 - 0.6 * Math.max(0, -c), 0.9];
    o.hipH = 80 + Math.abs(c) * 6;
    o.aF = [0.9 - 0.4 * s, 1.5];
    o.aB = [0.9 + 0.4 * s, 1.4];
    o.lean = 1.2;
    o.tail = 0.2 * c;
  }
  switch (e.state) {
    case 'windup': {
      // the claw drawn back high
      const u = ease(clamp(t / (e.T.wind * 0.7), 0, 1));
      o.aF = [0.6 + (-2.2 - 0.6) * u, 1.3 + (-1.6 - 1.3) * u];
      o.lean = 1.0 - 0.3 * u;
      o.head = -0.3 * u;
      o.jaw = 0.5 * u;
      o.lF = [0.55, -0.4, 0.9];
      break;
    }
    case 'attack': {
      const u = clamp(t / 0.08, 0, 1);
      o.aF = [-2.2 + 3.9 * u, -1.6 + 3.3 * u];
      o.lean = 0.7 + 0.6 * u;
      o.jaw = 0.6;
      o.lF = [0.75, -0.3, 0.9];
      break;
    }
    case 'recover':
      o.aF = [1.4, 1.6];
      o.lean = 1.1;
      break;
    case 'lzhop':
      // tucked up in the air
      o.lF = [1.2, -0.4, 1.2];
      o.lB = [0.9, -0.6, 1.1];
      o.aF = [1.5, 2.4];
      o.aB = [1.3, 2.2];
      o.hipH = 60;
      o.lean = 0.7;
      o.jaw = 0.4;
      break;
    case 'lzwind': {
      // crouched low, ready to spring; it shakes
      const k = Math.sin(t * 60) * 0.03;
      o.hipH = 58;
      o.lean = 1.35 + k;
      o.head = 0.15;
      o.jaw = 0.7;
      o.lF = [1.1, -0.9, 1.1];
      o.lB = [0.5, -1.4, 1.0];
      o.aF = [-0.5 + k, 0.4];
      o.aB = [-0.4, 0.5];
      break;
    }
    case 'lzlunge':
      // stretched out flat, claws first
      o.lean = 1.45;
      o.head = 0.3;
      o.jaw = 0.8;
      o.aF = [1.55, 1.6];
      o.aB = [1.45, 1.55];
      o.lB = [-0.9, -0.6, 0.6];
      o.lF = [0.8, -0.2, 0.9];
      o.hipH = 70;
      break;
    case 'hurt':
      o.lean = 0.5;
      o.head = -0.5;
      o.jaw = 0.7;
      o.aF = [-0.5, 0.2];
      o.aB = [-0.7, 0.1];
      break;
    case 'air':
      o.rot = -Math.min(1.4, t * 5);
      o.aF = [1.9, 2.4];
      o.lF = [1.0, 0.2, 0.8];
      o.jaw = 0.8;
      break;
    case 'down':
      o.rot = -1.45;
      o.hipH = 20;
      o.lF = [0.3, 0.1, 0.5];
      o.lB = [0.1, 0.1, 0.5];
      break;
    case 'getup': {
      const u = ease(clamp(t / 0.45, 0, 1));
      o.rot = -1.45 * (1 - u);
      o.hipH = 20 + 62 * u;
      break;
    }
    case 'rise': {
      o.aF = [2.6, 3.0];
      o.aB = [2.4, 2.9];
      o.jaw = 0.8;
      break;
    }
  }
  return o;
}

export function drawLizard(e, aura = true) {
  const T = e.T,
    s = T.scale,
    o = lizPose(e),
    fl = e.flash > 0,
    col = fl ? '#fff' : T.col,
    dk = fl ? '#ffd9d9' : T.dk,
    belly = fl ? '#fff' : '#b8b07a';
  if (aura) drawAura(e);
  ctx.save();
  ctx.translate(e.x - G.cam, e.y - e.z);
  if (e.state === 'rise') {
    const p = ease(Math.min(1, e.t / 0.85));
    ctx.beginPath();
    ctx.rect(-200, -400, 400, 402);
    ctx.clip();
    ctx.translate(0, (1 - p) * 200 * s);
  }
  ctx.scale(e.face * s, s);
  ctx.translate(0, -o.hipH);
  ctx.rotate(o.rot);
  const H = [0, 0],
    C = [Math.sin(o.lean) * 62, -Math.cos(o.lean) * 62],
    sh = [C[0] - 6, C[1] + 10];
  const leg = (l, c, off) => {
    const pts = chain(
      [off, 0],
      [
        [l[0], LEG[0]],
        [l[1], LEG[1]],
        [l[2], LEG[2]],
      ],
    );
    seg(pts.slice(0, 2), 15, c);
    seg(pts.slice(1, 3), 10, c);
    seg(pts.slice(2), 7, c);
    // three toes with dark claws
    const f = pts[3];
    for (const a of [1.3, 1.6, 1.9])
      seg([f, [f[0] + Math.sin(a) * 14, f[1] + Math.cos(a) * 6]], 4, c);
    return pts;
  };
  const arm = (a, c, off) => {
    const pts = chain(
      [sh[0] + off, sh[1]],
      [
        [a[0], ARM[0]],
        [a[1], ARM[1]],
      ],
    );
    seg(pts.slice(0, 2), 12, c);
    seg(pts.slice(1), 9, c);
    // the claws: long and curved, bone-white
    const h = pts[2],
      d = a[1];
    for (const k of [-0.35, 0, 0.35]) {
      const ang = d + k,
        mid = [h[0] + Math.sin(ang) * 16, h[1] + Math.cos(ang) * 16],
        tip = [mid[0] + Math.sin(ang + 0.5) * 14, mid[1] + Math.cos(ang + 0.5) * 14];
      seg([h, mid, tip], 3.5, fl ? '#fff' : '#e8e2c8');
    }
    return pts;
  };
  // the far side first
  arm(o.aB, dk, -6);
  leg(o.lB, dk, -6);
  // the tail, swinging
  const tail = [H];
  for (let i = 1; i <= 5; i++) {
    const a = -1.5 + 0.09 * i + o.tail * i * 0.5;
    const p = tail[i - 1];
    tail.push([p[0] + Math.sin(a) * 22, p[1] + Math.cos(a) * 22]);
  }
  seg(tail.slice(0, 3), 18, col);
  seg(tail.slice(2, 5), 11, col);
  seg(tail.slice(4), 6, dk);
  // the body: a hunched barrel of a torso, spines along the back
  ctx.save();
  ctx.translate((H[0] + C[0]) / 2, (H[1] + C[1]) / 2);
  ctx.rotate(Math.atan2(C[1] - H[1], C[0] - H[0]));
  ctx.lineWidth = 3;
  ctx.strokeStyle = OL;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, 0, 44, 27, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // pale belly with plates
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(4, 12, 34, 13, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = 'rgba(23,21,29,.35)';
  ctx.lineWidth = 1.5;
  for (let x = -24; x <= 28; x += 9) {
    ctx.beginPath();
    ctx.moveTo(x, 10);
    ctx.lineTo(x + 2, 24);
    ctx.stroke();
  }
  // scales
  ctx.fillStyle = dk;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(-30 + i * 7, -8 + (i % 2) * 6, 3.2, 0, TAU);
    ctx.fill();
  }
  // glowing sores of radiation
  ctx.fillStyle = fl ? '#fff' : '#b6ff3a';
  ctx.shadowColor = '#b6ff3a';
  ctx.shadowBlur = 8;
  for (const [x, y] of [
    [-12, -12],
    [14, -4],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, TAU);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  // spines along the back
  ctx.fillStyle = dk;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const x = -34 + i * 13;
    ctx.beginPath();
    ctx.moveTo(x - 6, -24 + Math.abs(i - 3) * 1.2);
    ctx.lineTo(x, -40 + Math.abs(i - 3) * 2);
    ctx.lineTo(x + 6, -24 + Math.abs(i - 3) * 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  leg(o.lF, col, 6);
  // the head: a heavy horned skull on a short neck, jaw hanging open
  ctx.save();
  const ha = o.lean - 1.25 + o.head;
  ctx.translate(C[0] + 10, C[1] - 4);
  ctx.rotate(ha);
  seg(
    [
      [-14, 6],
      [8, 0],
    ],
    16,
    col,
  );
  ctx.translate(14, -4);
  ctx.lineWidth = 3;
  ctx.strokeStyle = OL;
  // the lower jaw
  ctx.save();
  ctx.rotate(o.jaw);
  ctx.fillStyle = dk;
  ctx.beginPath();
  ctx.moveTo(-6, 4);
  ctx.lineTo(36, 8);
  ctx.lineTo(30, 16);
  ctx.lineTo(-4, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f2ecd2';
  for (let x = 4; x < 32; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, 8);
    ctx.lineTo(x + 2, 3);
    ctx.lineTo(x + 4, 8);
    ctx.fill();
  }
  ctx.restore();
  // the skull
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-10, -12);
  ctx.quadraticCurveTo(8, -20, 26, -10);
  ctx.lineTo(42, -2);
  ctx.lineTo(40, 6);
  ctx.lineTo(-8, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f2ecd2';
  for (let x = 8; x < 38; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, 6);
    ctx.lineTo(x + 2, 12);
    ctx.lineTo(x + 4, 6);
    ctx.fill();
  }
  // horns
  ctx.fillStyle = fl ? '#fff' : '#d8ceb0';
  for (const [x, a] of [
    [-4, -2.3],
    [6, -2.0],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x - 5, -12);
    ctx.quadraticCurveTo(x + Math.sin(a) * 18, -12 + Math.cos(a) * 20, x - 14, -40);
    ctx.lineTo(x + 5, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // the eye
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.ellipse(18, -6, 5, 4, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = T.eye;
  ctx.shadowColor = T.eye;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(19, -6, 2.4, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  const A = arm(o.aF, col, 4);
  // the swipe of the claws
  if (e.state === 'attack' && e.t < 0.14) {
    ctx.save();
    ctx.globalAlpha = 1 - e.t / 0.14;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    for (const r of [70, 80, 90]) {
      ctx.beginPath();
      ctx.arc(sh[0], sh[1], r, -1.5, 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
  void A;
  ctx.restore();
}

export default defineFoe('lizard', {
  draw: drawLizard,
  init: { dodgeCd: [0.5, 1.5], lcd: [2, 4] },
  timers: ['dodgeCd', 'lcd'],
  spawn(e) {
    e.w = 34;
  },
  engageCap: 3,
  // it springs away from a blow, invulnerable for the first moment of the hop
  immune: (e) => e.state === 'lzhop' && e.t < 0.28,
  attacks: ['lzwind', 'lzlunge'],
  moves: [
    {
      // sees the blow coming: hops back
      when: (e, s) =>
        e.dodgeCd <= 0 &&
        !s.pdown &&
        ['atk1', 'atk2', 'throw'].includes(P.state) &&
        P.t < 0.1 &&
        s.adx < 170 &&
        s.ady < 50 &&
        (P.x - e.x) * P.face < 0,
      go(e) {
        e.dodgeCd = rnd(LIZARD.dodgeCd[0], LIZARD.dodgeCd[1]);
        if (random() > LIZARD.dodge) return;
        faceP(e);
        go(e, 'lzhop', 0, { vx: -e.face * LIZARD.hopVx, vz: LIZARD.hopVz, engage: false });
        SFX.hiss();
      },
    },
    {
      // from a distance: a lunge now and then
      when: (e, s, dt) =>
        e.lcd <= 0 && !s.pdown && s.adx > 170 && s.adx < 400 && s.ady < 40 && random() < dt * 0.9,
      go: (e) => go(e, 'lzwind', 0, { engage: false }),
    },
  ],
  states: {
    lzhop: {
      pin: true,
      tick(e, dt) {
        e.x += e.vx * dt;
        e.vz -= 1700 * dt;
        e.z += e.vz * dt;
        if (e.z <= 0) {
          e.z = 0;
          dust(e.x, e.y, 4);
          // landed: straight into the lunge
          go(e, P.state === 'ko' || P.state === 'dead' ? 'chase' : 'lzwind');
        }
      },
    },
    lzwind(e) {
      faceP(e);
      if (e.t > LIZARD.lwind) {
        go(e, 'lzlunge', 0, { hitDone: false, cdir: e.face });
        SFX.hiss();
      }
    },
    lzlunge: {
      pin: true,
      tick(e, dt) {
        e.face = e.cdir;
        e.x += e.cdir * LIZARD.lunge * dt;
        e.moving = true;
        e.walkT += dt * 20;
        if (random() < 0.4) dust(e.x - e.face * 24, e.y, 1);
        if (!e.hitDone && inFront(e, 10, 90, 26, 110)) {
          e.hitDone = true;
          hitPlayer(LIZARD.lungeDmg, e.face, true);
        }
        if (e.t > LIZARD.lungeT || (e.x - P.x) * e.cdir > 140)
          go(e, 'recover', -0.2, { lcd: rnd(3, 6) });
      },
    },
  },
});
