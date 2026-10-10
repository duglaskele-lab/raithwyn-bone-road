// The saloon strongman (TYPES.strongman, STRONG): a huge, bulging zombie strongman in army
// camouflage trousers and boots and a tight white T-shirt, a crew cut, dog tags, a kettlebell
// on his shoulder. A medium foe. His plain attack is a grab: he hoists the heroine over his
// head and hurls her across the screen, bowling over the foes she flies into; mashing buttons
// breaks free first. Now and then he flexes: a glint in his eyes, and for a while blows barely
// hurt him and do not stop him (a crushing one throws him). His ground slam sends a shock
// wave along the ground to the edge of the screen.
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

/** Olive drab, its darker and its sandy camouflage blotches. */
const CAMO = ['#5d6b3c', '#3f4a28', '#8a8458'];
/** A thick stroke along a polyline: the outline, then the fill. */
function thick(pts, w, col) {
  for (const [lw, c] of [
    [w + 4, OL],
    [w, col],
  ]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
}
/** A point a fraction `u` of the way from `p` to `q`. */
const at = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
/** A muscle: a bulge along the bone from `p` to `q`, `r` thick. */
function bulge(p, q, r, col) {
  const [x, y] = at(p, q, 0.5),
    len = Math.hypot(q[0] - p[0], q[1] - p[1]) / 2 + 2,
    a = Math.atan2(q[1] - p[1], q[0] - p[0]);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(x, y, len, r, a, 0, TAU);
  ctx.fill();
  ctx.stroke();
}
/** The T-shirt's outline, upright from the hip (forward is +x). */
function shirt() {
  ctx.beginPath();
  ctx.moveTo(-10, -56);
  ctx.quadraticCurveTo(16, -61, 31, -52);
  ctx.quadraticCurveTo(44, -40, 36, -25);
  ctx.quadraticCurveTo(24, -14, 20, 6);
  ctx.lineTo(-14, 6);
  ctx.quadraticCurveTo(-20, -20, -29, -40);
  ctx.quadraticCurveTo(-28, -56, -10, -56);
  ctx.closePath();
}
/** An arm (shoulder, elbow, hand) dressed: a swelling biceps, a thick forearm, a short white
 *  sleeve over the shoulder. */
function brawn(L, fl, col, back = false) {
  const [s, el, h] = L;
  ctx.save();
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.2;
  bulge(at(s, el, 0.2), at(el, h, 0.08), 13.5, fl ? '#fff' : col);
  bulge(at(el, h, 0.02), at(el, h, 0.8), 10, fl ? '#fff' : col);
  ctx.lineCap = 'butt';
  thick([at(s, el, -0.15), at(s, el, 0.34)], 21, fl ? '#fff' : back ? '#cfcdc6' : '#f3f1ea');
  ctx.restore();
}
/** A leg (hip, knee, ankle) in camouflage trousers tucked into black boots. */
function trouser(L, fl, back = false) {
  const [hp, kn, an] = L;
  ctx.save();
  ctx.lineJoin = ctx.lineCap = 'round';
  const cloth = fl ? '#fff' : back ? '#4e5a32' : CAMO[0];
  // thigh and shin: both outlines first, so the knee shows no seam
  ctx.strokeStyle = OL;
  ctx.lineWidth = 27;
  ctx.beginPath();
  ctx.moveTo(...hp);
  ctx.lineTo(...kn);
  ctx.stroke();
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(...kn);
  ctx.lineTo(...at(kn, an, 0.8));
  ctx.stroke();
  ctx.strokeStyle = cloth;
  ctx.lineWidth = 23;
  ctx.beginPath();
  ctx.moveTo(...hp);
  ctx.lineTo(...kn);
  ctx.stroke();
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(...kn);
  ctx.lineTo(...at(kn, an, 0.8));
  ctx.stroke();
  if (!fl) {
    // camouflage blotches, a cargo pocket
    for (const [p, q, u, r, k] of [
      [hp, kn, 0.15, 5, 1],
      [hp, kn, 0.55, 4, 2],
      [hp, kn, 0.85, 4.5, 1],
      [kn, an, 0.3, 4, 2],
      [kn, an, 0.6, 3.5, 1],
    ]) {
      const [x, y] = at(p, q, u);
      ctx.fillStyle = CAMO[k];
      ctx.beginPath();
      ctx.ellipse(x + (k === 1 ? 2 : -2), y, r * 1.3, r, u * 3, 0, TAU);
      ctx.fill();
    }
    const [x, y] = at(hp, kn, 0.5),
      a = Math.atan2(kn[1] - hp[1], kn[0] - hp[0]);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 1.6;
    ctx.fillStyle = back ? '#46512c' : '#56633a';
    ctx.fillRect(-6, -2, 12, 10);
    ctx.strokeRect(-6, -2, 12, 10);
    ctx.restore();
  }
  // the boot, laced up the ankle
  const b = at(kn, an, 0.72);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.2;
  ctx.fillStyle = fl ? '#fff' : back ? '#17151a' : '#24212a';
  ctx.beginPath();
  ctx.moveTo(b[0] - 12, b[1]);
  ctx.lineTo(b[0] + 12, b[1]);
  ctx.lineTo(an[0] + 12, an[1] + 2);
  ctx.quadraticCurveTo(an[0] + 25, an[1] + 2, an[0] + 26, an[1] + 12);
  ctx.lineTo(an[0] - 11, an[1] + 12);
  ctx.lineTo(an[0] - 12, an[1] + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
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
    back(c) {
      // the back leg's trouser leg, the back arm's muscles
      const { e, o, fl, limb, TH, SH, UA, FA, sh } = c;
      trouser(limb([-3, 0], o.lB[0], o.lB[1], TH, SH), fl, true);
      brawn(limb([sh[0] - 3, sh[1]], o.aB[0], o.aB[1], UA, FA), fl, e.T.dk, true);
    },
    torso(c) {
      // a tight white T-shirt, pecs swelling under it, dog tags; a kettlebell on his shoulder
      const { e, o, fl, sh } = c;
      ctx.save();
      ctx.rotate(o.lean);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      shirt();
      ctx.fillStyle = fl ? '#fff' : '#f3f1ea';
      ctx.fill();
      ctx.save();
      ctx.clip();
      if (!fl) {
        // its shade on the back, a smudge or two of grave dirt
        ctx.fillStyle = '#cfcdc6';
        ctx.beginPath();
        ctx.ellipse(-20, -20, 9, 34, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(120,110,80,.35)';
        ctx.beginPath();
        ctx.ellipse(8, -4, 5, 3, 0.4, 0, TAU);
        ctx.ellipse(-8, -34, 3, 4, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      shirt();
      ctx.stroke();
      // the collar, the line under the pecs, the abs pressing through
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, -53);
      ctx.quadraticCurveTo(4, -46, 12, -54);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(40,36,30,.7)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(4, -30);
      ctx.quadraticCurveTo(20, -19, 36, -28);
      ctx.moveTo(10, -16);
      ctx.quadraticCurveTo(16, -13, 22, -16);
      ctx.moveTo(10, -6);
      ctx.quadraticCurveTo(16, -3, 21, -6);
      ctx.stroke();
      // the dog tags
      ctx.strokeStyle = fl ? '#fff' : '#8f939b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(4, -50);
      ctx.quadraticCurveTo(10, -40, 14, -38);
      ctx.quadraticCurveTo(15, -44, 12, -52);
      ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : '#c4c8cf';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(11, -39, 6, 9, 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (['chase', 'recover', 'hurt'].includes(e.state)) {
        // the kettlebell resting on his shoulder
        ctx.save();
        ctx.strokeStyle = OL;
        ctx.lineWidth = 2.4;
        ctx.translate(sh[0] - 8, sh[1] - 12);
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
        ctx.restore();
      }
    },
    legs(c) {
      // the front leg's trouser leg, the belt over the waist
      const { e, o, fl, limb, TH, SH } = c;
      trouser(limb([3, 0], o.lF[0], o.lF[1], TH, SH), fl);
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      ctx.fillStyle = fl ? '#fff' : CAMO[0];
      ctx.beginPath();
      ctx.moveTo(-18, -2);
      ctx.lineTo(21, -2);
      ctx.lineTo(23, 14);
      ctx.lineTo(-20, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : '#2c2a24';
      ctx.fillRect(-18, -2, 39, 6);
      ctx.strokeRect(-18, -2, 39, 6);
      ctx.fillStyle = fl ? '#fff' : '#b8a46a';
      ctx.fillRect(10, -3, 7, 8);
      ctx.strokeRect(10, -3, 7, 8);
      ctx.restore();
    },
    arm(c) {
      // the front arm's muscles and sleeve
      const { e, fl, L } = c;
      brawn(L, fl, e.T.col);
    },
    head(c) {
      // a flat-top crew cut, a thick moustache
      const { e, fl } = c;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.2;
      ctx.fillStyle = fl ? '#fff' : '#3b2f24';
      ctx.beginPath();
      ctx.moveTo(-14, -2);
      ctx.lineTo(-14, -15);
      ctx.lineTo(-10, -19);
      ctx.lineTo(10, -19);
      ctx.lineTo(13, -14);
      ctx.lineTo(13, -9);
      ctx.quadraticCurveTo(2, -12, -6, -8);
      ctx.lineTo(-8, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(5, 5.5);
      ctx.quadraticCurveTo(10, 3, 16, 4.5);
      ctx.lineTo(16.5, 9);
      ctx.quadraticCurveTo(10, 7.5, 5, 9);
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
