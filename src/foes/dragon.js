// The Bone Dragon, the final boss. It has its own rig and AI in src/dragon.js; this file
// plugs it into the foe registry.
import { GT, W } from '../config.js';
import { G, P } from '../state.js';
import { SFX } from '../audio.js';
import { finale, killEnemy } from '../combat.js';
import { dragonDie, dragonInterrupt, dragonPush, updDragon } from '../dragon.js';
import { scoreMult } from '../style.js';
import { defineFoe } from './registry.js';

export default defineFoe('dragon', {
  spawn(e, side, placed) {
    if (!placed) {
      e.x = G.cam + W - 300;
      e.y = GT + 80;
    }
    Object.assign(e, { state: 'intro', face: -1, z: 420, w: 120, laserCd: 2, leapCd: 0, cd: 1 });
    SFX.boss();
    G.banner = { a: '@dragon', b: 'dragonBanner', t: 0 };
  },
  update: updDragon,
  immune: (e) => e.state === 'intro' || e.state === 'dying',
  // only a heavy blow during some wind-ups staggers the dragon (see dragonInterrupt)
  onHit(e, dmg, dir, knock, src) {
    if (e.hp <= 0) killEnemy(e, dir);
    else {
      dragonPush(e, dir, knock || src === 'hado' || src === 'super');
      dragonInterrupt(e, knock, src);
    }
    return true;
  },
  // it does not fall to bones: it roars, collapses and breaks apart (dragon.js)
  die(e) {
    if (e.state === 'dying') return;
    P.score += Math.round(e.T.score * scoreMult());
    dragonDie(e);
    finale(e);
  },
});
