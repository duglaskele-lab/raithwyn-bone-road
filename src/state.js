import { CRYPT_X, DECOR, GB, GT } from './config.js';
import { mulberry } from './util.js';

// All mutable game state lives here so every module (and every test) sees the same world.
export const G = {
  state: 'title',
  menu: 0,
  sel: 0,
  msgT: 0,
  time: 0,
  cam: 0,
  freeze: 0,
  shake: 0,
  flash: 0,
  slow: 0,
  bikes: 0, // rockers so far: every second one rides the chopper
  enemies: [],
  props: [],
  items: [],
  projs: [],
  parts: [],
  debris: [],
  floats: [],
  waveI: 0,
  wave: null,
  goT: 0,
  banner: null,
  lastFoe: null,
  lastFoeT: 0,
  endT: 0,
  muted: false,
  pools: [],
  shocks: [],
  runLatch: false,
  K: 1,
};
export const P = {};
export function reset() {
  Object.assign(P, {
    x: 150,
    y: 450,
    z: 0,
    vx: 0,
    vyd: 0,
    vz: 0,
    face: 1,
    hp: 100,
    hpLag: 100,
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
  });
  G.cam = 0;
  G.waveI = 0;
  G.wave = null;
  G.goT = 0;
  G.enemies = [];
  // a couple of hearts lying on the road before the dragon's lair
  G.items = [5160, 5220].map((x) => ({ kind: 'hp', x, y: GT + 90, z: 0, vz: 0, t: 1 }));
  G.projs = [];
  G.pools = [];
  G.shocks = [];
  G.parts = [];
  G.debris = [];
  G.floats = [];
  G.lastFoe = null;
  G.endT = 0;
  G.slow = 0;
  G.bikes = 0;
  G.props = [
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
    G.props.push({
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
    if (G.props.some((u) => Math.abs(u.x - x) < 70)) continue;
    G.props.push({
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
  G.secretT = 0;
  G.secretDone = false;
  G.banner = { a: 'stage1', b: 'subtitle', t: 0 };
}
