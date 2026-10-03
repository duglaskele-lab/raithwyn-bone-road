// Tunable constants: screen size, rage thresholds, enemy archetypes, the wave script.
export const W = 960,
  H = 540,
  GT = 358,
  GB = 524,
  TAU = Math.PI * 2;
export const FONT =
  '"Arial Black","Segoe UI Black",Impact,Roboto,"Helvetica Neue",system-ui,sans-serif';
export const MAXR = 200,
  RL = [40, 120, 200],
  SLAM_R = 235,
  CHAIN = 430,
  RW = 1;
export const OL = '#17151d',
  PURPLE = '#b05cff';
export const CRYPT_X = 6030;
// The fatso's ground slam: total wind-up, and the moment after which hits no longer stop it
// (the last third of the wind-up).
export const SWIND = 0.9,
  SWIND_LOCK = SWIND * (2 / 3);
// A bone throw costs 5% of the rage bar.
export const BONE_COST = MAXR * 0.05;
// Super attack: hold I this long with a full rage bar; it hits everything on screen.
export const SUPER_HOLD = 1.0,
  SUPER_DMG = 100;
// The necromancer's acid ball flies in an arc and leaves a puddle where it lands.
export const ACID = {
  flight: 0.95, // seconds from the staff to the ground
  g: 900, // gravity on the ball
  hit: 9, // damage of a direct hit
  pool: 4.5, // seconds the puddle lasts
  rx: 68, // puddle half-width
  ry: 22, // puddle half-depth
  tick: 0.5, // seconds between puddle bites
  dmg: 3, // damage per bite
};
// Zombies grab the player for a moment, can lose their head to a hit and now and then throw it.
export const ZOMBIE = {
  hold: 1.1, // seconds the player is held
  mash: 0.15, // each button press while held shortens the hold
  headOff: 0.3, // chance that a plain hit knocks the head off (a knockdown hit always does)
  throwRate: 0.12, // chance per second to throw the head when at range
  headDmg: 6,
  headFlight: 0.8,
};
// The Grave Baron. Below half health he enters a second phase and gains an acid breath:
// a 0.7 s wind-up, then a wide cone of acid in front of him for `time` seconds.
export const BOSS = {
  phase2: 0.5,
  roar: 1, // seconds of the phase change roar
  breathWind: 0.7,
  breathTime: 1.1,
  breathLen: 250, // reach of the cone, about a quarter of the screen
  breathW0: 22, // half-depth of the cone at the mouth
  breathSpread: 0.38, // how much the cone widens per pixel of reach
  breathTick: 0.25,
  breathDmg: 5,
  breathCd: [3.5, 5.5],
};
// Secret: hold X this long right at the start of the level to skip straight to the final boss.
export const SECRET_HOLD = 3;
// Breakable scenery along the road: hits needed, colour of the pieces, score.
export const DECOR = {
  bench: { w: 34, hp: 1, col: '#7a5638', score: 20 },
  cross: { w: 14, hp: 1, col: '#8b8f84', score: 20 },
  // a big grave: four hits; a zombie or a skeleton may climb out of it
  tomb: { w: 40, hp: 4, col: '#6f7c80', score: 50, big: 1 },
};

// Enemy archetypes. Every numeric field is tuned by hand; see README for what each one means.
export const TYPES = {
  grunt: {
    hp: 34,
    scale: 1,
    speed: 78,
    dmg: 7,
    reach: 64,
    style: 'punch',
    wind: 0.34,
    act: 0.14,
    rec: 0.4,
    cd: [0.8, 1.7],
    col: '#ece5cb',
    dk: '#b9b094',
    eye: '#ff6a3c',
    score: 100,
  },
  thrower: {
    hp: 24,
    scale: 0.95,
    speed: 92,
    dmg: 7,
    keep: 310,
    style: 'throw',
    wind: 0.5,
    act: 0.16,
    rec: 0.5,
    cd: [1.7, 2.8],
    col: '#dfe6cf',
    dk: '#a9b39a',
    eye: '#7dffb0',
    hood: 1,
    score: 150,
  },
  brute: {
    hp: 96,
    scale: 1.3,
    speed: 50,
    dmg: 17,
    reach: 92,
    style: 'smash',
    wind: 0.7,
    act: 0.16,
    rec: 0.7,
    cd: [1.2, 2],
    knock: 1,
    club: 1,
    heavy: 1,
    col: '#e3d6b4',
    dk: '#ac9d7a',
    eye: '#ffb020',
    score: 400,
  },
  fat: {
    hp: 120,
    scale: 1.16,
    speed: 46,
    dmg: 10,
    reach: 74,
    style: 'punch',
    wind: 0.42,
    act: 0.14,
    rec: 0.5,
    cd: [1, 1.8],
    fat: 1,
    thick: 2,
    heavy: 1,
    col: '#e8dcc0',
    dk: '#b0a486',
    eye: '#ff8a2e',
    score: 500,
  },
  biker: {
    hp: 46,
    scale: 1.02,
    speed: 86,
    dmg: 9,
    reach: 66,
    style: 'punch',
    wind: 0.3,
    act: 0.14,
    rec: 0.4,
    cd: [0.9, 1.7],
    rocker: 1,
    col: '#e9e4d4',
    dk: '#b0aa98',
    eye: '#ff3d6e',
    score: 350,
  },
  monkey: {
    hp: 20,
    scale: 0.72,
    speed: 150,
    dmg: 8,
    reach: 50,
    style: 'punch',
    wind: 0.2,
    act: 0.12,
    rec: 0.3,
    cd: [0.6, 1.3],
    monkey: 1,
    armK: 1.4,
    legK: 0.8,
    col: '#e2dcc6',
    dk: '#aaa48e',
    eye: '#ffe04a',
    score: 200,
  },
  necro: {
    hp: 38,
    scale: 1.05,
    speed: 72,
    dmg: 6,
    reach: 62,
    keep: 340,
    style: 'cast',
    wind: 0.6,
    act: 0.16,
    rec: 0.45,
    cd: [1.9, 3],
    robe: 1,
    col: '#e4dfcf',
    dk: '#aca795',
    eye: '#ff2626',
    score: 300,
  },
  zombie: {
    hp: 22,
    scale: 1,
    speed: 40,
    dmg: 5,
    reach: 56,
    style: 'grab',
    wind: 0.5,
    act: 0.16,
    rec: 0.6,
    cd: [1.1, 2.2],
    zombie: 1,
    crowd: 0.5, // counts as half an enemy against the on-screen limit
    col: '#a3b48b',
    dk: '#6f7f5c',
    eye: '#fff36a',
    score: 60,
  },
  // the final boss; its behaviour and drawing live in dragon.js
  dragon: {
    hp: 1035,
    scale: 1.6,
    speed: 51,
    dmg: 18,
    reach: 240,
    wind: 0.6,
    act: 0.2,
    rec: 0.6,
    cd: [0.5, 1.1],
    dragon: 1,
    bigBoss: 1,
    shadow: 150,
    col: '#e6dfc8',
    dk: '#a99f86',
    eye: '#7dff5a',
    score: 6000,
  },
  boss: {
    hp: 520,
    scale: 1.55,
    speed: 74,
    dmg: 24,
    reach: 128,
    style: 'slash',
    wind: 0.5,
    act: 0.16,
    rec: 0.5,
    cd: [0.55, 1.1],
    knock: 1,
    sword: 1,
    crown: 1,
    bigBoss: 1,
    col: '#efe9d6',
    dk: '#b3ac99',
    eye: '#c58bff',
    score: 3000,
  },
};
// Seven fights, the baron, one more fight and the Bone Dragon. Zombies come in crowds and rise from the ground; the other
// enemies are mixed in so that every fight brings something different.
export const WAVES = [
  {
    x: 300,
    sp: [
      ['zombie', 0, 0],
      ['zombie', 0, 0.6],
      ['grunt', 1, 1.2],
      ['zombie', -1, 2],
      ['zombie', 1, 2.8],
      ['monkey', 0, 3.8],
    ],
  },
  {
    x: 1050,
    sp: [
      ['thrower', 1, 0],
      ['zombie', 0, 0.5],
      ['zombie', 0, 0.9],
      ['necro', -1, 2],
      ['grunt', 1, 2.8],
      ['zombie', 0, 3.6],
      ['zombie', -1, 4.4],
    ],
  },
  {
    x: 1800,
    sp: [
      ['biker', 1, 0],
      ['zombie', 0, 1],
      ['zombie', 0, 1.3],
      ['monkey', -1, 2.2],
      ['fat', 1, 3.5],
      ['zombie', 0, 4.5],
      ['thrower', -1, 5.5],
    ],
  },
  {
    x: 2550,
    sp: [
      ['necro', 1, 0],
      ['brute', -1, 0.8],
      ['zombie', 0, 1.6],
      ['zombie', 0, 2],
      ['zombie', 0, 2.4],
      ['monkey', 1, 3.4],
      ['grunt', -1, 4.6],
    ],
  },
  {
    x: 3300,
    sp: [
      ['fat', -1, 0],
      ['monkey', 1, 0.5],
      ['monkey', -1, 1],
      ['zombie', 0, 1.8],
      ['zombie', 0, 2.2],
      ['necro', 1, 3.2],
      ['biker', -1, 4.5],
      ['zombie', 0, 5.5],
    ],
  },
  {
    x: 4050,
    sp: [
      ['brute', 1, 0],
      ['thrower', -1, 1],
      ['zombie', 0, 1.5],
      ['zombie', 0, 1.9],
      ['biker', 1, 3],
      ['grunt', 0, 4],
      ['necro', -1, 5],
      ['zombie', 0, 6],
      ['zombie', 0, 6.4],
    ],
  },
  {
    x: 4800,
    sp: [
      ['biker', -1, 0],
      ['necro', 1, 0.8],
      ['zombie', 0, 1.4],
      ['zombie', 0, 1.8],
      ['zombie', 0, 2.2],
      ['fat', 1, 3],
      ['monkey', -1, 3.8],
      ['brute', 1, 5],
      ['thrower', -1, 6],
      ['necro', 1, 7],
      ['zombie', 0, 7.5],
    ],
  },
  {
    x: 5550,
    boss: 1,
    // seven zombies climb out of the ground as the fight begins
    sp: [
      ['boss', 0, 1.2],
      ['zombie', 0, 0.2],
      ['zombie', 0, 0.4],
      ['zombie', 0, 0.6],
      ['zombie', 0, 0.8],
      ['zombie', 0, 1],
      ['zombie', 0, 1.4],
      ['zombie', 0, 1.6],
    ],
  },
  // past the baron's crypt: a last scuffle with skeletons and zombies
  {
    x: 6350,
    sp: [
      ['grunt', 1, 0],
      ['zombie', 0, 0.3],
      ['zombie', 0, 0.6],
      ['grunt', -1, 1.2],
      ['thrower', 1, 2],
      ['zombie', 0, 2.5],
      ['zombie', 0, 3],
      ['brute', -1, 4],
    ],
  },
  // the Bone Dragon
  { x: 7150, boss: 1, sp: [['dragon', 0, 1]] },
];

// Player animation timelines: seconds per frame of each attack.
export const D = {
  atk1: [0.03, 0.05, 0.09, 0.06, 0.05],
  atk2: [0.04, 0.07, 0.12, 0.08, 0.07],
  thr: [0.05, 0.08, 0.09, 0.12],
  hado: [0.06, 0.09, 0.08, 0.08, 0.1, 0.1],
};
