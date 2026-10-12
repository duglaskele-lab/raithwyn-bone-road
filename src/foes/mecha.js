// Jawacorp's mech samurai (TYPES.mecha, MECHA), the last boss of Midnight City, in the garden on
// top of the tower: a giant war machine in samurai armour of black lacquer and red lacing — a
// horned helmet with a golden crest, a snarling face mask with burning eyes, great shoulder
// plates, an armoured skirt — and a katana of red plasma. It drops from the sky.
//   Phase 1: wide cuts of the katana that reach across the road's depth; the iai — it sinks
//     into a stance, a red line glows the length of the screen along her lane, and it is
//     across in a flash, cutting through whoever is on the line; a counter stance — a blow
//     from the front rings off the blade and it cuts back at once.
//   Phase 2 (half health): its shoulder plates fall away and missile pods open: a salvo of
//     missiles comes down on red marks round her; and it leaps onto her, landing in a ring
//     of shock.
//   Phase 3 (a quarter): it overheats — its chest opens, the core glows white (blows do
//     double harm there) — and it strikes three to five iai cuts in a row, a breath between.
// Two drones fly with it, part of it (they cannot be hit): now and then they sweep their beams
// along her lane and the one beside it from opposite sides, or fly to the screen's two edges
// and stretch a laser tripwire across her lane (twice, from the second phase).
// It never flinches. Beaten, it sinks to one knee, its core dims, and it bursts.
import { MECHA, OL, TAU, W } from '../config.js';
import { clamp, fxRandom, fxRnd, random, rnd } from '../util.js';
import { APP, G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { dust, spark } from '../fx.js';
import { finale, hitPlayer } from '../combat.js';
import { explode } from '../blast.js';
import { scoreMult } from '../style.js';
import { defineFoe } from './registry.js';
import { faceP, go, inFront } from './kit.js';
import { plate, robotLook } from './robot.js';

const A = { body: '#2a2d36', trim: '#a8242c', glow: '#ff3b5c', w: 18, chest: 1.4 };
const M = MECHA;
const BIG = [
  'mkwind',
  'mkarc',
  'mkiaiw',
  'mkiai',
  'mkrec',
  'mkguard',
  'mkcounter',
  'mkpurge',
  'mkvent',
];
const MOVES = [...BIG, 'mkmis', 'mkcrouch', 'mkleap', 'mkland', 'mkdrop'];
const onScreen = (e) => e.x > G.cam + 60 && e.x < G.cam + W - 60;
/** Its countdowns run quicker the further it is into the fight. */
const cd = (e, r) => rnd(...r) * (e.p3 ? 0.6 : e.p2 ? 0.8 : 1);

/** A ring of shock where it lands: whoever is on the ground inside it is thrown. */
function shock(e, r) {
  G.parts.push({ k: 'gring', x: e.x, y: e.y, t: 0, life: 0.5, s: r, col: '#ff3b5c' });
  dust(e.x, e.y, 18);
  G.shake = Math.max(G.shake, 16);
  SFX.quake();
  if (((P.x - e.x) / r) ** 2 + ((P.y - e.y) / (r * 0.42)) ** 2 < 1 && P.z < 30)
    hitPlayer(M.leap.dmg, P.x >= e.x ? 1 : -1, true);
}
/** The iai: off it goes along the line, `n` more to come after this one. */
function iai(e, n) {
  faceP(e);
  go(e, 'mkiaiw', 0, { engage: false, idir: e.face, iaiLeft: n });
  SFX.stance();
}

export default defineFoe('mecha', {
  init: { iaiCd: [2.5, 4], guardCd: [3, 5], misCd: [2, 3], leapCd: [3, 5], droneCd: [3, 5] },
  timers: ['iaiCd', 'guardCd', 'misCd', 'leapCd', 'droneCd'],
  attacks: MOVES,
  unstoppable: (e) => MOVES.includes(e.state) && e.state !== 'mkguard',
  // it never flinches, never is thrown
  guard: () => true,
  // the core, open in its last phase, takes double harm
  soak: (e) => (e.p3 ? M.core : 1),
  spawn(e, side, placed) {
    if (placed) return;
    // it drops from the sky into the garden
    Object.assign(e, { state: 'mkdrop', z: 700, vz: -300, x: G.cam + W * 0.7 });
  },
  moves: [
    {
      // its drones attack (it fights on meanwhile)
      when: (e, s) => e.droneCd <= 0 && (e.dm ?? 'home') === 'home' && !s.pdown && onScreen(e),
      go: (e) => droneAttack(e, random() < 0.5 ? 'sweep' : 'trip'),
    },
    {
      // overheated: a run of iai cuts
      when: (e, s) => e.p3 && e.iaiCd <= 0 && !s.pdown && onScreen(e),
      go: (e) => iai(e, 2 + Math.floor(random() * 3)),
    },
    {
      // close and facing her: now and then the counter stance
      when: (e, s, dt) => e.guardCd <= 0 && !s.pdown && s.adx < 260 && random() < dt * 0.9,
      go(e) {
        faceP(e);
        go(e, 'mkguard', 0, { engage: false, guardCd: cd(e, M.guard.cd) });
        SFX.stance();
      },
    },
    {
      // further off, along her lane: the iai
      when: (e, s) => e.iaiCd <= 0 && !s.pdown && s.adx > 240 && s.ady < 60 && onScreen(e),
      go: (e) => iai(e, 0),
    },
    {
      // the missiles (from the second phase)
      when: (e, s) => e.p2 && e.misCd <= 0 && !s.pdown,
      go(e) {
        faceP(e);
        // the marks: one under her, the others round her
        const marks = [];
        for (let k = 0; k < M.mis.n; k++) {
          const a = (k / M.mis.n) * TAU + random(),
            d = k ? rnd(70, 190) : 0;
          marks.push({
            x: P.x + Math.cos(a) * d,
            y: P.y + Math.sin(a) * d * 0.35,
            t: -k * M.mis.gap,
          });
        }
        go(e, 'mkmis', 0, { engage: false, marks, misCd: cd(e, M.mis.cd) });
        SFX.spin();
      },
    },
    {
      // the leap (from the second phase)
      when: (e, s) => e.p2 && e.leapCd <= 0 && !s.pdown && s.adx > 280 && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'mkcrouch', 0, { engage: false, tx: P.x, ty: P.y });
      },
    },
    {
      // in reach: the wide cut
      when: (e, s) => e.cd <= 0 && !s.pdown && s.adx < e.T.reach + 30 && s.ady < 70,
      go(e) {
        faceP(e);
        go(e, 'mkwind', 0, { engage: false, hitDone: false });
      },
    },
  ],
  // in the counter stance a blow from the front rings off the blade, and it cuts back
  block(e, dir) {
    if (e.state !== 'mkguard' || dir !== -e.face) return false;
    SFX.clang();
    spark(e.x + e.face * 80, e.y - 200, '#ffd0d8', true);
    go(e, 'mkcounter', 0, { hitDone: false });
    return true;
  },
  die(e) {
    P.score += Math.round(e.T.score * scoreMult());
    Object.assign(e, { dying: true, engage: false, state: 'mkdie', t: 0, hp: 0, marks: [] });
    finale(e);
    SFX.boom();
  },
  tick(e, dt) {
    droneTick(e, dt);
    if (!e.p2 && e.hp <= e.T.hp * M.p2 && !e.dying) {
      e.p2 = true;
      go(e, 'mkpurge', 0, { engage: false });
      // the shoulder plates fall away
      for (const s of [-1, 1])
        G.debris.push({
          k: 'shard',
          x: e.x + s * 40,
          gy: e.y,
          z: 260,
          vx: s * 180,
          vz: 300,
          rot: 0,
          vr: s * 6,
          len: 40,
          col: A.body,
          life: 3,
        });
      SFX.clang();
      G.flash = Math.max(G.flash, 0.3);
    }
    if (!e.p3 && e.hp <= e.T.hp * M.p3 && !e.dying) {
      e.p3 = true;
      go(e, 'mkvent', 0, { engage: false, iaiCd: 0.6 });
      SFX.nova();
      G.flash = Math.max(G.flash, 0.4);
    }
    // the missiles in flight come down on their marks
    for (const m of e.marks ?? []) {
      m.t += dt;
      if (m.t >= M.mis.fall && !m.done) {
        m.done = true;
        explode(m.x, m.y, 'missile');
      }
    }
    if (e.marks?.length && e.marks.every((m) => m.done)) e.marks = [];
    // overheated: steam from the open chest
    if (e.p3 && fxRandom() < 0.5)
      G.parts.push({
        k: 'smoke',
        x: e.x + fxRnd(-30, 30),
        y: e.y - e.z - fxRnd(150, 220),
        vx: fxRnd(-30, 30),
        vy: fxRnd(-90, -40),
        g: 0,
        t: 0,
        life: 0.7,
        s: fxRnd(10, 18),
      });
  },
  states: {
    mkdrop(e, dt) {
      e.vz -= 2000 * dt;
      e.z += e.vz * dt;
      if (e.z <= 0) {
        e.z = 0;
        shock(e, M.leap.r);
        go(e, 'mkrec', -0.4);
      }
    },
    mkwind(e) {
      if (e.t > M.arc.wind) {
        go(e, 'mkarc', 0, { hitDone: false });
        SFX.swing();
      }
    },
    mkarc(e) {
      // the cut sweeps across the road's depth in front of it
      if (!e.hitDone && inFront(e, 20, M.arc.reach, M.arc.dy, 160)) {
        e.hitDone = true;
        hitPlayer(M.arc.dmg, e.face, true);
      }
      if (e.t > 0.18) go(e, 'mkrec', 0, { cd: rnd(...e.T.cd) });
    },
    mkiaiw(e) {
      // sunk in its stance; the line glows
      e.face = e.idir;
      if (e.t > (e.iaiLeft || e.p3 ? M.iai.wind3 : M.iai.wind)) {
        go(e, 'mkiai', 0, { hitDone: false, ix0: e.x });
        SFX.dash();
      }
    },
    mkiai: {
      pin: true,
      tick(e, dt) {
        e.face = e.idir;
        e.x += e.idir * M.iai.speed * dt;
        if (
          !e.hitDone &&
          Math.abs(P.x - e.x) < 80 &&
          Math.abs(P.y - e.y) < M.iai.dy &&
          P.z < 120 &&
          hitPlayer(M.iai.dmg, e.idir, true)
        )
          e.hitDone = true;
        if (fxRandom() < 0.9)
          G.parts.push({
            k: 'glow',
            x: e.x - e.idir * fxRnd(20, 120),
            y: e.y - fxRnd(40, 260),
            vx: -e.idir * 80,
            vy: 0,
            g: 0,
            t: 0,
            life: fxRnd(0.15, 0.3),
            s: fxRnd(4, 8),
            col: A.glow,
          });
        const edge = e.idir > 0 ? e.x > G.cam + W - 90 : e.x < G.cam + 90;
        if (edge) {
          G.shake = Math.max(G.shake, 6);
          if (e.iaiLeft > 0) {
            // turn and go again, after a breath
            e.idir = -e.idir;
            go(e, 'mkiaiw', -M.iai.breath, { iaiLeft: e.iaiLeft - 1 });
          } else go(e, 'mkrec', 0, { iaiCd: cd(e, M.iai.cd) });
        }
      },
    },
    mkrec(e) {
      if (e.t > M.rec) go(e, 'chase');
    },
    mkguard(e) {
      faceP(e);
      if (e.t > M.guard.t) go(e, 'chase');
    },
    mkcounter(e) {
      if (e.t > M.guard.cut && !e.hitDone) {
        e.hitDone = true;
        SFX.swing();
        if (inFront(e, 20, M.arc.reach, M.arc.dy, 160)) hitPlayer(M.guard.dmg, e.face, true);
      }
      if (e.t > M.guard.cut + 0.3) go(e, 'mkrec');
    },
    mkmis(e) {
      if (e.t > M.mis.wind + M.mis.n * M.mis.gap) go(e, 'chase');
    },
    mkcrouch(e) {
      if (e.t > M.leap.wind) {
        go(e, 'mkleap', 0, { x0: e.x, y0: e.y });
        SFX.jump();
      }
    },
    mkleap: {
      pin: true,
      tick(e) {
        const u = clamp(e.t / M.leap.air, 0, 1);
        e.x = e.x0 + (e.tx - e.x0) * u;
        e.y = e.y0 + (e.ty - e.y0) * u;
        e.z = 4 * M.leap.h * u * (1 - u);
        if (u >= 1) {
          e.z = 0;
          shock(e, M.leap.r);
          go(e, 'mkland', 0, { leapCd: cd(e, M.leap.cd) });
        }
      },
    },
    mkland(e) {
      if (e.t > M.rec) go(e, 'chase');
    },
    mkpurge(e) {
      if (e.t > 1) go(e, 'chase');
    },
    mkvent(e) {
      if (e.t > 1) go(e, 'chase');
    },
    mkdie(e) {
      // on one knee, sparking, its core dimming; then it bursts
      if (fxRandom() < 0.4) spark(e.x + fxRnd(-60, 60), e.y - fxRnd(60, 260), '#ffd0d8', false);
      if (e.t > M.dieT) {
        e.dead = true;
        G.parts.push({ k: 'boom', x: e.x, y: e.y, z: 120, t: 0, life: 0.7, s: 260 });
        SFX.boom();
        G.shake = 18;
        for (let k = 0; k < 40; k++)
          G.parts.push({
            k: 'dot',
            x: e.x + fxRnd(-80, 80),
            y: e.y - fxRnd(40, 300),
            vx: fxRnd(-300, 300),
            vy: fxRnd(-400, 100),
            g: 300,
            t: 0,
            life: fxRnd(0.8, 1.6),
            s: fxRnd(3, 6),
            col: k % 3 ? '#ffb7d5' : '#ff3b5c',
          });
      }
    },
  },
  // its marks on the ground: the iai's line, the missiles' marks, where it will land
  ground(e) {
    droneGround(e);
    ctx.save();
    if (e.state === 'mkiaiw') {
      const k = clamp(e.t / M.iai.wind, 0, 1),
        x = e.x - G.cam,
        x1 = e.idir > 0 ? W - 60 : 60;
      ctx.strokeStyle = `rgba(255,59,92,${0.3 + 0.6 * k})`;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, e.y);
      ctx.lineTo(x1, e.y);
      ctx.stroke();
    }
    for (const m of e.marks ?? []) {
      if (m.done || m.t < -0.05) continue;
      const k = clamp(m.t / M.mis.fall, 0, 1),
        x = m.x - G.cam,
        r = M.mis.r;
      ctx.strokeStyle = 'rgba(255,59,92,.9)';
      ctx.fillStyle = `rgba(255,59,92,${0.12 + 0.25 * k})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x, m.y, r, r * 0.42, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, m.y, r * k, r * 0.42 * k, 0, 0, TAU);
      ctx.stroke();
      // the missile coming down
      if (k > 0.6) {
        const h = (1 - k) * 900;
        ctx.strokeStyle = 'rgba(255,230,200,.9)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, m.y - h - 40);
        ctx.lineTo(x, m.y - h);
        ctx.stroke();
      }
    }
    if (e.state === 'mkcrouch' || e.state === 'mkleap') {
      const r = M.leap.r;
      ctx.strokeStyle = 'rgba(255,59,92,.8)';
      ctx.fillStyle = 'rgba(255,59,92,.15)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(e.tx - G.cam, e.ty, r, r * 0.42, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  },
  over: drawDrones,
  look: {
    ...robotLook(A, head, katana, chestPlate),
    back: (c) => {
      skirt(c, false);
      backLook(c);
      sode(c, false);
      pods(c);
    },
    legs: (c) => {
      frontLegs(c);
      skirt(c, true);
    },
    arm: (c) => {
      frontArm(c);
      sode(c, true);
    },
  },
  pose: {
    // at rest the sword arm is drawn back, the blade pointing down behind it
    base: { set: { lean: 0.08, aF: [-0.5, -0.72], aB: [0.35, 1.0] } },
    guard: {
      chase: {
        set: { aF: (e, k) => [-0.5 + 0.03 * k.br, -0.72], aB: (e, k) => [0.35, 1.0 + 0.05 * k.br] },
      },
    },
    states: {
      mkwind: { set: { aF: [2.6, 3.1], aB: [2.2, 2.8], lean: -0.1 } },
      mkarc: { set: { aF: [1.3, 1.0], aB: [1.0, 0.8], lean: 0.35, lF: [0.6, -0.2] } },
      mkiaiw: {
        set: { lean: 0.45, lF: [0.9, -0.6], lB: [-0.9, -1.4], aF: [-0.5, -1.2], aB: [0.4, 0.2] },
      },
      mkiai: {
        set: { lean: 0.6, lF: [1.0, 0.2], lB: [-1.2, -0.8], aF: [1.6, 1.6], aB: [-0.6, -0.3] },
      },
      mkguard: { set: { aF: [1.1, 2.9], aB: [0.9, 2.6], lean: -0.05 } },
      mkcounter: { set: { aF: [1.5, 1.2], aB: [1.2, 1.0], lean: 0.4 } },
      mkmis: { set: { aF: [0.5, 1.2], aB: [0.4, 1.0], lean: -0.15, head: -0.3 } },
      mkcrouch: { set: { lF: [1.0, -0.9], lB: [-0.9, -1.6], lean: 0.45 } },
      mkleap: { set: { lF: [0.8, -0.3], lB: [-0.5, -1.4], aF: [2.6, 3.0] } },
      mkland: { set: { lF: [1.0, -0.6], lB: [-0.9, -1.4], lean: 0.55, aF: [1.0, 0.5] } },
      mkpurge: { set: { aF: [1.8, 2.4], aB: [1.7, 2.3], lean: -0.2, head: -0.35 } },
      mkvent: { set: { aF: [1.6, 2.0], aB: [1.5, 1.9], lean: -0.25, head: -0.4 } },
      mkdie: {
        set: {
          lF: [1.3, -0.1],
          lB: [-0.3, -1.65],
          lean: 0.5,
          aF: [0.2, 0.3],
          aB: [0.1, 0.1],
          head: 0.5,
        },
        fn: (o) => (o.hipH = 46),
      },
    },
  },
});

// --- its look ------------------------------------------------------------------------------------

const base = robotLook(A, null, null);
const backLook = base.back,
  frontLegs = base.legs,
  frontArm = base.arm;
/** The kabuto: a helmet with a neck guard, a golden crescent crest, a snarling face mask. */
function head(c) {
  const { e, fl } = c;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  // the neck guard flaring out behind
  ctx.fillStyle = fl ? '#fff' : A.body;
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.lineTo(-24, 8);
  ctx.lineTo(-20, 16);
  ctx.lineTo(4, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // the bowl
  ctx.beginPath();
  ctx.arc(2, -2, 17, Math.PI * 0.95, Math.PI * 2.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : A.trim;
  ctx.fillRect(-15, -4, 34, 4);
  // the crest
  ctx.fillStyle = fl ? '#fff' : '#e3b23c';
  ctx.beginPath();
  ctx.moveTo(4, -16);
  ctx.quadraticCurveTo(-10, -30, -16, -46);
  ctx.quadraticCurveTo(-2, -34, 6, -20);
  ctx.quadraticCurveTo(16, -34, 30, -44);
  ctx.quadraticCurveTo(22, -28, 8, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // the mask
  ctx.fillStyle = fl ? '#fff' : '#3a1d22';
  ctx.beginPath();
  ctx.moveTo(4, -1);
  ctx.lineTo(20, 0);
  ctx.lineTo(18, 12);
  ctx.lineTo(6, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(8 + k * 3, 9);
    ctx.lineTo(8 + k * 3, 13);
    ctx.stroke();
  }
  // the eyes
  const dim = e.state === 'mkdie' ? clamp(1 - e.t / M.dieT, 0, 1) : 1;
  ctx.fillStyle = `rgba(255,59,92,${dim})`;
  if (!APP.lowFx) {
    ctx.shadowColor = A.glow;
    ctx.shadowBlur = 10 * dim;
  }
  ctx.fillRect(8, 2, 10, 3);
  ctx.shadowBlur = 0;
}
/** The plasma katana: a long blade of red light along the forearm. */
function katana(c) {
  const { e, fl, h, wa } = c;
  ctx.save();
  ctx.translate(h[0], h[1]);
  ctx.rotate(-wa);
  ctx.lineCap = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(0, 8);
  ctx.stroke();
  ctx.strokeStyle = fl ? '#fff' : '#1b1b22';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : '#e3b23c';
  ctx.fillRect(-9, 6, 18, 5);
  if (e.state !== 'mkdie') {
    const hot = ['mkwind', 'mkarc', 'mkiai', 'mkiaiw', 'mkcounter'].includes(e.state);
    if (!APP.lowFx) {
      ctx.shadowColor = A.glow;
      ctx.shadowBlur = hot ? 22 : 12;
    }
    ctx.strokeStyle = '#ff3b5c';
    ctx.lineWidth = hot ? 9 : 7;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.quadraticCurveTo(4, 70, 0, 128);
    ctx.stroke();
    ctx.strokeStyle = '#fff0f4';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}
/** Over the chest plate: the lacing; in its last phase, the chest open and the core blazing. */
function chestPlate(c) {
  const { e, fl } = c;
  ctx.strokeStyle = fl ? '#fff' : A.trim;
  ctx.lineWidth = 2;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(-12, -46 + k * 8);
    ctx.lineTo(18, -46 + k * 8);
    ctx.stroke();
  }
  if (e.p3 && !fl) {
    const dim = e.state === 'mkdie' ? clamp(1 - e.t / M.dieT, 0, 1) : 1,
      p = 0.8 + 0.2 * Math.sin(G.time * 12);
    ctx.fillStyle = '#16080c';
    ctx.strokeStyle = OL;
    ctx.beginPath();
    ctx.ellipse(6, -34, 13, 15, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = `rgba(255,235,240,${dim * p})`;
    if (!APP.lowFx) {
      ctx.shadowColor = A.glow;
      ctx.shadowBlur = 24 * dim;
    }
    ctx.beginPath();
    ctx.arc(6, -34, 9, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
/** The armoured skirt of lacquered plates over the hips: its back or its front half. */
function skirt(c, front) {
  const { fl } = c;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  for (const [x, w] of front
    ? [
        [4, 20],
        [16, 18],
      ]
    : [
        [-22, 18],
        [-8, 18],
      ]) {
    ctx.fillStyle = fl ? '#fff' : A.body;
    ctx.fillRect(x - w / 2, -4, w, 40);
    ctx.strokeRect(x - w / 2, -4, w, 40);
    ctx.strokeStyle = fl ? '#fff' : A.trim;
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(x - w / 2, -4 + k * 10);
      ctx.lineTo(x + w / 2, -4 + k * 10);
      ctx.stroke();
    }
    ctx.strokeStyle = OL;
  }
}
/** A great shoulder plate (sode) over the arm, until its second phase. */
function sode(c, front) {
  const { e, fl, L, sh, o } = c;
  if (e.p2) return;
  const s = front ? L[0] : [sh[0] - 3, sh[1]];
  ctx.save();
  ctx.translate(s[0], s[1]);
  ctx.rotate(o.lean * 0.5);
  ctx.fillStyle = fl ? '#fff' : A.body;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillRect(-16, -6, 34, 40);
  ctx.strokeRect(-16, -6, 34, 40);
  ctx.strokeStyle = fl ? '#fff' : A.trim;
  ctx.lineWidth = 2;
  for (let k = 1; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(-16, -6 + k * 10);
    ctx.lineTo(18, -6 + k * 10);
    ctx.stroke();
  }
  ctx.restore();
}
/** The missile pods on its back, from the second phase: open, missiles showing. */
function pods(c) {
  const { e, fl, neck } = c;
  if (!e.p2) return;
  ctx.save();
  ctx.translate(neck[0] - 26, neck[1] + 6);
  ctx.fillStyle = fl ? '#fff' : '#3a3f4c';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.2;
  ctx.fillRect(-14, -30, 28, 34);
  ctx.strokeRect(-14, -30, 28, 34);
  ctx.fillStyle = fl ? '#fff' : '#ff3b5c';
  for (let k = 0; k < 3; k++)
    for (let q = 0; q < 2; q++) {
      ctx.beginPath();
      ctx.arc(-6 + q * 12, -22 + k * 10, 3.5, 0, TAU);
      ctx.fill();
    }
  ctx.restore();
  // a plate's stub of armour on the shoulder now
  plate([neck[0] - 6, neck[1] + 4], [neck[0] + 6, neck[1] + 10], 10, A.trim, fl);
}

// --- its drones -----------------------------------------------------------------------------------

const D = M.drone;
/** Its drones set off on an attack: 'sweep' or 'trip'. */
function droneAttack(e, kind) {
  const S = D.sweep,
    side = P.y > e.y ? -1 : 1;
  Object.assign(e, { dm: kind, dmT: 0, dHit: [false, false], tripN: e.p2 ? 2 : 1, ty: P.y });
  if (kind === 'sweep')
    // one beam along her lane from her left, the other a lane beside it from her right
    e.spots = [
      { x: P.x - 340, y: P.y, dir: 1 },
      { x: P.x + 340, y: P.y + side * S.off, dir: -1 },
    ];
  SFX.beam();
}
/** Where a drone hovers at rest, beside it, bobbing. */
function home(e, i) {
  const s = i ? 1 : -1;
  return [
    e.x + s * D.side + Math.sin(G.time * 1.7 + i * 2) * 16,
    e.y - 30 + i * 60,
    D.z + Math.sin(G.time * 2.3 + i) * 14,
  ];
}
/** Its drones fly, aim and fire (and fall when it is beaten). */
function droneTick(e, dt) {
  e.dr ??= [0, 1].map((i) => {
    const [x, y, z] = home(e, i);
    return { x, y, z };
  });
  if (e.state === 'mkdie') {
    // beaten: they drop, and burst on the ground
    for (const d of e.dr) {
      if (d.boom) continue;
      d.vz = (d.vz ?? 0) - 900 * dt;
      d.z += d.vz * dt;
      if (d.z <= 0) {
        d.z = 0;
        d.boom = true;
        spark(d.x, d.y - 10, '#ffd0d8', true);
        SFX.shatter();
      }
    }
    return;
  }
  e.dmT = (e.dmT ?? 0) + dt;
  const m = e.dm ?? 'home';
  for (let i = 0; i < 2; i++) {
    const d = e.dr[i];
    let [tx, ty, tz] = home(e, i);
    if (m === 'sweep') {
      // over its spot, a little behind it
      const sp = e.spots[i];
      [tx, ty, tz] = [sp.x - sp.dir * 70, sp.y - 10, D.z];
    } else if (m === 'trip') {
      [tx, ty, tz] = [i ? G.cam + W - 40 : G.cam + 40, e.ty, D.trip.z];
    }
    const k = Math.min(1, dt * (m === 'home' ? 3 : 7));
    d.x += (tx - d.x) * k;
    d.y += (ty - d.y) * k;
    d.z += (tz - d.z) * k;
  }
  if (m === 'sweep') {
    const S = D.sweep;
    if (e.dmT > S.aim) {
      for (let i = 0; i < 2; i++) {
        const sp = e.spots[i];
        sp.x += sp.dir * S.speed * dt;
        if (
          !e.dHit[i] &&
          Math.abs(P.x - sp.x) < S.r &&
          Math.abs(P.y - sp.y) < 24 &&
          P.z < 60 &&
          hitPlayer(S.dmg, sp.dir, false)
        )
          e.dHit[i] = true;
      }
      if (fxRandom() < 0.4) for (const sp of e.spots) dust(sp.x, sp.y, 1);
    }
    if (e.dmT > S.aim + S.t) droneDone(e);
  } else if (m === 'trip') {
    const T = D.trip;
    // the lane follows her a while, then is fixed
    if (e.dmT < T.aim * T.follow) e.ty += (P.y - e.ty) * Math.min(1, dt * 8);
    if (e.dmT > T.aim && e.dmT - dt <= T.aim) {
      SFX.beam();
      G.shake = Math.max(G.shake, 4);
    }
    if (
      e.dmT > T.aim &&
      !e.dHit[0] &&
      Math.abs(P.y - e.ty) < T.dy &&
      P.z < T.z + 30 &&
      hitPlayer(T.dmg, P.x >= e.x ? 1 : -1, true)
    )
      e.dHit[0] = true;
    if (e.dmT > T.aim + T.t) {
      if (--e.tripN > 0) Object.assign(e, { dmT: 0, ty: P.y, dHit: [false, false] });
      else droneDone(e);
    }
  }
}
function droneDone(e) {
  Object.assign(e, { dm: 'home', dmT: 0, spots: null, droneCd: cd(e, D.cd) });
}
/** The drones' marks on the ground: their shadows, the lanes they will sweep, the tripwire. */
function droneGround(e) {
  if (!e.dr) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  for (const d of e.dr) {
    ctx.beginPath();
    ctx.ellipse(d.x - G.cam, d.y, 22, 7, 0, 0, TAU);
    ctx.fill();
  }
  const blink = Math.floor(G.time * 16) % 2;
  if (e.dm === 'sweep' && e.dmT < D.sweep.aim) {
    ctx.strokeStyle = `rgba(255,59,92,${blink ? 0.75 : 0.4})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    for (const sp of e.spots) {
      ctx.beginPath();
      ctx.moveTo(sp.x - G.cam, sp.y);
      ctx.lineTo(sp.x - G.cam + sp.dir * D.sweep.speed * D.sweep.t, sp.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}
/** A drone of its: a black lacquered disc with red trim, a golden crest, one red eye, two
 *  thrusters burning under it. At (x, y) on screen. */
function drawDrone(x, y, face) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.2;
  // the thrusters' flames
  if (!APP.lowFx) {
    ctx.shadowColor = A.glow;
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = 'rgba(255,120,140,.85)';
  for (const s of [-1, 1]) {
    const f = 10 + Math.sin(G.time * 50 + s) * 4;
    ctx.beginPath();
    ctx.moveTo(s * 16 - 5, 8);
    ctx.lineTo(s * 16, 8 + f);
    ctx.lineTo(s * 16 + 5, 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  // the crest
  ctx.fillStyle = '#e3b23c';
  ctx.beginPath();
  ctx.moveTo(-2, -10);
  ctx.quadraticCurveTo(-12, -18, -16, -26);
  ctx.quadraticCurveTo(-4, -20, 0, -12);
  ctx.quadraticCurveTo(6, -20, 16, -26);
  ctx.quadraticCurveTo(12, -16, 2, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // the body
  ctx.fillStyle = A.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 12, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = A.trim;
  ctx.fillRect(-26, -2, 52, 4);
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#3a3f4c';
    ctx.beginPath();
    ctx.ellipse(s * 16, 7, 7, 4, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  // the eye
  ctx.fillStyle = '#16080c';
  ctx.beginPath();
  ctx.arc(face * 10, 0, 7, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff3b5c';
  if (!APP.lowFx) {
    ctx.shadowColor = A.glow;
    ctx.shadowBlur = 12;
  }
  ctx.beginPath();
  ctx.arc(face * 11, 0, 3.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}
/** A beam of red light from (x0, y0) to (x1, y1) on screen; `w` its width, `a` how bright. */
function beam(x0, y0, x1, y1, w, a) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255,59,92,${0.5 * a})`;
  ctx.lineWidth = w * 2.2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,235,240,${a})`;
  ctx.lineWidth = w * 0.7;
  ctx.stroke();
  ctx.restore();
}
/** The drones, and their beams. */
function drawDrones(e) {
  if (!e.dr) return;
  const fire = (m, aim) => e.dm === m && e.dmT > aim;
  // the beams first, then the drones over them
  if (e.dm === 'sweep')
    e.dr.forEach((d, i) => {
      const sp = e.spots[i],
        on = fire('sweep', D.sweep.aim);
      beam(d.x - G.cam, d.y - d.z, sp.x - G.cam, sp.y, on ? 10 : 2, on ? 1 : 0.5);
      if (on) {
        ctx.fillStyle = 'rgba(255,200,210,.7)';
        ctx.beginPath();
        ctx.ellipse(sp.x - G.cam, sp.y, D.sweep.r, D.sweep.r * 0.42, 0, 0, TAU);
        ctx.fill();
      }
    });
  if (e.dm === 'trip') {
    const [a, b] = e.dr,
      on = fire('trip', D.trip.aim),
      blink = Math.floor(G.time * 18) % 2;
    beam(a.x - G.cam, a.y - a.z, b.x - G.cam, b.y - b.z, on ? 14 : 2, on ? 1 : blink ? 0.7 : 0.3);
  }
  for (const d of e.dr) if (!d.boom) drawDrone(d.x - G.cam, d.y - d.z, e.face);
}
