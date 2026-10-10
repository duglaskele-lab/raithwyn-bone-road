import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARMOR,
  BLAST,
  CORPSE_T,
  DYNAMITE,
  LIZARD,
  MINER,
  SLIME,
  STAGE_HOLD,
  TYPES,
  WAVES,
  WEIGHT,
} from '../src/config.js';
import { APP, G, P } from '../src/state.js';
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
import { FLOOR, L2, PATH, WAVEGEN2, WAVES2, topY } from '../src/level2.js';
import { seedRandom, setRandom } from '../src/util.js';
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
  APP.state = 'win';
  G.endT = 3;
  P.score = 1234;
  P.lives = 1;
  pressed.atk = true;
  update(DT);
  assert.equal(G.level, 2);
  assert.equal(APP.state, 'play');
  assert.equal(P.score, 1234);
  assert.equal(P.lives, 1);
});

test('the floor of Old Quarry: two streets and the camp joined by two slants down', () => {
  quarry();
  assert.ok(onFloor(500, 450));
  assert.ok(!onFloor(500, 300), 'the houses are not floor');
  assert.ok(onFloor(2600, topY(2600) + 80), 'on the first slant');
  assert.ok(onFloor(3700, L2.Y_B + 80), 'on the lower street');
  assert.ok(onFloor(4800, topY(4800) + 80), 'on the second slant');
  assert.ok(onFloor(7000, L2.Y_C + 80), 'in the tunnel');
  assert.ok(!onFloor(3700, L2.Y_A + 80), 'the lower street is lower');
  // off the floor: pulled back onto it
  const o = floorClamp({ x: 3700, y: 300 });
  assert.ok(onFloor(o.x, o.y));
  // the floor pieces join up: walking the camera path stays on the floor
  for (let d = 0; d < px(WAVES2[WAVES2.length - 1].s); d += 40) {
    const c = pathAt(d);
    assert.ok(onFloor(c.x, c.y), `the road at ${d} px (${c.x}, ${c.y})`);
  }
  assert.equal(FLOOR.length, 5);
});

test('fights are only on the flat, never on a slant', () => {
  for (const w of WAVES2) {
    const c = pathAt(px(w.s), PATH);
    // the player's half of the screen is on level ground
    for (const x of [c.x - 150, c.x, c.x + 150])
      assert.ok(
        [L2.Y_A, L2.Y_B, L2.Y_C].includes(topY(x)),
        `a fight at s=${w.s} stands on a slant (x ${Math.round(x)})`,
      );
  }
  // no part of the road goes straight down the screen
  for (let i = 1; i < PATH.length; i++) assert.ok(PATH[i][0] > PATH[i - 1][0]);
});

test('Old Quarry is about 30% longer than the Bone Road', () => {
  const l1 = WAVES[WAVES.length - 1].x,
    l2 = px(WAVES2[WAVES2.length - 1].s),
    k = l2 / l1;
  assert.ok(k > 1.22 && k < 1.4, `${l2} px against ${l1} px: ${k.toFixed(2)}`);
});

test('the camera follows the road: right, down a slant, right, down again, right', () => {
  quarry();
  const at = (s) => {
    const c = pathAt(px(s));
    return [c.cx, c.cy];
  };
  const [x0, y0] = at(0),
    [x1, y1] = at(1.5),
    [x2, y2] = at(2.5),
    [x3, y3] = at(3.5),
    [x4, y4] = at(4.5);
  assert.ok(x1 > x0 && y1 > y0, 'down the first slant');
  assert.ok(x2 > x1 && y2 > y1);
  assert.ok(x3 > x2 && y3 > y2, 'down the second slant');
  assert.ok(x4 > x3 && Math.abs(y4 - at(4)[1]) < 1, 'level in the mine');
});

test('walking down the slant reaches the fight on the lower street', () => {
  quarry(px(1.2));
  G.waveI = WAVES2.findIndex((w) => w.s > 2);
  keys.r = true;
  step(14, () => (P.inv = 1));
  assert.ok(G.wave, 'the fight has started');
  assert.ok(Math.abs(G.camS - px(WAVES2[G.waveI].s)) < 1e-6);
  assert.ok(G.camY > 200, 'the camera came down');
});

test('enemies come from off the screen at the sides', () => {
  quarry(px(0.6));
  const a = spawn('miner', 1);
  assert.ok(a.x > G.cam + 900, 'from the right');
  const b = spawn('miner', -1);
  assert.ok(b.x < G.cam, 'from the left');
  assert.ok(onFloor(a.x, a.y) && onFloor(b.x, b.y));
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
  // a light enemy: any hit stops the lunge
  hurtEnemy(e, 1, 1, false, 'punch');
  assert.equal(e.state, 'hurt');
  assert.equal(TYPES.lizard.weight, undefined);
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

test('rolled fights of Old Quarry: at most two power armours, one strongman, two banshees', () => {
  const kinds = ['miner', 'zombie', 'dynamite', 'lizard', 'armor', 'strongman', 'banshee'],
    seen = new Set();
  for (let i = 0; i < 300; i++) {
    const w = rollWave(1, WAVEGEN2),
      n = (k) => w.filter((s) => s[0] === k).length;
    assert.ok(n('armor') <= 2);
    assert.ok(n('strongman') <= 1);
    assert.ok(n('banshee') <= 2);
    assert.ok(w.every((s) => kinds.includes(s[0])));
    for (const s of w) seen.add(s[0]);
  }
  assert.ok(seen.has('strongman') && seen.has('banshee'), 'the new ones do come');
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

test('the last fight: the Prospector, alone', () => {
  const last = WAVES2[WAVES2.length - 1];
  assert.deepEqual(
    last.sp.map((s) => s[0]),
    ['prospector'],
  );
  assert.equal(last.mid, undefined, 'no miners join in');
  assert.ok(last.final && last.boss);
  quarry(px(last.s));
  G.waveI = WAVES2.length - 1;
  G.wave = { sp: last.sp.map((s) => s.slice()), t: 0 };
  P.inv = 99;
  step(2, () => (P.inv = 99));
  assert.deepEqual(
    G.enemies.map((e) => e.type),
    ['prospector'],
  );
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

test('a lizard or a power armour falls down dead instead of bursting into bones', () => {
  for (const type of ['lizard', 'armor']) {
    freshGame();
    quarry();
    P.x = 300;
    const e = spawn(type, 1, 600, 450);
    e.state = 'chase';
    hurtEnemy(e, 9999, 1, false, 'punch');
    assert.ok(!e.dead, `${type}: not gone at once`);
    assert.equal(e.state, 'fall');
    assert.ok(!G.debris.some((d) => d.k === 'bone'), `${type}: no bones`);
    assert.ok(!hurtEnemy(e, 5, 1, false, 'punch'), 'a dead one takes no more hits');
    step(1);
    assert.equal(e.state, 'corpse', 'lying on the ground');
    assert.equal(e.z, 0);
    step(CORPSE_T);
    assert.ok(e.dead && !G.enemies.includes(e), 'then it is gone');
  }
});

test('the power armour never climbs out of the ground, and telegraphs its kick', () => {
  quarry(px(0.6));
  for (let i = 0; i < 20; i++) {
    const e = spawn('armor', 0);
    assert.notEqual(e.state, 'rise');
    assert.ok(e.x < G.cam || e.x > G.cam + 960, 'from a side');
  }
  assert.equal(TYPES.armor.style, 'kick');
  assert.ok(TYPES.armor.wind >= 0.5);
  freshGame();
  quarry();
  P.x = 500;
  P.y = 450;
  const k = spawn('armor', 1, 590, 450);
  Object.assign(k, { state: 'windup', t: 0, face: -1, gunCd: 99, rolled: true }); // a kick, not a dodge
  step(TYPES.armor.wind - 0.05);
  assert.equal(P.hp, 100, 'nothing yet: time to get away');
  step(0.2);
  assert.ok(P.hp < 100 && ['ko', 'down', 'getup'].includes(P.state), 'the kick knocks her down');
});

test('the bodies of the dead do not hold up the walk on: only live enemies count', () => {
  quarry();
  G.waveI = 0;
  G.wave = { sp: [], t: 5 };
  const e = spawn('lizard', 1, 600, 450);
  e.state = 'chase';
  hurtEnemy(e, 9999, 1, false, 'punch');
  step(0.6);
  assert.ok(G.enemies.includes(e), 'the body still lies there');
  assert.equal(G.wave, null, 'but the fight is over');
  assert.equal(G.waveI, 1);
  assert.ok(G.goT > 0, 'GO');
});

test('the power armour leaps onto a marked spot: the player or, half the time, elsewhere', () => {
  const J = ARMOR.jump;
  let onPlayer = 0,
    hurt = 0;
  const N = 20;
  for (let k = 0; k < N; k++) {
    freshGame();
    quarry();
    seedRandom(1000 + k);
    P.x = 400;
    P.y = 450;
    P.inv = 0;
    const e = spawn('armor', 1, 700, 450);
    Object.assign(e, { state: 'chase', t: 0, face: -1, gunCd: 99, jumpCd: 0 });
    step(DT * 2);
    assert.equal(e.state, 'jcrouch', 'it crouches for the jump');
    assert.ok(Number.isFinite(e.jx) && Number.isFinite(e.jy), 'the landing spot is marked');
    const [jx, jy] = [e.jx, e.jy];
    if (Math.hypot(jx - P.x, jy - P.y) < 5) onPlayer++;
    step(J.crouch + J.air);
    assert.equal(e.state, 'jland');
    assert.ok(Math.abs(e.x - jx) < 1 && Math.abs(e.y - jy) < 1, 'lands on the mark');
    const ex = (P.x - jx) / J.rx,
      ey = (P.y - jy) / J.ry;
    if (P.hp < 100) {
      hurt++;
      assert.ok(ex * ex + ey * ey < 1, 'only inside the marked area');
    }
    step(J.rec + 0.1);
    assert.equal(e.state, 'chase');
    assert.ok(e.jumpCd >= J.cd[0] - 1, 'then a while before the next');
  }
  assert.ok(onPlayer > N * 0.25 && onPlayer < N * 0.75, `${onPlayer}/${N} on the player`);
  assert.ok(hurt >= onPlayer, 'landing on her hurts');
});

test('up close a quarter of its kicks become a jump away, on the jets of its pack', () => {
  assert.equal(ARMOR.jump.dodge, 0.25);
  assert.ok(ARMOR.jump.rx >= 131 && ARMOR.jump.ry >= 52, 'a quarter wider landing area');
  let dodged = 0;
  const N = 60;
  for (let k = 0; k < N; k++) {
    freshGame();
    quarry();
    seedRandom(500 + k);
    P.x = 500;
    P.y = 450;
    P.inv = 99;
    const e = spawn('armor', 1, 580, 450);
    Object.assign(e, { state: 'chase', t: 0, face: -1, gunCd: 99, jumpCd: 99, cd: 0 });
    for (let i = 0; i < 10 && !['windup', 'jcrouch'].includes(e.state); i++) step(DT);
    step(DT * 3); // the wind-up's first frames: kick or jump
    if (e.state === 'jcrouch') {
      dodged++;
      assert.ok(Math.abs(e.jx - P.x) > 100, 'away from the player');
      if (dodged === 1) {
        G.parts = [];
        step(ARMOR.jump.crouch + ARMOR.jump.air / 2);
        assert.equal(e.state, 'jump');
        assert.ok(e.z > 50, 'up in the air');
        assert.ok(
          G.parts.filter((p) => p.k === 'glow' && p.vy > 100).length > 10,
          'flame out of the jets',
        );
        assert.ok(
          G.parts.some((p) => p.k === 'smoke'),
          'and smoke',
        );
      }
    } else assert.equal(e.state, 'windup');
  }
  assert.ok(dodged > N * 0.1 && dodged < N * 0.45, `${dodged}/${N} kicks became a jump`);
});

test('the minigun sets off red barrels and sticks of dynamite in its stream, and a blast sets off the dynamite around it', async () => {
  const { explode } = await import('../src/blast.js');
  quarry();
  P.x = 150;
  P.y = 450;
  P.inv = 99;
  const tnt = { isProp: 1, decor: 'tnt', x: 560, y: 450, z: 0, w: 24, hp: 1, drop: null };
  G.props = [tnt];
  const stick = { k: 'tnt', x: 520, y: 450, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, fuse: 9, life: 99 };
  G.projs = [stick];
  const e = spawn('armor', 1, 800, 450);
  Object.assign(e, { state: 'fire', t: 0, face: -1, reachD: 240, aimY: 450, shot: 0, hits: 0 });
  for (let t = 0; t < 1 && !(tnt.dead && stick.life <= 0); t += DT) {
    e.reachD = 240 + 60 * Math.sin(t * 20); // the stream sweeps over both
    update(DT);
  }
  assert.ok(tnt.dead, 'the red barrel went off');
  assert.ok(stick.life <= 0, 'and so did the dynamite');
  // a blast: the sticks around it go off a moment later, not those far away
  const near = { k: 'tnt', x: 400, y: 450, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, fuse: 9, life: 99 },
    far = { ...near, x: 900 };
  G.projs = [near, far];
  explode(320, 450, 'dynamite');
  assert.ok(near.fuse <= 0.14, 'the one beside it is about to go off');
  assert.equal(far.fuse, 9, 'the one far off is not');
});

test('holding X on the first screen of Old Quarry takes the player to the Prospector', () => {
  startLevel(2);
  G.banner = null;
  assert.ok(!G.secretDone);
  keys.secret = true;
  step(3.1);
  delete keys.secret;
  const last = WAVES2.length - 1;
  assert.equal(G.waveI, last);
  step(2.5);
  assert.ok(G.wave, 'the fight is on');
  assert.ok(G.enemies.some((e) => e.type === 'prospector'));
});

test("Lucy's big gun is always a heavy blow; her grenade's blast is a crushing one", async () => {
  const { explode } = await import('../src/blast.js');
  quarry();
  P.x = 300;
  P.y = 450;
  // a full-power big gun bullet does not move a power armour (only a crushing blow would)
  const a = spawn('armor', 1, 600, 450);
  a.state = 'chase';
  G.projs.push({
    k: 'bullet',
    big: 1,
    power: 1,
    hit: new Set(),
    dmg: 40,
    x: 520,
    y: 450,
    z: 130,
    vx: 1700,
    rot: 0,
    life: 0.7,
  });
  step(0.1);
  assert.ok(a.hp < TYPES.armor.hp, 'hurt');
  assert.notEqual(a.state, 'air', 'but not thrown');
  // a grenade's blast throws it
  G.freeze = 0;
  explode(a.x, a.y, 'grenade');
  assert.equal(a.state, 'air', 'thrown by the grenade');
});
