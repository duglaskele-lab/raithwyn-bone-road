// Keyboard and touch input. `keys` holds what is held down, `pressed` what went down this frame.
import { H, W } from './config.js';
import { G } from './state.js';
import { audioInit } from './audio.js';

export const keys = {},
  pressed = {};
const lastTap = {};
export const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer:coarse)').matches;
export const MAP = {
  ArrowLeft: 'l',
  KeyA: 'l',
  ArrowRight: 'r',
  KeyD: 'r',
  ArrowUp: 'u',
  KeyW: 'u',
  ArrowDown: 'd',
  KeyS: 'd',
  KeyJ: 'atk',
  Space: 'jump',
  KeyK: 'bone',
  KeyL: 'hado',
  KeyI: 'super',
  KeyX: 'secret',
  KeyZ: 'lvlZ',
  Digit2: 'lvl2',
  Numpad2: 'lvl2',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Enter: 'start',
  KeyP: 'pause',
  Escape: 'pause',
  KeyM: 'mute',
  F9: 'record',
  F7: 'watch',
  F8: 'saverun',
};
export function setKey(a, v) {
  if (v && !keys[a]) {
    pressed[a] = true;
    if (a === 'l' || a === 'r') {
      const n = performance.now();
      if (n - (lastTap[a] || 0) < 260) G.runLatch = true;
      lastTap[a] = n;
    }
  }
  keys[a] = v;
}
export function initInput(canvas) {
  addEventListener('keydown', (e) => {
    const a = MAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (!e.repeat) {
      audioInit();
      setKey(a, true);
    }
  });
  addEventListener('keyup', (e) => {
    const a = MAP[e.code];
    if (a) {
      e.preventDefault();
      setKey(a, false);
    }
  });
  addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
  });
  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus();
    audioInit();
    const r = canvas.getBoundingClientRect();
    pressed.tap = [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
    pressed.start = true;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'play') G.state = 'pause';
  });
}
