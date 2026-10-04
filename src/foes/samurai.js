// The skeleton samurai: an elite with a katana (numbers in SAMURAI and TYPES.samurai). Out of
// reach of its cut it takes a ready stance and creeps up; step inside and it cuts in a wide
// arc. A hit from afar breaks the stance and dazes it; without the stance it kicks.
import { OL, SAMURAI, TAU } from '../config.js';
import { clamp, ease, lerp, rnd } from '../util.js';
import { G, P } from '../state.js';
import { ctx, rr } from '../gfx.js';
import { SFX } from '../audio.js';
import { hitPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go, inFront, moveTo } from './kit.js';

const restCd = () => rnd(SAMURAI.stanceCd[0], SAMURAI.stanceCd[1]);

// its poses
const GUARD0 = { aF: [0.55, 1.2], aB: [0.75, 1.3], ka: 2.25 },
  GUARD = {
    aF: (e, k) => [0.55, 1.2 + 0.04 * k.br],
    aB: [0.75, 1.3],
    ka: (e, k) => 2.25 + 0.04 * k.br,
  },
  LOW = {
    lean: 0.3,
    lF: [0.62, 0.12],
    lB: [-0.6, -0.8],
    aF: [-0.25, 0.3],
    aB: [-0.15, 0.4],
    ka: -1.2,
  },
  HIGH = {
    lean: 0.5,
    lF: [0.95, 0.35],
    lB: [-0.85, -1.1],
    aF: [2.3, 2.6],
    aB: [2.1, 2.5],
    ka: 2.7,
  },
  STANCE = {
    set: { lean: 0.3, head: -0.12, aF: [-0.25, 0.3], aB: [-0.15, 0.4], ka: -1.05, jaw: 0 },
    // careful steps while it creeps up
    fn(o, e) {
      const sh = e.moving ? Math.sin(e.walkT) * 0.12 : 0;
      o.lF = [0.62 + sh, 0.12 + sh];
      o.lB = [-0.6 - sh, -0.8 - sh];
    },
  },
  // settling into the stance: from its guard down into the low stance
  SETTLE = {
    tween: {
      dur: SAMURAI.settle,
      from: { lean: 0.1, head: 0, ...GUARD0 },
      to: { lean: 0.3, head: -0.12, aF: [-0.25, 0.3], aB: [-0.15, 0.4], ka: -1.05 },
    },
    set: { jaw: 0 },
    fn(o, e) {
      const p = ease(clamp(e.t / SAMURAI.settle, 0, 1));
      STANCE.fn(o, e);
      o.lF = [lerp(0.16, o.lF[0], p), lerp(-0.02, o.lF[1], p)];
      o.lB = [lerp(-0.22, o.lB[0], p), lerp(-0.34, o.lB[1], p)];
    },
  },
  KICK_ARMS = { lB: [-0.2, -0.3], aF: [0.35, 0.7], aB: [0.45, 0.8], ka: 0.5 };
// the plain cut out of the stance, phase by phase
const RAISED = {
    lean: -0.1,
    aF: [2.6, 3.1],
    aB: [2.4, 2.9],
    ka: 3.4,
    lF: [0.3, 0.1],
    lB: [-0.35, -0.5],
  },
  DOWN = {
    lean: 0.35,
    aF: [1.3, 1.45],
    aB: [1.2, 1.4],
    ka: 1.1,
    lF: [0.55, 0.15],
    lB: [-0.5, -0.75],
  },
  READY = { lean: 0.1, ...GUARD0, lF: [0.16, -0.02], lB: [-0.22, -0.34] };
function swingPose(o, e) {
  const S = SAMURAI.swing,
    [a, b, u] =
      e.t < S.wind
        ? [READY, RAISED, ease(e.t / S.wind)]
        : e.t < S.wind + S.strike
          ? [RAISED, DOWN, Math.min(1, (e.t - S.wind) / (S.strike * 0.6))]
          : [DOWN, READY, ease(clamp((e.t - S.wind - S.strike) / S.rec, 0, 1))];
  for (const k in a)
    o[k] = Array.isArray(a[k])
      ? [lerp(a[k][0], b[k][0], u), lerp(a[k][1], b[k][1], u)]
      : lerp(a[k], b[k], u);
}
// the kicking leg coming back down
function kickBack(o, e) {
  const p = 1 - ease(clamp(e.t / e.T.rec, 0, 1));
  o.lF = [lerp(0.16, 1.35, p), lerp(-0.02, lerp(-0.2, 1.55, p), p)];
  o.lean = lerp(0.1, -0.22, p);
}

export default defineFoe('samurai', {
  timers: ['stanceCd'],
  unstoppable: (e) => e.state === 'slash',
  look: {
    back(c) {
      const { o, fl } = c;
      hakama(c, o.lB, -3, fl ? '#ffd9d9' : '#cfc8b8', '#a39d8f');
    },
    legs(c) {
      const { o, fl } = c;
      const white = fl ? '#ffffff' : '#f2efe6';
      hakama(c, o.lF, 3, white, '#c9c2b2');
      // the waist of the hakama and a black obi
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      ctx.fillStyle = white;
      ctx.beginPath();
      ctx.moveTo(-15, -7);
      ctx.lineTo(16, -7);
      ctx.lineTo(18, 12);
      ctx.lineTo(-17, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : '#1d1a24';
      ctx.beginPath();
      ctx.moveTo(-16, -11);
      ctx.lineTo(17, -10);
      ctx.lineTo(17, -2);
      ctx.lineTo(-16, -3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#7a1420';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, -6.5);
      ctx.lineTo(15, -5.5);
      ctx.stroke();
    },
    head(c) {
      const { e, T, fl } = c;
      // a red hachimaki round the brow, its tails flying behind
      const wv = Math.sin(e.anim * 7) * 3 + (e.moving ? 4 : 0);
      ctx.fillStyle = fl ? '#fff' : '#c8102e';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, -6);
      ctx.quadraticCurveTo(-26, -10 + wv, -32, -4 + wv);
      ctx.lineTo(-28, 0 + wv);
      ctx.quadraticCurveTo(-22, -4, -11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-12, -10);
      ctx.quadraticCurveTo(-24, -18 - wv * 0.5, -30, -16 - wv);
      ctx.lineTo(-27, -12 - wv);
      ctx.quadraticCurveTo(-20, -12, -12, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // the band itself, across the brow
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, -1, 13.5, 0, TAU);
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(-15, -10.5);
      ctx.lineTo(16, -14);
      ctx.lineTo(16, -8.6);
      ctx.lineTo(-15, -5);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
      if (e.state === 'stance' || e.state === 'draw' || e.state === 'slash') {
        // in the stance the eyes burn and leave a trail of light
        ctx.save();
        const g = 0.8 + 0.2 * Math.sin(G.time * 20);
        for (const [x, y, r] of [
          [4, -1.2, 2.8],
          [11.3, -1.2, 2.2],
        ]) {
          const gr = ctx.createLinearGradient(x, y, x - 46, y - 6);
          gr.addColorStop(0, `rgba(255,70,40,${0.95 * g})`);
          gr.addColorStop(1, 'rgba(255,30,10,0)');
          ctx.strokeStyle = gr;
          ctx.lineWidth = r * 1.7;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x - 22, y - 1, x - 46, y - 6 + Math.sin(e.anim * 9 + x) * 3);
          ctx.stroke();
          ctx.fillStyle = '#ffe0d6';
          ctx.shadowColor = T.eye;
          ctx.shadowBlur = 24 * g;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.restore();
      }
    },
    weapon(c) {
      const { e, o, fl, h, wa } = c;
      katana(h, o.ka ?? wa, fl, e.state === 'draw');
      if (e.state === 'slash') cutArc(e.t / SAMURAI.slash);
      else if (e.state === 'swing') {
        const S = SAMURAI.swing,
          u = (e.t - S.wind) / S.strike;
        if (u > 0 && u < 1.6) cutArc(u * 1.4, Math.min(1, 1.6 - u), 0.72, true);
      } else if (e.state === 'recover' && e.cut && e.t < 0.12) cutArc(1, 1 - e.t / 0.12);
    },
    world(c) {
      const { e, s, sx, sy } = c;
      if (e.state !== 'daze') return;
      // stars circling over the dazed samurai's head
      for (let i = 0; i < 3; i++) {
        const a = G.time * 5 + (i * TAU) / 3,
          x = sx + e.face * 14 * s + Math.cos(a) * 20,
          y = sy - 196 * s + Math.sin(a) * 6;
        ctx.fillStyle = '#ffe36a';
        ctx.strokeStyle = OL;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const r = k % 2 ? 2.6 : 6.5,
            b = (k * Math.PI) / 5 - Math.PI / 2;
          ctx.lineTo(x + Math.cos(b) * r, y + Math.sin(b) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    },
  },
  moves: [
    {
      // out of reach of its cut it drops into its ready stance and creeps up
      when: (e, s) =>
        // ...and only once it has been on screen a while, never from out of sight
        !s.pdown &&
        e.shown >= SAMURAI.seen &&
        e.stanceCd <= 0 &&
        s.adx > SAMURAI.range &&
        s.adx < 460 &&
        s.ady < 120,
      go(e) {
        go(e, 'stance', 0, { engage: false });
        SFX.stance();
      },
    },
    {
      // close, but not close enough for the kick: a plain cut of the sword, no stance needed
      when: (e, s) =>
        !s.pdown &&
        e.cd <= 0 &&
        s.adx > SAMURAI.swing.min &&
        s.adx < SAMURAI.swing.reach &&
        s.ady < 22,
      go: (e) => go(e, 'swing', 0, { hitDone: false, swung: false, engage: false }),
    },
  ],
  // the kick's recovery is not the follow-through of a cut
  on: { windup: (e) => (e.cut = false) },
  /**
   * Its guard. A hit from afar (a bone, a dark ball, the super) breaks the stance and dazes
   * it; a blow up close only sets off the cut. The cut is too fast to stop, and a dazed
   * samurai stays dazed unless it is knocked flat.
   */
  guard(e, knock, src) {
    const far = src === 'bone' || src === 'hado' || src === 'super';
    if (e.state === 'stance' || e.state === 'draw') {
      if (far) {
        go(e, 'daze', 0, { z: 0 });
        SFX.daze();
      } else if (e.state === 'stance') go(e, 'draw');
      return true;
    }
    if (e.state === 'slash') return true;
    return e.state === 'daze' && !knock;
  },
  // o.ka is the katana's angle (0 = down, PI/2 = forward, PI = up)
  pose: {
    states: {
      // guard in the middle: blade forward and up, held in front
      chase: { set: GUARD },
      rise: { set: GUARD },
      // low and wide, the blade held back by the hip, ready to cut
      stance: SETTLE,
      // a tremble and the blade drawn back a little more, the instant before the cut
      draw: {
        ...STANCE,
        shake: { amp: 0.03, rate: 90, fields: ['lean'] },
        tween: {
          dur: SAMURAI.draw,
          ease: false,
          clamp: false,
          from: { ka: -1.05 },
          to: { ka: -1.2 },
        },
      },
      // one wide sweep from behind the hip, through the front, up high
      slash: { set: { jaw: 5 }, tween: { dur: SAMURAI.slash * 0.75, from: LOW, to: HIGH } },
      recover: [
        {
          if: (e) => e.cut,
          tween: {
            dur: (e) => e.T.rec,
            from: HIGH,
            to: { lean: 0.15, lF: [0.16, -0.02], lB: [-0.22, -0.34], ...GUARD0 },
          },
        },
        { set: KICK_ARMS, fn: kickBack },
      ],
      // the kick: knee up, then the foot shoots out; the sword held low out of the way
      windup: {
        set: KICK_ARMS,
        tween: {
          dur: (e) => e.T.wind,
          from: { lF: [0.16, -0.02], lean: 0.1 },
          to: { lF: [1.35, -0.2], lean: -0.22 },
        },
      },
      attack: {
        set: { ...KICK_ARMS, lean: -0.22 },
        tween: { dur: 0.05, ease: false, from: { lF: [1.35, -0.2] }, to: { lF: [1.35, 1.55] } },
      },
      // the plain cut: the sword raised over the head, brought down in front, back to guard
      swing: { set: { jaw: 4 }, fn: swingPose },
      // reeling, the sword point dragging on the ground
      daze: {
        set: { aB: [0.05, 0], lF: [0.2, 0.05], lB: [-0.25, -0.4], ka: 0.35, jaw: 6 },
        fn(o, e) {
          const w = Math.sin(e.t * 6);
          o.lean = 0.42 + 0.08 * w;
          o.head = 0.45 + 0.1 * w;
          o.aF = [0.1 + 0.05 * w, 0.05];
        },
      },
    },
  },
  states: {
    stance(e, dt, s) {
      // eyes burning, katana low: one step inside its range and it cuts
      faceP(e);
      if (e.t < SAMURAI.settle) return; // still settling into it: no cut yet
      const f = s.dx * e.face;
      if (!s.pdown && f > 0 && f < SAMURAI.range && s.ady < SAMURAI.dy && P.z < 120) {
        go(e, 'draw');
        return;
      }
      if (s.pdown || e.t > SAMURAI.stance) {
        go(e, 'chase', 0, { stanceCd: restCd() });
        return;
      }
      moveTo(e, P.x - e.face * SAMURAI.range * 0.7, P.y, SAMURAI.walk, dt);
    },
    draw(e) {
      if (e.t > SAMURAI.draw) {
        go(e, 'slash', 0, { hitDone: false, cut: true });
        SFX.katana();
      }
    },
    slash: {
      pin: true,
      // a wide arc in front of it, stepping through
      tick(e, dt) {
        if (e.t < SAMURAI.slash * 0.7) e.x += e.face * SAMURAI.lunge * dt;
        if (!e.hitDone && inFront(e, SAMURAI.back, SAMURAI.arc, SAMURAI.dy, 130)) {
          e.hitDone = true;
          hitPlayer(SAMURAI.dmg, e.face, true);
        }
        if (e.t > SAMURAI.slash) go(e, 'recover', 0, { stanceCd: restCd() });
      },
    },
    swing(e) {
      const S = SAMURAI.swing;
      if (e.t < S.wind * 0.5) faceP(e);
      if (e.t > S.wind && !e.swung) {
        e.swung = true;
        SFX.swing();
      }
      if (
        !e.hitDone &&
        e.t > S.wind &&
        e.t < S.wind + S.strike &&
        inFront(e, 10, S.reach + 10, S.dy, 110)
      ) {
        e.hitDone = true;
        hitPlayer(S.dmg, e.face, false);
      }
      if (e.t > S.wind + S.strike + S.rec) {
        go(e, 'chase');
        e.cd = rnd(e.T.cd[0], e.T.cd[1]);
      }
    },
    daze(e) {
      if (e.t > SAMURAI.daze) {
        go(e, 'chase');
        e.cd = Math.max(e.cd, 0.4);
        e.stanceCd = restCd();
      }
    },
  },
});

// A katana at the hand, the blade pointing along angle `a` (0 = down, PI/2 = forward).
function katana(h, a, fl, glint) {
  ctx.save();
  ctx.translate(h[0], h[1]);
  ctx.rotate(-a);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.2;
  // the blade, gently curved, with a bright edge
  ctx.fillStyle = fl ? '#fff' : '#dfe6ee';
  ctx.beginPath();
  ctx.moveTo(-2.6, 7);
  ctx.quadraticCurveTo(-5, 48, -9, 86);
  ctx.lineTo(-5.5, 92);
  ctx.quadraticCurveTo(1, 50, 2.6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(1.2, 10);
  ctx.quadraticCurveTo(-0.5, 50, -5, 88);
  ctx.stroke();
  // round tsuba and a black wrapped hilt
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.2;
  ctx.fillStyle = '#3a3340';
  ctx.beginPath();
  ctx.ellipse(0, 5, 7.5, 2.8, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1d1a24';
  rr(-3, -20, 6, 23, 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#d8d0bd';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let y = -17; y < 1; y += 5) {
    ctx.moveTo(-2.5, y);
    ctx.lineTo(2.5, y + 2.5);
    ctx.moveTo(2.5, y);
    ctx.lineTo(-2.5, y + 2.5);
  }
  ctx.stroke();
  if (glint) {
    // a glint runs down the blade just before the cut
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 16;
    ctx.translate(-6, 70);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const r = k % 2 ? 2 : 11,
        b = (k * Math.PI) / 4;
      ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
// The white crescent of the cut: from behind the hip, through the front, up high.
// `size` scales the crescent; `down` makes it the plain cut, from overhead down in front.
function cutArc(p, fade = 1, size = 1, down = false) {
  const q = Math.min(1, p),
    a0 = down ? -1.4 : 2.5 - 3.7 * q,
    a1 = down ? -1.4 + 2.7 * q : 2.5;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const [r, w, c] of [
    [92, 22, `rgba(255,120,110,${0.25 * fade})`],
    [96, 10, `rgba(255,235,230,${0.75 * fade})`],
    [99, 3.5, `rgba(255,255,255,${fade})`],
  ]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(14, -36, r * size, a0, a1);
    ctx.stroke();
  }
  ctx.restore();
}

// White hakama over a leg: wide trousers flaring to the ankle.
function hakama(c, l, off, cloth, line) {
  const [p0, m, a] = c.limb([off, 0], l[0], l[1], c.TH, c.SH),
    n = (u, v) => {
      const d = Math.hypot(v[0] - u[0], v[1] - u[1]) || 1;
      return [-(v[1] - u[1]) / d, (v[0] - u[0]) / d];
    },
    n1 = n(p0, m),
    n2 = n(m, a),
    nk = [(n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2],
    hem = [lerp(m[0], a[0], 0.9), lerp(m[1], a[1], 0.9)],
    at = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k],
    pts = [
      at(p0, n1, 13),
      at(m, nk, 12),
      at(hem, n2, 16),
      at(hem, n2, -16),
      at(m, nk, -12),
      at(p0, n1, -13),
    ];
  ctx.lineJoin = 'round';
  ctx.fillStyle = cloth;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // pleats
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const k of [-6, 4]) {
    ctx.moveTo(...at(p0, n1, k * 0.6));
    ctx.lineTo(...at(m, nk, k));
    ctx.lineTo(...at(hem, n2, k * 1.3));
  }
  ctx.stroke();
}
