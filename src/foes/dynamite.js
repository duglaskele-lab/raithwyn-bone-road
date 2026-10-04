// The dynamite zombie: a sly one with a bandolier of sticks. It keeps its distance, lights a
// stick (the fuse burns DYNAMITE.fuse seconds from then), takes a long swing and lobs it; the
// stick lies on the ground until it blows up (BLAST.dynamite), hurting anyone near it. Hit it
// while it holds a lit stick, and the stick drops at its feet.
import { DYNAMITE, OL, TAU } from '../config.js';
import { clamp, random, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { ctx } from '../gfx.js';
import { defineFoe } from './registry.js';
import { lob } from './kit.js';
import { flannel } from './miner.js';

/** A stick of dynamite, centred, `len` long, lying along x; `lit` adds a burning fuse. */
export function stick(len, lit, fl) {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.fillStyle = fl ? '#fff' : '#c8321e';
  ctx.beginPath();
  ctx.rect(-len / 2, -4, len, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8d9a8';
  ctx.fillRect(-len / 2 + 4, -4, 4, 8);
  ctx.strokeStyle = '#2c2a2e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(len / 2, 0);
  ctx.quadraticCurveTo(len / 2 + 6, -6, len / 2 + 9, -2);
  ctx.stroke();
  if (!lit) return;
  const f = Math.floor(G.time * 20) % 2;
  ctx.fillStyle = f ? '#fff6c0' : '#ff8a2a';
  ctx.beginPath();
  ctx.arc(len / 2 + 9, -2, 3.5 + f * 1.5, 0, TAU);
  ctx.fill();
}
/** The lit stick falls from its hand: it lies there until its fuse burns down. */
function dropStick(e) {
  if (!(e.fuse > 0)) return;
  G.projs.push({
    k: 'tnt',
    x: e.x + e.face * 14,
    y: e.y + 4,
    z: 90 * e.T.scale,
    vx: e.face * 40,
    vy: 0,
    vz: 120,
    rot: 0,
    fuse: e.fuse,
    life: 99,
  });
  e.fuse = 0;
}

export default defineFoe('dynamite', {
  timers: ['fuse'],
  aimDy: 70,
  look: {
    torso(c) {
      flannel(c, '#5a6a7a', '#3a4654');
      // a bandolier of sticks across the chest
      const { sh } = c;
      ctx.save();
      ctx.translate(sh[0] * 0.5, sh[1] * 0.5 + 6);
      ctx.rotate(-0.7);
      ctx.fillStyle = '#4a3020';
      ctx.fillRect(-26, -4, 52, 8);
      for (let i = -2; i <= 2; i++) {
        ctx.save();
        ctx.translate(i * 9, 0);
        ctx.rotate(Math.PI / 2);
        stick(13, false, c.fl);
        ctx.restore();
      }
      ctx.restore();
    },
    head(c) {
      // a battered cowboy hat (no miner's helmet, no pick: just dynamite)
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      ctx.fillStyle = c.fl ? '#fff' : '#5a3a24';
      ctx.beginPath();
      ctx.ellipse(1, -8, 24, 5, -0.08, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-11, -9);
      ctx.lineTo(-9, -24);
      ctx.quadraticCurveTo(1, -20, 11, -25);
      ctx.lineTo(12, -9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2a1a10';
      ctx.fillRect(-10, -13, 22, 4);
    },
    weapon(c) {
      const { e, h, fl } = c;
      // a stick always in its hand; lit for the throw
      ctx.save();
      ctx.translate(h[0], h[1]);
      ctx.rotate(-c.wa + 0.4);
      stick(22, e.state === 'windup', fl);
      ctx.restore();
    },
  },
  pose: {
    states: {
      // the arm goes far back over the shoulder, the other arm out for balance
      windup: {
        set: { lF: [0.45, 0.1], lB: [-0.5, -0.7], jaw: 5 },
        tween: {
          dur: 0.6,
          from: { aF: 'pre', aB: [0.02, 0.95], lean: 0.1 },
          to: { aF: [-2.3, -1.4], aB: [1.4, 1.5], lean: -0.25 },
        },
        shake: { after: 0.8, amp: 0.04, rate: 50, fields: ['aF'] },
      },
      attack: {
        set: { lF: [0.6, 0.15], lB: [-0.55, -0.8], jaw: 5 },
        tween: {
          dur: 0.08,
          ease: false,
          from: { aF: [-2.3, -1.4], lean: -0.25 },
          to: { aF: [1.7, 1.5], lean: 0.35 },
        },
      },
    },
  },
  on: {
    // the fuse is lit as the swing begins
    windup(e) {
      if (!(e.fuse > 0)) {
        e.fuse = DYNAMITE.fuse;
        SFX.fuse();
      }
      if (random() < 0.5)
        G.parts.push({
          k: 'dot',
          x: e.x - e.face * 20,
          y: e.y - 150 * e.T.scale,
          vx: rnd(-40, 40),
          vy: rnd(-120, -60),
          g: 300,
          t: 0,
          life: 0.25,
          s: 2.5,
          col: '#ffcf5a',
        });
    },
  },
  strike(e) {
    // the throw: an arc to where the player stands (a little short or long is fine)
    const x0 = e.x + e.face * 20,
      d = clamp((P.x - x0) * e.face, 90, 460);
    lob(e, 'tnt', x0, 150 * e.T.scale, DYNAMITE.flight, DYNAMITE.g, d, 120, {
      fuse: e.fuse,
      life: 99,
    });
    e.fuse = 0;
  },
  onHit(e) {
    // caught with a lit stick in hand: it drops
    if (e.state === 'windup') dropStick(e);
    return false;
  },
});
