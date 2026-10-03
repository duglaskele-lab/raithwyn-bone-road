// Draws the world, the HUD and the title screen.
import {
  ACID,
  DECOR,
  H,
  MAXR,
  OL,
  PURPLE,
  RL,
  RW,
  SLAM_R,
  SWIND,
  SWIND_LOCK,
  TAU,
  W,
  WAVES,
} from './config.js';
import { clamp, ease } from './util.js';
import { FR } from './atlas-frames.js';
import { G, P } from './state.js';
import { atlas, ctx, portraits, ready, rr, sprite, txt } from './gfx.js';
import { foeName, t } from './i18n.js';
import { touch } from './input.js';
import { RANKS, STYLE_STEP, dmgMult, scoreMult, styleRank } from './style.js';
import { drawBG, drawFog, drawVignette } from './background.js';
import { hadoLevel } from './combat.js';
import { boneShape, drawBike, drawSkel } from './skeleton.js';
import {
  drawDragon,
  drawDragonBeam,
  drawDragonGround,
  drawDragonPart,
  drawShocks,
} from './dragon.js';

export function shadow(x, y, z, r) {
  const k = clamp(1 - z / 260, 0.45, 1);
  ctx.fillStyle = 'rgba(14,26,30,.34)';
  ctx.beginPath();
  ctx.ellipse(x - G.cam, y + 1, r * k, r * 0.26 * k, 0, 0, TAU);
  ctx.fill();
}
export function bar(x, y, w, h, v, lag, col, skew = 6) {
  const pth = (ww) => {
    ctx.beginPath();
    ctx.moveTo(x + skew, y);
    ctx.lineTo(x + skew + ww, y);
    ctx.lineTo(x + ww, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  };
  pth(w);
  ctx.fillStyle = 'rgba(16,14,24,.85)';
  ctx.fill();
  if (lag > v) {
    pth(w * clamp(lag, 0, 1));
    ctx.fillStyle = '#ff4a5e';
    ctx.fill();
  }
  if (v > 0) {
    pth(w * clamp(v, 0, 1));
    ctx.fillStyle = col;
    ctx.fill();
  }
  pth(w);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ece5cb';
  ctx.stroke();
}
export function drawItem(it) {
  const x = it.x - G.cam,
    y = it.y - it.z - 14 - Math.sin(it.t * 5) * 3;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = OL;
  if (it.kind === 'hp') {
    ctx.fillStyle = '#ff4a5e';
    ctx.beginPath();
    ctx.moveTo(0, 11);
    ctx.bezierCurveTo(-18, -3, -10, -15, 0, -6);
    ctx.bezierCurveTo(10, -15, 18, -3, 0, 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.arc(-5, -5, 2.2, 0, TAU);
    ctx.fill();
  } else {
    ctx.shadowColor = PURPLE;
    ctx.shadowBlur = 14;
    ctx.fillStyle = PURPLE;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(9, -2);
    ctx.lineTo(0, 12);
    ctx.lineTo(-9, -2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.fillStyle = '#ecd9ff';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(9, -2);
    ctx.lineTo(0, -2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
export function drawUrn(u) {
  const x = u.x - G.cam,
    y = u.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = OL;
  ctx.fillStyle = '#62808a';
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-8, -6);
  ctx.bezierCurveTo(-24, -18, -20, -38, -8, -42);
  ctx.lineTo(-11, -50);
  ctx.lineTo(11, -50);
  ctx.lineTo(8, -42);
  ctx.bezierCurveTo(20, -38, 24, -18, 8, -6);
  ctx.lineTo(10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  ctx.beginPath();
  ctx.ellipse(-7, -26, 3.5, 10, 0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = u.drop === 'hp' ? '#ff8f9d' : '#d2a8ff';
  ctx.globalAlpha = 0.6 + 0.3 * Math.sin(G.time * 3 + u.x);
  ctx.beginPath();
  ctx.arc(2, -25, 3, 0, TAU);
  ctx.fill();
  ctx.restore();
}
// Breakable scenery: a big grave (cracks with every hit), a bench or a stone cross.
export function drawDecor(u) {
  const fl = G.time < (u.flashT || 0),
    D = DECOR[u.decor];
  ctx.save();
  ctx.translate(u.x - G.cam, u.y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = OL;
  const fill = (c) => {
    ctx.fillStyle = fl ? '#fff' : c;
    ctx.fill();
    ctx.stroke();
  };
  if (u.decor === 'tomb') {
    // a big gravestone on a plinth, with a skull carved in; cracks grow with every hit
    ctx.beginPath();
    ctx.rect(-40, -16, 80, 16);
    fill('#566266');
    ctx.beginPath();
    ctx.moveTo(-30, -16);
    ctx.lineTo(-30, -78);
    ctx.quadraticCurveTo(-30, -112, 0, -114);
    ctx.quadraticCurveTo(30, -112, 30, -78);
    ctx.lineTo(30, -16);
    ctx.closePath();
    fill(D.col);
    ctx.strokeStyle = 'rgba(23,21,29,.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -78, 11, 0, TAU);
    ctx.moveTo(-5, -80);
    ctx.arc(-5, -80, 3, 0, TAU);
    ctx.moveTo(8, -80);
    ctx.arc(5, -80, 3, 0, TAU);
    ctx.moveTo(-6, -62);
    ctx.lineTo(6, -62);
    ctx.moveTo(-18, -44);
    ctx.lineTo(18, -44);
    ctx.moveTo(-14, -36);
    ctx.lineTo(14, -36);
    ctx.stroke();
    ctx.fillStyle = 'rgba(96,140,92,.55)';
    ctx.beginPath();
    ctx.ellipse(-20, -14, 16, 5, 0, 0, TAU);
    ctx.ellipse(24, -2, 12, 4, 0, 0, TAU);
    ctx.fill();
    const cracks = [
      [12, -112, 4, -96, 14, -84],
      [-24, -70, -12, -60, -20, -46],
      [24, -60, 14, -48, 22, -30],
    ];
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    for (const c of cracks.slice(0, D.hp - u.hp)) {
      ctx.beginPath();
      ctx.moveTo(c[0], c[1]);
      ctx.lineTo(c[2], c[3]);
      ctx.lineTo(c[4], c[5]);
      ctx.stroke();
    }
  } else if (u.decor === 'bench') {
    for (const lx of [-26, 22]) {
      ctx.beginPath();
      ctx.rect(lx, -22, 5, 22);
      fill('#2f2b33');
    }
    ctx.beginPath();
    ctx.rect(-34, -26, 68, 7);
    fill(D.col);
    for (const sy of [-52, -42]) {
      ctx.beginPath();
      ctx.rect(-32, sy, 64, 6);
      fill('#8a6544');
    }
    for (const lx of [-28, 24]) {
      ctx.beginPath();
      ctx.rect(lx, -54, 4, 30);
      fill('#2f2b33');
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-5, -38);
    ctx.lineTo(-17, -38);
    ctx.lineTo(-17, -48);
    ctx.lineTo(-5, -48);
    ctx.lineTo(-5, -62);
    ctx.lineTo(5, -62);
    ctx.lineTo(5, -48);
    ctx.lineTo(17, -48);
    ctx.lineTo(17, -38);
    ctx.lineTo(5, -38);
    ctx.lineTo(5, 0);
    ctx.closePath();
    fill(D.col);
  }
  ctx.restore();
}
// A puddle of the necromancer's acid, bubbling until it dries up.
export function drawPool(a) {
  const k = Math.min(1, a.t / 0.2) * Math.min(1, (a.life - a.t) / 0.6),
    x = a.x - G.cam;
  ctx.save();
  ctx.globalAlpha = 0.85 * k;
  ctx.fillStyle = '#3f9f1e';
  ctx.beginPath();
  ctx.ellipse(x, a.y, ACID.rx * (0.6 + 0.4 * k), ACID.ry * (0.6 + 0.4 * k), 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#86e83c';
  ctx.beginPath();
  ctx.ellipse(x - 6, a.y - 2, ACID.rx * 0.62 * k, ACID.ry * 0.5 * k, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#d9ffb0';
  for (let i = 0; i < 4; i++) {
    const u = (G.time * 1.6 + i * 0.25 + a.seed) % 1;
    ctx.globalAlpha = k * (1 - u);
    ctx.beginPath();
    ctx.arc(x + Math.sin(i * 2.3 + a.seed) * ACID.rx * 0.6, a.y - u * 10, 2 + 2 * u, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
export function drawDebris(d) {
  const a = Math.min(1, d.life * 1.5);
  ctx.save();
  ctx.globalAlpha = a;
  if (d.k === 'dpart') {
    drawDragonPart(d);
    ctx.restore();
    return;
  }
  if (d.k === 'bike') {
    ctx.translate(d.x - G.cam, d.gy);
    ctx.scale(d.dir, 1 - 0.58 * ease(d.tilt));
    drawBike(d.x * 0.05, d.hog);
    ctx.restore();
    return;
  }
  ctx.translate(d.x - G.cam, d.gy - d.z - 3);
  ctx.rotate(d.rot);
  if (d.k === 'bone') boneShape(d.len, 4.2, d.col);
  else if (d.k === 'shard') {
    ctx.fillStyle = d.col;
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-d.len, -2);
    ctx.lineTo(d.len * 0.6, -d.len * 0.6);
    ctx.lineTo(d.len * 0.4, d.len * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.translate(0, -d.len + 3);
    ctx.fillStyle = d.col;
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, d.len, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = OL;
    ctx.beginPath();
    ctx.ellipse(3, -1, d.len * 0.3, d.len * 0.36, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(d.len * 0.75, -1, d.len * 0.18, d.len * 0.3, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
export function drawProj(q) {
  const x = q.x - G.cam,
    y = q.y - q.z;
  if (q.k === 'hado') {
    const f = q.vx < 0,
      sc = [1, 1.5, 2.2][q.lv - 1] * (1.05 + 0.1 * Math.sin(G.time * 40));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    const R = 70 * sc,
      g = ctx.createRadialGradient(x, y, 4, x, y, R);
    g.addColorStop(0, 'rgba(176,92,255,.7)');
    g.addColorStop(1, 'rgba(176,92,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - R, y - R, R * 2, R * 2);
    ctx.restore();
    sprite('fx', 0, x, y, f, sc);
    return;
  }
  if (q.k === 'zhead') {
    drawDebris({ k: 'skull', x: q.x, gy: q.y, z: q.z, rot: q.rot, len: 12, col: q.col, life: 1 });
    return;
  }
  if (q.k === 'plasma') {
    // a crackling ball of violet plasma
    const r = 13 + Math.sin(G.time * 45 + q.x) * 2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 2, x, y, r * 3.2);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(0.3, 'rgba(210,150,255,.75)');
    g.addColorStop(1, 'rgba(140,50,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
    ctx.strokeStyle = 'rgba(240,220,255,.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = G.time * 20 + i * 2.1 + q.x * 0.1;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3);
      ctx.lineTo(x + Math.cos(a + 0.5) * r * 2, y + Math.sin(a + 0.5) * r * 2);
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#f6eaff';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, TAU);
    ctx.fill();
    return;
  }
  if (q.k === 'acid') {
    const r = 11 + Math.sin(G.time * 30) * 1.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 2, x, y, 34);
    g.addColorStop(0, 'rgba(157,255,74,.55)');
    g.addColorStop(1, 'rgba(157,255,74,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 34, y - 34, 68, 68);
    ctx.restore();
    ctx.fillStyle = '#5fd12a';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d9ffb0';
    ctx.beginPath();
    ctx.arc(x - 3.5, y - 4, 3.5, 0, TAU);
    ctx.fill();
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(q.rot);
  if (q.k === 'bone') {
    ctx.shadowColor = PURPLE;
    ctx.shadowBlur = 12;
    boneShape(22, 5, '#f6f0ff');
  } else boneShape(20, 4.6, '#ece5cb');
  ctx.restore();
}
export function drawPart(p) {
  const u = p.t / p.life,
    x = p.x - G.cam,
    y = p.y;
  switch (p.k) {
    case 'star': {
      const s = p.s * (0.5 + u * 0.7);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = 1 - u * u;
      ctx.fillStyle = p.col;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU,
          r = i % 2 ? s * 0.32 : s * (i % 4 === 0 ? 1 : 0.7);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = OL;
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'dot':
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = p.col;
      ctx.fillRect(x - p.s / 2, y - p.s / 2, p.s, p.s);
      ctx.globalAlpha = 1;
      break;
    case 'dust':
      ctx.globalAlpha = (1 - u) * 0.5;
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(x, y, p.s * (0.6 + u), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    case 'glow':
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(x, y, p.s * (1 - u * 0.5), 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    case 'blast': {
      // a plasma explosion: a white-hot core that swells into a violet fireball and fades
      const r = p.s * (0.45 + 0.75 * ease(Math.min(1, u * 1.6))),
        a = 1 - u,
        cy = y - r * 0.55;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, cy, 2, x, cy, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.35, `rgba(235,190,255,${0.9 * a})`);
      g.addColorStop(0.7, `rgba(170,80,255,${0.55 * a})`);
      g.addColorStop(1, 'rgba(120,40,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, cy, r, r * 0.85, 0, 0, TAU);
      ctx.fill();
      // scorched light on the ground
      const gg = ctx.createRadialGradient(x, y, 2, x, y, r * 1.2);
      gg.addColorStop(0, `rgba(230,200,255,${0.6 * a})`);
      gg.addColorStop(1, 'rgba(160,80,255,0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.2, r * 0.4, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'fxring':
      sprite('fx', 1, x, y, false, 1 + u * 2.2, 1 - u);
      break;
    case 'ring':
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - u;
      ctx.strokeStyle = '#d2a8ff';
      ctx.lineWidth = 26 * (1 - u) + 2;
      ctx.beginPath();
      ctx.arc(x, y, p.s * ease(u), 0, TAU);
      ctx.stroke();
      ctx.restore();
      break;
    case 'gring':
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - u) * 0.8;
      ctx.strokeStyle = p.col || PURPLE;
      ctx.lineWidth = 14 * (1 - u) + 2;
      ctx.beginPath();
      ctx.ellipse(x, y, p.s * ease(u), p.s * ease(u) * 0.26, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      break;
    case 'bolt':
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - u;
      ctx.lineJoin = 'round';
      for (const [w, c] of [
        [9, 'rgba(176,92,255,.5)'],
        [3, '#f3e6ff'],
      ]) {
        ctx.lineWidth = w;
        ctx.strokeStyle = c;
        ctx.beginPath();
        p.pts.forEach((q, i) =>
          i ? ctx.lineTo(q[0] - G.cam, q[1]) : ctx.moveTo(q[0] - G.cam, q[1]),
        );
        ctx.stroke();
      }
      ctx.restore();
      break;
  }
}
export function drawPlayer() {
  const p = P;
  let a = 1;
  if (p.inv > 0 && p.state !== 'hado' && Math.floor(G.time * 18) % 2) a = 0.4;
  if (p.state === 'super') {
    // Gathering the super attack: a growing glow at her feet and a charge ring overhead.
    const u = p.sw ? 1 : p.sup,
      R = 90 + 120 * u,
      x = p.x - G.cam;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, p.y, 4, x, p.y, R);
    g.addColorStop(0, `rgba(176,92,255,${0.35 + 0.35 * u})`);
    g.addColorStop(1, 'rgba(176,92,255,0)');
    ctx.fillStyle = g;
    ctx.scale(1, 0.3);
    ctx.fillRect(x - R, p.y / 0.3 - R, R * 2, R * 2);
    ctx.restore();
    if (!p.sw) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(16,14,24,.8)';
      ctx.beginPath();
      ctx.arc(x, p.y - 205, 13, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = u >= 1 ? '#fff' : '#d9b8ff';
      ctx.beginPath();
      ctx.arc(x, p.y - 205, 13, -Math.PI / 2, -Math.PI / 2 + TAU * u);
      ctx.stroke();
      ctx.restore();
    }
  }
  if (p.state === 'hado') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x - G.cam, p.y, 4, p.x - G.cam, p.y, 120);
    g.addColorStop(0, 'rgba(176,92,255,.5)');
    g.addColorStop(1, 'rgba(176,92,255,0)');
    ctx.fillStyle = g;
    ctx.scale(1, 0.3);
    ctx.fillRect(p.x - G.cam - 120, p.y / 0.3 - 120, 240, 240);
    ctx.restore();
  }
  sprite(p.an[0], p.an[1], p.x - G.cam, p.y - p.z + 2, p.face < 0, 1, a);
}
export function drawWorld() {
  drawBG();
  drawFog();
  drawVignette();
  // slam warning
  for (const e of G.enemies)
    if (e.state === 'swind') {
      const u = e.t / SWIND,
        x = e.x - G.cam,
        locked = e.t >= SWIND_LOCK;
      ctx.fillStyle = `rgba(255,${locked ? 40 : 90},${locked ? 40 : 70},${0.08 + 0.14 * u + (locked ? 0.08 : 0)})`;
      ctx.beginPath();
      ctx.ellipse(x, e.y, SLAM_R, SLAM_R * 0.36, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = locked ? '#ff3a3a' : 'rgba(255,140,110,.9)';
      ctx.lineWidth = locked ? 4 : 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, e.y, SLAM_R * u, SLAM_R * 0.36 * u, 0, 0, TAU);
      ctx.stroke();
    }
  for (const a of G.pools) drawPool(a);
  for (const e of G.enemies) if (e.T.dragon) drawDragonGround(e);
  drawShocks();
  // shadows
  for (const u of G.props) shadow(u.x, u.y, 0, u.decor ? DECOR[u.decor].w * 1.2 : 22);
  for (const e of G.enemies)
    if (e.state !== 'rise' || e.t > 0.4)
      shadow(
        e.x,
        e.y,
        e.z,
        e.T.shadow || (e.mounted ? (e.bike === 'hog' ? 104 : 70) : 34) * e.T.scale,
      );
  for (const it of G.items) shadow(it.x, it.y, it.z, 12);
  for (const q of G.projs)
    shadow(q.x, q.y, q.z, q.k === 'hado' ? 26 * q.lv : q.k === 'plasma' ? 20 : 10);
  if (G.state !== 'title') shadow(P.x, P.y, P.z, 40);
  const list = [];
  for (const d of G.debris) list.push([d.gy - 1, drawDebris, d]);
  for (const u of G.props) list.push([u.y, u.decor ? drawDecor : drawUrn, u]);
  for (const e of G.enemies) list.push([e.y, e.T.dragon ? drawDragon : drawSkel, e]);
  for (const it of G.items) list.push([it.y, drawItem, it]);
  for (const q of G.projs) list.push([q.y + 1, drawProj, q]);
  if (G.state !== 'title') list.push([P.y, drawPlayer, null]);
  list.sort((a, b) => a[0] - b[0]);
  for (const l of list) l[1](l[2]);
  for (const e of G.enemies) if (e.T.dragon) drawDragonBeam(e);
  for (const p of G.parts) drawPart(p);
  for (const f of G.floats) {
    ctx.globalAlpha = 1 - Math.max(0, f.t - 0.6) / 0.5;
    txt(f.txt, f.x - G.cam, f.y - f.t * 34, 16, f.col, 'center', 4);
    ctx.globalAlpha = 1;
  }
  for (const e of G.enemies)
    if (e.state === 'ride' && e.t < RW && Math.floor(G.time * 8) % 2 === 0) {
      const x = e.rdir > 0 ? 30 : W - 30;
      ctx.fillStyle = '#ff4a5e';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x, e.y - 96);
      ctx.lineTo(x + 22, e.y - 56);
      ctx.lineTo(x - 22, e.y - 56);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      txt('!', x, e.y - 62, 24, '#fff', 'center');
    }
}
export function drawHUD() {
  const p = P;
  // portrait
  ctx.fillStyle = '#2a1b3d';
  rr(18, 14, 62, 62, 8);
  ctx.fill();
  ctx.save();
  rr(18, 14, 62, 62, 8);
  ctx.clip();
  if (ready(portraits.raithwyn)) ctx.drawImage(portraits.raithwyn, 18, 14, 62, 62);
  else {
    const f = FR.idle[0];
    ctx.drawImage(atlas, f[0] + 14, f[1], 58, 58, 20, 18, 60, 60);
  }
  ctx.restore();
  rr(18, 14, 62, 62, 8);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ece5cb';
  ctx.stroke();
  txt('Raithwyn', 92, 32, 17, '#ece5cb', 'left', 4);
  bar(90, 40, 250, 15, p.hp / 100, p.hpLag / 100, '#f0cf4f');
  const lv = hadoLevel(p.rage),
    pul = 0.75 + 0.25 * Math.sin(G.time * 10);
  if (lv === 3) {
    ctx.save();
    ctx.shadowColor = PURPLE;
    ctx.shadowBlur = 14 * pul;
    bar(88, 61, 210, 10, 1, 0, '#d9b8ff', 4);
    ctx.restore();
  }
  bar(88, 61, 210, 10, p.rage / MAXR, 0, ['#6d4a96', '#9a5ae0', '#c088ff', '#f0dcff'][lv], 4);
  ctx.fillStyle = '#ece5cb';
  for (const r of [RL[0], RL[1]]) ctx.fillRect(88 + (210 * r) / MAXR + 2, 61, 2, 10);
  txt(
    t(['rage', 'hado1', 'hado2', 'hado3'][lv]),
    308,
    71,
    12,
    ['#9bb0ac', '#d2a8ff', '#e0c2ff', '#fff'][lv],
    'left',
    3,
  );
  for (let i = 0; i < p.lives; i++) {
    ctx.fillStyle = '#ff4a5e';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    const x = 30 + i * 20,
      y = 88;
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.bezierCurveTo(x - 10, y - 2, x - 5, y - 8, x, y - 3);
    ctx.bezierCurveTo(x + 5, y - 8, x + 10, y - 2, x, y + 6);
    ctx.fill();
    ctx.stroke();
  }
  txt(String(p.score).padStart(6, '0'), W - 20, 34, 20, '#ece5cb', 'right', 4);
  drawStyle();
  if (touch) {
    // pause button for touch screens
    const [bx, by, bw, bh] = PAUSE_BTN;
    ctx.fillStyle = 'rgba(16,14,24,.7)';
    rr(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.strokeStyle = '#ece5cb';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ece5cb';
    ctx.fillRect(bx + 11, by + 9, 5, bh - 18);
    ctx.fillRect(bx + bw - 16, by + 9, 5, bh - 18);
  }
  // foe bar
  if (G.lastFoe && G.lastFoeT > 0 && !G.lastFoe.T.bigBoss) {
    ctx.globalAlpha = Math.min(1, G.lastFoeT * 2);
    txt(foeName(G.lastFoe.type), W - 20, 60, 14, '#ece5cb', 'right', 3);
    bar(W - 190, 66, 164, 9, Math.max(0, G.lastFoe.hp) / G.lastFoe.T.hp, 0, '#ff8a4a', 4);
    ctx.globalAlpha = 1;
  }
  const boss = G.enemies.find((e) => e.T.bigBoss);
  if (boss) {
    const bx = 440,
      bw = 360;
    txt(foeName(boss.type), bx + 8, 31, 14, '#e3c8ff', 'left', 4);
    bar(bx, 37, bw, 12, Math.max(0, boss.hp) / boss.T.hp, 0, '#b05cff');
    if (boss.T.dragon) {
      // phase marker on the dragon's bar
      ctx.fillStyle = '#ece5cb';
      ctx.fillRect(bx + bw * 0.5 + 3, 37, 2, 12);
    } else if (boss.armor > 0)
      txt(t('immune', boss.armor.toFixed(1)), bx + bw + 4, 31, 12, '#fff', 'right', 3);
    else
      for (let i = 0; i < 2; i++) {
        const x = bx + bw - 8 - i * 18,
          y = 26;
        ctx.beginPath();
        ctx.moveTo(x, y - 7);
        ctx.lineTo(x + 6, y);
        ctx.lineTo(x, y + 7);
        ctx.lineTo(x - 6, y);
        ctx.closePath();
        ctx.fillStyle = i < boss.breaks ? '#ffe9a8' : 'rgba(16,14,24,.85)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ece5cb';
        ctx.stroke();
      }
  }
  if (
    !G.wave &&
    G.waveI < WAVES.length &&
    G.waveI > 0 &&
    G.goT > 0 &&
    Math.floor(G.time * 3) % 2 === 0
  ) {
    txt(t('go'), W - 74, 250, 26, '#ece5cb', 'right', 5);
    ctx.fillStyle = '#ece5cb';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(W - 62, 226);
    ctx.lineTo(W - 28, 241);
    ctx.lineTo(W - 62, 256);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }
  if (G.banner) {
    const u = G.banner.t,
      a = u < 0.3 ? u / 0.3 : u > 2.5 ? (3 - u) / 0.5 : 1,
      off = (1 - ease(Math.min(1, u / 0.4))) * -60;
    ctx.globalAlpha = clamp(a, 0, 1);
    const s = (k) => (k[0] === '@' ? foeName(k.slice(1)) : t(k));
    txt(s(G.banner.a), W / 2 + off, 138, 38, '#ece5cb', 'center', 7);
    txt(s(G.banner.b), W / 2 - off, 166, 17, '#d2a8ff', 'center', 4);
    ctx.globalAlpha = 1;
  }
  if (G.muted) txt(t('muted'), W - 20, H - 14, 12, '#9bb0ac', 'right', 3);
}
export function overlay(a) {
  ctx.fillStyle = `rgba(12,10,20,${a})`;
  ctx.fillRect(0, 0, W, H);
}
export const PAUSE_BTN = [372, 12, 36, 36];
const RANK_COL = ['#8fa5b8', '#7dffb0', '#5cc8ff', '#ff6ad5', '#ffd23f'];
// Style rank on the left under the lives: the letter, the meter to the next rank, the bonus.
function drawStyle() {
  const r = styleRank();
  if (r === 0) return; // nothing shows until the first rank, D
  const x = 20,
    y = 160,
    col = RANK_COL[r - 1],
    pop = 1 + Math.max(0, P.styPop);
  txt(t('style'), x, y - 42, 12, '#9bb0ac', 'left', 3);
  ctx.save();
  ctx.translate(x + 22, y);
  ctx.scale(pop, pop);
  if (r === RANKS.length) {
    ctx.shadowColor = col;
    ctx.shadowBlur = 16 + 6 * Math.sin(G.time * 10);
  }
  txt(RANKS[r - 1], 0, 0, 46, col, 'center', 7);
  ctx.restore();
  const into = r === RANKS.length ? 1 : (P.sty % STYLE_STEP) / STYLE_STEP;
  bar(x + 56, y - 26, 120, 8, into, 0, col, 3);
  const bonus = [Math.round((scoreMult() - 1) * 100), Math.round((dmgMult() - 1) * 100)];
  txt(t('styleBonus', ...bonus), x + 56, y - 2, 11, '#ece5cb', 'left', 3);
}
