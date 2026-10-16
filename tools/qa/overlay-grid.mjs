#!/usr/bin/env node
// Dev-оверлей «Сітка (G)» (dev-tools/review/overlay.js) малює АКТУАЛЬНУ сітку з tokens.css (--grid-cols/--grid-margin/--grid-gap/--grid-w):
// кількість колонок, зазор, поле і ширина колонки порівнюються з ЕТАЛОНОМ, розібраним із файлу tokens.css (не з живих токенів — тоді зламаний оверлей
// і зламаний токен пройшли б разом). Ширини 1440 і 1920 (клас. смуга none), допуск 0.2u.
// Позитивний контроль: `:root{--grid-cols:12}` (старе число колонок) МАЄ дати розбіжність.
//   node tools/qa/overlay-grid.mjs [--url http://localhost:5200/] [--widths 1440,1920]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, openPage, waitStable, sleep, runMain, Report, ROOT } from './lib.mjs';

const TOL = 0.2;
function expected() {
  const css = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8');
  const num = (n) => { const m = css.match(new RegExp(`--${n}:\\s*(?:calc\\()?\\s*([\\d.]+)`)); if (!m) throw new Error(`немає --${n} у tokens.css`); return +m[1]; };
  const cols = num('grid-cols'), margin = num('grid-margin'), gap = num('grid-gap');
  const w = 1920 - 2 * margin;
  return { cols, margin, gap, w, col: (w - (cols - 1) * gap) / cols };
}
async function probe(page) {
  await page.evaluate(() => window.__review.setGrid(true));
  await sleep(500);
  return page.evaluate(() => {
    const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot?.querySelector('.gridcols')); if (!host) return null;
    const d = document.createElement('div'); d.style.cssText = 'position:absolute;width:calc(100*var(--u))'; document.body.append(d); const u = d.getBoundingClientRect().width / 100; d.remove();
    const cs = [...host.shadowRoot.querySelector('.gridcols').children].map((c) => c.getBoundingClientRect());
    return { n: cs.length, col: cs[0].width / u, gap: cs.length > 1 ? (cs[1].left - cs[0].right) / u : 0, margin: cs[0].left / u, shown: !host.shadowRoot.querySelector('.gridlayer').hidden };
  });
}
const diff = (g, e) => [['колонок', g.n, e.cols], ['колонка, u', g.col, e.col], ['зазор, u', g.gap, e.gap], ['поле, u', g.margin, e.margin]].filter(([, a, b]) => Math.abs(a - b) > TOL).map(([n, a, b]) => `${n}: ${(+a).toFixed(2)} ≠ ${(+b).toFixed(2)}`);

export async function runOverlayGrid(o) {
  const rep = new Report('overlay-grid'); const e = expected();
  const L = await launch({ scrollbar: 'none', chrome: o.chrome, out: o.out });
  try {
    let ctl = null;
    for (const w of o.widths.length ? o.widths : [1440, 1920]) {
      const page = await openPage(L.browser, `${o.url}barrels.html?age=ok&reveal=off&parallax=off`, { width: w, height: o.height, dpr: 1, settle: false });
      await waitStable(page); await sleep(300);
      const g = await probe(page);
      if (!g) rep.add({ rule: 'G', page: `@${w}`, msg: 'оверлей «Сітка» не змонтовано (dev-сервер із review-оверлеєм?)' });
      else { const d = diff(g, e); if (d.length) rep.add({ rule: 'G', page: `barrels@${w}`, value: d.join('; '), msg: 'оверлей «Сітка (G)» ≠ сітка tokens.css' }); else rep.info(`@${w}: ${g.n} кол · колонка ${g.col.toFixed(2)}u · зазор ${g.gap.toFixed(2)}u · поле ${g.margin.toFixed(2)}u = tokens.css`); }
      if (ctl === null && g) { // контроль
        await page.evaluate(() => { window.__review.setGrid(false); const s = document.createElement('style'); s.textContent = ':root{--grid-cols:12}'; document.head.append(s); });
        const gc = await probe(page); ctl = gc ? diff(gc, e).length : 0;
        if (!ctl) rep.add({ rule: 'G', page: 'control', value: '0 розбіжностей', msg: 'позитивний контроль (12 колонок) не спрацював — перевірка сліпа' });
      }
      await page.close().catch(() => {});
    }
  } finally { await L.close(); }
  return rep;
}
if (import.meta.url === `file://${process.argv[1]}`) await runMain('overlay-grid', { widths: '1440,1920', scrollbar: 'none', dpr: '1' }, runOverlayGrid);
