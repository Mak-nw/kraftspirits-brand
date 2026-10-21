// Динамічні перевірки check-ds (D1–D19; D12 — сітка колонок — входить у загальний прогін (design-system.html виключено); npm run qa:grid = лише D12): у браузері, по обчислених стилях. Один прохід по сторінці збирає дані, далі аналіз у Node.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { COLLECT_GRID, GRID_DEFAULTS, analyzeGrid, describe as describeGrid } from './grid-d12.mjs';
import { COLLECT_D13, analyzeD13, roleClassesFromBase, fmtSig } from './typo-d13.mjs';
import { COLLECT_D15, analyzeD15 } from './header-menu.mjs';
import { D17_DEFAULTS, probeD17, analyzeD17, controlD17, controlD17Panel } from './heading-d17.mjs';
import { D16_DEFAULTS, probeD16, analyzeD16, controlD16 } from './hug-d16.mjs';
import { COLLECT_D18, analyzeD18, controlD18, d18Mode, D18_DEFAULTS } from './grid-d18.mjs';
import { COLLECT_D19, D19_DEFAULTS } from './hero-d19.mjs';
import { loadLpPage } from '../lp-pages.mjs';
import { measureTextOnImage, measureTextOnImageParallax, D14_PAGES, D14_STATES, D14_DEFAULTS, D14_PARALLAX } from './text-on-image.mjs';
import { ROOT, textPixelContrast, launch, openPage, pageUrl, pageSpec, matrix, hscroll, hscrollBad, tabWalk, u, waitStable, waitLayoutStable, collectStable, evalRetry, sleep, uniq } from './lib.mjs';

/** Усе, що потрібно D1/D2/D7/D8/D9 за ОДИН page.evaluate (швидко, без шуму в консолі) */
function COLLECT(cfg) {
  const nameOf = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '');
  const isState = (c) => /^(is-|js-|has-|age-ok|in-view|reveal|is_)/.test(c);
  const clsOf = (el) => (typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : []);
  const vis = (el) => el.checkVisibility?.({ checkOpacity: false, checkVisibilityCSS: true }) !== false && el.getBoundingClientRect().width > 0;
  const inTemplate = (el) => !!el.closest('template');
  const all = [...document.body.querySelectorAll('*')].filter((el) => !inTemplate(el) && !el.closest('[id^="__"]'));
  const uVal = Math.min(Math.max(parseFloat(document.documentElement.style.getPropertyValue('--vw')) || document.documentElement.getBoundingClientRect().width, 1185), 1920) / 1920;
  const out = { u: uVal, roles: [], comps: [], headings: [], a11y: [], text: [], align: [] };

  // ---- D1: ролі .t-*
  for (const el of all) {
    const roles = clsOf(el).filter((c) => /^t-[a-z0-9-]+$/.test(c));
    if (!roles.length || !vis(el)) continue;
    const cs = getComputedStyle(el);
    const chain = []; for (let p = el.parentElement, d = 0; p && p !== document.body && d < 1; p = p.parentElement, d++) chain.push(clsOf(p).filter((c) => !isState(c) && !/^t-/.test(c)).join('.') || p.tagName.toLowerCase());
    const own = clsOf(el).filter((c) => !isState(c) && !/^t-/.test(c)).join('.');
    for (const r of roles) out.roles.push({ role: r, ctx: `${own || el.tagName.toLowerCase()} < ${chain.join(' < ')}`, el: nameOf(el), family: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), size: parseFloat(cs.fontSize), lh: cs.lineHeight === 'normal' ? 'normal' : parseFloat(cs.lineHeight), weight: cs.fontWeight, ls: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing), tt: cs.textTransform });
  }

  // ---- D2: висоти компонентів
  for (const sel of cfg.compSelectors) {
    for (const el of document.body.querySelectorAll(sel)) {
      if (inTemplate(el) || !vis(el) || el.closest('.state-matrix')) continue; // демо-матриця станів має власні розміри
      const base = sel.replace(/^\./, '');
      const mods = clsOf(el).filter((c) => c.startsWith(`${base}--`)).sort().join(' ');
      out.comps.push({ sel, mods, el: nameOf(el), h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width });
    }
  }


  // ---- D11: центрування контролів з підписом: (а) бокс чекбокса/радіо vs ОПТИЧНИЙ центр ПЕРШОГО рядка підпису, (б) іконка vs текст у .btn__inner / .nav-cell.
  // «Центр тексту» = НЕ арифметика line-height, а реальний текст: Range.getClientRects() першого символу (content-area шрифту: top = базова лінія − округлений ascent)
  // + метрики шрифту з canvas (fontBoundingBoxAscent/Descent, actualBoundingBoxAscent літери «H» = cap-height) → базова лінія й центр великих літер: capC = baseline − cap/2.
  // rangeC (центр content-area) лишається для порівняння/діагностики. Піксельний ink-замір (еталон, dpr 3–4) — tools/qa/ink-align.mjs.
  {
    const cv = document.createElement('canvas').getContext('2d');
    const firstGlyph = (root, skip) => { // перший непорожній текстовий вузол → Range на першому символі
      const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (!n.textContent.trim() || (skip && skip.contains(n))) continue;
        const i = n.textContent.search(/\S/); const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1);
        const r = [...rg.getClientRects()].find((q) => q.width > 0); if (!r) continue;
        return { n, r, ch: n.textContent[i], el: n.parentElement };
      }
      return null;
    };
    // центр великих літер першого рядка: baseline = r.top + round(ascent) (Chrome округлює ascent/descent; перевіряємо, що r.height = round(a)+round(d))
    const capCenter = (g) => {
      const cs = getComputedStyle(g.el); const px = parseFloat(cs.fontSize);
      cv.font = `${cs.fontStyle} ${cs.fontWeight} ${px}px ${cs.fontFamily}`; cv.letterSpacing = '0px';
      const m = cv.measureText('H'); const asc = Math.round(m.fontBoundingBoxAscent), desc = Math.round(m.fontBoundingBoxDescent);
      const ok = Math.abs(g.r.height - (asc + desc)) < 0.75; // content-area збігся з метриками — інакше (fallback-шрифт) рахуємо частку ascent
      const baseline = g.r.top + (ok ? asc : g.r.height * (m.fontBoundingBoxAscent / (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)));
      return { capC: baseline - m.actualBoundingBoxAscent / 2, rangeC: g.r.top + g.r.height / 2, cap: m.actualBoundingBoxAscent, baseline, metricsOk: ok };
    };
    const seenLab = new Set();
    for (const inp of document.body.querySelectorAll('input[type="checkbox"], input[type="radio"]')) {
      const wrap = inp.closest('label') || (inp.id && document.querySelector(`label[for="${CSS.escape(inp.id)}"]`)); if (!wrap || inTemplate(wrap) || !vis(wrap) || seenLab.has(wrap)) continue; seenLab.add(wrap);
      const box = wrap.querySelector('.check__box, [class*="__box"], [class*="__mark"]') || (getComputedStyle(inp).opacity !== '0' ? inp : null);
      const lab = wrap.querySelector('.check__label, [class*="__label"]') || [...wrap.children].find((c) => c !== box && c !== inp && (c.textContent || '').trim());
      if (!box || !lab || !vis(box) || !vis(lab)) continue;
      const g = firstGlyph(lab); if (!g) continue;
      const br = box.getBoundingClientRect(); const cc = capCenter(g); const lh = parseFloat(getComputedStyle(lab).lineHeight) || g.r.height;
      out.align.push({ kind: 'check', el: nameOf(wrap), boxC: br.top + br.height / 2, textC: cc.capC, rangeC: cc.rangeC, lines: Math.max(1, Math.round((lab.getBoundingClientRect().height - parseFloat(getComputedStyle(lab).paddingTop) - parseFloat(getComputedStyle(lab).paddingBottom)) / lh)), boxH: br.height, text: (lab.textContent || '').trim().slice(0, 30), metricsOk: cc.metricsOk });
    }
    for (const el of document.body.querySelectorAll('.btn__inner, .nav-cell')) {
      if (inTemplate(el) || !vis(el) || el.closest('.state-matrix')) continue;
      const icon = [...el.querySelectorAll('.icon, .btn__arrow, svg, img')].find((i) => vis(i));
      if (!icon) continue; const topIcon = icon.closest('.btn__arrow') || icon;
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let top = Infinity, bot = -Infinity, txt = '';
      for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (!n.textContent.trim() || topIcon.contains(n)) continue; const rg = document.createRange(); rg.selectNodeContents(n); const rs = [...rg.getClientRects()].filter((q) => q.width > 0); if (!rs.length) continue; const f = rs[0]; top = Math.min(top, f.top); bot = Math.max(bot, f.bottom); txt += n.textContent.trim(); }
      if (!isFinite(top)) continue;
      const ir = topIcon.getBoundingClientRect(); if (ir.width < 1) continue;
      const g = firstGlyph(el, topIcon); const cc = g ? capCenter(g) : null;
      out.align.push({ kind: 'icon', el: nameOf(el), boxC: ir.top + ir.height / 2, textC: (top + bot) / 2, capC: cc?.capC ?? null, lines: 1, boxH: ir.height, text: txt.slice(0, 30) });
    }
  }

  // ---- D7: заголовки у порядку DOM
  for (const el of document.body.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')) {
    if (inTemplate(el) || !el.checkVisibility?.({ checkVisibilityCSS: true })) continue;
    const lvl = /^H\d$/.test(el.tagName) ? +el.tagName[1] : +el.getAttribute('aria-level') || 2;
    out.headings.push({ level: lvl, el: nameOf(el), text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40), inGate: !!el.closest('[data-age-gate]'), labelsGate: !!el.id && (el.closest('[data-age-gate]')?.getAttribute('aria-labelledby') || '').split(/\s+/).includes(el.id) });
  }

  // ---- D9: alt / aria-label
  const accName = (el) => {
    const al = el.getAttribute('aria-label'); if (al && al.trim()) return al.trim();
    const lb = el.getAttribute('aria-labelledby'); if (lb) { const t = lb.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim(); if (t) return t; }
    const t = (el.textContent || '').trim(); if (t) return t;
    const im = el.querySelector('img[alt]:not([alt=""])'); if (im) return im.alt;
    const ti = el.getAttribute('title'); if (ti && ti.trim()) return ti.trim();
    const svt = el.querySelector('svg title'); if (svt && svt.textContent.trim()) return svt.textContent.trim();
    return '';
  };
  for (const el of document.body.querySelectorAll('img')) {
    if (inTemplate(el)) continue;
    if (!el.hasAttribute('alt')) out.a11y.push({ kind: 'img без alt', el: nameOf(el), src: (el.getAttribute('src') || '').slice(-50) });
  }
  for (const el of document.body.querySelectorAll('a[href], button, [role="button"], [role="link"], summary')) {
    if (inTemplate(el) || !el.checkVisibility?.({ checkVisibilityCSS: true })) continue;
    if (el.closest('[aria-hidden="true"], [inert]')) continue;
    if (!accName(el)) out.a11y.push({ kind: 'кнопка/посилання без доступного імені', el: nameOf(el), href: el.getAttribute('href') || '' });
  }
  for (const el of document.body.querySelectorAll('svg[role="img"]')) { if (!inTemplate(el) && !accName(el)) out.a11y.push({ kind: 'svg[role=img] без імені', el: nameOf(el) }); }
  for (const el of document.body.querySelectorAll('input:not([type=hidden]), select, textarea')) {
    if (inTemplate(el) || !el.checkVisibility?.({ checkVisibilityCSS: true })) continue;
    const id = el.id; const hasLabel = (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || el.closest('label') || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title');
    if (!hasLabel) out.a11y.push({ kind: 'поле без label', el: nameOf(el) });
  }

  // ---- D8: контраст тексту ролей .t-*
  const norm = (c) => { const cv = document.createElement('canvas'); cv.width = cv.height = 1; const x = cv.getContext('2d', { willReadFrequently: true }); x.clearRect(0, 0, 1, 1); x.fillStyle = '#000'; x.fillStyle = c; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = (c) => { const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
  const bgOf = (start) => {
    const layers = [];
    for (let n = start; n && n.nodeType === 1; n = n.parentElement) {
      const c = getComputedStyle(n); const col = norm(c.backgroundColor);
      if (c.backgroundImage !== 'none') layers.push({ img: true });
      if (col[3] > 0) { layers.push({ col }); if (col[3] >= 0.999) break; }
    }
    let base = [255, 255, 255], unknown = false;
    for (const l of layers.reverse()) { if (l.img) { unknown = true; continue; } const a = l.col[3]; base = base.map((v, i) => l.col[i] * a + v * (1 - a)); }
    return { rgb: base, unknown };
  };
  const seenText = new Set();
  for (const el of all) {
    const roles = clsOf(el).filter((c) => /^t-[a-z0-9-]+$/.test(c));
    if (!roles.length || !vis(el)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    if (el.closest('[aria-hidden="true"]') && !el.closest('[data-age-gate]')) continue;
    const cs = getComputedStyle(el);
    let op = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity);
    if (el.closest(':disabled, [aria-disabled="true"], [disabled]')) continue; // WCAG: неактивні елементи не нормуються
    const fg = norm(cs.color), bg = bgOf(el);
    const a = fg[3] * op; const eff = fg.slice(0, 3).map((v, i) => v * a + bg.rgb[i] * (1 - a));
    const L1 = lum(eff), L2 = lum(bg.rgb); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const key = `${roles.join(' ')}|${[...fg].join(',')}|${bg.rgb.map(Math.round)}|${op}`;
    if (seenText.has(key)) continue; seenText.add(key);
    const idx = out.text.length; const minC = large ? cfg.largeMin : cfg.textMin;
    if (ratio < minC) el.setAttribute('data-qa-t', String(idx)); // позначка для піксельної перевірки (знімається після)
    out.text.push({ idx, roles: roles.join(' '), el: nameOf(el), ratio: +ratio.toFixed(2), large, size: +size.toFixed(1), opacity: +op.toFixed(2), bgUnknown: bg.unknown, inGate: !!el.closest('[data-age-gate]'), sample: (el.textContent || '').trim().slice(0, 24) });
  }
  return out;
}

/** D5: підкреслення в default/hover/focus-visible (CDP forcePseudoState) */
async function underlineProbe(page, allowClosest) {
  const cdp = await page.createCDPSession();
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const probe = (closestList) => page.evaluate((list) => {
    const out = []; const nameOf = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '');
    const els = [...document.body.querySelectorAll('*')].filter((e) => !e.closest('template'));
    for (const el of els) {
      const cs = getComputedStyle(el);
      const line = cs.textDecorationLine;
      let u = false;
      if (line.includes('underline') && parseFloat(cs.textDecorationThickness || '1') !== 0) {
        const m = cs.textDecorationColor.match(/rgba?\(([^)]+)\)/); const alpha = m ? (m[1].split(/[,/ ]+/)[3] === undefined ? 1 : parseFloat(m[1].split(/[,/ ]+/)[3])) : 1;
        u = alpha > 0;
      }
      out.push(u ? { n: nameOf(el), allowed: list.some((s) => el.closest(s)), visible: el.checkVisibility?.() !== false, text: (el.textContent || '').trim().slice(0, 24) } : 0);
    }
    return out;
  }, closestList);
  const base = await probe(allowClosest);
  const found = [];
  base.forEach((b, i) => { if (b && b.visible && !b.allowed) found.push({ state: 'default', ...b }); });
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const q = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'a, button, [role="button"], [tabindex], summary, label, input, select, textarea, .hit-area' });
  for (const state of ['hover', 'focus-visible']) {
    for (const nodeId of q.nodeIds) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [state] }).catch(() => {});
    await sleep(200);
    const st = await probe(allowClosest);
    st.forEach((s, i) => { if (s && s.visible && !s.allowed && !base[i]) found.push({ state, ...s }); });
    for (const nodeId of q.nodeIds) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] }).catch(() => {});
  }
  await cdp.detach().catch(() => {});
  return found;
}

/**
 * Виконує D1–D10. opts: { url, widths, scrollbar[], chrome, out, pagesList, rules, allow, tabAll }
 */
/** підписи замірів геометрії для collectStable (збіг двох замірів підряд = стабільний макет) */
const sigGrid = (d) => `${d.clientW}|${d.vw}|${d.blocks.map((b) => `${b.L.toFixed(1)},${b.R.toFixed(1)},${b.T.toFixed(0)},${b.B.toFixed(0)}`).join(';')}`;
const sigD18 = (d) => `${d.clientW}|${d.vw}|${d.blocks.map((b) => `${b.L.toFixed(1)},${b.R.toFixed(1)},${b.T.toFixed(0)},${b.H.toFixed(0)}`).join(';')}`;

export async function runDynamic(opts, allow, rep) {
  const want = (r) => !opts.rules || opts.rules.has(r);
  const A = allow.dynamic || {};
  const addV = (v) => rep.add(v);
  const collect = []; // { page, width, sb, data }
  const want12 = !opts.rules || opts.rules.has('D12') || !!opts.grid; // D12 входить у загальний прогін; design-system.html (демо-сторінка з власною розкладкою) із D12 виключено: --d12-ds вмикає
  const gcfg = { ...GRID_DEFAULTS, ...(allow.grid || {}), profiles: { ...GRID_DEFAULTS.profiles, ...(allow.grid?.profiles || {}) }, pageProfile: { ...GRID_DEFAULTS.pageProfile, ...(allow.grid?.pageProfile || {}) } };
  if (opts.gridDeep) gcfg.deep = true;
  const grid12 = []; // { label, spec, width, sb, gate, data }
  const want13 = want('D13'); const d13 = []; const d13cfg = { roles: want13 ? roleClassesFromBase() : [], root: null };
  const want16 = want('D16'); const d16 = []; const d16cfg = { ...D16_DEFAULTS, ...(A.d16 || {}), targets: A.d16?.targets || D16_DEFAULTS.targets }; let d16ctl = null; let d16ctlFb = null; // D16 (контроль: на index; якщо index немає в списку сторінок — на першій сторінці, інакше виводилось «null»): hug/padding кнопок (hug-d16.mjs)
  const want17 = want('D17'); const d17 = []; let d17ctl = null; let d17ctlPanel = null; const d17cfg = { ...D17_DEFAULTS, ...(A.d17 || {}) }; // D17: заголовки display = 4 колонки (heading-d17.mjs)
  const want15 = want('D15'); const d15 = []; const want14 = want('D14'); const d14 = []; let d14parCtl = null; /* D14 профіль parallax=on: позитивний контроль */ // D14: піксельний контраст тексту на зображенні (профіль сторінок — text-on-image.mjs); D15: шапка/меню
  const want18 = want('D18'); const d18 = []; const d18cfg = { ...D18_DEFAULTS, ...(A.d18 || {}) }; const d18ctl = []; // D18: гориз. зазор великих блоків 40u (5u лише product), малих 40u (grid-d18.mjs)
  const want19 = want('D19'); const d19 = []; const d19cfg = { ...D19_DEFAULTS, ...(A.d19 || {}) }; const wantHeroCtx = want19 || want('D14') || want('D8'); // D19: hero без оверлея (hero-d19.mjs); стан hero потрібен і для умовних винятків D14/D8 (allow.requires)
  rep.ctx = rep.ctx || { hero: {} };
  const specs = opts.pagesList.map(pageSpec);
  if (want14 && !opts.pages && opts.rules && opts.rules.size === 1) for (const x of D14_STATES) if (!specs.some((sp) => sp.label === x)) specs.push(pageSpec(x)); // qa:img-contrast: + демо-стани cart/checkout/account
  const combos = matrix(opts, { dprs: [opts.dpr[0]] });
  const cfg = { compSelectors: ['.btn', '.chip', '.nav-cell', '.select', '.product-card--catalog'], textMin: A.textMinContrast ?? 4.5, largeMin: A.largeTextMinContrast ?? 3 };
  const stats = (rep.stats.dynamic = { pages: specs.length, combos: combos.length, tabStops: 0 });

  for (const combo of combos) {
    const L = await launch({ scrollbar: combo.scrollbar, chrome: opts.chrome, out: opts.out });
    try {
      for (const spec of specs) {
        const label = `${spec.label}@${combo.width}${combo.scrollbar === 'classic' ? '' : '/' + combo.scrollbar}`;
        const url = pageUrl(opts.url, spec, 'static');
        const page = await openPage(L.browser, url, { width: combo.width, height: opts.height, dpr: combo.dpr, cache: true, settle: false });
        const waitSel = spec.name === 'catalog' ? '.product-card--catalog' : spec.name === 'product' ? '.product-volume, .product__title, h1' : null;
        await waitStable(page, { selector: waitSel });
        await sleep(300);
        // D4: консоль/мережа
        if (want('D4')) {
          const c = page.__qa;
          for (const e of c.pageerrors) addV({ rule: 'D4', page: label, selector: 'pageerror', value: e.slice(0, 120), msg: 'виняток JS' });
          for (const e of c.console) addV({ rule: 'D4', page: label, selector: `console.${e.type}`, value: e.text.slice(0, 120), msg: e.loc.replace(opts.url, '') });
          for (const e of c.http) addV({ rule: 'D4', page: label, selector: `HTTP ${e.status}`, value: e.url.replace(opts.url, '/'), msg: 'відповідь ≥400' });
          for (const e of c.failed) addV({ rule: 'D4', page: label, selector: 'requestfailed', value: e.url.replace(opts.url, '/'), msg: e.error });
          if (page.__status >= 400 && spec.name !== '404') addV({ rule: 'D4', page: label, selector: `HTTP ${page.__status}`, value: url.replace(opts.url, '/'), msg: 'статус сторінки' });
        }
        // D3: hscroll
        if (want('D3')) {
          const h = await hscroll(page, A.hscrollTolerancePx ?? 1);
          if (hscrollBad(h)) addV({ rule: 'D3', page: label, selector: h.offenders[0]?.el || 'html', value: `scrollWidth ${h.scrollWidth} / client ${h.clientWidth}; поза в'юпортом: ${h.offenders.slice(0, 3).map((o) => `${o.el} (+${o.over}px)`).join(', ') || '—'}`, msg: 'горизонтальний скрол/зріз' });
        }
        // збір D1/D2/D7/D8/D9
        const data = await page.evaluate(COLLECT, cfg);
        if (want16) { d16.push({ label, data: await probeD16(page, d16cfg) }); if (d16ctl === null && spec.name === 'index') d16ctl = await controlD16(page, d16cfg, A.d16 || {}); else if (d16ctlFb === null) d16ctlFb = await controlD16(page, d16cfg, A.d16 || {}); }
        if (want17) { const hs = await probeD17(page, d17cfg); d17.push({ label, data: hs }); if (d17ctl === null && hs.some((h) => h.cls === 'center')) d17ctl = await controlD17(page, d17cfg);  if (d17ctlPanel === null) d17ctlPanel = await controlD17Panel(page, d17cfg); }
        if (want15 && (spec.name !== 'design-system' || opts.d15Ds)) d15.push({ label, spec, width: combo.width, data: await page.evaluate(COLLECT_D15) });
        if (want13 && (spec.name !== 'design-system' || opts.d13Ds)) d13.push({ label, spec, width: combo.width, sb: combo.scrollbar, gate: false, data: await page.evaluate(COLLECT_D13, d13cfg) });
        // D8: ланцюжок фонів не бачить фонів із псевдоелементів/картинок → для «підозрілих» міряємо піксельно (мода кольору = фон, найдальший = текст)
        for (const t of data.text) {
          if (t.ratio >= (t.large ? cfg.largeMin : cfg.textMin)) continue;
          const h = await page.$(`[data-qa-t="${t.idx}"]`);
          if (h) { t.pxRatio = await textPixelContrast(page, h); }
        }
        await page.evaluate(() => document.querySelectorAll('[data-qa-t]').forEach((e) => e.removeAttribute('data-qa-t')));
        collect.push({ label, spec, width: combo.width, sb: combo.scrollbar, data });
        if (want12 && (spec.name !== 'design-system' || opts.d12Ds)) grid12.push({ label, spec, width: combo.width, sb: combo.scrollbar, gate: false, data: await collectStable(page, COLLECT_GRID, { ...gcfg, root: null }, sigGrid) });
        if (want18) d18.push({ label, spec, width: combo.width, data: await collectStable(page, COLLECT_D18, spec.name === 'design-system' ? { ...d18cfg, root: '.brands' } : d18cfg, sigD18) }); // design-system: лише демо brands (корінь .ds-brands-demo) — 40u по колонках
        if (wantHeroCtx && spec.name !== 'design-system') d19.push({ label, spec, data: await evalRetry(page, COLLECT_D19, d19cfg) });
        // D5: підкреслення (лише для першої комбінації ширини/смуги — це не залежить від ширини)
        if (want('D5') && combo === combos[0]) {
          const found = await underlineProbe(page, A.underlineAllowClosest || []);
          const seen = new Set();
          for (const f of found) { const k = `${f.n}|${f.state}`; if (seen.has(k)) continue; seen.add(k); addV({ rule: 'D5', page: label, selector: f.n, value: `text-decoration: underline (${f.state})`, msg: `підкреслення поза футером/юридичним текстом воріт «${f.text}»` }); }
        }
        // D6: Tab-walker (за замовчуванням лише перша комбінація; --tab-all — усі)
        if (want('D6') && (combo === combos[0] || opts.tabAll)) {
          const stops = await tabWalk(page);
          stats.tabStops += stops.length;
          for (const s of stops) {
            if (!s.visible || s.insideAgeGate) continue;
            if (!s.focusVisible) { addV({ rule: 'D6', page: label, selector: s.path, value: ':focus-visible не встановився після Tab', msg: 'фокус з клавіатури без :focus-visible' }); continue; }
            if (!s.ring) { addV({ rule: 'D6', page: label, selector: s.path, value: 'кільця немає (outline/box-shadow/::after)', msg: 'немає focus-ring' }); continue; }
            const minR = A.ringMinContrast ?? 3;
            if (s.ratio !== null && s.ratio < minR && s.pxRatio != null && s.pxRatio >= minR) continue; // за пікселями кільце контрастне; ланцюжок фонів помилявся
            if (s.ratio !== null && s.ratio < minR) {
              if (s.pxRatio != null) addV({ rule: 'D6', page: label, selector: s.path, value: `${s.pxRatio}:1 за пікселями (кільце ${s.ring.color}, ${s.ring.width}px ${s.ring.where})`, msg: `контраст кільця < ${minR}:1` });
              else if (s.bgUnknown) rep.info({ rule: 'D6', msg: `${label} ${s.path}: контраст кільця ${s.ratio}:1 на фоні-картинці — перевірити візуально` });
              else addV({ rule: 'D6', page: label, selector: s.path, value: `${s.ratio}:1 (кільце ${s.ring.color}, ${s.ring.width}px ${s.ring.where})`, msg: `контраст кільця < ${A.ringMinContrast ?? 3}:1` });
            }
          }
          if (stops.length < 3) rep.note(`D6 ${label}: лише ${stops.length} Tab-стопів`);
        }
        // D12 для воріт 18+: окремо, лише коріння [data-age-gate] (ворота однакові на всіх сторінках → лише перша сторінка)
        if (want12 && spec === specs[0]) {
          const gp12 = await openPage(L.browser, pageUrl(opts.url, spec, 'gate'), { width: combo.width, height: opts.height, dpr: 1, settle: false });
          await waitStable(gp12);
          grid12.push({ label: `ворота18+@${combo.width}`, spec: { name: 'age-gate', label: 'ворота 18+' }, width: combo.width, sb: combo.scrollbar, gate: true, data: await collectStable(gp12, COLLECT_GRID, { ...gcfg, root: '[data-age-gate]' }, sigGrid) });
          await gp12.close().catch(() => {});
        }
        // D10: age-gate smoke (лише перша комбінація)
        if ((want('D10') && combo === combos[0]) || want('D11') || (want13 && spec === specs[0])) { // ворота: D10 — лише перша комбінація; D11 (чекбокс «запам'ятати») — на кожній ширині
          const gp = await openPage(L.browser, pageUrl(opts.url, spec, 'gate'), { width: combo.width, height: opts.height, dpr: 1, settle: false });
          await waitStable(gp);
          if (want('D11')) { const gd = await gp.evaluate(COLLECT, cfg); collect.push({ label: `${label}/ворота`, spec, width: combo.width, sb: combo.scrollbar, data: { ...gd, roles: [], comps: [], headings: gd.headings, a11y: [], text: [] } }); }
          if (want13 && spec === specs[0]) d13.push({ label: `ворота18+@${combo.width}`, spec: { name: 'age-gate', label: 'ворота 18+' }, width: combo.width, sb: combo.scrollbar, gate: true, data: await gp.evaluate(COLLECT_D13, { ...d13cfg, root: '[data-age-gate]' }) });
          const g = !(want('D10') && combo === combos[0]) ? null : await gp.evaluate(() => { const el = document.querySelector('[data-age-gate]'); if (!el) return { exists: false }; const cs = getComputedStyle(el); return { exists: true, visible: el.checkVisibility?.({ checkVisibilityCSS: true, checkOpacity: true }) !== false && cs.display !== 'none', ageOk: document.documentElement.classList.contains('age-ok'), role: el.getAttribute('role'), modal: el.getAttribute('aria-modal') }; });
          if (g) if (spec.name !== '404' || g.exists) { if (!g.exists) addV({ rule: 'D10', page: label, selector: '[data-age-gate]', value: 'немає', msg: 'вікові ворота відсутні в DOM' }); else if (!g.visible || g.ageOk) addV({ rule: 'D10', page: label, selector: '[data-age-gate]', value: JSON.stringify(g), msg: 'ворота не показуються без ?age=ok' }); }
          else addV({ rule: 'D10', page: label, selector: '[data-age-gate]', value: 'немає', msg: 'вікові ворота відсутні в DOM (404)' });
          await gp.close().catch(() => {});
        }
        // D14: піксельний контраст по літерах для тексту на зображенні (лише сторінки з hero/секціями на фото; наприкінці — змінює прокрутку)
        if (want14 && (opts.d14All || (A.d14Pages || D14_PAGES).includes(spec.name))) {
          let m = null;
          for (let attempt = 0; attempt < 3 && !m; attempt++) { // dev-сервер може перезавантажити сторінку (HMR від чужих правок) — тоді міряємо заново
            try { m = await measureTextOnImage(page, { ...D14_DEFAULTS, textMin: cfg.textMin, largeMin: cfg.largeMin }); } catch (e) { if (attempt === 2) throw e; rep.note(`D14 ${label}: ${String(e.message).slice(0, 80)} — повтор ${attempt + 1}`); await waitStable(page); await sleep(500); }
          }
          d14.push({ label, spec, width: combo.width, ...m });
          // профіль parallax=on: паралакс фото живий, текст секції міряється у 3 позиціях прокрутки (статичний профіль parallax=off цього не бачить)
          for (const pp of D14_PARALLAX.filter((x) => x.page === spec.name)) {
            const pg = await openPage(L.browser, `${opts.url}${spec.path}?age=ok&reveal=off`, { width: combo.width, height: opts.height, dpr: combo.dpr, cache: true, settle: false });
            await waitStable(pg); await sleep(300);
            const mp = await measureTextOnImageParallax(pg, pp.sel, { ...D14_DEFAULTS, textMin: cfg.textMin, largeMin: cfg.largeMin });
            d14.push({ label: `${label}/parallax`, spec, width: combo.width, ...mp });
            await pg.close().catch(() => {});
          }
        }
        await page.close().catch(() => {});
      }
      // D18: демо-стани, яких немає серед *.html (cart/checkout з товарами, форма входу/кабінет), + позитивний контроль (зазор 40u замість 5u МАЄ дати порушення)
      if (want18) {
        const label0 = (n) => `${n}@${combo.width}${combo.scrollbar === 'classic' ? '' : '/' + combo.scrollbar}`;
        for (const st of (opts.pages ? [] : (d18cfg.states || []))) {
          if (specs.some((sp) => sp.spec === st)) continue;
          const sp = pageSpec(st); const pg = await openPage(L.browser, pageUrl(opts.url, sp, 'static'), { width: combo.width, height: opts.height, dpr: combo.dpr, cache: true, settle: false });
          await waitStable(pg); await sleep(300);
          d18.push({ label: label0(st), spec: sp, width: combo.width, data: await collectStable(pg, COLLECT_D18, d18cfg, sigD18) });
          await pg.close().catch(() => {});
        }
        // позитивні контролі: product і cocktails (режим 5u: зазор 40u МАЄ дати порушення) і about (режим 40u: зазор 5u МАЄ дати порушення)
        for (const nm of ['product?id=gin-yasnyi', 'cocktails', 'cart?demo=1', 'about']) {
          const sp0 = pageSpec(nm); const mode = d18Mode(sp0.name, d18cfg);
          const cp = await openPage(L.browser, pageUrl(opts.url, sp0, 'static'), { width: combo.width, height: opts.height, dpr: combo.dpr, cache: true, settle: false });
          await waitStable(cp); await sleep(300); await waitLayoutStable(cp);
          d18ctl.push({ label: label0(nm.split('?')[0]), ...(await controlD18(cp, d18cfg, mode)) });
          await cp.close().catch(() => {});
        }
      }
    } finally { await L.close(); }
  }

  /* ---- аналіз зібраного ---- */
  const tolRole = A.roleTolerancePx ?? 0.5, tolH = A.heightTolerancePx ?? 0.5;
  // D1: група (ширина, роль, ctx) → кластери сигнатур
  if (want('D1')) {
    const groups = new Map();
    for (const c of collect) for (const r of c.data.roles) { if (c.spec.name === 'design-system' && !opts.d1Ds) continue; /* демо-сторінка навмисно показує варіанти/розміри */ const k = `${c.width}/${c.sb}|${r.role}|${r.ctx}`; (groups.get(k) || groups.set(k, []).get(k)).push({ ...r, page: c.spec.label }); }
    const same = (a, b) => a.family === b.family && String(a.weight) === String(b.weight) && Math.abs(a.size - b.size) <= tolRole && (a.lh === b.lh || (typeof a.lh === 'number' && typeof b.lh === 'number' && Math.abs(a.lh - b.lh) <= tolRole)) && Math.abs(a.ls - b.ls) <= tolRole;
    for (const [k, arr] of groups) {
      const clusters = [];
      for (const r of arr) { const c = clusters.find((cl) => same(cl.rep, r)); if (c) c.pages.add(r.page); else clusters.push({ rep: r, pages: new Set([r.page]) }); }
      const pagesOf = new Set(arr.map((r) => r.page));
      if (clusters.length > 1 && pagesOf.size > 1) {
        const [wk, role, ctx] = k.split('|');
        addV({ rule: 'D1', page: `${[...pagesOf].slice(0, 4).join(', ')}@${wk}`, selector: `.${role} (${ctx.split(' < ')[0]})`, value: clusters.map((c) => `${c.rep.family} ${c.rep.size}/${c.rep.lh} w${c.rep.weight} ls${c.rep.ls} [${[...c.pages].join(',')}]`).join('  ≠  '), msg: 'роль має різні значення на різних сторінках' });
      }
    }
    rep.stats.dynamic.roleSamples = collect.reduce((n, c) => n + c.data.roles.length, 0);
  }
  // D2: висоти компонентів
  if (want('D2')) {
    const groups = new Map();
    for (const c of collect) for (const r of c.data.comps) { const k = `${c.width}/${c.sb}|${r.sel}|${r.mods}`; (groups.get(k) || groups.set(k, []).get(k)).push({ ...r, page: c.spec.label }); }
    for (const [k, arr] of groups) {
      const hs = arr.map((r) => r.h); const min = Math.min(...hs), max = Math.max(...hs);
      if (max - min > tolH) {
        const [wk, sel, mods] = k.split('|');
        const lo = arr.find((r) => r.h === min), hi = arr.find((r) => r.h === max);
        addV({ rule: 'D2', page: `${lo.page} / ${hi.page}@${wk}`, selector: `${sel}${mods ? '.' + mods.split(' ').join('.') : ''}`, value: `${min.toFixed(2)}px (${lo.el}) ≠ ${max.toFixed(2)}px (${hi.el})`, msg: 'висота однакових компонентів розходиться' });
      }
    }
  }
  // D7: заголовки
  if (want('D7')) {
    for (const c of collect) {
      if (/\/ворота$/.test(c.label)) { // ворота 18+ (діалог поверх inert-сторінки): рівно один видимий заголовок, на який посилається aria-labelledby діалогу
        const gh = c.data.headings.filter((h) => h.inGate);
        if (gh.length !== 1 || !gh[0].labelsGate || !gh[0].text) addV({ rule: 'D7', page: c.label, selector: '[data-age-gate]', value: `заголовків у воротах: ${gh.length}, aria-labelledby → заголовок: ${gh.some((h) => h.labelsGate)}`, msg: 'ворота мають мати один видимий заголовок, що називає діалог' });
        continue;
      }
      const hs = c.data.headings.filter((h) => !h.inGate);
      const h1 = hs.filter((h) => h.level === 1);
      if (h1.length !== 1) addV({ rule: 'D7', page: c.label, selector: 'h1', value: `${h1.length}`, msg: 'має бути рівно один h1' });
      let prev = 0;
      for (const h of hs) { if (prev && h.level > prev + 1) addV({ rule: 'D7', page: c.label, selector: h.el, value: `h${prev} → h${h.level} «${h.text}»`, msg: 'пропуск рівня заголовка' }); prev = h.level; }
      if (hs.length && hs[0].level !== 1) addV({ rule: 'D7', page: c.label, selector: hs[0].el, value: `перший заголовок h${hs[0].level}`, msg: 'перший заголовок сторінки не h1' });
    }
  }
  // D8: контраст
  if (want('D8')) {
    for (const c of collect) for (const t of c.data.text) {
      if (t.inGate) continue;
      const min = t.large ? (A.largeTextMinContrast ?? 3) : (A.textMinContrast ?? 4.5);
      const eff = t.pxRatio != null ? t.pxRatio : t.ratio;
      if (eff < min) {
        if (t.bgUnknown && t.pxRatio == null) rep.info({ rule: 'D8', msg: `${c.label} ${t.el} «${t.sample}» ${t.ratio}:1 на фоні-картинці — перевірити візуально` });
        else addV({ rule: 'D8', page: c.label, selector: `${t.el} (${t.roles})`, value: `${eff}:1${t.pxRatio != null ? ' за пікселями' : ''} (поріг ${min}${t.large ? ', великий' : ''}; ${t.size}px, opacity ${t.opacity})`, msg: `контраст «${t.sample}»` });
      }
    }
  }
  // D14: контраст тексту на зображенні, по літерах (піксельно): FAIL = у вузлі є літера, у якої >50% пікселів нижче порога
  if (want14) {
    const st = (stats.d14 = { pageWidths: d14.length, canvas: 0, candidates: 0, noImage: 0, lettersMeasured: 0, failNodes: 0 });
    for (const c of d14) {
      st.candidates += c.stats.candidates; st.canvas += c.stats.canvas; st.noImage += c.stats.noImage; st.lettersMeasured += c.stats.lettersMeasured;
      for (const h of c.hits) { st.failNodes++; addV({ rule: 'D14', page: c.label, selector: h.el, value: `«${h.text}» ${h.bad}/${h.measured} літер нижче ${h.thr}:1 (мін. ${h.minRatio}:1; найгірша ${Math.round(h.worst * 100)}% пікселів; ${h.size}px${h.large ? ' великий' : ''}; під текстом: ${h.layer}; y=${h.y}; погані: «${h.badCh}»)`, msg: 'текст на зображенні: контраст по літерах нижче порога' }); }
    }
    try { mkdirSync(opts.out, { recursive: true }); writeFileSync(join(opts.out, 'd14.json'), JSON.stringify(d14.map((c) => ({ label: c.label, stats: c.stats, hits: c.hits, nodes: c.all.length })), null, 1)); } catch {}
    // позитивний контроль parallax=on знято 20.10.2026: він спирався на кадр фото barrels (наближення ×2), якого більше немає (замінено векторною панорамою)
    rep.info({ rule: 'D14', msg: `вузлів з зображенням під текстом ${st.candidates} (без зображення пропущено ${st.noImage}; над <canvas> WebGL-картою не міряється ${st.canvas} — візуально: атрибуція maplibre), виміряно літер ${st.lettersMeasured} на ${st.pageWidths} сторінко-ширинах; FAIL-вузлів ${st.failNodes}` });
  }
  // D16: hug/padding кнопок + позитивний контроль (зламана ширина МАЄ дати порушення)
  if (want16) {
    const bad = analyzeD16(d16, A.d16 || {});
    for (const v of bad) addV({ rule: 'D16', ...v });
    d16ctl = d16ctl ?? d16ctlFb;
    if (d16ctl !== null && d16ctl === 0) addV({ rule: 'D16', page: 'control', selector: 'позитивний контроль', value: '0 порушень', msg: 'зламана ширина кнопок (width:min-content; padding 0) НЕ дала порушень — D16 не працює' });
    rep.info({ rule: 'D16', msg: `кнопки ${d16.reduce((n, c) => n + c.data.length, 0)} записів (default/hover/focus) на ${d16.length} сторінко-ширинах; порушень ${bad.length}; позитивний контроль: ${d16ctl} порушень на зламаній ширині` });
  }
  // D17: заголовки (.t-hero/.t-h2) по центру = 4 колонки, легальні — лівим краєм ≤ 4 колонки; слова не розриваються + позитивний контроль (10 колонок МАЄ дати порушення)
  if (want17) {
    const a = analyzeD17(d17, d17cfg);
    for (const v of a.violations) addV({ rule: 'D17', ...v });
    for (const m of [...new Set(a.info)].slice(0, 20)) rep.info({ rule: 'D17', msg: m });
    if (d17ctl !== null && d17ctl === 0) addV({ rule: 'D17', page: 'control', selector: 'позитивний контроль', value: '0 порушень', msg: 'ширина заголовка 10 колонок НЕ дала порушень — D17 не працює' });
    if (d17ctlPanel !== null && d17ctlPanel === 0) addV({ rule: 'D17', page: 'control', selector: 'позитивний контроль панелі', value: '0 порушень', msg: 'поля 100u у панелі коктейлю НЕ дали виходу тексту за контент-бокс — правило «текст у панелі» не працює' });
    rep.info({ rule: 'D17', msg: `заголовків ${d17.reduce((n, c) => n + c.data.length, 0)} на ${d17.length} сторінко-ширинах; порушень ${a.violations.length}; позитивний контроль (10 колонок): ${d17ctl} порушень; контроль панелі коктейлю (поля 100u): ${d17ctlPanel}` });
  }
  // D15: шапка і меню
  if (want15) {
    const bad = analyzeD15(d15, A.d15, gcfg);
    for (const v of bad) addV({ rule: 'D15', ...v });
    rep.info({ rule: 'D15', msg: `шапка/меню/футер перевірено на ${d15.length} сторінко-ширинах; порушень ${bad.length}` });
  }
  // D9: alt/aria
  if (want('D9')) for (const c of collect) for (const a of c.data.a11y) addV({ rule: 'D9', page: c.label, selector: a.el, value: a.src || a.href || '', msg: a.kind });
  // D11: центрування бокс/іконка ↔ текст (check: оптичний центр першого рядка, допуск 0.5; icon: центр content-area тексту, допуск 1, + cap-центр — діагностично)
  if (want('D11')) {
    const tolC = A.alignCheckTolerancePx ?? 0.5, tolI = A.alignIconTolerancePx ?? 1;
    const capInfo = new Map(); stats.alignSamples = 0; stats.alignMaxCheck = 0; stats.alignMaxIcon = 0; stats.alignMaxIconCap = 0;
    for (const c of collect) for (const a of c.data.align) {
      stats.alignSamples++;
      const d = a.boxC - a.textC, tol = a.kind === 'check' ? tolC : tolI;
      if (a.kind === 'check') stats.alignMaxCheck = Math.max(stats.alignMaxCheck, Math.abs(d)); else { stats.alignMaxIcon = Math.max(stats.alignMaxIcon, Math.abs(d)); if (a.capC != null) stats.alignMaxIconCap = Math.max(stats.alignMaxIconCap, Math.abs(a.boxC - a.capC)); }
      if (Math.abs(d) > tol) addV({ rule: 'D11', page: c.label, selector: a.el, value: `${a.kind === 'check' ? 'бокс' : 'іконка'} ${d > 0 ? 'нижче' : 'вище'} на ${Math.abs(d).toFixed(2)}px (допуск ${tol}); рядків ${a.lines}; «${a.text}»${a.kind === 'check' ? `; центр content-area ${(a.boxC - a.rangeC).toFixed(2)}` : ''}`, msg: a.kind === 'check' ? 'центр боксу ≠ оптичний центр (cap-height) першого рядка підпису' : 'центр іконки ≠ центр тексту' });
      else if (a.kind === 'icon' && a.capC != null) { const k = a.el; const v = a.boxC - a.capC; if (!(capInfo.get(k) && Math.abs(capInfo.get(k).v) >= Math.abs(v))) capInfo.set(k, { v, d, page: c.label }); }
    }
    for (const [k, o] of capInfo) if (Math.abs(o.v) > (A.alignIconCapInfoPx ?? 1.5)) rep.info({ rule: 'D11', msg: `${k}: іконка відносно cap-центру тексту ${o.v > 0 ? '+' : ''}${o.v.toFixed(2)}px (інформаційно; за content-area ${o.d.toFixed(2)}; найгірше: ${o.page})` });
    rep.info({ rule: 'D11', msg: `макс. відхилення (layout, Range+метрики): чекбокси ${stats.alignMaxCheck.toFixed(2)}px, іконки (content-area) ${stats.alignMaxIcon.toFixed(2)}px, іконки (cap) ${stats.alignMaxIconCap.toFixed(2)}px; вибірок ${stats.alignSamples}` });
  }
  // D13: кожен текстовий вузол = одна з ролей .t-* (tools/qa/typo-d13.mjs)
  if (want13) {
    const a = analyzeD13(d13, A.d13);
    const st = (stats.d13 = { pageWidths: d13.length, nodeKinds: 0, violations: a.violations.length, implicit: a.implicit.length, semantic: a.semantic.length });
    for (const c of d13) st.nodeKinds += c.data.nodes.length;
    for (const v of a.violations) addV({ rule: 'D13', page: v.page, selector: v.selector, value: `«${v.text}» ×${v.nodes}: ${fmtSig(v.sig)}${v.near ? `; найближча ${v.near.role}: ${v.near.diff || 'збіг'}` : ''}`, msg: v.kind === 'поза ролями' ? 'текст поза ролями .t-*' : `роль ${v.role} перевизначена у CSS (стиль ≠ ролі)` });
    if (a.implicit.length) rep.info({ rule: 'D13', msg: `${a.implicit.length} типів вузлів збігаються з роллю лише за значеннями, без класу .t-* (роль у розмітці не призначена)` });
    const group = (arr) => { const grp = new Map(); for (const n of arr) { const sel = n.selector.split(' > ').slice(-2).join(' > '); const k = `${sel}|${n.matches[0]}`; const g = grp.get(k) || grp.set(k, { selector: sel, role: n.matches.join('/'), anc: (n.ancRoles || []).filter((r) => n.matches.includes(r))[0] || (n.ancRoles || [])[0] || '', pages: new Set(), text: n.text, nodes: 0 }).get(k); g.pages.add(n.pageName); g.nodes += n.nodes; } return [...grp.values()].sort((x, y) => y.pages.size - x.pages.size); };
    // (1) РЕКОМЕНДАЦІЯ (не fail), строго: стиль = роль за значеннями, `.t-*` на елементі немає І стиль не є наслідуванням від батька (вузол сам задає начерк, що збігся з роллю)
    st.noClass = 0;
    if (a.noClass.length) { const g1 = group(a.noClass); st.noClass = g1.length; rep.info({ rule: 'D13', msg: `РЕКОМЕНДАЦІЯ (не fail): ${g1.length} типів вузлів мають стиль ролі, `+'але .t-* немає на елементі, а стиль ≠ стилю батька (не наслідування) — призначити клас ролі на елемент' }); for (const g of g1) rep.info({ rule: 'D13', msg: `  без .t-*: ${g.selector} «${g.text}» = ${g.role} [${[...g.pages].slice(0, 5).join(',')}${g.pages.size > 5 ? ',…' : ''}] ×${g.nodes}` }); }
    else rep.info({ rule: 'D13', msg: 'РЕКОМЕНДАЦІЯ (строга, не fail): вузлів зі стилем ролі, без .t-* на елементі й не успадкованих від батька, немає' });
    // (2) РЕКОМЕНДАЦІЯ (не fail): роль лише успадкована від предка — на самому елементі `.t-*` немає (clean-наслідування: product dd/.strength/.product-volume, таби коктейлів, підписи feedback …). Список типів — для рішення, чи ставити клас явно.
    { const g2 = group(a.implicit.filter((n) => n.inherited)); st.inheritedOnly = g2.length;
      rep.info({ rule: 'D13', msg: `РЕКОМЕНДАЦІЯ (не fail): ${g2.length} типів вузлів мають роль лише через наслідування від предка (на елементі .t-* немає; повний список — d13.json → implicit[].inherited)` });
      for (const g of g2.filter((x) => !/^(span|a|li)( |$)/.test(x.selector.split(' > ').pop()) || /product|tabs|strength|check|topic|contacts/.test(x.selector))) rep.info({ rule: 'D13', msg: `  успадковано: ${g.selector} «${g.text}» = ${g.role}${g.anc ? ` (від .${g.anc})` : ''} [${[...g.pages].slice(0, 4).join(',')}${g.pages.size > 4 ? ',…' : ''}]` }); }
    for (const sm of a.semantic.filter((x) => x.width === opts.widths[Math.min(1, opts.widths.length - 1)] || opts.widths.length === 1)) rep.info({ rule: 'D13', msg: `семантика ${sm.key}@${sm.width}: ${sm.variants.length} різних начерків — ${sm.variants.map((v) => `${v.role} [${v.pages.slice(0, 4).join(',')}${v.pages.length > 4 ? ',…' : ''}]`).join(' ≠ ')}` });
    try { mkdirSync(opts.out, { recursive: true }); writeFileSync(join(opts.out, 'd13.json'), JSON.stringify({ tolerances: a.tolerances, violations: a.violations, implicit: a.implicit, noClass: a.noClass, semantic: a.semantic, dump: a.dump }, null, 1)); } catch {}
  }
  // D18: зазор великих блоків = 5u, малих (≤3 кол.) = 40u (tools/qa/grid-d18.mjs)
  if (want18) {
    const st = (stats.d18 = { pages: d18.length, big: 0, tile: 0, fused: 0, fail: 0, unstable: 0 }); const dump = [];
    for (const c of d18) {
      const mode = d18Mode(c.spec.name, d18cfg); const a = analyzeD18(c.data, d18cfg, mode); const u = c.data.u;
      if (c.data.__stab?.unstable) { st.unstable++; rep.note(`D18 ${c.label}: заміри не збіглися за ${c.data.__stab.samples} спроб (нестабільний макет) — взято найближчий до стабільного`); }
      st.fused += a.fused;
      for (const p of a.pairs) {
        st[p.kind]++;
        if (!p.ok) { st.fail++; addV({ rule: 'D18', page: c.label, selector: `${p.a.path} | ${p.b.path}`, value: `зазор ${(p.gap / u).toFixed(2)}u (${p.gap.toFixed(2)}px), очікув. ${(p.expected / u).toFixed(0)}u (${p.kind === 'big' ? (mode === 'five' ? 'горизонтальний зазор великих блоків: очікувано 40u (або 5u на gap5-pages: product, cocktails, cart) — тут 5u, --grid-gap-panels' : 'горизонтальний зазор великих блоків: очікувано 40u (або 5u на gap5-pages: product, cocktails, cart) — тут 40u, --grid-gap') : 'малі елементи --grid-gap'}); Δ${p.delta >= 0 ? '+' : ''}${p.delta.toFixed(2)}px; ширини ${p.cols.join('+')} кол.`, msg: `зазор пари ${p.kind === 'big' ? `великих блоків ≠ ${mode === 'five' ? '5u' : '40u'}` : 'малих елементів ≠ 40u'} (±${d18cfg.tolPx}px)` }); }
      }
      // охоронець покриття: на ключових сторінках пара/склеєний компонент МАЄ бути знайдена (збір не мовчить)
      for (const [key, min] of Object.entries(d18cfg.required || {})) {
        if (!(key.includes('?') ? c.spec.spec === key : c.spec.name === key && (key === 'product' ? /^product\?id=/.test(c.spec.spec) : !c.spec.query))) continue;
        if (a.pairs.length + a.fused < min) addV({ rule: 'D18', page: c.label, selector: key, value: `знайдено пар ${a.pairs.length} + склеєних ${a.fused}, потрібно ≥ ${min}`, msg: 'охоронець покриття: великі блоки на сторінці не знайдено (збір D18 зламано або сторінку змінено)' });
      }
      dump.push({ label: c.label, mode, u, blocks: c.data.blocks.length, pairs: a.pairs.map((p) => ({ kind: p.kind, gapU: +(p.gap / u).toFixed(3), ok: p.ok, a: p.a.path, b: p.b.path, cols: p.cols })), fused: a.fused });
    }
    for (const k of d18ctl) if (!k.applied || k.fails === 0) addV({ rule: 'D18', page: 'control', selector: `позитивний контроль ${k.label}`, value: k.applied ? '0 порушень' : 'пару великих блоків не знайдено', msg: 'зміна зазору великих блоків (product: 40u замість 5u; about: 5u замість 40u) МАЄ дати порушення — інакше D18 зламано' });
    try { mkdirSync(opts.out, { recursive: true }); writeFileSync(join(opts.out, 'd18.json'), JSON.stringify({ cfg: d18cfg, results: dump, control: d18ctl }, null, 1)); } catch {}
    rep.info({ rule: 'D18', msg: `сторінко-ширин ${st.pages}: пар великих блоків ${st.big}, малих елементів ${st.tile}, склеєних (tour-card) ${st.fused}; порушень ${st.fail}; режим 5u: gap5-pages (product, cocktails, cart); позитивний контроль (product 40u замість 5u / about 5u замість 40u) ${d18ctl.length ? d18ctl.map((k) => `${k.fails}`).join('/') : '—'} порушень на ${d18ctl.length} ширинах; нестабільних замірів ${st.unstable}` });
  }
  // D19: hero без оверлея (tools/qa/hero-d19.mjs); НЕ фільтрується allow
  if (wantHeroCtx) {
    const heroNeed = A.d19?.heroPages || ['index', 'barrels', 'excursions', 'about'];
    // Рукописні сторінки без файлу даних lp: дозвіл hero.fade зафіксовано ТУТ, вузько (одна сторінка, один токен). about.html («Про дім») — вимога замовника:
    // «на херо … фотка [будівлі]. Поверх неї градієнт кольором зеленого фону, знизу 100, зверху 0 прозорості» (сторінку перероблено з шаблону lp на рукописну, src/data/about.js видалено).
    // Перевірка градієнта та сама (рівно один linear-gradient(to top, <токен --color-green> 0%, transparent 100%) на .hero::after, без filter/mask/тіні/opacity); інший тон чи інша сторінка — порушення.
    const HAND_FADE = { about: 'green' }; // about: нижній градієнт hero.fade + верхній hero--fade-top (hero-d19.mjs; рішення замовника «градієнт зверху»)
    let off = 0, fadeSeen = 0;
    const dataFade = {};   // hero.fade із даних сторінки (єдине джерело дозволу градієнта D19); сторінки без файлу даних (index) — без fade
    const dataFadeById = {};   // сторінка з вкладками (page.tabs, напр. b2b): кілька hero — fade звіряється з hero за його id
    for (const name of new Set(d19.map((c) => c.spec.name))) { try { const d = await loadLpPage(ROOT, name); dataFade[name] = d?.sections?.find((x) => x.type === 'hero')?.fade || HAND_FADE[name] || null; if (d?.tabs) dataFadeById[name] = Object.fromEntries(d.sections.filter((x) => x.type === 'hero' && x.id).map((x) => [x.id, x.fade || null])); } catch { dataFade[name] = HAND_FADE[name] || null; } }
    for (const c of d19) {
      const name = c.spec.name; const h = (rep.ctx.hero[name] ||= { inkLight: null, overlay: false, n: 0 });
      h.n++; if (c.data.inkLight === false) h.inkLight = false; else if (c.data.inkLight === true && h.inkLight !== false) h.inkLight = true;
      if (c.data.offenders.length) h.overlay = true;
      if (want19) {
        for (const o of c.data.offenders) { off++; addV({ rule: 'D19', page: c.label, selector: o.el, value: `${o.prop}: ${o.value}`, msg: `hero з фото: оверлей/ефект поверх фото (${o.role}) заборонено (рішення замовника a2289410); allow не діє` }); }
        const df = dataFade[name], f = c.data.fade;
        if (f) fadeSeen++;
        const byId = dataFadeById[name];
        if (byId) { for (const x of c.data.fades || []) if ((byId[x.id] ?? null) !== x.cls) addV({ rule: 'D19', page: c.label, selector: `#${x.id}.hero::after`, value: `градієнт hero--fade-${x.cls}`, msg: `у даних hero «${x.id}».fade = «${byId[x.id] ?? '—'}», а на сторінці градієнт «${x.cls}» (вкладки: кожен hero звіряється за id)` }); }
        else if (f && f.cls !== df) addV({ rule: 'D19', page: c.label, selector: '.hero::after', value: `градієнт hero--fade-${f.cls}`, msg: df ? `у даних hero.fade = «${df}», а на сторінці градієнт «${f.cls}»` : 'градієнт на hero без hero.fade у даних сторінки (рішення замовника 53422015 дозволяє градієнт лише за полем hero.fade); allow не діє' });
        if (!f && df && c.data.heroes.length) addV({ rule: 'D19', page: c.label, selector: '.hero::after', value: `hero.fade = ${df}, градієнта немає`, msg: 'у даних hero.fade, але computed .hero::after не є дозволеним градієнтом linear-gradient(to top, <токен> 0%, transparent 100%)' });
        if (heroNeed.includes(name) && !c.data.heroes.length) addV({ rule: 'D19', page: c.label, selector: '.hero', value: 'hero не знайдено', msg: 'охоронець покриття: на сторінці з hero-фото немає .hero (збір D19 зламано або hero перейменовано)' });
      }
    }
    if (want19) rep.info({ rule: 'D19', msg: `hero перевірено на ${d19.filter((c) => c.data.heroes.length).length} сторінко-ширинах (${[...new Set(d19.filter((c) => c.data.heroes.length).map((c) => c.spec.name))].join(', ')}); оверлей-ознак ${off}; дозволений градієнт hero.fade на ${fadeSeen} сторінко-ширинах (дані: ${Object.entries(dataFade).filter(([, v]) => v).map(([n, v]) => `${n}:${v}`).join(' ') || '—'}); hero-ink=light: ${Object.entries(rep.ctx.hero).filter(([, h]) => h.inkLight !== null).map(([n, h]) => `${n}:${h.inkLight ? 'так' : 'ні'}`).join(' ') || '—'}` });
  }
  // D12: прив'язка блоків до колонок сітки (tools/qa/grid-d12.mjs)
  if (want12) {
    const st = (stats.grid = { pages: 0, blocks: 0, ok: 0, suspect: 0, fail: 0 }); const dump = [];
    const seen = new Set();
    for (const g of grid12) {
      const a = analyzeGrid(g.data, gcfg, g.spec.name === 'age-gate' ? 'default' : g.spec.name);
      st.pages++; st.blocks += a.counts.total; st.ok += a.counts.ok; st.suspect += a.counts.suspect; st.fail += a.counts.fail;
      if (g.data.__stab?.unstable) { st.unstable = (st.unstable || 0) + 1; rep.note(`D12 ${g.label}: заміри геометрії не збіглися за ${g.data.__stab.samples} спроб (нестабільний макет, смуга прокрутки?) — взято найближчий до стабільного`); }
      else if (g.data.__stab?.samples > 2) st.revoted = (st.revoted || 0) + 1;
      if (g.data.clientW !== g.data.vw) rep.info({ rule: 'D12', msg: `${g.label}: --vw ${g.data.vw}px ≠ clientWidth ${g.data.clientW}px (scrollbar-gutter) — сітку рахуємо за --vw` });
      dump.push({ label: g.label, page: g.spec.name, width: g.width, gate: g.gate, vw: g.data.vw, clientW: g.data.clientW, u: g.data.u, profile: a.profile, grid: { margin: a.grid.margin, gap: a.grid.gap, col: a.grid.col, starts: a.grid.starts, ends: a.grid.ends }, counts: a.counts, stats: g.data.stats,
        blocks: a.results.map((r) => ({ region: r.block.region, profile: r.profile, sel: r.block.sel, path: r.block.path.replace(/#[\w-]+/g, ''), tag: r.block.tag, L: r.block.L, R: r.block.R, T: r.block.T, B: r.block.B, W: r.block.W, H: r.block.H, testL: r.block.testL, testR: r.block.testR, leaf: r.block.leaf, text: r.block.text, status: r.ev.status, sides: r.ev.sides, cols: r.ev.cols, alt: r.alt })) });
      for (const r of a.results) {
        if (r.ev.status !== 'fail') continue;
        const path = r.block.path.replace(/#[\w-]+/g, '');
        addV({ rule: 'D12', page: g.label, selector: path, value: describeGrid(r, a.grids[r.profile]) + (r.profile !== a.profile ? ` (сітка «${r.profile}»)` : ''), msg: 'блок не стоїть на межах колонок сітки (>1px)' });
      }
    }
    try { mkdirSync(opts.out, { recursive: true }); writeFileSync(join(opts.out, 'grid-d12.json'), JSON.stringify({ config: gcfg, results: dump }, null, 1)); } catch {}
    rep.info({ rule: 'D12', msg: `блоків ${st.blocks} на ${st.pages} сторінко-ширинах: норма ${st.ok}, підозрілі (0.5–1px) ${st.suspect}, порушення (>1px) ${st.fail}; повні дані — ${join(opts.out, 'grid-d12.json')}${st.revoted ? `; повторних замірів (голосування) ${st.revoted}` : ''}${st.unstable ? `; НЕСТАБІЛЬНИХ ${st.unstable}` : ''}` });
  }
  return rep;
}
