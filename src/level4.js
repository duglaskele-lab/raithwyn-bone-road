// Stage 4, Frostfang Pass: a sword-and-sorcery road after Golden Axe. It starts in a village of
// thatched huts in the morning sun, leaves it on a road climbing into the hills, then turns:
// the trail goes away from the viewer, straight up the mountainside (the camera climbs with
// it), and turns again onto a ledge along the cliff, past a great waterfall — over its gorge
// on a narrow plank bridge (fall in and you are hurt and back on the ledge), to the pool under
// the falls where the minotaur waits — and then down into the dark forest, where at night, in
// a glade under the moon, the frost wolf hunts.
//
// As Old Quarry and Midnight City (see level2.js, level3.js): world pixels, a floor of convex
// polygons, a camera path of nodes, gaps to fall into (`PITS`).

// Depth of the flat roads (as on the other stages: 358..524 on screen).
export const DEPTH = 166;
// How deep a slant is (a little deeper than the flat, so the corners join smoothly).
const SDEPTH = 190;
export const L4 = {
  Y_A: 358, // the back edge of the village street
  VILLAGE_END: 2500, // the last huts; the road begins to climb
  ROAD: [2500, 3300], // the road up into the hills
  Y_B: 118, // the back edge of the hill road
  CLIMB: [4500, 5100], // the trail straight up the mountainside: its sides
  CLIMB_X: 4800, // its middle
  Y_C: -602, // the back edge of the ledge along the cliff
  FALLS: [6700, 7200], // the gorge under the waterfall, crossed by the bridge
  BRIDGE: [60, 116], // the bridge's planks: from, to, in depth below the ledge's back edge
  POOL_X: 7700, // the pool under the falls, where the minotaur waits
  DESCENT: [8800, 9600], // the path down into the forest
  Y_D: -362, // the back edge of the forest road
  GLADE_X: 12300, // the frost wolf's glade
  END_X: 13400,
  DROP: 0.3, // how much a slant goes down (or up) per pixel
};
const { Y_A, Y_B, Y_C, Y_D, ROAD, CLIMB, CLIMB_X, FALLS, BRIDGE, DESCENT, DROP, END_X } = L4;

/** The back edge of the floor under x (on the climb: its top). */
export function topY(x) {
  if (x < ROAD[0]) return Y_A;
  if (x < ROAD[1]) return Y_A - (x - ROAD[0]) * DROP;
  if (x < CLIMB[0]) return Y_B;
  if (x < DESCENT[0]) return Y_C;
  if (x < DESCENT[1]) return Y_C + (x - DESCENT[0]) * DROP;
  return Y_D;
}
const rect = (x0, x1, y0, y1) => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];
const flat = (x0, x1, y) => rect(x0, x1, y, y + DEPTH);
const slant = ([x0, x1], y0, k) => [
  [x0, y0],
  [x1, y0 + (x1 - x0) * k],
  [x1, y0 + (x1 - x0) * k + SDEPTH],
  [x0, y0 + SDEPTH],
];
export const FLOOR = [
  flat(0, ROAD[0] + 20, Y_A), // the village
  slant(ROAD, Y_A, -DROP),
  flat(ROAD[1] - 20, CLIMB[1], Y_B), // the hill road
  rect(CLIMB[0], CLIMB[1], Y_C, Y_B + DEPTH), // the climb, straight up the mountainside
  flat(CLIMB[0], FALLS[0] + 20, Y_C), // the ledge along the cliff
  rect(FALLS[0], FALLS[1], Y_C + BRIDGE[0], Y_C + BRIDGE[1]), // the plank bridge
  flat(FALLS[1] - 20, DESCENT[0] + 20, Y_C), // the pool under the falls
  slant(DESCENT, Y_C, DROP),
  flat(DESCENT[1] - 20, END_X, Y_D), // the forest
];
// The gorge on either side of the bridge: over it one may jump (or be thrown), in it one falls.
export const PITS = [
  rect(FALLS[0] + 20, FALLS[1] - 20, Y_C, Y_C + BRIDGE[0]),
  rect(FALLS[0] + 20, FALLS[1] - 20, Y_C + BRIDGE[1], Y_C + DEPTH),
];

// The camera path: [road x, road y, screen x, screen y], as in Old Quarry. At the foot of the
// climb the camera comes round to look up the trail (its middle in the middle of the screen)
// and goes up with it; at the top it turns along the ledge again.
const mid = DEPTH / 2;
export const PATH = [
  [390, Y_A + mid, 390, 441],
  [ROAD[0] + 50, Y_A + mid, 390, 441],
  [ROAD[1] + 50, Y_B + mid, 390, 441],
  [CLIMB_X, Y_B + mid, 480, 441],
  [CLIMB_X, Y_C + mid, 480, 441],
  [CLIMB_X + 600, Y_C + mid, 390, 441],
  [DESCENT[0] + 50, Y_C + mid, 390, 441],
  [DESCENT[1] + 50, Y_D + mid, 390, 441],
  [END_X - 570, Y_D + mid, 390, 441],
];

/** The position along the path (in nodes) where the camera's left edge is at `x`. */
function at(x) {
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i][0] - PATH[i][2],
      b = PATH[i + 1][0] - PATH[i + 1][2];
    if (b > a && x <= b) return Math.round((i + (x - a) / (b - a)) * 1e4) / 1e4;
  }
  return PATH.length - 1;
}
/** A position on the climb, `u` of the way up (the camera's left edge stays put there). */
const up = (u) => 3 + u;

// How an ordinary fight is rolled (as WAVEGEN, config.js), by where it is: the village and the
// hills, the mountain (the harpies' home), the forest (the wolves' one). `rider` is a bandit on
// a cockatrice, `drake` one on a fire drake (see foes/beasts.js).
const gen = (pools, cap) => ({
  count: [4, 9],
  hard: [0.06, 0.32],
  mid: [0.16, 0.34],
  maxHard: [1, 3],
  gap: [0.95, 0.5],
  pools,
  cap: { knight: 2, giant: 1, rider: 1, drake: 1, harpy: 2, amazon: 3, wolf: 4, ...cap },
});
export const GEN4 = {
  village: gen({
    easy: { bandit: 3, amazon: 1 },
    mid: { rider: 0.7, amazon: 0.6 },
    hard: { knight: 1, giant: 0.35 },
  }),
  mountain: gen({
    easy: { bandit: 2.4, amazon: 1.4 },
    mid: { harpy: 1.3, rider: 0.5, drake: 0.35 },
    hard: { knight: 1, giant: 0.7 },
  }),
  forest: gen({
    easy: { wolf: 2.4, bandit: 1.4 },
    mid: { amazon: 1, harpy: 0.5, drake: 0.6 },
    hard: { knight: 1, giant: 0.9 },
  }),
};

// The fights, as in Old Quarry: where the camera stops (`s`), how hard an ordinary one is
// (`lvl`, rolled from `gen`) or a fixed one (`sp`); `add`: fixed ones joining a rolled fight
// (the thief with his sack, a rider). On the bridge the gorge is on screen.
export const WAVES4 = [
  // the village
  { s: at(120), lvl: 0, gen: GEN4.village, add: [['rider', 1, 2.2]] },
  { s: at(640), lvl: 0.08, gen: GEN4.village, add: [['gnome', -1, 1.2]] },
  { s: at(1100), lvl: 0.15, gen: GEN4.village },
  { s: at(L4.VILLAGE_END - 960), lvl: 0.22, gen: GEN4.village },
  // the hill road
  { s: at(ROAD[1]), lvl: 0.3, gen: GEN4.mountain, add: [['rider', -1, 1.5]] },
  // the climb: the camera looking up the trail
  { s: up(0.35), lvl: 0.36, gen: GEN4.mountain },
  { s: up(0.95), lvl: 0.42, gen: GEN4.mountain, add: [['gnome', 1, 2]] },
  // the ledge, the bridge over the gorge, the pool under the falls
  { s: at(5700), lvl: 0.5, gen: GEN4.mountain, add: [['drake', 1, 1.8]] },
  { s: at(FALLS[0] - 250), lvl: 0.56, gen: GEN4.mountain },
  {
    s: at(L4.POOL_X - 480),
    boss: 1,
    banner: ['@minotaur', 'minotaurBanner'],
    sp: [['minotaur', 1, 0.6]],
  },
  // down into the forest
  { s: at(DESCENT[1]), lvl: 0.66, gen: GEN4.forest },
  { s: at(DESCENT[1] + 800), lvl: 0.74, gen: GEN4.forest, add: [['gnome', 1, 2.5]] },
  { s: at(DESCENT[1] + 1600), lvl: 0.82, gen: GEN4.forest, add: [['drake', -1, 1]] },
  { s: at(L4.GLADE_X - 960), lvl: 0.88, gen: GEN4.forest },
  { s: at(L4.GLADE_X - 960), chain: 1, lvl: 0.94, gen: GEN4.forest },
  // the glade under the moon: the last fight
  { s: at(END_X - 960), boss: 1, final: 1, sp: [['frostwolf', 1, 0.8]] },
];

// Things to break on the way (see props4.js): [x, depth into the floor, kind, drop]. On the
// climb: [x, y, kind, drop] with the y given (`abs`).
const P = [
  // the village
  [300, 30, 'crate', null],
  [520, 130, 'pot', 'hp'],
  [760, 24, 'hay', null],
  [980, 120, 'cart', 'rage'],
  [1240, 30, 'pot', null],
  [1420, 136, 'crate', 'hp'],
  [1660, 22, 'fence', null],
  [1900, 120, 'hay', 'rage'],
  [2140, 26, 'crate', null],
  [2360, 130, 'pot', 'hp'],
  // the hill road
  [3460, 24, 'rock', null],
  [3700, 130, 'crate', 'rage'],
  [3980, 30, 'pot', 'hp'],
  [4240, 120, 'rock', null],
  // the ledge and the pool
  [5560, 28, 'rock', null],
  [5820, 130, 'pot', 'rage'],
  [6160, 24, 'crate', 'hp'],
  [6440, 120, 'rock', null],
  [7400, 26, 'pot', 'hp'],
  [8420, 130, 'crate', null],
  // the forest
  [9820, 24, 'log', null],
  [10120, 130, 'idol', 'rage'],
  [10460, 30, 'pot', 'hp'],
  [10820, 120, 'log', null],
  [11180, 28, 'idol', 'hp'],
  [11560, 136, 'crate', 'rage'],
  [11900, 24, 'log', null],
];
// On the climb, a few by the trail's sides: [x, y, kind, drop]
const PC = [
  [4560, -40, 'rock', null],
  [5040, -180, 'pot', 'hp'],
  [4580, -330, 'crate', 'rage'],
  [5030, -470, 'rock', null],
];
export const PROPS4 = P.map(([x, d, k, drop]) => [x, topY(x) + d, k, drop]).concat(PC);
