import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TYPES, WAVEGEN, WAVES } from '../src/config.js';
import { seedRandom } from '../src/util.js';
import { STRONG, rollWave, themedWave, waveSpawns } from '../src/waves.js';
import { LEVELS } from '../src/level.js';
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

test('the bonebreaker is a light enemy, the fatso a medium one', () => {
  assert.equal(TYPES.brute.weight ?? 'light', 'light');
  assert.equal(TYPES.fat.weight, 'medium');
});

test('a fight with an idea: its own foes are fixed, the plain ones round them rolled', () => {
  const w = {
    core: [
      ['fat', 1, 0],
      ['necro', -1, 1],
    ],
    fill: { n: [1, 3], pool: { grunt: 1 }, from: 2, gap: 1 },
  };
  const sizes = new Set();
  for (let r = 0; r < 60; r++) {
    const sp = themedWave(w);
    assert.deepEqual(sp.slice(0, 2), w.core);
    assert.ok(sp.length >= 3 && sp.length <= 5);
    assert.ok(sp.slice(2).every((s) => s[0] === 'grunt' && s[2] >= 2));
    sizes.add(sp.length);
  }
  assert.equal(sizes.size, 3, 'one, two or three of them');
  assert.notEqual(themedWave(w)[0], w.core[0], 'a copy: the fight itself is not changed');
  seedRandom(7);
  const a = JSON.stringify(themedWave(w));
  seedRandom(7);
  assert.equal(JSON.stringify(themedWave(w)), a, 'a replay meets the same ones');
});

test('the later stages are no longer than the Bone Road, and their fights grow', () => {
  const hp = (n) => {
    let sum = 0;
    for (const w of LEVELS[n].waves)
      for (const [k] of (w.sp ?? w.core).concat(w.mid ?? []))
        sum += TYPES[k].hp > 900 && !TYPES[k].bigBoss ? 40 : TYPES[k].hp;
    return sum;
  };
  for (const n of [2, 3, 4, 5]) {
    const W = LEVELS[n].waves,
      own = W.filter((w) => !w.sp);
    assert.ok(W.length <= 12, `stage ${n}: ${W.length} fights`);
    assert.ok(hp(n) < 6000, `stage ${n}: ${hp(n)} health to get through`);
    assert.ok(own.every((w) => w.core && w.name));
    // the first fight is a handful, the last one before the boss the biggest
    const size = (w) => w.core.length + (w.mid?.length ?? 0) + (w.fill?.n[1] ?? 0);
    assert.ok(size(own[0]) <= 5);
    assert.equal(Math.max(...own.map(size)), size(own.at(-1)));
  }
});
