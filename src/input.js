// Keyboard and touch input. `keys` holds what is held down, `pressed` what went down this frame.
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
  KeyZ: 'atk',
  Space: 'jump',
  KeyX: 'jump',
  KeyL: 'bone',
  KeyC: 'bone',
  KeyI: 'hado',
  KeyV: 'hado',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Enter: 'start',
  KeyP: 'pause',
  Escape: 'pause',
  KeyM: 'mute',
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
  canvas.addEventListener('pointerdown', () => {
    canvas.focus();
    audioInit();
    pressed.start = true;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'play') G.state = 'pause';
  });
  // touch pad
  for (const b of document.querySelectorAll('#btns button')) {
    const a = b.dataset.a;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      audioInit();
      b.classList.add('on');
      setKey(a, true);
      if (G.state !== 'play') pressed.start = true;
    });
    const up = (e) => {
      e.preventDefault();
      b.classList.remove('on');
      setKey(a, false);
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
  }
  {
    const st = document.getElementById('stick'),
      nub = st.firstElementChild;
    let pid = null;
    const mv = (e) => {
      const r = st.getBoundingClientRect();
      let dx = (e.clientX - r.left - r.width / 2) / (r.width / 2),
        dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      const m = Math.hypot(dx, dy);
      if (m > 1) {
        dx /= m;
        dy /= m;
      }
      nub.style.transform = `translate(${dx * 38}px,${dy * 38}px)`;
      setKey('l', dx < -0.35);
      setKey('r', dx > 0.35);
      setKey('u', dy < -0.4);
      setKey('d', dy > 0.4);
      keys.run = m > 0.92 && Math.abs(dx) > 0.5;
    };
    const end = () => {
      pid = null;
      nub.style.transform = '';
      for (const k of ['l', 'r', 'u', 'd', 'run']) keys[k] = false;
    };
    st.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      audioInit();
      pid = e.pointerId;
      st.setPointerCapture(pid);
      mv(e);
    });
    st.addEventListener('pointermove', (e) => {
      if (e.pointerId === pid) mv(e);
    });
    st.addEventListener('pointerup', end);
    st.addEventListener('pointercancel', end);
  }
}
