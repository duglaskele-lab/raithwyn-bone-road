// Screens before the fight: the main menu, settings, the character select and the goodbye
// screen. `menuStep` handles input (and runs in tests), `drawMenu` draws the current screen.
import { FONT, H, PURPLE, W } from './config.js';
import { clamp, mulberry } from './util.js';
import { G, reset } from './state.js';
import { pressed, touch } from './input.js';
import { SFX } from './audio.js';
import { CHARS, LEVEL, LOCKED, SLOTS, STATS } from './characters.js';
import { STR, lang, nextLang, t } from './i18n.js';
import { ctx, portraits, ready, rr, sprite, txt, wrapTxt } from './gfx.js';
import { drawHUD, drawWorld, overlay } from './render.js';
import { newRun } from './replay.js';
import { fps, stepCap, toggleFps } from './fps.js';

// ---- layout (game pixels); the hit boxes double as touch and mouse targets ----
const box = (cx, y, w, h = 44) => [cx - w / 2, y - h / 2 - 8, w, h];
export const MAIN_ITEMS = ['start', 'settings', 'exit'];
export const MAIN_BOX = MAIN_ITEMS.map((_, i) => box(600, 296 + i * 56, 300));
export const PAUSE_ITEMS = ['resume', 'settings', 'menu'];
export const PAUSE_BOX = PAUSE_ITEMS.map((_, i) => box(W / 2, 262 + i * 54, 340));
export const SET_ITEMS = ['lang', 'sound', 'fps', 'cap', 'back'];
export const SET_BOX = SET_ITEMS.map((_, i) => box(W / 2, 134 + i * 42, 420));
const SLOT = 118,
  GAP = 12,
  GX = 36,
  GY = 84;
export const SLOT_BOX = Array.from({ length: SLOTS }, (_, i) => [
  GX + (i % 4) * (SLOT + GAP),
  GY + Math.floor(i / 4) * (SLOT + GAP),
  SLOT,
  SLOT,
]);
export const PLAY_BOX = [GX, 372, 250, 52];
/** The end of a run on a touch screen: two items to tap, "again" and "main menu", from y. */
export const endBoxes = (y) => [box(W / 2, y, 300), box(W / 2, y + 54, 300)];
export const BACK_BOX = [GX + 268, 372, 240, 52];
const PANEL = [570, 84, 356, 420];

const inBox = (p, b) =>
  p && p[0] >= b[0] && p[0] <= b[0] + b[2] && p[1] >= b[1] && p[1] <= b[1] + b[3];
const hit = (boxes) => boxes.findIndex((b) => inBox(pressed.tap, b));
const go = (state, menu = 0) => {
  G.state = state;
  G.menu = menu;
  G.msgT = 0;
};

function startFight() {
  const c = CHARS[G.sel];
  if (c && c.playable) {
    G.fighter = c.id;
    newRun();
  } else {
    SFX.deny();
    G.msgT = 1.8;
  }
}
function mainStep() {
  const i = hit(MAIN_BOX);
  if (i >= 0) G.menu = i;
  else if (pressed.tap) return;
  if (pressed.u) G.menu = (G.menu + 2) % 3;
  if (pressed.d) G.menu = (G.menu + 1) % 3;
  if (i < 0 && !pressed.start && !pressed.atk) return;
  const item = MAIN_ITEMS[G.menu];
  if (item === 'start') {
    go('select');
    G.sel = 0;
  } else if (item === 'settings') {
    G.from = 'title';
    go('settings');
  } else {
    go('bye');
    try {
      window.close(); // only works when the game was opened by a script; otherwise say goodbye
    } catch {
      // not in a browser
    }
  }
}
// Settings are reached from the main menu or from the pause menu and return there.
const leaveSettings = () => go(G.from === 'pause' ? 'pause' : 'title', 1);
function settingsStep() {
  if (pressed.pause) return leaveSettings();
  const i = hit(SET_BOX);
  if (i >= 0) G.menu = i;
  else if (pressed.tap) return;
  const N = SET_ITEMS.length;
  if (pressed.u) G.menu = (G.menu + N - 1) % N;
  if (pressed.d) G.menu = (G.menu + 1) % N;
  const change = i >= 0 || pressed.start || pressed.atk || pressed.l || pressed.r;
  if (!change) return;
  const item = SET_ITEMS[G.menu];
  if (item === 'lang') nextLang();
  else if (item === 'sound') G.muted = !G.muted;
  else if (item === 'fps') toggleFps();
  else if (item === 'cap') stepCap(pressed.l ? -1 : 1);
  else if (i >= 0 || pressed.start || pressed.atk) leaveSettings();
}
function selectStep() {
  if (pressed.pause || inBox(pressed.tap, BACK_BOX)) return go('title');
  if (inBox(pressed.tap, PLAY_BOX)) return startFight();
  const i = hit(SLOT_BOX);
  if (i >= 0) {
    // a second tap on the chosen fighter starts the fight
    if (i === G.sel && CHARS[i]?.playable) return startFight();
    G.sel = i;
    return;
  }
  if (pressed.tap) return;
  const col = G.sel % 4,
    row = Math.floor(G.sel / 4);
  if (pressed.l) G.sel = row * 4 + ((col + 3) % 4);
  if (pressed.r) G.sel = row * 4 + ((col + 1) % 4);
  if (pressed.u || pressed.d) G.sel = (G.sel + 4) % SLOTS;
  if (pressed.start || pressed.atk) startFight();
}
/** The pause menu (Esc during the fight): resume, settings, back to the main menu. */
export function pauseStep() {
  if (pressed.pause) return go('play');
  const i = hit(PAUSE_BOX);
  if (i >= 0) G.menu = i;
  else if (pressed.tap) return;
  if (pressed.u) G.menu = (G.menu + 2) % 3;
  if (pressed.d) G.menu = (G.menu + 1) % 3;
  if (i < 0 && !pressed.start && !pressed.atk) return;
  const item = PAUSE_ITEMS[G.menu];
  if (item === 'resume') go('play');
  else if (item === 'settings') {
    G.from = 'pause';
    go('settings');
  } else {
    reset();
    go('title');
  }
}
/** Draws the two items at the end of a run (touch screens), the first one lit. */
export function drawEndItems(again, y) {
  const b = endBoxes(y);
  item(again, b[0], true);
  item(t('toMainMenu'), b[1], false);
}
export function drawPause() {
  overlay(0.62);
  txt(t('pause'), W / 2, 190, 54, '#ece5cb', 'center', 8);
  const labels = [t('resume'), t('menuSettings'), t('toMainMenu')];
  labels.forEach((s, i) => item(s, PAUSE_BOX[i], G.menu === i));
  if (!touch) txt(t('pauseHint'), W / 2, 470, 13, '#9bb0ac', 'center', 3);
}
/** Handles one frame of input on the menu screens. */
export function menuStep(dt) {
  G.time += dt;
  G.msgT = Math.max(0, G.msgT - dt);
  if (G.state === 'title') mainStep();
  else if (G.state === 'settings') settingsStep();
  else if (G.state === 'select') selectStep();
  else if (G.state === 'bye' && (pressed.tap || pressed.start || pressed.atk || pressed.pause))
    go('title', 2);
}

// ---- drawing ----
let brick = null;
// The game title in yellow bricks: drawn once into an offscreen canvas, then reused.
function brickTitle(text, y, size) {
  const K = G.K,
    key = `${K}|${text}|${size}`;
  if (!brick || brick.key !== key) {
    const h = size * 1.5,
      by = size * 1.15,
      mk = () => {
        const c = document.createElement('canvas');
        c.width = Math.ceil(W * K);
        c.height = Math.ceil(h * K);
        const o = c.getContext('2d');
        o.scale(K, K);
        o.font = `900 ${size}px ${FONT}`;
        o.textAlign = 'center';
        o.lineJoin = 'round';
        return [c, o];
      };
    const [c, o] = mk(),
      [b, bo] = mk();
    for (let i = 9; i > 0; i--) {
      o.fillStyle = i > 3 ? '#4a2f06' : '#8a5a10';
      o.fillText(text, W / 2, by + i);
    }
    o.lineWidth = 11;
    o.strokeStyle = '#1b1104';
    o.strokeText(text, W / 2, by);
    // brick wall: mortar, then rows of bricks with a lit top edge, offset every other row
    const bw = 30,
      bh = 15,
      rand = mulberry(11);
    bo.fillStyle = '#7d5810';
    bo.fillRect(0, 0, W, h);
    for (let r = 0; r * bh < h; r++)
      for (let x = -(r % 2) * (bw / 2); x < W; x += bw) {
        const v = rand();
        bo.fillStyle = v < 0.33 ? '#ffd23f' : v < 0.66 ? '#f4bf2c' : '#ffe070';
        bo.fillRect(x + 1, r * bh + 1, bw - 2, bh - 2);
        bo.fillStyle = 'rgba(255,250,210,.45)';
        bo.fillRect(x + 1, r * bh + 1, bw - 2, 2.5);
        bo.fillStyle = 'rgba(120,70,0,.35)';
        bo.fillRect(x + 1, r * bh + bh - 3.5, bw - 2, 2.5);
      }
    bo.globalCompositeOperation = 'destination-in';
    bo.fillText(text, W / 2, by);
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.drawImage(b, 0, 0);
    brick = { key, c, by, h };
  }
  ctx.drawImage(brick.c, 0, y - brick.by, W, brick.h);
}
function backdrop(dark) {
  G.cam = 200 + G.time * 18;
  drawWorld();
  overlay(dark);
}
function item(label, b, on) {
  if (on) {
    ctx.fillStyle = 'rgba(176,92,255,.3)';
    rr(b[0], b[1], b[2], b[3], 8);
    ctx.fill();
    ctx.strokeStyle = '#d2a8ff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  txt(
    label,
    b[0] + b[2] / 2,
    b[1] + b[3] / 2 + 8,
    on ? 24 : 21,
    on ? '#f0cf4f' : '#ece5cb',
    'center',
    5,
  );
}
// Raithwyn laughing on the main menu. The last laugh frame (3) is never shown: it jars with
// the rest of the loop.
const LAUGH = [0, 0, 0, 1, 2, 1, 2, 1, 2, 1, 0, 0],
  LAUGH_T = 0.13;
export const laughFrame = (time) => LAUGH[Math.floor(time / LAUGH_T) % LAUGH.length];
function drawMain() {
  backdrop(0.35);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(12,10,20,.1)');
  g.addColorStop(0.5, 'rgba(12,10,20,.55)');
  g.addColorStop(1, 'rgba(12,10,20,.75)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(170, 320, 10, 170, 320, 240);
  gl.addColorStop(0, 'rgba(176,92,255,.35)');
  gl.addColorStop(1, 'rgba(176,92,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, 420, H);
  ctx.restore();
  sprite('laugh', laughFrame(G.time), 170, 528, false, 2.05);
  brickTitle('Ai RAGE', 150, 116);
  txt(t('gameSub'), W / 2, 200, 26, '#d2a8ff', 'center', 6);
  const labels = [t('menuStart'), t('menuSettings'), t('menuExit')];
  labels.forEach((s, i) => item(s, MAIN_BOX[i], G.menu === i));
  txt(touch ? t('mainHintTouch') : t('mainHint'), 600, 520, 13, '#9bb0ac', 'center', 3);
}
function drawSettings() {
  if (G.from === 'pause') {
    // over the paused fight: the world stays where it is
    drawWorld();
    drawHUD();
    overlay(0.8);
  } else backdrop(0.72);
  txt(t('settings'), W / 2, 72, 38, '#ece5cb', 'center', 7);
  const labels = [
    `${t('menuLang')}:  ◂ ${STR[lang].langName} ▸`,
    `${t('menuSound')}:  ◂ ${G.muted ? t('soundOff') : t('soundOn')} ▸`,
    `${t('menuFps')}:  ◂ ${fps.show ? t('soundOn') : t('soundOff')} ▸`,
    `${t('menuCap')}:  ◂ ${fps.cap || t('capNone')} ▸`,
    t('back'),
  ];
  labels.forEach((s, i) => item(s, SET_BOX[i], G.menu === i));
  const help = Object.values(STR[lang].help),
    rows = Math.ceil(help.length / 2),
    px = 120,
    py = 322,
    pw = 720,
    ph = 52 + rows * 21;
  ctx.fillStyle = 'rgba(16,14,24,.8)';
  rr(px, py, pw, ph, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(236,229,203,.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  txt(t('controls'), px + pw / 2, py + 26, 18, '#d2a8ff', 'center', 4);
  // two columns, as many rows as it takes
  help.forEach(([name, keys], i) => {
    const col = i < rows ? 0 : 1,
      x = px + 26 + col * 350,
      y = py + 50 + (i % rows) * 21;
    txt(name, x, y, 14, '#9bb0ac', 'left', 3);
    txt(keys, x + (col ? 170 : 140), y, 14, '#ece5cb', 'left', 3);
  });
  txt(t('settingsHint'), W / 2, 526, 13, '#9bb0ac', 'center', 3);
}
function frame(b, col, width) {
  rr(b[0], b[1], b[2], b[3], 10);
  ctx.lineWidth = width;
  ctx.strokeStyle = col;
  ctx.stroke();
}
function drawSlot(i) {
  const b = SLOT_BOX[i],
    c = CHARS[i],
    on = G.sel === i;
  ctx.save();
  rr(b[0], b[1], b[2], b[3], 10);
  ctx.fillStyle = '#15121c';
  ctx.fill();
  ctx.clip();
  if (c) {
    const img = portraits[on && c.hover && ready(portraits[c.hover]) ? c.hover : c.img];
    if (ready(img)) ctx.drawImage(img, b[0], b[1], b[2], b[3]);
    ctx.fillStyle = 'rgba(12,10,20,.72)';
    ctx.fillRect(b[0], b[1] + b[3] - 24, b[2], 24);
    txt(t('chars')[c.id].name, b[0] + b[2] / 2, b[1] + b[3] - 7, 13, '#ece5cb', 'center', 3);
    if (!on) {
      ctx.fillStyle = 'rgba(12,10,20,.25)';
      ctx.fillRect(b[0], b[1], b[2], b[3]);
    }
  } else {
    const g = ctx.createRadialGradient(
      b[0] + SLOT / 2,
      b[1] + 40,
      4,
      b[0] + SLOT / 2,
      b[1] + 40,
      90,
    );
    g.addColorStop(0, '#2b2536');
    g.addColorStop(1, '#100d15');
    ctx.fillStyle = g;
    ctx.fillRect(b[0], b[1], b[2], b[3]);
    txt('?', b[0] + b[2] / 2, b[1] + b[3] / 2 + 24, 64, '#4c4459', 'center', 6);
  }
  ctx.restore();
  if (on) {
    const pul = 0.6 + 0.4 * Math.sin(G.time * 8);
    ctx.save();
    ctx.shadowColor = c ? c.col : '#8a8296';
    ctx.shadowBlur = 16 * pul;
    frame(b, c ? c.col : '#8a8296', 4);
    ctx.restore();
  } else frame(b, 'rgba(236,229,203,.45)', 2);
}
function button(b, label, enabled, col) {
  ctx.fillStyle = enabled ? col : 'rgba(60,56,70,.85)';
  rr(b[0], b[1], b[2], b[3], 10);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = enabled ? '#f0e9ff' : 'rgba(236,229,203,.35)';
  ctx.stroke();
  txt(label, b[0] + b[2] / 2, b[1] + b[3] / 2 + 8, 21, enabled ? '#fff' : '#9a93a6', 'center', 5);
}
function drawPanel() {
  const c = CHARS[G.sel],
    [x, y, w, h] = PANEL;
  ctx.fillStyle = 'rgba(16,14,24,.86)';
  rr(x, y, w, h, 12);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = c ? c.col : 'rgba(236,229,203,.4)';
  ctx.stroke();
  const L = c
    ? t('chars')[c.id]
    : { name: t('lockedName'), role: t('lockedRole'), desc: t('lockedDesc') };
  txt(L.name, x + 22, y + 44, 32, c ? c.col : '#8a8296', 'left', 6);
  txt(L.role, x + 22, y + 70, 15, '#d2a8ff', 'left', 3);
  wrapTxt(L.desc, x + 22, y + 102, w - 44, 14, 20, '#ece5cb', 3);
  const levels = t('level'),
    names = t('stat');
  STATS.forEach((k, i) => {
    const sy = y + 238 + i * 40,
      word = c ? c.stats[k] : null,
      n = word ? LEVEL[word] : 0;
    txt(names[k], x + 22, sy, 14, '#9bb0ac', 'left', 3);
    for (let s = 0; s < 5; s++) {
      ctx.fillStyle = s < n ? (word === 'card' ? '#f0cf4f' : c.col) : 'rgba(236,229,203,.12)';
      rr(x + 120 + s * 26, sy - 13, 22, 14, 3);
      ctx.fill();
    }
    txt(word ? levels[word] : '?', x + 262, sy, 13, '#ece5cb', 'left', 3);
  });
  const status = c && c.playable ? t('ready') : t('soon');
  txt(status, x + w / 2, y + h - 18, 15, c && c.playable ? '#7dffb0' : '#ff8a8a', 'center', 4);
}
function drawSelect() {
  backdrop(0.78);
  txt(t('chooseFighter'), W / 2, 56, 32, '#ece5cb', 'center', 6);
  for (let i = 0; i < SLOTS; i++) drawSlot(i);
  drawPanel();
  const c = CHARS[G.sel];
  button(PLAY_BOX, t('play') + ' ▶', !!(c && c.playable), '#7a3fb0');
  button(BACK_BOX, t('back'), true, 'rgba(40,36,52,.9)');
  if (G.msgT > 0) {
    ctx.globalAlpha = clamp(G.msgT, 0, 1);
    txt(t('onlyRaith'), GX + 254, 452, 16, '#ff8a8a', 'center', 4);
    ctx.globalAlpha = 1;
  }
  txt(touch ? t('selectHintTouch') : t('selectHint'), W / 2, 528, 13, '#9bb0ac', 'center', 3);
}
function drawBye() {
  backdrop(0.8);
  ctx.save();
  ctx.shadowColor = PURPLE;
  ctx.shadowBlur = 22;
  txt(t('byeTitle'), W / 2, 230, 48, '#f0e9ff', 'center', 8);
  ctx.restore();
  txt(t('byeText'), W / 2, 280, 20, '#ece5cb', 'center', 4);
  if (Math.floor(G.time * 2) % 2 === 0) txt(t('byeBack'), W / 2, 340, 16, '#9bb0ac', 'center', 3);
}
export const MENU_STATES = ['title', 'settings', 'select', 'bye'];
export function drawMenu() {
  ({ title: drawMain, settings: drawSettings, select: drawSelect, bye: drawBye })[G.state]();
}
