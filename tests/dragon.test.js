import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DECOR, SUPER_HOLD, TYPES, WAVES } from '../src/config.js';
import { G, P } from '../src/state.js';
import { pressed } from '../src/input.js';
import { hurtEnemy, strike } from '../src/combat.js';
import { spawn, updEnemy } from '../src/enemies.js';
import {
  DRAGON,
  dragonHead,
  dragonZone,
  laserBand,
  laserFire,
  rageMult,
  skyBeams,
  skyFire,
  skyLines,
  updShocks,
} from '../src/dragon.js';
import { GB, GT, W } from '../src/config.js';
import { update } from '../src/world.js';
import { DT, allFinite, freshGame } from './helpers.js';
import { random, seedRandom, setRandom } from '../src/util.js';

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
  const baron = WAVES.findIndex((w) => w.sp?.[0][0] === 'boss');
  assert.deepEqual(
    WAVES.at(-1).sp.map((s) => s[0]),
    ['dragon'],
  );
  assert.equal(baron, WAVES.length - 3);
  assert.equal(WAVES.at(-2).lvl, 1, 'the last ordinary fight is the hardest');
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
  const d = dragonAt(100, 460, { laserCd: 9, plasmaCd: 9 });
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
  Object.assign(d, { state: 'walk', cd: 0, leapCd: 0, laserCd: 9, plasmaCd: 9 });
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

test('the dragon has 15%, then another 10%, then another 7% more health', () => {
  assert.equal(TYPES.dragon.hp, Math.round(900 * 1.15 * 1.1 * 1.07));
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

test('second phase: 30% faster, and a laser that burns 50% longer, widening to 2.4 times its width', () => {
  const a = dragonAt(400, 450, { cd: 99 }),
    b = dragonAt(400, 450, { cd: 99, phase2: true });
  for (const d of [a, b]) Object.assign(d, { state: 'claw', t: 0 });
  run(a, 0.3);
  run(b, 0.3);
  assert.ok(Math.abs(b.t / a.t - 1.3) < 0.01);
  const L = DRAGON.laser;
  Object.assign(b, { state: 'laser', t: L.wind });
  assert.equal(laserBand(b), L.band, 'as wide as in the first phase when it starts');
  assert.equal(laserFire(b), L.fire * 1.5, 'half as long again');
  assert.equal(laserFire(a), L.fire);
  b.t = L.wind + L.fire;
  assert.ok(laserBand(b) < L.band * 3, 'still widening where the first phase beam would end');
  b.t = L.wind + laserFire(b);
  assert.ok(
    Math.abs(laserBand(b) - L.band * 2.4) < 1e-9,
    '2.4 times as wide by the end: 20% less than 3',
  );
  Object.assign(a, { state: 'laser', t: L.wind + L.fire });
  assert.equal(laserBand(a), L.band, 'the first phase beam keeps its width');
  for (const [phase2, dy, hit] of [
    [false, 50, false],
    [true, 50, true],
    [true, 75, true],
    [true, 90, true],
    [true, 110, false], // the widest it gets is 96 px each way now (it was 120)
  ]) {
    freshGame();
    const d = dragonAt(60, 450, { phase2 });
    Object.assign(d, { state: 'laser', t: 0, laserY: 450 });
    P.y = 450 + dy;
    let early = false;
    run(d, (L.wind + laserFire(d) * 0.1) / (phase2 ? 1.3 : 1));
    early = P.hp < 100;
    run(d, (laserFire(d) * 0.9) / (phase2 ? 1.3 : 1));
    assert.equal(P.hp < 100, hit, `phase2 ${phase2}, ${dy} px off`);
    if (dy > L.band) assert.ok(!early, 'out of reach when the beam starts');
  }
});

test('far away, it spits three plasma balls in arcs that blow up where they land', () => {
  const d = dragonAt(100, 450, { laserCd: 9, pounceCd: 9 });
  P.inv = 0;
  run(d, DT);
  assert.equal(d.state, 'plasma', 'the only attack that reaches that far');
  const Q = DRAGON.plasma;
  run(d, Q.wind + Q.n * Q.gap + DT);
  const balls = G.projs.filter((q) => q.k === 'plasma');
  assert.equal(balls.length, 3);
  assert.ok(
    balls.every((q) => q.z > 100),
    'spat from the jaws, high up',
  );
  const xs = balls.map((q) => q.x + q.vx * Q.flight).sort((a, b) => a - b);
  assert.ok(xs[2] - xs[0] > Q.spread, 'spread out around the player');
  for (let i = 0; i < 1.5 / DT; i++) {
    update(DT);
    if (P.state === 'ko') break;
  }
  assert.equal(G.projs.filter((q) => q.k === 'plasma').length, 0, 'all of them came down');
  assert.ok(P.hp < 100, 'the one aimed at the player blows up under her');
  assert.ok(
    G.parts.some((p) => p.k === 'gring'),
    'with a blast',
  );
});

test('now and then it kicks a hind leg at a player close behind it', () => {
  const random = setRandom(() => 0);
  try {
    const d = dragonAt(750, 450, { cd: 99, kickCd: 0 }); // facing left, the player behind
    for (let i = 0; i < 60 && d.state !== 'kick'; i++) run(d, DT);
    assert.equal(d.state, 'kick');
    assert.equal(d.face, -1, 'it does not turn round to do it');
    run(d, DRAGON.kick.wind * 0.9);
    assert.equal(P.hp, 100, 'nothing during the wind-up');
    run(d, DRAGON.kick.wind * 0.1 + DRAGON.kick.strike);
    assert.ok(P.hp < 100, 'the kick lands');
    assert.ok(P.vx > 0, 'and knocks the player away behind it');
    run(d, DRAGON.kick.rec + 0.1);
    assert.equal(d.state, 'walk');
    // not again for a while: this time it just turns round
    Object.assign(P, { x: 750, y: 450, hp: 100, state: 'idle', inv: 0 });
    Object.assign(d, { face: -1, x: 600, behind: 0 });
    run(d, 0.8);
    assert.notEqual(d.state, 'kick');
    assert.equal(d.face, 1);
  } finally {
    setRandom(random);
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
  assert.equal(themeFor('play'), 'dragonEnd', 'its death brings the outro');
  assert.equal(themeFor('win'), 'dragonEnd', 'which plays on over the victory');
  for (let n = 0; n < 256; n++) {
    THEMES.dragon.play(n, 0);
    THEMES.dragon2.play(n, 0);
  }
});

test('the beam charges 0.3 s longer, white sparks flying out of the heart', () => {
  assert.equal(DRAGON.laser.wind, 1.3);
  const d = dragonAt(60, 450);
  Object.assign(d, { state: 'laser', t: 0, laserY: 450 });
  G.parts = [];
  run(d, 0.8);
  const hx = d.x + d.face * 25,
    hy = d.laserY - 108,
    out = G.parts.filter(
      (p) => p.col === '#ffffff' && (p.x - hx) * p.vx + (p.y - hy) * (p.vy + 40) > 0,
    );
  assert.ok(out.length > 10, `${out.length} sparks flying out`);
  assert.equal(d.state, 'laser', 'still charging');
});

test('combo: close to the player it leaps to the far side and fires the beam from there', () => {
  const d = dragonAt(650, 450, {
    retreatCd: 0,
    plasmaCd: 9,
    pounceCd: 9,
    leapCd: 9,
    last: 'claw',
  });
  run(d, DT);
  assert.equal(d.state, 'retreat');
  const R = DRAGON.retreat;
  run(d, R.crouch + R.air + DT);
  assert.equal(d.state, 'laser', 'charges the beam on landing');
  assert.ok(Math.abs(P.x - d.x) > 400, `far from the player: ${Math.abs(P.x - d.x)}`);
  assert.equal(d.face, P.x > d.x ? 1 : -1, 'facing the player');
  P.y = d.laserY;
  run(d, DRAGON.laser.wind + DRAGON.laser.fire);
  assert.ok(P.hp < 100, 'and the beam hits a player who stays in line');
});

test('second phase: it hovers and fires three beams across the arena; the gaps are safe', () => {
  const S = DRAGON.sky,
    lines = skyLines();
  assert.deepEqual(lines, [GT + S.edge, (GT + GB) / 2, GB - S.edge]);
  const gaps = [(lines[0] + lines[1]) / 2, (lines[1] + lines[2]) / 2];
  for (const [y, hurt] of [
    [lines[0], true],
    [lines[1], true],
    [lines[2], true],
    [gaps[0], false],
    [gaps[1], false],
  ]) {
    freshGame();
    const d = dragonAt(400, 450 + 100, { phase2: true, skyCd: 0, plasmaCd: 9, pounceCd: 9 });
    Object.assign(d, { leapCd: 9, retreatCd: 9, laserCd: 9, last: 'claw' });
    run(d, DT);
    assert.equal(d.state, 'sky');
    P.y = y;
    P.x = 300;
    run(d, (S.rise + S.charge) / DRAGON.rage - 0.05);
    assert.ok(d.z > S.h * 0.9, 'up in the air');
    assert.equal(dragonZone(d, d.x - 50, d.x + 50, d.y), null, 'out of reach up there');
    assert.equal(P.hp, 100, 'nothing hurts yet');
    run(d, skyFire(d) / DRAGON.rage + 0.1);
    assert.equal(P.hp < 100, hurt, `at depth ${y}`);
  }
});

test('after the sky beams it drops straight down with the shockwave', () => {
  const d = dragonAt(400, 450, { phase2: true });
  Object.assign(d, { state: 'sky', t: 0, skyX0: 600, skyY0: 450, skyX: 770, skyY: 441 });
  P.x = 100;
  const S = DRAGON.sky;
  run(d, (S.rise + S.charge + S.fire + S.rec) / DRAGON.rage);
  const [hx, hy] = [d.x, d.y];
  run(d, (S.fall + 0.05) / DRAGON.rage);
  assert.equal(d.z, 0, 'down on the ground');
  assert.ok(Math.abs(d.x - hx) < 1 && Math.abs(d.y - hy) < 1, 'right under where it hovered');
  assert.equal(G.shocks.length, 1, 'a shockwave from where it lands');
  run(d, 1.5);
  assert.equal(d.state, 'walk');
});

test('the sky beams run from edge to edge: under the dragon is not safe', () => {
  const S = DRAGON.sky;
  for (const px of [790, 930]) {
    // right under it, and behind it at the edge it hovers by
    freshGame();
    const d = dragonAt(400, 450, { phase2: true });
    Object.assign(d, { state: 'sky', t: 0, skyX0: 770, skyY0: 441, skyX: 770, skyY: 441 });
    P.x = px;
    P.y = skyLines()[1];
    run(d, (S.rise + S.charge + S.fire) / DRAGON.rage + 0.05);
    assert.ok(P.hp < 100, `hit at x ${px}`);
  }
});

test('the sky beams come from the turning head, all three at once, slowly, leaving a trail', () => {
  const S = DRAGON.sky;
  assert.ok(Math.abs(S.sweep - 1.25 / 0.7) < 1e-9, '30% slower than the 1.25 s sweep');
  const d = dragonAt(400, 450 + 100, { phase2: true });
  P.x = 2000; // out of the way
  Object.assign(d, { state: 'sky', t: 0, skyX0: 770, skyY0: 441, skyX: 770, skyY: 441 });
  const xs = [],
    rots = new Set();
  let maxTrail = 0;
  for (let i = 0; i < (S.rise + S.charge + S.fire) / DRAGON.rage / DT; i++) {
    run(d, DT);
    if (d.beams) {
      assert.equal(d.beams.length, 3, 'three beams together');
      assert.deepEqual(
        d.beams.map((b) => b.y),
        skyLines(),
      );
      xs.push(d.beams[0].x);
    }
    rots.add(Math.round(dragonHead(d).rot * 10));
    maxTrail = Math.max(maxTrail, d.trail.length);
  }
  assert.ok(xs.length > 30, 'they fire');
  assert.ok(
    xs.every((x, i) => i === 0 || (x - xs[i - 1]) * d.face >= 0),
    'they move one way only',
  );
  assert.ok(Math.abs(xs.at(-1) - xs[0]) > 600, 'across the arena');
  assert.ok(rots.size > 3, 'the head turns as it aims');
  assert.ok(maxTrail > 60, 'the ground burns where the beams pass');
  run(d, S.trail + 2);
  assert.equal(d.trail.length, 0, 'and the trail fades');
});

test('entering the second phase it is only half the bonus faster, growing to all of it', () => {
  const d = dragonAt(400, 450, { last: 'claw' });
  assert.equal(rageMult(d), 1);
  d.hp = TYPES.dragon.hp * DRAGON.phase2 - 1;
  run(d, DT);
  assert.equal(d.state, 'roar');
  assert.ok(Math.abs(rageMult(d) - (1 + (DRAGON.rage - 1) / 2)) < 0.01, `${rageMult(d)}`);
  run(d, DRAGON.rageRamp / 2);
  const mid = rageMult(d);
  assert.ok(mid > 1.17 && mid < 1.25, `halfway: ${mid}`);
  run(d, DRAGON.rageRamp);
  assert.equal(rageMult(d), DRAGON.rage, 'then all of it');
});

test('the sky beams: always all three at once, side by side or in a row led by the top or the bottom', () => {
  const S = DRAGON.sky;
  assert.deepEqual(S.ways, ['all', 'down', 'up']);
  for (const [way, first, last] of [
    ['down', 0, 2],
    ['up', 2, 0],
  ]) {
    const d = dragonAt(400, 450 + 100, { phase2: true });
    Object.assign(d, { state: 'sky', t: 0, skyX0: 770, skyY0: 441, skyX: 770, skyY: 441 });
    d.skyWay = way;
    d.face = -1;
    const lines = skyLines();
    for (const tf of [0.05, S.sweep * 0.5, skyFire(d) - 0.05]) {
      const bs = skyBeams(d, tf);
      assert.equal(bs.length, 3, 'all three at once');
      assert.deepEqual(
        bs.map((b) => lines.indexOf(b.y)),
        [first, 1, last],
      );
    }
    // in the middle of it all three are on their way, the leading one furthest along
    const mid = skyBeams(d, skyFire(d) / 2);
    assert.ok(mid.every((b) => b.live));
    assert.ok((mid[0].x - mid[1].x) * d.face > 0 && (mid[1].x - mid[2].x) * d.face > 0);
  }
  // side by side: level with each other all the way
  const d = dragonAt(400, 450 + 100, { phase2: true });
  d.skyWay = 'all';
  const bs = skyBeams(d, S.sweep / 2);
  assert.ok(bs.every((b) => b.x === bs[0].x));
  // each way comes up
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    freshGame();
    const d = dragonAt(400, 450 + 100, { phase2: true, skyCd: 0, plasmaCd: 9, pounceCd: 9 });
    Object.assign(d, { leapCd: 9, retreatCd: 9, laserCd: 9, last: 'claw' });
    seedRandom(i + 7);
    run(d, DT);
    if (d.state === 'sky') seen.add(d.skyWay);
  }
  assert.equal(seen.size, 3);
});
