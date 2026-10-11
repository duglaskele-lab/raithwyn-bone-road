// Jawacorp's android guards (Neon Kyoto). The guard (TYPES.guard): white armour, a visor glowing
// blue, an electric baton; its blow stuns the heroine for a moment (ROBOT.stun). The guardess
// (TYPES.catguard), rarer: slimmer, a helmet with cat's ears and a pink visor, a cable plait,
// a plasma rifle; she keeps her distance, a laser sight shows where she aims, and she fires a
// plasma bolt along the road.
import { APP } from '../state.js';
import { OL, ROBOT, TAU } from '../config.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { hitPlayer, stunPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { fireBolt, robotDie, robotLook, visorHelm } from './robot.js';

const GUARD = { body: '#d7dde4', trim: '#4f5663', glow: '#4fe3ff', w: 13, chest: 1.08 };
const CAT = { body: '#efe8f4', trim: '#3f3550', glow: '#ff4fb4', w: 9, chest: 0.92 };

/** The stun baton in the hand: a black grip, a rod, its end crackling blue. */
function baton(c) {
  const { e, fl, h, wa } = c;
  ctx.save();
  ctx.translate(h[0], h[1]);
  ctx.rotate(-wa);
  ctx.lineCap = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 52);
  ctx.stroke();
  ctx.strokeStyle = fl ? '#fff' : '#2b2f3a';
  ctx.lineWidth = 4.5;
  ctx.stroke();
  ctx.strokeStyle = fl ? '#fff' : '#8a94a0';
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.lineTo(0, 50);
  ctx.stroke();
  const hot = e.state === 'windup' || e.state === 'attack';
  ctx.fillStyle = '#bff6ff';
  if (!APP.lowFx) {
    ctx.shadowColor = '#4fe3ff';
    ctx.shadowBlur = hot ? 16 : 8;
  }
  ctx.beginPath();
  ctx.arc(0, 52, hot ? 6 : 4, 0, TAU);
  ctx.fill();
  if (hot) {
    ctx.strokeStyle = '#dffbff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = e.anim * 40 + k * 2.1;
      ctx.moveTo(0, 52);
      ctx.lineTo(Math.cos(a) * 12, 52 + Math.sin(a) * 12);
      ctx.lineTo(Math.cos(a + 0.7) * 18, 52 + Math.sin(a + 0.7) * 18);
    }
    ctx.stroke();
  }
  ctx.restore();
}
/** The plasma rifle, held level in front (the laser sight on while she aims). */
function rifle(c) {
  const { e, fl, h, s } = c;
  ctx.save();
  ctx.translate(h[0] - 10, h[1] - 2);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.2;
  ctx.fillStyle = fl ? '#fff' : '#2b2a36';
  ctx.beginPath();
  ctx.moveTo(-22, -6);
  ctx.lineTo(40, -7);
  ctx.lineTo(40, 1);
  ctx.lineTo(10, 3);
  ctx.lineTo(4, 12);
  ctx.lineTo(-4, 12);
  ctx.lineTo(-2, 3);
  ctx.lineTo(-22, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : '#efe8f4';
  ctx.fillRect(40, -6, 16, 6);
  ctx.strokeRect(40, -6, 16, 6);
  ctx.fillStyle = CAT.glow;
  ctx.fillRect(8, -5, 22, 3);
  if (e.state === 'windup' && !fl) {
    // the laser sight: a thin red line along the road, brightening as she is about to fire
    const k = Math.min(1, e.t / e.T.wind);
    ctx.strokeStyle = `rgba(255,60,90,${0.25 + 0.6 * k})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(56, -3);
    ctx.lineTo(56 + 420 / s, -3);
    ctx.stroke();
  }
  ctx.restore();
}
/** Her helmet, and the cable plait swinging behind it. */
function catHead(c) {
  const { e, fl } = c;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const sw = Math.sin(e.anim * 4) * 4;
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.quadraticCurveTo(-26, 8 + sw, -22, 26 + sw);
  ctx.stroke();
  ctx.strokeStyle = fl ? '#fff' : '#ff4fb4';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  visorHelm(fl, CAT, true);
}

export default defineFoe('guard', {
  look: robotLook(GUARD, (c) => visorHelm(c.fl, GUARD), baton),
  // the baton's blow: a jolt that stuns (or, if she is not on her feet, just hurts)
  connect(e) {
    SFX.crackle();
    if (!stunPlayer(e.T.dmg, ROBOT.stun)) hitPlayer(e.T.dmg, e.face, false);
    return false;
  },
  die: robotDie,
  pose: {
    // the baton held up, ready
    guard: { chase: { set: { aF: (e, k) => [0.9, 2.3 + 0.05 * k.br] } } },
  },
});

defineFoe('catguard', {
  look: robotLook(CAT, catHead, rifle),
  strike(e) {
    fireBolt(e, e.x + e.face * 62 * e.T.scale, 92 * e.T.scale, ROBOT.boltV, e.T.dmg);
  },
  die: robotDie,
  // the rifle held level in both hands, all the time
  pose: {
    base: { set: { aF: [1.25, 1.55], aB: [1.0, 1.45] } },
    states: {
      windup: { set: { aF: [1.35, 1.57], aB: [1.1, 1.5], lean: 0.02 } },
      attack: { set: { aF: [1.2, 1.4], aB: [0.95, 1.35], lean: -0.08 } },
    },
  },
});
