// Lucy, the gunslinger (TYPES.lucyboss, LUCYB): Old Quarry's last boss when the player is someone
// else (the Prospector waits for Lucy herself). Drawn with her own sprites. A duel in three
// phases:
//   1. the gunslinger: she keeps her distance and shoots along the heroine's lane (the pistol
//      raised a moment first, a line showing where), seven rounds in the magazine shown over her
//      head; out of rounds she reloads, standing still — nothing stops a blow then and she takes
//      more harm. Up close she flips back out of reach, and now and then lobs a grenade;
//   2. the rig: at LUCYB.phase2 of her health she whistles, and the whiskey company's drilling
//      rig stomps in; she climbs into it. Its armour takes the blows (its boiler at the back is
//      its weak spot): the drill charged along her lane (stuck at the arena's edge, open), the
//      gatling (then it vents steam, open), three grenades, a stomp up close. Wrecked, it throws
//      her out;
//   3. the last stand: quicker shots fanned three at a time, buckshot and kicks up close, and,
//      once, her luck.
// Whiskey barrels stand in the arena: broken, they spill, and Lucy in the whiskey (or by the
// barrel as it breaks) is tipsy a while — reeling, hiccuping, open.
import { DECOR, FONT, LUCYB, OL, TAU, W } from '../config.js';
import { clamp, fxRandom, fxRnd, rnd } from '../util.js';
import { G, P } from '../state.js';
import { ctx, sprite } from '../gfx.js';
import { SFX } from '../audio.js';
import { dust, floatTxt, spark } from '../fx.js';
import { finale, hitPlayer } from '../combat.js';
import { floorSpan } from '../level.js';
import { scoreMult } from '../style.js';
import { t } from '../i18n.js';
import { defineFoe } from './registry.js';
import { faceP, go, moveTo } from './kit.js';
import { fireBolt, throwJnade } from './robot.js';

const L = LUCYB,
  R = LUCYB.rig;
const onScreen = (e) => e.x > G.cam + 50 && e.x < G.cam + W - 50;
const attacking = () =>
  ['atk1', 'atk2', 'throw', 'gunFin', 'hado', 'katana', 'iai', 'bigGun'].includes(P.state) ||
  (P.state === 'jump' && P.airT !== null && P.airT < 0.3);
/** Is she in her rig? */
const inRig = (e) => !!e.rig?.on;
/** States in which she is open: no blow stops her, and each does more harm. */
const OPEN = ['lreload', 'ltipsy', 'rstuck', 'rvent'];
const UNSTOPPABLE = ['rdrillw', 'rdrill', 'rgatw', 'rgat', 'rlobw', 'rstompw', 'rwalk', 'rthink'];

/** A barrel of whiskey breaks: it spills (and Lucy close by is tipsy at once). */
export function spillWhiskey(u) {
  const s = { x: u.x, y: u.y, t: 0 };
  (G.spills ??= []).push(s);
  SFX.splash();
  const e = G.enemies.find((o) => o.type === 'lucyboss' && !o.dying);
  if (e && !inRig(e) && Math.hypot(e.x - u.x, (e.y - u.y) * 2) < L.spill.splash) {
    s.drunk = true; // (splashed: she has had this one)
    tipsy(e);
  }
}
function tipsy(e) {
  if (inRig(e) || e.dying || ['levade', 'lcall', 'lboard', 'leject'].includes(e.state)) return;
  go(e, 'ltipsy', 0, { engage: false, z: 0 });
  floatTxt(e.x, e.y - 200, '*hic*', '#ffcf6a');
  SFX.laugh();
}
/** Three whiskey barrels about the arena. */
function barrels(xs) {
  for (const fx of xs) {
    const x = G.cam + fx,
      span = floorSpan(x);
    if (!span) continue;
    const y = span[0] + 30 + ((fx * 7) % 1) * 0 + ((fx / 10) % 3) * 30;
    G.props.push({
      isProp: 1,
      decor: 'whiskey',
      x,
      y,
      z: 0,
      w: DECOR.whiskey.w,
      hp: 1,
      drop: null,
    });
  }
}
/** A shot of her pistol along her lane. */
function shoot(e) {
  e.rounds--;
  fireBolt(e, e.x + e.face * 60, 112, L.gun.speed, L.gun.dmg, '#ffd24a');
  SFX.gun();
  G.shake = Math.max(G.shake, 2);
  G.parts.push({
    k: 'glow',
    x: e.x + e.face * 62,
    y: e.y - 112,
    vx: 0,
    vy: 0,
    g: 0,
    t: 0,
    life: 0.1,
    s: 9,
    col: '#fff1c0',
  });
}
/** Where she wants to stand: her distance from the heroine, on the roomier side. */
function keepAt(e) {
  const d = (L.keep[0] + L.keep[1]) / 2,
    left = P.x - d,
    right = P.x + d,
    lo = G.cam + 60,
    hi = G.cam + W - 60;
  const side = e.x >= P.x ? (right < hi ? 1 : -1) : left > lo ? -1 : 1;
  return clamp(P.x + side * d, lo, hi);
}
const cd = (e, r) => rnd(...r) * (e.phase === 3 ? 0.75 : 1);
/** The rig stomps in from the edge to where she waits; then she climbs aboard. */
function rigWalkIn(e, dt) {
  const r = e.rig,
    d = e.x - r.x;
  e.walkT += dt * 3;
  r.y += clamp(e.y - r.y, -1, 1) * 60 * dt;
  if (Math.abs(d) > 30) r.x += Math.sign(d) * R.speed * 1.6 * dt;
  else go(e, 'lboard', 0, { x0: e.x, y0: e.y });
}
/** The rig's armour is gone: it shakes, smokes and bursts. */
function wreck(e) {
  e.rig.hp = 0;
  e.rig.on = false;
  go(e, 'rwreck', 0, { engage: false });
  SFX.clang();
  G.shake = Math.max(G.shake, 10);
}

export default defineFoe('lucyboss', {
  walksIn: true,
  init: { shotCd: [0.8, 1.4], nadeCd: [4, 6], evadeCd: [0, 0.5], buckCd: [1, 2], kickCd: [1, 2] },
  timers: [
    'shotCd',
    'nadeCd',
    'evadeCd',
    'buckCd',
    'kickCd',
    'drillCd',
    'gatCd',
    'lobCd',
    'stompCd',
  ],
  attacks: UNSTOPPABLE,
  unstoppable: (e) => inRig(e) && UNSTOPPABLE.includes(e.state),
  spawn(e) {
    Object.assign(e, { phase: 1, rounds: L.gun.rounds, x: G.cam + W + 60, face: -1, w: 18 });
    go(e, 'lenter');
    barrels([230, 480, 740]);
  },
  // her body, or the rig's (its band of heights)
  band: (e) => (inRig(e) || e.state === 'rwreck' ? [0, 250] : null),
  immune: (e) =>
    ['levade', 'lcall', 'lboard', 'leject', 'lenter'].includes(e.state) || (e.rig && !e.rig.on),
  soak: (e) => (OPEN.includes(e.state) ? L.open : 1),
  // reloading, tipsy, or in the rig, a blow does not stop her
  guard: (e) => OPEN.includes(e.state) || inRig(e),
  poise: (e) => (e.rig ? [e.rig.hp, R.hp] : null),
  onHit(e, dmg, dir) {
    if (inRig(e) || e.state === 'rwreck') {
      // the rig's armour takes it (twice over on the boiler at its back)
      e.hp += dmg;
      if (e.state === 'rwreck') return true;
      const back = (P.x - e.x) * e.face < 0;
      e.rig.hp -= dmg * (back ? R.back : 1);
      if (back) spark(e.x - e.face * 80, e.y - 160, '#ffb02e', true);
      if (e.rig.hp <= 0) wreck(e);
      return true;
    }
    // her luck, once, in the last stand
    if (e.hp <= 0 && e.phase === 3 && !e.lucked) {
      e.lucked = true;
      e.hp = Math.round(e.T.hp * L.luck);
      floatTxt(e.x, e.y - 210, 'you feel lucky!', '#a8ecff');
      SFX.rank();
      go(e, 'air', 0, { vx: dir * 200, vz: 360 });
      return true;
    }
    return false;
  },
  moves: [
    { when: () => true, go: (e) => go(e, inRig(e) ? 'rthink' : 'lthink', 0, { engage: false }) },
  ],
  tick(e, dt) {
    // the second phase: she whistles for the rig
    if (
      e.phase === 1 &&
      e.hp <= e.T.hp * L.phase2 &&
      !e.dying &&
      !['air', 'down'].includes(e.state)
    ) {
      e.phase = 2;
      go(e, 'lcall', 0, { engage: false, z: 0 });
      SFX.boss();
    }
    if (inRig(e)) Object.assign(e.rig, { x: e.x, y: e.y });
    else if (e.rig && e.state === 'lcall') rigWalkIn(e, dt);
    // a spill of whiskey under her feet
    for (const s of G.spills ?? []) {
      s.t += dt;
      if (
        !s.drunk &&
        !inRig(e) &&
        e.z === 0 &&
        ['lthink', 'laim', 'lfire', 'lreload', 'lnade', 'hurt'].includes(e.state) &&
        ((e.x - s.x) / L.spill.r) ** 2 + ((e.y - s.y) / (L.spill.r * 0.42)) ** 2 < 1
      ) {
        s.drunk = true;
        tipsy(e);
      }
    }
    if (G.spills) G.spills = G.spills.filter((s) => s.t < L.spill.life && !s.drunk);
    // a blow coming up close: she flips back out of reach (not while reloading or tipsy)
    if (
      !inRig(e) &&
      e.evadeCd <= 0 &&
      e.rounds > 0 &&
      ['lthink', 'laim'].includes(e.state) &&
      attacking() &&
      Math.abs(P.x - e.x) < L.evade.near &&
      Math.abs(P.y - e.y) < 40
    ) {
      const dir = e.x >= P.x ? 1 : -1,
        room = dir > 0 ? G.cam + W - 60 - e.x : e.x - (G.cam + 60),
        d = room > L.evade.dist ? dir : -dir;
      go(e, 'levade', 0, {
        x0: e.x,
        ex: clamp(e.x + d * L.evade.dist, G.cam + 60, G.cam + W - 60),
      });
      e.evadeCd = e.phase === 3 ? L.evade.cd3 : L.evade.cd;
      SFX.jump();
    }
  },
  die(e) {
    P.score += Math.round(e.T.score * scoreMult());
    Object.assign(e, { dying: true, engage: false, state: 'ldie', t: 0, hp: 0, z: 0, vx: 0 });
    SFX.hurt();
    finale(e);
    G.items.push({ kind: 'hp', x: e.x, y: e.y, z: 60, vz: 260, t: 0 });
  },
  states: {
    lenter(e, dt) {
      e.face = -1;
      e.x -= e.T.speed * dt;
      e.moving = true;
      if (e.x < G.cam + W - 220) go(e, 'lthink', 0, { shotCd: 0.6 });
    },
    lthink(e, dt, s) {
      faceP(e);
      if (e.rounds <= 0) {
        go(e, 'lreload');
        floatTxt(e.x, e.y - 200, t('reload'), '#ffd24a');
        SFX.clack();
        // the empty magazine falls
        G.debris.push({
          k: 'shard',
          x: e.x + e.face * 10,
          gy: e.y + 2,
          z: 90,
          vx: -e.face * 60,
          vz: 120,
          rot: 0,
          vr: 9,
          len: 9,
          col: '#3d4456',
          life: 1.4,
        });
        return;
      }
      if (s.pdown) return moveTo(e, keepAt(e), P.y + 60, e.T.speed * 0.6, dt);
      const P3 = e.phase === 3;
      if (P3 && s.adx < L.buck.range - 20 && s.ady < 30 && e.buckCd <= 0)
        return go(e, 'lbuck', 0, { hitDone: false });
      if (P3 && s.adx < L.kick.reach + 20 && s.ady < 24 && e.kickCd <= 0)
        return go(e, 'lkick', 0, { hits: 0 });
      if (e.nadeCd <= 0 && s.adx > 200 && onScreen(e)) return go(e, 'lnade', 0, { sw: 0 });
      if (e.shotCd <= 0 && s.ady < 70 && s.adx > 120 && onScreen(e))
        return go(e, 'laim', 0, { fired: 0 });
      moveTo(e, keepAt(e), P.y, e.T.speed, dt);
    },
    laim(e, dt) {
      // the pistol raised: she lines up on her lane, then holds still
      faceP(e);
      const aim = e.phase === 3 ? L.gun.aim3 : L.gun.aim;
      if (e.t < aim * 0.6) e.y += clamp(P.y - e.y, -1, 1) * 90 * dt;
      if (e.t > aim) go(e, 'lfire', 0, { fired: 0 });
    },
    lfire(e) {
      const n = e.phase === 3 ? L.gun.fan : 1;
      while (e.fired < n && e.t >= e.fired * L.gun.fanGap && e.rounds > 0) {
        shoot(e);
        e.fired++;
      }
      if (e.t > (n - 1) * L.gun.fanGap + 0.22) go(e, 'lthink', 0, { shotCd: cd(e, L.gun.cd) });
    },
    lreload(e) {
      if (e.t > (e.phase === 3 ? L.gun.reload3 : L.gun.reload)) {
        e.rounds = L.gun.rounds;
        SFX.clack();
        go(e, 'lthink', 0, { shotCd: 0.3 });
      }
    },
    levade: {
      pin: true,
      tick(e) {
        const u = clamp(e.t / L.evade.t, 0, 1);
        e.x = e.x0 + (e.ex - e.x0) * u;
        e.z = 4 * 40 * u * (1 - u);
        if (u >= 1) {
          e.z = 0;
          dust(e.x, e.y, 4);
          go(e, 'lthink', 0, { shotCd: Math.min(e.shotCd, 0.35) });
        }
      },
    },
    lnade(e) {
      faceP(e);
      if (e.t > 0.3 && !e.sw) {
        e.sw = 1;
        throwJnade(e, e.x + e.face * 30, 120);
      }
      if (e.t > 0.55) go(e, 'lthink', 0, { nadeCd: cd(e, L.nade.cd), shotCd: 0.5 });
    },
    lbuck(e) {
      faceP(e);
      if (e.t > L.buck.wind && !e.hitDone) {
        e.hitDone = true;
        e.rounds--;
        SFX.gun();
        SFX.heavy();
        G.shake = Math.max(G.shake, 6);
        const rel = (P.x - e.x) * e.face;
        if (rel > 0 && rel < L.buck.range && Math.abs(P.y - e.y) < L.buck.dy && P.z < 90)
          hitPlayer(L.buck.dmg, e.face, true);
        for (let k = 0; k < 8; k++)
          G.parts.push({
            k: 'glow',
            x: e.x + e.face * 60,
            y: e.y - 110,
            vx: e.face * fxRnd(300, 600),
            vy: fxRnd(-120, 120),
            g: 0,
            t: 0,
            life: 0.2,
            s: 4,
            col: '#ffd24a',
          });
      }
      if (e.t > L.buck.wind + 0.35) go(e, 'lthink', 0, { buckCd: cd(e, L.buck.cd) });
    },
    lkick(e) {
      faceP(e);
      const K = L.kick;
      for (const at of [K.wind, K.wind + 0.28])
        if (e.t > at && e.hits < (at === K.wind ? 1 : 2)) {
          e.hits++;
          SFX.swing();
          const rel = (P.x - e.x) * e.face;
          if (rel > 0 && rel < K.reach + 20 && Math.abs(P.y - e.y) < 26 && P.z < 70)
            hitPlayer(K.dmg, e.face, e.hits === 2);
        }
      if (e.t > K.wind + 0.6) go(e, 'lthink', 0, { kickCd: cd(e, K.cd) });
    },
    ltipsy(e) {
      if (fxRandom() < 0.04) floatTxt(e.x, e.y - 200, '*hic*', '#ffcf6a');
      if (e.t > L.tipsy) go(e, 'lthink', 0, { shotCd: 0.6 });
    },
    // the second phase begins: she whistles, the rig stomps in, she climbs aboard
    lcall(e) {
      faceP(e);
      if (!e.rig) {
        e.rig = { x: G.cam + W + 160, y: e.y, hp: R.hp, on: false };
        SFX.quake();
      }
    },
    lboard: {
      pin: true,
      tick(e) {
        const u = clamp(e.t / 0.5, 0, 1);
        e.x = e.x0 + (e.rig.x - e.x0) * u;
        e.y = e.y0 + (e.rig.y - e.y0) * u;
        e.z = 4 * 120 * u * (1 - u);
        if (u >= 1) {
          Object.assign(e, { z: 0, w: 80 });
          e.rig.on = true;
          SFX.engine();
          G.shake = Math.max(G.shake, 8);
          go(e, 'rthink', 0, { drillCd: 2, gatCd: 3.5, lobCd: 5, stompCd: 1 });
        }
      },
    },
    rthink(e, dt, s) {
      faceP(e);
      if (s.pdown) return;
      if (e.stompCd <= 0 && s.adx < R.stomp.near && s.ady < 60) return go(e, 'rstompw');
      if (e.drillCd <= 0 && s.ady < 40 && s.adx > 200 && onScreen(e))
        return go(e, 'rdrillw', 0, { rdir: e.face });
      if (e.gatCd <= 0 && s.adx > 240 && onScreen(e)) return go(e, 'rgatw', 0, { gy: P.y });
      if (e.lobCd <= 0 && s.adx > 160) return go(e, 'rlobw', 0, { sw: 0 });
      go(e, 'rwalk');
    },
    rwalk(e, dt, s) {
      faceP(e);
      moveTo(e, keepAt(e), P.y, R.speed, dt);
      e.walkT += dt * 3;
      if (e.t > 0.6 || s.adx < R.stomp.near) go(e, 'rthink');
    },
    rdrillw(e) {
      e.face = e.rdir;
      if (fxRandom() < 0.4) dust(e.x - e.face * 40, e.y, 1);
      if (e.t > R.drill.wind) {
        go(e, 'rdrill', 0, { x0: e.x, hitDone: false });
        SFX.dash();
      }
    },
    rdrill: {
      pin: true,
      tick(e, dt) {
        e.face = e.rdir;
        e.x += e.rdir * R.drill.speed * dt;
        e.walkT += dt * 8;
        if (fxRandom() < 0.7) dust(e.x - e.rdir * 50, e.y, 1);
        const rel = (P.x - e.x) * e.rdir;
        if (
          !e.hitDone &&
          rel > 0 &&
          rel < 150 &&
          Math.abs(P.y - e.y) < 36 &&
          P.z < 140 &&
          hitPlayer(R.drill.dmg, e.rdir, true)
        )
          e.hitDone = true;
        if (e.x < G.cam + 90 || e.x > G.cam + W - 90) {
          // the drill into the rock at the arena's edge: stuck a while
          G.shake = Math.max(G.shake, 14);
          SFX.boom();
          dust(e.x + e.rdir * 90, e.y, 14);
          go(e, 'rstuck', 0, { drillCd: cd(e, R.drill.cd) });
        } else if ((e.x - P.x) * e.rdir > 220 || Math.abs(e.x - e.x0) > 900)
          go(e, 'rthink', 0, { drillCd: cd(e, R.drill.cd) });
      },
    },
    rstuck(e) {
      if (fxRandom() < 0.3) spark(e.x + e.face * 120, e.y - 120, '#ffe9a8', false);
      if (e.t > R.drill.stuck) go(e, 'rthink');
    },
    rgatw(e, dt) {
      faceP(e);
      e.gy += clamp(P.y - e.gy, -1, 1) * R.gat.track * dt;
      if (e.t > R.gat.wind) go(e, 'rgat', 0, { n: 0 });
    },
    rgat(e, dt) {
      faceP(e);
      e.gy += clamp(P.y - e.gy, -1, 1) * R.gat.track * dt;
      while (e.n * R.gat.gap <= e.t && e.t < R.gat.t) {
        e.n++;
        G.projs.push({
          k: 'rbolt',
          x: e.x + e.face * 120,
          y: e.gy,
          z: 150,
          vx: e.face * 1100,
          dmg: R.gat.dmg,
          col: '#ffcf5a',
          knock: true,
          life: 2,
        });
        if (e.n % 2) SFX.gun();
      }
      if (e.t > R.gat.t) {
        go(e, 'rvent', 0, { gatCd: cd(e, R.gat.cd) });
        SFX.hiss();
      }
    },
    rvent(e) {
      if (fxRandom() < 0.6)
        G.parts.push({
          k: 'smoke',
          x: e.x + fxRnd(-60, 60),
          y: e.y - fxRnd(150, 240),
          vx: fxRnd(-30, 30),
          vy: fxRnd(-90, -40),
          g: 0,
          t: 0,
          life: 0.8,
          s: fxRnd(10, 18),
          col: 'rgba(240,240,240,.7)',
        });
      if (e.t > R.gat.vent) go(e, 'rthink');
    },
    rlobw(e) {
      faceP(e);
      if (e.t > R.lob.wind && !e.sw) {
        e.sw = 1;
        for (let k = 0; k < R.lob.n; k++) {
          throwJnade(e, e.x + e.face * 40, 210);
          const q = G.projs[G.projs.length - 1];
          q.vx *= 0.7 + k * 0.3;
          q.vy += (k - 1) * 90;
        }
      }
      if (e.t > R.lob.wind + 0.5) go(e, 'rthink', 0, { lobCd: cd(e, R.lob.cd) });
    },
    rstompw(e) {
      if (e.t > R.stomp.wind) {
        const r = R.stomp.r;
        G.parts.push({ k: 'gring', x: e.x, y: e.y, t: 0, life: 0.4, s: r, col: '#ffcf6a' });
        dust(e.x, e.y, 12);
        G.shake = Math.max(G.shake, 12);
        SFX.thud();
        if (((P.x - e.x) / r) ** 2 + ((P.y - e.y) / (r * 0.42)) ** 2 < 1 && P.z < 30)
          hitPlayer(R.stomp.dmg, P.x >= e.x ? 1 : -1, true);
        go(e, 'rthink', 0, { stompCd: cd(e, R.stomp.cd) });
      }
    },
    // wrecked: it shakes and smokes, then bursts and throws her out
    rwreck(e) {
      if (fxRandom() < 0.7) spark(e.x + fxRnd(-80, 80), e.y - fxRnd(60, 220), '#ffb02e', false);
      if (e.t > 1) {
        G.parts.push({ k: 'boom', x: e.x, y: e.y, z: 80, t: 0, life: 0.6, s: 170 });
        SFX.boom();
        G.shake = Math.max(G.shake, 20);
        for (let k = 0; k < 14; k++)
          G.debris.push({
            k: 'shard',
            x: e.x + fxRnd(-60, 60),
            gy: e.y + fxRnd(-10, 10),
            z: fxRnd(40, 200),
            vx: fxRnd(-300, 300),
            vz: fxRnd(200, 500),
            rot: fxRnd(TAU),
            vr: fxRnd(-14, 14),
            len: fxRnd(10, 22),
            col: k % 2 ? '#b8743a' : '#4a4850',
            life: 2,
          });
        e.rig = null;
        e.phase = 3;
        e.w = 18;
        e.hp = Math.max(1, e.hp - R.eject);
        e.rounds = L.gun.rounds;
        barrels([300, 660]);
        go(e, 'leject', 0, { vx: e.face * -200, vz: 520, z: 120 });
      }
    },
    leject: {
      pin: true,
      tick(e, dt) {
        e.x += e.vx * dt;
        e.vz -= 1500 * dt;
        e.z += e.vz * dt;
        if (e.z <= 0) {
          e.z = 0;
          dust(e.x, e.y, 8);
          SFX.thud();
          go(e, 'down');
        }
      },
    },
    ldie(e) {
      if (e.t > L.dieT) e.dead = true;
    },
  },
  ground(e) {
    // spilt whiskey
    for (const s of G.spills ?? []) {
      const k = Math.min(1, s.t / 0.3) * Math.min(1, (L.spill.life - s.t) / 0.8),
        x = s.x - G.cam;
      ctx.save();
      ctx.globalAlpha = 0.8 * k;
      ctx.fillStyle = '#b8701e';
      ctx.beginPath();
      ctx.ellipse(x, s.y, L.spill.r, L.spill.r * 0.42, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,214,120,.6)';
      ctx.beginPath();
      ctx.ellipse(x - 14, s.y - 4, L.spill.r * 0.4, L.spill.r * 0.1, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    if (e.state === 'laim') {
      // the line of her shot, along her lane
      const u = clamp(e.t / (e.phase === 3 ? L.gun.aim3 : L.gun.aim), 0, 1);
      ctx.strokeStyle = `rgba(255,210,74,${0.15 + 0.5 * u})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(e.x - G.cam + e.face * 60, e.y);
      ctx.lineTo(e.x - G.cam + e.face * 900, e.y);
      ctx.stroke();
    } else if (e.state === 'rdrillw') {
      ctx.strokeStyle = 'rgba(255,90,60,.55)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(e.x - G.cam, e.y);
      ctx.lineTo(e.x - G.cam + e.face * 900, e.y);
      ctx.stroke();
    } else if (e.state === 'rgatw' || e.state === 'rgat') {
      ctx.strokeStyle = `rgba(255,120,60,${e.state === 'rgat' ? 0.6 : 0.35})`;
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(e.x - G.cam + e.face * 100, e.gy);
      ctx.lineTo(e.x - G.cam + e.face * 900, e.gy);
      ctx.stroke();
    } else if (e.state === 'rstompw') {
      const r = R.stomp.r,
        u = clamp(e.t / R.stomp.wind, 0, 1);
      ctx.strokeStyle = `rgba(255,140,60,${0.4 + 0.5 * u})`;
      ctx.fillStyle = `rgba(255,120,40,${0.1 + 0.15 * u})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(e.x - G.cam, e.y, r, r * 0.42, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  },
  draw: drawLucyBoss,
  // over her head: the rounds left in her magazine
  over(e) {
    if (inRig(e) || e.dying || e.state === 'rwreck') return;
    const x = e.x - G.cam - (L.gun.rounds * 7) / 2,
      y = e.y - e.z - 200;
    for (let k = 0; k < L.gun.rounds; k++) {
      ctx.fillStyle = k < e.rounds ? '#ffd24a' : 'rgba(30,26,34,.7)';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 1.5;
      ctx.fillRect(x + k * 7, y, 5, 10);
      ctx.strokeRect(x + k * 7, y, 5, 10);
    }
    if (e.state === 'lreload') {
      const u = e.t / (e.phase === 3 ? L.gun.reload3 : L.gun.reload);
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(x, y + 13, L.gun.rounds * 7 * clamp(u, 0, 1), 3);
    }
  },
});

/** Her frame now: [name, index] of her sprites. */
function frame(e) {
  const t = e.t,
    st = e.state,
    f = (row, n, fps) => [row, Math.floor(t * fps) % n];
  switch (st) {
    case 'lenter':
    case 'rwalk':
      return f('walk', 8, 12);
    case 'lthink':
      return e.moving
        ? ['walk', Math.floor(e.walkT * 1.6) % 8]
        : ['idle', Math.floor(e.anim * 8) % 11];
    case 'laim':
      return ['throw', t < 0.08 ? 1 : 2];
    case 'lfire':
    case 'lbuck':
      return ['throw', t % L.gun.fanGap < 0.06 ? 3 : 2];
    case 'lreload':
      return ['throw', 1];
    case 'levade':
      return ['evade3', Math.min(5, Math.floor((t / L.evade.t) * 6))];
    case 'lnade':
      return ['grenade', Math.min(4, Math.floor((t / 0.4) * 5))];
    case 'lkick':
      return t < L.kick.wind + 0.2
        ? ['punch1', Math.min(4, Math.floor(t * 14))]
        : ['punch2', Math.min(4, Math.floor((t - 0.42) * 14))];
    case 'ltipsy':
    case 'hurt':
      return ['hurt', Math.floor(t * 4) % 2];
    case 'lcall':
      return ['grenade', 1];
    case 'lboard':
      return ['jump', 2];
    case 'air':
    case 'leject':
      return ['ko', e.vz > 0 ? 1 : 2];
    case 'down':
    case 'ldie':
      return ['ko', 5];
    case 'getup':
      return ['ko', t < 0.2 ? 4 : 3];
    default:
      return ['idle', Math.floor(e.anim * 8) % 11];
  }
}
function drawLucyBoss(e) {
  const x = e.x - G.cam,
    y = e.y - e.z + 2,
    fl = e.flash > 0 && Math.floor(G.time * 30) % 2;
  let a = fl ? 0.6 : 1;
  if (e.state === 'ldie') a *= clamp((L.dieT - e.t) / 0.6, 0, 1);
  if (e.rig) {
    // the rig: in it she sits in the cab; before that it stomps in on its own
    const rx = (e.rig.on ? e.x : e.rig.x) - G.cam,
      ry = e.rig.on ? e.y : e.rig.y;
    drawRig(e, rx, ry, e.rig.on);
    if (e.rig.on) return;
  }
  if (e.state === 'rwreck') {
    drawRig(e, x, e.y, true);
    return;
  }
  const [name, i] = frame(e);
  ctx.save();
  if (e.state === 'ltipsy') {
    // reeling
    ctx.translate(x, y);
    ctx.rotate(Math.sin(e.t * 5) * 0.12);
    ctx.translate(-x, -y);
  }
  sprite(name, i, x, y, e.face < 0, 1, a, 'lucy');
  ctx.restore();
}
/** The whiskey company's drilling rig: two iron legs, a copper boiler with the company's name,
 *  a cab for her, a drill in front, a gatling on its shoulder, a barrel-boiler on its back. */
function drawRig(e, x, y, manned) {
  const fl = e.flash > 0,
    st = e.state,
    face = e.face,
    walk = Math.sin(e.walkT * 2) * (st === 'rwalk' || st === 'rdrill' || st === 'lcall' ? 1 : 0),
    shake = st === 'rwreck' || st === 'rstuck' ? Math.sin(G.time * 70) * 2 : 0;
  const f = (c) => (fl ? '#fff' : c);
  const fill = (c, lw = 2.6) => {
    ctx.fillStyle = f(c);
    ctx.fill();
    ctx.strokeStyle = OL;
    ctx.lineWidth = lw;
    ctx.stroke();
  };
  ctx.save();
  ctx.translate(x + shake, y);
  ctx.scale(face, 1);
  // legs: thigh pistons, knees bent back, big flat feet
  for (const [lx, ph, c] of [
    [-24, Math.PI, '#3a3842'],
    [24, 0, '#4a4850'],
  ]) {
    const lift = Math.max(0, Math.sin(e.walkT * 2 + ph)) * 14 * Math.abs(walk ? 1 : 0),
      fx = lx + Math.cos(e.walkT * 2 + ph) * 16 * (walk ? 1 : 0);
    ctx.lineCap = 'round';
    for (const [w, cc] of [
      [22, OL],
      [16, f(c)],
    ]) {
      ctx.strokeStyle = cc;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(lx, -112);
      ctx.lineTo(lx + 22, -60 - lift);
      ctx.lineTo(fx, -10 - lift);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.rect(fx - 26, -14 - lift, 52, 14);
    fill('#2e2c34');
  }
  // the barrel-boiler on its back (its weak spot), glowing when it is hurt
  ctx.beginPath();
  ctx.ellipse(-92, -160, 30, 44, 0, 0, TAU);
  fill('#8a5a32');
  ctx.fillStyle = f('#4a4850');
  for (const yy of [-190, -130]) ctx.fillRect(-122, yy, 60, 6);
  const hurt = e.rig ? 1 - e.rig.hp / R.hp : 1;
  ctx.fillStyle = `rgba(255,${180 - 100 * hurt},40,${0.3 + 0.5 * hurt})`;
  ctx.beginPath();
  ctx.arc(-92, -160, 12, 0, TAU);
  ctx.fill();
  // the smokestack, puffing
  ctx.beginPath();
  ctx.rect(-56, -262, 18, 60);
  fill('#2e2c34');
  for (let k = 0; k < 3; k++) {
    const u = (G.time * 0.8 + k / 3) % 1;
    ctx.fillStyle = `rgba(60,56,64,${0.5 * (1 - u)})`;
    ctx.beginPath();
    ctx.arc(-47 - u * 20, -270 - u * 70, 10 + u * 16, 0, TAU);
    ctx.fill();
  }
  // the boiler body: copper, rivets, the company's name
  ctx.beginPath();
  ctx.moveTo(-70, -205);
  ctx.lineTo(60, -205);
  ctx.quadraticCurveTo(84, -160, 60, -105);
  ctx.lineTo(-70, -105);
  ctx.quadraticCurveTo(-84, -155, -70, -205);
  ctx.closePath();
  fill('#b8743a');
  ctx.fillStyle = f('#e8c27a');
  for (let k = 0; k < 7; k++) {
    ctx.beginPath();
    ctx.arc(-60 + k * 19, -112, 2.4, 0, TAU);
    ctx.arc(-60 + k * 19, -198, 2.4, 0, TAU);
    ctx.fill();
  }
  ctx.save();
  ctx.scale(face, 1); // (the lettering reads the right way round)
  ctx.fillStyle = f('#3a1a08');
  ctx.font = `900 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('OLD QUARRY', -5 * face, -150);
  ctx.font = `900 10px ${FONT}`;
  ctx.fillText('WHISKEY CO.', -5 * face, -136);
  ctx.restore();
  // the cab, and Lucy in it (her upper half over its rim)
  ctx.beginPath();
  ctx.rect(4, -232, 52, 30);
  fill('#4a4850');
  if (manned) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-60, -420, 200, 190);
    ctx.clip();
    ctx.scale(face, 1);
    const [name, i] =
      st === 'rgat'
        ? ['throw', 3]
        : st === 'rwreck'
          ? ['hurt', 1]
          : ['idle', Math.floor(e.anim * 8) % 11];
    sprite(name, i, 30 * face, -150, face < 0, 0.9, 1, 'lucy');
    ctx.restore();
  }
  ctx.beginPath();
  ctx.rect(0, -206, 62, 10);
  fill('#2e2c34');
  // the drill: a cone in front, turning (fast as it charges)
  const spin = G.time * (st === 'rdrill' || st === 'rdrillw' ? 30 : 4);
  ctx.beginPath();
  ctx.moveTo(62, -152);
  ctx.lineTo(150, -128);
  ctx.lineTo(62, -104);
  ctx.closePath();
  fill('#9aa3b0');
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  for (let k = 0; k < 4; k++) {
    const u = (((spin / TAU + k / 4) % 1) + 1) % 1,
      xx = 62 + u * 80;
    ctx.beginPath();
    ctx.moveTo(xx, -152 + u * 22);
    ctx.lineTo(xx + 10, -104 - u * 22);
    ctx.stroke();
  }
  // the gatling on its shoulder: barrels turning as it fires
  ctx.beginPath();
  ctx.rect(30, -196, 70, 18);
  fill('#2e2c34');
  const g = st === 'rgat' || st === 'rgatw' ? G.time * 40 : 0;
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = f('#6a6870');
    ctx.fillRect(100, -194 + ((k * 6 + g) % 18), 26, 3);
  }
  if (st === 'rgat' && Math.floor(G.time * 30) % 2) {
    ctx.fillStyle = '#fff1c0';
    ctx.beginPath();
    ctx.arc(130, -186, 9, 0, TAU);
    ctx.fill();
  }
  // venting steam / stuck: a white haze from its joints
  if (st === 'rvent' || st === 'rstuck') {
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.arc(-20, -115, 28 + Math.sin(G.time * 20) * 4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
