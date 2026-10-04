// Vector skeleton rig: the pose of a skeleton enemy (from data, see anim.js) and the drawing
// of its bones; each foe adds its own costume and weapon (see the look in src/foes).
import { OL, TAU } from './config.js';
import { ease } from './util.js';
import { G } from './state.js';
import { ctx } from './gfx.js';
import { POSES, STYLE, WALKS, play, rest, walkCycle } from './anim.js';
import { FOES } from './foes/registry.js';

/**
 * The pose of a skeleton enemy this frame, from data: the rest pose, the foe's own base pose,
 * the walk cycle, the foe's guard, then the clip of its state (shared clips from anim.js
 * first, the foe's own on top). See anim.js for the format.
 */
export function skelPose(e) {
  const F = FOES[e.type]?.pose ?? {},
    st = e.state,
    T = e.T,
    br = Math.sin(e.anim * 3 + e.seed),
    o = rest(br),
    k = { T, br, ...(STYLE[T.style] ?? STYLE.other) };
  if (F.base) play(F.base, o, e, k);
  k.pre = o.aF.slice();
  if (e.moving && WALKS[st]) {
    walkCycle(o, e, ...WALKS[st]);
    F.walk?.(o, e, k);
  }
  if (F.guard?.[st]) play(F.guard[st], o, e, k);
  o.jaw = Math.max(0, Math.sin(e.anim * 7 + e.seed) - 0.6) * 5;
  if (POSES[st]) play(POSES[st], o, e, k);
  if (F.states?.[st]) play(F.states[st], o, e, k);
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
/** The purple glow round an enemy that shrugs off combos for a while (the baron's armor). */
export function drawAura(e) {
  if (!(e.armor > 0)) return;
  const sx = e.x - G.cam,
    sy = e.y - e.z;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ag = ctx.createRadialGradient(sx, sy - 120, 10, sx, sy - 120, 190);
  ag.addColorStop(0, `rgba(176,92,255,${0.35 + 0.15 * Math.sin(G.time * 12)})`);
  ag.addColorStop(1, 'rgba(176,92,255,0)');
  ctx.fillStyle = ag;
  ctx.fillRect(sx - 190, sy - 310, 380, 380);
  ctx.restore();
}
/**
 * Draws a skeleton enemy: the shared rig (bones, pelvis, ribcage, skull) and, at fixed
 * layers, the foe's own look from its definition (see foes/registry.js):
 *   look.mount   what it rides (drawn under it)       look.back   behind the body
 *   look.torso   over the ribs                         look.legs   over the front leg
 *   look.head    on the skull                          look.weapon in the front hand
 *   look.world   effects in screen space               look.sleeves(fl) robe sleeves
 *   look.rise    seconds it takes to climb out of the ground
 * Every hook gets one object with what it may need: e, T, o (the pose), fl (hit flash),
 * col, dk, s, sx, sy, hipH, neck, sh, limb, TH, SH and, for the weapon, L, h (hand), wa.
 * With `aura` false the purple armor glow is left out (it is then drawn apart).
 */
export function drawSkel(e, aura = true) {
  const F = FOES[e.type] ?? {},
    T = e.T,
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
    sleeves = F.look?.sleeves?.(fl);
  if (aura) drawAura(e);
  ctx.save();
  ctx.translate(sx, sy);
  if (e.state === 'rise') {
    const p = ease(Math.min(1, e.t / (F.look?.rise ?? 0.85)));
    ctx.beginPath();
    ctx.rect(-160, -400, 320, 402);
    ctx.clip();
    ctx.translate(Math.sin(e.t * 40) * 1.5, (1 - p) * 175 * s);
  }
  ctx.scale(e.face * s, s);
  F.look?.mount?.(e);
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
    if (sleeves) boneSeg(L.slice(0, 2), 10, sleeves[0]);
    boneSeg(sleeves ? L.slice(1) : L, 5 + tk, sleeves ? sleeves[0] : c);
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
  const c = { e, T, o, fl, col, dk, s, sx, sy, hipH, neck, sh, limb, TH, SH };
  // back limbs
  arm(o.aB, dk, -3);
  leg(o.lB, dk, -3);
  F.look?.back?.(c);
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
  F.look?.torso?.(c);
  leg(o.lF, col, 3);
  F.look?.legs?.(c);
  // skull (a zombie may have lost it: then a stump)
  if (e.headless) {
    ctx.fillStyle = OL;
    ctx.beginPath();
    ctx.ellipse(neck[0], neck[1] - 2, 7, 4, o.lean, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5f7a3a';
    ctx.beginPath();
    ctx.ellipse(neck[0], neck[1] - 3, 5, 2.5, o.lean, 0, TAU);
    ctx.fill();
  } else {
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
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.4;
    F.look?.head?.(c);
    ctx.restore();
  }
  // front arm + weapon
  const L = limb([sh[0] + 3, sh[1]], o.aF[0], o.aF[1], UA, FA),
    h = L[2];
  Object.assign(c, { L, h, wa: o.aF[1] });
  F.look?.weapon?.(c);
  if (sleeves) boneSeg(L.slice(0, 2), 10, sleeves[1]);
  boneSeg(sleeves ? L.slice(1) : L, 5 + tk, sleeves ? sleeves[1] : col);
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.arc(h[0], h[1], 6.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(h[0], h[1], 4.6, 0, TAU);
  ctx.fill();
  ctx.restore();
  F.look?.world?.(c);
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
