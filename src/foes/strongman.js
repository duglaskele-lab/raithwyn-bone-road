// The saloon strongman (TYPES.strongman, STRONG): a huge zombie circus strongman in a striped
// leotard, waxed moustache, a kettlebell on his shoulder. A medium foe. His plain attack is a
// grab: he hoists the heroine over his head and hurls her across the screen, bowling over the
// foes she flies into; mashing buttons breaks free first. Now and then he flexes: a glint in
// his eyes, and for a while blows barely hurt him and do not stop him (a crushing one throws
// him). His ground slam sends a shock wave along the ground to the edge of the screen.
import { GB, GT, H, OL, STRONG, TAU } from '../config.js';
import { fxRandom, fxRnd, random, rnd } from '../util.js';
import { G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { grabPlayer, hitPlayer } from '../combat.js';
import { level } from '../level.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';

/** The road's whole depth, top to bottom, at `x` (Old Quarry's floor is a set of polygons:
 *  where a line straight down the screen at x crosses them). */
export function roadBand(x) {
  const F = level().floor;
  if (!F) return [GT, GB];
  let lo = Infinity,
    hi = -Infinity;
  for (const poly of F)
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i],
        [x2, y2] = poly[(i + 1) % poly.length];
      if ((x1 <= x && x < x2) || (x2 <= x && x < x1)) {
        const y = y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
      }
    }
  return lo < hi ? [lo + 4, hi - 4] : [G.camY + 300, G.camY + H - 6];
}

export default defineFoe('strongman', {
  init: { flexCd: [6, 10], slamCd: [3, 5] },
  timers: ['flexCd', 'slamCd'],
  stand: 60,
  attacks: ['lift', 'slam', 'flex'],
  moves: [
    {
      // now and then, not too near: he flexes
      when: (e, s, dt) => e.flexCd <= 0 && s.adx < 320 && !s.pdown && random() < dt * 0.6,
      go(e) {
        go(e, 'flex', 0, { engage: false, flexCd: rnd(...STRONG.flexCd) });
        SFX.stance();
      },
    },
    {
      // at a distance: the ground slam
      when: (e, s) => e.slamCd <= 0 && !s.pdown && s.adx > 150 && s.adx < 620,
      go(e) {
        faceP(e);
        go(e, 'slam', 0, { engage: false, slammed: false, slamCd: rnd(...STRONG.slamCd) });
      },
    },
  ],
  // the grab lands: she is hoisted over his head
  connect(e) {
    if (!grabPlayer(e)) return false;
    P.hold = STRONG.hold;
    go(e, 'lift');
    return true;
  },
  // flexing, he shrugs blows off: a tenth of the damage, and they do not stop him
  soak: (e, knock, src, crush) => (e.state === 'flex' && !crush ? STRONG.soak : 1),
  guard: (e, knock, src, dir, crush) => e.state === 'flex' && !crush,
  states: {
    lift(e, dt) {
      // up over his head, then thrown across the screen
      const u = Math.min(1, e.t / 0.35);
      if (P.state !== 'grabbed' || P.grabber !== e) {
        go(e, 'recover');
        return;
      }
      P.x = e.x + e.face * 18 * (1 - u);
      P.y = e.y + 2;
      P.z = 135 * u * e.T.scale;
      if (e.t >= STRONG.lift) {
        P.grabber = null;
        P.inv = 0;
        P.state = 'idle';
        if (hitPlayer(STRONG.throwDmg, e.face, true)) {
          Object.assign(P, { vx: e.face * STRONG.throwV, vz: 520, z: 135 * e.T.scale });
          P.thrown = new Set();
          P.thrower = e;
        }
        SFX.swing();
        SFX.heavy();
        G.shake = Math.max(G.shake, 6);
        go(e, 'recover');
      }
    },
    slam: {
      pin: true,
      tick(e) {
        // both fists up, a tremble... and down on the ground
        if (e.t >= STRONG.slamWind && !e.slammed) {
          e.slammed = true;
          SFX.quake();
          G.shake = Math.max(G.shake, 12);
          dust(e.x + e.face * 60, e.y, 14);
          G.projs.push({
            k: 'quake',
            x: e.x + e.face * 70,
            y: e.y,
            z: 0,
            vx: e.face * STRONG.waveSpeed,
            life: 4,
            hit: false,
          });
        }
        if (e.t > STRONG.slamWind + 0.55) go(e, 'chase', 0, { slammed: false });
      },
    },
    flex(e) {
      // a double biceps, sparkling
      faceP(e);
      if (fxRandom() < 0.35)
        G.parts.push({
          k: 'star',
          x: e.x + fxRnd(-60, 60),
          y: e.y - fxRnd(120, 260),
          t: 0,
          life: 0.3,
          s: fxRnd(14, 24),
          col: '#fff6c0',
          rot: fxRnd(TAU),
        });
      if (e.t > STRONG.flex) go(e, 'chase');
    },
  },
  // flexing: a warm glow round him (outside a red outline)
  aura(e) {
    if (e.state !== 'flex') return;
    const x = e.x - G.cam,
      y = e.y - e.z - 130,
      g = ctx.createRadialGradient(x, y, 10, x, y, 170);
    g.addColorStop(0, `rgba(255,220,120,${0.25 + 0.1 * Math.sin(G.time * 14)})`);
    g.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x - 170, y - 170, 340, 340);
    ctx.restore();
  },
  look: {
    torso(c) {
      // the striped leotard over the chest, one strap over the shoulder; a kettlebell on it
      const { e, fl, sh } = c;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(sh[0] - 6, sh[1] + 2);
      ctx.lineTo(sh[0] + 10, sh[1] + 4);
      ctx.quadraticCurveTo(26, -14, 20, 10);
      ctx.lineTo(-18, 10);
      ctx.quadraticCurveTo(-24, -14, sh[0] - 6, sh[1] + 2);
      ctx.closePath();
      ctx.fillStyle = fl ? '#fff' : '#f2ead8';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = fl ? '#fff' : '#c8283c';
      for (let y = sh[1]; y < 14; y += 9) ctx.fillRect(-30, y, 60, 4.5);
      ctx.restore();
      ctx.stroke();
      if (['chase', 'recover', 'hurt'].includes(e.state)) {
        // the kettlebell resting on his shoulder
        ctx.translate(sh[0] - 6, sh[1] - 10);
        ctx.fillStyle = fl ? '#fff' : '#26232c';
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, -12, 6, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#5a566a';
        ctx.beginPath();
        ctx.arc(-3, -3, 3, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    },
    legs(c) {
      // the leotard's shorts
      const { fl } = c;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      ctx.fillStyle = fl ? '#fff' : '#c8283c';
      ctx.beginPath();
      ctx.moveTo(-16, -6);
      ctx.lineTo(17, -6);
      ctx.lineTo(19, 14);
      ctx.lineTo(4, 16);
      ctx.lineTo(0, 9);
      ctx.lineTo(-4, 16);
      ctx.lineTo(-18, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
    head(c) {
      // slicked hair parted in the middle, a waxed handlebar moustache
      const { e, fl } = c;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.2;
      ctx.fillStyle = fl ? '#fff' : '#2b2420';
      ctx.beginPath();
      ctx.arc(0, -2, 14.5, Math.PI * 1.05, Math.PI * 1.95);
      ctx.quadraticCurveTo(2, -10, -14, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4, 6);
      ctx.quadraticCurveTo(10, 3, 16, 5);
      ctx.quadraticCurveTo(24, 6, 26, -2);
      ctx.quadraticCurveTo(22, 4, 16, 8.5);
      ctx.quadraticCurveTo(10, 9.5, 4, 8.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (e.state === 'flex') {
        // the glint in his eye
        const g = 0.6 + 0.4 * Math.sin(G.time * 20);
        ctx.fillStyle = `rgba(255,255,255,${g})`;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU,
            r = k % 2 ? 1.6 : 7;
          ctx.lineTo(8 + Math.cos(a) * r, -2 + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },
  },
  pose: {
    guard: {
      // huge arms hanging, a little forward, ready to grab
      chase: { set: { aF: (e, k) => [0.55 + 0.04 * k.br, 0.9], aB: [0.35, 0.8] } },
    },
    states: {
      // hoisting her up over his head
      lift: { set: { aF: [2.7, 3.0], aB: [2.6, 2.9], lean: -0.08, head: -0.3, jaw: 5 } },
      // both fists raised high, trembling, then down on the ground
      slam: [
        {
          until: STRONG.slamWind,
          set: { aF: [2.9, 3.3], aB: [2.8, 3.2], lean: -0.15, jaw: 4 },
          shake: { after: STRONG.slamWind * 0.5, amp: 0.05, rate: 70, fields: ['aF', 'aB'] },
        },
        {
          set: {
            aF: [1.1, 0.6],
            aB: [1.0, 0.5],
            lean: 0.7,
            lF: [1.0, -0.4],
            lB: [-0.5, -1.2],
            jaw: 6,
          },
        },
      ],
      // the double biceps
      flex: {
        set: { aF: [1.75, 3.05], aB: [1.6, 2.95], lean: -0.05, head: -0.15 },
        fn: (o, e) => (o.jaw = 2 + 2 * Math.sin(e.t * 6)),
      },
    },
  },
});
