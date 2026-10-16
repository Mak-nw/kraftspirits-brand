// Генератор 8 Lottie-анімацій етапів процесу → public/assets/lottie/process-01…08.json
// Запуск: node tools/lottie/gen-process.mjs   (опційно: --only=3)
// Стиль: ЛИШЕ золота обводка (#cbaf86, як process-*.svg) + півтіні (золото/беж із низькою непрозорістю). Усі цикли періодичні (кадр 0 ≡ кадр T).
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  GOLD, BEIGE, T, TAU, SW, S, G, layer, comp, path, poly, circle, ellipse, rect, stroke, fill, trim,
  pathSampler, win, smooth, clamp, wrap,
} from './lib.mjs';

const root = resolve(import.meta.dirname, '../..');
const outDir = resolve(root, 'public/assets/lottie');
mkdirSync(outDir, { recursive: true });
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);

const ln = (d, w = SW, o = 100) => [path(d), stroke(w, o)];          // відкрита/закрита лінія
const shade = (d, o = 14) => [path(d), fill(o)];                     // півтінь
const sinx = (x0, x1, y, A, wl, ph = 0, dx = 0.5) => { const p = []; for (let x = x0; x <= x1 + 1e-9; x += dx) p.push([x, y + A * Math.sin(TAU * (x / wl) + ph)]); return p; };
const wavefill = (x0, x1, y, A, wl, yb) => poly([...sinx(x0, x1, y, A, wl), [x1, yb], [x0, yb]], true);
const wavesline = (x0, x1, y, A, wl) => poly(sinx(x0, x1, y, A, wl), false);
const drift = (wl) => (u) => [-wl * u, 0];                           // зсув на одну довжину хвилі за цикл (шов невидимий)

// ---------- 1. Осолодження й подрібнення: бункер → жорна (тики «обертаються») → борошно ----------
function a1() {
  const ticks = (y0, y1, x0, w, n, dir, o) => Array.from({ length: n }, (_, k) => G([ln(`M0 ${y0}V${y1}`, SW * 0.8, o)], {
    p: (u) => { const q = wrap((k + dir * u) / n); return [x0 + q * w, 0]; }, o: (u) => { const q = wrap((k + dir * u) / n); return 100 * win(q, 0.07, 0.07); },
  }, 'tick'));
  const grains = [[-2.2, 0], [0.4, 0.34], [2.4, 0.67]].map(([dx, ph]) => G([ellipse(0, 0, 0.62, 0.95), fill(85)], {
    p: (u) => { const v = wrap(u + ph); return [24 + dx, 16.3 + 5.4 * v * v]; }, o: (u) => 100 * win(wrap(u + ph), 0.1, 0.18),
  }, 'grain'));
  const flour = [[9, -1, 0.1], [9.5, -1, 0.6], [39, 1, 0.35], [38.5, 1, 0.85]].map(([x0, sx, ph]) => G([circle(0, 0, 0.45), fill(75)], {
    p: (u) => { const v = wrap(u + ph); return [x0 + sx * 3.2 * v, 30.4 + 10.8 * v * v]; }, o: (u) => 100 * win(wrap(u + ph), 0.08, 0.22),
  }, 'flour'));
  return comp('process-01-malting', [
    layer([ln('M6 43H42')], { nm: 'floor' }),
    layer([...flour], { nm: 'flour' }),
    layer([G([shade('M8 30h32v6.5a1.5 1.5 0 0 1-1.5 1.5h-29a1.5 1.5 0 0 1-1.5-1.5Z', 20), ln('M8 30h32v6.5a1.5 1.5 0 0 1-1.5 1.5h-29a1.5 1.5 0 0 1-1.5-1.5Z'), ...ticks(31.6, 36.4, 9.5, 29, 6, -1, 55)], {}, 'bottom-stone')], { nm: 'bottom-stone' }),
    layer([G([shade('M10 22h28v6.5a1.5 1.5 0 0 1-1.5 1.5h-25a1.5 1.5 0 0 1-1.5-1.5Z', 10), ln('M10 22h28v6.5a1.5 1.5 0 0 1-1.5 1.5h-25a1.5 1.5 0 0 1-1.5-1.5Z'), ...ticks(23.6, 28.4, 11, 26, 6, 1, 80)],
      { p: (u) => [0, 0.14 * Math.sin(TAU * 3 * u)] }, 'top-stone')], { nm: 'top-stone' }),
    layer([...grains], { nm: 'grains' }),
    layer([G([shade('M13 5H35L28.5 15H19.5Z', 12), ln('M13 5H35L28.5 15H19.5Z')], {}, 'hopper')], { nm: 'hopper' }),
  ]);
}

// ---------- 2. Варіння: чан, пара, мішалка (лопаті «обертаються»), хвиля ----------
function a2() {
  const vat = 'M11 22v14a6 6 0 0 0 6 6h14a6 6 0 0 0 6-6V22';
  const bub = [[15.5, 0.0, 0.8], [22, 0.33, 1.0], [32.5, 0.66, 0.7]].map(([x0, ph, r]) => G([circle(0, 0, r), stroke(0.35, 90)], {
    p: (u) => { const v = wrap(u + ph); return [x0 + 0.6 * Math.sin(TAU * 2 * v), 40.5 - 11 * v]; }, o: (u) => 80 * win(wrap(u + ph), 0.15, 0.22),
  }, 'bubble'));
  const steam = [[18, 0], [24, 0.33], [30, 0.66]].map(([x, ph]) => G([ln(`M${x} 17c-2-2 2-4 0-8`, SW, 100)], {
    p: (u) => [0, -6 * wrap(u + ph)], o: (u) => 70 * win(wrap(u + ph), 0.22, 0.4),
  }, 'steam'));
  const blade = (y, x0, x1, ph) => G([ln(`M${x0} ${y}H${x1}`, SW, 100)], { pivot: [24, y], s: (u) => [100 * Math.cos(TAU * u + ph), 100] }, 'blade');
  return comp('process-02-brewing', [
    layer([ln(vat + 'Z', SW, 0), shade(vat + 'Z', 8)], { nm: 'vat-fill' }),
    layer([G([wavefill(-14, 52, 27, 0.7, 13, 45), fill(24)], { p: drift(13) }, 'liquid'), G([wavesline(-14, 52, 27, 0.7, 13), stroke(0.4, 80)], { p: drift(13) }, 'surface'), ...bub], { mask: vat + 'Z', nm: 'liquid' }),
    layer([ln('M9 22h30'), ln(vat), ln('M17 42v3M31 42v3')], { nm: 'vat' }),
    layer([ln('M24 10V34'), ln('M21.5 10h5'), blade(33, 17.2, 30.8, 0), blade(29, 18.5, 29.5, Math.PI / 2)], { nm: 'stirrer' }),
    layer([...steam], { nm: 'steam' }),
  ]);
}

// ---------- 3. Бродіння: чан із хвилею, бульбашки, бульбашка в гідрозатворі, банка ----------
function a3() {
  const tank = 'M8 14v28a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V14';
  const jar = 'M32 24l1.5 18a2 2 0 0 0 2 1.8h5a2 2 0 0 0 2-1.8L44 24';
  const tube = 'M18 10V6a5 5 0 0 1 10 0v7a5 5 0 0 0 10 0v19';
  const samp = pathSampler(tube);
  const bubbles = [[11.5, 0.0, 1.5], [16.5, 0.45, 1.0], [20.5, 0.2, 1.3], [24.5, 0.7, 0.9], [14, 0.85, 0.7]].map(([x0, ph, r]) => G([circle(0, 0, r), stroke(0.4, 90)], {
    p: (u) => { const v = wrap(u + ph); return [x0 + 0.6 * Math.sin(TAU * (2 * v + ph)), 42.5 - 15.5 * v]; },
    s: (u) => { const v = wrap(u + ph); return [100 + 25 * v, 100 + 25 * v]; }, o: (u) => 85 * win(wrap(u + ph), 0.12, 0.25),
  }, 'bubble'));
  const jarBub = [[36.5, 0.1, 0.7], [40, 0.6, 0.9]].map(([x0, ph, r]) => G([circle(0, 0, r), stroke(0.35, 85)], {
    p: (u) => { const v = wrap(u + ph); return [x0, 42.3 - 5 * v]; }, o: (u) => 85 * win(wrap(u + ph), 0.2, 0.3),
  }, 'jar-bubble'));
  const gas = [0, 0.5].map((ph) => G([circle(0, 0, 0.6), fill(90)], {
    p: (u) => samp(wrap(u + ph)), o: (u) => 100 * win(wrap(u + ph), 0.06, 0.1),
  }, 'gas'));
  return comp('process-03-fermenting', [
    layer([ln(tank + 'Z', SW, 0), shade(tank + 'Z', 8), ln(jar + 'Z', SW, 0), shade(jar + 'Z', 8)], { nm: 'fills' }),
    layer([G([wavefill(-12, 40, 26, 1.1, 10, 46), fill(22)], { p: drift(10) }, 'liquid'), G([wavesline(-12, 40, 26, 1.1, 10), stroke(0.4, 85)], { p: drift(10) }, 'surface'), ...bubbles], { mask: tank + 'Z', nm: 'tank-liquid' }),
    layer([G([rect(30, 36.5, 16, 10), fill(22)], {}, 'jar-liquid'), ...jarBub], { mask: jar + 'Z', nm: 'jar-liquid' }),
    layer([ln(tank), ln('M6.5 14h23'), ln('M9 14c0-2.5 2-4 4.5-4h9c2.5 0 4.5 1.5 4.5 4'), ln('M11 44v2M25 44v2'), ln(tube), ln(jar), ln('M33.2 36.5h9.6')], { nm: 'tank' }),
    layer([...gas], { nm: 'gas' }),
  ]);
}

// ---------- 4. Дистиляція: куб → шийка → лінь-арм → конденсат: пара, краплі, брижі ----------
function a4() {
  const pot = 'M6 33a10 10 0 1 0 20 0 10 10 0 0 0-20 0Z';
  const route = pathSampler('M16 23V14H24L38 26');
  const drop = (ph) => G([ln('M38 27.2c1.1 1.65 1.65 2.48 1.65 3.3a1.65 1.65 0 0 1-3.3 0c0-.83.55-1.65 1.65-3.3z', SW, 100), path('M38 27.2c1.1 1.65 1.65 2.48 1.65 3.3a1.65 1.65 0 0 1-3.3 0c0-.83.55-1.65 1.65-3.3z'), fill(70)], {
    pivot: [38, 29], p: (u) => { const v = wrap(u + ph); const t = clamp((v - 0.25) / 0.55); return [0, 8.6 * t * t]; },
    s: (u) => { const k = 100 * smooth(0, 0.22, wrap(u + ph)); return [k, k]; },
    o: (u) => { const v = wrap(u + ph); return 100 * smooth(0, 0.1, v) * (1 - smooth(0.78, 0.84, v)); },
  }, 'drop');
  const ripple = (ph) => G([ellipse(38, 40.3, 1, 0.3), stroke(0.35, 100)], {
    pivot: [38, 40.3], s: (u) => { const rv = clamp((wrap(u + ph) - 0.8) / 0.2); return [100 + 280 * rv, 100 + 120 * rv]; },
    o: (u) => { const v = wrap(u + ph); return v >= 0.8 ? 80 * (1 - (v - 0.8) / 0.2) : 0; },
  }, 'ripple');
  const vapor = Array.from({ length: 6 }, (_, k) => G([circle(0, 0, 0.5), fill(80)], {
    p: (u) => route(wrap(u + k / 6)), o: (u) => 100 * win(wrap(u + k / 6), 0.06, 0.1),
  }, 'vapor'));
  const bub = [[12, 0.0], [16.5, 0.3], [20, 0.55], [14.5, 0.8]].map(([x0, ph], k) => G([circle(0, 0, 0.55 + 0.15 * (k % 2)), stroke(0.35, 90)], {
    p: (u) => { const v = wrap(u + ph); return [x0 + 0.5 * Math.sin(TAU * 2 * v), 38.5 - 6.5 * v]; }, o: (u) => 80 * win(wrap(u + ph), 0.15, 0.25),
  }, 'boil'));
  const smoke = G([ln('M16 8c-1.5-1.5 1.5-3 0-5', SW, 100)], { p: (u) => [0, -1.2 * wrap(u)], o: (u) => 60 * win(wrap(u), 0.25, 0.4) }, 'smoke');
  return comp('process-04-distilling', [
    layer([ln(pot, SW, 0), shade(pot, 8), shade('M32.2 40L31.5 44H42.5L41.8 40Z', 22)], { nm: 'fills' }),
    layer([G([wavefill(-12, 40, 31.5, 0.6, 8, 44), fill(24)], { p: drift(8) }, 'liquid'), G([wavesline(-12, 40, 31.5, 0.6, 8), stroke(0.4, 85)], { p: drift(8) }, 'surface'), ...bub], { mask: pot, nm: 'pot-liquid' }),
    layer([ln(pot), ln('M13.5 23.6V12.5h5V23.6M12.5 12h7'), ln('M18.5 14H24l14 12'), ln('M33 38l-1.5 6h11L41 38M32 38h10'), ln('M32.2 40h9.6', 0.4, 80)], { nm: 'still' }),
    layer([...vapor, smoke], { nm: 'vapor' }),
    layer([drop(0), drop(0.5), ripple(0), ripple(0.5)], { nm: 'condensate' }),
  ]);
}

// ---------- 5. Витримка: бочка з годинником, секундна стрілка робить повне коло ----------
function a5() {
  const barrel = 'M14 7h20c3 5 5 11 5 17s-2 12-5 17H14c-3-5-5-11-5-17s2-12 5-17Z';
  const marks = Array.from({ length: 12 }, (_, k) => { const a = (k * Math.PI) / 6, r1 = k % 3 === 0 ? 3.7 : 4.3, r2 = 4.9; return path(`M${(24 + r1 * Math.sin(a)).toFixed(2)} ${(24 - r1 * Math.cos(a)).toFixed(2)}L${(24 + r2 * Math.sin(a)).toFixed(2)} ${(24 - r2 * Math.cos(a)).toFixed(2)}`); });
  const wisp = (x, ph) => G([ln(`M${x} 6c-1.2-1.2 1.2-2.4 0-4`, SW, 100)], { p: (u) => [0, -2.2 * wrap(u + ph)], o: (u) => 65 * win(wrap(u + ph), 0.25, 0.4) }, 'angel-share');
  return comp('process-05-aging', [
    layer([shade(barrel, 9)], { nm: 'fill' }),
    layer([ln(barrel), ln('M11.5 15.5h25M11.5 32.5h25'), ln('M19 7q-3 17 0 34M29 7q3 17 0 34'), ln('M12 44h24')], { nm: 'barrel' }),
    layer([G([circle(24, 24, 5.4), stroke(0.4, 90)], {}, 'face'), G([...marks, stroke(0.35, 75)], {}, 'marks')], { nm: 'clock' }),
    layer([G([ln('M24 25.3V20.4', 0.5, 100)], { pivot: [24, 24], r: (u) => 360 * u }, 'hand'), G([circle(24, 24, 0.7), fill(100)], {}, 'hub')], { nm: 'hand' }),
    layer([wisp(21, 0), wisp(27, 0.5)], { nm: 'angels-share' }),
  ]);
}

// ---------- 6. Купажування: два струмені зливаються в келих, барви змішуються ----------
function a6() {
  const glass = 'M16 18L18 40a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2L32 18Z';
  const dropL = 'M9 5c2 3 3 4.5 3 6a3 3 0 0 1-6 0c0-1.5 1-3 3-6z', dropR = 'M39 5c2 3 3 4.5 3 6a3 3 0 0 1-6 0c0-1.5 1-3 3-6z';
  const blob = (ph, color, o) => G([circle(0, 0, 3.4), fill(o, color)], { p: (u) => [24 + 3.6 * Math.cos(TAU * 2 * u + ph), 34.5 + 2.2 * Math.sin(TAU * 2 * u + ph)] }, 'blob');
  const stream = (d) => G([path(d), stroke(0.5, 100, GOLD, [1.2, 1.5, (u) => -10.8 * u])], {}, 'stream');
  const pulse = (ph) => (u) => { const k = 100 + 4 * Math.sin(TAU * (u + ph)); return [k, k]; };
  return comp('process-06-blending', [
    layer([ln(glass, SW, 0), shade(glass, 6)], { nm: 'fill' }),
    layer([G([wavefill(-12, 40, 27, 0.5, 6, 46), fill(18)], { p: drift(6) }, 'liquid'), G([wavesline(-12, 40, 27, 0.5, 6), stroke(0.4, 85)], { p: drift(6) }, 'surface'), blob(0, GOLD, 30), blob(Math.PI, BEIGE, 20)], { mask: glass, nm: 'mix' }),
    layer([ln('M14 18h20M16 18l2 22a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l2-22')], { nm: 'glass' }),
    layer([G([ln(dropL), shade(dropL, 16)], { pivot: [9, 8], s: pulse(0) }, 'source-l'), G([ln(dropR), shade(dropR, 16)], { pivot: [39, 8], s: pulse(0.5) }, 'source-r')], { nm: 'sources' }),
    layer([stream('M9 12.8C9 16.5 14 16 19.4 20L22 27'), stream('M39 12.8C39 16.5 34 16 28.6 20L26 27')], { nm: 'streams' }),
  ]);
}

// ---------- 7. Фільтрація: краплі проходять шари фільтра, шари «пульсують», брижі внизу ----------
function a7() {
  const ph = [0, 0.5];
  const yOf = (v) => 2 + 41 * Math.pow(v, 1.3);
  const meshY = [14.5, 18.5, 22.5];
  const vi = meshY.map((y) => Math.pow((y - 1.2 - 2) / 41, 1 / 1.3));
  const meshO = (i) => (u) => 40 + 60 * Math.max(...ph.map((p) => Math.exp(-Math.pow((wrap(u + p) - vi[i]) / 0.05, 2))));
  const meshLine = (y) => { const l = 10 + (y - 10) * (10 / 14) + 0.9, r = 38 - (y - 10) * (10 / 14) - 0.9; return `M${l.toFixed(2)} ${y}H${r.toFixed(2)}`; };
  const meshes = meshY.map((y, i) => G([path(meshLine(y)), stroke(0.45, 100, GOLD, [0.9, 0.7, 0])], { o: meshO(i) }, 'mesh'));
  const dropD = 'M24 0c.8 1.2 1.2 1.8 1.2 2.4a1.2 1.2 0 0 1-2.4 0c0-.6.4-1.2 1.2-2.4z';
  const drops = ph.map((p) => G([ln(dropD, SW, 100), path(dropD), fill(60)], { p: (u) => [0, yOf(wrap(u + p))], o: (u) => 100 * win(wrap(u + p), 0.05, 0.1) }, 'drop'));
  const ripples = ph.map((p) => G([ellipse(24, 44.3, 1, 0.3), stroke(0.35, 100)], {
    pivot: [24, 44.3], s: (u) => { const rv = clamp((wrap(u + p) - 0.9) / 0.1); return [100 + 330 * rv, 100 + 110 * rv]; }, o: (u) => { const v = wrap(u + p); return v >= 0.9 ? 80 * (1 - (v - 0.9) / 0.1) : 0; },
  }, 'ripple'));
  const dust = [[17.5, 11.6, 0], [22, 12.4, 0.3], [26.5, 11.4, 0.55], [30.5, 12.2, 0.8], [20, 13.3, 0.15]].map(([x, y, p]) => G([circle(x, y, 0.45), fill(55)], { p: (u) => [0.3 * Math.sin(TAU * (u + p)), 0.35 * Math.cos(TAU * (2 * u + p))] }, 'dust'));
  const fun = 'M10 10l10 14v10h8V24l10-14';
  return comp('process-07-filtering', [
    layer([shade('M10 10L20 24V34H28V24L38 10Z', 9)], { nm: 'fill' }),
    layer([ln('M8 10h32'), ln(fun), ln('M15 45h18')], { nm: 'funnel' }),
    layer([...meshes, ...dust], { nm: 'mesh' }),
    layer([...drops, ...ripples], { nm: 'drops' }),
  ]);
}

// ---------- 8. Розлив: пляшка плавно наповнюється й спорожнюється (синус), струмінь живиться з носика ----------
function a8() {
  const bottleOpen = 'M22.7 16.6v5.6c0 2.3-4.7 1.9-4.7 4.5v14.7q0 1.5 1.5 1.5h9q1.5 0 1.5-1.5V26.8c0-2.6-4.7-2.2-4.7-4.5v-5.6';
  const L = (u) => 30 + 10 * Math.cos(TAU * u);               // y верху рідини: 40 (порожня) ↔ 20 (повна); u=0.5 → 20? (cos π = −1 → 20)
  const streamO = (u) => 100 * clamp(Math.sin(TAU * u) * 3);   // тече, поки рівень росте (u ∈ (0, 0.5))
  const streamEnd = (u) => clamp((L(u) - 5.2) / (42 - 5.2)) * 100;
  const liquid = G([G([wavesline(12, 36, 0, 0.3, 4), stroke(0.4, 90)], { p: drift(4) }, 'surface'), rect(17, 0, 14, 30), fill(30)], { p: (u) => [0, L(u)] }, 'level');
  return comp('process-08-bottling', [
    layer([ln(bottleOpen + 'Z', SW, 0), shade(bottleOpen + 'Z', 6)], { nm: 'fill' }),
    layer([liquid], { mask: bottleOpen + 'Z', nm: 'liquid' }),
    layer([ln(bottleOpen), ln('M21 34h6M21 36.5h6', 0.4, 70), G([ln('M21 2h6l-1.2 3.2h-3.6z'), shade('M21 2h6l-1.2 3.2h-3.6z', 14)], {}, 'nozzle')], { nm: 'bottle' }),
    layer([G([path('M24 5.2V42'), { ty: 'tm', s: { a: 0, k: 0 }, e: { a: 1, k: Array.from({ length: T / 3 + 1 }, (_, i) => { const u = (i * 3 === T ? 0 : i * 3) / T; return { t: i * 3, s: [Math.round(streamEnd(u) * 100) / 100], i: { x: 0.833, y: 0.833 }, o: { x: 0.167, y: 0.167 } }; }) }, o: { a: 0, k: 0 }, m: 1, nm: 'trim' }, stroke(0.5, 100)], { o: streamO }, 'stream')], { nm: 'stream' }),
  ]);
}

const list = [a1, a2, a3, a4, a5, a6, a7, a8];
list.forEach((fn, i) => {
  const n = String(i + 1).padStart(2, '0');
  if (only && only !== String(i + 1) && only !== n) return;
  const json = JSON.stringify(fn());
  writeFileSync(resolve(outDir, `process-${n}.json`), json);
  console.log(`process-${n}.json`, (json.length / 1024).toFixed(1) + ' KB');
});
