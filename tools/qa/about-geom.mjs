#!/usr/bin/env node
// about-geom: геометрія кіл і стрічки арок.
//   G1: кожен елемент із border-radius:50% і класом *ava* / *circle* / *ring* має aspect = 1 (|w−h| ≤ 0.5px).
//   G2: у секціях зі стрічкою арок (.about-place) жоден текстовий бокс (заголовок, підпис) не перетинає бокс арки
//       за прогресу pinned-скролу 0 / 0.25 / 0.5 / 0.75 / 1 (window.scrollTo на початок … кінець розпірки).
//   G4: pinned-скрол на весь екран: на прогресі 0 арок не видно і текст по центру в'юпорта (±1u), секція sticky (top=0), на прогресі 1 остання арка по центру в'юпорта, скрол угору повертає трек.
//   G3: ключові розміри за макетом (в u = px / (vw/1920), ±1u): арки стрічки 348×460, арки установок 478 (ширина), кола 95%/400 л 200×200, фото віх 288×332 / 304×332; y-позиції віх «15 місяців» від верху секції (фото віхи 1 = 649u, віхи 2 = 1083u, ±1u) і висота секції 1574u (±2u); пагорби .about-people__hills: права межа = правий край секції (±1u), ширина 940u.
//   node tools/qa/about-geom.mjs [--url …] [--widths 1200,1440,1920] [--pages about] [--break circle|overlap|size|shift|pin|center]
//   --break — позитивний контроль: у відкриту сторінку інжектується поломка (еліпс / заголовок на всю ширину); перевірка МАЄ впасти.
import { Report, runMain, launch, openPage, pageUrl, pageSpec, waitStable, sleep } from './lib.mjs';

const BREAKS = {
  circle: '.about-people__ava{height:157px !important;aspect-ratio:auto !important}',
  size: '.about-process__arch{width:300px !important}.about-story__photo{height:300px !important}',
  shift: '.about-people__hills{right:100px !important}.about-people__hills{width:900px !important}.about-story__milestone--finish{margin-top:140px !important}',
  overlap: '.about-process{margin-left:calc(-1 * var(--vw, 100vw) / 2) !important}',
  pin: '.about-place-run{display:none !important}.about-track{transform:none !important}',
  center: '.about-place__text{align-self:flex-start !important}',
};

export async function runAboutGeom(o) {
  const rep = new Report('about-geom');
  const widths = o.widths.length ? o.widths : [1200, 1440, 1920];
  const L = await launch({ scrollbar: 'none', chrome: o.chrome, out: o.out });
  let n = 0;
  try {
    for (const spec0 of (o.pages ? o.pagesList : ['about'])) {
      const spec = pageSpec(spec0);
      for (const w of widths) {
        const page = await openPage(L.browser, pageUrl(o.url, spec, 'static'), { width: w, height: o.height, settle: false });
        await waitStable(page);
        if (o.break && BREAKS[o.break]) await page.addStyleTag({ content: BREAKS[o.break] });
        await sleep(700);
        await sleep(150);
        const label = `${spec.label}@${w}`;
        // G1
        const circ = await page.evaluate(() => [...document.querySelectorAll('[class]')].filter((e) => /ava|circle|ring/i.test(typeof e.className === 'string' ? e.className : '')).map((e) => {
          const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
          return { sel: e.tagName.toLowerCase() + '.' + String(e.className).trim().split(/\s+/).join('.'), br: cs.borderTopLeftRadius, w: r.width, h: r.height, vis: r.width > 0 && cs.display !== 'none' };
        }).filter((x) => x.vis && (x.br === '50%' || parseFloat(x.br) >= Math.min(x.w, x.h) / 2 - 0.01) && x.br !== '0px'));
        for (const c of circ) { n++; if (Math.abs(c.w - c.h) > 0.5) rep.add({ rule: 'G1', page: label, selector: c.sel, value: `${c.w.toFixed(1)}×${c.h.toFixed(1)}`, msg: 'коло не квадратне (|w−h| > 0.5px)' }); }
        // G3
        const sizes = await page.evaluate(() => {
          const u = innerWidth / 1920; const out = [];
          const add = (sel, name, W, H) => document.querySelectorAll(sel).forEach((e, i) => { const r = e.getBoundingClientRect(); out.push({ name: `${name}#${i}`, W, H, w: r.width / u, h: r.height / u }); });
          add('.about-process__arch', 'арка стрічки', 348, 460);
          add('.about-still__arch', 'арка установки', 478, null);
          add('.about-ring__circle', 'коло', 200, 200);
          add('.about-story__milestone--start .about-story__photo', 'фото віхи 1', 288, 332);
          add('.about-story__milestone--finish .about-story__photo', 'фото віхи 2', 304, 332);
          return out;
        });
        for (const z of sizes) { n++; if (Math.abs(z.w - z.W) > 1 || (z.H != null && Math.abs(z.h - z.H) > 1)) rep.add({ rule: 'G3', page: label, selector: z.name, value: `${z.w.toFixed(1)}×${z.h.toFixed(1)}u`, msg: `розмір ≠ макет ${z.W}×${z.H ?? '—'}u (±1u)` }); }
        const story = await page.evaluate(() => {
          const u = innerWidth / 1920; const s = document.querySelector('#story'); if (!s) return null; const sr = s.getBoundingClientRect();
          const y = (sel) => { const e = document.querySelector(sel); return e ? (e.getBoundingClientRect().top - sr.top) / u : NaN; };
          return { p1: y('.about-story__milestone--start .about-story__photo'), p2: y('.about-story__milestone--finish .about-story__photo'), h: sr.height / u };
        });
        if (story) {
          n++; if (!(Math.abs(story.p1 - 649) <= 1) || !(Math.abs(story.p2 - 1083) <= 1)) rep.add({ rule: 'G3', page: label, selector: 'віхи .about-story__photo', value: `віха 1 ${story.p1.toFixed(1)}u, віха 2 ${story.p2.toFixed(1)}u`, msg: 'y-позиція фото віх від верху секції ≠ макет 649u / 1083u (±1u)' });
          n++; if (!(Math.abs(story.h - 1574) <= 2)) rep.add({ rule: 'G3', page: label, selector: '#story', value: `${story.h.toFixed(1)}u`, msg: 'висота секції «15 місяців» ≠ макет 1574u (±2u)' });
        }
        const hills = await page.evaluate(() => {
          const u = innerWidth / 1920; const h = document.querySelector('.about-people__hills'); const s = document.querySelector('.about-people'); if (!h || !s) return null;
          const r = h.getBoundingClientRect(), sr = s.getBoundingClientRect(); return { dr: (r.right - sr.right) / u, w: r.width / u, db: (r.bottom - sr.bottom) / u };
        });
        if (hills) { n++; if (Math.abs(hills.dr) > 1 || Math.abs(hills.w - 940) > 1 || Math.abs(hills.db) > 1) rep.add({ rule: 'G3', page: label, selector: 'пагорби .about-people__hills', value: `право Δ${hills.dr.toFixed(1)}u, ширина ${hills.w.toFixed(1)}u, низ Δ${hills.db.toFixed(1)}u`, msg: 'пагорби не прилягають до правого краю секції / ширина ≠ 940u / низ ≠ низу секції (±1u)' }); }
        // G2 + G4: pinned horizontal scroll на весь екран — прогрес 0/0.25/0.5/0.75/1 виставляється вертикальним скролом обгортки (розпірка .about-place-run); трек рухає JS з інерцією → чекаємо ~1.6с
        const hasTrack = await page.$('.about-process__viewport');
        if (hasTrack) {
          const geo = await page.evaluate(() => { const r = document.querySelector('[data-process-run]'); const s = document.querySelector('.about-stack'); return r && s ? { run: r.offsetHeight, top: s.getBoundingClientRect().top + scrollY } : null; });
          if (!geo) { n++; rep.add({ rule: 'G4', page: label, selector: '.about-place-run', value: 'нема', msg: 'pinned-скрол: немає розпірки [data-process-run]' }); }
          else for (const p of [0, 0.25, 0.5, 0.75, 1]) {
            await page.evaluate((y) => scrollTo(0, y), geo.top + p * geo.run);
            await sleep(1600);
            const m = await page.evaluate(() => {
              const sec = document.querySelector('.about-place'); if (!sec) return null;
              const U = innerWidth / 1920;
              const rects = (els) => els.map((e) => ({ e, r: e.getBoundingClientRect() }));
              const texts = rects([...sec.querySelectorAll('h1,h2,h3,p')].filter((e) => !e.closest('.about-process')));
              const all = rects([...sec.querySelectorAll('.about-process__arch')]);
              const vw = document.documentElement.clientWidth, vh = innerHeight;
              const arches = all.filter((a) => a.r.right > 0 && a.r.left < vw); // видимі арки
              const hits = [];
              for (const t of texts) for (const a of all) {
                const ix = Math.min(t.r.right, a.r.right) - Math.max(t.r.left, a.r.left), iy = Math.min(t.r.bottom, a.r.bottom) - Math.max(t.r.top, a.r.top);
                if (ix > 0 && iy > 0) hits.push(`${t.e.className.split(' ').pop()} ∩ арка: ${ix.toFixed(0)}×${iy.toFixed(0)}px`);
              }
              const tt = texts.find((t) => t.e.matches('.about-place__title')); const tl = texts.find((t) => t.e.matches('.about-place__lead'));
              const blk = tt && tl ? { l: Math.min(tt.r.left, tl.r.left), r: Math.max(tt.r.right, tl.r.right), t: tt.r.top, b: tl.r.bottom } : null;
              const l = all[all.length - 1].r;
              return { hits, placeTop: sec.getBoundingClientRect().top, vw, vh, U, visible: arches.length, textCx: blk ? (blk.l + blk.r) / 2 : NaN, textCy: blk ? (blk.t + blk.b) / 2 : NaN, lastCx: (l.left + l.right) / 2 };
            });
            n++;
            if (!m) continue;
            const where = `${label}/прогрес=${p}`;
            if (m.hits.length) rep.add({ rule: 'G2', page: where, selector: '.about-place', value: m.hits[0], msg: 'текст перетинає арку стрічки' });
            n++;
            if (Math.abs(m.placeTop) > 1) rep.add({ rule: 'G4', page: where, selector: '.about-place', value: `top=${m.placeTop.toFixed(1)}px`, msg: 'секція не закріплена (sticky top ≠ 0) під час ходу треку' });
            if (p === 0) {
              n++; if (m.visible) rep.add({ rule: 'G4', page: where, selector: '.about-process__arch', value: `видимих арок: ${m.visible}`, msg: 'на старті арок не має бути видно (вони за правим краєм): текст читається першим' });
              n++; if (!(Math.abs(m.textCx - m.vw / 2) <= m.U) || !(Math.abs(m.textCy - m.vh / 2) <= 2 * m.U)) rep.add({ rule: 'G4', page: where, selector: '.about-place__text', value: `центр тексту (${m.textCx.toFixed(1)}, ${m.textCy.toFixed(1)}), центр в'юпорта (${(m.vw / 2).toFixed(1)}, ${(m.vh / 2).toFixed(1)})`, msg: "на старті заголовок і підпис мають бути по центру в'юпорта (±1u по X, ±2u по Y)" });
            }
            if (p === 1) { n++; if (Math.abs(m.lastCx - m.vw / 2) > 2) rep.add({ rule: 'G4', page: where, selector: '.about-process__arch', value: `центр останньої арки ${m.lastCx.toFixed(1)} (очікується ${(m.vw / 2).toFixed(1)})`, msg: "наприкінці ходу остання арка не по центру в'юпорта" }); }
            if (p === 0.5) { n++; if (!m.visible) rep.add({ rule: 'G4', page: where, selector: '.about-process__arch', value: 'арок не видно', msg: 'на середині ходу стрічка має бути в кадрі' }); }
          }
          if (geo) { // зворотний рух: скрол угору повертає трек
            const x = () => page.evaluate(() => document.querySelector('.about-process__arch').getBoundingClientRect().left);
            await page.evaluate((y) => scrollTo(0, y), geo.top + 0.5 * geo.run); await sleep(1400);
            const mid = await x();
            await page.evaluate((y) => scrollTo(0, y), geo.top + 0.2 * geo.run); await sleep(1600);
            const back = await x();
            n++; if (!(back > mid + 200)) rep.add({ rule: 'G4', page: label, selector: '.about-track', value: `середина ${mid.toFixed(0)}, назад ${back.toFixed(0)}`, msg: 'скрол угору не повертає трек (зворотний рух)' });
          }
        }
        await page.close().catch(() => {});
      }
    }
  } finally { await L.close(); }
  rep.stats = { measurements: n };
  rep.note(`${n} замірів${o.break ? ` (позитивний контроль --break ${o.break}: очікується падіння)` : ''}`);
  return rep;
}
if (import.meta.url === `file://${process.argv[1]}`) await runMain('about-geom', { widths: '1200,1440,1920' }, runAboutGeom);
