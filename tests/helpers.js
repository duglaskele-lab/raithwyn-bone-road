import { G, reset } from '../src/state.js';
import { keys, pressed } from '../src/input.js';

export const DT = 1 / 60;

/** Puts the world into a clean "level just started" state. */
export function freshGame() {
  for (const k in keys) delete keys[k];
  for (const k in pressed) delete pressed[k];
  reset();
  G.state = 'play';
  G.freeze = G.shake = G.flash = G.slow = 0;
}

export function allFinite(obj, fields) {
  return fields.every((f) => Number.isFinite(obj[f]));
}
