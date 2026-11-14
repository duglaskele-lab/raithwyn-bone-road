// A balance report: a simple bot plays every fight of every stage on its own, a few times over,
// and the table says how long each took and how much health it cost. The bot is no player: it
// walks up to the nearest foe and punches (a jump kick at the flyers, a dark ball when it has
// the rage and a foe lined up) and never steps out of a blow's way, so its numbers are a rough
// upper bound, good for comparing one fight with another and a change with what was before.
//
//   node tools/balance.mjs            every stage
//   node tools/balance.mjs 3 4        only these stages
//   SEEDS=12 node tools/balance.mjs   more runs of each fight (6 by default)
import { APP, G, P, reset } from '../src/state.js';
import { keys, pressed } from '../src/input.js';
import { seedRandom } from '../src/util.js';
import { update, alive } from '../src/world.js';
import { camTo, LEVELS, pathAt, pathPx, startLevel } from '../src/level.js';
import { GB, GT } from '../src/config.js';
import '../src/foes/index.js';

const DT = 1 / 60,
  SEEDS = +(process.env.SEEDS ?? 6),
  LIMIT = 240;

/** The world at fight `i` of stage `n`, the fight about to start. */
function atFight(n, i, seed) {
  seedRandom(seed);
  for (const k in keys) delete keys[k];
  for (const k in pressed) delete pressed[k];
  reset();
  APP.state = 'play';
  if (n > 1) startLevel(n);
  G.banner = null;
  G.secretDone = true;
  G.waveI = i;
  const w = LEVELS[n].waves[i];
  if (n === 1) {
    G.cam = w.x;
    Object.assign(P, { x: w.x + 300, y: (GT + GB) / 2 });
  } else {
    const d = pathPx(w.s);
    camTo(d);
    const c = pathAt(d);
    Object.assign(P, { x: c.x, y: c.y });
  }
  P.inv = 0;
  P.rage = 100;
}
// (when nothing has lost health for a while the bot is stuck — a gap between the roofs in its
// way, most likely — and takes a running jump at the foe it is after)
let stuck = 0,
  lastHp = 0;
/** The bot's buttons for this frame. */
function think() {
  for (const k in keys) delete keys[k];
  const p = P;
  if (p.state === 'frozen' || p.state === 'grabbed') {
    if (Math.floor(G.time * 30) % 2) pressed.atk = true;
    return;
  }
  const foes = alive().filter(
    (e) => e.x > G.cam - 40 && e.x < G.cam + 1000 && e.state !== 'pitfall',
  );
  if (!foes.length) return;
  let e = foes[0];
  for (const f of foes)
    if (
      Math.abs(f.x - p.x) + Math.abs(f.y - p.y) * 2 <
      Math.abs(e.x - p.x) + Math.abs(e.y - p.y) * 2
    )
      e = f;
  const hp = foes.reduce((n, f) => n + f.hp, 0);
  stuck = hp === lastHp ? stuck + DT : 0;
  lastHp = hp;
  const dx = e.x - p.x,
    dy = e.y - p.y,
    adx = Math.abs(dx),
    big = e.T.bigBoss ? 150 : 0,
    want = 64 + big + e.w;
  if (p.state === 'jump') {
    pressed.atk = true;
    keys[dx > 0 ? 'r' : 'l'] = true;
    return;
  }
  if (stuck > 5 && adx > 120) {
    keys[dx > 0 ? 'r' : 'l'] = keys.run = true;
    if (Math.floor(G.time * 2) % 2) pressed.jump = true;
    return;
  }
  if (Math.abs(dy) > 10) keys[dy > 0 ? 'd' : 'u'] = true;
  if (adx > want + 20) {
    keys[dx > 0 ? 'r' : 'l'] = true;
    if (adx > 260) keys.run = true;
  } else if (adx < want - 40) keys[dx > 0 ? 'l' : 'r'] = true;
  else if (Math.abs(dy) <= 22) {
    if (p.face !== Math.sign(dx) && ['idle', 'walk', 'run'].includes(p.state))
      keys[dx > 0 ? 'r' : 'l'] = true;
    else if (e.z > 90 || e.T.bigBoss) pressed.jump = Math.floor(G.time * 4) % 2 === 0 || e.z > 90;
    keys.atk = true;
  }
  // a dark ball at a foe worth one, lined up in front of her
  if (p.rage >= 100 && Math.abs(dy) < 18 && adx > 90 && adx < 420 && e.hp > 45 && p.face * dx > 0)
    pressed.hado = true;
}
/** Plays one fight; returns { t, dmg, out } (out: it did not end in time). */
function play(n, i, seed) {
  atFight(n, i, seed);
  stuck = 0;
  let dmg = 0,
    t = 0,
    last = P.hp;
  while (t < LIMIT) {
    think();
    update(DT);
    for (const k in pressed) delete pressed[k];
    t += DT;
    if (P.hp < last) dmg += last - P.hp;
    P.hp = P.maxHp;
    P.lives = 2;
    last = P.hp;
    if (G.waveI !== i && !G.wave) break;
    if (G.waveI > i) break;
    if (APP.state !== 'play') break;
  }
  return { t, dmg, out: t >= LIMIT };
}

const stages = process.argv.slice(2).map(Number).filter(Boolean);
for (const n of stages.length ? stages : [1, 2, 3, 4]) {
  const rows = [];
  let T = 0,
    D = 0;
  LEVELS[n].waves.forEach((w, i) => {
    let t = 0,
      d = 0,
      out = 0;
    for (let s = 1; s <= SEEDS; s++) {
      const r = play(n, i, s * 101 + i);
      t += r.t;
      d += r.dmg;
      out += r.out;
    }
    t /= SEEDS;
    d /= SEEDS;
    T += t;
    D += d;
    rows.push({
      fight: i + 1,
      what: w.name ?? (w.sp ? w.sp[0][0] : `lvl ${w.lvl}`),
      seconds: Math.round(t),
      'health lost': Math.round(d),
      'not finished': out || '',
    });
  });
  console.log(
    `\nStage ${n}: ${rows.length} fights, ${Math.round(T)} s of fighting, ${Math.round(D)} health lost`,
  );
  console.table(rows);
}
