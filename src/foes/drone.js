// Jawacorp's watcher drone (TYPES.drone, DRONE): a flying saucer of a robot with two rotors
// and a red camera eye. It hovers out of reach of a blow from the ground (a jump attack or a
// shot brings it down), keeps away from the heroine, marks a spot on the ground under her,
// follows her with it, holds it still a moment and fires its laser there. Destroyed, it
// spins down and bursts on the ground.
import { DRONE, OL, TAU, W } from '../config.js';
import { clamp, fxRandom, fxRnd, rnd } from '../util.js';
import { APP, G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { hitPlayer } from '../combat.js';
import { jawaLogo } from '../bg3.js';
import { defineFoe } from './registry.js';
import { faceP, go, moveTo } from './kit.js';
import { robotDie } from './robot.js';

const hover = (e) => go(e, 'dhover', 0, { engage: false });

export default defineFoe('drone', {
  walksIn: true,
  spawn(e) {
    e.z = DRONE.z;
    e.vz = 0;
    hover(e);
  },
  moves: [{ when: () => true, go: hover }],
  attacks: ['daim', 'dfire'],
  // hit, it only wobbles and is pushed back (it never falls over or flies off)
  guard(e, knock, src, dir) {
    e.x += dir * (knock ? 40 : 14);
    e.wob = 0.4;
    if (e.state === 'daim' || e.state === 'dfire') hover(e);
    return true;
  },
  die(e) {
    Object.assign(e, { dying: true, engage: false, state: 'dcrash', t: 0, vz: 0 });
    SFX.clang();
  },
  states: {
    dhover(e, dt) {
      faceP(e);
      e.z += (DRONE.z + Math.sin(e.anim * 3) * 10 - e.z) * Math.min(1, dt * 4);
      const side = e.x >= P.x ? 1 : -1;
      moveTo(e, P.x + side * DRONE.keep, P.y - 20, e.T.speed, dt);
      e.moving = false;
      if (e.cd <= 0 && e.x > G.cam + 40 && e.x < G.cam + W - 40) {
        go(e, 'daim', 0, { tx: P.x, ty: P.y });
        SFX.beam();
      }
    },
    daim(e, dt) {
      // the red mark follows her, then holds still
      faceP(e);
      if (e.t < DRONE.aim) {
        const k = Math.min(1, dt * 5);
        e.tx += (P.x - e.tx) * k;
        e.ty += (P.y - e.ty) * k;
      }
      if (e.t > DRONE.aim + DRONE.lock) {
        go(e, 'dfire', 0, { fired: false });
        SFX.zap();
      }
    },
    dfire(e) {
      if (!e.fired) {
        e.fired = true;
        if (Math.abs(P.x - e.tx) < DRONE.r && Math.abs(P.y - e.ty) < DRONE.r * 0.5 && P.z < 60)
          hitPlayer(e.T.dmg, P.x >= e.x ? 1 : -1, false);
        G.shake = Math.max(G.shake, 2);
      }
      if (e.t > DRONE.beam) {
        e.cd = rnd(...e.T.cd);
        hover(e);
      }
    },
    dcrash(e, dt) {
      // spinning down, trailing smoke and sparks; it bursts on the ground
      e.vz -= 1400 * dt;
      e.z += e.vz * dt;
      e.spin = (e.spin ?? 0) + dt * 14;
      if (fxRandom() < 0.6)
        G.parts.push({
          k: 'smoke',
          x: e.x + fxRnd(-8, 8),
          y: e.y - e.z,
          vx: fxRnd(-20, 20),
          vy: fxRnd(-40, -10),
          g: 0,
          t: 0,
          life: 0.7,
          s: fxRnd(8, 14),
        });
      if (e.z <= 0) {
        e.z = 0;
        robotDie(e, e.face);
      }
    },
  },
  // the laser's mark on the ground
  ground(e) {
    if (e.state !== 'daim' && e.state !== 'dfire') return;
    const x = e.tx - G.cam,
      y = e.ty,
      lock = e.state === 'dfire' || e.t > DRONE.aim,
      r = DRONE.r * (e.state === 'daim' ? 1.2 - 0.2 * clamp(e.t / DRONE.aim, 0, 1) : 1);
    ctx.save();
    ctx.strokeStyle = lock ? 'rgba(255,40,60,.95)' : 'rgba(255,80,90,.6)';
    ctx.fillStyle = lock ? 'rgba(255,40,60,.22)' : 'rgba(255,80,90,.1)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r - 8, y);
    ctx.lineTo(x + r + 8, y);
    ctx.moveTo(x, y - r * 0.45 - 6);
    ctx.lineTo(x, y + r * 0.45 + 6);
    ctx.stroke();
    ctx.restore();
  },
  draw: drawDrone,
});

/** The drone: a saucer with two rotor arms, a red eye under it, Jawacorp's sign on top; its
 *  laser while it fires. */
function drawDrone(e) {
  const x = e.x - G.cam,
    y = e.y - e.z - 10 + (e.wob > 0 ? Math.sin(G.time * 60) * 3 : 0),
    fl = e.flash > 0,
    tilt = e.state === 'dcrash' ? e.spin : (e.moving ? 0.12 : 0.05) * e.face;
  if (e.wob > 0) e.wob -= 1 / 60;
  // the laser from its eye to the mark
  if (e.state === 'dfire') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tx = e.tx - G.cam,
      ty = e.ty;
    for (const [w, c] of [
      [14, 'rgba(255,40,60,.35)'],
      [5, 'rgba(255,230,230,.95)'],
    ]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x, y + 14);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(1.35, 1.35);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  // the rotor arms and their blurred blades
  for (const s of [-1, 1]) {
    ctx.fillStyle = fl ? '#fff' : e.T.dk;
    ctx.fillRect(s > 0 ? 18 : -40, -6, 22, 5);
    ctx.strokeRect(s > 0 ? 18 : -40, -6, 22, 5);
    ctx.fillStyle = 'rgba(200,210,230,.35)';
    ctx.beginPath();
    ctx.ellipse(s * 36, -10, 22, 4 + Math.abs(Math.sin(G.time * 50 + s)) * 2, 0, 0, TAU);
    ctx.fill();
  }
  // the body
  ctx.fillStyle = fl ? '#fff' : e.T.col;
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 12, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : '#8a92a0';
  ctx.beginPath();
  ctx.ellipse(0, -6, 15, 7, 0, Math.PI, TAU);
  ctx.fill();
  ctx.stroke();
  if (!fl) jawaLogo(0, -7, 5);
  // the eye, red, glowing brighter as it aims
  const hot = e.state === 'daim' || e.state === 'dfire';
  ctx.fillStyle = '#1a1014';
  ctx.beginPath();
  ctx.arc(e.face * 8, 8, 7, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = e.T.eye;
  if (!APP.lowFx) {
    ctx.shadowColor = e.T.eye;
    ctx.shadowBlur = hot ? 16 : 6;
  }
  ctx.beginPath();
  ctx.arc(e.face * 9, 8, hot ? 4 : 2.6, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  // the blinking light
  if (Math.floor(G.time * 3 + e.seed) % 2) {
    ctx.fillStyle = '#7dff8a';
    ctx.beginPath();
    ctx.arc(-e.face * 18, 2, 2.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
