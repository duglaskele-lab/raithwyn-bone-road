import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MAXR, RW } from '../src/config.js';
import { G, P } from '../src/state.js';
import { addRage, hadoLevel, hitPlayer, hurtEnemy } from '../src/combat.js';
import { spawn } from '../src/enemies.js';
import { freshGame } from './helpers.js';

beforeEach(freshGame);

test('hadouken level follows the three rage thresholds', () => {
  assert.equal(hadoLevel(0), 0);
  assert.equal(hadoLevel(39), 0);
  assert.equal(hadoLevel(40), 1);
  assert.equal(hadoLevel(119), 1);
  assert.equal(hadoLevel(120), 2);
  assert.equal(hadoLevel(199), 2);
  assert.equal(hadoLevel(200), 3);
});

test('rage never exceeds its maximum', () => {
  addRage(150);
  addRage(150);
  assert.equal(P.rage, MAXR);
});

test('a plain hit staggers a grunt, a knockdown hit launches it', () => {
  const e = spawn('grunt', 1, 500, 450);
  assert.ok(hurtEnemy(e, 8, 1, false, 'punch'));
  assert.equal(e.state, 'hurt');
  assert.equal(e.hp, e.T.hp - 8);
  hurtEnemy(e, 8, 1, true, 'punch');
  assert.equal(e.state, 'air');
});

test('an enemy with no health left is destroyed and scores', () => {
  const e = spawn('grunt', 1, 500, 450);
  hurtEnemy(e, 999, 1, false, 'punch');
  assert.ok(e.dead);
  assert.equal(P.score, e.T.score);
  assert.ok(G.debris.length > 0, 'the skeleton should fall apart into bones');
});

test('any hit knocks the rocker off his motorcycle', () => {
  const e = spawn('biker', 1);
  assert.ok(e.mounted);
  assert.equal(hurtEnemy(e, 5, 1, false, 'punch'), false, 'cannot be hit while waiting offscreen');
  e.t = RW + 0.1;
  assert.ok(hurtEnemy(e, 5, 1, false, 'punch'));
  assert.equal(e.mounted, false);
  assert.equal(e.state, 'air');
  assert.ok(
    G.debris.some((d) => d.k === 'bike'),
    'the bike is left behind as a wreck',
  );
});

test('a leaping monkey is swatted out of the air by a plain hit', () => {
  const e = spawn('monkey', 1, 500, 450);
  e.state = 'leap';
  hurtEnemy(e, 5, 1, false, 'punch');
  assert.equal(e.state, 'air');
});

test('heavy enemies are not interrupted by plain hits mid-attack', () => {
  for (const type of ['brute', 'fat']) {
    const e = spawn(type, 1, 500, 450);
    e.state = 'windup';
    hurtEnemy(e, 8, 1, false, 'punch');
    assert.equal(e.state, 'windup', type);
  }
});

test('the baron shrugs off combo interrupts for 4 seconds after two of them', () => {
  const boss = spawn('boss', 0);
  const interrupt = () => {
    boss.state = 'windup';
    hurtEnemy(boss, 8, 1, false, 'punch');
  };

  interrupt();
  assert.equal(boss.state, 'hurt');
  assert.equal(boss.breaks, 1);
  assert.ok(!(boss.armor > 0));

  interrupt();
  assert.equal(boss.state, 'hurt');
  assert.equal(boss.armor, 4);
  assert.equal(boss.breaks, 0);

  const hp = boss.hp;
  interrupt();
  assert.equal(boss.state, 'windup', 'immune: the attack keeps going');
  assert.equal(boss.hp, hp - 8, 'damage still lands');

  hurtEnemy(boss, 30, 1, true, 'hado');
  assert.equal(boss.state, 'hurt', 'a hadouken interrupts even through the immunity');
});

test('the baron is not staggered by plain hits while he is not attacking', () => {
  const boss = spawn('boss', 0);
  boss.state = 'chase';
  hurtEnemy(boss, 8, 1, false, 'punch');
  assert.equal(boss.state, 'chase');
  assert.equal(boss.breaks, 0);
});

test('breaking an urn drops its pickup', () => {
  const urn = G.props[0],
    before = G.items.length;
  hurtEnemy(urn, 1, 1, false, 'punch');
  assert.ok(urn.dead);
  assert.equal(G.items.length, before + 1);
  assert.equal(G.items.at(-1).kind, urn.drop);
});

test('the player takes damage, gets knocked down, and is safe while invulnerable', () => {
  assert.ok(hitPlayer(10, 1, false));
  assert.equal(P.hp, 90);
  assert.equal(P.state, 'hurt');

  P.state = 'idle';
  assert.ok(hitPlayer(10, 1, true));
  assert.equal(P.state, 'ko');

  P.state = 'idle';
  P.inv = 1;
  assert.equal(hitPlayer(10, 1, false), false);
  assert.equal(P.hp, 80);
});
