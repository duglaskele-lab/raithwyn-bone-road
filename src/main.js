import { H, PURPLE, W } from './config.js';
import { rnd } from './util.js';
import { G, P, reset } from './state.js';
import { atlas, ctx, cv, initGfx, loadPortraits, txt } from './gfx.js';
import { initInput, keys, pressed, touch } from './input.js';
import { initBackground } from './background.js';
import { spawn } from './enemies.js';
import { PAUSE_BTN, drawHUD, drawWorld, overlay } from './render.js';
import { MENU_STATES, drawMenu, drawPause, menuStep, pauseStep } from './menu.js';
import { PORTRAITS } from './characters.js';
import { update } from './world.js';
import { toggleRecording } from './recorder.js';
import { STR, lang, onLang, setLang, t } from './i18n.js';

// Entry point: wires the DOM to the game modules and runs the frame loop.
function fit() {
  const st = document.getElementById('stage'),
    aw = st.clientWidth - 20,
    ah = st.clientHeight - 20;
  let w = Math.max(200, Math.min(aw, (ah * 16) / 9, 1440)),
    h = (w * 9) / 16;
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  G.K = Math.max(1, Math.min(2.5, (w * (window.devicePixelRatio || 1)) / W));
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
  ctx.setTransform(G.K, 0, 0, G.K, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if (pressed.mute) {
    G.muted = !G.muted;
  }
  if (pressed.record) toggleRecording(cv);
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
    if (G.state === 'play' && (pressed.pause || pauseTap)) {
      G.state = 'pause';
      G.menu = 0;
    } else if (G.state === 'pause') pauseStep();
    if (G.state === 'play') update(dt);
    else if (G.state === 'over' || G.state === 'win') {
      G.endT += dt;
      update(dt);
      if (G.endT > 1.5 && (pressed.start || pressed.atk)) {
        reset();
        G.state = 'play';
      } else if (G.endT > 1.5 && pressed.pause) {
        reset();
        G.state = 'title';
        G.menu = 0;
      }
    }
    ctx.fillStyle = '#0c1218';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (G.shake > 0) ctx.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake) * 0.6);
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
      if (G.endT > 1.5)
        txt(touch ? t('restartTouch') : t('restartKey'), W / 2, 340, 20, '#f0cf4f', 'center', 4);
      if (G.endT > 1.5 && !touch) txt(t('toMenuKey'), W / 2, 372, 15, '#9bb0ac', 'center', 3);
    }
    if (G.state === 'win' && G.endT > 1.2) {
      overlay(Math.min(0.5, (G.endT - 1.2) * 0.5));
      ctx.save();
      ctx.shadowColor = PURPLE;
      ctx.shadowBlur = 22;
      txt(t('winTitle'), W / 2, 200, 58, '#f0e9ff', 'center', 8);
      ctx.restore();
      txt(t('score') + P.score, W / 2, 244, 24, '#f0cf4f', 'center', 5);
      if (G.endT > 2.4)
        txt(touch ? t('againTouch') : t('againKey'), W / 2, 290, 20, '#ece5cb', 'center', 4);
      if (G.endT > 2.4 && !touch) txt(t('toMenuKey'), W / 2, 322, 15, '#9bb0ac', 'center', 3);
    }
  }
  for (const k in pressed) delete pressed[k];
}
let last = 0;
function loop(ts) {
  const dt = Math.min(0.034, (ts - last) / 1000 || 0);
  last = ts;
  try {
    frame(dt);
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(loop);
}
function boot() {
  initGfx(document.getElementById('game'));
  initBackground();
  initInput(cv);
  loadPortraits(PORTRAITS, window.__PORTRAITS__);
  applyLang();
  onLang(applyLang);
  addEventListener('resize', fit);
  fit();
  reset();
  G.state = 'title';
  requestAnimationFrame(loop);
}
// The single-file build injects the atlas as a data URI through window.__ATLAS__.
atlas.onload = atlas.onerror = boot;
atlas.src = window.__ATLAS__ || 'assets/atlas.png';
// Debug hook: poke at the live game from the browser console or from end-to-end tests.
window.__game = { G, P, spawn, reset, keys, pressed, setLang };
