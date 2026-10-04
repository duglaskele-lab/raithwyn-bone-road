// The rocker rides across the screen on a motorcycle (every second one on the long chopper)
// until a hit knocks him off; on foot he throws a chain that pulls the player in.
import { CHAIN, GB, GT, HOG, RW, W } from '../config.js';
import { clamp, rnd } from '../util.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { hitPlayer, killEnemy } from '../combat.js';
import { defineFoe } from './registry.js';
import { faceP, go } from './kit.js';

// The bike: how far it is hidden off screen, how far its hit box reaches along the road.
const offRoad = (e) => (e.bike === 'hog' ? 200 : 150);
export const bikeReach = (e) => (e.bike === 'hog' ? HOG.half : 58);

export default defineFoe('biker', {
  timers: ['chCd'],
  spawn(e, side) {
    // every second rocker rides the long chopper, which hits along its whole length
    const d = side < 0 ? 1 : -1;
    e.bike = G.bikes++ % 2 ? 'hog' : 'bike';
    e.state = 'ride';
    e.mounted = true;
    e.rdir = e.face = d;
    e.x = d > 0 ? G.cam - offRoad(e) : G.cam + W + offRoad(e);
    e.y = clamp(P.y, GT + 8, GB - 4);
    e.w = e.bike === 'hog' ? 48 : 32;
  },
  moves: [
    {
      when: (e, s) =>
        e.chCd <= 0 && s.adx > 170 && s.adx < CHAIN - 10 && s.ady < 18 && !s.pdown && P.inv <= 0,
      go: (e) => go(e, 'chwind', 0, { engage: false }),
    },
  ],
  // waiting off screen before the ride it cannot be hit
  immune: (e) => e.state === 'ride' && e.t < RW,
  onHit(e, dmg, dir) {
    if (!e.mounted) return false;
    // knocked off the bike
    e.mounted = false;
    e.w = 16 * e.T.scale;
    G.debris.push({
      k: 'bike',
      x: e.x,
      gy: e.y,
      z: 0,
      vx: e.rdir * 380,
      vz: 0,
      rot: 0,
      vr: 0,
      dir: e.rdir,
      hog: e.bike === 'hog',
      tilt: 0,
      life: 2.6,
    });
    G.shake = Math.max(G.shake, 8);
    if (e.hp <= 0) {
      killEnemy(e, dir);
      return true;
    }
    go(e, 'air', 0, { z: 56, vx: e.rdir * 150, vz: 430, chCd: rnd(2, 3.5) });
    return true;
  },
  states: {
    ride(e, dt) {
      if (e.t < RW) {
        e.x = e.rdir > 0 ? G.cam - offRoad(e) : G.cam + W + offRoad(e);
        e.y += clamp(P.y - e.y, -1, 1) * 170 * dt;
        if (!e.rev && e.t > 0.12) {
          e.rev = 1;
          SFX.engine();
        }
        return;
      }
      e.x += e.rdir * 560 * dt;
      if (Math.random() < 0.7)
        G.parts.push({
          k: 'dust',
          x: e.x - e.rdir * (e.bike === 'hog' ? 100 : 58),
          y: e.y - 26 + rnd(-4, 4),
          vx: -e.rdir * 70,
          vy: -30,
          g: -40,
          t: 0,
          life: 0.4,
          s: rnd(4, 8),
          col: '#d5dcdc',
        });
      // the hit box runs the length of the bike, the chopper's ram included
      const rel = (P.x - e.x) * e.rdir,
        back = bikeReach(e);
      if (!e.hitDone && rel > -back && rel < (e.bike === 'hog' ? HOG.front : back)) {
        if (
          Math.abs(P.y - e.y) < 22 &&
          P.z < 46 &&
          hitPlayer(e.bike === 'hog' ? 16 : 14, e.rdir, true)
        )
          e.hitDone = true;
      }
      if (
        (e.rdir > 0 && e.x > G.cam + W + offRoad(e)) ||
        (e.rdir < 0 && e.x < G.cam - offRoad(e))
      ) {
        e.rdir *= -1;
        e.face = e.rdir;
        e.t = 0;
        e.rev = 0;
        e.hitDone = false;
      }
    },
    chwind(e) {
      faceP(e);
      if (e.t > 0.55) {
        go(e, 'chain', 0, { hitDone: false });
        SFX.swing();
      }
    },
    chain(e, dt, s) {
      const tip = Math.min(CHAIN, e.t * 1150);
      if (
        s.dx * e.face > 0 &&
        s.adx <= tip + 10 &&
        s.adx > 40 &&
        s.ady < 22 &&
        P.z < 70 &&
        P.inv <= 0 &&
        G.state === 'play' &&
        !['ko', 'down', 'getup', 'dead', 'win', 'pulled'].includes(P.state)
      ) {
        Object.assign(P, { state: 'pulled', puller: e, t: 0, z: 0, vz: 0, buf: null });
        go(e, 'pull', 0, { chCd: rnd(4, 6) });
        SFX.clack();
        SFX.clack();
        G.shake = Math.max(G.shake, 4);
      } else if (e.t > CHAIN / 1150 + 0.18) go(e, 'recover', 0, { chCd: rnd(3.5, 5.5) });
    },
    pull(e) {
      if (P.state !== 'pulled' || P.puller !== e) go(e, 'recover');
    },
  },
});
