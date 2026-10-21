// The wild things of Frostfang Pass:
//   the harpy (TYPES.harpy, HARPY): a bird-woman with a skull for a face and ragged wings; she
//     hovers out of reach of a blow from the ground, dives at the heroine with her talons and
//     sits on the ground a moment after (a blow reaches her there); any blow in the air brings
//     her down;
//   the grey wolf (TYPES.wolf, WOLF): quick, it leaps and bites, in packs; it dies whole;
//   the thief gnome (TYPES.gnome, GNOME), Golden Axe's: he runs across the screen with a sack
//     of blue magic pots and takes no side; every blow shakes a pot (or a joint of meat) out of
//     the sack, and when it is empty he runs off crying.
// The wolf is drawn by drawWolf, which the frost wolf (frostwolf.js) shares.
import { GNOME, HARPY, OL, TAU, W, WOLF } from '../config.js';
import { clamp, fxRandom, fxRnd, random, rnd } from '../util.js';
import { G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { hitPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go, moveTo } from './kit.js';

const fillOl = (c, lw = 2.4) => {
  ctx.fillStyle = c;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = OL;
  ctx.stroke();
};
function limb(pts, w, c) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [lw, cc] of [
    [w + 4.5, OL],
    [w, c],
  ]) {
    ctx.strokeStyle = cc;
    ctx.lineWidth = lw;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
}
const onScreen = (e) => e.x > G.cam + 40 && e.x < G.cam + W - 40;

// --- the harpy --------------------------------------------------------------------------------

const fly = (e) => go(e, e.z > HARPY.z * 0.8 ? 'hfly' : 'hup', 0, { engage: false });
defineFoe('harpy', {
  walksIn: true,
  spawn(e) {
    e.z = HARPY.z;
    go(e, 'hfly');
  },
  // back on her feet after a fall: up into the air again
  moves: [{ when: () => true, go: fly }],
  attacks: ['hswoopw', 'hswoop'],
  band: (e) => [e.z, e.z + 100],
  // a blow in the air brings her down out of the sky
  guard(e, knock, src, dir) {
    if (e.z < 30 || knock) return false;
    go(e, 'air', 0, { vx: dir * 90, vz: 0 });
    return true;
  },
  states: {
    hup(e, dt) {
      faceP(e);
      e.z += (HARPY.z - e.z) * Math.min(1, dt * 3) + 40 * dt;
      if (e.z >= HARPY.z * 0.9) go(e, 'hfly');
    },
    hfly(e, dt, s) {
      faceP(e);
      e.z += (HARPY.z + Math.sin(e.anim * 2.4) * 14 - e.z) * Math.min(1, dt * 3);
      const side = e.x >= P.x ? 1 : -1;
      moveTo(e, P.x + side * HARPY.keep, P.y - 10, e.T.speed, dt);
      if (Math.floor(e.anim * 2.6) !== Math.floor((e.anim - dt) * 2.6) && fxRandom() < 0.3)
        SFX.flap();
      if (e.cd <= 0 && !s.pdown && onScreen(e) && s.ady < 120) {
        go(e, 'hswoopw', 0, { tx: P.x, ty: P.y });
        SFX.wail();
      }
    },
    hswoopw(e, dt) {
      faceP(e);
      e.z += 60 * dt;
      e.tx += (P.x - e.tx) * Math.min(1, dt * 6);
      e.ty += (P.y - e.ty) * Math.min(1, dt * 6);
      if (e.t > HARPY.wind) {
        const d = Math.hypot(e.tx - e.x, e.ty - e.y);
        go(e, 'hswoop', 0, {
          x0: e.x,
          y0: e.y,
          z0: e.z,
          dur: clamp(d / HARPY.swoop, 0.35, 0.9),
          hitDone: false,
        });
      }
    },
    hswoop: {
      pin: true,
      tick(e) {
        const u = clamp(e.t / e.dur, 0, 1),
          k = u * u * (3 - 2 * u);
        e.face = e.tx >= e.x0 ? 1 : -1;
        e.x = e.x0 + (e.tx - e.x0) * k;
        e.y = e.y0 + (e.ty - e.y0) * k;
        e.z = e.z0 * (1 - k) + HARPY.low * k;
        if (
          !e.hitDone &&
          u > 0.4 &&
          Math.abs(P.x - e.x) < 54 &&
          Math.abs(P.y - e.y) < 26 &&
          P.z < e.z + 70 &&
          hitPlayer(HARPY.dmg, e.face, false)
        )
          e.hitDone = true;
        if (u >= 1) {
          e.z = 0;
          dust(e.x, e.y, 4);
          go(e, 'hperch');
        }
      },
    },
    hperch(e) {
      faceP(e);
      if (e.t > HARPY.perch) {
        e.cd = rnd(...e.T.cd);
        go(e, 'hup');
        SFX.flap();
      }
    },
  },
  draw: drawHarpy,
});
function drawHarpy(e) {
  const T = e.T,
    fl = e.flash > 0,
    col = fl ? '#fff' : T.col,
    feath = fl ? '#fff' : '#5a3a52',
    feath2 = fl ? '#eee' : '#3e2638',
    sx = e.x - G.cam,
    sy = e.y - e.z,
    down = ['down', 'getup', 'corpse', 'fall'].includes(e.state),
    perched = e.state === 'hperch' || e.state === 'hurt' || down,
    swoop = e.state === 'hswoop',
    flapK = perched ? 0.3 : swoop ? 0.15 : 1,
    flap = Math.sin(e.anim * (swoop ? 4 : 11)) * flapK;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(e.face, 1);
  if (e.state === 'air') ctx.rotate(-0.6 - e.t * 2);
  if (down) {
    ctx.translate(0, -10);
    ctx.rotate(-1.3);
  }
  const by = perched ? -56 : -40;
  const wing = (dir, c) => {
    // a ragged wing: bones and long feathers, raised and lowered as she beats it
    const a = -0.6 + flap * 0.9 * dir;
    ctx.save();
    ctx.translate(-4, by - 18);
    ctx.rotate(a - (swoop ? 0.9 : 0));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-30, -36);
    ctx.lineTo(-74, -40);
    for (let k = 0; k < 5; k++) ctx.lineTo(-70 + k * 15, -30 + (k % 2) * 12 + k * 4);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    fillOl(c, 2.2);
    limb(
      [
        [0, 0],
        [-30, -36],
        [-74, -40],
      ],
      3,
      col,
    );
    ctx.restore();
  };
  wing(-1, feath2);
  // legs and talons (stretched out forward in the dive)
  const lx = swoop ? 22 : 4,
    ly = perched ? 0 : by + 30;
  limb(
    [
      [-2, by + 10],
      [lx * 0.6 + 4, by + 22],
      [lx, ly],
    ],
    4,
    '#d9a641',
  );
  for (const a of [-0.6, 0, 0.6])
    limb(
      [
        [lx, ly],
        [lx + 10 * Math.cos(a), ly + 6 * Math.sin(a) + 2],
      ],
      2,
      '#e8e0c8',
    );
  // the feathered body
  ctx.beginPath();
  ctx.ellipse(0, by, 15, 24, 0.2, 0, TAU);
  fillOl(feath);
  ctx.fillStyle = col; // ribs showing through
  ctx.fillRect(2, by - 14, 9, 3);
  ctx.fillRect(3, by - 8, 9, 3);
  ctx.fillRect(3, by - 2, 8, 3);
  // the head: a skull, a mane of black hair streaming behind
  const hx = 8,
    hy = by - 36;
  ctx.beginPath();
  ctx.moveTo(hx - 6, hy - 10);
  ctx.quadraticCurveTo(hx - 36, hy - 4 + flap * 4, hx - 44, hy + 22 + flap * 6);
  ctx.quadraticCurveTo(hx - 24, hy + 10, hx - 6, hy + 8);
  ctx.closePath();
  fillOl(fl ? '#fff' : '#1e1626', 2);
  ctx.beginPath();
  ctx.arc(hx, hy, 11, 0, TAU);
  fillOl(col);
  ctx.beginPath();
  ctx.moveTo(hx + 6, hy + 4);
  ctx.lineTo(hx + 16, hy + 8);
  ctx.lineTo(hx + 6, hy + 10);
  ctx.closePath();
  fillOl(col, 1.8);
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.ellipse(hx + 4, hy - 2, 3.4, 4, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = T.eye;
  ctx.beginPath();
  ctx.arc(hx + 4.5, hy - 2, 1.6, 0, TAU);
  ctx.fill();
  wing(1, feath);
  ctx.restore();
}

// --- the grey wolf ------------------------------------------------------------------------------

defineFoe('wolf', {
  walksIn: true,
  corpse: true,
  init: { leapCd: [1, 2.5] },
  timers: ['leapCd'],
  moves: [
    {
      when: (e, s) =>
        e.leapCd <= 0 &&
        !s.pdown &&
        s.adx > WOLF.leap.min &&
        s.adx < WOLF.leap.max &&
        s.ady < 40 &&
        onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'wlw', 0, { engage: false });
        SFX.dash();
      },
    },
  ],
  attacks: ['wlw', 'wl'],
  states: {
    wlw(e) {
      faceP(e);
      if (e.t > WOLF.leap.wind)
        go(e, 'wl', 0, { x0: e.x, y0: e.y, tx: P.x - e.face * 40, ty: P.y, hitDone: false });
    },
    wl: {
      pin: true,
      tick(e) {
        const L = WOLF.leap,
          u = clamp(e.t / L.air, 0, 1);
        e.x = e.x0 + (e.tx - e.x0) * u;
        e.y = e.y0 + (e.ty - e.y0) * u;
        e.z = 4 * L.h * u * (1 - u);
        if (
          !e.hitDone &&
          u > 0.5 &&
          Math.abs(P.x - (e.x + e.face * 40)) < 50 &&
          Math.abs(P.y - e.y) < 24 &&
          P.z < 80 &&
          hitPlayer(L.dmg, e.face, false)
        )
          e.hitDone = true;
        if (u >= 1) {
          e.z = 0;
          dust(e.x, e.y, 4);
          go(e, 'recover', 0, { leapCd: rnd(...L.cd) });
        }
      },
    },
  },
  draw: (e) => drawWolf(e),
});

/**
 * A wolf, drawn facing +x with its paws on the ground at the origin: `k` its size (1 for a grey
 * wolf), `C` its colours ({ fur, dk, belly, eye }), `frost` the frost wolf's touches (ice
 * crystals on its back, a frosty breath). Its pose comes from its state: walking (its legs
 * with e.walkT), crouched to spring, stretched in a leap, its jaws open in a bite, reeling,
 * thrown, lying on its side.
 */
export function drawWolf(e, k = 1, C = null, frost = null) {
  const T = e.T,
    fl = e.flash > 0,
    fur = fl ? '#fff' : (C?.fur ?? T.col),
    dk = fl ? '#ddd' : (C?.dk ?? T.dk),
    belly = fl ? '#fff' : (C?.belly ?? '#c9cbd2'),
    st = e.state,
    sx = e.x - G.cam,
    sy = e.y - e.z,
    br = Math.sin(e.anim * 3) * 1.5;
  const crouch = ['wlw', 'windup', 'fwbitew', 'fwleapw', 'fwbreathw', 'fwswipew'].includes(st)
      ? 1
      : 0,
    leap = ['wl', 'fwbite', 'fwup', 'fwfall'].includes(st),
    bite = st === 'attack' || st === 'fwbite' || (st === 'wl' && e.t > 0.2),
    swipe = st === 'fwswipe',
    lying = ['down', 'corpse', 'fall', 'fwdie'].includes(st) && !(st === 'fall' && e.z > 20),
    reel = st === 'hurt' || st === 'getup',
    howl = st === 'fwhowl',
    breath = st === 'fwbreath' || st === 'fwbreathw';
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(e.face * k, k);
  if (st === 'air' || (st === 'fall' && e.z > 20)) ctx.rotate(-0.4 - e.t * 3);
  if (lying) {
    ctx.translate(0, -8);
    ctx.rotate(0.12);
    ctx.scale(1, 0.55);
  }
  if (reel) ctx.rotate(-0.15);
  const h = 54 - crouch * 14,
    mv = e.moving && !leap ? 1 : 0,
    wk = e.walkT * 1.3;
  /** A shaggy outline: an ellipse whose edge breaks into tufts of fur on its top and bottom. */
  const shag = (cx, cy, rx, ry, rot, n, c, tuft = 0.12) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU,
        edge = Math.abs(Math.sin(a)) > 0.5 ? (i % 2 ? 1 + tuft : 1 - tuft * 0.3) : 1;
      ctx.lineTo(Math.cos(a) * rx * edge, Math.sin(a) * ry * edge);
    }
    ctx.closePath();
    fillOl(c);
    ctx.restore();
  };
  /** A leg: the haunch or the shoulder, the limb bending at the elbow (or backward at the
   *  hock, `hind`), the paw. */
  const leg = (x, ph, c, hind) => {
    ctx.beginPath();
    ctx.ellipse(x, -h + 2, hind ? 17 : 13, hind ? 22 : 18, hind ? 0.3 : -0.1, 0, TAU);
    fillOl(c);
    let knee, paw;
    if (leap) {
      knee = hind ? [x - 16, -h + 26] : [x + 20, -h + 22];
      paw = hind ? [x - 38, -h + 32] : [x + 40, -h + 26];
    } else {
      const sw = Math.cos(ph) * 15 * mv,
        lift = Math.max(0, Math.sin(ph)) * 10 * mv;
      knee = hind
        ? [x - 10 + sw * 0.3, -h * 0.42 - lift * 0.5]
        : [x + 4 + sw * 0.4, -h * 0.5 - lift * 0.5];
      paw = [x + sw + (hind ? -4 : 2), -lift];
    }
    if (swipe && !hind && x > 0) {
      // the paw swung round in front
      const u = clamp(e.t / 0.18, 0, 1);
      knee = [x + 24, -h - 10 + u * 20];
      paw = [x + 54, -h + 10 + u * 30];
    }
    limb([[x, -h + 10], knee], hind ? 10 : 9, c);
    limb([knee, paw], 6.5, c);
    ctx.beginPath();
    ctx.ellipse(paw[0] + 4, paw[1] - 2, 9, 5, 0, 0, TAU);
    fillOl(c, 2);
  };
  leg(32, wk + Math.PI, dk, false);
  leg(-30, wk, dk, true);
  // the tail: a bushy brush, up when it howls, down when it reels
  ctx.save();
  ctx.translate(-48, -h - 4);
  ctx.rotate(howl ? -0.9 : reel || lying ? 0.7 : 0.25 + Math.sin(e.anim * 5) * 0.1);
  shag(-26, 0, 30, 10, 0, 14, dk, 0.25);
  ctx.restore();
  // the body: shaggy fur, a pale belly
  shag(0, -h - 6 + br, 54, 21, crouch ? 0.12 : -0.04, 22, fur, 0.1);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -h - 6 + br, 52, 20, crouch ? 0.12 : -0.04, 0, TAU);
  ctx.clip();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(8, -h + 12 + br, 46, 12, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = fl ? '#fff' : dk;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const x = -34 + i * 12;
    ctx.moveTo(x, -h - 20 + br);
    ctx.lineTo(x + 6, -h - 12 + br);
  }
  ctx.stroke();
  ctx.restore();
  // the frost wolf's crystals of ice along its back
  if (frost)
    for (let i = 0; i < 6; i++) {
      const x = -36 + i * 14,
        tall = 12 + (i % 2) * 8 + (frost.big ?? 0);
      ctx.beginPath();
      ctx.moveTo(x - 6, -h - 22 + br);
      ctx.lineTo(x + 2, -h - 22 - tall + br);
      ctx.lineTo(x + 7, -h - 22 + br);
      ctx.closePath();
      fillOl(fl ? '#fff' : '#bff4ff', 1.6);
    }
  leg(40, wk, fur, false);
  leg(-24, wk + Math.PI, fur, true);
  // the head: up and back in a howl, low as it crouches, thrust out in a bite
  ctx.save();
  ctx.translate(50, -h - 16 + br + crouch * 8);
  ctx.rotate(howl ? -0.9 : crouch ? 0.25 : bite ? -0.1 : 0);
  if (bite) ctx.translate(8, 0);
  // the ruff of fur round the neck (frosted on the frost wolf)
  shag(-8, 6, 20, 24, 0.3, 16, frost ? (fl ? '#fff' : '#f4fbff') : fur, 0.22);
  // ears
  for (const [x, c] of [
    [-8, dk],
    [0, fur],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x - 6, -10);
    ctx.lineTo(x - 3, -32);
    ctx.lineTo(x + 7, -10);
    ctx.closePath();
    fillOl(c, 2);
  }
  // the lower jaw: it drops open in a bite, a howl or the breath
  const open = bite ? 11 : howl ? 9 : breath ? 8 : 0;
  ctx.beginPath();
  ctx.moveTo(-2, 8);
  ctx.lineTo(36, 9 + open);
  ctx.lineTo(33, 14 + open);
  ctx.lineTo(4, 15);
  ctx.closePath();
  fillOl(dk, 2);
  // the skull and the long snout, the black nose
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.quadraticCurveTo(-4, -16, 10, -13);
  ctx.lineTo(22, -6);
  ctx.lineTo(42, -1);
  ctx.quadraticCurveTo(46, 3, 42, 7);
  ctx.lineTo(8, 10);
  ctx.quadraticCurveTo(-10, 10, -14, -8);
  ctx.closePath();
  fillOl(fur);
  ctx.fillStyle = belly; // a pale muzzle
  ctx.beginPath();
  ctx.moveTo(20, 2);
  ctx.lineTo(40, 3);
  ctx.lineTo(38, 7);
  ctx.lineTo(16, 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.ellipse(43, 1, 3.4, 2.6, 0, 0, TAU);
  ctx.fill();
  if (open) {
    ctx.fillStyle = '#fff';
    for (const x of [14, 22, 30]) {
      ctx.beginPath();
      ctx.moveTo(x, 9);
      ctx.lineTo(x + 2, 13);
      ctx.lineTo(x + 4, 9);
      ctx.fill();
    }
  }
  // the eye, narrowed and glowing
  ctx.fillStyle = fl ? '#fff' : (C?.eye ?? T.eye);
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = frost ? 12 : 4;
  ctx.beginPath();
  ctx.moveTo(4, -6);
  ctx.lineTo(15, -6);
  ctx.lineTo(11, -2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  ctx.restore();
}

// --- the thief gnome ---------------------------------------------------------------------------

/** A pot (or a joint of meat) shaken out of his sack. */
function dropPot(e, dir) {
  e.left--;
  P.score += 100;
  G.items.push({
    kind: random() < GNOME.hp ? 'hp' : 'potion',
    x: e.x,
    y: e.y + 4,
    z: 40,
    vz: 300,
    vx: -dir * rnd(40, 120),
    t: 0,
  });
  SFX.squeak();
  SFX.pick();
}
const run = (e) => go(e, e.left > 0 ? 'grun' : 'gflee', 0, { engage: false });
defineFoe('gnome', {
  walksIn: true,
  spawn(e, side) {
    e.neutral = true;
    e.left = GNOME.drops;
    e.dir = side > 0 ? -1 : 1;
    e.face = e.dir;
    run(e);
  },
  moves: [{ when: () => true, go: run }],
  immune: (e) => e.state === 'ghurt' && e.t < 0.35,
  // a blow shakes a pot out of the sack; he is never hurt
  onHit(e, dmg, dir) {
    e.hp = e.T.hp;
    if (G.lastFoe === e) G.lastFoe = null;
    if (e.left > 0) dropPot(e, dir);
    go(e, 'ghurt', 0, { vx: dir * 160, z: 0 });
    return true;
  },
  states: {
    grun(e, dt) {
      e.face = e.dir;
      e.x += e.dir * e.T.speed * dt;
      e.moving = true;
      e.walkT += dt * 14;
      if ((e.dir > 0 && e.x > G.cam + W + 80) || (e.dir < 0 && e.x < G.cam - 80)) e.dead = true;
    },
    ghurt: {
      tick(e, dt) {
        e.x += e.vx * dt;
        e.vx *= Math.pow(0.02, dt);
        e.z = Math.max(0, 40 * Math.sin((e.t / 0.4) * Math.PI));
        if (e.t > 0.45) {
          e.z = 0;
          // emptied: off he runs, the other way, crying
          if (e.left <= 0) e.dir = P.x > e.x ? -1 : 1;
          run(e);
        }
      },
    },
    gflee(e, dt) {
      e.face = e.dir;
      e.x += e.dir * GNOME.flee * dt;
      e.moving = true;
      e.walkT += dt * 20;
      if (fxRandom() < 0.2)
        G.parts.push({
          k: 'dot',
          x: e.x - e.dir * 6,
          y: e.y - 62,
          vx: -e.dir * fxRnd(40, 90),
          vy: fxRnd(-80, -30),
          g: 400,
          t: 0,
          life: 0.4,
          s: 3,
          col: '#8fd8ff',
        });
      if (e.x > G.cam + W + 80 || e.x < G.cam - 80) e.dead = true;
    },
  },
  draw: drawGnome,
});
function drawGnome(e) {
  const fl = e.flash > 0,
    sx = e.x - G.cam,
    sy = e.y - e.z,
    k = e.T.scale,
    run = e.moving ? Math.sin(e.walkT) : 0;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(e.face * k, k);
  if (e.state === 'ghurt') ctx.rotate(-0.3);
  // legs pattering
  limb(
    [
      [-4, -26],
      [-6 - run * 10, 0],
    ],
    5,
    fl ? '#fff' : '#5a3a26',
  );
  limb(
    [
      [4, -26],
      [6 + run * 10, 0],
    ],
    5,
    fl ? '#fff' : '#6a4630',
  );
  // the sack over his shoulder (it shrinks as it empties)
  const sz = 0.55 + 0.15 * e.left;
  ctx.beginPath();
  ctx.ellipse(-20, -56, 26 * sz, 30 * sz, -0.3, 0, TAU);
  fillOl(fl ? '#fff' : '#c9a46a');
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.fillRect(-28, -60, 12, 2);
  if (e.left > 0) {
    ctx.beginPath();
    ctx.arc(-12, -78 * Math.min(1, sz + 0.2), 6, 0, TAU);
    fillOl(fl ? '#fff' : '#3f7ae0', 1.6);
  }
  // the body in a green tunic, a belt
  ctx.beginPath();
  ctx.ellipse(0, -40, 15, 18, 0, 0, TAU);
  fillOl(fl ? '#fff' : '#3f8a4a');
  ctx.fillStyle = OL;
  ctx.fillRect(-14, -34, 28, 4);
  // the head: a big nose, a white beard, a tall blue hood
  ctx.beginPath();
  ctx.arc(4, -64, 11, 0, TAU);
  fillOl(fl ? '#fff' : '#f2c9a0');
  ctx.beginPath();
  ctx.moveTo(-4, -60);
  ctx.quadraticCurveTo(6, -36, 16, -58);
  ctx.closePath();
  fillOl(fl ? '#fff' : '#f4f2ea', 2);
  ctx.beginPath();
  ctx.ellipse(15, -64, 5, 4, 0, 0, TAU);
  fillOl(fl ? '#fff' : '#e89a7a', 1.6);
  ctx.beginPath();
  ctx.moveTo(-10, -66);
  ctx.quadraticCurveTo(-4, -96, -22, -104 + run * 3);
  ctx.quadraticCurveTo(4, -92, 16, -68);
  ctx.closePath();
  fillOl(fl ? '#fff' : '#3f5ac2', 2);
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.arc(9, -67, 1.8, 0, TAU);
  ctx.fill();
  ctx.restore();
}
