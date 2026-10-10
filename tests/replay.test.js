import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { APP, G, P, reset } from '../src/state.js';
import { keys, pressed } from '../src/input.js';
import { update } from '../src/world.js';
import { mulberry, random, seedRandom } from '../src/util.js';
import {
  BUTTONS,
  lastRun,
  newRun,
  recordFrame,
  replayFrame,
  replaying,
  runFromText,
  runToText,
  startReplay,
  stopReplay,
} from '../src/replay.js';
import { freshGame } from './helpers.js';

beforeEach(freshGame);

// The state of the world in one string, to compare two runs.
const snapshot = () =>
  JSON.stringify([
    P.x,
    P.y,
    P.z,
    P.hp,
    P.score,
    P.state,
    P.rage,
    G.waveI,
    G.cam,
    G.enemies.map((e) => [e.type, e.state, e.x, e.y, e.z, e.hp]),
    G.projs.map((q) => [q.k, q.x, q.y, q.z]),
  ]);
// A player mashing buttons: a bot whose choices come from its own generator.
function playFor(frames, seed, heal = true) {
  const bot = mulberry(seed);
  for (let i = 0; i < frames; i++) {
    for (const b of BUTTONS) delete keys[b];
    for (const k in pressed) delete pressed[k];
    keys.r = bot() < 0.7;
    keys.u = bot() < 0.2;
    keys.d = bot() < 0.2;
    for (const b of ['atk', 'jump', 'bone', 'hado']) if (bot() < 0.08) pressed[b] = true;
    const dt = Math.round(1000 / 60 + (bot() - 0.5) * 2) / 1000; // like the game's own steps
    if (APP.state === 'play') {
      if (heal && P.hp < 40) P.hp = 100; // (the test keeps the run going)
      recordFrame(dt);
      update(dt);
    }
  }
}

test('the same seed and the same inputs give the same run', () => {
  const runs = [];
  for (let k = 0; k < 2; k++) {
    newRun(1234);
    playFor(1500, 9);
    runs.push(snapshot());
  }
  assert.equal(runs[0], runs[1]);
  newRun(4321);
  playFor(1500, 9);
  assert.notEqual(snapshot(), runs[0], 'a different seed plays out differently');
});

test('a recorded run plays back exactly, also from a saved file', () => {
  newRun(77);
  playFor(2400, 3, false); // (no healing by the test: a replay would not have it)
  const end = snapshot(),
    run = lastRun();
  assert.ok(run.frames.length < 2400, 'repeated frames are folded together');
  for (const r of [run, runFromText(runToText(run))]) {
    seedRandom(999); // whatever came before does not matter
    random();
    assert.ok(startReplay(r));
    assert.ok(replaying());
    let dt;
    while ((dt = replayFrame()) !== null) update(dt);
    stopReplay();
    assert.equal(snapshot(), end);
  }
});

test('a file that is not a replay is refused', () => {
  assert.throws(() => runFromText('{"v":99,"seed":1,"frames":[]}'));
  assert.throws(() => runFromText('not json'));
});

test('a replay plays back exactly even after a run that left things behind', () => {
  newRun(55, 2);
  playFor(2400, 5, false); // (no healing by the test: a replay would not have it)
  const end = snapshot(),
    run = lastRun();
  // another run left its marks: a clock far on, a hit-stop, a burn under way, a grab...
  Object.assign(G, { time: 1234.567, freeze: 0.4, shake: 3, flash: 0.1, lastFoeT: -9 });
  Object.assign(P, { fireT: 0.03, shots: 5, grabber: {}, hold: 1 });
  assert.ok(startReplay(run));
  let dt;
  while ((dt = replayFrame()) !== null) update(dt);
  stopReplay();
  assert.equal(snapshot(), end);
});

test("drawing, and the light picture, never touch the game's chance nor its course", async () => {
  const { stubCanvas } = await import('./helpers.js');
  const restore = stubCanvas();
  try {
    const { drawWorld, drawHUD } = await import('../src/render.js');
    const { initBackground } = await import('../src/background.js');
    const { spawn } = await import('../src/enemies.js');
    const { TYPES, WAVES } = await import('../src/config.js');
    initBackground();
    // every kind of foe at once, in the last arena, and a player mashing buttons
    const fight = (draw, lowFx) => {
      newRun(99, 1, 'lucy');
      APP.lowFx = lowFx;
      G.waveI = 99;
      G.cam = WAVES.at(-1).x;
      Object.assign(P, { x: G.cam + 300, y: 440 });
      let k = 0;
      for (const t of Object.keys(TYPES))
        spawn(t, 0, G.cam + 120 + (k++ % 8) * 90, 380 + (k % 3) * 40);
      const bot = mulberry(4);
      for (let i = 0; i < 900; i++) {
        for (const b of BUTTONS) delete keys[b];
        for (const p in pressed) delete pressed[p];
        keys[bot() < 0.5 ? 'l' : 'r'] = true;
        for (const b of ['atk', 'jump', 'bone', 'hado', 'super'])
          if (bot() < 0.06) pressed[b] = true;
        P.hp = Math.max(P.hp, 50);
        APP.state = 'play';
        update(1 / 60);
        if (draw) {
          drawWorld();
          drawHUD();
        }
      }
      return snapshot() + random();
    };
    const plain = fight(false, false);
    assert.equal(fight(true, false), plain, 'drawn');
    assert.equal(fight(true, true), plain, 'drawn light');
  } finally {
    restore();
    APP.lowFx = false;
  }
});

test('a new run carries nothing over from the last one; the application keeps its own', () => {
  Object.assign(G, { leftover: 1, freeze: 0.3, time: 99 });
  Object.assign(P, { leftover: 2, fireT: 0.01 });
  APP.muted = true;
  APP.lowFx = true;
  reset();
  assert.equal(G.leftover, undefined, 'even a field nobody knew of is gone');
  assert.equal(P.leftover, undefined);
  assert.deepEqual([G.freeze, G.time, P.fireT], [0, 0, 0.1]);
  assert.equal(APP.muted, true, 'the application state lives on');
  assert.equal(APP.lowFx, true);
  APP.muted = false;
  APP.lowFx = false;
});
