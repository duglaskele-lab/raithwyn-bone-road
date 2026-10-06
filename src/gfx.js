import { FONT, OL } from './config.js';
import { FR } from './atlas-frames.js';
import { FR as FR_LUCY } from './lucy-frames.js';

// Canvas handle, sprite atlas and the small drawing helpers shared by every renderer.
export let cv = null,
  ctx = null;
export const atlas = typeof Image !== 'undefined' ? new Image() : {};
export const lucyAtlas = typeof Image !== 'undefined' ? new Image() : {};
// Each fighter's sprites: the atlas and its frame table. Lucy has few animations so far; any
// she lacks shows her standing frame (see fighterFrame).
const FIGHTERS = { raithwyn: [atlas, FR], lucy: [lucyAtlas, FR_LUCY] };
/** [atlas, frame] of a fighter's animation frame, falling back to the standing frame. */
export function fighterFrame(who, name, i) {
  const [img, fr] = FIGHTERS[who] ?? FIGHTERS.raithwyn,
    set = fr[name] ?? fr.idle;
  return [img, set[Math.min(fr[name] ? i : 0, set.length - 1)]];
}
export function initGfx(canvas) {
  cv = canvas;
  ctx = canvas.getContext('2d');
}
export function setCtx(c) {
  ctx = c;
}
export function sprite(name, i, x, y, flip, sc = 1, a = 1, who = 'raithwyn') {
  const [img, f] = fighterFrame(who, name, i);
  if (!img.complete || !img.naturalWidth) return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(flip ? -sc : sc, sc);
  ctx.globalAlpha = a;
  ctx.drawImage(img, f[0], f[1], f[2], f[3], -f[4], -f[5], f[2], f[3]);
  ctx.restore();
}
export function txt(s, x, y, size, col, al = 'left', st) {
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.textAlign = al;
  ctx.textBaseline = 'alphabetic';
  if (st) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = st;
    ctx.strokeStyle = OL;
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = col;
  ctx.fillText(s, x, y);
}
export function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
// Character portraits for the select screen and the HUD. The single-file build passes them
// in as data URIs through window.__PORTRAITS__.
export const portraits = {};
export function loadPortraits(names, inlined = {}) {
  for (const n of names) {
    const img = new Image();
    img.src = inlined[n] || `assets/portraits/${n}.webp`;
    portraits[n] = img;
  }
}
export const ready = (img) => img && img.complete && img.naturalWidth > 0;
/** Draws `s` word-wrapped to `maxW`; returns the y below the last line. */
export function wrapTxt(s, x, y, maxW, size, lineH, col, st) {
  ctx.font = `900 ${size}px ${FONT}`;
  let line = '';
  for (const word of s.split(' ')) {
    const next = line ? line + ' ' + word : word;
    if (line && ctx.measureText(next).width > maxW) {
      txt(line, x, y, size, col, 'left', st);
      y += lineH;
      line = word;
    } else line = next;
  }
  if (line) txt(line, x, y, size, col, 'left', st);
  return y + lineH;
}
