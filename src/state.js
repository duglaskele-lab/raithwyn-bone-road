import { CRYPT_X, DECOR, GB, GT } from './config.js';
import { mulberry } from './util.js';

// The state every module (and every test) shares, in two parts:
//  - APP: the application, which lives as long as the page: which screen is up, the menus,
//    who the next run is played as, sound, the picture (its scale, the light picture), the
//    run latch of the controls, notes on screen;
//  - G and P: one run (the world, and the heroine in it). reset() builds both from scratch for
//    every run: nothing a run leaves behind can carry over into the next one, or into a replay.
export const APP = {
  state: 'title',
  fighter: 'raithwyn', // who the next run is played as (the character select sets it)
  menu: 0,
  sel: 0,
  msgT: 0,
  muted: false,
  runLatch: false,
  K: 1,
  lowFx: false, // the light picture (main.js switches it on by itself on a slow device)
  vibrate: true,
  note: null, // a short message on screen (a replay saved, a bad file...)
  replayDone: false, // a replay has played to its end and waits on its last frame
};
export const G = {};
export const P = {};

/** The heroine at the start of a run. */
function freshPlayer() {
  return {
    who: 'raithwyn', // (replay.js sets the run's own fighter)
    x: 150,
    y: 450,
    z: 0,
    vx: 0,
    vyd: 0,
    vz: 0,
    face: 1,
    hp: 100,
    maxHp: 100,
    hpLag: 100,
    lucky: 0,
    ammo: 7,
    streak: 0,
    streakT: 0,
    rage: 0,
    lives: 2,
    state: 'idle',
    t: 0,
    an: ['idle', 0],
    combo: 0,
    comboT: 0,
    inv: 0,
    buf: null,
    bufT: 0,
    boneCd: 0,
    score: 0,
    hit: new Set(),
    ph: 0,
    sw: 0,
    rev: 0,
    airT: null,
    airUsed: 0,
    puller: null,
    hl: 1,
    seq: [],
    bufDir: 0,
    sup: 0,
    sty: 0,
    styT: 0,
    styPop: 0,
    acidT: 0,
    landed: false, // the punch under way has struck something
    finT: 0, // how long K still makes Lucy's heavy shot (J J K)
    fireT: 0.1,
    shots: 0,
    grabber: null,
    hold: 0,
    dkStep: -1,
    dkWay: 0,
    dkPos: -1,
  };
}
/** The world at the start of a run: the Bone Road, its props and scenery. */
function freshRun() {
  const props = [
    [525, 'hp'],
    [1090, 'rage'],
    [1650, 'hp'],
    [2210, 'rage'],
    [2775, 'hp'],
    [3340, 'rage'],
    [3860, 'hp'],
    [3990, 'hp'],
  ].map(([x, d]) => ({ isProp: 1, x, y: GT + 10, z: 0, w: 16, drop: d }));
  const rand = mulberry(1977);
  // big graves all along the road; something may climb out when they break
  for (const x of [450, 790, 1170, 1460, 1815, 2085, 2400, 2670, 3000, 3190, 3600, 4610, 4950])
    props.push({
      isProp: 1,
      decor: 'tomb',
      x,
      y: GT + 30 + rand() * (GB - GT - 50),
      z: 0,
      w: DECOR.tomb.w,
      hp: DECOR.tomb.hp,
      drop: null,
    });
  // scenery: benches along the back wall, stone crosses anywhere on the road
  const kinds = ['bench', 'cross', 'cross'];
  for (let x = 420; x < CRYPT_X - 260; x += 170 + rand() * 170) {
    const kind = kinds[Math.floor(rand() * kinds.length)],
      y = kind === 'bench' ? GT + 6 + rand() * 18 : GT + 6 + rand() * (GB - GT - 8),
      drop = rand() < 0.12 ? 'rage' : null;
    if (props.some((u) => Math.abs(u.x - x) < 70)) continue;
    props.push({
      isProp: 1,
      decor: kind,
      x,
      y,
      z: 0,
      w: DECOR[kind].w,
      hp: DECOR[kind].hp,
      drop,
    });
  }
  return {
    time: 0,
    cam: 0,
    camY: 0, // Old Quarry's camera also moves down
    camS: 0, // and follows a path: how far along it, in pixels
    level: 1,
    freeze: 0,
    shake: 0,
    flash: 0,
    slow: 0,
    bikes: 0, // rockers so far: every second one rides the chopper
    enemies: [],
    props,
    // a couple of hearts lying on the road before the dragon's lair
    items: [5160, 5220].map((x) => ({ kind: 'hp', x, y: GT + 90, z: 0, vz: 0, t: 1 })),
    projs: [],
    parts: [],
    debris: [],
    floats: [],
    pools: [],
    shocks: [],
    waveI: 0,
    wave: null,
    goT: 0,
    banner: { a: 'stage1', b: 'subtitle', t: 0 },
    lastFoe: null,
    lastFoeT: 0,
    endT: 0,
    evilHit: false,
    secretT: 0,
    stageT: 0,
    secretDone: false,
  };
}
/** A new run: the world and the heroine made anew (every field, not just some, is replaced). */
export function reset() {
  for (const k of Object.keys(G)) delete G[k];
  Object.assign(G, freshRun());
  for (const k of Object.keys(P)) delete P[k];
  Object.assign(P, freshPlayer());
}
reset();
