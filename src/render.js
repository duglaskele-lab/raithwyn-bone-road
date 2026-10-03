// Draws the world, the HUD and the title screen.
import { FONT, H, MAXR, OL, PURPLE, RL, RW, SLAM_R, TAU, W, WAVES } from './config.js';
import { clamp, ease } from './util.js';
import { FR } from './atlas-frames.js';
import { G, P } from './state.js';
import { atlas, ctx, rr, sprite, txt } from './gfx.js';
import { touch } from './input.js';
import { drawBG, drawFog, drawVignette } from './background.js';
import { hadoLevel } from './combat.js';
import { boneShape, drawBike, drawSkel } from './skeleton.js';

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
export function drawDebris(d) {
  const a = Math.min(1, d.life * 1.5);
  ctx.save();
  ctx.globalAlpha = a;
  if (d.k === 'bike') {
    ctx.translate(d.x - G.cam, d.gy);
    ctx.scale(d.dir, 1 - 0.58 * ease(d.tilt));
    drawBike(d.x * 0.05);
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
      const u = e.t / 0.9,
        x = e.x - G.cam;
      ctx.fillStyle = `rgba(255,90,70,${0.08 + 0.14 * u})`;
      ctx.beginPath();
      ctx.ellipse(x, e.y, SLAM_R, SLAM_R * 0.36, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,140,110,.9)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, e.y, SLAM_R * u, SLAM_R * 0.36 * u, 0, 0, TAU);
      ctx.stroke();
    }
  // shadows
  for (const u of G.props) shadow(u.x, u.y, 0, 22);
  for (const e of G.enemies)
    if (e.state !== 'rise' || e.t > 0.4) shadow(e.x, e.y, e.z, (e.mounted ? 70 : 34) * e.T.scale);
  for (const it of G.items) shadow(it.x, it.y, it.z, 12);
  for (const q of G.projs) shadow(q.x, q.y, q.z, q.k === 'hado' ? 26 * q.lv : 10);
  if (G.state !== 'title') shadow(P.x, P.y, P.z, 40);
  const list = [];
  for (const d of G.debris) list.push([d.gy - 1, drawDebris, d]);
  for (const u of G.props) list.push([u.y, drawUrn, u]);
  for (const e of G.enemies) list.push([e.y, drawSkel, e]);
  for (const it of G.items) list.push([it.y, drawItem, it]);
  for (const q of G.projs) list.push([q.y + 1, drawProj, q]);
  if (G.state !== 'title') list.push([P.y, drawPlayer, null]);
  list.sort((a, b) => a[0] - b[0]);
  for (const l of list) l[1](l[2]);
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
  const f = FR.idle[0];
  ctx.drawImage(atlas, f[0] + 14, f[1], 58, 58, 20, 18, 60, 60);
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
    ['Ярость', 'Хадукен I', 'Хадукен II', 'Хадукен III'][lv],
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
  // foe bar
  if (G.lastFoe && G.lastFoeT > 0 && G.lastFoe.type !== 'boss') {
    ctx.globalAlpha = Math.min(1, G.lastFoeT * 2);
    txt(G.lastFoe.T.name, W - 20, 60, 14, '#ece5cb', 'right', 3);
    bar(W - 190, 66, 164, 9, Math.max(0, G.lastFoe.hp) / G.lastFoe.T.hp, 0, '#ff8a4a', 4);
    ctx.globalAlpha = 1;
  }
  const boss = G.enemies.find((e) => e.type === 'boss');
  if (boss) {
    const bx = 440,
      bw = 360;
    txt(boss.T.name, bx + 8, 31, 14, '#e3c8ff', 'left', 4);
    bar(bx, 37, bw, 12, Math.max(0, boss.hp) / boss.T.hp, 0, '#b05cff');
    if (boss.armor > 0)
      txt(
        'Иммунитет к комбо ' + boss.armor.toFixed(1) + ' с',
        bx + bw + 4,
        31,
        12,
        '#fff',
        'right',
        3,
      );
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
    txt('Вперёд', W - 74, 250, 26, '#ece5cb', 'right', 5);
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
    txt(G.banner.a, W / 2 + off, 138, 38, '#ece5cb', 'center', 7);
    txt(G.banner.b, W / 2 - off, 166, 17, '#d2a8ff', 'center', 4);
    ctx.globalAlpha = 1;
  }
  if (G.muted) txt('Звук выключен', W - 20, H - 14, 12, '#9bb0ac', 'right', 3);
}
export function overlay(a) {
  ctx.fillStyle = `rgba(12,10,20,${a})`;
  ctx.fillRect(0, 0, W, H);
}
export function drawTitle() {
  G.cam = 200 + G.time * 18;
  drawWorld();
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(12,10,20,.2)');
  g.addColorStop(0.45, 'rgba(12,10,20,.72)');
  g.addColorStop(1, 'rgba(12,10,20,.86)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // hero
  const fx = 210,
    fy = 505;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(fx, fy - 200, 10, fx, fy - 200, 260);
  gl.addColorStop(0, 'rgba(176,92,255,.38)');
  gl.addColorStop(1, 'rgba(176,92,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, 480, H);
  ctx.restore();
  sprite(
    'laugh',
    [0, 0, 0, 1, 2, 1, 2, 1, 2, 3, 3, 0][Math.floor(G.time / 0.13) % 12],
    fx,
    fy,
    false,
    2.35,
  );
  ctx.save();
  ctx.shadowColor = PURPLE;
  ctx.shadowBlur = 26;
  txt('RAITHWYN', 420, 170, 68, '#f0e9ff', 'left', 10);
  ctx.restore();
  txt('Костяной тракт', 424, 208, 24, '#d2a8ff', 'left', 5);
  const rows = [
    ['Удар, серия из трёх', 'J'],
    ['Прыжок, в полёте можно бить', 'Пробел'],
    ['Бросок кости', 'L'],
    ['Хадукен, три уровня силы', 'I'],
  ];
  rows.forEach(([a, k], i) => {
    const y = 268 + i * 32;
    ctx.font = `900 15px ${FONT}`;
    const w = Math.max(30, ctx.measureText(k).width + 16);
    ctx.fillStyle = '#ece5cb';
    rr(424, y - 19, w, 25, 5);
    ctx.fill();
    txt(k, 424 + w / 2, y - 1, 15, OL, 'center');
    txt(a, 424 + w + 12, y, 15, '#ece5cb', 'left', 4);
  });
  txt('Чем больше ярости, тем сильнее хадукен', 424, 416, 13, '#9bb0ac', 'left', 3);
  if (Math.floor(G.time * 2) % 2 === 0)
    txt(
      touch ? 'Коснись экрана, чтобы начать' : 'Enter — начать бой',
      424,
      474,
      21,
      '#f0cf4f',
      'left',
      5,
    );
}
