// D17: ЗАГОЛОВКИ (display H1/H2: ролі .t-hero, .t-h2) = 4 КОЛОНКИ СІТКИ (рішення замовника: «заголовки мають вміщатись в 4 колонки по центру»).
// Еталон ширини — --grid-span-4 (токен --size-heading-w його повторює; контроль міняє токен, еталон лишається); клас .heading-center (по центру) / .heading-start (лівим краєм, юридичні сторінки з колонки 4) у base.css.
// Що міряється (обчислені стилі, у браузері; кожна ширина × смуга):
//   1. «заголовок по центру» = text-align: center і центр бокса = центр в'юпорта (або клас .heading-center): ширина бокса ≤ 4 колонки (+ допуск), центр = центр в'юпорта (допуск 1.5px);
//   2. .heading-start: ширина ≤ 4 колонки; якщо всередині сітки юридичної сторінки (.faq-page__intro--legal) — лівий край = початок колонки 3 (допуск 1px; 10-колонкова сітка);
//   3. слова не розриваються: overflow-wrap: normal, hyphens: manual/none, word-break: normal на .heading-*; слово, яке не вміщується в 4 колонки (scrollWidth > clientWidth), —
//      НЕ порушення (не ламаємо слово, hscroll ловить D3), а info зі словом: «слово не вміщується».
// Не цілі: заголовок усередині панелі/картки, вирівняний вліво (tour-card, .contacts-panel, коктейль), числа (.stat__num), картка вікової перевірки (.age-card; модальне вікно, не сторінка), навігація категорій каталогу (.catalog-nav: ряд посилань-фільтрів у ролі .t-hero, не заголовок; ширина 8 колонок — рішення замовника не було, див. звіт).
// Позитивний контроль (controlD17): токен --size-heading-w = 12 колонок → заголовки по центру МАЮТЬ дати порушення.
export const D17_DEFAULTS = { tolerancePx: 1, centerTolerancePx: 1.5, skipClosest: ['.stat', '.age-card', '[data-age-gate]', '.catalog-nav', '.ds-header-demo'] };

/** у браузері: збір заголовків (t-hero / t-h2) */
export async function probeD17(page, cfg = D17_DEFAULTS) {
  return page.evaluate((c) => {
    const vw = document.documentElement.clientWidth;
    const px = (expr) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;visibility:hidden;height:0;width:${expr}`; document.body.appendChild(d); const w = d.getBoundingClientRect().width; d.remove(); return w; };
    const span4 = px('var(--grid-span-4)'); const span6 = px('var(--grid-span-6)'); const gridMargin = px('var(--grid-margin)'); const step = px('var(--grid-step)');
    const name = (el) => { const p = []; for (let n = el; n && n.nodeType === 1 && p.length < 3; n = n.parentElement) { p.unshift(n.tagName.toLowerCase() + (n.id ? `#${n.id}` : '') + [...n.classList].slice(0, 2).map((x) => `.${x}`).join('')); } return p.join(' > '); };
    const out = [];
    for (const el of document.querySelectorAll('.t-hero, .t-h2')) {
      if (c.skipClosest.some((s) => el.closest(s))) continue;
      const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden') continue;
      const lh = parseFloat(cs.lineHeight) || 1;
      // найдовше слово, що не вміщується (для info)
      let wide = '';
      if (el.scrollWidth > el.clientWidth + 1) { const words = el.textContent.trim().split(/\s+/); wide = words.sort((a, b2) => b2.length - a.length)[0] || ''; }
      out.push({ el: name(el), text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), left: b.left, width: b.width, wide: el.classList.contains('heading-wide'), span6, cx: b.left + b.width / 2, vw, span4, gridMargin, step, align: cs.textAlign,
        cls: el.classList.contains('heading-center') ? 'center' : el.classList.contains('heading-start') ? 'start' : '', legal: !!el.closest('.faq-page__intro--legal'),
        wrap: cs.overflowWrap, hyphens: cs.hyphens, wordBreak: cs.wordBreak, lines: Math.round(b.height / lh), over: el.scrollWidth - el.clientWidth, wideWord: wide });
    }
    return out;
  }, cfg);
}

/** аналіз: повертає { violations: [...], info: [...] } */
export function analyzeD17(cells, cfg = D17_DEFAULTS) {
  const violations = []; const info = []; const seen = new Set();
  for (const cell of cells) for (const h of cell.data) {
    const centered = h.cls === 'center' || (h.align === 'center' && Math.abs(h.cx - h.vw / 2) <= cfg.centerTolerancePx * 2);
    const add = (value, msg) => violations.push({ page: cell.label, selector: h.el, value: `«${h.text}» ${value}`, msg });
    const cap = h.wide ? h.span6 : h.span4;   // .heading-wide (titleCols: 6) — виняток за рішенням замовника (заголовок у 2 рядки): до 6 колонок
    if (centered && h.width > cap + cfg.tolerancePx) add(`ширина ${h.width.toFixed(1)}px > ${h.wide ? '6' : '4'} колонки ${cap.toFixed(1)}px`, 'заголовок по центру має бути шириною 4 колонки (--size-heading-w, клас .heading-center; 6 — лише .heading-wide)');
    if (centered && Math.abs(h.cx - h.vw / 2) > cfg.centerTolerancePx) add(`центр ${h.cx.toFixed(1)}px ≠ центр в'юпорта ${(h.vw / 2).toFixed(1)}px`, 'заголовок по центру зсунуто від центру сторінки');
    if (h.cls === 'start' && h.width > h.span4 + cfg.tolerancePx) add(`ширина ${h.width.toFixed(1)}px > 4 колонки ${h.span4.toFixed(1)}px`, 'заголовок (лівий край) має бути не ширшим за 4 колонки (.heading-start)');
    if (h.cls === 'start' && h.legal) { const col4 = h.gridMargin + 2 * h.step; if (Math.abs(h.left - col4) > cfg.tolerancePx) add(`лівий край ${h.left.toFixed(1)}px ≠ початок колонки 3 ${col4.toFixed(1)}px`, 'заголовок юридичної сторінки має починатися з колонки 3'); }
    if (h.cls && (h.wrap !== 'normal' || !['manual', 'none'].includes(h.hyphens) || h.wordBreak !== 'normal')) add(`overflow-wrap ${h.wrap}, hyphens ${h.hyphens}, word-break ${h.wordBreak}`, 'заголовок не має розривати слова');
    if (h.wideWord) { const k = `${h.wideWord}`; if (!seen.has(k)) { seen.add(k); info.push(`${cell.label}: слово «${h.wideWord}» не вміщується в ${h.span4.toFixed(0)}px (+${h.over}px) — слово не розірвано, переповнення в межах в'юпорта`); } }
  }
  return { violations, info };
}

/** позитивний контроль: ширина заголовка 12 колонок → кількість порушень (має бути > 0) */
export async function controlD17(page, cfg = D17_DEFAULTS) {
  await page.evaluate(() => { const s = document.createElement('style'); s.id = 'qa-d17-control'; s.textContent = ':root{--size-heading-w:var(--grid-span-10);--size-heading-w-wide:var(--grid-span-10)}'; document.head.appendChild(s); });
  const cells = [{ label: 'control', data: await probeD17(page, cfg) }];
  await page.evaluate(() => document.getElementById('qa-d17-control')?.remove());
  return analyzeD17(cells, cfg).violations.length;
}
