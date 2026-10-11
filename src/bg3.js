// Procedural scenery of Neon Kyoto (stage 3): the slums in the rain, the stairs down into the
// metro, the escalator up to the avenue, the bridge, the fire stairs and the rooftops with the
// city far below the gaps between them. Drawn in road coordinates (see level3.js); the
// textures and the skyline are painted once into offscreen canvases.
import { H, OL, W } from './config.js';
import { clamp, mulberry } from './util.js';
import { APP, G } from './state.js';
import { ctx } from './gfx.js';
import { mk } from './background.js';
import { DEPTH, DOORS, FLOOR, L3, PITS, topY } from './level3.js';

const { Y_A, Y_B, Y_R, SLUMS_END, STAIRS, ESCAL, FIRE, BRIDGE } = L3;
let T = null;

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
  // the metro: pale tiles, a yellow safety line along the edge
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
    g.fillRect(0, h - 22, w, 8);
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
  // the roofs: rough concrete, stains, a painted line
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
  return P;
}
/** The far city: a wide strip of towers with lit windows, and one nearer, darker. */
function makeSkyline(seed, h, cols, lit) {
  return mk(1400, h, (g, w) => {
    const r = mulberry(seed);
    for (let x = -20; x < w;) {
      const bw = 40 + r() * 90,
        bh = h * (0.35 + r() * 0.6);
      g.fillStyle = cols[(r() * cols.length) | 0];
      g.fillRect(x, h - bh, bw, bh);
      // a pagoda roof now and then, or an antenna
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
function init() {
  T = { patterns: {} };
  const tex = makeTextures();
  for (const [k, c] of Object.entries(tex)) T.patterns[k] = ctx.createPattern(c, 'repeat');
  T.far = makeSkyline(101, 300, ['#1b1830', '#221d3a', '#18162a'], 0.18);
  T.near = makeSkyline(202, 380, ['#120f1f', '#16122a'], 0.1);
}

// --- drawing ---------------------------------------------------------------------------------

const poly = (pts) => {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
};
const view = (x0, x1, y0 = -1e9, y1 = 1e9) =>
  x1 > G.cam - 40 && x0 < G.cam + W + 40 && y1 > G.camY - 40 && y0 < G.camY + H + 40;

/** The night sky and the far city, fixed to the screen with a little parallax. */
function drawSky() {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b0a1a');
  g.addColorStop(0.6, '#2a1740');
  g.addColorStop(1, '#4a1d4c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const dy = -(G.camY - Y_A) * 0.3;
  for (const [img, par, off] of [
    [T.far, 0.1, 90],
    [T.near, 0.25, 150],
  ]) {
    const tw = img.width;
    for (let x = -(((G.cam * par) % tw) + tw) % tw; x < W; x += tw)
      ctx.drawImage(img, Math.floor(x), off + dy * par * 2);
  }
  ctx.restore();
}
/** A row of buildings along the back edge of the road from x0 to x1: walls, windows, signs. */
function buildings(x0, x1, seed, pal) {
  const r = mulberry(seed);
  for (let x = x0; x < x1;) {
    const bw = 160 + r() * 140,
      bh = 220 + r() * 160,
      y = topY(x + bw / 2);
    if (view(x, x + bw)) {
      ctx.fillStyle = pal[(r() * pal.length) | 0];
      ctx.fillRect(x, y - bh, bw, bh);
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y - bh, bw, bh);
      for (let wy = y - bh + 20; wy < y - 110; wy += 46)
        for (let wx = x + 16; wx < x + bw - 30; wx += 44) {
          ctx.fillStyle = r() < 0.4 ? 'rgba(255,200,120,.55)' : 'rgba(10,10,20,.6)';
          ctx.fillRect(wx, wy, 22, 26);
        }
    } else for (let i = 0; i < 40; i++) r();
    x += bw;
  }
}
/** The metro: a tiled wall with pillars and lamps, a low ceiling over it. */
function metroWall() {
  const x0 = STAIRS[0] + 200,
    x1 = ESCAL[1] - 200;
  if (!view(x0, x1)) return;
  ctx.fillStyle = '#5c6670';
  ctx.fillRect(x0, Y_B - 260, x1 - x0, 260);
  ctx.fillStyle = '#20242c';
  ctx.fillRect(x0, Y_B - 420, x1 - x0, 160);
  for (let x = Math.ceil(x0 / 240) * 240; x < x1; x += 240) {
    ctx.fillStyle = '#3e454e';
    ctx.fillRect(x - 18, Y_B - 260, 36, 260);
    ctx.fillStyle = 'rgba(255,245,210,.85)';
    ctx.fillRect(x + 60, Y_B - 250, 120, 6);
  }
}
/** On a roof a door is in a little stairwell hut, a water tank beside it. */
function hut(x, y) {
  ctx.fillStyle = '#2e2c3a';
  ctx.fillRect(x - 60, y - 140, 120, 140);
  ctx.fillStyle = '#3a3848';
  ctx.fillRect(x - 70, y - 152, 140, 14);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 60, y - 140, 120, 140);
  ctx.strokeRect(x - 70, y - 152, 140, 14);
  ctx.fillStyle = '#3b3f4a';
  ctx.fillRect(x + 80, y - 120, 60, 90);
  ctx.strokeRect(x + 80, y - 120, 60, 90);
  ctx.fillStyle = '#2a2d36';
  for (const lx of [x + 86, x + 130]) ctx.fillRect(lx, y - 30, 5, 30);
}
/** A door in a building: shut, or slid open (lit inside) while a robot steps out. */
function door(i, x, y) {
  const open = G.enemies.some((e) => e.state === 'door' && e.door === i);
  ctx.fillStyle = open ? '#ffd7a0' : '#2c2a36';
  ctx.fillRect(x - 26, y - 96, 52, 96);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 26, y - 96, 52, 96);
  if (open) {
    ctx.fillStyle = '#3a3846';
    ctx.fillRect(x - 26, y - 96, 6, 96);
    ctx.fillRect(x + 20, y - 96, 6, 96);
  } else {
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.beginPath();
    ctx.moveTo(x, y - 96);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#ff3b6b';
  ctx.fillRect(x - 10, y - 104, 20, 4);
}
/** A gap between two roofs: the drop to the street far below, its lights. */
function pit(p) {
  const x0 = p[0][0],
    x1 = p[1][0];
  if (!view(x0, x1)) return;
  const g = ctx.createLinearGradient(0, Y_R, 0, G.camY + H);
  g.addColorStop(0, '#0d0b18');
  g.addColorStop(1, '#2b1238');
  ctx.fillStyle = g;
  ctx.fillRect(x0, Y_R - 4, x1 - x0, G.camY + H - Y_R + 8);
  // the street below: car lights streaking along it
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, Y_R, x1 - x0, G.camY + H - Y_R);
  ctx.clip();
  for (let k = 0; k < 6; k++) {
    const y = Y_R + DEPTH + 60 + k * 14,
      u = (G.time * (90 + k * 30) + k * 137) % (x1 - x0 + 200);
    ctx.fillStyle = k % 2 ? 'rgba(255,80,80,.6)' : 'rgba(255,240,200,.6)';
    ctx.fillRect(x0 - 100 + u, y, 26, 3);
  }
  ctx.restore();
  // the walls of the two buildings, going down
  ctx.fillStyle = '#1a1826';
  ctx.fillRect(x0, Y_R, 12, G.camY + H - Y_R);
  ctx.fillRect(x1 - 12, Y_R, 12, G.camY + H - Y_R);
}
function drawFloors() {
  for (const f of FLOOR) {
    const xs = f.map((p) => p[0]),
      ys = f.map((p) => p[1]),
      cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    if (!view(Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys))) continue;
    ctx.fillStyle =
      cx < SLUMS_END
        ? T.patterns.wet
        : cx < ESCAL[0]
          ? T.patterns.tiles
          : cx < FIRE[1]
            ? T.patterns.stone
            : T.patterns.roof;
    poly(f);
    ctx.fill();
    // the front edge: a kerb, or the roof's parapet
    ctx.fillStyle = cx > FIRE[1] ? '#2b2e36' : '#15161c';
    const fr = f.slice(2);
    ctx.beginPath();
    ctx.moveTo(fr[1][0], fr[1][1]);
    ctx.lineTo(fr[0][0], fr[0][1]);
    ctx.lineTo(fr[0][0], fr[0][1] + 400);
    ctx.lineTo(fr[1][0], fr[1][1] + 400);
    ctx.closePath();
    ctx.fill();
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
  buildings(-200, STAIRS[0] + 60, 11, ['#2b2a33', '#33303a', '#28303a']);
  metroWall();
  buildings(ESCAL[1] - 40, BRIDGE[0], 21, ['#2a2440', '#30264a', '#262a44']);
  buildings(BRIDGE[1], FIRE[1], 31, ['#262036', '#2c2440']);
  DOORS.forEach(([x, y], i) => {
    if (!view(x - 80, x + 150)) return;
    if (x > FIRE[1]) hut(x, y);
    door(i, x, y);
  });
  drawFloors();
  for (const p of PITS) pit(p);
  ctx.restore();
}
/** How much rain falls where the camera is: the slums only, fading out at the metro stairs. */
export const rainAt = (cam = G.cam) => clamp((SLUMS_END - 200 - cam - W / 2) / 400, 0, 1);
/** The rain over the slums, in front of everyone; and a gloom over the metro. */
export function drawFront3() {
  if (!T) init();
  const k = rainAt();
  if (k > 0) {
    const n = APP.lowFx ? 60 : 160,
      t = G.time;
    ctx.save();
    ctx.strokeStyle = `rgba(180,200,255,${0.35 * k})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      // each drop falls along its own line, over and over (no chance used: replays agree)
      const sx = (i * 97.13) % W,
        sp = 900 + ((i * 53) % 300),
        y = (t * sp + i * 71) % (H + 60),
        x = (sx - y * 0.2 - G.cam * 0.6 + W * 4) % W;
      ctx.moveTo(x, y - 60);
      ctx.lineTo(x - 6, y - 30);
    }
    ctx.stroke();
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
}
