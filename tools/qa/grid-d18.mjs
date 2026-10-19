// D18: ГОРИЗОНТАЛЬНИЙ зазор великих блоків: 5u (--grid-gap-panels) на сторінках зі списку `gap5-pages` (product і cocktails — виняток замовника 19.10.2026), на всіх інших сторінках = зазор колонок сітки 40u (--grid-gap)
//      (ДОПОВНЕННЯ 3 і 5 ABOUT-REBUILD-PLAN.md, 17.10.2026); ВЕРТИКАЛЬНІ відступи між панелями (одна над одною) лишаються 5u і D18 їх не міряє.
//      Перемикач: analyzeD18(data, cfg, mode): mode 'five' (сторінки `gap5-pages`: product, cocktails) | 'forty' (решта; T7 завершено 17.10.2026 — списку legacy-5u-pages більше немає).
//      Малі елементи (плитки: 3 колонки й вужче, ≥3 в ряду) = --grid-gap (40u) завжди.
// Збір — у браузері (COLLECT_D18), аналіз — у Node (analyzeD18), позитивний контроль — controlD18. Опис — tools/qa/README.md (розділ D18).
//
// ВЕЛИКИЙ блок = видимий елемент завширшки ≥ 2 колонок (не на всю ширину в'юпорта, не абсолютний/fixed, висотою ≥ minHeightU), що є панеллю (фон/рамка/фонове зображення)
//   або зображенням/відео/iframe/canvas/картою. Усередину великого блока не заходимо (картка/панель = завершений компонент). Дрібні рядки (FAQ-акордеон, 68px) відсікає minHeightU.
// РЯД = блоки, що перекриваються по вертикалі ≥ 50% меншої висоти. Пара = два СУСІДНІ блоки ряду; зазор = B.left − A.right (сусіди лише в межах maxNeighbourU).
//   • МАЛІ (плитки): ОБИДВА ≤ 3 колонок (4 картки каталогу в ряд, 4 фото-плитки, неповний останній ряд) → очікується gapU (40u) ± tolPx;
//   • ВЕЛИКІ: решта пар (панель | панель, фото | панель, панель | мапа, галерея з 2 фото) → очікується panelGapU (5u) ± tolPx.
//   • СКЛЕЄНІ (fused): обидва блоки всередині одного складеного компонента (fusedSelectors, напр. .tour-card: текст | фото = одна картка з рамкою) — зазору немає за дизайном, пропускаються (лічильник).
// Допуск tolPx = 0.6 px (u = --vw/1920, у classic-смуги порахований за --vw).

export const D18_DEFAULTS = {
  'gap5-pages': ['product', 'cocktails'], // сторінки, де горизонтальний зазор великих блоків = 5u (--grid-gap-panels); решта = 40u
  marginU: 202.9, gapU: 40, panelGapU: 5,
  minCols: 2,          // великий блок: ≥ 2 колонок завширшки
  minHeightU: 150,     // нижче — це рядок/акордеон/лейбл, не великий блок
  tileMaxCols: 3,      // малий елемент: ≤ 3 колонок (4 в ряд, неповний останній ряд теж)
  tolPx: 0.6,
  maxNeighbourU: 60,   // зазор ширший за 60u (≈1.5×gap) — блоки не сусідні (між ними порожня колонка)
  fusedSelectors: ['.tour-card'],
  skipSelectors: ['.btn', '.chip', '.nav-cell', '.select', '.arrow-btn', 'button', 'input', 'select', 'textarea', 'label', '.maplibregl-ctrl', '.maplibregl-ctrl-group', '.product-thumbs', '.age-card', '[data-age-gate]'],
  // сторінки (специфікації), де великі пари МАЮТЬ бути знайдені (охоронець: збір не мовчить): мін. кількість перевірених великих пар + склеєних
  required: { 'cart?demo=1': 1, 'checkout?demo=1': 1, /* account?state=login: гостьовий екран = одна панель по центру (767afdb7), пари немає (кабінет: меню + вміст, теж без пари) */ 'product': 1, /* contacts: одне вікно (контакти | мапа всередині нього, не пара блоків) + feedback — пари немає (рішення замовника) */ 'excursions': 3, 'barrels': 1, 'cocktails': 1, 'index': 1, 'design-system': 1 },
  states: ['cart?demo=1', 'checkout?demo=1', 'account?state=login', 'account?state=dashboard'], // демо-стани, яких немає серед *.html
};

export function COLLECT_D18(cfg) {
  const clientW = document.documentElement.clientWidth;
  const vwVar = parseFloat(document.documentElement.style.getPropertyValue('--vw')) || clientW;
  const vw = Math.min(clientW, vwVar);
  const uVal = Math.min(Math.max(vwVar, 1185), 1920) / 1920;
  const margin = cfg.marginU * uVal, gap = cfg.gapU * uVal;
  const col = (vw - 2 * margin - 9 * gap) / 10; // 10 колонок (tokens.css --grid-cols)
  const minW = cfg.minCols * col + (cfg.minCols - 1) * gap - 1;
  const out = { vw, clientW, u: uVal, col, gap, panelGap: cfg.panelGapU * uVal, blocks: [] };
  window.__qaD18 = [];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TEMPLATE', 'NOSCRIPT', 'BR', 'SOURCE', 'PATH', 'USE', 'HR', 'SVG']);
  const MEDIA = new Set(['IMG', 'VIDEO', 'CANVAS', 'IFRAME', 'PICTURE']);
  const clsOf = (el) => (typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : []);
  const nameOf = (el) => { const c = clsOf(el).filter((x) => !/^(is-|js-|has-|in-view|reveal)/.test(x)).slice(0, 2); return el.tagName.toLowerCase() + (c.length ? `.${c.join('.')}` : ''); };
  const pathOf = (el) => { const p = []; for (let n = el, d = 0; n && n !== document.body && d < 3; n = n.parentElement, d++) p.unshift(nameOf(n)); return p.join(' > '); };
  const alpha = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return c === 'transparent' ? 0 : 1; const p = m[1].split(/[,/ ]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
  const hasBox = (cs) => alpha(cs.backgroundColor) > 0.02 || cs.backgroundImage !== 'none' || ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none');
  const skipSel = cfg.skipSelectors.join(',');
  const fusedSel = (cfg.fusedSelectors || []).join(',');
  const rootEl = cfg.root ? document.querySelector(cfg.root) : document.body;
  if (!rootEl) return out;
  const walk = (el) => {
    for (const c of el.children) {
      if (SKIP.has(c.tagName.toUpperCase()) || (c.id && c.id.startsWith('__')) || c.closest('template')) continue;
      const cs = getComputedStyle(c);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (cs.display === 'contents') { walk(c); continue; }
      if (cs.position === 'fixed') continue;
      if (skipSel && c.matches(skipSel)) continue;
      const r = c.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) { walk(c); continue; }
      if (r.right <= 0 || r.left >= vw) continue;
      const bleed = r.left <= 1 || r.right >= vw - 1;
      const media = MEDIA.has(c.tagName.toUpperCase()) || /\bmaplibregl-map\b|\bmap\b|contacts-map/.test(clsOf(c).join(' '));
      // обгортка без власного фону, яку повністю (≥95% по обох осях) закриває одне зображення/відео (фото товару на світлому тлі: img absolute inset 0) = медіа-блок
      let covered = false;
      if (!media && !bleed && r.width >= minW && !hasBox(cs)) { const im = c.querySelector('img, video, canvas, picture'); if (im) { const q = im.getBoundingClientRect(); covered = q.width >= r.width * 0.95 && q.height >= r.height * 0.95; } }
      if (!bleed && r.width >= minW && r.height >= cfg.minHeightU * uVal && (media || covered || hasBox(cs)) && cs.position !== 'absolute') {
        const fz = fusedSel ? c.closest(fusedSel) : null;
        out.blocks.push({ sel: nameOf(c), path: pathOf(c), L: r.left, R: r.right, T: r.top + window.scrollY, B: r.bottom + window.scrollY, W: r.width, H: r.height, kind: media || covered ? 'media' : 'panel', fused: fz ? [...document.querySelectorAll(fusedSel)].indexOf(fz) : -1 });
        window.__qaD18.push(c);
        continue;
      }
      walk(c);
    }
  };
  walk(rootEl);
  return out;
}

/** Режим сторінки: 'five' — сторінки списку `gap5-pages` (product, cocktails), 'forty' — решта. */
export function d18Mode(pageName, cfg = D18_DEFAULTS) {
  return (cfg['gap5-pages'] || D18_DEFAULTS['gap5-pages']).includes(pageName) ? 'five' : 'forty';
}

/** Аналіз однієї сторінко-ширини → { pairs:[{a,b,gap,kind,expected,delta,ok,cols,n}], fused, blocks } */
export function analyzeD18(data, cfg, mode = 'forty') {
  const tol = cfg.tolPx;
  const colW = (w) => (w + data.gap) / (data.col + data.gap);
  const bs = [...data.blocks].sort((x, y) => x.L - y.L || x.T - y.T);
  const ov = (a, b) => Math.min(a.B, b.B) - Math.max(a.T, b.T);
  const sameRow = (a, b) => ov(a, b) >= 0.5 * Math.min(a.H, b.H);
  const rowCount = (a) => 1 + bs.filter((b) => b !== a && sameRow(a, b)).length;
  const pairs = []; let fused = 0;
  for (const a of bs) {
    let best = null;
    for (const b of bs) {
      if (b === a || !sameRow(a, b) || b.L < a.R - 0.5) continue;
      if (!best || b.L < best.L) best = b;
    }
    if (!best) continue;
    const b = best, gap = b.L - a.R;
    if (gap > cfg.maxNeighbourU * data.u) continue;
    if (a.fused >= 0 && a.fused === b.fused) { fused++; continue; }
    const n = Math.max(rowCount(a), rowCount(b));
    const tile = colW(a.W) <= cfg.tileMaxCols + 0.05 && colW(b.W) <= cfg.tileMaxCols + 0.05;
    const kind = tile ? 'tile' : 'big';
    const expected = kind === 'big' && mode === 'five' ? data.panelGap : data.gap;
    const delta = gap - expected;
    pairs.push({ a, b, gap, kind, expected, delta, ok: Math.abs(delta) <= tol, mode, cols: [+colW(a.W).toFixed(2), +colW(b.W).toFixed(2)], n });
  }
  return { pairs, fused, blocks: bs.length };
}

/**
 * Позитивний контроль (у живій сторінці), двобічний:
 *  dir 'widen' (сторінка в режимі 'five', напр. product, cocktails): першій парі великих блоків збільшуємо зазор до 40u → D18 МАЄ дати порушення;
 *  dir 'narrow' (режим 'forty', напр. about): першій парі зменшуємо зазор до 5u (margin-left правого блока = −35u) → D18 МАЄ дати порушення.
 * Повертає { applied: bool, fails: n } (applied=false — на сторінці немає великої пари).
 */
export async function controlD18(page, cfg, mode = 'five') {
  const data = await page.evaluate(COLLECT_D18, cfg);
  const a = analyzeD18(data, cfg, mode);
  const k = a.pairs.find((p) => p.kind === 'big' && p.ok) || a.pairs.find((p) => p.kind === 'big');
  if (!k) return { applied: false, fails: 0, mode };
  const idx = data.blocks.indexOf(k.b);
  const shift = mode === 'five' ? data.gap - data.panelGap : -(data.gap - data.panelGap);
  await page.evaluate((i, px) => { const el = window.__qaD18[i]; el.__qaMl = el.style.marginLeft; el.style.marginLeft = `${px}px`; }, idx, shift);
  const d2 = await page.evaluate(COLLECT_D18, cfg);
  const a2 = analyzeD18(d2, cfg, mode);
  const fails = a2.pairs.filter((p) => !p.ok).length; // (якщо пара вже була неправильною — порушення є й без контролю)
  await page.evaluate((i) => { const el = window.__qaD18[i]; if (el) el.style.marginLeft = el.__qaMl || ''; }, idx).catch(() => {});
  return { applied: true, fails, mode };
}
