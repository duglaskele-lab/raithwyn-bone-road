import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EVIL, GB, GT, LUCK, TYPES, WAVES, W } from '../src/config.js';
import { G, P } from '../src/state.js';
import { spawn, updEnemy } from '../src/enemies.js';
import { hurtEnemy } from '../src/combat.js';
import { update } from '../src/world.js';
import { waveSpawns } from '../src/waves.js';
import { themeFor } from '../src/audio.js';
import { FOES } from '../src/foes/index.js';
import { evilFrame, evilShown, orbSpot, stageOf } from '../src/foes/evil.js';
import { DT, freshGame } from './helpers.js';

// Lucy's luck could have her dodge a blow at random: these tests are about Raithwyn's blows
const evade = LUCK.evade;
beforeEach(() => {
  freshGame();
  LUCK.evade = 0;
});
afterEach(() => (LUCK.evade = evade));

const step = (seconds, each) => {
  for (let i = 0; i < seconds / DT; i++) {
    update(DT);
    each?.(i);
  }
};
/** The dragon's arena with Raithwyn in it, `dx` in front of Lucy, everything cooling down. */
function arena(dx = 400, extra = {}) {
  P.who = 'lucy';
  G.banner = null;
  G.waveI = 99;
  G.props = [];
  G.cam = WAVES.at(-1).x;
  Object.assign(P, { x: G.cam + 300, y: (GT + GB) / 2, inv: 0 });
  const e = spawn('evil', 1, P.x + dx, P.y);
  Object.assign(
    e,
    {
      state: 'chase',
      t: 0,
      face: dx > 0 ? -1 : 1,
      comboCd: 99,
      ballCd: 99,
      boneCd: 99,
      jumpCd: 99,
      summoned: true,
    },
    extra,
  );
  return e;
}
const hold = (e) => Object.assign(e, { comboCd: 99, ballCd: 99, boneCd: 99, jumpCd: 99 });

test("the Bone Road ends with Raithwyn for anyone but Raithwyn, with the dragon's music", () => {
  const last = WAVES.length - 1;
  P.who = 'raithwyn';
  assert.equal(waveSpawns(last)[0][0], 'dragon');
  P.who = 'lucy';
  assert.equal(waveSpawns(last)[0][0], 'evil');
  assert.equal(TYPES.evil.bigBoss, 1);
  const e = arena();
  assert.equal(themeFor('play', [e]), 'dragon');
  e.hp = e.T.hp * 0.2;
  e.stage = 3;
  assert.equal(themeFor('play', [e]), 'dragon2');
  P.who = 'raithwyn';
});

test('three stages by her health, with no show of a change', () => {
  const e = arena();
  for (const [f, st] of [
    [1, 1],
    [0.7, 1],
    [0.6, 2],
    [0.4, 2],
    [0.3, 3],
  ]) {
    e.hp = e.T.hp * f;
    assert.equal(stageOf(e), st, `${f}`);
  }
});

test('her dark ball: level I, II, III by stage, gathered longer each time; it hurts the player', () => {
  const winds = [];
  for (const st of [1, 2, 3]) {
    freshGame();
    const e = arena(450);
    e.hp = e.T.hp * [0.9, 0.55, 0.2][st - 1];
    e.ballCd = 0;
    step(DT * 2);
    assert.equal(e.state, 'eball');
    assert.equal(e.lv, st);
    let t = 0;
    while (e.state === 'eball' && t < 3) {
      step(DT, () => hold(e));
      t += DT;
    }
    winds.push(t);
    step(0.2, () => hold(e));
    const q = G.projs.find((p) => p.k === 'ehado');
    assert.ok(q && q.lv === st);
    const hp = P.hp;
    step(1.2, () => hold(e));
    assert.ok(P.hp < hp, `level ${st} hurts`);
  }
  assert.ok(winds[0] < winds[1] && winds[1] < winds[2], `gathered longer: ${winds}`);
});

test('her bone: one in the first stages, a fan of three in the third', () => {
  for (const [f, n] of [
    [0.9, 1],
    [0.55, 1],
    [0.2, 3],
  ]) {
    freshGame();
    const e = arena(400);
    e.hp = e.T.hp * f;
    e.rage = 0;
    e.boneCd = 0;
    step(DT * 2);
    assert.equal(e.state, 'bthrow');
    step(EVIL.bone.wind + 0.05, () => hold(e));
    const bones = G.projs.filter((q) => q.k === 'ebone');
    assert.equal(bones.length, n);
    if (n === 3) assert.ok(bones.some((q) => q.vy < 0) && bones.some((q) => q.vy > 0), 'a fan');
  }
});

test('her chain of punches: a glint, three hits, the last knocks down', () => {
  const e = arena(80);
  e.comboCd = 0;
  step(DT * 2);
  assert.equal(e.state, 'c0');
  step(EVIL.combo.glint + 0.9, () => {
    e.ballCd = e.boneCd = e.jumpCd = 99;
    P.x = Math.min(P.x, e.x - 40);
  });
  assert.ok(P.hp < 100);
  assert.ok(['ko', 'down', 'getup'].includes(P.state));
});

test('she leaps back from an attack up close; with a wall behind her, the other way', () => {
  const e = arena(90);
  e.jumpCd = 0;
  P.state = 'atk1';
  P.face = 1;
  const x = e.x;
  for (let i = 0; i < 120 && e.state !== 'bjump'; i++) {
    updEnemy(e, DT, { n: 0 });
    P.state = 'atk1';
  }
  assert.equal(e.state, 'bjump');
  assert.ok(e.x1 > x + 100, 'away from her');
  assert.ok(!FOES.evil.immune(e), 'not out of reach as she leaps');
  // at the right wall: over the player to the left
  freshGame();
  const f = arena(90);
  f.x = G.cam + W - 80;
  P.x = f.x - 90;
  f.jumpCd = 0;
  for (let i = 0; i < 120 && f.state !== 'bjump'; i++) {
    updEnemy(f, DT, { n: 0 });
    P.state = 'atk1';
  }
  assert.equal(f.state, 'bjump');
  assert.ok(f.x1 < P.x, 'over her');
});

test('rage: none in the first stage, from blows in the second, by itself in the third', () => {
  const e = arena(500);
  hurtEnemy(e, 5, 1, false, 'punch');
  assert.equal(e.rage, 0, 'first stage: no rage');
  e.hp = e.T.hp * 0.6;
  updEnemy(e, DT, { n: 0 });
  hurtEnemy(e, 5, 1, false, 'punch');
  assert.ok(e.rage > 0, 'second stage: a blow taken');
  const r = e.rage;
  step(1, () => hold(e));
  assert.ok(Math.abs(e.rage - r) < 0.01, 'no rage by itself yet');
  e.hp = e.T.hp * 0.3;
  step(1, () => hold(e));
  assert.ok(e.rage > r + EVIL.rage.passive * 0.8, 'third stage: it fills by itself');
});

test('her super: a heavy blow breaks it and empties her rage; not in the third stage', () => {
  const e = arena(500);
  e.hp = e.T.hp * 0.6;
  e.rage = EVIL.rage.max;
  step(DT * 2, () => hold(e));
  assert.equal(e.state, 'scharge');
  assert.ok(!FOES.evil.unstoppable(e));
  hurtEnemy(e, 5, 1, false, 'punch');
  assert.equal(e.state, 'scharge', 'a plain hit does not break it');
  hurtEnemy(e, 5, 1, true, 'punch');
  assert.equal(e.state, 'air', 'a heavy blow throws her');
  assert.equal(e.rage, 0);
  // the third stage
  freshGame();
  const f = arena(500);
  f.hp = f.T.hp * 0.3;
  f.rage = EVIL.rage.max;
  step(DT * 2, () => hold(f));
  assert.equal(f.state, 'scharge');
  assert.ok(FOES.evil.unstoppable(f), 'a red outline');
  hurtEnemy(f, 5, 1, true, 'hado3');
  assert.equal(f.state, 'scharge', 'nothing breaks it');
});

test('the orb rises over the arena, three beams burn the ground for five seconds; she keeps away', () => {
  const e = arena(500);
  e.hp = e.T.hp * 0.6;
  e.summoned = true;
  e.rage = EVIL.rage.max;
  P.inv = 99;
  step(EVIL.orb.charge + 0.1, () => hold(e));
  assert.ok(e.orb, 'out');
  assert.equal(e.rage, 0);
  step(EVIL.orb.rise + EVIL.orb.warn + 0.5, () => ((P.inv = 99), hold(e)));
  assert.ok(e.orb.z > EVIL.orb.z * 0.9, 'up over the arena');
  assert.equal(e.orb.spots.length, 3);
  // three paths of their own
  const a = [0, 1, 2].map((i) => orbSpot(i, 1)),
    b = [0, 1, 2].map((i) => orbSpot(i, 2));
  assert.ok(new Set(a.map((p, i) => Math.round(p[0] - b[i][0]))).size === 3);
  assert.ok(G.pools.filter((p) => p.fire && p.dark).length > 10, 'the ground burns');
  assert.equal(e.state, 'roam');
  // she starts no attack while it burns
  Object.assign(e, { comboCd: 0, ballCd: 0, boneCd: 0 });
  step(2, () => (P.inv = 99));
  assert.ok(!['c0', 'eball', 'bthrow', 'scharge'].includes(e.state));
  assert.ok(!G.projs.some((q) => q.k === 'ehado' || q.k === 'ebone'));
  step(EVIL.orb.life, () => ((P.inv = 99), hold(e)));
  assert.equal(e.orb, null, 'gone after five seconds');
  // a beam that runs over the player hurts her
  freshGame();
  const f = arena(500);
  f.orb = { t: EVIL.orb.rise + EVIL.orb.warn + 1, x0: 0, y0: 0, z0: 0, cd: [0, 0, 0], burnT: 0 };
  const [sx, sy] = orbSpot(0, 1 + DT);
  Object.assign(P, { x: sx, y: sy });
  step(DT);
  assert.ok(P.hp < 100);
});

test('at half health she calls up the dandy: tough, hurt by both sides, it falls with her', () => {
  assert.equal(TYPES.dandy.hp, 2000);
  const e = arena(500, { summoned: false });
  e.hp = e.T.hp * 0.49;
  e.rage = 0;
  P.inv = 99;
  step(1.2, () => ((P.inv = 99), hold(e)));
  const d = G.enemies.find((o) => o.type === 'dandy');
  assert.ok(d, 'called up');
  step(1, () => ((P.inv = 99), hold(e)));
  let hp = d.hp;
  assert.ok(hurtEnemy(d, 20, 1, false, 'punch'), 'the player hurts it');
  assert.equal(d.hp, hp - 20);
  hp = d.hp;
  G.freeze = 0;
  // and her dark ball does too
  G.projs.push({
    k: 'ehado',
    lv: 1,
    x: d.x - 30,
    y: d.y,
    z: 104,
    vx: 300,
    dmg: 12,
    owner: e,
    hit: new Set(),
    life: 1,
  });
  step(0.2, () => ((P.inv = 99), hold(e)));
  assert.ok(d.hp < hp, 'her own ball hurts it');
  // she falls: so does it
  e.hp = 1;
  hurtEnemy(e, 10, 1, true, 'punch');
  assert.ok(e.dying);
  assert.ok(d.dead, 'gone with her');
});

test("she walks at the heroine's pace, and runs at it now and then", () => {
  assert.equal(TYPES.evil.speed, 180);
  assert.equal(EVIL.run.speed, 435);
  assert.ok(EVIL.run.toward[0] < EVIL.run.toward[2], 'in the first stage she mostly walks');
  const e = arena(600);
  hold(e);
  e.runCd = 0;
  let ran = false;
  for (let i = 0; i < 6 / DT && !ran; i++) {
    updEnemy(e, DT, { n: 0 });
    hold(e);
    e.rushCd = 99;
    if (e.state === 'erun') ran = true;
    if (e.state === 'chase') e.x = Math.max(e.x, P.x + 500);
  }
  assert.ok(ran, 'she runs to close in');
  const x = e.x;
  updEnemy(e, DT, { n: 0 });
  assert.ok(Math.abs(Math.abs(x - e.x) - EVIL.run.speed * DT) < 1, "at the heroine's run");
});

test('the running jump kick: she runs straight, gathering speed, then leaps and kicks', () => {
  const e = arena(600);
  e.rushCd = 0;
  step(DT * 2);
  assert.equal(e.state, 'rrun');
  const x0 = e.x;
  step(0.1, () => hold(e));
  const slow = Math.abs(e.x - x0) / 0.1;
  const x1 = e.x;
  step(0.3, () => hold(e));
  const fast = Math.abs(e.x - x1) / 0.3;
  assert.ok(fast > slow * 1.3, `faster as she goes: ${slow} -> ${fast}`);
  for (let i = 0; i < 120 && e.state === 'rrun'; i++) step(DT, () => hold(e));
  assert.equal(e.state, 'rjump');
  step(EVIL.rush.jump + 0.1, () => hold(e));
  assert.ok(P.hp <= 100 - EVIL.rush.dmg, 'kicked');
  assert.ok(['ko', 'down', 'getup'].includes(P.state), 'and down');
});

test('she takes blows like a light enemy; her ball from the second stage cannot be stopped', () => {
  const e = arena(400);
  hurtEnemy(e, 5, 1, false, 'punch');
  assert.equal(e.state, 'hurt', 'a plain hit stops her');
  for (const [f, lv, stops] of [
    [0.9, 1, true],
    [0.55, 2, false],
    [0.2, 3, false],
  ]) {
    freshGame();
    const g = arena(450);
    g.hp = g.T.hp * f;
    g.ballCd = 0;
    step(DT * 2);
    assert.equal(g.state, 'eball');
    assert.equal(g.lv, lv);
    assert.deepEqual(evilFrame(g), ['hado', 1], 'the ball held at her side');
    assert.equal(!!FOES.evil.unstoppable(g), !stops);
    hurtEnemy(g, 5, 1, true, 'punch');
    assert.equal(g.state !== 'eball', stops, `stage ${lv}`);
  }
});

test("before the orb's beams: red marks on the ground, and no harm yet", () => {
  const e = arena(500);
  const O = EVIL.orb;
  e.orb = { t: O.rise + 0.1, x0: e.x, y0: e.y, z0: 112, cd: [0, 0, 0], burnT: 0 };
  const [sx, sy] = orbSpot(0, 0);
  Object.assign(P, { x: sx, y: sy });
  step(O.warn * 0.8, () => hold(e));
  assert.equal(P.hp, 100, 'the warning hurts nobody');
  assert.ok(!e.orb.spots, 'no beams yet');
  assert.ok(typeof FOES.evil.ground === 'function', 'the marks are drawn on the ground');
  step(O.warn * 0.3, () => hold(e));
  assert.ok(e.orb.spots, 'then the beams come');
});

test('four blows in 2.5 s: medium for 2.5 s; two more meanwhile: heavy for 3 s', () => {
  const S = EVIL.steady;
  assert.deepEqual([S.hits, S.window, S.t, S.more, S.heavyT], [4, 2.5, 2.5, 2, 3]);
  const e = arena(400);
  for (let i = 0; i < 3; i++) {
    hurtEnemy(e, 1, 1, false, 'punch');
    G.time += 0.5;
  }
  assert.equal(e.weight, undefined, 'three are not enough');
  hurtEnemy(e, 1, 1, false, 'punch');
  assert.equal(e.weight, 'medium');
  // as a medium enemy, one heavy blow only staggers her
  Object.assign(e, { state: 'chase', t: 0 });
  hurtEnemy(e, 1, 1, true, 'punch');
  assert.notEqual(e.state, 'air', 'not thrown by one heavy blow');
  // one more blow (two in all while medium): heavy
  hurtEnemy(e, 1, 1, false, 'punch');
  assert.equal(e.weight, 'heavy');
  // heavy: a heavy blow does not throw her, nor a launcher; only a crushing one does
  Object.assign(e, { state: 'chase', t: 0 });
  hurtEnemy(e, 1, 1, true, 'punch', true);
  assert.notEqual(e.state, 'air', 'no juggling her');
  step(2.8, () => hold(e));
  assert.equal(e.weight, 'heavy', 'still heavy short of three seconds');
  step(0.5, () => hold(e));
  assert.equal(e.weight, undefined, 'light again');
  // four blows spread over more than 2.5 seconds do nothing
  for (let i = 0; i < 4; i++) {
    hurtEnemy(e, 1, 1, false, 'punch');
    G.time += 0.9;
  }
  assert.equal(e.weight, undefined);
});

test('she throws no bone at a player within a quarter of the screen', () => {
  assert.ok(EVIL.bone.min >= W / 4);
  const e = arena(W / 4 - 20);
  e.hp = e.T.hp * 0.9;
  e.boneCd = 0;
  for (let i = 0; i < 30; i++) {
    updEnemy(e, DT, { n: 9 });
    Object.assign(e, { comboCd: 99, ballCd: 99, jumpCd: 99, runCd: 99, rushCd: 99, boneCd: 0 });
    e.x = P.x + W / 4 - 20;
  }
  assert.ok(!G.projs.some((q) => q.k === 'ebone'));
  assert.notEqual(e.state, 'bthrow');
});
test('like the heroine, she mostly faces the way she walks, even away from the player', () => {
  const F = EVIL.face;
  const e = arena(60);
  hold(e);
  Object.assign(e, { cd: 99, engage: false, backpedal: false, bpT: 99, ox: 300, oy: 0, oyT: 99 });
  let away = 0,
    moving = 0;
  for (let i = 0; i < 90; i++) {
    const x = e.x;
    updEnemy(e, DT, { n: 9 });
    hold(e);
    e.cd = 99;
    if (e.x - x > F.min * DT) {
      moving++;
      if (e.face === 1) away++;
    }
  }
  assert.ok(moving > 20, 'she walks away from the player');
  assert.ok(away > moving * 0.7, `facing the way she goes: ${away}/${moving}`);
  // with a backpedal chosen she steps back near the player still facing her
  freshGame();
  const f = arena(60);
  hold(f);
  Object.assign(f, { cd: 99, engage: false, backpedal: true, bpT: 99, ox: 100, oy: 0, oyT: 99 });
  let facing = 0;
  for (let i = 0; i < 30; i++) {
    updEnemy(f, DT, { n: 9 });
    hold(f);
    f.cd = 99;
    if (f.face === -1) facing++;
  }
  assert.equal(facing, 30, 'backpedalling, she keeps her eyes on the player');
});

test('her coming: bats wheel round the spot, a mist gathers, then she steps out laughing', () => {
  P.who = 'lucy';
  G.waveI = 99;
  G.cam = WAVES.at(-1).x;
  Object.assign(P, { x: G.cam + 200, y: (GT + GB) / 2 });
  const e = spawn('evil', 1);
  const I = EVIL.intro;
  assert.equal(e.state, 'eintro');
  assert.ok(G.parts.filter((p) => p.k === 'bat').length >= 8, 'bats wheel round the spot');
  assert.equal(evilShown(e), 0);
  assert.ok(FOES.evil.hidden(e), 'no one there yet (not even a shadow)');
  step(I.bats);
  assert.equal(evilShown(e), 0, 'still only bats and mist');
  assert.ok(
    G.parts.some((p) => p.k === 'mist'),
    'the mist gathers',
  );
  assert.equal(hurtEnemy(e, 50, 1, true, 'punch'), false, 'nothing hurts her meanwhile');
  step(I.mist + 0.05);
  assert.equal(evilShown(e), 1, 'she is out of the mist');
  assert.equal(evilFrame(e)[0], 'laugh');
  assert.equal(e.state, 'eintro');
  step(I.laugh);
  assert.notEqual(e.state, 'eintro');
  assert.equal(e.hp, e.T.hp);
});

test('from the second stage she vanishes in mist and bats and comes back somewhere else', (t) => {
  const rate = EVIL.tele.rate;
  EVIL.tele.rate = 1000;
  t.after(() => (EVIL.tele.rate = rate));
  const e = arena(300, { teleCd: 0, rushCd: 99, runCd: 99 });
  step(0.5, () => hold(e));
  assert.notEqual(e.state, 'tout', 'not in the first stage');
  e.hp = e.T.hp * 0.6;
  Object.assign(e, { state: 'chase', t: 0, teleCd: 0 });
  step(DT * 2, () => hold(e));
  assert.equal(e.state, 'tout');
  const x0 = e.x,
    T = EVIL.tele;
  assert.ok(G.parts.some((p) => p.k === 'bat') && G.parts.some((p) => p.k === 'mist'));
  step(T.out + DT * 2, () => hold(e));
  assert.equal(e.state, 'tgone');
  assert.ok(FOES.evil.hidden(e), 'gone');
  assert.equal(hurtEnemy(e, 50, 1, true, 'punch'), false, 'and nothing can touch her');
  step(T.gone, () => hold(e));
  assert.equal(e.state, 'tin');
  assert.ok(Math.abs(e.x - P.x) >= T.min - 1, `well away from the player (${e.x - P.x})`);
  assert.ok(Math.abs(e.x - x0) > 100, 'somewhere else');
  assert.ok(e.x > G.cam + 60 && e.x < G.cam + W - 60, 'on screen');
  step(T.in + DT * 2, () => hold(e));
  assert.equal(evilShown(e), 1);
  assert.ok(!['tout', 'tgone', 'tin'].includes(e.state));
  assert.ok(e.teleCd >= T.cd[0] - T.in - T.gone - T.out - 0.1, 'and not again for a while');
});
