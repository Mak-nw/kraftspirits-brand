#!/usr/bin/env node
// hero-btn (HB): кнопка CTA у hero шаблону lp має контраст заливки ≥ 3:1 (WCAG 1.4.11, нетекстовий елемент) проти фону hero НАВКОЛО неї — у стані default і hover.
// Причина: на excursions кнопка за темою (btn--green) зливалась із зеленим градієнтом hero.fade (рішення замовника 16.10.2026: «зроби кнопку hero у excursions світлою»).
// Метод: заливка = computed background-color .btn__inner (або .btn), тло = медіана пікселів знімка в 4 точках за межами кнопки (±12px від рамки), контраст за WCAG.
// Позитивний контроль (у тому ж прогоні): примусово --btn-bg = --color-green на кнопці → МАЄ дати порушення. Сторінки за замовч.: excursions (hero.fade) і barrels (фото без градієнта: кнопка `cta.variant: 'light'`, інакше темна teal-кнопка давала медіану 3.3:1, p10 2.1:1 — verify-E3-B, дефект 3); позитивний контроль — на excursions.  npm run qa:hero-btn
import { Report, runMain, launch, openPage, pageUrl, pageSpec, matrix, sleep, contrast, waitStable } from './lib.mjs';

const MIN = 3;
async function measure(page) {
  const h = await page.$('.hero--lp .btn'); if (!h) return null;
  await page.evaluate(() => document.querySelector('.hero--lp .btn').scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(200);
  const geo = () => page.evaluate(() => { const b = document.querySelector('.hero--lp .btn'); const r = b.getBoundingClientRect(); const i = b.querySelector('.btn__inner') || b; const cs = getComputedStyle(i); const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d'); x.fillStyle = cs.backgroundColor; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return { r: { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }, vp: { x: r.left, y: r.top }, fill: [d[0], d[1], d[2]], a: d[3] }; });
  const surround = async (r) => {
    const m = 12; const shot = await page.screenshot({ encoding: 'base64', clip: { x: Math.max(0, r.x - m - 2), y: Math.max(0, r.y - m - 2), width: r.w + 2 * m + 4, height: r.h + 2 * m + 4 } });
    return page.evaluate(async (b64, w, hh, m2) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode(); const k = img.width / (w + 2 * m2 + 4);
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
      const ys = [hh / 2, hh / 2 - hh / 3, hh / 2 + hh / 3].map((v) => v + m2 + 2); const pts = ys.flatMap((y) => [[1, y], [w + 2 * m2 + 3, y]]); // збоку від кнопки (зверху — підзаголовок hero, світлі літери спотворили б тло)
      const px = pts.map(([px_, py]) => Array.from(cx.getImageData(Math.round(px_ * k), Math.round(py * k), 1, 1).data.slice(0, 3)));
      const med = [0, 1, 2].map((c) => px.map((p) => p[c]).sort((a, b) => a - b)[3]);
      return med;
    }, shot, r.w, r.h, m);
  };
  const out = {};
  await page.mouse.move(1, 1); await sleep(450);
  let g = await geo(); out.default = { fill: g.fill, bg: await surround(g.r) };
  await page.mouse.move(g.vp.x + g.r.w / 2, g.vp.y + g.r.h / 2); await sleep(500);
  g = await geo(); out.hover = { fill: g.fill, bg: await surround(g.r) };
  await page.mouse.move(1, 1);
  return out;
}

await runMain('hero-btn', { widths: '1200,1440,1728,1920', scrollbar: 'both', pages: 'excursions,barrels' }, async (o) => {
  const rep = new Report('hero-btn'); let ctl = null; let n = 0; let minC = Infinity;
  for (const combo of matrix(o, { dprs: [o.dpr[0]] })) {
    const L = await launch({ scrollbar: combo.scrollbar, chrome: o.chrome, out: o.out });
    try {
      for (const spec of o.pagesList.map(pageSpec)) {
        const label = `${spec.label}@${combo.width}/${combo.scrollbar}`;
        const page = await openPage(L.browser, pageUrl(o.url, spec, 'static'), { width: combo.width, height: 900, dpr: 1 });
        await waitStable(page); await sleep(300);
        const m = await measure(page); if (!m) { await page.close(); continue; }
        for (const st of ['default', 'hover']) { n++; const c = contrast(m[st].fill, m[st].bg); minC = Math.min(minC, c); if (c < MIN) rep.add({ rule: 'HB', page: label, selector: `.hero--lp .btn [${st}]`, value: `заливка rgb(${m[st].fill}) на тлі rgb(${m[st].bg}) = ${c.toFixed(2)}:1`, msg: `контраст кнопки hero проти фону < ${MIN}:1` }); }
        if (ctl === null) { // позитивний контроль: кнопка кольору фону
          await page.addStyleTag({ content: '.hero--lp .btn { --btn-bg: var(--color-green); --btn-bg-hover: var(--color-green); }' });
          const mc = await measure(page); ctl = 0; for (const st of ['default', 'hover']) if (contrast(mc[st].fill, mc[st].bg) < MIN) ctl++;
          if (spec.name !== 'excursions') ctl = null; // контроль має сенс на зеленому градієнті excursions
        }
        await page.close();
      }
    } finally { await L.close(); }
  }
  rep.info({ rule: 'HB', msg: `вимірів ${n}; мін. контраст ${minC.toFixed(2)}:1; позитивний контроль (кнопка кольору градієнта): ${ctl} порушень` });
  if (ctl === 0) rep.add({ rule: 'HB', page: 'control', selector: 'контроль', value: '0 порушень', msg: 'кнопка кольору фону НЕ дала порушення — перевірка не працює' });
  return rep;
});
