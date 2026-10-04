// Stage 2, Old Quarry: a mining town of the Wild West and the mines under it. Unlike the
// Bone Road it does not only run to the right: the main street goes downhill on a slant, a
// quarry road leads straight down the screen to the mine, and a shaft in the mine slopes down
// again (after the Manhattan Project's winding streets).
//
// All of it is in world pixels. The floor is a set of convex polygons (walkable where any of
// them is); the camera runs along a path of nodes. Each node pairs a point of the road (where
// the player walks) with where that point sits on screen; the camera is the difference. A
// fight locks the camera at `s`, a position along that path in nodes (2.5: halfway between
// nodes 2 and 3).

// Depth of the horizontal streets and tunnels (as on the Bone Road: 358..524 on screen).
export const DEPTH = 166;
// Where the town ends and the slant down begins, the quarry road, the mine.
export const L2 = {
  TOWN_END: 2520,
  SLANT: [2480, 3700, 0.35], // from x, to x, drop per pixel
  QUARRY: [3500, 4300, 700, 1900], // x0, x1, y0, y1 of the road down
  MINE_Y: 1734, // the top of the first tunnel's floor
  SHAFT: [6380, 7420, 0.3],
  DEEP_Y: 2046, // the top of the deep tunnel's floor
  END_X: 10200,
  GATE_X: 600, // the welcome arch
  PORTAL_X: 4330, // the mine's timber portal
  HALL_X: 6000, // the slime's flooded hall
};
const { SLANT, QUARRY, MINE_Y, SHAFT, DEEP_Y, END_X, TOWN_END } = L2;
const slantY = (x) => 358 + (x - SLANT[0]) * SLANT[2],
  shaftY = (x) => MINE_Y + (x - SHAFT[0]) * SHAFT[2];

export const FLOOR = [
  // Main Street
  [
    [0, 358],
    [TOWN_END, 358],
    [TOWN_END, 524],
    [0, 524],
  ],
  // the street slants down towards the quarry (a little deeper than the flat street)
  [
    [SLANT[0], 358],
    [SLANT[1], slantY(SLANT[1])],
    [SLANT[1], slantY(SLANT[1]) + 190],
    [SLANT[0], 358 + 190],
  ],
  // the quarry road, straight down the screen
  [
    [QUARRY[0], QUARRY[2]],
    [QUARRY[1], QUARRY[2]],
    [QUARRY[1], QUARRY[3]],
    [QUARRY[0], QUARRY[3]],
  ],
  // the first tunnel
  [
    [QUARRY[0], MINE_Y],
    [SHAFT[0] + 40, MINE_Y],
    [SHAFT[0] + 40, MINE_Y + DEPTH],
    [QUARRY[0], MINE_Y + DEPTH],
  ],
  // the shaft slopes down
  [
    [SHAFT[0], MINE_Y],
    [SHAFT[1], shaftY(SHAFT[1])],
    [SHAFT[1], shaftY(SHAFT[1]) + 180],
    [SHAFT[0], MINE_Y + 180],
  ],
  // the deep tunnel, to the last fight
  [
    [SHAFT[1] - 40, DEEP_Y],
    [END_X, DEEP_Y],
    [END_X, DEEP_Y + DEPTH],
    [SHAFT[1] - 40, DEEP_Y + DEPTH],
  ],
];

// The camera path: [road x, road y, screen x, screen y]. On the flat the player walks at
// (390, 441) of the screen as on the Bone Road; on a slant a little further on; going down the
// screen, in the middle and up a little so that what comes from below is seen in time.
export const PATH = [
  [390, 441, 390, 441],
  [2450, 441, 390, 441],
  [3650, slantY(3650) + 95, 480, 380],
  [3900, 1100, 480, 330],
  [3900, MINE_Y - 28, 480, 330],
  [4600, MINE_Y + 83, 390, 441],
  [6350, MINE_Y + 83, 390, 441],
  [7450, DEEP_Y + 83, 390, 441],
  [END_X - 570, DEEP_Y + 83, 390, 441],
];

// The fights. `lvl` rolls an ordinary one (see WAVEGEN2), `sp` is a fixed one; `mid` brings
// more enemies once the first ones have lost half of their health.
export const WAVES2 = [
  { s: 0.12, lvl: 0 },
  { s: 0.6, lvl: 0.15 },
  { s: 1, lvl: 0.3 },
  { s: 1, chain: 1, lvl: 0.4 },
  { s: 1.55, lvl: 0.45 },
  { s: 3, lvl: 0.5 },
  { s: 3.75, lvl: 0.6 },
  { s: 5, lvl: 0.65 },
  // the green slime in the flooded hall of the mine
  { s: 5.75, boss: 1, sp: [['slime', 1, 0.6]] },
  { s: 6.6, lvl: 0.8 },
  { s: 7.5, lvl: 0.9 },
  { s: 7.5, chain: 1, lvl: 1 },
  // the last fight: two zombies in power armour; halfway through a gang of miners joins in
  {
    s: 8,
    boss: 1,
    final: 1,
    sp: [
      ['armor', 1, 0.8],
      ['armor', -1, 1.6],
    ],
    mid: [
      ['miner', 1, 0],
      ['miner', -1, 0.3],
      ['miner', 1, 0.6],
      ['miner', -1, 0.9],
      ['dynamite', 1, 1.4],
      ['dynamite', -1, 1.8],
      ['miner', 1, 2.4],
    ],
  },
];

// How an ordinary fight of Old Quarry is rolled (as WAVEGEN, config.js).
export const WAVEGEN2 = {
  count: [6, 12],
  hard: [0.06, 0.32],
  mid: [0.14, 0.3],
  maxHard: [1, 4],
  gap: [0.9, 0.45],
  pools: {
    easy: { miner: 4, zombie: 3 },
    mid: { dynamite: 1 },
    hard: { lizard: 1.4, armor: 0.6 },
  },
  // never more than this many of a kind in one fight
  cap: { armor: 2 },
};

// Breakable things on the way: [x, y, kind, drop]. Barrels break and may hold something;
// red barrels blow up.
export const PROPS2 = [
  [520, 380, 'barrel', 'hp'],
  [640, 500, 'tnt', null],
  [900, 372, 'barrel', null],
  [1180, 470, 'barrel', 'rage'],
  [1240, 494, 'tnt', null],
  [1560, 376, 'barrel', null],
  [1610, 384, 'barrel', 'hp'],
  [1900, 480, 'tnt', null],
  [2250, 374, 'barrel', 'rage'],
  [2760, slantY(2760) + 40, 'barrel', null],
  [3050, slantY(3050) + 140, 'tnt', null],
  [3380, slantY(3380) + 30, 'barrel', 'hp'],
  [3640, 980, 'barrel', null],
  [4180, 1040, 'tnt', null],
  [3560, 1330, 'barrel', 'rage'],
  [4240, 1460, 'barrel', null],
  [3700, 1600, 'tnt', null],
  [4800, MINE_Y + 20, 'barrel', 'hp'],
  [5300, MINE_Y + 140, 'tnt', null],
  [5620, MINE_Y + 18, 'barrel', null],
  [5700, MINE_Y + 24, 'tnt', null],
  [6150, MINE_Y + 110, 'barrel', 'rage'],
  [6800, shaftY(6800) + 60, 'barrel', null],
  [7150, shaftY(7150) + 150, 'tnt', null],
  [7700, DEEP_Y + 20, 'barrel', 'hp'],
  [8200, DEEP_Y + 130, 'tnt', null],
  [8500, DEEP_Y + 22, 'barrel', null],
  [8560, DEEP_Y + 30, 'barrel', 'rage'],
  [9000, DEEP_Y + 140, 'tnt', null],
  [9350, DEEP_Y + 24, 'barrel', 'hp'],
];
export { slantY, shaftY };
