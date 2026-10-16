// DEV-ONLY «Едіт» (клавіша E) — живий попередній перегляд правок поверх сайту + запис правок у review/edits.json.
// Нічого не пише у файли сайту: змінює лише inline-стилі/DOM у браузері. Правки виконують агенти за правилами проєкту.
// Значення міняються ЛИШЕ кроками шкали токенів (--space-*, --size-*, --radius-*, ролі .t-*, палітра --color-*, колонки сітки).
// Налаштування — DEFAULTS нижче, їх можна перекрити файлом <review>/edit.config.json (GET /__review/api/edit-config).
// Живе у Shadow DOM оверлею (стилі в edit.css); завантажується з overlay.js, у збірку не потрапляє.

const DEFAULTS = {
  space: { prefixes: ['--space-'], primary: '^--space-\\d+$' }, // padding / margin / gap
  size: { prefixes: ['--size-', '--container-'] },              // height / width (+ primary space)
  radius: { prefixes: ['--radius-'] },
  color: { prefix: '--color-', exclude: '^--color-hover-' },
  opacity: { prefix: '--opacity-' },
  span: { prefixes: ['--span-'] },
  exclude: ['[data-age-gate]'],                                 // селектори, які не можна вибирати
  roles: '^\\.t-[a-z0-9]+(?:-[a-z0-9]+)*$',                    // селектор ролі тексту у таблицях стилів
  roleClass: '^t-[a-z0-9]+(?:-[a-z0-9]+)*$',
  shiftSteps: 3,                                                // Shift + стрілка = N кроків шкали
  mergeMs: 700,                                                 // стрілки в межах цього часу зливаються в одну правку
};

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META', 'TEMPLATE', 'HEAD', 'TITLE', 'BR', 'WBR']);
const lsGet = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const pxOf = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

// ---------- опис властивостей ----------
const SIDES = ['top', 'right', 'bottom', 'left'];
const PROPS = {};
for (const g of ['padding', 'margin']) {
  SIDES.forEach((s, i) => {
    PROPS[`${g}-${s}`] = { css: [`${g}-${s}`], all: SIDES.map((x) => `${g}-${x}`), type: 'spacing', scale: 'space', chip: `${g === 'padding' ? 'P' : 'M'} ${'TRBL'[i]}`, group: g, side: s };
  });
}
Object.assign(PROPS, {
  'gap': { css: ['row-gap', 'column-gap'], type: 'spacing', scale: 'space', chip: 'gap', needs: 'fg' },
  'column-gap': { css: ['column-gap'], type: 'spacing', scale: 'space', chip: 'col-gap', needs: 'fg' },
  'row-gap': { css: ['row-gap'], type: 'spacing', scale: 'space', chip: 'row-gap', needs: 'fg' },
  'height': { css: ['height'], type: 'size', scale: 'size', chip: 'height' },
  'min-height': { css: ['min-height'], type: 'size', scale: 'size', chip: 'min-h' },
  'width': { css: ['width'], type: 'size', scale: 'size', chip: 'width' },
  'max-width': { css: ['max-width'], type: 'size', scale: 'size', chip: 'max-w' },
  'border-radius': { css: ['border-radius'], type: 'size', scale: 'radius', chip: 'radius' },
  'span': { css: ['grid-column-end'], type: 'span', chip: 'колонки', needs: 'gi' },
  'move': { type: 'move', chip: 'позиція' },
  'role': { type: 'role', chip: 'роль .t-*' },
  'color-text': { css: ['color'], type: 'color', target: 'text', chip: 'текст' },
  'color-bg': { css: ['background-color'], type: 'color', target: 'background', chip: 'фон' },
  'color-border': { css: ['border-color'], type: 'color', target: 'border', chip: 'рамка', needs: 'border' },
  'color-icon': { css: ['fill'], type: 'color', target: 'icon', chip: 'іконка', needs: 'icon' }, // реальна властивість (fill | stroke | color для currentColor) — iconCss(n)
  'opacity': { css: ['opacity'], type: 'opacity', chip: 'весь елемент (opacity)' },
  'text-align': { css: ['text-align'], type: 'align', chip: 'вирівнювання' },
  // службові (не чіпи): «вимкнути розтягування» — записуються разом із висотою/шириною групою unstretch-*
  'align-self': { css: ['align-self'], type: 'align', chip: 'align-self', hidden: true },
  'justify-self': { css: ['justify-self'], type: 'align', chip: 'justify-self', hidden: true },
  'flex-grow': { css: ['flex-grow'], type: 'align', chip: 'flex-grow', hidden: true },
  'flex-basis': { css: ['flex-basis'], type: 'align', chip: 'flex-basis', hidden: true },
});
// «Розподіл» контейнера (flex/grid): керується селектами панелі, не чіпами; запис type=align
const LAYOUT_PROPS = ['flex-direction', 'flex-wrap', 'justify-content', 'align-content', 'justify-items', 'align-items'];
for (const c of LAYOUT_PROPS) PROPS[c] = { css: [c], type: 'align', chip: c, layout: true, needs: 'fg' };
const DIST_RE = /^space-(between|around|evenly)$/;
const GROUPS = [
  ['Padding', ['padding-top', 'padding-right', 'padding-bottom', 'padding-left']],
  ['Margin', ['margin-top', 'margin-right', 'margin-bottom', 'margin-left']],
  ['Gap', ['gap', 'column-gap', 'row-gap']],
  ['Розмір', ['height', 'min-height', 'width', 'max-width', 'span', 'border-radius']],
  ['Інше', ['move', 'role', 'text-align']],
  ['Колір', ['color-text', 'color-bg', 'color-border', 'color-icon', 'opacity']],
];
const propByCss = (css, dflt) => Object.keys(PROPS).find((k) => PROPS[k].css && PROPS[k].css.length === 1 && PROPS[k].css[0] === css) || dflt;

export function initEdit(deps) {
  const { root, bar, beforeButton, host, api, say, mk, captureShot, selectorOf, PAGE, blocked, leaveOthers } = deps;
  const CFG = structuredClone(DEFAULTS);
  const ROLE_CLASS = () => new RegExp(CFG.roleClass);
  api('GET', '/edit-config').then((c) => { if (c && typeof c === 'object') for (const k of Object.keys(c)) CFG[k] = (typeof CFG[k] === 'object' && !Array.isArray(CFG[k]) && typeof c[k] === 'object') ? { ...CFG[k], ...c[k] } : c[k]; }).catch(() => {});

  const S = { on: false, el: null, prop: 'padding-top', prevProp: 'padding-top', restore: lsGet('__edit_restore', '1') !== '0', parked: 0, confirm: null, base: new Map(), unsynced: 0, all: false, scopeAll: false, view: 'after', side: 'right', drag: null, editing: null, ops: [], ptr: 0, changes: new Map(), sent: 0, hover: null, hint: null };
  let handles = [];
  const shadowActive = () => root.getRootNode().activeElement;

  // ---------- DOM ----------
  const wrap = mk('div', { class: 'ed', hidden: true });
  const cap = mk('div', { class: 'ed-cap' });
  const hoverBox = mk('div', { class: 'ed-hover' });
  const selBox = mk('div', { class: 'ed-sel' });
  const zones = mk('div', { class: 'ed-zones' });
  const ind = mk('div', { class: 'ed-ind' });
  const tip = mk('div', { class: 'ed-tip' });
  wrap.append(cap, hoverBox, selBox, zones, ind, tip);
  root.insertBefore(wrap, root.querySelector('.pop'));
  const panelEl = mk('div', { class: 'edpanel', hidden: true });
  panelEl.innerHTML = '<header></header><div class="ed-top"></div><div class="ed-info"></div><div class="ed-chg"></div><footer></footer>';
  root.insertBefore(panelEl, root.querySelector('.bar'));
  const pHead = panelEl.querySelector('header'), pTop = panelEl.querySelector('.ed-top'), pInfo = panelEl.querySelector('.ed-info'), pChg = panelEl.querySelector('.ed-chg'), pFoot = panelEl.querySelector('footer');
  const btn = mk('button', { class: 'btn alt', title: 'Едіт: висота, відступи, gap, текст, порядок, роль, колір — живий перегляд + запис правок у review/edits.json' });
  btn.dataset.act = 'edit';
  btn.innerHTML = '<span class="ed-bl">Едіт</span> <kbd>E</kbd><span class="ed-cnt"></span><span class="ed-bm"></span>';
  bar.insertBefore(btn, beforeButton);
  const legend = mk('span', { class: 'ed-leg', hidden: true });
  legend.innerHTML = '<b>Alt</b>+<b>←↑→↓</b> міняє місцями · <b>M</b> режим (Значення / Позиція) · <b>←↑→↓</b> змінюють значення';
  bar.insertBefore(legend, beforeButton);
  const probe = mk('div', { style: 'position:absolute;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;overflow:hidden' });
  root.append(probe);

  // ---------- масштаб u і шкали токенів ----------
  let uAt = 0, uPx = 1;
  const unit = () => {
    const now = performance.now();
    if (now - uAt > 250) {
      uAt = now;
      probe.style.width = 'calc(1000 * var(--u))';
      const w = probe.getBoundingClientRect().width / 1000;
      probe.style.width = '0';
      uPx = w > 0 ? w : 1;
    }
    return uPx;
  };
  function rootVarNames(prefixes) {
    const names = new Set();
    const walk = (rules) => {
      for (const rule of rules) {
        if (rule.style && rule.selectorText && /(^|,)\s*(:root|html)\s*(,|$)/.test(rule.selectorText)) {
          for (let i = 0; i < rule.style.length; i++) { const n = rule.style[i]; if (n.startsWith('--') && prefixes.some((p) => n.startsWith(p))) names.add(n); }
        }
        if (rule.cssRules) walk(rule.cssRules);
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch { /* cross-origin */ } }
    return [...names];
  }
  const varPx = (name) => { probe.style.width = '0'; probe.style.width = `var(${name})`; const w = probe.getBoundingClientRect().width; probe.style.width = '0'; return w; };
  const scaleCache = {};
  function getScale(kind) {
    const u = unit();
    const key = `${kind}|${r2(u)}|${document.styleSheets.length}`;
    if (scaleCache[kind]?.key === key) return scaleCache[kind].list;
    const out = [];
    const add = (name) => {
      const px = varPx(name);
      if (!(px > 0.05) && !(kind === 'radius' && /none|0/.test(name))) return;
      const same = out.find((e) => Math.abs(e.px - px) < 0.35);
      if (same) { same.aliases.push(name); return; }
      out.push({ name, px, css: `var(${name})`, aliases: [] });
    };
    if (kind === 'space' || kind === 'size') {
      const prim = new RegExp(CFG.space.primary);
      const names = rootVarNames(CFG.space.prefixes);
      names.filter((n) => prim.test(n)).forEach(add);
      if (kind === 'size') rootVarNames(CFG.size.prefixes).forEach(add);
      else names.filter((n) => !prim.test(n)).forEach((n) => { const px = varPx(n); const same = out.find((e) => Math.abs(e.px - px) < 0.35); if (same) same.aliases.push(n); });
    } else if (kind === 'radius') rootVarNames(CFG.radius.prefixes).forEach(add);
    if (kind === 'space' && !out.some((e) => e.px === 0)) out.push({ name: '0', px: 0, css: '0', aliases: [] });
    if (kind === 'radius' && !out.some((e) => e.px === 0)) out.push({ name: '0', px: 0, css: '0', aliases: [] });
    out.sort((a, b) => a.px - b.px);
    scaleCache[kind] = { key, list: out };
    return out;
  }
  const tokenAt = (kind, px) => getScale(kind).find((e) => Math.abs(e.px - px) < 0.6) || null;
  function snapTo(kind, px) {
    const list = getScale(kind);
    let best = list[0];
    for (const e of list) if (Math.abs(e.px - px) < Math.abs(best.px - px)) best = e;
    return best;
  }
  function stepOn(kind, base, dir, n) {
    const list = getScale(kind);
    if (!list.length) return null;
    const i = list.findIndex((e) => Math.abs(e.px - base) < 0.6);
    let a = -1; list.forEach((e, k) => { if (e.px < base - 0.6) a = k; }); // останній токен нижче base
    const j = i >= 0 ? i + dir * n : (dir > 0 ? a + n : a + 1 - n);
    return list[Math.min(list.length - 1, Math.max(0, j))];
  }
  const fmtU = (px) => `${r1(px / unit())}u`;
  const fmtLen = (px) => `${r1(px)}px`;

  // ---------- кольори ----------
  let cctx = null;
  const parseColor = (s) => {
    try {
      if (!cctx) { const cv = document.createElement('canvas'); cv.width = cv.height = 1; cctx = cv.getContext('2d', { willReadFrequently: true }); }
      cctx.clearRect(0, 0, 1, 1); cctx.fillStyle = '#000'; cctx.fillStyle = s; cctx.fillRect(0, 0, 1, 1);
      const d = cctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    } catch { return [0, 0, 0, 0]; }
  };
  const ckey = (c) => `${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.round(c[3] * 100)}`;
  let palette = null, paletteKey = '';
  function getPalette() {
    const key = String(document.styleSheets.length);
    if (palette && paletteKey === key) return palette;
    const ex = new RegExp(CFG.color.exclude);
    const list = [];
    probe.style.color = 'rgb(1, 2, 3)';
    for (const name of rootVarNames([CFG.color.prefix])) {
      if (ex.test(name)) continue;
      probe.style.color = 'rgb(1, 2, 3)'; probe.style.color = `var(${name})`;
      const val = getComputedStyle(probe).color;
      const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (val === 'rgb(1, 2, 3)' && !/rgb\(\s*1\s*,\s*2\s*,\s*3\s*\)|#010203/i.test(raw)) continue;
      const c = parseColor(val), k = ckey(c);
      const same = list.find((e) => e.k === k);
      if (same) same.aliases.push(name); else list.push({ name, k, rk: ckey([c[0], c[1], c[2], 1]), rgb: c, css: `var(${name})`, aliases: [] });
    }
    probe.style.color = '';
    palette = list; paletteKey = key;
    return list;
  }
  const colorToken = (str) => { const c = parseColor(str); const k = ckey(c); return getPalette().find((e) => e.k === k)?.name || null; };
  // токен за rgb без урахування alpha (колір із прозорістю: color-mix(... N%, transparent) → rgb токена + alpha)
  const colorTokenRgb = (c) => { const rk = ckey([c[0], c[1], c[2], 1]); return getPalette().find((e) => e.rk === rk)?.name || null; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  function contrastOf(el) {
    const layers = []; let img = false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none') img = true;
      const c = parseColor(cs.backgroundColor);
      if (c[3] > 0) layers.push(c);
      if (c[3] >= 0.99) break;
    }
    let base = [255, 255, 255];
    for (const c of layers.reverse()) base = [0, 1, 2].map((i) => c[i] * c[3] + base[i] * (1 - c[3]));
    const fg = parseColor(getComputedStyle(el).color);
    const fgc = [0, 1, 2].map((i) => fg[i] * fg[3] + base[i] * (1 - fg[3]));
    const L1 = lum(fgc), L2 = lum(base);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    return { ratio: r2(ratio), img };
  }

  const toHex = (c) => `#${[0, 1, 2].map((i) => Math.round(c[i]).toString(16).padStart(2, '0')).join('')}${c[3] < 0.995 ? Math.round(c[3] * 255).toString(16).padStart(2, '0') : ''}`.toUpperCase().replace('#', '#');
  // WCAG-контраст для пари «текст/фон» (інформаційно, не блокує): ratio, чи великий текст, AA (4.5 / 3 для великого)
  const textHolder = (n) => { if (hasOwnText(n)) return n; const w = document.createTreeWalker(n, NodeFilter.SHOW_ELEMENT); let x; while ((x = w.nextNode())) if (hasOwnText(x)) return x; return null; };
  function contrastInfo(n) {
    const h = textHolder(n); if (!h) return null;
    const c = contrastOf(h), cs = getComputedStyle(h), fs = pxOf(cs.fontSize), fw = parseInt(cs.fontWeight, 10) || 400;
    const large = fs >= 24 || (fs >= 18.66 && fw >= 700), need = large ? 3 : 4.5;
    return { ratio: c.ratio, large, need, pass: c.ratio >= need, img: c.img, holder: nameOf(h) };
  }
  const contrastText = (c) => (c ? `контраст ${c.ratio}:1 — ${c.pass ? `AA ✓${c.large ? ' (великий текст, поріг 3)' : ''}` : `НЕ проходить AA (потрібно ${c.need}${c.large ? ', великий текст' : ''})`}${c.img ? '; є фон-зображення — орієнтовно' : ''}` : '');
  // токени прозорості (--opacity-*), значення динамічно з :root; «1» (без прозорості) — не токен, лише крок
  let opCache = null;
  function getOpacities() {
    const key = String(document.styleSheets.length);
    if (opCache?.key === key) return opCache.list;
    const cs = getComputedStyle(document.documentElement), list = [];
    for (const name of rootVarNames([CFG.opacity.prefix])) {
      const v = parseFloat(cs.getPropertyValue(name));
      if (!Number.isFinite(v) || v < 0 || v > 1) continue;
      const same = list.find((e) => Math.abs(e.value - v) < 0.0005);
      if (same) same.aliases.push(name); else list.push({ name, value: v, css: `var(${name})`, aliases: [] });
    }
    if (!list.some((e) => e.value === 1)) list.push({ name: '1', value: 1, css: '1', aliases: [], plain: true });
    list.sort((a, b) => a.value - b.value);
    opCache = { key, list };
    return list;
  }
  // кроки прозорості КОЛЬОРУ (alpha): спершу токени --opacity-*, далі експериментальні 90…10% (які не збігаються з токеном); 100% = без прозорості
  const EXP_ALPHA = [90, 80, 70, 60, 50, 40, 30, 20, 10];
  function getAlphaSteps() {
    const toks = getOpacities().filter((e) => !e.plain && e.value < 1), out = [];
    for (const e of toks) out.push({ pct: r2(e.value * 100), name: e.name, aliases: e.aliases, token: true });
    for (const v of EXP_ALPHA) if (!out.some((x) => Math.abs(x.pct - v) < 0.01)) out.push({ pct: v, name: null, aliases: [], token: false });
    out.push({ pct: 100, name: null, aliases: [], token: false, none: true });
    return out.sort((a, b) => b.pct - a.pct);
  }
  const alphaStepOf = (pct) => getAlphaSteps().find((x) => Math.abs(x.pct - pct) < 0.6) || null;
  const nearestOpToken = (pct) => { const t = getAlphaSteps().filter((x) => x.token); let b = null; for (const x of t) if (!b || Math.abs(x.pct - pct) < Math.abs(b.pct - pct)) b = x; return b ? { token: b.name, percent: b.pct } : null; };
  const mixCss = (tok, pct) => (pct >= 99.95 ? `var(${tok})` : `color-mix(in srgb, var(${tok}) ${r2(pct)}%, transparent)`);
  const opToken = (v) => getOpacities().find((e) => Math.abs(e.value - v) < 0.005) || null;
  // властивість кольору іконки: SVG-фігура/svg — fill (або stroke, якщо fill none); currentColor-іконка — `color` елемента
  function iconCss(n) {
    const svgs = n instanceof SVGElement ? [n] : [...n.querySelectorAll('svg, svg *')].slice(0, 40);
    if (!svgs.length) return null;
    const old = n.style.getPropertyValue('color'), oldP = n.style.getPropertyPriority('color');
    n.style.setProperty('color', 'rgb(1, 2, 3)');
    const cur = svgs.some((x) => { const c = getComputedStyle(x); return c.fill === 'rgb(1, 2, 3)' || c.stroke === 'rgb(1, 2, 3)'; });
    if (old) n.style.setProperty('color', old, oldP); else n.style.removeProperty('color');
    if (cur) return { css: 'color', mode: 'currentColor' };
    if (!(n instanceof SVGElement)) return null;
    const cs = getComputedStyle(n);
    return cs.fill !== 'none' ? { css: 'fill', mode: 'fill' } : cs.stroke !== 'none' ? { css: 'stroke', mode: 'stroke' } : { css: 'fill', mode: 'fill' };
  }
  const hasBorder = (n) => { const cs = getComputedStyle(n); return ['Top', 'Right', 'Bottom', 'Left'].some((s) => pxOf(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none'); };
  const cssFor = (n, p) => (p === 'color-icon' ? (iconCss(n)?.css || 'fill') : p === 'color-border' ? 'border-color' : PROPS[p].css[0]);

  // ---------- елементи ----------
  const excluded = (n) => CFG.exclude.some((s) => { try { return n.closest(s); } catch { return false; } });
  const hasOwnText = (n) => { for (let c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && /\S/.test(c.data)) return true; return false; };
  const roleOf = (n) => [...n.classList].find((c) => ROLE_CLASS().test(c)) || null;
  const nameOf = (n) => {
    if (!n || n.nodeType !== 1) return '';
    const cls = [...n.classList].filter((c) => !/^(is-|has-|js-)/.test(c)).slice(0, 2).map((c) => '.' + c).join('');
    return n.localName + cls;
  };
  const shortText = (n) => (n.innerText || n.getAttribute?.('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 28);
  const label = (n) => { const t = shortText(n); return `${nameOf(n)}${t ? ` «${t}»` : ''}`; };
  const selCache = new WeakMap();
  const selFor = (n) => { let s = selCache.get(n); if (!s) { s = selectorOf(n); selCache.set(n, s); } return s; };
  function pickAt(x, y) {
    for (const n of document.elementsFromPoint(x, y)) {
      if (n === host || host.contains(n) || n === document.documentElement || SKIP.has(n.tagName) || excluded(n)) continue;
      return n;
    }
    return null;
  }
  const usable = (n) => { let c = n; while (c && c !== document.documentElement) { const r = c.getBoundingClientRect(); if (r.width >= 1 && r.height >= 1) return c; c = c.parentElement; } return document.body; };
  const inflow = (c) => { if (SKIP.has(c.tagName)) return false; const s = getComputedStyle(c); return !(s.display === 'none' || s.display === 'contents' || s.position === 'absolute' || s.position === 'fixed'); };
  const isFG = (n) => /flex|grid/.test(getComputedStyle(n).display);
  const gridCols = (par) => { const cs = getComputedStyle(par); return cs.display.includes('grid') ? cs.gridTemplateColumns.split(' ').map(parseFloat).filter(Number.isFinite) : []; };
  const isGridItem = (n) => !!n.parentElement && gridCols(n.parentElement).length >= 2 && getComputedStyle(n).position !== 'absolute';
  function spanOf(n) {
    const par = n.parentElement, cols = gridCols(par), pcs = getComputedStyle(par), pr = par.getBoundingClientRect(), r = n.getBoundingClientRect();
    let x = pr.left + pxOf(pcs.borderLeftWidth) + pxOf(pcs.paddingLeft), cnt = 0;
    const gap = pxOf(pcs.columnGap);
    for (const w of cols) { const mid = x + w / 2; if (mid > r.left - 0.5 && mid < r.right + 0.5) cnt++; x += w + gap; }
    return { span: Math.max(1, cnt), columns: cols.length };
  }
  const spanTokens = (nn) => {
    const cs = getComputedStyle(document.documentElement);
    return rootVarNames(CFG.span.prefixes).filter((nm) => parseFloat(cs.getPropertyValue(nm)) === nn).slice(0, 4);
  };

  // ---------- читання значень (нормалізовано для записів) ----------
  function readLen(n, css) {
    const cs = getComputedStyle(n); const raw = cs.getPropertyValue(css).trim();
    let set = true, px = pxOf(raw);
    if (/^(min-|max-)/.test(css) && (raw === 'none' || raw === 'auto' || (css.startsWith('min-') && px === 0))) set = false;
    if (!set || raw === 'auto' || raw === 'normal' || raw === '') {
      if (css.includes('height')) px = n.getBoundingClientRect().height; else if (css.includes('width')) px = n.getBoundingClientRect().width; else px = 0;
      if (raw === 'normal') { px = 0; set = true; }
    }
    return { px, raw, set };
  }
  function readStyle(n, p) {
    const P = PROPS[p], css = cssFor(n, p);
    if (P.type === 'color') {
      const cs = getComputedStyle(n);
      const v = css === 'border-color' ? cs.borderTopColor : cs.getPropertyValue(css);
      const inl = n.style.getPropertyValue(css);
      const mm = inl.match(/^color-mix\(in srgb, var\((--[\w-]+)\) ([\d.]+)%, transparent\)$/), vm = inl.match(/^var\((--[\w-]+)\)$/);
      const col = parseColor(v), a = col[3];
      const token = mm ? mm[1] : vm ? vm[1] : (colorToken(v) || colorTokenRgb(col));
      const raw = a * 100, pct = mm ? r2(+mm[2]) : (alphaStepOf(raw)?.pct ?? Math.round(raw)), hex = toHex([col[0], col[1], col[2], 1]);
      const st = alphaStepOf(pct), aTok = st && st.token ? st.name : null;
      const kind = pct >= 99.95 ? 'none' : aTok ? 'token' : 'experimental';
      const ct = P.target === 'text' || P.target === 'background' ? contrastInfo(n) : null;
      const alphaTxt = kind === 'none' ? '' : ` · прозорість ${pct}%${kind === 'token' ? ` = ${aTok}` : ' (експериментально)'}`;
      return { k: ckey(col), property: P.target, css: inl || null, token, colorToken: token, value: hex, color: v, alphaPct: pct, alpha: kind === 'none' ? '100%' : aTok || `${pct}%`, alphaToken: aTok, alphaKind: kind, ...(kind === 'experimental' ? { alphaNearest: nearestOpToken(pct) } : {}), label: token ? `${token} (${hex})${alphaTxt}` : `${hex}${alphaTxt} — не з токенів`, ...(ct ? { contrast: { ratio: ct.ratio, need: ct.need, pass: ct.pass, large: ct.large, text: contrastText(ct) } } : {}) };
    }
    if (P.type === 'opacity') {
      const v = r2(parseFloat(getComputedStyle(n).opacity)), e = opToken(v), inl = n.style.getPropertyValue('opacity'), m = inl.match(/var\((--[\w-]+)\)/);
      const token = m ? m[1] : e && !e.plain ? e.name : null;
      return { k: String(v), property: 'opacity', css: inl || null, token, value: v, label: token ? `${token} (${v})` : v === 1 ? '1 (без прозорості)' : `${v} — не з токенів` };
    }
    if (P.type === 'align') { const v = getComputedStyle(n).getPropertyValue(css).trim(); return { k: v, value: v, label: v }; }
    const { px, set } = readLen(n, css);
    const inl = n.style.getPropertyValue(css), m = inl.match(/var\((--[\w-]+)\)/);
    const ent = tokenAt(P.scale, px);
    const token = set ? (m ? m[1] : ent?.name || null) : null;
    const lab = !set ? 'не задано' : token ? `${token} · ${fmtU(px)} · ${fmtLen(px)}` : `${fmtLen(px)} · ${fmtU(px)} (поза шкалою)`;
    return { k: set ? String(r1(px)) : 'unset', css: inl || null, token, px: set ? r1(px) : null, u: set ? r1(px / unit()) : null, label: lab };
  }

  // ---------- spec / touch / ops ----------
  const newId = () => [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const keyOf = (n, what) => `${selFor(n)}|${what}`;
  function scopeFor(n, type, prop) {
    if (!S.scopeAll) return { targets: [n], scope: '' };
    let sel = '', txt = '';
    if (type === 'role') { const r = roleOf(n); if (r) { sel = '.' + r; txt = `роль ${sel}`; } }
    else { const c = [...n.classList].find((x) => !ROLE_CLASS().test(x) && !/^(is-|has-|js-)/.test(x) && /^[A-Za-z_][\w-]*$/.test(x)); if (c) { sel = '.' + c; txt = `class ${sel}`; } }
    if (!sel) return { targets: [n], scope: '' };
    const list = [...document.querySelectorAll(sel)].filter((x) => !host.contains(x) && !excluded(x)).slice(0, 500);
    if (!list.includes(n)) list.push(n);
    return { targets: list, scope: txt };
  }
  function styleSpec(n, targets, prop, scope, group) {
    const P = PROPS[prop], css = cssFor(n, prop);
    return {
      key: keyOf(n, prop === 'color-icon' ? 'icon-' + css : css), el: n, type: P.type, prop: css, pkey: prop, target: P.target || '', group, targets, scope,
      snap: () => targets.map((t) => [t.style.getPropertyValue(css), t.style.getPropertyPriority(css)]),
      put: (s) => targets.forEach((t, i) => { if (s[i] && s[i][0]) t.style.setProperty(css, s[i][0], s[i][1]); else t.style.removeProperty(css); }),
      read: () => (P.type === 'span' ? readSpan(n) : readStyle(n, prop)),
      restore: () => ({ kind: 'style', css, prop, value: n.style.getPropertyValue(css) }),
    };
  }
  function readSpan(n) {
    const { span, columns } = spanOf(n);
    return { k: String(span), span, columns, tokens: spanTokens(span), label: `span ${span} з ${columns}${spanTokens(span).length ? ' · ' + spanTokens(span)[0] : ''}` };
  }
  function textSpec(n) {
    return { key: keyOf(n, 'text'), el: n, type: 'text', prop: 'text', targets: [n], scope: '',
      snap: () => n.textContent, put: (s) => { n.textContent = s; },
      read: () => { const t = n.textContent.replace(/\s+/g, ' ').trim(); return { k: t, text: t, label: `«${t.slice(0, 60)}»` }; },
      restore: () => ({ kind: 'text', text: n.textContent }) };
  }
  function roleSpec(n, targets, scope) {
    return { key: keyOf(n, 'role'), el: n, type: 'role', prop: 'role', targets, scope,
      snap: () => targets.map((t) => roleOf(t)),
      put: (s) => targets.forEach((t, i) => { [...t.classList].filter((c) => ROLE_CLASS().test(c)).forEach((c) => t.classList.remove(c)); if (s[i]) t.classList.add(s[i]); }),
      read: () => { const r = roleOf(n); return { k: r || '', role: r ? '.' + r : null, label: r ? '.' + r : '(без ролі)' }; },
      restore: () => ({ kind: 'role', role: roleOf(n) }) };
  }
  // ---------- порядок / місця (Move) ----------
  // grid з явними доріжками: переставляються діти І доріжки (ширина йде разом з елементом); flex: inline `order`; інакше — DOM-порядок.
  const sibsOf = (par) => [...par.children].filter((k) => !SKIP.has(k.tagName));
  const ordNum = (k) => { const o = parseInt(getComputedStyle(k).order, 10); return Number.isFinite(o) ? o : 0; };
  const moveMode = (par) => { const d = getComputedStyle(par).display; return d.includes('grid') ? 'grid' : d.includes('flex') ? 'order' : 'dom'; };
  const ordered = (par) => { const l = sibsOf(par); return moveMode(par) === 'order' ? l.map((k, i) => [k, i]).sort((a, b) => ordNum(a[0]) - ordNum(b[0]) || a[1] - b[1]).map((x) => x[0]) : l; };
  const idxOf = (n) => [...n.parentElement.children].indexOf(n);
  function moveTo(n, i) { // застарілі чернетки (restore.index без perm)
    const par = n.parentElement, kids2 = [...par.children].filter((k) => k !== n);
    par.insertBefore(n, kids2[Math.max(0, Math.min(i, kids2.length))] ?? null);
  }
  function splitTop(str) { const out = []; let d = 0, cur = ''; for (const ch of str) { if (ch === '(') d++; if (ch === ')') d--; if (/\s/.test(ch) && d === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out; }
  function eachRule(fn) {
    const walk = (rules) => { for (const r of rules) { if (r.media && !matchMedia(r.media.mediaText).matches) continue; if (r.style) fn(r); if (r.cssRules) walk(r.cssRules); } };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch { /* cross-origin */ } }
  }
  function rootRaw(name) { let v = null; eachRule((r) => { if (r.selectorText && /(^|,)\s*(:root|html)\s*(,|$)/.test(r.selectorText)) { const x = r.style.getPropertyValue(name); if (x) v = x.trim(); } }); return v; }
  function declaredCols(par, skipInline) {
    if (!skipInline && par.style.getPropertyValue('grid-template-columns')) return par.style.getPropertyValue('grid-template-columns');
    let raw = null;
    eachRule((r) => { if (r.selectorText && r.style.getPropertyValue('grid-template-columns')) { try { if (par.matches(r.selectorText)) raw = r.style.getPropertyValue('grid-template-columns').trim(); } catch { /* */ } } });
    return raw;
  }
  // доріжки grid-батька: px, символьний список (токени/minmax) і ім'я токена-«джерела» (`--grid-…`)
  function trackInfo(par) {
    const cs = getComputedStyle(par); if (!cs.display.includes('grid')) return null;
    const px = cs.gridTemplateColumns.split(' ').map(parseFloat);
    if (px.length < 2 || px.some((v) => !Number.isFinite(v))) return null;
    let raw = declaredCols(par), token = null, rawNoInl = declaredCols(par, true);
    for (let i = 0; i < 4 && rawNoInl; i++) { const m = rawNoInl.match(/^var\((--[\w-]+)\)$/); if (!m) break; token = m[1]; rawNoInl = rootRaw(m[1]); }
    for (let i = 0; i < 4 && raw; i++) { const m = raw.match(/^var\((--[\w-]+)\)$/); if (!m) break; raw = rootRaw(m[1]); }
    let sym = raw ? splitTop(raw) : null; if (sym && sym.length !== px.length) sym = null;
    return { px, sym: sym || px.map((v) => `${r2(v)}px`), symbolic: !!sym, token, u: px.map((v) => `${r1(v / unit())}u`) };
  }
  // чи діти (у DOM-порядку, у потоці) стоять у доріжках 0..k-1 — лише тоді доріжки можна переставляти разом з дітьми
  function gridPlan(par) {
    const ti = trackInfo(par); if (!ti) return null;
    const cs = getComputedStyle(par), pr = par.getBoundingClientRect(), gap = pxOf(cs.columnGap);
    let x = pr.left + pxOf(cs.borderLeftWidth) + pxOf(cs.paddingLeft); const cells = [];
    for (const w of ti.px) { cells.push([x, x + w]); x += w + gap; }
    const K = sibsOf(par).filter(inflow); if (!K.length || K.length > ti.px.length) return null;
    const at = K.map((k) => { const r = k.getBoundingClientRect(), c = (r.left + r.right) / 2; return cells.findIndex((q) => c >= q[0] - 0.5 && c <= q[1] + 0.5); });
    if (!at.every((t, j) => t === j)) return null;
    return { ti, K };
  }
  const tracksNow = (par) => { const t = trackInfo(par); return t ? { sym: t.sym.join(' '), u: t.u.join(' · '), token: declaredToken(par), symbolic: t.symbolic } : null; };
  const declaredToken = (par) => { let raw = declaredCols(par, true), tok = null; for (let i = 0; i < 4 && raw; i++) { const m = raw.match(/^var\((--[\w-]+)\)$/); if (!m) break; tok = m[1]; raw = rootRaw(m[1]); } return tok; };
  function layoutSnap(par) { return { dom: [...par.children], gtc: par.style.getPropertyValue('grid-template-columns'), ord: sibsOf(par).map((k) => [k, k.style.getPropertyValue('order')]) }; }
  function placeDom(par, want) {
    const cur = sibsOf(par);
    want.forEach((k, j) => { if (cur[j] !== k) { par.insertBefore(k, cur[j]); cur.splice(cur.indexOf(k), 1); cur.splice(j, 0, k); } });
  }
  function restoreLayout(par, s) {
    s.dom.forEach((k) => par.appendChild(k));
    if (s.gtc) par.style.setProperty('grid-template-columns', s.gtc); else par.style.removeProperty('grid-template-columns');
    s.ord.forEach(([k, v]) => { if (v) k.style.setProperty('order', v); else k.style.removeProperty('order'); });
  }
  // FLIP: коротка анімація переходу (лише transform, 280 мс) + підсвітка «було → стало» у шарі оверлею
  const mvLayer = mk('div', { class: 'ed-mvl' }); wrap.append(mvLayer);
  function withFlip(par, fn, quiet) {
    const ks = sibsOf(par), r0 = new Map(ks.map((k) => [k, k.getBoundingClientRect()])), was = ordered(par);
    fn();
    const now = ordered(par), r1m = ks.map((k) => [k, k.getBoundingClientRect()]);
    if (quiet) return { was, now };
    let html = '';
    for (const [k, r] of r1m) {
      const o = r0.get(k), dx = o.left - r.left, dy = o.top - r.top, a = was.indexOf(k), b = now.indexOf(k);
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) { try { k.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)' }); } catch { /* */ } }
      if (a !== b && r.width > 0) html += `<div class="ed-mv" style="left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px"><b>${a + 1} → ${b + 1}</b></div>`;
    }
    mvLayer.innerHTML = html; clearTimeout(withFlip.t); withFlip.t = setTimeout(() => { mvLayer.innerHTML = ''; }, 2200);
    return { was, now };
  }
  // застосувати нову послідовність newL (елементи sibsOf(par)) — DOM / order / доріжки grid
  function reorder(par, newL) {
    sibsOf(par).forEach(selFor); selFor(par); // селектори рахуємо ДО зміни DOM (nth-of-type), інакше відновлення після reload влучить не туди
    const mode = moveMode(par), plan = mode === 'grid' ? gridPlan(par) : null;
    return withFlip(par, () => {
      if (mode === 'order') { newL.forEach((k, i) => k.style.setProperty('order', String(i))); return; }
      placeDom(par, newL);
      if (plan) {
        const K2 = newL.filter(inflow), list = plan.ti.sym.slice();
        K2.forEach((k, j) => { list[j] = plan.ti.sym[plan.K.indexOf(k)]; });
        par.style.setProperty('grid-template-columns', list.join(' '));
      }
    });
  }
  const nm0 = (k) => nameOf(k) + (shortText(k) ? ` «${shortText(k).slice(0, 14)}»` : '');
  // візуальний сусід у напрямку (за bounding box, не за DOM-порядком)
  function neighborOf(n, dir) {
    const par = n.parentElement; if (!par) return null;
    const nr = n.getBoundingClientRect(); let best = null, bd = Infinity;
    for (const k of sibsOf(par)) {
      if (k === n || !inflow(k)) continue;
      const r = k.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      let d, ov;
      if (dir === 'left') { d = nr.left - r.right; ov = overlap(nr.top, nr.bottom, r.top, r.bottom); if ((r.left + r.right) / 2 >= (nr.left + nr.right) / 2) continue; }
      else if (dir === 'right') { d = r.left - nr.right; ov = overlap(nr.top, nr.bottom, r.top, r.bottom); if ((r.left + r.right) / 2 <= (nr.left + nr.right) / 2) continue; }
      else if (dir === 'up') { d = nr.top - r.bottom; ov = overlap(nr.left, nr.right, r.left, r.right); if ((r.top + r.bottom) / 2 >= (nr.top + nr.bottom) / 2) continue; }
      else { d = r.top - nr.bottom; ov = overlap(nr.left, nr.right, r.left, r.right); if ((r.top + r.bottom) / 2 <= (nr.top + nr.bottom) / 2) continue; }
      if (ov < 1) continue;
      d = Math.max(0, d);
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }
  const DIRS_RU = { left: 'ліворуч', right: 'праворуч', up: 'вище', down: 'нижче' };
  const VALUE_WORD = { spacing: 'відступ', size: 'розмір' };
  function modeText() { return S.prop === 'move' ? 'Режим: Позиція — стрілки міняють місцями' : `Режим: Значення — стрілки міняють ${VALUE_WORD[PROPS[S.prop]?.type] || 'значення'}`; }
  function setMode(m) {
    if (m === 'move') { if (S.prop !== 'move') { S.prevProp = S.prop; S.prop = 'move'; } }
    else if (S.prop === 'move') S.prop = S.prevProp && S.prevProp !== 'move' && PROPS[S.prevProp] ? S.prevProp : 'padding-top';
    if (S.el && !available(S.prop)) S.prop = 'padding-top';
    renderInfo(); say(modeText());
  }
  function swapDir(dir) {
    const n = S.el; if (!n || !guard() || !n.parentElement) return;
    const x = neighborOf(n, dir);
    if (!x) return say(`${DIRS_RU[dir][0].toUpperCase()}${DIRS_RU[dir].slice(1)} сусіда немає — міняти нема з чим`);
    swapWith(n, x);
  }
  function swapWith(n, x) {
    const par = n.parentElement, list = ordered(par), i = list.indexOf(n), j = list.indexOf(x);
    if (i < 0 || j < 0) return;
    const nl = list.slice(); nl[i] = x; nl[j] = n;
    commitMove(n, nl);
  }
  function commitMove(n, newL) {
    if (!guard() || !n.parentElement) return;
    const par = n.parentElement, was = ordered(par);
    if (newL.every((k, i) => k === was[i])) return;
    const spec = moveSpec(n); touch(spec);
    const before = spec.snap(); let after = null;
    const op = { specs: [spec], keys: [spec.key],
      doIt() { if (after) spec.put(after); else { reorder(par, newL); after = layoutSnap(par); } },
      undoIt() { spec.put(before); } };
    const info = (() => { const t0 = tracksNow(par); op.doIt(); return { t0, t1: tracksNow(par) }; })();
    pushOp(op);
    const now = ordered(par), tr = info.t0 && info.t1 && info.t0.sym !== info.t1.sym ? ` Доріжки: ${info.t0.sym} → ${info.t1.sym}.` : '';
    S.hint = { kind: 'ok', text: `Було: ${was.map(nm0).join(' · ')} → Стало: ${now.map(nm0).join(' · ')}.${tr}` };
    renderInfo(); showTip(`позиція ${now.indexOf(n) + 1} з ${now.length}`);
  }
  function moveSpec(n) {
    const par = n.parentElement;
    return { key: keyOf(n, 'move'), el: n, type: 'move', prop: 'move', targets: [n], scope: '', parent: par,
      snap: () => layoutSnap(par), put: (s) => withFlip(par, () => restoreLayout(par, s)),
      read: () => {
        const list = ordered(par), i = list.indexOf(n), tr = tracksNow(par), dom = sibsOf(par);
        return { k: `${list.map((x) => dom.indexOf(x)).join(',')}|${par.style.getPropertyValue('grid-template-columns')}`, index: i, of: list.length, mode: moveMode(par),
          before: i > 0 ? label(list[i - 1]) : null, after: list[i + 1] ? label(list[i + 1]) : null, order: list.slice(0, 14).map(nm0),
          tracks: tr ? tr.sym : null, tracksU: tr ? tr.u : null, tracksToken: tr ? tr.token : null, label: `позиція ${i + 1} з ${list.length}` };
      },
      restore: () => {
        const base = S.base.get(par) || sibsOf(par), dom = sibsOf(par);
        return { kind: 'move', index: idxOf(n), mode: moveMode(par), perm: dom.map((x) => base.indexOf(x)), gtc: par.style.getPropertyValue('grid-template-columns'), orders: dom.map((x) => x.style.getPropertyValue('order')) };
      } };
  }
  function applyMoveRestore(par, R) {
    const ks = sibsOf(par);
    if (!Array.isArray(R.perm) || R.perm.length !== ks.length) return false;
    const want = R.perm.map((i) => ks[i]); if (want.some((x) => !x)) return false;
    placeDom(par, want);
    want.forEach((k, j) => { const v = R.orders?.[j]; if (v) k.style.setProperty('order', v); else k.style.removeProperty('order'); });
    if (R.gtc) par.style.setProperty('grid-template-columns', R.gtc); else par.style.removeProperty('grid-template-columns');
    return true;
  }
  function hideSpec(n) {
    return { key: keyOf(n, 'hide'), el: n, type: 'hide', prop: 'display', targets: [n], scope: '',
      snap: () => [n.style.getPropertyValue('display'), n.style.getPropertyPriority('display')],
      put: (s) => { if (s[0]) n.style.setProperty('display', s[0], s[1]); else n.style.removeProperty('display'); },
      read: () => { const h = getComputedStyle(n).display === 'none'; return { k: String(h), hidden: h, label: h ? 'прибрано' : 'показано' }; },
      restore: () => ({ kind: 'hide' }) };
  }

  function touch(spec) {
    let m = S.changes.get(spec.key);
    if (!m) {
      if (spec.type === 'move' && ![...S.changes.values()].some((c) => c.type === 'move' && c.parent === spec.parent)) S.base.set(spec.parent, sibsOf(spec.parent)); // базовий порядок батька (для restore.perm)
      m = { ...spec, id: newId(), dirty: false, tries: 0, orig: spec.read(), origSnap: spec.snap(), cur: null, record: null, chain: Promise.resolve(), note: '', timer: 0, shotK: null, parentSel: spec.el.parentElement ? selFor(spec.el.parentElement) : '', elText: (spec.el.innerText || spec.el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 120), elName: label(spec.el) };
      m.cur = m.orig;
      S.changes.set(spec.key, m);
    } else { m.targets = spec.targets; m.scope = spec.scope || m.scope; }
    return m;
  }
  const typeRu = { spacing: 'відступ', size: 'розмір', text: 'текст', move: 'порядок', role: 'роль', span: 'колонки', align: 'вирівнювання', color: 'колір', opacity: 'opacity елемента', hide: 'приховано' };
  const TARGET_RU = { text: 'тексту', background: 'фону', border: 'рамки', icon: 'іконки' };
  function descOf(m) {
    const a = m.orig.label, b = m.cur.label, nm = m.elName.replace(/ «.*»$/, '');
    const grp = m.group === 'gap-all' ? ' (row+column)' : m.group && /-all$/.test(m.group) ? ' (усі боки)' : '';
    switch (m.type) {
      case 'spacing': case 'size': return `${m.prop}${grp} «${nm}»: ${(m.orig.token || a)} → ${(m.cur.token || b)}${m.group && /^dist-/.test(m.group) ? ' (разом з розподілом: space-* → початок)' : ''}`;
      case 'span': return `ширина «${nm}» у сітці: span ${m.orig.span} → span ${m.cur.span} (з ${m.cur.columns} колонок)`;
      case 'text': return `текст «${nm}»: «${m.orig.text.slice(0, 50)}» → «${m.cur.text.slice(0, 50)}»`;
      case 'role': return `роль тексту «${nm}»: ${m.orig.role || '(без ролі)'} → ${m.cur.role || '(без ролі)'}`;
      case 'move': return `порядок у «${m.parentSel.split(' > ').pop()}»: «${nm}» позиція ${m.orig.index + 1} → ${m.cur.index + 1} з ${m.cur.of} (було: ${(m.orig.order || []).join(' · ')} → стало: ${(m.cur.order || []).join(' · ')})${m.cur.tracks && m.cur.tracks !== m.orig.tracks ? `; доріжки: ${m.orig.tracks} → ${m.cur.tracks}` : ''}`;
      case 'color': return `колір ${TARGET_RU[m.target] || ''} «${nm}»: ${m.orig.label} → ${m.cur.label}${m.cur.contrast ? ` · ${m.cur.contrast.text}` : ''}`;
      case 'opacity': return `opacity ВСЬОГО елемента (з дітьми) «${nm}»: ${m.orig.label} → ${m.cur.label}`;
      case 'align': if (/^(align-self|justify-self|flex-grow|flex-basis)$/.test(m.prop)) return `вимкнено розтягування «${nm}»: ${m.prop} ${m.orig.value} → ${m.cur.value} (разом із розміром: ${m.group})`; return m.prop === 'text-align' ? `вирівнювання тексту «${nm}»: ${m.orig.value} → ${m.cur.value}` : `розподіл ${m.prop} «${nm}»: ${m.orig.value} → ${m.cur.value}${m.group && /^dist-/.test(m.group) ? ' (разом з gap)' : ''}`;
      case 'hide': return `прибрати елемент «${nm}»`;
      default: return `${m.type} «${nm}»`;
    }
  }
  function moveSource(m) {
    const tok = m.cur.tracksToken || m.orig.tracksToken, a = m.orig.tracks, b = m.cur.tracks;
    if (m.cur.mode === 'grid' && tok && a && b && a !== b) return `поміняти порядок у розмітці (partial) і порядок доріжок у токені ${tok}: ${a} → ${b}`;
    if (m.cur.mode === 'grid' && a && b && a !== b) return `поміняти порядок у розмітці і порядок grid-template-columns у CSS контейнера: ${a} → ${b}`;
    if (m.cur.mode === 'order') return 'змінити порядок через CSS order дітей flex-контейнера (або порядок у розмітці)';
    return 'поміняти порядок у розмітці (partial)';
  }
  function bodyOf(m) {
    const strip = ({ k, ...rest }) => rest;
    return {
      url: PAGE(), title: document.title, viewport: { w: innerWidth, h: innerHeight }, uPx: unit(),
      selector: selFor(m.el), parentSelector: m.parentSel, elementText: m.elText, type: m.type, prop: m.prop, target: m.target || '', group: m.group || '',
      from: strip(m.orig), to: strip(m.cur), desc: descOf(m), scope: m.scope || '', scopeCount: m.scope ? m.targets.length : 0, note: m.note || '',
      restore: { ...m.restore(), from: m.orig.k },
      ...(m.type === 'move' ? { tracks: { mode: m.cur.mode, before: m.orig.tracks, after: m.cur.tracks, beforeU: m.orig.tracksU, afterU: m.cur.tracksU, token: m.cur.tracksToken || m.orig.tracksToken || null, orderBefore: m.orig.order, orderAfter: m.cur.order }, source: moveSource(m) } : {}),
    };
  }
  const unsyncedN = () => [...S.changes.values()].filter((m) => m.dirty).length;
  function enqueue(m, fn) { m.chain = m.chain.then(fn).catch((e) => { say('Едіт: ' + e.message); }); return m.chain; }
  function syncSoon(m, now = false) {
    clearTimeout(m.timer);
    m.dirty = true; updateBtn();
    const run = () => { m.timer = 0; return enqueue(m, async () => {
      if (S.changes.get(m.key) !== m) return;
      const sent = JSON.stringify(m.cur);
      try {
        m.record = await api('POST', '/edits', { ...bodyOf(m), id: m.record?.id || m.id }); // upsert за id: ідемпотентно, не залежить від порядку POST/PATCH
        if (JSON.stringify(m.cur) === sent && !m.timer) m.dirty = false;
        m.tries = 0;
      } catch (e) {
        if (++m.tries <= 5) m.timer = setTimeout(run, 1500 * m.tries); else say('Едіт: не вдалося зберегти правку (' + e.message + ')');
      }
      renderChanges();
    }); };
    if (now) return run();
    m.timer = setTimeout(run, 150);
  }
  function dropRecord(m) {
    clearTimeout(m.timer);
    S.changes.delete(m.key);
    // користувач сам скасував правку (×, undo до оригіналу, «Скинути все»): видаляємо запис — і чернетку, і надіслану (open), щоб накладка не повернулась після reload.
    // Виконані (done) у S.changes не тримаються, тож не чіпаються.
    return enqueue(m, async () => { const id = m.record?.id || (m.dirty ? m.id : null); if (id && (!m.record || m.record.status === 'draft' || m.record.status === 'open')) { try { await api('DELETE', '/edits/' + id); } catch { /* 404 — вже немає */ } } m.record = null; m.dirty = false; updateBtn(); });
  }
  function afterOp(keys) {
    for (const k of keys) {
      const m = S.changes.get(k); if (!m) continue;
      m.cur = m.read();
      if (m.cur.k === m.orig.k) dropRecord(m); else syncSoon(m);
    }
    renderInfo(); renderChanges(); draw();
  }
  // синхронний «останній шанс» перед вивантаженням сторінки: keepalive-fetch переживає reload/закриття
  function flushBeacon() {
    for (const m of S.changes.values()) {
      if (!m.dirty) continue;
      clearTimeout(m.timer); m.timer = 0;
      try { api('POST', '/edits', { ...bodyOf(m), id: m.record?.id || m.id }, { keepalive: true }).catch(() => {}); } catch { /* */ }
    }
  }
  function flush() {
    for (const m of S.changes.values()) if (m.timer) { clearTimeout(m.timer); m.timer = 0; syncSoon(m, true); }
    return Promise.all([...S.changes.values()].map((m) => m.chain));
  }
  const settle = () => Promise.all([...S.changes.values()].map((m) => m.chain));

  function pushOp(op) {
    S.ops.length = S.ptr; // відкидаємо «redo»-хвіст
    const prev = S.ops[S.ops.length - 1];
    if (prev && op.merge && prev.merge && prev.mergeKey === op.mergeKey && Date.now() - prev.t < CFG.mergeMs) { prev.css = op.css; prev.t = Date.now(); afterOp(op.keys); return; }
    op.t = Date.now(); S.ops.push(op); S.ptr = S.ops.length; afterOp(op.keys);
  }
  function undo() {
    if (!guard() || S.ptr <= 0) return say('Немає що скасовувати');
    const op = S.ops[--S.ptr]; op.specs.forEach(touch); op.undoIt(); afterOp(op.keys);
  }
  function redo() {
    if (!guard() || S.ptr >= S.ops.length) return say('Немає що повторити');
    const op = S.ops[S.ptr++]; op.specs.forEach(touch); op.doIt(); afterOp(op.keys);
  }
  function guard() { if (S.view === 'before') { say('Зараз показано «до» (B) — натисни B, щоб повернутись до правок'); return false; } return true; }
  function toggleView() {
    if (S.editing) return;
    if (S.view === 'after') { for (let i = S.ptr - 1; i >= 0; i--) S.ops[i].undoIt(); S.view = 'before'; say('Показано ДО правок (B — повернути)'); }
    else { for (let i = 0; i < S.ptr; i++) S.ops[i].doIt(); S.view = 'after'; say('Показано ПІСЛЯ правок'); }
    renderInfo(); draw();
  }

  // ---------- розподіл вільного місця, чесні gap, «чому не змінилось» ----------
  const GAPS = ['gap', 'column-gap', 'row-gap'];
  const overlap = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);
  function firstDist(n, axis) {
    const k = kids(n).filter(inflow).map((c) => c.getBoundingClientRect()).filter((q) => q.width > 0 && q.height > 0);
    if (k.length < 2) return null;
    const a = k[0];
    const b = axis === 'x' ? k.find((q) => q !== a && q.left >= a.right - 1 && overlap(a.top, a.bottom, q.top, q.bottom) >= 1) : k.find((q) => q !== a && q.top >= a.bottom - 1 && overlap(a.left, a.right, q.left, q.right) >= 1);
    if (!b) return null;
    return axis === 'x' ? b.left - a.right : b.top - a.bottom;
  }
  // якщо на осі axis проміжок між дітьми — вільне місце (space-*), а не gap: повертає опис, інакше null
  function distInfo(n, axis) {
    const cs = getComputedStyle(n); if (!/flex|grid/.test(cs.display)) return null;
    const grid = cs.display.includes('grid');
    if (!grid && (cs.flexDirection.startsWith('column') ? 'y' : 'x') !== axis) return null;
    const jc = grid ? (axis === 'x' ? cs.justifyContent : cs.alignContent) : cs.justifyContent;
    if (!DIST_RE.test(jc)) return null;
    const dist = firstDist(n, axis); if (dist == null) return null;
    const gap = pxOf(axis === 'x' ? cs.columnGap : cs.rowGap);
    if (dist - gap < 0.5) return null;
    return { axis, grid, jc, dist, gap, gapProp: axis === 'x' ? 'column-gap' : 'row-gap', jcProp: grid && axis === 'y' ? 'align-content' : 'justify-content', start: grid ? 'start' : 'flex-start' };
  }
  const distFor = (n, p) => (p === 'column-gap' ? distInfo(n, 'x') : p === 'row-gap' ? distInfo(n, 'y') : GAPS.includes(p) ? (distInfo(n, 'x') || distInfo(n, 'y')) : null);
  function distToken(info) { let t = null; for (const e of getScale('space')) if (e.px < info.dist - 0.6) t = e; return t || getScale('space')[0]; }
  const distHint = (n, info, noop) => ({ kind: 'dist', info, tok: distToken(info), noop: !!noop });
  function boxes(n) {
    const set = [n, ...kids(n).slice(0, 40)];
    if (n.parentElement) set.push(n.parentElement);
    if (n.nextElementSibling) set.push(n.nextElementSibling);
    if (n.previousElementSibling) set.push(n.previousElementSibling);
    return set.map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  }
  const boxDelta = (a, b) => a.reduce((s, x, i) => s + x.reduce((t, v, j) => t + Math.abs(v - (b[i]?.[j] ?? v)), 0), 0);
  // ---------- хто керує розміром: батько (stretch / flex-grow), власне значення, вміст ----------
  const SIZE_CSS = /^(height|min-height|width|max-width)$/;
  function declaredSize(n, prop) { // значення з таблиць стилів (inline не рахуємо — його ставить Едіт)
    let v = null; eachRule((r) => { if (r.selectorText && r.style.getPropertyValue(prop)) { try { if (n.matches(r.selectorText)) v = r.style.getPropertyValue(prop).trim(); } catch { /* */ } } }); return v;
  }
  function sizeCause(n, css) {
    const par = n.parentElement; if (!par) return null;
    const axis = /height/.test(css) ? 'y' : 'x', main = axis === 'y' ? 'height' : 'width', word = axis === 'y' ? 'висоту' : 'ширину';
    const cs = getComputedStyle(n), pcs = getComputedStyle(par), pn = nameOf(par), decl = declaredSize(n, main), auto = !decl || decl === 'auto';
    const goParent = { a: 'h-parent', label: `Перейти на батька ${pn}` };
    const replaced = /^(IMG|VIDEO|CANVAS|SVG|PICTURE)$/i.test(n.tagName);
    const out = { kind: 'content', source: 'за вмістом', text: '', fix: null, acts: [] };
    const fixTxt = axis === 'y' ? 'висоту' : 'ширину';
    if (pcs.display.includes('flex')) {
      const col = pcs.flexDirection.startsWith('column'), isMain = (axis === 'y') === col;
      if (isMain && parseFloat(cs.flexGrow) > 0) {
        Object.assign(out, { kind: 'grow', source: 'розтягнуто', text: `${word} задає батько ${pn} (flex-grow: ${cs.flexGrow}, flex-basis: ${cs.flexBasis}): елемент займає весь вільний простір flex-${col ? 'колонки' : 'ряду'}, тому inline ${main} не діє`, fix: { props: [['flex-grow', '0'], ['flex-basis', 'auto']] } });
        out.acts = [{ a: 'h-fix', label: `Вимкнути розтягування (flex-grow: 0) і задати ${fixTxt}` }, goParent];
      } else if (!isMain) {
        const as = cs.alignSelf === 'auto' ? pcs.alignItems : cs.alignSelf;
        if (auto && (as === 'normal' || as === 'stretch') && !replaced) { Object.assign(out, { kind: 'stretch', source: 'розтягнуто', text: `${word} задає батько ${pn} (align-items: ${pcs.alignItems}${cs.alignSelf !== 'auto' ? `, align-self: ${cs.alignSelf}` : ''}): елемент розтягується по поперечній осі flex`, fix: { props: [['align-self', 'start']] } }); out.acts = [{ a: 'h-fix', label: `Вимкнути розтягування (align-self: start) і задати ${fixTxt}` }, goParent]; }
      }
    } else if (pcs.display.includes('grid') && !out.fix) {
      const as = axis === 'y' ? (cs.alignSelf === 'auto' ? pcs.alignItems : cs.alignSelf) : (cs.justifySelf === 'auto' ? pcs.justifyItems : cs.justifySelf);
      if (auto && (as === 'normal' || as === 'stretch') && !replaced) {
        const pr = axis === 'y' ? 'align-self' : 'justify-self';
        Object.assign(out, { kind: 'stretch', source: 'розтягнуто', text: `${word} задає батько ${pn} (grid: ${axis === 'y' ? 'align-items' : 'justify-items'}: ${as}${(axis === 'y' ? cs.alignSelf : cs.justifySelf) !== 'auto' ? `, ${pr}: ${axis === 'y' ? cs.alignSelf : cs.justifySelf}` : ''}): елемент розтягується на всю комірку сітки`, fix: { props: [[pr, 'start']] } });
        out.acts = [{ a: 'h-fix', label: `Вимкнути розтягування (${pr}: start) і задати ${fixTxt}` }, goParent];
      }
    }
    if (out.kind === 'content') {
      if (decl && /%$/.test(decl)) { out.kind = 'percent'; out.source = `${decl} батька`; }
      else if (decl && decl !== 'auto') { out.kind = 'fixed'; out.source = `фіксовано (${main}: ${decl.length > 40 ? decl.slice(0, 40) + '…' : decl})`; }
      else if (cs.aspectRatio !== 'auto' && !(/auto/.test(cs.aspectRatio) && !replaced)) { out.kind = 'ratio'; out.source = `за співвідношенням сторін (aspect-ratio: ${cs.aspectRatio})`; }
    }
    if (n.localName === 'textarea' && axis === 'y') out.extra = `textarea: за замовчуванням висота = rows (${n.rows}) × висота рядка + padding; resize: ${cs.resize} дозволяє користувачу тягнути поле; значення height із Едіта перекриває rows, але не flex-grow/stretch батька`;
    if (n.closest('fieldset') && (n.localName === 'fieldset' || n.parentElement.localName === 'fieldset')) out.extra = ((out.extra || '') + ' fieldset: має min-width: min-content і власні правила розкладки — може ігнорувати width/height').trim();
    return out;
  }
  function sizeSourceHtml(n, css) {
    if (!SIZE_CSS.test(css)) return '';
    const c = sizeCause(n, css); if (!c) return '';
    const warn = c.kind === 'grow' || c.kind === 'stretch';
    return `<div class="ed-meta${warn ? ' warn' : ''}">джерело розміру: <b>${esc(c.source)}</b>${warn ? ` — ${esc(c.text.split(' (')[0])}` : ''}${c.acts.length ? `<div class="ed-hacts">${c.acts.map((a) => `<button data-a="${a.a}">${esc(a.label)}</button>`).join('')}</div>` : ''}${c.extra ? `<br><i>${esc(c.extra)}</i>` : ''}</div>`;
  }
  function explain(n, p) {
    const P = PROPS[p], css = P.css[0], cs = getComputedStyle(n), r = [], acts = [];
    const par = n.parentElement, pcs = par ? getComputedStyle(par) : null;
    if (GAPS.includes(p)) {
      const info = distFor(n, p); if (info) return { info };
      const grid = cs.display.includes('grid'), flex = cs.display.includes('flex');
      if (!grid && !flex) r.push('елемент не flex/grid — gap тут не діє');
      if (flex && css === 'row-gap' && !cs.flexDirection.startsWith('column') && cs.flexWrap === 'nowrap') r.push('row-gap у flex-ряду без flex-wrap: один рядок — немає між чим');
      const kk = kids(n).find((c) => { const s = getComputedStyle(c); return (s.minWidth !== 'auto' && s.minWidth !== '0px') || (s.flexBasis !== 'auto' && s.flexBasis !== '0px' && s.flexBasis !== '0%'); });
      if (flex && kk) r.push('діти мають min-width/flex-basis — їхній розмір задано, gap його не змінює');
      if (grid) r.push('grid-доріжки (1fr або фіксовані) задають розмір комірок — gap забирає місце в доріжок, а не зсуває елементи; перевір grid-template-*');
      if (kids(n).length < 2) r.push('усередині менше двох елементів');
    } else if (P.layout) {
      r.push('немає вільного місця для розподілу: діти заповнюють контейнер (flex-grow, 1fr або розмір за вмістом)');
      if (p === 'flex-wrap') r.push('усі діти вміщуються в один рядок');
      if (p === 'align-items') r.push('усі діти однакової висоти або контейнер без запасу по висоті');
    } else if (/^padding-/.test(p)) {
      if (cs.display === 'inline') r.push('inline-елемент: вертикальні padding не впливають на розкладку');
      if (cs.display === 'contents') r.push('display: contents — боксу немає');
      if (kids(n).length && kids(n).every((c) => !inflow(c))) r.push('усі діти поза потоком (absolute/fixed) — padding їх не зсуває');
      r.push('фіксована height/width при border-box: padding забирає місце в вмісту, а не збільшує бокс');
    } else if (/^margin-/.test(p)) {
      if (cs.position === 'absolute' || cs.position === 'fixed') r.push('position: absolute/fixed — margin не зсуває інших');
      if (cs.display === 'inline' && /top|bottom/.test(p)) r.push('inline-елемент: вертикальні margin не діють');
      if (/top|bottom/.test(p) && pcs && !/flex|grid/.test(pcs.display)) {
        const nb = /top/.test(p) ? n.previousElementSibling : n.nextElementSibling;
        if (nb) { const o = pxOf(getComputedStyle(nb)[/top/.test(p) ? 'marginBottom' : 'marginTop']); r.push(`margin collapsing: сусід має margin ${r1(o)}px — з двох діє більший`); }
      }
      if (/auto/.test(cs.marginLeft + cs.marginRight)) r.push('margin: auto поглинає вільне місце');
      if (pcs && /flex|grid/.test(pcs.display) && (pxOf(pcs.columnGap) || pxOf(pcs.rowGap) || DIST_RE.test(pcs.justifyContent))) r.push('батько flex/grid з gap або space-*: відстань між елементами визначають вони, а не margin');
    } else if (P.type === 'size') {
      const sc = SIZE_CSS.test(css) ? sizeCause(n, css) : null;
      if (sc && sc.fix) return { text: sc.text + (sc.extra ? `. ${sc.extra}` : ''), acts: sc.acts, fix: sc.fix };
      const rc = n.getBoundingClientRect();
      if (sc?.extra) r.push(sc.extra);
      if (sc && (sc.kind === 'ratio')) r.push(`розмір керується ${sc.source}`);
      if ((css === 'height' || css === 'min-height') && pxOf(cs.minHeight) > 0 && Math.abs(rc.height - pxOf(cs.minHeight)) < 1) acts.push({ a: 'h-min', label: 'Змінити min-height замість height' });
      if (par && (n.parentElement.localName)) acts.push({ a: 'h-parent', label: `Перейти на батька ${nameOf(par)}` });
      if (css === 'height' || css === 'min-height') { if (pxOf(cs.minHeight) > 0 && Math.abs(rc.height - pxOf(cs.minHeight)) < 1) r.push('min-height тримає висоту'); if (cs.maxHeight !== 'none' && Math.abs(rc.height - pxOf(cs.maxHeight)) < 1) r.push('max-height обрізає висоту'); }
      if (css === 'width' || css === 'max-width') { if (cs.maxWidth !== 'none' && Math.abs(rc.width - pxOf(cs.maxWidth)) < 1) r.push('max-width обмежує ширину'); if (pxOf(cs.minWidth) > 0 && Math.abs(rc.width - pxOf(cs.minWidth)) < 1) r.push('min-width тримає ширину'); if (pcs && pcs.display.includes('flex') && cs.flexBasis !== 'auto') r.push('flex-basis має пріоритет над width'); if (pcs && pcs.display.includes('grid')) r.push('grid-доріжка визначає ширину (1fr/фіксована)'); }
      if (cs.display === 'inline') r.push('inline-елемент ігнорує width/height');
    }
    return { acts, text: r.length ? `${r[0]}${r.length > 1 ? ' (також: ' + r.slice(1).join('; ') + ')' : ''}` : 'причину не визначено автоматично — перевір min-width/flex-basis дітей, grid-доріжки 1fr, padding батька, margin сусіда' };
  }
  // після зміни: чи змінилась фактична геометрія? якщо ні — підказка з причиною
  function checkEffect(n, p, box0, css) {
    if (!box0 || boxDelta(box0, boxes(n)) > 0.3) return;
    const ex = explain(n, p);
    S.hint = ex.info ? distHint(n, ex.info, true) : { kind: 'noop', text: `Зміна не вплинула: ${ex.text}`, acts: ex.acts || [], fix: ex.fix || null, ctx: { n, p, css } };
    renderInfo(); showTip('зміна не вплинула на фактичну відстань/розмір');
  }
  // спроба змінити gap, коли проміжок — розподіл вільного місця: нічого не застосовуємо, пропонуємо перехід
  function gapGuard(n, p, px) {
    if (!GAPS.includes(p)) return false;
    const info = distFor(n, p);
    if (!info || px > info.dist + 0.5) return false;
    S.hint = distHint(n, info); renderInfo(); draw();
    showTip(`${info.jcProp}: ${info.jc} — проміжок ${fmtLen(info.dist)} це вільне місце, не gap`);
    return true;
  }
  // дії з підказки «чому не змінюється»
  function hintFix() {
    const h = S.hint, n = S.el; if (!h?.fix || !n || !guard()) return;
    const c = h.ctx || { n, p: S.prop, css: null }, css = c.css || null, P = PROPS[c.p], cssProp = P.css[0];
    const gid = 'unstretch-' + Math.random().toString(16).slice(2, 8);
    const specs = [...h.fix.props.map(([cp]) => styleSpec(n, [n], propByCss(cp, 'padding-top'), '', gid)), ...(css ? [styleSpec(n, [n], c.p, '', gid)] : [])];
    specs.forEach(touch);
    const before = specs.map((x) => x.snap()), box0 = boxes(n);
    const op = { specs, keys: specs.map((x) => x.key),
      doIt() { h.fix.props.forEach(([cp, v]) => n.style.setProperty(cp, v)); if (css) n.style.setProperty(cssProp, css); },
      undoIt() { specs.forEach((x, i) => x.put(before[i])); } };
    S.hint = null; op.doIt(); pushOp(op);
    if (boxDelta(box0, boxes(n)) > 0.3) {
      S.hint = { kind: 'ok', text: `Готово: ${h.fix.props.map(([a, b2]) => `${a}: ${b2}`).join(', ')}${css ? `, ${cssProp} = ${css.replace(/^var\((.*)\)$/, '$1')}` : ''}. Далі ${cssProp} змінюється кроками шкали.` };
    } else { const ex = explain(n, c.p); S.hint = { kind: 'noop', text: `Зміна все ще не вплинула: ${ex.text}`, acts: ex.acts || [], fix: ex.fix || null, ctx: c }; }
    renderInfo(); draw();
  }
  function hintMin() {
    const h = S.hint, n = S.el; if (!n || !guard()) return;
    const css = h?.ctx?.css, hm = S.changes.get(keyOf(n, 'height'));
    if (hm) revertChange(hm);
    S.prop = /^width|max-width/.test(S.prop) ? 'max-width' : 'min-height'; S.hint = null;
    if (css) applyStyle(n, S.prop, css, false); else renderInfo();
  }
  function distFix(n) {
    if (!n || !guard()) return;
    const info = distInfo(n, S.hint?.info?.axis || 'x') || distInfo(n, 'y'); if (!info) return say('Розподіл уже не space-*');
    const tok = distToken(info), gid = 'dist-' + Math.random().toString(16).slice(2, 8);
    const A = styleSpec(n, [n], info.jcProp, '', gid), B = styleSpec(n, [n], info.gapProp, '', gid);
    touch(A); touch(B);
    const bA = A.snap(), bB = B.snap();
    const op = { specs: [A, B], keys: [A.key, B.key],
      doIt() { n.style.setProperty(info.jcProp, info.start); n.style.setProperty(info.gapProp, tok.css); },
      undoIt() { A.put(bA); B.put(bB); } };
    S.hint = null; op.doIt(); pushOp(op);
    const now = firstDist(n, info.axis);
    S.hint = { kind: 'ok', text: `Готово: ${info.jcProp} ${info.jc} → ${info.start}, ${info.gapProp} = ${tok.name} · ${fmtU(tok.px)}. Фактична відстань між дітьми: ${now == null ? '—' : `${fmtLen(now)} · ${fmtU(now)}`} (було ${fmtLen(info.dist)}). Далі gap зменшується кроками шкали.` };
    S.prop = info.gapProp; renderInfo(); draw();
  }
  const LAY_VALS = {
    'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
    'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
  };
  function layoutRows(n) {
    const cs = getComputedStyle(n); if (!/flex|grid/.test(cs.display)) return '';
    const grid = cs.display.includes('grid');
    const pos = grid ? ['start', 'center', 'end'] : ['flex-start', 'center', 'flex-end'];
    const dist = ['space-between', 'space-around', 'space-evenly'];
    const rows = grid
      ? [['justify-content', [...pos, ...dist, 'stretch']], ['justify-items', [...pos, 'stretch']], ['align-items', [...pos, 'stretch']]]
      : [['flex-direction', LAY_VALS['flex-direction']], ['flex-wrap', LAY_VALS['flex-wrap']], ['justify-content', [...pos, ...dist]], ['align-items', [...pos, 'stretch', 'baseline']]];
    return `<div class="ed-lay"><em>Розподіл</em>${rows.map(([prop, vals]) => {
      const cur = cs.getPropertyValue(prop).trim(), list = vals.includes(cur) ? vals : [cur, ...vals];
      return `<label><span>${prop}</span><select data-lay="${prop}">${list.map((v) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`;
    }).join('')}</div>`;
  }
  function hintHtml() {
    const h = S.hint; if (!h || !S.el) return '';
    if (h.kind === 'dist') {
      const i = h.info;
      return `<div class="ed-warn"><b>${h.noop ? 'Зміна не вплинула: ' : ''}це не gap, а розподіл вільного місця.</b> ${esc(i.jcProp)}: <code>${esc(i.jc)}</code> розтягує проміжок між дітьми до ${fmtLen(i.dist)} · ${fmtU(i.dist)}; ${esc(i.gapProp)} — лише мінімум (зараз ${fmtLen(i.gap)}), тому нижче цієї відстані його зменшити неможливо.<button data-a="distfix">Перейти на початок (${esc(i.start)}) + ${esc(i.gapProp)} = ${esc(h.tok.name)} · ${fmtU(h.tok.px)}</button></div>`;
    }
    return `<div class="ed-warn${h.kind === 'ok' ? ' ok' : ''}">${esc(h.text)}${(h.acts || []).map((a) => `<button data-a="${a.a}">${esc(a.label)}</button>`).join('')}</div>`;
  }

  // ---------- застосування змін ----------
  const propsFor = (p, all, n) => { const P = PROPS[p]; return p === 'color-icon' && n ? [cssFor(n, p)] : all && P.all ? P.all : P.css; };
  function beginStyle(n, p, all) {
    const P = PROPS[p], props = propsFor(p, all, n);
    const { targets, scope } = scopeFor(n, P.type, p);
    const group = all && P.all ? `${P.group}-all` : (p === 'gap' ? 'gap-all' : '');
    const specs = props.map((css) => { return styleSpec(n, targets, P.type === 'color' || P.type === 'opacity' ? p : propByCss(css, p), scope, group); });
    specs.forEach(touch);
    const before = specs.map((s) => s.snap());
    const set = (css) => { for (const t of targets) for (const c of props) t.style.setProperty(c, css); };
    return {
      specs, keys: specs.map((s) => s.key), set,
      finish(css) {
        const op = { specs, keys: this.keys, merge: true, mergeKey: this.keys.join('+'), css,
          doIt() { set(this.css); }, undoIt() { specs.forEach((s, i) => s.put(before[i])); } };
        pushOp(op);
      },
    };
  }
  function applyStyle(n, p, css, all) {
    if (!guard()) return;
    const P = PROPS[p], watch = P.type === 'spacing' || P.type === 'size' || P.layout, box0 = watch ? boxes(n) : null;
    S.hint = null;
    const g = beginStyle(n, p, all); g.set(css); g.finish(css);
    if (watch) checkEffect(n, p, box0, css);
  }
  function baseOf(n, p) {
    const P = PROPS[p];
    const { px, set } = readLen(n, P.css[0]);
    if (set) return px;
    const r = n.getBoundingClientRect(); return P.css[0].includes('height') ? r.height : r.width;
  }
  function stepProp(dir, n) {
    const el = S.el; if (!el || !guard()) return;
    const P = PROPS[S.prop];
    if (P.type === 'move') return say('Позиція: Alt+←↑→↓ або кнопки «поміняти з…» (у режимі M — голі стрілки)');
    if (P.type === 'role') return cycleRole(dir);
    if (P.type === 'span') { const { span, columns } = spanOf(el); return setSpan(el, Math.min(columns, Math.max(1, span + dir * n))); }
    if (P.type === 'color') return n > 1 ? stepAlpha(dir) : stepColor(dir, 1); // Shift+стрілка (або PageUp/PageDown) — прозорість кольору
    if (P.type === 'opacity') return stepOpacity(dir);
    if (P.type === 'align') return say('Вирівнювання — вибір у панелі');
    if (!available(S.prop)) return say('Для цього елемента ця властивість недоступна');
    S.hint = null;
    const e = stepOn(P.scale, baseOf(el, S.prop), dir, n);
    if (!e) return;
    if (gapGuard(el, S.prop, e.px)) return;
    applyStyle(el, S.prop, e.css, S.all);
    showTip(`${S.prop}${S.all && P.all ? ' (усі боки)' : ''} → ${e.name} · ${fmtU(e.px)} · ${fmtLen(e.px)}`);
  }
  function setSpan(n, N) {
    if (!guard()) return;
    const spec = styleSpec(n, [n], 'span', '', ''); touch(spec);
    const before = spec.snap();
    const op = { specs: [spec], keys: [spec.key], merge: true, mergeKey: spec.key, css: `span ${N}`,
      doIt() { n.style.setProperty('grid-column-end', this.css); }, undoIt() { spec.put(before); } };
    op.doIt(); pushOp(op);
    showTip(`колонки: span ${N}${spanTokens(N).length ? ' · ' + spanTokens(N)[0] : ''}`);
  }
  function setRole(n, role) {
    if (!guard()) return;
    const { targets, scope } = scopeFor(n, 'role');
    const spec = roleSpec(n, targets, scope); touch(spec);
    const before = spec.snap();
    const op = { specs: [spec], keys: [spec.key], doIt() { spec.put(targets.map(() => role)); }, undoIt() { spec.put(before); } };
    op.doIt(); pushOp(op);
  }
  function getRoles() {
    const re = new RegExp(CFG.roles), set = new Set();
    const walk = (rules) => { for (const r of rules) { if (r.selectorText) for (const s of r.selectorText.split(',')) if (re.test(s.trim())) set.add(s.trim().slice(1)); if (r.cssRules) walk(r.cssRules); } };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch { /* cross-origin */ } }
    return [...set];
  }
  function cycleRole(dir) {
    const roles = getRoles(), cur = roleOf(S.el), i = roles.indexOf(cur);
    setRole(S.el, roles[(i + dir + roles.length) % roles.length]);
  }
  // ---- колір / прозорість кольору (alpha) / opacity елемента: лише токени системи ----
  const palIndex = (cur) => getPalette().findIndex((e) => cur.token === e.name || e.aliases.includes(cur.token));
  const TOKEN_CSS = /^(var\(--color-[\w-]+\)|color-mix\(in srgb, var\(--color-[\w-]+\) [\d.]+%, transparent\))$/;
  function colorApply(n, p, tok, pct) {
    const css = mixCss(tok, pct);
    if (!TOKEN_CSS.test(css)) { say('Едіт: колір не з токенів системи — відхилено'); return false; }
    applyStyle(n, p, css, false);
    const P = PROPS[p], ent = getPalette().find((e) => e.name === tok), c = P.target === 'text' || P.target === 'background' ? contrastInfo(n) : null;
    S.cand = tok;
    showTip(`${P.chip}: ${tok}${ent ? ' · ' + toHex(ent.rgb) : ''}${pct < 99.95 ? ` · ${pct}%` : ''}${c ? ` · ${c.ratio}:1 ${c.pass ? 'AA ✓' : 'нижче AA'}` : ''}`);
    return true;
  }
  function setColor(n, p, entry) { // зберігає поточну прозорість кольору
    // позитивний контроль: приймається лише запис палітри токенів (--color-*); довільний hex/rgb/назва відхиляється
    if (!entry || !getPalette().some((e) => e.name === entry.name)) { say('Едіт: колір не з токенів системи — відхилено'); return false; }
    const cur = readStyle(n, p);
    return colorApply(n, p, entry.name, entry.rgb[3] < 1 ? 100 : cur.token ? cur.alphaPct : 100);
  }
  function setColorToken(n, p, name, pct) { // API для тестів/клавіатури: лише ім'я токена з палітри; pct — опційна прозорість (лише крок із getAlphaSteps)
    const ent = getPalette().find((e) => e.name === name || e.aliases.includes(name));
    if (!ent) { say('Едіт: колір не з токенів системи — відхилено'); return false; }
    if (!guard()) return false;
    if (pct != null && !alphaStepOf(pct)) { say('Едіт: прозорість не з кроків системи — відхилено'); return false; }
    if (pct == null) return setColor(n, p, ent);
    return colorApply(n, p, ent.name, alphaStepOf(pct).pct);
  }
  function setAlpha(n, p, step) {
    if (!step || !getAlphaSteps().some((x) => x.pct === step.pct)) { say('Едіт: прозорість не з кроків системи — відхилено'); return false; }
    if (!guard()) return false;
    const cur = readStyle(n, p);
    if (!cur.token) { say('Спершу оберіть токен кольору — прозорість додається до токена'); return false; }
    return colorApply(n, p, getPalette().find((e) => e.name === cur.token || e.aliases.includes(cur.token))?.name || cur.token, step.pct);
  }
  function setAlphaPct(n, p, pct) { const st = alphaStepOf(pct); if (!st) { say('Едіт: прозорість не з кроків системи — відхилено'); return false; } return setAlpha(n, p, st); }
  function stepColor(dir, n) {
    const pal = getPalette(); if (!pal.length) return;
    const cur = readStyle(S.el, S.prop), i = palIndex(cur);
    const j = i < 0 ? (dir > 0 ? 0 : pal.length - 1) : (i + dir * n + pal.length * 10) % pal.length;
    setColor(S.el, S.prop, pal[j]);
  }
  function stepAlpha(dir) { // dir>0 — менш прозоро
    const cur = readStyle(S.el, S.prop), l = getAlphaSteps().slice().sort((a, b) => a.pct - b.pct);
    const cand = dir > 0 ? l.find((x) => x.pct > cur.alphaPct + 0.05) : [...l].reverse().find((x) => x.pct < cur.alphaPct - 0.05);
    if (!cand) return say(dir > 0 ? 'Вже без прозорості (100%)' : 'Нижче — немає кроку прозорості');
    setAlpha(S.el, S.prop, cand);
  }
  function setOpacity(n, e) {
    if (!e || !getOpacities().some((x) => x.name === e.name)) { say('Едіт: прозорість не з токенів системи — відхилено'); return false; }
    applyStyle(n, 'opacity', e.css, false); S.cand = e.name;
    showTip(`opacity елемента (разом з дітьми): ${e.plain ? '1 (без прозорості)' : `${e.name} · ${e.value}`}`);
    return true;
  }
  function setOpacityToken(n, name) {
    const e = getOpacities().find((x) => x.name === name || x.aliases.includes(name));
    if (!e) { say('Едіт: прозорість не з токенів системи — відхилено'); return false; }
    if (!guard()) return false;
    return setOpacity(n, e);
  }
  function stepOpacity(dir) {
    const l = getOpacities(), v = r2(parseFloat(getComputedStyle(S.el).opacity));
    const cand = dir > 0 ? l.find((e) => e.value > v + 0.0049) : [...l].reverse().find((e) => e.value < v - 0.0049);
    if (!cand) return say(dir > 0 ? 'Вже без прозорості (1)' : 'Нижче — немає токена прозорості');
    setOpacity(S.el, cand);
  }
  function confirmColor() { // Enter: застосувати вибраний токен (кандидат — з панелі/стрілок) і підтвердити
    if (!S.el || !guard()) return;
    const P = PROPS[S.prop];
    if (P.type === 'color') {
      const cur = readStyle(S.el, S.prop), ent = getPalette().find((e) => e.name === S.cand) || getPalette()[palIndex(cur)];
      if (!ent) return say('Оберіть токен кольору (стрілки або клік)');
      if (cur.token !== ent.name && !ent.aliases.includes(cur.token)) setColor(S.el, S.prop, ent);
      say(`Застосовано: ${P.chip} = ${ent.name}${readStyle(S.el, S.prop).alphaPct < 99.95 ? ` · ${readStyle(S.el, S.prop).alphaPct}%` : ''}`);
    } else {
      const cur = readStyle(S.el, S.prop), ent = getOpacities().find((e) => e.name === S.cand) || opToken(cur.value);
      if (!ent) return say('Оберіть крок прозорості (стрілки або клік)');
      if (r2(parseFloat(getComputedStyle(S.el).opacity)) !== ent.value) setOpacity(S.el, ent);
      say(`Застосовано: opacity елемента = ${ent.plain ? '1' : ent.name}`);
    }
  }
  function doMove(n, ref) { // ref — елемент, ПЕРЕД яким вставити n (null — в кінець)
    if (!guard() || !n.parentElement) return;
    const list = ordered(n.parentElement).filter((k) => k !== n), at = ref ? list.indexOf(ref) : list.length;
    list.splice(at < 0 ? list.length : at, 0, n);
    commitMove(n, list);
  }
  function hideEl(n) {
    if (!guard()) return;
    const spec = hideSpec(n); touch(spec); const before = spec.snap();
    const op = { specs: [spec], keys: [spec.key], doIt() { n.style.setProperty('display', 'none', 'important'); }, undoIt() { spec.put(before); } };
    op.doIt(); pushOp(op);
    S.el = null; renderInfo(); draw();
  }
  function resetProp(n, p) {
    // повернути вихідне значення для вибраної властивості (як окрема правка, її можна скасувати)
    const P = PROPS[p]; const m = S.changes.get(keyOf(n, p === 'color-icon' ? 'icon-' + cssFor(n, p) : P.css ? cssFor(n, p) : p));
    if (!m) return say('Немає правки для цього значення');
    revertChange(m);
  }
  function revertChange(m) {
    if (!guard()) return;
    const cur = m.snap(), orig = m.origSnap, specs = [m];
    const op = { specs, keys: [m.key], doIt() { m.put(orig); }, undoIt() { m.put(cur); } };
    op.doIt(); pushOp(op);
  }
  function revertAllDom(ms) { for (const m of [...ms].reverse()) { try { m.put(m.origSnap); } catch { /* елемент зник */ } } S.ops = []; S.ptr = 0; }
  // «Скинути все»: повертає preview до оригіналу; з файлу видаляються лише ЧЕРНЕТКИ (open/done лишаються)
  function resetAll() {
    if (!guard()) return;
    const ms = [...S.changes.values()];
    if (!ms.length) return say('Правок немає');
    revertAllDom(ms);
    for (const m of ms) { m.cur = m.read(); dropRecord(m); }
    S.changes.clear(); S.base.clear(); S.hint = null; S.confirm = null;
    renderInfo(); renderChanges(); draw(); say(`Скинуто правок: ${ms.length}`);
  }
  // «Скасувати останню»: крок undo; після reload (історії операцій нема) — повертає найновішу правку зі списку
  function undoLast() {
    if (!guard()) return;
    if (S.ptr > 0) return undo();
    const ms = [...S.changes.values()]; if (!ms.length) return say('Немає що скасовувати');
    revertChange(ms[ms.length - 1]);
  }
  // «Очистити чернетки»: preview повертається до оригіналу для чернеток, у файлі видаляються ЛИШЕ draft (open/done не чіпаємо)
  async function clearDrafts() {
    if (!guard()) return;
    const ms = [...S.changes.values()].filter((m) => !m.record || m.record.status === 'draft');
    await settle();
    revertAllDom(ms);
    for (const m of ms) { clearTimeout(m.timer); m.timer = 0; m.dirty = false; S.changes.delete(m.key); }
    let n = 0; try { n = (await api('POST', '/edits/clear-drafts', { url: PAGE() })).removed.length; } catch (e) { say('Едіт: ' + e.message); }
    S.parked = 0; S.confirm = null; S.hint = null; if (!S.changes.size) S.base.clear();
    renderInfo(); renderChanges(); draw(); say(`Чернеток видалено: ${n} (надіслані й виконані не чіпали)`);
  }

  // ---------- редагування тексту ----------
  function startText(n) {
    if (!guard() || S.editing) return;
    if (!hasOwnText(n) && !n.textContent.trim()) return say('У цього елемента немає тексту — вибери текстовий елемент');
    if ([...n.children].some((c) => c.localName !== 'br')) return say('Всередині є вкладені елементи — вибери конкретний текстовий вузол (стрілка [ / ])');
    const spec = textSpec(n); touch(spec);
    const orig = n.textContent;
    S.editing = { el: n, orig, spec };
    wrap.classList.add('editing'); hoverBox.style.display = 'none';
    n.setAttribute('contenteditable', 'plaintext-only');
    n.focus({ preventScroll: true });
    const rg = document.createRange(); rg.selectNodeContents(n); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg);
    showTip('Редагування тексту: Enter — застосувати, Esc — скасувати', true);
  }
  function endText(commit) {
    const ed = S.editing; if (!ed) return;
    const n = ed.el; S.editing = null;
    n.removeAttribute('contenteditable'); getSelection().removeAllRanges();
    wrap.classList.remove('editing'); tip.style.display = 'none';
    const next = n.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    const m = S.changes.get(ed.spec.key);
    if (!commit || next === ed.orig.replace(/\s+/g, ' ').trim()) {
      n.textContent = ed.orig;
      if (m && m.cur.k === m.orig.k) dropRecord(m);
      renderChanges(); draw(); persistSoon(); maybeRelease(); return;
    }
    n.textContent = next;
    const before = ed.orig;
    pushOp({ specs: [ed.spec], keys: [ed.spec.key], doIt() { n.textContent = next; }, undoIt() { n.textContent = before; } });
    persistSoon(); maybeRelease();
  }

  // ---------- вибір, навігація ----------
  function select(n) {
    S.el = n && n.isConnected ? n : null; S.hint = null; S.cand = null;
    if (S.el && !available(S.prop)) S.prop = PROPS[S.prop]?.type === 'color' ? 'color-text' : 'padding-top';
    renderInfo(); draw();
  }
  function available(p) {
    const n = S.el, P = PROPS[p]; if (!n || !P) return false;
    if (P.needs === 'fg') return isFG(n);
    if (P.needs === 'gi') return !!n.parentElement && isGridItem(n);
    if (P.needs === 'border') return hasBorder(n);
    if (P.needs === 'icon') return !!iconCss(n);
    return true;
  }
  const kids = (n) => [...n.children].filter((c) => !SKIP.has(c.tagName) && !excluded(c));
  function nav(kind) {
    const n = S.el; if (!n) return;
    let t = null;
    if (kind === 'up') t = n.parentElement && n.parentElement !== document.documentElement ? n.parentElement : null;
    if (kind === 'down') t = kids(n)[0] || null;
    if (kind === 'next' || kind === 'prev') { const sib = kids(n.parentElement || document.body); const i = sib.indexOf(n); t = sib[i + (kind === 'next' ? 1 : -1)] || null; }
    if (t) select(t);
  }

  // ---------- рисування хендлів ----------
  const place = (n, r) => { n.style.left = r.x + 'px'; n.style.top = r.y + 'px'; n.style.width = r.w + 'px'; n.style.height = r.h + 'px'; };
  function buildHandles(n, r, cs) {
    const hs = [];
    const pad = { top: pxOf(cs.paddingTop), right: pxOf(cs.paddingRight), bottom: pxOf(cs.paddingBottom), left: pxOf(cs.paddingLeft) };
    const mar = { top: pxOf(cs.marginTop), right: pxOf(cs.marginRight), bottom: pxOf(cs.marginBottom), left: pxOf(cs.marginLeft) };
    const bw = { top: pxOf(cs.borderTopWidth), right: pxOf(cs.borderRightWidth), bottom: pxOf(cs.borderBottomWidth), left: pxOf(cs.borderLeftWidth) };
    const ix = r.left + bw.left, iy = r.top + bw.top, iw = r.width - bw.left - bw.right, ih = r.height - bw.top - bw.bottom;
    // padding (зелений): хендл на внутрішній межі смуги, 35% довжини
    hs.push({ prop: 'padding-top', cls: 'pad', band: { x: ix, y: iy, w: iw, h: pad.top }, g: { x: ix + iw * 0.35, y: iy + pad.top, hz: true }, sgn: [0, 1] });
    hs.push({ prop: 'padding-bottom', cls: 'pad', band: { x: ix, y: iy + ih - pad.bottom, w: iw, h: pad.bottom }, g: { x: ix + iw * 0.35, y: iy + ih - pad.bottom, hz: true }, sgn: [0, -1] });
    hs.push({ prop: 'padding-left', cls: 'pad', band: { x: ix, y: iy + pad.top, w: pad.left, h: ih - pad.top - pad.bottom }, g: { x: ix + pad.left, y: iy + ih * 0.35, hz: false }, sgn: [1, 0] });
    hs.push({ prop: 'padding-right', cls: 'pad', band: { x: ix + iw - pad.right, y: iy + pad.top, w: pad.right, h: ih - pad.top - pad.bottom }, g: { x: ix + iw - pad.right, y: iy + ih * 0.35, hz: false }, sgn: [-1, 0] });
    // margin (фіолетовий): хендл на зовнішній межі, 65% довжини
    hs.push({ prop: 'margin-top', cls: 'mar', band: { x: r.left, y: r.top - Math.max(mar.top, 0), w: r.width, h: Math.max(mar.top, 0) }, g: { x: r.left + r.width * 0.65, y: r.top - Math.max(mar.top, 0), hz: true }, sgn: [0, -1] });
    hs.push({ prop: 'margin-bottom', cls: 'mar', band: { x: r.left, y: r.bottom, w: r.width, h: Math.max(mar.bottom, 0) }, g: { x: r.left + r.width * 0.65, y: r.bottom + Math.max(mar.bottom, 0), hz: true }, sgn: [0, 1] });
    hs.push({ prop: 'margin-left', cls: 'mar', band: { x: r.left - Math.max(mar.left, 0), y: r.top, w: Math.max(mar.left, 0), h: r.height }, g: { x: r.left - Math.max(mar.left, 0), y: r.top + r.height * 0.65, hz: false }, sgn: [-1, 0] });
    hs.push({ prop: 'margin-right', cls: 'mar', band: { x: r.right, y: r.top, w: Math.max(mar.right, 0), h: r.height }, g: { x: r.right + Math.max(mar.right, 0), y: r.top + r.height * 0.65, hz: false }, sgn: [1, 0] });
    // розмір
    hs.push({ prop: 'height', cls: 'size', g: { x: r.left + r.width * 0.5, y: r.bottom, sq: true }, sgn: [0, 1] });
    hs.push({ prop: isGridItem(n) ? 'span' : 'width', cls: 'size', g: { x: r.right, y: r.top + r.height * 0.5, sq: true }, sgn: [1, 0] });
    // gap контейнера
    if (isFG(n)) {
      const k = kids(n).filter(inflow).map((c) => c.getBoundingClientRect()).filter((q) => q.width > 0 && q.height > 0);
      if (k.length >= 2) {
        const a = k[0];
        const right = k.find((q) => q !== a && q.left >= a.right - 1 && Math.min(a.bottom, q.bottom) - Math.max(a.top, q.top) >= 1);
        const below = k.find((q) => q !== a && q.top >= a.bottom - 1 && Math.min(a.right, q.right) - Math.max(a.left, q.left) >= 1);
        const dX = distInfo(n, 'x'), dY = distInfo(n, 'y');
        if (right) hs.push({ prop: 'column-gap', cls: dX ? 'gap dist' : 'gap', dist: dX, band: { x: a.right, y: Math.max(a.top, right.top), w: right.left - a.right, h: Math.min(a.bottom, right.bottom) - Math.max(a.top, right.top) }, g: { x: (a.right + right.left) / 2, y: (Math.max(a.top, right.top) + Math.min(a.bottom, right.bottom)) / 2, hz: false }, sgn: [1, 0] });
        if (below) hs.push({ prop: 'row-gap', cls: dY ? 'gap dist' : 'gap', dist: dY, band: { x: Math.max(a.left, below.left), y: a.bottom, w: Math.min(a.right, below.right) - Math.max(a.left, below.left), h: below.top - a.bottom }, g: { x: (Math.max(a.left, below.left) + Math.min(a.right, below.right)) / 2, y: (a.bottom + below.top) / 2, hz: true }, sgn: [0, 1] });
      }
    }
    if (n.parentElement && n.parentElement !== document.documentElement) hs.push({ prop: 'move', cls: 'move', g: { x: r.left, y: r.top, mv: true }, sgn: [0, 0] });
    return hs;
  }
  function draw() {
    if (!S.on) return;
    const n = S.el;
    if (!n || !n.isConnected) { selBox.style.display = 'none'; zones.innerHTML = ''; handles = []; return; }
    const r = n.getBoundingClientRect(), cs = getComputedStyle(n);
    place(selBox, { x: r.left, y: r.top, w: r.width, h: r.height }); selBox.style.display = 'block';
    if (S.view === 'before' || S.editing) { zones.innerHTML = ''; handles = []; return; }
    handles = buildHandles(n, r, cs);
    const vw = document.documentElement.clientWidth, vh = innerHeight;
    const clampX = (x) => Math.min(Math.max(x, 6), vw - 6), clampY = (y) => Math.min(Math.max(y, 6), vh - 6);
    let html = '';
    handles.forEach((h, i) => {
      if (h.band && h.band.w > 0 && h.band.h > 0) html += `<i class="ed-band ${h.cls}${S.prop === h.prop ? ' act' : ''}" style="left:${h.band.x}px;top:${h.band.y}px;width:${h.band.w}px;height:${h.band.h}px"></i>`;
      const g = h.g, w = g.mv ? 18 : g.sq ? 11 : g.hz ? 24 : 9, hh = g.mv ? 18 : g.sq ? 11 : g.hz ? 9 : 24;
      const ttl = g.mv ? 'Перетягни, щоб змінити місце серед сусідів' : h.dist ? `розподіл вільного місця — не gap (${h.dist.jcProp}: ${h.dist.jc}), фактично ${fmtLen(h.dist.dist)}` : h.prop;
      html += `<b class="ed-grip ${h.cls}${S.prop === h.prop ? ' act' : ''}" data-h="${i}" title="${esc(ttl)}" style="left:${clampX(g.x) - w / 2}px;top:${clampY(g.y) - hh / 2}px;width:${w}px;height:${hh}px">${g.mv ? '⠿' : h.dist ? '≈' : ''}</b>`;
      if (h.dist) html += `<u class="ed-dl" style="left:${Math.min(Math.max(clampX(g.x), 120), vw - 120)}px;top:${clampY(g.y) + (g.hz ? 14 : -24)}px">розподіл, не gap · ${fmtLen(h.dist.dist)} · ${fmtU(h.dist.dist)}</u>`;
    });
    zones.innerHTML = html;
  }
  function showTip(text, sticky) {
    tip.textContent = text; tip.style.display = 'block';
    const r = S.el?.getBoundingClientRect();
    tip.style.left = Math.min(Math.max(8, (r?.left ?? 20)), innerWidth - 360) + 'px';
    tip.style.top = Math.max(8, (r?.top ?? 40) - 30) + 'px';
    clearTimeout(showTip.t); if (!sticky) showTip.t = setTimeout(() => { tip.style.display = 'none'; }, 1800);
  }

  // ---------- мишка ----------
  const onWin = (ev, fn) => { window.addEventListener(ev, fn, true); return () => window.removeEventListener(ev, fn, true); };
  cap.addEventListener('mousedown', (e) => { if (e.button !== 0) return; e.preventDefault(); });
  cap.addEventListener('click', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const n = pickAt(e.clientX, e.clientY); if (!n) return;
    select(usable(n));
  });
  cap.addEventListener('dblclick', (e) => {
    const n = pickAt(e.clientX, e.clientY); if (!n) return;
    select(usable(n)); startText(S.el);
  });
  cap.addEventListener('mousemove', (e) => {
    const n = pickAt(e.clientX, e.clientY);
    if (!n) { hoverBox.style.display = 'none'; return; }
    const r = n.getBoundingClientRect(); place(hoverBox, { x: r.left, y: r.top, w: r.width, h: r.height }); hoverBox.style.display = 'block';
  });
  cap.addEventListener('mouseleave', () => { hoverBox.style.display = 'none'; });
  zones.addEventListener('mousedown', (e) => {
    const g = e.target.closest?.('[data-h]'); if (!g || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const h = handles[+g.dataset.h]; if (!h) return;
    if (!guard()) return;
    if (h.prop === 'move') return startMoveDrag(h, e);
    S.prop = h.prop;
    if (h.dist) { S.hint = distHint(S.el, h.dist); renderInfo(); draw(); return; }
    renderInfo();
    startDrag(h, e);
  });
  function startDrag(h, e) {
    const n = S.el, P = PROPS[h.prop], all = e.altKey || S.all;
    if (!available(h.prop)) return say('Для цього елемента ця властивість недоступна');
    const isSpan = P.type === 'span';
    let g = null, spanSpec = null, spanBefore = null, cols = null, colPx = 0;
    if (isSpan) {
      spanSpec = styleSpec(n, [n], 'span', '', ''); touch(spanSpec); spanBefore = spanSpec.snap(); // orig фіксуємо ДО першої зміни
      cols = spanOf(n); const c = gridCols(n.parentElement); colPx = c.reduce((a, b) => a + b, 0) / c.length + pxOf(getComputedStyle(n.parentElement).columnGap);
    } else g = beginStyle(n, h.prop, all);
    const box0 = isSpan ? null : boxes(n); S.hint = null;
    const base = isSpan ? cols.span : baseOf(n, h.prop);
    S.drag = { h, x0: e.clientX, y0: e.clientY, last: null };
    document.body.style.userSelect = 'none';
    const off = [
      onWin('mousemove', (ev) => {
        const d = (ev.clientX - S.drag.x0) * h.sgn[0] + (ev.clientY - S.drag.y0) * h.sgn[1];
        if (isSpan) {
          const N = Math.min(cols.columns, Math.max(1, Math.round(base + d / colPx)));
          if (N !== S.drag.last) { S.drag.last = N; n.style.setProperty('grid-column-end', `span ${N}`); showTip(`колонки: span ${N} з ${cols.columns}${spanTokens(N).length ? ' · ' + spanTokens(N)[0] : ''}`, true); draw(); }
          return;
        }
        const e2 = snapTo(P.scale, Math.max(0, base + d));
        if (P.scale === 'size' && e2.px <= 0) return;
        if (e2.css !== S.drag.last) { S.drag.last = e2.css; g.set(e2.css); showTip(`${h.prop}${all && P.all ? ' (усі боки)' : ''} → ${e2.name} · ${fmtU(e2.px)} · ${fmtLen(e2.px)}`, true); draw(); }
      }),
      onWin('mouseup', () => {
        off.forEach((f) => f());
        document.body.style.userSelect = '';
        const last = S.drag.last; S.drag = null; tip.style.display = 'none'; setTimeout(maybeRelease, 0);
        if (last == null) { if (isSpan) dropIfNoop(spanSpec); else g.keys.forEach((k) => { const m = S.changes.get(k); if (m && m.cur.k === m.orig.k) dropRecord(m); }); return; }
        if (isSpan) { const cssv = `span ${last}`; pushOp({ specs: [spanSpec], keys: [spanSpec.key], css: cssv, doIt() { n.style.setProperty('grid-column-end', cssv); }, undoIt() { spanSpec.put(spanBefore); } }); return; }
        g.finish(last); checkEffect(n, h.prop, box0, last);
      }),
    ];
  }
  function dropIfNoop(spec) { const m = S.changes.get(spec.key); if (m && m.read().k === m.orig.k) dropRecord(m); }
  function startMoveDrag(h, e) {
    const n = S.el, par = n.parentElement; let tgt = null, after = false;
    const off = [
      onWin('mousemove', (ev) => {
        document.body.style.userSelect = 'none';
        let c = null;
        for (const x of document.elementsFromPoint(ev.clientX, ev.clientY)) {
          if (x === host || host.contains(x)) continue;
          let a = x; while (a && a.parentElement !== par) a = a.parentElement;
          if (a && a !== n && !SKIP.has(a.tagName)) { c = a; break; }
        }
        tgt = c; if (!c) { ind.style.display = 'none'; return; }
        const sr = c.getBoundingClientRect(), er = n.getBoundingClientRect();
        const row = Math.min(sr.bottom, er.bottom) - Math.max(sr.top, er.top) > 0.3 * Math.min(sr.height, er.height);
        after = row ? ev.clientX > sr.left + sr.width / 2 : ev.clientY > sr.top + sr.height / 2;
        ind.style.display = 'block';
        if (row) place(ind, { x: (after ? sr.right : sr.left) - 2, y: sr.top, w: 4, h: sr.height }); else place(ind, { x: sr.left, y: (after ? sr.bottom : sr.top) - 2, w: sr.width, h: 4 });
        showTip(`вставити ${after ? 'після' : 'перед'} «${label(c).slice(0, 40)}»`, true);
      }),
      onWin('mouseup', () => {
        off.forEach((f) => f()); document.body.style.userSelect = ''; ind.style.display = 'none'; tip.style.display = 'none';
        if (!tgt) return;
        const list = ordered(par).filter((k) => k !== n), ti = list.indexOf(tgt);
        doMove(n, list[ti + (after ? 1 : 0)] || null);
      }),
    ];
  }

  // ---------- клавіатура ----------
  const typingTarget = (e) => { const t = e.composedPath()[0]; return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable); };
  window.addEventListener('keydown', (e) => {
    if (S.editing) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); endText(true); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endText(false); }
      return;
    }
    const t = e.composedPath()[0];
    if (typingTarget(e)) { if (e.key === 'Escape' && S.on && t.blur) { t.blur(); e.preventDefault(); e.stopPropagation(); } return; }
    if (blocked()) return;
    if (e.code === 'KeyE' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat) { e.preventDefault(); e.stopPropagation(); setOn(!S.on); return; }
    if (!S.on) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.code === 'KeyZ') { e.preventDefault(); e.stopPropagation(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && e.code === 'KeyY') { e.preventDefault(); e.stopPropagation(); redo(); return; }
    if (mod) return;
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      // у режимі колір/прозорість Esc спершу повертає вихідне значення цієї властивості (як «Скинути»), другий Esc знімає вибір
      const T = S.el && PROPS[S.prop]?.type;
      if ((T === 'color' || T === 'opacity') && S.changes.has(keyOf(S.el, S.prop === 'color-icon' ? 'icon-' + cssFor(S.el, S.prop) : cssFor(S.el, S.prop)))) { resetProp(S.el, S.prop); S.cand = null; return; }
      if (S.el) select(null); else setOn(false); return;
    }
    if (e.code === 'KeyM' && !e.altKey) { e.preventDefault(); e.stopPropagation(); setMode(S.prop === 'move' ? 'value' : 'move'); return; }
    if (e.code === 'KeyB' && !e.altKey) { e.preventDefault(); e.stopPropagation(); toggleView(); return; }
    if (e.code === 'KeyA' && !e.altKey) { e.preventDefault(); e.stopPropagation(); S.scopeAll = !S.scopeAll; renderInfo(); say(S.scopeAll ? 'Правка застосується до ВСІХ такого типу (class/роль)' : 'Правка лише для вибраного елемента'); return; }
    if (!S.el) return;
    if (e.code === 'BracketLeft') { e.preventDefault(); e.stopPropagation(); nav('up'); return; }
    if (e.code === 'BracketRight') { e.preventDefault(); e.stopPropagation(); nav('down'); return; }
    if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); nav(e.shiftKey ? 'prev' : 'next'); return; }
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (['color', 'opacity'].includes(PROPS[S.prop]?.type)) confirmColor(); else startText(S.el); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); hideEl(S.el); return; }
    if ((e.key === 'PageUp' || e.key === 'PageDown') && PROPS[S.prop]?.type === 'color') { e.preventDefault(); e.stopPropagation(); stepAlpha(e.key === 'PageUp' ? 1 : -1); return; }
    const dirs = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };
    if (e.key in dirs) {
      e.preventDefault(); e.stopPropagation();
      // Alt+стрілка (будь-який режим) і голі стрілки в режимі «Позиція» (M) = swap із візуальним сусідом у напрямку; решта — значення
      const dn = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
      if (e.altKey || S.prop === 'move') { swapDir(dn); return; }
      // роль — навігація списком: ↑/← = попередній, ↓/→ = наступний; решта: ↑/→ більше, ↓/← менше
      const dir = PROPS[S.prop].type === 'role' ? (e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1) : dirs[e.key];
      stepProp(dir, e.shiftKey ? CFG.shiftSteps : 1);
    }
  }, true);

  // ---------- панель ----------
  function crumbs() {
    const n = S.el; if (!n) return '<div class="ed-hint">Клікни елемент на сторінці. Подвійний клік — редагувати текст.</div>';
    const chain = []; for (let a = n.parentElement; a && a !== document.documentElement && chain.length < 5; a = a.parentElement) chain.unshift(a);
    const k = kids(n).slice(0, 8);
    return `<div class="ed-crumbs">${chain.map((a, i) => `<button class="ed-cr" data-sel="up${chain.length - i}">${esc(nameOf(a))}</button>`).join('<span>›</span>')}${chain.length ? '<span>›</span>' : ''}<b>${esc(nameOf(n))}</b></div>`
      + (k.length ? `<div class="ed-crumbs sub">↓ ${k.map((c, i) => `<button class="ed-cr" data-sel="kid${i}">${esc(nameOf(c))}</button>`).join('')}${kids(n).length > 8 ? '…' : ''}</div>` : '');
  }
  function readout() {
    const n = S.el; if (!n) return '';
    const P = PROPS[S.prop];
    if (P.type === 'move') {
      const par = n.parentElement, list = ordered(par), i = list.indexOf(n), v = moveSpec(n).read();
      const nb = { left: neighborOf(n, 'left'), right: neighborOf(n, 'right'), up: neighborOf(n, 'up'), down: neighborOf(n, 'down') };
      const nmx = (k) => (k ? esc(nm0(k)) : '—');
      const horiz = nb.left || nb.right, vert = nb.up || nb.down;
      const btns = (a, b, la, lb, d1, d2) => `<div class="ed-val"><button data-a="${a}"${nb[d1] ? '' : ' disabled'}>${la}</button><button data-a="${b}"${nb[d2] ? '' : ' disabled'}>${lb}</button></div>`;
      return `<div class="ed-val"><span>Позиція ${i + 1}/${list.length}</span></div>`
        + `<div class="ed-meta">${horiz || !vert ? `ліворуч: ${nmx(nb.left)}, праворуч: ${nmx(nb.right)}` : ''}${vert ? `${horiz ? '<br>' : ''}вище: ${nmx(nb.up)}, нижче: ${nmx(nb.down)}` : ''}</div>`
        + (horiz || !vert ? btns('mv-left', 'mv-right', '◀ поміняти з лівим', 'поміняти з правим ▶', 'left', 'right') : '')
        + (vert ? btns('mv-up', 'mv-down', '▲ поміняти з верхнім', 'поміняти з нижнім ▼', 'up', 'down') : '')
        + `<div class="ed-meta">${v.mode === 'grid' && v.tracks ? `режим: grid — доріжки йдуть разом з елементом<br>доріжки: <code>${esc(v.tracks)}</code> = ${esc(v.tracksU)}` : v.mode === 'order' ? 'режим: flex — міняється CSS order' : 'режим: порядок у розмітці'}<br>Alt+←↑→↓ — поміняти місцями в будь-якому режимі · M — режим · перетягни ⠿ на сторінці</div>`;
    }
    if (P.type === 'role') {
      const roles = getRoles(), cur = roleOf(n), c = hasOwnText(n) ? contrastOf(n) : null;
      return `<div class="ed-val"><select data-a="role"><option value="">(без ролі)</option>${roles.map((r) => `<option value="${esc(r)}"${r === cur ? ' selected' : ''}>.${esc(r)}</option>`).join('')}</select></div>${c ? `<div class="ed-meta">контраст тексту: ${c.ratio}:1 ${c.img ? '(є фон-зображення — точне значення міряй піксельно)' : c.ratio >= 7 ? 'AAA' : c.ratio >= 4.5 ? 'AA' : c.ratio >= 3 ? 'лише великий текст' : '— недостатньо!'}</div>` : ''}`;
    }
    if (P.type === 'color') {
      const cur = readStyle(n, S.prop), pal = getPalette(), ci = palIndex(cur), ic = P.target === 'icon' ? iconCss(n) : null;
      const sw = pal.map((e) => `<button class="ed-swt${ci >= 0 && pal[ci] === e ? ' on' : ''}" data-color="${esc(e.name)}" title="${esc(e.name)} · ${esc(toHex(e.rgb))}${e.aliases.length ? ' · також ' + esc(e.aliases.join(', ')) : ''}"><i style="background:rgb(${e.rgb.slice(0, 3).join(',')})"></i><span>${esc(e.name.replace(/^--color-/, ''))}<small>${esc(toHex(e.rgb))}</small></span></button>`).join('');
      const ct = cur.contrast, ctHtml = P.target === 'text' || P.target === 'background' ? (ct ? `<div class="ed-ctr ${ct.pass ? 'ok' : 'bad'}">${esc(ct.text)}</div>` : '<div class="ed-meta">контраст: у елемента немає власного тексту</div>') : '';
      return `<div class="ed-meta"><b>${esc(PROPS[S.prop].chip)}</b>${ic ? ` · ${ic.mode === 'currentColor' ? 'currentColor (через color)' : ic.css}` : ''}: ${esc(cur.label)}</div><div class="ed-val"><button data-a="color-prev" title="Попередній токен (←/↑)">‹</button><span>${ci >= 0 ? `${ci + 1}/${pal.length}` : `—/${pal.length}`}</span><button data-a="color-next" title="Наступний токен (→/↓)">›</button><button data-a="reset" title="Повернути вихідне (Esc)">↺ Скинути</button></div><div class="ed-swg">${sw}</div><div class="ed-meta"><b>Прозорість кольору (${esc(PROPS[S.prop].chip)})</b>: ${cur.alphaKind === 'none' ? '100% — без прозорості' : `${cur.alphaPct}% — ${cur.alphaKind === 'token' ? 'токен ' + esc(cur.alphaToken) : 'експериментальне значення (не токен)'}`}. Діти не змінюються.</div><div class="ed-ops">${getAlphaSteps().map((x) => `<button class="ed-opb${Math.abs(x.pct - cur.alphaPct) < 0.6 ? ' on' : ''}${x.token || x.none ? '' : ' exp'}" data-alpha="${x.pct}" title="${x.token ? esc([x.name, ...x.aliases].join(', ')) : x.none ? 'без прозорості' : 'експериментальне значення — не токен, потребує рішення'}"><b>${x.pct}%</b><small>${x.none ? 'без' : x.token ? esc(x.name.replace(/^--opacity-/, '')) : 'експ.'}</small></button>`).join('')}</div>${ctHtml}<div class="ed-meta">лише токени --color-* · ←/↑ ‹ ›/→/↓ — інший токен; Shift+↑/↓ або PageUp/PageDown — прозорість кольору (пунктир = експериментальні кроки); Enter — застосувати, Esc — скинути</div>`;
    }
    if (P.type === 'opacity') {
      const cur = readStyle(n, 'opacity'), l = getOpacities(), v = cur.value;
      return `<div class="ed-meta warn"><b>opacity ВСЬОГО елемента (разом з дітьми)</b>: ${esc(cur.label)}. Для прозорості лише фону/тексту/рамки/іконки — вкладки кольору.</div><div class="ed-val"><button data-a="op-down" title="Прозоріше (↓/←)">−</button><span>${esc(cur.label)}</span><button data-a="op-up" title="Менш прозоро (↑/→)">+</button><button data-a="reset" title="Повернути вихідне (Esc)">↺ Скинути</button></div><div class="ed-ops">${l.map((e) => `<button class="ed-opb${Math.abs(e.value - v) < 0.005 ? ' on' : ''}" data-op="${esc(e.name)}" title="${esc([e.name, ...e.aliases].join(', '))}"><b>${e.value}</b><small>${e.plain ? 'без прозорості' : esc(e.name.replace(/^--opacity-/, ''))}</small></button>`).join('')}</div><div class="ed-meta">лише токени --opacity-* (1 = без прозорості) · ↑/→ менш прозоро, ↓/← прозоріше, Enter — застосувати, Esc — скинути</div>`;
    }
    if (P.type === 'align') return `<div class="ed-val">${['left', 'center', 'right'].map((v) => `<button data-align="${v}"${getComputedStyle(n).textAlign === v ? ' class="on"' : ''}>${v}</button>`).join('')}</div>`;
    if (P.type === 'span') { const v = readSpan(n); return `<div class="ed-val"><button data-a="dec">−</button><span>${esc(v.label)}</span><button data-a="inc">+</button></div>`; }
    if (!available(S.prop)) return '<div class="ed-meta">Недоступно для цього елемента</div>';
    const dn = GAPS.includes(S.prop) ? distFor(n, S.prop) : null;
    const v = readStyle(n, S.prop), sc = getScale(P.scale), i = sc.findIndex((e) => Math.abs(e.px - (v.px ?? baseOf(n, S.prop))) < 0.6);
    return `${sizeSourceHtml(n, P.css[0])}<div class="ed-val"><button data-a="dec">−</button><span>${esc(v.label)}</span><button data-a="inc">+</button><button data-a="reset" title="Повернути вихідне">↺</button></div><div class="ed-val"><select data-a="pick" title="Вибрати токен зі шкали"><option value="">значення зі шкали (${sc.length})…</option>${sc.map((e) => `<option value="${esc(e.name)}">${esc(e.name)} · ${r1(e.px / unit())}u</option>`).join('')}</select></div>${dn ? `<div class="ed-meta warn">розподіл вільного місця (${esc(dn.jcProp)}: ${esc(dn.jc)}) — не gap. Фактична відстань між дітьми: ${fmtLen(dn.dist)} · ${fmtU(dn.dist)}; ${esc(dn.gapProp)} зараз ${fmtLen(dn.gap)} (мінімум)</div>` : ''}<div class="ed-meta">крок шкали ${i >= 0 ? i + 1 : '—'}/${sc.length}${i >= 0 && sc[i].aliases.length ? ' · також ' + esc(sc[i].aliases.slice(0, 2).join(', ')) : ''} · ↑/→ більше, ↓/← менше, Shift ×${CFG.shiftSteps}, Alt усі боки</div>`;
  }
  function renderInfo() {
    const u = unit(), keepTop = pInfo.scrollTop, ae = shadowActive(), aeKey = ae && /^(INPUT|SELECT)$/.test(ae.tagName) && pInfo.contains(ae) ? ['data-a', 'data-lay', 'data-p'].map((k) => [k, ae.getAttribute(k)]).find((x) => x[1] != null) : null;
    pHead.innerHTML = `<b>Едіт</b><span class="ed-sub">${innerWidth}px · 1u=${r2(u)}px${S.view === 'before' ? ' · ДО' : ''}</span><span class="ed-sp"></span><button data-a="flip" title="Панель ліворуч/праворуч">⇄</button><button data-a="close" title="Закрити (E)">×</button>`;
    const chips = GROUPS.map(([g, ps]) => `<div class="ed-grp"><em>${g}</em>${ps.map((p) => `<button class="ed-chip${S.prop === p ? ' on' : ''}" data-p="${p}"${S.el && !available(p) ? ' disabled' : ''}>${esc(PROPS[p].chip)}</button>`).join('')}</div>`).join('');
    const sc = S.el ? scopeFor(S.el, PROPS[S.prop].type, S.prop) : null;
    pInfo.innerHTML = `${crumbs()}${S.el ? `${hintHtml()}${chips}${['color', 'opacity'].includes(PROPS[S.prop].type) ? readout() : ''}<div class="ed-tog"><label><input type="checkbox" data-a="all"${S.all ? ' checked' : ''}> усі боки <kbd>Alt</kbd></label><label><input type="checkbox" data-a="scope"${S.scopeAll ? ' checked' : ''}> на всі такого типу <kbd>A</kbd>${S.scopeAll && sc?.scope ? ` <i>${esc(sc.scope)} · ${sc.targets.length}</i>` : ''}</label></div>${['color', 'opacity'].includes(PROPS[S.prop].type) ? '' : readout()}${layoutRows(S.el)}<div class="ed-acts"><button data-a="text">Текст <kbd>Enter</kbd></button><button data-a="hide">Прибрати <kbd>Del</kbd></button><button data-a="undo">↶</button><button data-a="redo">↷</button></div>` : ''}`;
    pInfo.scrollTop = keepTop;
    panelEl.classList.toggle('colorp', !!S.el && ['color', 'opacity'].includes(PROPS[S.prop].type));
    if (aeKey) { const again = [...pInfo.querySelectorAll('[' + aeKey[0] + ']')].find((x) => x.getAttribute(aeKey[0]) === aeKey[1]); if (again && !again.disabled) again.focus({ preventScroll: true }); }
    renderFoot();
    persistSoon();
  }
  const plural = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'правка' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'правки' : 'правок');
  function updateBtn() {
    const N = S.changes.size, un = unsyncedN();
    btn.querySelector('.ed-bl').textContent = S.on ? 'Вийти' : 'Едіт';
    btn.querySelector('.ed-cnt').textContent = N || S.parked ? ` · ${N} ${plural(N)}${S.parked ? ` (+${S.parked} не застосовано)` : ''}${un ? ' · зберігаю…' : ''}` : '';
    btn.querySelector('.ed-bm').textContent = S.on ? (S.prop === 'move' ? ' · Позиція' : ' · Значення') : '';
    legend.hidden = !S.on;
    btn.title = `Едіт (E): живий перегляд правок. Alt+←↑→↓ — поміняти місцями; M — режим Значення/Позиція; стрілки — значення. Накопичено правок: ${N}`;
  }
  function renderFoot() {
    const N = S.changes.size, un = unsyncedN();
    pFoot.innerHTML = `<button data-a="view" class="${S.view === 'before' ? 'on' : ''}">До/після <kbd>B</kbd></button><button data-a="copy">Копіювати ТЗ</button><button data-a="send" class="primary">Надіслати правки (${N})</button>`;
    const mv = S.prop === 'move';
    const conf = S.confirm ? `<div class="ed-conf"><span>${S.confirm === 'reset' ? `Скинути ${N} ${plural(N)}? Перегляд повернеться до оригіналу; чернетки й надіслані (ще не виконані) правки буде відкликано — зникнуть із файлу.` : `Видалити чернетки (${N + S.parked})? Надіслані й виконані правки залишаться.`}</span><button data-a="confirm-yes" class="danger">Так</button><button data-a="confirm-no">Ні</button></div>` : '';
    pTop.innerHTML = `<button class="ed-mode ${mv ? 'move' : 'value'}" data-a="mode-toggle" title="Перемкнути режим (M)"><b>${esc(modeText())}</b><kbd>M</kbd></button>`
      + `<div class="ed-topb"><button data-a="undo-last"${N || S.ptr ? '' : ' disabled'}>↶ Скасувати останню</button><button data-a="ask-reset" class="danger"${N ? '' : ' disabled'}>Скинути все (${N})</button><button data-a="ask-clear"${N || S.parked ? '' : ' disabled'} title="Видаляє лише чернетки; надіслані й виконані лишаються">Очистити чернетки</button></div>`
      + conf
      + `<label class="ed-rest"><input type="checkbox" data-a="restore"${S.restore ? ' checked' : ''}> Відновлювати чернетки після перезавантаження</label>`
      + (S.parked ? `<div class="ed-warn">У файлі ${S.parked} чернеток цієї сторінки не застосовано до перегляду.<button data-a="apply-parked">Застосувати зараз</button></div>` : '')
      + (un ? `<div class="ed-meta">Зберігаю правки у файл: ${un}…</div>` : '');
    updateBtn();
  }
  // Список змін оновлюється точково (рядки за ключем): поле «Нотатка», яке зараз у фокусі, не перестворюється — інакше після кожної синхронізації
  // (syncSoon -> renderChanges) фокус зникав і наступні літери ставали гарячими клавішами (c = Коментар закриває Едіт, e, a, b, g…).
  function renderChanges() {
    const ms = [...S.changes.values()];
    let head = pChg.querySelector(':scope > .ed-ch-h'), rows = pChg.querySelector(':scope > .ed-rows');
    if (!head || !rows) { pChg.innerHTML = '<div class="ed-ch-h"></div><div class="ed-rows"></div>'; head = pChg.firstChild; rows = pChg.lastChild; }
    head.innerHTML = `Зміни <span>${ms.length}</span>${S.sent ? `<span class="ed-sentn">надіслано: ${S.sent}</span>` : ''}`;
    const have = new Map([...rows.children].filter((r) => r.dataset.k != null).map((r) => [r.dataset.k, r]));
    if (!ms.length) rows.innerHTML = '<div class="ed-hint">Поки що без правок.</div>';
    else {
      rows.querySelectorAll(':scope > .ed-hint').forEach((h) => h.remove());
      const ae = shadowActive();
      ms.forEach((m, i) => {
        let row = have.get(m.key); have.delete(m.key);
        if (!row) {
          row = document.createElement('div'); row.className = 'ed-row'; row.dataset.k = m.key;
          row.innerHTML = '<div class="ed-rt"></div><input class="ed-note" placeholder="Нотатка до правки…"><button class="ed-x" title="Скасувати правку">×</button>';
        }
        row.querySelector('.ed-rt').innerHTML = `<b>${esc(typeRu[m.type] || m.type)}</b>${m.record ? (m.record.status === 'open' ? ' <em class="ed-sent" title="Правка надіслана оркестратору; поки статус не done, вона лишається накладкою на сторінці">надіслано · чекає виконання</em>' : '') : ' <em>…</em>'} ${esc(descOf(m))}${m.scope ? ` <i>[${esc(m.scope)} · ${m.targets.length}]</i>` : ''}${m.record?.source ? ` <i>джерело: ${esc(m.record.source)}</i>` : ''}`;
        const inp = row.querySelector('.ed-note'); inp.dataset.note = i; row.querySelector('.ed-x').dataset.del = i;
        if (inp !== ae && inp.value !== m.note) inp.value = m.note;
        if (rows.children[i] !== row) rows.insertBefore(row, rows.children[i] || null);
      });
    }
    for (const r of have.values()) r.remove();
    renderFoot();
  }
  panelEl.addEventListener('click', (e) => {
    const b = e.target.closest('button, [data-sel]'); if (!b || b.disabled) return;
    if (b.dataset.p) { if (b.dataset.p !== 'move') S.prevProp = b.dataset.p; else if (S.prop !== 'move') S.prevProp = S.prop; S.prop = b.dataset.p; renderInfo(); draw(); return; }
    if (b.dataset.sel) { const k = b.dataset.sel; if (k.startsWith('up')) { let a = S.el; for (let i = 0; i < +k.slice(2); i++) a = a.parentElement; select(a); } else select(kids(S.el)[+k.slice(3)]); return; }
    if (b.dataset.color) { const ent = getPalette().find((x) => x.name === b.dataset.color); if (ent && guard()) setColor(S.el, S.prop, ent); return; }
    if (b.dataset.alpha) { setAlphaPct(S.el, S.prop, +b.dataset.alpha); return; }
    if (b.dataset.op) { const ent = getOpacities().find((x) => x.name === b.dataset.op); if (ent && guard()) setOpacity(S.el, ent); return; }
    if (b.dataset.align) { if (guard()) applyStyle(S.el, 'text-align', b.dataset.align, false); return; }
    if (b.dataset.del != null) { const m = [...S.changes.values()][+b.dataset.del]; if (m) revertChange(m); return; }
    switch (b.dataset.a) {
      case 'close': setOn(false); break;
      case 'flip': S.side = S.side === 'right' ? 'left' : 'right'; panelEl.classList.toggle('left', S.side === 'left'); break;
      case 'dec': stepProp(-1, 1); break;
      case 'inc': stepProp(1, 1); break;
      case 'color-next': case 'op-up': stepProp(1, 1); break;
      case 'color-prev': case 'op-down': stepProp(-1, 1); break;
      case 'reset': resetProp(S.el, S.prop); break;
      case 'distfix': distFix(S.el); break;
      case 'h-fix': hintFix(); break;
      case 'h-min': hintMin(); break;
      case 'h-parent': if (S.el?.parentElement && S.el.parentElement !== document.body) select(S.el.parentElement); break;
      case 'mv-left': swapDir('left'); break;
      case 'mv-right': swapDir('right'); break;
      case 'mv-up': swapDir('up'); break;
      case 'mv-down': swapDir('down'); break;
      case 'mode-toggle': setMode(S.prop === 'move' ? 'value' : 'move'); break;
      case 'undo-last': undoLast(); break;
      case 'ask-reset': S.confirm = 'reset'; clearTimeout(S.confT); S.confT = setTimeout(() => { S.confirm = null; renderFoot(); }, 9000); renderFoot(); break;
      case 'ask-clear': S.confirm = 'clear'; clearTimeout(S.confT); S.confT = setTimeout(() => { S.confirm = null; renderFoot(); }, 9000); renderFoot(); break;
      case 'confirm-no': S.confirm = null; renderFoot(); break;
      case 'confirm-yes': if (S.confirm === 'reset') resetAll(); else if (S.confirm === 'clear') clearDrafts(); break;
      case 'apply-parked': applyParked(); break;
      case 'text': startText(S.el); break;
      case 'hide': hideEl(S.el); break;
      case 'undo': undo(); break;
      case 'redo': redo(); break;
      case 'view': toggleView(); break;
      case 'copy': copyBrief(); break;
      case 'send': sendAll(); break;
      default:
    }
  });
  panelEl.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.a === 'restore') { S.restore = t.checked; lsSet('__edit_restore', S.restore ? '1' : '0'); if (S.restore) applyParked(); else say('Після перезавантаження чернетки НЕ застосовуватимуться до перегляду (лишаються у файлі)'); renderFoot(); }
    else if (t.dataset.a === 'all') { S.all = t.checked; renderInfo(); }
    else if (t.dataset.a === 'scope') { S.scopeAll = t.checked; renderInfo(); }
    else if (t.dataset.lay && S.el) { if (guard()) applyStyle(S.el, t.dataset.lay, t.value, false); }
    else if (t.dataset.a === 'role' && S.el) setRole(S.el, t.value || null);
    else if (t.dataset.a === 'pick' && S.el && t.value) { const e2 = getScale(PROPS[S.prop].scale).find((x) => x.name === t.value); if (e2 && !gapGuard(S.el, S.prop, e2.px)) applyStyle(S.el, S.prop, e2.css, S.all); else if (e2) t.value = ''; }
  });
  panelEl.addEventListener('input', (e) => {
    const t = e.target; if (t.dataset.note == null) return;
    const m = S.changes.get(t.closest('.ed-row')?.dataset.k); if (!m) return;
    m.note = t.value; syncSoon(m); persistSoon();
  });

  // ---------- надсилання / ТЗ ----------
  const shotRect = (m) => {
    const n = m.type === 'move' && m.el.parentElement ? m.el.parentElement : m.el;
    const r = n.getBoundingClientRect(), pad = 24;
    return { x: Math.max(0, r.left + scrollX - pad), y: Math.max(0, r.top + scrollY - pad), w: Math.min(1920, r.width + pad * 2), h: Math.min(1400, r.height + pad * 2) };
  };
  async function sendAll() {
    if (!guard()) return;
    await flush(); await settle();
    const ms = [...S.changes.values()].filter((m) => m.record && m.record.status === 'draft');
    if (!ms.length) return say('Немає чернеток для надсилання');
    say(`Роблю скриншоти (${ms.length})…`);
    for (const m of ms) {
      if (m.shotK === m.cur.k) continue;
      try { const shot = await captureShot(shotRect(m)); if (shot) { m.record = await api('POST', `/edits/${m.record.id}/shot`, { shot }); m.shotK = m.cur.k; } } catch { /* без скриншота */ }
    }
    const r = await api('POST', '/edits/send', { url: PAGE() });
    for (const m of ms) if (r.sent.includes(m.record.id)) m.record.status = 'open';
    S.sent += r.sent.length;
    renderChanges(); say(`Надіслано правок: ${r.sent.length}. Оркестратор побачить їх автоматично (хук)`);
  }
  function briefText() {
    const ms = [...S.changes.values()];
    const L = [`# Правки замовника (Едіт) — ${PAGE()} · вікно ${innerWidth}px (1u = ${r2(unit())}px)`, '', 'Значення — лише зі шкали токенів; текст — ролі `.t-*`; виконувати за правилами проєкту (виконавець + окремий Перевірочний).', ''];
    ms.forEach((m, i) => L.push(`${i + 1}. **${m.type}** \`${selFor(m.el)}\` — ${descOf(m)}${m.scope ? ` [${m.scope}, ${m.targets.length} ел.]` : ''}${m.note ? ` — нотатка: ${m.note}` : ''}${m.record?.source ? ` (джерело: ${m.record.source})` : ''}`));
    return L.join('\n');
  }
  async function copyBrief() {
    const text = briefText();
    try { await navigator.clipboard.writeText(text); say('ТЗ скопійовано у буфер'); }
    catch { const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select(); try { document.execCommand('copy'); say('ТЗ скопійовано'); } catch { say('Не вдалося скопіювати'); } ta.remove(); }
  }

  // ---------- стан Едіт між перезавантаженнями (sessionStorage `__edit_state`) ----------
  // Vite (плагін html-partials) робить full-reload при зміні будь-якого partials/*: сторінка перезавантажується, а панель, вибір, нотатка й текст у редагуванні зникали.
  const SKEY = '__edit_state', STATE_TTL = 30 * 60 * 1000;
  const ssGet = () => { try { return JSON.parse(sessionStorage.getItem(SKEY) || 'null'); } catch { return null; } };
  const ssSet = (v) => { try { sessionStorage.setItem(SKEY, JSON.stringify(v)); } catch { /* ignore */ } };
  let live = false, persistT = 0; // live=false, доки не завершено відновлення: ранні події не затирають збережений стан
  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const textOf = (n) => norm(n.innerText || n.getAttribute?.('alt')).slice(0, 120);
  function caretOf(n) {
    const sel = getSelection();
    if (!sel.rangeCount || !n.contains(sel.anchorNode)) return { c0: null, c1: null };
    const r = sel.getRangeAt(0), pre = document.createRange();
    pre.selectNodeContents(n); pre.setEnd(r.startContainer, r.startOffset);
    const a = pre.toString().length;
    return { c0: a, c1: a + r.toString().length };
  }
  function setCaret(n, c0, c1) {
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT); let acc = 0, a = null, b = null, t;
    while ((t = w.nextNode())) {
      const len = t.data.length;
      if (!a && c0 <= acc + len) a = [t, c0 - acc];
      if (!b && c1 <= acc + len) { b = [t, c1 - acc]; break; }
      acc += len;
    }
    const sel = getSelection(), rg = document.createRange();
    if (!a) { rg.selectNodeContents(n); rg.collapse(false); } else { rg.setStart(...a); if (b) rg.setEnd(...b); else rg.collapse(true); }
    sel.removeAllRanges(); sel.addRange(rg);
  }
  function snapshot() {
    const ae = shadowActive(), ed = S.editing;
    const st = { v: 1, url: PAGE(), ts: Date.now(), on: S.on, prop: S.prop, all: S.all, scopeAll: S.scopeAll, side: S.side, scrollX: scrollX, scrollY: scrollY,
      sel: null, notes: {}, focus: null, editing: null, pane: { info: pInfo.scrollTop, chg: pChg.scrollTop } };
    if (S.el && S.el.isConnected) st.sel = { selector: selFor(S.el), text: ed && ed.el === S.el ? norm(ed.orig).slice(0, 120) : textOf(S.el) };
    for (const m of S.changes.values()) if (m.note) st.notes[m.key] = m.note;
    if (ae && ae.classList?.contains('ed-note')) st.focus = { kind: 'note', key: ae.closest('.ed-row')?.dataset.k || null, start: ae.selectionStart, end: ae.selectionEnd };
    if (ed && ed.el.isConnected) st.editing = { selector: selFor(ed.el), orig: ed.orig, text: ed.el.textContent, ...caretOf(ed.el) };
    return st;
  }
  const persistNow = () => { clearTimeout(persistT); persistT = 0; if (live) ssSet(snapshot()); };
  function persistSoon() { if (!live) return; clearTimeout(persistT); persistT = setTimeout(persistNow, 150); }
  function findByText(sv) { // елемент за селектором + текстом; якщо селектор «поїхав» — той самий тег із таким самим текстом
    let n = null; try { n = document.querySelector(sv.selector); } catch { /* */ }
    if (n && (!sv.text || textOf(n) === sv.text)) return n;
    if (!sv.text) return n;
    const tag = n ? n.localName : sv.selector.split(/[\s>]+/).pop().replace(/[.#:[].*$/, '');
    try { const c = [...document.querySelectorAll(tag || '*')].filter((x) => !host.contains(x) && textOf(x) === sv.text); if (c.length === 1) return c[0]; } catch { /* */ }
    return null;
  }
  function restoreSession(sv) {
    if (!sv || sv.v !== 1 || sv.url !== PAGE() || Date.now() - sv.ts > STATE_TTL) return;
    if (sv.prop && PROPS[sv.prop]) S.prop = sv.prop;
    S.all = !!sv.all; S.scopeAll = !!sv.scopeAll;
    if (sv.side === 'left' || sv.side === 'right') { S.side = sv.side; panelEl.classList.toggle('left', S.side === 'left'); }
    if (sv.on && !S.on) setOn(true);
    if (!S.on) return;
    for (const m of S.changes.values()) { const nt = sv.notes?.[m.key]; if (nt != null && nt !== m.note) { m.note = nt; syncSoon(m); } }
    if (sv.sel) { const n = findByText(sv.sel); if (n) { select(n); if (!available(S.prop)) S.prop = 'padding-top'; } else say('Едіт: вибраний елемент після оновлення не знайдено'); }
    renderInfo(); renderChanges();
    const e = sv.editing;
    if (e) {
      const n = findByText({ selector: e.selector, text: sv.sel?.selector === e.selector ? sv.sel.text : '' }) || (() => { try { return document.querySelector(e.selector); } catch { return null; } })();
      if (n) {
        select(n); startText(n);
        if (S.editing && S.editing.el === n) { n.textContent = e.text; if (e.c0 != null) setCaret(n, e.c0, e.c1 ?? e.c0); }
      }
    } else if (sv.focus?.kind === 'note' && sv.focus.key) {
      const inp = [...pChg.querySelectorAll('.ed-row')].find((r) => r.dataset.k === sv.focus.key)?.querySelector('.ed-note');
      if (inp) { inp.focus({ preventScroll: true }); try { inp.setSelectionRange(sv.focus.start ?? inp.value.length, sv.focus.end ?? inp.value.length); } catch { /* */ } }
    }
    if (sv.pane) { pInfo.scrollTop = sv.pane.info || 0; pChg.scrollTop = sv.pane.chg || 0; }
    if (Math.abs(scrollY - (sv.scrollY || 0)) > 2 || Math.abs(scrollX - (sv.scrollX || 0)) > 2) scrollTo(sv.scrollX || 0, sv.scrollY || 0);
  }

  // ---------- відкладене оновлення сторінки (vite:beforeFullReload) ----------
  // Vite чекає (await) на слухачів цієї події: поки користувач друкує, повертаємо проміс, який виконується після завершення вводу.
  const pendEl = mk('div', { class: 'ed-pend', hidden: true });
  pendEl.innerHTML = '<span>Оновлення сторінки відкладено (йде введення); застосується після Enter/збереження</span><button data-a="reload-now">Оновити зараз</button>';
  panelEl.insertBefore(pendEl, pInfo);
  let pend = null; // { p, done }
  const typingInPanel = () => { const ae = shadowActive(); return !!ae && panelEl.contains(ae) && ae.matches?.('input[type=text], input:not([type]), textarea'); };
  const busy = () => S.on && (!!S.editing || !!S.drag || typingInPanel());
  async function releasePending(force) {
    if (!pend || (!force && busy())) return;
    const cur = pend; pend = null; pendEl.hidden = true;
    try { await Promise.race([flush(), new Promise((ok) => setTimeout(ok, 1500))]); } catch { /* */ }
    flushBeacon();
    live && ssSet(snapshot()); cur.done();
  }
  function maybeRelease() { if (pend) setTimeout(() => releasePending(false), 0); }
  if (import.meta.hot) {
    import.meta.hot.on('vite:beforeFullReload', () => {
      if (!busy()) { persistNow(); flushBeacon(); return undefined; }
      if (!pend) { let done; const p = new Promise((ok) => { done = ok; }); pend = { p, done }; pendEl.hidden = false; persistNow(); }
      return pend.p;
    });
  }
  pendEl.addEventListener('click', (e) => { if (e.target.closest('[data-a=reload-now]')) releasePending(true); });
  panelEl.addEventListener('focusout', maybeRelease);
  panelEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList?.contains('ed-note')) { e.preventDefault(); e.target.blur(); } });
  for (const t of ['focusin', 'keyup', 'mouseup']) panelEl.addEventListener(t, persistSoon);
  window.addEventListener('input', persistSoon, true);
  window.addEventListener('keyup', persistSoon, true);
  addEventListener('pagehide', persistNow);
  addEventListener('beforeunload', persistNow);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persistNow(); });

    // ---------- відновлення чернеток після перезавантаження ----------
  async function restoreDrafts() {
    const sv = ssGet();
    try { await restoreDraftsInner(); } finally { try { restoreSession(sv); } catch (e) { console.warn('[edit] restore skipped:', e.message); } live = true; persistSoon(); }
  }
  const samePage = (u) => String(u || '').split('?')[0] === location.pathname; // накладки діють незалежно від ?query (напр. ?age=ok)
  async function restoreDraftsInner(force) {
    let list = [];
    try { list = (await api('GET', '/edits')).edits; } catch { return; }
    S.sent = list.filter((x) => samePage(x.url) && x.status === 'open').length;
    const known = new Set([...S.changes.values()].map((m) => m.record?.id || m.id));
    // draft І open (надіслані, ще не done) лишаються живими накладками на кожному завантаженні сторінки; done — ні (код уже змінено)
    const live0 = list.filter((x) => samePage(x.url) && (x.status === 'draft' || x.status === 'open') && !known.has(x.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const onlyDrafts = live0.filter((x) => x.status === 'draft');
    let drafts = live0;
    if (!S.restore && !force) { drafts = live0.filter((x) => x.status === 'open'); S.parked = onlyDrafts.length; if (onlyDrafts.length) say(`У файлі ${onlyDrafts.length} чернеток — не застосовано (вимкнено «Відновлювати чернетки»); надіслані застосовано`); }
    else S.parked = 0;
    const moves = new Map(); let ok = 0, inCode = 0;
    for (const rec of drafts) {
      let n = null; try { n = document.querySelector(rec.selector); } catch { /* */ }
      if (!n) continue;
      const R = rec.restore || {};
      let spec = null, apply = () => {};
      if (R.kind === 'style') { spec = styleSpec(n, [n], R.prop && PROPS[R.prop] ? R.prop : propByCss(R.css, 'padding-top'), '', rec.group || ''); apply = () => (R.value ? n.style.setProperty(R.css, R.value) : n.style.removeProperty(R.css)); }
      else if (R.kind === 'text') { spec = textSpec(n); apply = () => { n.textContent = R.text; }; }
      else if (R.kind === 'role') { spec = roleSpec(n, [n], ''); apply = () => spec.put([R.role]); }
      else if (R.kind === 'move') {
        // надіслана правка порядку: застосовуємо лише якщо поточний порядок = «було» (інакше код уже змінено або сторінка інша)
        if (rec.status === 'open' && rec.from?.order && ordered(n.parentElement).slice(0, 14).map(nm0).join('|') !== rec.from.order.join('|')) { inCode++; continue; }
        spec = moveSpec(n); const m = touch(spec); m.record = rec; m.id = rec.id; m.note = rec.note || ''; m.shotK = null;
        const key = rec.parentSelector || selFor(n.parentElement); (moves.get(key) || moves.set(key, { par: n.parentElement, recs: [] }).get(key)).recs.push({ m, rec }); ok++;
        continue;
      }
      else if (R.kind === 'hide') { spec = hideSpec(n); apply = () => n.style.setProperty('display', 'none', 'important'); }
      if (!spec) continue;
      if (rec.status === 'open') { // не подвоювати: якщо код уже дає ціль (computed не змінюється від накладки) — нічого не робимо
        const sn = spec.snap(), k0 = spec.read().k; apply();
        if (spec.read().k === k0) { spec.put(sn); inCode++; continue; }
        spec.put(sn);
      }
      const m = touch(spec); m.record = rec; m.id = rec.id; m.note = rec.note || ''; apply(); m.cur = m.read(); m.shotK = null; ok++;
    }
    // порядок дітей відновлюється ЦІЛИМ батьком (perm + доріжки + order) за найсвіжішим записом; старі записи (лише index) — по одному
    for (const { par, recs } of moves.values()) {
      const fresh = recs.slice().sort((a, b) => (a.rec.updatedAt || '').localeCompare(b.rec.updatedAt || '')).pop();
      if (fresh.rec.restore?.perm) applyMoveRestore(par, fresh.rec.restore);
      else for (const { m, rec } of recs) { moveTo(m.el, rec.restore.index); }
      for (const { m } of recs) m.cur = m.read();
    }
    renderInfo(); renderChanges(); draw();
    S.inCode = (S.inCode || 0) + inCode;
    if (ok) say(`Відновлено правок: ${S.changes.size}${inCode ? `; ще ${inCode} уже є в коді` : ''} (E — Едіт)`);
  }
  async function applyParked() { await restoreDraftsInner(true); }
  // синхронізація зі файлом: статус done (код уже змінено) або запис видалено (rv.py edits rm / інша вкладка) — накладка знімається
  async function pollRemote() {
    if (!live || document.hidden || S.editing) return;
    let list; try { list = (await api('GET', '/edits')).edits; } catch { return; }
    const by = new Map(list.map((e) => [e.id, e]));
    let gone = 0;
    for (const m of [...S.changes.values()]) {
      if (!m.record || m.dirty || m.timer) continue;
      const r = by.get(m.record.id);
      if (!r || r.status === 'done') { try { m.put(m.origSnap); } catch { /* елемент зник */ } S.changes.delete(m.key); gone++; }
      else if (r.status !== m.record.status) m.record.status = r.status;
    }
    S.sent = list.filter((x) => samePage(x.url) && x.status === 'open').length;
    if (gone) { S.ops = []; S.ptr = 0; if (!S.changes.size) S.base.clear(); renderInfo(); renderChanges(); draw(); say(`Виконано (done) або відкликано: накладок знято ${gone}`); }
    else renderChanges();
  }
  setInterval(pollRemote, 4000);

  // ---------- вмикання ----------
  function setOn(on) {
    if (on && blocked()) return;
    S.on = on; wrap.hidden = !on; panelEl.hidden = !on; btn.classList.toggle('on', on);
    updateBtn();
    if (on) { leaveOthers(); renderInfo(); renderChanges(); draw(); }
    else { if (S.editing) endText(false); if (S.view === 'before') toggleView(); hoverBox.style.display = 'none'; tip.style.display = 'none'; }
  }
  btn.addEventListener('click', () => setOn(!S.on));
  let raf = 0;
  const redraw = () => { if (!raf && S.on) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  addEventListener('scroll', () => { redraw(); persistSoon(); }, { passive: true, capture: true });
  addEventListener('resize', () => { uAt = 0; redraw(); if (S.on) renderInfo(); });
  setInterval(() => { if (S.on && !S.drag && !S.editing) draw(); }, 400);
  // поки йде редагування тексту: клацання поза елементом застосовує зміну й не доходить до сайту; посилання всередині не спрацьовують
  window.addEventListener('mousedown', (e) => { if (S.editing && !S.editing.el.contains(e.target)) { endText(true); e.preventDefault(); e.stopPropagation(); } }, true);
  window.addEventListener('click', (e) => { if (S.editing) e.preventDefault(); }, true);
  addEventListener('beforeunload', () => { if (S.changes.size) flushBeacon(); });
  addEventListener('pagehide', () => { if (S.changes.size) flushBeacon(); });

  // панель відкриваємо одразу (не чекаючи 700 мс на відновлення чернеток), якщо перед перезавантаженням Едіт був увімкнений
  { const sv0 = ssGet(); if (sv0 && sv0.v === 1 && sv0.on && sv0.url === PAGE() && Date.now() - sv0.ts <= STATE_TTL) { if (sv0.side === 'left') { S.side = 'left'; panelEl.classList.add('left'); } setOn(true); } }
  const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise((ok) => addEventListener('load', ok, { once: true }));
  loaded.then(() => setTimeout(restoreDrafts, 250));

  return {
    state: S, setOn, leave: () => { if (S.on) setOn(false); }, flush, settle, undo, redo, select, stepProp, toggleView, sendAll, briefText, getScale, getRoles, getPalette, doMove, setRole, setColor, setColorToken, setAlphaPct, getAlphaSteps, setOpacityToken, getOpacities, contrastInfo, startText, endText, handles: () => handles, draw,
    isOn: () => S.on,
  };
}
