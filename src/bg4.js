// Procedural scenery of the Wastelands (stage 4): a desert after the end of the world under a
// hot orange sky — flat-topped mesas far off, dunes, and along the road the leftovers of the
// old world and the war: power pylons with sagging cables, a billboard of the dead colony,
// rusted cars, the old highway under the drifting sand, the great head of one of the Legion's
// machines half buried, the bones of some huge beast, and a camp of the Children of the Crater
// glowing green. Over all of it the wind blows sand and the heat shimmers.
// Drawn in road coordinates (see level4.js); textures and the far strips are painted once.
import { H, OL, TAU, W } from './config.js';
import { mulberry } from './util.js';
import { APP, G } from './state.js';
import { ctx } from './gfx.js';
import { mk } from './background.js';
import { DEPTH, FLOOR, L4 } from './level4.js';

const { Y_A, HIGHWAY, END_X } = L4;
let T = null;

// --- painted once --------------------------------------------------------------------------

function speckle(g, w, h, r, n, cols, s0, s1) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[(r() * cols.length) | 0];
    const s = s0 + r() * (s1 - s0);
    g.fillRect(r() * w, r() * h, s, s * (0.5 + r() * 0.6));
  }
}
function makeTextures() {
  const P = {};
  // the sand of the road: ripples, pebbles
  P.sand = mk(256, DEPTH, (g, w, h) => {
    const r = mulberry(71);
    g.fillStyle = '#d9a660';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(150,90,40,.22)';
    g.lineWidth = 2;
    for (let y = 8; y < h; y += 13) {
      g.beginPath();
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin((x / w) * TAU * 2 + y) * 3);
      g.stroke();
    }
    speckle(g, w, h, r, 500, ['rgba(120,70,30,.25)', 'rgba(255,240,200,.25)'], 1, 3);
  });
  // the old highway: cracked asphalt, a faded dashed line, sand drifting over its edges
  P.road = mk(256, DEPTH, (g, w, h) => {
    const r = mulberry(72);
    g.fillStyle = '#5d5550';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 900, ['rgba(0,0,0,.18)', 'rgba(255,255,255,.08)'], 1, 3);
    g.fillStyle = 'rgba(232,206,120,.75)';
    for (let x = 10; x < w; x += 128) g.fillRect(x, h / 2 - 3, 64, 6);
    g.strokeStyle = 'rgba(20,16,14,.5)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      let x = r() * w,
        y = r() * h;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) g.lineTo((x += r() * 30 - 15), (y += r() * 20 - 4));
      g.stroke();
    }
    g.fillStyle = '#d9a660';
    for (const y0 of [0, h])
      for (let x = 0; x < w; x += 32) {
        g.beginPath();
        g.ellipse(x + r() * 20, y0, 30 + r() * 20, 14 + r() * 12, 0, 0, TAU);
        g.fill();
      }
  });
  return P;
}
/** A strip of flat-topped mesas (or of dunes), wide enough to repeat. */
function makeRange(seed, h, col, dunes) {
  return mk(1600, h, (g, w) => {
    const r = mulberry(seed);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, h);
    if (dunes) {
      for (let x = 0; x <= w; x += 20) {
        const y =
          h * (0.45 + 0.18 * Math.sin((x / w) * TAU * 3) + 0.08 * Math.sin((x / w) * TAU * 7));
        g.lineTo(x, y);
      }
    } else {
      let x = 0;
      g.lineTo(0, h * 0.8);
      while (x < w - 160) {
        const top = h * (0.15 + r() * 0.35),
          wide = 120 + r() * 220,
          slope = 24 + r() * 30;
        g.lineTo(x + 30, h * 0.8);
        g.lineTo(x + 30 + slope, top);
        g.lineTo(x + 30 + slope + wide, top);
        g.lineTo(x + 30 + slope * 2 + wide, h * 0.8);
        x += slope * 2 + wide + 40 + r() * 120;
      }
      g.lineTo(w, h * 0.8);
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    if (!dunes) {
      // the bands of rock
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(255,255,255,.12)';
      for (let y = h * 0.25; y < h; y += 18) g.fillRect(0, y, w, 4);
      g.globalCompositeOperation = 'source-over';
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
  for (const [k, c] of Object.entries(makeTextures()))
    T.patterns[k] = ctx.createPattern(c, 'repeat');
  T.mesas = makeRange(401, 200, '#c97c4e', false);
  T.mesas2 = makeRange(402, 170, '#b5653e', false);
  T.dunes = makeRange(403, 140, '#e2ae6a', true);
  T.sun = glowImg('rgba(255,236,170,.7)', 170);
  T.green = glowImg('rgba(150,255,90,.45)', 120);
}

// --- small pieces ---------------------------------------------------------------------------

const view = (x0, x1) => x1 > G.cam - 80 && x0 < G.cam + W + 80;
function fillOl(c, lw = 2.5) {
  ctx.fillStyle = c;
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = lw;
  ctx.stroke();
}
function shape(pts, c, lw) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  fillOl(c, lw);
}
function strip(img, par, y) {
  const off = -((((G.cam * par) % img.width) + img.width) % img.width);
  ctx.drawImage(img, off, y);
  ctx.drawImage(img, off + img.width, y);
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, '#e5874a');
  g.addColorStop(0.55, '#f6c27e');
  g.addColorStop(1, '#fde6b6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // the sun, high and white-hot
  ctx.drawImage(T.sun, 700 - 170 - G.cam * 0.02, 70 - 170);
  ctx.fillStyle = '#fff5d6';
  ctx.beginPath();
  ctx.arc(700 - G.cam * 0.02, 70, 34, 0, TAU);
  ctx.fill();
  // a vulture or two wheeling
  ctx.strokeStyle = 'rgba(60,30,20,.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const a = G.time * 0.4 + i * 3,
      x = 300 + i * 260 + Math.cos(a) * 60 - G.cam * 0.05,
      y = 90 + i * 20 + Math.sin(a) * 18,
      f = Math.sin(G.time * 5 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - f);
    ctx.quadraticCurveTo(x - 6, y - 6, x, y);
    ctx.quadraticCurveTo(x + 6, y - 6, x + 12, y - f);
    ctx.stroke();
  }
  strip(T.mesas, 0.08, 120);
  strip(T.mesas2, 0.16, 170);
  ctx.fillStyle = 'rgba(253,230,182,.35)'; // haze over the far ones
  ctx.fillRect(0, 120, W, 200);
  strip(T.dunes, 0.32, 222);
}

// --- along the back of the road ---------------------------------------------------------------

const B = Y_A; // the road's back edge: the scenery stands on it
/** A power pylon of the old colony, its cables sagging to the next one. */
function pylon(x) {
  ctx.strokeStyle = OL;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 26, B - 4);
  ctx.lineTo(x - 6, B - 210);
  ctx.lineTo(x + 6, B - 210);
  ctx.lineTo(x + 26, B - 4);
  for (let y = B - 40; y > B - 200; y -= 40) {
    const w = 26 - ((B - y) / 210) * 20;
    ctx.moveTo(x - w, y);
    ctx.lineTo(x + w - 6, y - 36);
    ctx.moveTo(x + w, y);
    ctx.lineTo(x - w + 6, y - 36);
  }
  ctx.moveTo(x - 40, B - 196);
  ctx.lineTo(x + 40, B - 196);
  ctx.stroke();
  ctx.strokeStyle = '#6f6458';
  ctx.lineWidth = 2;
  ctx.stroke();
  // the cables to the next one (one broken, hanging)
  ctx.strokeStyle = 'rgba(30,24,22,.8)';
  ctx.lineWidth = 1.5;
  for (const dx of [-38, 38]) {
    ctx.beginPath();
    ctx.moveTo(x + dx, B - 196);
    ctx.quadraticCurveTo(x + dx + 450, B - 120, x + dx + 900, B - 196);
    ctx.stroke();
  }
}
/** A rusted car, its windows gone, half sunk in the sand. */
function car(x, seed) {
  const r = mulberry(seed),
    col = ['#8a4a2a', '#5f7a7a', '#9a7a3a'][(r() * 3) | 0];
  ctx.save();
  ctx.translate(x, B - 6);
  ctx.rotate((r() - 0.5) * 0.12);
  shape(
    [
      [-70, 0],
      [-72, -26],
      [-46, -30],
      [-30, -54],
      [34, -54],
      [52, -30],
      [74, -26],
      [72, 0],
    ],
    col,
  );
  shape(
    [
      [-24, -32],
      [-14, -48],
      [10, -48],
      [10, -32],
    ],
    '#2a2420',
    2,
  );
  shape(
    [
      [16, -32],
      [16, -48],
      [30, -48],
      [40, -32],
    ],
    '#2a2420',
    2,
  );
  ctx.fillStyle = 'rgba(80,30,10,.45)';
  for (let i = 0; i < 6; i++)
    ctx.fillRect(-60 + r() * 120, -24 + r() * 18, 6 + r() * 10, 4 + r() * 4);
  for (const wx of [-44, 44]) {
    ctx.beginPath();
    ctx.arc(wx, -2, 13, Math.PI, 0);
    fillOl('#2c2a2a', 2);
  }
  ctx.restore();
  // sand drifted against it
  ctx.fillStyle = '#e2ae6a';
  ctx.beginPath();
  ctx.ellipse(x, B - 2, 90, 12, 0, Math.PI, 0);
  ctx.fill();
}
/** The billboard of the dead colony, faded, one leg broken. */
function billboard(x) {
  ctx.save();
  ctx.translate(x, B - 4);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-60, 0);
  ctx.lineTo(-60, -110);
  ctx.moveTo(60, 0);
  ctx.lineTo(54, -96);
  ctx.stroke();
  ctx.rotate(0.06);
  ctx.beginPath();
  ctx.rect(-110, -200, 220, 100);
  fillOl('#e8d8b0', 3);
  ctx.fillStyle = '#3f8aa0';
  ctx.fillRect(-104, -194, 208, 40);
  ctx.fillStyle = '#f6c27e';
  ctx.beginPath();
  ctx.arc(60, -174, 14, 0, TAU);
  ctx.fill();
  ctx.fillStyle = OL;
  ctx.font = 'bold 20px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NEW HOPE', -20, -166);
  ctx.font = 'bold 13px "Arial Black", Impact, sans-serif';
  ctx.fillText('COLONY · 40 MI', 0, -124);
  // torn corner, rust
  ctx.fillStyle = 'rgba(140,70,30,.5)';
  ctx.fillRect(-110, -110, 50, 10);
  ctx.restore();
}
/** The head of one of the Legion's great machines, half buried: a dead lamp for an eye. */
function bigHead(x) {
  ctx.save();
  ctx.translate(x, B + 4);
  shape(
    [
      [-150, 0],
      [-140, -120],
      [-90, -170],
      [80, -170],
      [130, -120],
      [150, 0],
    ],
    '#9a5532',
    3,
  );
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  for (let y = -150; y < 0; y += 24) ctx.fillRect(-140, y, 280, 5);
  // the visor and the eye
  shape(
    [
      [-100, -120],
      [100, -120],
      [90, -70],
      [-90, -70],
    ],
    '#2a2420',
    3,
  );
  ctx.beginPath();
  ctx.arc(-30, -96, 18, 0, TAU);
  fillOl('#5a4020', 2.5);
  ctx.fillStyle = `rgba(255,170,40,${0.25 + 0.2 * Math.sin(G.time * 1.3)})`;
  ctx.beginPath();
  ctx.arc(-30, -96, 9, 0, TAU);
  ctx.fill();
  // hazard stripes on its brow
  ctx.save();
  ctx.beginPath();
  ctx.rect(-110, -160, 220, 14);
  ctx.clip();
  ctx.fillStyle = '#e2b13a';
  ctx.fillRect(-110, -160, 220, 14);
  ctx.fillStyle = OL;
  for (let i = -110; i < 110; i += 18) {
    ctx.beginPath();
    ctx.moveTo(i, -146);
    ctx.lineTo(i + 9, -146);
    ctx.lineTo(i + 23, -160);
    ctx.lineTo(i + 14, -160);
    ctx.fill();
  }
  ctx.restore();
  // an aerial snapped off
  ctx.strokeStyle = OL;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(60, -170);
  ctx.lineTo(84, -230);
  ctx.lineTo(100, -224);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#e2ae6a';
  ctx.beginPath();
  ctx.ellipse(x, B, 190, 22, 0, Math.PI, 0);
  ctx.fill();
}
/** The ribs and skull of some huge beast. */
function bones(x) {
  ctx.strokeStyle = OL;
  ctx.lineCap = 'round';
  for (const [lw, c] of [
    [9, OL],
    [5, '#efe2c4'],
  ]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x - 120, B - 14);
    ctx.quadraticCurveTo(x, B - 40, x + 110, B - 16);
    for (let i = 0; i < 6; i++) {
      const bx = x - 90 + i * 34;
      ctx.moveTo(bx, B - 26);
      ctx.quadraticCurveTo(bx + 22, B - 120 + Math.abs(i - 2.5) * 14, bx + 40, B - 8);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(x + 140, B - 22, 34, 20, -0.2, 0, TAU);
  fillOl('#efe2c4');
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.arc(x + 146, B - 26, 6, 0, TAU);
  ctx.fill();
}
/** A camp of the Children of the Crater: ragged tents, a fire, a green glow from the pit. */
function camp(x) {
  ctx.drawImage(T.green, x - 120, B - 160);
  for (const [dx, s, c] of [
    [-90, 1, '#8a6a42'],
    [20, 1.2, '#6f5a3a'],
    [120, 0.9, '#9a7a4a'],
  ]) {
    shape(
      [
        [x + dx - 50 * s, B - 6],
        [x + dx, B - 90 * s],
        [x + dx + 50 * s, B - 6],
      ],
      c,
    );
    ctx.fillStyle = '#2a2018';
    ctx.beginPath();
    ctx.moveTo(x + dx - 10 * s, B - 6);
    ctx.lineTo(x + dx, B - 40 * s);
    ctx.lineTo(x + dx + 10 * s, B - 6);
    ctx.fill();
  }
  // a pole with a robot's head on it: their trophy
  ctx.strokeStyle = OL;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 200, B - 4);
  ctx.lineTo(x + 200, B - 120);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 200, B - 130, 16, Math.PI, 0);
  ctx.closePath();
  fillOl('#5a6068');
  ctx.fillStyle = '#5a4020';
  ctx.beginPath();
  ctx.arc(x + 206, B - 136, 5, 0, TAU);
  ctx.fill();
  // smoke from the fire
  for (let i = 0; i < 4; i++) {
    const u = (G.time * 0.25 + i / 4) % 1;
    ctx.fillStyle = `rgba(90,80,70,${0.35 * (1 - u)})`;
    ctx.beginPath();
    ctx.arc(x - 30 + u * 20, B - 30 - u * 140, 10 + u * 24, 0, TAU);
    ctx.fill();
  }
}
/** A dead thorn bush. */
function thorn(x, s) {
  ctx.strokeStyle = '#4a3020';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(x, B - 2);
    ctx.lineTo(x + i * 12 * s, B - (30 - Math.abs(i) * 6) * s);
    ctx.lineTo(x + i * 18 * s, B - (38 - Math.abs(i) * 4) * s);
  }
  ctx.stroke();
}

const PYLONS = [300, 1200, 2100, 3000, 3900, 4800];
const CARS = [
  [700, 11],
  [1650, 12],
  [2350, 13],
  [3350, 14],
  [4300, 15],
  [5300, 16],
];
function drawBack() {
  // the near dunes the road runs along
  ctx.fillStyle = '#e8b878';
  ctx.beginPath();
  ctx.moveTo(G.cam - 100, B + 2);
  for (let x = G.cam - 100; x <= G.cam + W + 100; x += 30)
    ctx.lineTo(x, B - 30 - 18 * Math.sin(x * 0.004) - 10 * Math.sin(x * 0.011));
  ctx.lineTo(G.cam + W + 100, B + 2);
  ctx.closePath();
  ctx.fill();
  for (const x of PYLONS) if (view(x - 40, x + 940)) pylon(x);
  if (view(800, 1020)) billboard(910);
  for (let x = 160; x < END_X; x += 430)
    if (view(x - 40, x + 40)) thorn(x, 0.8 + ((x / 430) % 3) * 0.2);
  if (view(1300, 1700)) bones(1450);
  if (view(2500, 2900)) bigHead(2700);
  if (view(4400, 4900)) camp(4620);
  for (const [x, s] of CARS) if (view(x - 100, x + 100)) car(x, s);
}

// --- the road ---------------------------------------------------------------------------------

function drawRoad() {
  const [f] = FLOOR,
    x0 = Math.max(G.cam - 20, f[0][0]),
    x1 = Math.min(G.cam + W + 20, f[1][0]);
  // the front bank under the road
  ctx.fillStyle = '#b8824a';
  ctx.fillRect(x0, B + DEPTH, x1 - x0, 200);
  ctx.fillStyle = T.patterns.sand;
  ctx.fillRect(x0, B, x1 - x0, DEPTH);
  // the old highway under the sand
  const h0 = Math.max(x0, HIGHWAY[0]),
    h1 = Math.min(x1, HIGHWAY[1]);
  if (h1 > h0) {
    ctx.save();
    ctx.translate(0, B);
    ctx.fillStyle = T.patterns.road;
    ctx.fillRect(h0, 22, h1 - h0, DEPTH - 44);
    ctx.restore();
    // its ends lost under drifts
    ctx.fillStyle = '#d9a660';
    for (const hx of HIGHWAY)
      if (hx > x0 - 80 && hx < x1 + 80) {
        ctx.beginPath();
        ctx.ellipse(hx, B + DEPTH / 2, 70, DEPTH / 2, 0, 0, TAU);
        ctx.fill();
      }
  }
  // a shade under the back edge
  ctx.fillStyle = 'rgba(80,40,10,.18)';
  ctx.fillRect(x0, B, x1 - x0, 10);
}

export function drawBG4() {
  if (!T) init();
  ctx.save();
  drawSky();
  ctx.translate(-G.cam, -G.camY);
  drawBack();
  drawRoad();
  ctx.restore();
}

// --- in front of everyone -----------------------------------------------------------------------

/** The wind blowing sand across the screen, and the heat. */
export function drawFront4() {
  if (!T) init();
  if (!APP.lowFx) {
    ctx.strokeStyle = 'rgba(255,230,180,.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 26; i++) {
      const sp = 380 + (i % 5) * 70,
        x = ((((i * 197 - G.time * sp - G.cam * 1.1) % (W + 200)) + W + 200) % (W + 200)) - 100,
        y = 200 + ((i * 89) % 330) + Math.sin(G.time * 2 + i) * 6;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 26 + (i % 3) * 10, y - 2);
    }
    ctx.stroke();
  }
  // the heat: a warm wash at the top of the screen
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(255,170,90,.12)');
  g.addColorStop(0.4, 'rgba(255,170,90,0)');
  g.addColorStop(1, 'rgba(120,60,20,.12)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
