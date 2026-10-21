// The minotaur (TYPES.minotaur, MINO), Frostfang Pass's mini-boss, waiting at the pool under the
// falls: a huge bull-headed brute in a fur kilt, his great double-bitted axe in his fists.
//   - up close he brings the axe down (a heavy blow);
//   - from further off he chops the ground and a crack of bursting stone runs along her lane
//     (three side by side once he is enraged);
//   - from far off he flings the axe spinning along her lane; it sticks in the ground where it
//     stops, and he has to go and pull it out;
//   - every blow of hers loosens his grip (MINO.grip; a heavy blow more, a crushing one much
//     more): at last the axe flies out of his hands and lands somewhere about;
//   - without it he fights with his fists and charges horns first across the screen (hitting
//     the edge of it dazes him a moment), and makes for the axe whenever he can — a blow of hers
//     on the axe lying there sends it skidding away;
//   - at MINO.enrage of his health he goes red and quicker.
// His big moves go on through blows; only a crushing blow moves him (a heavy foe).
import { MINO, OL, TAU, TYPES, W } from '../config.js';
import { clamp, fxRandom, fxRnd, rnd } from '../util.js';
import { G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { dust, shatter, spark } from '../fx.js';
import { breakProp, finale, hitPlayer } from '../combat.js';
import { meetsPlayer } from '../height.js';
import { scoreMult } from '../style.js';
import { WALKS } from '../anim.js';
import { defineFoe } from './registry.js';
import { faceP, go, moveTo } from './kit.js';

const UNSTOPPABLE = [
  'mthroww',
  'mthrows',
  'mchopw',
  'mchop',
  'mchargew',
  'mcharge',
  'mpick',
  'mloss',
];
const onScreen = (e) => e.x > G.cam + 60 && e.x < G.cam + W - 60;
const cd = (e, r) => rnd(...r) * (e.rage ? MINO.rage.cd : 1);
/** Where on screen the axe may lie (it never leaves the arena). */
const keepIn = (x) => clamp(x, G.cam + 50, G.cam + W - 50);

/** His numbers now: with the axe or without it, enraged or not. */
function retune(e) {
  const T0 = TYPES.minotaur,
    k = e.rage ? MINO.rage.speed : 1,
    armed = e.axe;
  e.T = {
    ...T0,
    speed: T0.speed * k * (armed ? 1 : 1.25),
    reach: armed ? T0.reach : 110,
    wind: (armed ? T0.wind : 0.42) / k,
    rec: (armed ? T0.rec : 0.5) / k,
    cd: T0.cd.map((v) => v * (e.rage ? MINO.rage.cd : 1)),
    dmg: armed ? T0.dmg : MINO.fists.dmg,
  };
  e.tune = `${armed}${e.rage}`;
}
/** The axe leaves his hands: flung by a blow (`dir`), or thrown. */
function loseAxe(e, dir) {
  e.axe = false;
  const [x, z] = [e.x + e.face * 40, 150];
  e.ax = { st: 'fly', x, y: e.y + fxRnd(-30, 30), z, vx: dir * 300, vz: 520, rot: 0 };
  SFX.clang();
  SFX.roar();
  spark(x, e.y - z, '#fff2a8', true);
  G.shake = Math.max(G.shake, 8);
  go(e, 'mloss', 0, { engage: false });
  retune(e);
}
/** A burst of stone where the chop's crack runs: whoever stands on it is thrown. */
function burst(e, x, y) {
  (e.cracks ??= []).push({ x, y, t: G.time });
  dust(x, y, 5);
  for (let k = 0; k < 4; k++)
    G.debris.push({
      k: 'shard',
      x: x + fxRnd(-10, 10),
      gy: y + fxRnd(-4, 4),
      z: fxRnd(4, 20),
      vx: fxRnd(-90, 90),
      vz: fxRnd(240, 420),
      rot: fxRnd(TAU),
      vr: fxRnd(-12, 12),
      len: fxRnd(6, 11),
      col: '#8d8676',
      life: 1,
    });
  if (Math.abs(P.x - x) < MINO.chop.r && Math.abs(P.y - y) < 22 && P.z < 30)
    hitPlayer(MINO.chop.dmg, P.x >= e.x ? 1 : -1, true);
  for (const u of G.props)
    if (!u.dead && Math.abs(u.x - x) < 30 && Math.abs(u.y - y) < 20) breakProp(u);
}
/** The axe on its own: flying, thrown, lying stuck in the ground (kicked away by her). */
function axeTick(e, dt) {
  const a = e.ax;
  if (!a) return;
  if (a.st === 'fly') {
    // flung out of his hands (or kicked): an arc, spinning, down into the ground
    a.vz -= 1500 * dt;
    a.x = keepIn(a.x + a.vx * dt);
    a.z += a.vz * dt;
    a.rot += dt * 14 * Math.sign(a.vx || 1);
    if (a.z <= 0) {
      a.z = 0;
      a.st = 'lie';
      dust(a.x, a.y, 6);
      SFX.thud();
    }
  } else if (a.st === 'thrown') {
    // thrown along her lane: spinning on, low, until it has gone far enough or hits the edge
    a.x += a.vx * dt;
    a.rot += dt * 22 * Math.sign(a.vx);
    a.z = Math.max(0, a.z - 40 * dt);
    if (fxRandom() < 0.5) dust(a.x, a.y, 1);
    if (
      !a.hit &&
      Math.abs(P.x - a.x) < 44 &&
      Math.abs(P.y - a.y) < 26 &&
      meetsPlayer(a.z - 40, a.z + 40) &&
      hitPlayer(MINO.throw.dmg, Math.sign(a.vx), true)
    )
      a.hit = true;
    for (const u of G.props)
      if (!u.dead && Math.abs(u.x - a.x) < 30 && Math.abs(u.y - a.y) < 22)
        breakProp(u, Math.sign(a.vx));
    if ((a.x - a.stop) * Math.sign(a.vx) > 0 || a.x < G.cam + 40 || a.x > G.cam + W - 40) {
      a.x = keepIn(a.x);
      a.st = 'lie';
      a.z = 0;
      dust(a.x, a.y, 8);
      SFX.thud();
      G.shake = Math.max(G.shake, 5);
    }
  } else if (a.st === 'lie' && P.hit && a.kicked !== P.hit) {
    // a blow of hers on it sends it skidding away from him
    const swing = (P.state === 'atk1' || P.state === 'atk2') && P.sw,
      air = P.state === 'jump' && P.airT !== null && P.airT < 0.3;
    if (
      (swing || air) &&
      Math.abs(P.x + P.face * 60 - a.x) < 64 &&
      Math.abs(P.y - a.y) < 30 &&
      e.state !== 'mpick'
    ) {
      a.kicked = P.hit;
      Object.assign(a, { st: 'fly', vx: P.face * MINO.kick * 2, vz: 260 });
      SFX.clang();
      spark(a.x, a.y - 30, '#fff4d0', false);
    }
  }
}

export default defineFoe('minotaur', {
  walksIn: true,
  init: { chopCd: [2, 3.5], throwCd: [4, 6], chargeCd: [1, 2] },
  timers: ['chopCd', 'throwCd', 'chargeCd'],
  attacks: UNSTOPPABLE,
  unstoppable: (e) => UNSTOPPABLE.includes(e.state),
  guard: (e) => UNSTOPPABLE.includes(e.state),
  spawn(e) {
    e.axe = true;
    e.grip = MINO.grip;
    e.ax = null;
    retune(e);
  },
  // every blow loosens his grip on the axe
  onHit(e, dmg, dir, knock, src) {
    if (!e.axe || e.hp <= 0 || e.state === 'mpick') return false;
    const crush = ['hado', 'super', 'blast'].includes(src) && dmg > 30;
    e.grip -= dmg * (crush ? MINO.crush : knock ? MINO.heavy : 1);
    if (e.grip <= 0) loseAxe(e, dir);
    return false;
  },
  moves: [
    {
      // without the axe and nobody in his way: he goes to get it
      when: (e, s) => !e.axe && e.ax?.st === 'lie' && (s.pdown || s.adx > 130 || s.ady > 50),
      go: (e) => go(e, 'mfetch', 0, { engage: false }),
    },
    {
      // with it, from far off: he throws it
      when: (e, s) =>
        e.axe && e.throwCd <= 0 && !s.pdown && s.adx > MINO.throw.min && s.ady < 40 && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'mthroww', 0, { engage: false });
        SFX.roar();
      },
    },
    {
      // with it, a little way off: the chop and its crack along the ground
      when: (e, s) =>
        e.axe &&
        e.chopCd <= 0 &&
        !s.pdown &&
        s.adx > MINO.chop.min &&
        s.adx < MINO.chop.max &&
        s.ady < 50 &&
        onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'mchopw', 0, { engage: false, cy: P.y });
        SFX.spin();
      },
    },
    {
      // without it: head down, horns first
      when: (e, s) =>
        !e.axe &&
        e.chargeCd <= 0 &&
        !s.pdown &&
        s.adx > MINO.charge.min &&
        s.ady < 30 &&
        onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'mchargew', 0, { engage: false, rdir: e.face });
        SFX.roar();
      },
    },
  ],
  connect(e) {
    hitPlayer(e.T.dmg, e.face, true);
    G.shake = Math.max(G.shake, e.axe ? 9 : 5);
  },
  attackTick(e) {
    if (e.axe && e.t > 0.06 && !e.slamFx) {
      e.slamFx = true;
      dust(e.x + e.face * 130, e.y, 8);
      SFX.thud();
    }
  },
  on: { windup: (e) => (e.slamFx = false) },
  tick(e, dt) {
    if (!e.rage && e.hp <= e.T.hp * MINO.enrage) {
      e.rage = true;
      SFX.roar();
      G.flash = Math.max(G.flash, 0.3);
    }
    if (e.tune !== `${e.axe}${e.rage}`) retune(e);
    axeTick(e, dt);
    // steam from his nostrils
    if (fxRandom() < (e.rage ? 0.3 : 0.08))
      G.parts.push({
        k: 'smoke',
        x: e.x + e.face * 46 * e.T.scale,
        y: e.y - e.z - 150 * e.T.scale,
        vx: e.face * fxRnd(30, 60),
        vy: fxRnd(-30, -10),
        g: 0,
        t: 0,
        life: 0.5,
        s: fxRnd(4, 7),
      });
  },
  die(e) {
    P.score += Math.round(e.T.score * scoreMult());
    Object.assign(e, { dying: true, engage: false, state: 'mdie', t: 0, hp: 0, ax: null });
    SFX.roar();
    finale(e);
    G.items.push({ kind: 'hp', x: e.x, y: e.y, z: 60, vz: 260, t: 0 });
  },
  states: {
    mloss(e) {
      if (e.t > 0.7) go(e, 'chase', 0, { chargeCd: Math.min(e.chargeCd, 0.5) });
    },
    mfetch(e, dt) {
      const a = e.ax;
      if (!a || e.axe) return go(e, 'chase');
      if (a.st !== 'lie') return; // (it is still flying: he waits for it)
      e.face = a.x >= e.x ? 1 : -1;
      // he grips the haft from beside it, his hand on it
      const tx = a.x - e.face * 60;
      moveTo(e, tx, a.y, e.T.speed * 1.1, dt);
      if (Math.abs(tx - e.x) < 14 && Math.abs(a.y - e.y) < 12) go(e, 'mpick', 0, { engage: false });
      else if (Math.abs(P.x - e.x) < 110 && Math.abs(P.y - e.y) < 30 && e.cd <= 0) go(e, 'chase');
    },
    mpick(e) {
      const a = e.ax;
      if (!a || a.st !== 'lie') return go(e, 'mfetch');
      if (e.t > MINO.pick) {
        e.axe = true;
        e.ax = null;
        e.grip = MINO.grip;
        retune(e);
        SFX.roar();
        dust(e.x + e.face * 60, e.y, 8);
        go(e, 'recover', 0, { throwCd: Math.max(e.throwCd, 3) });
      }
    },
    mthroww(e) {
      faceP(e);
      if (e.t > MINO.throw.wind / (e.rage ? MINO.rage.speed : 1)) {
        e.axe = false;
        e.ax = {
          st: 'thrown',
          x: e.x + e.face * 70,
          y: P.y,
          z: 110,
          vx: e.face * MINO.throw.speed,
          rot: 0,
          stop: keepIn(P.x + e.face * 160),
          hit: false,
        };
        e.y += clamp(P.y - e.y, -30, 30);
        retune(e);
        SFX.swing();
        SFX.dash();
        go(e, 'mthrows', 0, { throwCd: cd(e, MINO.throw.cd) });
      }
    },
    mthrows(e) {
      if (e.t > 0.45) go(e, 'chase');
    },
    mchopw(e) {
      if (e.t > MINO.chop.wind / (e.rage ? MINO.rage.speed : 1)) {
        G.shake = Math.max(G.shake, 12);
        SFX.boom();
        go(e, 'mchop', 0, { n: 0, x0: e.x, y0: e.y });
      }
    },
    mchop(e) {
      const C = MINO.chop,
        k = Math.floor(e.t / 0.07);
      while (e.n <= k && e.n < C.n) {
        const x = e.x0 + e.face * (110 + e.n * C.step);
        for (const dy of e.rage ? [-40, 0, 40] : [0]) burst(e, x, e.y0 + dy);
        e.n++;
      }
      if (e.t > 0.07 * C.n + 0.45) go(e, 'chase', 0, { chopCd: cd(e, C.cd) });
    },
    mchargew(e) {
      e.face = e.rdir;
      if (fxRandom() < 0.4) dust(e.x - e.face * 30, e.y, 1);
      if (e.t > MINO.charge.wind / (e.rage ? MINO.rage.speed : 1)) {
        go(e, 'mcharge', 0, { x0: e.x, hitDone: false });
        SFX.dash();
      }
    },
    mcharge: {
      pin: true,
      tick(e, dt) {
        const C = MINO.charge;
        e.face = e.rdir;
        e.x += e.rdir * C.speed * (e.rage ? MINO.rage.speed : 1) * dt;
        e.moving = true;
        e.walkT += dt * 8;
        if (fxRandom() < 0.7) dust(e.x - e.rdir * 30, e.y, 1);
        if (
          !e.hitDone &&
          Math.abs(P.x - (e.x + e.rdir * 60)) < 60 &&
          Math.abs(P.y - e.y) < 30 &&
          P.z < 120 &&
          hitPlayer(C.dmg, e.rdir, true)
        ) {
          e.hitDone = true;
          G.shake = Math.max(G.shake, 10);
        }
        const edge = e.x < G.cam + 70 || e.x > G.cam + W - 70;
        if (edge) {
          // into the edge of the arena: he staggers, dazed
          G.shake = Math.max(G.shake, 14);
          SFX.boom();
          dust(e.x + e.rdir * 40, e.y, 12);
          go(e, 'mdaze', 0, { chargeCd: cd(e, C.cd) });
        } else if ((e.x - P.x) * e.rdir > 200 || Math.abs(e.x - e.x0) > 900)
          go(e, 'recover', 0, { chargeCd: cd(e, C.cd) });
      },
    },
    mdaze(e) {
      if (fxRandom() < 0.2)
        G.parts.push({
          k: 'star',
          x: e.x + fxRnd(-30, 30),
          y: e.y - fxRnd(270, 300),
          t: 0,
          life: 0.3,
          s: fxRnd(12, 18),
          col: '#ffe14a',
          rot: fxRnd(TAU),
        });
      if (e.t > 1.1) go(e, 'chase');
    },
    mdie(e) {
      if (e.t > MINO.dieT) {
        e.dead = true;
        shatter(e, e.face);
      }
    },
  },
  // his marks on the ground: the chop's crack, the charge's line; the axe stuck in the ground
  ground(e) {
    ctx.save();
    for (const c of e.cracks ?? []) {
      const a = 1 - (G.time - c.t) / 2.5;
      if (a <= 0) continue;
      ctx.strokeStyle = `rgba(40,30,20,${0.6 * a})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(c.x - G.cam - 30, c.y + 2);
      ctx.lineTo(c.x - G.cam - 8, c.y - 3);
      ctx.lineTo(c.x - G.cam + 10, c.y + 4);
      ctx.lineTo(c.x - G.cam + 34, c.y - 1);
      ctx.stroke();
    }
    if (e.cracks) e.cracks = e.cracks.filter((c) => G.time - c.t < 2.5);
    if (e.state === 'mchopw') {
      const k = clamp(e.t / MINO.chop.wind, 0, 1);
      ctx.strokeStyle = `rgba(255,120,40,${0.25 + 0.5 * k})`;
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      for (const dy of e.rage ? [-40, 0, 40] : [0]) {
        ctx.moveTo(e.x - G.cam + e.face * 100, e.y + dy);
        ctx.lineTo(e.x - G.cam + e.face * (110 + MINO.chop.n * MINO.chop.step), e.y + dy);
      }
      ctx.stroke();
    } else if (e.state === 'mchargew' || e.state === 'mthroww') {
      ctx.strokeStyle = 'rgba(255,90,60,.5)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(e.x - G.cam, e.state === 'mthroww' ? P.y : e.y);
      ctx.lineTo(e.x - G.cam + e.face * 640, e.state === 'mthroww' ? P.y : e.y);
      ctx.stroke();
    }
    ctx.restore();
    if (e.ax?.st === 'lie') drawAxe(e.ax.x - G.cam, e.ax.y, 0.9, false, true);
  },
  // the axe in flight, over everyone
  over(e) {
    const a = e.ax;
    if (!a || a.st === 'lie') return;
    ctx.save();
    ctx.translate(a.x - G.cam, a.y - a.z - 30);
    ctx.rotate(a.rot);
    drawAxe(0, 0, 0.9, false, false, true);
    ctx.restore();
  },
  look: {
    head: bullHead,
    torso: hideTorso,
    weapon(c) {
      if (!c.e.axe) return;
      const { h, wa, fl } = c;
      ctx.save();
      ctx.translate(h[0], h[1]);
      ctx.rotate(-wa);
      drawAxe(0, 0, 0.62, fl, false, false, true);
      ctx.restore();
    },
  },
  pose: {
    base: { set: { lean: 0.2, head: -0.1, lF: [0.34, 0.05], lB: [-0.42, -0.36] } },
    guard: {
      chase: [
        { if: (e) => e.axe, set: { aF: (e, k) => [0.55 + 0.04 * k.br, 2.1], aB: [0.6, 1.6] } },
        { set: { aF: (e, k) => [1.1 + 0.05 * k.br, 2.7], aB: [1.0, 2.6] } },
      ],
    },
    states: {
      mloss: { set: { aF: [2.6, 3.2], aB: [2.4, 3.0], lean: -0.3, head: -0.4, jaw: 6 } },
      mfetch: { set: { aF: [0.9, 1.4], aB: [0.6, 1.0], lean: 0.35 } },
      mpick: {
        set: { aF: [0.7, 0.3], aB: [0.6, 0.2], lean: 0.95, lF: [1.0, -0.6], lB: [-0.6, -1.3] },
      },
      mthroww: {
        set: { aF: [3.6, 4.0], aB: [2.8, 3.4], lean: -0.25, lF: [0.5, 0.1], lB: [-0.7, -0.9] },
      },
      mthrows: {
        set: { aF: [1.5, 1.4], aB: [0.6, 0.8], lean: 0.5, lF: [0.8, 0.2], lB: [-0.7, -1.2] },
      },
      mchopw: { set: { aF: [3.0, 3.3], aB: [2.8, 3.2], lean: -0.15, jaw: 5 } },
      mchop: {
        set: { aF: [1.2, 0.95], aB: [1.0, 0.8], lean: 0.6, lF: [0.9, -0.4], lB: [-0.8, -1.2] },
      },
      mchargew: {
        set: {
          lean: 0.75,
          head: 0.5,
          aF: [-0.4, 0.4],
          aB: [-0.6, 0.2],
          lF: [0.6, -0.2],
          lB: [-0.8, -1.2],
        },
        shake: { amp: 0.06, rate: 40, fields: ['lF'] },
      },
      mcharge: { set: { lean: 0.9, head: 0.6, aF: [-0.6, 0.2], aB: [-0.8, 0.1] } },
      mdaze: {
        set: { lean: -0.2, aF: [0.2, 0.6], aB: [0.1, 0.5], jaw: 5 },
        fn: (o, e) => (o.head = Math.sin(e.t * 9) * 0.4),
      },
      mdie: {
        tween: {
          dur: 1,
          from: { rot: 0, hipH: null, lean: 0.2 },
          to: { rot: -1.4, hipH: 16, lean: 0.4, aF: [2.6, 2.8], aB: [0.4, 0.3] },
        },
      },
    },
  },
});
WALKS.mfetch = [0.5, 0.35];
WALKS.mcharge = [0.9, 0.9];

/**
 * The great axe, drawn along +y from the grip at (x, y) (the haft hanging from the hand):
 * `k` its size; `lying`: stuck in the ground blade first, the haft standing up at a slant.
 */
function drawAxe(x, y, k, fl, lying = false, spin = false, held = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  // stuck in the ground: the blade half buried, the haft standing up at a slant
  if (lying) {
    ctx.translate(0, -112);
    ctx.rotate(0.35);
  }
  if (spin) ctx.translate(0, -60);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // the haft: from behind the grip to the head
  ctx.strokeStyle = OL;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(0, held ? -40 : -10);
  ctx.lineTo(0, 120);
  ctx.stroke();
  ctx.strokeStyle = fl ? '#fff' : '#6a4630';
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = fl ? '#fff' : '#3a2a1e';
  ctx.lineWidth = 7;
  for (const yy of [8, 30]) {
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(0, yy + 8);
    ctx.stroke();
  }
  // the two crescent blades
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 5, 92);
    ctx.quadraticCurveTo(s * 30, 76, s * 50, 70);
    ctx.quadraticCurveTo(s * 40, 104, s * 50, 138);
    ctx.quadraticCurveTo(s * 30, 130, s * 5, 116);
    ctx.closePath();
    ctx.fillStyle = fl ? '#fff' : '#b8c0cc';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = OL;
    ctx.stroke();
    ctx.strokeStyle = fl ? '#fff' : '#eef2f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s * 46, 76);
    ctx.quadraticCurveTo(s * 37, 104, s * 46, 132);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.rect(-8, 88, 16, 32);
  ctx.fillStyle = fl ? '#fff' : '#7d838e';
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = OL;
  ctx.stroke();
  ctx.restore();
}
/** The bull's head over the skull: horns, a broad muzzle, a ring through the nose. */
function bullHead(c) {
  const { e, fl, col, dk } = c;
  const f = (c2, lw = 2.4) => {
    ctx.fillStyle = fl ? '#fff' : c2;
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = OL;
    ctx.stroke();
  };
  // horns, sweeping out and up
  for (const [s, c2] of [
    [-1, '#d8ccb0'],
    [1, '#efe6cf'],
  ]) {
    ctx.beginPath();
    ctx.moveTo(-4 + s * 2, -10);
    ctx.quadraticCurveTo(-20 + s * 4, -20, -10 + s * 6, -44);
    ctx.quadraticCurveTo(-8 + s * 6, -26, 6 + s * 2, -14);
    ctx.closePath();
    f(c2, 2);
  }
  // ears
  ctx.beginPath();
  ctx.ellipse(-12, -4, 9, 5, -0.5, 0, TAU);
  f(dk, 2);
  // the head and the muzzle
  ctx.beginPath();
  ctx.ellipse(2, -2, 16, 15, 0, 0, TAU);
  f(col);
  ctx.beginPath();
  ctx.ellipse(16, 8, 12, 9, 0.15, 0, TAU);
  f('#b08a66');
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.ellipse(22, 7, 2.2, 1.6, 0, 0, TAU);
  ctx.fill();
  // the ring through the nose
  ctx.strokeStyle = '#ffcf3a';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(24, 13, 4, 0, TAU);
  ctx.stroke();
  // a mane between the horns
  ctx.beginPath();
  ctx.moveTo(-10, -12);
  ctx.lineTo(-4, -20);
  ctx.lineTo(0, -12);
  ctx.lineTo(4, -19);
  ctx.lineTo(8, -10);
  ctx.closePath();
  f('#3a2616', 1.8);
  // the eye, glowing (redder in his rage)
  ctx.fillStyle = e.rage ? '#ff2a1a' : e.T.eye;
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(8, -4, 3.4, 2.2, -0.2, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
}
/** A great hairy chest over the ribs, a belt with a skull, a fur kilt. */
function hideTorso(c) {
  const { e, fl, col, dk, neck, o } = c;
  const f = (c2, lw = 2.4) => {
    ctx.fillStyle = fl ? '#fff' : c2;
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = OL;
    ctx.stroke();
  };
  ctx.save();
  ctx.translate(neck[0] * 0.55, neck[1] * 0.55);
  ctx.rotate(o.lean);
  ctx.beginPath();
  ctx.ellipse(4, 0, 25, 32, 0, 0, TAU);
  f(e.rage ? '#8a3a26' : col);
  // the chest and belly, a darker line of hair
  ctx.strokeStyle = fl ? '#fff' : dk;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(4, -22);
  ctx.quadraticCurveTo(14, -10, 22, -16);
  ctx.moveTo(6, 2);
  ctx.quadraticCurveTo(14, 8, 22, 2);
  ctx.moveTo(10, 10);
  ctx.lineTo(10, 26);
  ctx.stroke();
  // a strap over the shoulder
  ctx.beginPath();
  ctx.moveTo(-16, -22);
  ctx.lineTo(-8, -26);
  ctx.lineTo(24, 18);
  ctx.lineTo(16, 22);
  ctx.closePath();
  f('#4a3424', 2);
  ctx.restore();
  // the belt and its skull buckle, the fur kilt
  ctx.beginPath();
  ctx.rect(-16, -6, 34, 9);
  f('#3a2a1e', 2);
  ctx.beginPath();
  ctx.arc(8, -2, 5, 0, TAU);
  f('#efe6cf', 1.6);
  ctx.beginPath();
  ctx.moveTo(-14, 3);
  for (let k = 0; k <= 6; k++) ctx.lineTo(-14 + k * 5.3, 3 + (k % 2 ? 26 : 20));
  ctx.lineTo(18, 3);
  ctx.closePath();
  f('#5a4030', 2);
}
