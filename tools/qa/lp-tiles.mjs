#!/usr/bin/env node
// Плитки lp (.lp-tile у .lp-tiles__grid, зокрема вінці .lp-tiles--crown): у ОДНОМУ ряду кола/медіа (.lp-tile__media) однакової висоти (±0.5px), стоять на одній лінії (верх медіа збігається),
// а підписи (назва .lp-tile__name) вирівняні по верху.  npm run qa:lp-tiles
//   Причина, яку правило ловить (D-1): на телефоні (< 768, 2 колонки) плитка розтягується до найвищого сусіда в ряду, а її авто-рядки (медіа / підпис) ділять зайву висоту — коло у плитки з коротшим підписом
//   «виростало» на кілька px і підписи в ряду розходились (кінцеве рішення — align-content: start у .lp-tile). Правило діє на ≤ 767 (2 в ряд) і ≥ 768 (3–6 в ряд), у плитках з підписом поверх фото (.lp-tiles--over) підпис не перевіряється.
//   Позитивний контроль (в тому ж прогоні, окремо для < 768 і ≥ 768): першій плитці першої секції додано padding-top 10px — перевірка МАЄ дати порушення.
// Код виходу: 0 — усе гаразд, 1 — порушення / контроль не спрацював, 2 — збій. Параметри: --url (за замовч. http://localhost:5200/), --widths, --scrollbar, --pages (за замовч. barrels,en/barrels,excursions,events).
import { Report, runMain, launch, openPage, pageUrl, pageSpec, matrix, sleep } from './lib.mjs';

const TOL = 0.5; // px
const PROBE = () => {
  const rows = [];
  for (const sec of document.querySelectorAll('.lp-tiles__grid')) {
    const over = !!sec.closest('.lp-tiles--over');
    const tiles = [...sec.querySelectorAll(':scope > .lp-tile')];
    const byTop = new Map();
    for (const t of tiles) { const b = t.getBoundingClientRect(); if (!b.width) continue; const key = [...byTop.keys()].find((x) => Math.abs(x - b.top) <= 1.5) ?? b.top; if (!byTop.has(key)) byTop.set(key, []); byTop.get(key).push(t); }
    let i = 0;
    for (const [, row] of byTop) {
      i++;
      if (row.length < 2) continue;
      const r = (t) => { const m = t.querySelector('.lp-tile__media')?.getBoundingClientRect(); const n = t.querySelector('.lp-tile__name')?.getBoundingClientRect(); return { media: m ? { top: m.top, h: m.height } : null, name: n ? { top: n.top } : null, label: (t.querySelector('.lp-tile__name')?.textContent || '').trim().slice(0, 18) }; };
      rows.push({ sec: sec.closest('.lp-sec')?.id || '', over, row: i, tiles: row.map(r) });
    }
  }
  return rows;
};

const check = (rows, rep, label) => {
  let bad = 0;
  const add = (x) => { bad++; rep.add({ page: label, ...x }); };
  for (const r of rows) {
    const spread = (a) => Math.max(...a) - Math.min(...a);
    const ms = r.tiles.map((t) => t.media).filter(Boolean);
    if (ms.length > 1) {
      const sh = spread(ms.map((m) => m.h)), st = spread(ms.map((m) => m.top));
      if (sh > TOL) add({ rule: 'TILE-ROW', selector: `#${r.sec} ряд ${r.row}`, value: `висоти кіл ${ms.map((m) => m.h.toFixed(1)).join(' / ')}`, msg: 'у ряду плиток кола однакової висоти (±0.5px)' });
      if (st > TOL) add({ rule: 'TILE-ROW', selector: `#${r.sec} ряд ${r.row}`, value: `верх кіл ${ms.map((m) => m.top.toFixed(1)).join(' / ')}`, msg: 'у ряду плиток кола на одній лінії' });
    }
    if (!r.over) {
      const ns = r.tiles.map((t) => t.name).filter(Boolean);
      if (ns.length > 1 && spread(ns.map((n) => n.top)) > TOL) add({ rule: 'TILE-ROW', selector: `#${r.sec} ряд ${r.row}`, value: `верх підписів ${ns.map((n) => n.top.toFixed(1)).join(' / ')} (${r.tiles.map((t) => t.label).join(', ')})`, msg: 'у ряду плиток підписи вирівняні по верху' });
    }
  }
  return bad;
};

await runMain('lp-tiles', { widths: '320,360,390,440,599,767,768,1024,1440', scrollbar: 'none', pages: 'barrels,en/barrels,excursions,events' }, async (o) => {
  const rep = new Report('lp-tiles');
  const ctl = { phone: null, wide: null }; let rowsCount = 0;
  for (const combo of matrix(o, { dprs: [o.dpr[0]] })) {
    const L = await launch({ scrollbar: combo.scrollbar, chrome: o.chrome, out: o.out });
    try {
      for (const spec of o.pagesList.map(pageSpec)) {
        const label = `${spec.label}@${combo.width}`;
        const page = await openPage(L.browser, pageUrl(o.url, spec, 'static'), { width: combo.width, height: 900, dpr: 1 });
        await sleep(400);
        const rows = await page.evaluate(PROBE);
        rowsCount += rows.length;
        check(rows, rep, label);
        const k = combo.width < 768 ? 'phone' : 'wide';
        if (rows.length && ctl[k] === null) { // контроль: padding-top 10px однієї плитки ряду — МАЄ дати порушення
          await page.evaluate(() => { const g = document.querySelector('.lp-tiles__grid'); g?.querySelector(':scope > .lp-tile')?.style.setProperty('padding-top', '10px', 'important'); });
          await sleep(100);
          ctl[k] = check(await page.evaluate(PROBE), { add() {} }, 'ctl');
        }
        await page.close();
      }
    } finally { await L.close(); }
  }
  rep.info({ rule: 'TILE-ROW', msg: `рядів плиток (≥ 2 в ряду) ${rowsCount} на ${o.widths.length} ширинах × ${o.pagesList.length} стор.; контролі (padding-top 10px у першій плитці): < 768 → ${ctl.phone} порушень, ≥ 768 → ${ctl.wide}` });
  if (ctl.phone !== null && !ctl.phone) rep.add({ rule: 'TILE-ROW', page: 'control', selector: 'контроль', value: '0 порушень', msg: 'padding-top 10px у плитці (< 768) НЕ дав порушення — перевірка не працює' });
  if (ctl.wide !== null && !ctl.wide) rep.add({ rule: 'TILE-ROW', page: 'control', selector: 'контроль', value: '0 порушень', msg: 'padding-top 10px у плитці (≥ 768) НЕ дав порушення — перевірка не працює' });
  if (!rowsCount) rep.add({ rule: 'TILE-ROW', page: 'control', selector: '.lp-tiles__grid', value: '0 рядів', msg: 'не знайдено жодного ряду плиток — перевірка нічого не перевіряє' });
  return rep;
});
