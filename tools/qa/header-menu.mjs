// D15 — шапка і меню (CLAUDE.md п. 4: header/footer — єдині partials, однакові на ВСІХ сторінках).
// На кожній сторінці (поза age-gate):
//   (а) верхній відступ пілюлі (.site-header__bar, position: fixed) = обчислений токен --header3-top (px з calc) ±0.5px,
//       а сам токен = задана замовником величина `headerTopU`·u (allow.json → dynamic.d15; 15u) — щоб зсув токена не проходив непоміченим;
//   (б) пілюля стоїть на колонках 1–12 єдиної сітки: лівий край = початок кол. 1, правий = кінець кол. 12 (±0.5px; сітка — профіль `catalog` D12);
//   (в) у меню шапки (.site-header__menu .nav-cell--menu; DOM, навіть коли меню закрите) присутні ВСІ пункти зі списку, у тому ж порядку (текст без регістру + href);
//   (г) футер (.site-footer__col--menu) має ті самі пункти в тому ж порядку (текст без регістру + href).
// Додаткові пункти меню/футера = теж порушення (список має збігатися точно).
import { gridFor, GRID_DEFAULTS } from './grid-d12.mjs';

export const D15_DEFAULTS = {
  headerTopU: 15,
  tolerancePx: 0.5,
  menu: [
    { text: 'Головна', href: 'index.html' },
    { text: 'Про дім', href: 'about.html' },
    { text: "Ф'ючерсні бочки", href: 'barrels.html' },
    { text: 'Екскурсії', href: 'excursions.html' },
    { text: 'Коктейлі', href: 'cocktails.html' },
    { text: 'FAQ', href: 'faq.html' },
    { text: 'Контакти', href: 'contacts.html' },
    { text: "Зворотній зв'язок", href: 'feedback.html' },
  ],
  skipPages: [], // сторінки без шапки/футера (поки порожньо: 404 теж має partials)
};

/** у браузері */
export function COLLECT_D15() {
  const bar = document.querySelector('.site-header__bar');
  const px = (v) => { const t = document.createElement('div'); t.style.cssText = `position:absolute;visibility:hidden;height:${v}`; document.body.appendChild(t); const h = t.getBoundingClientRect().height; t.remove(); return h; };
  const items = (sel) => [...document.querySelectorAll(sel)].map((a) => ({ text: (a.textContent || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href') || '' }));
  const clientW = document.documentElement.clientWidth;
  const vwVar = parseFloat(document.documentElement.style.getPropertyValue('--vw')) || clientW;
  const r = bar?.getBoundingClientRect();
  return {
    hasHeader: !!bar, hasFooter: !!document.querySelector('.site-footer'),
    barTop: r ? r.top : null, barLeft: r?.left ?? null, barRight: r?.right ?? null, barPos: bar ? getComputedStyle(bar).position : null,
    tokenRaw: getComputedStyle(document.documentElement).getPropertyValue('--header3-top').trim(), tokenPx: px('var(--header3-top)'),
    scrollY: window.scrollY, vw: Math.min(clientW, vwVar), u: Math.min(Math.max(vwVar, 1185), 1920) / 1920,
    menu: items('.site-header__menu a.nav-cell--menu'), footer: items('.site-footer__col--menu a'),
  };
}

const nz = (s) => s.toLowerCase().replace(/[’ʼ`]/g, "'").replace(/\s+/g, ' ').trim();
const fmtList = (l) => l.map((i) => `${i.text}→${i.href}`).join(' | ') || '(порожньо)';

/** collect: [{ label, spec, width, data }] → [{ page, selector, value, msg }] */
export function analyzeD15(collect, A = {}, gridCfg = GRID_DEFAULTS) {
  const C = { ...D15_DEFAULTS, ...(A || {}) }; const tol = C.tolerancePx;
  const out = [];
  const profile = gridCfg.profiles?.[gridCfg.regionProfile?.header || 'catalog'] || GRID_DEFAULTS.profiles.catalog;
  for (const c of collect) {
    const d = c.data;
    if (C.skipPages.includes(c.spec.name)) continue;
    if (!d.hasHeader) { out.push({ page: c.label, selector: '.site-header__bar', value: 'немає', msg: 'на сторінці немає шапки (partials/header.html)' }); continue; }
    const exp = C.headerTopU * d.u;
    if (Math.abs(d.tokenPx - exp) > tol) out.push({ page: c.label, selector: '--header3-top', value: `${d.tokenRaw} = ${d.tokenPx.toFixed(2)}px, очікув. ${C.headerTopU}u = ${exp.toFixed(2)}px`, msg: 'токен --header3-top відрізняється від затвердженого відступу пілюлі' });
    if (d.barPos !== 'fixed' || Math.abs(d.barTop - d.tokenPx) > tol) out.push({ page: c.label, selector: '.site-header__bar', value: `top ${d.barTop?.toFixed(2)}px (${d.barPos}) ≠ --header3-top ${d.tokenPx.toFixed(2)}px`, msg: 'верхній відступ пілюлі ≠ токену --header3-top' });
    const g = gridFor(profile, d.vw, d.u);
    const dl = d.barLeft - g.starts[0], dr = d.barRight - g.ends[g.cols - 1];
    if (Math.abs(dl) > tol || Math.abs(dr) > tol) out.push({ page: c.label, selector: '.site-header__bar', value: `ліво ${dl >= 0 ? '+' : ''}${dl.toFixed(2)}px від поч. кол. 1, право ${dr >= 0 ? '+' : ''}${dr.toFixed(2)}px від кін. кол. 12`, msg: 'пілюля шапки не на колонках 1–12' });
    const cmp = (kind, got) => {
      const want = C.menu;
      const same = got.length === want.length && want.every((w, i) => nz(got[i].text) === nz(w.text) && got[i].href === w.href);
      if (same) return;
      const missing = want.filter((w) => !got.some((g2) => nz(g2.text) === nz(w.text) && g2.href === w.href)).map((w) => w.text);
      const extra = got.filter((g2) => !want.some((w) => nz(g2.text) === nz(w.text) && g2.href === w.href)).map((g2) => g2.text);
      const order = !missing.length && !extra.length && got.length === want.length;
      out.push({ page: c.label, selector: kind === 'menu' ? '.site-header__menu' : '.site-footer__col--menu', value: `${missing.length ? `немає: ${missing.join(', ')}; ` : ''}${extra.length ? `зайві: ${extra.join(', ')}; ` : ''}${order ? 'інший порядок; ' : ''}є: ${fmtList(got)}`, msg: kind === 'menu' ? 'меню шапки ≠ еталонному списку пунктів (склад/порядок)' : 'меню футера ≠ еталонному списку пунктів (склад/порядок)' });
    };
    cmp('menu', d.menu);
    if (!d.hasFooter) out.push({ page: c.label, selector: '.site-footer', value: 'немає', msg: 'на сторінці немає футера (partials/footer.html)' }); else cmp('footer', d.footer);
  }
  return out;
}
