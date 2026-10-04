// The rockers' rides: the motorcycle, the long chopper (HOG) and the chain, drawn in local
// space (facing +x, the ground at y = 0).
import { HOG, OL, TAU } from '../config.js';
import { ctx, rr } from '../gfx.js';

export function chainLine(x0, y0, x1, y1) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = '#b9c4cc';
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}
export function drawBike(t, hog = false) {
  if (hog) return drawHog(t);
  // local space: faces +x, ground at y=0
  const wr = 21;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const fr = (pts, w, c) => {
    for (const [lw, cc] of [
      [w + 4, OL],
      [w, c],
    ]) {
      ctx.strokeStyle = cc;
      ctx.lineWidth = lw;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    }
  };
  for (const wx of [-40, 44]) {
    ctx.fillStyle = OL;
    ctx.beginPath();
    ctx.arc(wx, -wr, wr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#8894a0';
    ctx.beginPath();
    ctx.arc(wx, -wr, wr - 6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a2532';
    ctx.beginPath();
    ctx.arc(wx, -wr, wr - 9, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8894a0';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = t * 18 + (i * TAU) / 6,
        c = Math.cos(a) * (wr - 8),
        sn = Math.sin(a) * (wr - 8);
      ctx.beginPath();
      ctx.moveTo(wx - c, -wr - sn);
      ctx.lineTo(wx + c, -wr + sn);
      ctx.stroke();
    }
  }
  fr(
    [
      [-2, -24],
      [-56, -31],
    ],
    5,
    '#b9c4cc',
  );
  fr(
    [
      [-40, -21],
      [-14, -46],
      [20, -50],
      [34, -70],
    ],
    6,
    '#5b3a78',
  );
  fr(
    [
      [-40, -21],
      [2, -24],
      [20, -50],
    ],
    5,
    '#5b3a78',
  );
  fr(
    [
      [34, -70],
      [44, -21],
    ],
    5,
    '#b9c4cc',
  );
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  ctx.fillStyle = '#8894a0';
  rr(-12, -41, 26, 20, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7a3fb0';
  ctx.beginPath();
  ctx.ellipse(8, -55, 17, 8, -0.1, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#231d2c';
  rr(-32, -55, 27, 8, 4);
  ctx.fill();
  ctx.stroke();
  fr(
    [
      [34, -70],
      [26, -82],
    ],
    4,
    '#b9c4cc',
  );
  ctx.fillStyle = '#ffe9a8';
  ctx.shadowColor = '#ffe9a8';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(41, -62, 5.5, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
}
// The second bike: a long chopper of black iron and bone. A fat studded rear wheel, a raked
// fork, a V-twin with fire coming out of the pipes, a horned skull for a headlight, a sissy bar
// with a skull on top and a ram of bone spikes in front.
function drawHog(t) {
  const iron = '#3a3641',
    rust = '#7c2f1a',
    chrome = '#b9c4cc',
    boneC = '#e6dfc8';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const fr = (pts, w, c) => {
    for (const [lw, cc] of [
      [w + 4, OL],
      [w, c],
    ]) {
      ctx.strokeStyle = cc;
      ctx.lineWidth = lw;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    }
  };
  const poly = (pts, c, lw = 2.2) => {
    ctx.fillStyle = c;
    ctx.strokeStyle = OL;
    ctx.lineWidth = lw;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  const wheel = (wx, wr) => {
    // studs around the tyre, turning with it
    for (let i = 0; i < 10; i++) {
      const a = t * 16 + (i * TAU) / 10,
        c = Math.cos(a),
        sn = Math.sin(a);
      poly(
        [
          [wx + c * (wr - 2) - sn * 3, -wr + sn * (wr - 2) + c * 3],
          [wx + c * (wr + 6), -wr + sn * (wr + 6)],
          [wx + c * (wr - 2) + sn * 3, -wr + sn * (wr - 2) - c * 3],
        ],
        '#8894a0',
        1.6,
      );
    }
    ctx.fillStyle = OL;
    ctx.beginPath();
    ctx.arc(wx, -wr, wr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a2532';
    ctx.beginPath();
    ctx.arc(wx, -wr, wr - 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5b5866';
    ctx.beginPath();
    ctx.arc(wx, -wr, wr - 10, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8894a0';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 3; i++) {
      const a = t * 16 + (i * TAU) / 6,
        c = Math.cos(a) * (wr - 10),
        sn = Math.sin(a) * (wr - 10);
      ctx.beginPath();
      ctx.moveTo(wx - c, -wr - sn);
      ctx.lineTo(wx + c, -wr + sn);
      ctx.stroke();
    }
    ctx.fillStyle = chrome;
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wx, -wr, 4, 0, TAU);
    ctx.fill();
    ctx.stroke();
  };
  // fire out of the pipes
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const py of [-30, -40]) {
    const len = 18 + Math.abs(Math.sin(t * 37 + py)) * 16;
    const g = ctx.createLinearGradient(-92, 0, -92 - len, 0);
    g.addColorStop(0, 'rgba(255,230,140,.95)');
    g.addColorStop(0.5, 'rgba(255,120,40,.7)');
    g.addColorStop(1, 'rgba(200,40,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-92, py - 5);
    ctx.quadraticCurveTo(-92 - len * 0.6, py - 9, -92 - len, py);
    ctx.quadraticCurveTo(-92 - len * 0.6, py + 7, -92, py + 4);
    ctx.fill();
  }
  ctx.restore();
  wheel(-66, 27);
  wheel(84, 22);
  // sissy bar with a skull on top
  fr(
    [
      [-46, -58],
      [-58, -104],
    ],
    4,
    chrome,
  );
  skullCap(-60, -112, boneC);
  // frame
  fr(
    [
      [-66, -27],
      [-34, -54],
      [30, -62],
      [56, -88],
    ],
    7,
    iron,
  );
  fr(
    [
      [-66, -27],
      [-8, -22],
      [30, -62],
    ],
    6,
    iron,
  );
  // long raked fork
  fr(
    [
      [56, -88],
      [84, -22],
    ],
    5,
    chrome,
  );
  fr(
    [
      [62, -90],
      [90, -26],
    ],
    3,
    chrome,
  );
  // pipes along the side to the back
  fr(
    [
      [6, -30],
      [-40, -30],
      [-92, -30],
    ],
    5,
    chrome,
  );
  fr(
    [
      [14, -40],
      [-50, -40],
      [-92, -40],
    ],
    5,
    chrome,
  );
  // V-twin engine with cooling fins
  poly(
    [
      [-18, -26],
      [26, -26],
      [28, -44],
      [-20, -44],
    ],
    '#4a4652',
  );
  for (const [cx, a] of [
    [-6, -0.35],
    [16, 0.35],
  ]) {
    ctx.save();
    ctx.translate(cx, -44);
    ctx.rotate(a);
    poly(
      [
        [-8, 0],
        [8, 0],
        [7, -22],
        [-7, -22],
      ],
      '#8894a0',
    );
    ctx.strokeStyle = OL;
    ctx.lineWidth = 1.4;
    for (let y = -5; y > -21; y -= 4) {
      ctx.beginPath();
      ctx.moveTo(-7, y);
      ctx.lineTo(7, y);
      ctx.stroke();
    }
    ctx.restore();
  }
  // a coffin-shaped tank, rusted red, with a white cross of bones
  poly(
    [
      [-4, -64],
      [16, -74],
      [48, -72],
      [54, -64],
      [40, -56],
      [4, -56],
    ],
    rust,
  );
  ctx.strokeStyle = boneC;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(18, -68);
  ctx.lineTo(36, -61);
  ctx.moveTo(36, -68);
  ctx.lineTo(18, -61);
  ctx.stroke();
  // seat
  ctx.fillStyle = '#231d2c';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.4;
  rr(-50, -62, 48, 9, 4);
  ctx.fill();
  ctx.stroke();
  // ape-hanger bars
  fr(
    [
      [56, -88],
      [50, -112],
      [36, -116],
    ],
    4,
    chrome,
  );
  // the ram: a row of bone spikes in front of the wheel
  for (let i = 0; i < 4; i++) {
    const y = -8 - i * 11;
    poly(
      [
        [92, y + 4],
        [HOG.front - (i % 2) * 8, y - 2],
        [92, y - 5],
      ],
      boneC,
      1.8,
    );
  }
  fr(
    [
      [90, -4],
      [96, -48],
    ],
    5,
    iron,
  );
  // a horned skull for a headlight, with burning eyes
  ctx.save();
  ctx.translate(66, -84);
  poly(
    [
      [-4, -10],
      [-14, -26],
      [2, -14],
    ],
    boneC,
    1.8,
  );
  poly(
    [
      [6, -12],
      [10, -30],
      [14, -10],
    ],
    boneC,
    1.8,
  );
  ctx.fillStyle = boneC;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(4, -2, 13, 11, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  rr(-2, 6, 14, 7, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff3d2e';
  ctx.shadowColor = '#ff3d2e';
  ctx.shadowBlur = 14;
  for (const ex of [1, 10]) {
    ctx.beginPath();
    ctx.arc(ex, -3, 3.2, 0, TAU);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}
function skullCap(x, y, col) {
  ctx.fillStyle = col;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, 9, 8, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = OL;
  for (const ex of [-3.5, 3.5]) {
    ctx.beginPath();
    ctx.arc(x + ex, y, 2.4, 0, TAU);
    ctx.fill();
  }
}
