// How the fighters of the Wastelands look (see the concepts of stage 4): drawn in code, cartoon
// style — thick dark outlines, flat colours — facing right with their feet at the origin; the
// caller (drawWar) turns, scales, tips and lays them down. While a fighter flashes from a blow
// every fill is white.
import { OL, TAU, WAR } from '../config.js';
import { clamp } from '../util.js';
import { G } from '../state.js';
import { ctx } from '../gfx.js';

let FL = false;
const c = () => ctx;
const fill = (col) => (FL ? '#fff' : col);

// --- pieces ---------------------------------------------------------------------------------

export function limb(pts, w, col) {
  const g = c();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [lw, cl] of [
    [w + 6, OL],
    [w, fill(col)],
  ]) {
    g.strokeStyle = cl;
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.stroke();
  }
}
export function poly(pts, col, lw = 3) {
  const g = c();
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fillStyle = fill(col);
  g.fill();
  g.strokeStyle = OL;
  g.lineWidth = lw;
  g.lineJoin = 'round';
  g.stroke();
}
export function ell(x, y, rx, ry, col, lw = 3, rot = 0) {
  const g = c();
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, TAU);
  g.fillStyle = fill(col);
  g.fill();
  if (lw) {
    g.strokeStyle = OL;
    g.lineWidth = lw;
    g.stroke();
  }
}
export function box(x, y, w, h, col, lw = 3, r = 4) {
  const g = c();
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fillStyle = fill(col);
  g.fill();
  if (lw) {
    g.strokeStyle = OL;
    g.lineWidth = lw;
    g.stroke();
  }
}
/** A soft glow (not white in a flash: light stays light). */
export function glow(x, y, r, rgb, a = 0.6) {
  const g = c(),
    gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}
export function line(pts, col, w) {
  const g = c();
  g.strokeStyle = col;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
}
/** Yellow and black warning stripes. */
export function stripes(x, y, w, h) {
  const g = c();
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = fill('#e2b13a');
  g.fillRect(x, y, w, h);
  g.fillStyle = FL ? '#ddd' : OL;
  for (let i = -h; i < w; i += 14) {
    g.beginPath();
    g.moveTo(x + i, y + h);
    g.lineTo(x + i + 7, y + h);
    g.lineTo(x + i + 7 + h, y);
    g.lineTo(x + i + h, y);
    g.fill();
  }
  g.restore();
  g.strokeStyle = OL;
  g.lineWidth = 3;
  g.strokeRect(x, y, w, h);
}
const rivets = (pts) => pts.forEach(([x, y]) => ell(x, y, 2.5, 2.5, '#d9d2c0', 1.5));
/** Rotate what `f` draws by `a` round the point (x, y). */
function turn(x, y, a, f) {
  const g = c();
  g.save();
  g.translate(x, y);
  g.rotate(a);
  g.translate(-x, -y);
  f();
  g.restore();
}

export const SKIN = '#8fa35a',
  SKIN2 = '#6f8442',
  RUST = '#b8612e',
  RUST2 = '#8a4523',
  STEEL = '#5a6068',
  STEEL2 = '#3f444b',
  LAMP = '#ffb02e';
const GREEN = '150,255,90',
  AMBER = '255,170,40';

// --- the frame round every fighter: where it is, which way, standing, flying or lying -------

const LYING = ['down', 'corpse', 'fall', 'wkFall', 'wkLie'];
/** The walk: legs swinging (-1..1) and a bob. */
export const stride = (e, k = 1) => (e.moving ? Math.sin(e.walkT * 2.2 * k) : 0);

/** Draws fighter `e` at scale `k` with `body(e)`: climbing out of the sand, thrown, lying. */
export function drawWar(e, k, body) {
  const g = c(),
    st = e.state,
    sx = e.x - G.cam,
    sy = e.y - e.z;
  FL = e.flash > 0;
  g.save();
  g.translate(sx, sy);
  if (st === 'rise') {
    // out of the sand: what is still under the ground is not seen
    const u = clamp(e.t / 0.9, 0, 1);
    g.beginPath();
    g.rect(-200, -400, 400, 400);
    g.clip();
    g.translate(0, (1 - u) * 190 * k);
  }
  if (st === 'wkLie') g.globalAlpha = clamp(WAR.wreck - e.t, 0, 1);
  g.scale(e.face * k, k);
  const flying = st === 'air' || ((st === 'fall' || st === 'wkFall') && e.z > 20);
  if (flying) g.rotate(-0.5 - Math.min(e.t * 3, 1));
  else if (LYING.includes(st)) {
    g.translate(0, -30);
    g.rotate(-Math.PI / 2);
  } else if (st === 'hurt' || st === 'getup') g.rotate(-0.16);
  body(e);
  g.restore();
  FL = false;
}

// --- the Children of the Crater ---------------------------------------------------------------

/** The scavenger: a gas mask and a hood, a patched poncho, a backpack of scrap; a rebar club
 *  with a lump of concrete — or a robot's saw arm it has stripped from a wreck. */
export function scavenger(e) {
  const s = stride(e),
    st = e.state,
    crouch = st === 'scLoot' ? 18 : 0;
  // the club: raised back in the wind-up, brought down in the swing
  const arm =
    st === 'scWind'
      ? -1.1 * clamp(e.t / 0.2, 0, 1)
      : st === 'scSwing'
        ? 1.3
        : st === 'scLoot'
          ? 1.6
          : 0;
  ctx.translate(0, crouch);
  // scrap backpack (a robot's lamp in it)
  box(-48, -168, 40, 56, '#6d6a62', 3, 6);
  ell(-30, -176, 10, 10, '#c7c1b0', 2.5);
  ell(-30, -176, 5, 5, LAMP, 1.5);
  line(
    [
      [-40, -168],
      [-52, -200],
    ],
    OL,
    3,
  );
  // legs
  limb(
    [
      [-8, -92],
      [-16 - s * 10, -48 + crouch * 0.5],
      [-24 - s * 16, -2 - crouch],
    ],
    15,
    '#6b5a43',
  );
  limb(
    [
      [8, -92],
      [16 + s * 10, -46 + crouch * 0.5],
      [22 + s * 16, -2 - crouch],
    ],
    15,
    '#7a6750',
  );
  ell(-24 - s * 16, -4 - crouch, 15, 7, '#3a3029');
  ell(26 + s * 16, -4 - crouch, 15, 7, '#3a3029');
  // back arm
  limb(
    [
      [-14, -148],
      [-26 + s * 6, -112],
      [-16 + s * 8, -84],
    ],
    10,
    SKIN2,
  );
  // poncho
  poly(
    [
      [-26, -156],
      [22, -160],
      [40, -96],
      [30, -90],
      [24, -98],
      [14, -86],
      [2, -96],
      [-10, -84],
      [-22, -96],
      [-36, -90],
    ],
    '#b07f40',
  );
  box(-6, -136, 14, 12, '#8e6a3a', 2, 2);
  // head: hood and gas mask, glowing green lenses
  ell(16, -172, 22, 21, '#7a5a32');
  ell(26, -170, 15, 15, '#9a958a');
  for (const x of [22, 33]) {
    ell(x, -176, 6, 6, '#26302a', 2);
    glow(x, -176, 9, GREEN, 0.9);
    ell(x, -176, 3, 3, '#9dff5a', 0);
  }
  poly(
    [
      [30, -166],
      [44, -160],
      [44, -150],
      [30, -154],
    ],
    '#6d6a62',
    2.5,
  );
  ell(46, -155, 4, 6, '#4b4842', 2);
  // front arm and weapon
  turn(10, -146, arm, () => {
    limb(
      [
        [10, -146],
        [30, -120],
        [46, -112],
      ],
      10,
      SKIN,
    );
    if (e.saw) {
      // the robot's saw arm: a grey limb, the blade spinning
      limb(
        [
          [40, -112],
          [86, -150],
        ],
        12,
        STEEL,
      );
      const g = c();
      g.save();
      g.translate(96, -158);
      g.rotate(G.time * 20);
      ell(0, 0, 22, 22, '#c9cdd2', 3);
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8;
        poly(
          [
            [Math.cos(a) * 20, Math.sin(a) * 20],
            [Math.cos(a + 0.3) * 28, Math.sin(a + 0.3) * 28],
            [Math.cos(a + 0.4) * 19, Math.sin(a + 0.4) * 19],
          ],
          '#e8ecf0',
          1.5,
        );
      }
      ell(0, 0, 6, 6, RUST, 2);
      g.restore();
    } else {
      line(
        [
          [40, -96],
          [82, -196],
        ],
        OL,
        10,
      );
      line(
        [
          [40, -96],
          [82, -196],
        ],
        fill('#9c5530'),
        5,
      );
      poly(
        [
          [70, -210],
          [92, -204],
          [96, -182],
          [74, -176],
          [66, -192],
        ],
        '#a3a39a',
      );
    }
    ell(46, -112, 7, 7, SKIN);
  });
}

/** The spitter: lean, leaning back, pustules on its shoulders and a throat sac that glows and
 *  swells before it spits. */
export function spitter(e) {
  const s = stride(e),
    st = e.state,
    swell = st === 'spWind' ? 1 + 0.6 * clamp(e.t / 0.45, 0, 1) : st === 'spSpit' ? 0.7 : 1,
    lunge = st === 'spSpit' ? 12 : 0;
  limb(
    [
      [-6, -96],
      [-18 - s * 9, -50],
      [-16 - s * 16, -2],
    ],
    11,
    SKIN2,
  );
  limb(
    [
      [6, -96],
      [16 + s * 9, -52],
      [24 + s * 16, -2],
    ],
    11,
    SKIN,
  );
  ell(-14 - s * 16, -3, 13, 6, SKIN2);
  ell(28 + s * 16, -3, 13, 6, SKIN);
  poly(
    [
      [-14, -104],
      [16, -104],
      [12, -76],
      [0, -84],
      [-12, -74],
    ],
    '#6a4a35',
  );
  ctx.save();
  ctx.translate(lunge * 0.5, 0);
  poly(
    [
      [-16, -102],
      [14, -104],
      [8 + lunge, -150],
      [-22, -158],
    ],
    SKIN,
  );
  for (let i = 0; i < 4; i++)
    line(
      [
        [-14, -112 - i * 10],
        [4, -114 - i * 10],
      ],
      fill(SKIN2),
      2,
    );
  for (const [x, y, r] of [
    [-20, -158, 6],
    [-10, -164, 5],
    [-26, -148, 4],
  ])
    ell(x, y, r, r, '#c6d36a', 2);
  limb(
    [
      [-16, -150],
      [-30 - s * 6, -120],
      [-22 - s * 8, -96],
    ],
    8,
    SKIN2,
  );
  limb(
    [
      [4, -148],
      [24, -134],
      [34, -150],
    ],
    8,
    SKIN,
  );
  // the sac
  glow(10 + lunge, -160, 40 * swell, GREEN, 0.4 + 0.3 * (swell - 1));
  ell(10 + lunge, -160, 20 * swell, 17 * swell, FL ? '#fff' : 'rgba(170,255,100,.85)');
  ell(4 + lunge, -165, 6, 4, 'rgba(255,255,255,.6)', 0);
  // the head, mouth open when it spits
  const hx = 16 + lunge,
    open = st === 'spSpit' ? 8 : st === 'spWind' ? 3 : 0;
  ell(hx, -188, 16, 14, SKIN);
  poly(
    [
      [hx + 6, -184],
      [hx + 26, -190 - open],
      [hx + 24, -176 + open],
      [hx + 8, -176],
    ],
    '#3a1a1a',
    2.5,
  );
  ell(hx - 2, -194, 4, 4, '#fff', 1.5);
  ell(hx - 1, -194, 2, 2, OL, 0);
  ctx.restore();
}

// --- the Rust Legion --------------------------------------------------------------------------

/** The junker: a rusty bin on one wheel, a dome head with an amber eye, a pincer claw and a
 *  zapper prong; a rag flag on its aerial. */
export function junker(e) {
  const st = e.state,
    wreck = st === 'wkLie' || st === 'wkFall',
    lean = e.moving ? 0.1 : 0,
    zap = st === 'jkZap',
    raise = st === 'jkWind' ? clamp(e.t / 0.2, 0, 1) : zap ? 1 : 0;
  // wheel (it turns as it rolls)
  ell(0, -30, 30, 30, '#2a2a2e');
  ell(0, -30, 16, 16, STEEL);
  for (let i = 0; i < 6; i++) {
    const a = i + e.walkT * 1.5;
    line(
      [
        [0, -30],
        [Math.cos(a) * 14, -30 + Math.sin(a) * 14],
      ],
      OL,
      2,
    );
  }
  ctx.save();
  ctx.translate(0, -58);
  ctx.rotate(lean);
  ctx.translate(0, 58);
  // the bin
  poly(
    [
      [-30, -58],
      [30, -58],
      [36, -136],
      [-36, -136],
    ],
    RUST,
  );
  stripes(-34, -122, 68, 12);
  line(
    [
      [-20, -66],
      [-24, -110],
    ],
    fill(RUST2),
    3,
  );
  line(
    [
      [20, -66],
      [24, -110],
    ],
    fill(RUST2),
    3,
  );
  rivets([
    [-28, -64],
    [28, -64],
    [-32, -130],
    [32, -130],
  ]);
  // dome head
  const g = c();
  g.beginPath();
  g.arc(0, -136, 30, Math.PI, 0);
  g.closePath();
  g.fillStyle = fill(STEEL);
  g.fill();
  g.strokeStyle = OL;
  g.lineWidth = 3;
  g.stroke();
  if (!wreck) glow(10, -152, 22, AMBER, 0.8);
  ell(10, -152, 9, 9, wreck ? '#5a4020' : LAMP, 2.5);
  line(
    [
      [-14, -164],
      [-22, -204],
    ],
    OL,
    3,
  );
  poly(
    [
      [-22, -204],
      [-2, -198],
      [-8, -192],
      [-22, -190],
    ],
    '#9d3a2a',
    2,
  );
  // the claw
  limb(
    [
      [-28, -110],
      [-56, -96],
      [-62, -70],
    ],
    8,
    STEEL,
  );
  poly(
    [
      [-70, -72],
      [-56, -72],
      [-52, -54],
      [-60, -58],
    ],
    STEEL2,
    2.5,
  );
  poly(
    [
      [-70, -72],
      [-74, -52],
      [-66, -56],
    ],
    STEEL2,
    2.5,
  );
  // the zapper prong: raised, then thrust out with a crackle (unless it lost it in the wreck)
  if (!(wreck && e.looted)) {
    const ex = 56 + raise * 14,
      ey = -104 - raise * 16,
      tx = zap ? 100 : 76,
      ty = zap ? -106 : -116;
    limb(
      [
        [28, -110],
        [ex, ey],
        [tx, ty],
      ],
      8,
      STEEL,
    );
    line(
      [
        [tx, ty],
        [tx + 16, ty - 8],
      ],
      OL,
      4,
    );
    line(
      [
        [tx, ty],
        [tx + 16, ty + 8],
      ],
      OL,
      4,
    );
    if (!wreck && (raise > 0 || Math.sin(G.time * 13 + e.seed) > 0.6)) {
      const L = zap ? 34 : 10;
      line(
        [
          [tx + 16, ty - 6],
          [tx + 16 + L * 0.3, ty + 2],
          [tx + 16 + L * 0.6, ty - 4],
          [tx + 16 + L, ty + 4],
        ],
        '#8fd8ff',
        2.5,
      );
      glow(tx + 20 + L * 0.5, ty, 18 + L * 0.4, '140,215,255', 0.8);
    }
  }
  g.restore();
}

/** The welder: a striped box on four jointed legs, a gas tank on its back, a welding visor;
 *  a torch on its arm with a white-blue flame. */
export function welder(e) {
  const st = e.state,
    wreck = st === 'wkLie' || st === 'wkFall',
    s = stride(e, 1.3),
    torch = st === 'wdTorch',
    up = st === 'wdTorchW' ? clamp(e.t / 0.3, 0, 1) : 0,
    beam = st === 'wdWeld' || st === 'wdFix';
  // four legs (pairs stepping in turn)
  [
    [-30, -64, -74, -108, s],
    [-14, -40, -36, -100, -s],
    [14, 40, 36, -100, s],
    [30, 64, 76, -108, -s],
  ].forEach(([hx, kx, fx, kh, q]) => {
    const lift = Math.max(0, q) * 12;
    limb(
      [
        [hx, -90],
        [kx + q * 6, kh - lift],
        [fx + q * 10, -2 - lift],
      ],
      8,
      STEEL,
    );
    ell(kx + q * 6, kh - lift, 6, 6, RUST2, 2);
  });
  box(-46, -122, 92, 42, RUST, 3, 10);
  stripes(-40, -98, 80, 9);
  ell(-28, -110, 7, 7, beam && st === 'wdFix' ? '#7dff8a' : '#2f7a3a', 2);
  rivets([
    [-40, -116],
    [40, -116],
  ]);
  box(-40, -146, 40, 26, '#7a8a6a', 3, 12);
  // head and visor
  box(14, -150, 40, 30, STEEL, 3, 6);
  box(22, -144, 28, 12, '#162018', 2, 3);
  if (!wreck) glow(36, -138, 14, AMBER, 0.5);
  // the torch arm: raised in the wind-up, thrust out in the flame
  const tx = torch ? 104 : beam ? 100 : 96,
    ty = -116 - up * 26;
  limb(
    [
      [44, -110],
      [76, -132 - up * 10],
      [tx, ty],
    ],
    7,
    STEEL,
  );
  box(tx - 4, ty - 6, 16, 12, '#444', 2.5, 2);
  if (wreck) return;
  if (torch) {
    // the flame along its reach
    glow(tx + 46, ty, 46, '190,230,255', 0.9);
    poly(
      [
        [tx + 12, ty - 7],
        [tx + 80, ty - 2],
        [tx + 92, ty],
        [tx + 80, ty + 2],
        [tx + 12, ty + 7],
      ],
      '#e8f6ff',
      1.5,
    );
    poly(
      [
        [tx + 12, ty - 4],
        [tx + 50, ty],
        [tx + 12, ty + 4],
      ],
      '#7fd0ff',
      0,
    );
  } else {
    glow(tx + 20, ty, 20, '190,230,255', 0.5 + 0.4 * up);
    poly(
      [
        [tx + 12, ty - 3],
        [tx + 26, ty],
        [tx + 12, ty + 3],
      ],
      '#e8f6ff',
      1.5,
    );
  }
}
/** Where the welder's torch is, in the world. */
export const torchAt = (e, k) => [e.x + e.face * 120 * k, e.y - e.z - 116 * k];
