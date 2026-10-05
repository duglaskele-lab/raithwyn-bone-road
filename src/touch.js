// Touch controls for phones and tablets: a floating stick, sliding buttons, gestures for the
// hidden moves, the full-screen button and a little vibration. Everything here only turns
// touches into the same buttons the keyboard presses (keys / pressed in input.js), so the
// game, its replays and its tests do not care where the input came from.
import { H, W } from './config.js';
import { G } from './state.js';
import { audioInit } from './audio.js';
import { keys, pressed, setKey } from './input.js';

// The hidden moves on the HUD (game pixels): hold the portrait for the X secret (the road to
// the final boss), hold the score for the Z + 2 secret (on to Old Quarry).
export const SECRET_BOXES = {
  secret: [14, 10, 70, 70],
  stage: [W - 220, 10, 210, 50],
};
// How far a finger has to slide across the dark ball's button to throw the strong one.
const SWIPE = 40;
// The full-screen button in the HUD (game pixels), next to the pause button.
const FS_BOX = [416, 12, 36, 36];

/** A short buzz, where the device can (Android; iPhones have no web vibration). */
export function buzz(ms) {
  if (G.vibrate === false) return;
  try {
    globalThis.navigator?.vibrate?.(ms);
  } catch {
    // not allowed here: no matter
  }
}

const inBox = ([x, y, w, h], px, py) => px >= x && px <= x + w && py >= y && py <= y + h;

export function initTouch(canvas) {
  const stick = document.getElementById('stick'),
    nub = stick.firstElementChild,
    zone = document.getElementById('zone'),
    btns = document.getElementById('btns');

  // --- the stick: where the thumb lands in the left part of the screen ----------------------
  let sid = null,
    home = null;
  const R = () => stick.offsetWidth / 2;
  const move = (e) => {
    const r = stick.getBoundingClientRect();
    let dx = (e.clientX - r.left - r.width / 2) / R(),
      dy = (e.clientY - r.top - r.height / 2) / R();
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    nub.style.transform = `translate(${dx * R() * 0.6}px,${dy * R() * 0.6}px)`;
    setKey('l', dx < -0.35);
    setKey('r', dx > 0.35);
    setKey('u', dy < -0.4);
    setKey('d', dy > 0.4);
    keys.run = m > 0.92 && Math.abs(dx) > 0.5;
  };
  const release = () => {
    sid = null;
    nub.style.transform = '';
    stick.classList.remove('on');
    if (home) {
      stick.style.left = home.left;
      stick.style.top = home.top;
      stick.style.bottom = home.bottom;
    }
    for (const k of ['l', 'r', 'u', 'd', 'run']) setKey(k, false);
  };
  const grab = (e, float) => {
    e.preventDefault();
    audioInit();
    if (sid !== null) return;
    sid = e.pointerId;
    e.target.setPointerCapture(sid);
    stick.classList.add('on');
    if (float) {
      // the stick jumps to the thumb
      home ??= { left: stick.style.left, top: stick.style.top, bottom: stick.style.bottom };
      const pr = stick.offsetParent.getBoundingClientRect();
      stick.style.left = `${e.clientX - pr.left - R()}px`;
      stick.style.top = `${e.clientY - pr.top - R()}px`;
      stick.style.bottom = 'auto';
    }
    move(e);
  };
  for (const [el, float] of [
    [stick, false],
    [zone, true],
  ]) {
    el.addEventListener('pointerdown', (e) => grab(e, float));
    el.addEventListener('pointermove', (e) => e.pointerId === sid && move(e));
    el.addEventListener('pointerup', (e) => e.pointerId === sid && release());
    el.addEventListener('pointercancel', (e) => e.pointerId === sid && release());
  }

  // --- the buttons: press, hold, slide from one to the next ---------------------------------
  const held = new Map(); // pointer -> { a, el, x0, hado }
  const under = (e) => document.elementFromPoint(e.clientX, e.clientY)?.closest?.('#btns button');
  const down = (el) => {
    el.classList.add('on');
    setKey(el.dataset.a, true);
    if (G.state !== 'play') pressed.start = true;
  };
  const up = (el) => {
    el.classList.remove('on');
    setKey(el.dataset.a, false);
  };
  btns.addEventListener('pointerdown', (e) => {
    const el = under(e);
    if (!el) return;
    e.preventDefault();
    audioInit();
    btns.setPointerCapture(e.pointerId);
    if (el.dataset.a === 'hado') {
      // the dark ball: a tap throws the plain one as the finger lifts; a slide sideways throws
      // the strongest the rage pays for, that way (the hidden S S D L / S S A L)
      el.classList.add('on');
      held.set(e.pointerId, { el, x0: e.clientX, hado: true });
      if (G.state !== 'play') pressed.start = true;
      return;
    }
    down(el);
    held.set(e.pointerId, { el });
  });
  btns.addEventListener('pointermove', (e) => {
    const h = held.get(e.pointerId);
    if (!h) return;
    if (h.hado) {
      const dx = e.clientX - h.x0;
      if (!h.done && Math.abs(dx) > SWIPE) {
        h.done = true;
        pressed[dx > 0 ? 'hadoR' : 'hadoL'] = true;
        buzz(25);
      }
      return;
    }
    const el = under(e);
    if (el && el !== h.el && el.dataset.a !== 'hado') {
      up(h.el);
      down(el);
      h.el = el;
    }
  });
  const lift = (e) => {
    const h = held.get(e.pointerId);
    if (!h) return;
    held.delete(e.pointerId);
    if (h.hado) {
      h.el.classList.remove('on');
      if (!h.done) pressed.hado = true;
    } else up(h.el);
  };
  btns.addEventListener('pointerup', lift);
  btns.addEventListener('pointercancel', lift);

  // --- the secrets: hold the portrait or the score ------------------------------------------
  const holds = new Map();
  canvas.addEventListener('pointerdown', (e) => {
    if (G.state !== 'play') return;
    const r = canvas.getBoundingClientRect(),
      x = ((e.clientX - r.left) / r.width) * W,
      y = ((e.clientY - r.top) / r.height) * H;
    const ks = inBox(SECRET_BOXES.secret, x, y)
      ? ['secret']
      : inBox(SECRET_BOXES.stage, x, y)
        ? ['lvlZ', 'lvl2']
        : null;
    if (!ks) return;
    holds.set(e.pointerId, ks);
    for (const k of ks) keys[k] = true;
  });
  const unhold = (e) => {
    for (const k of holds.get(e.pointerId) ?? []) keys[k] = false;
    holds.delete(e.pointerId);
  };
  canvas.addEventListener('pointerup', unhold);
  canvas.addEventListener('pointercancel', unhold);

  // --- full screen: the button in the HUD, next to pause ------------------------------------
  canvas.addEventListener('pointerdown', (e) => {
    if (!canFullScreen()) return;
    const r = canvas.getBoundingClientRect(),
      x = ((e.clientX - r.left) / r.width) * W,
      y = ((e.clientY - r.top) / r.height) * H;
    if (inBox(FS_BOX, x, y)) goFullScreen();
  });
}
/** Can the page go full screen here, and is it not already? (iPhones cannot: add the game to
 *  the home screen instead.) */
export const canFullScreen = () =>
  typeof document !== 'undefined' && !!document.fullscreenEnabled && !document.fullscreenElement;
async function goFullScreen() {
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await screen.orientation?.lock?.('landscape');
  } catch {
    // not allowed: no matter
  }
}
/** Called every frame: the stick zone only takes touches in a fight. */
export function syncTouch() {
  const zone = document.getElementById('zone'),
    playing = G.state === 'play';
  if (zone.classList.contains('live') !== playing) zone.classList.toggle('live', playing);
}
