import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  BEAST,
  BOULDER,
  DECOR,
  FROST,
  GNOME,
  HARPY,
  MINO,
  POISE,
  POTION,
  STAGE_HOLD,
  TYPES,
  W,
} from '../src/config.js';
import { APP, G, P } from '../src/state.js';
import { keys, pressed } from '../src/input.js';
import { spawn } from '../src/enemies.js';
import { headBonus, hitPlayer, hurtEnemy, partZone, poiseView } from '../src/combat.js';
import { update, alive } from '../src/world.js';
import { themeFor } from '../src/audio.js';
import {
  camTo,
  LAST_LEVEL,
  level,
  onFloor,
  overPit,
  pathAt,
  pathPx,
  startLevel,
} from '../src/level.js';
import { FLOOR, L4, PATH, PITS, WAVES4, topY } from '../src/level4.js';
import { waveSpawns } from '../src/waves.js';
import { dismount, tryMount } from '../src/foes/beasts.js';
import { isOpen } from '../src/foes/frostwolf.js';
import { go } from '../src/foes/kit.js';
import { FOES } from '../src/foes/index.js';
import '../src/foes/index.js';
import { DT, freshGame } from './helpers.js';

beforeEach(freshGame);

const step = (seconds, each) => {
  for (let i = 0; i < seconds / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
    each?.(i);
  }
};
/** Frostfang Pass, the camera and the player at `d` pixels along the road, no fight on. */
function pass(d = 0) {
  startLevel(4);
  G.banner = null;
  G.waveI = 99;
  G.props = [];
  camTo(d);
  const c = pathAt(d);
  Object.assign(P, { x: c.x, y: c.y, inv: 0, face: 1 });
}
/** The camera at fight `i` (no fight on yet). */
const atWave = (i) => pass(pathPx(WAVES4[i].s, PATH));
/** A fight that does not end by itself: `e` is in it. */
function holdFight(e) {
  G.wave = { sp: [[e.type, 1, 0]], t: 0 };
  G.wave.sp[0].done = true;
}

// --- the stage -------------------------------------------------------------------------------

test('holding Z and 4 on the first screen of the Bone Road takes the player to Frostfang Pass', () => {
  keys.lvlZ = true;
  keys.lvl4 = true;
  step(STAGE_HOLD + 0.2);
  assert.equal(G.level, 4);
  assert.equal(G.waveI, 0);
  assert.ok(
    G.props.length > 20 && G.props.every((u) => DECOR[u.decor].k4),
    'its own things to break',
  );
  assert.ok(
    G.props.every((u) => onFloor(u.x, u.y)),
    'every one of them on the floor',
  );
});

test('Frostfang Pass is the last stage: winning it wins the game', () => {
  assert.equal(LAST_LEVEL, 4);
  startLevel(4);
  APP.state = 'win';
  G.endT = 8;
  pressed.atk = true;
  update(DT);
  assert.equal(G.level, 4);
  assert.equal(APP.state, 'win');
});

test('the road: the village, the climb into the hills, the steep trail down, the ledge, the forest', () => {
  startLevel(4);
  assert.equal(topY(100), L4.Y_A);
  assert.equal(topY(4000), L4.Y_B);
  assert.equal(topY(6000), L4.Y_C);
  assert.equal(topY(11000), L4.Y_D);
  assert.ok(L4.Y_B < L4.Y_A, 'it climbs into the hills');
  assert.ok(L4.Y_C > L4.Y_B && L4.Y_D > L4.Y_C, 'and goes down the other side, twice');
  // the steep trail: a slant from the hill road down to the ledge, steeper than the others
  const [s0, s1] = L4.SLOPE;
  assert.equal(L4.Y_C - L4.Y_B, (s1 - s0) * L4.STEEP);
  assert.ok(L4.STEEP > L4.DROP);
  for (let x = s0 + 50; x <= s1 - 50; x += 100) {
    const y = topY(x);
    assert.ok(Math.abs(y - (L4.Y_B + (x - s0) * L4.STEEP)) < 1e-9);
    assert.ok(onFloor(x, y + 90), `on the trail at ${x}`);
    assert.ok(!onFloor(x, y - 30) && !onFloor(x, y + 230), 'beside it, none');
  }
  // the plank bridge over the gorge, and the gorge on either side of it
  const bx = (L4.FALLS[0] + L4.FALLS[1]) / 2;
  assert.ok(onFloor(bx, L4.Y_C + 80));
  assert.ok(overPit(bx, L4.Y_C + 20) && overPit(bx, L4.Y_C + 140));
  assert.equal(PITS.length, 2);
  assert.ok(FLOOR.length >= 8);
});

test('nowhere does the road go straight up the screen: the camera goes ever to the right', () => {
  for (let i = 1; i < PATH.length; i++) assert.ok(PATH[i][0] > PATH[i - 1][0], `node ${i}`);
  const top = pathAt(pathPx(3, PATH), PATH),
    foot = pathAt(pathPx(4, PATH), PATH);
  assert.ok(foot.cx > top.cx + 700 && foot.cy > top.cy + 300, 'down the steep trail, aslant');
  // no fight on a slant; the rockslide waits on the first flat screen at the foot of the trail
  startLevel(4);
  camTo(pathPx(WAVES4.find((w) => w.name === 'rockslide').s, PATH));
  assert.equal(Math.round(G.cam), L4.SLOPE[1]);
});

test('the fights: a minotaur at the pool under the falls, the frost wolf last', () => {
  const m = WAVES4.find((w) => w.sp?.[0][0] === 'minotaur');
  assert.ok(m && m.boss && m.banner);
  assert.equal(WAVES4.at(-1).sp[0][0], 'frostwolf');
  assert.ok(WAVES4.at(-1).final);
  startLevel(4);
  assert.deepEqual(level().boss, ['@frostwolf', 'frostwolfBanner']);
  // every other fight has an idea of its own: its foes are fixed, a few plain ones join them
  startLevel(4);
  const sp = waveSpawns(0);
  assert.ok(
    sp.some((s) => s[0] === 'rider'),
    'a rider rides in',
  );
  const fights = WAVES4.filter((w) => !w.sp);
  assert.equal(new Set(fights.map((w) => w.name)).size, fights.length);
  WAVES4.forEach((w, i) => {
    for (const q of waveSpawns(i).concat(w.mid ?? [])) assert.ok(q[0] in TYPES, q[0]);
  });
  const all = fights.flatMap((w) => w.core.concat(w.mid ?? []).map((q) => q[0]));
  for (const k of [
    'bandit',
    'amazon',
    'knight',
    'giant',
    'harpy',
    'wolf',
    'rider',
    'drake',
    'gnome',
  ])
    assert.ok(all.includes(k), k);
  // the stage is no longer than the Bone Road's dozen fights
  assert.ok(WAVES4.length <= 12);
});

test('the music: the quest on the road, the boss theme for the minotaur and the frost wolf', () => {
  startLevel(4);
  assert.equal(themeFor('play', [], null), 'pass');
  G.waveI = WAVES4.findIndex((w) => w.sp?.[0][0] === 'minotaur');
  assert.equal(themeFor('play', [], { sp: [] }), 'passBoss');
});

// --- the beasts ---------------------------------------------------------------------------------

test('a bandit rides a beast in; a blow knocks him out of the saddle and the beast stands free', () => {
  pass(300);
  const b = spawn('rider', 1);
  const r = b.rider;
  assert.ok(r && r.type === 'bandit' && r.steed === b && r.state === 'saddle');
  assert.ok(b.neutral, 'the beast takes no side');
  step(0.5);
  assert.equal(r.z, BEAST.rider.seat, 'up in the saddle');
  assert.ok(hurtEnemy(r, 8, 1, false, 'punch'));
  assert.equal(r.steed, null);
  assert.equal(b.rider, null);
  assert.equal(r.state, 'air', 'thrown off');
  // a fight is over without the beast
  assert.deepEqual(alive(), [r]);
});

test('the beasts are never hurt: a blow on one is nothing', () => {
  pass(300);
  const b = spawn('drake', 1, P.x + 60, P.y);
  assert.equal(hurtEnemy(b, 50, 1, true, 'punch'), false);
  assert.equal(b.hp, TYPES.drake.hp);
});

test('she jumps onto a free beast and rides it; J makes it whip its tail at her foes', () => {
  pass(300);
  const b = spawn('rider', 1, P.x + 20, P.y);
  const foe = spawn('bandit', 1, P.x + 110, P.y);
  Object.assign(foe, { state: 'chase', cd: 99 });
  holdFight(foe);
  P.state = 'jump';
  P.ph = 1;
  P.z = 40;
  P.vz = -10;
  P.vx = P.vyd = 0;
  step(DT);
  assert.equal(P.state, 'ride');
  assert.equal(P.steed, b);
  assert.ok(b.byP);
  // it goes where she steers it
  keys.r = true;
  step(0.3);
  keys.r = false;
  assert.ok(Math.abs(b.x - P.x) < 1 && b.moving !== undefined);
  foe.x = P.x + 100;
  foe.y = P.y;
  const hp = foe.hp;
  pressed.atk = true;
  step(BEAST.rider.wind + 0.3);
  assert.ok(foe.hp < hp, 'the tail struck');
});

test('a blow throws her out of the saddle; the beast is free again', () => {
  pass(300);
  const b = spawn('drake', 1, P.x, P.y);
  P.state = 'jump';
  P.z = 30;
  assert.ok(tryMount(P));
  assert.equal(P.state, 'ride');
  const foe = spawn('bandit', 1, P.x + 60, P.y);
  foe.state = 'attack';
  foe.face = -1;
  step(0.3);
  assert.notEqual(P.state, 'ride');
  assert.equal(P.steed, null);
  assert.ok(!b.byP);
});

test('a tap of the jump button makes the beast jump with her; held two seconds, she gets down', () => {
  pass(300);
  const b = spawn('rider', 1, P.x, P.y);
  P.state = 'jump';
  P.z = 30;
  tryMount(P);
  pressed.jump = true;
  step(DT * 3);
  assert.equal(P.state, 'ride', 'still in the saddle');
  assert.ok(b.z > 0 && P.z > 0, 'up they go together');
  step(1);
  assert.equal(b.z, 0, 'and down again');
  assert.equal(P.state, 'ride');
  // the button held: not yet, then down she gets
  keys.jump = true;
  step(BEAST.off - 0.3);
  assert.equal(P.state, 'ride');
  step(0.5);
  keys.jump = false;
  assert.notEqual(P.state, 'ride');
  assert.equal(P.steed, null);
  assert.equal(P.z, 0, 'on the ground beside it');
  assert.equal(b.byP, false);
  assert.ok(!b.lost, 'getting down is not being thrown');
});

test('left alone a beast runs off, unless a bandit climbs back on', () => {
  pass(300);
  const b = spawn('rider', 1, P.x, P.y);
  P.state = 'jump';
  P.z = 30;
  tryMount(P);
  dismount(P);
  P.state = 'idle';
  // a bandit walks up to it and climbs on
  const r = spawn('bandit', 1, b.x + 250, b.y);
  Object.assign(r, { state: 'chase', cd: 0 });
  P.x = b.x - 300;
  step(3);
  assert.equal(b.rider, r, 'back in the saddle');
  // knocked off again, nobody comes this time: off it runs
  hurtEnemy(r, 999, 1, true, 'punch');
  step(BEAST.stay + 4);
  assert.ok(b.dead, 'gone');
});

test('a beast that has lost its rider three times runs off at once', () => {
  pass(300);
  assert.equal(BEAST.lose, 3);
  const b = spawn('drake', 1);
  Object.assign(b, { x: P.x + 200, y: P.y });
  // its bandit is knocked out of the saddle
  hurtEnemy(b.rider, 999, 1, true, 'punch');
  assert.equal(b.lost, 1);
  assert.equal(b.state, 'bwalk');
  // she is thrown out of it twice
  for (let k = 0; k < 2; k++) {
    Object.assign(P, { state: 'jump', x: b.x, y: b.y, z: 30, inv: 0 });
    assert.ok(tryMount(P), 'she may still take it');
    hitPlayer(1, 1, false);
    step(0.3, () => (P.inv = 99));
  }
  assert.equal(b.lost, 3);
  assert.equal(b.state, 'bleave', 'it has had enough');
  Object.assign(P, { state: 'jump', x: b.x, y: b.y, z: 30 });
  assert.ok(!tryMount(P), 'and is not to be had any more');
});

test('K on a beast: the cockatrice flicks quills, the drake spits a ball of fire that bursts', () => {
  pass(300);
  let b = spawn('rider', 1, P.x, P.y);
  Object.assign(P, { state: 'jump', z: 30, face: 1 });
  tryMount(P);
  const far = spawn('bandit', 1, P.x + 380, P.y);
  Object.assign(far, { state: 'chase', cd: 99, hp: 999 });
  holdFight(far);
  pressed.bone = true;
  step(BEAST.rider.shot.wind + 0.1, () => (far.x = P.x + 380));
  assert.equal(G.projs.filter((q) => q.k === 'quill').length, BEAST.rider.shot.n);
  step(0.8, () => (far.x = P.x + 380));
  assert.equal(far.hp, 999 - BEAST.rider.shot.dmg, 'the middle quill struck, far beyond its tail');
  // not again at once
  pressed.bone = true;
  step(0.2);
  assert.ok(!G.projs.some((q) => q.k === 'quill'), 'it needs a moment');
  // the drake
  dismount(P);
  b.dead = true;
  G.projs = [];
  b = spawn('drake', 1, P.x, P.y);
  Object.assign(P, { state: 'jump', z: 30, face: 1 });
  tryMount(P);
  const two = [0, 60].map((d) => spawn('bandit', 1, P.x + 400 + d, P.y + d / 3));
  for (const o of two) Object.assign(o, { state: 'chase', cd: 99, hp: 999 });
  far.dead = true;
  holdFight(two[0]);
  const hp = P.hp;
  pressed.bone = true;
  step(BEAST.drake.shot.wind + 1, () => two.forEach((o, i) => (o.x = P.x + 400 + i * 60)));
  assert.ok(
    two.every((o) => o.hp < 999),
    'the burst caught both',
  );
  assert.equal(P.hp, hp, 'and spares her');
  // its blows are a third harder than they were
  assert.deepEqual([BEAST.rider.dmgE, BEAST.drake.dmgE], [29, 26]);
});

// --- the thief gnome, the harpy, the knight ---------------------------------------------------------

test('the thief gnome: every blow shakes a pot out of his sack; emptied, he runs off', () => {
  pass(300);
  const g = spawn('gnome', 1, P.x + 60, P.y);
  assert.ok(g.neutral);
  assert.equal(g.state, 'grun');
  for (let i = 0; i < GNOME.drops; i++) {
    g.x = P.x + 60;
    g.state = 'grun';
    g.t = 1;
    assert.ok(hurtEnemy(g, 10, 1, false, 'punch'));
  }
  assert.equal(G.items.length, GNOME.drops);
  assert.ok(G.items.every((it) => it.kind === 'potion' || it.kind === 'hp'));
  assert.equal(g.hp, TYPES.gnome.hp, 'never hurt');
  step(0.6);
  assert.equal(g.state, 'gflee');
  step(5);
  assert.ok(g.dead, 'off the screen');
});

test('a blue magic pot gives a little rage', () => {
  pass(300);
  P.rage = 0;
  G.items.push({ kind: 'potion', x: P.x, y: P.y, z: 0, vz: 0, t: 1 });
  step(0.1);
  assert.equal(P.rage, POTION);
});

test('the harpy hovers out of reach of a blow from the ground; a jump kick brings her down', () => {
  pass(300);
  const h = spawn('harpy', 1, P.x + 80, P.y);
  Object.assign(h, { state: 'hfly', z: HARPY.z, cd: 99 });
  holdFight(h);
  P.state = 'idle';
  pressed.atk = true;
  step(0.5);
  assert.equal(h.hp, TYPES.harpy.hp, 'a punch from the ground misses');
  // up in a jump: the kick reaches her
  h.x = P.x + 80;
  P.state = 'jump';
  P.ph = 1;
  P.z = 120;
  P.vz = 200;
  P.vx = P.vyd = 0;
  P.airUsed = 0;
  P.airT = null;
  pressed.atk = true;
  step(0.25);
  assert.ok(h.hp < TYPES.harpy.hp, 'the kick lands');
  step(1.5);
  assert.ok(['down', 'getup', 'chase', 'hup', 'hfly'].includes(h.state) || h.dead);
});

test('the amazon flips away from every third light blow in a row, never by chance', () => {
  pass(300);
  const a = spawn('amazon', 1, P.x + 60, P.y);
  a.hp = 999;
  const blow = (knock = false) => {
    Object.assign(a, { state: 'chase', t: 0, z: 0, cd: 99, leapCd: 99 });
    hurtEnemy(a, 1, 1, knock, 'punch');
    return a.state;
  };
  for (let round = 0; round < 3; round++) {
    assert.notEqual(blow(), 'aflip');
    assert.notEqual(blow(), 'aflip');
    assert.equal(blow(), 'aflip', 'the third');
  }
  // a heavy blow never, and the count starts again
  assert.notEqual(blow(), 'aflip');
  assert.notEqual(blow(), 'aflip');
  assert.equal(blow(true), 'air');
  assert.notEqual(blow(), 'aflip');
  assert.notEqual(blow(), 'aflip');
  assert.equal(blow(), 'aflip');
});

test('the death knight turns light blows from in front with its shield; a heavy one opens it', () => {
  pass(300);
  const k = spawn('knight', 1, P.x + 60, P.y);
  Object.assign(k, { state: 'chase', face: -1, cd: 99, thrCd: 99 });
  const hp = k.hp;
  for (let i = 0; i < 5; i++) assert.ok(hurtEnemy(k, 5, 1, false, 'punch'), 'the blow lands on it');
  assert.equal(k.hp, hp, 'every light blow from in front is turned');
  hurtEnemy(k, 5, 1, false, 'bone');
  assert.equal(k.hp, hp, 'a shot too');
  // from behind it is open
  hurtEnemy(k, 5, -1, false, 'punch');
  assert.equal(k.hp, hp - 5);
  // a heavy blow goes through and knocks the shield aside for a while
  Object.assign(k, { state: 'chase', face: -1, heavyT: 0 });
  hurtEnemy(k, 5, 1, true, 'punch');
  assert.equal(k.hp, hp - 10);
  assert.ok(k.openT > 0);
  Object.assign(k, { state: 'chase', face: -1 });
  hurtEnemy(k, 5, 1, false, 'punch');
  assert.equal(k.hp, hp - 15, 'light blows land while it is aside');
  k.openT = 0;
  // and it is down while it gets its breath back after a thrust
  Object.assign(k, { state: 'recover', face: -1 });
  hurtEnemy(k, 5, 1, false, 'punch');
  assert.equal(k.hp, hp - 20);
});

// --- the minotaur ---------------------------------------------------------------------------------

const mino = (dx = 200, extra = {}) => {
  const e = spawn('minotaur', 1, P.x + dx, P.y);
  Object.assign(e, { state: 'chase', cd: 99, chopCd: 99, throwCd: 99, chargeCd: 99 }, extra);
  holdFight(e);
  return e;
};

test('blows loosen his grip: the axe flies out of his hands and lands', () => {
  atWave(9);
  const m = mino();
  assert.ok(m.axe);
  let n = 0;
  while (m.axe && n++ < 40) hurtEnemy(m, 10, 1, false, 'punch');
  assert.ok(!m.axe && m.ax, 'disarmed');
  assert.equal(n, MINO.grip / POISE.light, 'counted as poise is');
  assert.equal(m.state, 'mloss');
  step(1.5);
  assert.equal(m.ax.st, 'lie', 'the axe lies on the ground');
});

test('heavy blows loosen it quicker', () => {
  atWave(9);
  const m = mino();
  let n = 0;
  assert.deepEqual(poiseView(m), { v: MINO.grip, max: MINO.grip, locked: false }, 'on his bar');
  while (m.axe && n++ < 40) hurtEnemy(m, 10, 1, true, 'punch');
  assert.equal(n, MINO.grip / POISE.heavy, `${n} heavy blows`);
});

test('without the axe he goes to pick it up, and has it again', () => {
  atWave(9);
  const m = mino(150);
  m.axe = false;
  m.ax = { st: 'lie', x: G.cam + 800, y: P.y, z: 0, vx: 0, vz: 0, rot: 0 };
  P.x = G.cam + 100;
  let fetched = false;
  step(6, () => (fetched = fetched || m.state === 'mfetch' || m.state === 'mpick'));
  assert.ok(fetched);
  assert.ok(m.axe, 'it is back in his hands');
  assert.equal(m.ax, null);
  assert.equal(m.grip, MINO.grip);
});

test('a blow of hers on the axe lying there sends it skidding away', () => {
  atWave(9);
  const m = mino(500, { state: 'mloss', t: 0 });
  m.axe = false;
  m.ax = { st: 'lie', x: P.x + 60, y: P.y, z: 0, vx: 0, vz: 0, rot: 0 };
  const x0 = m.ax.x;
  pressed.atk = true;
  step(0.4);
  assert.ok(m.ax.x > x0 + 80, 'kicked away');
});

test('from far off he throws the axe along her lane; it sticks in the ground; it hurts', () => {
  atWave(9);
  P.x = G.cam + 120;
  const m = mino(560, { throwCd: 0 });
  P.hp = 100;
  step(MINO.throw.wind + 1.2);
  assert.ok(!m.axe && m.ax, 'thrown');
  assert.ok(P.hp < 100, 'she was hit');
  step(0.6);
  assert.equal(m.ax?.st ?? 'lie', 'lie');
});

test('he goes red at MINO.enrage of his health; beaten, he falls and the arena is cleared', () => {
  atWave(9);
  const m = mino();
  hurtEnemy(m, m.hp - m.T.hp * MINO.enrage + 1, 1, true, 'super');
  step(0.3);
  assert.ok(m.rage);
  assert.ok(m.T.speed > TYPES.minotaur.speed);
  hurtEnemy(m, 99999, 1, true, 'super');
  assert.ok(m.dying);
  assert.equal(m.state, 'mdie');
  step(MINO.dieT + 2);
  assert.ok(m.dead);
});

// --- the frost wolf --------------------------------------------------------------------------------

const LAST = WAVES4.length - 1;
/** The frost wolf prowling `dx` in front of her, in no hurry to do anything. */
const wolf = (dx = 300, extra = {}) => {
  atWave(LAST);
  P.x = G.cam + 260;
  const e = spawn('frostwolf', 1);
  Object.assign(e, { state: 'fwprowl', t: 0, x: P.x + dx, y: P.y, z: 0, face: -1, cd: 99 });
  Object.assign(e, { pounceCd: 99, shardCd: 99, breathCd: 99, dashCd: 99, howlCd: 99, tailCd: 99 });
  Object.assign(e, extra);
  holdFight(e);
  return e;
};
const calm = (e) => () => Object.assign(e, { cd: 99 });

test('the frost wolf runs into the glade and howls; it fights alone, and never holds her', () => {
  atWave(LAST);
  const e = spawn('frostwolf', 1);
  holdFight(e);
  assert.ok(e, 'it comes');
  assert.equal(e.state, 'fwenter');
  assert.ok(FOES.frostwolf.immune(e));
  step(4, () => (P.inv = 99));
  assert.notEqual(e.state, 'fwenter');
  assert.ok(e.x < G.cam + W, 'in the glade');
  // nobody else comes, whatever it does, in any phase
  for (const hp of [0.9, 0.6, 0.3]) {
    e.hp = e.T.hp * hp;
    step(12, () => {
      P.inv = 99;
      assert.ok(!['frozen', 'grabbed', 'stun'].includes(P.state), 'her hands stay on the controls');
    });
    assert.deepEqual(
      G.enemies.filter((o) => !o.dead).map((o) => o.type),
      ['frostwolf'],
    );
  }
  assert.equal(e.phase, 3);
  assert.ok(G.blizzard, 'a blizzard blows in its third phase');
});

test('it never does the same thing twice in a row, and what it does reaches her', () => {
  const e = wolf(320, { pounceCd: 0, shardCd: 0, breathCd: 0, cd: 0 });
  const seen = [];
  let last = null;
  step(40, () => {
    P.inv = 99;
    if (e.state === 'fwprowl') last = null;
    else if (!last) {
      last = e.last;
      seen.push(e.last);
    }
  });
  assert.ok(seen.length >= 8, `${seen.length} attacks in 40 s`);
  for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1], seen.join());
  for (const k of ['bite', 'hop', 'pounce', 'shard', 'breath'])
    assert.ok(seen.includes(k), `${k}: ${seen}`);
  assert.ok(!seen.includes('dash') && !seen.includes('howl'), 'not in its first phase');
});

test('the bites: a snap up close, then a lunge after her; backing off clears both', () => {
  const B = FROST.bite;
  let e = wolf(170, { cd: 0, last: 'hop' });
  step(B.wind + 0.02);
  assert.equal(e.state, 'fwbite');
  step(0.1);
  assert.equal(P.hp, 100 - B.dmg, 'the snap');
  P.inv = 0;
  P.state = 'idle';
  step(0.15 + B.wind2 + B.t2);
  assert.equal(P.hp, 100 - B.dmg - B.dmg2, 'the lunge');
  // she backs off as it draws its head back
  freshGame();
  e = wolf(170, { cd: 0, last: 'hop' });
  step(0.1);
  assert.equal(e.state, 'fwbitew');
  P.x -= 250;
  step(B.wind + 0.3 + B.wind2 + B.t2 + 0.1, calm(e));
  assert.equal(P.hp, 100);
});

test('the pounce: the mark follows her, then holds still; out of it, the wolf skids, open', () => {
  const Q = FROST.pounce;
  const e = wolf(420, { pounceCd: 0, cd: 0 });
  step(DT * 2);
  assert.equal(e.state, 'fwpouncew');
  assert.ok(!FOES.frostwolf.unstoppable(e), 'crouched, it can be stopped');
  P.x -= 60;
  step(Q.wind - Q.lock - 0.1);
  assert.ok(Math.abs(e.mark.x - P.x) < 1 && !e.mark.set, 'it follows her');
  step(0.15);
  assert.ok(e.mark.set, 'red now');
  const mx = e.mark.x;
  P.x += Q.rx + 60;
  step(Q.lock + Q.air * 0.5);
  assert.equal(e.state, 'fwpounce');
  assert.equal(e.mark.x, mx, 'and still');
  assert.ok(e.z > 60 && FOES.frostwolf.unstoppable(e), 'in the air, the red outline');
  step(Q.air * 0.5 + 0.05);
  assert.equal(e.state, 'fwskid');
  assert.equal(P.hp, 100);
  assert.ok(isOpen(e));
  const hp = e.hp;
  hurtEnemy(e, 10, 1, false, 'punch');
  assert.ok(Math.abs(hp - e.hp - 10 * FROST.open) < 1e-9, 'open: every blow does more');
  step(Q.skid + 0.1, calm(e));
  assert.equal(e.state, 'fwprowl');
  // standing in the oval: knocked down
  freshGame();
  const f = wolf(420, { pounceCd: 0, cd: 0 });
  step(Q.wind + Q.air + 0.1);
  assert.equal(P.hp, 100 - Q.dmg);
  assert.equal(f.state, 'fwrec');
});

test('the ice fangs run along her lane, three lanes later on: a step between them is safe', () => {
  const S = FROST.shard;
  let e = wolf(420, { shardCd: 0, cd: 0 });
  step(DT * 2);
  assert.equal(e.state, 'fwshardw');
  assert.deepEqual(e.lanes, [P.y], 'one lane, hers');
  step(S.wind + 420 / S.speed + 0.1);
  assert.equal(P.hp, 100 - S.dmg);
  assert.ok(e.spikes.length > 3, 'fangs of ice standing along it');
  // stepping out of the lane while the cracks show
  freshGame();
  e = wolf(420, { shardCd: 0, cd: 0 });
  step(0.2);
  P.y -= S.w + 6;
  step(S.wind + 1, calm(e));
  assert.equal(P.hp, 100);
  // three lanes in its second phase; between two of them she is safe, in a side one she is not
  for (const [dy, hurt] of [
    [S.lanes / 2, false],
    [S.lanes, true],
  ]) {
    freshGame();
    e = wolf(420, { shardCd: 0, cd: 0, phase: 2, hp: 900 });
    P.y -= 20;
    step(DT * 2);
    assert.equal(e.lanes.length, 3);
    assert.ok(e.lanes.includes(P.y));
    P.y += dy;
    step(S.wind + 1, calm(e));
    assert.equal(P.hp < 100, hurt, `${dy} px off her lane`);
  }
});

test('the frost breath: a cone that holds still; it chills her (slower), and never freezes her', () => {
  const B = FROST.breath;
  let e = wolf(380, { breathCd: 0, cd: 0 });
  step(DT * 2);
  assert.equal(e.state, 'fwbreathw');
  const by = e.by;
  step(B.wind + 0.5);
  assert.equal(e.state, 'fwbreath');
  assert.equal(e.by, by);
  assert.equal(P.hp, 100 - B.dmg);
  assert.ok(P.chill > 0);
  assert.notEqual(P.state, 'frozen');
  // chilled, she walks slower; then it wears off
  step(1.2, calm(e));
  P.state = 'idle';
  P.inv = 99;
  let x = P.x;
  keys.l = true;
  step(0.5, calm(e));
  const cold = x - P.x;
  step(B.chill, calm(e));
  assert.ok(!(P.chill > 0));
  x = P.x = G.cam + 500;
  step(0.5, calm(e));
  keys.l = false;
  assert.ok(Math.abs(cold / (x - P.x) - B.slow) < 0.05, `${cold} against ${x - P.x}`);
  // a step out of the cone as it draws breath
  freshGame();
  e = wolf(380, { breathCd: 0, cd: 0 });
  step(0.2);
  P.y -= B.dy + 10;
  step(B.wind + B.t + 0.2, calm(e));
  assert.equal(P.hp, 100);
  assert.ok(!(P.chill > 0));
});

test('behind it for too long: a sweep of its tail', () => {
  const T = FROST.tail;
  const e = wolf(150, { tailCd: 0, face: 1 }); // (it faces away from her)
  step(T.wait + 0.1, calm(e));
  assert.equal(e.state, 'fwtailw');
  step(T.wind + 0.2, calm(e));
  assert.equal(P.hp, 100 - T.dmg);
});

test('the hunt in the snow: run after run along her lane, then it skids to a stop, open', () => {
  const D = FROST.dash;
  const e = wolf(300, { dashCd: 0, cd: 0, phase: 2, hp: 900 });
  step(DT * 2);
  assert.equal(e.state, 'fwfade');
  step(D.fade + 0.1);
  assert.equal(e.state, 'fwdashw');
  assert.ok(FOES.frostwolf.immune(e), 'off in the blizzard');
  assert.equal(e.lane, P.y, 'the lane is hers as the eyes show');
  // she stands still for the first run and is run down
  step(D.warn + 0.5);
  assert.equal(P.hp, 100 - D.dmg);
  // then she steps out of each lane as it shows
  let runs = 1,
    was = e.state;
  for (let i = 0; i < 600 && e.state !== 'fwskid'; i++) {
    P.inv = 0;
    if (!['idle', 'walk', 'run'].includes(P.state)) Object.assign(P, { state: 'idle', z: 0 });
    if (e.state === 'fwdashw' && e.lane !== null)
      P.y = e.lane + (e.lane > G.camY + 441 ? -1 : 1) * (D.dy + 8);
    step(DT);
    if (e.state === 'fwdash' && was !== 'fwdash') runs++;
    was = e.state;
  }
  assert.equal(e.state, 'fwskid');
  assert.equal(runs, D.n[1]);
  assert.equal(P.hp, 100 - D.dmg, 'none of the others touched her');
  assert.ok(isOpen(e) && e.x > G.cam + 200 && e.x < G.cam + W - 200, 'in the middle of the glade');
});

test('the howl: a ring of frost spreads over the ground, two in its third phase; a jump clears it', () => {
  const R = FROST.howl;
  let e = wolf(300, { howlCd: 0, cd: 0, phase: 2, hp: 900 });
  step(DT * 2);
  assert.equal(e.state, 'fwhowlw');
  step(R.wind + 0.1);
  assert.equal(e.rings.length, 1);
  step(300 / R.speed + 0.2, calm(e));
  assert.equal(P.hp, 100 - R.dmg, 'it ran over her');
  // up in the air as it passes
  freshGame();
  e = wolf(300, { howlCd: 0, cd: 0, phase: 3, hp: 400 });
  G.blizzard = true;
  let n = 0;
  step(R.wind + R.gap + 2, () => {
    e.cd = 99;
    n = Math.max(n, e.rings.length);
    P.z = 80;
    P.state = 'jump';
    P.vz = 0;
  });
  assert.equal(n, 2, 'two rings');
  assert.equal(P.hp, 100);
});

test('its poise: worn down by her blows, faster in a wind-up; gone, it lies open', () => {
  const e = wolf(150);
  assert.deepEqual(poiseView(e), { v: FROST.poise, max: FROST.poise, locked: false });
  hurtEnemy(e, 1, 1, false, 'punch');
  hurtEnemy(e, 1, 1, true, 'punch');
  assert.equal(e.wp, FROST.poise - POISE.light - POISE.heavy);
  assert.equal(e.state, 'fwprowl', 'a blow does not stop it');
  // winding up a bite: more of it
  go(e, 'fwbitew');
  hurtEnemy(e, 1, 1, true, 'punch');
  assert.equal(e.wp, FROST.poise - POISE.light - POISE.heavy * (1 + FROST.windMult));
  // nothing in an attack with the red outline
  go(e, 'fwbreath', 0, { by: P.y - 200, hitDone: true });
  const wp = e.wp;
  hurtEnemy(e, 1, 1, true, 'super');
  assert.equal(e.wp, wp);
  assert.ok(poiseView(e).locked);
  // a while without a blow and it is whole again
  go(e, 'fwprowl');
  step(FROST.regen + 0.2, calm(e));
  assert.equal(e.wp, FROST.poise);
  // worn away: on its side, open, then up again with its poise whole
  go(e, 'fwpouncew', 0, { mark: { x: P.x, y: P.y } });
  const need = Math.ceil(FROST.poise / (POISE.heavy * FROST.windMult));
  for (let i = 0; i < need - 1; i++) hurtEnemy(e, 1, 1, true, 'punch');
  assert.equal(e.state, 'fwpouncew', 'not yet');
  hurtEnemy(e, 1, 1, true, 'punch');
  assert.equal(e.state, 'fwdown');
  assert.ok(isOpen(e) && e.mark === null);
  const hp = e.hp;
  G.freeze = 0;
  hurtEnemy(e, 10, 1, false, 'punch');
  assert.ok(Math.abs(hp - e.hp - 10 * FROST.open) < 1e-9);
  step(FROST.down + 0.6, calm(e));
  assert.equal(e.state, 'fwprowl');
  assert.equal(e.wp, FROST.poise);
  // a crushing blow takes all of it at once
  hurtEnemy(e, 1, 1, true, 'super');
  assert.equal(e.state, 'fwdown');
});

test('no wind-up of its is shorter than she can react to, in any phase; beaten, the fight is won', () => {
  for (const k of ['bite', 'pounce', 'shard', 'breath', 'tail', 'howl'])
    assert.ok(FROST[k].wind >= POISE.minWind, k);
  assert.ok(FROST.dash.warn >= POISE.minWind);
  // (quicker in its later phases, but never below that)
  const q = wolf(170, { cd: 0, phase: 3, last: 'hop', hp: 100 });
  step(POISE.minWind - 0.03);
  assert.equal(q.state, 'fwbitew');
  freshGame();
  const e = wolf(300);
  Object.assign(e, { phase: 3 });
  G.blizzard = true;
  e.rings.push({ x: e.x, y: e.y, r: 100 });
  hurtEnemy(e, 9999, 1, true, 'punch');
  assert.equal(e.state, 'fwdie');
  assert.ok(!G.blizzard && !e.rings.length);
  for (let i = 0; i < 900 && !e.dead; i++) step(DT);
  assert.ok(e.dead, 'gone');
});

// --- the boulders on the steep trail ------------------------------------------------------------

test('boulders roll down the steep trail after her, and on through the fight at its foot', () => {
  startLevel(4);
  G.banner = null;
  G.waveI = 99; // (no fight starts)
  G.props = [];
  const [s0, s1] = L4.SLOPE,
    x = (s0 + s1) / 2;
  camTo(pathPx(3.5, PATH));
  Object.assign(P, { x, y: topY(x) + 80, inv: 0, face: 1 });
  G.rockT = 0;
  step(DT * 2);
  const b = G.projs.find((q) => q.k === 'boulder');
  assert.ok(b, 'a boulder sets off');
  assert.ok(!b.rolling, 'only its lane shows at first');
  assert.ok(Math.abs(b.d - 80) <= 56, 'in a lane near hers');
  // it waits (its lane showing), then rolls down the slant, keeping its lane
  step(BOULDER.warn + 0.4, () => {
    P.inv = 99;
    G.rockT = 9;
  });
  assert.ok(b.rolling && b.x > G.cam - 60);
  assert.ok(Math.abs(b.y - (topY(b.x) + b.d)) < 1e-6, 'along the slant');
  // it knocks her down if she stands in its lane, and a foe flying
  const e = spawn('bandit', 1, b.x + 260, topY(b.x + 260) + b.d);
  e.state = 'chase';
  Object.assign(P, { x: b.x + 120, y: topY(b.x + 120) + b.d, z: 0, inv: 0, state: 'idle' });
  const hp = P.hp;
  step(0.9, () => (G.rockT = 9));
  assert.equal(P.hp, hp - BOULDER.dmgP);
  assert.ok(e.hp < e.T.hp, 'the foe too');
  // none on the flat hill road with no fight
  G.projs = [];
  camTo(pathPx(2.5, PATH));
  Object.assign(P, { x: 3800, y: topY(3800) + 80, state: 'idle', inv: 99 });
  G.rockT = 0;
  step(1);
  assert.ok(!G.projs.some((q) => q.k === 'boulder'));
  // in the rockslide they come rolling off the trail along the ledge
  freshGame();
  atWave(WAVES4.findIndex((w) => w.name === 'rockslide'));
  holdFight(spawn('knight', 1, P.x + 300, P.y));
  G.waveI = WAVES4.findIndex((w) => w.name === 'rockslide');
  G.rockT = 0;
  step(DT * 2);
  const c = G.projs.find((q) => q.k === 'boulder');
  assert.ok(c);
  step(BOULDER.warn + 1, () => {
    P.inv = 99;
    G.rockT = 9;
  });
  assert.equal(c.y, L4.Y_C + c.d, 'along the flat ledge');
});
