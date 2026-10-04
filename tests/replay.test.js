import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { G, P } from '../src/state.js';
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
function playFor(frames, seed) {
  const bot = mulberry(seed);
  for (let i = 0; i < frames; i++) {
    for (const b of BUTTONS) delete keys[b];
    for (const k in pressed) delete pressed[k];
    keys.r = bot() < 0.7;
    keys.u = bot() < 0.2;
    keys.d = bot() < 0.2;
    for (const b of ['atk', 'jump', 'bone', 'hado']) if (bot() < 0.08) pressed[b] = true;
    const dt = Math.round(1000 / 60 + (bot() - 0.5) * 2) / 1000; // like the game's own steps
    if (G.state === 'play') {
      if (P.hp < 40) P.hp = 100; // (the test keeps the run going)
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
  playFor(2400, 3);
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
