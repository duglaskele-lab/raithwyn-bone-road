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

// The fights, as in Old Quarry: where the camera stops (`s`). Each one has an idea of its own
// (`name`): `core` are the foes it is about, always the same; `fill` a few plain ones round them,
// rolled anew every run (see themedWave in waves.js); `mid` come once the first ones have lost
// half of their health. [type, side, delay]: side 1 from the right, -1 from the left, 0 out of
// the ground. `rider` is a bandit on a cockatrice, `drake` one on a fire drake (foes/beasts.js);
// `gnome` the thief with his sack.
const bandits = (a, b, from = 0.6) => ({ n: [a, b], pool: { bandit: 1 }, from, gap: 0.9 });
export const WAVES4 = [
  // --- the village ---
  // raiders: a few bandits, and one riding in on a cockatrice — knock him off and take it
  {
    s: at(120),
    name: 'raiders',
    core: [
      ['bandit', 1, 0],
      ['bandit', 1, 0.8],
      ['rider', 1, 2.2],
    ],
    fill: bandits(1, 2, 1.6),
  },
  // spears and a thief: amazons who leap in and flip away, the gnome running through it all
  {
    s: at(1100),
    name: 'spears and a thief',
    core: [
      ['amazon', 1, 0],
      ['bandit', -1, 0.6],
      ['gnome', -1, 1.2],
      ['amazon', -1, 2],
    ],
    fill: bandits(1, 2, 2.8),
  },
  // the shield wall: death knights turn light blows from the front; a heavy blow, their backs,
  // or the cockatrice that rides in once they are hurt
  {
    s: at(L4.VILLAGE_END - 960),
    name: 'shield wall',
    core: [
      ['knight', 1, 0],
      ['bandit', -1, 0.6],
      ['knight', 1, 1.6],
    ],
    mid: [
      ['rider', -1, 0.3],
      ['bandit', 1, 1],
    ],
  },
  // --- the hill road ---
  // the harpies' sky: only a jump or a shot reaches them, until they dive
  {
    s: at(ROAD[1]),
    name: "the harpies' sky",
    core: [
      ['harpy', 1, 0],
      ['bandit', 1, 0.5],
      ['harpy', -1, 1.3],
      ['harpy', 1, 2.4],
    ],
    fill: bandits(1, 2, 3),
  },
  // --- the climb: the camera looking up the trail, boulders rolling down it ---
  // the rockslide: a crowd on the trail to lead under the boulders
  {
    s: up(0.6),
    name: 'rockslide',
    core: [
      ['bandit', 1, 0],
      ['bandit', -1, 0.5],
      ['knight', 1, 1.2],
      ['amazon', -1, 2],
    ],
    fill: bandits(1, 2, 2.8),
  },
  // --- the ledge, the bridge over the gorge, the pool under the falls ---
  // fire on the ledge: a fire drake's rider among spears — its flame is hers to take
  {
    s: at(5700),
    name: 'fire on the ledge',
    core: [
      ['amazon', 1, 0],
      ['drake', 1, 0.8],
      ['harpy', -1, 1.6],
      ['amazon', -1, 2.4],
    ],
    fill: bandits(1, 2, 3.2),
  },
  // hold the bridge: a bone giant by the gorge, bandits to throw into it
  {
    s: at(FALLS[0] - 250),
    name: 'hold the bridge',
    core: [
      ['giant', 1, 0],
      ['bandit', 1, 0.8],
      ['bandit', -1, 1.6],
    ],
    fill: bandits(1, 2, 2.4),
  },
  {
    s: at(L4.POOL_X - 480),
    boss: 1,
    banner: ['@minotaur', 'minotaurBanner'],
    sp: [['minotaur', 1, 0.6]],
  },
  // --- down into the forest ---
  // the pack: wolves from both sides, and more of them once the first are down
  {
    s: at(DESCENT[1]),
    name: 'the pack',
    core: [
      ['wolf', 1, 0],
      ['wolf', -1, 0.3],
      ['wolf', 1, 1],
    ],
    mid: [
      ['wolf', -1, 0.2],
      ['wolf', 1, 0.6],
      ['amazon', 1, 1.4],
    ],
  },
  // the ambush: spears leaping out of the trees, wolves at her heels, the thief again
  {
    s: at(DESCENT[1] + 800),
    name: 'ambush',
    core: [
      ['amazon', 1, 0],
      ['amazon', -1, 0.4],
      ['wolf', 1, 1.2],
      ['gnome', 1, 2],
      ['amazon', 0, 2.6],
    ],
    fill: { n: [2, 3], pool: { wolf: 1, bandit: 1 }, from: 3.2, gap: 0.8 },
  },
  // the warband's last stand: all of it at once, and a fire drake to turn on them
  {
    s: at(L4.GLADE_X - 960),
    name: 'the last stand',
    core: [
      ['giant', 1, 0],
      ['knight', -1, 0.6],
      ['harpy', 1, 1.4],
      ['bandit', 1, 2],
    ],
    mid: [
      ['drake', -1, 0.3],
      ['wolf', 1, 0.8],
      ['harpy', -1, 1.4],
      ['wolf', -1, 2],
    ],
  },
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
