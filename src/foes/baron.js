// The Grave Baron, the mini-boss at the crypt (numbers in BOSS and TYPES.boss). He slashes,
// charges across the arena and summons the dead; below half health he roars into a second
// phase and spits acid. His charge, summon, roar and breath cannot be interrupted, and two
// interrupted combos in a row make him shrug off combos for a while.
import { ACID, BOSS, FONT, GB, GT, OL, PURPLE, TAU, W } from '../config.js';
import { clamp, random, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { dust } from '../fx.js';
import { acidBite, hitPlayer } from '../combat.js';
import { spawn } from '../enemies.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';
import { ctx } from '../gfx.js';

/** The baron's mouth on screen (x in world space, y on screen) for the acid spray. */
const mouth = (e) => [e.x + e.face * 22 * e.T.scale, e.y - 128 * e.T.scale];
/** Is the player inside the baron's acid breath cone? */
export function inBreath(e) {
  const f = (P.x - e.x) * e.face - 20;
  return (
    f > -10 &&
    f < BOSS.breathLen &&
    Math.abs(P.y - e.y) < BOSS.breathW0 + Math.max(0, f) * BOSS.breathSpread &&
    P.z < 90
  );
}
const drip = (x, y) => ({
  k: 'dot',
  x,
  y,
  vx: rnd(-15, 15),
  vy: rnd(20, 60),
  g: 700,
  t: 0,
  life: rnd(0.3, 0.5),
  s: rnd(2.5, 4),
  col: random() < 0.5 ? '#9dff4a' : '#4fd12a',
});

export default defineFoe('boss', {
  look: {
    rise: 1.5,
    back(c) {
      const { e, fl, sh } = c;
      const wv = Math.sin(e.anim * 4) * 6,
        mv = e.moving ? 14 : 0;
      ctx.beginPath();
      ctx.moveTo(sh[0] + 4, sh[1] - 4);
      ctx.lineTo(sh[0] - 12, sh[1] - 2);
      ctx.quadraticCurveTo(-34 - mv, -20, -38 - mv - wv, 34);
      ctx.lineTo(-24 - mv * 0.6, 30 + wv * 0.4);
      ctx.lineTo(-14 - mv * 0.4, 38);
      ctx.lineTo(-2, 6);
      ctx.closePath();
      ctx.fillStyle = fl ? '#fff' : '#43215f';
      ctx.fill();
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.stroke();
    },
    head(c) {
      const { fl } = c;
      ctx.fillStyle = fl ? '#fff' : '#e9c046';
      ctx.beginPath();
      ctx.moveTo(-11, -10);
      ctx.lineTo(-13, -25);
      ctx.lineTo(-6, -17);
      ctx.lineTo(-1, -28);
      ctx.lineTo(4, -17);
      ctx.lineTo(11, -25);
      ctx.lineTo(10, -11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PURPLE;
      ctx.beginPath();
      ctx.arc(-1, -15, 2.3, 0, TAU);
      ctx.fill();
    },
    weapon(c) {
      const { e, h, wa } = c;
      ctx.save();
      ctx.translate(h[0], h[1]);
      ctx.rotate(-wa);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.4;
      const gl = e.state === 'cwind' || e.state === 'charge' || e.state === 'summon';
      if (gl) {
        ctx.shadowColor = PURPLE;
        ctx.shadowBlur = 18;
      }
      ctx.fillStyle = gl ? '#e9d4ff' : '#cdd8e4';
      ctx.beginPath();
      ctx.moveTo(-4.5, 8);
      ctx.lineTo(4.5, 8);
      ctx.lineTo(3.5, 72);
      ctx.lineTo(0, 84);
      ctx.lineTo(-3.5, 72);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.fillStyle = '#e9c046';
      ctx.beginPath();
      ctx.rect(-11, 4, 22, 5);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(-2.5, -10, 5, 14);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
    world(c) {
      const { e, s, sx, sy } = c;
      if (e.state !== 'cwind') return;
      // a warning before the charge
      ctx.fillStyle = '#ff4a5e';
      ctx.font = `900 26px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(e.t * 30);
      ctx.fillText('!', sx, sy - 185 * s);
      ctx.globalAlpha = 1;
    },
  },
  riseTime: 1.6,
  engageCap: Infinity,
  timers: ['brCd'],
  spawn(e) {
    e.x = G.cam + W - 230;
    e.y = GT + 70;
    e.face = -1;
    SFX.boss();
    G.banner = { a: '@boss', b: 'bossBanner', t: 0 };
    G.shake = 8;
  },
  moves: [
    {
      // second phase: a roar, then the acid breath joins his moves
      when: (e) => !e.phase2 && e.hp < e.T.hp * BOSS.phase2,
      go(e) {
        e.phase2 = true;
        go(e, 'roar', 0, { brCd: 1.5 });
        G.shake = 12;
        G.flash = 0.25;
        SFX.boss();
      },
    },
    {
      when: (e) => e.hp < e.T.hp * e.next,
      go(e) {
        e.next -= 0.33;
        go(e, 'summon');
        SFX.boss();
      },
    },
    {
      when: (e, s) =>
        e.phase2 && e.brCd <= 0 && s.adx < BOSS.breathLen + 30 && s.ady < 90 && !s.pdown,
      go(e) {
        go(e, 'bwind');
        SFX.boss();
      },
    },
    {
      when: (e, s, dt) => e.cd <= 0 && s.adx > 270 && s.ady < 60 && !s.pdown && random() < dt * 1.6,
      go: (e) => go(e, 'cwind'),
    },
  ],
  unstoppable: (e) => ['charge', 'bwind', 'breath'].includes(e.state),
  guard(e, knock, src, dir) {
    if (['charge', 'summon', 'rise', 'roar', 'bwind', 'breath'].includes(e.state)) return true;
    const atk = ['windup', 'attack', 'cwind'].includes(e.state),
      combo = src === 'punch' || src === 'air',
      flinch = () => go(e, 'hurt', 0, { vx: dir * 110 });
    if (combo) {
      if (e.armor > 0) return true;
      if (atk) {
        flinch();
        e.breaks++;
        if (e.breaks >= 2) {
          e.breaks = 0;
          e.armor = 4;
          SFX.boss();
        }
      } else if (knock) flinch();
    } else if (src === 'hado' || src === 'super') flinch();
    return true;
  },
  pose: {
    // the sword held up and ready
    guard: { chase: { set: { aF: (e, k) => [0.5, 1.9 + 0.05 * k.br] } } },
    states: {
      roar: {
        set: { head: -0.5, lean: -0.25, aB: [2.2, 2.6], jaw: 8 },
        fn: (o, e) => (o.aF = [2.4 + 0.1 * Math.sin(e.t * 30), 2.8]),
      },
      // head back, mouth opening for the acid
      bwind: {
        tween: {
          dur: 0.6,
          from: { head: 0, lean: 0, aB: [0.02, 0.95], jaw: 3 },
          to: { head: -0.45, lean: -0.2, aB: [1.2, 2.2], jaw: 8 },
        },
      },
      breath: {
        set: { lean: 0.35, aB: [1.2, 2.2], jaw: 9 },
        fn: (o, e) => (o.head = 0.25 + 0.05 * Math.sin(e.t * 40)),
      },
      summon: {
        set: { lean: -0.05 },
        tween: {
          dur: 0.4,
          from: { aF: 'pre', aB: [0.02, 0.95], head: 0, jaw: 0 },
          to: { aF: [3.0, 3.14], aB: [2.7, 3.0], head: -0.25, jaw: 6 },
        },
      },
      cwind: {
        set: { lF: [0.5, 0.1], lB: [-0.6, -0.9], jaw: 5 },
        tween: { dur: 0.5, from: { lean: 0.1, aF: 'pre' }, to: { lean: 0.5, aF: [1.25, 1.55] } },
        shake: { amp: 0.03, rate: 60, fields: ['lean'] },
      },
      charge: { set: { aF: [1.3, 1.57], jaw: 5 } },
    },
  },
  states: {
    roar(e) {
      if (random() < 0.4) dust(e.x + rnd(-60, 60), e.y, 1);
      if (e.t > BOSS.roar) go(e, 'chase');
    },
    summon(e) {
      if (e.t > 0.6 && !e.hitDone) {
        e.hitDone = true;
        const a =
          e.next > 0.3 ? ['zombie', 'zombie', 'monkey'] : ['zombie', 'necro', 'zombie', 'grunt'];
        for (const t of a) spawn(t, 0);
        G.flash = 0.15;
      }
      if (e.t > 1.2) go(e, 'chase', 0, { hitDone: false, cd: 0.6 });
    },
    cwind(e) {
      faceP(e);
      if (e.t > 0.75) {
        go(e, 'charge', 0, { hitDone: false });
        SFX.hado();
      }
    },
    charge: {
      pin: true,
      tick(e, dt, s) {
        e.x += e.face * 560 * dt;
        e.y += clamp(s.dy, -1, 1) * 40 * dt;
        e.moving = true;
        e.walkT += dt * 17;
        if (random() < 0.5) dust(e.x - e.face * 20, e.y, 1);
        if (!e.hitDone && s.adx < 64 && s.ady < 26) {
          e.hitDone = true;
          hitPlayer(e.T.dmg, e.face, true);
        }
        if (e.t > 0.8 || e.x < G.cam + 70 || e.x > G.cam + W - 70)
          go(e, 'recover', -0.35, { cd: rnd(1.2, 2) });
      },
    },
    bwind(e, dt, s) {
      // 0.7 s to get out of the way: head back, acid drooling from the jaws
      if (e.t < 0.2) e.face = s.dx >= 0 ? 1 : -1;
      if (random() < 0.5) {
        const [mx, my] = mouth(e);
        G.parts.push(drip(mx + rnd(-4, 4), my + 4));
      }
      if (e.t > BOSS.breathWind) {
        go(e, 'breath', 0, { tick: 0 });
        SFX.breath();
      }
    },
    breath(e, dt) {
      // a spray of acid spat from the mouth: the drops fly in arcs and fall on the cone in
      // front of him, which is where it burns
      const [mx, my] = mouth(e);
      for (let i = 0; i < 5; i++) {
        const life = rnd(0.35, 0.6),
          reach = BOSS.breathLen * Math.sqrt(rnd(0.04, 1)),
          side = rnd(-1, 1) * (BOSS.breathW0 + reach * BOSS.breathSpread),
          g = 900,
          gy = e.y + side;
        G.parts.push({
          k: i % 2 ? 'glow' : 'dot',
          x: mx,
          y: my,
          vx: (e.face * (reach - 20)) / life,
          vy: (gy - my - (g * life * life) / 2) / life,
          g,
          t: 0,
          life,
          s: rnd(3, 7),
          col: i % 3 ? '#9dff4a' : '#4fd12a',
        });
      }
      // drops splashing where they land
      for (let i = 0; i < 2; i++) {
        const reach = BOSS.breathLen * rnd(0.15, 1),
          side = rnd(-1, 1) * (BOSS.breathW0 + reach * BOSS.breathSpread);
        G.parts.push({
          k: 'dot',
          x: e.x + e.face * (reach + 20),
          y: e.y + side - 2,
          vx: rnd(-50, 50),
          vy: rnd(-140, -50),
          g: 700,
          t: 0,
          life: rnd(0.2, 0.3),
          s: rnd(2, 4),
          col: '#b9ff7a',
        });
      }
      if ((e.tick -= dt) <= 0) {
        e.tick = BOSS.breathTick;
        if (inBreath(e)) acidBite(BOSS.breathDmg);
      }
      if (e.t > BOSS.breathTime) {
        for (let i = 0; i < BOSS.breathPools; i++)
          G.pools.push({
            x: e.x + e.face * BOSS.breathLen * (0.3 + (0.62 * i) / (BOSS.breathPools - 1)),
            y: clamp(e.y + rnd(-25, 25), GT, GB),
            t: 0,
            life: ACID.pool,
            seed: rnd(6),
          });
        go(e, 'recover', -0.2, { brCd: rnd(BOSS.breathCd[0], BOSS.breathCd[1]) });
      }
    },
  },
});
