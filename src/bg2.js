// Procedural scenery of Old Quarry (stage 2): a mining town at sunset, the street sloping
// down to the quarry, the quarry road down to the mine and the tunnels under the town.
// Everything is drawn in road coordinates (see level2.js); the textures and the houses are
// painted once into offscreen canvases.
import { FONT, H, OL, TAU, W } from './config.js';
import { clamp, mulberry } from './util.js';
import { G, P } from './state.js';
import { ctx } from './gfx.js';
import { mk } from './background.js';
import { t } from './i18n.js';
import { DEPTH, FLOOR, L2, topY } from './level2.js';

const { Y_A, Y_B, Y_C, SLANT1, SLANT2, A_END, CLIFF_X, PORTAL_X, HALL_X, END_X, GATE_X } = L2;
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
  ['store', 'GENERAL STORE', 300, 250, '#7d5a3c', '#e6d3a6'],
  ['saloon', 'SALOON', 330, 275, '#8a3f2c', '#f0d89a'],
  ['sheriff', 'SHERIFF', 230, 225, '#6b5240', '#e9e0c4'],
  ['bank', 'BANK', 260, 255, '#8d6d4c', '#f3e6c0'],
  ['hotel', 'HOTEL', 320, 290, '#5d6a72', '#e2d6b4'],
  ['undertaker', 'UNDERTAKER', 250, 230, '#3d3640', '#c8c0a8'],
  ['assay', 'ASSAY OFFICE', 260, 230, '#7a6448', '#eadcb6'],
  ['smith', 'BLACKSMITH', 260, 225, '#5a4232', '#d8c49a'],
  ['barber', 'BARBER', 200, 225, '#6f4d50', '#f2e2c0'],
  ['mineoffice', 'MINING CO.', 260, 250, '#6a4a32', '#ead6a0'],
];
function house(spec, seed) {
  const [kind, , w, h, body, trim] = spec;
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
    // The porch roof (see porch()) hides the facade from ROOF px above its foot down: the sign
    // and the upper windows share the band above it, under the false front's top.
    const ROOF = 132,
      band0 = top + (kind === 'saloon' || kind === 'hotel' ? 44 : 30),
      band1 = bot - ROOF,
      upper = band1 - band0 >= 34 + 8 + 38;
    // the sign board: no lettering, a painted picture of the trade
    const sw = 64,
      sx = x0 + (w - sw) / 2,
      sy = upper ? band0 : band0 + (band1 - band0 - 34) / 2;
    g.fillStyle = '#2a1c16';
    g.fillRect(sx - 3, sy - 3, sw + 6, 40);
    g.fillStyle = trim;
    g.fillRect(sx, sy, sw, 34);
    sign(g, kind, sx + sw / 2, sy + 17);
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
    if (upper) {
      // a row of upper windows under the sign, the middle one left out where the sign hangs
      const wy = sy + 42,
        wh = Math.min(46, band1 - wy - 6),
        n = Math.floor((w - 40) / 76),
        x1 = x0 + (w - (n * 76 - 36)) / 2;
      for (let i = 0; i < n; i++) {
        const x = x1 + i * 76;
        if (x + 40 > sx - 6 && x < sx + sw + 6 && wy < sy + 40) continue;
        win(x, wy, 40, wh);
      }
    }
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
    if (kind === 'undertaker') {
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
        const px = r() < 0.5 ? x0 + 8 + r() * 10 : x0 + w - 34 - r() * 10,
          py = bot - 100 + r() * 12;
        g.fillStyle = '#e9dcb8';
        g.fillRect(px, py, 22, 28);
        g.fillStyle = '#5a4030';
        g.fillRect(px + 4, py + 4, 14, 3);
        g.fillRect(px + 6, py + 10, 10, 10);
        g.fillRect(px + 4, py + 22, 14, 2);
      }
  });
}
/** The picture on a shop's sign (centred at x, y, about 50 by 26). */
function sign(g, kind, x, y) {
  const ink = '#3a2416';
  g.save();
  g.translate(x, y);
  g.fillStyle = g.strokeStyle = ink;
  g.lineWidth = 3;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const line = (...p) => {
    g.beginPath();
    p.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b)));
    g.stroke();
  };
  const circle = (a, b, r, fill = true) => {
    g.beginPath();
    g.arc(a, b, r, 0, TAU);
    fill ? g.fill() : g.stroke();
  };
  switch (kind) {
    case 'saloon':
      // a bottle and a glass
      g.fillRect(-14, -4, 10, 16);
      g.fillRect(-11, -11, 4, 8);
      line([4, -6], [6, 10], [14, 10], [16, -6]);
      break;
    case 'sheriff':
      star(g, 0, 0, 12, '#c8962a');
      break;
    case 'bank':
      // a stack of coins
      for (let i = 0; i < 3; i++) {
        g.fillStyle = '#c8962a';
        g.beginPath();
        g.ellipse(-6 + i * 6, 8 - i * 6, 10, 4, 0, 0, TAU);
        g.fill();
        g.stroke();
      }
      break;
    case 'hotel':
      // a bed
      line([-18, 10], [-18, -6]);
      line([-18, 4], [18, 4], [18, 10]);
      g.fillRect(-14, -2, 30, 6);
      circle(-11, -5, 4);
      break;
    case 'undertaker':
      // a coffin
      g.beginPath();
      g.moveTo(-6, -12);
      g.lineTo(6, -12);
      g.lineTo(10, -4);
      g.lineTo(6, 12);
      g.lineTo(-6, 12);
      g.lineTo(-10, -4);
      g.closePath();
      g.fill();
      break;
    case 'assay':
      // scales
      line([0, -10], [0, 10]);
      line([-16, -6], [16, -6]);
      line([-16, -6], [-20, 4], [-12, 4], [-16, -6]);
      line([16, -6], [12, 4], [20, 4], [16, -6]);
      line([-8, 10], [8, 10]);
      break;
    case 'smith':
      // a horseshoe
      g.lineWidth = 5;
      g.beginPath();
      g.arc(0, -2, 10, Math.PI * 0.85, Math.PI * 2.15);
      g.stroke();
      break;
    case 'barber':
      // scissors
      circle(-12, 6, 4, false);
      circle(-12, -6, 4, false);
      line([-8, 4], [14, -6]);
      line([-8, -4], [14, 6]);
      break;
    case 'mineoffice':
      // crossed pickaxes
      for (const k of [-1, 1]) {
        line([-12 * k, 12], [12 * k, -10]);
        line([4 * k, -16], [18 * k, -6]);
      }
      break;
    default:
      // a barrel with hoops and a tied sack
      g.beginPath();
      g.moveTo(-20, -10);
      g.quadraticCurveTo(-24, 1, -20, 12);
      g.lineTo(-4, 12);
      g.quadraticCurveTo(0, 1, -4, -10);
      g.closePath();
      g.fill();
      g.strokeStyle = '#e6d3a6';
      g.lineWidth = 2;
      line([-21, -4], [-3, -4]);
      line([-21, 6], [-3, 6]);
      g.strokeStyle = ink;
      g.beginPath();
      g.moveTo(4, 12);
      g.quadraticCurveTo(2, -2, 9, -6);
      g.lineTo(15, -6);
      g.quadraticCurveTo(22, -2, 20, 12);
      g.closePath();
      g.fill();
      line([7, -10], [12, -6], [17, -10]);
  }
  g.restore();
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
// Where the houses stand: [x, house]. Along Main Street and the lower street their fronts
// stand on the back edge of the street; on the first slant they step down on stone footings.
const STREET = [
  [430, 0],
  [770, 1],
  [1140, 2],
  [1400, 3],
  [1720, 4],
  [2090, 8],
  [2460, 5],
  [2780, 6],
  [3260, 7],
  [3560, 9],
  [3870, 0],
  [4200, 2],
  [4460, 3],
];

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
  T.small = makeGlow('rgba(255,200,110,.5)', 70);
  T.green = makeGlow('rgba(120,255,90,.5)', 220);
  T.red = makeGlow('rgba(255,60,40,.5)', 120);
}

// --- drawing ---------------------------------------------------------------------------------

const poly = (pts) => {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
};
// The cliff over the mining camp: its face from the camp's back edge up, ragged at the top.
const CLIFF = [
  [CLIFF_X - 40, Y_C],
  [CLIFF_X - 10, Y_C - 120],
  [CLIFF_X + 30, Y_C - 190],
  [CLIFF_X + 20, Y_C - 260],
  [CLIFF_X + 90, Y_C - 330],
  [CLIFF_X + 170, Y_C - 360],
  [CLIFF_X + 260, Y_C - 450],
  [CLIFF_X + 380, Y_C - 470],
  [CLIFF_X + 480, Y_C - 560],
  [END_X + 800, Y_C - 640],
];
// The open sky over the town: down to the back edges of the streets and up to the cliff.
const SKY = [
  [-3000, -4000],
  [END_X + 800, -4000],
  ...CLIFF.slice().reverse(),
  [SLANT2[1], Y_C],
  [SLANT2[0], Y_B],
  [SLANT1[1], Y_B],
  [SLANT1[0], Y_A],
  [-3000, Y_A],
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
  for (const [i, f] of FLOOR.entries()) {
    const xs = f.map((p) => p[0]),
      ys = f.map((p) => p[1]);
    if (!view(Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys))) continue;
    ctx.fillStyle = T.patterns.road;
    poly(f);
    ctx.fill();
  }
  // past the mine's mouth the dusty road turns into the tunnel's dark floor
  if (view(PORTAL_X - 120, END_X)) {
    ctx.fillStyle = T.patterns.mfloor;
    ctx.fillRect(PORTAL_X + 120, Y_C, END_X - PORTAL_X, DEPTH);
    const g = ctx.createLinearGradient(PORTAL_X - 120, 0, PORTAL_X + 121, 0);
    g.addColorStop(0, 'rgba(90,70,56,0)');
    g.addColorStop(1, 'rgba(90,70,56,1)');
    ctx.fillStyle = g;
    ctx.fillRect(PORTAL_X - 120, Y_C, 241, DEPTH);
  }
  // shade under the back edge of every street, slant and tunnel
  ctx.fillStyle = 'rgba(40,18,10,.24)';
  poly([
    [0, Y_A],
    [SLANT1[0], Y_A],
    [SLANT1[1], Y_B],
    [SLANT2[0], Y_B],
    [SLANT2[1], Y_C],
    [END_X, Y_C],
    [END_X, Y_C + 26],
    [SLANT2[1], Y_C + 26],
    [SLANT2[0], Y_B + 26],
    [SLANT1[1], Y_B + 26],
    [SLANT1[0], Y_A + 26],
    [0, Y_A + 26],
  ]);
  ctx.fill();
  // wheel ruts down the slants
  ctx.strokeStyle = 'rgba(110,72,44,.22)';
  ctx.lineWidth = 5;
  for (const [a, b] of [SLANT1, SLANT2])
    if (view(a, b))
      for (const o of [70, 120]) {
        ctx.beginPath();
        ctx.moveTo(a - 60, topY(a) + o);
        ctx.lineTo(b + 60, topY(b) + o);
        ctx.stroke();
      }
}
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
  // the edge of town: a split-rail fence and a cactus
  if (view(-200, GATE_X)) {
    ctx.strokeStyle = '#5a3a22';
    ctx.lineWidth = 6;
    for (let x = -200; x < GATE_X - 150; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, Y_A);
      ctx.lineTo(x, Y_A - 58);
      ctx.stroke();
    }
    ctx.lineWidth = 4;
    for (const y of [Y_A - 40, Y_A - 20]) {
      ctx.beginPath();
      ctx.moveTo(-200, y);
      ctx.lineTo(GATE_X - 150, y + 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#3e5a2c';
    cactus(ctx, 20, Y_A - 6, 1.4);
  }
  for (const [x, k] of STREET) {
    const img = T.houses[k],
      w = img.width,
      y = topY(x + w / 2),
      l = topY(x),
      r = topY(x + w);
    if (!view(x - 40, x + w + 40, y - 400, y + 40)) continue;
    if (l !== r) {
      // on the slant: a stone footing down to the street
      ctx.fillStyle = '#6e5a4a';
      poly([
        [x, y - 34],
        [x + w, y - 34],
        [x + w, Math.max(r, y)],
        [x, Math.max(l, y)],
      ]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,20,14,.6)';
      ctx.lineWidth = 2;
      for (let yy = y - 24; yy < Math.max(l, r); yy += 12) {
        ctx.beginPath();
        ctx.moveTo(x, yy);
        ctx.lineTo(x + w, yy);
        ctx.stroke();
      }
    }
    ctx.drawImage(img, x, y - 34 - img.height + 8);
    boardwalk(x - 4, x + w + 4, y);
    porch(x + 14, x + w - 14, y, 104);
  }
  // down the second slant, the edge of town: a fence, stacked lumber, a water tower
  if (view(SLANT2[0] - 100, SLANT2[1] + 100, Y_B - 300, Y_C + 40)) {
    ctx.strokeStyle = '#5a3a22';
    for (let x = SLANT2[0] - 60; x < SLANT2[1] - 40; x += 70) {
      const y = topY(x);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 56);
      ctx.stroke();
    }
    ctx.lineWidth = 4;
    for (const d of [40, 20]) {
      ctx.beginPath();
      ctx.moveTo(SLANT2[0] - 60, topY(SLANT2[0] - 60) - d);
      ctx.lineTo(SLANT2[1] - 40, topY(SLANT2[1] - 40) - d);
      ctx.stroke();
    }
    waterTower(SLANT2[0] + 330, topY(SLANT2[0] + 330) - 6);
    lumber(SLANT2[0] + 620, topY(SLANT2[0] + 620) - 4);
  }
}
function waterTower(x, y) {
  ctx.strokeStyle = '#4a2e1a';
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (const d of [-40, 40]) {
    ctx.moveTo(x + d, y);
    ctx.lineTo(x + d * 0.7, y - 150);
  }
  ctx.moveTo(x - 40, y);
  ctx.lineTo(x + 28, y - 150);
  ctx.moveTo(x + 40, y);
  ctx.lineTo(x - 28, y - 150);
  ctx.stroke();
  ctx.fillStyle = '#7a5232';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.fillRect(x - 54, y - 236, 108, 90);
  ctx.strokeRect(x - 54, y - 236, 108, 90);
  ctx.strokeStyle = '#3a3a40';
  for (const yy of [-220, -186, -160]) {
    ctx.beginPath();
    ctx.moveTo(x - 54, y + yy);
    ctx.lineTo(x + 54, y + yy);
    ctx.stroke();
  }
  ctx.fillStyle = '#5a3a22';
  ctx.beginPath();
  ctx.moveTo(x - 62, y - 236);
  ctx.lineTo(x, y - 276);
  ctx.lineTo(x + 62, y - 236);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.stroke();
}
function lumber(x, y) {
  for (let r = 0; r < 4; r++)
    for (let i = 0; i < 6 - r; i++) {
      const cx = x - 60 + i * 22 + r * 11,
        cy = y - 10 - r * 19;
      ctx.fillStyle = '#8a6440';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(40,20,10,.5)';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, TAU);
      ctx.stroke();
    }
}
// --- the welcome sign -------------------------------------------------------------------------
// A plain wooden sign at the roadside, left of town on the boardwalk side: two log posts and a
// plank board with the town's name. It stands off the road.
function log(x, y0, y1, w = 30) {
  const gr = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  gr.addColorStop(0, '#3e2614');
  gr.addColorStop(0.45, '#8c643c');
  gr.addColorStop(1, '#3a2312');
  ctx.fillStyle = gr;
  ctx.fillRect(x - w / 2, y0, w, y1 - y0);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - w / 2, y0, w, y1 - y0);
  // bark and knots
  ctx.strokeStyle = 'rgba(30,16,8,.55)';
  ctx.lineWidth = 1.5;
  for (let y = y0 + 22; y < y1 - 10; y += 38) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + 3, y);
    ctx.quadraticCurveTo(x, y + 8, x + w / 2 - 4, y + 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(30,16,8,.5)';
  for (let y = y0 + 60; y < y1 - 20; y += 110) {
    ctx.beginPath();
    ctx.ellipse(x + 4, y, 4, 6, 0, 0, TAU);
    ctx.fill();
  }
  // the cut end on top
  ctx.fillStyle = '#c8a070';
  ctx.beginPath();
  ctx.ellipse(x, y0, w / 2, 5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.stroke();
}
function hangingLantern(x, y) {
  ctx.strokeStyle = '#2c2a2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 16);
  ctx.stroke();
  ctx.fillStyle = '#2c2a2e';
  ctx.fillRect(x - 9, y + 16, 18, 5);
  ctx.fillStyle = '#ffd88a';
  ctx.fillRect(x - 7, y + 21, 14, 18);
  ctx.strokeRect(x - 7, y + 21, 14, 18);
  ctx.fillStyle = '#2c2a2e';
  ctx.fillRect(x - 9, y + 39, 18, 4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.6 + 0.15 * Math.sin(G.time * 7 + x);
  ctx.drawImage(T.small, x - 70, y - 40);
  ctx.restore();
}
function drawArch() {
  const cx = GATE_X,
    pl = cx - 128,
    pr = cx + 128,
    y0 = Y_A - 196,
    y1 = Y_A - 84;
  if (!view(pl - 60, pr + 60)) return;
  // stones round the feet of the posts
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  for (const x of [pl, pr])
    for (const [dx, dy, r] of [
      [-14, -4, 9],
      [12, -3, 8],
      [0, -10, 7],
    ]) {
      ctx.fillStyle = '#8a7a6a';
      ctx.beginPath();
      ctx.ellipse(x + dx, Y_A + dy, r, r * 0.7, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  log(pl, y0 - 26, Y_A - 6, 20);
  log(pr, y0 - 26, Y_A - 6, 20);
  // the board: planks with notched corners, nailed to both posts
  const x0 = pl - 20,
    x1 = pr + 20,
    n = 10;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0 + n, y0);
  ctx.lineTo(x1 - n, y0);
  ctx.lineTo(x1, y0 + n);
  ctx.lineTo(x1, y1 - n);
  ctx.lineTo(x1 - n, y1);
  ctx.lineTo(x0 + n, y1);
  ctx.lineTo(x0, y1 - n);
  ctx.lineTo(x0, y0 + n);
  ctx.closePath();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#2a1a10';
  ctx.stroke();
  const wg = ctx.createLinearGradient(0, y0, 0, y1);
  wg.addColorStop(0, '#c08850');
  wg.addColorStop(1, '#8a5a32');
  ctx.fillStyle = wg;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(40,20,10,.45)';
  ctx.lineWidth = 2;
  for (let y = y0 + 28; y < y1; y += 28) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }
  ctx.restore();
  // nails
  ctx.fillStyle = '#3a3a40';
  for (const x of [pl, pr])
    for (const y of [y0 + 14, y1 - 14]) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, TAU);
      ctx.fill();
    }
  // the lettering
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 15px ${FONT}`;
  ctx.fillStyle = '#2a160c';
  ctx.fillText(t('welcome'), cx, y0 + 24);
  ctx.font = `900 34px ${FONT}`;
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#2a160c';
  ctx.strokeText('OLD QUARRY', cx, y0 + 66);
  ctx.fillStyle = '#f2d27a';
  ctx.fillText('OLD QUARRY', cx, y0 + 66);
  ctx.font = `900 11px ${FONT}`;
  ctx.fillStyle = '#3a2416';
  ctx.fillText('★  LOST 32120  ★', cx, y0 + 96);
  // a cow skull on top, a lantern on a post
  ctx.save();
  ctx.translate(cx, y0 - 6);
  ctx.fillStyle = '#ece5cb';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 9, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#ece5cb';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-10, -3);
  ctx.quadraticCurveTo(-26, -6, -30, -18);
  ctx.moveTo(10, -3);
  ctx.quadraticCurveTo(26, -6, 30, -18);
  ctx.stroke();
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.arc(-4, 0, 2.5, 0, TAU);
  ctx.arc(4, 0, 2.5, 0, TAU);
  ctx.fill();
  ctx.restore();
  hangingLantern(pr + 12, y1 + 6);
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
// --- the mining camp and the way into the mine --------------------------------------------------
const TUN = 330; // height of a tunnel's back wall
function tunnelWall(xa, xb) {
  const step = 280;
  for (let x = Math.ceil(xa / step) * step; x < xb; x += step) {
    if (!view(x - 120, x + 120, Y_C - TUN, Y_C + 10)) continue;
    ctx.drawImage(T.timber, x - 100, Y_C - TUN);
    if ((x / step) % 2 === 0) lantern(x, Y_C - TUN + 44);
  }
}
/** The headframe over the old shaft: a tall timber A-frame with a turning wheel. */
function headframe(x, y) {
  ctx.strokeStyle = '#4a2e1a';
  ctx.lineCap = 'round';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(x - 60, y);
  ctx.lineTo(x - 14, y - 300);
  ctx.moveTo(x + 60, y);
  ctx.lineTo(x + 14, y - 300);
  ctx.moveTo(x + 60, y);
  ctx.lineTo(x + 150, y - 190);
  ctx.stroke();
  ctx.lineWidth = 5;
  for (let k = 0; k < 4; k++) {
    const a = y - 40 - k * 64,
      w0 = 60 - (46 * (y - a)) / 300;
    ctx.beginPath();
    ctx.moveTo(x - w0, a);
    ctx.lineTo(x + w0, a);
    ctx.lineTo(x - w0 + 8, a - 64);
    ctx.stroke();
  }
  // the wheel at the top, turning, and the cable down into the shaft and over to the hoist
  const wy = y - 316,
    a = G.time * 1.5;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, wy, 34, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const b = a + (i / 6) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(b) * 34, wy - Math.sin(b) * 34);
    ctx.lineTo(x + Math.cos(b) * 34, wy + Math.sin(b) * 34);
    ctx.stroke();
  }
  ctx.strokeStyle = '#2c2a2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 34, wy);
  ctx.lineTo(x - 34, y - 20);
  ctx.moveTo(x + 30, wy - 14);
  ctx.lineTo(x + 190, y - 60);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // the hoist house
  ctx.fillStyle = '#6a4a32';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.fillRect(x + 150, y - 90, 110, 90);
  ctx.strokeRect(x + 150, y - 90, 110, 90);
  ctx.fillStyle = '#4a3020';
  ctx.beginPath();
  ctx.moveTo(x + 140, y - 90);
  ctx.lineTo(x + 205, y - 126);
  ctx.lineTo(x + 270, y - 90);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffcf7a';
  ctx.fillRect(x + 172, y - 66, 26, 22);
  ctx.strokeRect(x + 172, y - 66, 26, 22);
  // a smoke stack puffing
  ctx.fillStyle = '#3a3a40';
  ctx.fillRect(x + 230, y - 150, 14, 60);
  ctx.strokeRect(x + 230, y - 150, 14, 60);
  ctx.fillStyle = 'rgba(80,70,70,.35)';
  for (let i = 0; i < 4; i++) {
    const u = (G.time * 0.4 + i / 4) % 1;
    ctx.beginPath();
    ctx.arc(x + 237 + u * 30, y - 160 - u * 90, 8 + u * 16, 0, TAU);
    ctx.fill();
  }
}
/** The mine's mouth in the cliff: a heavy timber portal with lamps, rails into the dark. */
function portal(x, y) {
  const w = 230,
    h = 250;
  // the rock round it, a little darker and rough
  ctx.fillStyle = 'rgba(40,16,8,.35)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y - h / 2, w * 0.85, h * 0.75, 0, Math.PI, TAU);
  ctx.lineTo(x + w / 2 + w * 0.85, y);
  ctx.lineTo(x + w / 2 - w * 0.85, y);
  ctx.closePath();
  ctx.fill();
  // the dark inside, with a faint glow of lamps far in
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#0a0604');
  g.addColorStop(1, '#1a0e08');
  ctx.fillStyle = g;
  ctx.fillRect(x + 22, y - h + 20, w - 44, h - 20);
  for (const [dx, dy, s] of [
    [0.5, 0.45, 1],
    [0.42, 0.5, 0.6],
  ]) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 * s + 0.08 * Math.sin(G.time * 5);
    ctx.drawImage(T.small, x + w * dx - 70 * s, y - h * dy - 70 * s, 140 * s, 140 * s);
    ctx.restore();
  }
  const wood = (a, b, c, d) => {
    const gr = ctx.createLinearGradient(a, 0, a + c, 0);
    gr.addColorStop(0, '#4a2e1a');
    gr.addColorStop(0.5, '#7a5232');
    gr.addColorStop(1, '#3e2614');
    ctx.fillStyle = gr;
    ctx.fillRect(a, b, c, d);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 3;
    ctx.strokeRect(a, b, c, d);
  };
  // posts, a double header and corner braces
  wood(x, y - h, 34, h);
  wood(x + w - 34, y - h, 34, h);
  wood(x - 24, y - h - 40, w + 48, 30);
  wood(x - 10, y - h - 10, w + 20, 22);
  ctx.strokeStyle = '#5a3a22';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x + 34, y - h + 60);
  ctx.lineTo(x + 84, y - h + 12);
  ctx.moveTo(x + w - 34, y - h + 60);
  ctx.lineTo(x + w - 84, y - h + 12);
  ctx.stroke();
  // crossed pickaxes over the mouth
  ctx.save();
  ctx.translate(x + w / 2, y - h - 66);
  for (const k of [-1, 1]) {
    ctx.save();
    ctx.rotate(k * 0.7);
    ctx.fillStyle = '#7a5232';
    ctx.fillRect(-4, -30, 8, 62);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.strokeRect(-4, -30, 8, 62);
    ctx.fillStyle = '#8e9098';
    ctx.beginPath();
    ctx.moveTo(-26, -30);
    ctx.quadraticCurveTo(0, -42, 26, -30);
    ctx.lineTo(4, -24);
    ctx.lineTo(-4, -24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  // lamps on both posts
  for (const lx of [x + 17, x + w - 17]) hangingLantern(lx, y - h + 30);
  // rails out of the mouth
  rails(x - 220, y + 8, x + w, y + 8);
  oreCart(x - 120, y + 22, false);
}
function drawCamp() {
  if (!view(SLANT2[1] - 300, PORTAL_X + 600, Y_C - 700, Y_C + 200)) return;
  // the cliff face: sandstone layers, cracks, a few dry bushes on the ledges
  ctx.save();
  poly([...CLIFF, [END_X + 800, Y_C + 400], [CLIFF_X - 40, Y_C + 400]]);
  ctx.clip();
  ctx.fillStyle = T.patterns.strata;
  ctx.fillRect(CLIFF_X - 60, Y_C - 700, PORTAL_X - CLIFF_X + 900, 700);
  const sh = ctx.createLinearGradient(CLIFF_X - 40, 0, CLIFF_X + 220, 0);
  sh.addColorStop(0, 'rgba(255,190,120,.25)');
  sh.addColorStop(1, 'rgba(40,14,8,.2)');
  ctx.fillStyle = sh;
  ctx.fillRect(CLIFF_X - 60, Y_C - 700, 900, 700);
  ctx.restore();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.beginPath();
  CLIFF.slice(0, 9).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.stroke();
  headframe(SLANT2[1] - 110, Y_C - 4);
  // crates and a lamp post in the camp
  for (const [x, s] of [
    [CLIFF_X + 80, 1],
    [CLIFF_X + 118, 0.8],
    [CLIFF_X + 96, 0.7],
  ]) {
    const y = Y_C - 2 - (s < 0.75 ? 40 : 0);
    ctx.fillStyle = '#9a7048';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.fillRect(x - 20 * s, y - 40 * s, 40 * s, 40 * s);
    ctx.strokeRect(x - 20 * s, y - 40 * s, 40 * s, 40 * s);
    ctx.beginPath();
    ctx.moveTo(x - 20 * s, y - 40 * s);
    ctx.lineTo(x + 20 * s, y);
    ctx.stroke();
  }
  portal(PORTAL_X, Y_C);
}
function drawMine() {
  if (!view(PORTAL_X, END_X + 800, Y_C - 700, Y_C + 300)) return;
  // inside the hill: dark rock, the tunnel's back wall a shade darker
  // the inside of the hill begins past the portal behind a ragged edge of rock
  const edge = [];
  for (let y = Y_C - 900, i = 0; y <= Y_C; y += 40, i++)
    edge.push([PORTAL_X + 250 + ((i * 37) % 50) + (y > Y_C - 300 ? 0 : 40), y]);
  ctx.fillStyle = T.patterns.rock;
  poly([...edge, [END_X + 800, Y_C], [END_X + 800, Y_C - 900]]);
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.beginPath();
  edge.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.stroke();
  // deeper in, darker
  const g = ctx.createLinearGradient(PORTAL_X + 260, 0, PORTAL_X + 760, 0);
  g.addColorStop(0, 'rgba(10,6,4,0)');
  g.addColorStop(1, 'rgba(10,6,4,.35)');
  ctx.fillStyle = g;
  poly([...edge, [END_X + 800, Y_C], [END_X + 800, Y_C - 900]]);
  ctx.fill();
  // the slime's flooded hall: a glowing green pool far back
  const hx = HALL_X;
  if (view(hx - 500, hx + 500)) {
    ctx.fillStyle = '#1c1612';
    ctx.beginPath();
    ctx.ellipse(hx, Y_C - 20, 420, 300, 0, Math.PI, TAU);
    ctx.fill();
    const k = 0.75 + 0.25 * Math.sin(G.time * 2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = k;
    ctx.drawImage(T.green, hx - 380, Y_C - 360, 760, 420);
    ctx.restore();
    ctx.fillStyle = '#5fd83a';
    ctx.beginPath();
    ctx.ellipse(hx, Y_C - 22, 300, 24, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,255,160,.6)';
    for (let i = 0; i < 7; i++) {
      const bx = hx - 260 + ((i * 131 + G.time * 30) % 520);
      ctx.beginPath();
      ctx.arc(bx, Y_C - 24 - ((G.time * 20 + i * 9) % 20), 4 + ((i * 7) % 5), 0, TAU);
      ctx.fill();
    }
    for (const [dx, tip] of [
      [-330, 0],
      [-290, 0.4],
      [320, 0],
    ])
      drum(hx + dx, Y_C - 8, tip);
  }
  // the last cavern: a broken-down drill rig and red emergency lamps
  const fx = END_X - 480;
  if (view(fx - 700, fx + 800)) {
    ctx.fillStyle = '#1a1210';
    ctx.beginPath();
    ctx.ellipse(fx, Y_C - 60, 640, 300, 0, Math.PI, TAU);
    ctx.fill();
    drillRig(fx + 120, Y_C - 6);
    for (const dx of [-480, -160, 400]) {
      const on = Math.floor(G.time * 2 + dx) % 2 === 0;
      ctx.fillStyle = on ? '#ff3a2a' : '#6a1a14';
      ctx.beginPath();
      ctx.arc(fx + dx, Y_C - 250, 9, 0, TAU);
      ctx.fill();
      if (on) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(T.red, fx + dx - 120, Y_C - 370);
        ctx.restore();
      }
    }
  }
  tunnelWall(PORTAL_X + 380, HALL_X - 430);
  tunnelWall(HALL_X + 430, END_X - 900);
  if (view(PORTAL_X, END_X)) rails(PORTAL_X + 230, Y_C + 8, END_X - 700, Y_C + 8);
  if (view(6750, 6870)) oreCart(6810, Y_C + 22, false);
}

// --- public ----------------------------------------------------------------------------------

/** Everything behind the fighters. */
export function drawBG2() {
  if (!T) init();
  ctx.save();
  ctx.translate(-G.cam, -G.camY);
  // the ground itself: sandstone under the streets and in the cliff
  ctx.fillStyle = T.patterns.strata;
  ctx.fillRect(G.cam - 10, G.camY - 10, W + 20, H + 20);
  drawSky();
  drawTown();
  drawArch();
  drawCamp();
  drawMine();
  drawFloors();
  ctx.restore();
}
/** How far into the mine the camera is: 0 outside, 1 well inside. */
const inside = () => clamp((G.cam + W / 2 - PORTAL_X - 150) / 500, 0, 1);
/** The light over the fighters: the mine's gloom, the evening haze. */
export function drawFront2() {
  if (!T) init();
  const k = inside();
  if (k > 0) {
    // the mine is dark: light round the heroine and from the lamps, gloom at the edges
    const px = P.x - G.cam,
      py = P.y - G.camY - 90,
      g = ctx.createRadialGradient(px, py, 120, px, py, 620);
    g.addColorStop(0, 'rgba(8,4,2,0)');
    g.addColorStop(1, `rgba(8,4,2,${0.55 * k})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(-G.cam, -G.camY);
    for (let x = Math.ceil((G.cam - 200) / 560) * 560; x < G.cam + W + 200; x += 560)
      if (x > PORTAL_X + 380 && x < END_X - 900 && Math.abs(x - HALL_X) > 430) {
        ctx.globalAlpha = (0.8 + 0.2 * Math.sin(G.time * 9 + x)) * k;
        ctx.drawImage(T.lamp, x - 150, Y_C - TUN + 74 - 150);
      }
    ctx.restore();
  }
  if (k < 1) {
    // warm evening haze at the edges
    const g = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.45, W / 2, H * 0.55, H * 1.05);
    g.addColorStop(0, 'rgba(40,14,8,0)');
    g.addColorStop(1, `rgba(40,14,8,${0.4 * (1 - k)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}
export { DEPTH };
