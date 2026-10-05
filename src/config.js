// Tunable constants: screen size, rage thresholds, enemy archetypes, the wave script.
export const W = 960,
  H = 540,
  GT = 358,
  GB = 524,
  TAU = Math.PI * 2;
export const FONT =
  '"Arial Black","Segoe UI Black",Impact,Roboto,"Helvetica Neue",system-ui,sans-serif';
// The rage bar: 300, in three equal steps of 100 — the dark ball's levels I, II and III;
// the full bar is also the super attack.
export const MAXR = 300,
  RL = [100, 200, 300],
  SLAM_R = 235,
  CHAIN = 430,
  RW = 1;
export const OL = '#17151d',
  PURPLE = '#b05cff';
export const CRYPT_X = 4520;
// The fatso's ground slam: total wind-up, and the moment after which hits no longer stop it
// (the last third of the wind-up).
export const SWIND = 0.9,
  SWIND_LOCK = SWIND * (2 / 3);
// How enemies take the player's blows: TYPES[...].weight
//   light  (the default) - flinch at any hit, are thrown and juggled with ease
//   medium - plain hits do not stop their attacks, a heavy blow breaks them (a flinch). It
//            takes a second heavy blow within `window` seconds of the first, or one crushing
//            blow (a dark ball of level II or III, the super), to knock them back or launch
//            them. Once in the air they juggle like the light.
//   heavy  - only a crushing blow knocks them back (never juggled); nothing else moves them
//            or breaks their attacks
//   boss   - their own rules (see their files in src/foes)
export const WEIGHT = { window: 3, knockMedium: [170, 320], knockHeavy: [130, 260] };
// Rage gained (scaled to the 300 bar: 1.5 times the old amounts on the old 200 bar).
export const RAGE = {
  punch: 5.25, // each of the first two punches of a combo, per enemy hit
  finisher: 8.25, // the third punch
  air: 6, // the punch in a jump
  bone: 3, // a bone that hits
  hurt: 6, // taking a hit
  pickup: 75, // a rage pickup
  revive: 60, // at least this much after losing a life
};
// A bone throw costs 5% of the rage bar.
export const BONE_COST = MAXR * 0.05;
// The dark ball: L throws level I (100 rage). A hidden motion — down, down, toward the throw,
// then L (S S D L to the right, S S A L to the left), all within `motion` seconds — throws the
// strongest ball the rage pays for: level II (200) or III (300). Nothing shows it. The higher
// levels are worth saving for: more damage per point of rage, and wider.
export const HADO = { motion: 0.8, dmg: [50, 110, 180] };
// Super attack: hold I this long with a full rage bar; it hits everything on screen.
export const SUPER_HOLD = 1.0,
  SUPER_DMG = 150;
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
  hold: 1.375, // seconds the player is held (a quarter longer than the first 1.1)
  mash: 0.15, // each button press while held shortens the hold
  headOff: 0.3, // chance that a plain hit knocks the head off (a knockdown hit always does)
  throwRate: 0.12, // chance per second to throw the head when at range
  headDmg: 6,
  headFlight: 0.8,
};
// The Grave Baron. Below half health he enters a second phase and gains an acid breath:
// a 0.7 s wind-up, then he spits a spray of acid in front of him for `time` seconds; the cone
// is where the drops come down. No marking on the ground: the wind-up is the warning.
export const BOSS = {
  phase2: 0.5,
  roar: 1, // seconds of the phase change roar
  breathWind: 0.7,
  breathTime: 1.1,
  breathLen: 350, // reach of the spray: 40% further than the old 250
  breathW0: 22, // half-depth of the cone at the mouth
  breathSpread: 0.27, // how much the cone widens per pixel of reach (as wide at the end as before)
  breathTick: 0.25,
  breathDmg: 5,
  breathCd: [3.5, 5.5],
  breathPools: 4, // puddles left along the spray
};
// The rockers' second bike, a long chopper: its hit box runs this far back from the rider's
// middle and this far forward (its ram of bone spikes).
export const HOG = { half: 96, front: 110 };
// The skeleton samurai: an elite in white hakama with a katana. It drops into a ready stance
// (eyes burning) and creeps up; step inside `range` and it answers with a lightning-fast wide
// cut. A hit from afar (a bone, a dark ball, the super) breaks the stance and dazes it.
// Without the stance it fights with a kick (its TYPES entry: dmg, reach, wind).
export const SAMURAI = {
  stance: 4.5, // the longest it holds the stance before it relaxes
  walk: 30, // creeping speed in the stance
  range: 125, // the player this close (in front) sets off the cut
  dy: 46, // depth the cut covers
  draw: 0.1, // the barest tell before the cut
  slash: 0.16, // the cut itself
  arc: 165, // its reach in front
  back: 40, // and behind
  dmg: 18,
  lunge: 260, // it steps through the cut
  daze: 2, // seconds a hit from afar leaves it dazed
  seen: 3, // it only takes the stance after this long on screen
  settle: 0.845, // seconds to settle into the stance, slow (it cannot cut until it has)
  // a plain sword cut out of the stance: the blade drawn back for half a second, then a
  // flat sweep in front with a long reach; a short recovery
  swing: { wind: 0.5, strike: 0.12, rec: 0.45, min: 55, reach: 175, dy: 26, dmg: 12 },
  stanceCd: [1.8, 3.4], // before it takes the stance again
};
// Juggling: an enemy knocked into the air is popped up again by every hit until it lands.
// Heavy enemies and bosses fall regardless, unless their TYPES entry says juggle: 1.
export const JUGGLE = {
  pop: 330, // upward speed a plain hit gives
  popKnock: 420, // and a heavy one
  decay: 45, // each further hit in the same juggle pops a little less
  min: 170,
  carry: 55, // a plain hit nudges it along so it stays in reach
  carryKnock: 190,
  style: 6, // extra style points for a hit in the air
  // the launcher: the third punch of a combo with up (W) held throws a light enemy straight
  // up instead of away, to start a juggle
  launch: 560,
  launchCarry: 25,
};
// The zombie miner's charge: now and then it raises its pickaxe for `wind` seconds, then runs
// straight ahead at `speed` for at most `run` seconds; a hit knocks the player down.
export const MINER = { wind: 0.7, speed: 430, run: 1.3, dmg: 15, rate: 0.5, cd: [5, 9] };
// A stick of dynamite burns `fuse` seconds from the moment it is lit (at the start of the
// throw) and flies `flight` seconds; it blows up as BLAST.dynamite.
export const DYNAMITE = { fuse: 3, flight: 0.8, g: 1500 };
// The mutant lizard: how often it hops back from a blow it sees coming, how far, then its
// lunge (wind-up, speed, how long at most, damage).
export const LIZARD = {
  dodge: 0.7,
  dodgeCd: [2.2, 3.8],
  hopVx: 340,
  hopVz: 430,
  lwind: 0.42,
  lunge: 560,
  lungeT: 0.5,
  lungeDmg: 16,
};
// The power armour's minigun: it spins up (`spin` s), then fires for `fire` s; the bullets
// hit the ground first close in front, then further out (`reach0` to `reach1` px), a bullet
// every `rate` s. A bullet on the player does `dmg`; every third in a row knocks her down.
export const ARMOR = {
  spin: 1.2,
  fire: 2.6,
  reach0: 60,
  reach1: 760,
  rate: 0.06,
  dmg: 4,
  cool: 0.9,
  gunCd: [2.5, 4.5],
  aimSpeed: 70,
  // the jump: it crouches, leaps and comes down on a spot marked on the ground, hurting
  // everyone in the marked area; half the time the spot is not the player's but a random one
  jump: {
    crouch: 0.55,
    air: 0.95,
    rec: 0.7,
    h: 150,
    rx: 131, // a quarter wider than the first 105 x 42
    ry: 53,
    dmg: 20,
    cd: [6, 10],
    min: 150,
    max: 560,
    first: [3, 6],
    // close up, a quarter of its kicks become a jump away to somewhere else instead
    dodge: 0.25,
  },
};
// The slime: its roll (wind-up, speed, how long), its jump (wind-up, flight, landing blast
// radius and damage), its spit (wind-up; at most `minions` of its spawn about at once).
export const SLIME = {
  rwind: 0.7,
  roll: 430,
  rollT: 1.6,
  jwind: 0.55,
  jumpT: 0.95,
  landR: 170,
  landDmg: 14,
  spwind: 0.7,
  minions: 4,
  cds: { roll: [2.5, 4.5], jump: [3, 5], spit: [4, 7] },
};
// How long a creature that died whole (a lizard, a power armour) lies on the ground.
export const CORPSE_T = 1.6;
// Secret: hold X this long right at the start of the level to skip straight to the final boss.
export const SECRET_HOLD = 3;
// The other secret: hold Z and 2 together this long on the first screen to go to stage 2.
export const STAGE_HOLD = 2;
// Breakable scenery along the road: hits needed, colour of the pieces, score.
export const DECOR = {
  bench: { w: 34, hp: 1, col: '#7a5638', score: 20 },
  cross: { w: 14, hp: 1, col: '#8b8f84', score: 20 },
  // a big grave: three hits; a zombie or a skeleton may climb out of it
  tomb: { w: 40, hp: 3, col: '#6f7c80', score: 50, big: 1 },
  // Old Quarry: a wooden barrel (two hits) and a red barrel that blows up (see BLAST)
  barrel: { w: 26, hp: 2, col: '#8a5a32', score: 30 },
  tnt: { w: 24, hp: 1, col: '#b02a1e', score: 30, boom: 'barrel' },
};
// Explosions: radius on the floor (an ellipse, 0.42 as deep as wide), damage to the player and
// to enemies, and for a red barrel caught in a blast, the delay before it goes off too; a red
// barrel that is hit burns its fuse for `lit` seconds first.
export const BLAST = {
  barrel: { r: 175, dmgP: 22, dmgE: 48, chain: 0.14, lit: 0.9 },
  dynamite: { r: 150, dmgP: 20, dmgE: 42, chain: 0.14 },
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
    weight: 'medium',
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
  samurai: {
    hp: 80,
    scale: 1.08,
    speed: 74,
    dmg: 9, // the kick; the katana cut is SAMURAI.dmg
    reach: 66,
    style: 'kick',
    wind: 0.28,
    act: 0.14,
    rec: 0.6,
    cd: [0.9, 1.6],
    samurai: 1,
    col: '#efe9d8',
    dk: '#b6ae98',
    eye: '#ff3b2f',
    score: 650,
  },
  // Old Quarry: a zombie miner with a pickaxe (see MINER)
  miner: {
    hp: 42,
    scale: 1.02,
    speed: 64,
    dmg: 9,
    reach: 80,
    style: 'smash',
    wind: 0.45,
    act: 0.14,
    rec: 0.55,
    cd: [1, 1.9],
    col: '#a6b48c',
    dk: '#6d7c5b',
    eye: '#ffe25a',
    score: 140,
  },
  // a zombie with dynamite: keeps away, lights a stick and throws it (see DYNAMITE)
  dynamite: {
    hp: 30,
    scale: 0.98,
    speed: 80,
    dmg: 6,
    reach: 60,
    keep: 290,
    style: 'other',
    wind: 1.15,
    act: 0.16,
    rec: 0.55,
    cd: [3.1, 4.9], // 30% rarer than at first
    col: '#b2ad8a',
    dk: '#7a7558',
    eye: '#ff9a3a',
    score: 240,
  },
  // a big mutant lizard: fast, hops back from blows and lunges (see LIZARD); light
  lizard: {
    hp: 130,
    scale: 1, // a fifth smaller than the first 1.25
    speed: 150,
    dmg: 12,
    reach: 86,
    style: 'other',
    wind: 0.32,
    act: 0.14,
    rec: 0.45,
    cd: [0.7, 1.4],
    shadow: 52,
    col: '#6b7a3e',
    dk: '#4a5628',
    eye: '#b6ff3a',
    score: 700,
  },
  // an elite in power armour with a minigun (see ARMOR); heavy: only crushing blows move it
  armor: {
    hp: 340,
    scale: 1.13,
    speed: 44,
    dmg: 18,
    reach: 92,
    style: 'kick',
    wind: 0.6, // the kick, with a clear warning
    act: 0.16,
    rec: 0.6,
    cd: [1, 1.8],
    knock: 1,
    weight: 'heavy',
    shadow: 55,
    col: '#5b636b',
    dk: '#3c4248',
    eye: '#7dff5a',
    score: 2200,
  },
  // the mini-boss of Old Quarry: a radioactive slime (see SLIME)
  slime: {
    hp: 760,
    scale: 1,
    speed: 46,
    dmg: 16,
    reach: 120,
    wind: 0.6,
    act: 0.2,
    rec: 0.6,
    cd: [0.6, 1.2],
    bigBoss: 1,
    weight: 'medium',
    shadow: 130,
    col: '#6fe23a',
    dk: '#2f8a1e',
    eye: '#f4ff9a',
    score: 5000,
  },
  // the final boss; its behaviour and drawing live in dragon.js
  dragon: {
    hp: 1218, // 900, +15%, +10%, +7%
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
    weight: 'boss',
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
    weight: 'boss',
    col: '#efe9d6',
    dk: '#b3ac99',
    eye: '#c58bff',
    score: 3000,
  },
};
// The road (a quarter shorter than it was): seven fights, the baron, one more fight and the
// Bone Dragon. A wave marked `chain` comes on the heels of the one before, at the same spot.
// The ordinary fights are rolled anew every run (see WAVEGEN and waves.js): `lvl` from 0 (the
// start of the road: mostly easy enemies, a strong one now and then) to 1 (the last fight:
// a crowd of every kind); the boss fights are fixed (`sp`).
// Seconds between a wave and the one chained to it.
export const CHAIN_GAP = 0.8;
export const WAVES = [
  { x: 225, lvl: 0 },
  { x: 860, lvl: 0.15 },
  { x: 1500, lvl: 0.3 },
  { x: 1500, chain: 1, lvl: 0.4 },
  { x: 2300, lvl: 0.55 },
  { x: 3050, lvl: 0.7 },
  { x: 3050, chain: 1, lvl: 0.8 },
  {
    x: 4160,
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
  // past the baron's crypt: the last and biggest fight before the dragon
  { x: 4760, lvl: 1 },
  // the Bone Dragon
  { x: 5360, boss: 1, sp: [['dragon', 0, 1]] },
];
// How an ordinary fight is rolled. Each value given as [start, end] runs from the first fight
// (lvl 0) to the last (lvl 1).
export const WAVEGEN = {
  count: [6, 12], // enemies in the fight (give or take one)
  hard: [0.06, 0.36], // share of strong ones
  mid: [0.14, 0.3], // share of tricky ones
  maxHard: [1, 5], // at most this many strong ones
  gap: [0.9, 0.45], // seconds between two arrivals (sooner later on)
  // who may come, and how often relative to the others of the same group
  pools: {
    easy: { grunt: 3, zombie: 4, monkey: 1.4 },
    mid: { thrower: 1, necro: 1, biker: 0.8 },
    hard: { brute: 1, fat: 1, samurai: 1.2 },
  },
};

// Seconds per frame of the sprint: 15% slower than the old 0.065 so the feet match the speed.
export const RUN_FRAME = 0.065 / 0.85;
// The idle loop (breathing, the tail swaying) from the video it was taken from: 11 poses spread
// evenly over its 2.25 s, each held for this many 1/24 s.
export const IDLE_HOLD = [5, 5, 5, 5, 5, 4, 5, 5, 5, 5, 5];
// Player animation timelines: seconds per frame of each attack.
export const D = {
  atk1: [0.03, 0.05, 0.09, 0.06, 0.05],
  atk2: [0.04, 0.07, 0.12, 0.08, 0.07],
  thr: [0.05, 0.08, 0.09, 0.12],
  hado: [0.06, 0.09, 0.08, 0.08, 0.1, 0.1],
};
