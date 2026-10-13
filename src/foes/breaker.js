// Jawacorp's breaker android (TYPES.breaker, BREAKER), the mini-boss of Midnight City, waiting in
// the metro's concourse: a black-and-orange robot built like a sumo wrestler — a round iron
// belly in an orange belt, a topknot on its helmet — with one enormous mechanical arm —
// pistons, vents glowing orange, a fist like a block of iron. It never stays still:
//   - up close it brings the fist down in front of it (a heavy blow);
//   - it leaps at her, landing where she stood (the spot is marked) in a ring of shock;
//   - it punches the ground and a fissure of eruptions runs along her lane (jump it, or step
//     out of the lane); in its second phase three fissures run side by side;
//   - it fires its fist like a rocket and charges straight through;
//   - close up, it hops back at once (towards the roomier side of the screen), sinks into a
//     sumo stance and drives its fist at her;
//   - in its second phase, close up, it leaps high out of sight and drops on her, a wide ring
//     of shock (its shadow follows her while it is up there).
// At half health the arm glows white-hot and it gets faster. Its attacks go on through blows.
import { BREAKER, OL, TAU, TYPES, W } from '../config.js';
import { clamp, fxRandom, fxRnd, rnd } from '../util.js';
import { APP, G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { breakProp, finale, hitPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';
import { plate, robotDie, robotLook, visorHelm } from './robot.js';
import { jawaLogo } from '../bg3.js';

const A = { body: '#3b3d45', trim: '#b8650f', glow: '#ffb02e', w: 16, chest: 1.35 };
const B = BREAKER;
const UNSTOPPABLE = [
  'bcrouch',
  'bleap',
  'bland',
  'bpound',
  'bfis',
  'brwind',
  'brush',
  'bhprep',
  'bhop',
  'bhrun',
  'bsprep',
  'bsup',
  'bsfall',
];
/** Its countdowns run faster in the second phase. */
const cd = (e, r) => rnd(...r) * (e.phase2 ? B.p2cd : B.p1cd);
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
/** One eruption of a fissure: the ground splits (a glowing crack stays a while), a pillar of
 *  molten light and rock bursts up, chunks fly; it throws her if she is in it. */
function erupt(e, x, y) {
  (e.cracks ??= []).push({ x, y, t: G.time, seed: e.fisN * 7 + Math.round(y) });
  for (let k = 0; k < 14; k++)
    G.parts.push({
      k: k % 3 ? 'dot' : 'glow',
      x: x + fxRnd(-18, 18),
      y: y - fxRnd(0, 30),
      vx: fxRnd(-80, 80),
      vy: fxRnd(-620, -260),
      g: 900,
      t: 0,
      life: fxRnd(0.45, 0.8),
      s: fxRnd(3, 7),
      col: k % 2 ? '#ffb02e' : k % 3 ? '#ffe7a0' : '#6a5a4a',
    });
  for (let k = 0; k < 3; k++)
    G.debris.push({
      k: 'shard',
      x: x + fxRnd(-12, 12),
      gy: y + fxRnd(-4, 4),
      z: fxRnd(10, 30),
      vx: fxRnd(-140, 140),
      vz: fxRnd(260, 460),
      rot: fxRnd(TAU),
      vr: fxRnd(-10, 10),
      len: fxRnd(8, 16),
      col: k % 2 ? '#5a4a3c' : '#7a6a58',
      life: 1.4,
    });
  G.parts.push({ k: 'gring', x, y, t: 0, life: 0.3, s: B.fissure.w * 1.6, col: '#ffb02e' });
  dust(x, y, 6);
  G.shake = Math.max(G.shake, 5);
  if (!e.fisHit && Math.abs(P.x - x) < B.fissure.w && Math.abs(P.y - y) < 24 && P.z < 40)
    if (hitPlayer(B.fissure.dmg, e.face, true)) e.fisHit = true;
}

/** Where it hops to for the hop-back punch: away from her if there is room behind it, else
 *  over her to the other side; never off the screen. */
function hopTarget(e) {
  const H = B.hop,
    away = e.x >= P.x ? 1 : -1,
    room = (d) => (d > 0 ? G.cam + W - 60 - e.x : e.x - (G.cam + 60)),
    dir = room(away) >= H.room ? away : -away;
  return clamp(e.x + dir * H.dist, G.cam + 60, G.cam + W - 60);
}

export default defineFoe('breaker', {
  init: { leapCd: [1.5, 2.5], fisCd: [3, 4.5], rushCd: [4, 6], hopCd: [1, 2.5], slamCd: [0, 1] },
  timers: ['leapCd', 'fisCd', 'rushCd', 'hopCd', 'slamCd'],
  attacks: UNSTOPPABLE,
  unstoppable: (e) => UNSTOPPABLE.includes(e.state),
  // in its big moves nothing stops it; otherwise only crushing blows (a heavy foe)
  guard: (e) => UNSTOPPABLE.includes(e.state),
  // high up in the sky slam it is out of reach
  immune: (e) => e.state === 'bsup' || (e.state === 'bsfall' && e.z > 200),
  moves: [
    {
      // the second phase, close up: the sky slam
      when: (e, s) =>
        e.phase2 && e.slamCd <= 0 && !s.pdown && s.adx < B.slam.near && s.ady < 90 && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'bsprep', 0, { engage: false });
        SFX.spin();
      },
    },
    {
      // close up: a hop back at once, the sumo stance, and the fist
      when: (e, s) => e.hopCd <= 0 && !s.pdown && s.adx < B.hop.near && s.ady < 60 && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'bhop', 0, { engage: false, x0: e.x, hx: hopTarget(e) });
        SFX.jump();
      },
    },
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
    e.speedK = e.phase2 ? B.p2speed : B.p1speed;
    // its plain blow keeps the same pace as its moves
    if (e.T.speedK !== e.speedK)
      e.T = {
        ...e.T,
        speedK: e.speedK,
        wind: TYPES.breaker.wind / e.speedK,
        act: TYPES.breaker.act / e.speedK,
        rec: TYPES.breaker.rec / e.speedK,
        // (a tenth longer between blows in the first phase, as between its moves)
        cd: TYPES.breaker.cd.map((v) => v * (e.phase2 ? 1 : B.p1cd)),
      };
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
      if (e.t > (e.recT ?? B.leap.rec) / e.speedK) go(e, 'chase', 0, { recT: undefined });
    },
    // the hop-back punch: after the hop, the stance...
    bhprep(e) {
      faceP(e);
      if (fxRandom() < 0.6) {
        const s = e.T.scale;
        G.parts.push({
          k: 'glow',
          x: e.x - e.face * fxRnd(30, 60) * s,
          y: e.y - fxRnd(60, 110) * s,
          vx: fxRnd(-30, 30),
          vy: fxRnd(-60, -20),
          g: 0,
          t: 0,
          life: 0.3,
          s: fxRnd(4, 7),
          col: e.phase2 ? '#fff1c2' : '#ffb02e',
        });
      }
      if (e.t > B.hop.wind / e.speedK) {
        go(e, 'bhrun', 0, { rdir: e.face, hitDone: false, rx0: e.x });
        SFX.dash();
      }
    },
    // the hop back (first)
    bhop: {
      pin: true,
      tick(e) {
        const u = clamp(e.t / B.hop.air, 0, 1);
        e.x = e.x0 + (e.hx - e.x0) * u;
        e.z = 4 * B.hop.h * u * (1 - u);
        if (u >= 1) {
          e.z = 0;
          dust(e.x, e.y, 8);
          SFX.thud();
          faceP(e);
          go(e, 'bhprep', 0);
          SFX.stance();
        }
      },
    },
    // ...and the fist, driven at her
    bhrun: {
      pin: true,
      tick(e, dt) {
        e.face = e.rdir;
        e.x += e.rdir * B.hop.speed * e.speedK * dt;
        e.y += clamp(P.y - e.y, -1, 1) * 60 * dt;
        e.moving = true;
        if (fxRandom() < 0.8)
          G.parts.push({
            k: 'glow',
            x: e.x - e.rdir * fxRnd(10, 40),
            y: e.y - fxRnd(80, 120),
            vx: -e.rdir * 260,
            vy: fxRnd(-20, 20),
            g: 0,
            t: 0,
            life: 0.2,
            s: fxRnd(4, 7),
            col: '#ffb02e',
          });
        if (
          !e.hitDone &&
          Math.abs(P.x - (e.x + e.rdir * 60)) < 70 &&
          Math.abs(P.y - e.y) < 34 &&
          P.z < 100 &&
          hitPlayer(B.hop.dmg, e.rdir, true)
        ) {
          e.hitDone = true;
          G.shake = Math.max(G.shake, 10);
        }
        const past = (e.x - P.x) * e.rdir > 140,
          edge = e.x < G.cam + 40 || e.x > G.cam + W - 40;
        if (past || edge || Math.abs(e.x - e.rx0) > 800) {
          dust(e.x, e.y, 6);
          go(e, 'recover', 0, { hopCd: cd(e, B.hop.cd) });
        }
      },
    },
    // the sky slam: crouched...
    bsprep(e) {
      faceP(e);
      if (e.t > B.slam.wind / e.speedK) {
        go(e, 'bsup', 0, { y0: e.z });
        SFX.jump();
        dust(e.x, e.y, 12);
        G.shake = Math.max(G.shake, 6);
      }
    },
    // ...up out of sight, hanging over her (its shadow on her)...
    bsup: {
      pin: true,
      tick(e, dt) {
        const S = B.slam;
        if (e.t < S.up) e.z = S.h * Math.sin(((e.t / S.up) * Math.PI) / 2);
        else {
          e.z = S.h;
          const k = Math.min(1, dt * 6);
          e.x += (clamp(P.x, G.cam + 80, G.cam + W - 80) - e.x) * k;
          e.y += (P.y - e.y) * k;
        }
        if (e.t > S.up + S.track) go(e, 'bsfall');
      },
    },
    // ...and down
    bsfall: {
      pin: true,
      tick(e) {
        const S = B.slam,
          u = clamp(e.t / S.fall, 0, 1);
        e.z = S.h * (1 - u * u);
        if (u >= 1) {
          e.z = 0;
          shock(e, e.x, e.y, S.r, S.dmg);
          G.shake = Math.max(G.shake, 22);
          SFX.boom();
          go(e, 'bland', 0, { slamCd: cd(e, S.cd), recT: S.rec });
        }
      },
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
    drawCracks(e);
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
    } else if (e.state === 'bsup' || e.state === 'bsfall') {
      // where it will come down: a wide ring, closing as it falls
      const r = B.slam.r,
        k = e.state === 'bsfall' ? 1 : clamp((e.t - B.slam.up) / B.slam.track, 0, 1),
        x = e.x - G.cam;
      ctx.strokeStyle = `rgba(255,96,40,${0.5 + 0.4 * k})`;
      ctx.fillStyle = `rgba(255,90,30,${0.1 + 0.2 * k})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x, e.y, r, r * 0.42, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, e.y, r * (1 - 0.7 * k), r * 0.42 * (1 - 0.7 * k), 0, 0, TAU);
      ctx.stroke();
    } else if (e.state === 'bhprep') {
      // the line its fist will take
      ctx.strokeStyle = `rgba(255,176,46,${0.2 + 0.4 * clamp(e.t / B.hop.wind, 0, 1)})`;
      ctx.lineWidth = 5;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(e.x - G.cam - 160, e.y);
      ctx.lineTo(e.x - G.cam + 160, e.y);
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
  look: { ...robotLook(A, sumoHead, null), torso: sumoBody, arm: bigArm },
  pose: {
    // hunched, legs apart under its belly, the great arm hanging low and forward
    base: { set: { lean: 0.22, head: -0.2, lF: [0.42, 0.1], lB: [-0.48, -0.36] } },
    guard: { chase: { set: { aF: (e, k) => [0.45 + 0.04 * k.br, 0.75], aB: [0.2, 0.9] } } },
    states: {
      bcrouch: { set: { lF: [1.0, -0.9], lB: [-0.9, -1.6], lean: 0.5, aF: [2.6, 2.9] } },
      bleap: { set: { lF: [0.9, -0.2], lB: [-0.4, -1.4], lean: 0.2, aF: [2.9, 3.1] } },
      bland: { set: { lF: [1.0, -0.6], lB: [-0.9, -1.4], lean: 0.6, aF: [1.0, 0.4] } },
      bpound: { set: { aF: [2.95, 3.2], aB: [2.4, 2.8], lean: -0.1 } },
      bfis: { set: { aF: [0.9, 0.3], lean: 0.65, lF: [0.9, -0.5], lB: [-0.8, -1.3] } },
      brwind: { set: { aF: [-0.6, -0.2], lean: 0.35, lF: [0.7, -0.4], lB: [-0.7, -1.2] } },
      brush: { set: { aF: [1.57, 1.57], aB: [-0.8, -0.5], lean: 0.55 } },
      // the sumo stance: a deep squat, legs wide, the fist drawn back, the other hand out
      bhprep: {
        set: { lF: [1.15, 0.05], lB: [-1.15, -0.05], aB: [1.3, 1.7], lean: 0.32, head: 0 },
        tween: { dur: 0.2, from: { aF: [-1.0, -0.3] }, to: { aF: [-1.1, -0.3] } },
        shake: { after: 0.2, amp: 0.05, rate: 60, fields: ['aF'] },
      },
      bhop: {
        set: { lF: [0.8, -0.5], lB: [-0.3, -1.3], aF: [-1.0, -0.3], aB: [1.0, 1.4], lean: 0 },
      },
      bhrun: {
        set: { aF: [1.57, 1.57], aB: [-0.9, -0.6], lean: 0.6, lF: [1.0, 0.3], lB: [-0.9, -1.3] },
      },
      bsprep: {
        set: { lF: [1.1, -0.8], lB: [-1.0, -1.6], lean: 0.5, aF: [2.6, 2.9], aB: [2.4, 2.8] },
      },
      bsup: {
        set: { lF: [0.3, -0.5], lB: [-0.2, -0.8], aF: [3.0, 3.1], aB: [2.8, 3.0], lean: -0.1 },
      },
      bsfall: {
        set: { lF: [0.5, -0.1], lB: [-0.5, -0.4], aF: [2.3, 2.0], aB: [2.1, 1.9], lean: 0.15 },
      },
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

/** Its body, a sumo wrestler's: a broad chest plate over a fat iron ball of a belly at the
 *  base of the body, round its hips, the belt (mawashi) of orange and black under it with its
 *  tassels hanging in front, the core glowing for a navel. In the hip frame. */
function sumoBody(c) {
  const { o, fl, e } = c;
  const hot = e.phase2 ? '#fff1c2' : A.glow;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.6;
  // the chest, leaning with the spine
  ctx.save();
  ctx.rotate(o.lean);
  ctx.fillStyle = fl ? '#fff' : A.body;
  ctx.beginPath();
  ctx.moveTo(-22, -60);
  ctx.quadraticCurveTo(6, -68, 30, -58);
  ctx.lineTo(34, -26);
  ctx.lineTo(-24, -26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!fl) {
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, -58);
    ctx.quadraticCurveTo(6, -63, 24, -56);
    ctx.stroke();
    jawaLogo(4, -44, 8);
  }
  ctx.restore();
  // the belly: a fat ball round its hips
  const bx = 12 + Math.sin(o.lean) * 14,
    by = -8;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.6;
  ctx.fillStyle = fl ? '#fff' : A.body;
  ctx.beginPath();
  ctx.ellipse(bx, by, 46, 40, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (!fl) {
    // its plates, rivets, a sheen
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(bx, by, 32, 40, 0, -1.25, 1.25);
    ctx.stroke();
    ctx.fillStyle = '#9aa0aa';
    for (const [x, y] of [
      [-30, -26],
      [-34, 2],
      [40, -26],
      [44, 2],
    ]) {
      ctx.beginPath();
      ctx.arc(bx - 6 + x, by + y, 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(bx, by, 36, -2.7, -1.7);
    ctx.stroke();
    // the core, its navel
    ctx.fillStyle = hot;
    if (!APP.lowFx) {
      ctx.shadowColor = A.glow;
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.arc(bx + 26, by - 4, 7, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  // the belt round the bottom of the ball, the tassels in front
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillStyle = fl ? '#fff' : A.trim;
  ctx.beginPath();
  ctx.moveTo(bx - 42, by + 14);
  ctx.quadraticCurveTo(bx, by + 26, bx + 44, by + 14);
  ctx.lineTo(bx + 36, by + 32);
  ctx.quadraticCurveTo(bx, by + 44, bx - 34, by + 32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!fl) {
    ctx.strokeStyle = '#1c1a1e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx - 38, by + 22);
    ctx.quadraticCurveTo(bx, by + 34, bx + 40, by + 22);
    ctx.stroke();
  }
  ctx.strokeStyle = fl ? '#fff' : '#1c1a1e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const x = bx + 10 + k * 6,
      sw = Math.sin(e.anim * 5 + k) * 2;
    ctx.moveTo(x, by + 36);
    ctx.lineTo(x + sw, by + 56);
  }
  ctx.stroke();
}
/** Its helmet, with a sumo's topknot of steel on top. */
function sumoHead(c) {
  const { fl } = c;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.2;
  ctx.fillStyle = fl ? '#fff' : '#1c1a1e';
  ctx.beginPath();
  ctx.ellipse(-4, -19, 6, 5, -0.3, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(2, -24, 11, 5, 0.15, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : A.trim;
  ctx.fillRect(-7, -22, 6, 5);
  visorHelm(fl, A);
}

/** The cracks its fissures leave in the ground: jagged, glowing orange, fading out. */
function drawCracks(e) {
  if (!e.cracks?.length) return;
  e.cracks = e.cracks.filter((c) => G.time - c.t < B.fissure.crack);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const c of e.cracks) {
    const a = 1 - (G.time - c.t) / B.fissure.crack,
      x = c.x - G.cam,
      w = B.fissure.step * 0.62;
    let r = c.seed;
    const j = () => ((r = (r * 9301 + 49297) % 233280) / 233280 - 0.5) * 8;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x - w, c.y + j());
      for (let k = -2; k <= 2; k++) ctx.lineTo(x + (k * w) / 2.5, c.y + j());
      ctx.lineTo(x + w, c.y + j());
    };
    ctx.strokeStyle = `rgba(30,18,10,${0.8 * a})`;
    ctx.lineWidth = 9;
    r = c.seed;
    path();
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,${150 + 60 * a},46,${a})`;
    ctx.lineWidth = 3.5;
    r = c.seed;
    path();
    ctx.stroke();
  }
  ctx.restore();
}
