// The banshee (TYPES.banshee, BANSHEE): a ghost. She drifts about see-through, passing through
// everyone, and nothing can touch her then; she keeps her distance, then shows herself (now
// she can be hit) and wails: a cone in front of her stuns whoever stands in it on the ground.
// Step out of its depth (up or down the road) to get away. Then she fades again. She is no
// skeleton: drawn as she is, and she dies dissolving into the air.
import { BANSHEE, TAU } from '../config.js';
import { clamp, fxRandom, fxRnd, lerp, rnd } from '../util.js';
import { G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { stunPlayer } from '../combat.js';
import { scoreMult } from '../style.js';
import { defineFoe } from './registry.js';
import { faceP, go, moveTo } from './kit.js';

/** How much of her can be seen (and hit) now: 0..1. */
export function ghostShown(e) {
  const B = BANSHEE;
  switch (e.state) {
    case 'gfloat':
      return B.ghost;
    case 'gshow':
      return lerp(B.ghost, 1, clamp(e.t / (B.show * 0.6), 0, 1));
    case 'gfade':
      return lerp(1, B.ghost, clamp(e.t / B.fade, 0, 1));
    case 'gdie':
      return clamp(1 - e.t / 0.8, 0, 1);
  }
  return 1;
}
/** Is the heroine in her wail's cone? */
export function inWail(e) {
  const B = BANSHEE,
    f = (P.x - e.x) * e.face;
  if (f < 0 || f > B.range || P.z > 8) return false;
  return Math.abs(P.y - e.y) < lerp(B.w0, B.w1, f / B.range);
}
const drift = (e) => go(e, 'gfloat', 0, { engage: false, floatT: rnd(...BANSHEE.drift) });

export default defineFoe('banshee', {
  walksIn: true,
  spawn(e) {
    drift(e);
  },
  // whatever stops her, she goes back to drifting
  moves: [{ when: () => true, go: drift }],
  attacks: ['gshow', 'gwail'],
  // see-through, nothing touches her
  immune: (e) => ['gfloat', 'gfade', 'gdie'].includes(e.state),
  die(e) {
    P.score += Math.round(e.T.score * scoreMult());
    Object.assign(e, { dying: true, engage: false, state: 'gdie', t: 0 });
    SFX.wail();
  },
  states: {
    gfloat(e, dt, s) {
      // drifting a little way off the player, on her side, bobbing
      faceP(e);
      e.hover = 26 + 8 * Math.sin(e.anim * 2.2);
      const side = e.x >= P.x ? 1 : -1;
      moveTo(e, P.x + side * BANSHEE.keep, P.y + Math.sin(e.anim * 0.9) * 30, BANSHEE.speed, dt);
      e.moving = false;
      if (e.t > e.floatT && !s.pdown && s.ady < 40 && s.adx > 120 && s.adx < BANSHEE.range - 20) {
        go(e, 'gshow');
        SFX.rise();
      }
    },
    gshow(e) {
      // she shows herself: her mouth opening, the ground in front of her marked
      faceP(e);
      if (e.t > BANSHEE.show) {
        go(e, 'gwail', 0, { stunned: false });
        SFX.wail();
        G.shake = Math.max(G.shake, 4);
      }
    },
    gwail(e) {
      if (!e.stunned && inWail(e) && stunPlayer(BANSHEE.dmg, BANSHEE.stun)) e.stunned = true;
      if (e.t > BANSHEE.wail) go(e, 'gfade');
    },
    gfade(e) {
      if (e.t > BANSHEE.fade) drift(e);
    },
    gdie(e) {
      // gone into the air, wisps rising
      if (fxRandom() < 0.6)
        G.parts.push({
          k: 'glow',
          x: e.x + fxRnd(-30, 30),
          y: e.y - fxRnd(40, 160),
          vx: fxRnd(-20, 20),
          vy: fxRnd(-120, -40),
          g: 0,
          t: 0,
          life: fxRnd(0.4, 0.8),
          s: fxRnd(3, 6),
          col: '#cfefff',
        });
      if (e.t > 0.8) e.dead = true;
    },
  },
  // her wail's reach, marked faintly on the ground as she shows herself
  ground(e) {
    if (e.state !== 'gshow' && e.state !== 'gwail') return;
    const B = BANSHEE,
      x = e.x - G.cam,
      d = e.face,
      a = e.state === 'gwail' ? 0.22 : 0.08 + 0.1 * clamp(e.t / B.show, 0, 1);
    ctx.save();
    ctx.fillStyle = `rgba(170,230,255,${a})`;
    ctx.beginPath();
    ctx.moveTo(x, e.y - B.w0);
    ctx.lineTo(x + d * B.range, e.y - B.w1);
    ctx.lineTo(x + d * B.range, e.y + B.w1);
    ctx.lineTo(x, e.y + B.w0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
  aura: bansheeAura,
  draw: drawBanshee,
});

/** A cold glow round her (behind her, outside a red outline). */
function bansheeAura(e) {
  const a = ghostShown(e),
    x = e.x - G.cam,
    y = e.y - e.z - (e.hover ?? 26) - 90,
    g = ctx.createRadialGradient(x, y, 8, x, y, 120);
  g.addColorStop(0, `rgba(150,220,255,${0.3 * a})`);
  g.addColorStop(1, 'rgba(150,220,255,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - 120, y - 120, 240, 240);
  ctx.restore();
}
/** Her: a pale figure in a tattered gown trailing into wisps, long dark hair streaming back,
 *  hollow eyes, arms reaching forward; her mouth gapes as she wails. */
export function drawBanshee(e, whole = true) {
  const a = ghostShown(e) * (e.flash > 0 && Math.floor(G.time * 30) % 2 ? 0.6 : 1);
  if (whole) bansheeAura(e);
  const x = e.x - G.cam,
    y = e.y - e.z - (e.hover ?? 26),
    t = e.anim,
    f = e.face,
    wail = e.state === 'gwail',
    open = wail ? 1 : e.state === 'gshow' ? clamp(e.t / BANSHEE.show, 0, 1) * 0.6 : 0.1,
    fl = e.flash > 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(f * 1.2, 1.2);
  ctx.globalAlpha = a;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(20,30,50,.85)';
  ctx.lineWidth = 2.2;
  // the hair, streaming back
  ctx.fillStyle = '#1c1f2e';
  ctx.beginPath();
  ctx.moveTo(6, -152);
  for (let k = 0; k <= 6; k++) {
    const u = k / 6;
    ctx.lineTo(-10 - 70 * u, -150 + 70 * u + Math.sin(t * 5 + u * 6) * 8 * u);
  }
  for (let k = 6; k >= 0; k--) {
    const u = k / 6;
    ctx.lineTo(-4 - 58 * u, -128 + 60 * u + Math.sin(t * 5 + u * 6 + 1) * 6 * u);
  }
  ctx.closePath();
  ctx.fill();
  // the gown, tattered, trailing into wisps
  ctx.fillStyle = fl ? '#ffffff' : '#d9f1ff';
  ctx.beginPath();
  ctx.moveTo(-10, -118);
  ctx.quadraticCurveTo(14, -122, 16, -104);
  ctx.quadraticCurveTo(22, -70, 18, -40);
  for (let k = 0; k <= 5; k++) {
    const u = k / 5,
      xx = 18 - 50 * u - 20 * u * u,
      yy = -40 + 46 * Math.sin(Math.PI * u) * 0.4 + 22 * u + Math.sin(t * 6 + k) * 4;
    ctx.lineTo(xx + (k % 2 ? 6 : -4), yy + (k % 2 ? -10 : 6));
  }
  ctx.quadraticCurveTo(-46, -60, -20, -84);
  ctx.quadraticCurveTo(-18, -108, -10, -118);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // folds of the gown
  ctx.strokeStyle = 'rgba(120,170,200,.7)';
  ctx.lineWidth = 1.6;
  for (const k of [0, 1, 2]) {
    ctx.beginPath();
    ctx.moveTo(-2 + k * 6, -100);
    ctx.quadraticCurveTo(-6 + k * 4, -70, -18 + k * 8, -40 + Math.sin(t * 4 + k) * 3);
    ctx.stroke();
  }
  // arms reaching forward, long fingers
  ctx.strokeStyle = 'rgba(20,30,50,.85)';
  ctx.fillStyle = fl ? '#ffffff' : '#e8f7ff';
  ctx.lineWidth = 2;
  const reach = wail ? 1 : 0.55 + 0.1 * Math.sin(t * 2);
  for (const [o, dy] of [
    [0, 0],
    [-5, 6],
  ]) {
    ctx.beginPath();
    ctx.moveTo(6 + o, -108 + dy);
    ctx.quadraticCurveTo(26 + o, -100 + dy, 34 + 18 * reach + o, -92 - 16 * reach + dy);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(20,30,50,.85)';
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = fl ? '#ffffff' : '#e8f7ff';
    ctx.stroke();
  }
  // the head
  ctx.strokeStyle = 'rgba(20,30,50,.85)';
  ctx.lineWidth = 2.2;
  ctx.fillStyle = fl ? '#ffffff' : '#eef9ff';
  ctx.beginPath();
  ctx.ellipse(4, -136, 14, 18, 0.1, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // hair over the brow
  ctx.fillStyle = '#1c1f2e';
  ctx.beginPath();
  ctx.ellipse(0, -148, 15, 9, -0.3, Math.PI, TAU);
  ctx.fill();
  // hollow eyes with a cold glint
  ctx.fillStyle = '#05070c';
  for (const ex of [4, 13]) {
    ctx.beginPath();
    ctx.ellipse(ex, -138, 3.2, 4.5 + open * 1.5, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#7fe6ff';
  for (const ex of [4, 13]) {
    ctx.beginPath();
    ctx.arc(ex, -138, 1.2 + open, 0, TAU);
    ctx.fill();
  }
  // her mouth, gaping as she wails
  ctx.fillStyle = '#05070c';
  ctx.beginPath();
  ctx.ellipse(10, -124, 3 + open * 2.5, 2 + open * 7, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // the wail: rings of sound rolling out of her mouth
  if (wail) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const u = (e.t * 2.2 + k / 4) % 1,
        r = 20 + u * BANSHEE.range * 0.8;
      ctx.strokeStyle = `rgba(190,240,255,${0.55 * (1 - u)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x + f * (14 + r * 0.5), y - 124 + r * 0.25, r * 0.18, 16 + r * 0.22, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
}
