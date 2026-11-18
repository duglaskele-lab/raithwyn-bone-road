// The tiger samurai (TIGER): a tiger in black glasses, a kimono and hakama, with a light
// katana. His cuts are heavy and slow (J: a chain of three); K is his guard, and K pressed just
// as a blow lands deflects it (after Sekiro's deflect and Devil May Cry 3's Royal Guard): no
// harm, rage gained, the attacker thrown off balance and his next cut the harder. A blow
// blocked late costs rage; out of rage his guard holds against TIGER.guard.breakN blows more,
// then breaks. L is the drawing cut (iai): a dash through the foes in front, and they are cut
// as the blade goes back in. I is the super, as Raithwyn's: a flurry of cuts over the screen.
// Drawn in code, as pixel art (see drawTiger in tigerdraw.js).
import { TAU, TIGER } from './config.js';
import { fxRnd } from './util.js';
import { G, P } from './state.js';
import { keys } from './input.js';
import { SFX } from './audio.js';
import { dust, floatTxt, spark } from './fx.js';
import { addRage, hurtEnemy, poiseLeft, poiseMax, strike, weightOf } from './combat.js';
import { styleGain } from './style.js';
import { FOES } from './foes/registry.js';
import { t } from './i18n.js';

const C = TIGER.cuts,
  GD = TIGER.guard,
  IA = TIGER.iai;
/** The tiger's own states (player.js hands them to tigerTick). */
export const TIGER_STATES = ['katana', 'guard', 'gbreak', 'iai'];
/** Is his guard up (K held, facing the way he faces)? */
export const guarding = (p) => p.who === 'tiger' && p.state === 'guard';

/** A cut of the chain begins (`i`: 0, 1, 2). */
function startCut(p, i, mx) {
  if (mx) p.face = mx;
  Object.assign(p, { state: 'katana', t: 0, cs: i, sw: 0, hit: new Set(), buf: null });
  p.landed = false;
  p.launch = i === 2 && !!keys.u;
}
/** His guard goes up (a press of K: the deflect's moment starts now). */
function raiseGuard(p) {
  const mash = p.gpT !== undefined && G.time - p.gpT < GD.spam;
  p.gpT = G.time;
  p.gWin = mash ? GD.spamWin : GD.deflect;
  if (p.state !== 'guard') Object.assign(p, { state: 'guard', t: 0 });
  p.buf = null;
}
/**
 * In his stance (idle, walking, running): what a buffered press `b` starts. Returns true if it
 * started something.
 */
export function tigerAct(p, b, mx) {
  if (b === 'atk') {
    startCut(p, 0, mx);
    return true;
  }
  if (b === 'bone') {
    raiseGuard(p);
    return true;
  }
  if (b === 'hado') {
    p.buf = null;
    if (p.rage < IA.cost) {
      SFX.deny();
      return true;
    }
    p.rage -= IA.cost;
    if (mx) p.face = mx;
    Object.assign(p, { state: 'iai', t: 0, sw: 0, ix0: p.x, iaiHit: [] });
    SFX.stance();
    return true;
  }
  return false;
}
/** His own states, every frame. */
export function tigerTick(p, dt, mx, my) {
  if (p.ripT > 0) p.ripT -= dt;
  switch (p.state) {
    case 'katana': {
      const c = C[p.cs],
        act = c.wind + c.act,
        end = act + c.rec;
      if (p.t >= c.wind && p.t < act) {
        // the cut: a step into it, the blade sweeping through
        p.x += p.face * (p.cs === 2 ? 160 : 90) * dt;
        if (!p.sw) {
          p.sw = 1;
          SFX.swing();
          SFX.zap();
        }
        const rip = p.ripT > 0 ? GD.ripK : 1;
        strike({
          x0: -10,
          x1: c.x1,
          dy: c.dy,
          dmg: c.dmg * rip,
          knock: c.knock || rip > 1,
          rage: c.rage,
          src: 'katana',
          launch: p.launch,
        });
        if (p.landed && rip > 1) p.ripT = 0;
      }
      // after the cut: J goes on to the next, K raises his guard
      if (p.t >= act) {
        if (p.bufT > 0 && p.buf === 'bone') raiseGuard(p);
        else if (p.cs < 2 && ((p.bufT > 0 && p.buf === 'atk') || keys.atk) && p.t >= act + 0.04)
          startCut(p, p.cs + 1, mx);
        else if (p.t > end) toStance(p);
      }
      break;
    }
    case 'guard': {
      // K held: the guard stays up; he can step about slowly, facing the same way
      if (p.bufT > 0 && p.buf === 'bone') raiseGuard(p);
      p.x += mx * GD.walk * dt;
      p.y += my * GD.walk * 0.8 * dt;
      if (p.bufT > 0 && p.buf === 'atk') startCut(p, 0, 0);
      else if (!keys.bone && p.t > 0.12) toStance(p);
      break;
    }
    case 'gbreak':
      // his guard broken: he reels a moment
      p.x -= p.face * 60 * dt;
      if (p.t > 0.5) toStance(p);
      break;
    case 'iai': {
      const dashEnd = IA.wind + IA.dash;
      if (p.t >= IA.wind && p.t < dashEnd) {
        // the dash: untouchable, through the foes in front; who he passes is marked
        if (!p.sw) {
          p.sw = 1;
          p.inv = Math.max(p.inv, IA.dash + 0.08);
          SFX.dash();
          dust(p.x, p.y, 8);
        }
        const x0 = p.x;
        p.x += p.face * (IA.dist / IA.dash) * dt;
        for (const e of G.enemies.concat(G.props)) {
          if (e.dead || e.dying || e.neutral || p.iaiHit.includes(e)) continue;
          const lo = Math.min(x0, p.x) - (e.w ?? 16),
            hi = Math.max(x0, p.x) + (e.w ?? 16);
          if (e.x > lo && e.x < hi && Math.abs(e.y - p.y) < 34 && (e.isProp || e.z < 150))
            p.iaiHit.push(e);
        }
      } else if (p.t >= dashEnd && p.sw === 1 && p.t > dashEnd + IA.rec * 0.45) {
        // the blade goes back in: click, and everyone he passed through is cut
        p.sw = 2;
        SFX.clang();
        G.shake = Math.max(G.shake, 10);
        G.flash = Math.max(G.flash, 0.15);
        for (const e of p.iaiHit) {
          if (e.dead) continue;
          if (hurtEnemy(e, IA.dmg, p.face, true, 'iai') && !e.isProp) {
            styleGain(14);
            spark(e.x, e.y - e.z - 90, '#bff8ff', true);
          }
        }
      }
      if (p.t > dashEnd + IA.rec) toStance(p);
      break;
    }
  }
}
function toStance(p) {
  p.state = 'idle';
  p.t = 0;
  p.an = ['idle', 0];
}

// --- the guard -------------------------------------------------------------------------------------

/** The foe whose blow it was, most likely: the nearest in front of him. */
function attacker(p) {
  let best = null,
    bd = 1e9;
  for (const e of G.enemies) {
    if (e.dead || e.dying || e.neutral) continue;
    const dx = (e.x - p.x) * p.face,
      d = dx + Math.abs(e.y - p.y) * 2;
    if (dx > -20 && dx < 320 && Math.abs(e.y - p.y) < 70 && d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}
/** A deflect throws the attacker off balance: poise lost; a light foe (or one with no poise
 *  left) reels; a boss, or one in an attack nothing stops, only takes it. */
function unbalance(e) {
  const F = FOES[e.type];
  spark(e.x - P.face * 10, e.y - e.z - 90 * (e.T?.scale ?? 1), '#bff8ff', true);
  if (e.T.bigBoss || weightOf(e) === 'boss' || F?.unstoppable?.(e)) return;
  const left = poiseLeft(e) - GD.posture;
  e.poise = Math.max(0, left);
  e.poiseOf = poiseMax(e);
  e.poiseT = 3;
  if (left > 0 && weightOf(e) !== 'light') return;
  Object.assign(e, { state: 'hurt', t: -GD.stagger + 0.32, vx: P.face * 140, engage: false });
  e.z = 0;
}
/**
 * A blow (`dmg`, pushing him `dir`-wards, `knock` a heavy one) meets the tiger: his guard's say.
 * Returns 'deflect' or 'block' when it does him no harm, null when it goes through (from
 * behind, his guard not up, or broken).
 */
export function guardHit(p, dmg, dir, knock) {
  if (!guarding(p) || dir !== -p.face) return null;
  if (G.time - (p.gpT ?? -9) <= p.gWin) {
    // the deflect: a ring of steel, no harm; rage, and the attacker off balance
    const e = attacker(p);
    if (e) unbalance(e);
    addRage(GD.rage);
    styleGain(20);
    p.ripT = GD.riposte;
    p.gBreak = 0;
    p.gpT = -9; // (one deflect a press)
    p.defT = 0.25;
    G.freeze = Math.max(G.freeze, 0.1);
    G.shake = Math.max(G.shake, 6);
    SFX.clang();
    SFX.parry();
    deflectSparks(p);
    floatTxt(p.x, p.y - 200, t('deflect'), '#bff8ff');
    return 'deflect';
  }
  // blocked late: no harm, but it costs rage; with none, the guard holds a few blows more
  const cost = GD.cost * (knock ? 2 : 1);
  if (p.rage >= cost) p.gBreak = 0;
  if (p.rage <= 0 && (p.gBreak = (p.gBreak ?? 0) + 1) > GD.breakN) {
    p.gBreak = 0;
    floatTxt(p.x, p.y - 200, t('guardBreak'), '#ff6a5a');
    SFX.shatter();
    return null;
  }
  p.rage = Math.max(0, p.rage - cost);
  p.x -= p.face * (knock ? 30 : 12);
  p.blkT = 0.15;
  G.freeze = Math.max(G.freeze, 0.05);
  G.shake = Math.max(G.shake, knock ? 6 : 3);
  SFX.clang();
  spark(p.x + p.face * 30, p.y - 130, '#ffe9a8', false);
  return 'block';
}
function deflectSparks(p) {
  const x = p.x + p.face * 40,
    y = p.y - 135;
  G.parts.push({ k: 'gring', x, y: p.y, t: 0, life: 0.3, s: 70, col: '#bff8ff' });
  for (let k = 0; k < 16; k++) {
    const a = fxRnd(0, TAU),
      v = fxRnd(160, 460);
    G.parts.push({
      k: 'glow',
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      g: 500,
      t: 0,
      life: fxRnd(0.15, 0.35),
      s: fxRnd(2, 4.5),
      col: k % 3 ? '#ffe9a8' : '#bff8ff',
    });
  }
}
/** The super's flurry: white cuts flashing over the whole screen (its harm is Raithwyn's nova). */
export function flurry() {
  for (let k = 0; k < 16; k++) {
    const x = G.cam + fxRnd(60, 900),
      y = G.camY + fxRnd(240, 520),
      a = fxRnd(0, Math.PI),
      L = fxRnd(120, 260);
    G.parts.push({
      k: 'cut',
      x: x - Math.cos(a) * L,
      y: y - Math.sin(a) * L * 0.5,
      x2: x + Math.cos(a) * L,
      y2: y + Math.sin(a) * L * 0.5,
      t: -k * 0.02,
      life: 0.22,
    });
  }
}
