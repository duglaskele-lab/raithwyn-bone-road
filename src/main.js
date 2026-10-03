import { H, PURPLE, W } from './config.js';
import { rnd } from './util.js';
import { G, P, reset } from './state.js';
import { atlas, ctx, cv, initGfx, txt } from './gfx.js';
import { initInput, keys, pressed, touch } from './input.js';
import { initBackground } from './background.js';
import { spawn } from './enemies.js';
import { drawHUD, drawTitle, drawWorld, overlay } from './render.js';
import { update } from './world.js';

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
function frame(dt) {
  ctx.setTransform(G.K, 0, 0, G.K, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if (pressed.mute) {
    G.muted = !G.muted;
  }
  if (G.state === 'title') {
    G.time += dt;
    drawTitle();
    if (pressed.start || pressed.atk) {
      reset();
      G.state = 'play';
    }
  } else {
    if (pressed.pause && (G.state === 'play' || G.state === 'pause'))
      G.state = G.state === 'play' ? 'pause' : 'play';
    if (G.state === 'pause' && pressed.start) G.state = 'play';
    if (G.state === 'play') update(dt);
    else if (G.state === 'over' || G.state === 'win') {
      G.endT += dt;
      update(dt);
      if (G.endT > 1.5 && (pressed.start || pressed.atk)) {
        reset();
        G.state = 'play';
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
    if (G.state === 'pause') {
      overlay(0.6);
      txt('Пауза', W / 2, 270, 54, '#ece5cb', 'center', 8);
      txt(
        touch ? 'Коснись экрана, чтобы продолжить' : 'P — продолжить',
        W / 2,
        310,
        18,
        '#d2a8ff',
        'center',
        4,
      );
    }
    if (G.state === 'over') {
      overlay(Math.min(0.66, G.endT * 0.5));
      txt('Тракт забрал тебя', W / 2, 250, 50, '#ff4a5e', 'center', 8);
      txt('Очки: ' + P.score, W / 2, 292, 22, '#ece5cb', 'center', 4);
      if (G.endT > 1.5)
        txt(
          touch ? 'Коснись экрана, чтобы начать заново' : 'Enter — начать заново',
          W / 2,
          340,
          20,
          '#f0cf4f',
          'center',
          4,
        );
    }
    if (G.state === 'win' && G.endT > 1.2) {
      overlay(Math.min(0.5, (G.endT - 1.2) * 0.5));
      ctx.save();
      ctx.shadowColor = PURPLE;
      ctx.shadowBlur = 22;
      txt('Тракт очищен', W / 2, 200, 58, '#f0e9ff', 'center', 8);
      ctx.restore();
      txt('Очки: ' + P.score, W / 2, 244, 24, '#f0cf4f', 'center', 5);
      if (G.endT > 2.4)
        txt(
          touch ? 'Коснись экрана, чтобы сыграть ещё раз' : 'Enter — сыграть ещё раз',
          W / 2,
          290,
          20,
          '#ece5cb',
          'center',
          4,
        );
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
window.__game = { G, P, spawn, reset, keys, pressed };
