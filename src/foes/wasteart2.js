// How the rest of the Wastelands' fighters look (see wasteart.js for the pieces and the frame):
// the rust-eater, the two-headed brute and the glowing one of the Children of the Crater; the
// harvester, the spotter and the mine beetle of the Rust Legion. Facing right, feet at the
// origin.
import { OL, TAU } from '../config.js';
import { clamp } from '../util.js';
import { G } from '../state.js';
import { ctx } from '../gfx.js';
import {
  AMBER,
  box,
  ell,
  fill,
  glow,
  GREEN,
  LAMP,
  limb,
  line,
  poly,
  rivets,
  RUST,
  RUST2,
  SKIN,
  SKIN2,
  STEEL,
  STEEL2,
  stride,
  stripes,
  turn,
} from './wasteart.js';

// --- the Children of the Crater ----------------------------------------------------------------

/** The rust-eater: stocky, grey-green, a huge underbite of steel teeth, a robot's claw grafted
 *  on for an arm, plates of rusty metal bolted into its hide — more of them as it eats. */
export function rusteater(e) {
  const s = stride(e, 0.8),
    st = e.state,
    lunge = st === 'reBite' ? 16 : 0,
    back = st === 'reWind' ? clamp(e.t / 0.3, 0, 1) : 0,
    eat = st === 'reEat',
    jaw = eat ? Math.abs(Math.sin(e.t * 14)) * 8 : st === 'reBite' ? 12 : back * 10;
  limb(
    [
      [-16, -84],
      [-22 - s * 10, -44],
      [-30 - s * 16, -2],
    ],
    20,
    SKIN2,
  );
  limb(
    [
      [14, -84],
      [20 + s * 10, -44],
      [30 + s * 16, -2],
    ],
    20,
    SKIN,
  );
  ell(-30 - s * 16, -4, 18, 8, '#3a3029');
  ell(34 + s * 16, -4, 18, 8, '#3a3029');
  poly(
    [
      [-30, -96],
      [32, -96],
      [28, -64],
      [-26, -64],
    ],
    '#5d4a3a',
  );
  ctx.save();
  ctx.translate(lunge - back * 8, eat ? 14 : 0);
  if (eat) ctx.rotate(0.35);
  // the grafted claw
  limb(
    [
      [-26, -150],
      [-50, -118],
      [-54, -86],
    ],
    14,
    STEEL,
  );
  poly(
    [
      [-62, -86],
      [-46, -86],
      [-40, -64],
      [-48, -60],
      [-54, -74],
      [-62, -60],
      [-70, -66],
    ],
    RUST,
  );
  ell(0, -132, 44, 48, SKIN);
  // the plates it has grown from what it ate
  const PL = [
    [
      [-30, -156],
      [-6, -162],
      [-2, -134],
      [-28, -128],
    ],
    [
      [10, -120],
      [32, -126],
      [34, -104],
      [12, -100],
    ],
    [
      [-34, -118],
      [-12, -116],
      [-14, -96],
      [-32, -100],
    ],
    [
      [8, -168],
      [30, -160],
      [28, -140],
      [6, -146],
    ],
  ];
  for (let i = 0; i < 1 + (e.plates ?? 0) && i < PL.length; i++) {
    poly(PL[i], i % 2 ? RUST2 : RUST);
    rivets(PL[i].slice(0, 2).map(([x, y]) => [x + 4, y + 4]));
  }
  // the head and its jaw
  ell(10, -186, 26, 20, SKIN);
  poly(
    [
      [-6, -180 + jaw],
      [52, -184 + jaw],
      [56, -160 + jaw],
      [44, -150 + jaw],
      [0, -154 + jaw],
    ],
    SKIN2,
  );
  for (let i = 0; i < 6; i++)
    poly(
      [
        [4 + i * 8, -180 + jaw],
        [10 + i * 8, -180 + jaw],
        [8 + i * 8, -194 + jaw],
      ],
      '#c9cdd2',
      1.5,
    );
  ell(4, -198, 4, 3, LAMP, 1.5);
  ell(18, -200, 4, 3, LAMP, 1.5);
  // the front arm, a bit of robot in its fist while it eats
  limb(
    [
      [24, -150],
      [50, -134],
      [62, eat ? -120 : -150],
    ],
    15,
    SKIN,
  );
  if (eat) {
    ell(70, -122, 15, 13, STEEL);
    ell(76, -122, 5, 5, '#331', 2);
  }
  ctx.restore();
}

/** The two-headed brute: a hulk of pink mutated flesh, tumours and stitches, a belt of tyres;
 *  a dopey head and an angry one; a car door for a shield. */
export function twohead(e) {
  const s = stride(e, 0.7),
    st = e.state,
    raise = st === 'thWind' ? clamp(e.t / 0.35, 0, 1) : st === 'thHold' ? 1 : 0,
    grab = st === 'thGrab' || st === 'thThrow' ? 1 : 0,
    laugh = st === 'thLaugh';
  limb(
    [
      [-22, -100],
      [-28 - s * 10, -52],
      [-36 - s * 16, -2],
    ],
    26,
    '#8a6d55',
  );
  limb(
    [
      [22, -100],
      [28 + s * 10, -52],
      [38 + s * 16, -2],
    ],
    26,
    '#9a7a60',
  );
  ell(-36 - s * 16, -5, 22, 9, '#2e2722');
  ell(42 + s * 16, -5, 22, 9, '#2e2722');
  ell(0, -102, 46, 14, '#2c2a2a', 3);
  ell(0, -102, 30, 8, '#4a4646', 2);
  // the back arm with the car door
  turn(-40, -184, -raise * 1.2, () => {
    limb(
      [
        [-40, -184],
        [-74, -150],
        [-80, -116],
      ],
      22,
      '#b98a6e',
    );
    poly(
      [
        [-120, -190],
        [-60, -196],
        [-56, -106],
        [-116, -100],
      ],
      '#4e7a8a',
      3,
    );
    poly(
      [
        [-112, -184],
        [-66, -188],
        [-66, -150],
        [-110, -146],
      ],
      '#a8d0dc',
      2.5,
    );
    line(
      [
        [-92, -120],
        [-76, -120],
      ],
      OL,
      4,
    );
  });
  // the body
  ell(0, -158, 58, 62, '#c98e72');
  ell(26, -136, 14, 12, '#d9a07d', 2);
  ell(-28, -176, 10, 9, '#d9a07d', 2);
  line(
    [
      [-16, -150],
      [4, -140],
      [-6, -126],
    ],
    fill('#9a6550'),
    2.5,
  );
  // the dopey head (it laughs at the other one when that is struck)
  const dt = laugh ? Math.sin(e.t * 30) * 3 : 0;
  ell(-26, -224 + dt, 22, 20, '#c98e72');
  ell(-32, -228 + dt, 5, 6, '#fff', 1.5);
  ell(-20, -228 + dt, 5, 6, '#fff', 1.5);
  ell(-31, -226 + dt, 2, 2, OL, 0);
  ell(-21, -230 + dt, 2, 2, OL, 0);
  if (laugh) ell(-26, -210 + dt, 9, 6, '#3a1a1a', 2);
  else
    line(
      [
        [-34, -212],
        [-20, -214],
      ],
      OL,
      2.5,
    );
  // the angry head
  const hurt = laugh ? 0.25 : 0;
  turn(26, -228, hurt, () => {
    ell(26, -228, 24, 22, '#b97e64');
    line(
      [
        [16, -240],
        [30, -234],
      ],
      OL,
      4,
    );
    line(
      [
        [36, -240],
        [44, -236],
      ],
      OL,
      4,
    );
    ell(24, -230, 4, 4, '#ff4a2a', 1.5);
    ell(40, -230, 4, 4, '#ff4a2a', 1.5);
    poly(
      [
        [18, -216],
        [44, -216],
        [40, -208],
        [22, -208],
      ],
      '#3a1a1a',
      2,
    );
  });
  // the front fist: up over its head, then out to grab
  turn(42, -186, -raise * 1.9 + grab * 0.5, () => {
    limb(
      [
        [42, -186],
        [76, -150],
        [84, -114],
      ],
      24,
      '#c98e72',
    );
    ell(88, -106, 18, 16, '#c98e72');
  });
}

/** The glowing one: a starved body gone half clear, its bones glowing green inside it, a
 *  ring of radiation round it; brighter and shaking as it is about to burst. */
export function glowing(e) {
  const st = e.state,
    boom = st === 'glBoom' ? clamp(e.t / 0.7, 0, 1) : 0,
    s = stride(e, 0.8),
    swipe = st === 'glSwipe' ? 1 : 0,
    wind = st === 'glWind' ? clamp(e.t / 0.3, 0, 1) : 0,
    shake = boom ? Math.sin(G.time * 60) * 4 * boom : 0,
    pulse = 0.35 + 0.1 * Math.sin(G.time * 4 + e.seed) + boom * 0.5;
  ctx.translate(shake, 0);
  glow(0, -120, 150 + boom * 60, GREEN, pulse);
  const sk = FLASHED(e) ? '#fff' : 'rgba(200,255,170,.8)';
  limb(
    [
      [-6, -92],
      [-12 - s * 9, -48],
      [-20 - s * 14, -2],
    ],
    10,
    sk,
  );
  limb(
    [
      [6, -92],
      [12 + s * 9, -48],
      [20 + s * 14, -2],
    ],
    10,
    sk,
  );
  poly(
    [
      [-16, -104],
      [16, -104],
      [20, -74],
      [4, -80],
      [-4, -72],
      [-20, -78],
    ],
    '#d6b23a',
  );
  stripes(-16, -104, 32, 6);
  poly(
    [
      [-20, -104],
      [20, -104],
      [26, -160],
      [-26, -160],
    ],
    sk,
  );
  line(
    [
      [0, -104],
      [0, -158],
    ],
    '#9dff5a',
    4,
  );
  ctx.strokeStyle = '#9dff5a';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(0, -150 + i * 11, 18 - i, 6, 0, Math.PI * 1.05, Math.PI * 1.95, true);
    ctx.stroke();
  }
  glow(0, -132, 26 + boom * 20, GREEN, 0.8);
  // the arms: raised (its wind-up, and as it bursts), swiped down
  const up = Math.max(wind, boom, 1 - swipe) * (swipe ? 0 : 1);
  for (const sd of [-1, 1]) {
    const hx = sd * (swipe ? 50 : 52),
      hy = swipe ? -110 : -206 + (1 - up) * 70;
    limb(
      [
        [sd * 22, -156],
        [sd * 46, swipe ? -140 : -176 + (1 - up) * 40],
        [hx, hy],
      ],
      8,
      sk,
    );
    for (let i = 0; i < 3; i++)
      line(
        [
          [hx, hy],
          [hx + sd * (i * 6 - 4), hy - 14],
        ],
        OL,
        3,
      );
  }
  ell(0, -184, 20, 22, sk);
  for (const x of [-7, 7]) {
    ell(x, -186, 6, 7, '#fff', 0);
    glow(x, -186, 12, GREEN, 0.9);
  }
  line(
    [
      [-8, -170],
      [8, -170],
    ],
    OL,
    2,
  );
}
const FLASHED = (e) => e.flash > 0;

// --- the Rust Legion ---------------------------------------------------------------------------

/** The harvester: an old combine on tracks, a reel of blades in front, a cab with two amber
 *  lamps, a smokestack; "H-7" on its side. Its reel spins faster as it revs and charges. */
export function harvester(e) {
  const st = e.state,
    rev = st === 'hvWind' ? clamp(e.t / 0.8, 0, 1) : 0,
    run = st === 'hvRun',
    stuck = st === 'hvStuck',
    dead = st === 'wkLie' || st === 'wkFall',
    spin = (e.reel ?? 0) + G.time * (run ? 30 : rev ? 6 + rev * 20 : st === 'hvChop' ? 24 : 4),
    shake = rev ? Math.sin(G.time * 50) * 2 * rev : 0;
  ctx.translate(shake, 0);
  if (stuck) ctx.rotate(0.1);
  // tracks
  box(-110, -46, 170, 44, '#2a2a2e', 3, 22);
  for (let i = 0; i < 6; i++) {
    const a = spin * 0.3 + i;
    ell(-88 + i * 26, -24, 11, 11, STEEL, 2);
    line(
      [
        [-88 + i * 26, -24],
        [-88 + i * 26 + Math.cos(a) * 9, -24 + Math.sin(a) * 9],
      ],
      OL,
      2,
    );
  }
  poly(
    [
      [-118, -48],
      [64, -48],
      [64, -130],
      [-26, -136],
      [-118, -120],
    ],
    RUST,
  );
  stripes(-112, -66, 172, 12);
  // (its number reads the right way round whichever way it faces)
  ctx.save();
  ctx.translate(-68, -96);
  ctx.scale(e.face, 1);
  ctx.fillStyle = fill('#f3e2b0');
  ctx.font = 'bold 24px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H-7', 0, 0);
  ctx.restore();
  rivets([
    [-110, -114],
    [56, -122],
    [-30, -128],
  ]);
  // the smokestack, puffing (black smoke when it revs)
  box(-100, -176, 18, 54, STEEL2, 3, 3);
  if (!dead || G.time % 1 < 2)
    for (let i = 0; i < 3; i++) {
      const u = (G.time * (run || rev ? 2.2 : 0.8) + i / 3) % 1;
      ctx.fillStyle = `rgba(${rev || run || dead ? '40,36,34' : '90,84,80'},${0.6 * (1 - u)})`;
      ctx.beginPath();
      ctx.arc(-92 + u * 30, -184 - u * 70, 10 + u * 16, 0, TAU);
      ctx.fill();
    }
  // the cab
  poly(
    [
      [-30, -134],
      [40, -134],
      [34, -186],
      [-20, -186],
    ],
    RUST2,
  );
  box(-14, -178, 40, 22, '#1d2328', 2.5, 3);
  for (const x of [-2, 16]) {
    if (!dead) glow(x, -167, 14, AMBER, 0.9);
    ell(x, -167, 5, 5, dead ? '#5a4020' : LAMP, 0);
  }
  // the reel of blades
  limb(
    [
      [56, -96],
      [96, -84],
    ],
    10,
    STEEL,
  );
  ctx.save();
  ctx.translate(118, -66);
  ctx.rotate(spin);
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i * TAU) / 6);
    poly(
      [
        [0, -6],
        [48, -10],
        [52, 0],
        [0, 6],
      ],
      '#c9cdd2',
      2.5,
    );
    ctx.restore();
  }
  ell(0, 0, 18, 18, LAMP);
  ell(0, 0, 7, 7, OL, 0);
  ctx.restore();
  if (run)
    for (let i = 0; i < 3; i++)
      line(
        [
          [-150 - i * 14, -30 - i * 34],
          [-120 - i * 14, -30 - i * 34],
        ],
        'rgba(120,70,30,.5)',
        4,
      );
}

/** The spotter: a box on three tall stilts, a long lens with a red eye, a dish aerial. */
export function spotter(e) {
  const st = e.state,
    s = stride(e, 0.6),
    aim = st === 'stAim' ? clamp(e.t / 0.9, 0, 1) : st === 'stFire' ? 1 : 0,
    dead = st === 'wkLie' || st === 'wkFall';
  limb(
    [
      [-10, -170],
      [-30 - s * 6, -90],
      [-24 - s * 12, -2],
    ],
    7,
    STEEL,
  );
  limb(
    [
      [10, -170],
      [34 + s * 6, -96],
      [26 + s * 12, -2],
    ],
    7,
    STEEL,
  );
  limb(
    [
      [0, -170],
      [-2, -2],
    ],
    6,
    STEEL2,
  );
  for (const [x, y] of [
    [-30 - s * 6, -90],
    [34 + s * 6, -96],
  ])
    ell(x, y, 6, 6, RUST, 2);
  for (const x of [-24 - s * 12, -2, 26 + s * 12]) ell(x, -3, 10, 4, '#2a2a2e', 2);
  box(-26, -214, 52, 46, RUST, 3, 8);
  stripes(-26, -180, 52, 8);
  box(14, -212, 54, 24, STEEL2, 3, 4);
  ell(70, -200, 14, 14, STEEL);
  ell(72, -200, 9, 9, dead ? '#5a2020' : '#ff3a2a', 2);
  if (!dead) glow(72, -200, 24 + aim * 24, '255,60,40', 0.6 + aim * 0.4);
  ctx.beginPath();
  ctx.ellipse(-16, -230, 16, 7, -0.5, 0, Math.PI);
  ctx.fillStyle = fill(STEEL);
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.stroke();
  line(
    [
      [-14, -224],
      [-8, -216],
    ],
    OL,
    3,
  );
}
/** Where the spotter's lens is, in the world. */
export const lensAt = (e, k) => [e.x + e.face * 80 * k, e.y - e.z - 200 * k];

/** The mine beetle: a rusty dome on six little legs, a warning light that blinks faster and
 *  faster once it is armed. */
export function mine(e) {
  const st = e.state,
    armed = st === 'mbArm',
    run = e.moving ? 1 : 0,
    blink = armed ? Math.floor(G.time * (6 + e.t * 30)) % 2 : Math.floor(G.time * 2) % 2;
  if (e.kicked) ctx.rotate(G.time * 18);
  for (let i = 0; i < 3; i++) {
    const q = run ? Math.sin(G.time * 30 + i * 2) * 4 : 0;
    limb(
      [
        [-8 + i * 8, -14],
        [-20 + i * 14 + q, -6],
        [-28 + i * 20 + q, -1],
      ],
      3,
      STEEL2,
    );
  }
  ctx.beginPath();
  ctx.arc(0, -16, 28, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = fill(RUST);
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.stroke();
  stripes(-26, -22, 52, 7);
  ell(0, -42, 8, 6, blink ? '#ff3a2a' : '#6a2a22', 2.5);
  if (blink) glow(0, -42, armed ? 34 : 18, '255,60,40', 0.9);
}

/** The ring of radiation round the glowing one, on the ground. */
export function auraRing(e, r) {
  ctx.save();
  ctx.setLineDash([6, 8]);
  ctx.lineDashOffset = -G.time * 20;
  ctx.strokeStyle = 'rgba(140,255,80,.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(e.x - G.cam, e.y, r, r * 0.22, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}
/** Stars wheeling over a dazed machine (the harvester stuck in the sand). */
export { dizzy } from './kit.js';
