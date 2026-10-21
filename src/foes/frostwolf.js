// The frost wolf (TYPES.frostwolf, FROST), the last boss of Frostfang Pass, hunting in the glade
// under the moon: a white wolf three times a man's height, crystals of ice along its back, eyes
// like cold stars. Its body is a wall (the heroine is pushed round it); its head is its weak
// spot (a jump reaches it best).
//   - the ice breath: it draws breath (the cone it will fill is marked on the ground), then a
//     cone of freezing mist rolls along the road; caught in it, she freezes in a block of ice
//     (J and K mash her out sooner) — and it comes for her;
//   - the bite: a crouch and a lunge across the glade, jaws first;
//   - up close, a paw swung round;
//   - the howl: wolves come out of the forest, icicles fall from the trees on marked spots;
//   - from its second phase (FROST.ph2), the leap: out of the glade high over the trees, and
//     down on her in a ring of ice spikes (its shadow follows her);
//   - in its third (FROST.ph3) a blizzard blows, icicles fall all the time, and the breath sweeps
//     across the road from one side to the other.
import { FROST, OL, TAU, W } from '../config.js';
import { clamp, fxRandom, fxRnd, random, rnd } from '../util.js';
import { APP, G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { dust, spark } from '../fx.js';
import { finale, hitPlayer } from '../combat.js';
import { styleBreak, scoreMult } from '../style.js';
import { spawn } from '../enemies.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';
import { drawWolf } from './wild.js';

const K = 2.6; // its size against a grey wolf
const C = { fur: '#dbe9f5', dk: '#93adc4', belly: '#f4fbff', eye: '#7ff0ff' };
const UNSTOPPABLE = [
  'fwbreathw',
  'fwbreath',
  'fwbitew',
  'fwbite',
  'fwswipew',
  'fwswipe',
  'fwhowl',
  'fwleapw',
  'fwup',
  'fwfall',
  'fwland',
];
const speedK = (e) => (e.phase >= 2 ? FROST.p2speed : 1);
const cd = (e, r) => rnd(...r) * (e.phase >= 2 ? FROST.p2cd : 1);
const onScreen = (e) => e.x > G.cam + 80 && e.x < G.cam + W - 80;
/** The breath's cone: its middle in depth now (in the third phase it sweeps across). */
const breathY = (e) =>
  e.phase >= 3 && e.state === 'fwbreath'
    ? e.by + Math.sin((e.t / FROST.breath.t) * Math.PI - Math.PI / 2) * 70 * e.sweep
    : e.by;
/** How deep the cone is `rel` px in front of it. */
const coneDy = (rel) => 18 + (FROST.breath.dy - 18) * clamp(rel / FROST.breath.reach, 0, 1);

/** Caught in the breath: she freezes in a block of ice (on a beast, she is thrown off). */
export function freezePlayer(dmg, dur) {
  const p = P;
  if (p.inv > 0 || p.z > 100 || APP.state !== 'play') return false;
  if (p.state === 'ride') return hitPlayer(dmg, p.face, true);
  if (
    ![
      'idle',
      'walk',
      'run',
      'atk1',
      'atk2',
      'throw',
      'gunFin',
      'nade',
      'bigGun',
      'hado',
      'jump',
      'hurt',
    ].includes(p.state)
  )
    return false;
  if (p.hp <= dmg) return hitPlayer(dmg, p.face, false);
  p.hp -= dmg;
  styleBreak();
  SFX.freeze();
  Object.assign(p, { state: 'frozen', t: 0, z: 0, vz: 0, hold: dur, buf: null, airS: null });
  return true;
}
/** Wolves out of the forest, from the sides of the screen. */
function callPack(e, n) {
  for (let i = 0; i < n; i++) {
    const w = spawn('wolf', i % 2 ? -1 : 1);
    w.cd = 0.6 + i * 0.4;
  }
}
/** Icicles to fall on marked spots: round her, and some anywhere in the glade. */
function icicles(e, n) {
  for (let i = 0; i < n; i++) {
    const near = i < 2,
      x = near ? P.x + rnd(-90, 90) : G.cam + rnd(80, W - 80),
      y = near ? P.y + rnd(-30, 30) : G.camY + rnd(250, 520);
    (e.spikes ??= []).push({ x, y: clamp(y, G.camY + 230, G.camY + 528), t: -i * 0.12 });
  }
}
/** A ring of shock and ice where it lands. */
function landRing(e) {
  const r = FROST.leap.r;
  G.parts.push({ k: 'gring', x: e.x, y: e.y, t: 0, life: 0.5, s: r, col: '#9ff0ff' });
  dust(e.x, e.y, 16);
  G.shake = Math.max(G.shake, 20);
  SFX.boom();
  SFX.ice();
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * TAU;
    G.debris.push({
      k: 'shard',
      x: e.x + Math.cos(a) * r * 0.7,
      gy: e.y + Math.sin(a) * r * 0.3,
      z: 10,
      vx: Math.cos(a) * 160,
      vz: fxRnd(260, 420),
      rot: fxRnd(TAU),
      vr: fxRnd(-12, 12),
      len: fxRnd(8, 16),
      col: '#bff4ff',
      life: 1.2,
    });
  }
  if (((P.x - e.x) / r) ** 2 + ((P.y - e.y) / (r * 0.42)) ** 2 < 1 && P.z < 40)
    hitPlayer(FROST.leap.dmg, P.x >= e.x ? 1 : -1, true);
}

export default defineFoe('frostwolf', {
  walksIn: true,
  engageCap: 9,
  stand: 210,
  init: {
    breathCd: [2.5, 4],
    biteCd: [1.5, 3],
    swipeCd: [0.5, 1.5],
    howlCd: [7, 10],
    leapCd: [3, 5],
  },
  timers: ['breathCd', 'biteCd', 'swipeCd', 'howlCd', 'leapCd'],
  attacks: UNSTOPPABLE,
  unstoppable: (e) => UNSTOPPABLE.includes(e.state),
  guard: () => true,
  immune: (e) => e.state === 'fwup' || e.state === 'fwenter' || (e.state === 'fwfall' && e.z > 200),
  // it comes down into the glade from over the trees
  spawn(e) {
    e.phase = 1;
    e.x = G.cam + W - 280;
    e.z = FROST.leap.h;
    e.face = -1;
    go(e, 'fwenter');
  },

  // its parts: the long body, the head (its weak spot)
  zone(e, x0, x1, y, dy, zLo, zHi) {
    if (e.state === 'fwup' || e.state === 'fwdie' || Math.abs(y - e.y) > dy + 40) return null;
    const lo = Math.min(x0, x1),
      hi = Math.max(x0, x1),
      hx = e.x + e.face * 175,
      head = hi > hx - 50 && lo < hx + 50 && zHi > e.z + 110 && zLo < e.z + 240,
      body = hi > e.x - 150 && lo < e.x + 150 && zHi > e.z && zLo < e.z + 190;
    return head ? 'head' : body ? 'body' : null;
  },
  zoneHit(e, zone) {
    if (zone !== 'head') return 1;
    spark(e.x + e.face * 175, e.y - e.z - 180, '#bff4ff', true);
    return 1.3;
  },
  band: (e) => [e.z, e.z + 230],
  moves: [
    {
      // the leap, from its second phase
      when: (e, s) => e.phase >= 2 && e.leapCd <= 0 && !s.pdown && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'fwleapw', 0, { engage: false });
        SFX.roar();
      },
    },
    {
      when: (e, s) => e.howlCd <= 0 && !s.pdown && onScreen(e),
      go: (e) => howl(e),
    },
    {
      when: (e, s) =>
        e.breathCd <= 0 &&
        !s.pdown &&
        s.adx > FROST.breath.min &&
        s.adx < FROST.breath.max &&
        s.ady < 70 &&
        onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'fwbreathw', 0, { engage: false, by: P.y, sweep: random() < 0.5 ? 1 : -1 });
        SFX.breath();
      },
    },
    {
      when: (e, s) =>
        e.biteCd <= 0 && !s.pdown && s.adx > FROST.bite.min && s.adx < FROST.bite.max && s.ady < 50,
      go(e) {
        faceP(e);
        go(e, 'fwbitew', 0, { engage: false });
        SFX.dragonWind();
      },
    },
    {
      when: (e, s) => e.swipeCd <= 0 && !s.pdown && s.adx < FROST.swipe.reach && s.ady < 60,
      go(e) {
        faceP(e);
        go(e, 'fwswipew', 0, { engage: false });
      },
    },
  ],
  tick(e, dt) {
    const p = e.hp / e.T.hp;
    if (e.phase < 3 && !e.dying && p <= (e.phase === 1 ? FROST.ph2 : FROST.ph3)) {
      e.phase++;
      G.flash = Math.max(G.flash, 0.4);
      G.blizzard = e.phase >= 3;
      // a new phase begins with a howl (once it is free to)
      e.howlCd = 0;
      e.leapCd = Math.min(e.leapCd, 2);
    }
    // the falling icicles
    for (const s of e.spikes ?? []) {
      s.t += dt;
      if (s.t >= FROST.howl.warn && !s.done) {
        s.done = true;
        SFX.ice();
        for (let k = 0; k < 6; k++)
          G.debris.push({
            k: 'shard',
            x: s.x + fxRnd(-8, 8),
            gy: s.y + fxRnd(-4, 4),
            z: 6,
            vx: fxRnd(-120, 120),
            vz: fxRnd(160, 320),
            rot: fxRnd(TAU),
            vr: fxRnd(-14, 14),
            len: fxRnd(5, 10),
            col: '#d8f8ff',
            life: 0.8,
          });
        const r = FROST.howl.r;
        if (((P.x - s.x) / r) ** 2 + ((P.y - s.y) / (r * 0.45)) ** 2 < 1 && P.z < 60)
          hitPlayer(FROST.howl.dmg, P.x >= s.x ? 1 : -1, false);
      }
    }
    if (e.spikes) e.spikes = e.spikes.filter((s) => s.t < FROST.howl.warn + 0.2);
    // in the blizzard, now and then an icicle falls near her
    if (e.phase >= 3 && !e.dying && (e.bliz = (e.bliz ?? 0) - dt) <= 0) {
      e.bliz = rnd(2, 3.2);
      icicles(e, 1);
    }
    // the body is a wall: she is pushed round it
    if (e.z < 40 && !e.dying && !['fwup', 'fwfall'].includes(e.state) && P.z < 120) {
      const cx = e.x - e.face * 10,
        rx = FROST.bw,
        ry = 26,
        dx = P.x - cx,
        dy = P.y - e.y,
        d = (dx / rx) ** 2 + (dy / ry) ** 2;
      if (d < 1) {
        const k = 1 / Math.sqrt(Math.max(d, 1e-4));
        if (Math.abs(dx) > 2) P.x = cx + dx * k;
        else P.x = cx + (P.x >= e.x ? rx : -rx);
        if (d < 0.6) P.y = e.y + dy * Math.min(k, 1.2);
      }
    }
    // a cold mist off its fur
    if (fxRandom() < 0.25)
      G.parts.push({
        k: 'smoke',
        x: e.x + fxRnd(-120, 120),
        y: e.y - e.z - fxRnd(60, 180),
        vx: fxRnd(-20, 20),
        vy: fxRnd(-30, -10),
        g: 0,
        t: 0,
        life: 0.8,
        s: fxRnd(6, 12),
        col: 'rgba(220,245,255,.6)',
      });
  },
  die(e) {
    P.score += Math.round(e.T.score * scoreMult());
    Object.assign(e, { dying: true, engage: false, state: 'fwdie', t: 0, hp: 0, z: 0, spikes: [] });
    G.blizzard = false;
    SFX.howl();
    finale(e);
  },
  states: {
    fwenter(e) {
      const L = FROST.leap,
        u = clamp(e.t / (L.fall * 1.6), 0, 1);
      e.z = L.h * (1 - u * u);
      if (u >= 1) {
        e.z = 0;
        landRing(e);
        howl(e, 0);
      }
    },
    fwhowl(e) {
      if (e.t > FROST.howl.wind && !e.howled) {
        e.howled = true;
        SFX.howl();
        G.shake = Math.max(G.shake, 8);
        callPack(e, e.packN ?? FROST.howl.wolves[e.phase]);
        icicles(e, FROST.howl.spikes[e.phase - 1]);
      }
      if (e.t > FROST.howl.wind + FROST.howl.t) go(e, 'chase', 0, { howlCd: cd(e, FROST.howl.cd) });
    },
    fwbreathw(e, dt) {
      faceP(e);
      e.by += (P.y - e.by) * Math.min(1, dt * 3);
      if (fxRandom() < 0.7) {
        const [mx, mz] = mouthAt(e);
        G.parts.push({
          k: 'glow',
          x: mx + fxRnd(-60, 60),
          y: e.y - mz + fxRnd(-50, 50),
          vx: (e.x + e.face * 200 - mx) * 2,
          vy: fxRnd(-20, 20),
          g: 0,
          t: 0,
          life: 0.3,
          s: fxRnd(3, 6),
          col: '#dffaff',
        });
      }
      if (e.t > FROST.breath.wind / speedK(e)) {
        go(e, 'fwbreath', 0, { hitDone: false });
        SFX.iceBreath();
      }
    },
    fwbreath(e) {
      const B = FROST.breath,
        tip = Math.min(B.reach, 100 + e.t * 1200),
        rel = (P.x - e.x) * e.face;
      if (!e.hitDone && rel > 100 && rel < tip + 20 && Math.abs(P.y - breathY(e)) < coneDy(rel))
        e.hitDone = freezePlayer(B.dmg, B.freeze);
      // the mist rolling out
      for (let k = 0; k < 3; k++) {
        const [mx, mz] = mouthAt(e),
          u = fxRnd(0.05, 1);
        G.parts.push({
          k: 'smoke',
          x: mx + e.face * tip * u,
          y: breathY(e) - mz * (1 - u) - 40 * u + fxRnd(-20, 20),
          vx: e.face * fxRnd(80, 200),
          vy: fxRnd(-30, 30),
          g: 0,
          t: 0,
          life: 0.45,
          s: fxRnd(14, 26) * (0.5 + u),
          col: 'rgba(200,240,255,.75)',
        });
      }
      if (e.t > B.t) go(e, 'recover', 0, { breathCd: cd(e, B.cd) });
    },
    fwbitew(e) {
      faceP(e);
      if (e.t > FROST.bite.wind / speedK(e)) {
        const tx = clamp(P.x - e.face * 150, G.cam + 120, G.cam + W - 120);
        go(e, 'fwbite', 0, { x0: e.x, y0: e.y, tx, ty: P.y, hitDone: false });
        SFX.dash();
      }
    },
    fwbite: {
      pin: true,
      tick(e) {
        const B = FROST.bite,
          u = clamp(e.t / B.air, 0, 1);
        e.x = e.x0 + (e.tx - e.x0) * u;
        e.y = e.y0 + (e.ty - e.y0) * u;
        e.z = 4 * B.h * u * (1 - u);
        if (
          !e.hitDone &&
          u > 0.4 &&
          Math.abs(P.x - (e.x + e.face * 190)) < 80 &&
          Math.abs(P.y - e.y) < 36 &&
          P.z < 160 &&
          hitPlayer(B.dmg, e.face, true)
        ) {
          e.hitDone = true;
          SFX.clack();
        }
        if (u >= 1) {
          e.z = 0;
          dust(e.x, e.y, 10);
          go(e, 'recover', 0, { biteCd: cd(e, B.cd) });
        }
      },
    },
    fwswipew(e) {
      faceP(e);
      if (e.t > FROST.swipe.wind / speedK(e)) {
        go(e, 'fwswipe', 0, { hitDone: false });
        SFX.swing();
      }
    },
    fwswipe(e) {
      const S = FROST.swipe,
        rel = (P.x - e.x) * e.face;
      if (!e.hitDone && rel > 40 && rel < S.reach && Math.abs(P.y - e.y) < S.dy && P.z < 120) {
        e.hitDone = true;
        hitPlayer(S.dmg, e.face, true);
      }
      if (e.t > 0.3) go(e, 'recover', 0, { swipeCd: cd(e, S.cd) });
    },
    fwleapw(e) {
      if (e.t > FROST.leap.wind / speedK(e)) {
        go(e, 'fwup', 0);
        SFX.jump();
        dust(e.x, e.y, 14);
        G.shake = Math.max(G.shake, 8);
      }
    },
    // up over the trees (out of sight, out of reach), its shadow following her...
    fwup: {
      pin: true,
      tick(e, dt) {
        const L = FROST.leap;
        if (e.t < L.up) e.z = L.h * Math.sin(((e.t / L.up) * Math.PI) / 2);
        else {
          e.z = L.h;
          const k = Math.min(1, dt * 5);
          e.x += (clamp(P.x, G.cam + 160, G.cam + W - 160) - e.x) * k;
          e.y += (P.y - e.y) * k;
        }
        if (e.t > L.up + L.hang) go(e, 'fwfall');
      },
    },
    // ...and down on her
    fwfall: {
      pin: true,
      tick(e) {
        const L = FROST.leap,
          u = clamp(e.t / L.fall, 0, 1);
        e.z = L.h * (1 - u * u);
        if (u >= 1) {
          e.z = 0;
          landRing(e);
          faceP(e);
          go(e, 'fwland', 0, { leapCd: cd(e, L.cd) });
        }
      },
    },
    fwland(e) {
      if (e.t > FROST.leap.rec) go(e, 'chase');
    },
    fwdie(e) {
      if (fxRandom() < 0.4)
        G.parts.push({
          k: 'smoke',
          x: e.x + fxRnd(-140, 140),
          y: e.y - fxRnd(10, 80),
          vx: 0,
          vy: fxRnd(-40, -10),
          g: 0,
          t: 0,
          life: 1,
          s: fxRnd(10, 18),
          col: 'rgba(220,245,255,.6)',
        });
      if (e.t > FROST.dieT) e.dead = true;
    },
  },
  // on the ground: the cone the breath will fill, where it will land, the icicles' marks
  ground(e) {
    ctx.save();
    if (e.state === 'fwbreathw' || e.state === 'fwbreath') {
      const B = FROST.breath,
        k = e.state === 'fwbreath' ? 1 : clamp(e.t / B.wind, 0, 1),
        x0 = e.x - G.cam + e.face * 100,
        x1 = e.x - G.cam + e.face * B.reach,
        y = breathY(e);
      ctx.fillStyle = `rgba(140,230,255,${0.08 + 0.16 * k})`;
      ctx.strokeStyle = `rgba(190,245,255,${0.35 + 0.4 * k})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x0, y - coneDy(100));
      ctx.lineTo(x1, y - coneDy(B.reach));
      ctx.lineTo(x1, y + coneDy(B.reach));
      ctx.lineTo(x0, y + coneDy(100));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (['fwup', 'fwfall', 'fwleapw', 'fwenter'].includes(e.state)) {
      const r = FROST.leap.r,
        k = e.state === 'fwfall' ? 1 : e.state === 'fwup' ? clamp(e.t / 1.1, 0, 1) : 0,
        x = e.x - G.cam;
      ctx.strokeStyle = `rgba(160,240,255,${0.45 + 0.4 * k})`;
      ctx.fillStyle = `rgba(120,220,255,${0.1 + 0.18 * k})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x, e.y, r, r * 0.42, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, e.y, r * (1 - 0.7 * k), r * 0.42 * (1 - 0.7 * k), 0, 0, TAU);
      ctx.stroke();
    }
    for (const s of e.spikes ?? []) {
      if (s.done || s.t < 0) continue;
      const r = FROST.howl.r,
        u = clamp(s.t / FROST.howl.warn, 0, 1);
      ctx.strokeStyle = `rgba(180,240,255,${0.4 + 0.5 * u})`;
      ctx.fillStyle = `rgba(150,225,255,${0.1 + 0.2 * u})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(s.x - G.cam, s.y, r, r * 0.45, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(s.x - G.cam, s.y, r * u, r * 0.45 * u, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  },
  draw(e) {
    drawWolf(e, K, C, { big: e.phase >= 3 ? 8 : 4 });
  },
  // over everyone: the icicles falling
  over(e) {
    for (const s of e.spikes ?? []) {
      if (s.done || s.t < 0) continue;
      const u = clamp(s.t / FROST.howl.warn, 0, 1),
        x = s.x - G.cam,
        y = s.y - (1 - u * u) * 520;
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.moveTo(-9, -54);
      ctx.lineTo(9, -54);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fillStyle = '#d8f8ff';
      ctx.fill();
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fillRect(-3, -50, 2, 34);
      ctx.restore();
    }
  },
});
/** Where its mouth is: [x, height]. */
function mouthAt(e) {
  return [e.x + e.face * 205, e.z + 165];
}
/** It throws back its head and howls (`n` wolves come; by default as many as its phase calls). */
function howl(e, n) {
  faceP(e);
  go(e, 'fwhowl', 0, { engage: false, howled: false, packN: n });
}
