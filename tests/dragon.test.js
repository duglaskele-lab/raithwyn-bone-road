import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DECOR, SUPER_HOLD, TYPES, WAVES } from '../src/config.js';
import { G, P } from '../src/state.js';
import { pressed } from '../src/input.js';
import { hurtEnemy, strike } from '../src/combat.js';
import { spawn, updEnemy } from '../src/enemies.js';
import { DRAGON, dragonHead, dragonZone, updShocks } from '../src/dragon.js';
import { update } from '../src/world.js';
import { DT, allFinite, freshGame } from './helpers.js';

beforeEach(freshGame);

const run = (e, seconds, each) => {
  for (let i = 0; i < seconds / DT; i++) {
    updEnemy(e, DT, { n: 0 });
    each?.();
  }
};
// A dragon standing at x=600 facing left, ready to act, the player in front of it.
function dragonAt(px, py, extra = {}) {
  G.cam = 0;
  P.x = px;
  P.y = py;
  const d = spawn('dragon', 0, 600, 450);
  Object.assign(d, { state: 'walk', t: 0, z: 0, face: -1, cd: 0, laserCd: 0, leapCd: 0 }, extra);
  return d;
}

test('the level ends with the Bone Dragon, after one more fight and a couple of hearts', () => {
  const baron = WAVES.findIndex((w) => w.sp[0][0] === 'boss');
  assert.deepEqual(
    WAVES.at(-1).sp.map((s) => s[0]),
    ['dragon'],
  );
  assert.equal(baron, WAVES.length - 3);
  const fight = WAVES.at(-2).sp.map((s) => s[0]);
  assert.ok(fight.includes('grunt') && fight.includes('zombie'));
  const hearts = G.items.filter((i) => i.kind === 'hp' && i.x > WAVES.at(-2).x);
  assert.equal(hearts.length, 2);
});

test('the dragon drops in and cannot be hurt before it lands', () => {
  const d = spawn('dragon', 0);
  assert.equal(d.state, 'intro');
  assert.equal(hurtEnemy(d, 50, 1, true, 'hado'), false);
  run(d, 2.3);
  assert.equal(d.state, 'walk');
  assert.equal(d.z, 0);
});

test('heavy blows stagger some wind-ups, then it shrugs them off for a while', () => {
  const d = dragonAt(400, 450);
  // the laser and the leap can never be stopped
  for (const st of ['laser', 'leap']) {
    Object.assign(d, { state: st, t: 0.1, laserY: 450, armor: 0 });
    for (const src of ['punch', 'hado', 'super']) hurtEnemy(d, 1, 1, true, src);
    assert.equal(d.state, st);
  }
  // a plain hit does not stop a bite
  Object.assign(d, { state: 'bite', t: 0.1, armor: 0 });
  hurtEnemy(d, 1, 1, false, 'punch');
  assert.equal(d.state, 'bite');
  // a bite already striking cannot be stopped
  Object.assign(d, { state: 'bite', t: DRAGON.bite.wind + 0.05 });
  hurtEnemy(d, 1, 1, true, 'hado');
  assert.equal(d.state, 'bite');
  // a heavy blow during the wind-up staggers it…
  Object.assign(d, { state: 'claw', t: 0.1 });
  hurtEnemy(d, 1, 1, true, 'punch');
  assert.equal(d.state, 'stagger');
  run(d, DRAGON.stagger + DT);
  assert.equal(d.state, 'walk');
  // …and for a few seconds after that, nothing does
  Object.assign(d, { state: 'pounce', t: 0.1 });
  hurtEnemy(d, 1, 1, true, 'hado');
  assert.equal(d.state, 'pounce');
});

test('it moves half as fast again as before and pounces at a far player', () => {
  assert.equal(TYPES.dragon.speed, 51);
  const d = dragonAt(100, 460, { laserCd: 9 });
  run(d, DT);
  assert.equal(d.state, 'pounce');
  run(d, DRAGON.pounce.crouch + DRAGON.pounce.air + 0.05);
  assert.ok(
    Math.abs(Math.abs(d.x - P.x) - DRAGON.pounce.gap) < 10,
    `lands ${Math.abs(d.x - P.x)} px from the player`,
  );
});

test('it only uses attacks that can reach the player, and varies them', () => {
  // far up the road in depth: no claw, bite or laser can reach
  const d = dragonAt(400, 300);
  run(d, DT);
  assert.equal(d.state, 'walk');
  // close in front: claw or bite, and not the same one twice in a row
  const e = dragonAt(430, 450, { last: 'claw' });
  run(e, DT);
  assert.ok(['bite', 'laser'].includes(e.state), e.state);
  const f = dragonAt(430, 450, { last: 'bite', laserCd: 9 });
  run(f, DT);
  assert.equal(f.state, 'claw');
});

test('the bite lowers the head, which then takes 1.5x damage', () => {
  const d = dragonAt(360, 450, { laserCd: 9, last: 'claw' });
  P.inv = 99;
  run(d, DT);
  assert.equal(d.state, 'bite');
  run(d, DRAGON.bite.wind + DRAGON.bite.strike + 0.1);
  const hx = d.x + d.face * dragonHead(d).x;
  assert.equal(dragonZone(d, hx - 10, hx + 10, d.y), 'head');
  P.x = hx + 60;
  P.face = -1;
  P.hit = new Set();
  const hp = d.hp;
  strike({ x0: 0, x1: 100, dy: 27, dmg: 10, knock: false, rage: 0 });
  assert.equal(hp - d.hp, 10 * DRAGON.headMult);
  run(d, DRAGON.bite.down + DRAGON.bite.up);
  assert.notEqual(dragonZone(d, hx - 10, hx + 10, d.y), 'head', 'the head is back up');
});

test('the bite and the claw hurt the player in reach', () => {
  for (const [atk, other] of [
    ['bite', 'claw'],
    ['claw', 'bite'],
  ]) {
    freshGame();
    const d = dragonAt(atk === 'bite' ? 360 : 430, 450, { last: other, laserCd: 9 });
    run(d, DT);
    assert.equal(d.state, atk);
    run(d, 1.2);
    assert.ok(P.hp < 100, atk);
  }
});

test('the laser covers the whole arena but a step up or down dodges it', () => {
  for (const [dy, hit] of [
    [10, true],
    [70, false],
  ]) {
    freshGame();
    const d = dragonAt(60, 450);
    Object.assign(d, { state: 'laser', t: 0, laserY: 450 });
    P.y = 450 + dy;
    run(d, DRAGON.laser.wind + DRAGON.laser.fire);
    assert.equal(P.hp < 100, hit, `dy ${dy}`);
  }
});

test('below half health: a roar, then the leap joins in and hits where it lands', () => {
  const d = dragonAt(200, 450, { last: 'claw' });
  d.hp = TYPES.dragon.hp * DRAGON.phase2 - 1;
  run(d, DT);
  assert.equal(d.state, 'roar');
  run(d, DRAGON.roar + DT);
  Object.assign(d, { state: 'walk', cd: 0, leapCd: 0, laserCd: 9 });
  P.y = 450 + 120; // out of reach of everything else
  run(d, DT);
  assert.equal(d.state, 'leap');
  run(d, DRAGON.leap.crouch + DRAGON.leap.air + 0.05);
  assert.ok(Math.abs(d.x - P.x) < 5, 'lands on the player');
  assert.ok(P.hp < 100);
});

test('a long fight stays sound and the dragon uses many different attacks', () => {
  const d = dragonAt(380, 450);
  const used = new Set();
  run(d, 60, () => {
    P.hp = 100;
    P.state = 'idle';
    P.inv = 0;
    used.add(d.state);
    if (d.t < DT && d.state === 'walk' && Math.random() < 0.02) P.y = 380 + Math.random() * 140;
    if (Math.random() < 0.002) d.hp = Math.min(d.hp, TYPES.dragon.hp * 0.4);
  });
  assert.ok(allFinite(d, ['x', 'y', 'z', 'hp']));
  for (const a of ['bite', 'claw', 'laser']) assert.ok(used.has(a), `${a} in ${[...used]}`);
});

test('killing the dragon wins the level', () => {
  P.inv = 99;
  G.waveI = WAVES.length - 1;
  G.cam = WAVES.at(-1).x;
  G.wave = { sp: WAVES.at(-1).sp.map((s) => s.slice()), t: 0 };
  const step = (s) => {
    for (let i = 0; i < s / DT; i++) {
      update(DT);
      for (const k in pressed) delete pressed[k];
    }
  };
  step(3.5); // spawn after 1 s, then 2.2 s of the landing
  const d = G.enemies.find((e) => e.type === 'dragon');
  assert.ok(d);
  hurtEnemy(d, 99999, 1, true, 'hado');
  assert.equal(d.state, 'dying', 'it does not crumble at once');
  assert.ok(!d.dead);
  assert.equal(hurtEnemy(d, 10, 1, true, 'hado'), false, 'no more hits while it falls');
  step(4);
  assert.ok(d.dead);
  for (const part of ['skull', 'ribs', 'wing', 'tail', 'leg'])
    assert.ok(
      G.debris.some((p) => p.k === 'dpart' && p.part === part),
      `${part} lies on the ground`,
    );
  assert.equal(G.state, 'win');
});

test('the super attack charges in one second; big graves burst into big slabs', () => {
  assert.equal(SUPER_HOLD, 1);
  const tomb = G.props.find((u) => u.decor === 'tomb');
  for (let i = 0; i < DECOR.tomb.hp; i++) hurtEnemy(tomb, 1, 1, false, 'punch');
  assert.ok(tomb.dead);
  assert.ok(G.debris.filter((d) => d.k === 'shard' && d.len >= 18).length >= 9);
});

test('the dragon has 15% and then another 10% more health', () => {
  assert.equal(TYPES.dragon.hp, Math.round(900 * 1.15 * 1.1));
});

test('the second-phase leap sends a shockwave across the arena; jumping clears it', () => {
  for (const [jumping, hurt] of [
    [false, true],
    [true, false],
  ]) {
    freshGame();
    const d = dragonAt(400, 450, { phase2: true });
    Object.assign(d, { state: 'leap', t: 0 });
    run(d, DRAGON.leap.crouch + DRAGON.leap.air + 0.05);
    assert.equal(G.shocks.length, 1, 'a shockwave starts where it lands');
    // move the player well away from the landing and let the ring reach her
    P.x = d.x + 600;
    P.y = d.y;
    P.hp = 100;
    P.inv = 0;
    P.state = 'idle';
    for (let i = 0; i < 2 / DT; i++) {
      if (jumping) P.z = 80;
      updShocks(DT);
    }
    assert.equal(P.hp < 100, hurt, jumping ? 'in the air' : 'on the ground');
  }
  for (let i = 0; i < 1 / DT; i++) updShocks(DT);
  assert.equal(G.shocks.length, 0, 'the ring fades past the arena');
});

test("the player's hits push the dragon back a little", () => {
  // roaring: it stands still, so only the push moves it
  const d = dragonAt(400, 450, { state: 'roar', t: -5 });
  const x = d.x;
  P.face = 1;
  hurtEnemy(d, 5, 1, false, 'punch');
  run(d, 0.5);
  const light = d.x - x;
  assert.ok(light > 3 && light < 40, `light hit: ${light.toFixed(1)} px`);
  const x2 = d.x;
  hurtEnemy(d, 5, 1, true, 'punch');
  run(d, 0.5);
  assert.ok(d.x - x2 > light, 'a heavy hit pushes further');
});

test('second phase: 30% faster, and a laser half as wide again', () => {
  const a = dragonAt(400, 450, { cd: 99 }),
    b = dragonAt(400, 450, { cd: 99, phase2: true });
  for (const d of [a, b]) Object.assign(d, { state: 'claw', t: 0 });
  run(a, 0.3);
  run(b, 0.3);
  assert.ok(Math.abs(b.t / a.t - 1.3) < 0.01);
  for (const [phase2, dy, hit] of [
    [false, 50, false],
    [true, 50, true],
  ]) {
    freshGame();
    const d = dragonAt(60, 450, { phase2 });
    Object.assign(d, { state: 'laser', t: 0, laserY: 450 });
    P.y = 450 + dy;
    run(d, (DRAGON.laser.wind + DRAGON.laser.fire) / (phase2 ? 1.3 : 1));
    assert.equal(P.hp < 100, hit, `phase2 ${phase2}`);
  }
});

test('the dragon fight has its own music, faster in the second phase', async () => {
  const { THEMES, themeFor } = await import('../src/audio.js');
  const d = spawn('dragon', 0, 600, 450);
  assert.equal(themeFor('play'), 'dragon');
  d.phase2 = true;
  assert.equal(themeFor('play'), 'dragon2');
  assert.ok(THEMES.dragon2.step < THEMES.dragon.step);
  d.state = 'dying';
  assert.equal(themeFor('play'), 'night');
  for (let n = 0; n < 256; n++) {
    THEMES.dragon.play(n, 0);
    THEMES.dragon2.play(n, 0);
  }
});
