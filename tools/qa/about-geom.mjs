#!/usr/bin/env node
// about-geom: геометрія кіл і стрічки арок.
//   G1: кожен елемент із border-radius:50% і класом *ava* / *circle* / *ring* має aspect = 1 (|w−h| ≤ 0.5px).
//   G2: у секціях зі стрічкою арок (.about-place) жоден текстовий бокс (заголовок, підпис) не перетинає бокс арки
//       за scrollLeft 0 / середнім / max стрічки.
//   G3: ключові розміри за макетом (в u = px / (vw/1920), ±1u): арки стрічки 348×460, арки установок 478 (ширина), кола 95%/400 л 200×200, фото віх 288×332 / 304×332.
//   node tools/qa/about-geom.mjs [--url …] [--widths 1200,1440,1920] [--pages about] [--break circle|overlap|size]
//   --break — позитивний контроль: у відкриту сторінку інжектується поломка (еліпс / заголовок на всю ширину); перевірка МАЄ впасти.
import { Report, runMain, launch, openPage, pageUrl, pageSpec, waitStable, sleep } from './lib.mjs';

const BREAKS = {
  circle: '.about-people__ava{height:157px !important;aspect-ratio:auto !important}',
  size: '.about-process__arch{width:300px !important}.about-story__photo{height:300px !important}',
  overlap: '.about-place .about-place__title,.about-place .about-place__lead{grid-column:1 / -1 !important}',
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
        // G2
        const hasTrack = await page.$('.about-process__viewport');
        if (hasTrack) {
          const positions = await page.evaluate(() => { const v = document.querySelector('.about-process__viewport'); return [0, Math.round((v.scrollWidth - v.clientWidth) / 2), v.scrollWidth - v.clientWidth]; });
          for (const sl of positions) {
            await page.evaluate((x) => { const v = document.querySelector('.about-process__viewport'); v.style.scrollSnapType = 'none'; v.scrollLeft = x; }, sl);
            await sleep(120);
            const hits = await page.evaluate(() => {
              const sec = document.querySelector('.about-place'); if (!sec) return [];
              const rects = (els) => els.map((e) => ({ e, r: e.getBoundingClientRect() }));
              const texts = rects([...sec.querySelectorAll('h1,h2,h3,p')].filter((e) => !e.closest('.about-process')));
              const vp = document.querySelector('.about-process__viewport').getBoundingClientRect();
              const arches = rects([...sec.querySelectorAll('.about-process__arch')]).map((a) => ({ e: a.e, r: { left: Math.max(a.r.left, vp.left), right: Math.min(a.r.right, vp.right), top: a.r.top, bottom: a.r.bottom } })).filter((a) => a.r.right > a.r.left); // видима частина (поза вікном стрічки арки обрізані overflow)
              const out = [];
              for (const t of texts) for (const a of arches) {
                const ix = Math.min(t.r.right, a.r.right) - Math.max(t.r.left, a.r.left), iy = Math.min(t.r.bottom, a.r.bottom) - Math.max(t.r.top, a.r.top);
                if (ix > 0 && iy > 0) out.push(`${t.e.className.split(' ').pop()} ∩ арка: ${ix.toFixed(0)}×${iy.toFixed(0)}px`);
              }
              return out;
            });
            n++;
            if (hits.length) rep.add({ rule: 'G2', page: `${label}/scrollLeft=${sl}`, selector: '.about-place', value: hits[0], msg: 'текст перетинає арку стрічки' });
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
