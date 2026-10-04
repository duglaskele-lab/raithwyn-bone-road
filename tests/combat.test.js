import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FAT, HOG, JUGGLE, MAXR, RW, TYPES } from '../src/config.js';
import { G, P } from '../src/state.js';
import { addRage, canJuggle, hadoLevel, hitPlayer, hurtEnemy } from '../src/combat.js';
import { spawn, updEnemy } from '../src/enemies.js';
import { keys, pressed } from '../src/input.js';
import { update } from '../src/world.js';
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

test('every second rocker rides a long chopper that hits along its whole length', () => {
  const a = spawn('biker', 1),
    b = spawn('biker', 1);
  assert.equal(a.bike, 'bike');
  assert.equal(b.bike, 'hog');
  assert.ok(HOG.half > 58 * 1.5, 'a much longer hit box');
  for (const [e, behind, hit] of [
    [a, 40, true],
    [a, 80, false],
    [b, 80, true],
    [b, -100, true], // the ram in front
    [b, 120, false],
  ]) {
    Object.assign(P, { x: 500, y: 450, z: 0, hp: 100, inv: 0, state: 'idle' });
    Object.assign(e, { state: 'ride', t: RW + 0.1, y: 450, hitDone: false });
    e.x = P.x + e.rdir * behind; // the player this far behind the rider's middle
    updEnemy(e, 0.001, { n: 0 });
    assert.equal(P.hp < 100, hit, `${e.bike}, ${behind} px behind`);
  }
});

test('light enemies can be juggled: every hit in the air pops them up again', () => {
  const e = spawn('grunt', 1, 500, 450);
  hurtEnemy(e, 1, 1, true, 'punch');
  assert.equal(e.state, 'air');
  for (let i = 0; i < 10; i++) updEnemy(e, 1 / 60, { n: 0 });
  assert.ok(e.z > 0);
  hurtEnemy(e, 1, 1, false, 'punch');
  assert.equal(e.state, 'air', 'still in the air');
  assert.equal(e.vz, JUGGLE.pop);
  assert.equal(e.juggle, 1);
  hurtEnemy(e, 1, 1, false, 'punch');
  assert.equal(e.vz, JUGGLE.pop - JUGGLE.decay, 'each pop a little lower');
  for (let i = 0; i < 30; i++) hurtEnemy(e, 0, 1, false, 'punch');
  assert.equal(e.vz, JUGGLE.min, 'never below the minimum');
  assert.ok(P.sty > 0, 'juggling is stylish');
  for (let i = 0; i < 120 && e.state === 'air'; i++) updEnemy(e, 1 / 60, { n: 0 });
  assert.equal(e.state, 'down');
  assert.equal(e.juggle, 0, 'a new juggle starts from scratch');
});

test('heavy enemies and bosses fall through a juggle unless their type allows it', () => {
  const e = spawn('fat', 1, 500, 450);
  e.heavyT = 1; // a second heavy blow: he goes up
  hurtEnemy(e, 1, 1, true, 'punch');
  for (let i = 0; i < 10; i++) updEnemy(e, 1 / 60, { n: 0 });
  const vz = e.vz;
  hurtEnemy(e, 1, 1, false, 'punch');
  assert.equal(e.state, 'air');
  assert.equal(e.vz, vz, 'no pop: it keeps falling');
  assert.ok(!canJuggle(spawn('boss', 0)));
  assert.ok(canJuggle({ T: { ...TYPES.fat, juggle: 1 } }), 'an exception can be made');
  assert.ok(canJuggle(spawn('brute', 1, 500, 450)), 'the bonebreaker can be juggled');
});

test('the fatso goes down only to two heavy blows within 3 seconds', () => {
  const e = spawn('fat', 1, 500, 450);
  hurtEnemy(e, 1, 1, true, 'punch');
  assert.equal(e.state, 'hurt', 'the first heavy blow: a flinch');
  for (let i = 0; i < 60; i++) updEnemy(e, 1 / 60, { n: 0 });
  hurtEnemy(e, 1, 1, true, 'punch');
  assert.equal(e.state, 'air', 'the second within 3 s knocks him down');
  // too slow: the window closes and it starts again
  const f = spawn('fat', 1, 600, 450);
  hurtEnemy(f, 1, 1, true, 'hado');
  for (let i = 0; i < 200; i++) updEnemy(f, 1 / 60, { n: 0 });
  Object.assign(f, { state: 'chase', z: 0 });
  hurtEnemy(f, 1, 1, true, 'punch');
  assert.notEqual(f.state, 'air', '3 s later it counts as a first blow again');
  assert.equal(FAT.window, 3);
});

test('the third punch with up held launches a light enemy straight up', () => {
  const e = spawn('grunt', 1, 500, 450);
  hurtEnemy(e, 1, 1, true, 'punch', true);
  assert.equal(e.state, 'air');
  assert.equal(e.vz, JUGGLE.launch);
  assert.equal(e.vx, JUGGLE.launchCarry, 'barely pushed away');
  // a launcher on an enemy already in the air throws it up high again, also without pushing it
  for (let i = 0; i < 20; i++) updEnemy(e, 1 / 60, { n: 0 });
  hurtEnemy(e, 1, 1, true, 'punch', true);
  assert.equal(e.vz, JUGGLE.launch, 'the first hit in the air pops it just as high');
  assert.equal(e.vx, JUGGLE.launchCarry);
  // without up: the usual knockback
  const g = spawn('grunt', 1, 500, 450);
  hurtEnemy(g, 1, 1, true, 'punch');
  assert.equal(g.vx, 270);
  // heavy enemies are knocked back as usual
  const b = spawn('fat', 1, 500, 450);
  b.heavyT = 1;
  hurtEnemy(b, 1, 1, true, 'punch', true);
  assert.equal(b.vx, 170);
});

test('the combo finisher launches when up is held, in a real fight', () => {
  P.x = 400;
  P.y = 450;
  const e = spawn('grunt', 1, 470, 450);
  Object.assign(e, { state: 'chase', cd: 99 });
  keys.u = true;
  P.combo = 2; // the next punch is the third one
  P.comboT = 1;
  pressed.atk = true;
  for (let i = 0; i < 20 && e.state !== 'air'; i++) {
    update(1 / 60);
    for (const k in pressed) delete pressed[k];
  }
  delete keys.u;
  assert.equal(e.state, 'air');
  assert.ok(e.vz > 400 && Math.abs(e.vx) <= JUGGLE.launchCarry, `vz ${e.vz} vx ${e.vx}`);
});

test('a leaping monkey is swatted out of the air by a plain hit', () => {
  const e = spawn('monkey', 1, 500, 450);
  e.state = 'leap';
  hurtEnemy(e, 5, 1, false, 'punch');
  assert.equal(e.state, 'air');
});

test('the heavy fatso is not interrupted by plain hits mid-attack; the bonebreaker is', () => {
  const b = spawn('brute', 1, 500, 450);
  b.state = 'windup';
  hurtEnemy(b, 8, 1, false, 'punch');
  assert.equal(b.state, 'hurt', 'the bonebreaker is no longer heavy');
  for (const type of ['fat']) {
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
