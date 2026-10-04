import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TYPES, WAVEGEN, WAVES } from '../src/config.js';
import { seedRandom } from '../src/util.js';
import { STRONG, rollWave, waveSpawns } from '../src/waves.js';
import { freshGame } from './helpers.js';

beforeEach(freshGame);

const stats = (lvl, rolls = 300) => {
  let n = 0,
    hard = 0,
    maxHard = 0,
    noHard = 0;
  for (let r = 0; r < rolls; r++) {
    const w = rollWave(lvl),
      h = w.filter((s) => STRONG.includes(s[0])).length;
    n += w.length;
    hard += h;
    maxHard = Math.max(maxHard, h);
    if (!h) noHard++;
  }
  return { n: n / rolls, hard: hard / rolls, maxHard, noHard };
};

test('the start of the road is mostly easy enemies, now and then a strong one', () => {
  const s = stats(0);
  assert.ok(s.n >= 5 && s.n <= 7, `${s.n} enemies`);
  assert.ok(s.hard < 0.6, `${s.hard} strong ones per fight`);
  assert.equal(s.maxHard, 1, 'never more than one');
});

test('the end of the road brings crowds of every kind', () => {
  const s = stats(1);
  assert.ok(s.n >= 11, `${s.n} enemies`);
  assert.ok(s.hard >= 3, `${s.hard} strong ones per fight`);
  assert.equal(stats(0.6).noHard, 0, 'past the middle there is always a strong one');
  const kinds = new Set();
  for (let r = 0; r < 50; r++) for (const [t] of rollWave(1)) kinds.add(t);
  for (const pool of Object.values(WAVEGEN.pools))
    for (const t of Object.keys(pool)) assert.ok(kinds.has(t), `${t} turns up`);
});

test('the fights get bigger and harder along the road', () => {
  const lv = WAVES.filter((w) => !w.sp).map((w) => w.lvl);
  for (let i = 1; i < lv.length; i++) assert.ok(lv[i] > lv[i - 1]);
  const a = stats(lv[0]),
    b = stats(lv[lv.length - 1]);
  assert.ok(b.n > a.n * 1.6 && b.hard > a.hard * 5);
});

test('each run rolls new fights, a replay (the same seed) the same ones', () => {
  seedRandom(1);
  const a = JSON.stringify(waveSpawns(4));
  seedRandom(1);
  assert.equal(JSON.stringify(waveSpawns(4)), a);
  seedRandom(2);
  assert.notEqual(JSON.stringify(waveSpawns(4)), a);
});

test('zombies rise from the ground, riders ride in, the boss fights stay as they are', () => {
  for (let r = 0; r < 100; r++)
    for (const [t, side] of rollWave(r / 100)) {
      if (t === 'zombie') assert.equal(side, 0);
      if (t === 'biker') assert.notEqual(side, 0);
    }
  const baron = WAVES.findIndex((w) => w.sp?.[0][0] === 'boss');
  assert.deepEqual(waveSpawns(baron), WAVES[baron].sp);
});

test('the bonebreaker is no longer a heavy enemy', () => {
  assert.ok(!TYPES.brute.heavy);
  assert.ok(TYPES.fat.heavy);
});
