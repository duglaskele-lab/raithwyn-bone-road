import { GT } from './config.js';

// All mutable game state lives here so every module (and every test) sees the same world.
export const G = {
  state: 'title',
  time: 0,
  cam: 0,
  freeze: 0,
  shake: 0,
  flash: 0,
  slow: 0,
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
  });
  G.cam = 0;
  G.waveI = 0;
  G.wave = null;
  G.goT = 0;
  G.enemies = [];
  G.items = [];
  G.projs = [];
  G.parts = [];
  G.debris = [];
  G.floats = [];
  G.lastFoe = null;
  G.endT = 0;
  G.slow = 0;
  G.props = [
    [760, 'hp'],
    [1620, 'rage'],
    [2480, 'hp'],
    [3300, 'rage'],
    [4150, 'hp'],
    [4950, 'rage'],
    [5750, 'hp'],
    [6550, 'rage'],
    [7200, 'hp'],
    [7380, 'hp'],
  ].map(([x, d]) => ({ isProp: 1, x, y: GT + 10, z: 0, w: 16, drop: d }));
  G.banner = { a: 'Стадия 1', b: 'Костяной тракт', t: 0 };
}
