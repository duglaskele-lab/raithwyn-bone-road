// Jawacorp's cyber ninja (TYPES.ninja, NINJA): slim dark armour with green lines, a slit visor,
// a red scarf, a glowing katana. It cuts like a swordsman; now and then, from a distance, it
// crouches (a line glows on the ground ahead of it) and dashes straight through the heroine,
// cutting her down. When a shot flies its way it takes a stance and turns shots back at the
// shooter (Lucy's bullets, Raithwyn's bones); a blow up close breaks the stance.
import { NINJA, OL, TAU, W } from '../config.js';
import { fxRandom, fxRnd, rnd } from '../util.js';
import { APP, G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { spark } from '../fx.js';
import { hitPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';
import { robotDie, robotLook, visorHelm } from './robot.js';

const A = { body: '#3a3f4c', trim: '#1b1e25', glow: '#7dff8a', w: 9 };

/** Is a shot of the player's flying at it (within `d` px, along its lane)? */
const shotAt = (e, d = 460) =>
  G.projs.some(
    (q) =>
      (q.k === 'bone' || (q.k === 'bullet' && !q.spent)) &&
      Math.abs(q.y - e.y) < 40 &&
      Math.abs(q.x - e.x) < d &&
      Math.sign(e.x - q.x) === Math.sign(q.vx || q.d || 1),
  );

/** The katana along the forearm, its edge glowing; in the stance, a blur of the spinning blade. */
function katana(c) {
  const { e, fl, h, wa } = c;
  ctx.save();
  ctx.translate(h[0], h[1]);
  if (e.state === 'nguard' && !fl) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(125,255,138,.18)';
    ctx.strokeStyle = 'rgba(190,255,200,.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(8, 0, 46, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.rotate(-wa);
  ctx.lineCap = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(0, 6);
  ctx.stroke();
  ctx.strokeStyle = fl ? '#fff' : '#a21f2a';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : '#c9a24a';
  ctx.fillRect(-7, 5, 14, 4);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 9);
  ctx.quadraticCurveTo(3, 50, 0, 86);
  ctx.stroke();
  ctx.strokeStyle = fl ? '#fff' : '#e8fff0';
  ctx.lineWidth = 2.5;
  if (!APP.lowFx && !fl) {
    ctx.shadowColor = A.glow;
    ctx.shadowBlur = 10;
  }
  ctx.stroke();
  ctx.restore();
}
/** The helmet with its slit, and the scarf streaming back. */
function head(c) {
  const { e, fl } = c;
  const dash = e.state === 'ndash',
    len = dash ? 46 : 30;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [w, col] of [
    [9, OL],
    [6, fl ? '#fff' : '#c22f3a'],
  ]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(-6, 10);
    for (let k = 1; k <= 4; k++) {
      const u = k / 4;
      ctx.lineTo(-6 - len * u, 10 + 6 * u + Math.sin(e.anim * 9 + u * 4) * 5 * u);
    }
    ctx.stroke();
  }
  visorHelm(fl, A);
}

export default defineFoe('ninja', {
  init: { dashCd: [1.5, 3], guardCd: [0.5, 1.5] },
  timers: ['dashCd', 'guardCd'],
  attacks: ['ntele', 'ndash'],
  unstoppable: (e) => e.state === 'ndash',
  moves: [
    {
      // a shot coming: the stance that turns it back
      when: (e) => e.guardCd <= 0 && shotAt(e),
      go(e) {
        faceP(e);
        go(e, 'nguard', 0, { engage: false, guardCd: rnd(...NINJA.guardCd) });
        SFX.stance();
      },
    },
    {
      // from a distance: crouch, then dash through her
      when: (e, s) =>
        e.dashCd <= 0 &&
        !s.pdown &&
        s.adx > NINJA.dashMin &&
        s.adx < NINJA.dashMax &&
        s.ady < 40 &&
        e.x > G.cam + 30 &&
        e.x < G.cam + W - 30,
      go(e) {
        faceP(e);
        go(e, 'ntele', 0, { engage: false, ddir: e.face, dashCd: rnd(...NINJA.dashCd) });
      },
    },
  ],
  // in its stance, a shot rings off the blade and flies back at the shooter
  block(e, dir, knock, src) {
    if (e.state !== 'nguard' || src !== 'bone') return false;
    G.projs.push({
      k: 'rbolt',
      x: e.x - dir * 40,
      y: e.y,
      z: 96,
      vx: -dir * 720,
      dmg: NINJA.back,
      col: '#7dff8a',
      knock: false,
      life: 3,
    });
    SFX.clang();
    spark(e.x - dir * 30, e.y - 100, '#c8ffd0', false);
    return true;
  },
  die: robotDie,
  states: {
    ntele(e) {
      // crouched, the blade drawn back: the line on the ground shows where it will go
      e.face = e.ddir;
      if (e.t > NINJA.tele) {
        go(e, 'ndash', 0, { x0: e.x, hitDone: false });
        SFX.dash();
      }
    },
    ndash: {
      pin: true,
      tick(e, dt) {
        e.face = e.ddir;
        e.x += e.ddir * NINJA.speed * dt;
        if (
          !e.hitDone &&
          Math.abs(P.x - e.x) < 46 &&
          Math.abs(P.y - e.y) < 26 &&
          P.z < 90 &&
          hitPlayer(NINJA.dmg, e.ddir, true)
        )
          e.hitDone = true;
        // the green after-image trail
        if (fxRandom() < 0.9)
          G.parts.push({
            k: 'glow',
            x: e.x - e.ddir * fxRnd(10, 60),
            y: e.y - fxRnd(30, 130),
            vx: -e.ddir * 60,
            vy: 0,
            g: 0,
            t: 0,
            life: fxRnd(0.15, 0.3),
            s: fxRnd(3, 6),
            col: A.glow,
          });
        const edge = e.x < G.cam + 30 || e.x > G.cam + W - 30;
        if (Math.abs(e.x - e.x0) > NINJA.len || edge) go(e, 'nrec');
      },
    },
    nrec(e) {
      if (e.t > 0.45) go(e, 'chase');
    },
    nguard(e) {
      faceP(e);
      if (e.t > NINJA.guardT) go(e, 'chase');
    },
  },
  // the dash's line, glowing on the ground ahead as it crouches
  ground(e) {
    if (e.state !== 'ntele') return;
    const k = Math.min(1, e.t / NINJA.tele),
      x = e.x - G.cam,
      x1 = x + e.ddir * NINJA.len * (0.4 + 0.6 * k);
    ctx.save();
    ctx.strokeStyle = `rgba(125,255,138,${0.25 + 0.5 * k})`;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, e.y);
    ctx.lineTo(x1, e.y);
    ctx.stroke();
    ctx.restore();
  },
  look: robotLook(A, head, katana),
  pose: {
    // the katana up and ready
    guard: { chase: { set: { aF: (e, k) => [0.95, 2.1 + 0.05 * k.br], aB: [0.6, 1.5] } } },
    states: {
      ntele: {
        set: {
          lean: 0.55,
          lF: [0.95, -0.7],
          lB: [-0.9, -1.5],
          aF: [-0.9, -1.5],
          aB: [1.1, 1.4],
          head: 0.2,
        },
      },
      ndash: {
        set: { lean: 0.75, lF: [1.1, 0.3], lB: [-1.3, -0.8], aF: [1.6, 1.62], aB: [-0.6, -0.2] },
      },
      nguard: {
        set: { aF: [1.3, 2.6], aB: [0.9, 1.6], lean: -0.05 },
        fn: (o, e) => (o.aF = [1.3 + Math.sin(e.t * 30) * 0.25, 2.2 + Math.sin(e.t * 30) * 0.8]),
      },
    },
  },
});
