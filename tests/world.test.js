import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CHAIN_GAP, HADO, RAGE, RL, TYPES, W, WAVES } from '../src/config.js';
import { G, P } from '../src/state.js';
import { keys, pressed } from '../src/input.js';
import { spawn } from '../src/enemies.js';
import { update } from '../src/world.js';
import { DT, allFinite, freshGame } from './helpers.js';

beforeEach(freshGame);

// Mirrors the real frame loop: one update, then the "just pressed" flags are cleared.
const step = (seconds, each) => {
  for (let i = 0; i < seconds / DT; i++) {
    update(DT);
    for (const k in pressed) delete pressed[k];
    each?.(i);
  }
};

test('walking right reaches the first fight and locks the camera there', () => {
  keys.r = true;
  step(8, () => (P.inv = 1));
  assert.equal(G.cam, WAVES[0].x);
  assert.ok(G.wave, 'the first wave should be running');
  assert.ok(G.enemies.length > 0);
});

test('every enemy type can fight for 20 seconds without breaking the simulation', () => {
  for (const type of Object.keys(TYPES)) {
    freshGame();
    P.x = 480;
    spawn(type, 1, 700, 450);
    step(20, () => (P.hp = 100));
    assert.ok(allFinite(P, ['x', 'y', 'z', 'hp', 'rage']), `player state after ${type}`);
    for (const e of G.enemies) assert.ok(allFinite(e, ['x', 'y', 'z', 'hp']), type);
  }
});

test('jumping and punching in the air is allowed once per jump', () => {
  pressed.jump = true;
  step(0.2);
  assert.equal(P.state, 'jump');
  pressed.atk = true;
  step(0.05);
  assert.equal(P.airUsed, 1);
  assert.equal(P.an[0], 'punch2');
  step(1);
  assert.equal(P.state, 'idle');
  assert.equal(P.z, 0);
});

// One key pressed and let go: held for a frame, as fast as a quick hand.
const tapKey = (k) => {
  keys[k] = pressed[k] = true;
  step(DT);
  delete keys[k];
  step(0.05);
};

test('a tap of L always throws a level I dark ball', () => {
  for (const rage of [300, 150]) {
    freshGame();
    P.rage = rage;
    pressed.hado = true;
    keys.hado = true;
    step(DT);
    assert.equal(P.state, 'hado', 'straight into the throw, no charging');
    step(1); // held on: nothing more
    delete keys.hado;
    assert.equal(P.hl, 1);
    assert.equal(P.rage, rage - 100);
  }
});

test('S S D L / S S A L throws the strongest dark ball the rage pays for', () => {
  assert.equal(HADO.motion, 0.8);
  for (const [rage, dir, lv] of [
    [300, 'r', 3],
    [300, 'l', 3],
    [250, 'r', 2],
    [150, 'l', 1],
  ]) {
    freshGame();
    P.rage = rage;
    P.face = dir === 'r' ? -1 : 1; // facing away: the motion turns her
    for (const k of ['d', 'd', dir, 'hado']) tapKey(k);
    step(1);
    assert.equal(P.hl, lv, `${rage} rage, ${dir}`);
    assert.equal(P.rage, rage - RL[lv - 1]);
    assert.equal(P.face, dir === 'r' ? 1 : -1);
  }
  // a broken or a slow motion is a plain L
  for (const [ks, wait] of [
    [['d', 'r', 'd'], 0],
    [['d', 'd', 'u'], 0],
    [['d', 'd', 'r'], 1],
  ]) {
    freshGame();
    P.rage = 300;
    for (const k of ks) tapKey(k);
    step(wait);
    tapKey('hado');
    step(1);
    assert.equal(P.hl, 1, ks.join(' ') + (wait ? ' slowly' : ''));
    assert.equal(P.rage, 200);
  }
});

test('the level can be finished: clearing all ten fights ends in victory', () => {
  keys.r = true;
  step(400, () => {
    P.inv = 1;
    for (const e of G.enemies) if (e.state !== 'rise') e.dead = true;
  });
  assert.equal(G.waveI, WAVES.length);
  assert.equal(G.state, 'win');
});

test('a chained wave starts right where the last one ended, with no walk in between', () => {
  const i = WAVES.findIndex((w) => w.chain);
  assert.ok(i > 0);
  G.waveI = i - 1;
  G.cam = WAVES[i - 1].x;
  G.wave = { sp: [], t: 0 };
  G.enemies = [];
  step(DT);
  assert.equal(G.waveI, i);
  assert.ok(G.wave, 'the next wave is already running');
  assert.equal(G.cam, WAVES[i].x);
  step(CHAIN_GAP + 0.1);
  assert.ok(G.enemies.length > 0, 'and its first enemy is out');
});

test('a slide across the dark ball button (touch) throws the strongest ball that way', () => {
  for (const [k, face] of [
    ['hadoR', 1],
    ['hadoL', -1],
  ]) {
    freshGame();
    P.rage = 300;
    P.face = -face;
    pressed[k] = true;
    step(1);
    assert.equal(P.hl, 3);
    assert.equal(P.face, face);
    assert.equal(P.rage, 0);
  }
});

test('the idle loop: one atlas frame per held pose, the poses in order and round again', async () => {
  const { FR } = await import('../src/atlas-frames.js');
  const { IDLE_HOLD } = await import('../src/config.js');
  const { idlePose } = await import('../src/player.js');
  assert.equal(FR.idle.length, IDLE_HOLD.length);
  const total = IDLE_HOLD.reduce((n, h) => n + h, 0);
  let last = -1,
    seen = 0;
  for (let k = 0; k < total; k++) {
    const i = idlePose((k + 0.5) / 24);
    if (i !== last) {
      assert.equal(i, last + 1, 'poses in order');
      seen++;
    }
    last = i;
  }
  assert.equal(seen, IDLE_HOLD.length);
  assert.equal(idlePose(total / 24 + 0.01), 0, 'round again');
});

test('Lucy fires her pistol on K: a very fast bullet from the muzzle that hits the first enemy', async () => {
  const { BULLET, D } = await import('../src/config.js');
  const { FR } = await import('../src/lucy-frames.js');
  assert.equal(FR.throw.length, 4, 'side on, drawing, aiming, firing');
  P.who = 'lucy';
  P.rage = 100;
  P.x = 300;
  P.y = 450;
  const props = G.props;
  G.props = []; // nothing breakable in the line of fire
  const e = spawn('fat', 1, 900, 450);
  e.state = 'chase';
  const hp = e.hp;
  pressed.bone = true;
  update(DT);
  for (const k in pressed) delete pressed[k];
  assert.equal(P.state, 'throw');
  assert.equal(P.rage, 100 - BULLET.cost);
  const fire = D.gun.slice(0, 3).reduce((a, b) => a + b, 0);
  let shot = null;
  for (let t = 0; t < fire + 0.1 && !shot; t += DT) {
    update(DT);
    shot = G.projs.find((q) => q.k === 'bullet');
  }
  assert.ok(shot, 'a bullet');
  assert.ok(Math.abs(shot.vx) >= 2000, 'very fast');
  assert.equal(G.projs.filter((q) => q.k === 'bone').length, 0, 'no bone');
  assert.ok(Math.abs(shot.x - (P.x + BULLET.x)) < 60, 'from the muzzle');
  let seen = null;
  for (let i = 0; i < 0.35 / DT && e.hp === hp; i++) {
    update(DT);
    seen = G.projs.find((q) => q.k === 'bullet');
  }
  assert.ok(e.hp < hp, 'it reached an enemy 600 px away in a blink');
  assert.ok(
    seen && Math.abs(seen.x - e.x) < 1,
    'it goes out in the middle of the enemy, not before',
  );
  G.props = props;
  P.who = 'raithwyn';
});

test('Lucy keeps firing while K is held, aiming and firing in turn, each shot paid for', async () => {
  const { BULLET } = await import('../src/config.js');
  P.who = 'lucy';
  P.rage = 100;
  G.enemies = [];
  const props = G.props;
  G.props = [];
  keys.bone = true;
  pressed.bone = true;
  update(DT);
  delete pressed.bone;
  const seen = new Set();
  let shots = 0;
  for (let t = 0; t < 1.2; t += DT) {
    const n = G.projs.length;
    update(DT);
    shots += G.projs.filter((q) => q.k === 'bullet').length > 0 && G.projs.length > n ? 1 : 0;
    assert.equal(P.state, 'throw', 'the pistol stays up');
    if (t > 0.4) seen.add(P.an[1]);
  }
  assert.ok(shots >= 5, `several shots in a row (${shots})`);
  assert.deepEqual([...seen].sort(), [2, 3], 'aiming and firing frames in turn');
  assert.equal(P.rage, 100 - BULLET.cost * shots, 'every shot costs rage');
  keys.bone = false;
  for (let t = 0; t < 0.4; t += DT) update(DT);
  assert.notEqual(P.state, 'throw', 'let go: she puts it away');
  G.props = props;
  P.who = 'raithwyn';
});

test('Lucy has her own frames for taking a hit and being knocked down', async () => {
  const { FR } = await import('../src/lucy-frames.js');
  assert.equal(FR.hurt.length, 2);
  assert.equal(FR.ko.length, 6);
});

test('Lucy throws a spinning grenade on L: an arc, little hops, and a wide blast that spares her', async () => {
  const { FR } = await import('../src/lucy-frames.js');
  const { BLAST, GRENADE } = await import('../src/config.js');
  assert.equal(FR.jump.length, 5, 'her jump: crouch, rising, top, falling, landing');
  assert.equal(FR.grenade.length, 5, 'her throw');
  assert.equal(FR.nade.length, 1, 'the grenade');
  const props = G.props;
  G.props = [];
  const throwIt = (x) => {
    for (let t = 0; t < 0.2; t += DT) update(DT); // the last blast's freeze wears off
    P.who = 'lucy';
    P.state = 'idle';
    P.rage = 150;
    P.x = x;
    P.y = 450;
    P.face = 1;
    P.hp = 100;
    pressed.hado = true;
    update(DT);
    delete pressed.hado;
    assert.equal(P.state, 'nade');
    assert.equal(P.rage, 150 - GRENADE.cost);
    let q = null;
    for (let t = 0; t < 0.5 && !q; t += DT) {
      update(DT);
      q = G.projs.find((o) => o.k === 'nade');
    }
    assert.ok(q, 'it leaves her hand');
    const track = [];
    let rot0 = q.rot,
      turned = 0;
    while (q.life > 0) {
      update(DT);
      track.push({ x: q.x, z: q.z });
      turned = Math.abs(q.rot - rot0);
    }
    return { track, turned };
  };
  // out in the open: an arc, then two little hops, then the blast
  const { track, turned } = throwIt(G.cam + 150);
  const end = track.at(-1).x,
    top = Math.max(...track.map((p) => p.z));
  assert.ok(top > GRENADE.z + 50, 'it rises in an arc');
  assert.ok(turned > Math.PI * 2, 'it spins as it flies');
  let hops = 0;
  for (let i = 1; i < track.length; i++) if (track[i - 1].z === 0 && track[i].z > 0) hops++;
  assert.equal(hops, GRENADE.bounces, 'little hops before it goes off');
  const reach = end - (G.cam + 150);
  assert.ok(
    reach > 330 && reach < 480,
    `about three quarters as far as before (${Math.round(reach)})`,
  );
  // the blast: hard and wide, and not on her
  const a = spawn('fat', 1, end, 450),
    b = spawn('fat', 1, end + BLAST.grenade.r * 0.8, 450);
  a.state = b.state = 'chase';
  const ha = a.hp,
    hb = b.hp;
  P.x = G.cam + 150;
  throwIt(G.cam + 150);
  assert.ok(a.hp < ha && b.hp < hb, 'the blast reaches both');
  assert.ok(ha - a.hp >= 50, 'and hits hard');
  assert.equal(P.hp, 100, 'she is not hurt by her own grenade');
  G.enemies = [];
  // thrown at the screen's edge: it stays on screen
  const edge = throwIt(G.cam + W - 120).track;
  assert.ok(
    edge.every((p) => p.x <= G.cam + W - 20 + 1e-6),
    'it never leaves the screen',
  );
  G.props = props;
  P.who = 'raithwyn';
});

test('holding J: the fighter keeps punching on its own, whole chains, and stops when it is let go', () => {
  G.enemies = [];
  P.state = 'idle';
  keys.atk = true;
  pressed.atk = true;
  update(DT);
  delete pressed.atk;
  const states = [];
  for (let t = 0; t < 1.6; t += DT) {
    update(DT);
    if (states.at(-1) !== P.state) states.push(P.state);
  }
  const starts = states.filter((s) => s.startsWith('atk')).length;
  assert.ok(starts >= 4, `punch after punch with no new press (${states.join(' ')})`);
  assert.ok(states.includes('atk2'), 'the chain reaches its finisher');
  keys.atk = false;
  for (let t = 0; t < 0.6; t += DT) update(DT);
  assert.ok(!P.state.startsWith('atk'), 'let go: it stops');
});

test('Lucy: 10% less health, and her luck: a finishing blow may leave her on 10%, more so at higher style ranks', async () => {
  const { LUCK, MAX_HP } = await import('../src/config.js');
  const { newRun } = await import('../src/replay.js');
  const { hitPlayer } = await import('../src/combat.js');
  newRun(5, 1, 'lucy');
  assert.equal(P.maxHp, 90);
  assert.equal(P.hp, 90);
  assert.equal(MAX_HP.raithwyn, 100);
  // how often a finishing blow is shrugged off, at a style rank (0 = none, 7 = SSS)
  const luck = (rank) => {
    let saved = 0;
    for (let i = 0; i < 600; i++) {
      Object.assign(P, { state: 'atk1', inv: 0, z: 0, hp: 5, lucky: 0, sty: rank * 100 + 50 });
      G.state = 'play';
      hitPlayer(30, 1, false);
      if (P.hp > 0) {
        saved++;
        assert.equal(P.hp, Math.round(90 * LUCK.hp), 'back on 10% of her health');
        assert.equal(P.state, 'ko', 'she still goes down');
        assert.ok(P.lucky > 0, 'the sign lights up');
      }
    }
    return saved / 600;
  };
  const low = luck(0),
    sss = luck(7);
  assert.ok(Math.abs(low - LUCK.chance) < 0.04, `about 10% with no rank (${low})`);
  assert.ok(Math.abs(sss - (LUCK.chance + 7 * LUCK.perRank)) < 0.06, `about 45% at SSS (${sss})`);
  // Raithwyn has no such luck
  newRun(5, 1, 'raithwyn');
  assert.equal(P.maxHp, 100);
  Object.assign(P, { state: 'idle', inv: 0, hp: 5 });
  G.state = 'play';
  hitPlayer(30, 1, false);
  assert.equal(P.hp, 0);
});

test('Lucy: her new run, a dodge now and then, her big gun for the super, and a drink when she wins', async () => {
  const { FR } = await import('../src/lucy-frames.js');
  const { FIGHTER_ANIM, LUCK } = await import('../src/config.js');
  const { newRun } = await import('../src/replay.js');
  const { hitPlayer } = await import('../src/combat.js');
  assert.equal(FR.run.length, 6, 'her drawn run');
  assert.equal(FR.run2.length, 8, 'her second run is kept too');
  assert.equal(FR.run1.length, 8, 'the first run is kept in the atlas');
  assert.deepEqual([FR.evade1.length, FR.evade2.length, FR.evade3.length], [7, 7, 6]);
  assert.equal(FR.super.length, 12);
  const d = FIGHTER_ANIM.lucy.drink;
  assert.equal(FR.drink.length, d.intro + d.loop);
  newRun(7, 1, 'lucy');
  // a blow on her feet: now and then she dodges it, with one of her three dodges
  let dodged = 0;
  const kinds = new Set();
  for (let i = 0; i < 400; i++) {
    Object.assign(P, { state: 'idle', inv: 0, z: 0, hp: 90 });
    G.state = 'play';
    hitPlayer(5, 1, false);
    if (P.state === 'evade') {
      dodged++;
      kinds.add(P.ev);
      assert.equal(P.hp, 90, 'a dodged blow does no harm');
    }
  }
  assert.ok(Math.abs(dodged / 400 - LUCK.evade) < 0.04, `about one in ten (${dodged})`);
  assert.equal(kinds.size, 3, 'all three dodges');
  G.freeze = 0;
  Object.assign(P, { state: 'evade', ev: 2, t: 0, inv: 0 });
  update(DT);
  assert.equal(P.an[0], 'evade2');
  for (let t = 0; t < 0.6; t += DT) update(DT);
  assert.equal(P.state, 'idle', 'back on guard');
  // the win: she sits down and then drinks on and on, the last frames back and forth
  Object.assign(P, { state: 'win', t: 0 });
  const seen = new Set();
  for (let t = 0; t < 6; t += DT) {
    P.t = t;
    update(0);
    seen.add(P.an[1]);
    if (t > d.intro * d.t) assert.ok(P.an[1] >= d.intro, 'the drinking goes on');
  }
  assert.equal(seen.size, FR.drink.length, 'every frame shows');
  P.who = 'raithwyn';
});

test("Lucy's super on I: no charging, her big gun at once, shot after shot while I is held, slower and harder than her pistol", async () => {
  const { BIG_GUN, BULLET, MAXR } = await import('../src/config.js');
  const { newRun } = await import('../src/replay.js');
  newRun(3, 1, 'lucy');
  G.banner = null;
  G.enemies = [];
  G.props = [];
  P.rage = 300;
  assert.equal(BIG_GUN.cost, MAXR * 0.2, 'a fifth of the bar a shot');
  keys.super = true;
  pressed.super = true;
  update(DT);
  delete pressed.super;
  assert.equal(P.state, 'bigGun', 'straight to the gun, no charge');
  assert.equal(P.rage, 300 - BIG_GUN.cost);
  let shots = 0,
    big = null;
  for (let t = 0; t < 1.5; t += DT) {
    const n = G.projs.length;
    update(DT);
    if (G.projs.length > n) {
      shots++;
      big = G.projs.at(-1);
    }
    assert.notEqual(P.state, 'super');
  }
  assert.ok(shots >= 3, `shot after shot (${shots})`);
  assert.ok(big.big && big.dmg > BULLET.dmg * 2, 'harder than her pistol');
  assert.ok(P.rage <= 300 - 3 * BIG_GUN.cost, 'each shot paid for');
  const cycle = BIG_GUN.shot.reduce((a, b) => a + b);
  assert.ok(cycle > 0.3, 'slower than the pistol');
  // out of rage: she puts it away
  keys.super = false;
  for (let t = 0; t < 0.6; t += DT) update(DT);
  assert.notEqual(P.state, 'bigGun');
  P.who = 'raithwyn';
});

test("Lucy's big-gun bullet goes through a line of enemies, a fifth weaker each time, and is gone when nothing is left", async () => {
  const { BIG_GUN } = await import('../src/config.js');
  const { newRun } = await import('../src/replay.js');
  newRun(3, 1, 'lucy');
  G.banner = null;
  G.enemies = [];
  G.props = [];
  P.x = G.cam + 120;
  P.face = 1;
  // six fat ones in a row (fat: they take a lot)
  const line = [0, 1, 2, 3, 4, 5].map((k) => {
    const e = spawn('fat', 1, G.cam + 260 + k * 110, P.y);
    e.state = 'idle';
    e.hp = e.maxHp = 500;
    return e;
  });
  G.projs.push({
    k: 'bullet',
    big: 1,
    power: 1,
    hit: new Set(),
    dmg: BIG_GUN.dmg,
    x: P.x + 60,
    y: P.y,
    z: BIG_GUN.z,
    vx: BIG_GUN.speed,
    rot: 0,
    life: BIG_GUN.life,
  });
  for (let t = 0; t < 0.6; t += DT) {
    G.freeze = 0;
    update(DT);
  }
  const lost = line.map((e) => 500 - e.hp);
  for (let k = 0; k < 5; k++) assert.ok(lost[k] > 0, `enemy ${k + 1} is hit`);
  for (let k = 1; k < 5; k++) assert.ok(lost[k] < lost[k - 1], 'each one less than the one before');
  assert.ok(Math.abs(lost[1] / lost[0] - 0.8) < 0.05, 'a fifth weaker after the first');
  assert.equal(lost[5], 0, 'the sixth: nothing left of it');
  assert.ok(!G.projs.some((q) => q.big), 'it is gone');
  P.who = 'raithwyn';
});
