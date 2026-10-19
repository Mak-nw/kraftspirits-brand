// Генератор 3 Lottie-анімацій кроків «Від бочки до вашої пляшки» (barrels, steps deck split) → public/assets/lottie/barrel-01-pour.json, barrel-02-angels.json, barrel-03-bottle.json
// Запуск: node tools/lottie/gen-barrels.mjs   (опційно: --only=2). Перевірка шва: node tools/lottie/verify-loop.mjs --names=barrel-01-pour,barrel-02-angels,barrel-03-bottle
// Стиль — як process-01…08 (gen-process.mjs): ЛИШЕ золота обводка (#cbaf86) + півтіні; усі цикли періодичні (кадр 0 ≡ кадр T), сітка 48 одиниць.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SW, T, TAU, G, layer, comp, path, poly, circle, ellipse, rect, stroke, fill, win, smooth, clamp, wrap } from './lib.mjs';

const root = resolve(import.meta.dirname, '../..');
const outDir = resolve(root, 'public/assets/lottie');
mkdirSync(outDir, { recursive: true });
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);

const ln = (d, w = SW, o = 100) => [path(d), stroke(w, o)];
const shade = (d, o = 14) => [path(d), fill(o)];
const sinx = (x0, x1, y, A, wl, ph = 0, dx = 0.5) => { const p = []; for (let x = x0; x <= x1 + 1e-9; x += dx) p.push([x, y + A * Math.sin(TAU * (x / wl) + ph)]); return p; };
const wavefill = (x0, x1, y, A, wl, yb) => poly([...sinx(x0, x1, y, A, wl), [x1, yb], [x0, yb]], true);
const wavesline = (x0, x1, y, A, wl) => poly(sinx(x0, x1, y, A, wl), false);
const drift = (wl) => (u) => [-wl * u, 0];
// бочка (як у process-05): стінки з клепками-обручами; відкритий верх (заливка) або закритий
const BARREL_OPEN = 'M14 9c-3 5-5 10-5 15s2 10 5 15v2h20v-2c3-5 5-10 5-15s-2-10-5-15';
const BARREL = 'M14 7h20c3 5 5 11 5 17s-2 12-5 17H14c-3-5-5-11-5-17s2-12 5-17Z';
const HOOPS = 'M11.5 15.5h25M11.5 32.5h25';
const STAVES = 'M19 7q-3 17 0 34M29 7q3 17 0 34';

// ---------- 1. Заливка: цівка дистиляту з носика, рівень у бочці циклічно піднімається й опускається ----------
function b1() {
  const Lv = (u) => 28 + 11 * Math.cos(TAU * u);                       // y верху рідини: 39 (майже порожня) ↔ 17 (повна)
  const streamEnd = (u) => clamp((Lv(u) - 4.8) / (44 - 4.8)) * 100;
  const liquid = G([G([wavesline(6, 42, 0, 0.35, 6), stroke(0.4, 90)], { p: drift(6) }, 'surface'), rect(6, 0, 36, 30), fill(28)], { p: (u) => [0, Lv(u)] }, 'level');
  const bub = [[19, 0.0], [27, 0.5], [23, 0.25]].map(([x0, ph]) => G([circle(0, 0, 0.55), stroke(0.35, 90)], {
    p: (u) => { const v = wrap(u + ph); return [x0 + 0.5 * Math.sin(TAU * 2 * v), 41 - 8 * v]; }, o: (u) => 70 * win(wrap(u + ph), 0.2, 0.3),
  }, 'bubble'));
  const stream = G([path('M24 4.8V44'), { ty: 'tm', s: { a: 0, k: 0 }, e: { a: 1, k: Array.from({ length: T / 3 + 1 }, (_, i) => { const u = (i * 3 === T ? 0 : i * 3) / T; return { t: i * 3, s: [Math.round(streamEnd(u) * 100) / 100], i: { x: 0.833, y: 0.833 }, o: { x: 0.167, y: 0.167 } }; }) }, o: { a: 0, k: 0 }, m: 1, nm: 'trim' }, stroke(0.5, 100)], { o: (u) => 100 * clamp(Math.sin(TAU * u) * 3) }, 'stream');
  return comp('barrel-01-pour', [
    layer([ln(BARREL_OPEN + 'Z', SW, 0), shade(BARREL_OPEN + 'Z', 7)], { nm: 'fill' }),
    layer([liquid, ...bub], { mask: BARREL_OPEN + 'Z', nm: 'liquid' }),
    layer([ln(BARREL_OPEN), ln('M9.6 17h28.8M9.6 31h28.8'), ln('M19 9q-3 15 0 32M29 9q3 15 0 32'), ln('M13 46h22')], { nm: 'barrel' }),
    layer([G([ln('M20.5 1.5h7l-1.3 3.3h-4.4z'), shade('M20.5 1.5h7l-1.3 3.3h-4.4z', 14)], {}, 'nozzle'), stream], { nm: 'stream' }),
  ]);
}

// ---------- 2. Витримка: закрита бочка, з неї піднімаються «частки ангелів» (дрібні кола й пара) ----------
function b2() {
  const sc = (items, nm) => G(items, { pivot: [24, 44], s: [70, 70] }, nm);   // бочка 70% від низу сітки: угорі лишається місце для часток
  const wisp = (x, ph) => G([ln(`M${x} 16c-1.4-1.4 1.4-2.8 0-4.6`, SW, 100)], { p: (u) => [0, -3.6 * wrap(u + ph)], o: (u) => 70 * win(wrap(u + ph), 0.25, 0.4) }, 'wisp');
  const motes = [[17, 0.0, 0.6], [21, 0.17, 0.45], [26, 0.5, 0.7], [30, 0.33, 0.5], [23.5, 0.67, 0.4], [19.5, 0.83, 0.5], [28, 0.92, 0.45]].map(([x0, ph, r], k) => G([circle(0, 0, r), k % 2 ? fill(85) : stroke(0.35, 90)], {
    p: (u) => { const v = wrap(u + ph); return [x0 + 1.2 * Math.sin(TAU * (1.5 * v + ph)), 17 - 14 * v]; }, o: (u) => 100 * win(wrap(u + ph), 0.12, 0.35),
  }, 'angel-share'));
  return comp('barrel-02-angels', [
    layer([sc([shade(BARREL, 9)], 'fill')], { nm: 'fill' }),
    layer([sc([ln(BARREL), ln(HOOPS), ln(STAVES), ln('M12 44h24')], 'barrel')], { nm: 'barrel' }),
    layer([sc([ln('M21.5 7.4h5'), shade('M21.5 7.4h5v1h-5z', 30)], 'bung')], { nm: 'bung' }),
    layer([...motes, wisp(20, 0), wisp(28, 0.5)], { nm: 'angels-share' }),
  ]);
}

// ---------- 3. Розлив: пляшка плавно наповнюється й спорожнюється (як process-08), невеликі краплі-блиски в рідині ----------
function b3() {
  const bottleOpen = 'M22.7 16.6v5.6c0 2.3-4.7 1.9-4.7 4.5v14.7q0 1.5 1.5 1.5h9q1.5 0 1.5-1.5V26.8c0-2.6-4.7-2.2-4.7-4.5v-5.6';
  const L = (u) => 30 + 10 * Math.cos(TAU * u);
  const streamEnd = (u) => clamp((L(u) - 5.2) / (42 - 5.2)) * 100;
  const liquid = G([G([wavesline(12, 36, 0, 0.3, 4), stroke(0.4, 90)], { p: drift(4) }, 'surface'), rect(17, 0, 14, 30), fill(30)], { p: (u) => [0, L(u)] }, 'level');
  return comp('barrel-03-bottle', [
    layer([ln(bottleOpen + 'Z', SW, 0), shade(bottleOpen + 'Z', 6)], { nm: 'fill' }),
    layer([liquid], { mask: bottleOpen + 'Z', nm: 'liquid' }),
    layer([ln(bottleOpen), ln('M21 34h6M21 36.5h6', 0.4, 70), G([ln('M21 2h6l-1.2 3.2h-3.6z'), shade('M21 2h6l-1.2 3.2h-3.6z', 14)], {}, 'nozzle')], { nm: 'bottle' }),
    layer([G([path('M24 5.2V42'), { ty: 'tm', s: { a: 0, k: 0 }, e: { a: 1, k: Array.from({ length: T / 3 + 1 }, (_, i) => { const u = (i * 3 === T ? 0 : i * 3) / T; return { t: i * 3, s: [Math.round(streamEnd(u) * 100) / 100], i: { x: 0.833, y: 0.833 }, o: { x: 0.167, y: 0.167 } }; }) }, o: { a: 0, k: 0 }, m: 1, nm: 'trim' }, stroke(0.5, 100)], { o: (u) => 100 * clamp(Math.sin(TAU * u) * 3) }, 'stream')], { nm: 'stream' }),
  ]);
}

const list = [['barrel-01-pour', b1], ['barrel-02-angels', b2], ['barrel-03-bottle', b3]];
list.forEach(([name, fn], i) => {
  if (only && only !== String(i + 1) && only !== name) return;
  const json = JSON.stringify(fn());
  writeFileSync(resolve(outDir, `${name}.json`), json);
  console.log(`${name}.json`, (json.length / 1024).toFixed(1) + ' KB');
});
