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
  POTION,
  STAGE_HOLD,
  TYPES,
} from '../src/config.js';
import { APP, G, P } from '../src/state.js';
import { keys, pressed } from '../src/input.js';
import { spawn } from '../src/enemies.js';
import { headBonus, hurtEnemy, partZone } from '../src/combat.js';
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
import { freezePlayer, isOpen, sheltered } from '../src/foes/frostwolf.js';
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

test('the road: the village, the climb up the hills, the trail up the mountainside, the ledge, the forest', () => {
  startLevel(4);
  assert.equal(topY(100), L4.Y_A);
  assert.equal(topY(4000), L4.Y_B);
  assert.equal(topY(6000), L4.Y_C);
  assert.equal(topY(11000), L4.Y_D);
  assert.ok(L4.Y_C < L4.Y_B && L4.Y_B < L4.Y_A, 'it climbs');
  // up the trail one walks straight up the screen, from the hill road to the ledge
  for (let y = L4.Y_C + 10; y < L4.Y_B + 150; y += 40) assert.ok(onFloor(L4.CLIMB_X, y), `${y}`);
  assert.ok(!onFloor(L4.CLIMB[0] - 30, L4.Y_C + 300), 'beside it, rock');
  // the plank bridge over the gorge, and the gorge on either side of it
  const bx = (L4.FALLS[0] + L4.FALLS[1]) / 2;
  assert.ok(onFloor(bx, L4.Y_C + 80));
  assert.ok(overPit(bx, L4.Y_C + 20) && overPit(bx, L4.Y_C + 140));
  assert.equal(PITS.length, 2);
  assert.ok(FLOOR.length >= 8);
});

test('at the foot of the trail the camera turns and goes up it with the player', () => {
  const foot = pathAt(pathPx(3, PATH), PATH),
    top = pathAt(pathPx(4, PATH), PATH);
  assert.equal(foot.cx, top.cx, 'it does not move sideways on the way up');
  assert.ok(top.cy < foot.cy - 600, 'it goes up');
  // a fight on the way up (under the boulders)
  const up = WAVES4.filter((w) => w.s > 3 && w.s < 4);
  assert.equal(up.length, 1);
  assert.equal(up[0].name, 'rockslide');
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

test('a jump gets her off; left alone a beast runs off, unless a bandit climbs back on', () => {
  pass(300);
  const b = spawn('rider', 1, P.x, P.y);
  P.state = 'jump';
  P.z = 30;
  tryMount(P);
  pressed.jump = true;
  step(DT * 2);
  assert.equal(P.state, 'jump');
  assert.equal(b.byP, false);
  dismount(P);
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
  assert.ok(n * 10 >= MINO.grip - 10 && n * 10 <= MINO.grip + 10);
  assert.equal(m.state, 'mloss');
  step(1.5);
  assert.equal(m.ax.st, 'lie', 'the axe lies on the ground');
});

test('heavy blows loosen it quicker', () => {
  atWave(9);
  const m = mino();
  let n = 0;
  while (m.axe && n++ < 40) hurtEnemy(m, 10, 1, true, 'punch');
  assert.ok(n * 10 < MINO.grip, `${n} heavy blows`);
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
const wolf = (dx = 300, extra = {}) => {
  const e = spawn('frostwolf', 1, P.x + dx, P.y);
  Object.assign(
    e,
    { state: 'chase', z: 0, cd: 99, breathCd: 99, biteCd: 99, swipeCd: 99, howlCd: 99, leapCd: 99 },
    extra,
  );
  holdFight(e);
  return e;
};

test('the frost wolf comes down into the glade from over the trees, and howls', () => {
  atWave(LAST);
  const e = spawn('frostwolf', 1);
  assert.equal(e.state, 'fwenter');
  assert.ok(e.z > 300);
  assert.equal(hurtEnemy(e, 10, 1, false, 'punch'), false, 'out of reach up there');
  step(1);
  assert.equal(e.z, 0);
  assert.equal(e.state, 'fwhowl');
});

test('its icy breath freezes her in a block of ice; mashing gets her out sooner', () => {
  atWave(LAST);
  P.x = G.cam + 200;
  const e = wolf(330, { breathCd: 0 });
  Object.assign(e, { x: P.x + 330, face: -1 });
  let froze = false;
  step(FROST.breath.wind + 0.6, () => (froze = froze || P.state === 'frozen'));
  assert.ok(froze, 'frozen');
  // frozen on her own she thaws after FROST.breath.freeze; mashing, much sooner
  freshGame();
  atWave(LAST);
  P.inv = 0;
  assert.ok(freezePlayer(5, FROST.breath.freeze));
  let t = 0;
  step(FROST.breath.freeze, (i) => {
    if (P.state === 'frozen') t += DT;
    if (i % 3 === 0) pressed.atk = true;
  });
  assert.ok(t < FROST.breath.freeze * 0.7, `${t.toFixed(2)} s in the ice`);
});

test('its body is a wall: she is pushed out of it', () => {
  atWave(LAST);
  const e = wolf(300);
  P.x = e.x - 20;
  P.y = e.y;
  step(DT);
  assert.ok(Math.abs(P.x - e.x) > FROST.bw - 20, 'pushed out');
});

test('its head is its weak spot (reached high up, in front); its long body is hit anywhere', () => {
  atWave(LAST);
  const e = wolf(300);
  const hx = e.x + e.face * 175;
  assert.equal(partZone(e, hx - 20, hx + 20, e.y, 22, 150, 230), 'head');
  assert.ok(headBonus(e, 'head') > 1);
  assert.equal(partZone(e, e.x - 120, e.x - 80, e.y, 22, 40, 150), 'body');
  assert.equal(headBonus(e, 'body'), 1);
  assert.equal(partZone(e, e.x - 400, e.x - 360, e.y, 22, 40, 150), null);
});

test('its howl calls wolves out of the forest and drops icicles on marked spots', () => {
  atWave(LAST);
  const e = wolf(300, { phase: 2, howlCd: 0 });
  step(FROST.howl.wind + 0.2);
  assert.equal(e.state, 'fwhowl');
  assert.equal(G.enemies.filter((o) => o.type === 'wolf').length, FROST.howl.wolves[2]);
  assert.ok(e.spikes.length >= FROST.howl.spikes[1]);
});

test('its phases: the leap from the second, the blizzard in the third', () => {
  atWave(LAST);
  const e = wolf(300);
  hurtEnemy(e, e.T.hp * (1 - FROST.ph2) + 5, 1, true, 'super');
  step(0.3);
  assert.equal(e.phase, 2);
  hurtEnemy(e, e.T.hp * (FROST.ph2 - FROST.ph3), 1, true, 'super');
  step(0.3);
  assert.equal(e.phase, 3);
  assert.ok(G.blizzard);
  // the leap: up out of sight, down in a ring of ice
  Object.assign(e, {
    state: 'chase',
    howlCd: 99,
    leapCd: 0,
    breathCd: 99,
    biteCd: 99,
    swipeCd: 99,
  });
  let up = false;
  step(FROST.leap.wind + FROST.leap.up + FROST.leap.hang + FROST.leap.fall + 0.5, () => {
    up = up || e.state === 'fwup';
  });
  assert.ok(up);
  assert.equal(e.z, 0);
  hurtEnemy(e, 99999, 1, true, 'super');
  assert.equal(e.state, 'fwdie');
  assert.equal(G.blizzard, false);
});

const icePillar = (x, y) => {
  const u = { isProp: 1, decor: 'icicle', x, y, z: 0, w: 20, hp: 2, drop: null, bornT: G.time };
  G.props.push(u);
  return u;
};

test('a blow on its head as it draws breath to howl chokes the howl: no wolves, no icicles', () => {
  atWave(LAST);
  const e = wolf(300, { phase: 2, howlCd: 0, face: -1 });
  step(FROST.howl.wind * 0.5);
  assert.equal(e.state, 'fwhowl');
  assert.ok(!FOES.frostwolf.unstoppable(e), 'no red outline: it can be stopped');
  // a bone thrown along the road strikes its head first
  G.projs.push({ k: 'bone', x: P.x + 62, y: P.y, z: 116, vx: 650, vzd: 0, rot: 0, life: 1.05 });
  step(0.4);
  assert.equal(e.state, 'fwchoke');
  assert.ok(isOpen(e));
  assert.equal(G.enemies.filter((o) => o.type === 'wolf').length, 0);
  assert.ok(!e.spikes?.length);
  // open, a blow does more
  const hp = e.hp;
  G.freeze = 0;
  hurtEnemy(e, 10, 1, false, 'punch');
  assert.ok(Math.abs(hp - e.hp - 10 * FROST.open) < 1e-9);
  // it comes round, and for a while nothing stops it
  step(FROST.choke.howl + 0.1, () => (P.inv = 99));
  assert.notEqual(e.state, 'fwchoke');
  assert.ok(e.steady > 0);
  Object.assign(e, { state: 'fwbitew', t: 0 });
  assert.ok(FOES.frostwolf.unstoppable(e));
  hurtEnemy(e, 5, 1, true, 'punch');
  assert.equal(e.state, 'fwbitew');
});

test('a heavy blow as it winds up a bite makes it flinch; a plain one does not', () => {
  atWave(LAST);
  const e = wolf(300);
  Object.assign(e, { state: 'fwbitew', t: 0 });
  hurtEnemy(e, 5, 1, false, 'punch');
  assert.equal(e.state, 'fwbitew');
  G.freeze = 0;
  hurtEnemy(e, 5, 1, true, 'air');
  assert.equal(e.state, 'fwchoke');
});

test('a lunge that misses leaves its jaws in the snow, its head low and open', () => {
  atWave(LAST);
  P.x = G.cam + 200;
  const e = wolf(330);
  Object.assign(e, { x: P.x + 330, face: -1, biteCd: 0 });
  step(FROST.bite.wind + 0.05);
  assert.equal(e.state, 'fwbite');
  // she steps out of its way
  P.y += 120;
  for (let i = 0; i < 60 && e.state === 'fwbite'; i++) step(DT);
  assert.equal(e.state, 'fwstuck');
  assert.ok(isOpen(e));
  const hx = e.x + e.face * 175;
  assert.equal(partZone(e, hx - 20, hx + 20, e.y, 22, 40, 150), 'head', 'a blow from the ground');
  step(FROST.bite.stuck + 0.1, () => (P.inv = 99));
  assert.notEqual(e.state, 'fwstuck');
});

test('icicles stay standing as pillars of ice: its lunge into one dazes it, one stops its breath', () => {
  atWave(LAST);
  P.x = G.cam + 200;
  const e = wolf(420, { phase: 2, howlCd: 0 });
  step(FROST.howl.wind + FROST.howl.warn + 0.6, () => (P.inv = 99));
  const made = G.props.filter((u) => u.decor === 'icicle');
  assert.ok(made.length >= 2 && made.length <= FROST.pillar.max, `${made.length} pillars`);
  // they melt in time
  step(FROST.pillar.life + 1, () => {
    P.inv = 99;
    Object.assign(e, { state: 'chase', cd: 99, howlCd: 99, leapCd: 99, breathCd: 99, biteCd: 99 });
    e.swipeCd = 99;
  });
  assert.equal(G.props.filter((u) => u.decor === 'icicle' && !u.dead).length, 0);
  // a pillar between its jaws and her: the lunge shatters on it
  G.props = [];
  P.inv = 0;
  Object.assign(e, { state: 'chase', x: P.x + 400, y: P.y, face: -1, biteCd: 0, z: 0 });
  const u = icePillar(P.x + 110, P.y),
    hp = e.hp;
  step(FROST.bite.wind + FROST.bite.air + 0.1);
  assert.ok(u.dead, 'the pillar is gone');
  assert.equal(e.state, 'fwchoke');
  assert.equal(e.hp, hp - FROST.pillar.dmg);
  assert.equal(P.hp, 100, 'and she is not bitten');
  // behind a pillar the breath does not reach her
  G.props = [];
  Object.assign(e, {
    state: 'fwbreath',
    t: 0,
    x: P.x + 330,
    y: P.y,
    face: -1,
    by: P.y,
    hitDone: false,
  });
  icePillar(P.x + 60, P.y + 8);
  assert.ok(sheltered(e));
  step(0.5);
  assert.notEqual(P.state, 'frozen');
  G.props = [];
  assert.ok(!sheltered(e));
});

test('the cone of its breath and the ring of its leap hold still at the end: she can get out', () => {
  atWave(LAST);
  P.x = G.cam + 200;
  const e = wolf(330);
  Object.assign(e, { x: P.x + 330, face: -1, breathCd: 0 });
  step(FROST.breath.wind - FROST.breath.lock + 0.02);
  assert.equal(e.state, 'fwbreathw');
  const by = e.by;
  P.y -= 70;
  step(FROST.breath.lock - 0.04);
  assert.equal(e.by, by, 'the cone no longer follows her');
  step(0.6);
  assert.notEqual(P.state, 'frozen');
  // at its flank while it breathes, it is open
  assert.equal(e.state, 'fwbreath');
  assert.ok(!isOpen(e));
  P.x = e.x;
  assert.ok(isOpen(e));
  // the leap: the ring stops following her before it drops
  P.x = G.cam + 200;
  P.y = e.y;
  Object.assign(e, { state: 'fwup', t: FROST.leap.up + 0.1, z: FROST.leap.h, phase: 2 });
  step(FROST.leap.hang - FROST.leap.lock);
  const x = e.x;
  P.x += 300;
  step(FROST.leap.lock - 0.12, () => (P.inv = 0));
  assert.equal(e.x, x);
  step(FROST.leap.fall + 0.2);
  assert.equal(e.state, 'fwland');
  assert.ok(e.missed, `it missed her (${Math.round(P.x - e.x)} px off)`);
  assert.ok(isOpen(e), 'a leap that missed leaves it open');
  assert.equal(P.hp, 100);
});

// --- the boulders on the climb --------------------------------------------------------------------

test('boulders roll down the trail during a fight on the climb (and only there)', () => {
  atWave(WAVES4.findIndex((w) => w.name === 'rockslide'));
  const foe = spawn('knight', 1, P.x + 300, P.y);
  Object.assign(foe, { cd: 99 });
  holdFight(foe);
  G.rockT = 0.05;
  step(0.2);
  const b = G.projs.find((q) => q.k === 'boulder');
  assert.ok(b, 'a boulder sets off');
  assert.ok(b.x >= L4.CLIMB[0] && b.x <= L4.CLIMB[1]);
  // it rolls down onto her
  P.x = b.x;
  P.y = b.y + BOULDER.speed * (BOULDER.warn + 0.3);
  P.hp = 100;
  step(BOULDER.warn + 0.8);
  assert.ok(P.hp < 100, 'it hit her');
  // not on the village street
  freshGame();
  atWave(1);
  const f2 = spawn('bandit', 1, P.x + 300, P.y);
  holdFight(f2);
  G.rockT = 0;
  step(1);
  assert.ok(!G.projs.some((q) => q.k === 'boulder'));
});
