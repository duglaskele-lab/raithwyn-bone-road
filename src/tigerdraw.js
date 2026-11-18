// The tiger samurai, drawn in code until his sprites are made: a tiger in black glasses, a dark
// blue kimono with a red obi, grey hakama, tabi and zori, and a light katana. He is painted at
// half size into a little canvas of his own (a figure of simple shapes posed by his state, see
// tigerPose), its edges made hard, and blown up twice without smoothing — pixel art, as the
// heroines' sprites are. The blade's glow is added on top, soft.
import { TIGER } from './config.js';
import { clamp, ease, lerp } from './util.js';
import { APP, G } from './state.js';
import { ctx } from './gfx.js';

const PXS = 2, // screen pixels to a pixel of his
  BW = 210,
  BH = 180,
  FX = 105, // his feet in his canvas
  FY = 158;
const K = {
  ol: '#140f16',
  fur: '#f08a2a',
  furD: '#b85a16',
  white: '#f6efe2',
  stripe: '#1a1214',
  kimono: '#26315a',
  kimonoD: '#18203e',
  collar: '#efe9dc',
  obi: '#b02a3a',
  hakama: '#4a4a58',
  hakamaD: '#2e2e3a',
  tabi: '#ece6d8',
  zori: '#6a4630',
  glass: '#0c0c14',
  nose: '#e8888a',
  hilt: '#1c1a24',
  wrap: '#d9d2c0',
  tsuba: '#d9a641',
  blade: '#f2ffff',
  edge: '#4fe3ff',
  smear: '#bff8ff',
};
let buf = null,
  bg = null;

// --- poses -----------------------------------------------------------------------------------------
// A pose: `hipH` the hip's height, `lean` (the spine's tilt forward), `head` (its tilt), the feet
// (`f` front, `b` back: [x, height above the ground, negative up]), the hands on the hilt
// (`hand`: from the neck), the sword's angle `sw` (0 ahead, PI/2 straight up), how much of the
// blade is lit (`lit`), the whole figure's turn (`rot`, round the hip).
const STANCE = {
  hipH: 37,
  lean: 0.12,
  head: 0,
  f: [9, 0],
  b: [-11, 0],
  hand: [13, 21],
  sw: 0.85,
  lit: 1,
  rot: 0,
};
const pose = (o) => ({ ...STANCE, ...o });
const mix = (a, b, u) => {
  const o = {};
  for (const k in a)
    o[k] = Array.isArray(a[k])
      ? [lerp(a[k][0], b[k][0], u), lerp(a[k][1], b[k][1], u)]
      : lerp(a[k], b[k] ?? a[k], u);
  return o;
};
// the three cuts: wound up, and where the cut ends
const CUTS = [
  [
    pose({ hand: [6, -6], sw: 2.4, lean: 0.02, hipH: 36 }),
    pose({ hand: [21, 22], sw: -0.75, lean: 0.32, hipH: 33, f: [17, 0], b: [-14, 0] }),
  ],
  [
    pose({ hand: [2, 28], sw: -2.5, lean: 0.2, hipH: 34, f: [12, 0], b: [-12, 0] }),
    pose({ hand: [18, -2], sw: 1.3, lean: 0.22, hipH: 36, f: [16, 0], b: [-12, -2] }),
  ],
  [
    pose({ hand: [-2, -12], sw: 1.95, lean: -0.12, hipH: 35, head: -0.1 }),
    pose({ hand: [23, 26], sw: -1.15, lean: 0.48, hipH: 28, f: [22, 0], b: [-20, 0] }),
  ],
];
const GUARD = pose({ hand: [17, 15], sw: 1.45, hipH: 34, f: [12, 0], b: [-15, 0], lean: 0.06 });

/** His pose now, from his state and its clock; `smear`: the arc a cut's blade has swept. */
export function tigerPose(p) {
  const t = p.t,
    br = Math.sin(G.time * 2.6) * 0.7;
  switch (p.state) {
    case 'walk': {
      const ph = t * 9.5,
        s = Math.sin(ph),
        c = Math.cos(ph);
      return pose({
        hipH: 37 + Math.abs(s),
        f: [9 + 10 * s, -Math.max(0, c) * 5],
        b: [-10 - 10 * s, -Math.max(0, -c) * 5],
      });
    }
    case 'run': {
      const ph = t * 14,
        s = Math.sin(ph),
        c = Math.cos(ph);
      // the blade held low behind him as he runs (wakigamae)
      return pose({
        hipH: 35 + Math.abs(s) * 2,
        lean: 0.4,
        f: [8 + 18 * s, -Math.max(0, c) * 10],
        b: [-8 - 18 * s, -Math.max(0, -c) * 10],
        hand: [6, 27],
        sw: Math.PI + 0.5,
      });
    }
    case 'jump': {
      if (p.ph !== 1) return pose({ hipH: 30, f: [10, 0], b: [-12, 0], lean: 0.25 });
      const o = pose({ hipH: 37, f: [10, -16], b: [-6, -12], hand: [12, 14], sw: 1.0 });
      if (p.airT !== null && p.airT < 0.3) {
        // the cut in a jump: the blade swept round and down in front
        const u = clamp(p.airT / 0.18, 0, 1);
        Object.assign(o, { hand: [18, lerp(0, 22, u)], sw: lerp(1.8, -1.0, u), lean: 0.3 });
        o.smear = [1.8, o.sw, u];
      }
      return o;
    }
    case 'katana': {
      const c = TIGER.cuts[p.cs],
        [w, e] = CUTS[p.cs];
      if (t < c.wind) return mix(STANCE, w, ease(t / c.wind));
      if (t < c.wind + c.act) {
        const u = (t - c.wind) / c.act,
          o = mix(w, e, u);
        o.smear = [w.sw, o.sw, 1];
        return o;
      }
      const u = (t - c.wind - c.act) / c.rec,
        o = mix(e, STANCE, ease(clamp((u - 0.35) / 0.65, 0, 1)));
      if (u < 0.3) o.smear = [w.sw, e.sw, 1 - u / 0.3];
      return o;
    }
    case 'guard': {
      const o = { ...GUARD };
      if (p.defT > 0) Object.assign(o, { hand: [21, 8], sw: 0.95 }); // the flick of a deflect
      if (p.blkT > 0) o.hand = [o.hand[0] - 3 + Math.sin(G.time * 90), o.hand[1]];
      return o;
    }
    case 'gbreak':
      return pose({ hand: [-6, 8], sw: 2.6, lean: -0.35, head: -0.3, f: [14, 0], b: [-16, -3] });
    case 'iai': {
      const I = TIGER.iai;
      if (t < I.wind)
        // crouched, the blade dark, the hilt at his hip
        return mix(
          STANCE,
          pose({ hipH: 29, lean: 0.38, hand: [4, 30], sw: -2.75, lit: 0, f: [16, 0], b: [-16, 0] }),
          ease(t / I.wind),
        );
      const dash = pose({ hipH: 31, lean: 0.5, hand: [24, 18], sw: 0, f: [24, 0], b: [-26, -4] });
      if (p.sw === 2)
        return mix(
          dash,
          pose({ hand: [4, 30], sw: -2.75, lit: 0 }),
          clamp((t - I.wind - I.dash) * 3, 0, 1),
        );
      return dash;
    }
    case 'super':
      if (!p.sw)
        return pose({ hand: [6, -14], sw: Math.PI / 2, hipH: 34, f: [13, 0], b: [-14, 0] });
      return {
        ...pose({ hand: [24, 22], sw: -0.6, lean: 0.4, hipH: 30, f: [20, 0], b: [-18, 0] }),
        smear: [2.4, -0.6, 1 - p.t / 0.45],
      };
    case 'hurt':
    case 'grabbed':
    case 'pulled':
    case 'frozen':
      return pose({ lean: -0.3, head: -0.3, hand: [8, 18], sw: 0.4, f: [12, 0], b: [-8, 0] });
    case 'dazed':
      return pose({
        head: Math.sin(t * 8) * 0.3,
        lean: Math.sin(t * 5) * 0.15,
        hand: [8, 22],
        sw: -0.2,
      });
    case 'ko':
    case 'plunge':
      return pose({
        rot: -0.6 - Math.min(1, t * 4) * 0.6,
        f: [10, -14],
        b: [-4, -10],
        hand: [4, 10],
        sw: 1.8,
      });
    case 'down':
    case 'dead':
      return pose({ rot: -1.5, hipH: 9, f: [12, -6], b: [8, -6], hand: [10, 18], sw: 0.2 });
    case 'getup':
      return mix(
        pose({ rot: -1.5, hipH: 9, f: [12, -6], b: [8, -6], hand: [10, 18], sw: 0.2 }),
        STANCE,
        ease(clamp(t / 0.24, 0, 1)),
      );
    case 'ride':
      return pose({ hipH: 32, f: [16, 8], b: [4, 10], hand: [16, 18], sw: 0.6 });
    case 'win':
      // the blade resting on his shoulder
      return pose({ hand: [10, 4], sw: 2.75, f: [11, 0], b: [-12, 0], head: 0.08 + br * 0.02 });
    default:
      return pose({ hipH: 37 + br * 0.5, hand: [13, 21 + br * 0.6] });
  }
}

// --- painting --------------------------------------------------------------------------------------

function shape(g, pts, fill) {
  g.beginPath();
  pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = K.ol;
  g.lineWidth = 1.4;
  g.stroke();
}
function ell(g, x, y, rx, ry, fill, rot = 0) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = K.ol;
  g.lineWidth = 1.4;
  g.stroke();
}
/** A limb as a band from a to b, `wa` wide at a and `wb` at b. */
function band(g, a, b, wa, wb, fill) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    L = Math.hypot(dx, dy) || 1,
    nx = -dy / L,
    ny = dx / L;
  shape(
    g,
    [
      [a[0] + (nx * wa) / 2, a[1] + (ny * wa) / 2],
      [b[0] + (nx * wb) / 2, b[1] + (ny * wb) / 2],
      [b[0] - (nx * wb) / 2, b[1] - (ny * wb) / 2],
      [a[0] - (nx * wa) / 2, a[1] - (ny * wa) / 2],
    ],
    fill,
  );
}
/** A two-bone limb from `a` to the end `c`, bent `bend` way (1: the joint forward / up). */
function ik(a, c, L1, L2, bend) {
  const dx = c[0] - a[0],
    dy = c[1] - a[1],
    d = clamp(Math.hypot(dx, dy), 1, L1 + L2 - 0.01),
    base = Math.atan2(dy, dx),
    k = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)),
    ang = base - bend * k;
  return [a[0] + Math.cos(ang) * L1, a[1] + Math.sin(ang) * L1];
}
const rot = (v, a) => [
  v[0] * Math.cos(a) - v[1] * Math.sin(a),
  v[0] * Math.sin(a) + v[1] * Math.cos(a),
];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

/** Paints him in his pose, facing +x, his feet at (0, 0); returns where his blade runs. */
function paint(g, o, p) {
  const hip = [0, -o.hipH],
    sp = rot([0, -30], o.lean),
    neck = add(hip, sp),
    at = (v) => add(neck, rot(v, o.lean));
  // the tail, swaying behind
  const sway = Math.sin(G.time * 3) * 3;
  const tail = [
    add(hip, [-8, -3]),
    add(hip, [-19, 1]),
    add(hip, [-27, -6 + sway]),
    add(hip, [-30, -15 + sway]),
  ];
  for (const [w, c] of [
    [6.5, K.ol],
    [4, K.fur],
  ]) {
    g.strokeStyle = c;
    g.lineWidth = w;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    tail.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
    g.stroke();
  }
  g.fillStyle = K.stripe;
  for (const q of [tail[1], tail[2]]) g.fillRect(q[0] - 1, q[1] - 2, 2, 4);
  ell(g, tail[3][0], tail[3][1], 2.6, 3, K.stripe);
  // the legs in their hakama (the far one darker), tabi and zori
  const leg = (foot, off, c) => {
    const h = add(hip, [off, 2]),
      knee = ik(h, foot, 19, 19, 1),
      a = foot;
    band(g, h, knee, 15, 15, c);
    band(g, knee, a, 15, 20, c);
    g.strokeStyle = K.ol;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo((h[0] + knee[0]) / 2, (h[1] + knee[1]) / 2);
    g.lineTo((knee[0] + a[0]) / 2 + 1, (knee[1] + a[1]) / 2 + 3);
    g.stroke();
    shape(
      g,
      [
        [a[0] - 3, a[1] - 1],
        [a[0] + 7, a[1] - 1],
        [a[0] + 8, a[1] + 1.5],
        [a[0] - 4, a[1] + 1.5],
      ],
      K.zori,
    );
    ell(g, a[0] + 2, a[1] - 2.5, 4, 2.4, K.tabi);
  };
  leg(o.b, -2, K.hakamaD);
  leg(o.f, 3, K.hakama);
  // the back arm, reaching round to the hilt
  const H = at(o.hand),
    bs = at([-5, 3]),
    fs = at([4, 3]);
  const eb = ik(bs, H, 12, 12, -1);
  band(g, bs, eb, 8, 7, K.kimonoD);
  band(g, eb, H, 7, 5, K.kimonoD);
  // the hakama's skirt over the hips, pleated
  shape(
    g,
    [add(hip, [-13, -3]), add(hip, [14, -3]), add(hip, [18, 14]), add(hip, [-17, 14])],
    K.hakama,
  );
  g.strokeStyle = K.hakamaD;
  g.lineWidth = 1;
  g.beginPath();
  for (const x of [-6, 0, 6]) {
    g.moveTo(hip[0] + x, hip[1] - 1);
    g.lineTo(hip[0] + x * 1.2, hip[1] + 12);
  }
  g.stroke();
  // the kimono: the body, the white collar crossing, the red obi
  const n = rot([1, 0], o.lean);
  const P2 = (base, w) => [base[0] + n[0] * w, base[1] + n[1] * w];
  shape(g, [P2(hip, -12), P2(hip, 13), P2(neck, 14), P2(neck, -13)], K.kimono);
  const chest = add(hip, rot([0, -14], o.lean));
  g.strokeStyle = K.collar;
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(...P2(neck, -2));
  g.lineTo(...P2(chest, 7));
  g.moveTo(...P2(neck, 5));
  g.lineTo(...P2(chest, 4));
  g.stroke();
  const o0 = add(hip, rot([0, -3], o.lean)),
    o1 = add(hip, rot([0, -9], o.lean));
  shape(g, [P2(o0, -13), P2(o0, 14), P2(o1, 14), P2(o1, -13)], K.obi);
  ell(g, ...P2(add(hip, rot([0, -6], o.lean)), -13), 2.5, 2, K.obi);
  // the head: ears, the fur and its stripes, the white ruff and muzzle, black glasses
  const ha = o.lean + o.head,
    hc = add(neck, rot([4, -12], o.lean));
  g.save();
  g.translate(hc[0], hc[1]);
  g.rotate(ha);
  g.scale(1.28, 1.28);
  shape(
    g,
    [
      [-8, -6],
      [-6, -15],
      [-1, -8],
    ],
    K.fur,
  );
  shape(
    g,
    [
      [1, -8],
      [5, -15],
      [8, -6],
    ],
    K.fur,
  );
  g.fillStyle = K.white;
  g.fillRect(-6, -11, 2, 3);
  g.fillRect(4, -11, 2, 3);
  ell(g, 0, 0, 11, 10, K.fur);
  shape(
    g,
    [
      [-9, 2],
      [-12, 6],
      [-8, 7],
      [-10, 10],
      [-4, 9],
      [0, 11],
      [4, 9],
      [2, 4],
    ],
    K.white,
  );
  ell(g, 8, 4, 6, 4.2, K.white);
  g.fillStyle = K.stripe;
  for (const [x, y, w, h] of [
    [-2, -9, 1.5, 4],
    [1, -10, 1.5, 4],
    [-8, -3, 4, 1.5],
    [-9, 1, 4, 1.5],
    [3, -8, 1.5, 3],
  ])
    g.fillRect(x, y, w, h);
  ell(g, 13, 1.5, 2.2, 1.6, K.nose);
  g.strokeStyle = K.ol;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(8, 6.5);
  g.quadraticCurveTo(11, 8, 14, 5.5);
  g.stroke();
  g.fillStyle = K.white;
  g.fillRect(10, 6.5, 1.5, 1.6); // a fang showing in his grin
  // the glasses: two black lenses, a bridge, an arm back to the ear; a glint
  g.fillStyle = K.glass;
  g.fillRect(3, -4, 6, 4);
  g.fillRect(10, -4, 3.5, 3.5);
  g.fillRect(8, -3.5, 2.5, 1.2);
  g.fillRect(-4, -3.6, 7, 1.2);
  if (Math.floor(G.time * 1.3) % 4 === 0 || p.state === 'win') {
    g.fillStyle = '#ffffff';
    g.fillRect(4, -3.5, 1.6, 1.6);
  }
  g.restore();
  // the front arm: the wide sleeve, the paws on the hilt
  const ef = ik(fs, H, 12, 12, -1);
  band(g, fs, ef, 9, 8, K.kimono);
  shape(g, [fs, ef, add(ef, [-3, 8]), add(fs, [-4, 6])], K.kimono); // the sleeve hanging
  band(g, ef, H, 7, 5.5, K.kimono);
  // the katana: the hilt in his paws, the guard, the blade of light
  const d = [Math.cos(o.sw), -Math.sin(o.sw)],
    pt = (k) => [H[0] + d[0] * k, H[1] + d[1] * k],
    lit = o.lit,
    tip = pt(4 + 40 * lit);
  if (o.smear) smear(g, H, o.smear);
  g.lineCap = 'butt';
  for (const [w, c] of [
    [4.2, K.ol],
    [2.6, K.hilt],
  ]) {
    g.strokeStyle = c;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(...pt(-9));
    g.lineTo(...pt(3));
    g.stroke();
  }
  g.fillStyle = K.wrap;
  for (const k of [-7, -4, -1]) g.fillRect(pt(k)[0] - 0.7, pt(k)[1] - 0.7, 1.4, 1.4);
  const nn = [-d[1], d[0]];
  g.strokeStyle = K.tsuba;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(pt(3)[0] + nn[0] * 3, pt(3)[1] + nn[1] * 3);
  g.lineTo(pt(3)[0] - nn[0] * 3, pt(3)[1] - nn[1] * 3);
  g.stroke();
  if (lit > 0.05) {
    g.lineCap = 'square';
    for (const [w, c] of [
      [4.6, K.edge],
      [2.2, K.blade],
    ]) {
      g.strokeStyle = c;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(...pt(4.5));
      g.lineTo(...tip);
      g.stroke();
    }
  }
  ell(g, H[0] - d[0] * 1, H[1] - d[1] * 1, 3.3, 3, K.fur);
  ell(g, H[0] - d[0] * 6, H[1] - d[1] * 6, 3.1, 2.8, K.fur);
  return lit > 0.05 ? [pt(4.5), tip] : null;
}
/** The arc a cut's blade has swept: a crescent of pale light. */
function smear(g, H, [a0, a1, k]) {
  if (k <= 0.02 || Math.abs(a1 - a0) < 0.05) return;
  const n = 10,
    pts = [];
  for (let i = 0; i <= n; i++) {
    const a = lerp(a0, a1, i / n),
      r = 46;
    pts.push([H[0] + Math.cos(a) * r, H[1] - Math.sin(a) * r]);
  }
  for (let i = n; i >= 0; i--) {
    const a = lerp(a0, a1, i / n),
      r = 46 - 22 * (i / n) * k;
    pts.push([H[0] + Math.cos(a) * r, H[1] - Math.sin(a) * r]);
  }
  g.beginPath();
  pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
  g.closePath();
  g.fillStyle = K.smear;
  g.fill();
}
/** Hard edges: every pixel either there or not, as in pixel art. */
function harden(g) {
  const im = g.getImageData(0, 0, BW, BH),
    a = im.data;
  for (let i = 3; i < a.length; i += 4) a[i] = a[i] < 110 ? 0 : 255;
  g.putImageData(im, 0, 0);
}
/** Draws the tiger (`alpha` for his blinking while untouchable), his feet at (sx, sy) on screen. */
export function drawTiger(p, sx, sy, alpha = 1) {
  if (!buf) {
    buf = document.createElement('canvas');
    buf.width = BW;
    buf.height = BH;
    bg = buf.getContext('2d', { willReadFrequently: true });
  }
  const o = tigerPose(p);
  bg.setTransform(1, 0, 0, 1, 0, 0);
  bg.clearRect(0, 0, BW, BH);
  bg.translate(FX, FY);
  bg.scale(p.face, 1);
  if (o.rot) {
    bg.translate(0, -o.hipH);
    bg.rotate(o.rot);
    bg.translate(0, o.hipH);
  }
  const blade = paint(bg, o, p);
  if (!APP.lowFx) harden(bg);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, sx - FX * PXS, sy - FY * PXS, BW * PXS, BH * PXS);
  // the blade's glow, soft over the pixels
  if (blade && !o.rot && !APP.lowFx) {
    const [a, b] = blade.map((q) => [sx + q[0] * p.face * PXS, sy + q[1] * PXS]);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const k = p.state === 'super' && !p.sw ? 1 + (p.sup ?? 0) * 2 : 1;
    for (const [w, al] of [
      [16 * k, 0.12],
      [8 * k, 0.22],
    ]) {
      ctx.strokeStyle = `rgba(80,230,255,${al})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
  ctx.restore();
}
