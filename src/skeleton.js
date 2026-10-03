// Vector skeleton rig: poses per AI state and the drawing of bones, weapons, the bike.
import { CHAIN, FONT, OL, PURPLE, TAU } from './config.js';
import { clamp, ease, lerp } from './util.js';
import { G, P } from './state.js';
import { ctx, rr } from './gfx.js';

export function skelPose(e) {
  const t = e.anim,
    st = e.state,
    T = e.T,
    br = Math.sin(t * 3 + e.seed);
  const o = {
    lean: 0.1,
    head: 0,
    rot: 0,
    hipH: null,
    jaw: 0,
    aF: [0.25 + 0.05 * br, 1.2 + 0.08 * br],
    aB: [0.02 - 0.04 * br, 0.95],
    lF: [0.16, -0.02],
    lB: [-0.22, -0.34],
  };
  if (T.monkey) {
    o.lean = 0.5;
    o.head = -0.35;
    o.aF = [0.55 + 0.05 * br, 0.25];
    o.aB = [0.4, 0.15];
    o.lF = [0.5, -0.5];
    o.lB = [0.2, -0.8];
  }
  const walk = (amp, ln) => {
    const s = Math.sin(e.walkT),
      c = Math.cos(e.walkT);
    o.lF = [amp * s, amp * s - 0.15 - 0.6 * Math.max(0, c)];
    o.lB = [-amp * s, -amp * s - 0.15 - 0.6 * Math.max(0, -c)];
    o.aF = [0.25 - 0.35 * s, 1.25 - 0.25 * s];
    o.aB = [0.05 + 0.35 * s, 1 + 0.25 * s];
    o.lean = ln;
    if (T.monkey) {
      o.lean = 0.55;
      o.aF = [0.5 + 0.5 * s, 0.2 + 0.5 * s];
      o.aB = [0.5 - 0.5 * s, 0.2 - 0.5 * s];
    }
  };
  const up = [2.95, 3.55],
    pre = o.aF.slice();
  const mix = (a, b, p) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];
  if (e.moving && (st === 'chase' || st === 'charge'))
    walk(st === 'charge' ? 0.8 : 0.5, st === 'charge' ? 0.5 : 0.16);
  if (T.sword && st === 'chase') {
    o.aF = [0.5, 1.9 + 0.05 * br];
  }
  if (T.club && st === 'chase') {
    o.aF = [0.4, 2.1 + 0.05 * br];
  }
  if (T.robe && (st === 'chase' || st === 'rise')) {
    o.aF = [0.45, 1.6 + 0.04 * br];
    o.lean = 0.04;
  }
  o.jaw = Math.max(0, Math.sin(t * 7 + e.seed) - 0.6) * 5;
  const strikeA =
    T.style === 'punch'
      ? [1.5, 1.57]
      : T.style === 'smash'
        ? [0.95, 1.05]
        : T.style === 'slash'
          ? [1.2, 1.45]
          : [1.35, 1.5];
  const windA = T.style === 'punch' ? [-0.9, 0.9] : up;
  if (st === 'windup') {
    const p = ease(Math.min(1, e.t / (T.wind * 0.7)));
    o.aF = mix(pre, windA, p);
    o.lean = lerp(0.1, -0.14, p);
    o.lF = [0.3, 0.1];
    o.lB = [-0.35, -0.5];
    o.jaw = 4 * p;
    if (e.t > T.wind * 0.7) {
      const j = Math.sin(e.t * 70) * 0.04;
      o.aF[0] += j;
      o.aF[1] += j;
    }
  } else if (st === 'attack') {
    const p = Math.min(1, e.t / 0.07);
    o.aF = mix(windA, strikeA, p);
    o.lean = lerp(-0.14, T.style === 'smash' ? 0.5 : 0.34, p);
    o.lF = [0.6, 0.15];
    o.lB = [-0.55, -0.8];
    o.head = 0.1;
    o.jaw = 5;
  } else if (st === 'recover' && e.slammed) {
    const p = ease(clamp(e.t / T.rec, 0, 1));
    o.aF = mix([0.75, 0.55], pre, p);
    o.aB = mix([0.6, 0.4], [0.02, 0.95], p);
    o.lean = lerp(0.6, 0.1, p);
    o.lF = [lerp(1.1, 0.16, p), lerp(-0.6, -0.02, p)];
    o.lB = [lerp(0.9, -0.22, p), lerp(-0.8, -0.34, p)];
  } else if (st === 'swind') {
    const p = ease(Math.min(1, e.t / 0.5));
    o.aF = mix(pre, [2.9, 3.2], p);
    o.aB = mix([0.02, 0.95], [2.7, 3.0], p);
    o.lean = -0.15 * p;
    o.jaw = 5;
    if (e.z > 0) {
      o.lF = [0.9, -0.5];
      o.lB = [0.7, -0.7];
      o.hipH = 46;
    }
  } else if (st === 'staff') {
    const p = ease(Math.min(1, e.t / 0.3));
    o.aF = e.t < 0.32 ? mix(pre, [2.9, 3.4], p) : [1.15, 0.95];
    o.lean = e.t < 0.32 ? -0.12 * p : 0.3;
    o.lF = [0.4, 0.1];
    o.lB = [-0.4, -0.6];
    o.jaw = 4;
  } else if (st === 'lwind') {
    o.lF = [1.2, -0.8];
    o.lB = [1, -1];
    o.aF = [-0.7, -0.3];
    o.aB = [-0.9, -0.5];
    o.lean = 0.7;
    o.jaw = 4;
  } else if (st === 'leap') {
    o.aF = [2.5, 2.1];
    o.aB = [2.2, 1.8];
    o.lF = [1.3, -0.3];
    o.lB = [1, -0.7];
    o.lean = 0.75;
    o.hipH = 30;
    o.jaw = 6;
  } else if (st === 'ride') {
    o.hipH = 58;
    o.lean = 0.42;
    o.aF = [0.3, 1.9];
    o.aB = [0.2, 1.85];
    o.lF = [1.2, -0.2];
    o.lB = [1.1, -0.25];
    o.head = -0.3;
    o.jaw = 3;
  } else if (st === 'chwind') {
    const j = Math.sin(e.t * 30) * 0.15;
    o.aF = [2.9 + j, 3.3 + j];
    o.jaw = 3;
    o.lean = 0;
  } else if (st === 'chain' || st === 'pull') {
    o.aF = [1.5, 1.57];
    o.lean = 0.25;
    o.lF = [0.5, 0.1];
    o.lB = [-0.5, -0.7];
    o.jaw = 4;
  } else if (st === 'recover') {
    const p = ease(clamp(e.t / T.rec, 0, 1));
    o.aF = mix(strikeA, pre, p);
    o.lean = lerp(0.34, 0.1, p);
    o.lF = [lerp(0.6, 0.16, p), lerp(0.15, -0.02, p)];
    o.lB = [lerp(-0.55, -0.22, p), lerp(-0.8, -0.34, p)];
  } else if (st === 'hurt') {
    o.lean = -0.32;
    o.head = -0.4;
    o.aF = [-0.6, 0.2];
    o.aB = [-1, -0.3];
    o.lF = [0.34, 0.12];
    o.lB = [-0.08, -0.3];
    o.jaw = 5;
  } else if (st === 'air') {
    o.rot = -Math.min(1.35, e.t * 5);
    o.aF = [1.9, 2.3];
    o.aB = [1.4, 1.9];
    o.lF = [0.95, 0.4];
    o.lB = [0.45, -0.1];
    o.hipH = 44;
    o.jaw = 5;
    o.head = 0.3;
  } else if (st === 'down') {
    o.rot = -1.5;
    o.hipH = 10;
    o.aF = [2.5, 2.7];
    o.aB = [0.5, 0.3];
    o.lF = [0.2, 0.1];
    o.lB = [-0.12, -0.05];
    o.lean = 0;
  } else if (st === 'getup') {
    const p = ease(Math.min(1, e.t / 0.45));
    o.rot = lerp(-1.5, 0, p);
    o.hipH = lerp(10, 70, p);
    o.aF = mix([2.5, 2.7], pre, p);
    o.lF = [lerp(0.9, 0.16, p), lerp(-0.6, -0.02, p)];
    o.lB = [lerp(0.6, -0.22, p), lerp(-0.9, -0.34, p)];
  } else if (st === 'rise') {
    o.aF = [2.7 + 0.1 * br, 3.05];
    o.aB = [2.45, 2.9];
    o.jaw = 4;
    o.head = -0.15;
  } else if (st === 'cwind') {
    const p = ease(Math.min(1, e.t / 0.5));
    o.lean = lerp(0.1, 0.5, p);
    o.aF = mix(pre, [1.25, 1.55], p);
    o.lF = [0.5, 0.1];
    o.lB = [-0.6, -0.9];
    o.jaw = 5;
    const j = Math.sin(e.t * 60) * 0.03;
    o.lean += j;
  } else if (st === 'charge') {
    o.aF = [1.3, 1.57];
    o.jaw = 5;
  } else if (st === 'summon') {
    const p = ease(Math.min(1, e.t / 0.4));
    o.aF = mix(pre, [3.0, 3.14], p);
    o.aB = mix([0.02, 0.95], [2.7, 3.0], p);
    o.head = -0.25 * p;
    o.jaw = 6 * p;
    o.lean = -0.05;
  }
  return o;
}
export function boneSeg(pts, w, col, foot) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  };
  const kn = w * 0.82;
  ctx.fillStyle = OL;
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], kn + 2, 0, TAU);
    ctx.fill();
  }
  path();
  ctx.strokeStyle = OL;
  ctx.lineWidth = w + 4;
  ctx.stroke();
  path();
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.fillStyle = col;
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], kn, 0, TAU);
    ctx.fill();
  }
}
export function drawSkel(e) {
  const T = e.T,
    s = T.scale,
    sx = e.x - G.cam,
    sy = e.y - e.z,
    o = skelPose(e);
  const lk = T.legK || 1,
    ak = T.armK || 1,
    tk = T.thick || 0,
    TH = 36 * lk,
    SH = 36 * lk,
    SP = 50,
    UA = 27 * ak,
    FA = 26 * ak;
  const fl = e.flash > 0,
    col = fl ? '#ffffff' : T.col,
    dk = fl ? '#ffd9d9' : T.dk,
    robe = fl ? '#ffffff' : '#77727c',
    robeDk = fl ? '#ffd9d9' : '#57525d';
  if (e.armor > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const ag = ctx.createRadialGradient(sx, sy - 120, 10, sx, sy - 120, 190);
    ag.addColorStop(0, `rgba(176,92,255,${0.35 + 0.15 * Math.sin(G.time * 12)})`);
    ag.addColorStop(1, 'rgba(176,92,255,0)');
    ctx.fillStyle = ag;
    ctx.fillRect(sx - 190, sy - 310, 380, 380);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(sx, sy);
  if (e.state === 'rise') {
    const p = ease(Math.min(1, e.t / (e.type === 'boss' ? 1.5 : 0.85)));
    ctx.beginPath();
    ctx.rect(-160, -400, 320, 402);
    ctx.clip();
    ctx.translate(Math.sin(e.t * 40) * 1.5, (1 - p) * 175 * s);
  }
  ctx.scale(e.face * s, s);
  if (e.mounted) {
    drawBike(e.anim);
    ctx.translate(-16, 0);
  }
  const lh = (l) => TH * Math.cos(l[0]) + SH * Math.cos(l[1]);
  const hipH = o.hipH != null ? o.hipH : Math.max(lh(o.lF), lh(o.lB));
  ctx.translate(0, -hipH);
  ctx.rotate(o.rot);
  const limb = (p, a, b, L1, L2) => {
    const m = [p[0] + L1 * Math.sin(a), p[1] + L1 * Math.cos(a)];
    return [p, m, [m[0] + L2 * Math.sin(b), m[1] + L2 * Math.cos(b)]];
  };
  const neck = [SP * Math.sin(o.lean), -SP * Math.cos(o.lean)],
    sh = [neck[0] * 0.9, neck[1] * 0.9];
  const leg = (l, c, off) => {
    const L = limb([off, 0], l[0], l[1], TH, SH),
      a = L[2];
    boneSeg(L, 6 + tk, c);
    boneSeg([a, [a[0] + 12, a[1] + 1]], 5 + tk, c);
  };
  const arm = (a, c, off) => {
    const L = limb([sh[0] + off, sh[1]], a[0], a[1], UA, FA);
    if (T.robe) boneSeg(L.slice(0, 2), 10, robeDk);
    boneSeg(T.robe ? L.slice(1) : L, 5 + tk, T.robe ? robeDk : c);
    const h = L[2];
    ctx.fillStyle = OL;
    ctx.beginPath();
    ctx.arc(h[0], h[1], 6.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(h[0], h[1], 4.6, 0, TAU);
    ctx.fill();
    return h;
  };
  // back limbs
  arm(o.aB, dk, -3);
  leg(o.lB, dk, -3);
  if (T.monkey) {
    const wv = Math.sin(e.anim * 6) * 5;
    boneSeg(
      [
        [-4, 0],
        [-18, 5],
        [-30, -3 + wv],
        [-37, -17 + wv],
        [-31, -28 + wv],
      ],
      3,
      dk,
    );
  }
  // cape
  if (T.crown) {
    const wv = Math.sin(e.anim * 4) * 6,
      mv = e.moving ? 14 : 0;
    ctx.beginPath();
    ctx.moveTo(sh[0] + 4, sh[1] - 4);
    ctx.lineTo(sh[0] - 12, sh[1] - 2);
    ctx.quadraticCurveTo(-34 - mv, -20, -38 - mv - wv, 34);
    ctx.lineTo(-24 - mv * 0.6, 30 + wv * 0.4);
    ctx.lineTo(-14 - mv * 0.4, 38);
    ctx.lineTo(-2, 6);
    ctx.closePath();
    ctx.fillStyle = fl ? '#fff' : '#43215f';
    ctx.fill();
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  // pelvis + spine
  boneSeg([[0, 0], neck], 5, col);
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.ellipse(0, 1, 12.5, 8.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, 1, 10, 6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.arc(1, 3, 2.6, 0, TAU);
  ctx.fill();
  // ribcage
  ctx.save();
  ctx.translate(neck[0] * 0.64, neck[1] * 0.64);
  ctx.rotate(o.lean);
  if (T.fat) {
    ctx.translate(5, 5);
    ctx.scale(1.75, 1.32);
  }
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.ellipse(4, 0, 15.5, 19.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a2532';
  ctx.beginPath();
  ctx.ellipse(4, 0, 12.5, 16.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = 3.3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const y = -12 + i * 7.6,
      rw = i === 0 ? 11 : i === 3 ? 10 : 14;
    ctx.beginPath();
    ctx.moveTo(-6, y - 1.5);
    ctx.quadraticCurveTo(4 + rw * 0.5, y - 3, 4 + rw, y + 3.5);
    ctx.stroke();
  }
  ctx.restore();
  leg(o.lF, col, 3);
  if (T.robe) {
    // grey cassock over the body, the hem swaying with the steps
    const sw = e.moving ? Math.sin(e.walkT) * 6 : Math.sin(e.anim * 2) * 2,
      hem = hipH - 14;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.4;
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(sh[0] - 13, sh[1] - 2);
    ctx.lineTo(sh[0] + 11, sh[1] - 1);
    ctx.quadraticCurveTo(16, 0, 24 + sw, hem);
    ctx.lineTo(10 + sw * 0.6, hem + 4);
    ctx.lineTo(-6 + sw * 0.3, hem);
    ctx.lineTo(-24 + sw * 0.2, hem + 3);
    ctx.quadraticCurveTo(-18, 0, sh[0] - 13, sh[1] - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = robeDk;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, 4);
    ctx.lineTo(4 + sw * 0.5, hem - 2);
    ctx.moveTo(-10, 6);
    ctx.lineTo(-14 + sw * 0.3, hem - 1);
    ctx.stroke();
    // rope belt
    ctx.strokeStyle = '#3b3640';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-15, -2);
    ctx.lineTo(15, -1);
    ctx.moveTo(6, -1);
    ctx.lineTo(8 + sw * 0.4, 22);
    ctx.stroke();
  }
  // skull
  ctx.save();
  const ha = o.lean + o.head;
  ctx.translate(neck[0] + 15 * Math.sin(ha), neck[1] - 15 * Math.cos(ha));
  ctx.rotate(ha);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  const j = o.jaw;
  ctx.fillStyle = dk;
  ctx.beginPath();
  ctx.moveTo(-3, 7 + j * 0.4);
  ctx.lineTo(12, 8.5 + j);
  ctx.lineTo(12.5, 13.5 + j);
  ctx.lineTo(2, 15 + j);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(0, -1, 13.5, 0.35, Math.PI * 1.72);
  ctx.lineTo(13.5, -5);
  ctx.lineTo(14.5, 8.5);
  ctx.lineTo(1, 9.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(4 + i * 3, 6.5);
    ctx.lineTo(4 + i * 3, 9.3);
    ctx.stroke();
  }
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.ellipse(3.2, -1.5, 4.3, 4.9, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(11, -1.5, 2.7, 4.2, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, 3);
  ctx.lineTo(9.6, 6);
  ctx.lineTo(6.6, 6);
  ctx.fill();
  ctx.fillStyle = T.eye;
  ctx.shadowColor = T.eye;
  ctx.shadowBlur = 9;
  ctx.beginPath();
  ctx.arc(4, -1.2, 1.9, 0, TAU);
  ctx.arc(11.3, -1.2, 1.4, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  if (T.hood) {
    ctx.fillStyle = fl ? '#fff' : '#3f6b5c';
    ctx.beginPath();
    ctx.arc(0, -1, 15.5, Math.PI * 0.62, Math.PI * 1.78);
    ctx.lineTo(4, -9);
    ctx.quadraticCurveTo(-6, -6, -5, 10);
    ctx.lineTo(-16, 24 + Math.sin(e.anim * 5) * 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (T.robe) {
    // grey hood: the face is lost in shadow, only the burning red eyes show
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.quadraticCurveTo(-24, -6, -12, -20);
    ctx.quadraticCurveTo(2, -30, 16, -14);
    ctx.quadraticCurveTo(22, 2, 16, 15);
    ctx.lineTo(4, 18);
    ctx.lineTo(-18, 30 + Math.sin(e.anim * 4) * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#120e16';
    ctx.beginPath();
    ctx.ellipse(8, 0, 8.5, 11.5, 0.1, 0, TAU);
    ctx.fill();
    const glow = 0.75 + 0.25 * Math.sin(G.time * 8 + e.seed);
    ctx.fillStyle = T.eye;
    ctx.shadowColor = T.eye;
    ctx.shadowBlur = 14 * glow;
    ctx.beginPath();
    ctx.arc(6, -1.5, 2.3, 0, TAU);
    ctx.arc(12.2, -1.5, 1.8, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  if (T.club) {
    ctx.fillStyle = fl ? '#fff' : '#9a6a3e';
    ctx.beginPath();
    ctx.arc(0, -2, 15, Math.PI * 0.95, Math.PI * 1.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-9, -13);
    ctx.quadraticCurveTo(-22, -18, -18, -30);
    ctx.quadraticCurveTo(-12, -20, -2, -17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (T.rocker) {
    ctx.fillStyle = fl ? '#fff' : '#ff3d6e';
    ctx.beginPath();
    ctx.moveTo(-12, -8);
    ctx.lineTo(-18, -21);
    ctx.lineTo(-9, -15);
    ctx.lineTo(-8, -28);
    ctx.lineTo(-2, -17);
    ctx.lineTo(2, -30);
    ctx.lineTo(6, -16);
    ctx.lineTo(12, -24);
    ctx.lineTo(10, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = OL;
    ctx.beginPath();
    ctx.moveTo(-3, -6);
    ctx.lineTo(15, -6);
    ctx.lineTo(14, 1.5);
    ctx.lineTo(8, 2);
    ctx.lineTo(7, -1);
    ctx.lineTo(6, 2.5);
    ctx.lineTo(-2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -3.5);
    ctx.lineTo(3, -3.5);
    ctx.stroke();
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.4;
  }
  if (T.crown) {
    ctx.fillStyle = fl ? '#fff' : '#e9c046';
    ctx.beginPath();
    ctx.moveTo(-11, -10);
    ctx.lineTo(-13, -25);
    ctx.lineTo(-6, -17);
    ctx.lineTo(-1, -28);
    ctx.lineTo(4, -17);
    ctx.lineTo(11, -25);
    ctx.lineTo(10, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PURPLE;
    ctx.beginPath();
    ctx.arc(-1, -15, 2.3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // front arm + weapon
  const L = limb([sh[0] + 3, sh[1]], o.aF[0], o.aF[1], UA, FA),
    h = L[2],
    wa = o.aF[1];
  if (T.club || T.sword) {
    ctx.save();
    ctx.translate(h[0], h[1]);
    ctx.rotate(-wa);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.4;
    if (T.club) {
      ctx.fillStyle = fl ? '#fff' : '#7c5335';
      ctx.beginPath();
      ctx.moveTo(-3, -8);
      ctx.lineTo(3, -8);
      ctx.lineTo(9, 40);
      ctx.quadraticCurveTo(0, 50, -9, 40);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col;
      for (const [a, b] of [
        [-9, 30],
        [9, 24],
        [-8, 40],
      ]) {
        ctx.beginPath();
        ctx.arc(a, b, 2.6, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      const gl = e.state === 'cwind' || e.state === 'charge' || e.state === 'summon';
      if (gl) {
        ctx.shadowColor = PURPLE;
        ctx.shadowBlur = 18;
      }
      ctx.fillStyle = gl ? '#e9d4ff' : '#cdd8e4';
      ctx.beginPath();
      ctx.moveTo(-4.5, 8);
      ctx.lineTo(4.5, 8);
      ctx.lineTo(3.5, 72);
      ctx.lineTo(0, 84);
      ctx.lineTo(-3.5, 72);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.fillStyle = '#e9c046';
      ctx.beginPath();
      ctx.rect(-11, 4, 22, 5);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(-2.5, -10, 5, 14);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  if (T.rocker && !e.mounted && !['chain', 'pull', 'chwind', 'air', 'down'].includes(e.state)) {
    ctx.save();
    ctx.translate(h[0], h[1]);
    chainLine(0, 0, Math.sin(e.anim * 4) * 5, 26);
    ctx.restore();
  }
  if (T.robe) {
    // the staff, topped with a bubble of acid that swells while a spell is cast
    const casting = e.state === 'windup' && T.style === 'cast';
    ctx.save();
    ctx.translate(h[0], h[1]);
    ctx.rotate(-(wa - 1.6) * 0.9);
    ctx.lineCap = 'round';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-2, 52);
    ctx.lineTo(2, -78);
    ctx.stroke();
    ctx.strokeStyle = fl ? '#fff' : '#6b4a32';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    const r = casting ? 6 + 6 * Math.min(1, e.t / T.wind) : 5.5;
    ctx.fillStyle = '#9dff4a';
    ctx.shadowColor = '#9dff4a';
    ctx.shadowBlur = casting ? 22 : 10;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(2, -84, r, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  }
  if (T.style === 'throw' && e.state === 'windup') {
    ctx.save();
    ctx.translate(h[0], h[1]);
    ctx.rotate(-wa + 1.2);
    boneShape(20, 4.5, '#f3eeda');
    ctx.restore();
  }
  if (T.robe) boneSeg(L.slice(0, 2), 10, robe);
  boneSeg(T.robe ? L.slice(1) : L, 5 + tk, T.robe ? robe : col);
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.arc(h[0], h[1], 6.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(h[0], h[1], 4.6, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (e.state === 'chain' || e.state === 'pull') {
    const hx = sx + e.face * 46 * s,
      hy = sy - 98 * s;
    if (e.state === 'pull') chainLine(hx, hy, P.x - G.cam, P.y - P.z - 96);
    else chainLine(hx, hy, sx + e.face * Math.max(46, Math.min(CHAIN, e.t * 1150)), sy - 96);
  }
  if (e.state === 'chwind') {
    ctx.save();
    ctx.lineWidth = 6;
    ctx.strokeStyle = OL;
    ctx.beginPath();
    ctx.ellipse(sx, sy - 188 * s, 40, 10, 0, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#b9c4cc';
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = -e.t * 260;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ff4a5e';
    ctx.font = `900 24px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(e.t * 30);
    ctx.fillText('!', sx, sy - 205 * s);
    ctx.globalAlpha = 1;
  }
  if (e.state === 'cwind') {
    ctx.fillStyle = '#ff4a5e';
    ctx.font = `900 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(e.t * 30);
    ctx.fillText('!', sx, sy - 185 * s);
    ctx.globalAlpha = 1;
  }
}
export function chainLine(x0, y0, x1, y1) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = '#b9c4cc';
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}
export function drawBike(t) {
  // local space: faces +x, ground at y=0
  const wr = 21;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const fr = (pts, w, c) => {
    for (const [lw, cc] of [
      [w + 4, OL],
      [w, c],
    ]) {
      ctx.strokeStyle = cc;
      ctx.lineWidth = lw;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    }
  };
  for (const wx of [-40, 44]) {
    ctx.fillStyle = OL;
    ctx.beginPath();
    ctx.arc(wx, -wr, wr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#8894a0';
    ctx.beginPath();
    ctx.arc(wx, -wr, wr - 6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a2532';
    ctx.beginPath();
    ctx.arc(wx, -wr, wr - 9, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8894a0';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = t * 18 + (i * TAU) / 6,
        c = Math.cos(a) * (wr - 8),
        sn = Math.sin(a) * (wr - 8);
      ctx.beginPath();
      ctx.moveTo(wx - c, -wr - sn);
      ctx.lineTo(wx + c, -wr + sn);
      ctx.stroke();
    }
  }
  fr(
    [
      [-2, -24],
      [-56, -31],
    ],
    5,
    '#b9c4cc',
  );
  fr(
    [
      [-40, -21],
      [-14, -46],
      [20, -50],
      [34, -70],
    ],
    6,
    '#5b3a78',
  );
  fr(
    [
      [-40, -21],
      [2, -24],
      [20, -50],
    ],
    5,
    '#5b3a78',
  );
  fr(
    [
      [34, -70],
      [44, -21],
    ],
    5,
    '#b9c4cc',
  );
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillStyle = '#8894a0';
  rr(-12, -41, 26, 20, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7a3fb0';
  ctx.beginPath();
  ctx.ellipse(8, -55, 17, 8, -0.1, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#231d2c';
  rr(-32, -55, 27, 8, 4);
  ctx.fill();
  ctx.stroke();
  fr(
    [
      [34, -70],
      [26, -82],
    ],
    4,
    '#b9c4cc',
  );
  ctx.fillStyle = '#ffe9a8';
  ctx.shadowColor = '#ffe9a8';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(41, -62, 5.5, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
}
export function boneShape(len, w, col) {
  const h = len / 2,
    k = w * 0.62;
  for (let pass = 0; pass < 2; pass++) {
    const ex = pass ? 0 : 2;
    ctx.fillStyle = ctx.strokeStyle = pass ? col : OL;
    ctx.lineCap = 'butt';
    ctx.lineWidth = w + ex * 2;
    ctx.beginPath();
    ctx.moveTo(-h, 0);
    ctx.lineTo(h, 0);
    ctx.stroke();
    for (const sx of [-h, h])
      for (const sy of [-k * 0.8, k * 0.8]) {
        ctx.beginPath();
        ctx.arc(sx, sy, k + ex, 0, TAU);
        ctx.fill();
      }
  }
}
