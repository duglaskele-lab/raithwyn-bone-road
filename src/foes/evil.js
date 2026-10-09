// Raithwyn as the final boss of the Bone Road (numbers in EVIL and TYPES.evil): she waits in the
// dragon's place when the player is someone else, drawn with her own sprites. She fights with
// the heroine's own moves, in three stages by her health, with no show of a change: her
// three-punch chain up close (a glint in her eyes first), her bone along the road (a fan of
// three in the third stage), her dark ball of level I, II and III by stage (gathered longer
// each time), a leap back away from the player's attacks (at a wall, the other way, over her).
// From the second stage on she gathers rage (a small bar under hers), and in the third it fills
// by itself; full, she gathers a dark orb (a heavy blow breaks it and empties her rage, but not
// in the third stage), it rises over the arena and for five seconds three beams from it run
// over the ground along their own paths, burning it, while she only walks about and leaps
// away. At half health she calls up the dandy skeleton (dandy.js), whom only her blows hurt.
// A heavy blow staggers her; after a few she shrugs them off for a while.
import { EVIL, GB, GT, PURPLE, TAU, W } from '../config.js';
import { clamp, ease, lerp, random, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { dust, motes } from '../fx.js';
import { finale, hitPlayer, hurtEnemy } from '../combat.js';
import { scoreMult } from '../style.js';
import { ctx, sprite } from '../gfx.js';
import { spawn } from '../enemies.js';
import { defineFoe } from './registry.js';
import { faceP, go, inFront, moveTo } from './kit.js';

/** Her stage, 1 to 3, by how much health she has left. */
export const stageOf = (e) => {
  const f = e.hp / e.T.hp;
  return f > EVIL.stages[0] ? 1 : f > EVIL.stages[1] ? 2 : 3;
};
const onScreen = (e) => e.x > G.cam + 40 && e.x < G.cam + W - 40;
/** The skeletons she has called up (only her blows hurt them while she lives). */
export const dandies = () => G.enemies.filter((o) => o.type === 'dandy' && !o.dead && !o.dying);
/** One of her blows (her fist, a bone, a ball, a beam) on her own skeleton. */
export function evilHurt(o, dmg, dir, knock) {
  G.evilHit = true;
  hurtEnemy(o, dmg, dir, knock, 'evil');
  G.evilHit = false;
}
/** She gains rage, from her second stage on (not while her orb is out). */
export function evilRage(e, n) {
  if (!e || e.dead || e.dying || e.stage < 2 || e.orb) return;
  e.rage = Math.min(EVIL.rage.max, (e.rage ?? 0) + n);
}
/** A blow of hers on the player; one that lands gives her rage. */
export function evilHitP(e, dmg, dir, knock) {
  if (!hitPlayer(dmg, dir, knock)) return false;
  evilRage(e, EVIL.rage.hit);
  return true;
}
/** The player is in the middle of an attack (what she leaps away from). */
const attacking = () =>
  ['atk1', 'atk2', 'throw', 'hado', 'super', 'bigGun', 'nade'].includes(P.state);

// --- her orb -----------------------------------------------------------------------------------

/** Where beam i of the orb meets the ground, `tau` seconds into its life: three paths of their
 *  own over the arena (a wide sweep, a loop, a figure of eight). */
export function orbSpot(i, tau) {
  const cx = G.cam + W / 2,
    hx = W / 2 - 70,
    cy = (GT + GB) / 2,
    hy = (GB - GT) / 2 - 10;
  if (i === 0) return [cx + hx * Math.sin(tau * 0.9), cy + hy * 0.8 * Math.sin(tau * 0.55 + 1)];
  if (i === 1)
    return [cx + hx * 0.75 * Math.cos(tau * 0.75 + 2), cy + hy * 0.9 * Math.sin(tau * 0.75 + 2)];
  return [cx + hx * Math.sin(tau * 0.6 + 4), cy + hy * 0.9 * Math.sin(tau * 1.7)];
}
/** The orb rises from her hands over the middle of the arena and swells; then its beams. */
function updOrb(e, dt) {
  const O = EVIL.orb,
    o = e.orb;
  o.t += dt;
  const u = ease(clamp(o.t / O.rise, 0, 1));
  o.x = lerp(o.x0, G.cam + W / 2, u);
  o.y = lerp(o.y0, (GT + GB) / 2, u);
  o.z = lerp(o.z0, O.z, u);
  o.r = lerp(16, 54, u);
  const tau = o.t - O.rise;
  if (tau < 0) return;
  if (tau > O.life) {
    e.orb = null;
    return;
  }
  o.spots = [0, 1, 2].map((i) => orbSpot(i, tau));
  o.burnT -= dt;
  o.spots.forEach(([x, y], i) => {
    if (o.burnT <= 0)
      G.pools.push({ fire: true, dark: true, x, y, t: 0, life: O.burn, seed: rnd(6) });
    // a beam that runs over her: hurt, now and then
    if (
      (o.cd[i] -= dt) <= 0 &&
      Math.abs(P.x - x) < O.hitR &&
      Math.abs(P.y - y) < O.hitR * 0.5 &&
      P.z < 100
    )
      if (evilHitP(e, O.hit, P.x >= x ? 1 : -1, false)) o.cd[i] = O.again;
    for (const d of dandies())
      if (
        (d.beamT ?? 0) <= G.time &&
        Math.abs(d.x - x) < O.hitR &&
        Math.abs(d.y - y) < O.hitR * 0.5
      ) {
        d.beamT = G.time + O.again;
        evilHurt(d, O.hit, d.x >= x ? 1 : -1, false);
      }
    if (random() < 0.5)
      G.parts.push({
        k: 'glow',
        x: x + rnd(-8, 8),
        y: y - rnd(0, 16),
        vx: rnd(-120, 120),
        vy: rnd(-200, -60),
        g: 500,
        t: 0,
        life: rnd(0.2, 0.4),
        s: rnd(2, 4),
        col: random() < 0.5 ? '#ffffff' : '#c58bff',
      });
  });
  if (o.burnT <= 0) o.burnT = O.every;
  G.shake = Math.max(G.shake, 2);
}
/** The orb and its beams, over everything. */
function drawOrb(e) {
  const o = e.orb;
  if (!o) return;
  const x = o.x - G.cam,
    y = o.y - o.z,
    pulse = 1 + 0.08 * Math.sin(G.time * 18);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (o.spots) {
    const w = 12 + Math.sin(G.time * 70) * 2;
    for (const [sx, sy] of o.spots) {
      for (const [ww, c] of [
        [w * 1.6, 'rgba(176,92,255,.3)'],
        [w * 0.95, 'rgba(215,190,255,.55)'],
        [w * 0.45, 'rgba(255,255,255,.95)'],
      ]) {
        ctx.strokeStyle = c;
        ctx.lineCap = 'round';
        ctx.lineWidth = ww;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(sx - G.cam, sy);
        ctx.stroke();
      }
      const fl = ctx.createRadialGradient(sx - G.cam, sy, 2, sx - G.cam, sy, 36);
      fl.addColorStop(0, 'rgba(255,255,255,.9)');
      fl.addColorStop(1, 'rgba(176,92,255,0)');
      ctx.fillStyle = fl;
      ctx.fillRect(sx - G.cam - 36, sy - 36, 72, 72);
    }
  }
  const R = o.r * 2.2 * pulse,
    g = ctx.createRadialGradient(x, y, 2, x, y, R);
  g.addColorStop(0, 'rgba(255,255,255,.95)');
  g.addColorStop(0.3, 'rgba(197,139,255,.8)');
  g.addColorStop(1, 'rgba(120,40,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - R, y - R, R * 2, R * 2);
  // a dark heart with a bright rim, and arcs of light wheeling round it
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#1a0f2a';
  ctx.beginPath();
  ctx.arc(x, y, o.r * 0.8 * pulse, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(215,170,255,.9)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const a0 = G.time * (2.5 + k) + (k * TAU) / 3;
    ctx.strokeStyle = k % 2 ? 'rgba(255,255,255,.8)' : 'rgba(197,139,255,.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y, o.r * 1.15, o.r * (0.35 + 0.15 * k), a0 * 0.3, a0, a0 + 2.2);
    ctx.stroke();
  }
  ctx.restore();
}

// --- drawing -----------------------------------------------------------------------------------

/** Which of her frames to show now. */
function frame(e) {
  const t = e.t,
    C = EVIL.combo;
  switch (e.state) {
    case 'eintro':
    case 'ecall':
      return ['laugh', [0, 1, 2, 1, 2, 1, 2, 1][Math.floor(t / 0.13) % 8]];
    case 'c0':
      return ['punch1', 0];
    case 'c1':
    case 'c2':
      return ['punch1', Math.min(4, 1 + Math.floor((t / C.t[0]) * 4))];
    case 'c3':
      return ['punch2', Math.min(4, Math.floor((t / C.t[2]) * 5))];
    case 'crec':
      return ['punch2', 4];
    case 'windup':
      return ['punch1', 0];
    case 'attack':
      return ['punch1', 2];
    case 'recover':
      return ['punch1', 4];
    case 'bthrow':
      return ['throw', Math.min(3, Math.floor(t / 0.09))];
    case 'eball':
      return ['hado', 1 + (Math.floor(t / 0.12) % 3)];
    case 'hrel':
      return ['hado', t < 0.1 ? 4 : 5];
    case 'scharge':
      return ['orb', Math.min(5, Math.floor((t / EVIL.orb.charge) * 6))];
    case 'sfire':
      return ['orb', 6];
    case 'bjump': {
      const u = t / EVIL.jump.t;
      return ['jump', u < 0.1 ? 0 : u < 0.4 ? 1 : u < 0.65 ? 2 : u < 0.92 ? 3 : 4];
    }
    case 'hurt':
      return ['hurt', t < 0.16 ? 0 : 1];
    case 'edie':
      return ['ko', Math.min(5, Math.floor(t / 0.12))];
  }
  if (e.moving) return ['walk', Math.floor(e.walkT * 1.5) % 8];
  return ['idle', Math.floor(e.anim / 0.12) % 11];
}
export function drawEvil(e) {
  const [name, i] = frame(e),
    x = e.x - G.cam,
    y = e.y - e.z + 2,
    a =
      e.state === 'edie'
        ? clamp((3 - e.t) / 0.6, 0, 1)
        : e.flash > 0 && Math.floor(G.time * 30) % 2
          ? 0.55
          : 1;
  sprite(name, i, x, y, e.face < 0, 1, a);
  // the glint in her eyes before her chain of punches
  if (e.state === 'c0') {
    const u = e.t / EVIL.combo.glint,
      gx = x + e.face * 16,
      gy = y - 150,
      r = 4 + 10 * Math.sin(u * Math.PI);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,90,110,.9)';
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * TAU,
        rr = k % 2 ? r * 0.3 : r;
      ctx.lineTo(gx + Math.cos(ang) * rr, gy + Math.sin(ang) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // the dark ball gathering in her hands
  if (e.state === 'eball') {
    const u = clamp(e.t / EVIL.ball.wind[e.lv - 1], 0, 1),
      R = (10 + 18 * e.lv) * u,
      hx = x + e.face * 60,
      hy = y - 104,
      g = ctx.createRadialGradient(hx, hy, 1, hx, hy, R + 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    g.addColorStop(0, 'rgba(255,255,255,.9)');
    g.addColorStop(0.4, 'rgba(176,92,255,.7)');
    g.addColorStop(1, 'rgba(176,92,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(hx - R - 1, hy - R - 1, 2 * R + 2, 2 * R + 2);
    ctx.restore();
  }
}

// --- behaviour ---------------------------------------------------------------------------------

/** Her fist this frame: the player and her own skeleton in front of her. */
function punch(e, dmg, knock) {
  const C = EVIL.combo;
  if (!e.hitDone && inFront(e, 10, C.reach, 24, knock ? 120 : 70)) {
    e.hitDone = true;
    evilHitP(e, dmg, e.face, knock);
  }
  for (const d of dandies())
    if (
      !e.hitSet.has(d) &&
      (d.x - e.x) * e.face > -10 &&
      (d.x - e.x) * e.face < C.reach + d.w &&
      Math.abs(d.y - e.y) < 24
    ) {
      e.hitSet.add(d);
      evilHurt(d, dmg, e.face, knock);
    }
}
/** A leap back, away from the player (or, with a wall behind her, the other way, over her). */
function leap(e) {
  const J = EVIL.jump;
  let dir = P.x >= e.x ? -1 : 1,
    dist = J.dist;
  if ((dir < 0 && e.x - G.cam < J.wall) || (dir > 0 && G.cam + W - e.x < J.wall)) {
    dir = -dir;
    dist *= 1.6;
  }
  const x1 = clamp(e.x + dir * dist, G.cam + 50, G.cam + W - 50);
  faceP(e);
  go(e, 'bjump', 0, { x0: e.x, x1, jumpCd: J.cd });
  SFX.jump();
  dust(e.x, e.y, 4);
}
const toChase = (e, extra) => go(e, 'chase', 0, { engage: false, ...extra });

export default defineFoe('evil', {
  draw: drawEvil,
  over: drawOrb,
  init: { comboCd: [0.4, 1], ballCd: [2, 3.5], boneCd: [1.2, 2.6], jumpCd: [1, 2] },
  timers: ['comboCd', 'ballCd', 'boneCd', 'jumpCd'],
  spawn(e, side, placed) {
    if (!placed) {
      e.x = G.cam + W - 260;
      e.y = (GT + GB) / 2;
    }
    Object.assign(e, { state: 'eintro', face: -1, w: 22, stage: 1, rage: 0, orb: null });
    SFX.boss();
    G.banner = { a: '@evil', b: 'evilBanner', t: 0 };
  },
  engageCap: Infinity,
  stand: 80,
  moves: [
    {
      // while her orb burns the arena, she only keeps away
      when: (e) => !!e.orb,
      go: (e) => go(e, 'roam', 0, { engage: false }),
    },
    {
      // half her health gone: she calls up her dandy
      when: (e) => !e.summoned && e.hp < e.T.hp * EVIL.summon,
      go(e) {
        e.summoned = true;
        go(e, 'ecall', 0, { engage: false, called: false });
        SFX.boss();
      },
    },
    {
      // full rage: her super
      when: (e) => e.stage >= 2 && e.rage >= EVIL.rage.max && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'scharge', 0, { engage: false });
        SFX.charge();
      },
    },
    {
      // the player attacks close by: a leap back
      when: (e, s, dt) =>
        e.jumpCd <= 0 && s.adx < 120 && s.ady < 45 && attacking() && random() < dt * 5,
      go: leap,
    },
    {
      // a plain hit she took: now and then she leaps away from more
      when: (e) => e.dodge && e.jumpCd <= 0,
      go(e) {
        e.dodge = false;
        if (random() < 0.35) leap(e);
      },
    },
    {
      // up close: her chain of punches, after a glint in her eyes
      when: (e, s) => e.comboCd <= 0 && !s.pdown && s.adx < EVIL.combo.reach && s.ady < 22,
      go(e) {
        faceP(e);
        go(e, 'c0', 0, { engage: false });
      },
    },
    {
      // at a distance and lined up: her dark ball, as strong as her stage
      when: (e, s) =>
        e.ballCd <= 0 && !s.pdown && s.adx > EVIL.ball.min && s.ady < 26 && onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'eball', 0, { engage: false, lv: stageOf(e) });
        SFX.charge();
      },
    },
    {
      // a bone along the road (a fan of three in the third stage, which needs no lining up)
      when: (e, s) =>
        e.boneCd <= 0 &&
        !s.pdown &&
        s.adx > EVIL.bone.min &&
        s.ady < (e.stage >= 3 ? 90 : 26) &&
        onScreen(e),
      go(e) {
        faceP(e);
        go(e, 'bthrow', 0, { engage: false, thrown: false });
      },
    },
  ],
  attacks: [
    'c0',
    'c1',
    'c2',
    'c3',
    'crec',
    'bthrow',
    'eball',
    'hrel',
    'scharge',
    'sfire',
    'bjump',
    'ecall',
  ],
  // in the third stage nothing stops her gathering the orb
  unstoppable: (e) => (e.state === 'scharge' && e.stage >= 3) || e.state === 'ecall',
  immune: (e) =>
    e.state === 'eintro' || e.state === 'ecall' || (e.state === 'bjump' && e.t < EVIL.jump.t * 0.8),
  guard(e, knock, src, dir) {
    evilRage(e, EVIL.rage.hurt);
    if (['sfire', 'edie'].includes(e.state)) return true;
    if (e.state === 'scharge') {
      // a heavy blow breaks her super, and her rage is gone (not in the third stage)
      if (knock && e.stage < 3) {
        e.rage = 0;
        go(e, 'hurt', 0, { vx: dir * 120 });
        SFX.deny();
      }
      return true;
    }
    if (knock && e.armor <= 0) {
      go(e, 'hurt', 0, { vx: dir * 120 });
      if (++e.breaks >= EVIL.breaks) {
        e.breaks = 0;
        e.armor = EVIL.armor;
        SFX.boss();
      }
    } else if (!knock && e.state === 'chase') e.dodge = true;
    return true;
  },
  die(e, dir) {
    P.score += Math.round(e.T.score * scoreMult());
    Object.assign(e, { dying: true, engage: false, state: 'edie', t: 0, orb: null, vx: dir * 80 });
    finale(e);
    SFX.thud();
  },
  tick(e, dt) {
    if (e.dying) return;
    e.stage = stageOf(e);
    if (e.stage >= 3) evilRage(e, EVIL.rage.passive * dt);
    if (e.orb) updOrb(e, dt);
  },
  states: {
    eintro(e) {
      faceP(e);
      if (e.t > 1.3) toChase(e);
    },
    ecall(e) {
      faceP(e);
      if (e.t > 0.45 && !e.called) {
        e.called = true;
        const x = clamp(e.x - e.face * 120, G.cam + 80, G.cam + W - 80),
          d = spawn('dandy', 0, x, e.y);
        d.face = e.face;
        G.flash = 0.2;
        motes(x, e.y - 60, 14, 200);
      }
      if (e.t > 0.9) toChase(e);
    },
    c0(e) {
      if (e.t > EVIL.combo.glint) go(e, 'c1', 0, { hitDone: false, hitSet: new Set() });
    },
    c1(e, dt) {
      const C = EVIL.combo;
      e.x += e.face * 70 * dt;
      if (e.t > 0.06) punch(e, C.dmg[0], false);
      if (e.t > C.t[0]) {
        go(e, 'c2', 0, { hitDone: false, hitSet: new Set() });
        SFX.swing();
      }
    },
    c2(e, dt) {
      const C = EVIL.combo;
      e.x += e.face * 70 * dt;
      if (e.t > 0.06) punch(e, C.dmg[1], false);
      if (e.t > C.t[1]) {
        go(e, 'c3', 0, { hitDone: false, hitSet: new Set() });
        SFX.swing();
      }
    },
    c3(e, dt) {
      const C = EVIL.combo;
      e.x += e.face * 130 * dt;
      if (e.t > 0.08 && e.t < 0.22) punch(e, C.dmg[2], true);
      if (e.t > C.t[2]) go(e, 'crec');
    },
    crec(e) {
      if (e.t > EVIL.combo.rec) toChase(e, { comboCd: rnd(...EVIL.combo.cd) });
    },
    bthrow(e) {
      const B = EVIL.bone;
      if (e.t > B.wind && !e.thrown) {
        e.thrown = true;
        SFX.swing();
        const fan = stageOf(e) >= 3 ? [-1, 0, 1] : [0];
        for (const k of fan)
          G.projs.push({
            k: 'ebone',
            x: e.x + e.face * 62,
            y: e.y,
            z: 116,
            vx: e.face * B.speed,
            vy: k * B.fan * B.speed,
            dmg: B.dmg,
            owner: e,
            rot: 0,
            life: 3,
          });
      }
      if (e.t > B.wind + 0.15) toChase(e, { boneCd: rnd(...B.cd) });
    },
    eball(e, dt, s) {
      const wind = EVIL.ball.wind[e.lv - 1];
      if (e.t < wind * 0.6) e.face = s.dx >= 0 ? 1 : -1;
      if (random() < 0.5) motes(e.x + e.face * 60, e.y - 104, 1, 60 + 40 * e.lv);
      if (e.t > wind) {
        go(e, 'hrel');
        SFX.hado();
        if (e.lv === 3) {
          SFX.nova();
          G.flash = 0.2;
        }
        G.shake = Math.max(G.shake, 4 * e.lv);
        G.projs.push({
          k: 'ehado',
          lv: e.lv,
          x: e.x + e.face * (120 + 20 * e.lv),
          y: e.y,
          z: 104,
          vx: e.face * EVIL.ball.speed,
          dmg: EVIL.ball.dmg[e.lv - 1],
          owner: e,
          hit: new Set(),
          life: 2.6,
        });
      }
    },
    hrel(e) {
      if (e.t > 0.25) toChase(e, { ballCd: rnd(...EVIL.ball.cd) });
    },
    scharge(e) {
      const O = EVIL.orb,
        u = e.t / O.charge;
      if (random() < 0.3 + 0.6 * u) motes(e.x + e.face * 52, e.y - 112, 1, 60 + 140 * u);
      if (e.t >= O.charge) {
        e.rage = 0;
        e.orb = {
          t: 0,
          x0: e.x + e.face * 52,
          y0: e.y,
          z0: 112,
          x: e.x,
          y: e.y,
          z: 112,
          r: 16,
          cd: [0, 0, 0],
          burnT: 0,
          spots: null,
        };
        go(e, 'sfire');
        SFX.nova();
        G.flash = 0.3;
        G.shake = Math.max(G.shake, 8);
      }
    },
    sfire(e) {
      if (e.t > 0.45) go(e, 'roam', 0, { engage: false });
    },
    roam(e, dt, s) {
      // keeping her distance while the orb burns the arena; up close, a leap away
      faceP(e);
      if (!e.orb) return toChase(e);
      if (e.jumpCd <= 0 && s.adx < 130 && s.ady < 60) return leap(e);
      let side = e.x >= P.x ? 1 : -1;
      const tx = P.x + side * EVIL.orb.keep;
      if (tx < G.cam + 60 || tx > G.cam + W - 60) side = -side;
      moveTo(e, P.x + side * EVIL.orb.keep, P.y + (e.y > P.y ? 40 : -40), e.T.speed * 0.9, dt);
    },
    bjump(e) {
      const J = EVIL.jump,
        u = Math.min(1, e.t / J.t);
      e.x = lerp(e.x0, e.x1, u);
      e.z = 4 * J.h * u * (1 - u);
      if (u >= 1) {
        e.z = 0;
        dust(e.x, e.y, 4);
        toChase(e);
      }
    },
    edie(e, dt) {
      e.x += (e.vx ?? 0) * dt;
      e.vx = (e.vx ?? 0) * Math.pow(0.05, dt);
      if (e.t > 3) e.dead = true;
    },
  },
});
