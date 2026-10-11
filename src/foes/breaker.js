// Jawacorp's breaker android (TYPES.breaker, BREAKER), the mini-boss of Neon Kyoto, waiting in
// the metro's concourse: a hunched black-and-orange robot with one enormous mechanical arm —
// pistons, vents glowing orange, a fist like a block of iron. It never stays still:
//   - up close it brings the fist down in front of it (a heavy blow);
//   - it leaps at her, landing where she stood (the spot is marked) in a ring of shock;
//   - it punches the ground and a fissure of eruptions runs along her lane (jump it, or step
//     out of the lane); in its second phase three fissures run side by side;
//   - it fires its fist like a rocket and charges straight through.
// At half health the arm glows white-hot and it gets faster. Its attacks go on through blows.
import { BREAKER, OL, TAU, W } from '../config.js';
import { clamp, fxRandom, fxRnd, rnd } from '../util.js';
import { APP, G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { breakProp, finale, hitPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';
import { plate, robotDie, robotLook, visorHelm } from './robot.js';

const A = { body: '#3b3d45', trim: '#b8650f', glow: '#ffb02e', w: 16, chest: 1.35 };
const B = BREAKER;
const UNSTOPPABLE = ['bcrouch', 'bleap', 'bland', 'bpound', 'bfis', 'brwind', 'brush'];
/** Its countdowns run faster in the second phase. */
const cd = (e, r) => rnd(...r) * (e.phase2 ? B.p2cd : 1);
const onScreen = (e) => e.x > G.cam + 40 && e.x < G.cam + W - 40;

/** A ring of shock on the ground at (x, y): whoever is on the ground inside it is thrown. */
function shock(e, x, y, r, dmg) {
  G.parts.push({ k: 'gring', x, y, t: 0, life: 0.45, s: r, col: '#ffb02e' });
  dust(x, y, 14);
  G.shake = Math.max(G.shake, 14);
  SFX.quake();
  if (((P.x - x) / r) ** 2 + ((P.y - y) / (r * 0.42)) ** 2 < 1 && P.z < 30)
    hitPlayer(dmg, P.x >= x ? 1 : -1, true);
  // the props it lands among are smashed
  for (const u of G.props)
    if (!u.dead && ((u.x - x) / r) ** 2 + ((u.y - y) / (r * 0.42)) ** 2 < 1) breakProp(u);
}
/** One eruption of a fissure: a burst of rock and orange light; it throws her if she is in it. */
function erupt(e, x, y) {
  for (let k = 0; k < 6; k++)
    G.parts.push({
      k: 'dot',
      x: x + fxRnd(-14, 14),
      y: y - fxRnd(0, 20),
      vx: fxRnd(-60, 60),
      vy: fxRnd(-420, -200),
      g: 900,
      t: 0,
      life: fxRnd(0.4, 0.7),
      s: fxRnd(3, 6),
      col: k % 2 ? '#ffb02e' : '#6a5a4a',
    });
  dust(x, y, 3);
  if (!e.fisHit && Math.abs(P.x - x) < B.fissure.w && Math.abs(P.y - y) < 24 && P.z < 40)
    if (hitPlayer(B.fissure.dmg, e.face, true)) e.fisHit = true;
}

export default defineFoe('breaker', {
  init: { leapCd: [1.5, 2.5], fisCd: [3, 4.5], rushCd: [4, 6] },
  timers: ['leapCd', 'fisCd', 'rushCd'],
  attacks: UNSTOPPABLE,
  unstoppable: (e) => UNSTOPPABLE.includes(e.state),
  // in its big moves nothing stops it; otherwise only crushing blows (a heavy foe)
  guard: (e) => UNSTOPPABLE.includes(e.state),
  moves: [
    {
      // further off: it leaps at her
      when: (e, s) => e.leapCd <= 0 && !s.pdown && s.adx > B.leap.min && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'bcrouch', 0, { engage: false, tx: P.x, ty: P.y });
      },
    },
    {
      // along her lane: the fissure
      when: (e, s) =>
        e.fisCd <= 0 && !s.pdown && s.adx > 160 && s.adx < 700 && s.ady < 50 && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'bpound', 0, { engage: false });
        SFX.spin();
      },
    },
    {
      // the rocket fist: it charges straight through
      when: (e, s) =>
        e.rushCd <= 0 && !s.pdown && s.adx > 220 && s.adx < 640 && s.ady < 30 && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'brwind', 0, { engage: false, rdir: e.face });
        SFX.hiss();
      },
    },
  ],
  // its plain blow: the fist comes down in front of it, in a little ring of shock
  strike(e) {
    const x = e.x + e.face * B.smash.at * e.T.scale;
    G.parts.push({ k: 'gring', x, y: e.y, t: 0, life: 0.35, s: B.smash.r, col: '#ffb02e' });
    dust(x, e.y, 8);
    G.shake = Math.max(G.shake, 9);
    SFX.thud();
  },
  die(e, dir) {
    robotDie(e, dir);
    finale(e);
    SFX.boom();
    G.items.push({ kind: 'hp', x: e.x, y: e.y, z: 60, vz: 260, t: 0 });
  },
  tick(e) {
    if (!e.phase2 && e.hp <= e.T.hp * B.phase2) {
      e.phase2 = true;
      SFX.nova();
      G.flash = Math.max(G.flash, 0.3);
    }
    e.speedK = e.phase2 ? B.p2speed : 1;
    // steam from the arm's vents
    if (fxRandom() < (e.phase2 ? 0.35 : 0.15))
      G.parts.push({
        k: 'smoke',
        x: e.x + e.face * fxRnd(20, 50),
        y: e.y - e.z - fxRnd(90, 130) * e.T.scale,
        vx: fxRnd(-20, 20),
        vy: fxRnd(-60, -30),
        g: 0,
        t: 0,
        life: 0.6,
        s: fxRnd(6, 10),
      });
  },
  states: {
    bcrouch(e) {
      // crouched to spring; the spot it will land on is marked under her
      if (e.t > B.leap.wind / e.speedK) {
        go(e, 'bleap', 0, { x0: e.x, y0: e.y });
        SFX.jump();
      }
    },
    bleap: {
      pin: true,
      tick(e) {
        const u = clamp(e.t / B.leap.air, 0, 1);
        e.x = e.x0 + (e.tx - e.x0) * u;
        e.y = e.y0 + (e.ty - e.y0) * u;
        e.z = 4 * B.leap.h * u * (1 - u);
        if (u >= 1) {
          e.z = 0;
          shock(e, e.x, e.y, B.leap.r, B.leap.dmg);
          go(e, 'bland', 0, { leapCd: cd(e, B.leap.cd) });
        }
      },
    },
    bland(e) {
      if (e.t > B.leap.rec / e.speedK) go(e, 'chase');
    },
    bpound(e) {
      // the arm high over its head, then down on the ground
      if (e.t > B.fissure.wind / e.speedK) {
        G.shake = Math.max(G.shake, 10);
        SFX.boom();
        go(e, 'bfis', 0, { fisN: 0, fisHit: false, fx0: e.x, fy0: e.y });
      }
    },
    bfis(e) {
      const F = B.fissure,
        n = Math.floor(e.t / F.gap);
      while (e.fisN <= n && e.fisN < F.n) {
        const x = e.fx0 + e.face * (70 + e.fisN * F.step);
        for (const dy of e.phase2 ? [-F.lanes, 0, F.lanes] : [0]) erupt(e, x, e.fy0 + dy);
        e.fisN++;
      }
      if (e.t > F.gap * F.n + 0.4) go(e, 'chase', 0, { fisCd: cd(e, F.cd) });
    },
    brwind(e) {
      e.face = e.rdir;
      if (e.t > B.rush.wind / e.speedK) {
        go(e, 'brush', 0, { hitDone: false, rx0: e.x });
        SFX.dash();
      }
    },
    brush: {
      pin: true,
      tick(e, dt) {
        e.face = e.rdir;
        e.x += e.rdir * B.rush.speed * e.speedK * dt;
        e.moving = true;
        if (fxRandom() < 0.8)
          G.parts.push({
            k: 'glow',
            x: e.x - e.rdir * fxRnd(20, 50),
            y: e.y - fxRnd(70, 110),
            vx: -e.rdir * 200,
            vy: fxRnd(-20, 20),
            g: 0,
            t: 0,
            life: 0.25,
            s: fxRnd(4, 7),
            col: '#ffb02e',
          });
        if (
          !e.hitDone &&
          Math.abs(P.x - e.x) < 70 &&
          Math.abs(P.y - e.y) < 30 &&
          P.z < 90 &&
          hitPlayer(B.rush.dmg, e.rdir, true)
        )
          e.hitDone = true;
        const past = (e.x - P.x) * e.rdir > 220,
          edge = e.x < G.cam + 40 || e.x > G.cam + W - 40;
        if (past || edge || Math.abs(e.x - e.rx0) > 900) {
          dust(e.x, e.y, 6);
          go(e, 'recover', 0, { rushCd: cd(e, B.rush.cd) });
        }
      },
    },
  },
  // its marks on the ground: where it will land, the fissure's path, the rush's line
  ground(e) {
    ctx.save();
    if (e.state === 'bcrouch' || e.state === 'bleap') {
      const r = B.leap.r,
        x = e.tx - G.cam,
        k = e.state === 'bleap' ? clamp(e.t / B.leap.air, 0, 1) : 0;
      ctx.strokeStyle = `rgba(255,176,46,${0.5 + 0.4 * k})`;
      ctx.fillStyle = `rgba(255,120,30,${0.1 + 0.2 * k})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, e.ty, r, r * 0.42, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    } else if (e.state === 'bpound') {
      const F = B.fissure,
        k = clamp(e.t / F.wind, 0, 1);
      ctx.strokeStyle = `rgba(255,176,46,${0.2 + 0.5 * k})`;
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      for (const dy of e.phase2 ? [-F.lanes, 0, F.lanes] : [0]) {
        ctx.moveTo(e.x - G.cam + e.face * 60, e.y + dy);
        ctx.lineTo(e.x - G.cam + e.face * (70 + F.n * F.step), e.y + dy);
      }
      ctx.stroke();
    } else if (e.state === 'brwind') {
      ctx.strokeStyle = 'rgba(255,176,46,.5)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(e.x - G.cam, e.y);
      ctx.lineTo(e.x - G.cam + e.rdir * 600, e.y);
      ctx.stroke();
    }
    ctx.restore();
  },
  look: { ...robotLook(A, (c) => visorHelm(c.fl, A), null), arm: bigArm },
  pose: {
    // hunched, the great arm hanging low and forward
    base: { set: { lean: 0.28, head: -0.25 } },
    guard: { chase: { set: { aF: (e, k) => [0.45 + 0.04 * k.br, 0.75], aB: [0.2, 0.9] } } },
    states: {
      bcrouch: { set: { lF: [1.0, -0.9], lB: [-0.9, -1.6], lean: 0.5, aF: [2.6, 2.9] } },
      bleap: { set: { lF: [0.9, -0.2], lB: [-0.4, -1.4], lean: 0.2, aF: [2.9, 3.1] } },
      bland: { set: { lF: [1.0, -0.6], lB: [-0.9, -1.4], lean: 0.6, aF: [1.0, 0.4] } },
      bpound: { set: { aF: [2.95, 3.2], aB: [2.4, 2.8], lean: -0.1 } },
      bfis: { set: { aF: [0.9, 0.3], lean: 0.65, lF: [0.9, -0.5], lB: [-0.8, -1.3] } },
      brwind: { set: { aF: [-0.6, -0.2], lean: 0.35, lF: [0.7, -0.4], lB: [-0.7, -1.2] } },
      brush: { set: { aF: [1.57, 1.57], aB: [-0.8, -0.5], lean: 0.55 } },
    },
  },
});

/** The great arm over the front arm's bones: a heavy shoulder, pistons, a fist of iron. */
function bigArm(c) {
  const { e, fl, L } = c;
  const [s, el, h] = L,
    hot = e.phase2 ? '#fff1c2' : A.glow;
  // the shoulder guard
  ctx.fillStyle = fl ? '#fff' : A.body;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(s[0], s[1], 20, 0, TAU);
  ctx.fill();
  ctx.stroke();
  plate(s, el, 26, A.body, fl);
  plate(el, h, 30, A.trim, fl);
  // pistons along the forearm, vents glowing
  const n = [h[1] - el[1], el[0] - h[0]],
    d = Math.hypot(...n) || 1;
  ctx.strokeStyle = fl ? '#fff' : '#9aa0aa';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(el[0] + (n[0] / d) * 12, el[1] + (n[1] / d) * 12);
  ctx.lineTo(h[0] + (n[0] / d) * 12, h[1] + (n[1] / d) * 12);
  ctx.stroke();
  if (!fl) {
    ctx.fillStyle = hot;
    if (!APP.lowFx) {
      ctx.shadowColor = A.glow;
      ctx.shadowBlur = 10;
    }
    for (let k = 1; k <= 3; k++) {
      const p = [el[0] + ((h[0] - el[0]) * k) / 4, el[1] + ((h[1] - el[1]) * k) / 4];
      ctx.fillRect(p[0] - 3, p[1] - 3, 6, 6);
    }
    ctx.shadowBlur = 0;
  }
  // the fist: a block of iron, studded knuckles
  const a = Math.atan2(h[1] - el[1], h[0] - el[0]);
  ctx.save();
  ctx.translate(h[0], h[1]);
  ctx.rotate(a);
  ctx.fillStyle = fl ? '#fff' : A.body;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.rect(-8, -22, 40, 44);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : hot;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.arc(32, -16 + k * 10.5, 4, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  // the rocket's flame behind the fist while it charges
  if (e.state === 'brush' && !fl) {
    ctx.fillStyle = 'rgba(255,200,90,.9)';
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.lineTo(-40 - Math.sin(G.time * 60) * 8, 0);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
