// Procedural scenery: sky, cemetery parallax layers, wall, cobbles, the crypt.
import { CRYPT_X, H, TAU, W } from './config.js';
import { mulberry } from './util.js';
import { G } from './state.js';
import { ctx } from './gfx.js';

export function mk(w, h, f) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  f(c.getContext('2d'), w, h);
  return c;
}
export function tree(g, x, y, len, ang, d, r) {
  const x2 = x + Math.sin(ang) * len,
    y2 = y - Math.cos(ang) * len;
  g.lineWidth = Math.max(1, d * 1.5);
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x2, y2);
  g.stroke();
  if (d > 1) {
    tree(g, x2, y2, len * 0.72, ang - 0.35 - r() * 0.4, d - 1, r);
    tree(g, x2, y2, len * 0.68, ang + 0.3 + r() * 0.45, d - 1, r);
    if (r() > 0.6) tree(g, x2, y2, len * 0.5, ang + r() - 0.5, d - 2, r);
  }
}
export function grave(g, x, y, s, k) {
  g.beginPath();
  if (k === 0) {
    g.moveTo(x - 9 * s, y);
    g.lineTo(x - 9 * s, y - 18 * s);
    g.arc(x, y - 18 * s, 9 * s, Math.PI, 0);
    g.lineTo(x + 9 * s, y);
  } else if (k === 1) {
    g.rect(x - 2.5 * s, y - 34 * s, 5 * s, 34 * s);
    g.rect(x - 10 * s, y - 26 * s, 20 * s, 5 * s);
  } else {
    g.moveTo(x - 6 * s, y);
    g.lineTo(x - 4 * s, y - 36 * s);
    g.lineTo(x, y - 44 * s);
    g.lineTo(x + 4 * s, y - 36 * s);
    g.lineTo(x + 6 * s, y);
  }
  g.fill();
}
let SKY, FAR, MID, WALL, GROUND, VIG;
// Paints every parallax layer once into offscreen canvases.
export function initBackground() {
  SKY = mk(W, 380, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#16242f');
    gr.addColorStop(0.55, '#35555f');
    gr.addColorStop(1, '#7fa79f');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    const r = mulberry(11);
    g.fillStyle = '#dfeee0';
    for (let i = 0; i < 70; i++) {
      g.globalAlpha = 0.25 + r() * 0.6;
      g.fillRect(r() * w, r() * 170, 1.4, 1.4);
    }
    g.globalAlpha = 1;
    const mx = 705,
      my = 104,
      hg = g.createRadialGradient(mx, my, 40, mx, my, 230);
    hg.addColorStop(0, 'rgba(214,240,214,.42)');
    hg.addColorStop(1, 'rgba(214,240,214,0)');
    g.fillStyle = hg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#eaf3dc';
    g.beginPath();
    g.arc(mx, my, 58, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(120,160,150,.28)';
    for (const [a, b, c] of [
      [-18, -14, 13],
      [16, 10, 9],
      [-8, 22, 7],
      [24, -22, 6],
    ]) {
      g.beginPath();
      g.arc(mx + a, my + b, c, 0, TAU);
      g.fill();
    }
    g.fillStyle = 'rgba(22,36,47,.5)';
    for (const [a, b, c, d] of [
      [560, 120, 210, 9],
      [760, 88, 170, 7],
      [180, 70, 240, 10],
      [60, 150, 160, 7],
      [850, 160, 200, 8],
    ]) {
      g.beginPath();
      g.ellipse(a, b, c, d, 0, 0, TAU);
      g.fill();
    }
  });
  FAR = mk(1400, 360, (g, w, h) => {
    const r = mulberry(5),
      hy = (x) => 236 + 22 * Math.sin((x / w) * TAU * 2) + 12 * Math.sin((x / w) * TAU * 5 + 1);
    g.fillStyle = g.strokeStyle = '#4a6f74';
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) g.lineTo(x, hy(x));
    g.lineTo(w, h);
    g.fill();
    for (let i = 0; i < 26; i++) {
      const x = 40 + r() * (w - 80);
      grave(g, x, hy(x) + 3, 0.5 + r() * 0.4, (r() * 3) | 0);
    }
    for (let i = 0; i < 6; i++) {
      const x = 80 + r() * (w - 160);
      g.lineCap = 'round';
      tree(g, x, hy(x) + 2, 20 + r() * 12, r() * 0.3 - 0.15, 4, r);
    }
    // chapel
    const cx = 980,
      cy = hy(980) + 4;
    g.fillRect(cx - 34, cy - 52, 68, 52);
    g.beginPath();
    g.moveTo(cx - 40, cy - 52);
    g.lineTo(cx, cy - 84);
    g.lineTo(cx + 40, cy - 52);
    g.fill();
    g.fillRect(cx + 16, cy - 112, 16, 62);
    g.beginPath();
    g.moveTo(cx + 12, cy - 112);
    g.lineTo(cx + 24, cy - 146);
    g.lineTo(cx + 36, cy - 112);
    g.fill();
    g.fillRect(cx + 22.5, cy - 160, 3, 16);
    g.fillRect(cx + 18, cy - 155, 12, 3);
    g.fillStyle = '#cfe9c9';
    g.fillRect(cx - 6, cy - 40, 10, 16);
  });
  MID = mk(1600, 360, (g, w, h) => {
    const r = mulberry(23),
      hy = (x) => 292 + 10 * Math.sin((x / w) * TAU * 3 + 2) + 6 * Math.sin((x / w) * TAU * 7);
    g.fillStyle = g.strokeStyle = '#2c454d';
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) g.lineTo(x, hy(x));
    g.lineTo(w, h);
    g.fill();
    for (let i = 0; i < 30; i++) {
      const x = 30 + r() * (w - 60);
      grave(g, x, hy(x) + 4, 0.9 + r() * 0.7, (r() * 3) | 0);
    }
    g.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const x = 110 + i * 215 + r() * 60;
      tree(g, x, hy(x) + 4, 44 + r() * 22, r() * 0.3 - 0.15, 5, r);
    }
    // lamps
    for (let i = 0; i < 4; i++) {
      const x = 200 + i * 400,
        y = hy(x);
      g.fillRect(x - 2, y - 78, 4, 80);
      g.fillRect(x - 9, y - 80, 18, 3);
      const lg = g.createRadialGradient(x, y - 90, 2, x, y - 90, 56);
      lg.addColorStop(0, 'rgba(216,246,190,.85)');
      lg.addColorStop(0.25, 'rgba(190,236,180,.3)');
      lg.addColorStop(1, 'rgba(190,236,180,0)');
      g.fillStyle = lg;
      g.fillRect(x - 60, y - 150, 120, 120);
      g.fillStyle = '#e4f8cc';
      g.fillRect(x - 5, y - 97, 10, 15);
      g.fillStyle = g.strokeStyle = '#2c454d';
      g.fillRect(x - 7, y - 100, 14, 3);
    }
  });
  WALL = mk(1440, 100, (g, w, h) => {
    const r = mulberry(77);
    // iron spikes
    g.fillStyle = '#1c2b31';
    g.fillRect(0, 12, w, 3);
    for (let x = 6; x < w; x += 16) {
      g.fillRect(x - 1.5, 4, 3, 24);
      g.beginPath();
      g.moveTo(x - 4, 6);
      g.lineTo(x, -4);
      g.lineTo(x + 4, 6);
      g.fill();
    }
    // wall
    const wg = g.createLinearGradient(0, 26, 0, h);
    wg.addColorStop(0, '#55747a');
    wg.addColorStop(1, '#42595f');
    g.fillStyle = wg;
    g.fillRect(0, 26, w, h - 26);
    g.strokeStyle = 'rgba(22,36,42,.45)';
    g.lineWidth = 1.5;
    for (let row = 0; row < 5; row++) {
      const y = 32 + row * 14;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
      for (let x = (row % 2) * 24; x < w; x += 48) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x, y + 14);
        g.stroke();
        if (r() > 0.72) {
          g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(10,20,26,.14)';
          g.fillRect(x + 1, y + 1, 46, 12);
        }
      }
    }
    g.fillStyle = '#6c8f8e';
    g.fillRect(0, 24, w, 7);
    g.fillStyle = 'rgba(22,36,42,.5)';
    g.fillRect(0, 31, w, 1.5);
    for (let i = 0; i < 22; i++) {
      const x = r() * w;
      g.fillStyle = 'rgba(96,140,104,.5)';
      g.beginPath();
      g.ellipse(x, 30 + r() * 5, 14 + r() * 24, 3 + r() * 5, 0, 0, TAU);
      g.fill();
    }
    // pillars
    for (let x = 180; x < w; x += 360) {
      g.fillStyle = '#4d6a70';
      g.fillRect(x - 22, 10, 44, h - 10);
      g.fillStyle = '#6c8f8e';
      g.fillRect(x - 26, 6, 52, 9);
      g.fillStyle = 'rgba(22,36,42,.35)';
      g.fillRect(x + 12, 15, 10, h);
      g.fillStyle = '#6c8f8e';
      g.beginPath();
      g.arc(x, 0, 9, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(22,36,42,.5)';
      g.strokeRect(x - 22, 15, 44, h);
    }
    g.fillStyle = 'rgba(16,28,34,.4)';
    g.fillRect(0, h - 7, w, 7);
  });
  GROUND = mk(480, H - 352, (g, w, h) => {
    const r = mulberry(3),
      gg = g.createLinearGradient(0, 0, 0, h);
    gg.addColorStop(0, '#6f8f8b');
    gg.addColorStop(1, '#8fae9f');
    g.fillStyle = gg;
    g.fillRect(0, 0, w, h);
    let y = 8,
      row = 0;
    while (y < h) {
      const rh = 11 + row * 2.6,
        n = Math.max(4, Math.round(14 - row * 0.9)),
        sw = w / n,
        off = ((row % 2) * sw) / 2;
      const tr = [];
      for (let i = 0; i < n; i++) tr.push(r());
      for (let i = -1; i < n; i++) {
        const x = i * sw + off,
          t = tr[(i + n) % n];
        g.fillStyle =
          t > 0.82 ? 'rgba(255,255,255,.05)' : t < 0.22 ? 'rgba(20,40,44,.08)' : 'rgba(0,0,0,0)';
        g.beginPath();
        const p = 2.2;
        g.moveTo(x + p + 3, y + p);
        g.lineTo(x + sw - p - 3, y + p);
        g.quadraticCurveTo(x + sw - p, y + p, x + sw - p, y + p + 3);
        g.lineTo(x + sw - p, y + rh - p - 3);
        g.quadraticCurveTo(x + sw - p, y + rh - p, x + sw - p - 3, y + rh - p);
        g.lineTo(x + p + 3, y + rh - p);
        g.quadraticCurveTo(x + p, y + rh - p, x + p, y + rh - p - 3);
        g.lineTo(x + p, y + p + 3);
        g.quadraticCurveTo(x + p, y + p, x + p + 3, y + p);
        g.fill();
        g.strokeStyle = 'rgba(28,52,56,.3)';
        g.lineWidth = 1.3;
        g.stroke();
      }
      y += rh;
      row++;
    }
    g.fillStyle = '#55746f';
    g.fillRect(0, 0, w, 7);
    g.fillStyle = 'rgba(18,32,36,.45)';
    g.fillRect(0, 6, w, 2);
  });
  VIG = mk(W, H, (g, w, h) => {
    const v = g.createRadialGradient(w / 2, h * 0.55, h * 0.45, w / 2, h * 0.55, h * 1.05);
    v.addColorStop(0, 'rgba(8,14,20,0)');
    v.addColorStop(1, 'rgba(8,14,20,.55)');
    g.fillStyle = v;
    g.fillRect(0, 0, w, h);
  });
}
export function tile(img, par, y) {
  const tw = img.width;
  let x = -(((G.cam * par) % tw) + tw) % tw;
  for (; x < W; x += tw) ctx.drawImage(img, Math.floor(x), y);
}
export function drawBG() {
  ctx.drawImage(SKY, 0, 0);
  tile(FAR, 0.14, 0);
  ctx.fillStyle = 'rgba(127,167,159,.3)';
  ctx.fillRect(0, 200, W, 160);
  tile(MID, 0.42, 0);
  // far fog
  for (let i = 0; i < 6; i++) {
    const x = ((((i * 330 - G.cam * 0.6 + G.time * 10) % 1980) + 1980) % 1980) - 330;
    ctx.fillStyle = 'rgba(200,228,214,.12)';
    ctx.beginPath();
    ctx.ellipse(x, 286 + (i % 3) * 10, 270, 20, 0, 0, TAU);
    ctx.fill();
  }
  tile(WALL, 1, 258);
  // crypt of the baron
  const cx = CRYPT_X - G.cam;
  if (cx > -260 && cx < W + 260) {
    ctx.fillStyle = '#3d555c';
    ctx.fillRect(cx - 150, 170, 300, 188);
    ctx.fillStyle = '#55747a';
    ctx.beginPath();
    ctx.moveTo(cx - 178, 172);
    ctx.lineTo(cx, 96);
    ctx.lineTo(cx + 178, 172);
    ctx.fill();
    ctx.fillStyle = '#6c8f8e';
    ctx.fillRect(cx - 178, 168, 356, 12);
    for (const dx of [-128, -84, 84, 128]) {
      ctx.fillStyle = '#6c8f8e';
      ctx.fillRect(cx + dx - 13, 180, 26, 178);
      ctx.fillStyle = 'rgba(16,28,34,.35)';
      ctx.fillRect(cx + dx + 4, 180, 9, 178);
      ctx.fillStyle = '#7da09c';
      ctx.fillRect(cx + dx - 17, 180, 34, 8);
      ctx.fillRect(cx + dx - 17, 350, 34, 8);
    }
    ctx.fillStyle = '#120d1c';
    ctx.beginPath();
    ctx.moveTo(cx - 48, 358);
    ctx.lineTo(cx - 48, 236);
    ctx.arc(cx, 236, 48, Math.PI, 0);
    ctx.lineTo(cx + 48, 358);
    ctx.fill();
    const pg = ctx.createRadialGradient(cx, 318, 6, cx, 318, 90);
    const a = 0.35 + 0.15 * Math.sin(G.time * 2.4);
    pg.addColorStop(0, `rgba(176,92,255,${a})`);
    pg.addColorStop(1, 'rgba(176,92,255,0)');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 48, 358);
    ctx.lineTo(cx - 48, 236);
    ctx.arc(cx, 236, 48, Math.PI, 0);
    ctx.lineTo(cx + 48, 358);
    ctx.clip();
    ctx.fillStyle = pg;
    ctx.fillRect(cx - 60, 180, 120, 180);
    ctx.restore();
    // skull emblem
    ctx.fillStyle = '#d9d3bb';
    ctx.beginPath();
    ctx.arc(cx, 140, 12, 0, TAU);
    ctx.fill();
    ctx.fillRect(cx - 7, 146, 14, 10);
    ctx.fillStyle = '#120d1c';
    ctx.beginPath();
    ctx.arc(cx - 4.5, 140, 3.2, 0, TAU);
    ctx.arc(cx + 4.5, 140, 3.2, 0, TAU);
    ctx.fill();
  }
  // entry gate at start
  const gx = 40 - G.cam;
  if (gx > -120) {
    ctx.fillStyle = '#1c2b31';
    for (const dx of [-60, 60]) {
      ctx.fillRect(gx + dx - 8, 196, 16, 162);
      ctx.beginPath();
      ctx.moveTo(gx + dx - 12, 198);
      ctx.lineTo(gx + dx, 176);
      ctx.lineTo(gx + dx + 12, 198);
      ctx.fill();
    }
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#1c2b31';
    ctx.beginPath();
    ctx.arc(gx, 232, 62, Math.PI, 0);
    ctx.stroke();
  }
  tile(GROUND, 1, 352);
}
export function drawFog() {
  for (let i = 0; i < 5; i++) {
    const x = ((((i * 420 - G.cam * 1.15 + G.time * 22) % 2100) + 2100) % 2100) - 420;
    ctx.fillStyle = 'rgba(206,232,220,.1)';
    ctx.beginPath();
    ctx.ellipse(x, 360 + (i % 2) * 150 + (i % 3) * 8, 330, 24, 0, 0, TAU);
    ctx.fill();
  }
}

export function drawVignette() {
  ctx.drawImage(VIG, 0, 0);
}
