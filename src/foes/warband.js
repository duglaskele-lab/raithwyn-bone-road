// The skeleton warband of Frostfang Pass, after Golden Axe's foes:
//   the bandit (TYPES.bandit): a horned helmet and a spiked club (every second one a hooded
//     one with a mace); it rides the beasts (see beasts.js) and climbs back on one left free;
//   the amazon (TYPES.amazon, AMAZON): a long spear she thrusts, a leap down on the heroine
//     from a little way off, and a back flip away from a blow; she rides too;
//   the death knight (TYPES.knight, KNIGHT): plate armour and a great helm with a plume, a round
//     shield that turns light blows and shots from in front, a sword, and a running thrust;
//   the bone giant (TYPES.giant, GIANT): a huge skeleton with a stone maul; the ground shakes
//     where it strikes, and from further off it sends a shock wave along the ground.
import { AMAZON, GIANT, KNIGHT, OL, STRONG, TAU } from '../config.js';
import { clamp, random, rnd } from '../util.js';
import { G, P } from '../state.js';
import { ctx } from '../gfx.js';
import { SFX } from '../audio.js';
import { dust, spark } from '../fx.js';
import { hitPlayer } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go, inFront } from './kit.js';
import { remount, riderHit } from './beasts.js';

const fill = (c, fl, lw = 2.4) => {
  ctx.fillStyle = fl ? '#fff' : c;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = OL;
  ctx.stroke();
};
/** A weapon in the hand: drawn along the forearm (rotated with it), from the grip on. */
function inHand(c, draw) {
  const { h, wa } = c;
  ctx.save();
  ctx.translate(h[0], h[1]);
  ctx.rotate(-wa);
  ctx.lineJoin = 'round';
  draw();
  ctx.restore();
}
/** A shaft: a dark line under a coloured one. */
function shaft(x0, y0, x1, y1, w, col, fl) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = w + 4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = fl ? '#fff' : col;
  ctx.lineWidth = w;
  ctx.stroke();
}
// The pose in the saddle (a rider of a beast): sitting, legs astride, the weapon held up.
const SADDLE = {
  set: {
    hipH: 30,
    lean: 0.12,
    lF: [1.25, 0.2],
    lB: [1.05, 0.1],
    aB: [0.6, 1.2],
    aF: (e, k) => [0.6 + 0.05 * k.br, 2.2],
  },
};

// --- the bandit ----------------------------------------------------------------------------------

/** The horned helmet (or, for the hooded one, a hood). */
function banditHead(c) {
  const { e, fl } = c;
  if (e.hood) {
    ctx.beginPath();
    ctx.moveTo(-17, 10);
    ctx.quadraticCurveTo(-20, -18, 2, -20);
    ctx.quadraticCurveTo(18, -18, 16, -6);
    ctx.lineTo(10, -8);
    ctx.quadraticCurveTo(2, -12, -6, -4);
    ctx.lineTo(-8, 14);
    ctx.closePath();
    fill('#5a3f6e', fl);
    return;
  }
  // horns
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 6 - 2, -12);
    ctx.quadraticCurveTo(s * 20 - 2, -16, s * 20 + 2, -32);
    ctx.quadraticCurveTo(s * 14, -20, s * 2, -8);
    ctx.closePath();
    fill('#efe6cf', fl, 2);
  }
  // the iron dome, a rim and a nose guard
  ctx.beginPath();
  ctx.arc(1, -3, 15, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath();
  fill('#8a8f9a', fl);
  ctx.beginPath();
  ctx.rect(-15, -5, 32, 5);
  fill('#6a5040', fl, 2);
  ctx.beginPath();
  ctx.rect(9, -4, 4, 11);
  fill('#8a8f9a', fl, 1.8);
}
/** A leather strap across the ribs and a fur on the shoulder. */
function banditTorso(c) {
  const { e, fl, neck } = c;
  ctx.save();
  ctx.translate(neck[0] * 0.64, neck[1] * 0.64);
  ctx.rotate(c.o.lean);
  ctx.beginPath();
  ctx.moveTo(-10, -18);
  ctx.lineTo(-4, -20);
  ctx.lineTo(16, 16);
  ctx.lineTo(10, 18);
  ctx.closePath();
  fill('#6a4630', fl, 2);
  ctx.beginPath();
  ctx.ellipse(-2, -20, 14, 8, -0.2, 0, TAU);
  fill(e.hood ? '#4a3a58' : '#8a6a46', fl, 2);
  ctx.restore();
  // a belt and a loincloth
  ctx.beginPath();
  ctx.rect(-12, -4, 26, 7);
  fill('#4a3424', fl, 2);
  ctx.beginPath();
  ctx.moveTo(-8, 3);
  ctx.lineTo(10, 3);
  ctx.lineTo(6, 22);
  ctx.lineTo(-6, 22);
  ctx.closePath();
  fill(e.hood ? '#5a3f6e' : '#8a3a2a', fl, 2);
}
function banditWeapon(c) {
  const { e, fl } = c;
  inHand(c, () => {
    if (e.hood) {
      // a mace: a short haft, a spiked iron ball
      shaft(0, -6, 0, 34, 5, '#6a4630', fl);
      ctx.beginPath();
      ctx.arc(0, 42, 11, 0, TAU);
      fill('#7d838e', fl);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 10, 42 + Math.sin(a) * 10);
        ctx.lineTo(Math.cos(a + 0.2) * 17, 42 + Math.sin(a + 0.2) * 17);
        ctx.lineTo(Math.cos(a + 0.45) * 10, 42 + Math.sin(a + 0.45) * 10);
        fill('#b8bec8', fl, 1.6);
      }
      return;
    }
    // a club, thick at the end, with nails through it
    ctx.beginPath();
    ctx.moveTo(-3, -8);
    ctx.lineTo(3, -8);
    ctx.lineTo(8, 42);
    ctx.quadraticCurveTo(0, 50, -8, 42);
    ctx.closePath();
    fill('#8a5a32', fl);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 1.6;
    for (const [a, b] of [
      [-8, 30],
      [8, 24],
      [-7, 40],
      [8, 38],
    ]) {
      ctx.beginPath();
      ctx.moveTo(a, b);
      ctx.lineTo(a + Math.sign(a) * 6, b - 2);
      ctx.stroke();
    }
  });
}
defineFoe('bandit', {
  // every second one the hooded one with the mace
  spawn(e) {
    e.hood = G.bandits++ % 2 === 1;
  },
  moves: [remount],
  onHit: (e, dmg, dir) => riderHit(e, dir),
  look: { head: banditHead, torso: banditTorso, weapon: banditWeapon },
  pose: {
    guard: { chase: { set: { aF: (e, k) => [0.4, 2.1 + 0.05 * k.br] } } },
    states: { saddle: SADDLE },
  },
  attackTick(e) {
    if (e.t > 0.06 && !e.dusted) {
      e.dusted = true;
      dust(e.x + e.face * e.T.reach * 0.8, e.y, 4);
    }
  },
  on: { windup: (e) => (e.dusted = false) },
});

// --- the amazon ----------------------------------------------------------------------------------

function amazonHead(c) {
  const { e, fl } = c;
  // the long braid of hair swinging behind her head
  const sw = Math.sin(e.anim * 4) * 3;
  ctx.beginPath();
  ctx.moveTo(-10, -12);
  ctx.quadraticCurveTo(-26, 0 + sw, -22, 26 + sw);
  ctx.quadraticCurveTo(-18, 34 + sw, -14, 24 + sw);
  ctx.quadraticCurveTo(-16, 4, -4, -6);
  ctx.closePath();
  fill('#b0402a', fl, 2);
  ctx.beginPath();
  ctx.arc(1, -4, 15, Math.PI * 0.9, Math.PI * 1.9);
  ctx.quadraticCurveTo(4, -10, -12, -2);
  ctx.closePath();
  fill('#b0402a', fl, 2);
  // a bronze circlet with a feather
  ctx.beginPath();
  ctx.rect(-12, -11, 26, 4);
  fill('#d9a641', fl, 1.6);
  ctx.beginPath();
  ctx.moveTo(-8, -10);
  ctx.quadraticCurveTo(-18, -30, -6, -36);
  ctx.quadraticCurveTo(-8, -22, -4, -10);
  ctx.closePath();
  fill('#f2f0e6', fl, 1.6);
}
function amazonTorso(c) {
  const { fl, neck } = c;
  ctx.save();
  ctx.translate(neck[0] * 0.64, neck[1] * 0.64);
  ctx.rotate(c.o.lean);
  // bronze plates over the chest
  for (const y of [-12, -2]) {
    ctx.beginPath();
    ctx.ellipse(8, y, 9, 6, 0.2, 0, TAU);
    fill('#d9a641', fl, 2);
  }
  ctx.restore();
  // a skirt of leather strips
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.rect(-12 + k * 6.5, -2, 6, 20 - (k % 2) * 4);
    fill(k % 2 ? '#7a4a26' : '#8a5a32', fl, 1.8);
  }
  ctx.beginPath();
  ctx.rect(-13, -5, 28, 5);
  fill('#d9a641', fl, 1.8);
}
function spear(c) {
  const { fl } = c;
  inHand(c, () => {
    // held along the forearm, point forward past the hand
    shaft(0, -40, 0, 64, 4, '#8a6a46', fl);
    ctx.beginPath();
    ctx.moveTo(0, 62);
    ctx.lineTo(7, 74);
    ctx.lineTo(0, 92);
    ctx.lineTo(-7, 74);
    ctx.closePath();
    fill('#c9ccd2', fl, 2);
  });
}
defineFoe('amazon', {
  init: { leapCd: [1.5, 3] },
  timers: ['leapCd'],
  moves: [
    remount,
    {
      when: (e, s) =>
        e.leapCd <= 0 &&
        !s.pdown &&
        s.adx > AMAZON.leap.min &&
        s.adx < AMAZON.leap.max &&
        s.ady < 50,
      go(e) {
        faceP(e);
        go(e, 'aleapw', 0, { engage: false });
      },
    },
  ],
  attacks: ['aleapw', 'aleap'],
  onHit: (e, dmg, dir) => riderHit(e, dir),
  // a light blow may make her flip away out of reach
  guard(e, knock, src, dir) {
    if (knock || e.state === 'air' || random() > AMAZON.flip) return false;
    go(e, 'aflip', 0, { x0: e.x, fx: e.x + dir * AMAZON.dist });
    SFX.jump();
    return true;
  },
  states: {
    aleapw(e) {
      faceP(e);
      if (e.t > AMAZON.leap.wind) {
        go(e, 'aleap', 0, { x0: e.x, y0: e.y, tx: P.x - e.face * 30, ty: P.y, hitDone: false });
        SFX.jump();
      }
    },
    aleap: {
      pin: true,
      tick(e) {
        const L = AMAZON.leap,
          u = clamp(e.t / L.air, 0, 1);
        e.x = e.x0 + (e.tx - e.x0) * u;
        e.y = e.y0 + (e.ty - e.y0) * u;
        e.z = 4 * L.h * u * (1 - u);
        if (u >= 1) {
          e.z = 0;
          dust(e.x, e.y, 6);
          if (Math.abs(P.x - (e.x + e.face * 30)) < L.r && Math.abs(P.y - e.y) < 26 && P.z < 60)
            hitPlayer(L.dmg, e.face, true);
          go(e, 'recover', 0, { leapCd: rnd(...L.cd) });
        }
      },
    },
    aflip: {
      pin: true,
      tick(e) {
        const u = clamp(e.t / AMAZON.flipT, 0, 1);
        e.x = e.x0 + (e.fx - e.x0) * u;
        e.z = 4 * 70 * u * (1 - u);
        if (u >= 1) {
          e.z = 0;
          dust(e.x, e.y, 3);
          go(e, 'chase', 0, { cd: Math.max(e.cd, 0.3) });
        }
      },
    },
  },
  look: { head: amazonHead, torso: amazonTorso, weapon: spear },
  pose: {
    // the spear levelled at her
    guard: { chase: { set: { aF: (e, k) => [1.0 + 0.04 * k.br, 1.55], aB: [0.7, 1.4] } } },
    states: {
      saddle: SADDLE,
      aleapw: { set: { lF: [1.0, -0.8], lB: [-0.9, -1.5], lean: 0.45, aF: [2.6, 2.8] } },
      aleap: { set: { lF: [0.9, -0.3], lB: [-0.2, -1.2], lean: 0.2, aF: [2.2, 1.0] } },
      aflip: {
        set: { lF: [1.6, -0.6], lB: [1.3, -0.9], aF: [2.4, 2.2], aB: [2.2, 2.0], hipH: 50 },
        fn: (o, e) => (o.rot = (-e.t / AMAZON.flipT) * TAU),
      },
    },
  },
});

// --- the death knight ----------------------------------------------------------------------------

/** Is its shield between it and a blow pushing it `dir`-wards? */
const shieldUp = (e, dir) =>
  dir === -e.face && ['chase', 'recover', 'hurt', 'windup'].includes(e.state);
function knightHead(c) {
  const { fl } = c;
  // the plume
  ctx.beginPath();
  ctx.moveTo(-2, -16);
  ctx.quadraticCurveTo(-30, -34, -34, -4);
  ctx.quadraticCurveTo(-22, -20, -8, -12);
  ctx.closePath();
  fill('#b02a3a', fl, 2);
  // the great helm: a flat-topped bucket, an eye slit, breaths
  ctx.beginPath();
  ctx.moveTo(-14, -16);
  ctx.lineTo(16, -16);
  ctx.lineTo(17, 14);
  ctx.lineTo(-14, 14);
  ctx.closePath();
  fill('#9aa3b0', fl);
  ctx.fillStyle = OL;
  ctx.fillRect(0, -4, 17, 4);
  ctx.fillStyle = '#7fd8ff';
  ctx.fillRect(4, -3, 4, 2);
  ctx.fillStyle = OL;
  for (let k = 0; k < 3; k++) ctx.fillRect(9 + k * 3, 4, 1.5, 5);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(4, -16);
  ctx.lineTo(4, 14);
  ctx.stroke();
}
function knightTorso(c) {
  const { fl, neck } = c;
  ctx.save();
  ctx.translate(neck[0] * 0.64, neck[1] * 0.64);
  ctx.rotate(c.o.lean);
  ctx.beginPath();
  ctx.moveTo(-12, -20);
  ctx.quadraticCurveTo(22, -22, 20, 2);
  ctx.quadraticCurveTo(18, 22, -8, 22);
  ctx.closePath();
  fill('#9aa3b0', fl);
  // the tabard with a skull on it
  ctx.beginPath();
  ctx.rect(-4, -14, 18, 40);
  fill('#4a2a5a', fl, 2);
  ctx.beginPath();
  ctx.arc(5, -2, 4, 0, TAU);
  fill('#e8e0c8', fl, 1.4);
  ctx.restore();
  // pauldron
  ctx.beginPath();
  ctx.ellipse(c.sh[0], c.sh[1] + 2, 13, 9, -0.3, 0, TAU);
  fill('#aab3c0', fl);
}
function knightShield(c) {
  const { e, fl, sh, o } = c;
  // the round shield, on the back arm, held up in front of the body
  const a = o.aB,
    hx = sh[0] - 3 + 27 * Math.sin(a[0]) + 26 * Math.sin(a[1]),
    hy = sh[1] + 27 * Math.cos(a[0]) + 26 * Math.cos(a[1]);
  ctx.save();
  ctx.translate(hx + 10, hy - 4);
  if (e.shieldT > 0) ctx.translate(Math.sin(G.time * 80) * 2, 0);
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 26, 0, 0, TAU);
  fill('#6a4630', fl);
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 21, 0, 0, TAU);
  fill('#4a2a5a', fl, 1.6);
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, TAU);
  fill('#c9ccd2', fl, 1.6);
  ctx.restore();
}
function longsword(c) {
  const { fl } = c;
  inHand(c, () => {
    shaft(0, -10, 0, 6, 4, '#4a3424', fl);
    ctx.beginPath();
    ctx.rect(-10, 4, 20, 5);
    fill('#d9a641', fl, 1.8);
    ctx.beginPath();
    ctx.moveTo(-4, 9);
    ctx.lineTo(4, 9);
    ctx.lineTo(3, 70);
    ctx.lineTo(0, 78);
    ctx.lineTo(-3, 70);
    ctx.closePath();
    fill('#d6dbe3', fl, 2);
  });
}
defineFoe('knight', {
  init: { thrCd: [2, 4] },
  timers: ['thrCd', 'shieldT'],
  moves: [
    {
      when: (e, s) =>
        e.thrCd <= 0 &&
        !s.pdown &&
        s.adx > KNIGHT.thrust.min &&
        s.adx < KNIGHT.thrust.max &&
        s.ady < 24,
      go(e) {
        faceP(e);
        go(e, 'kthw', 0, { engage: false, rdir: e.face });
      },
    },
  ],
  attacks: ['kthw', 'kth'],
  // its shield turns a light blow or a shot from in front, more often than not
  block(e, dir, knock, src, crush) {
    if (crush || knock || !shieldUp(e, dir) || random() > KNIGHT.block) return false;
    SFX.clang();
    spark(e.x + e.face * 30 * e.T.scale, e.y - 80 * e.T.scale, '#fff4d0', false);
    e.shieldT = 0.15;
    e.x += dir * 4;
    return true;
  },
  states: {
    kthw(e) {
      e.face = e.rdir;
      if (e.t > KNIGHT.thrust.wind) {
        go(e, 'kth', 0, { x0: e.x, hitDone: false });
        SFX.dash();
      }
    },
    kth: {
      pin: true,
      tick(e, dt) {
        const K = KNIGHT.thrust;
        e.face = e.rdir;
        e.x += e.rdir * K.speed * dt;
        e.moving = true;
        if (!e.hitDone && inFront(e, 10, 110, 26, 110)) {
          e.hitDone = true;
          hitPlayer(K.dmg, e.rdir, true);
        }
        if (Math.abs(e.x - e.x0) > K.dist || e.hitDone) {
          dust(e.x, e.y, 4);
          go(e, 'recover', 0, { thrCd: rnd(...K.cd) });
        }
      },
    },
  },
  look: { head: knightHead, torso: knightTorso, back: knightShield, weapon: longsword },
  pose: {
    base: { set: { aB: [1.2, 1.5] } },
    guard: { chase: { set: { aF: (e, k) => [0.5 + 0.04 * k.br, 2.4], aB: [1.2, 1.5] } } },
    states: {
      kthw: { set: { aF: [-0.4, 1.4], lean: -0.1, lF: [0.5, 0.1], lB: [-0.6, -0.9] } },
      kth: {
        set: { aF: [1.5, 1.57], aB: [1.1, 1.4], lean: 0.45, lF: [0.9, 0.2], lB: [-0.9, -1.2] },
      },
    },
  },
});

// --- the bone giant ----------------------------------------------------------------------------

function giantHead(c) {
  const { fl } = c;
  // an iron band with spikes round the skull
  ctx.beginPath();
  ctx.rect(-14, -10, 30, 6);
  fill('#5a5f6a', fl, 2);
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(-12 + k * 8, -10);
    ctx.lineTo(-8 + k * 8, -22);
    ctx.lineTo(-4 + k * 8, -10);
    fill('#8a8f9a', fl, 1.6);
  }
}
function giantTorso(c) {
  const { fl, neck } = c;
  // fur over the shoulders, a chain across the ribs, a fur loincloth
  ctx.save();
  ctx.translate(neck[0] * 0.9, neck[1] * 0.9);
  ctx.beginPath();
  ctx.ellipse(0, 4, 22, 12, -0.15, 0, TAU);
  fill('#6a5040', fl);
  ctx.restore();
  ctx.strokeStyle = '#8a8f9a';
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(neck[0] * 0.9 - 6, neck[1] * 0.9 + 6);
  ctx.lineTo(10, -6);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.lineTo(16, -4);
  ctx.lineTo(12, 22);
  ctx.lineTo(4, 16);
  ctx.lineTo(-2, 24);
  ctx.lineTo(-10, 16);
  ctx.closePath();
  fill('#6a5040', fl);
}
function maul(c) {
  const { fl } = c;
  inHand(c, () => {
    shaft(0, -14, 0, 50, 6, '#6a4630', fl);
    ctx.beginPath();
    ctx.rect(-20, 44, 40, 28);
    fill('#8d9198', fl);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-12, 50);
    ctx.lineTo(-6, 60);
    ctx.moveTo(8, 48);
    ctx.lineTo(12, 66);
    ctx.stroke();
  });
}
defineFoe('giant', {
  init: { qCd: [2, 4] },
  timers: ['qCd'],
  moves: [
    {
      when: (e, s) => e.qCd <= 0 && !s.pdown && s.adx > GIANT.quake.min && s.adx < GIANT.quake.max,
      go(e) {
        faceP(e);
        go(e, 'gqw', 0, { engage: false });
        SFX.spin();
      },
    },
  ],
  attacks: ['gqw', 'gqs'],
  // its plain blow: the maul on the ground, a ring of dust and a shudder
  attackTick(e) {
    if (e.t > 0.06 && !e.slamFx) {
      e.slamFx = true;
      const x = e.x + e.face * e.T.reach * 0.75;
      dust(x, e.y, 10);
      G.parts.push({ k: 'gring', x, y: e.y, t: 0, life: 0.35, s: GIANT.ring, col: '#d9c49a' });
      G.shake = Math.max(G.shake, 9);
      SFX.thud();
    }
  },
  on: { windup: (e) => (e.slamFx = false) },
  states: {
    // the maul high over its head, then down on the ground: a shock wave runs along it
    gqw(e) {
      if (e.t > GIANT.quake.wind) {
        go(e, 'gqs', 0);
        G.shake = Math.max(G.shake, 12);
        SFX.quake();
        dust(e.x + e.face * 80, e.y, 14);
        G.projs.push({
          k: 'quake',
          x: e.x + e.face * 90,
          y: e.y,
          z: 0,
          vx: e.face * STRONG.waveSpeed,
          life: 4,
          hit: false,
        });
      }
    },
    gqs(e) {
      if (e.t > 0.6) go(e, 'chase', 0, { qCd: rnd(...GIANT.quake.cd) });
    },
  },
  look: { head: giantHead, torso: giantTorso, weapon: maul },
  pose: {
    base: { set: { lean: 0.2, lF: [0.3, 0.05], lB: [-0.36, -0.4] } },
    guard: { chase: { set: { aF: (e, k) => [0.35, 2.3 + 0.05 * k.br] } } },
    states: {
      gqw: { set: { aF: [3.0, 3.3], aB: [2.6, 3.0], lean: -0.15, jaw: 5 } },
      gqs: {
        set: { aF: [1.1, 0.9], aB: [0.9, 0.7], lean: 0.6, lF: [0.9, -0.4], lB: [-0.8, -1.2] },
      },
    },
  },
});
