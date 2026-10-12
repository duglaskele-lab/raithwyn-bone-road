// Jawacorp's android guards (Midnight City). The guard (TYPES.guard): white armour, a visor glowing
// blue, an electric baton; its blow stuns the heroine for a moment (ROBOT.stun). The guardess
// (TYPES.catguard), rarer: slimmer, a helmet with cat's ears and a pink visor, a cable plait,
// a plasma rifle; she keeps her distance, a laser sight shows where she aims, and she fires a
// plasma bolt along the road.
// Two kinds of guard more: the grenadier (TYPES.grenadier) walks up with a grenade held out
// ready in its other hand, throws it once (JNADE) and then fights as a guard; the cell carrier
// (TYPES.cellguard) hits with a Jawacorp power cell in both hands, and a blow with it, or a
// blow on it, sets the cell's timer going (CELLG): three seconds, then it bursts.
import { APP } from '../state.js';
import { CELLG, JNADE, OL, ROBOT, TAU } from '../config.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { hitPlayer, stunPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { explode } from '../blast.js';
import { go } from './kit.js';
import {
  drawCell,
  drawJnade,
  dropCell,
  fireBolt,
  robotDie,
  robotLook,
  THROW_POSE,
  visorHelm,
} from './robot.js';

const GUARD = { body: '#d7dde4', trim: '#4f5663', glow: '#4fe3ff', w: 13, chest: 1.08 };
const CAT = { body: '#efe8f4', trim: '#3f3550', glow: '#ff4fb4', w: 9, chest: 0.92 };
const GREN = { body: '#c9c3a6', trim: '#4e4a3a', glow: '#ffb02e', w: 13, chest: 1.1 };
const CELL = { body: '#d7dde4', trim: '#2e4a5a', glow: '#7fe9ff', w: 14, chest: 1.12 };

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

// the baton's blow: a jolt that stuns (or, if she is not on her feet, just hurts)
function batonBlow(e) {
  SFX.crackle();
  if (!stunPlayer(e.T.dmg, ROBOT.stun)) hitPlayer(e.T.dmg, e.face, false);
  return false;
}

export default defineFoe('guard', {
  look: robotLook(GUARD, (c) => visorHelm(c.fl, GUARD), baton),
  connect: batonBlow,
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

/** Does the grenadier still have its grenade? */
const hasNade = (e) => !e.nadeGone && !(e.state === 'gthrow' && e.thrown);
/** Grenades in a belt across the chest (one is missing: it is in the hand). */
function nadeBelt(c) {
  ctx.fillStyle = c.fl ? '#fff' : '#3a3428';
  ctx.save();
  ctx.translate(2, -36);
  ctx.rotate(-0.6);
  ctx.fillRect(-24, -3, 48, 6);
  for (const x of [-14, 0, 14]) {
    ctx.save();
    ctx.translate(x, 2);
    drawJnade(4.5, null, c.fl);
    ctx.restore();
  }
  ctx.restore();
}

defineFoe('grenadier', {
  init: { nadeCd: [0.3, 1.2] },
  timers: ['nadeCd'],
  look: robotLook(GREN, (c) => visorHelm(c.fl, GREN), baton, nadeBelt, {
    backHand(c, p) {
      if (!hasNade(c.e)) return;
      ctx.save();
      ctx.translate(p[0], p[1]);
      drawJnade(8, null, c.fl);
      ctx.restore();
    },
  }),
  moves: [
    {
      // its one grenade, from a little way off
      when: (e, s) =>
        !e.nadeGone && e.nadeCd <= 0 && !s.pdown && s.adx > JNADE.min && s.adx < 460 && s.ady < 120,
      go(e) {
        go(e, 'gthrow', 0, { engage: false, thrown: false });
      },
    },
  ],
  onThrow(e) {
    e.nadeGone = true;
  },
  connect: batonBlow,
  die: robotDie,
  pose: {
    guard: {
      chase: {
        set: {
          aF: (e, k) => [0.9, 2.3 + 0.05 * k.br],
          // the grenade held out behind, high, ready to be thrown
          aB: (e, k) => (hasNade(e) ? [-2.15, -1.75 + 0.05 * k.br] : [0.02, 0.95]),
        },
      },
    },
    states: { gthrow: THROW_POSE },
  },
});

/** Does the cell carrier still hold its cell? */
const hasCell = (e) => !e.cellGone;
/** Set its cell's timer going (if it is not already). */
function armCell(e) {
  if (!hasCell(e) || e.cellT > 0) return;
  e.cellT = e.cellBeep = CELLG.fuse;
  SFX.beep();
}
/** Where the cell is: in its hands, in front of its chest. */
const cellAt = (e) => [e.x + e.face * 34 * e.T.scale, e.y + 2];

defineFoe('cellguard', {
  look: robotLook(
    CELL,
    (c) => visorHelm(c.fl, CELL),
    (c) => {
      const { e, h, wa, fl } = c;
      if (!hasCell(e)) return;
      ctx.save();
      ctx.translate(h[0], h[1]);
      ctx.rotate(-(wa - 1.57) * 0.8);
      ctx.translate(-4, 26);
      drawCell(52, e.cellT > 0 ? e.cellT : null, fl);
      ctx.restore();
    },
  ),
  // the blow with the cell knocks her down, and sets its timer going; without it, a punch
  connect(e) {
    if (hasCell(e)) {
      SFX.crackle();
      hitPlayer(e.T.dmg, e.face, true);
      armCell(e);
    } else hitPlayer(Math.round(e.T.dmg * 0.6), e.face, false);
    return false;
  },
  // a blow on it sets the timer going too
  onHit(e) {
    armCell(e);
    return false;
  },
  tick(e, dt) {
    if (!(e.cellT > 0)) return;
    e.cellT -= dt;
    if (e.cellT > 0 && Math.ceil(e.cellT) < Math.ceil(e.cellBeep)) SFX.beep(e.cellT < 1);
    e.cellBeep = e.cellT;
    if (e.cellT <= 0) {
      // it bursts in its hands
      e.cellGone = true;
      e.cellT = 0;
      explode(...cellAt(e), 'cell');
    }
  },
  die(e, dir) {
    // the cell falls, its timer running (a dying blow is a blow on it too)
    if (hasCell(e)) dropCell(e, e.cellT > 0 ? e.cellT : CELLG.fuse);
    e.cellGone = true;
    robotDie(e, dir);
  },
  pose: {
    // the cell carried in both hands, in front
    guard: {
      chase: {
        fn: (o, e, k) => {
          if (!hasCell(e)) return;
          o.aF = [0.75, 2.05 + 0.04 * k.br];
          o.aB = [0.65, 2.0 + 0.04 * k.br];
        },
      },
    },
    states: {
      // both hands on the cell for the swing
      windup: { fn: (o, e) => hasCell(e) && (o.aB = [o.aF[0] - 0.12, o.aF[1]]) },
      attack: { fn: (o, e) => hasCell(e) && (o.aB = [o.aF[0] - 0.12, o.aF[1]]) },
      recover: { fn: (o, e) => hasCell(e) && (o.aB = [o.aF[0] - 0.12, o.aF[1]]) },
    },
  },
});
