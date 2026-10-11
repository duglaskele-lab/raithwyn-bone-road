// Stage 3, Neon Kyoto: a city of the future with an eastern soul, built by Jawacorp, whose
// robots walk its streets. The road runs through the rainy slums, down the stairs into the
// metro, up the escalator to the avenue of arches and over the bridge, then up the fire
// stairs onto the rooftops: separate roofs with gaps between them (fall in and you are hurt
// and back on the roof), and the garden on top of the tower where the last fight is.
//
// As Old Quarry (see level2.js): world pixels, a floor of convex polygons, a camera path of
// nodes. New here: `PITS`, the gaps between the roofs, where one can be knocked or jump
// short; and `DOORS`, where robots step out of the buildings.

// Depth of the flat streets and of the roofs (as on the other stages: 358..524 on screen).
export const DEPTH = 166;
// How deep a slant is (a little deeper than the flat, so the corners join smoothly).
const SDEPTH = 190;
export const L3 = {
  Y_A: 358, // the back edge of the slums, the avenue and the bridge
  SLUMS_END: 2700, // the slums end at the stairs down into the metro (the rain stops there)
  STAIRS: [2700, 3300], // down into the metro
  Y_B: 538, // the back edge of the metro platform
  HALL_X: 4900, // the metro's concourse, where the big-armed android waits
  ESCAL: [5700, 6300], // up the escalator to the avenue
  ARCH_X: 6300, // the avenue of arches begins
  BRIDGE: [8300, 9300], // the bridge over the expressway
  FIRE: [9300, 9900], // the fire stairs up onto the roofs
  Y_R: 178, // the back edge of the roofs
  ROOFS: [
    [9880, 10800],
    [10900, 11700],
    [11880, 12600],
    [12720, 14600], // the last roof: the tower top and its garden
  ],
  GARDEN_X: 13300, // the garden on the tower top
  END_X: 14600,
  DROP: 0.3, // how much a slant goes down (or up) per pixel
};
const { Y_A, Y_B, Y_R, STAIRS, ESCAL, FIRE, ROOFS, DROP, END_X } = L3;

/** The back edge of the floor under x. */
export function topY(x) {
  if (x < STAIRS[0]) return Y_A;
  if (x < STAIRS[1]) return Y_A + (x - STAIRS[0]) * DROP;
  if (x < ESCAL[0]) return Y_B;
  if (x < ESCAL[1]) return Y_B - (x - ESCAL[0]) * DROP;
  if (x < FIRE[0]) return Y_A;
  if (x < FIRE[1]) return Y_A - (x - FIRE[0]) * DROP;
  return Y_R;
}
const flat = (x0, x1, y) => [
  [x0, y],
  [x1, y],
  [x1, y + DEPTH],
  [x0, y + DEPTH],
];
const slant = ([x0, x1], y0, k) => [
  [x0, y0],
  [x1, y0 + (x1 - x0) * k],
  [x1, y0 + (x1 - x0) * k + SDEPTH],
  [x0, y0 + SDEPTH],
];
export const FLOOR = [
  flat(0, STAIRS[0] + 20, Y_A), // the slums
  slant(STAIRS, Y_A, DROP),
  flat(STAIRS[1] - 20, ESCAL[0] + 20, Y_B), // the metro
  slant(ESCAL, Y_B, -DROP),
  flat(ESCAL[1] - 20, FIRE[0] + 20, Y_A), // the avenue of arches and the bridge
  slant(FIRE, Y_A, -DROP),
  ...ROOFS.map(([a, b]) => flat(a, b, Y_R)), // the roofs
];
// The gaps between the roofs: over them one may jump (or be thrown), on them one falls.
export const PITS = ROOFS.slice(1).map(([a], i) => flat(ROOFS[i][1], a, Y_R));

// The camera path: [road x, road y, screen x, screen y], as in Old Quarry.
const mid = DEPTH / 2;
export const PATH = [
  [390, Y_A + mid, 390, 441],
  [STAIRS[0] + 50, Y_A + mid, 390, 441],
  [STAIRS[1] + 50, Y_B + mid, 390, 441],
  [ESCAL[0] + 50, Y_B + mid, 390, 441],
  [ESCAL[1] + 50, Y_A + mid, 390, 441],
  [FIRE[0] + 50, Y_A + mid, 390, 441],
  [FIRE[1] + 50, Y_R + mid, 390, 441],
  [END_X - 570, Y_R + mid, 390, 441],
];

/** The position along the path (in nodes) where the camera's left edge is at `x`. */
function at(x) {
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i][0] - PATH[i][2],
      b = PATH[i + 1][0] - PATH[i + 1][2];
    if (x <= b) return Math.round((i + (x - a) / (b - a)) * 1e4) / 1e4;
  }
  return PATH.length - 1;
}

// Doors in the buildings along the back of the road, where robots step out: their x (the
// door's middle) and the floor's back edge there.
export const DOORS = [
  420, 980, 1540, 2080, 2480, 6620, 7120, 7640, 8080, 10260, 11240, 12160, 13060,
].map((x) => [x, topY(x)]);

// The fights, as in Old Quarry: where the camera stops (`s`), how hard an ordinary one is
// (`lvl`, see WAVEGEN3) or a fixed one (`sp`). On the roofs every fight has a gap on screen.
export const WAVES3 = [
  // the slums, in the rain
  { s: at(120), lvl: 0 },
  { s: at(820), lvl: 0.08 },
  { s: at(1500), lvl: 0.15 },
  { s: at(L3.SLUMS_END - 960), lvl: 0.22 },
  // the metro
  { s: at(STAIRS[1]), lvl: 0.3 },
  { s: at(STAIRS[1] + 700), lvl: 0.36 },
  { s: at(L3.HALL_X - 480), boss: 1, sp: [['armor', 1, 0.6]] }, // the big-armed android
  // the avenue of arches and the bridge
  { s: at(ESCAL[1]), lvl: 0.45 },
  { s: at(ESCAL[1] + 760), lvl: 0.52 },
  { s: at(L3.BRIDGE[0] - 300), lvl: 0.58 },
  { s: at(L3.BRIDGE[1] - 960), lvl: 0.64 },
  // the roofs: a gap on every screen
  { s: at(ROOFS[0][1] - 520), lvl: 0.7 },
  { s: at(ROOFS[1][1] - 600), lvl: 0.78 },
  { s: at(ROOFS[2][1] - 560), lvl: 0.86 },
  { s: at(ROOFS[2][1] - 560), chain: 1, lvl: 0.92 },
  // the garden on the tower: the last fight
  { s: at(END_X - 960), boss: 1, final: 1, sp: [['armor', 1, 0.8]] },
];

// Things to break on the way (see props3.js): [x, depth into the floor, kind, drop].
const P = [
  // the slums
  [300, 30, 'paper', null],
  [560, 120, 'post', null],
  [780, 20, 'vend', 'hp'],
  [1020, 140, 'cell', null],
  [1200, 26, 'sign', 'rage'],
  [1440, 110, 'post', null],
  [1660, 18, 'paper', 'hp'],
  [1920, 130, 'cell', null],
  [2160, 24, 'vend', 'hp'],
  [2460, 120, 'post', null],
  // the metro
  [3520, 24, 'vend', 'hp'],
  [3820, 130, 'cell', null],
  [4120, 20, 'sign', null],
  [4400, 120, 'post', null],
  [5320, 24, 'vend', 'rage'],
  [5520, 140, 'cell', null],
  // the avenue and the bridge
  [6520, 30, 'paper', null],
  [6820, 120, 'post', null],
  [7060, 20, 'sign', 'hp'],
  [7360, 140, 'cell', null],
  [7620, 24, 'vend', 'hp'],
  [7920, 120, 'post', null],
  [8220, 26, 'paper', 'rage'],
  [8620, 130, 'cell', null],
  [8920, 22, 'sign', null],
  // the roofs
  [10120, 120, 'holo', null],
  [10520, 30, 'cell', null],
  [11060, 130, 'post', null],
  [11420, 24, 'vend', 'hp'],
  [12020, 30, 'holo', 'rage'],
  [12360, 130, 'cell', null],
  [12920, 120, 'post', null],
  [13140, 24, 'vend', 'hp'],
];
export const PROPS3 = P.map(([x, d, k, drop]) => [x, topY(x) + d, k, drop]);

// How an ordinary fight of Neon Kyoto is rolled (as WAVEGEN, config.js). For now the robots
// are stood in for by the Bone Road's skeletons.
export const WAVEGEN3 = {
  count: [5, 10],
  hard: [0.06, 0.32],
  mid: [0.14, 0.32],
  maxHard: [1, 3],
  gap: [0.9, 0.5],
  pools: {
    easy: { grunt: 4, monkey: 1 },
    mid: { thrower: 1, shield: 1 },
    hard: { brute: 1, samurai: 1 },
  },
  cap: { samurai: 1 },
};
