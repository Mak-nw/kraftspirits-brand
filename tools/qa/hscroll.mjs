#!/usr/bin/env node
// hscroll: горизонтальний скрол/зріз на сторінках × ширинах × режимі смуги прокрутки.
//   node tools/qa/hscroll.mjs [--url …] [--pages …] [--widths 1200,1280,…] [--scrollbar classic|none|both] [--dpr 1]
// html має overflow-x: clip, тож scrollWidth сам по собі не видає зріз — додатково шукаємо елементи за межами в'юпорта (lib.hscroll).
import { Report, runMain, launch, openPage, pageUrl, pageSpec, matrix, hscroll, hscrollBad, waitStable, sleep } from './lib.mjs';

export const DEFAULT_WIDTHS = '1200,1280,1366,1440,1536,1680,1920';

export async function runHscroll(o) {
  const rep = new Report('hscroll');
  const combos = matrix(o);
  let n = 0;
  for (const sb of o.scrollbar) {
    const L = await launch({ scrollbar: sb, chrome: o.chrome, out: o.out });
    try {
      for (const spec0 of o.pagesList) {
        const spec = pageSpec(spec0);
        for (const c of combos.filter((x) => x.scrollbar === sb)) {
          const page = await openPage(L.browser, pageUrl(o.url, spec, 'static'), { width: c.width, height: o.height, dpr: c.dpr, settle: false });
          await waitStable(page, { selector: spec.name === 'catalog' ? '.product-card--catalog' : null });
          await sleep(150);
          const h = await hscroll(page);
          n++;
          if (hscrollBad(h)) rep.add({ rule: 'H1', page: `${spec.label}@${c.width}/${sb}/x${c.dpr}`, selector: h.offenders[0]?.el || 'html', value: `scrollWidth ${h.scrollWidth}, client ${h.clientWidth}, +${h.overflowPx}px; ${h.offenders.slice(0, 3).map((x) => `${x.el} [${x.left}…${x.right}]`).join('; ') || 'елементів поза в\'юпортом немає'}`, msg: 'горизонтальний скрол/зріз' });
          await page.close().catch(() => {});
        }
      }
    } finally { await L.close(); }
  }
  rep.stats = { measurements: n };
  rep.note(`${n} замірів (сторінок ${o.pagesList.length} × комбінацій ${combos.length})`);
  return rep;
}
if (import.meta.url === `file://${process.argv[1]}`) await runMain('hscroll', { widths: DEFAULT_WIDTHS, scrollbar: 'classic' }, runHscroll);
