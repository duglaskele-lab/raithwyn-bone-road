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
// camera stops (`s`). Each one has an idea of its own (`name`): `core` are the foes it is about,
// always the same; `fill` a few plain ones round them, rolled anew every run (see themedWave in
// waves.js); `mid` come once the first ones have lost half of their health. [type, side,
// delay]: side 1 from the right, -1 from the left, 0 out of the ground.
const B0 = SLANT1[1], // the lower street's first screen
  B1 = SLANT2[0] - 960, // and its last
  C0 = SLANT2[1]; // the camp's first screen
const crowd = (a, b, from = 0.6) => ({
  n: [a, b],
  pool: { zombie: 1.2, miner: 1 },
  from,
  gap: 0.8,
});
export const WAVES2 = [
  // --- Main Street ---
  // the shift change: miners and their pickaxe charge, a red barrel in the middle of the street
  {
    s: at(150),
    name: 'shift change',
    core: [
      ['miner', 1, 0],
      ['miner', 1, 0.9],
    ],
    fill: crowd(1, 2, 1.6),
  },
  // powder monkeys: dynamite thrown over a crowd of zombies — knock a lit stick out of a hand
  // and it goes off among them
  {
    s: at(760),
    name: 'powder monkeys',
    core: [
      ['dynamite', 1, 0],
      ['zombie', 0, 0.3],
      ['zombie', 0, 0.7],
      ['dynamite', -1, 1.4],
      ['zombie', 0, 1.8],
    ],
    fill: crowd(0, 1, 2.6),
  },
  // the stalker: the first mutant lizard, which leaps away from plain blows
  {
    s: at(L2.A_END - 960),
    name: 'the stalker',
    core: [
      ['miner', 1, 0],
      ['lizard', 1, 0.8],
      ['miner', -1, 1.8],
    ],
    fill: crowd(0, 1, 2.6),
  },
  // --- the lower street ---
  // the wailing street: banshees stun whoever stands in their cone, zombies grab whoever is stunned
  {
    s: at(B0),
    name: 'wailing street',
    core: [
      ['banshee', 1, 0],
      ['zombie', 0, 0.5],
      ['zombie', 0, 0.9],
      ['miner', -1, 1.6],
    ],
    mid: [
      ['banshee', -1, 0.3],
      ['zombie', 0, 0.8],
      ['zombie', 0, 1.2],
    ],
  },
  // the bar brawl: the strongman throws her across the street, through whoever stands there
  {
    s: at((B0 + B1) / 2),
    name: 'bar brawl',
    core: [
      ['strongman', 1, 0],
      ['miner', -1, 0.6],
      ['miner', 1, 1.4],
    ],
    fill: crowd(1, 2, 2.2),
  },
  // the short fuse: miners charging past red barrels, dynamite flying, a lizard to finish
  {
    s: at(B1),
    name: 'short fuse',
    core: [
      ['miner', 1, 0],
      ['dynamite', 1, 0.5],
      ['miner', -1, 1],
      ['miner', 1, 1.8],
    ],
    mid: [
      ['lizard', -1, 0.3],
      ['dynamite', 1, 0.9],
    ],
  },
  // --- the mining camp under the cliff, then into the mine ---
  // iron and powder: a power armour whose bullets set off the barrels and the sticks lying about
  {
    s: at(C0),
    name: 'iron and powder',
    core: [
      ['armor', 1, 0],
      ['miner', -1, 0.8],
      ['dynamite', -1, 1.6],
    ],
    fill: crowd(1, 2, 2.4),
  },
  // the pack hunt: two lizards at once, a banshee wailing over them
  {
    s: at(C0 + 400),
    name: 'pack hunt',
    core: [
      ['lizard', 1, 0],
      ['banshee', -1, 0.8],
      ['lizard', -1, 1.8],
    ],
    fill: crowd(0, 1, 2.8),
  },
  // the green slime in the flooded hall
  { s: at(L2.HALL_X - 480), boss: 1, sp: [['slime', 1, 0.6]] },
  // the last shift: everything the quarry has, in two goes
  {
    s: at(END_X - 1280),
    name: 'the last shift',
    core: [
      ['armor', 1, 0],
      ['miner', -1, 0.6],
      ['dynamite', 1, 1.4],
      ['miner', -1, 2],
    ],
    mid: [
      ['strongman', -1, 0.3],
      ['lizard', 1, 1],
      ['zombie', 0, 1.6],
      ['zombie', 0, 2],
    ],
  },
  // the last fight: the Prospector, alone
  { s: at(END_X - 960), boss: 1, final: 1, sp: [['prospector', 1, 0.8]] },
];

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
