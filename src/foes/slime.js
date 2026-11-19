// The mini-boss of Old Quarry: a heap of radioactive green slime from the flooded hall, with
// the bones of what it ate floating inside. It drops from the roof, rolls across the hall,
// jumps (not always at the player) and splashes down, and spits out zombies that get up and
// fight. A heavy blow stops its roll; its other attacks go on through blows. Its poise worn
// away (POISE: two heavy blows, or one crushing blow) sends it sliding back — and then for a
// while (SLIME.steady) nothing staggers it: it cannot be held down. Stay up close too long and
// it rears up and swallows her: acid inside, mash to break out. At two thirds and at one third
// of its health it sheds two slimelets, which crawl back after a while and, reaching it, heal
// it: kill them first. It leaves no puddles.
import { ACID, SLIME, TAU, W } from '../config.js';
import { clamp, fxRandom, fxRnd, lerp, random, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { acidBite, finale, hitPlayer, wearPoise } from '../combat.js';
import { scoreMult } from '../style.js';
import { ctx } from '../gfx.js';
import { groundPoint, floorClamp } from '../level.js';
import { spawn } from '../enemies.js';
import { defineFoe } from './registry.js';
import { faceP, go, moveTo } from './kit.js';
import { spark } from '../fx.js';

const cd = (k) => rnd(SLIME.cds[k][0], SLIME.cds[k][1]);
const minions = () => G.enemies.filter((o) => o.fromSlime && !o.dead).length;
const ATTACKS = [
  'rwind',
  'roll',
  'jwind',
  'sjump',
  'spwind',
  'windup',
  'attack',
  'ewind',
  'engulf',
];
const E = SLIME.engulf;

function splash(x, y, n, v = 300) {
  for (let i = 0; i < n; i++)
    G.parts.push({
      k: 'dot',
      x: x + fxRnd(-30, 30),
      y: y - fxRnd(10, 60),
      vx: fxRnd(-v, v),
      vy: fxRnd(-v * 1.2, -60),
      g: 800,
      t: 0,
      life: fxRnd(0.4, 0.8),
      s: fxRnd(4, 8),
      col: fxRandom() < 0.5 ? '#9dff4a' : '#4fd12a',
    });
}
// --- drawing ----------------------------------------------------------------------------------

/** Squash and stretch for its state: [width, height] factors. */
function squash(e) {
  const t = e.t,
    wob = Math.sin(e.anim * 4) * 0.03;
  switch (e.state) {
    case 'rwind':
    case 'jwind': {
      const u = clamp(t / 0.4, 0, 1);
      return [1 + 0.25 * u + wob, 1 - 0.3 * u];
    }
    case 'roll':
      return [1.08, 0.92];
    case 'sjump':
      return [0.82, 1.22];
    case 'spwind': {
      const u = clamp(t / SLIME.spwind, 0, 1);
      return [0.95 - 0.08 * u, 1.05 + 0.15 * u];
    }
    case 'quiver':
    case 'stagger':
      return [1 + Math.sin(t * 50) * 0.08, 1 - Math.sin(t * 50) * 0.08];
    case 'sdrop':
      return e.z > 0 ? [0.85, 1.2] : [1.3, 0.7];
    case 'attack':
      return [1.25, 0.85];
    case 'ewind': {
      // rearing up, wide
      const u = clamp(t / E.wind, 0, 1);
      return [1 + 0.35 * u, 1 + 0.45 * u];
    }
    case 'engulf':
      return [1.2 + Math.sin(t * 9) * 0.05, 1.05 - Math.sin(t * 9) * 0.05];
    default:
      return [1 + wob, 1 - wob + (e.landT > 0 ? -0.25 * e.landT : 0)];
  }
}
export function drawSlime(e) {
  const T = e.T,
    fl = e.flash > 0,
    [kx, ky] = squash(e),
    R = 96,
    rx = R * kx,
    ry = R * 0.86 * ky,
    t = e.anim;
  ctx.save();
  ctx.translate(e.x - G.cam, e.y - e.z);
  ctx.scale(e.face * T.scale, T.scale);
  // its glow on everything around
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(0, -ry, 10, 0, -ry, R * 2.2);
  gl.addColorStop(0, 'rgba(120,255,80,.28)');
  gl.addColorStop(1, 'rgba(120,255,80,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(-R * 2.2, -ry - R * 2.2, R * 4.4, R * 4.4);
  ctx.restore();
  // the body: a wobbling dome, flat on the floor
  const body = () => {
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * TAU,
        w = 1 + 0.045 * Math.sin(3 * a + t * 4) + 0.03 * Math.sin(5 * a - t * 3),
        x = Math.cos(a) * rx * w,
        y = Math.min(0, -ry + Math.sin(a) * ry * w);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  };
  body();
  const g = ctx.createRadialGradient(-rx * 0.25, -ry * 1.3, 8, 0, -ry * 0.8, R * 1.3);
  g.addColorStop(0, fl ? '#fff' : '#c8ff8a');
  g.addColorStop(0.45, fl ? '#fff' : 'rgba(111,226,58,.92)');
  g.addColorStop(1, fl ? '#fff' : 'rgba(40,140,24,.95)');
  ctx.fillStyle = g;
  // (see-through while it holds her: she is seen struggling inside)
  ctx.globalAlpha = e.state === 'engulf' ? 0.62 : 1;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#17301a';
  ctx.stroke();
  ctx.save();
  body();
  ctx.clip();
  // what it ate: bones, a skull, a hard hat, drifting and turning (and rolling with it)
  const roll = e.rollA ?? 0;
  for (const [i, k] of [
    [0, 'skull'],
    [1, 'bone'],
    [2, 'bone'],
    [3, 'hat'],
    [4, 'bone'],
  ]) {
    const a = roll + i * 1.3 + Math.sin(t * 0.7 + i) * 0.3,
      r = 30 + (i % 3) * 14,
      x = Math.cos(a) * r * kx,
      y = -ry + Math.sin(a) * r * 0.7 * ky;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a * 1.5 + t * 0.3);
    ctx.globalAlpha = 0.55;
    if (k === 'skull') {
      ctx.fillStyle = '#e8f0d0';
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, TAU);
      ctx.fill();
      ctx.fillRect(-7, 8, 14, 8);
      ctx.fillStyle = '#1a3a1a';
      ctx.beginPath();
      ctx.arc(-5, -1, 3.5, 0, TAU);
      ctx.arc(5, -1, 3.5, 0, TAU);
      ctx.fill();
    } else if (k === 'hat') {
      ctx.fillStyle = '#e3b23c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 9, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillRect(-17, 0, 34, 3);
    } else {
      ctx.fillStyle = '#e8f0d0';
      ctx.fillRect(-16, -2.5, 32, 5);
      for (const sx of [-16, 16])
        for (const sy of [-3, 3]) {
          ctx.beginPath();
          ctx.arc(sx, sy, 3.5, 0, TAU);
          ctx.fill();
        }
    }
    ctx.restore();
  }
  // bubbles rising
  ctx.fillStyle = 'rgba(230,255,190,.55)';
  for (let i = 0; i < 9; i++) {
    const bx = ((i * 37) % (rx * 1.4)) - rx * 0.7,
      by = -((t * 30 + i * 23) % (ry * 1.7));
    ctx.beginPath();
    ctx.arc(bx, by, 2 + (i % 3), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // a shine on the dome
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(-rx * 0.25, -ry * 1.35, rx * 0.45, ry * 0.3, -0.3, Math.PI * 1.1, Math.PI * 1.55);
  ctx.stroke();
  // the face (it turns away while rolling)
  const front = e.state !== 'roll' || Math.cos(roll) > 0;
  if (front) {
    const ex = rx * 0.35,
      ey = -ry * 1.25;
    for (const [dx, r] of [
      [0, 13],
      [-26, 10],
    ]) {
      ctx.fillStyle = '#10200e';
      ctx.beginPath();
      ctx.ellipse(ex + dx, ey, r, r * 1.2, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = fl ? '#fff' : T.eye;
      ctx.shadowColor = T.eye;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(ex + dx + 3, ey + 1, r * 0.45, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // the mouth: wide open to spit
    const open =
      e.state === 'spwind' ? clamp(e.t / SLIME.spwind, 0, 1) : e.state === 'attack' ? 0.6 : 0.15;
    ctx.fillStyle = '#10200e';
    ctx.beginPath();
    ctx.ellipse(rx * 0.3, -ry * 0.75, 26, 4 + 26 * open, 0, 0, TAU);
    ctx.fill();
    if (open > 0.3) {
      ctx.fillStyle = '#9dff4a';
      ctx.beginPath();
      ctx.ellipse(rx * 0.3, -ry * 0.75 + 14 * open, 14, 6 * open, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  // a warning over it before it rolls or jumps
  if (e.state === 'rwind' || e.state === 'jwind' || e.state === 'ewind') {
    ctx.fillStyle = '#ff4a5e';
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(e.t * 30);
    ctx.font = '900 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', e.x - G.cam, e.y - e.z - ry * 2 - 30);
    ctx.globalAlpha = 1;
  }
}

/** It swallows her (if she can be caught: on her feet, not untouchable). */
function swallow(e) {
  const p = P;
  if (
    p.inv > 0 ||
    p.z > 6 ||
    !['idle', 'walk', 'run', 'atk1', 'atk2', 'throw', 'gunFin', 'katana', 'guard', 'hurt'].includes(
      p.state,
    )
  )
    return false;
  // (the slime holds her by a flag: see the player's 'grabbed'; it spits her out itself)
  e.holdsP = true;
  Object.assign(p, { state: 'grabbed', t: 0, grabber: e, hold: E.hold + 0.3, buf: null });
  SFX.grab();
  return true;
}
/** At two thirds and at one third of its health it sheds its slimelets. */
function shed(e) {
  while (e.splitN < SLIME.split.length && e.hp <= e.T.hp * SLIME.split[e.splitN]) {
    e.splitN++;
    for (let i = 0; i < SLIME.kids; i++) {
      const side = i % 2 ? 1 : -1,
        k = spawn('slimelet', 0, e.x + side * 70, e.y + (i ? 20 : -20));
      Object.assign(k, {
        state: 'air',
        t: 0,
        vx: side * 240,
        vz: 420,
        z: 60,
        mother: e,
        backT: SLIME.kid.back,
      });
    }
    splash(e.x, e.y, 24, 380);
    SFX.squelch();
    G.shake = Math.max(G.shake, 8);
  }
}

// --- behaviour --------------------------------------------------------------------------------

export default defineFoe('slime', {
  draw: drawSlime,
  timers: ['rollCd', 'jumpCd', 'spitCd', 'landT', 'steadyT', 'engulfCd'],
  engageCap: Infinity,
  spawn(e) {
    e.w = 82;
    e.x = G.cam + W - 250;
    e.y = clamp(P.y, G.camY + 300, G.camY + 500);
    floorClamp(e);
    e.face = -1;
    e.z = 560;
    e.vz = 0;
    e.state = 'sdrop';
    e.rollA = 0;
    Object.assign(e, { rollCd: 2, jumpCd: 4, spitCd: 3, hugT: 0, engulfCd: 2, splitN: 0 });
    G.banner = { a: '@slime', b: 'slimeBanner', t: 0 };
    SFX.boss();
  },
  immune: (e) => e.state === 'sdrop' || (e.state === 'sjump' && e.z > 50),
  attacks: ATTACKS,
  moves: [
    {
      // she has stayed up close too long: it rears up to swallow her
      when: (e, s) => e.hugT > E.hug && e.engulfCd <= 0 && !s.pdown,
      go: (e) => {
        faceP(e);
        go(e, 'ewind', 0, { engage: false, hugT: 0 });
        SFX.squelch();
      },
    },
    {
      when: (e, s) => e.spitCd <= 0 && minions() < SLIME.minions && s.adx > 140,
      go: (e) => go(e, 'spwind', 0, { engage: false }),
    },
    {
      when: (e, s, dt) => e.jumpCd <= 0 && !s.pdown && random() < dt * 0.9,
      go: (e) => go(e, 'jwind', 0, { engage: false }),
    },
    {
      when: (e, s) => e.rollCd <= 0 && !s.pdown && s.adx > 170 && s.ady < 100,
      go: (e) => go(e, 'rwind', 0, { engage: false }),
    },
  ],
  guard(e, knock, src, dir, crush) {
    e.landT = 0.25;
    shed(e);
    // just after a stagger nothing moves it: it cannot be held down
    if (e.steadyT > 0) {
      spark(e.x - dir * 40, e.y - 90, '#c8ff8a', false);
      return true;
    }
    if (e.state === 'engulf') return true;
    if (wearPoise(e, knock, src, crush)) {
      // its poise gone: it slides back, and is steady for a while after
      go(e, 'stagger', 0, { vx: dir * 260 });
      e.steadyT = SLIME.stagger + SLIME.steady;
      SFX.squelch();
      splash(e.x, e.y, 6);
    } else if (knock && e.state === 'roll') {
      // a heavy blow stops its roll (its other attacks go on)
      go(e, 'quiver');
      SFX.squelch();
    }
    return true;
  },
  // the bar under its health: while it is steady, how long it still is
  poise: (e) => (e.steadyT > 0 && !e.dead ? [e.steadyT, SLIME.stagger + SLIME.steady] : null),
  tick(e, dt) {
    // how long she has stayed up close (it forgets slowly when she keeps away)
    const near = Math.abs(P.x - e.x) < E.near && Math.abs(P.y - e.y) < 60 && P.state !== 'grabbed';
    e.hugT = near ? (e.hugT ?? 0) + dt : Math.max(0, (e.hugT ?? 0) - dt * 0.5);
  },
  die(e, dir) {
    e.dead = true;
    P.score += Math.round(e.T.score * scoreMult());
    finale(e);
    SFX.squelch();
    SFX.boom();
    splash(e.x, e.y, 40, 520);
    G.items.push({ kind: 'hp', x: e.x, y: e.y, z: 60, vz: 260, t: 0 });
  },
  states: {
    sdrop(e, dt) {
      e.vz -= 1600 * dt;
      e.z += e.vz * dt;
      if (e.z <= 0) {
        e.z = 0;
        G.shake = 14;
        SFX.squelch();
        SFX.thud();
        splash(e.x, e.y, 20);
        G.parts.push({ k: 'gring', x: e.x, y: e.y, t: 0, life: 0.45, s: 220, col: '#9dff4a' });
        go(e, 'recover', -0.4);
      }
    },
    rwind(e) {
      faceP(e);
      if (e.t > SLIME.rwind) {
        go(e, 'roll', 0, { hitDone: false, cdir: e.face, bounced: false });
        SFX.squelch();
      }
    },
    roll: {
      pin: true,
      tick(e, dt, s) {
        e.x += e.cdir * SLIME.roll * dt;
        e.y += clamp(s.dy, -1, 1) * 30 * dt;
        e.rollA += e.cdir * dt * 7;
        if (fxRandom() < 0.5) splash(e.x - e.cdir * 60, e.y, 1, 80);
        if (!e.hitDone && s.adx < 80 && s.ady < 40 && P.z < 100) {
          e.hitDone = true;
          hitPlayer(e.T.dmg, e.cdir, true);
        }
        const edge = (e.cdir > 0 && e.x > G.cam + W - 90) || (e.cdir < 0 && e.x < G.cam + 90);
        if (edge && !e.bounced) {
          // off the wall and back across, once
          e.cdir = -e.cdir;
          e.bounced = true;
          e.hitDone = false;
          G.shake = 6;
          SFX.squelch();
        } else if (e.t > SLIME.rollT || (edge && e.bounced))
          go(e, 'recover', 0, { rollCd: cd('roll') });
      },
    },
    jwind(e) {
      if (e.t <= SLIME.jwind) return;
      // where it lands: on the player half the time, else anywhere it likes
      const [x, y] = random() < 0.5 ? [P.x, P.y] : groundPoint(random);
      go(e, 'sjump', 0, { jx0: e.x, jy0: e.y, jx1: x, jy1: y });
      e.face = x >= e.x ? 1 : -1;
      SFX.squelch();
    },
    sjump(e) {
      const u = clamp(e.t / SLIME.jumpT, 0, 1);
      e.x = lerp(e.jx0, e.jx1, u);
      e.y = lerp(e.jy0, e.jy1, u);
      e.z = Math.sin(u * Math.PI) * 300;
      if (u < 1) return;
      e.z = 0;
      G.shake = 16;
      SFX.squelch();
      SFX.thud();
      splash(e.x, e.y, 24);
      G.parts.push({
        k: 'gring',
        x: e.x,
        y: e.y,
        t: 0,
        life: 0.45,
        s: SLIME.landR,
        col: '#9dff4a',
      });
      const ex = (P.x - e.x) / SLIME.landR,
        ey = (P.y - e.y) / (SLIME.landR * 0.38);
      if (ex * ex + ey * ey < 1 && P.z < 40) hitPlayer(SLIME.landDmg, P.x >= e.x ? 1 : -1, true);
      go(e, 'recover', -0.3, { jumpCd: cd('jump'), landT: 0.4 });
    },
    spwind(e) {
      faceP(e);
      if (e.t <= SLIME.spwind) return;
      // a zombie curled up in slime flies out of its mouth
      const x0 = e.x + e.face * 60,
        d = clamp(Math.abs(P.x - x0) * 0.8, 180, 420),
        f = 0.85;
      G.projs.push({
        k: 'zspit',
        x: x0,
        y: e.y,
        z: 120,
        vx: (e.face * d) / f,
        vy: clamp(P.y - e.y, -120, 120) / f,
        vz: (ACID.g * f) / 2 - 120 / f,
        rot: 0,
        life: 3,
        kind: random() < 0.7 ? 'zombie' : 'miner',
      });
      SFX.squelch();
      splash(x0, e.y - 120, 8, 160);
      go(e, 'recover', 0, { spitCd: cd('spit') });
    },
    quiver(e) {
      if (e.t > 0.35) go(e, 'chase');
    },
    ewind(e) {
      if (e.t <= E.wind) return;
      // she is still in front of it: swallowed
      const f = (P.x - e.x) * e.face;
      if (f > -30 && f < E.near + 30 && Math.abs(P.y - e.y) < 50 && swallow(e)) {
        go(e, 'engulf', 0, { biteT: 0 });
        SFX.squelch();
        splash(e.x, e.y, 14);
      } else go(e, 'recover', 0, { engulfCd: rnd(...E.cd) });
    },
    engulf(e, dt) {
      // she broke out by mashing: it lets her go
      if (P.grabber !== e) {
        e.holdsP = false;
        go(e, 'recover', -0.2, { engulfCd: rnd(...E.cd) });
        splash(e.x, e.y, 10);
        return;
      }
      Object.assign(P, { x: e.x, y: e.y - 1, z: 0 });
      if ((e.biteT -= dt) <= 0) {
        e.biteT = E.tick;
        acidBite(E.dmg);
      }
      if (e.t > E.hold) {
        // spat out, thrown
        e.holdsP = false;
        P.grabber = null;
        P.state = 'idle';
        P.inv = 0;
        hitPlayer(E.spit, e.face, true);
        splash(e.x, e.y, 16, 360);
        SFX.squelch();
        go(e, 'recover', 0, { engulfCd: rnd(...E.cd) });
      }
    },
    stagger: {
      pin: true,
      tick(e, dt) {
        e.x += e.vx * dt;
        e.vx *= Math.pow(0.02, dt);
        if (fxRandom() < 0.4) splash(e.x, e.y, 1, 100);
        if (e.t > SLIME.stagger) go(e, 'chase', 0, { cd: 0.4 });
      },
    },
  },
});

// --- the slimelets ---------------------------------------------------------------------------------

defineFoe('slimelet', {
  draw: drawSlime,
  corpse: true,
  timers: ['backT'],
  moves: [
    {
      // after a while it crawls back to its mother; reaching her, it heals her
      when: (e) => e.backT <= 0 && e.mother && !e.mother.dead && !e.mother.dying,
      go: (e) => go(e, 'kback'),
    },
  ],
  states: {
    kback(e, dt) {
      const m = e.mother;
      if (!m || m.dead || m.dying) return go(e, 'chase');
      e.face = m.x >= e.x ? 1 : -1;
      moveTo(e, m.x, m.y, e.T.speed * 0.8, dt);
      if (Math.abs(m.x - e.x) < 60 && Math.abs(m.y - e.y) < 30) {
        m.hp = Math.min(m.T.hp, m.hp + SLIME.kid.heal);
        e.dead = true;
        splash(m.x, m.y, 10);
        SFX.squelch();
      }
    },
  },
});
