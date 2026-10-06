import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { G } from '../src/state.js';
import { pressed } from '../src/input.js';
import { CHARS, LEVEL, SLOTS, STATS } from '../src/characters.js';
import {
  BACK_BOX,
  MAIN_BOX,
  PLAY_BOX,
  SET_BOX,
  SLOT_BOX,
  laughFrame,
  menuStep,
} from '../src/menu.js';
import { LANGS, STR, lang, setLang } from '../src/i18n.js';
import { CAPS, due, fps } from '../src/fps.js';
import { freshGame } from './helpers.js';

beforeEach(() => {
  freshGame();
  G.state = 'title';
  G.menu = 0;
  G.muted = false;
  setLang('en');
});

// One menu frame with the given actions pressed (or a tap at a box's centre).
const step = (...actions) => {
  for (const a of actions)
    if (Array.isArray(a)) pressed.tap = [a[0] + a[2] / 2, a[1] + a[3] / 2];
    else pressed[a] = true;
  menuStep(1 / 60);
  for (const k in pressed) delete pressed[k];
};

test('main menu: start, settings and exit', () => {
  step('start');
  assert.equal(G.state, 'select');
  step('pause');
  assert.equal(G.state, 'title');
  step('d');
  step('start');
  assert.equal(G.state, 'settings');
  step('pause');
  step('d');
  step('start');
  assert.equal(G.state, 'bye');
  step('atk');
  assert.equal(G.state, 'title');
});

test('main menu items respond to taps', () => {
  step(MAIN_BOX[1]);
  assert.equal(G.state, 'settings');
});

test('settings switch the language and the sound', () => {
  G.state = 'settings';
  step(SET_BOX[0]);
  assert.equal(lang, 'ru');
  step('r');
  assert.equal(lang, 'en');
  step('d');
  step('start');
  assert.equal(G.muted, true);
  step('d');
  step('d');
  step('d');
  step('start');
  assert.equal(G.state, 'title');
});

test('settings: the FPS counter and the frame limit (30 60 90 none, 60 by default)', () => {
  assert.deepEqual(CAPS, [30, 60, 90, 0]);
  assert.equal(fps.cap, 60);
  assert.equal(fps.show, false);
  G.state = 'settings';
  step(SET_BOX[2]);
  assert.equal(fps.show, true);
  step(SET_BOX[2]);
  assert.equal(fps.show, false);
  step(SET_BOX[3]);
  assert.equal(fps.cap, 90);
  step('r');
  assert.equal(fps.cap, 0, 'no limit');
  step('r');
  assert.equal(fps.cap, 30, 'round the list');
  step('l');
  assert.equal(fps.cap, 0);
  step('l');
  step('l');
  assert.equal(fps.cap, 60);
  assert.equal(G.state, 'settings');
});

test('the frame limit: 60 on 144 Hz, 90 on 144 Hz, 30 on 60 Hz, none draws every frame', () => {
  const rate = (cap, hz, t0) => {
    fps.cap = cap;
    let drawn = 0;
    for (let i = 1; i <= hz * 10; i++) if (due(t0 + i * (1000 / hz))) drawn++;
    return drawn / 10;
  };
  assert.ok(Math.abs(rate(60, 144, 1e6) - 60) <= 1);
  assert.ok(Math.abs(rate(90, 144, 2e6) - 90) <= 1);
  assert.ok(Math.abs(rate(30, 60, 3e6) - 30) <= 1);
  assert.equal(rate(0, 144, 4e6), 144);
  assert.equal(rate(90, 60, 5e6), 60, 'never more often than the screen');
  fps.cap = 60;
});

test('the roster: four fighters, four locked slots, Raithwyn and Lucy playable', () => {
  assert.equal(CHARS.length, 4);
  assert.equal(SLOTS, 8);
  assert.deepEqual(
    CHARS.filter((c) => c.playable).map((c) => c.id),
    ['raithwyn', 'lucy'],
  );
  for (const c of CHARS) {
    for (const k of STATS) assert.ok(c.stats[k] in LEVEL, `${c.id}.${k}`);
    for (const l of LANGS) assert.ok(STR[l].chars[c.id].desc, `${l}: ${c.id}`);
  }
});

test('other fighters can be viewed but not played', () => {
  G.state = 'select';
  G.sel = 0;
  for (const slot of [2, 3, 4, 7]) {
    step(SLOT_BOX[slot]);
    assert.equal(G.sel, slot);
    step(PLAY_BOX);
    assert.equal(G.state, 'select', `slot ${slot} must not start`);
    assert.ok(G.msgT > 0);
  }
  step('r'); // 7 -> 4 wraps within the row
  assert.equal(G.sel, 4);
  step('u');
  assert.equal(G.sel, 0);
  step('start');
  assert.equal(G.state, 'play');
});

test('a second tap on Raithwyn starts the fight, Back returns to the menu', () => {
  G.state = 'select';
  G.sel = 1;
  step(SLOT_BOX[0]);
  assert.equal(G.state, 'select');
  step(SLOT_BOX[0]);
  assert.equal(G.state, 'play');

  G.state = 'select';
  step(BACK_BOX);
  assert.equal(G.state, 'title');
});

test('the laugh never shows its last frame', () => {
  for (let t = 0; t < 20; t += 0.01) assert.notEqual(laughFrame(t), 3, `menu at ${t}`);
});

test('Lucy can be chosen: the run is hers, and so is its replay', async () => {
  const { P } = await import('../src/state.js');
  const { lastRun, startReplay } = await import('../src/replay.js');
  const { fighterFrame } = await import('../src/gfx.js');
  const { FR } = await import('../src/lucy-frames.js');
  G.state = 'select';
  G.sel = 0;
  step(SLOT_BOX[1]);
  step(PLAY_BOX);
  assert.equal(G.state, 'play');
  assert.equal(P.who, 'lucy');
  P.x += 1;
  const run = lastRun() ?? { seed: 1, level: 1, who: 'lucy', frames: [[1, 0.016, 0, 0, 0]] };
  assert.equal(run.who, 'lucy');
  P.who = 'raithwyn';
  startReplay(run);
  assert.equal(P.who, 'lucy', 'the replay plays her');
  // her sprites: her own standing frame and jabs; what she lacks yet shows her standing
  assert.equal(fighterFrame('lucy', 'punch1', 2)[1], FR.punch1[2]);
  assert.equal(fighterFrame('lucy', 'run', 3)[1], FR.idle[0]);
  assert.equal(fighterFrame('lucy', 'idle', 7)[1], FR.idle[0]);
  assert.ok(FR.punch1.length === 5 && FR.punch2.length === 5);
  G.fighter = 'raithwyn';
});
