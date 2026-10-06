import { H, PURPLE, W } from './config.js';
import { G, P, reset } from './state.js';
import { atlas, ctx, cv, initGfx, loadPortraits, lucyAtlas, txt } from './gfx.js';
import { initInput, keys, pressed, touch } from './input.js';
import { initTouch, syncTouch, turnPage } from './touch.js';
import { audioAwake, audioState } from './audio.js';
import { initBackground } from './background.js';
import { spawn } from './enemies.js';
import { PAUSE_BTN, drawHUD, drawWorld, overlay } from './render.js';
import {
  MENU_STATES,
  drawEndItems,
  drawMenu,
  drawPause,
  endBoxes,
  menuStep,
  pauseStep,
} from './menu.js';
import { PORTRAITS } from './characters.js';
import { update } from './world.js';
import { startLevel } from './level.js';
import { toggleRecording } from './recorder.js';
import {
  lastRun,
  newRun,
  recordFrame,
  replayFrame,
  replayProgress,
  replaying,
  runFromText,
  saveRun,
  startReplay,
  stopReplay,
} from './replay.js';
import { STR, lang, onLang, setLang, t } from './i18n.js';
import { countFrame, due, fps, toggleFps } from './fps.js';

// Entry point: wires the DOM to the game modules and runs the frame loop.

// the screen shake is only a look: it does not touch the game's seeded chance
// where the two items to tap at the end of a run go (touch screens)
const END_Y = { over: 348, win: 304 };
const inBox = (b, p) => p[0] >= b[0] && p[0] <= b[0] + b[2] && p[1] >= b[1] && p[1] <= b[1] + b[3];
const shakeBy = (a) => (Math.random() * 2 - 1) * a;
function fit() {
  if (touch) turnPage();
  const st = document.getElementById('stage'),
    m = touch ? 8 : 20,
    aw = st.clientWidth - m,
    ah = st.clientHeight - m;
  let w = Math.max(200, Math.min(aw, (ah * 16) / 9, 1440)),
    h = (w * 9) / 16;
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  // phones: a sharp picture, but not more pixels than they can fill in time (see lowFx)
  const kMax = G.lowFx ? 1 : touch ? 2 : 2.5;
  G.K = Math.max(1, Math.min(kMax, (w * (window.devicePixelRatio || 1)) / W));
  cv.width = Math.round(W * G.K);
  cv.height = Math.round(H * G.K);
}
// The HTML around the canvas: page title, the key list under the game, touch button labels.
function applyLang() {
  const S = STR[lang];
  document.documentElement.lang = lang;
  document.title = S.docTitle;
  cv.setAttribute('aria-label', S.canvasLabel);
  const help = document.getElementById('help');
  help.replaceChildren();
  for (const [name, keyText] of Object.values(S.help)) {
    const span = document.createElement('span'),
      b = document.createElement('b'),
      kbd = document.createElement('kbd');
    b.textContent = name;
    kbd.textContent = keyText;
    span.append(b, ' ', kbd);
    help.append(span, ' ');
  }
  for (const btn of document.querySelectorAll('#btns button'))
    btn.textContent = S.pad[btn.dataset.a];
}
function frame(dt) {
  if (touch) syncTouch();
  // (dt is replaced by the recorded one while a replay plays)
  ctx.setTransform(G.K, 0, 0, G.K, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if (pressed.mute) {
    G.muted = !G.muted;
  }
  if (pressed.record) toggleRecording(cv);
  if (pressed.fps) toggleFps();
  if (pressed.saverun && lastRun()) saveRun();
  let started = false;
  // F7: watch the last run again (not in the middle of one)
  if (pressed.watch && !replaying() && G.state !== 'play' && startReplay(lastRun())) {
    G.replayDone = false;
    started = true;
  }
  if (replaying()) {
    if (!started && (pressed.pause || pressed.watch || pressed.tap)) {
      // stop watching, back to the main menu
      stopReplay();
      toTitle();
    } else {
      const rdt = replayFrame();
      if (rdt === null) {
        stopReplay();
        G.replayDone = true;
      } else dt = rdt;
    }
  } else if (G.replayDone) {
    // the replay has ended on its last frame; any key goes back to the menu
    dt = 0;
    if (pressed.start || pressed.pause || pressed.atk || pressed.tap) toTitle();
  }
  if (MENU_STATES.includes(G.state)) {
    menuStep(dt);
    // the step may have started the fight; the next frame draws it
    if (MENU_STATES.includes(G.state)) drawMenu();
  } else {
    const tap = pressed.tap,
      pauseTap =
        touch &&
        tap &&
        tap[0] >= PAUSE_BTN[0] &&
        tap[0] <= PAUSE_BTN[0] + PAUSE_BTN[2] &&
        tap[1] >= PAUSE_BTN[1] &&
        tap[1] <= PAUSE_BTN[1] + PAUSE_BTN[3];
    if (G.state === 'play' && !G.replayDone && (pressed.pause || pauseTap)) {
      G.state = 'pause';
      G.menu = 0;
    } else if (G.state === 'pause') pauseStep();
    if (G.replayDone);
    else if (G.state === 'play') {
      recordFrame(dt);
      update(dt);
    } else if (G.state === 'over' || G.state === 'win') {
      G.endT += dt;
      // the Bone Road won: on a touch screen a tap anywhere goes on (as Hit does)
      if (touch && pressed.tap && G.state === 'win' && G.level === 1) pressed.atk = true;
      recordFrame(dt);
      update(dt);
      // on a touch screen the buttons are hidden here: the two items are tapped instead
      const ends = touch && pressed.tap && endBoxes(G.state === 'over' ? END_Y.over : END_Y.win),
        tapped = (i) => ends && inBox(ends[i], pressed.tap);
      if (replaying());
      else if (G.state === 'play'); // update() has just gone on to the next stage
      else if (G.state === 'win' && G.level === 1); // the next stage follows (see world.js)
      else if (G.endT > 1.5 && (tapped(0) || (!touch && pressed.start) || pressed.atk))
        newRun(undefined, G.state === 'over' ? G.level : 1); // a lost stage is tried again
      else if (G.endT > 1.5 && (pressed.pause || tapped(1))) toTitle();
    }
    ctx.fillStyle = '#0c1218';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (G.shake > 0) ctx.translate(shakeBy(G.shake), shakeBy(G.shake) * 0.6);
    drawWorld();
    ctx.restore();
    if (G.flash > 0) {
      ctx.fillStyle = `rgba(226,200,255,${Math.min(0.5, G.flash)})`;
      ctx.fillRect(0, 0, W, H);
    }
    drawHUD();
    if (G.state === 'pause') drawPause();
    if (G.state === 'over') {
      overlay(Math.min(0.66, G.endT * 0.5));
      txt(t('overTitle'), W / 2, 250, 50, '#ff4a5e', 'center', 8);
      txt(t('score') + P.score, W / 2, 292, 22, '#ece5cb', 'center', 4);
      if (G.endT > 1.5 && touch && !replaying()) drawEndItems(t('retryItem'), END_Y.over);
      else if (G.endT > 1.5 && !touch) txt(t('restartKey'), W / 2, 340, 20, '#f0cf4f', 'center', 4);
      if (G.endT > 1.5 && !touch) txt(t('toMenuKey'), W / 2, 372, 15, '#9bb0ac', 'center', 3);
      if (G.endT > 1.5 && !touch && !replaying())
        txt(t('replayHint'), W / 2, 398, 14, '#9bb0ac', 'center', 3);
    }
    if (G.state === 'win' && G.level === 1 && G.endT > 1.2) {
      // the Bone Road is done: Old Quarry is next
      overlay(Math.min(0.5, (G.endT - 1.2) * 0.5));
      txt(t('stageClear'), W / 2, 210, 54, '#f0e9ff', 'center', 8);
      txt(t('score') + P.score, W / 2, 252, 22, '#f0cf4f', 'center', 4);
      txt(t('nextStage'), W / 2, 292, 22, '#f2b664', 'center', 4);
      if (G.endT > 2.4)
        txt(touch ? t('nextTouch') : t('nextKey'), W / 2, 330, 17, '#ece5cb', 'center', 4);
    } else if (G.state === 'win' && G.endT > 1.2) {
      overlay(Math.min(0.5, (G.endT - 1.2) * 0.5));
      ctx.save();
      ctx.shadowColor = PURPLE;
      ctx.shadowBlur = 22;
      txt(t('winTitle'), W / 2, 200, 58, '#f0e9ff', 'center', 8);
      ctx.restore();
      txt(t('score') + P.score, W / 2, 244, 24, '#f0cf4f', 'center', 5);
      if (G.endT > 2.4 && touch && !replaying()) drawEndItems(t('againItem'), END_Y.win);
      else if (G.endT > 2.4 && !touch) txt(t('againKey'), W / 2, 290, 20, '#ece5cb', 'center', 4);
      if (G.endT > 2.4 && !touch) txt(t('toMenuKey'), W / 2, 322, 15, '#9bb0ac', 'center', 3);
      if (G.endT > 2.4 && !touch && !replaying())
        txt(t('replayHint'), W / 2, 348, 14, '#9bb0ac', 'center', 3);
    }
    if (replaying() || G.replayDone) drawReplayBadge();
  }
  if (G.note) {
    // a short message over everything (a replay file that could not be read...)
    G.note.t -= dt || 1 / 60;
    txt(t(G.note.key), W / 2, 40, 16, '#ff8f9d', 'center', 4);
    if (G.note.t <= 0) G.note = null;
  }
  // the frame counter (the settings), between the HUD's buttons and the score
  if (fps.show) txt(`${fps.now} FPS`, 470, 36, 15, '#9fe08a', 'left', 3);
  for (const k in pressed) delete pressed[k];
}
function toTitle() {
  G.replayDone = false;
  reset();
  G.state = 'title';
  G.menu = 0;
  for (const k in pressed) delete pressed[k]; // the key that got us here does not choose an item
}
// While a replay plays: a badge at the bottom, how far it has got, and how to leave.
function drawReplayBadge() {
  const blink = Math.floor(G.time * 2) % 2 === 0,
    y = H - 62;
  ctx.fillStyle = 'rgba(12,18,24,.72)';
  ctx.fillRect(W / 2 - 120, y, 240, 50);
  const label = t(G.replayDone ? 'replayOver' : 'replay');
  txt((blink || G.replayDone ? '▶ ' : '   ') + label, W / 2, y + 22, 18, '#f0cf4f', 'center', 3);
  ctx.fillStyle = '#2a2532';
  ctx.fillRect(W / 2 - 100, y + 30, 200, 5);
  ctx.fillStyle = '#f0cf4f';
  ctx.fillRect(W / 2 - 100, y + 30, 200 * (G.replayDone ? 1 : replayProgress()), 5);
  txt(t(G.replayDone ? 'replayBack' : 'replayStop'), W / 2, y + 46, 10, '#9bb0ac', 'center', 2);
}
// A saved replay dropped on the page plays at once.
function dropReplay(e) {
  e.preventDefault();
  const f = e.dataTransfer?.files?.[0];
  if (!f) return;
  f.text()
    .then((text) => {
      if (replaying()) stopReplay();
      G.replayDone = false;
      startReplay(runFromText(text));
    })
    .catch(() => (G.note = { key: 'replayBad', t: 3 }));
}
// A device that cannot keep up (frames slower than SLOW for a couple of seconds of a fight)
// gets a lighter picture: fewer pixels, no glow blur, plain outlines. Only the look changes.
const SLOW = 1 / 42;
// under a low limit the frames are slow on purpose: only slower than the limit counts
const slowAt = () => (fps.cap ? Math.max(SLOW, 1.25 / fps.cap) : SLOW);
let slowT = 0,
  slowN = 0;
function watchSpeed(real) {
  if (G.lowFx || G.state !== 'play' || real <= 0 || real > 1) return;
  slowT += real;
  slowN++;
  if (slowT < 2.5) return;
  if (slowT / slowN > slowAt()) lighten();
  slowT = slowN = 0;
}
function lighten() {
  G.lowFx = true;
  // blur is the dearest thing a canvas draws: from now on it is simply not drawn
  Object.defineProperty(ctx, 'shadowBlur', { get: () => 0, set: () => {}, configurable: true });
  fit();
}
let last = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  // the frame limit (the settings): not this time
  if (!due(ts)) return;
  // whole milliseconds: a recorded run then repeats the same time steps and folds up small
  const dt = Math.round(Math.min(34, ts - last || 0)) / 1000;
  watchSpeed((ts - last) / 1000);
  last = ts;
  countFrame(ts);
  try {
    frame(dt);
  } catch (err) {
    console.error(err);
  }
}
function boot() {
  initGfx(document.getElementById('game'));
  initBackground();
  initInput(cv);
  initTouch(cv);
  loadPortraits(PORTRAITS, window.__PORTRAITS__);
  applyLang();
  onLang(applyLang);
  addEventListener('resize', fit);
  // the window minimised or another tab in front: no sound until it is back
  document.addEventListener('visibilitychange', () => audioAwake(!document.hidden));
  addEventListener('dragover', (e) => e.preventDefault());
  addEventListener('drop', dropReplay);
  fit();
  reset();
  G.state = 'title';
  requestAnimationFrame(loop);
}
// The single-file build injects the atlas as a data URI through window.__ATLAS__.
atlas.onload = atlas.onerror = boot;
atlas.src = window.__ATLAS__ || 'assets/atlas.png';
lucyAtlas.src = window.__LUCY__ || 'assets/lucy.png';
// Debug hook: poke at the live game from the browser console or from end-to-end tests.
window.__game = {
  G,
  P,
  spawn,
  reset,
  keys,
  pressed,
  setLang,
  lastRun,
  startReplay,
  newRun,
  startLevel,
  fps,
  audioState,
};
