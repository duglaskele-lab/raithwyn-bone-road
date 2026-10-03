import test from 'node:test';
import assert from 'node:assert/strict';
import { CRYPT_X, D, MAXR, RL, TYPES, W, WAVES } from '../src/config.js';
import { FR } from '../src/atlas-frames.js';

test('every wave only spawns known enemy types', () => {
  for (const wave of WAVES) {
    for (const [type, side, delay] of wave.sp) {
      assert.ok(TYPES[type], `unknown enemy type "${type}" in wave at x=${wave.x}`);
      assert.ok([-1, 0, 1].includes(side));
      assert.ok(delay >= 0);
    }
  }
});

test('waves go left to right and the level ends with the boss at the crypt', () => {
  for (let i = 1; i < WAVES.length; i++)
    if (WAVES[i].chain) assert.equal(WAVES[i].x, WAVES[i - 1].x, 'a chained wave starts in place');
    else assert.ok(WAVES[i].x > WAVES[i - 1].x);
  assert.deepEqual(
    WAVES.at(-1).sp.map((s) => s[0]),
    ['dragon'],
    'the Bone Dragon is the final boss',
  );
  const baron = WAVES.find((w) => w.sp[0][0] === 'boss');
  assert.ok(
    WAVES.indexOf(baron) < WAVES.length - 2,
    'a fight lies between the baron and the dragon',
  );
  assert.equal(baron.sp.filter((s) => s[0] === 'zombie' && s[1] === 0).length, 7);
  assert.ok(
    CRYPT_X > baron.x && CRYPT_X < baron.x + W,
    "the crypt must be visible in the baron's arena",
  );
});

test('enemy types carry the fields the AI and the renderer rely on', () => {
  for (const [id, t] of Object.entries(TYPES)) {
    for (const f of ['hp', 'scale', 'speed', 'dmg', 'wind', 'act', 'rec', 'score']) {
      assert.ok(t[f] > 0, `${id}.${f}`);
    }
    assert.ok(t.keep > 0 || t.reach > 0, `${id} needs either reach (melee) or keep (ranged)`);
    assert.equal(t.cd.length, 2);
    assert.ok(t.cd[0] <= t.cd[1]);
  }
});

test('rage thresholds rise and the last one equals the maximum', () => {
  assert.equal(RL.length, 3);
  assert.ok(RL[0] < RL[1] && RL[1] < RL[2]);
  assert.equal(RL[2], MAXR);
});

test('player animation timelines fit the frames available in the atlas', () => {
  const rows = { atk1: 'punch1', atk2: 'punch2', thr: 'throw', hado: 'hado' };
  for (const [anim, row] of Object.entries(rows)) {
    assert.equal(D[anim].length, FR[row].length, `${anim} vs atlas row ${row}`);
  }
});
