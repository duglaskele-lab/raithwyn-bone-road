import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CHAIN_GAP, HADO, RAGE, RL, TYPES, W, WAVES } from '../src/config.js';
import { APP, G, P } from '../src/state.js';
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
  assert.equal(APP.state, 'win');
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
  assert.equal(P.rage, 100, 'no rage: it takes rounds');
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
  const { BULLET, LUCY } = await import('../src/config.js');
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
  assert.equal(P.ammo, LUCY.ammo - shots, 'every shot takes a round');
  keys.bone = false;
  for (let t = 0; t < 0.4; t += DT) update(DT);
  assert.notEqual(P.state, 'throw', 'let go: she puts it away');
  G.props = props;
  P.who = 'raithwyn';
});

test('Lucy: J J K, a heavy shot straight from the aim: it knocks down, three times the damage, one round', async () => {
  const { BULLET, D, LUCY } = await import('../src/config.js');
  // J, J (two punches), then K: the pistol comes up already aimed
  const jjk = (holdK = false) => {
    for (const b of ['atk', 'atk']) {
      pressed[b] = true;
      update(DT);
      delete pressed[b];
      for (let i = 0; i < 0.12 / DT; i++) update(DT);
    }
    pressed.bone = true;
    if (holdK) keys.bone = true;
    update(DT);
    delete pressed.bone;
    for (let i = 0; i < 0.3 / DT && P.state !== 'gunFin'; i++) update(DT);
  };
  const setup = () => {
    freshGame();
    Object.assign(P, { who: 'lucy', x: 300, y: 450, ammo: LUCY.ammo, streak: 0 });
    G.props = [];
    G.items = [];
  };
  setup();
  const e = spawn('grunt', 1, 800, 450);
  Object.assign(e, { state: 'chase', hp: 500 });
  jjk();
  assert.equal(P.state, 'gunFin', 'her shot after two punches');
  let shot = null;
  for (let t = 0; t <= D.gunFin[0] + DT && !shot; t += DT) {
    update(DT);
    assert.equal(P.an[0], 'throw');
    assert.ok(P.an[1] >= 2, 'straight to the aiming and firing frames');
    shot = G.projs.find((q) => q.k === 'bullet');
  }
  assert.ok(shot && shot.fin, 'fired at once');
  assert.equal(shot.dmg, BULLET.dmg * 3, 'three times the pistol');
  assert.equal(P.ammo, LUCY.ammo - 1, 'one round');
  const hp = e.hp;
  for (let i = 0; i < 0.3 / DT && e.hp === hp; i++) update(DT);
  assert.ok(e.hp < hp);
  assert.ok(['air', 'down'].includes(e.state), `it knocks down (${e.state})`);
  assert.ok(
    G.parts.some((p) => p.k === 'gring' && p.col === '#ffcf4a'),
    'golden sparks of its own',
  );

  // K held: still one shot, no run of shots after it
  setup();
  jjk(true);
  for (let t = 0; t < 0.8; t += DT) update(DT);
  keys.bone = false;
  assert.equal(P.ammo, LUCY.ammo - 1, 'one shot only');
  assert.notEqual(P.state, 'throw');

  // no round left: no shot
  setup();
  P.ammo = 0;
  jjk();
  assert.notEqual(P.state, 'gunFin');
  assert.equal(G.projs.filter((q) => q.k === 'bullet').length, 0);

  // K alone is her plain shot
  setup();
  pressed.bone = true;
  update(DT);
  delete pressed.bone;
  assert.equal(P.state, 'throw');
  P.who = 'raithwyn';
});

test('Lucy has her own frames for taking a hit and being knocked down', async () => {
  const { FR } = await import('../src/lucy-frames.js');
  assert.equal(FR.hurt.length, 2);
  assert.equal(FR.ko.length, 6);
});

test('Lucy throws a spinning grenade on I: an arc, little hops, and a wide blast that spares her', async () => {
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
    pressed.super = true;
    update(DT);
    delete pressed.super;
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

test('Lucy: 20% less health, and her luck: a finishing blow may leave her on 10%, more so at higher style ranks', async () => {
  const { LUCK, MAX_HP } = await import('../src/config.js');
  const { newRun } = await import('../src/replay.js');
  const { hitPlayer } = await import('../src/combat.js');
  newRun(5, 1, 'lucy');
  assert.equal(P.maxHp, 80);
  assert.equal(P.hp, 80);
  assert.equal(MAX_HP.raithwyn, 100);
  // how often a finishing blow is shrugged off, at a style rank (0 = none, 7 = SSS)
  const luck = (rank) => {
    let saved = 0;
    for (let i = 0; i < 600; i++) {
      Object.assign(P, { state: 'atk1', inv: 0, z: 0, hp: 5, lucky: 0, sty: rank * 100 + 50 });
      APP.state = 'play';
      hitPlayer(30, 1, false);
      if (P.hp > 0) {
        saved++;
        assert.equal(P.hp, Math.round(80 * LUCK.hp), 'back on 10% of her health');
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
  APP.state = 'play';
  hitPlayer(30, 1, false);
  assert.equal(P.hp, 0);
});

test('Lucy: her new run, no dodging by luck, her big gun for the super, and a drink when she wins', async () => {
  const { FR } = await import('../src/lucy-frames.js');
  const { FIGHTER_ANIM } = await import('../src/config.js');
  const { newRun } = await import('../src/replay.js');
  const { hitPlayer } = await import('../src/combat.js');
  assert.equal(FR.run.length, 6, 'her drawn run');
  assert.equal(FR.run2.length, 8, 'her second run is kept too');
  assert.equal(FR.run1.length, 8, 'the first run is kept in the atlas');
  assert.equal(FR.super.length, 12);
  const d = FIGHTER_ANIM.lucy.drink;
  assert.equal(FR.drink.length, d.intro + d.loop);
  newRun(7, 1, 'lucy');
  // a blow on her feet always lands: no dodging it by chance any more
  for (let i = 0; i < 200; i++) {
    Object.assign(P, { state: 'idle', inv: 0, z: 0, hp: 90 });
    APP.state = 'play';
    assert.equal(hitPlayer(5, 1, false), true);
    assert.equal(P.hp, 85);
  }
  G.freeze = 0;
  // the win: she sits down and then drinks on and on, the last frames back and forth
  Object.assign(P, { state: 'win', t: 0 });
  const seen = new Set(),
    ways = new Set();
  let prev = null;
  for (let t = 0; t < 30; t += DT) {
    P.t = t;
    update(0);
    seen.add(P.an[1]);
    if (t > d.intro * d.t) {
      assert.ok(P.an[1] >= 13, 'the drinking goes on, the bottle never put away');
      ways.add(P.dkWay);
      // never a jump of more than two frames: it looks natural
      if (prev !== null) assert.ok(Math.abs(P.an[1] - prev) <= 2, `${prev} -> ${P.an[1]}`);
      prev = P.an[1];
    }
  }
  assert.equal(seen.size, FR.drink.length, 'every frame shows');
  assert.equal(ways.size, d.ways.length, 'every way of drinking comes up');
  for (const w of d.ways) assert.ok(new Set(w).size <= 8, 'at most eight frames a way');
  P.who = 'raithwyn';
});

test("Lucy's big gun on L: no charging, at once, shot after shot while L is held, slower and harder than her pistol", async () => {
  const { BIG_GUN, BULLET, MAXR } = await import('../src/config.js');
  const { newRun } = await import('../src/replay.js');
  newRun(3, 1, 'lucy');
  G.banner = null;
  G.enemies = [];
  G.props = [];
  P.rage = 300;
  assert.equal(BIG_GUN.cost, MAXR * 0.2, 'a fifth of the bar a shot');
  keys.hado = true;
  pressed.hado = true;
  update(DT);
  delete pressed.hado;
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
  keys.hado = false;
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

test('Lucy: seven rounds, a magazine now and then from her punches when she is short, weaker fists', async () => {
  const { LUCY, BULLET } = await import('../src/config.js');
  const { newRun } = await import('../src/replay.js');
  const { strike } = await import('../src/combat.js');
  newRun(4, 1, 'lucy');
  G.banner = null;
  G.enemies = [];
  G.props = [];
  assert.equal(P.ammo, LUCY.ammo);
  assert.equal(BULLET.dmg, 9, 'her pistol');
  // all seven rounds, then an empty click
  keys.bone = true;
  pressed.bone = true;
  for (let t = 0; t < 3; t += DT) {
    update(DT);
    delete pressed.bone;
  }
  keys.bone = false;
  assert.equal(P.ammo, 0, 'seven shots and no more');
  assert.equal(G.projs.filter((q) => q.k === 'bullet').length, 0);
  pressed.bone = true;
  update(DT);
  delete pressed.bone;
  assert.notEqual(P.state, 'throw', 'nothing to fire');
  // her punches: a magazine flies out about one time in seven while she is short
  const e = spawn('fat', 1, P.x + 60, P.y);
  e.state = 'idle';
  let drops = 0;
  for (let i = 0; i < 700; i++) {
    e.hp = 999;
    e.dead = false;
    Object.assign(P, { hit: new Set(), face: 1 });
    G.items = [];
    strike({ x0: 0, x1: 100, dy: 27, dmg: 1, knock: false, rage: 0 });
    if (G.items.some((it) => it.kind === 'ammo')) drops++;
  }
  assert.ok(Math.abs(drops / 700 - LUCY.drop) < 0.035, `about 14% (${drops})`);
  // full: none
  P.ammo = LUCY.ammo;
  G.items = [];
  for (let i = 0; i < 200; i++) {
    e.hp = 999;
    P.hit = new Set();
    strike({ x0: 0, x1: 100, dy: 27, dmg: 1, knock: false, rage: 0 });
  }
  assert.equal(G.items.length, 0, 'no drops with a full gun');
  // one at a time: none while another lies about
  P.ammo = 1;
  G.items = [{ kind: 'ammo', x: P.x + 400, y: P.y, z: 0, vz: 0, t: 1 }];
  for (let i = 0; i < 200; i++) {
    e.hp = 999;
    P.hit = new Set();
    strike({ x0: 0, x1: 100, dy: 27, dmg: 1, knock: false, rage: 0 });
  }
  assert.equal(G.items.length, 1, 'not while another is about');
  // it lies there three seconds, then it is gone
  P.inv = 99; // the enemy beside her may not knock her about meanwhile
  for (let t = 0; t < LUCY.lies - 0.2; t += DT) {
    G.freeze = 0;
    update(DT);
  }
  assert.equal(G.items.length, 1, 'still there');
  for (let t = 0; t < 0.4; t += DT) {
    G.freeze = 0;
    update(DT);
  }
  assert.equal(G.items.length, 0, 'gone');
  // flung at the screen's edge: it comes back
  G.items = [{ kind: 'ammo', x: G.cam + 900, y: P.y + 60, z: 70, vz: 300, vx: 600, t: 0 }];
  let far = 0;
  for (let t = 0; t < 1; t += DT) {
    G.freeze = 0;
    update(DT);
    if (G.items[0]) far = Math.max(far, G.items[0].x - G.cam);
  }
  assert.ok(far <= W - 24 + 1e-6, 'it stays on screen');
  // picked up: full again
  P.ammo = 1;
  G.items = [{ kind: 'ammo', x: P.x, y: P.y, z: 0, vz: 0, t: 1 }];
  G.freeze = 0;
  update(DT);
  assert.equal(P.ammo, LUCY.ammo, 'a magazine fills it');
  // her fists: 20% weaker than Raithwyn's
  const hit = (who) => {
    P.who = who;
    Object.assign(P, { face: 1, state: 'idle' });
    Object.assign(e, { x: P.x + 60, y: P.y, z: 0, state: 'idle', dead: false });
    if (!G.enemies.includes(e)) G.enemies.push(e);
    e.hp = 999;
    P.hit = new Set();
    strike({ x0: 0, x1: 100, dy: 27, dmg: 10, knock: false, rage: 0 });
    return 999 - e.hp;
  };
  const lucy = hit('lucy'),
    raith = hit('raithwyn');
  assert.ok(Math.abs(lucy / raith - LUCY.melee) < 0.01, `${lucy} vs ${raith}`);
  P.who = 'raithwyn';
});

test("Lucy's run of hits: each raises the chance of a critical double shot, a miss or a pause ends it", async () => {
  const { LUCY, BULLET } = await import('../src/config.js');
  const { newRun } = await import('../src/replay.js');
  newRun(5, 1, 'lucy');
  G.banner = null;
  G.enemies = [];
  G.props = [];
  const e = spawn('fat', 1, P.x + 300, P.y);
  e.state = 'idle';
  const shoot = (atY = P.y) => {
    G.projs.push({
      k: 'bullet',
      x: P.x + 58,
      y: atY,
      z: 136,
      vx: BULLET.speed,
      rot: 0,
      life: BULLET.life,
    });
    P.streakT = 0;
    for (let t = 0; t < 0.5; t += DT) {
      G.freeze = 0;
      e.state = 'idle';
      e.hp = 999;
      update(DT);
    }
  };
  shoot();
  shoot();
  assert.equal(P.streak, 2, 'two hits in a row');
  shoot(P.y + 200); // wide of everything
  assert.equal(P.streak, 0, 'a miss ends it');
  shoot();
  assert.equal(P.streak, 1);
  for (let t = 0; t < LUCY.keep + 0.1; t += DT) update(DT);
  assert.equal(P.streak, 0, 'a pause ends it too');
  // a plain shot, then a sure lucky one: double damage and the sign
  const dealt = () => {
    G.projs.push({
      k: 'bullet',
      x: P.x + 58,
      y: P.y,
      z: 136,
      vx: BULLET.speed,
      rot: 0,
      life: BULLET.life,
    });
    e.hp = 999;
    e.state = 'idle';
    P.streakT = 0;
    for (let t = 0; t < 0.3 && e.hp === 999; t += DT) {
      G.freeze = 0;
      update(DT);
    }
    return 999 - e.hp;
  };
  P.streak = 0;
  const plain = dealt();
  const keep = [LUCY.streak, LUCY.streakMax];
  LUCY.streak = LUCY.streakMax = 1; // a sure one
  P.streak = 1;
  G.parts = [];
  const lucky = dealt();
  [LUCY.streak, LUCY.streakMax] = keep;
  assert.ok(Math.abs(lucky / plain - LUCY.crit) < 0.01, `twice the damage (${lucky} / ${plain})`);
  assert.ok(
    G.parts.some((p) => p.k === 'neon'),
    'lucky!',
  );
  P.who = 'raithwyn';
});

test('Lucy shoots her own grenade out of the air: it goes off up there, wider and harder', async () => {
  const { BLAST, BULLET } = await import('../src/config.js');
  const { newRun } = await import('../src/replay.js');
  newRun(6, 1, 'lucy');
  G.banner = null;
  G.enemies = [];
  G.props = [];
  assert.ok(BLAST.airburst.r >= BLAST.grenade.r * 1.3 - 1e-9);
  assert.ok(BLAST.airburst.dmgE >= BLAST.grenade.dmgE * 1.3 - 1e-9);
  const nade = { k: 'nade', x: P.x + 260, y: P.y, z: 140, vx: 0, vz: 0, rot: 0, life: 5 };
  // an enemy further off than a grenade's blast would reach, but inside the airburst's
  const e = spawn('fat', 1, nade.x + BLAST.grenade.r + 30, P.y);
  e.state = 'idle';
  const hp = e.hp;
  G.projs = [
    nade,
    { k: 'bullet', x: P.x + 58, y: P.y, z: 136, vx: BULLET.speed, rot: 0, life: BULLET.life },
  ];
  for (let t = 0; t < 0.2; t += DT) {
    nade.vz = 0; // held in the air for the test
    nade.z = 140;
    update(DT);
  }
  assert.ok(nade.life <= 0, 'the grenade went off');
  const boom = G.parts.find((p) => p.k === 'boom');
  assert.ok(boom && boom.z > 100, 'up in the air');
  assert.ok(e.hp < hp, 'and reached further than it would have on the ground');
  P.who = 'raithwyn';
});
