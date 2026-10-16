// Мінімальний генератор Lottie (bodymovin 5.x, шари-фігури) для анімацій етапів процесу (about, секція 3).
// Координати малюємо в 48-одиничній сітці іконок (як process-*.svg); S переводить у координати композиції (240×240).
// Усі рухи — функції фази u ∈ [0,1): значення семплюються кожні `step` кадрів, останній ключ = fn(0) → шов циклу невидимий.
export const S = 5;           // 48 одиниць → 240 px композиції
export const SIZE = 48 * S;
export const T = 120;         // кадрів у циклі, 30 fps → 4 с
export const FR = 30;
export const GOLD = [203 / 255, 175 / 255, 134 / 255, 1];   // #cbaf86 = --color-gold (як stroke у process-*.svg)
export const BEIGE = [220 / 255, 219 / 255, 207 / 255, 1];  // #dcdbcf = --color-beige
export const SW = 0.55;       // товщина лінії, одиниць сітки (≈ 2 px при показі ~170 px)

const r2 = (n) => Math.round(n * 100) / 100;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const win = (v, fi = 0.12, fo = 0.12) => smooth(0, fi, v) * (1 - smooth(1 - fo, 1, v)); // 0→1→0 по v ∈ [0,1]
export const wrap = (x) => ((x % 1) + 1) % 1;
export const TAU = Math.PI * 2;

// ---------- властивості ----------
const E_LIN = { o: { x: 0.167, y: 0.167 }, i: { x: 0.833, y: 0.833 } };
function samples(fn, step, scale) {
  const kf = [];
  for (let t = 0; t <= T; t += step) {
    const v = fn(wrap(t / T) === 0 && t === T ? 0 : t / T);
    const arr = Array.isArray(v) ? v.map((n) => r2(n * scale)) : [r2(v * scale)];
    kf.push({ t, s: arr, ...E_LIN });
  }
  // останній ключ строго дорівнює першому
  kf[kf.length - 1].s = kf[0].s.slice();
  if (T % step) throw new Error('T must be divisible by step');
  return kf;
}
// stat: стала або функція u→значення. scale — множник одиниць (S для координат, 1 для відсотків/градусів)
export function prop(v, { scale = 1, step = 3 } = {}) {
  if (typeof v === 'function') return { a: 1, k: samples(v, step, scale) };
  return { a: 0, k: Array.isArray(v) ? v.map((n) => r2(n * scale)) : r2(v * scale) };
}

// ---------- шляхи ----------
function arcToBez(x1, y1, rx, ry, phi, fa, fs, x2, y2) {
  if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]];
  const sp = Math.sin((phi * Math.PI) / 180), cp = Math.cos((phi * Math.PI) / 180);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let co = Math.sqrt(Math.max(0, num / den)); if (fa === fs) co = -co;
  const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
  let th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dth > 0) dth -= TAU; else if (fs && dth < 0) dth += TAU;
  const n = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2 - 1e-6)));
  const d = dth / n, t = (4 / 3) * Math.tan(d / 4), out = [];
  for (let k = 0; k < n; k++) {
    const a1 = th1 + k * d, a2 = a1 + d;
    const pt = (a) => [cx + cp * rx * Math.cos(a) - sp * ry * Math.sin(a), cy + sp * rx * Math.cos(a) + cp * ry * Math.sin(a)];
    const dv = (a) => [-cp * rx * Math.sin(a) - sp * ry * Math.cos(a), -sp * rx * Math.sin(a) + cp * ry * Math.cos(a)];
    const P1 = pt(a1), P2 = pt(a2), D1 = dv(a1), D2 = dv(a2);
    out.push([P1[0] + t * D1[0], P1[1] + t * D1[1], P2[0] - t * D2[0], P2[1] - t * D2[1], P2[0], P2[1]]);
  }
  return out;
}
// d → підшляхи: { pts:[[x,y]...], segs:[[c1x,c1y,c2x,c2y,x,y]...], closed }
export function parsePath(d) {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g);
  let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = '', cur = null;
  const subs = [];
  const num = () => parseFloat(toks[i++]);
  const flag = () => { const t = toks[i++]; return parseInt(t, 10); };
  const start = (x, y) => { cur = { start: [x, y], segs: [], closed: false }; subs.push(cur); };
  const line = (x, y) => { cur.segs.push([cx, cy, x, y, x, y]); cx = x; cy = y; };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(); const C = cmd.toUpperCase();
    if (C === 'Z') { cur.closed = true; cx = sx; cy = sy; continue; }
    if (C === 'M') { let x = num(), y = num(); if (rel) { x += cx; y += cy; } cx = sx = x; cy = sy = y; start(x, y); cmd = rel ? 'l' : 'L'; continue; }
    if (!cur || cur.closed) { start(cx, cy); }
    if (C === 'L') { let x = num(), y = num(); if (rel) { x += cx; y += cy; } line(x, y); }
    else if (C === 'H') { let x = num(); if (rel) x += cx; line(x, cy); }
    else if (C === 'V') { let y = num(); if (rel) y += cy; line(cx, y); }
    else if (C === 'C') { let a = [num(), num(), num(), num(), num(), num()]; if (rel) a = a.map((v, k) => v + (k % 2 ? cy : cx)); cur.segs.push(a); cx = a[4]; cy = a[5]; }
    else if (C === 'Q') { let a = [num(), num(), num(), num()]; if (rel) a = a.map((v, k) => v + (k % 2 ? cy : cx)); const [qx, qy, x, y] = a; cur.segs.push([cx + (2 / 3) * (qx - cx), cy + (2 / 3) * (qy - cy), x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x, y]); cx = x; cy = y; }
    else if (C === 'S') { let a = [num(), num(), num(), num()]; if (rel) a = a.map((v, k) => v + (k % 2 ? cy : cx)); const pv = cur.segs[cur.segs.length - 1]; const c1 = pv ? [2 * cx - pv[2], 2 * cy - pv[3]] : [cx, cy]; cur.segs.push([c1[0], c1[1], a[0], a[1], a[2], a[3]]); cx = a[2]; cy = a[3]; }
    else if (C === 'T') { throw new Error('T unsupported'); }
    else if (C === 'A') { const rx = num(), ry = num(), ph = num(), fa = flag(), fs = flag(); let x = num(), y = num(); if (rel) { x += cx; y += cy; } for (const b of arcToBez(cx, cy, rx, ry, ph, fa, fs, x, y)) cur.segs.push(b); cx = x; cy = y; }
    else throw new Error('cmd ' + cmd);
  }
  return subs;
}
function lottiePath(sub, dx = 0, dy = 0) {
  const pts = [sub.start, ...sub.segs.map((s) => [s[4], s[5]])];
  const v = pts.map((p) => [(p[0] + dx) * S, (p[1] + dy) * S]);
  const o = pts.map(() => [0, 0]), inn = pts.map(() => [0, 0]);
  sub.segs.forEach((s, k) => {
    o[k] = [(s[0] - pts[k][0]) * S, (s[1] - pts[k][1]) * S];
    inn[k + 1] = [(s[2] - pts[k + 1][0]) * S, (s[3] - pts[k + 1][1]) * S];
  });
  let closed = sub.closed;
  if (closed) {
    const last = pts.length - 1, f = pts[0], l = pts[last];
    if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-6 && last > 0) { inn[0] = inn[last]; v.pop(); o.pop(); inn.pop(); }
  }
  const rnd = (a) => a.map((p) => p.map(r2));
  return { c: closed, v: rnd(v), i: rnd(inn), o: rnd(o) };
}
// точки вздовж шляху (для часток, що рухаються по трубі): повертає f(s∈[0,1]) → [x,y]
export function pathSampler(d) {
  const pts = [];
  for (const sub of parsePath(d)) {
    let p0 = sub.start; pts.push(p0);
    for (const sg of sub.segs) {
      for (let k = 1; k <= 16; k++) {
        const t = k / 16, m = 1 - t;
        pts.push([m * m * m * p0[0] + 3 * m * m * t * sg[0] + 3 * m * t * t * sg[2] + t * t * t * sg[4], m * m * m * p0[1] + 3 * m * m * t * sg[1] + 3 * m * t * t * sg[3] + t * t * t * sg[5]]);
      }
      p0 = [sg[4], sg[5]];
    }
  }
  const L = [0]; for (let k = 1; k < pts.length; k++) L.push(L[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const tot = L[L.length - 1];
  return (s) => {
    const x = clamp(s) * tot; let k = 1; while (k < L.length - 1 && L[k] < x) k++;
    const a = (x - L[k - 1]) / ((L[k] - L[k - 1]) || 1);
    return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * a, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * a];
  };
}
export function polyline(points, closed = false) {
  const v = points.map((p) => [r2(p[0] * S), r2(p[1] * S)]);
  return { c: closed, v, i: v.map(() => [0, 0]), o: v.map(() => [0, 0]) };
}

// ---------- фігури ----------
export const path = (d, dx = 0, dy = 0) => parsePath(d).map((sub) => ({ ty: 'sh', ks: { a: 0, k: lottiePath(sub, dx, dy) }, nm: 'p' }));
export const poly = (points, closed = false) => [{ ty: 'sh', ks: { a: 0, k: polyline(points, closed) }, nm: 'poly' }];
export const circle = (cx, cy, r) => [{ ty: 'el', p: { a: 0, k: [cx * S, cy * S] }, s: { a: 0, k: [r * 2 * S, r * 2 * S] }, d: 1, nm: 'c' }];
export const ellipse = (cx, cy, rx, ry) => [{ ty: 'el', p: { a: 0, k: [cx * S, cy * S] }, s: { a: 0, k: [rx * 2 * S, ry * 2 * S] }, d: 1, nm: 'e' }];
export const rect = (x, y, w, h, r = 0) => [{ ty: 'rc', p: { a: 0, k: [(x + w / 2) * S, (y + h / 2) * S] }, s: { a: 0, k: [w * S, h * S] }, r: { a: 0, k: r * S }, d: 1, nm: 'r' }];
export const stroke = (w = SW, o = 100, color = GOLD, dash = null) => {
  const st = { ty: 'st', c: { a: 0, k: color }, o: prop(o), w: { a: 0, k: r2(w * S) }, lc: 2, lj: 2, ml: 4, nm: 'stroke' };
  if (dash) st.d = [{ n: 'd', nm: 'dash', v: { a: 0, k: dash[0] * S } }, { n: 'g', nm: 'gap', v: { a: 0, k: dash[1] * S } }, { n: 'o', nm: 'offset', v: prop(dash[2], { scale: S, step: 6 }) }];
  return [st];
};
export const fill = (o = 14, color = GOLD) => [{ ty: 'fl', c: { a: 0, k: color }, o: prop(o), r: 1, nm: 'fill' }];
export const trim = (s, e) => [{ ty: 'tm', s: prop(s), e: prop(e), o: { a: 0, k: 0 }, m: 1, nm: 'trim' }];

// Група: items — масиви фігур/стилів (зведені); tr: { p, a, s(%), r(°), o(%) } — сталі або функції u
export function G(items, tr = {}, nm = 'g') {
  const flat = items.flat(Infinity);
  const piv = tr.pivot || [0, 0];
  const p = tr.p ?? [0, 0];
  const pp = typeof p === 'function' ? (u) => { const v = p(u); return [piv[0] + v[0], piv[1] + v[1]]; } : [piv[0] + p[0], piv[1] + p[1]];
  const t = {
    ty: 'tr', nm: 'tr',
    a: { a: 0, k: [piv[0] * S, piv[1] * S] },
    p: prop(pp, { scale: S }),
    s: prop(tr.s ?? [100, 100]),
    r: prop(tr.r ?? 0, { step: 2 }),
    o: prop(tr.o ?? 100),
    sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 },
  };
  return { ty: 'gr', it: [...flat, t], nm };
}
// Шар. mask — масив точок/шлях d для маски (додавання)
export function layer(shapes, { mask = null, nm = 'layer' } = {}) {
  const L = {
    ddd: 0, ty: 4, nm, sr: 1,
    ks: { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [0, 0, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } },
    ao: 0, shapes: shapes.flat(Infinity), ip: 0, op: T, st: 0, bm: 0,
  };
  if (mask) {
    const k = typeof mask === 'string' ? lottiePath(parsePath(mask)[0]) : polyline(mask, true);
    L.hasMask = true;
    L.masksProperties = [{ inv: false, mode: 'a', pt: { a: 0, k }, o: { a: 0, k: 100 }, x: { a: 0, k: 0 }, nm: 'mask' }];
  }
  return L;
}
export function comp(nm, layers) {
  layers.forEach((l, k) => { l.ind = k + 1; });
  return { v: '5.7.0', fr: FR, ip: 0, op: T, w: SIZE, h: SIZE, nm, ddd: 0, assets: [], layers: layers.reverse().map((l, k) => ({ ...l })) };
}
export const round2 = r2;
