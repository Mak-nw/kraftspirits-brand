#!/usr/bin/env node
// arch: скан арки карток каталогу (.product-card--catalog::before, маска product-card-arch-full.svg): товщина контуру 4 сторін для всіх карток
// на ширинах × DPR × смузі прокрутки. Піксельний замір зі скриншота в'юпорта (без округлень clip): по ряду/стовпцю через центр арки
// сума «покриття» кольору арки (= --color-green) у пікселях пристрою.
// Критерії: мін. сторона ≥ 0.5 × очікуваної (2.476u × DPR) і розкид кожної сторони між картками ≤ 0.5 device px.
//   node tools/qa/arch.mjs [--url …] [--widths 1200,1280,1366,1440,1536,1680,1800,1920] [--dpr 1,2] [--scrollbar classic|none|both] [--png]
import { Report, runMain, launch, openPage, pageUrl, matrix, waitStable, sleep, u as getU, outFile } from './lib.mjs';

export const ARCH_WIDTHS = '1200,1280,1366,1440,1536,1680,1800,1920';
const THICK_U = 2.476; // товщина рамки арки (Figma 204:2230)

export async function runArch(o) {
  const pageName = String(o.page || 'catalog'); // --page cocktails: картки в блоках коктейлів, обхід усіх 3 вкладок (висота ряду, а отже й арки, залежить від активної вкладки)
  const SEL = pageName === 'cocktails' ? '.tour-card__aside .product-card--catalog' : '.product-card--catalog';
  const TABS = pageName === 'cocktails' ? ['ingredients', 'steps', 'serve'] : [null];
  const rep = new Report('arch');
  const defects = []; let cards = 0;
  const wantedMin = 0.5, spreadMax = 0.5;
  for (const sb of o.scrollbar) {
    const L = await launch({ scrollbar: sb, chrome: o.chrome, out: o.out });
    try {
      for (const c of matrix(o).filter((x) => x.scrollbar === sb)) {
        const page = await openPage(L.browser, pageUrl(o.url, pageName, 'static'), { width: c.width, height: 900, dpr: c.dpr, settle: false });
        await waitStable(page, { selector: SEL });
        await sleep(300);
        const uu = await getU(page);
        const expectedDev = THICK_U * uu * c.dpr;
        const tokens = await page.evaluate((SEL_) => { const cs = getComputedStyle(document.querySelector(SEL_)); const probe = document.createElement('i'); probe.style.color = 'var(--color-green)'; document.body.append(probe); const g = getComputedStyle(probe).color; probe.remove(); const cb = document.createElement('i'); cb.style.color = 'var(--color-card-bg-catalog)'; document.body.append(cb); const bg = getComputedStyle(cb).color; cb.remove(); return { arch: g, bg }; }, SEL);
        const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
        const A = rgb(tokens.arch), B = rgb(tokens.bg);
        for (const tab of TABS) {
        if (tab) { await page.evaluate((t) => document.querySelectorAll('[data-cocktail]').forEach((a) => document.getElementById(`${a.id}-tab-${t}`).click()), tab); await sleep(250); }
        const n = await page.evaluate((S) => document.querySelectorAll(S).length, SEL);
        const sides = []; // по картці
        // не-hover: курсор у кутку, щоб рідина не змінила кольори
        await page.mouse.move(2, 2);
        for (let i = 0; i < n; i++) {
          // карточку в центр, кадр в'юпорта
          const rect = await page.evaluate((idx, SEL_) => { const el = document.querySelectorAll(SEL_)[idx]; const r0 = el.getBoundingClientRect(); scrollTo({ top: r0.top + scrollY - (innerHeight - r0.height) / 2, behavior: 'instant' }); const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, i, SEL);
          await sleep(120);
          await page.mouse.move(2, 2);
          const shot = await page.screenshot({ encoding: 'base64' });
          const res = await page.evaluate(async (b64, rc, A2, B2, dpr, uu2) => {
            const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
            const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
            const px = (x, y) => cx.getImageData(x, y, 1, 1).data;
            // покриття: проєкція кольору на відрізок B→A (0 = фон картки, 1 = колір арки)
            const dx = A2.map((v, k) => v - B2[k]); const den = dx.reduce((s, v) => s + v * v, 0);
            const cov = (x, y) => { const d = px(x, y); const p = [d[0] - B2[0], d[1] - B2[1], d[2] - B2[2]]; const t = (p[0] * dx[0] + p[1] * dx[1] + p[2] * dx[2]) / den; return Math.min(1, Math.max(0, t)); };
            // арка зміщена на --offset-arch = 6u від краю картки; ширина 414u, висота 535u
            const ox = rc.x + 6 * uu2, oy = rc.y + 6 * uu2, aw = rc.w - 12 * uu2, /* арка = ширина картки − 2 відступи по 6u (картка 348.55u → арка 336.55u; було фіксовані 414 на картці 426.25) */ ah = rc.h - 12.667 * uu2; 
            const band = Math.ceil(5 * uu2 * dpr) + 4; // зона пошуку від зовнішнього краю арки (товщина ~2.5u; 4 — запас на зсув)
            const sumLine = (fixed, from, dir, horiz) => { let s = 0; for (let k = 0; k < band; k++) { const a = Math.round(from * dpr) + dir * k; s += horiz ? cov(a, Math.round(fixed * dpr)) : cov(Math.round(fixed * dpr), a); } return s; };
            // відступ від краю в'юпорта: нижня сторона може бути поза кадром — картка по центру, тож усе в кадрі
            const midY = oy + ah * 0.55, midX = ox + aw / 2;
            const left = sumLine(midY, ox - 2 / dpr, 1, true);
            const right = sumLine(midY, ox + aw + 2 / dpr, -1, true);
            const top = sumLine(midX, oy - 2 / dpr, 1, false);
            const bottom = sumLine(midX, oy + ah + 2 / dpr, -1, false);
            return { left, right, top, bottom };
          }, shot, rect, A, B, c.dpr, uu);
          sides.push({ i, ...res });
        }
        cards += sides.length;
        // ЛІВА/ПРАВА/НИЖНЯ — рамка 2.476u; ВЕРХНЯ: у центрі арка «Subtract» товща (~10u), тож перевіряємо лише мінімум і узгодженість між картками
        for (const side of ['left', 'right', 'bottom', 'top']) {
          const vals = sides.map((s) => s[side]); const mn = Math.min(...vals), mx = Math.max(...vals);
          const spread = mx - mn;
          const minOk = side === 'top' ? mn >= expectedDev * wantedMin : mn >= expectedDev * wantedMin;
          const spreadBad = side !== 'top' && spread > spreadMax + 0.01; // +0.01: суми покриття — кроки по 0.5 device px, float-похибка (0.5000x) не є порушенням; 0.53 і більше ловиться // верх: у центрі арка «Subtract» ~10u (товща) — розкид не критерій
          if (!minOk || spreadBad) {
            const bad = sides.filter((s) => s[side] < expectedDev * wantedMin || s[side] - mn > spreadMax && false).map((s) => s.i);
            defects.push({ w: c.width, dpr: c.dpr, sb, side, min: +mn.toFixed(2), max: +mx.toFixed(2), spread: +spread.toFixed(2), expected: +expectedDev.toFixed(2), badCards: bad });
            rep.add({ rule: 'A1', page: `${pageName}${tab ? '/' + tab : ''}@${c.width}/x${c.dpr}/${sb}`, selector: `.product-card--catalog::before ${side}`, value: `min ${mn.toFixed(2)} max ${mx.toFixed(2)} розкид ${spread.toFixed(2)} device px (очікувано ≈${expectedDev.toFixed(2)})`, msg: `${!minOk ? `мін. < ${wantedMin}× очікуваної` : ''}${!minOk && spreadBad ? '; ' : ''}${spreadBad ? `розкид > ${spreadMax}` : ''}${bad.length ? `; картки №${bad.map((x) => x + 1).join(',')}` : ''}` });
          }
        }
        rep.stats[`${tab ? tab + ':' : ''}${c.width}/x${c.dpr}/${sb}`] = { u: +uu.toFixed(4), expected: +expectedDev.toFixed(2), left: [Math.min(...sides.map((s) => s.left)), Math.max(...sides.map((s) => s.left))].map((v) => +v.toFixed(2)), bottom: [Math.min(...sides.map((s) => s.bottom)), Math.max(...sides.map((s) => s.bottom))].map((v) => +v.toFixed(2)) };
        }        await page.close().catch(() => {});
      }
    } finally { await L.close(); }
  }
  rep.note(`карток просканьовано: ${cards} (комбінацій ${matrix(o).length}); таблиця «карток із дефектом» = записи A1 вище`);
  return rep;
}
if (import.meta.url === `file://${process.argv[1]}`) await runMain('arch', { widths: ARCH_WIDTHS, dpr: '1,2', scrollbar: 'both' }, runArch);
