// Stage 2, Old Quarry: a mining town of the Wild West and the mine under the cliff behind it.
// Unlike the Bone Road it does not only run to the right: twice the street goes downhill on a
// slant (after the Manhattan Project's winding streets). The fights are on the flat: Main
// Street, the lower street, the mining camp and the tunnels; the slants are only walked.
//
// All of it is in world pixels. The floor is a set of convex polygons (walkable where any of
// them is); the camera runs along a path of nodes. Each node pairs a point of the road (where
// the player walks) with where that point sits on screen; the camera is the difference. A
// fight locks the camera at `s`, a position along that path in nodes (2.5: halfway between
// nodes 2 and 3).

// Depth of the flat streets and tunnels (as on the Bone Road: 358..524 on screen).
export const DEPTH = 166;
// How deep a slant is (a little deeper than the flat, so the corners join smoothly).
const SDEPTH = 190;
export const L2 = {
  Y_A: 358, // the back edge of Main Street
  A_END: 2400, // where Main Street ends and the first slant begins
  SLANT1: [2400, 3200], // the first slant: from x, to x
  Y_B: 598, // the back edge of the lower street
  SLANT2: [4800, 5600], // the second slant, down to the mining camp
  Y_C: 838, // the back edge of the camp and of the mine's tunnel
  DROP: 0.3, // how much a slant goes down per pixel
  CLIFF_X: 5630, // where the cliff over the camp begins
  PORTAL_X: 6050, // the mine's timber portal in the cliff
  HALL_X: 6780, // the slime's flooded hall
  END_X: 7900,
  GATE_X: 260, // the welcome sign, at the roadside
};
const { Y_A, SLANT1, Y_B, SLANT2, Y_C, DROP, END_X } = L2;
/** The back edge of the floor under x (the street, a slant, the camp, the tunnel). */
export function topY(x) {
  if (x < SLANT1[0]) return Y_A;
  if (x < SLANT1[1]) return Y_A + (x - SLANT1[0]) * DROP;
  if (x < SLANT2[0]) return Y_B;
  if (x < SLANT2[1]) return Y_B + (x - SLANT2[0]) * DROP;
  return Y_C;
}
const flat = (x0, x1, y) => [
  [x0, y],
  [x1, y],
  [x1, y + DEPTH],
  [x0, y + DEPTH],
];
const slant = ([x0, x1], y0) => [
  [x0, y0],
  [x1, y0 + (x1 - x0) * DROP],
  [x1, y0 + (x1 - x0) * DROP + SDEPTH],
  [x0, y0 + SDEPTH],
];
export const FLOOR = [
  flat(0, SLANT1[0] + 20, Y_A), // Main Street
  slant(SLANT1, Y_A),
  flat(SLANT1[1] - 20, SLANT2[0] + 20, Y_B), // the lower street
  slant(SLANT2, Y_B),
  flat(SLANT2[1] - 20, END_X, Y_C), // the mining camp and the tunnel
];

// The camera path: [road x, road y, screen x, screen y]. The player walks at (390, 441) of
// the screen as on the Bone Road; down a slant the camera slides along with the street.
const mid = DEPTH / 2;
export const PATH = [
  [390, Y_A + mid, 390, 441],
  [SLANT1[0] + 50, Y_A + mid, 390, 441],
  [SLANT1[1] + 50, Y_B + mid, 390, 441],
  [SLANT2[0] + 50, Y_B + mid, 390, 441],
  [SLANT2[1] + 50, Y_C + mid, 390, 441],
  [END_X - 570, Y_C + mid, 390, 441],
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
// The fights, all where the whole screen is flat (none on a slant), given by where the
// camera stops. `lvl` rolls an ordinary one (see WAVEGEN2), `sp` is a fixed one; `mid`
// brings more enemies once the first ones have lost half of their health.
const B0 = SLANT1[1], // the lower street's first screen
  B1 = SLANT2[0] - 960, // and its last
  C0 = SLANT2[1]; // the camp's first screen
export const WAVES2 = [
  // Main Street: a few at first
  { s: at(150), lvl: 0 },
  { s: at(760), lvl: 0.1 },
  { s: at(L2.A_END - 960), lvl: 0.2 },
  // the lower street
  { s: at(B0), lvl: 0.3 },
  { s: at((B0 + B1) / 2), lvl: 0.4 },
  { s: at(B1), lvl: 0.5 },
  { s: at(B1), chain: 1, lvl: 0.55 },
  // the mining camp under the cliff, then into the mine
  { s: at(C0), lvl: 0.62 },
  { s: at(C0 + 400), lvl: 0.72 },
  // the green slime in the flooded hall
  { s: at(L2.HALL_X - 480), boss: 1, sp: [['slime', 1, 0.6]] },
  { s: at(END_X - 1280), lvl: 0.85 },
  { s: at(END_X - 1280), chain: 1, lvl: 1 },
  // the last fight: the Prospector, alone
  { s: at(END_X - 960), boss: 1, final: 1, sp: [['prospector', 1, 0.8]] },
];

// How an ordinary fight of Old Quarry is rolled (as WAVEGEN, config.js): a quarter fewer
// enemies than on the Bone Road, and only a handful at first.
export const WAVEGEN2 = {
  count: [4, 9],
  hard: [0.06, 0.3],
  mid: [0.14, 0.3],
  maxHard: [1, 3],
  gap: [0.95, 0.5],
  pools: {
    easy: { miner: 4, zombie: 3 },
    mid: { dynamite: 1 },
    hard: { lizard: 1.4, armor: 0.6 },
  },
  // never more than this many of a kind in one fight
  cap: { armor: 2 },
};

// Breakable things on the way: [x, depth into the floor, kind, drop]. Barrels break and may
// hold something; red barrels blow up.
const P = [
  [520, 22, 'barrel', 'hp'],
  [700, 140, 'tnt', null],
  [960, 14, 'barrel', null],
  [1240, 110, 'barrel', 'rage'],
  [1300, 136, 'tnt', null],
  [1620, 18, 'barrel', null],
  [1680, 26, 'barrel', 'hp'],
  [1980, 122, 'tnt', null],
  [2250, 20, 'barrel', 'rage'],
  [2700, 40, 'barrel', null],
  [3000, 150, 'tnt', null],
  [3420, 20, 'barrel', 'rage'],
  [3640, 130, 'tnt', null],
  [3900, 16, 'barrel', null],
  [3960, 24, 'barrel', 'hp'],
  [4300, 120, 'tnt', null],
  [4560, 18, 'barrel', null],
  [5200, 40, 'barrel', 'rage'],
  [5700, 20, 'barrel', null],
  [5780, 26, 'tnt', null],
  [5960, 130, 'barrel', 'hp'],
  [6280, 140, 'tnt', null],
  [6420, 18, 'barrel', null],
  [6470, 24, 'barrel', 'rage'],
  [7000, 130, 'tnt', null],
  [7120, 20, 'barrel', 'hp'],
  [7300, 140, 'tnt', null],
  [7480, 22, 'barrel', null],
];
export const PROPS2 = P.map(([x, d, k, drop]) => [x, topY(x) + d, k, drop]);
