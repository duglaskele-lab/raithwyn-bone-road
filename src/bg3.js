// Procedural scenery of Midnight City (stage 3): a city of the future with an eastern soul, built
// by Jawacorp (its sign everywhere: a hood in a ring with two burning eyes). The rainy slums
// of shacks, cables and paper lanterns; the stairs down into the metro, its platform with the
// trains rushing past and its concourse; the escalator up to the avenue of red arches, cherry
// trees and holographic carp, footbridges between the towers; the bridge over the expressway;
// the fire stairs; the roofs with their tanks, aerials and billboards, the city's lights far
// below the gaps; the garden on top of the tower with its pagoda under a holographic moon.
// Drawn in road coordinates (see level3.js); textures and the skyline are painted once.
import { FONT, H, OL, W } from './config.js';
import { clamp, mulberry } from './util.js';
import { APP, G } from './state.js';
import { ctx } from './gfx.js';
import { mk } from './background.js';
import { DEPTH, DOORS, FLOOR, L3, PITS, topY } from './level3.js';

const { Y_A, Y_B, Y_R, SLUMS_END, STAIRS, HALL_X, ESCAL, ARCH_X, BRIDGE, FIRE, GARDEN_X } = L3;
const END_X = L3.END_X;
let T = null;

// Jawacorp's colours: the ring and the hood, the eyes.
const JAWA = { ring: '#ffb02e', eye: '#ffe14a' };

// --- textures ------------------------------------------------------------------------------

function speckle(g, w, h, r, n, cols, s0, s1) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[(r() * cols.length) | 0];
    const s = s0 + r() * (s1 - s0);
    g.fillRect(r() * w, r() * h, s, s * (0.5 + r() * 0.6));
  }
}
function makeTextures() {
  const P = {};
  // the slums: cracked, wet asphalt with puddles mirroring the neon
  P.wet = mk(320, DEPTH, (g, w, h) => {
    const r = mulberry(31);
    g.fillStyle = '#23252e';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 700, ['rgba(0,0,0,.25)', 'rgba(140,150,180,.08)'], 1, 3);
    for (let i = 0; i < 6; i++) {
      const x = r() * w,
        y = 20 + r() * (h - 40),
        a = 20 + r() * 40;
      const gr = g.createLinearGradient(x, y - 6, x, y + 6);
      gr.addColorStop(0, 'rgba(255,60,160,.22)');
      gr.addColorStop(1, 'rgba(60,200,255,.18)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(x, y, a, a * 0.22, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = 'rgba(0,0,0,.4)';
    g.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      let x = r() * w,
        y = r() * h;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) g.lineTo((x += r() * 30 - 15), (y += r() * 20));
      g.stroke();
    }
  });
  // the metro: pale tiles, a yellow safety line along the platform's back edge
  P.tiles = mk(128, DEPTH, (g, w, h) => {
    g.fillStyle = '#9aa3ad';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(40,46,56,.35)';
    g.lineWidth = 1.5;
    for (let x = 0; x <= w; x += 32) g.strokeRect(x, 0, 32, h);
    for (let y = 0; y <= h; y += 28) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.fillStyle = '#e8c23a';
    g.fillRect(0, 8, w, 7);
    g.fillStyle = 'rgba(0,0,0,.25)';
    for (let x = 4; x < w; x += 12) g.fillRect(x, 9, 5, 5);
  });
  // the avenue and the bridge: dark stone slabs with lit seams
  P.stone = mk(160, DEPTH, (g, w, h) => {
    const r = mulberry(7);
    g.fillStyle = '#3a3646';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 300, ['rgba(0,0,0,.2)', 'rgba(255,255,255,.05)'], 1, 3);
    g.strokeStyle = 'rgba(120,230,255,.25)';
    g.lineWidth = 2;
    for (let y = 40; y < h; y += 42) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.strokeStyle = 'rgba(0,0,0,.35)';
    for (let x = 0; x < w; x += 80) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
  });
  // the roofs: rough concrete, stains
  P.roof = mk(200, DEPTH, (g, w, h) => {
    const r = mulberry(13);
    g.fillStyle = '#4b4f58';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 600, ['rgba(0,0,0,.18)', 'rgba(255,255,255,.06)'], 1, 4);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = 'rgba(20,20,26,.18)';
      g.beginPath();
      g.ellipse(r() * w, r() * h, 20 + r() * 30, 8 + r() * 10, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
  // the garden: raked white gravel, stepping stones
  P.gravel = mk(240, DEPTH, (g, w, h) => {
    const r = mulberry(17);
    g.fillStyle = '#b9b4a8';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,84,74,.35)';
    g.lineWidth = 1.5;
    for (let y = 8; y < h; y += 9) {
      g.beginPath();
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 1.5);
      g.stroke();
    }
    speckle(g, w, h, r, 200, ['rgba(0,0,0,.12)', 'rgba(255,255,255,.2)'], 1, 2);
    g.fillStyle = '#6f6a62';
    for (const [x, y] of [
      [40, 80],
      [120, 96],
      [200, 76],
    ]) {
      g.beginPath();
      g.ellipse(x, y, 26, 10, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
  // corrugated metal for the shacks, in a few colours
  P.tin = ['#5c6a6e', '#7a4e3c', '#4f6152', '#6b5a7a'].map((c) =>
    mk(48, 64, (g, w, h) => {
      g.fillStyle = c;
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 8) {
        g.fillStyle = 'rgba(255,255,255,.08)';
        g.fillRect(x, 0, 3, h);
        g.fillStyle = 'rgba(0,0,0,.18)';
        g.fillRect(x + 4, 0, 3, h);
      }
      g.fillStyle = 'rgba(120,60,20,.25)';
      g.fillRect(0, h - 10, w, 10);
    }),
  );
  return P;
}
/** The far city: a wide strip of towers with lit windows. */
function makeSkyline(seed, h, cols, lit) {
  return mk(1400, h, (g, w) => {
    const r = mulberry(seed);
    for (let x = -20; x < w;) {
      const bw = 40 + r() * 90,
        bh = h * (0.35 + r() * 0.6);
      g.fillStyle = cols[(r() * cols.length) | 0];
      g.fillRect(x, h - bh, bw, bh);
      // a pagoda roof now and then, or an aerial
      if (r() < 0.25) {
        g.beginPath();
        g.moveTo(x - 8, h - bh);
        g.quadraticCurveTo(x + bw / 2, h - bh - 26, x + bw + 8, h - bh);
        g.fill();
      } else if (r() < 0.4) g.fillRect(x + bw / 2, h - bh - 40, 2, 40);
      for (let wy = h - bh + 10; wy < h - 6; wy += 12)
        for (let wx = x + 6; wx < x + bw - 6; wx += 10)
          if (r() < lit) {
            g.fillStyle = r() < 0.7 ? 'rgba(255,214,140,.7)' : 'rgba(120,230,255,.7)';
            g.fillRect(wx, wy, 4, 6);
          }
      x += bw + r() * 6;
    }
  });
}
function glowImg(col, r) {
  return mk(r * 2, r * 2, (g) => {
    const gr = g.createRadialGradient(r, r, 2, r, r, r);
    gr.addColorStop(0, col);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, r * 2, r * 2);
  });
}
function init() {
  T = { patterns: {} };
  const tex = makeTextures();
  for (const [k, c] of Object.entries(tex))
    if (!Array.isArray(c)) T.patterns[k] = ctx.createPattern(c, 'repeat');
  T.tin = tex.tin.map((c) => ctx.createPattern(c, 'repeat'));
  T.far = makeSkyline(101, 300, ['#1b1830', '#221d3a', '#18162a'], 0.18);
  T.near = makeSkyline(202, 380, ['#120f1f', '#16122a'], 0.1);
  T.pink = glowImg('rgba(255,70,170,.45)', 90);
  T.cyan = glowImg('rgba(70,220,255,.45)', 90);
  T.warm = glowImg('rgba(255,170,80,.5)', 70);
  T.amber = glowImg('rgba(255,176,46,.5)', 160);
}

// --- small pieces ------------------------------------------------------------------------------

const poly = (pts) => {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
};
const view = (x0, x1, y0 = -1e9, y1 = 1e9) =>
  x1 > G.cam - 40 && x0 < G.cam + W + 40 && y1 > G.camY - 40 && y0 < G.camY + H + 40;
/** A filled box with the ink outline. */
function box(x, y, w, h, fill, lw = 2) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = OL;
  ctx.lineWidth = lw;
  ctx.strokeRect(x, y, w, h);
}
/** A soft glow (an offscreen radial gradient), added onto the picture. */
function glow(img, x, y, a = 1, s = 1) {
  if (APP.lowFx) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  const w = img.width * s;
  ctx.drawImage(img, x - w / 2, y - w / 2, w, w);
  ctx.restore();
}
/** A neon tube's flicker: mostly lit, now and then a stutter (no chance used: replays agree). */
const flick = (seed) => {
  const k = Math.floor((G.time + seed * 7.3) * 9) % 53;
  return k === 0 || k === 2 ? 0.25 : 1;
};
/** A made-up glyph (the city's signs are in a script of their own): strokes on a 3×3 grid. */
function glyph(x, y, s, seed) {
  const r = mulberry(seed * 977 + 13),
    pt = () => [x + (((r() * 3) | 0) - 1) * s * 0.4, y + (((r() * 3) | 0) - 1) * s * 0.4];
  ctx.beginPath();
  for (let k = 0; k < 3 + ((r() * 2) | 0); k++) {
    const [a, b] = pt(),
      [c, d] = pt();
    ctx.moveTo(a, b);
    ctx.lineTo(c, d === b && c === a ? d + s * 0.4 : d);
  }
  ctx.stroke();
}
/** A vertical neon sign of glyphs, hung off a wall. */
function neonSign(x, y, n, col, seed) {
  const a = flick(seed),
    h = n * 30 + 12;
  box(x - 15, y, 30, h, '#16121e');
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = col;
  ctx.globalAlpha = a;
  ctx.lineWidth = 3;
  if (!APP.lowFx) {
    ctx.shadowColor = col;
    ctx.shadowBlur = 10;
  }
  ctx.strokeRect(x - 11, y + 4, 22, h - 8);
  for (let k = 0; k < n; k++) glyph(x, y + 21 + k * 30, 18, seed + k);
  ctx.restore();
  glow(col === '#ff4fb4' ? T.pink : T.cyan, x, y + h / 2, 0.5 * a, 1);
}
/** Jawacorp's sign: a hood in a ring, two burning eyes in its shadow. */
export function jawaLogo(x, y, r, a = 1) {
  ctx.save();
  ctx.globalAlpha *= a;
  // the ring
  ctx.fillStyle = JAWA.ring;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a120c';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
  ctx.fill();
  // the hood: a pointed cowl, its opening a black shadow
  ctx.fillStyle = JAWA.ring;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.72);
  ctx.quadraticCurveTo(x + r * 0.62, y - r * 0.3, x + r * 0.6, y + r * 0.6);
  ctx.lineTo(x - r * 0.6, y + r * 0.6);
  ctx.quadraticCurveTo(x - r * 0.62, y - r * 0.3, x, y - r * 0.72);
  ctx.fill();
  ctx.fillStyle = '#0a0604';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.1, r * 0.4, r * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  // the eyes
  ctx.fillStyle = JAWA.eye;
  if (!APP.lowFx) {
    ctx.shadowColor = JAWA.eye;
    ctx.shadowBlur = r * 0.5;
  }
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + s * r * 0.17, y + r * 0.08, r * 0.1, r * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
/** A Jawacorp billboard: a screen with the sign, the name in lights and a slogan. */
function jawaBoard(x, y, w, h, seed = 1) {
  box(x - 6, y - 6, w + 12, h + 12, '#14101a', 3);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#2a0f2e');
  g.addColorStop(1, '#0d1a33');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const a = flick(seed);
  jawaLogo(x + h * 0.55, y + h / 2, h * 0.36, a);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `900 ${Math.round(h * 0.24)}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9c2';
  if (!APP.lowFx) {
    ctx.shadowColor = JAWA.ring;
    ctx.shadowBlur = 12;
  }
  ctx.fillText('JAWACORP', x + h * 1.05, y + h * 0.4);
  ctx.shadowBlur = 0;
  ctx.font = `700 ${Math.round(h * 0.11)}px ${FONT}`;
  ctx.fillStyle = '#9fd8ff';
  ctx.fillText('WE BUILD YOUR TOMORROW', x + h * 1.07, y + h * 0.7);
  ctx.restore();
  // scan lines
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  for (let yy = y; yy < y + h; yy += 4) ctx.fillRect(x, yy, w, 1.5);
  glow(T.amber, x + h * 0.55, y + h / 2, 0.35 * a, 1);
}
/** A five-pointed star of radius r. */
function star(x, y, r, rot = 0) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = rot - Math.PI / 2 + (k * Math.PI) / 5,
      q = k % 2 ? r * 0.42 : r;
    ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
  ctx.fill();
}
/** A line of lit text on a board, left or centred, with a neon blur. */
function boardText(t, x, y, size, col, glowCol, weight = 900, align = 'left') {
  ctx.font = `${weight} ${Math.round(size)}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = col;
  if (!APP.lowFx && glowCol) {
    ctx.shadowColor = glowCol;
    ctx.shadowBlur = 10;
  }
  ctx.fillText(t, x, y);
  ctx.shadowBlur = 0;
}
// Not every screen in the city is Jawacorp's: other firms' adverts too.
const ADS = {
  // a milk that is not milk, with a serval on the carton
  milk(x, y, w, h) {
    ctx.fillStyle = '#f4ead2';
    ctx.fillRect(x, y, w, h);
    // the serval's spots along the edges
    ctx.fillStyle = '#c98a3a';
    const r = mulberry(w * 7 + h);
    for (let k = 0; k < 26; k++) {
      const sx = x + r() * w,
        sy = r() < 0.5 ? y + 4 + r() * h * 0.14 : y + h - 4 - r() * h * 0.14;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 3 + r() * 3, 2 + r() * 2, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // the carton
    const cx = x + h * 0.5,
      cw = h * 0.42,
      ch = h * 0.62,
      cy = y + h * 0.24;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - cw / 2, cy, cw, ch);
    ctx.fillStyle = '#e0d4bc';
    ctx.beginPath();
    ctx.moveTo(cx - cw / 2, cy);
    ctx.lineTo(cx, cy - h * 0.12);
    ctx.lineTo(cx + cw / 2, cy);
    ctx.fill();
    // a serval's head on it: big ears, spots
    ctx.fillStyle = '#e0a24a';
    const hy = cy + ch * 0.45,
      hr = cw * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx - hr * 0.9, hy - hr * 0.4);
    ctx.lineTo(cx - hr * 0.8, hy - hr * 1.9);
    ctx.lineTo(cx - hr * 0.1, hy - hr * 0.8);
    ctx.moveTo(cx + hr * 0.9, hy - hr * 0.4);
    ctx.lineTo(cx + hr * 0.8, hy - hr * 1.9);
    ctx.lineTo(cx + hr * 0.1, hy - hr * 0.8);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, hy, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2410';
    for (const [dx, dy] of [
      [-0.4, -0.3],
      [0.4, -0.3],
      [0, 0.35],
    ])
      ctx.fillRect(cx + dx * hr - 1.5, hy + dy * hr - 1.5, 3, 3);
    boardText('NO MILK,', x + h * 0.95, y + h * 0.36, h * 0.15, '#6a4a2a', null, 700);
    boardText('SERVAL PILK', x + h * 0.95, y + h * 0.62, h * 0.24, '#d0541c', '#ffb070');
  },
  // the blue screen nobody has bought
  ad(x, y, w, h) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#1f5cd6');
    g.addColorStop(1, '#0d2a7a');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(200,230,255,.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 7]);
    ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
    ctx.setLineDash([]);
    boardText('YOUR AD', x + w / 2, y + h * 0.36, h * 0.26, '#ffffff', '#7fb8ff', 900, 'center');
    boardText(
      'COULD BE HERE',
      x + w / 2,
      y + h * 0.66,
      h * 0.17,
      '#bfe0ff',
      '#7fb8ff',
      700,
      'center',
    );
  },
  // a red board with a field of stars
  meme(x, y, w, h) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#d61f2c');
    g.addColorStop(1, '#7a0c14');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // the picture: a night of stars, one big gold star in it
    const px = x + 10,
      pw = h * 1.1;
    ctx.fillStyle = '#16123a';
    ctx.fillRect(px, y + 10, pw, h - 20);
    const r = mulberry(h * 13);
    ctx.fillStyle = '#fff6c0';
    for (let k = 0; k < 9; k++)
      star(px + 8 + r() * (pw - 16), y + 18 + r() * (h - 36), 2 + r() * 3, r());
    ctx.fillStyle = '#ffd23a';
    if (!APP.lowFx) {
      ctx.shadowColor = '#ffd23a';
      ctx.shadowBlur = 12;
    }
    star(px + pw / 2, y + h / 2, h * 0.3, Math.sin(G.time * 0.8) * 0.15);
    ctx.shadowBlur = 0;
    boardText('MEME', x + pw + 26, y + h * 0.36, h * 0.27, '#fff2d0', '#ff8a8a');
    boardText('LORDS', x + pw + 26, y + h * 0.68, h * 0.27, '#ffd23a', '#ff8a8a');
  },
};
/** An advert of another firm (`kind`: milk, ad, meme): a lit screen in a dark frame. */
function adBoard(x, y, w, h, kind, seed = 1) {
  box(x - 6, y - 6, w + 12, h + 12, '#14101a', 3);
  const a = flick(seed);
  ctx.save();
  ctx.globalAlpha = 0.55 + 0.45 * a;
  ADS[kind](x, y, w, h);
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,.14)';
  for (let yy = y; yy < y + h; yy += 4) ctx.fillRect(x, yy, w, 1.5);
  glow(
    kind === 'ad' ? T.cyan : kind === 'meme' ? T.pink : T.amber,
    x + w / 2,
    y + h / 2,
    0.3 * a,
    1,
  );
}
/** A red paper lantern, swaying a little, glowing. */
function lantern(x, y, s = 1) {
  const sw = Math.sin(G.time * 1.6 + x * 0.01) * 3;
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 14 * s);
  ctx.lineTo(x + sw, y);
  ctx.stroke();
  ctx.fillStyle = '#e8402f';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x + sw, y + 14 * s, 11 * s, 15 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2b1a14';
  ctx.fillRect(x + sw - 7 * s, y - 1 * s, 14 * s, 4 * s);
  ctx.fillRect(x + sw - 7 * s, y + 27 * s, 14 * s, 4 * s);
  ctx.strokeStyle = 'rgba(80,10,10,.6)';
  ctx.lineWidth = 1;
  for (const k of [-4, 4]) {
    ctx.beginPath();
    ctx.moveTo(x + sw + k * s, y + 3 * s);
    ctx.quadraticCurveTo(x + sw + k * 1.6 * s, y + 14 * s, x + sw + k * s, y + 26 * s);
    ctx.stroke();
  }
  glow(T.warm, x + sw, y + 14 * s, 0.7, s);
}
/** A cable strung across from one wall to another, sagging. */
function cable(x0, y0, x1, y1, sag, col = '#0c0b10') {
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1);
  ctx.stroke();
}
/** An air conditioner on a wall. */
function airCon(x, y) {
  box(x, y, 40, 28, '#8b939a');
  ctx.strokeStyle = 'rgba(0,0,0,.4)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 6 + k * 5);
    ctx.lineTo(x + 24, y + 6 + k * 5);
    ctx.stroke();
  }
  ctx.fillStyle = '#4d5459';
  ctx.beginPath();
  ctx.arc(x + 32, y + 14, 7, 0, Math.PI * 2);
  ctx.fill();
}
/** A cherry tree in bloom. */
function sakura(x, y, s = 1, seed = 1) {
  const r = mulberry(seed);
  ctx.strokeStyle = '#3b2420';
  ctx.lineCap = 'round';
  const branch = (bx, by, len, ang, d) => {
    const ex = bx + Math.sin(ang) * len,
      ey = by - Math.cos(ang) * len;
    ctx.strokeStyle = '#3b2420';
    ctx.lineWidth = d * 2.2 * s;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    if (d > 1) {
      branch(ex, ey, len * 0.72, ang - 0.5 - r() * 0.3, d - 1);
      branch(ex, ey, len * 0.72, ang + 0.4 + r() * 0.3, d - 1);
    } else {
      ctx.fillStyle = r() < 0.5 ? '#ffb7d5' : '#ff9cc4';
      ctx.beginPath();
      ctx.arc(ex, ey, (12 + r() * 10) * s, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  branch(x, y, 60 * s, -0.05, 4);
}
/** A stone lantern (tōrō). */
function toro(x, y) {
  ctx.fillStyle = '#7d7a73';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  poly([
    [x - 16, y],
    [x + 16, y],
    [x + 10, y - 10],
    [x - 10, y - 10],
  ]);
  ctx.fill();
  ctx.stroke();
  box(x - 5, y - 42, 10, 32, '#8a877f');
  box(x - 13, y - 62, 26, 20, '#8a877f');
  ctx.fillStyle = '#ffcf7a';
  ctx.fillRect(x - 7, y - 57, 14, 10);
  poly([
    [x - 22, y - 62],
    [x + 22, y - 62],
    [x + 8, y - 74],
    [x - 8, y - 74],
  ]);
  ctx.fillStyle = '#6d6a63';
  ctx.fill();
  ctx.stroke();
  glow(T.warm, x, y - 52, 0.6, 0.6);
}
/** A torii: two red pillars, the black top beam curving up at its ends, the tie beam below. */
function torii(x, y, w, h) {
  const red = '#d6352a';
  for (const s of [-1, 1]) box(x + (s * w) / 2 - 10, y - h, 20, h, red);
  box(x - w / 2 - 26, y - h + 34, w + 52, 16, red);
  box(x - 8, y - h + 8, 16, 26, red);
  ctx.fillStyle = '#1a1414';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 44, y - h - 6);
  ctx.quadraticCurveTo(x, y - h + 6, x + w / 2 + 44, y - h - 6);
  ctx.lineTo(x + w / 2 + 40, y - h + 10);
  ctx.quadraticCurveTo(x, y - h + 20, x - w / 2 - 40, y - h + 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  box(x - w / 2 - 30, y - h + 10, w + 60, 8, red);
  // lanterns hung under the beam
  for (const s of [-1, 1]) lantern(x + (s * w) / 4, y - h + 56, 0.8);
}
/** A holographic carp, swimming through the air. */
function koi(x, y, t, col) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);
  const b = Math.sin(t * 4) * 0.3;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.lineTo(-56, -14 + b * 20);
  ctx.lineTo(-50, 0);
  ctx.lineTo(-56, 14 + b * 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(22, -3, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 1;
  for (let k = -24; k < 26; k += 6) {
    ctx.beginPath();
    ctx.moveTo(k, -11);
    ctx.lineTo(k, 11);
    ctx.stroke();
  }
  ctx.restore();
}
/** A door in a building: shut, or slid open (lit inside) while a robot steps out. */
function door(i, x, y) {
  // tall enough for a man-sized robot (up to DOOR_SCALE) to walk out upright
  const open = G.enemies.some((e) => e.state === 'door' && e.door === i);
  const W = 104,
    H = 200,
    w = W - 12,
    h = H - 10;
  box(x - W / 2, y - H, W, H, '#16141c', 4);
  ctx.fillStyle = open ? '#ffd7a0' : '#2c2a36';
  ctx.fillRect(x - w / 2, y - h, w, h);
  if (open) {
    glow(T.warm, x, y - h / 2, 1.6, 1);
    ctx.fillStyle = '#3a3846';
    ctx.fillRect(x - w / 2, y - h, 14, h);
    ctx.fillRect(x + w / 2 - 14, y - h, 14, h);
  } else {
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x, y);
    // the hazard stripe across the leaves at knee height
    ctx.moveTo(x - w / 2, y - 40);
    ctx.lineTo(x + w / 2, y - 40);
    ctx.stroke();
    ctx.fillStyle = 'rgba(120,230,255,.25)';
    ctx.fillRect(x - w / 2 + 10, y - h + 14, w / 2 - 18, 70);
    ctx.fillRect(x + 8, y - h + 14, w / 2 - 18, 70);
    ctx.fillStyle = 'rgba(255,200,40,.35)';
    for (let k = 0; k < w; k += 16) ctx.fillRect(x - w / 2 + k, y - 34, 8, 10);
  }
  // the light over it, and a Jawacorp sign: their robots come out of here
  ctx.fillStyle = open ? '#ff3b6b' : '#7a1f35';
  ctx.fillRect(x - 24, y - H - 12, 48, 7);
  jawaLogo(x + W / 2 + 18, y - H + 20, 12);
}

// --- the sky ------------------------------------------------------------------------------------

/** Two copies of a parallax strip side by side, scrolled with the camera. */
function strip(img, par, y) {
  const off = -((((G.cam * par) % img.width) + img.width) % img.width);
  ctx.drawImage(img, off, y);
  ctx.drawImage(img, off + img.width, y);
}
/** The night sky, the far city with Jawacorp's tower, the nearer towers; the moon over the
 *  garden. Fixed to the screen, with a little parallax. */
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b0a1a');
  g.addColorStop(0.6, '#2a1740');
  g.addColorStop(1, '#4a1d4c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const dy = -(G.camY - Y_A) * 0.3;
  // the holographic moon over the tower top
  const m = clamp((G.cam - GARDEN_X + 1600) / 900, 0, 1);
  if (m > 0) {
    const mx = W * 0.72,
      my = 120 + dy * 0.2;
    ctx.save();
    ctx.globalAlpha = m;
    glow(T.pink, mx, my, 0.8, 2.4);
    ctx.fillStyle = '#ffe6f2';
    ctx.beginPath();
    ctx.arc(mx, my, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,120,190,.25)';
    for (let y = my - 70; y < my + 70; y += 6) ctx.fillRect(mx - 70, y, 140, 2);
    ctx.restore();
  }
  strip(T.far, 0.1, 90 + dy * 0.2);
  // Jawacorp's tower over the whole city, its sign lit at the top
  const tx = W * 0.5 + 1500 - G.cam * 0.16,
    wx = (((tx % 4200) + 4200) % 4200) - 1200,
    ty = 30 + dy * 0.25;
  if (wx > -200 && wx < W + 200) {
    ctx.fillStyle = '#100c1c';
    poly([
      [wx - 60, H],
      [wx - 40, ty + 80],
      [wx, ty],
      [wx + 40, ty + 80],
      [wx + 60, H],
    ]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,176,46,.5)';
    for (let y = ty + 120; y < H; y += 22) ctx.fillRect(wx - 3, y, 6, 10);
    jawaLogo(wx, ty + 70, 30);
  }
  strip(T.near, 0.25, 150 + dy * 0.5);
}

// --- the slums -----------------------------------------------------------------------------------

/** The shacks of the slums, stacked two or three high along the back of the street. */
function drawSlums() {
  const x0 = -200,
    x1 = STAIRS[0] + 80;
  if (!view(x0, x1)) return;
  const r = mulberry(5);
  for (let x = x0; x < x1;) {
    const w = 150 + r() * 110,
      floors = 2 + ((r() * 2) | 0),
      fh = 110 + r() * 20,
      tin = T.tin[(r() * 4) | 0],
      seed = (r() * 1000) | 0,
      rolls = [];
    for (let k = 0; k < 16; k++) rolls.push(r());
    if (view(x - 60, x + w + 120)) {
      let q = 0;
      const nx = () => rolls[q++ % rolls.length];
      for (let f = 0; f < floors; f++) {
        const y = Y_A - (f + 1) * fh,
          o = f ? (nx() - 0.5) * 30 : 0,
          ww = w - f * 14;
        ctx.save();
        ctx.fillStyle = tin;
        ctx.translate(x + o, y);
        ctx.fillRect(0, 0, ww, fh);
        ctx.restore();
        ctx.strokeStyle = OL;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + o, y, ww, fh);
        // a window, lit or dark
        const wx = x + o + 20 + nx() * (ww - 90);
        box(wx, y + 22, 46, 36, nx() < 0.55 ? '#ffcf86' : '#1a1a24');
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.fillRect(wx + 22, y + 22, 2, 36);
        if (nx() < 0.5) airCon(x + o + ww - 52, y + 60);
        // the overhanging roof of each floor
        box(x + o - 8, y - 6, ww + 16, 8, '#2d2f36');
      }
      // laundry on a line between this shack and the next
      const ly = Y_A - fh * 1.55;
      cable(x + w - 10, ly, x + w + 90, ly + 4, 10, '#222');
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = ['#d8d2c4', '#3f7ac2', '#c2453f'][(seed + k) % 3];
        ctx.fillRect(x + w + 10 + k * 26, ly + 6 + Math.sin(k) * 2, 16, 22 + (k % 2) * 8);
      }
      // a vertical neon sign, a paper lantern
      if (nx() < 0.6)
        neonSign(x + w - 22, Y_A - fh * floors + 10, 3, nx() < 0.5 ? '#ff4fb4' : '#4fe3ff', seed);
      if (nx() < 0.7) lantern(x + 30 + nx() * (w - 60), Y_A - fh - 4);
    }
    x += w;
  }
  // the cables tangled over the street, high up
  for (let x = Math.floor(G.cam / 220) * 220; x < G.cam + W + 220; x += 220)
    if (x < x1) {
      cable(x, Y_A - 300, x + 220, Y_A - 290, 26);
      cable(x + 30, Y_A - 270, x + 250, Y_A - 300, 18, '#1a1420');
    }
  // Jawacorp's big screens over the slums
  // (in the gaps between the doors, which are tall enough for the biggest robots)
  if (view(1080, 1440)) jawaBoard(1080, Y_A - 290, 360, 110, 900);
  if (view(1630, 1990)) adBoard(1630, Y_A - 290, 360, 110, 'ad', 2000);
  // the metro's entrance: a canopy over the stairs and its sign
  const ex = STAIRS[0] - 30;
  if (view(ex - 60, ex + 220)) {
    box(ex - 40, Y_A - 170, 260, 18, '#3b4552');
    for (const px of [ex - 30, ex + 200]) box(px, Y_A - 152, 10, 152, '#2b333d');
    box(ex + 50, Y_A - 236, 70, 66, '#1c2a3a', 3);
    ctx.save();
    ctx.font = `900 46px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5fe0ff';
    if (!APP.lowFx) {
      ctx.shadowColor = '#5fe0ff';
      ctx.shadowBlur = 14;
    }
    ctx.fillText('M', ex + 85, Y_A - 186);
    ctx.restore();
  }
}

// --- the metro ----------------------------------------------------------------------------------

/** The ceiling over the stairs, the platform and the escalator (the street is above it). */
const ceil = (x) => (x < STAIRS[1] || x > ESCAL[0] ? topY(x) - 270 : Y_B - 330);
function drawMetro() {
  const x0 = STAIRS[0],
    x1 = ESCAL[1];
  if (!view(x0, x1)) return;
  const v0 = Math.max(x0, G.cam - 60),
    v1 = Math.min(x1, G.cam + W + 60),
    path = (f, g) => {
      ctx.beginPath();
      for (let x = v0; x <= v1 + 19; x += 20) ctx.lineTo(Math.min(x, v1), f(Math.min(x, v1)));
      for (let x = v1; x >= v0 - 19; x -= 20) ctx.lineTo(Math.max(x, v0), g(Math.max(x, v0)));
      ctx.closePath();
    };
  // the earth and concrete over the tunnel, cut away; the street on top of it
  ctx.fillStyle = '#121119';
  path(
    () => G.camY - 50,
    (x) => ceil(x),
  );
  ctx.fill();
  ctx.fillStyle = '#23252e';
  path(
    () => Y_A - 8,
    () => Y_A + 6,
  );
  ctx.fill();
  // the tiled wall, a red stripe along it
  ctx.fillStyle = '#5c6670';
  path(
    (x) => ceil(x) + 30,
    (x) => topY(x) + 2,
  );
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,36,44,.25)';
  ctx.lineWidth = 1;
  for (let x = Math.ceil(v0 / 24) * 24; x < v1; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, ceil(x) + 30);
    ctx.lineTo(x, topY(x));
    ctx.stroke();
  }
  ctx.fillStyle = '#d6352a';
  path(
    (x) => topY(x) - 150,
    (x) => topY(x) - 136,
  );
  ctx.fill();
  // the ceiling's edge and its strip lights
  ctx.fillStyle = '#2a2f38';
  path(
    (x) => ceil(x),
    (x) => ceil(x) + 30,
  );
  ctx.fill();
  for (let x = Math.ceil(v0 / 200) * 200; x < v1; x += 200) {
    ctx.fillStyle = 'rgba(255,248,220,.95)';
    ctx.fillRect(x, ceil(x) + 30, 110, 6);
    glow(T.cyan, x + 55, ceil(x) + 40, 0.25, 1);
  }
  // on the platform: the track bed at the back, the trains, pillars, posters
  const p0 = Math.max(STAIRS[1] + 40, v0),
    p1 = Math.min(ESCAL[0] - 40, v1);
  if (p1 <= p0) return;
  ctx.fillStyle = '#1a1c22';
  ctx.fillRect(p0, Y_B - 110, p1 - p0, 110);
  ctx.fillStyle = '#8a8f96';
  for (const y of [Y_B - 18, Y_B - 8]) ctx.fillRect(p0, y, p1 - p0, 3);
  train(STAIRS[1] + 40, ESCAL[0] - 40);
  for (let x = Math.ceil((p0 - 300) / 320) * 320; x < p1; x += 320) {
    if (x < STAIRS[1] + 40 || x > ESCAL[0] - 60) continue;
    box(x - 18, Y_B - 300, 36, 300, '#3e454e');
    const k = (x / 320) % 3;
    if (k === 1) {
      // a Jawacorp poster on the wall between the pillars
      box(x + 70, Y_B - 260, 130, 90, '#1b1530');
      jawaLogo(x + 106, Y_B - 215, 26);
      ctx.fillStyle = '#ffe9c2';
      ctx.textAlign = 'left';
      ctx.font = `900 14px ${FONT}`;
      ctx.fillText('JAWA', x + 138, Y_B - 220);
      ctx.fillText('CORP', x + 138, Y_B - 204);
    } else if (k === 2) {
      // the station's name in its own script
      box(x + 60, Y_B - 250, 170, 50, '#f2f2ee');
      ctx.strokeStyle = '#d6352a';
      ctx.lineWidth = 4;
      for (let q = 0; q < 4; q++) glyph(x + 90 + q * 36, Y_B - 225, 20, 40 + q);
    }
  }
  // the concourse: ticket gates and a big screen
  if (view(HALL_X - 300, HALL_X + 600)) {
    jawaBoard(HALL_X - 220, Y_B - 300, 300, 100, 77);
    for (let k = 0; k < 5; k++) {
      const gx = HALL_X + 120 + k * 70;
      box(gx, Y_B - 60, 22, 60, '#a0a8b2');
      ctx.fillStyle = k % 2 ? '#4fe3ff' : '#7dff8a';
      ctx.fillRect(gx + 6, Y_B - 54, 10, 6);
    }
  }
}
/** A train rushing through the station now and then, behind the platform. */
function train(p0, p1) {
  const period = 12,
    t = G.time % period;
  if (t > 3) return;
  const tx = p1 + 300 - (t / 3) * (p1 - p0 + 2400);
  ctx.save();
  ctx.beginPath();
  ctx.rect(p0, Y_B - 260, p1 - p0, 260);
  ctx.clip();
  for (let c = 0; c < 4; c++) {
    const x = tx + c * 460;
    if (x > G.cam + W + 40 || x + 440 < G.cam - 40) continue;
    box(x, Y_B - 200, 440, 170, '#c9ccd2', 3);
    ctx.fillStyle = '#d6352a';
    ctx.fillRect(x, Y_B - 82, 440, 12);
    for (let k = 0; k < 6; k++) box(x + 18 + k * 70, Y_B - 176, 50, 60, '#2a3a4c');
    ctx.fillStyle = 'rgba(255,240,200,.4)';
    for (let k = 0; k < 6; k++) ctx.fillRect(x + 22 + k * 70, Y_B - 172, 42, 8);
  }
  ctx.restore();
}

// --- the avenue, the bridge, the fire stairs ------------------------------------------------------

/** The avenue of arches: shops with curtains under towers, footbridges between the towers,
 *  red arches over the way, cherry trees, stone lanterns, holographic carp. */
function drawAvenue() {
  const x0 = ESCAL[1] - 80,
    x1 = BRIDGE[0] + 40;
  if (!view(x0, x1)) return;
  const r = mulberry(9);
  // the towers behind, with footbridges between them
  for (let x = x0; x < x1;) {
    const w = 220 + r() * 120,
      h = 520 + r() * 200,
      col = ['#231e36', '#2a2340', '#1f2236'][(r() * 3) | 0],
      bridge = r() < 0.6,
      by = Y_A - 330 - r() * 120,
      lit = mulberry((x * 7) | 0);
    if (view(x, x + w + 150)) {
      box(x, Y_A - h, w, h - 150, col);
      for (let wy = Y_A - h + 20; wy < Y_A - 180; wy += 28)
        for (let wx = x + 14; wx < x + w - 20; wx += 24) {
          ctx.fillStyle = lit() < 0.35 ? 'rgba(255,214,140,.55)' : 'rgba(10,10,24,.5)';
          ctx.fillRect(wx, wy, 12, 16);
        }
      if (bridge) {
        // a glass footbridge to the next tower
        box(x + w - 10, by, 140, 34, 'rgba(120,200,255,.25)');
        ctx.fillStyle = 'rgba(255,255,255,.2)';
        ctx.fillRect(x + w, by + 4, 120, 4);
      }
    }
    x += w + 40;
  }
  // the shops along the street: a curtain (noren) in the door, a sign over it
  for (let x = x0, i = 0; x < x1; x += 260, i++) {
    if (!view(x, x + 260)) continue;
    box(x + 10, Y_A - 150, 240, 150, i % 2 ? '#3a2a2a' : '#2c3036');
    box(x + 4, Y_A - 166, 252, 18, '#1a1414');
    ctx.fillStyle = i % 3 ? '#1e3f6e' : '#7a1f2a';
    for (let k = 0; k < 4; k++) ctx.fillRect(x + 150 + k * 22, Y_A - 146, 18, 56);
    box(x + 26, Y_A - 128, 100, 70, 'rgba(255,214,150,.6)');
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = i % 2 ? '#ff4fb4' : '#4fe3ff';
    ctx.lineWidth = 3;
    ctx.globalAlpha = flick(i);
    for (let k = 0; k < 3; k++) glyph(x + 60 + k * 50, Y_A - 196, 22, i * 3 + k);
    ctx.restore();
  }
  // the arches over the way, a cherry tree and a stone lantern between them
  for (let x = ARCH_X + 320; x < x1 - 200; x += 640) {
    if (!view(x - 320, x + 400)) continue;
    sakura(x + 300, Y_A - 4, 1.3, x);
    toro(x - 240, Y_A - 2);
    torii(x, Y_A, 300, 330);
  }
  // holographic carp drifting over the avenue
  for (let k = 0; k < 4; k++) {
    const kx = ARCH_X + 400 + k * 480 + Math.sin(G.time * 0.4 + k) * 120,
      ky = Y_A - 380 - (k % 2) * 60 + Math.sin(G.time * 1.3 + k * 2) * 18;
    if (view(kx - 60, kx + 60)) koi(kx, ky, G.time + k, k % 2 ? '#ff8a3c' : '#5fd0ff');
  }
  // an advert high on a tower
  if (view(7190, 7570)) adBoard(7190, Y_A - 330, 380, 120, 'meme', 5);
}
/** The bridge: its railing, the expressway's lights beyond, the pylons and their cables. */
function drawBridge() {
  const [x0, x1] = BRIDGE;
  if (!view(x0 - 100, x1 + 100)) return;
  // the expressway further off, its traffic streaming
  ctx.fillStyle = '#1a1626';
  ctx.fillRect(x0 - 100, Y_A - 70, x1 - x0 + 200, 26);
  for (let k = 0; k < 10; k++) {
    const u = (G.time * (300 + k * 40) + k * 211) % (x1 - x0 + 400),
      dir = k % 2 ? 1 : -1,
      cx = dir > 0 ? x0 - 200 + u : x1 + 200 - u;
    ctx.fillStyle = dir > 0 ? 'rgba(255,240,200,.85)' : 'rgba(255,70,70,.85)';
    ctx.fillRect(cx, Y_A - 62 + (k % 3) * 6, 22, 3);
  }
  // the pylons and their cables
  for (const px of [x0 + 160, x1 - 160]) {
    box(px - 14, Y_A - 380, 28, 380, '#3a3f4c');
    ctx.strokeStyle = '#8a92a0';
    ctx.lineWidth = 2;
    for (let k = 1; k <= 6; k++) {
      ctx.beginPath();
      ctx.moveTo(px, Y_A - 370 + k * 10);
      ctx.lineTo(px - k * 70, Y_A - 30);
      ctx.moveTo(px, Y_A - 370 + k * 10);
      ctx.lineTo(px + k * 70, Y_A - 30);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff3b4b';
    ctx.beginPath();
    ctx.arc(px, Y_A - 388, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // the railing along the back of the bridge
  ctx.fillStyle = '#2b2f3a';
  ctx.fillRect(x0 - 20, Y_A - 40, x1 - x0 + 40, 8);
  ctx.fillRect(x0 - 20, Y_A - 16, x1 - x0 + 40, 6);
  for (let x = x0; x <= x1; x += 40) ctx.fillRect(x - 2, Y_A - 40, 4, 40);
}
/** The fire stairs: a brick wall with zig-zag iron stairs going up it. */
function drawFire() {
  const [x0, x1] = FIRE,
    a = BRIDGE[1] - 20,
    b = x1 + 40;
  if (!view(a, b)) return;
  ctx.fillStyle = '#3c2a2a';
  ctx.beginPath();
  ctx.moveTo(a, Y_A);
  for (let x = x0; x <= b; x += 20) ctx.lineTo(x, topY(x));
  ctx.lineTo(b, Y_R - 300);
  ctx.lineTo(a, Y_R - 300);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 1;
  for (let y = Y_R - 300; y < Y_A; y += 14) {
    ctx.beginPath();
    ctx.moveTo(a, y);
    ctx.lineTo(b, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#1b1b22';
  ctx.fillStyle = '#1b1b22';
  ctx.lineWidth = 4;
  for (let k = 0; k < 5; k++) {
    const y = Y_A - 60 - k * 70,
      s = k % 2 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(x0 - 100 * s, y);
    ctx.lineTo(x0 + 100 * s, y - 70);
    ctx.stroke();
    ctx.fillRect(x0 - 140, y - 4, 280, 6);
  }
  neonSign(x0 + 260, Y_A - 380, 4, '#4fe3ff', 61);
}

// --- the roofs and the garden ---------------------------------------------------------------------

/** On a roof a door is in a little stairwell hut, a water tank beside it. */
function hut(x, y) {
  box(x - 82, y - 236, 164, 236, '#2e2c3a');
  box(x - 94, y - 250, 188, 16, '#3a3848');
  box(x + 112, y - 120, 60, 90, '#3b3f4a');
  ctx.fillStyle = '#2a2d36';
  for (const lx of [x + 118, x + 162]) ctx.fillRect(lx, y - 30, 5, 30);
}
/** The things on the roofs: aerials, dishes, air-conditioner blocks, billboards on their
 *  frames, a low parapet along the back. */
function drawRoofs() {
  const x1 = GARDEN_X;
  if (!view(FIRE[1] - 20, x1)) return;
  for (const [a, b0] of L3.ROOFS) {
    const b = Math.min(b0, x1 - 60);
    if (b <= a || !view(a, b)) continue;
    box(a, Y_R - 18, b - a, 18, '#3b3e48');
    const r = mulberry(a);
    for (let x = a + 60; x < b - 120; x += 180 + r() * 120) {
      const k = r();
      if (k < 0.3) {
        // an aerial with a blinking light
        ctx.fillStyle = '#20222a';
        ctx.fillRect(x, Y_R - 200, 4, 182);
        ctx.fillRect(x - 20, Y_R - 170, 44, 3);
        ctx.fillRect(x - 14, Y_R - 140, 32, 3);
        if (Math.floor(G.time * 2 + x) % 2) {
          ctx.fillStyle = '#ff3b4b';
          ctx.beginPath();
          ctx.arc(x + 2, Y_R - 204, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (k < 0.55) {
        // a dish
        ctx.fillStyle = '#9aa0aa';
        ctx.strokeStyle = OL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, Y_R - 60, 28, 34, -0.5, -Math.PI / 2, Math.PI / 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#20222a';
        ctx.fillRect(x - 3, Y_R - 40, 6, 22);
      } else if (k < 0.8) {
        // an air-conditioner block, its fan turning
        box(x - 40, Y_R - 70, 80, 52, '#757c86');
        ctx.save();
        ctx.translate(x, Y_R - 44);
        ctx.rotate(G.time * 8);
        ctx.fillStyle = '#2b2f36';
        for (let q = 0; q < 3; q++) {
          ctx.rotate((Math.PI * 2) / 3);
          ctx.fillRect(-3, 0, 6, 18);
        }
        ctx.restore();
      }
    }
  }
  // billboards on their iron frames (Jawacorp's, and one serval milk), high over the roofs
  for (const bx of [10420, 11380, 12240]) {
    if (!view(bx - 40, bx + 460)) continue;
    ctx.strokeStyle = '#20222a';
    ctx.lineWidth = 5;
    for (const fx of [bx + 40, bx + 380]) {
      ctx.beginPath();
      ctx.moveTo(fx, Y_R - 18);
      ctx.lineTo(fx, Y_R - 170);
      ctx.stroke();
    }
    if (bx === 11380) adBoard(bx, Y_R - 300, 420, 130, 'milk', bx);
    else jawaBoard(bx, Y_R - 300, 420, 130, bx);
  }
}
/** The garden on the tower: a pagoda, cherry trees, stone lanterns, a red fence, an arch. */
function drawGarden() {
  const x0 = GARDEN_X - 60;
  if (!view(x0, END_X + 100)) return;
  ctx.fillStyle = '#7a2420';
  ctx.fillRect(x0, Y_R - 40, END_X - x0 + 100, 8);
  for (let x = x0; x < END_X + 100; x += 30) ctx.fillRect(x, Y_R - 40, 6, 40);
  pagoda(GARDEN_X + 640, Y_R - 4);
  for (const [x, s] of [
    [GARDEN_X + 150, 1.4],
    [GARDEN_X + 1060, 1.2],
  ])
    sakura(x, Y_R - 2, s, x);
  for (const x of [GARDEN_X + 380, GARDEN_X + 900]) toro(x, Y_R - 2);
  torii(GARDEN_X + 10, Y_R, 240, 290);
}
/** A five-storey pagoda. */
function pagoda(x, y) {
  let w = 220,
    yy = y;
  for (let k = 0; k < 5; k++) {
    const h = 60 - k * 4;
    box(x - w / 2 + 24, yy - h, w - 48, h, '#7a2a24');
    ctx.fillStyle = 'rgba(255,214,150,.6)';
    for (let q = -1; q <= 1; q++) ctx.fillRect(x + q * 26 - 8, yy - h + 14, 16, 22);
    ctx.fillStyle = '#1e1a1e';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 20, yy - h + 6);
    ctx.quadraticCurveTo(x, yy - h - 10, x + w / 2 + 20, yy - h + 6);
    ctx.lineTo(x + w / 2 - 10, yy - h - 18);
    ctx.lineTo(x - w / 2 + 10, yy - h - 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    yy -= h + 18;
    w *= 0.84;
  }
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(x - 3, yy - 70, 6, 70);
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.arc(x, yy - 12 - k * 12, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- the floor and the gaps ---------------------------------------------------------------------

/** A gap between two roofs: the drop to the street far below, its lights. */
function pit(p) {
  const x0 = p[0][0],
    x1 = p[1][0];
  if (!view(x0, x1)) return;
  const g = ctx.createLinearGradient(0, Y_R, 0, G.camY + H);
  g.addColorStop(0, '#0d0b18');
  g.addColorStop(1, '#3a1448');
  ctx.fillStyle = g;
  ctx.fillRect(x0, Y_R - 20, x1 - x0, G.camY + H - Y_R + 24);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, Y_R, x1 - x0, G.camY + H - Y_R);
  ctx.clip();
  // the street far below: car lights streaking along it, the glow of the signs
  glow(T.pink, (x0 + x1) / 2, G.camY + H - 10, 0.6, 1.2);
  for (let k = 0; k < 8; k++) {
    const y = Y_R + DEPTH + 30 + k * 12,
      u = (G.time * (90 + k * 30) + k * 137) % (x1 - x0 + 200);
    ctx.fillStyle = k % 2 ? 'rgba(255,80,80,.7)' : 'rgba(255,240,200,.7)';
    ctx.fillRect(x0 - 100 + u, y, 20, 3);
  }
  ctx.restore();
  // the walls of the two buildings going down, windows lit in them
  for (const [wx, s] of [
    [x0, 1],
    [x1 - 16, -1],
  ]) {
    ctx.fillStyle = '#1a1826';
    ctx.fillRect(wx, Y_R - 18, 16, G.camY + H - Y_R + 22);
    ctx.fillStyle = 'rgba(255,214,140,.5)';
    for (let y = Y_R + 30; y < G.camY + H; y += 40) ctx.fillRect(wx + (s > 0 ? 4 : 6), y, 6, 12);
  }
}
/** Which floor texture goes where. */
function floorPattern(cx) {
  if (cx < SLUMS_END) return T.patterns.wet;
  if (cx < ESCAL[1] - 100) return T.patterns.tiles;
  if (cx < FIRE[1]) return T.patterns.stone;
  return T.patterns.roof;
}
function drawFloors() {
  for (const f of FLOOR) {
    const xs = f.map((p) => p[0]),
      ys = f.map((p) => p[1]),
      lo = Math.min(...xs),
      hi = Math.max(...xs);
    if (!view(lo, hi, Math.min(...ys), Math.max(...ys))) continue;
    if (lo < GARDEN_X && hi > GARDEN_X) {
      // the tower top: concrete, then the garden's gravel
      ctx.save();
      poly(f);
      ctx.clip();
      ctx.fillStyle = T.patterns.roof;
      ctx.fillRect(lo, Y_R - 10, GARDEN_X - lo, DEPTH + 40);
      ctx.fillStyle = T.patterns.gravel;
      ctx.fillRect(GARDEN_X, Y_R - 10, hi - GARDEN_X, DEPTH + 40);
      ctx.restore();
    } else {
      ctx.fillStyle = floorPattern((lo + hi) / 2);
      poly(f);
      ctx.fill();
    }
    // the front edge: a kerb, or the roof's parapet, and the wall under it
    const fr = f.slice(2);
    ctx.fillStyle = lo > FIRE[1] - 40 ? '#2b2e36' : '#15161c';
    ctx.beginPath();
    ctx.moveTo(fr[1][0], fr[1][1]);
    ctx.lineTo(fr[0][0], fr[0][1]);
    ctx.lineTo(fr[0][0], fr[0][1] + 400);
    ctx.lineTo(fr[1][0], fr[1][1] + 400);
    ctx.closePath();
    ctx.fill();
  }
  // steps down into the metro, the escalator's moving steps, the fire stairs' treads
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 2;
  for (const [a, b, move] of [
    [STAIRS[0], STAIRS[1], 0],
    [ESCAL[0], ESCAL[1], 1],
    [FIRE[0], FIRE[1], 0],
  ]) {
    if (!view(a, b)) continue;
    const off = move ? (G.time * 30) % 24 : 0;
    for (let x = a + off; x < b; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, topY(x) + 4);
      ctx.lineTo(x, topY(x) + 186);
      ctx.stroke();
    }
    if (move) {
      // its glass sides
      ctx.fillStyle = 'rgba(150,220,255,.18)';
      poly([
        [a, topY(a) - 50],
        [b, topY(b) - 50],
        [b, topY(b)],
        [a, topY(a)],
      ]);
      ctx.fill();
    }
  }
  // a shade under the back edge
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  for (const f of FLOOR) {
    const [a, b] = f;
    poly([a, b, [b[0], b[1] + 18], [a[0], a[1] + 18]]);
    ctx.fill();
  }
}

export function drawBG3() {
  if (!T) init();
  ctx.save();
  drawSky();
  ctx.translate(-G.cam, -G.camY);
  drawSlums();
  drawMetro();
  drawAvenue();
  drawBridge();
  drawFire();
  drawRoofs();
  drawGarden();
  DOORS.forEach(([x, y], i) => {
    if (!view(x - 110, x + 180)) return;
    if (x > FIRE[1]) hut(x, y);
    door(i, x, y);
  });
  drawFloors();
  for (const p of PITS) pit(p);
  ctx.restore();
}

// --- in front of everyone -------------------------------------------------------------------------

/** How much rain falls where the camera is: the slums only, fading out at the metro stairs. */
export const rainAt = (cam = G.cam) => clamp((SLUMS_END - 200 - cam - W / 2) / 400, 0, 1);
/** The rain over the slums, in front of everyone; a gloom in the metro; petals in the garden. */
export function drawFront3() {
  if (!T) init();
  const k = rainAt(),
    t = G.time;
  if (k > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(180,200,255,${0.35 * k})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < (APP.lowFx ? 60 : 160); i++) {
      // each drop falls along its own line, over and over (no chance used: replays agree)
      const sx = (i * 97.13) % W,
        sp = 900 + ((i * 53) % 300),
        y = (t * sp + i * 71) % (H + 60),
        x = (sx - y * 0.2 - G.cam * 0.6 + W * 4) % W;
      ctx.moveTo(x, y - 60);
      ctx.lineTo(x - 6, y - 30);
    }
    ctx.stroke();
    // splashes on the street
    ctx.fillStyle = `rgba(200,220,255,${0.4 * k})`;
    for (let i = 0; i < (APP.lowFx ? 10 : 30); i++) {
      const u = (t * 3 + i * 0.37) % 1,
        x = (i * 211.7) % W,
        y = 380 + ((i * 37) % 150);
      ctx.fillRect(x - u * 6, y - u * 4, 2, 2);
      ctx.fillRect(x + u * 6, y - u * 4, 2, 2);
    }
    ctx.fillStyle = `rgba(20,24,40,${0.18 * k})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // under the city: the metro is darker at the edges
  const m = clamp((G.camY - Y_A) / (Y_B - Y_A), 0, 1);
  if (m > 0) {
    const g = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.4, W / 2, H * 0.55, H);
    g.addColorStop(0, 'rgba(6,8,14,0)');
    g.addColorStop(1, `rgba(6,8,14,${0.5 * m})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // cherry petals drifting over the garden
  const p = clamp((G.cam - GARDEN_X + 900) / 400, 0, 1);
  if (p > 0) {
    ctx.fillStyle = `rgba(255,183,213,${0.8 * p})`;
    for (let i = 0; i < (APP.lowFx ? 14 : 40); i++) {
      const sp = 40 + ((i * 17) % 40),
        y = (t * sp + i * 61) % (H + 20),
        x = ((((i * 131.3 - t * 50 - G.cam * 0.3) % (W + 40)) + W + 40) % (W + 40)) - 20;
      ctx.save();
      ctx.translate(x + Math.sin(t * 2 + i) * 12, y);
      ctx.rotate(t * 2 + i);
      ctx.fillRect(-3, -1.5, 6, 3);
      ctx.restore();
    }
  }
}
