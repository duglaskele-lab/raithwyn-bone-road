// Procedural scenery of Old Quarry (stage 2): a mining town at sunset, the street sloping
// down to the quarry, the quarry road down to the mine and the tunnels under the town.
// Everything is drawn in road coordinates (see level2.js); the textures and the houses are
// painted once into offscreen canvases.
import { FONT, H, OL, TAU, W } from './config.js';
import { mulberry } from './util.js';
import { G, P } from './state.js';
import { ctx } from './gfx.js';
import { mk } from './background.js';
import { t } from './i18n.js';
import { DEPTH, FLOOR, L2, shaftY, slantY } from './level2.js';

const { SLANT, QUARRY, MINE_Y, SHAFT, DEEP_Y, END_X, GATE_X, PORTAL_X, HALL_X } = L2;
let T = null;

// --- textures ------------------------------------------------------------------------------

function speckle(g, w, h, r, n, cols, s0, s1) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[(r() * cols.length) | 0];
    const s = s0 + r() * (s1 - s0);
    g.fillRect(r() * w, r() * h, s, s * (0.5 + r() * 0.6));
  }
}
function stones(g, w, h, r, n, col, dk, s0, s1) {
  for (let i = 0; i < n; i++) {
    const x = r() * w,
      y = r() * h,
      a = s0 + r() * (s1 - s0),
      b = a * (0.5 + r() * 0.3);
    g.fillStyle = dk;
    g.beginPath();
    g.ellipse(x + 1, y + 1.5, a, b, 0, 0, TAU);
    g.fill();
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(x, y, a, b, 0, 0, TAU);
    g.fill();
  }
}
function makeTextures() {
  const P = {};
  // the dusty street: sand, pebbles, cart ruts and hoof prints
  P.road = mk(320, 166, (g, w, h) => {
    const r = mulberry(41);
    g.fillStyle = '#c69a68';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 900, ['rgba(120,80,50,.18)', 'rgba(255,230,190,.16)'], 1, 3);
    for (const y of [52, 66, 118, 132]) {
      g.fillStyle = 'rgba(110,72,44,.16)';
      g.fillRect(0, y, w, 5);
      g.fillStyle = 'rgba(255,226,180,.12)';
      g.fillRect(0, y + 5, w, 2);
    }
    stones(g, w, h, r, 26, '#a98c70', 'rgba(70,46,30,.4)', 2, 5);
    g.fillStyle = 'rgba(100,64,40,.2)';
    for (let i = 0; i < 14; i++) {
      const x = r() * w,
        y = 20 + r() * (h - 40);
      g.beginPath();
      g.arc(x, y, 3, 0.2, Math.PI - 0.2);
      g.fill();
    }
  });
  // packed dirt in the quarry
  P.dirt = mk(256, 256, (g, w, h) => {
    const r = mulberry(43);
    g.fillStyle = '#a7714a';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 1100, ['rgba(80,44,24,.2)', 'rgba(240,190,140,.14)'], 1, 3);
    stones(g, w, h, r, 30, '#8f6a50', 'rgba(60,34,20,.45)', 2, 6);
  });
  // sandstone in red and orange layers: the quarry's walls and the canyon
  P.strata = mk(512, 384, (g, w, h) => {
    const r = mulberry(47),
      cols = ['#8e4a32', '#a85a38', '#b86e44', '#9a5136', '#c47f50', '#7e3f2c', '#a96440'];
    let y = 0,
      i = 0;
    while (y < h) {
      const bh = 18 + r() * 34;
      g.fillStyle = cols[i++ % cols.length];
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.012 + i) * 4);
      g.lineTo(w, y + bh + 6);
      g.lineTo(0, y + bh + 6);
      g.fill();
      y += bh;
    }
    speckle(g, w, h, r, 1400, ['rgba(40,16,8,.16)', 'rgba(255,210,160,.1)'], 1, 3);
    g.strokeStyle = 'rgba(50,20,12,.4)';
    g.lineWidth = 1.5;
    for (let k = 0; k < 18; k++) {
      let x = r() * w,
        yy = r() * h;
      g.beginPath();
      g.moveTo(x, yy);
      for (let s = 0; s < 4; s++) {
        x += (r() - 0.5) * 14;
        yy += 6 + r() * 12;
        g.lineTo(x, yy);
      }
      g.stroke();
    }
  });
  // the rock of the mine: dark, lumpy, with glints of ore
  P.rock = mk(320, 320, (g, w, h) => {
    const r = mulberry(53);
    g.fillStyle = '#3a2c26';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = r() * w,
        y = r() * h,
        a = 10 + r() * 26;
      g.fillStyle = r() < 0.5 ? 'rgba(80,62,50,.5)' : 'rgba(20,14,12,.45)';
      g.beginPath();
      g.moveTo(x - a, y);
      g.lineTo(x - a * 0.4, y - a * 0.7);
      g.lineTo(x + a * 0.6, y - a * 0.5);
      g.lineTo(x + a, y + a * 0.2);
      g.lineTo(x + a * 0.2, y + a * 0.6);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(14,10,8,.4)';
      g.lineWidth = 1;
      g.stroke();
    }
    speckle(g, w, h, r, 700, ['rgba(0,0,0,.2)', 'rgba(140,120,100,.12)'], 1, 3);
    for (let i = 0; i < 16; i++) {
      g.fillStyle = r() < 0.7 ? '#e8c35a' : '#c4e0ea';
      g.fillRect(r() * w, r() * h, 2, 2);
    }
  });
  // the floor of the tunnels
  P.mfloor = mk(256, 166, (g, w, h) => {
    const r = mulberry(59);
    g.fillStyle = '#5a4638';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 900, ['rgba(20,12,8,.25)', 'rgba(180,150,120,.12)'], 1, 3);
    stones(g, w, h, r, 30, '#6f5e52', 'rgba(20,12,8,.5)', 2, 6);
  });
  P.patterns = {};
  for (const k of ['road', 'dirt', 'strata', 'rock', 'mfloor'])
    P.patterns[k] = ctx.createPattern(P[k], 'repeat');
  return P;
}

// --- the sky (screen space) -----------------------------------------------------------------

function makeSky() {
  const sky = mk(W, H, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2b1d3a');
    gr.addColorStop(0.35, '#6e3446');
    gr.addColorStop(0.62, '#c8603e');
    gr.addColorStop(0.8, '#f0a35c');
    gr.addColorStop(1, '#f7cf86');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    const r = mulberry(61);
    g.fillStyle = '#fff2d8';
    for (let i = 0; i < 40; i++) {
      g.globalAlpha = 0.2 + r() * 0.5;
      g.fillRect(r() * w, r() * 120, 1.3, 1.3);
    }
    g.globalAlpha = 1;
    // the setting sun
    const sx = 640,
      sy = 300,
      sg = g.createRadialGradient(sx, sy, 30, sx, sy, 300);
    sg.addColorStop(0, 'rgba(255,236,170,.7)');
    sg.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = sg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffe9b0';
    g.beginPath();
    g.arc(sx, sy, 64, 0, TAU);
    g.fill();
    // long thin clouds lit from below
    for (const [x, y, a, b] of [
      [180, 110, 230, 7],
      [520, 160, 300, 6],
      [820, 90, 200, 6],
      [330, 210, 260, 5],
      [760, 230, 220, 5],
    ]) {
      g.fillStyle = 'rgba(80,36,60,.55)';
      g.beginPath();
      g.ellipse(x, y, a, b, 0, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(255,170,110,.45)';
      g.beginPath();
      g.ellipse(x + 10, y + 3, a * 0.8, b * 0.45, 0, 0, TAU);
      g.fill();
    }
  });
  // far mesas and buttes
  const mesa = (seed, col, base, hmax, w = 1600) =>
    mk(w, 360, (g, cw, ch) => {
      const r = mulberry(seed);
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, ch);
      let x = 0,
        y = base;
      g.lineTo(0, y);
      while (x < cw) {
        if (r() < 0.35) {
          // a flat-topped mesa
          const top = base - hmax * (0.5 + r() * 0.5),
            wide = 120 + r() * 220;
          g.lineTo(x + 20, top + 10);
          g.lineTo(x + 34, top);
          g.lineTo(x + wide - 34, top);
          g.lineTo(x + wide - 20, top + 12);
          g.lineTo(x + wide, base);
          x += wide;
        } else if (r() < 0.2) {
          // a lone butte
          const top = base - hmax * (0.8 + r() * 0.4);
          g.lineTo(x + 14, top + 6);
          g.lineTo(x + 20, top);
          g.lineTo(x + 46, top);
          g.lineTo(x + 52, top + 8);
          g.lineTo(x + 66, base);
          x += 66;
        } else {
          x += 40 + r() * 80;
          g.lineTo(x, base - r() * 18);
        }
      }
      g.lineTo(cw, ch);
      g.fill();
      if (seed === 67) {
        // cacti, a windmill and a water tower on the nearer hills
        g.fillStyle = col;
        for (let i = 0; i < 14; i++) cactus(g, r() * cw, base + 4, 0.5 + r() * 0.5);
        windmill(g, 420, base + 2);
        tower(g, 1180, base + 2);
      }
    });
  return { sky, far: mesa(65, '#6a3148', 250, 120), near: mesa(67, '#4a2234', 300, 70) };
}
function cactus(g, x, y, s) {
  g.fillRect(x - 4 * s, y - 46 * s, 8 * s, 46 * s);
  g.fillRect(x - 16 * s, y - 30 * s, 12 * s, 6 * s);
  g.fillRect(x - 16 * s, y - 40 * s, 6 * s, 14 * s);
  g.fillRect(x + 4 * s, y - 24 * s, 12 * s, 6 * s);
  g.fillRect(x + 10 * s, y - 36 * s, 6 * s, 16 * s);
}
function windmill(g, x, y) {
  g.lineWidth = 3;
  g.strokeStyle = g.fillStyle;
  g.beginPath();
  g.moveTo(x - 14, y);
  g.lineTo(x - 3, y - 80);
  g.moveTo(x + 14, y);
  g.lineTo(x + 3, y - 80);
  g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    g.beginPath();
    g.moveTo(x, y - 84);
    g.lineTo(x + Math.cos(a) * 20, y - 84 + Math.sin(a) * 20);
    g.stroke();
  }
  g.fillRect(x, y - 88, 26, 6);
}
function tower(g, x, y) {
  g.lineWidth = 3;
  g.strokeStyle = g.fillStyle;
  g.beginPath();
  for (const dx of [-16, 16]) {
    g.moveTo(x + dx, y);
    g.lineTo(x + dx * 0.7, y - 50);
  }
  g.moveTo(x - 16, y);
  g.lineTo(x + 11, y - 50);
  g.stroke();
  g.beginPath();
  g.ellipse(x, y - 70, 24, 22, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.moveTo(x - 26, y - 88);
  g.lineTo(x, y - 104);
  g.lineTo(x + 26, y - 88);
  g.fill();
}

// --- the houses of the town ----------------------------------------------------------------

// [kind, sign, width, height of the false front, body colour, trim colour]
const HOUSES = [
  ['store', 'GENERAL STORE', 300, 220, '#7d5a3c', '#e6d3a6'],
  ['saloon', 'SALOON', 330, 250, '#8a3f2c', '#f0d89a'],
  ['sheriff', 'SHERIFF', 230, 190, '#6b5240', '#e9e0c4'],
  ['bank', 'BANK', 260, 230, '#8d6d4c', '#f3e6c0'],
  ['hotel', 'HOTEL', 320, 270, '#5d6a72', '#e2d6b4'],
  ['undertaker', 'UNDERTAKER', 250, 200, '#3d3640', '#c8c0a8'],
  ['assay', 'ASSAY OFFICE', 260, 200, '#7a6448', '#eadcb6'],
  ['smith', 'BLACKSMITH', 260, 180, '#5a4232', '#d8c49a'],
  ['barber', 'BARBER', 200, 180, '#6f4d50', '#f2e2c0'],
  ['mineoffice', 'MINING CO.', 260, 210, '#6a4a32', '#ead6a0'],
];
function house(spec, seed) {
  const [kind, sign, w, h, body, trim] = spec;
  return mk(w + 20, h + 10, (g) => {
    const r = mulberry(seed),
      x0 = 10,
      top = 10,
      bot = h + 10;
    g.lineJoin = 'round';
    // the false front, with a stepped or curved top
    g.fillStyle = body;
    g.strokeStyle = OL;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x0, bot);
    if (kind === 'saloon' || kind === 'hotel') {
      g.lineTo(x0, top + 40);
      g.lineTo(x0 + w * 0.2, top + 40);
      g.lineTo(x0 + w * 0.2, top + 18);
      g.quadraticCurveTo(x0 + w / 2, top - 10, x0 + w * 0.8, top + 18);
      g.lineTo(x0 + w * 0.8, top + 40);
      g.lineTo(x0 + w, top + 40);
    } else if (kind === 'bank' || kind === 'assay') {
      g.lineTo(x0, top + 20);
      g.lineTo(x0 + w / 2, top);
      g.lineTo(x0 + w, top + 20);
    } else {
      g.lineTo(x0, top + 24);
      g.lineTo(x0 + w * 0.15, top + 24);
      g.lineTo(x0 + w * 0.15, top + 6);
      g.lineTo(x0 + w * 0.85, top + 6);
      g.lineTo(x0 + w * 0.85, top + 24);
      g.lineTo(x0 + w, top + 24);
    }
    g.lineTo(x0 + w, bot);
    g.closePath();
    g.fill();
    g.save();
    g.clip();
    // clapboards (bricks for the bank)
    if (kind === 'bank') {
      g.strokeStyle = 'rgba(40,20,10,.35)';
      g.lineWidth = 1.2;
      for (let y = top; y < bot; y += 10) {
        g.beginPath();
        g.moveTo(x0, y);
        g.lineTo(x0 + w, y);
        g.stroke();
        for (let x = x0 + ((y / 10) % 2) * 12; x < x0 + w; x += 24) {
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x, y + 10);
          g.stroke();
        }
      }
    } else
      for (let y = top; y < bot; y += 9) {
        g.fillStyle = 'rgba(0,0,0,.14)';
        g.fillRect(x0, y + 7, w, 2);
        g.fillStyle = 'rgba(255,230,190,.07)';
        g.fillRect(x0, y, w, 2);
      }
    // weathering
    for (let i = 0; i < 26; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.08)' : 'rgba(255,240,210,.06)';
      g.fillRect(x0 + r() * w, top + r() * h, 10 + r() * 40, 3 + r() * 10);
    }
    g.restore();
    g.strokeStyle = OL;
    g.lineWidth = 3;
    g.stroke();
    // the sign board
    const sw = Math.min(w - 40, sign.length * 15 + 30),
      sx = x0 + (w - sw) / 2,
      sy = top + 42;
    g.fillStyle = '#2a1c16';
    g.fillRect(sx - 3, sy - 3, sw + 6, 34);
    g.fillStyle = trim;
    g.fillRect(sx, sy, sw, 28);
    g.fillStyle = '#3a2416';
    g.font = `900 ${sign.length > 10 ? 15 : 19}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(sign, sx + sw / 2, sy + 15);
    // windows: an upper row (dark glass catching the sunset) and the shop front below
    const win = (x, y, ww, wh) => {
      g.fillStyle = '#2a1c22';
      g.fillRect(x - 3, y - 3, ww + 6, wh + 6);
      const gl = g.createLinearGradient(x, y, x + ww, y + wh);
      gl.addColorStop(0, '#3c2a3a');
      gl.addColorStop(0.5, '#a5584a');
      gl.addColorStop(1, '#2c2030');
      g.fillStyle = gl;
      g.fillRect(x, y, ww, wh);
      g.fillStyle = trim;
      g.fillRect(x + ww / 2 - 1.5, y, 3, wh);
      g.fillRect(x, y + wh / 2 - 1.5, ww, 3);
      if (r() < 0.3) {
        // a broken pane
        g.fillStyle = '#120c10';
        g.beginPath();
        g.moveTo(x + 3, y + 3);
        g.lineTo(x + ww / 2 - 3, y + 4);
        g.lineTo(x + 8, y + wh / 2 - 4);
        g.fill();
      }
    };
    const up = bot - 150;
    if (h > 200) for (let x = x0 + 30; x < x0 + w - 60; x += 76) win(x, up - 10, 40, 46);
    // the door (batwings for the saloon)
    const dx = x0 + w / 2 - 24,
      dy = bot - 88;
    g.fillStyle = '#1a1014';
    g.fillRect(dx - 4, dy - 4, 56, 92);
    if (kind === 'saloon') {
      g.fillStyle = '#c98f52';
      g.fillRect(dx, dy + 22, 23, 40);
      g.fillRect(dx + 25, dy + 22, 23, 40);
      g.strokeStyle = OL;
      g.lineWidth = 2;
      g.strokeRect(dx, dy + 22, 23, 40);
      g.strokeRect(dx + 25, dy + 22, 23, 40);
    } else {
      g.fillStyle = '#4a3020';
      g.fillRect(dx, dy, 48, 88);
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.fillRect(dx + 6, dy + 8, 15, 32);
      g.fillRect(dx + 27, dy + 8, 15, 32);
      g.fillRect(dx + 6, dy + 48, 15, 32);
      g.fillRect(dx + 27, dy + 48, 15, 32);
      g.fillStyle = '#d8b45a';
      g.fillRect(dx + 38, dy + 46, 4, 4);
    }
    for (const wx of [x0 + 22, x0 + w - 92]) if (w > 220) win(wx, bot - 84, 70, 52);
    // a detail of its own
    g.fillStyle = trim;
    if (kind === 'sheriff') {
      star(g, x0 + w - 36, top + 56, 15, '#e8c35a');
    } else if (kind === 'undertaker') {
      // a coffin leaning by the door
      g.fillStyle = '#4b2e22';
      g.beginPath();
      g.moveTo(x0 + 26, bot);
      g.lineTo(x0 + 18, bot - 60);
      g.lineTo(x0 + 30, bot - 82);
      g.lineTo(x0 + 50, bot - 82);
      g.lineTo(x0 + 58, bot - 60);
      g.lineTo(x0 + 52, bot);
      g.closePath();
      g.fill();
      g.strokeStyle = OL;
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = '#c8c0a8';
      g.fillRect(x0 + 36, bot - 66, 4, 30);
      g.fillRect(x0 + 29, bot - 56, 18, 4);
    } else if (kind === 'barber') {
      g.fillStyle = '#f0ece0';
      g.fillRect(x0 + w - 30, bot - 96, 12, 64);
      g.fillStyle = '#c23a3a';
      for (let i = 0; i < 6; i++) g.fillRect(x0 + w - 30, bot - 92 + i * 11, 12, 4);
      g.strokeStyle = OL;
      g.lineWidth = 2;
      g.strokeRect(x0 + w - 30, bot - 96, 12, 64);
    } else if (kind === 'smith') {
      // an anvil and a wagon wheel
      g.fillStyle = '#2c2a2e';
      g.fillRect(x0 + w - 70, bot - 22, 40, 10);
      g.fillRect(x0 + w - 60, bot - 14, 20, 14);
      g.strokeStyle = '#3a2618';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(x0 + 40, bot - 38, 30, 0, TAU);
      g.stroke();
      g.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI;
        g.beginPath();
        g.moveTo(x0 + 40 - Math.cos(a) * 30, bot - 38 - Math.sin(a) * 30);
        g.lineTo(x0 + 40 + Math.cos(a) * 30, bot - 38 + Math.sin(a) * 30);
        g.stroke();
      }
    }
    // wanted posters
    if (r() < 0.7)
      for (let i = 0; i < 1 + ((r() * 2) | 0); i++) {
        const px = x0 + 20 + r() * (w - 60),
          py = bot - 140 + r() * 30;
        g.fillStyle = '#e9dcb8';
        g.fillRect(px, py, 22, 28);
        g.fillStyle = '#5a4030';
        g.fillRect(px + 4, py + 4, 14, 3);
        g.fillRect(px + 6, py + 10, 10, 10);
        g.fillRect(px + 4, py + 22, 14, 2);
      }
  });
}
function star(g, x, y, r, col) {
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * TAU,
      k = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  g.closePath();
  g.fill();
  g.strokeStyle = OL;
  g.lineWidth = 2;
  g.stroke();
}
// Where the houses stand: on Main Street (base on the street's back edge) and stepping down
// the slant. [x, house index]
const STREET = [
  [430, 0],
  [770, 1],
  [1140, 2],
  [1400, 3],
  [1720, 4],
  [2080, 5],
  [2370, 8],
  [2620, 6],
  [2930, 7],
  [3230, 9],
];
const baseY = (x) => (x < SLANT[0] ? 358 : Math.min(slantY(x), slantY(SLANT[1])));

// --- the mine's timber sets and lamps --------------------------------------------------------

function makeTimber() {
  // two posts and a cap over the tunnel, seen from the front
  return mk(200, 330, (g, w, h) => {
    const wood = (x, y, ww, hh) => {
      const gr = g.createLinearGradient(x, 0, x + ww, 0);
      gr.addColorStop(0, '#5a3a22');
      gr.addColorStop(0.5, '#7a5232');
      gr.addColorStop(1, '#4a2e1a');
      g.fillStyle = gr;
      g.fillRect(x, y, ww, hh);
      g.strokeStyle = OL;
      g.lineWidth = 3;
      g.strokeRect(x, y, ww, hh);
      g.strokeStyle = 'rgba(30,16,8,.5)';
      g.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(x + 4 + i * (ww / 4), y + 6);
        g.lineTo(x + 2 + i * (ww / 4), y + hh - 6);
        g.stroke();
      }
    };
    wood(14, 30, 26, h - 30);
    wood(w - 40, 30, 26, h - 30);
    wood(0, 8, w, 30);
    g.fillStyle = '#2a2a2e';
    for (const x of [27, w - 27]) {
      g.fillRect(x - 5, 16, 10, 10);
    }
  });
}
function makeGlow(col, r) {
  return mk(r * 2, r * 2, (g) => {
    const gr = g.createRadialGradient(r, r, 2, r, r, r);
    gr.addColorStop(0, col);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, r * 2, r * 2);
  });
}

function init() {
  T = makeTextures();
  Object.assign(T, makeSky());
  T.houses = HOUSES.map((h, i) => house(h, 900 + i * 7));
  T.timber = makeTimber();
  T.lamp = makeGlow('rgba(255,190,90,.55)', 150);
  T.green = makeGlow('rgba(120,255,90,.5)', 220);
  T.red = makeGlow('rgba(255,60,40,.5)', 120);
}

// --- drawing ---------------------------------------------------------------------------------

const poly = (pts) => {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
};
// The open sky over the town and the quarry rim, in road coordinates.
const SKY = [
  [-3000, -4000],
  [5200, -4000],
  [5200, 430],
  [QUARRY[1] + 60, 430],
  [QUARRY[0] + 140, 520],
  [SLANT[0] + 900, slantY(SLANT[0] + 900) - 120],
  [SLANT[0], 300],
  [-3000, 300],
];
const view = (x0, x1, y0 = -1e9, y1 = 1e9) =>
  x1 > G.cam - 40 && x0 < G.cam + W + 40 && y1 > G.camY - 40 && y0 < G.camY + H + 40;

function drawSky() {
  ctx.save();
  poly(SKY);
  ctx.clip();
  ctx.setTransform(ctx.getTransform().translate(G.cam, G.camY));
  const dy = -G.camY * 0.6;
  ctx.drawImage(T.sky, 0, Math.min(0, dy * 0.2));
  for (const [img, par, off] of [
    [T.far, 0.12, 30],
    [T.near, 0.3, 50],
  ]) {
    const tw = img.width;
    for (let x = -(((G.cam * par) % tw) + tw) % tw; x < W; x += tw)
      ctx.drawImage(img, Math.floor(x), off + dy * par);
  }
  // heat shimmer of dust in the air
  ctx.fillStyle = 'rgba(255,214,150,.08)';
  for (let i = 0; i < 4; i++) {
    const x = ((((i * 380 - G.cam * 0.5 + G.time * 14) % 1520) + 1520) % 1520) - 380;
    ctx.beginPath();
    ctx.ellipse(x, 300 + (i % 2) * 20 + dy * 0.4, 300, 18, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
function drawFloors() {
  for (const i of [3, 4, 5, 0, 1, 2]) {
    const f = FLOOR[i],
      xs = f.map((p) => p[0]),
      ys = f.map((p) => p[1]);
    if (!view(Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys))) continue;
    ctx.fillStyle = T.patterns[i < 2 ? 'road' : i === 2 ? 'dirt' : 'mfloor'];
    poly(f);
    ctx.fill();
    // darker towards the back wall, lighter in front
    const top = Math.min(...ys),
      g = ctx.createLinearGradient(0, top, 0, top + DEPTH);
    g.addColorStop(0, i < 2 ? 'rgba(70,34,20,.28)' : 'rgba(10,6,4,.35)');
    g.addColorStop(0.35, 'rgba(0,0,0,0)');
    g.addColorStop(1, i < 2 ? 'rgba(255,220,170,.1)' : 'rgba(0,0,0,0)');
    if (i !== 2 && i !== 1 && i !== 4) {
      ctx.fillStyle = g;
      poly(f);
      ctx.fill();
    }
  }
  // along the slants: a band of shadow under the back edge
  for (const [x0, x1, y0, y1] of [
    [SLANT[0], SLANT[1], 358, slantY(SLANT[1])],
    [SHAFT[0], SHAFT[1], MINE_Y, shaftY(SHAFT[1])],
  ]) {
    if (!view(x0, x1, y0 - 40, y1 + 200)) continue;
    ctx.fillStyle = 'rgba(30,14,8,.25)';
    poly([
      [x0, y0],
      [x1, y1],
      [x1, y1 + 40],
      [x0, y0 + 40],
    ]);
    ctx.fill();
  }
  quarryFloor();
}
// The quarry road: cart ruts winding down, rubble along the walls, planks and tools.
function quarryFloor() {
  const [x0, x1, y0, y1] = QUARRY;
  if (!view(x0, x1, y0, y1)) return;
  const r = mulberry(71);
  // shade along both walls
  for (const [x, d] of [
    [x0, 1],
    [x1, -1],
  ]) {
    const g = ctx.createLinearGradient(x, 0, x + d * 90, 0);
    g.addColorStop(0, 'rgba(40,16,8,.4)');
    g.addColorStop(1, 'rgba(40,16,8,0)');
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x, x + d * 90), y0, 90, y1 - y0);
  }
  // two cart ruts snaking down
  ctx.strokeStyle = 'rgba(90,46,24,.35)';
  ctx.lineWidth = 7;
  for (const off of [-40, 40]) {
    ctx.beginPath();
    for (let y = y0; y <= y1; y += 20) {
      const x = (x0 + x1) / 2 - 60 + off + Math.sin((y - y0) / 170) * 140;
      y === y0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // rubble heaps by the walls
  for (let i = 0; i < 18; i++) {
    const side = i % 2,
      x = side ? x1 - 20 - r() * 70 : x0 + 20 + r() * 70,
      y = y0 + 60 + r() * (y1 - y0 - 100);
    if (!view(x - 60, x + 60, y - 60, y + 30)) continue;
    for (let k = 0; k < 6; k++) {
      const a = 6 + r() * 12;
      ctx.fillStyle = k % 2 ? '#8a5a3c' : '#6e4430';
      ctx.beginPath();
      ctx.ellipse(x + (r() - 0.5) * 40, y - r() * 14, a, a * 0.7, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,12,6,.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  // planks and a pickaxe left lying about
  for (const [x, y, a] of [
    [3700, 1180, 0.3],
    [4150, 1420, -0.2],
    [3620, 1560, 0.1],
  ]) {
    if (!view(x - 60, x + 60, y - 30, y + 30)) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = '#8a6440';
    ctx.fillRect(-50, -6, 100, 12);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.strokeRect(-50, -6, 100, 12);
    ctx.restore();
  }
  if (view(3980, 4060, 860, 920)) {
    ctx.save();
    ctx.translate(4020, 900);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#6a4428';
    ctx.fillRect(-3, -40, 6, 46);
    ctx.fillStyle = '#7a7a82';
    ctx.beginPath();
    ctx.moveTo(-26, -36);
    ctx.quadraticCurveTo(0, -48, 26, -36);
    ctx.lineTo(0, -42);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}
// The boardwalk along the back of the street, with the posts of the porch roofs.
function boardwalk(x0, x1, y) {
  ctx.fillStyle = '#7a5434';
  ctx.fillRect(x0, y - 34, x1 - x0, 14);
  ctx.fillStyle = '#5a3a24';
  ctx.fillRect(x0, y - 20, x1 - x0, 20);
  ctx.strokeStyle = 'rgba(30,16,8,.55)';
  ctx.lineWidth = 1.5;
  for (let x = x0; x < x1; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y - 34, x1 - x0, 34);
}
function porch(x0, x1, y, h) {
  // the slanted plank roof over the boardwalk, on thin posts
  const ry = y - 34 - h;
  ctx.fillStyle = '#6a4428';
  ctx.beginPath();
  ctx.moveTo(x0 - 6, ry - 18);
  ctx.lineTo(x1 + 6, ry - 18);
  ctx.lineTo(x1 + 12, ry + 6);
  ctx.lineTo(x0 - 12, ry + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(x0 - 10, ry + 6, x1 - x0 + 20, 8);
  for (let x = x0; x <= x1; x += Math.max(60, (x1 - x0) / 4)) {
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(x - 3, ry + 6, 6, h);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 3, ry + 6, 6, h);
  }
}
function drawTown() {
  // the edge of town: a split-rail fence, a cactus and an old wagon wheel
  if (view(-200, GATE_X + 100)) {
    ctx.strokeStyle = '#5a3a22';
    ctx.lineWidth = 6;
    for (let x = -200; x < GATE_X - 20; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, 358);
      ctx.lineTo(x, 300);
      ctx.stroke();
    }
    ctx.lineWidth = 4;
    for (const y of [318, 338]) {
      ctx.beginPath();
      ctx.moveTo(-200, y);
      ctx.lineTo(GATE_X - 20, y + 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#3e5a2c';
    cactus(ctx, 120, 352, 1.4);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
  }
  for (const [x, k] of STREET) {
    const img = T.houses[k],
      y = baseY(x + img.width / 2);
    if (!view(x - 40, x + img.width + 40, y - 400, y + 40)) continue;
    // on the slant the house stands on a stone footing down to the street
    if (x + img.width > SLANT[0]) {
      const l = baseY(x),
        r2 = baseY(x + img.width);
      ctx.fillStyle = '#6e5a4a';
      poly([
        [x, y - 34],
        [x + img.width, y - 34],
        [x + img.width, Math.max(r2, y)],
        [x, Math.max(l, y)],
      ]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,20,14,.6)';
      ctx.lineWidth = 2;
      for (let yy = y - 24; yy < Math.max(l, r2); yy += 12) {
        ctx.beginPath();
        ctx.moveTo(x, yy);
        ctx.lineTo(x + img.width, yy);
        ctx.stroke();
      }
    }
    ctx.drawImage(img, x, y - 34 - img.height + 8);
    boardwalk(x - 4, x + img.width + 4, y);
    porch(x + 14, x + img.width - 14, y, 104);
  }
}
// The welcome arch: two log posts and a board over the road (the front post is drawn over
// everything by drawFront2).
function archPost(x, y0, y1) {
  const gr = ctx.createLinearGradient(x - 12, 0, x + 12, 0);
  gr.addColorStop(0, '#4a2e1a');
  gr.addColorStop(0.5, '#86603a');
  gr.addColorStop(1, '#3e2614');
  ctx.fillStyle = gr;
  ctx.fillRect(x - 12, y0, 24, y1 - y0);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 12, y0, 24, y1 - y0);
  for (let y = y0 + 30; y < y1; y += 46) {
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 4, y + 6);
    ctx.stroke();
  }
}
function drawArch() {
  const x = GATE_X;
  if (!view(x - 300, x + 300)) return;
  archPost(x - 262, 22, 358);
  // the board, hung on chains from the cross-beam
  const bx = x - 230,
    bw = 460,
    by = 82;
  ctx.fillStyle = '#4a2e1a';
  ctx.fillRect(x - 280, 30, 560, 22);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 280, 30, 560, 22);
  ctx.strokeStyle = '#2c2a2e';
  ctx.lineWidth = 3;
  for (const cx of [bx + 30, bx + bw - 30]) {
    ctx.beginPath();
    ctx.moveTo(cx, 52);
    ctx.lineTo(cx, by);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(x, by + 44);
  ctx.rotate(Math.sin(G.time * 0.8) * 0.012);
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(-bw / 2 - 5, -44 - 5, bw + 10, 98);
  const wg = ctx.createLinearGradient(0, -44, 0, 44);
  wg.addColorStop(0, '#b07a46');
  wg.addColorStop(1, '#8a5a32');
  ctx.fillStyle = wg;
  ctx.fillRect(-bw / 2, -44, bw, 88);
  ctx.strokeStyle = 'rgba(40,20,10,.4)';
  ctx.lineWidth = 1.5;
  for (const y of [-14, 16]) {
    ctx.beginPath();
    ctx.moveTo(-bw / 2, y);
    ctx.lineTo(bw / 2, y);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2a160c';
  ctx.font = `900 18px ${FONT}`;
  ctx.fillText(t('welcome'), 0, -22);
  ctx.font = `900 38px ${FONT}`;
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#2a160c';
  ctx.strokeText('OLD QUARRY', 0, 14);
  ctx.fillStyle = '#f2d27a';
  ctx.fillText('OLD QUARRY', 0, 14);
  // a cow skull nailed on top
  ctx.fillStyle = '#ece5cb';
  ctx.beginPath();
  ctx.ellipse(0, -52, 14, 10, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#ece5cb';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-12, -56);
  ctx.quadraticCurveTo(-30, -60, -34, -74);
  ctx.moveTo(12, -56);
  ctx.quadraticCurveTo(30, -60, 34, -74);
  ctx.stroke();
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.arc(-5, -53, 2.5, 0, TAU);
  ctx.arc(5, -53, 2.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}
// Below the slant: the hillside down to the quarry, with a rail fence along the edge.
function drawSlantEdge() {
  if (!view(SLANT[0] - 40, SLANT[1] + 40)) return;
  ctx.strokeStyle = '#4a2e1a';
  ctx.lineWidth = 5;
  const b = (x) => slantY(x) + 190;
  for (let x = SLANT[0] + 40; x < QUARRY[0] - 10; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, b(x) + 6);
    ctx.lineTo(x, b(x) + 50);
    ctx.stroke();
  }
}
// The quarry: its back wall with a crane and scaffolds, rails down the side of the road.
function drawQuarry() {
  const [x0, x1, y0, y1] = QUARRY;
  if (!view(x0 - 200, x1 + 200, y0 - 400, y1 + 100)) return;
  // the cut face of the quarry over the road's top
  ctx.fillStyle = 'rgba(40,14,8,.35)';
  ctx.fillRect(x0 + 140, y0 - 14, x1 - x0 - 140, 14);
  // scaffolding up the face
  ctx.strokeStyle = '#5a3a22';
  ctx.lineWidth = 5;
  for (let x = x1 - 360; x <= x1 - 60; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x, y0 - 4);
    ctx.lineTo(x, y0 - 230);
    ctx.stroke();
  }
  for (let y = y0 - 60; y > y0 - 240; y -= 60) {
    ctx.beginPath();
    ctx.moveTo(x1 - 370, y);
    ctx.lineTo(x1 - 50, y);
    ctx.stroke();
  }
  ctx.lineWidth = 3;
  for (let x = x1 - 360; x < x1 - 60; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x, y0 - 4);
    ctx.lineTo(x + 100, y0 - 60);
    ctx.stroke();
  }
  // a wooden crane with a hanging bucket
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x0 + 220, y0 - 4);
  ctx.lineTo(x0 + 220, y0 - 250);
  ctx.lineTo(x0 + 420, y0 - 210);
  ctx.stroke();
  ctx.strokeStyle = '#2c2a2e';
  ctx.lineWidth = 2;
  const sw = Math.sin(G.time * 0.7) * 6;
  ctx.beginPath();
  ctx.moveTo(x0 + 410, y0 - 212);
  ctx.lineTo(x0 + 410 + sw, y0 - 120);
  ctx.stroke();
  ctx.fillStyle = '#4c4a50';
  ctx.fillRect(x0 + 394 + sw, y0 - 122, 32, 24);
  ctx.strokeStyle = OL;
  ctx.strokeRect(x0 + 394 + sw, y0 - 122, 32, 24);
  // the rails down the right of the road, with an ore cart
  rails(x1 - 70, y0, x1 - 70, y1, true);
  oreCart(x1 - 70, 1250, true);
  // a warning sign
  signPost(x0 + 70, 780, 'DANGER', 'EXPLOSIVES');
  signPost(x1 - 150, 1700, '→ MINE', 'No. 3');
}
function rails(xa, ya, xb, yb, vertical) {
  if (vertical) {
    ctx.fillStyle = '#4a3020';
    for (let y = ya; y < yb; y += 22) ctx.fillRect(xa - 28, y, 56, 8);
    ctx.fillStyle = '#8c8a90';
    ctx.fillRect(xa - 22, ya, 5, yb - ya);
    ctx.fillRect(xa + 17, ya, 5, yb - ya);
    return;
  }
  const L = Math.hypot(xb - xa, yb - ya),
    dx = (xb - xa) / L,
    dy = (yb - ya) / L;
  ctx.fillStyle = '#3a2618';
  for (let d = 0; d < L; d += 26) {
    const x = xa + dx * d,
      y = ya + dy * d;
    poly([
      [x, y - 2],
      [x + 9, y - 2 + dy * 9],
      [x + 9, y + 22 + dy * 9],
      [x, y + 22],
    ]);
    ctx.fill();
  }
  ctx.strokeStyle = '#9a98a0';
  ctx.lineWidth = 3;
  for (const o of [2, 18]) {
    ctx.beginPath();
    ctx.moveTo(xa, ya + o);
    ctx.lineTo(xb, yb + o);
    ctx.stroke();
  }
}
function oreCart(x, y, vertical) {
  ctx.save();
  ctx.translate(x, y);
  if (vertical) ctx.rotate(Math.PI / 2);
  ctx.fillStyle = '#5c5a62';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  poly([
    [-34, -46],
    [34, -46],
    [26, -8],
    [-26, -8],
  ]);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7a5a3a';
  ctx.beginPath();
  ctx.ellipse(0, -46, 30, 8, 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = '#e8c35a';
  ctx.fillRect(-8, -52, 4, 4);
  ctx.fillRect(10, -50, 3, 3);
  ctx.fillStyle = '#2c2a2e';
  for (const wx of [-18, 18]) {
    ctx.beginPath();
    ctx.arc(wx, -6, 7, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
function signPost(x, y, a, b) {
  ctx.fillStyle = '#5a3a22';
  ctx.fillRect(x - 4, y - 90, 8, 90);
  ctx.fillStyle = '#d8b878';
  ctx.fillRect(x - 54, y - 96, 108, 46);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x - 54, y - 96, 108, 46);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#a02818';
  ctx.font = `900 15px ${FONT}`;
  ctx.fillText(a, x, y - 82);
  ctx.fillStyle = '#3a2416';
  ctx.font = `900 11px ${FONT}`;
  ctx.fillText(b, x, y - 63);
}
// The mine: rock all round, a back wall with timber sets and lamps every few steps, rails on
// the floor, the slime's flooded hall and the cavern of the last fight.
const TUN = 330; // height of a tunnel's back wall
function tunnelWall(xa, xb, top) {
  // top(x): the floor's back edge
  const step = 280;
  for (let x = Math.ceil(xa / step) * step; x < xb; x += step) {
    if (!view(x - 120, x + 120)) continue;
    const y = top(x);
    if (!view(x - 120, x + 120, y - TUN, y + 10)) continue;
    ctx.drawImage(T.timber, x - 100, y - TUN);
    if ((x / step) % 2 === 0) lantern(x, y - TUN + 44);
  }
}
function lantern(x, y) {
  ctx.strokeStyle = '#2c2a2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 18);
  ctx.stroke();
  ctx.fillStyle = '#2c2a2e';
  ctx.fillRect(x - 8, y + 18, 16, 4);
  const f = 0.8 + 0.2 * Math.sin(G.time * 9 + x);
  ctx.fillStyle = `rgba(255,${(200 * f) | 0},110,1)`;
  ctx.fillRect(x - 6, y + 22, 12, 16);
  ctx.strokeStyle = '#2c2a2e';
  ctx.strokeRect(x - 6, y + 22, 12, 16);
  ctx.fillRect(x - 8, y + 38, 16, 4);
}
function drawMine() {
  // the back walls of the tunnels: darker rock, then the timbers
  const mineTop = (x) => (x < SHAFT[0] ? MINE_Y : x < SHAFT[1] ? shaftY(x) : DEEP_Y);
  const back = [
    [PORTAL_X, MINE_Y - TUN],
    [SHAFT[0], MINE_Y - TUN],
    [SHAFT[1], DEEP_Y - TUN],
    [END_X + 600, DEEP_Y - TUN],
    [END_X + 600, DEEP_Y],
    [SHAFT[1], DEEP_Y],
    [SHAFT[0], MINE_Y],
    [PORTAL_X, MINE_Y],
  ];
  ctx.fillStyle = 'rgba(10,6,4,.35)';
  poly(back);
  ctx.fill();
  // the slime's flooded hall: a glowing green pool far back
  const hx = HALL_X;
  if (view(hx - 700, hx + 700, MINE_Y - 400, MINE_Y + 200)) {
    ctx.fillStyle = '#1c1612';
    ctx.beginPath();
    ctx.ellipse(hx, MINE_Y - 20, 420, 300, 0, Math.PI, TAU);
    ctx.fill();
    const k = 0.75 + 0.25 * Math.sin(G.time * 2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = k;
    ctx.drawImage(T.green, hx - 380, MINE_Y - 360, 760, 420);
    ctx.restore();
    ctx.fillStyle = '#5fd83a';
    ctx.beginPath();
    ctx.ellipse(hx, MINE_Y - 22, 300, 24, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,255,160,.6)';
    for (let i = 0; i < 7; i++) {
      const bx = hx - 260 + ((i * 131 + G.time * 30) % 520),
        r = 4 + ((i * 7) % 5);
      ctx.beginPath();
      ctx.arc(bx, MINE_Y - 24 - ((G.time * 20 + i * 9) % 20), r, 0, TAU);
      ctx.fill();
    }
    // leaking drums of waste by the pool
    for (const [dx, tip] of [
      [-330, 0],
      [-290, 0.4],
      [320, 0],
    ])
      drum(hx + dx, MINE_Y - 8, tip);
  }
  // the last cavern: a broken-down drill rig and red emergency lamps
  const fx = END_X - 480;
  if (view(fx - 700, fx + 800, DEEP_Y - 500, DEEP_Y + 200)) {
    ctx.fillStyle = '#1a1210';
    ctx.beginPath();
    ctx.ellipse(fx, DEEP_Y - 60, 640, 300, 0, Math.PI, TAU);
    ctx.fill();
    drillRig(fx + 120, DEEP_Y - 6);
    for (const dx of [-480, -160, 400]) {
      const on = Math.floor(G.time * 2 + dx) % 2 === 0;
      ctx.fillStyle = on ? '#ff3a2a' : '#6a1a14';
      ctx.beginPath();
      ctx.arc(fx + dx, DEEP_Y - 250, 9, 0, TAU);
      ctx.fill();
      if (on) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(T.red, fx + dx - 120, DEEP_Y - 370);
        ctx.restore();
      }
    }
  }
  tunnelWall(PORTAL_X + 200, HALL_X - 430, () => MINE_Y);
  tunnelWall(HALL_X + 430, SHAFT[0], () => MINE_Y);
  tunnelWall(SHAFT[0], SHAFT[1], shaftY);
  tunnelWall(SHAFT[1], END_X - 900, () => DEEP_Y);
  // rails along the back of the floor
  if (view(PORTAL_X, SHAFT[0], MINE_Y - 50, MINE_Y + 60))
    rails(PORTAL_X, MINE_Y + 8, SHAFT[0], MINE_Y + 8);
  if (view(SHAFT[0], SHAFT[1])) rails(SHAFT[0], MINE_Y + 8, SHAFT[1], shaftY(SHAFT[1]) + 8);
  if (view(SHAFT[1], END_X)) rails(SHAFT[1], DEEP_Y + 8, END_X - 700, DEEP_Y + 8);
  for (const x of [5050, 8350]) if (view(x - 60, x + 60)) oreCart(x, mineTop(x) + 22, false);
  drawPortal();
}
function drum(x, y, tip) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tip);
  ctx.fillStyle = '#c8a12a';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.5;
  ctx.fillRect(-16, -44, 32, 44);
  ctx.strokeRect(-16, -44, 32, 44);
  ctx.fillStyle = '#2c2a2e';
  ctx.beginPath();
  ctx.arc(0, -22, 8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#c8a12a';
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i / 3) * TAU;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.arc(0, -22, 7, a - 0.5, a + 0.5);
    ctx.fill();
  }
  ctx.fillStyle = '#7dff5a';
  ctx.beginPath();
  ctx.ellipse(10, 0, 14, 4, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}
function drillRig(x, y) {
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.fillStyle = '#6a6e74';
  ctx.fillRect(x - 160, y - 90, 220, 90);
  ctx.strokeRect(x - 160, y - 90, 220, 90);
  ctx.fillStyle = '#c89a2a';
  for (let i = 0; i < 6; i++) ctx.fillRect(x - 150 + i * 36, y - 86, 18, 8);
  ctx.fillStyle = '#4a4e54';
  ctx.fillRect(x + 40, y - 300, 30, 220);
  ctx.strokeRect(x + 40, y - 300, 30, 220);
  ctx.fillStyle = '#8a8e94';
  ctx.beginPath();
  ctx.moveTo(x + 60, y - 80);
  ctx.lineTo(x + 140, y - 60);
  ctx.lineTo(x + 230, y - 40);
  ctx.lineTo(x + 140, y - 30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#2c2a2e';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 80 + i * 26, y - 74 + i * 6);
    ctx.lineTo(x + 70 + i * 26, y - 36 + i * 1.5);
    ctx.stroke();
  }
}
// The mine's mouth at the bottom of the quarry: a timber portal in the rock.
function drawPortal() {
  const x = PORTAL_X,
    y = MINE_Y;
  if (!view(x - 200, x + 300, y - 400, y + 40)) return;
  ctx.fillStyle = '#0c0806';
  ctx.fillRect(x + 20, y - 250, 160, 250);
  const wood = (a, b, c, d) => {
    ctx.fillStyle = '#6a4428';
    ctx.fillRect(a, b, c, d);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 3;
    ctx.strokeRect(a, b, c, d);
  };
  wood(x, y - 270, 30, 270);
  wood(x + 170, y - 270, 30, 270);
  wood(x - 20, y - 300, 240, 36);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8d9a8';
  ctx.font = `900 16px ${FONT}`;
  ctx.fillText('MINE No. 3', x + 100, y - 282);
}
// --- public ----------------------------------------------------------------------------------

/** Everything behind the fighters. */
export function drawBG2() {
  if (!T) init();
  ctx.save();
  ctx.translate(-G.cam, -G.camY);
  // the ground itself: sandstone, and the mine's darker rock past its mouth
  ctx.fillStyle = T.patterns.strata;
  ctx.fillRect(G.cam - 10, G.camY - 10, W + 20, H + 20);
  if (G.cam + W > PORTAL_X && G.camY + H > MINE_Y - 500) {
    ctx.fillStyle = T.patterns.rock;
    poly([
      [PORTAL_X + 20, MINE_Y - 420],
      [END_X + 800, MINE_Y - 420],
      [END_X + 800, DEEP_Y + 1200],
      [PORTAL_X + 20, DEEP_Y + 1200],
    ]);
    ctx.fill();
  }
  drawSky();
  drawTown();
  drawArch();
  drawSlantEdge();
  drawQuarry();
  drawMine();
  drawFloors();
  // rails across the bottom of the quarry into the mine's mouth
  if (view(QUARRY[0], PORTAL_X + 200))
    rails(QUARRY[1] - 70, MINE_Y + 8, PORTAL_X + 200, MINE_Y + 8);
  ctx.restore();
}
/** Things in front of the fighters, and the light: the arch's front post, the mine's gloom. */
export function drawFront2() {
  if (!T) init();
  ctx.save();
  ctx.translate(-G.cam, -G.camY);
  if (view(GATE_X + 200, GATE_X + 330)) {
    // see-through while someone stands behind it
    const px = GATE_X + 262,
      hid = [P, ...G.enemies].some((o) => Math.abs(o.x - px) < 70);
    ctx.globalAlpha = hid ? 0.45 : 1;
    archPost(px, 22, 560);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // the mine is dark: light round the heroine and from the lamps, gloom at the edges
  const inMine = G.cam + W * 0.5 > PORTAL_X + 100 && G.camY > MINE_Y - 700;
  if (inMine) {
    const px = P.x - G.cam,
      py = P.y - G.camY - 90,
      g = ctx.createRadialGradient(px, py, 120, px, py, 620);
    g.addColorStop(0, 'rgba(8,4,2,0)');
    g.addColorStop(1, 'rgba(8,4,2,.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(-G.cam, -G.camY);
    const mtop = (x) => (x < SHAFT[0] ? MINE_Y : x < SHAFT[1] ? shaftY(x) : DEEP_Y);
    for (let x = Math.ceil((G.cam - 200) / 560) * 560; x < G.cam + W + 200; x += 560)
      if (x > PORTAL_X + 200 && x < END_X - 900 && Math.abs(x - HALL_X) > 430) {
        const y = mtop(x) - TUN + 74;
        ctx.globalAlpha = 0.8 + 0.2 * Math.sin(G.time * 9 + x);
        ctx.drawImage(T.lamp, x - 150, y - 150);
      }
    ctx.restore();
  } else {
    // warm evening haze at the edges
    const g = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.45, W / 2, H * 0.55, H * 1.05);
    g.addColorStop(0, 'rgba(40,14,8,0)');
    g.addColorStop(1, 'rgba(40,14,8,.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}
export { DEPTH };
