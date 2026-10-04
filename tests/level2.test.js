import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARMOR,
  BLAST,
  DYNAMITE,
  LIZARD,
  MINER,
  SLIME,
  STAGE_HOLD,
  TYPES,
  WAVES,
  WEIGHT,
} from '../src/config.js';
import { G, P } from '../src/state.js';
import { keys, pressed } from '../src/input.js';
import { spawn, updEnemy } from '../src/enemies.js';
import { hurtEnemy } from '../src/combat.js';
import { update } from '../src/world.js';
import { rollWave } from '../src/waves.js';
import {
  camTo,
  floorClamp,
  levelWaves,
  onFloor,
  pathAt,
  pathPx,
  startLevel,
} from '../src/level.js';
import { FLOOR, L2, PATH, WAVEGEN2, WAVES2 } from '../src/level2.js';
import { setRandom } from '../src/util.js';
import { DT, freshGame } from './helpers.js';

beforeEach(freshGame);

/** A position along the road in nodes, in pixels. */
const px = (s) => pathPx(s, PATH);

const step = (seconds, each) => {
  for (let i = 0; i < seconds / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
    each?.(i);
  }
};
/** Old Quarry, with the camera and the player at `d` pixels along the road, no fight on. */
function quarry(d = 0) {
  startLevel(2);
  G.banner = null;
  G.waveI = 99;
  G.props = [];
  camTo(d);
  const c = pathAt(d);
  Object.assign(P, { x: c.x, y: c.y, inv: 0 });
}

test('holding Z and 2 for two seconds on the first screen takes the player to Old Quarry', () => {
  assert.equal(STAGE_HOLD, 2);
  keys.lvlZ = true;
  step(1);
  assert.equal(G.level, 1, 'Z alone does nothing');
  keys.lvl2 = true;
  step(STAGE_HOLD - 0.2);
  assert.equal(G.level, 1, 'not quite long enough');
  step(0.4);
  assert.equal(G.level, 2);
  assert.equal(G.waveI, 0);
  assert.ok(G.props.some((u) => u.decor === 'tnt'));
  // only on the first screen: after the first fight has begun, nothing happens
  freshGame();
  G.wave = { sp: [], t: 0 };
  keys.lvlZ = keys.lvl2 = true;
  step(3);
  assert.equal(G.level, 1);
});

test('winning the Bone Road leads on to Old Quarry, keeping score and lives', () => {
  G.waveI = WAVES.length;
  G.state = 'win';
  G.endT = 3;
  P.score = 1234;
  P.lives = 1;
  pressed.atk = true;
  update(DT);
  assert.equal(G.level, 2);
  assert.equal(G.state, 'play');
  assert.equal(P.score, 1234);
  assert.equal(P.lives, 1);
});

test('the floor of Old Quarry: the street, the slant, the quarry road and the mine', () => {
  quarry();
  assert.ok(onFloor(500, 450));
  assert.ok(!onFloor(500, 300), 'the houses are not floor');
  assert.ok(onFloor(3000, 358 + (3000 - L2.SLANT[0]) * L2.SLANT[2] + 80), 'on the slant');
  assert.ok(onFloor(3900, 1300), 'down the quarry road');
  assert.ok(!onFloor(3300, 1300), 'not into the canyon wall');
  assert.ok(onFloor(5000, L2.MINE_Y + 80), 'in the tunnel');
  // off the floor: pulled back onto it
  const o = floorClamp({ x: 3300, y: 1300 });
  assert.ok(onFloor(o.x, o.y));
  assert.ok(Math.abs(o.x - L2.QUARRY[0]) < 2);
  // the floor pieces join up: walking the camera path stays on the floor
  for (let d = 0; d < px(WAVES2[WAVES2.length - 1].s); d += 40) {
    const c = pathAt(d);
    assert.ok(onFloor(c.x, c.y), `the road at ${d} px (${c.x}, ${c.y})`);
  }
  assert.equal(FLOOR.length, 6);
});

test('the camera follows the road down: right, down the slant, straight down, right again', () => {
  quarry();
  const at = (d) => {
    const c = pathAt(d);
    return [c.cx, c.cy];
  };
  const [x0, y0] = at(0),
    [x1, y1] = at(px(1.5)),
    [x2, y2] = at(px(3.5)),
    [x3, y3] = at(px(6.5));
  assert.ok(x1 > x0 && y1 > y0, 'down the slant: right and down');
  assert.ok(Math.abs(x2 - at(px(3))[0]) < 1 && y2 > y1, 'the quarry road: straight down');
  assert.ok(x3 > x2 && y3 > y2, 'the mine shaft: right and down');
});

test('walking the quarry road down the screen reaches the fight there', () => {
  quarry(px(2.6));
  G.waveI = WAVES2.findIndex((w) => w.s === 3);
  keys.d = true;
  step(12, () => (P.inv = 1));
  assert.ok(G.wave, 'the fight has started');
  assert.ok(Math.abs(G.camS - px(3)) < 1e-6);
  assert.ok(G.camY > 700, 'the camera came down');
});

test('enemies come from off the screen where the road goes on, or out of the ground', () => {
  // on the street: from the side
  quarry(px(0.6));
  const a = spawn('miner', 1);
  assert.ok(a.x > G.cam + 900, 'from the right');
  // down the quarry road there is no floor off the side: from below
  quarry(px(3.2));
  const b = spawn('miner', 1);
  assert.ok(onFloor(b.x, b.y));
  assert.ok(b.y > G.camY + 540 || b.state === 'rise', `from below or the ground (${b.y})`);
});

test('a red barrel: a blow lights its fuse, then it blows up and hurts everyone near it', () => {
  quarry();
  G.props = [{ isProp: 1, decor: 'tnt', x: 600, y: 450, z: 0, w: 24, hp: 1, drop: null }];
  const far = { isProp: 1, decor: 'tnt', x: 760, y: 450, z: 0, w: 24, hp: 1, drop: null },
    wood = { isProp: 1, decor: 'barrel', x: 520, y: 455, z: 0, w: 26, hp: 2, drop: 'hp' };
  G.props.push(far, wood);
  P.x = 560;
  P.y = 450;
  const e = spawn('miner', 1, 660, 450);
  const hp0 = e.hp;
  hurtEnemy(G.props[0], 1, 1, false, 'punch');
  assert.ok(!G.props[0].dead, 'the fuse burns first');
  assert.ok(G.props[0].fuseT > 0.5);
  P.x = 300; // she got away
  step(BLAST.barrel.lit + 0.05);
  assert.ok(e.dead || e.hp < hp0, 'the miner caught the blast');
  assert.equal(P.hp, 100, 'out of reach');
  assert.ok(wood.dead, 'the wooden barrel burst');
  assert.ok(
    G.items.some((i) => i.kind === 'hp'),
    'and dropped what it held',
  );
  step(0.3);
  assert.ok(far.dead, 'the next red barrel went off too');
  // a shot sets one off at once; standing next to it hurts
  freshGame();
  quarry();
  G.props = [{ isProp: 1, decor: 'tnt', x: 600, y: 450, z: 0, w: 24, hp: 1, drop: null }];
  P.x = 560;
  P.y = 450;
  hurtEnemy(G.props[0], 1, 1, false, 'bone');
  step(0.1);
  assert.ok(P.hp < 100, 'the blast hurt the player');
});

test('the miner raises its pick and charges, knocking the player down', () => {
  quarry();
  P.x = 300;
  P.y = 450;
  const e = spawn('miner', 1, 650, 450);
  Object.assign(e, { state: 'pwind', t: 0 });
  step(MINER.wind + 0.02);
  assert.equal(e.state, 'pcharge');
  step(0.9);
  assert.equal(P.state === 'ko' || P.state === 'down' || P.hp < 100, true);
  assert.ok(P.hp <= 100 - MINER.dmg);
});

test('the dynamite zombie: a lit stick lands and blows up; killed mid-swing it drops it', () => {
  quarry();
  P.x = 300;
  P.y = 450;
  P.inv = 99;
  const e = spawn('dynamite', 1, 640, 450);
  Object.assign(e, { state: 'windup', t: 0, cd: 0 });
  step(TYPES.dynamite.wind + 0.05);
  const q = G.projs.find((p) => p.k === 'tnt');
  assert.ok(q, 'a stick was thrown');
  assert.ok(q.fuse < DYNAMITE.fuse && q.fuse > DYNAMITE.fuse - TYPES.dynamite.wind - 0.2);
  step(q.fuse + 0.1);
  assert.ok(!G.projs.includes(q), 'it went off');
  assert.ok(G.parts.some((p) => p.k === 'boom'));
  // killed while it holds a lit stick
  freshGame();
  quarry();
  P.x = 300;
  const d = spawn('dynamite', 1, 640, 450);
  Object.assign(d, { state: 'windup', t: 0 });
  step(0.3);
  hurtEnemy(d, 999, 1, false, 'punch');
  assert.ok(d.dead);
  const s = G.projs.find((p) => p.k === 'tnt');
  assert.ok(s, 'the lit stick fell');
  assert.ok(Math.abs(s.x - 640) < 60);
  const near = spawn('miner', 1, 650, 450);
  step(DYNAMITE.fuse);
  assert.ok(near.dead || near.hp < TYPES.miner.hp, 'and its blast hurts the other enemies');
});

test('the lizard hops back from a blow it sees coming, then lunges', () => {
  quarry();
  P.x = 500;
  P.y = 450;
  P.face = 1;
  const e = spawn('lizard', 1, 600, 450);
  Object.assign(e, { state: 'chase', dodgeCd: 0, cd: 9 });
  P.state = 'atk1';
  P.t = 0.02;
  const prev = setRandom(() => 0); // it always takes the chance to dodge
  updEnemy(e, DT, { n: 0 });
  setRandom(prev);
  assert.equal(e.state, 'lzhop');
  assert.ok(e.vx > 0, 'away from the player');
  assert.ok(!hurtEnemy(e, 10, 1, false, 'punch'), 'out of reach at first');
  P.state = 'idle';
  for (let i = 0; i < 60 && e.state === 'lzhop'; i++) updEnemy(e, DT, { n: 0 });
  assert.equal(e.state, 'lzwind');
  for (let i = 0; i < 60 && e.state === 'lzwind'; i++) updEnemy(e, DT, { n: 0 });
  assert.equal(e.state, 'lzlunge');
  assert.equal(LIZARD.lwind > 0.3, true);
  // a medium enemy: a plain hit does not stop the lunge
  hurtEnemy(e, 1, 1, false, 'punch');
  assert.equal(e.state, 'lzlunge');
  assert.equal(TYPES.lizard.weight, 'medium');
});

test('the power armour shrugs off blows, only crushing ones knock it back', () => {
  quarry();
  P.x = 300;
  P.y = 450;
  const e = spawn('armor', 1, 600, 450);
  e.state = 'chase';
  hurtEnemy(e, 5, 1, true, 'punch');
  assert.equal(e.state, 'chase', 'a heavy punch does not move it');
  hurtEnemy(e, 5, 1, true, 'hado');
  assert.equal(e.state, 'chase', 'nor a dark ball of level I');
  hurtEnemy(e, 5, 1, true, 'hado2');
  assert.equal(e.state, 'air', 'a crushing blow does');
  assert.equal(TYPES.armor.weight, 'heavy');
});

test('the minigun: spin-up, then bullets land close in front first and further out later', () => {
  quarry();
  P.x = 200;
  P.y = 300 + 150;
  P.inv = 99;
  const e = spawn('armor', 1, 800, 450);
  Object.assign(e, { state: 'spin', t: 0, face: -1 });
  step(ARMOR.spin + 0.05);
  assert.equal(e.state, 'fire');
  const near = e.reachD;
  step(ARMOR.fire * 0.8);
  assert.ok(e.reachD > near + 300, 'the stream walks outwards');
  assert.ok(G.parts.some((p) => p.k === 'tracer'));
  // a hit is no reason to stop
  hurtEnemy(e, 5, 1, true, 'punch');
  assert.equal(e.state, 'fire');
  // in the stream: hurt, and every third bullet knocks her down
  freshGame();
  quarry();
  P.x = 640;
  P.y = 450;
  const g = spawn('armor', 1, 900, 450);
  Object.assign(g, { state: 'fire', t: 0, face: -1, reachD: 60, aimY: 450, shot: 0, hits: 0 });
  step(1.2);
  assert.ok(P.hp < 100);
  assert.ok(['ko', 'down', 'getup'].includes(P.state) || g.hits >= 3);
});

test('rolled fights of Old Quarry never bring more than two power armours', () => {
  for (let i = 0; i < 300; i++) {
    const w = rollWave(1, WAVEGEN2);
    assert.ok(w.filter((s) => s[0] === 'armor').length <= 2);
    assert.ok(w.every((s) => ['miner', 'zombie', 'dynamite', 'lizard', 'armor'].includes(s[0])));
  }
});

test('the slime: plain hits do not stop its roll, a heavy blow does, a second one sends it back', () => {
  quarry(px(5.75));
  P.x = G.cam + 200;
  P.y = G.camY + 450;
  const e = spawn('slime', 1);
  e.z = 0;
  Object.assign(e, { state: 'roll', t: 0, cdir: -1, bounced: false });
  hurtEnemy(e, 5, 1, false, 'punch');
  assert.equal(e.state, 'roll');
  hurtEnemy(e, 5, 1, true, 'punch');
  assert.equal(e.state, 'quiver', 'a heavy blow breaks the roll');
  assert.ok(e.heavyT > 0);
  hurtEnemy(e, 5, 1, true, 'punch');
  assert.equal(e.state, 'stagger', 'the second within the window');
  assert.equal(WEIGHT.window, 3);
  // a crushing blow alone is enough
  e.state = 'chase';
  e.heavyT = 0;
  hurtEnemy(e, 5, 1, true, 'super');
  assert.equal(e.state, 'stagger');
});

test('the slime spits out zombies that get up and fight', () => {
  quarry(px(5.75));
  P.x = G.cam + 200;
  P.y = G.camY + 450;
  P.inv = 99;
  const e = spawn('slime', 1);
  Object.assign(e, { state: 'spwind', t: 0, z: 0 });
  step(SLIME.spwind + 0.05);
  assert.ok(G.projs.some((q) => q.k === 'zspit'));
  step(1.2);
  const kid = G.enemies.find((o) => o.fromSlime);
  assert.ok(kid, 'something landed and got up');
  assert.ok(['zombie', 'miner'].includes(kid.type));
  assert.equal(TYPES.slime.bigBoss, 1);
});

test('the last fight: two power armours, then miners and dynamite join halfway', () => {
  const last = WAVES2[WAVES2.length - 1];
  assert.deepEqual(
    last.sp.map((s) => s[0]),
    ['armor', 'armor'],
  );
  quarry(px(last.s));
  G.waveI = WAVES2.length - 1;
  G.wave = { sp: last.sp.map((s) => s.slice()), t: 0 };
  P.inv = 99;
  step(2);
  const armors = G.enemies.filter((e) => e.type === 'armor');
  assert.equal(armors.length, 2);
  assert.ok(!G.wave.midT, 'nobody else yet');
  for (const a of armors) a.hp = a.T.hp * 0.45;
  step(0.1);
  assert.ok(G.wave.midT, 'halfway: the others come');
  assert.equal(G.wave.sp.filter((x) => x[0] === 'dynamite').length, 2);
  // the screen holds six at most: the rest come as room is made
  step(3, () => (P.inv = 99));
  assert.ok(G.enemies.some((e) => e.type === 'miner'));
  for (const e of G.enemies) if (e.type === 'miner') e.dead = true;
  step(3, () => (P.inv = 99));
  assert.ok(G.enemies.some((e) => e.type === 'dynamite'));
  assert.equal(levelWaves(), WAVES2);
});

test('a run started on Old Quarry (a retry after losing there) replays on Old Quarry', async () => {
  const { newRun, recordFrame, startReplay, lastRun, stopReplay } =
    await import('../src/replay.js');
  newRun(77, 2);
  assert.equal(G.level, 2);
  keys.r = true;
  for (let i = 0; i < 30; i++) {
    recordFrame(DT);
    update(DT);
  }
  const x = P.x;
  delete keys.r;
  assert.equal(lastRun().level, 2);
  startReplay(lastRun());
  assert.equal(G.level, 2);
  assert.ok(P.x < x, 'back at the start of the stage');
  stopReplay();
});
