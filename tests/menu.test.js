import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { G } from '../src/state.js';
import { pressed } from '../src/input.js';
import { CHARS, LEVEL, SLOTS, STATS } from '../src/characters.js';
import { BACK_BOX, MAIN_BOX, PLAY_BOX, SET_BOX, SLOT_BOX, menuStep } from '../src/menu.js';
import { LANGS, STR, lang, setLang } from '../src/i18n.js';
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
  step('start');
  assert.equal(G.state, 'title');
});

test('the roster: four fighters, four locked slots, only Raithwyn playable', () => {
  assert.equal(CHARS.length, 4);
  assert.equal(SLOTS, 8);
  assert.deepEqual(
    CHARS.filter((c) => c.playable).map((c) => c.id),
    ['raithwyn'],
  );
  for (const c of CHARS) {
    for (const k of STATS) assert.ok(c.stats[k] in LEVEL, `${c.id}.${k}`);
    for (const l of LANGS) assert.ok(STR[l].chars[c.id].desc, `${l}: ${c.id}`);
  }
});

test('other fighters can be viewed but not played', () => {
  G.state = 'select';
  G.sel = 0;
  for (const slot of [1, 2, 3, 4, 7]) {
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
