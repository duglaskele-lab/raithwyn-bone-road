// A hacked noodle chef (TYPES.chef, CHEF), a medium foe: one of Jawacorp's kitchen robots gone
// wrong, in a stained apron and a crooked chef's hat, a glitching red eye, a cleaver in each
// hand. Up close it bursts into a flurry of cuts, both cleavers in turn; the last one knocks
// the heroine down. Light blows do not stop it.
import { CHEF, OL, TAU } from '../config.js';
import { fxRandom, fxRnd, rnd } from '../util.js';
import { APP, G } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { hitPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go, inFront } from './kit.js';
import { robotDie, robotLook } from './robot.js';

const A = { body: '#b8bec6', trim: '#4a4f58', glow: '#ff3b4b', w: 12, chest: 1.1 };

/** A cleaver in a hand (h, the forearm's angle wa). */
function cleaver(h, wa, fl) {
  ctx.save();
  ctx.translate(h[0], h[1]);
  ctx.rotate(-wa);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.2;
  ctx.fillStyle = fl ? '#fff' : '#3a2a22';
  ctx.fillRect(-3, -6, 6, 18);
  ctx.strokeRect(-3, -6, 6, 18);
  ctx.fillStyle = fl ? '#fff' : '#c9ced6';
  ctx.beginPath();
  ctx.moveTo(-4, 12);
  ctx.lineTo(18, 12);
  ctx.lineTo(20, 48);
  ctx.lineTo(-4, 46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.arc(12, 20, 2.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}
/** The crooked hat over a screen face with one glitching red eye. */
function head(c) {
  const { e, fl } = c;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillStyle = fl ? '#fff' : A.body;
  ctx.fillRect(-14, -14, 30, 28);
  ctx.strokeRect(-14, -14, 30, 28);
  ctx.fillStyle = '#0b0d14';
  ctx.fillRect(-2, -8, 16, 16);
  // the eye, glitching: now and then it jumps or splits
  const g = Math.floor(e.anim * 12) % 17 === 0;
  ctx.fillStyle = e.T.eye;
  if (!APP.lowFx) {
    ctx.shadowColor = e.T.eye;
    ctx.shadowBlur = 6;
  }
  ctx.fillRect(4 + (g ? 3 : 0), -4, 6, 6);
  if (g) ctx.fillRect(2, 2, 10, 2);
  ctx.shadowBlur = 0;
  // the chef's hat, tilted
  ctx.save();
  ctx.translate(0, -14);
  ctx.rotate(-0.15);
  ctx.fillStyle = fl ? '#fff' : '#f2f0ea';
  ctx.fillRect(-12, -10, 26, 10);
  ctx.strokeRect(-12, -10, 26, 10);
  ctx.beginPath();
  ctx.arc(-6, -16, 9, 0, TAU);
  ctx.arc(4, -20, 10, 0, TAU);
  ctx.arc(12, -14, 8, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-11, -14, 24, 6);
  ctx.restore();
}
/** The stained apron over its chest and down its front. */
function apron(c) {
  const { fl } = c;
  ctx.fillStyle = fl ? '#fff' : '#efece4';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, -46);
  ctx.lineTo(18, -46);
  ctx.lineTo(24, 30);
  ctx.lineTo(-6, 30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!fl) {
    ctx.fillStyle = 'rgba(160,60,30,.45)';
    ctx.beginPath();
    ctx.ellipse(12, -10, 6, 4, 0.3, 0, TAU);
    ctx.ellipse(6, 14, 4, 3, 0, 0, TAU);
    ctx.fill();
  }
}

const look = robotLook(A, head, (c) => cleaver(c.h, c.wa, c.fl), apron);
const back = look.back;
look.back = (c) => {
  // the second cleaver in the back hand
  back(c);
  const { o, limb, sh, UA, FA, fl } = c,
    L = limb([sh[0] - 3, sh[1]], o.aB[0], o.aB[1], UA, FA);
  cleaver(L[2], o.aB[1], fl);
};

export default defineFoe('chef', {
  init: { flurryCd: [1, 2] },
  timers: ['flurryCd'],
  attacks: ['cflurry'],
  moves: [
    {
      // close up: a flurry of cuts
      when: (e, s) => e.flurryCd <= 0 && s.adx < e.T.reach + 10 && s.ady < 18 && !s.pdown,
      go(e) {
        faceP(e);
        go(e, 'cflurry', 0, { cuts: 0, hitDone: false });
      },
    },
  ],
  die: robotDie,
  tick(e) {
    // sparks from its broken wiring now and then
    if (fxRandom() < 0.04)
      G.parts.push({
        k: 'dot',
        x: e.x + fxRnd(-10, 10),
        y: e.y - e.z - fxRnd(80, 130) * e.T.scale,
        vx: fxRnd(-80, 80),
        vy: fxRnd(-160, -40),
        g: 600,
        t: 0,
        life: 0.3,
        s: 2.5,
        col: '#ffd27a',
      });
  },
  states: {
    cflurry(e) {
      const n = Math.floor(e.t / CHEF.gap);
      if (n > e.cuts && e.cuts < CHEF.hits) {
        e.cuts++;
        SFX.swing();
        e.x += e.face * 10;
        if (inFront(e, 14, e.T.reach + 24, 26, 90))
          hitPlayer(CHEF.dmg, e.face, e.cuts === CHEF.hits);
      }
      if (e.t > CHEF.gap * (CHEF.hits + 1) + 0.15)
        go(e, 'recover', 0, { flurryCd: rnd(...CHEF.cd) });
    },
  },
  look,
  pose: {
    guard: { chase: { set: { aF: (e, k) => [0.9, 2.2 + 0.05 * k.br], aB: [0.7, 2] } } },
    states: {
      // the cleavers come down in turn
      cflurry: {
        set: { lean: 0.15 },
        fn(o, e) {
          const u = (e.t / CHEF.gap) % 2,
            a = u < 1 ? u : 2 - u;
          o.aF = [0.9 + a * 1.1, 1.0 + a * 1.4];
          o.aB = [2.0 - a * 1.1, 2.4 - a * 1.4];
        },
      },
    },
  },
});
