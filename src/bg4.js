// Procedural scenery of Frostfang Pass (stage 4), after Golden Axe's: the village of thatched
// huts in the morning sun (a windmill, a well, a market stall, oaks and smoke from the
// chimneys); the road climbing into green hills under the far snowy peaks; the trail straight
// up the mountainside between walls of rock; the ledge along the cliff at noon, the great
// waterfall pouring past it into the gorge (a plank bridge over it, mist and a rainbow), the
// pool under a second cascade; then, as the sun goes down, the path into the dark forest, and
// night, fireflies and fog, and the glade of standing stones under the moon, where the frost
// wolf's cold creeps over the ground.
// Drawn in road coordinates (see level4.js); textures, the far peaks and the clouds are
// painted once.
import { H, OL, W } from './config.js';
import { clamp, lerp, mulberry } from './util.js';
import { APP, G } from './state.js';
import { ctx } from './gfx.js';
import { mk } from './background.js';
import { DEPTH, FLOOR, L4, PITS, topY } from './level4.js';

const { Y_A, Y_B, Y_C, Y_D, VILLAGE_END, ROAD, CLIMB, FALLS, BRIDGE, POOL_X, DESCENT } = L4;
const { GLADE_X, END_X } = L4;
const CLIFF_TOP = Y_C - 262; // the top of the cliff behind the ledge (sky above it)
let T = null;

// --- the time of day ---------------------------------------------------------------------------

/** The time of day where the camera is: 0 morning, 0.33 noon, 0.66 sunset, 1 night. */
export function dayAt(cam = G.cam) {
  const x = cam + W / 2,
    K = [
      [0, 0.02],
      [2600, 0.14],
      [5200, 0.33],
      [7800, 0.42],
      [9200, 0.66],
      [10600, 1],
    ];
  for (let i = 0; i < K.length - 1; i++)
    if (x < K[i + 1][0])
      return lerp(K[i][1], K[i + 1][1], clamp((x - K[i][0]) / (K[i + 1][0] - K[i][0]), 0, 1));
  return 1;
}
const SKY = [
  [0, [120, 170, 225], [250, 214, 170]],
  [0.33, [70, 135, 215], [190, 225, 245]],
  [0.66, [70, 50, 110], [240, 140, 80]],
  [1, [10, 14, 40], [36, 50, 96]],
];
function skyCols(d) {
  let i = 0;
  while (i < SKY.length - 2 && d > SKY[i + 1][0]) i++;
  const [a, b] = [SKY[i], SKY[i + 1]],
    u = clamp((d - a[0]) / (b[0] - a[0]), 0, 1),
    mix = (p, q) => `rgb(${p.map((v, k) => Math.round(lerp(v, q[k], u))).join(',')})`;
  return [mix(a[1], b[1]), mix(a[2], b[2])];
}
/** How dark the world is (0 by day, 1 at night) and how red (at sunset). */
export const nightAt = (cam) => clamp((dayAt(cam) - 0.5) / 0.5, 0, 1);
const duskAt = (cam) => clamp(1 - Math.abs(dayAt(cam) - 0.66) / 0.2, 0, 1);

// --- textures -----------------------------------------------------------------------------------

function speckle(g, w, h, r, n, cols, s0, s1) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[(r() * cols.length) | 0];
    const s = s0 + r() * (s1 - s0);
    g.fillRect(r() * w, r() * h, s, s * (0.5 + r() * 0.6));
  }
}
function makeTextures() {
  const P = {};
  // the village street: packed earth, ruts and pebbles
  P.dirt = mk(256, DEPTH, (g, w, h) => {
    const r = mulberry(41);
    g.fillStyle = '#9a7650';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 700, ['rgba(60,40,20,.25)', 'rgba(255,230,190,.12)'], 1, 3);
    g.strokeStyle = 'rgba(70,46,24,.3)';
    g.lineWidth = 3;
    for (const y of [h * 0.38, h * 0.62]) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + 2);
      g.stroke();
    }
    for (let i = 0; i < 26; i++) {
      g.fillStyle = r() < 0.5 ? '#b8a080' : '#7d6448';
      g.beginPath();
      g.ellipse(r() * w, r() * h, 2 + r() * 4, 1.5 + r() * 2, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
  // the hill road: earth with grass growing in from the sides
  P.hill = mk(256, DEPTH + 24, (g, w, h) => {
    const r = mulberry(42);
    g.fillStyle = '#8f7a52';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 500, ['rgba(60,40,20,.2)', 'rgba(255,240,200,.1)'], 1, 3);
    for (let i = 0; i < 160; i++) {
      const x = r() * w,
        y = r() < 0.5 ? r() * 30 : h - r() * 30;
      g.strokeStyle = r() < 0.5 ? '#6a9a3a' : '#88b04a';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + r() * 6 - 3, y - 5 - r() * 6);
      g.stroke();
    }
  });
  // the climb: stone steps going up the mountainside
  P.steps = mk(300, 220, (g, w, h) => {
    const r = mulberry(43);
    g.fillStyle = '#9a8460';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 700, ['rgba(60,40,20,.2)', 'rgba(255,240,200,.12)'], 1, 3);
    // flat stones set into the path here and there
    for (let i = 0; i < 14; i++) {
      g.fillStyle = r() < 0.5 ? '#8f8a80' : '#a39d90';
      g.beginPath();
      g.ellipse(r() * w, r() * h, 10 + r() * 14, 5 + r() * 6, 0, 0, Math.PI * 2);
      g.fill();
    }
    // a step of logs and stones every so often: its riser in shadow, its edge in the light
    for (const y of [60, 170]) {
      g.fillStyle = 'rgba(40,28,16,.45)';
      g.fillRect(0, y, w, 9);
      g.fillStyle = 'rgba(255,240,210,.22)';
      g.fillRect(0, y - 3, w, 3);
    }
  });
  // the ledge: bare rock with cracks
  P.rock = mk(256, DEPTH, (g, w, h) => {
    const r = mulberry(44);
    g.fillStyle = '#7d7a72';
    g.fillRect(0, 0, w, h);
    speckle(
      g,
      w,
      h,
      r,
      600,
      ['rgba(0,0,0,.18)', 'rgba(255,255,255,.1)', 'rgba(90,110,70,.25)'],
      1,
      4,
    );
    g.strokeStyle = 'rgba(30,28,24,.4)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      let x = r() * w,
        y = r() * h;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) g.lineTo((x += r() * 30 - 10), (y += r() * 14 - 7));
      g.stroke();
    }
  });
  // the cliff face: tall rock, strata and cracks
  P.cliff = mk(300, 300, (g, w, h) => {
    const r = mulberry(45);
    g.fillStyle = '#857a6c';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 18 + r() * 20) {
      g.fillStyle = ['rgba(0,0,0,.12)', 'rgba(255,240,220,.08)', 'rgba(150,90,50,.14)'][
        (r() * 3) | 0
      ];
      g.fillRect(0, y, w, 6 + r() * 8);
    }
    // patches of moss
    for (let i = 0; i < 10; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(90,130,60,.45)' : 'rgba(110,150,70,.35)';
      g.beginPath();
      g.ellipse(r() * w, r() * h, 8 + r() * 18, 4 + r() * 6, 0, 0, Math.PI * 2);
      g.fill();
    }
    speckle(g, w, h, r, 700, ['rgba(0,0,0,.2)', 'rgba(255,255,255,.08)'], 1, 4);
    g.strokeStyle = 'rgba(25,22,20,.5)';
    g.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      let x = r() * w,
        y = r() * h;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 5; k++) g.lineTo((x += r() * 16 - 8), (y += 10 + r() * 20));
      g.stroke();
    }
  });
  // the bridge's planks, laid across
  P.planks = mk(56, 64, (g, w, h) => {
    const r = mulberry(46);
    for (let x = 0; x < w; x += 14) {
      g.fillStyle = r() < 0.5 ? '#9a6a3a' : '#8a5a32';
      g.fillRect(x, 0, 13, h);
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(x + 13, 0, 1, h);
      g.fillStyle = 'rgba(255,230,180,.15)';
      g.fillRect(x + 2, 0, 2, h);
    }
  });
  // the forest floor: dark earth, fallen leaves, roots
  P.forest = mk(256, DEPTH, (g, w, h) => {
    const r = mulberry(47);
    g.fillStyle = '#4a3a2a';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 600, ['rgba(0,0,0,.25)', 'rgba(140,90,40,.3)', 'rgba(90,110,40,.3)'], 2, 5);
    g.strokeStyle = 'rgba(30,20,12,.5)';
    g.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const y = r() * h;
      g.beginPath();
      g.moveTo(r() * w, y);
      g.quadraticCurveTo(r() * w, y + 10, r() * w, y + r() * 20);
      g.stroke();
    }
  });
  // the glade: the same earth, frost creeping over it
  P.frost = mk(256, DEPTH, (g, w, h) => {
    const r = mulberry(48);
    g.drawImage(P.forest, 0, 0);
    speckle(g, w, h, r, 900, ['rgba(220,245,255,.35)', 'rgba(255,255,255,.25)'], 1, 4);
  });
  return P;
}
/** The far peaks: a strip of snowy mountains, and a nearer one of green hills. */
function makeRange(seed, h, col, snow, hills) {
  return mk(1600, h, (g, w) => {
    const r = mulberry(seed);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, h);
    const pts = [];
    for (let x = 0; x <= w; x += hills ? 60 : 120) {
      const y = hills ? h * (0.4 + r() * 0.25) : h * (0.1 + r() * 0.55);
      pts.push([x, y]);
    }
    pts[pts.length - 1][1] = pts[0][1];
    for (const [x, y] of pts) hills ? g.lineTo(x, y) : g.lineTo(x, y);
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    if (snow)
      for (let i = 1; i < pts.length - 1; i++) {
        const [x, y] = pts[i];
        if (y > h * 0.4) continue;
        g.fillStyle = snow;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - 26, y + 34);
        g.lineTo(x - 10, y + 26);
        g.lineTo(x + 4, y + 38);
        g.lineTo(x + 24, y + 30);
        g.closePath();
        g.fill();
      }
  });
}
function makeCloud(seed) {
  return mk(260, 110, (g) => {
    const r = mulberry(seed);
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.arc(50 + r() * 160, 55 + r() * 22, 20 + r() * 26, 0, Math.PI * 2);
      g.fill();
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
  for (const [k, c] of Object.entries(tex)) T.patterns[k] = ctx.createPattern(c, 'repeat');
  T.peaks = makeRange(301, 260, '#8a9ab8', '#f2f6fb', false);
  T.hills = makeRange(302, 200, '#5f8a4e', null, true);
  T.clouds = [makeCloud(1), makeCloud(2), makeCloud(3)];
  T.moon = glowImg('rgba(200,225,255,.5)', 120);
  T.fly = glowImg('rgba(220,255,140,.9)', 10);
  T.warm = glowImg('rgba(255,190,90,.55)', 60);
}

// --- small pieces ---------------------------------------------------------------------------------

const poly = (pts) => {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
};
const view = (x0, x1, y0 = -1e9, y1 = 1e9) =>
  x1 > G.cam - 60 && x0 < G.cam + W + 60 && y1 > G.camY - 60 && y0 < G.camY + H + 60;
function fillOl(c, lw = 2) {
  ctx.fillStyle = c;
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = lw;
  ctx.stroke();
}
function box(x, y, w, h, c, lw = 2) {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  fillOl(c, lw);
}
/** Two copies of a parallax strip side by side, scrolled with the camera. */
function strip(img, par, y) {
  const off = -((((G.cam * par) % img.width) + img.width) % img.width);
  ctx.drawImage(img, off, y);
  ctx.drawImage(img, off + img.width, y);
}
/** A round-headed oak (or, `dark`, a tree of the night forest). */
function oak(x, y, s, seed, dark = 0) {
  const r = mulberry(seed);
  box(x - 7 * s, y - 70 * s, 14 * s, 70 * s, dark ? '#2a2018' : '#6a4630');
  const greens = dark ? ['#1c2c22', '#22362a', '#18241c'] : ['#4f8a3a', '#5f9a44', '#3f7a32'];
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(
      x + (r() - 0.5) * 70 * s,
      y - 90 * s - r() * 50 * s,
      (24 + r() * 16) * s,
      0,
      Math.PI * 2,
    );
    fillOl(greens[i % 3], 2);
  }
}
/** A pine: a trunk, three tiers of needles (snow on them, `snow`). */
function pine(x, y, s, col = '#2f5a3a', snow = null) {
  box(x - 4 * s, y - 24 * s, 8 * s, 24 * s, '#4a3424');
  for (let i = 0; i < 3; i++) {
    const w = (34 - i * 8) * s,
      top = y - (24 + 30 + i * 26) * s,
      bot = y - (16 + i * 26) * s;
    poly([
      [x, top - 14 * s],
      [x + w, bot],
      [x - w, bot],
    ]);
    fillOl(col, 2);
    if (snow) {
      poly([
        [x, top - 14 * s],
        [x + w * 0.4, top + 6 * s],
        [x, top + 2 * s],
        [x - w * 0.4, top + 6 * s],
      ]);
      ctx.fillStyle = snow;
      ctx.fill();
    }
  }
}
/** A boulder. */
function boulder(x, y, w, h, seed, col = '#7d7a72') {
  const r = mulberry(seed),
    pts = [];
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    pts.push([x + Math.cos(a) * w * (0.8 + r() * 0.2), y + Math.sin(a) * h * (0.8 + r() * 0.25)]);
  }
  poly(pts);
  fillOl(col, 2);
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.beginPath();
  ctx.ellipse(x - w * 0.2, y - h * 0.6, w * 0.3, h * 0.15, -0.3, 0, Math.PI * 2);
  ctx.fill();
}
/** A loose stone lying on the ground (all of it, not half sunk like a boulder). */
function stone(x, y, w, h, seed) {
  const r = mulberry(seed),
    pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pts.push([
      x + Math.cos(a) * w * (0.75 + r() * 0.25),
      y - h / 2 + Math.sin(a) * h * 0.5 * (0.75 + r() * 0.25),
    ]);
  }
  poly(pts);
  fillOl('#8f8a80', 2);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath();
  ctx.ellipse(x - w * 0.25, y - h * 0.7, w * 0.3, h * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
}
/** Chimney smoke: puffs rising and drifting (no chance used: replays agree). */
function smoke(x, y, seed) {
  for (let i = 0; i < 5; i++) {
    const u = (((G.time * 0.35 + i / 5 + seed * 0.13) % 1) + 1) % 1;
    ctx.fillStyle = `rgba(230,230,235,${0.45 * (1 - u)})`;
    ctx.beginPath();
    ctx.arc(x + u * 40 + Math.sin(u * 6 + seed) * 6, y - u * 120, 6 + u * 16, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- the sky ---------------------------------------------------------------------------------------

function drawSky() {
  const d = dayAt(),
    n = nightAt(G.cam),
    [top, bot] = skyCols(d),
    g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const dy = -(G.camY - (Y_A - 358)) * 0.12;
  // the stars and the moon at night
  if (n > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.8 * n})`;
    for (let i = 0; i < 70; i++) {
      const x = (i * 137.7) % W,
        y = (i * 71.3) % (H * 0.6);
      const tw = 0.6 + 0.4 * Math.sin(G.time * 2 + i);
      ctx.fillRect(x, y, 1.6 * tw, 1.6 * tw);
    }
    const mx = W * 0.74 - clamp((G.cam - GLADE_X + 1200) / 1600, 0, 1) * 160,
      my = 110;
    ctx.save();
    ctx.globalAlpha = n;
    if (!APP.lowFx) ctx.drawImage(T.moon, mx - 120, my - 120);
    ctx.fillStyle = '#f2f6ff';
    ctx.beginPath();
    ctx.arc(mx, my, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,180,210,.35)';
    for (const [a, b, r] of [
      [-12, -8, 9],
      [14, 10, 7],
      [6, -18, 5],
    ]) {
      ctx.beginPath();
      ctx.arc(mx + a, my + b, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else {
    // the sun, low in the morning, high at noon, going down red at sunset
    const sy = 90 + Math.abs(d - 0.33) * 260;
    ctx.fillStyle = d > 0.5 ? '#ffb070' : '#fff6d8';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(W * 0.22, sy, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // clouds drifting by day
  ctx.save();
  ctx.globalAlpha = 0.9 * (1 - n);
  for (let i = 0; i < 4; i++) {
    const x = ((((i * 330 - G.cam * 0.05 + G.time * 8) % (W + 300)) + W + 300) % (W + 300)) - 260;
    ctx.drawImage(T.clouds[i % 3], x, 30 + i * 34 + dy * 0.3);
  }
  ctx.restore();
  // the far peaks and the green hills (they sink as the road climbs)
  strip(T.peaks, 0.08, 150 + dy);
  ctx.save();
  ctx.globalAlpha = 1 - clamp((G.cam - 9000) / 1200, 0, 1);
  strip(T.hills, 0.16, 250 + dy * 1.6);
  ctx.restore();
  // the light of the hour over the far scenery
  if (n > 0 || duskAt(G.cam) > 0) {
    ctx.fillStyle = `rgba(12,16,44,${0.55 * n})`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(255,120,60,${0.16 * duskAt(G.cam)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// --- the village -----------------------------------------------------------------------------------

/** A hut: whitewashed walls in a timber frame, a thatched roof, a door, shuttered windows. */
function hut(x, y, w, h, seed) {
  const r = mulberry(seed);
  box(x, y - h, w, h, '#e8dcc0');
  ctx.strokeStyle = '#5a3a22';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + 3, y - h * 0.5);
  ctx.lineTo(x + w - 3, y - h * 0.5);
  for (const fx of [0.33, 0.66]) {
    ctx.moveTo(x + w * fx, y - h);
    ctx.lineTo(x + w * fx, y);
  }
  ctx.moveTo(x + 3, y - h + 3);
  ctx.lineTo(x + w * 0.33, y - h * 0.5);
  ctx.stroke();
  // the door, a window with open shutters
  const dx = x + w * (0.4 + r() * 0.15);
  box(dx, y - 62, 30, 62, '#6a4630');
  ctx.fillStyle = '#c9a24a';
  ctx.beginPath();
  ctx.arc(dx + 24, y - 30, 2.5, 0, Math.PI * 2);
  ctx.fill();
  const wx = x + w * 0.12;
  box(wx, y - h * 0.42, 26, 24, r() < 0.5 ? '#ffd88a' : '#2a2a34');
  box(wx - 10, y - h * 0.42, 9, 24, '#4f7a9a', 1.5);
  box(wx + 27, y - h * 0.42, 9, 24, '#4f7a9a', 1.5);
  // the thatch, hanging over the walls
  poly([
    [x - 18, y - h + 6],
    [x + w + 18, y - h + 6],
    [x + w * 0.62, y - h - h * 0.75],
    [x + w * 0.38, y - h - h * 0.75],
  ]);
  fillOl('#c9a24a', 2.5);
  ctx.strokeStyle = 'rgba(120,80,30,.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = 0; k < 9; k++) {
    const u = k / 8,
      tx = lerp(x + w * 0.38, x + w * 0.62, u),
      bx = lerp(x - 18, x + w + 18, u);
    ctx.moveTo(tx, y - h - h * 0.72);
    ctx.lineTo(bx, y - h + 4);
  }
  ctx.stroke();
  // a chimney, smoking
  if (r() < 0.7) {
    const cx = x + w * 0.66;
    box(cx, y - h - h * 0.62, 16, 34, '#8a7a6a');
    smoke(cx + 8, y - h - h * 0.66, seed);
  }
}
/** The windmill: a stone tower, a cap, four sails turning slowly. */
function mill(x, y) {
  poly([
    [x - 46, y],
    [x + 46, y],
    [x + 30, y - 240],
    [x - 30, y - 240],
  ]);
  fillOl('#cfc4b0', 2.5);
  box(x - 12, y - 60, 24, 60, '#6a4630');
  box(x - 8, y - 160, 16, 20, '#2a2a34');
  poly([
    [x - 40, y - 236],
    [x + 40, y - 236],
    [x, y - 290],
  ]);
  fillOl('#8a3a2a', 2.5);
  const a0 = G.time * 0.6;
  ctx.save();
  ctx.translate(x, y - 236);
  for (let k = 0; k < 4; k++) {
    ctx.save();
    ctx.rotate(a0 + (k * Math.PI) / 2);
    box(-3, 0, 6, 150, '#5a3a22', 1.5);
    box(3, 30, 28, 116, 'rgba(240,232,210,.92)', 1.5);
    ctx.strokeStyle = 'rgba(90,60,30,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let yy = 44; yy < 146; yy += 14) {
      ctx.moveTo(3, yy);
      ctx.lineTo(31, yy);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  fillOl('#5a3a22');
  ctx.restore();
}
/** The village well: a ring of stones, a little roof, a bucket on its rope. */
function well(x, y) {
  box(x - 34, y - 40, 68, 40, '#9a948a');
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let k = 1; k < 3; k++) {
    ctx.moveTo(x - 34, y - 40 + k * 13);
    ctx.lineTo(x + 34, y - 40 + k * 13);
  }
  ctx.stroke();
  for (const px of [x - 30, x + 24]) box(px, y - 110, 6, 70, '#6a4630');
  poly([
    [x - 46, y - 104],
    [x + 46, y - 104],
    [x, y - 140],
  ]);
  fillOl('#8a3a2a');
  ctx.strokeStyle = '#3a2a1e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 106);
  ctx.lineTo(x, y - 70);
  ctx.stroke();
  box(x - 8, y - 72, 16, 14, '#8a5a32', 1.5);
}
/** A market stall: a counter of crates, a striped awning, fruit. */
function stall(x, y, seed) {
  const r = mulberry(seed);
  for (const px of [x, x + 116]) box(px, y - 130, 6, 130, '#6a4630');
  box(x - 6, y - 52, 134, 52, '#8a5a32');
  for (let k = 0; k < 8; k++) {
    ctx.beginPath();
    ctx.arc(x + 10 + k * 15, y - 58, 6, 0, Math.PI * 2);
    fillOl(['#d84a3a', '#f0b43c', '#6aa84a'][(r() * 3) | 0], 1.5);
  }
  for (let k = 0; k < 6; k++) {
    poly([
      [x - 12 + k * 25, y - 140],
      [x + 13 + k * 25, y - 140],
      [x + 13 + k * 25, y - 118],
      [x - 12 + k * 25, y - 118],
    ]);
    fillOl(k % 2 ? '#f2ead8' : '#b02a3a', 1.5);
  }
}
/** A wooden fence along the back of the street. */
function fenceBack(x0, x1, y) {
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  for (let x = x0; x < x1; x += 30) box(x, y - 46, 8, 46, '#9a7a52', 1.5);
  box(x0 - 4, y - 38, x1 - x0, 6, '#8a6a46', 1.5);
  box(x0 - 4, y - 20, x1 - x0, 6, '#8a6a46', 1.5);
}
function drawVillage() {
  const x1 = VILLAGE_END + 200;
  if (!view(-200, x1 + 600, -400, Y_A + DEPTH)) return;
  const r = mulberry(7);
  let x = -120;
  while (x < VILLAGE_END - 120) {
    const w = 140 + r() * 70,
      h = 100 + r() * 30,
      seed = (r() * 1000) | 0,
      gap = 60 + r() * 90,
      what = r();
    if (view(x - 60, x + w + gap + 60)) {
      if (Math.abs(x - 1700) < 120) mill(x + w / 2, Y_A - 4);
      else hut(x, Y_A - 4, w, h, seed);
      if (what < 0.4) oak(x + w + gap / 2, Y_A - 6, 0.9, seed);
      else if (what < 0.6) fenceBack(x + w + 6, x + w + gap - 6, Y_A - 2);
    }
    x += w + gap;
  }
  if (view(980, 1100)) well(1040, Y_A + 2);
  if (view(560, 720)) stall(580, Y_A - 2, 9);
  if (view(2040, 2200)) stall(2060, Y_A - 2, 10);
  // the village sign at the end of it
  const sx = VILLAGE_END - 60;
  if (view(sx - 40, sx + 80)) {
    box(sx, Y_A - 110, 8, 110, '#6a4630');
    poly([
      [sx - 30, Y_A - 104],
      [sx + 74, Y_A - 104],
      [sx + 90, Y_A - 88],
      [sx + 74, Y_A - 72],
      [sx - 30, Y_A - 72],
    ]);
    fillOl('#9a6a3a');
  }
}

// --- the hills and the climb ---------------------------------------------------------------------

/** The green rise behind the village and the hill road, going up into the mountain. */
const ridgeY = (x) =>
  Math.min(Y_A, topY(x)) - 125 - 35 * Math.sin(x / 240) - clamp((x - 3800) / 700, 0, 1) * 520;
function drawRidge() {
  const x0 = Math.max(-200, G.cam - 100),
    x1 = Math.min(CLIMB[0], G.cam + W + 100);
  if (x1 <= x0 || !view(x0, x1, Y_C - 200, Y_A + DEPTH)) return;
  ctx.fillStyle = '#6a9a4a';
  ctx.beginPath();
  ctx.moveTo(x0, Y_A + 200);
  for (let x = x0; x <= x1 + 40; x += 40) ctx.lineTo(x, ridgeY(x));
  ctx.lineTo(x1 + 40, Y_A + 200);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,70,30,.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
}
/** Rocks and grass along the sides of the trail up the mountain (on the floor). */
function climbEdges() {
  if (!view(CLIMB[0], CLIMB[1], Y_C, Y_B)) return;
  const r = mulberry(23);
  for (const side of [0, 1]) {
    const x = side ? CLIMB[1] : CLIMB[0];
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(side ? x - 18 : x, Y_C, 18, Y_B - Y_C);
    for (let y = Y_C + 30; y < Y_B; y += 46 + r() * 40) {
      if (!view(x - 40, x + 40, y - 30, y + 10)) {
        r();
        r();
        continue;
      }
      if (r() < 0.55)
        stone(side ? x - 14 : x + 14, y + 4, 18 + r() * 10, 14 + r() * 6, (y | 0) + side);
      else {
        ctx.strokeStyle = '#5f9a44';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const gx = (side ? x - 22 : x + 6) + k * 4;
          ctx.moveTo(gx, y);
          ctx.lineTo(gx + (k - 2) * 3, y - 12 - (k % 2) * 6);
        }
        ctx.stroke();
        r();
      }
    }
  }
}
function drawHills() {
  const x0 = VILLAGE_END - 100,
    x1 = CLIMB[1] + 500;
  if (!view(x0, x1, Y_C - 400, Y_B + DEPTH + 300)) return;
  const r = mulberry(11);
  for (let x = x0 + 60; x < CLIMB[0] - 80; x += 90 + r() * 120) {
    const y = topY(x) - 6 - r() * 30,
      k = r();
    if (!view(x - 60, x + 60, y - 200, y + 20)) continue;
    if (k < 0.45) pine(x, y, 0.9 + r() * 0.4);
    else if (k < 0.7) boulder(x, y, 26 + r() * 20, 22 + r() * 12, (r() * 99) | 0);
    else oak(x, y, 0.7, (r() * 99) | 0);
  }
  // a wayside shrine on the hill road
  const sx = 3900;
  if (view(sx - 60, sx + 60)) {
    box(sx - 24, Y_B - 70, 48, 70, '#9a948a');
    poly([
      [sx - 34, Y_B - 68],
      [sx + 34, Y_B - 68],
      [sx, Y_B - 100],
    ]);
    fillOl('#6a5a4a');
    ctx.fillStyle = '#ffcf6a';
    ctx.beginPath();
    ctx.arc(sx, Y_B - 40, 7 + Math.sin(G.time * 6) * 1, 0, Math.PI * 2);
    ctx.fill();
  }
  // the walls of rock on both sides of the trail up the mountain
  for (const [a, b] of [
    [CLIMB[0] - 260, CLIMB[0]],
    [CLIMB[1], CLIMB[1] + 320],
  ]) {
    if (!view(a, b, Y_C - 400, Y_B + DEPTH + 300)) continue;
    const left = a < CLIMB[0];
    ctx.fillStyle = T.patterns.cliff;
    poly(
      left
        ? [
            [a, CLIFF_TOP - 100],
            [b, CLIFF_TOP - 100],
            [b, Y_B + 4],
            [a + 120, Y_B - 40],
            [a, Y_B - 120],
          ]
        : [
            [a, CLIFF_TOP - 100],
            [b, CLIFF_TOP - 100],
            [b, Y_B + DEPTH + 300],
            [a, Y_B + DEPTH + 300],
          ],
    );
    ctx.fill();
    ctx.strokeStyle = OL;
    ctx.lineWidth = 3;
    ctx.stroke();
    // pines clinging to the rock
    const rr = mulberry(left ? 21 : 22);
    for (let y = CLIFF_TOP; y < Y_B - 60; y += 110 + rr() * 80)
      pine(left ? a + 60 + rr() * 120 : a + 80 + rr() * 160, y, 0.8, '#2a4a32');
  }
}

// --- the ledge, the falls, the pool --------------------------------------------------------------

/** Falling water: streaks running down, `a` its strength. */
function water(x0, x1, y0, y1, a = 1) {
  if (!view(x0, x1, y0, y1)) return;
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(120,180,220,.85)');
  g.addColorStop(0.5, 'rgba(210,240,255,.95)');
  g.addColorStop(1, 'rgba(120,180,220,.85)');
  ctx.fillStyle = g;
  ctx.globalAlpha = a;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = x0 + 6; x < x1; x += 11) {
    const off = (G.time * 420 + x * 7.3) % 90;
    for (let y = y0 - 90 + off; y < y1; y += 90) {
      ctx.moveTo(x, Math.max(y0, y));
      ctx.lineTo(x, Math.min(y1, y + 40));
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}
/** A cloud of mist at the foot of falling water. */
function mist(x, y, w, a = 1) {
  for (let i = 0; i < 6; i++) {
    const u = (G.time * 0.4 + i / 6) % 1;
    ctx.fillStyle = `rgba(240,250,255,${0.35 * a * (1 - u)})`;
    ctx.beginPath();
    ctx.ellipse(
      x + (i - 2.5) * w * 0.18,
      y - u * 60,
      w * 0.25 * (0.6 + u),
      22 * (0.6 + u),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}
function drawLedge() {
  const x0 = CLIMB[0] - 260,
    x1 = DESCENT[0] + 300;
  if (!view(x0, x1, CLIFF_TOP - 300, Y_C + DEPTH + 200)) return;
  // the cliff behind the ledge; pines along its top
  ctx.fillStyle = T.patterns.cliff;
  poly([
    [x0, CLIFF_TOP],
    [x1 - 200, CLIFF_TOP],
    [x1, Y_C + 20],
    [x0, Y_C + 20],
  ]);
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, CLIFF_TOP);
  ctx.lineTo(x1 - 200, CLIFF_TOP);
  ctx.lineTo(x1, Y_C + 20);
  ctx.stroke();
  const r = mulberry(31);
  for (let x = x0 + 40; x < x1 - 220; x += 70 + r() * 90)
    if (view(x - 40, x + 40, CLIFF_TOP - 140, CLIFF_TOP))
      pine(x, CLIFF_TOP + 4, 0.8 + r() * 0.3, '#2a4a32');
  // ivy and ferns on the rock, a cave mouth
  for (let x = x0 + 100; x < x1 - 300; x += 160 + r() * 120) {
    const y = Y_C - 40 - r() * 200;
    if (!view(x - 40, x + 40, y - 60, y + 80)) continue;
    ctx.strokeStyle = '#3f7a32';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 10, y + 40, x - 4, y + 80);
    ctx.stroke();
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = k % 2 ? '#4f8a3a' : '#3f7a32';
      ctx.beginPath();
      ctx.ellipse(x + (k % 2 ? 6 : -6), y + 12 + k * 14, 7, 4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const cx = 5650;
  if (view(cx - 90, cx + 90, Y_C - 160, Y_C)) {
    ctx.fillStyle = '#1a1612';
    ctx.beginPath();
    ctx.moveTo(cx - 70, Y_C + 2);
    ctx.quadraticCurveTo(cx - 70, Y_C - 140, cx, Y_C - 150);
    ctx.quadraticCurveTo(cx + 70, Y_C - 140, cx + 70, Y_C + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OL;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // the great waterfall, from the clifftop down past the ledge into the gorge
  const [f0, f1] = FALLS;
  water(f0 + 40, f1 - 40, CLIFF_TOP - 10, Y_C + 10);
  mist((f0 + f1) / 2, Y_C + 10, f1 - f0, 1);
  // a rainbow in its spray, by day
  const day = 1 - nightAt(G.cam);
  if (view(f0 - 200, f1 + 200, CLIFF_TOP, Y_C) && day > 0.3 && !APP.lowFx) {
    ctx.save();
    ctx.globalAlpha = 0.16 * day;
    ctx.lineWidth = 5;
    ['#ff4a4a', '#ffb02e', '#ffe14a', '#4fd84a', '#4fa8ff', '#8a4aff'].forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.arc(f1 + 40, Y_C + 30, 200 - i * 5, Math.PI * 1.08, Math.PI * 1.55);
      ctx.stroke();
    });
    ctx.restore();
  }
  // the pool under a second cascade, along the back of the ledge
  const p0 = FALLS[1] + 120,
    p1 = DESCENT[0] - 160;
  if (view(p0, p1, Y_C - 300, Y_C + 30)) {
    water(POOL_X + 140, POOL_X + 230, CLIFF_TOP + 40, Y_C + 6, 0.95);
    ctx.fillStyle = 'rgba(70,140,190,.9)';
    poly([
      [p0, Y_C + 14],
      [p0 + 70, Y_C - 44],
      [p1 - 70, Y_C - 44],
      [p1, Y_C + 14],
    ]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,245,255,.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const x = p0 + 80 + ((k * 197 + G.time * 30) % (p1 - p0 - 160));
      ctx.moveTo(x, Y_C - 6 + (k % 3) * 6);
      ctx.lineTo(x + 30, Y_C - 6 + (k % 3) * 6);
    }
    ctx.stroke();
    mist(POOL_X + 185, Y_C - 8, 160, 0.8);
    for (const bx of [p0 + 30, p1 - 30, POOL_X - 120])
      boulder(bx, Y_C + 14, 34, 26, bx | 0, '#6e6a64');
  }
}
/** A rope rail on posts along the front edge of the ledge (the drop is on the other side). */
function ledgeRail() {
  const y = Y_C + DEPTH - 2,
    x0 = CLIMB[1] + 40,
    x1 = DESCENT[0] - 40;
  if (!view(x0, x1, y - 60, y + 20)) return;
  for (const [a, b] of [
    [x0, FALLS[0] - 30],
    [FALLS[1] + 30, x1],
  ]) {
    const n = Math.max(1, Math.round((b - a) / 160)),
      step = (b - a) / n;
    for (let k = 0; k <= n; k++) {
      const x = a + k * step;
      if (!view(x - 170, x + 20, y - 60, y + 20)) continue;
      box(x - 4, y - 40, 8, 44, '#6a4630', 1.5);
      if (k < n) {
        ctx.strokeStyle = '#c9a46a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y - 34);
        ctx.quadraticCurveTo(x + step / 2, y - 18, x + step, y - 34);
        ctx.stroke();
      }
    }
  }
}
/** The gorge under the bridge: the drop, the river far below, the falls going down into it. */
function gorge(p) {
  const x0 = p[0][0] - 20,
    x1 = p[1][0] + 20,
    y0 = p[0][1],
    y1 = p[2][1];
  if (!view(x0, x1, y0, y1 + 400)) return;
  const g = ctx.createLinearGradient(0, y0, 0, G.camY + H);
  g.addColorStop(0, '#1e2a30');
  g.addColorStop(1, '#0a1218');
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0 + 2);
}
function drawGorge() {
  const [f0, f1] = FALLS;
  if (!view(f0, f1, Y_C, Y_C + DEPTH + 400)) return;
  for (const p of PITS) gorge(p);
  // the falls going on down past the bridge, white water far below
  ctx.save();
  ctx.beginPath();
  for (const p of PITS) {
    ctx.rect(p[0][0] - 20, p[0][1], p[1][0] - p[0][0] + 40, p[2][1] - p[0][1]);
  }
  ctx.clip();
  water(f0 + 40, f1 - 40, Y_C, Y_C + DEPTH, 0.75);
  ctx.fillStyle = 'rgba(230,245,255,.5)';
  for (let k = 0; k < 5; k++) {
    const u = (G.time * 0.6 + k / 5) % 1;
    ctx.beginPath();
    ctx.ellipse(f0 + 60 + k * 90, Y_C + DEPTH - 10 - u * 20, 40, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // the gorge's rock sides
  for (const [x, s] of [
    [f0, 1],
    [f1, -1],
  ]) {
    ctx.fillStyle = T.patterns.cliff;
    poly([
      [x, Y_C],
      [x + s * 22, Y_C],
      [x + s * 34, Y_C + DEPTH + 300],
      [x, Y_C + DEPTH + 300],
    ]);
    ctx.fill();
  }
}
/** The plank bridge over the gorge: posts at its ends, rope rails. */
function drawBridge() {
  const [f0, f1] = FALLS,
    y0 = Y_C + BRIDGE[0],
    y1 = Y_C + BRIDGE[1];
  if (!view(f0, f1, y0 - 100, y1 + 40)) return;
  ctx.fillStyle = T.patterns.planks;
  ctx.fillRect(f0, y0, f1 - f0, y1 - y0);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(f0, y0, f1 - f0, y1 - y0);
  // the planks' edge seen from in front, the sag of the ropes
  ctx.fillStyle = '#5a3a22';
  ctx.fillRect(f0, y1, f1 - f0, 8);
  for (const [y, h] of [
    [y0, 44],
    [y1, 44],
  ]) {
    for (const x of [f0 + 6, f1 - 6]) box(x - 5, y - h, 10, h, '#6a4630', 1.5);
    ctx.strokeStyle = '#c9a46a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(f0 + 6, y - h + 4);
    ctx.quadraticCurveTo((f0 + f1) / 2, y - h + 30, f1 - 6, y - h + 4);
    ctx.stroke();
  }
}

// --- the forest ------------------------------------------------------------------------------------

function drawForest() {
  const x0 = DESCENT[0] - 200,
    x1 = END_X + 200;
  if (!view(x0, x1, Y_D - 700, Y_D + DEPTH + 300)) return;
  const n = nightAt(G.cam);
  // the dark of the deep forest behind the trees (the moon high above it)
  const bg = ctx.createLinearGradient(0, Y_D - 560, 0, Y_D - 120);
  bg.addColorStop(0, 'rgba(14,22,34,0)');
  bg.addColorStop(1, n > 0.5 ? '#0e1622' : '#16261c');
  ctx.fillStyle = bg;
  ctx.fillRect(Math.max(x0 + 300, G.cam - 10), Y_D - 560, W + 20, 600);
  // far trees: a wall of dark firs (bluer at night)
  const far = n > 0.5 ? '#16243a' : '#1f3a2c',
    mid = n > 0.5 ? '#1c2c3a' : '#24402e';
  const r = mulberry(51);
  for (let x = x0; x < x1; x += 46 + r() * 30) {
    const y = topY(x) - 30 - r() * 30,
      s = 1.6 + r() * 0.6;
    if (!view(x - 80, x + 80, y - 300, y)) continue;
    if (x > GLADE_X + 100 && x < END_X - 200 && r() < 0.6) continue; // (the glade opens up)
    pine(x, y, s, far);
  }
  // nearer trunks along the back of the path, roots, ferns
  const r2 = mulberry(52);
  for (let x = DESCENT[1] - 300; x < x1; x += 150 + r2() * 120) {
    const y = topY(x) + 4,
      w = 26 + r2() * 20;
    if (!view(x - 60, x + 60, y - 600, y)) continue;
    if (x > GLADE_X && x < END_X - 140) continue;
    box(x - w / 2, y - 600, w, 600, n > 0.5 ? '#231a14' : '#3a2a1e', 2.5);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(x - w / 2 + 3, y - 600, 6, 600);
    poly([
      [x - w / 2 - 18, y],
      [x - w / 2, y - 40],
      [x + w / 2, y - 40],
      [x + w / 2 + 20, y],
    ]);
    fillOl(n > 0.5 ? '#231a14' : '#3a2a1e', 2);
    // mushrooms at its foot
    if (r2() < 0.5) {
      ctx.beginPath();
      ctx.ellipse(x + w / 2 + 8, y - 10, 8, 5, 0, Math.PI, 0);
      fillOl('#c23a2a', 1.5);
    }
    // a canopy of leaves over the top of the screen
    ctx.fillStyle = mid;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(x + (k - 1.5) * 50, y - 560 - (k % 2) * 30, 70, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // the glade: standing stones in a ring, frost on them
  const gx = GLADE_X + 700;
  if (view(gx - 500, gx + 500, Y_D - 220, Y_D)) {
    const rs = mulberry(53);
    for (let k = 0; k < 6; k++) {
      const x = gx - 420 + k * 170,
        h = 120 + rs() * 70;
      poly([
        [x - 26, Y_D + 2],
        [x - 20, Y_D - h],
        [x + 4, Y_D - h - 14],
        [x + 22, Y_D - h + 6],
        [x + 26, Y_D + 2],
      ]);
      fillOl('#7d8590', 2.5);
      ctx.fillStyle = 'rgba(230,248,255,.7)';
      ctx.fillRect(x - 18, Y_D - h - 4, 30, 6);
      // a rune carved in it, glowing faintly blue
      ctx.strokeStyle = `rgba(140,230,255,${0.5 + 0.3 * Math.sin(G.time * 2 + k)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - 6, Y_D - h * 0.6);
      ctx.lineTo(x + 6, Y_D - h * 0.45);
      ctx.lineTo(x - 6, Y_D - h * 0.3);
      ctx.moveTo(x, Y_D - h * 0.65);
      ctx.lineTo(x, Y_D - h * 0.25);
      ctx.stroke();
    }
  }
}

// --- the floor --------------------------------------------------------------------------------------

/** Which texture lies where. */
function floorPattern(lo, hi, y) {
  const cx = (lo + hi) / 2;
  if (cx < ROAD[0]) return T.patterns.dirt;
  if (cx < CLIMB[0] || (cx < CLIMB[1] && y > Y_B - 10)) return T.patterns.hill;
  if (cx < CLIMB[1] && hi - lo < 700) return T.patterns.steps;
  if (cx > FALLS[0] && cx < FALLS[1]) return T.patterns.planks;
  if (cx < DESCENT[1] - 40) return T.patterns.rock;
  return T.patterns.forest;
}
function drawFloors() {
  const shown = FLOOR.filter((f) => {
    const xs = f.map((p) => p[0]),
      ys = f.map((p) => p[1]);
    return view(Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys));
  });
  // first the front edges, all of them (a grassy bank, the rock under the ledge, the forest's
  // earth), so that no floor's edge hides another floor (the ledge's over the trail below it)
  for (const f of shown) {
    const fr = f.slice(2),
      cx = (fr[0][0] + fr[1][0]) / 2;
    ctx.fillStyle =
      cx < CLIMB[1]
        ? '#5f8a4e'
        : cx < DESCENT[1] - 40
          ? T.patterns.cliff
          : nightAt(G.cam) > 0.5
            ? '#1c1610'
            : '#2e2218';
    ctx.beginPath();
    ctx.moveTo(fr[1][0], fr[1][1]);
    ctx.lineTo(fr[0][0], fr[0][1]);
    ctx.lineTo(fr[0][0], fr[0][1] + 500);
    ctx.lineTo(fr[1][0], fr[1][1] + 500);
    ctx.closePath();
    ctx.fill();
  }
  for (const f of shown) {
    const xs = f.map((p) => p[0]),
      lo = Math.min(...xs),
      hi = Math.max(...xs),
      top = Math.min(...f.map((p) => p[1]));
    if (lo === FALLS[0] && hi === FALLS[1]) continue; // (the bridge is drawn on its own)
    ctx.fillStyle = floorPattern(lo, hi, top);
    if (lo < GLADE_X && hi > GLADE_X) {
      // the forest road, and the glade where the frost creeps over the ground
      ctx.save();
      poly(f);
      ctx.clip();
      ctx.fillRect(lo, top - 10, GLADE_X - lo, DEPTH + 40);
      ctx.fillStyle = T.patterns.frost;
      ctx.fillRect(GLADE_X, top - 10, hi - GLADE_X, DEPTH + 40);
      ctx.restore();
    } else {
      poly(f);
      ctx.fill();
    }
    const fr = f.slice(2);
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.fillRect(
      Math.min(fr[0][0], fr[1][0]),
      Math.max(fr[0][1], fr[1][1]),
      Math.abs(fr[1][0] - fr[0][0]),
      6,
    );
  }
  // a shade under the back edge
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  for (const f of FLOOR) {
    const [a, b] = f;
    poly([a, b, [b[0], b[1] + 14], [a[0], a[1] + 14]]);
    ctx.fill();
  }
}

export function drawBG4() {
  if (!T) init();
  ctx.save();
  drawSky();
  ctx.translate(-G.cam, -G.camY);
  drawRidge();
  drawVillage();
  drawHills();
  drawLedge();
  drawForest();
  drawFloors();
  climbEdges();
  drawGorge();
  drawBridge();
  ctx.restore();
}

// --- in front of everyone -----------------------------------------------------------------------------

/** The mist off the falls; at night the dark, fireflies and fog; the blizzard. */
export function drawFront4() {
  if (!T) init();
  const t = G.time,
    n = nightAt(G.cam);
  // the rope rail along the ledge's front edge, in front of the fighters
  ctx.save();
  ctx.translate(-G.cam, -G.camY);
  ledgeRail();
  ctx.restore();
  // spray drifting over the fight by the falls
  const fx = (FALLS[0] + FALLS[1]) / 2 - G.cam;
  if (fx > -500 && fx < W + 500) {
    const k = clamp(1 - Math.abs(fx - W / 2) / 900, 0, 1);
    ctx.fillStyle = `rgba(235,248,255,${0.12 * k})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (n > 0) {
    // the night: dark at the edges, moonlight in the middle
    const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.35, W / 2, H * 0.5, H * 1.05);
    g.addColorStop(0, 'rgba(8,12,30,0)');
    g.addColorStop(1, `rgba(8,12,30,${0.6 * n})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(20,30,70,${0.18 * n})`;
    ctx.fillRect(0, 0, W, H);
    // fog low over the ground
    ctx.fillStyle = `rgba(160,180,220,${0.08 * n})`;
    for (let i = 0; i < 5; i++) {
      const x = ((((i * 260 - G.cam * 0.4 + t * 14) % (W + 400)) + W + 400) % (W + 400)) - 200;
      ctx.beginPath();
      ctx.ellipse(x, H - 60 - (i % 2) * 40, 220, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // fireflies
    if (!APP.lowFx)
      for (let i = 0; i < 18; i++) {
        const x = (((i * 151.3 + Math.sin(t * 0.7 + i) * 40 - G.cam * 0.9) % W) + W) % W,
          y = 200 + ((i * 83.1) % 300) + Math.sin(t * 1.3 + i * 2) * 20,
          a = (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7)) * n;
        ctx.globalAlpha = a;
        ctx.drawImage(T.fly, x - 10, y - 10);
      }
    ctx.globalAlpha = 1;
  }
  // snow over the glade, and the frost wolf's blizzard
  const snow = clamp((G.cam - GLADE_X + 900) / 600, 0, 1),
    bl = G.blizzard ? 1 : 0;
  if (snow > 0 || bl) {
    ctx.save();
    ctx.fillStyle = `rgba(240,248,255,${0.8})`;
    const N = (APP.lowFx ? 30 : 80) + bl * (APP.lowFx ? 40 : 120);
    for (let i = 0; i < N; i++) {
      const sp = 40 + ((i * 17) % 50) + bl * 160,
        y = (t * sp + i * 61) % (H + 20),
        x =
          ((((i * 131.3 - t * (20 + bl * 340) - G.cam * 0.3) % (W + 40)) + W + 40) % (W + 40)) - 20,
        s = 1.5 + (i % 3);
      ctx.globalAlpha = Math.max(snow, bl) * 0.8;
      if (bl) ctx.fillRect(x, y, s * 4, s * 0.8);
      else ctx.fillRect(x + Math.sin(t + i) * 8, y, s, s);
    }
    ctx.restore();
    if (bl) {
      ctx.fillStyle = 'rgba(220,240,255,.16)';
      ctx.fillRect(0, 0, W, H);
    }
  }
}
