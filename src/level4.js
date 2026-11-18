// Stage 4, the Wastelands: a desert after the end of the world, where the Children of the
// Crater (mutants) and the Rust Legion (the machines of a dead colony) are at war — with each
// other as well as with her (see foes/war.js). It begins on the dunes by the old highway, among
// the wrecks of cars and of the Legion's machines.
//
// As the other stages after the Bone Road: world pixels, a floor of convex polygons, a camera
// path of nodes. The road is straight and flat, as deep as the Bone Road's (358..524).
//
// Then the road runs into the Legion's scrapyard, behind fences of corrugated iron, among
// heaps of scrap, stacks of crushed cars and its cranes.
//
// (The stage is being built: its later parts — the crater, the canyon — the sandworm and the
// last fight come next.)

export const DEPTH = 166;
export const L4 = {
  Y_A: 358, // the back edge of the road
  HIGHWAY: [1800, 3800], // the old highway: asphalt under the sand
  YARD: [5000, 11200], // the Legion's scrapyard: packed earth, oil, heaps of scrap
  END_X: 11200,
};
const { Y_A, END_X } = L4;

const rect = (x0, x1, y0, y1) => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];
export const FLOOR = [rect(0, END_X, Y_A, Y_A + DEPTH)];
const mid = DEPTH / 2;
export const PATH = [
  [390, Y_A + mid, 390, 441],
  [END_X - 570, Y_A + mid, 390, 441],
];
/** The position along the path (in nodes) where the camera's left edge is at `x`. */
const at = (x) => Math.round(((x - 0) / (END_X - 960)) * 1e4) / 1e4;

// The fights, as in the stages before (see level5.js): `core` always, `fill` rolled anew, `mid`
// once the first ones have lost half of their health. `war`: the two sides are at it already
// when she comes, and do not see her until she comes close or hits one of them.
export const WAVES4 = [
  // the clash: scavengers and junkers fighting over the dunes; she can let them
  {
    s: at(150),
    name: 'the clash',
    war: 1,
    core: [
      ['scavenger', 1, 0],
      ['junker', 1, 0.15],
      ['scavenger', -1, 0.3],
      ['junker', 1, 0.5],
    ],
  },
  // acid rain: spitters behind, junkers rolling in — lead the robots into the puddles
  {
    s: at(1300),
    name: 'acid rain',
    core: [
      ['spitter', 1, 0],
      ['junker', -1, 0.4],
      ['spitter', 1, 1.2],
      ['junker', -1, 1.6],
    ],
    fill: { n: [1, 2], pool: { scavenger: 1, junker: 1 }, from: 2.4, gap: 0.8 },
  },
  // the repair shop: a welder raising the junkers the scavengers bring down — hit it first
  {
    s: at(2700),
    name: 'the repair shop',
    core: [
      ['welder', 1, 0],
      ['junker', 1, 0.5],
      ['scavenger', -1, 1],
      ['junker', -1, 1.4],
    ],
    mid: [
      ['scavenger', -1, 0.3],
      ['spitter', 1, 0.8],
      ['junker', 1, 1.2],
    ],
  },
  // the scrap war: both sides at full strength on the highway
  {
    s: at(4200),
    name: 'scrap war',
    core: [
      ['welder', 1, 0],
      ['junker', 1, 0.4],
      ['scavenger', -1, 0.8],
      ['junker', -1, 1.2],
      ['spitter', -1, 1.6],
    ],
    mid: [
      ['scavenger', 1, 0.3],
      ['scavenger', -1, 0.6],
      ['junker', 1, 1],
      ['spitter', 1, 1.4],
      ['welder', -1, 2],
    ],
  },
  // --- the scrapyard ---
  // the rust-eaters: they eat the robots that fall — kill the robots away from them
  {
    s: at(5200),
    name: 'the rust-eaters',
    core: [
      ['rusteater', -1, 0],
      ['junker', 1, 0.4],
      ['junker', 1, 0.8],
      ['welder', 1, 1.6],
    ],
    fill: { n: [1, 2], pool: { scavenger: 1, junker: 1 }, from: 2.4, gap: 0.9 },
  },
  // the glowing one: its ring makes the robots glitch, its death flash burns them — lead it in
  {
    s: at(6300),
    name: 'the glowing one',
    core: [
      ['glowing', -1, 0],
      ['junker', 1, 0.3],
      ['junker', 1, 0.6],
      ['scavenger', -1, 1.2],
      ['junker', 1, 1.8],
    ],
    mid: [
      ['glowing', 1, 0.3],
      ['welder', 1, 0.8],
      ['junker', -1, 1.2],
    ],
  },
  // the spotters' line: two lasers across the yard — put a mutant between, or a robot
  {
    s: at(7400),
    name: "the spotters' line",
    core: [
      ['spotter', 1, 0],
      ['scavenger', 1, 0.4],
      ['spotter', -1, 0.8],
      ['spitter', -1, 1.2],
      ['rusteater', 1, 1.6],
    ],
    fill: { n: [1, 2], pool: { junker: 1 }, from: 2.2, gap: 0.9 },
  },
  // the minefield: beetles running at whoever is nearest — kick them back
  {
    s: at(8500),
    name: 'minefield',
    core: [
      ['mine', 1, 0],
      ['mine', 1, 0.3],
      ['mine', -1, 0.6],
      ['twohead', -1, 1],
      ['mine', 1, 1.4],
      ['junker', 1, 1.8],
    ],
    mid: [
      ['mine', 1, 0.2],
      ['mine', -1, 0.5],
      ['mine', 1, 0.8],
      ['scavenger', -1, 1.2],
    ],
  },
  // the harvest: the combine charging through the mutants' crowd — stay off its lane
  {
    s: at(9600),
    name: 'the harvest',
    core: [
      ['harvester', 1, 0],
      ['scavenger', -1, 0.4],
      ['scavenger', -1, 0.8],
      ['spitter', -1, 1.2],
      ['junker', 1, 1.6],
      ['twohead', -1, 2.2],
    ],
    mid: [
      ['welder', 1, 0.3],
      ['rusteater', -1, 0.8],
      ['glowing', -1, 1.4],
      ['mine', 1, 1.8],
      ['mine', 1, 2.1],
    ],
  },
];

// Things to break on the way (see props4.js): [x, depth into the road, kind, drop].
const P = [
  [420, 30, 'drum', null],
  [760, 128, 'tyres', 'hp'],
  [1100, 24, 'roadsign', null],
  [1560, 130, 'drum', 'rage'],
  [1980, 28, 'tyres', null],
  [2380, 126, 'drum', 'hp'],
  [2820, 22, 'roadsign', null],
  [3260, 132, 'tyres', 'rage'],
  [3620, 30, 'drum', null],
  [4020, 124, 'drum', 'hp'],
  [4560, 26, 'tyres', null],
  [5020, 130, 'drum', 'rage'],
  // the scrapyard
  [5500, 26, 'drum', null],
  [5900, 128, 'tyres', 'hp'],
  [6700, 30, 'drum', 'rage'],
  [7100, 124, 'tyres', null],
  [7900, 28, 'drum', 'hp'],
  [8300, 130, 'roadsign', null],
  [9000, 24, 'tyres', 'rage'],
  [9350, 126, 'drum', 'hp'],
  [10200, 30, 'drum', null],
  [10700, 128, 'tyres', 'hp'],
];
export const PROPS4 = P.map(([x, d, k, drop]) => [x, Y_A + d, k, drop]);
