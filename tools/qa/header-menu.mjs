// D15 — шапка і меню (CLAUDE.md п. 4: header/footer — єдині partials, однакові на ВСІХ сторінках).
// На кожній сторінці (поза age-gate):
//   (а) верхній відступ пілюлі (.site-header__bar, position: fixed) = обчислений токен --header3-top (px з calc) ±0.5px,
//       а сам токен = задана замовником величина `headerTopU`·u (allow.json → dynamic.d15; 15u) — щоб зсув токена не проходив непоміченим;
//   (б) пілюля стоїть на колонках 1–10 єдиної сітки: лівий край = початок кол. 1, правий = кінець кол. 10 (±0.5px; сітка — профіль `catalog` D12);
//   (в) у меню шапки (`headerMenu`, без «Зворотній зв'язок») (.site-header__menu .nav-cell--menu; DOM, навіть коли меню закрите) присутні ВСІ пункти зі списку, у тому ж порядку (текст без регістру + href);
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
    { text: 'B2B', href: 'b2b.html' },
    { text: 'Івенти', href: 'events.html' },
    { text: 'Коктейлі', href: 'cocktails.html' },
    { text: 'FAQ', href: 'faq.html' },
    { text: 'Контакти', href: 'contacts.html' },
    { text: "Зворотній зв'язок", href: 'feedback.html' },
  ],
  headerMenu: [ // меню шапки БЕЗ «Зворотній зв'язок» (рішення замовника: «саме посилання „зворотній зв'язок" з хедер меню заберемо»); футер лишає повний список `menu`
    { text: 'Головна', href: 'index.html' },
    { text: 'Про дім', href: 'about.html' },
    { text: "Ф'ючерсні бочки", href: 'barrels.html' },
    { text: 'Екскурсії', href: 'excursions.html' },
    { text: 'B2B', href: 'b2b.html' },
    { text: 'Івенти', href: 'events.html' },
    { text: 'Коктейлі', href: 'cocktails.html' },
    { text: 'FAQ', href: 'faq.html' },
    { text: 'Контакти', href: 'contacts.html' },
  ],
  menuEn: [ // англійські сторінки (en/<сторінка>): ті самі пункти й href, підписи за глосарієм docs/i18n.md
    { text: 'Home', href: 'index.html' },
    { text: 'About us', href: 'about.html' },
    { text: 'Barrel Futures', href: 'barrels.html' },
    { text: 'Tours', href: 'excursions.html' },
    { text: 'B2B', href: 'b2b.html' },
    { text: 'Events', href: 'events.html' },
    { text: 'Cocktails', href: 'cocktails.html' },
    { text: 'FAQ', href: 'faq.html' },
    { text: 'Contacts', href: 'contacts.html' },
    { text: 'Contact us', href: 'feedback.html' },
  ],
  skipPages: [], // сторінки без шапки/футера (поки порожньо: 404 теж має partials)
};

/** у браузері */
export function COLLECT_D15() {
  const bar = document.querySelector('.site-header__bar');
  const px = (v) => { const t = document.createElement('div'); t.style.cssText = `position:absolute;visibility:hidden;height:${v}`; document.body.appendChild(t); const h = t.getBoundingClientRect().height; t.remove(); return h; };
  const items = (sel) => [...document.querySelectorAll(sel)].filter((a) => a.getClientRects().length > 0).map((a) => ({ text: (a.textContent || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href') || '' }));
  const clientW = document.documentElement.clientWidth;
  const vwVar = parseFloat(document.documentElement.style.getPropertyValue('--vw')) || clientW;
  const r = bar?.getBoundingClientRect();
  return {
    hasHeader: !!bar, hasFooter: !!document.querySelector('.site-footer'),
    barTop: r ? r.top : null, barLeft: r?.left ?? null, barRight: r?.right ?? null, barPos: bar ? getComputedStyle(bar).position : null,
    tokenRaw: getComputedStyle(document.documentElement).getPropertyValue('--header3-top').trim(), tokenPx: px('var(--header3-top)'),
    scrollY: window.scrollY, vw: Math.min(clientW, vwVar), mq: window.innerWidth, u: Math.min(Math.max(vwVar, 1185), 1920) / 1920,
    menu: items('.site-header__menu:not(.site-header__menu--lang) a.nav-cell--menu:not([data-lang])'), lang: (() => { const b = document.querySelector('.site-header__lang-btn'), c = document.querySelector('.site-header__side--end a[href$="cart.html"]'), lg = [...document.querySelectorAll('.site-header__menu--lang a[data-lang]')].map((x) => x.dataset.lang); const rb = b?.getBoundingClientRect(), rc = c?.getBoundingClientRect(); return { has: !!b, right: rb?.right ?? null, cartLeft: rc?.left ?? null, langs: lg, menuLang: (() => { const nav = document.querySelector('.site-header__menu:not(.site-header__menu--lang)'), vis = [...(nav?.querySelectorAll('a') || [])].filter((a) => a.getClientRects().length > 0), first = vis.slice(0, 2); return { n: vis.filter((a) => a.dataset.lang).length, firstTwo: first.map((a) => a.dataset.lang || '').join(), minH: Math.min(...first.map((a) => a.getBoundingClientRect().height)), cur: first.filter((a) => a.getAttribute('aria-current') === 'true').map((a) => a.dataset.lang).join(), hrefs: first.map((a) => a.getAttribute('href')).join(), pillShown: !!b && b.getClientRects().length > 0 }; })(), haspopup: b?.getAttribute('aria-haspopup'), expanded: b?.getAttribute('aria-expanded') }; })(), footer: items('.site-footer__col--menu a'),
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
    if (Math.abs(dl) > tol || Math.abs(dr) > tol) out.push({ page: c.label, selector: '.site-header__bar', value: `ліво ${dl >= 0 ? '+' : ''}${dl.toFixed(2)}px від поч. кол. 1, право ${dr >= 0 ? '+' : ''}${dr.toFixed(2)}px від кін. кол. 10`, msg: 'пілюля шапки не на колонках 1–10' });
    const cmp = (kind, got) => {
      const en = String(c.label).startsWith('en/');
      const want = en ? (kind === 'menu' ? C.menuEn.slice(0, -1) : C.menuEn) : (kind === 'menu' ? (C.headerMenu || C.menu) : C.menu);
      const same = got.length === want.length && want.every((w, i) => nz(got[i].text) === nz(w.text) && got[i].href === w.href);
      if (same) return;
      const missing = want.filter((w) => !got.some((g2) => nz(g2.text) === nz(w.text) && g2.href === w.href)).map((w) => w.text);
      const extra = got.filter((g2) => !want.some((w) => nz(g2.text) === nz(w.text) && g2.href === w.href)).map((g2) => g2.text);
      const order = !missing.length && !extra.length && got.length === want.length;
      out.push({ page: c.label, selector: kind === 'menu' ? '.site-header__menu' : '.site-footer__col--menu', value: `${missing.length ? `немає: ${missing.join(', ')}; ` : ''}${extra.length ? `зайві: ${extra.join(', ')}; ` : ''}${order ? 'інший порядок; ' : ''}є: ${fmtList(got)}`, msg: kind === 'menu' ? 'меню шапки ≠ еталонному списку пунктів (склад/порядок)' : 'меню футера ≠ еталонному списку пунктів (склад/порядок)' });
    };
    cmp('menu', d.menu);
    // перемикач мови (docs/i18n.md): кнопка зліва від «Кошика», aria-haspopup/aria-expanded, у списку uk і en
    const L = d.lang;
    // < 1200 (адаптив, docs/responsive.md §3): кнопки мови в пілюлі немає, натомість ПЕРШИМ у меню — «Українська» | «English» (uk,en), активна — aria-current, ≥ 44 px; ≥ 1200 цих пунктів у видимому меню немає
    const ML = L?.menuLang;
    if (d.mq < 1200 && ML) {
      if (ML.pillShown) out.push({ page: c.label, selector: '.site-header__lang-btn', value: 'видима', msg: 'на < 1200 кнопка мови має бути прихована (мова — у меню)' });
      if (ML.firstTwo !== 'uk,en' || ML.n !== 2) out.push({ page: c.label, selector: '.site-header__menu-lang', value: `перші пункти меню: ${ML.firstTwo || '(немає)'}, видимих мовних ${ML.n}`, msg: 'на < 1200 мова має бути ПЕРШИМ пунктом меню (uk,en)' });
      if (ML.cur !== (String(c.label).startsWith('en/') ? 'en' : 'uk')) out.push({ page: c.label, selector: '.site-header__menu-lang', value: `aria-current: ${ML.cur || '(немає)'}`, msg: 'активна мова в меню не позначена aria-current' });
      if (ML.minH < 43.5) out.push({ page: c.label, selector: '.site-header__menu-lang', value: `${ML.minH.toFixed(1)}px`, msg: 'пункти мови в меню < 44px' });
    } else if (ML && ML.n > 0 && d.mq >= 1200) out.push({ page: c.label, selector: '.site-header__menu-lang', value: `видимих мовних пунктів у меню ${ML.n}`, msg: 'на ≥ 1200 мова лише кнопкою в пілюлі (пунктів меню не дублюємо)' });
    if (d.mq < 1200) { /* кнопки мови немає: перевірки пілюлі нижче не застосовні */ }
    else if (!L?.has) out.push({ page: c.label, selector: '.site-header__lang-btn', value: 'немає', msg: 'у шапці немає перемикача мови' });
    else {
      if (!(L.right <= L.cartLeft + tol)) out.push({ page: c.label, selector: '.site-header__lang-btn', value: `правий край ${L.right?.toFixed(1)} > лівий край «Кошика» ${L.cartLeft?.toFixed(1)}`, msg: 'перемикач мови має стояти зліва від «Кошика»' });
      if (L.langs.join() !== 'uk,en' || L.haspopup !== 'true' || L.expanded !== 'false') out.push({ page: c.label, selector: '.site-header__lang-btn', value: `мови ${L.langs.join()}, haspopup=${L.haspopup}, expanded=${L.expanded}`, msg: 'перемикач мови: очікується список uk,en, aria-haspopup="true", aria-expanded="false"' });
    }
    if (!d.hasFooter) out.push({ page: c.label, selector: '.site-footer', value: 'немає', msg: 'на сторінці немає футера (partials/footer.html)' }); else cmp('footer', d.footer);
  }
  return out;
}
