#!/usr/bin/env node
// Поля `cols` (ширина вмісту секції в колонках) і `pad` (вертикальний відступ секції) шаблону lp — геометрія у браузері.  npm run qa:lp-cols
//   cols: для кожної секції з класом lp-cols--N контейнер вмісту (.lp-*__grid / .faq-page__grid) = --grid-span-N (±1px), стоїть по центру сторінки,
//     лівий край — на початку колонки (12−N)/2+1, правий — на кінці колонки (12+N)/2 (для 10: колонки 2 і 11). Плитки (tiles), що не діляться на колонки контейнера
//     (клас lp-tiles__grid--eq, напр. 4 на 10): n рівних блоків із зазором --grid-gap, діаметр кола = (ширина контейнера − (n−1)·зазор)/n.
//   pad: секція з класом lp-pad--N має padding-top = --space-N; padding-bottom = --space-N, крім випадків, коли наступна секція — стек (padding-bottom 0) або join (--space-lp-room-join).
//   Позитивні контролі (в тому ж прогоні): (а) контейнер розтягнуто на 12 колонок (--lp-w: --grid-w) — перевірка cols МАЄ дати порушення; (б) плитки зі зміненою шириною (рівний
//   поділ зламано) — МАЄ дати порушення; (в) pad перебито на 150u — МАЄ дати порушення.
// Код виходу: 0 — усе гаразд, 1 — порушення / контроль не спрацював, 2 — збій. Параметри: --url (за замовч. http://localhost:5200/), --widths, --scrollbar, --pages (за замовч. excursions).
import { Report, runMain, launch, openPage, pageUrl, pageSpec, matrix, sleep } from './lib.mjs';

const PROBE = () => {
  const px = (expr) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;visibility:hidden;height:0;width:${expr}`; document.body.appendChild(d); const w = d.getBoundingClientRect().width; d.remove(); return w; };
  const gridW = px('var(--grid-w)'); const step = px('var(--grid-step)'); const gap = px('var(--grid-gap)');
  const GRIDS = '.lp-layers__grid, .lp-compare__grid, .lp-formats__grid, .lp-tiles__grid, .lp-offers__grid, .faq-page__grid';
  const cols = [...document.querySelectorAll('[class*="lp-cols--"]')].map((sec) => {
    const n = +(sec.className.match(/lp-cols--(\d+)/) || [])[1];
    const c = sec.querySelector(GRIDS); const b = c.getBoundingClientRect(); const sb = sec.getBoundingClientRect();
    const center = sb.left + sb.width / 2; const k = (12 - n) / 2;
    const out = { id: sec.id, n, left: b.left, width: b.width, expWidth: px(`var(--grid-span-${n})`), center, cx: b.left + b.width / 2, k, gridLeft: center - gridW / 2, step, gridW };
    const eq = sec.querySelector('.lp-tiles__grid--eq');
    if (eq) {
      const figs = [...eq.querySelectorAll(':scope > .lp-tile')].map((f) => f.getBoundingClientRect());
      const m = figs.length; const w = (eq.getBoundingClientRect().width - (m - 1) * gap) / m;
      out.eq = { n: m, w, widths: figs.map((r) => r.width), gaps: figs.slice(1).map((r, i) => r.left - figs[i].right), expGap: gap, imgs: !sec.classList.contains('lp-tiles--circle') ? [] : [...eq.querySelectorAll('.lp-tile__media')].map((el) => el.getBoundingClientRect().width), imgH: [...eq.querySelectorAll('.lp-tile__media')].map((el) => el.getBoundingClientRect().height) };
    }
    return out;
  });
  const pads = [...document.querySelectorAll('[class*="lp-pad--"]')].map((sec) => {
    const n = +(sec.className.match(/lp-pad--(\d+)/) || [])[1]; const cs = getComputedStyle(sec); const next = sec.nextElementSibling;
    const nextStack = !!next && /\blp-sec--stack\b/.test(next.className); const nextJoin = !!next && /\blp-sec--join\b/.test(next.className);
    return { id: sec.id, n, top: parseFloat(cs.paddingTop), bottom: parseFloat(cs.paddingBottom), exp: px(`var(--space-${n})`), expBottom: nextStack ? 0 : nextJoin ? px('var(--space-lp-room-join)') : px(`var(--space-${n})`), nextStack, nextJoin };
  });
  return { cols, pads };
};

const check = (d, rep, label) => {
  let bad = 0;
  const add = (x) => { bad++; rep.add({ page: label, ...x }); };
  for (const c of d.cols) {
    if (Math.abs(c.width - c.expWidth) > 1) add({ rule: 'COLS', selector: `#${c.id}`, value: `ширина ${c.width.toFixed(1)}px ≠ ${c.n} колонок ${c.expWidth.toFixed(1)}px`, msg: 'cols: контейнер = --grid-span-N' });
    if (Math.abs(c.cx - c.center) > 1) add({ rule: 'COLS', selector: `#${c.id}`, value: `центр ${c.cx.toFixed(1)} ≠ ${c.center.toFixed(1)}`, msg: 'cols: контейнер по центру' });
    const off = (c.left - c.gridLeft) - c.k * c.step;
    if (Math.abs(off) > 1) add({ rule: 'COLS', selector: `#${c.id}`, value: `лівий край ${off >= 0 ? '+' : ''}${off.toFixed(2)}px від початку колонки ${c.k + 1}`, msg: 'cols: лівий край на початку колонки (12−N)/2+1' });
    if (c.eq) {
      c.eq.widths.forEach((w, i) => { if (Math.abs(w - c.eq.w) > 0.6) add({ rule: 'COLS-EQ', selector: `#${c.id} плитка ${i + 1}`, value: `ширина ${w.toFixed(2)}px ≠ ${c.eq.w.toFixed(2)}px`, msg: 'рівний поділ: плитки однакової ширини (ширина − (n−1)·зазор)/n' }); });
      c.eq.gaps.forEach((g, i) => { if (Math.abs(g - c.eq.expGap) > 0.6) add({ rule: 'COLS-EQ', selector: `#${c.id} шов ${i + 1}`, value: `зазор ${g.toFixed(2)}px ≠ ${c.eq.expGap.toFixed(2)}px`, msg: 'рівний поділ: зазор = --grid-gap' }); });
      c.eq.imgs.forEach((w, i) => { if (Math.abs(w - c.eq.w) > 0.6 || Math.abs(c.eq.imgH[i] - w) > 0.6) add({ rule: 'COLS-EQ', selector: `#${c.id} коло ${i + 1}`, value: `${w.toFixed(2)}×${c.eq.imgH[i].toFixed(2)}px, очікується коло ${c.eq.w.toFixed(2)}`, msg: 'діаметр кола = ширина блока' }); });
    }
  }
  for (const p of d.pads) {
    if (Math.abs(p.top - p.exp) > 0.6) add({ rule: 'PAD', selector: `#${p.id}`, value: `padding-top ${p.top.toFixed(1)}px ≠ --space-${p.n} (${p.exp.toFixed(1)}px)`, msg: 'pad: верхній відступ = крок шкали' });
    if (Math.abs(p.bottom - p.expBottom) > 0.6) add({ rule: 'PAD', selector: `#${p.id}`, value: `padding-bottom ${p.bottom.toFixed(1)}px ≠ ${p.expBottom.toFixed(1)}px (${p.nextStack ? 'далі стек' : p.nextJoin ? 'далі join' : `--space-${p.n}`})`, msg: 'pad: нижній відступ = крок шкали (перед стеком 0, перед join — повітря кімнати)' });
  }
  return bad;
};

await runMain('lp-cols', { widths: '1200,1440,1728,1920', scrollbar: 'both', pages: 'excursions' }, async (o) => {
  const rep = new Report('lp-cols');
  const ctl = { wide: null, eq: null, pad: null }; let colsCount = 0; let padCount = 0; let eqCount = 0;
  for (const combo of matrix(o, { dprs: [o.dpr[0]] })) {
    const L = await launch({ scrollbar: combo.scrollbar, chrome: o.chrome, out: o.out });
    try {
      for (const spec of o.pagesList.map(pageSpec)) {
        const label = `${spec.label}@${combo.width}${combo.scrollbar === 'classic' ? '' : '/' + combo.scrollbar}`;
        const page = await openPage(L.browser, pageUrl(o.url, spec, 'static'), { width: combo.width, height: 1080, dpr: 1 });
        await sleep(400);
        const d = await page.evaluate(PROBE);
        colsCount += d.cols.length; padCount += d.pads.length; eqCount += d.cols.filter((c) => c.eq).length;
        check(d, rep, label);
        if (d.cols.length && ctl.wide === null) { // (а) контейнер на 12 колонок — має ловитися
          await page.addStyleTag({ content: '[class*="lp-cols--"] { --lp-w: var(--grid-w) !important; }' });
          const dd = await page.evaluate(PROBE); ctl.wide = check(dd, { add() {} }, 'ctl');
        }
        if (d.cols.some((c) => c.eq) && ctl.eq === null) { // (б) рівний поділ зламано: перша плитка ширша
          await page.addStyleTag({ content: '.lp-tiles__grid--eq > .lp-tile:first-child { margin-right: calc(-1 * var(--grid-gap)); }' });
          const dd = await page.evaluate(PROBE); ctl.eq = check(dd, { add() {} }, 'ctl');
        }
        if (d.pads.length && ctl.pad === null) { // (в) pad перебито
          await page.addStyleTag({ content: '[class*="lp-pad--"] { padding-block: calc(150 * var(--u)) !important; }' });
          const dd = await page.evaluate(PROBE); ctl.pad = check(dd, { add() {} }, 'ctl');
        }
        await page.close();
      }
    } finally { await L.close(); }
  }
  rep.info({ rule: 'COLS', msg: `секцій з cols ${colsCount} (з них рівний поділ ${eqCount}), з pad ${padCount} на ${o.widths.length * o.scrollbar.length} комбінаціях; контролі: «контейнер на 12 колонок» ${ctl.wide} порушень, «зламаний рівний поділ» ${ctl.eq} порушень, «pad 150u» ${ctl.pad} порушень` });
  if (colsCount && !ctl.wide) rep.add({ rule: 'COLS', page: 'control', selector: 'контроль', value: '0 порушень', msg: 'контейнер завширшки 12 колонок НЕ дав порушення — перевірка cols не працює' });
  if (eqCount && !ctl.eq) rep.add({ rule: 'COLS-EQ', page: 'control', selector: 'контроль', value: '0 порушень', msg: 'зламаний рівний поділ НЕ дав порушення — перевірка не працює' });
  if (padCount && !ctl.pad) rep.add({ rule: 'PAD', page: 'control', selector: 'контроль', value: '0 порушень', msg: 'pad 150u НЕ дав порушення — перевірка не працює' });
  return rep;
});
