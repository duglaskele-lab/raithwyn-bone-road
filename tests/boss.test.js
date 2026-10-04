import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACID, BOSS, DECOR, TYPES, WAVES } from '../src/config.js';
import { G, P } from '../src/state.js';
import { pressed } from '../src/input.js';
import { hurtEnemy } from '../src/combat.js';
import { inBreath, spawn, updEnemy } from '../src/enemies.js';
import { update } from '../src/world.js';
import { DT, freshGame } from './helpers.js';
import { setRandom } from '../src/util.js';

beforeEach(freshGame);

const step = (seconds, each) => {
  for (let i = 0; i < seconds / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
    each?.(i);
  }
};
const run = (e, seconds) => {
  for (let i = 0; i < seconds / DT; i++) updEnemy(e, DT, { n: 0 });
};

test('the boss fight opens with seven zombies climbing out of the ground', () => {
  P.inv = 99;
  const baron = WAVES.find((w) => w.sp?.[0][0] === 'boss');
  G.waveI = WAVES.indexOf(baron);
  G.cam = baron.x;
  G.wave = { sp: baron.sp.map((s) => s.slice()), t: 0 };
  step(2);
  const zombies = G.enemies.filter((e) => e.type === 'zombie');
  assert.equal(zombies.length, 7);
  assert.ok(G.enemies.some((e) => e.type === 'boss'));
});

test('nothing interrupts the summon', () => {
  const boss = spawn('boss', 0);
  boss.state = 'summon';
  boss.t = 0.2;
  for (const [src, knock] of [
    ['punch', true],
    ['hado', true],
    ['super', true],
  ])
    hurtEnemy(boss, 5, 1, knock, src);
  assert.equal(boss.state, 'summon');
});

test('below half health the baron roars into phase two and breathes acid', () => {
  P.x = 400;
  P.y = 450;
  const boss = spawn('boss', 0);
  Object.assign(boss, { x: 520, y: 450, state: 'chase' }); // the baron always spawns at his crypt
  boss.next = 0; // no summons in the way
  boss.hp = TYPES.boss.hp * BOSS.phase2 - 1;
  run(boss, DT);
  assert.equal(boss.state, 'roar');
  assert.ok(boss.phase2);
  hurtEnemy(boss, 1, 1, true, 'hado');
  assert.equal(boss.state, 'roar', 'the roar cannot be stopped');

  run(boss, BOSS.roar + DT * 2);
  assert.notEqual(boss.state, 'roar');
  Object.assign(boss, { state: 'chase', t: 0, brCd: 0, cd: 99 });
  run(boss, DT);
  assert.equal(boss.state, 'bwind');
  for (const src of ['punch', 'air', 'hado', 'super']) hurtEnemy(boss, 1, 1, true, src);
  assert.equal(boss.state, 'bwind', 'the wind-up cannot be interrupted either');
  run(boss, BOSS.breathWind * 0.9);
  assert.equal(boss.state, 'bwind', '0.7 s to get away');
  run(boss, BOSS.breathWind * 0.2);
  assert.equal(boss.state, 'breath');

  assert.ok(inBreath(boss), 'the player stands in the cone');
  const hp = P.hp;
  hurtEnemy(boss, 1, 1, true, 'hado');
  assert.equal(boss.state, 'breath', 'the breath cannot be stopped');
  run(boss, BOSS.breathTime + DT * 2);
  assert.ok(P.hp <= hp - 3 * BOSS.breathDmg, `hp ${hp} -> ${P.hp}`);
  assert.equal(G.pools.length, 4, 'the breath leaves four puddles of acid');
  assert.equal(boss.state, 'recover');
});

test('the breath reaches 40% further than it did and is not marked on the ground', () => {
  assert.equal(BOSS.breathLen, 250 * 1.4);
  assert.ok(
    !/breathLen|bwind/.test(readFileSync(new URL('../src/render.js', import.meta.url), 'utf8')),
  );
});

test('the breath cone is wide in front of the baron and nothing behind him', () => {
  const boss = spawn('boss', 0);
  Object.assign(boss, { x: 500, y: 450, face: 1 });
  P.y = 450;
  for (const [x, y, inside] of [
    [560, 450, true],
    [500 + BOSS.breathLen, 450 + 80, true],
    [500 + BOSS.breathLen + 60, 450, false],
    [440, 450, false],
    [560, 450 + 90, false],
  ]) {
    P.x = x;
    P.y = y;
    assert.equal(inBreath(boss), inside, `${x},${y}`);
  }
});

test('big graves take three hits; a zombie, a skeleton or nothing climbs out', () => {
  assert.equal(DECOR.tomb.hp, 3, 'a quarter less than four');
  const tombs = G.props.filter((u) => u.decor === 'tomb');
  assert.ok(tombs.length >= 5);
  const random = setRandom(Math.random);
  try {
    for (const [r, type] of [
      [0.1, 'zombie'],
      [0.3, 'grunt'],
      [0.7, null],
    ]) {
      G.enemies = [];
      const tomb = tombs.pop();
      for (let i = 1; i < DECOR.tomb.hp; i++) {
        hurtEnemy(tomb, 1, 1, false, 'punch');
        assert.ok(!tomb.dead);
      }
      setRandom(() => r);
      hurtEnemy(tomb, 1, 1, false, 'punch');
      setRandom(Math.random);
      assert.ok(tomb.dead);
      assert.deepEqual(
        G.enemies.map((e) => e.type),
        type ? [type] : [],
      );
      if (type) assert.equal(G.enemies[0].state, 'rise');
    }
  } finally {
    setRandom(random);
  }
});

test('an acid ball that hits the player still falls and leaves a wider puddle', () => {
  assert.equal(ACID.rx, 68, '30% wider than 52');
  P.x = 400;
  P.y = 450;
  G.projs.push({ k: 'acid', x: 400, y: 450, z: 60, vx: 0, vy: 0, vz: 0, rot: 0, life: 3 });
  step(DT * 2);
  assert.ok(P.hp < 100, 'the hit lands');
  assert.equal(G.projs.length, 1, 'the ball keeps falling');
  step(0.5);
  assert.equal(G.projs.length, 0);
  assert.equal(G.pools.length, 1);
});
