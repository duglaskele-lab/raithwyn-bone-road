import { APP, G, reset } from '../src/state.js';
import { keys, pressed } from '../src/input.js';
import { seedRandom } from '../src/util.js';
import { setCtx } from '../src/gfx.js';

export const DT = 1 / 60;

/** Puts the world into a clean "level just started" state. */
export function freshGame() {
  seedRandom(1);
  for (const k in keys) delete keys[k];
  for (const k in pressed) delete pressed[k];
  reset();
  APP.state = 'play';
  G.freeze = G.shake = G.flash = G.slow = 0;
}

export function allFinite(obj, fields) {
  return fields.every((f) => Number.isFinite(obj[f]));
}

/**
 * A canvas that draws nothing, for drawing code under test: it takes every call. Puts a
 * document in place too (for the layers and textures made on the fly); returns the undoing.
 */
export function stubCanvas() {
  const grad = { addColorStop() {} };
  const matrix = () => {
    const m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    Object.assign(m, {
      transformPoint: (p) => p,
      inverse: () => m,
      translate: () => m,
      scale: () => m,
      multiply: () => m,
    });
    return m;
  };
  const canvas = { width: 960, height: 540 };
  const ctx = new Proxy(
    {},
    {
      get(t, k) {
        if (k in t) return t[k];
        if (k === 'canvas') return canvas;
        if (k === 'getTransform') return matrix;
        if (k === 'measureText') return () => ({ width: 10 });
        if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
        if (k.startsWith?.('create')) return () => grad;
        return () => {};
      },
      set(t, k, v) {
        t[k] = v;
        return true;
      },
    },
  );
  canvas.getContext = () => ctx;
  const had = { document: globalThis.document, DOMPoint: globalThis.DOMPoint };
  globalThis.document = {
    createElement: () => ({ width: 64, height: 64, style: {}, getContext: () => ctx }),
  };
  globalThis.DOMPoint = class {
    constructor(x, y) {
      Object.assign(this, { x, y });
    }
  };
  setCtx(ctx);
  return () => {
    globalThis.document = had.document;
    globalThis.DOMPoint = had.DOMPoint;
  };
}
