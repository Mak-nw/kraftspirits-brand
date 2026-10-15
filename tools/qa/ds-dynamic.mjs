// Динамічні перевірки check-ds (D1–D12; D12 — сітка колонок — вмикається явно: --rules D12 / npm run qa:grid): у браузері, по обчислених стилях. Один прохід по сторінці збирає дані, далі аналіз у Node.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { COLLECT_GRID, GRID_DEFAULTS, analyzeGrid, describe as describeGrid } from './grid-d12.mjs';
import { textPixelContrast, launch, openPage, pageUrl, pageSpec, matrix, hscroll, hscrollBad, tabWalk, u, waitStable, sleep, uniq } from './lib.mjs';

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
    out.headings.push({ level: lvl, el: nameOf(el), text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40), inGate: !!el.closest('[data-age-gate]') });
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
export async function runDynamic(opts, allow, rep) {
  const want = (r) => !opts.rules || opts.rules.has(r);
  const A = allow.dynamic || {};
  const addV = (v) => rep.add(v);
  const collect = []; // { page, width, sb, data }
  const want12 = !!(opts.rules?.has('D12') || opts.grid); // D12 — опційно (поки сторінки не приведено до сітки, у загальний прогін не входить)
  const gcfg = { ...GRID_DEFAULTS, ...(allow.grid || {}), profiles: { ...GRID_DEFAULTS.profiles, ...(allow.grid?.profiles || {}) }, pageProfile: { ...GRID_DEFAULTS.pageProfile, ...(allow.grid?.pageProfile || {}) } };
  if (opts.gridDeep) gcfg.deep = true;
  const grid12 = []; // { label, spec, width, sb, gate, data }
  const specs = opts.pagesList.map(pageSpec);
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
        // D8: ланцюжок фонів не бачить фонів із псевдоелементів/картинок → для «підозрілих» міряємо піксельно (мода кольору = фон, найдальший = текст)
        for (const t of data.text) {
          if (t.ratio >= (t.large ? cfg.largeMin : cfg.textMin)) continue;
          const h = await page.$(`[data-qa-t="${t.idx}"]`);
          if (h) { t.pxRatio = await textPixelContrast(page, h); }
        }
        await page.evaluate(() => document.querySelectorAll('[data-qa-t]').forEach((e) => e.removeAttribute('data-qa-t')));
        collect.push({ label, spec, width: combo.width, sb: combo.scrollbar, data });
        if (want12) grid12.push({ label, spec, width: combo.width, sb: combo.scrollbar, gate: false, data: await page.evaluate(COLLECT_GRID, { ...gcfg, root: null }) });
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
          grid12.push({ label: `ворота18+@${combo.width}`, spec: { name: 'age-gate', label: 'ворота 18+' }, width: combo.width, sb: combo.scrollbar, gate: true, data: await gp12.evaluate(COLLECT_GRID, { ...gcfg, root: '[data-age-gate]' }) });
          await gp12.close().catch(() => {});
        }
        // D10: age-gate smoke (лише перша комбінація)
        if ((want('D10') && combo === combos[0]) || want('D11')) { // ворота: D10 — лише перша комбінація; D11 (чекбокс «запам'ятати») — на кожній ширині
          const gp = await openPage(L.browser, pageUrl(opts.url, spec, 'gate'), { width: combo.width, height: opts.height, dpr: 1, settle: false });
          await waitStable(gp);
          if (want('D11')) { const gd = await gp.evaluate(COLLECT, cfg); collect.push({ label: `${label}/ворота`, spec, width: combo.width, sb: combo.scrollbar, data: { ...gd, roles: [], comps: [], headings: [], a11y: [], text: [] } }); }
          const g = !(want('D10') && combo === combos[0]) ? null : await gp.evaluate(() => { const el = document.querySelector('[data-age-gate]'); if (!el) return { exists: false }; const cs = getComputedStyle(el); return { exists: true, visible: el.checkVisibility?.({ checkVisibilityCSS: true, checkOpacity: true }) !== false && cs.display !== 'none', ageOk: document.documentElement.classList.contains('age-ok'), role: el.getAttribute('role'), modal: el.getAttribute('aria-modal') }; });
          if (g) if (spec.name !== '404' || g.exists) { if (!g.exists) addV({ rule: 'D10', page: label, selector: '[data-age-gate]', value: 'немає', msg: 'вікові ворота відсутні в DOM' }); else if (!g.visible || g.ageOk) addV({ rule: 'D10', page: label, selector: '[data-age-gate]', value: JSON.stringify(g), msg: 'ворота не показуються без ?age=ok' }); }
          else addV({ rule: 'D10', page: label, selector: '[data-age-gate]', value: 'немає', msg: 'вікові ворота відсутні в DOM (404)' });
          await gp.close().catch(() => {});
        }
        await page.close().catch(() => {});
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
  // D12: прив'язка блоків до колонок сітки (tools/qa/grid-d12.mjs)
  if (want12) {
    const st = (stats.grid = { pages: 0, blocks: 0, ok: 0, suspect: 0, fail: 0 }); const dump = [];
    const seen = new Set();
    for (const g of grid12) {
      const a = analyzeGrid(g.data, gcfg, g.spec.name === 'age-gate' ? 'default' : g.spec.name);
      st.pages++; st.blocks += a.counts.total; st.ok += a.counts.ok; st.suspect += a.counts.suspect; st.fail += a.counts.fail;
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
    rep.info({ rule: 'D12', msg: `блоків ${st.blocks} на ${st.pages} сторінко-ширинах: норма ${st.ok}, підозрілі (0.5–1px) ${st.suspect}, порушення (>1px) ${st.fail}; повні дані — ${join(opts.out, 'grid-d12.json')}` });
  }
  return rep;
}
