// DEV-ONLY review overlay (loaded by vite-plugin-review.js, never part of the build).
// Адаптовано під site_brand (YasnoCraft × Bazylsprings): сітка з реальної розкладки (--u, поля 50u, зазор 5u), вікові ворота, Esc, z-index.
import css from './overlay.css?raw';
import editCss from './edit.css?raw';
import { initInspector } from './inspector.js';
import { initEdit } from './edit.js';

if (!window.__reviewOverlay) {
  window.__reviewOverlay = true;
  boot();
}

function boot() {
  const API = '/__review/api';
  const TYPES = { design: 'Дизайн', text: 'Текст', bug: 'Баг', question: 'Питання' };
  const PAGE = () => location.pathname + location.search;
  const sx = () => window.scrollX || window.pageXOffset || 0;
  const sy = () => window.scrollY || window.pageYOffset || 0;
  const store = {
    get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  const st = { comments: [], mode: false, panel: false, filter: 'open', draft: null, openId: null, drag: null, flashId: null, grid: false };

  // ---------- DOM ----------
  const host = document.createElement('div');
  host.id = '__review-host';
  // z-index 900: вище fixed-хедера (--z-header 100) і dropdown (50), нижче вікових воріт (--z-age-gate 1000); під час воріт оверлей прихований (див. gateOpen)
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:900;pointer-events:none;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${css}${editCss}</style>
    <div class="root">
      <div class="gridlayer" hidden><div class="gridbox"><div class="gridcols"></div></div><div class="gridinfo"></div></div>
      <div class="capture" hidden></div>
      <div class="hover"></div>
      <div class="sel"></div>
      <div class="items"></div>
      <div class="pop"></div>
      <div class="panel"></div>
      <div class="bar">
        <button class="btn alt" data-act="list">Список <span class="badge">0</span></button>
        <button class="btn alt" data-act="grid">Сітка <kbd>G</kbd></button>
        <button class="btn" data-act="mode">Коментар <kbd>C</kbd></button>
      </div>
      <div class="toast"></div>
    </div>`;
  const $ = (s) => shadow.querySelector(s);
  const capture = $('.capture'), hoverBox = $('.hover'), selBox = $('.sel'), itemsEl = $('.items'), pop = $('.pop'), panel = $('.panel'), toast = $('.toast');
  const gridLayer = $('.gridlayer'), gridBox = $('.gridbox'), gridCols = $('.gridcols'), gridInfo = $('.gridinfo'), btnGrid = $('[data-act=grid]');
  const btnMode = $('[data-act=mode]'), btnList = $('[data-act=list]'), badge = $('.badge');
  document.documentElement.appendChild(host);

  // вікові ворота (html:not(.age-ok), [data-age-gate]): поки вони показані, інструмент вимкнений і прихований; з'являється після підтвердження віку
  const htmlEl = document.documentElement;
  const gateOpen = () => !!document.querySelector('[data-age-gate]') && !htmlEl.classList.contains('age-ok');
  const syncGate = () => { host.style.display = gateOpen() ? 'none' : ''; };
  syncGate();
  new MutationObserver(syncGate).observe(htmlEl, { attributes: true, attributeFilter: ['class'] });

  // keep typing/clicks inside the overlay away from site handlers
  ['keydown', 'keyup', 'keypress'].forEach((t) => host.addEventListener(t, (e) => e.stopPropagation()));

  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') n.className = v;
      else if (k === 'on') for (const [ev, fn] of Object.entries(v)) n.addEventListener(ev, fn);
      else if (k in n) n[k] = v; else n.setAttribute(k, v);
    }
    kids.flat().forEach((c) => n.append(c));
    return n;
  };
  const say = (msg) => { toast.textContent = msg; toast.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('show'), 3200); };

  // ---------- API ----------
  async function api(method, path, body) {
    const r = await fetch(API + path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error(`${method} ${path}: ${r.status}`);
    return r.json();
  }
  async function refresh() {
    try { st.comments = (await api('GET', '/comments')).comments; render(); } catch (e) { say('Не вдалося завантажити коментарі'); }
  }
  const pageComments = () => st.comments.filter((c) => c.url === PAGE()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const numOf = (c) => pageComments().indexOf(c) + 1;
  const visible = () => pageComments().filter((c) => st.filter === 'all' || c.status === st.filter);

  // ---------- geometry ----------
  const inHost = (n) => n === host;
  function pickAt(x, y) {
    const list = document.elementsFromPoint(x, y).filter((n) => !inHost(n));
    return list[0] || null;
  }
  function usable(node) {
    let n = node;
    while (n && n !== document.documentElement) {
      const r = n.getBoundingClientRect();
      if (r.width >= 1 && r.height >= 1) return n;
      n = n.parentElement;
    }
    return document.body;
  }
  function selectorOf(node) {
    const stable = (c) => !/^(is-|has-|js-)|active|open|visible|hover|focus|reveal|in-view|lenis|current|selected|loaded/i.test(c) && /^[A-Za-z_][\w-]*$/.test(c);
    const parts = [];
    let n = node;
    while (n && n.nodeType === 1 && n !== document.documentElement && parts.length < 10) {
      if (n.id && /^[A-Za-z][\w-]*$/.test(n.id) && document.querySelectorAll('#' + CSS.escape(n.id)).length === 1) { parts.unshift('#' + CSS.escape(n.id)); break; }
      let s = n.tagName.toLowerCase();
      if (n === document.body) { parts.unshift(s); break; }
      const cls = [...n.classList].filter(stable).slice(0, 2);
      if (cls.length) s += cls.map((c) => '.' + CSS.escape(c)).join('');
      const sibs = [...n.parentElement.children].filter((m) => m.matches(s));
      if (sibs.length > 1) s += `:nth-of-type(${[...n.parentElement.children].filter((m) => m.tagName === n.tagName).indexOf(n) + 1})`;
      parts.unshift(s);
      const sel = parts.join(' > ');
      try { if (document.querySelectorAll(sel).length === 1 && document.querySelector(sel) === node) return sel; } catch { /* keep climbing */ }
      n = n.parentElement;
    }
    return parts.join(' > ');
  }
  function resolveRect(c) {
    const a = c.anchor;
    if (a) {
      let n = null;
      try { n = document.querySelector(a.selector); } catch { /* bad selector */ }
      if (n) {
        const r = n.getBoundingClientRect();
        if (r.width >= 1 && r.height >= 1) return { x: r.left + a.relX * r.width, y: r.top + a.relY * r.height, w: Math.max(a.relW * r.width, 4), h: Math.max(a.relH * r.height, 4), anchored: true };
      }
    }
    return { x: c.rect.x - sx(), y: c.rect.y - sy(), w: c.rect.w, h: c.rect.h, anchored: false };
  }
  function describe(node, rectDoc) {
    const cs = getComputedStyle(node), r = node.getBoundingClientRect();
    const ar = { x: r.left + sx(), y: r.top + sy(), w: r.width, h: r.height };
    return {
      anchor: { selector: selectorOf(node), relX: (rectDoc.x - ar.x) / ar.w, relY: (rectDoc.y - ar.y) / ar.h, relW: rectDoc.w / ar.w, relH: rectDoc.h / ar.h },
      elementText: (node.innerText || node.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 120),
      computed: {
        'font-size': cs.fontSize, 'font-weight': cs.fontWeight, color: cs.color, 'background-color': cs.backgroundColor,
        'border-radius': cs.borderRadius, size: `${Math.round(r.width)}×${Math.round(r.height)}`,
      },
    };
  }

  // ---------- rendering ----------
  const place = (n, r) => { n.style.left = r.x + 'px'; n.style.top = r.y + 'px'; n.style.width = r.w + 'px'; n.style.height = r.h + 'px'; };
  let itemNodes = new Map();

  function render() {
    badge.textContent = pageComments().filter((c) => c.status === 'open').length;
    itemsEl.textContent = '';
    itemNodes = new Map();
    // pins/boxes are always built (so the list can flash one outside the mode), but CSS shows them only in the comment mode or while flashed
    for (const c of visible()) {
      const pin = el('button', { class: 'pin', title: 'Коментар ' + numOf(c), textContent: String(numOf(c)), on: {
        mousedown: (e) => { e.stopPropagation(); e.preventDefault(); },
        pointerdown: (e) => e.stopPropagation(),
        click: (e) => { e.stopPropagation(); openEdit(c.id); },
      } });
      const item = el('div', { class: `item ${c.status}` }, el('div', { class: 'box' }), pin);
      itemsEl.append(item);
      itemNodes.set(c.id, item);
    }
    renderPanel();
    layout();
  }
  function layout() {
    for (const [id, node] of itemNodes) {
      const c = st.comments.find((x) => x.id === id);
      if (!c) continue;
      const r = resolveRect(c);
      place(node, r);
      node.classList.toggle('lost', !r.anchored);
      node.classList.toggle('active', st.openId === id);
      node.classList.toggle('flash', st.flashId === id);
      node.style.display = r.y + r.h < -40 || r.y > innerHeight + 40 ? 'none' : '';
    }
    if (st.draft?.live && st.draft.info.anchor) { // restored draft: follow the anchor element (it may still be animating after reload)
      const r = resolveRect({ anchor: st.draft.info.anchor, rect: st.draft.rect });
      if (r.anchored) st.draft.rect = { x: r.x + sx(), y: r.y + sy(), w: r.w, h: r.h };
    }
    if (st.draft) { place(selBox, { x: st.draft.rect.x - sx(), y: st.draft.rect.y - sy(), w: st.draft.rect.w, h: st.draft.rect.h }); }
    if (st.drag?.active) drawDrag();
    positionPop();
  }
  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; layout(); }); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('load', schedule);
  addEventListener('pagehide', () => saveDraft(true));
  addEventListener('beforeunload', () => saveDraft(true));
  setInterval(() => { if (itemNodes.size || st.draft) layout(); }, 500);
  addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

  function renderPanel() {
    panel.textContent = '';
    const list = visible();
    panel.append(
      el('header', {}, el('span', { textContent: 'Коментарі сторінки' })),
      el('div', { class: 'tabs' }, ...[['open', 'Відкриті'], ['done', 'Виконані'], ['all', 'Усі']].map(([k, t]) => el('button', { class: 'tab' + (st.filter === k ? ' on' : ''), textContent: t, on: { click: () => { st.filter = k; render(); } } }))),
      el('div', { class: 'list' }, list.length ? list.map((c) => el('div', { class: 'row ' + c.status, on: { click: () => goTo(c) } },
        el('div', { class: 'n', textContent: String(numOf(c)) }),
        el('div', { class: 't' }, el('b', { textContent: `${TYPES[c.type] || c.type}${c.status === 'done' ? ' · виконано' : ''}` }), el('span', { textContent: c.text || '(без тексту)' })))) : el('div', { class: 'empty', textContent: 'Немає коментарів' })),
    );
  }
  function goTo(c) {
    const r = resolveRect(c);
    window.scrollTo({ top: Math.max(0, r.y + sy() - 140), behavior: 'smooth' });
    st.flashId = c.id; layout();
    setTimeout(() => { if (st.flashId === c.id) { st.flashId = null; layout(); } }, 1500);
    setTimeout(layout, 700);
  }

  // ---------- popover ----------
  let popState = null; // {mode:'new'|'edit', id, type}
  let popTa = null; // textarea of the open popover
  // ---------- draft: survives a page reload (sessionStorage, this tab only) ----------
  const DRAFT_KEY = 'review.draft', DRAFT_TTL = 30 * 60 * 1000;
  let draftTimer = 0;
  const draftStore = {
    get() { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; } },
    set(d) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* ignore */ } },
    del() { try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } },
  };
  function clearDraft() { clearTimeout(draftTimer); draftTimer = 0; draftStore.del(); }
  function currentDraft() {
    if (!popState || !popTa || !pop.classList.contains('open')) return null;
    const base = { url: PAGE(), text: popTa.value, type: popState.type, ts: Date.now() };
    if (popState.mode === 'edit') return { ...base, mode: 'edit', id: popState.id };
    if (!st.draft) return null;
    return { ...base, mode: 'new', rect: st.draft.rect, info: st.draft.info };
  }
  function saveDraft(now = false) {
    clearTimeout(draftTimer); draftTimer = 0;
    const write = () => { const d = currentDraft(); if (d) draftStore.set(d); };
    if (now) write(); else draftTimer = setTimeout(write, 150);
  }
  function restoredHint() {
    const h = el('div', { class: 'hint', textContent: 'Чернетку відновлено після оновлення сторінки' });
    setTimeout(() => h.remove(), 4000);
    return h;
  }
  function positionPop() {
    if (!pop.classList.contains('open') || !popState) return;
    let r;
    if (popState.mode === 'new' && st.draft) r = { x: st.draft.rect.x - sx(), y: st.draft.rect.y - sy(), w: st.draft.rect.w, h: st.draft.rect.h };
    else { const c = st.comments.find((x) => x.id === popState.id); if (!c) return closePop(); r = resolveRect(c); }
    const w = 320, h = pop.offsetHeight || 220;
    let x = r.x + r.w + 12; if (x + w > innerWidth - 12) x = r.x - w - 12;
    if (x < 12) x = Math.min(Math.max(12, r.x), innerWidth - w - 12);
    let y = Math.min(Math.max(12, r.y), innerHeight - h - 12);
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  }
  function closePop() {
    clearDraft(); popTa = null;
    pop.classList.remove('open'); pop.textContent = ''; popState = null; st.openId = null;
    if (st.draft) { st.draft = null; selBox.style.display = 'none'; selBox.classList.remove('draft'); }
    layout();
  }
  function typePicker(cur, onPick) {
    const wrap = el('div', { class: 'types' });
    const draw = (v) => { wrap.textContent = ''; for (const [k, t] of Object.entries(TYPES)) wrap.append(el('button', { class: 'tab' + (v === k ? ' on' : ''), textContent: t, on: { click: () => { onPick(k); draw(k); } } })); };
    draw(cur); return wrap;
  }
  function openNew(initial) {
    popState = { mode: 'new', type: initial?.type || 'design' };
    const ta = el('textarea', { placeholder: 'Що змінити?', rows: 4, value: initial?.text || '', on: {
      keydown: (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save.click(); },
      input: () => saveDraft(),
    } });
    popTa = ta;
    const save = el('button', { class: 'primary', textContent: 'Зберегти', on: { click: () => saveNew(ta, save) } });
    pop.textContent = '';
    pop.append(el('h4', {}, el('span', { textContent: 'Новий коментар' })), ta, typePicker(popState.type, (k) => { popState.type = k; saveDraft(); }),
      el('div', { class: 'meta', textContent: `Вікно ${innerWidth}×${innerHeight} · ${st.draft.info.elementText ? '«' + st.draft.info.elementText.slice(0, 50) + '»' : st.draft.info.anchor.selector.slice(-60)}` }),
      initial ? restoredHint() : '',
      el('div', { class: 'acts' }, el('button', { textContent: 'Скасувати', on: { click: closePop } }), save));
    pop.classList.add('open'); positionPop(); ta.focus();
    if (initial) ta.setSelectionRange(ta.value.length, ta.value.length); // restored draft: caret at the end
    else saveDraft(true);
  }
  // html2canvas 1.4 cannot parse color()/oklch()/lab(): rewrite them to rgba in the cloned document.
  const MODERN = /(oklch|oklab|lab|lch|color)\([^()]*(?:\([^()]*\)[^()]*)*\)/g;
  const px = document.createElement('canvas'); px.width = px.height = 1;
  const pctx = px.getContext('2d', { willReadFrequently: true });
  const toRgba = (v) => {
    try { pctx.clearRect(0, 0, 1, 1); pctx.fillStyle = '#000'; pctx.fillStyle = v; pctx.fillRect(0, 0, 1, 1); const d = pctx.getImageData(0, 0, 1, 1).data; return `rgba(${d[0]},${d[1]},${d[2]},${(d[3] / 255).toFixed(3)})`; } catch { return 'rgba(0,0,0,0)'; }
  };
  const COLOR_PROPS = ['color', 'background-color', 'background-image', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'text-decoration-color', 'box-shadow', 'text-shadow', 'fill', 'stroke'];
  function fixColors(doc) {
    const win = doc.defaultView;
    for (const n of doc.querySelectorAll('*')) {
      const cs = win.getComputedStyle(n);
      for (const p of COLOR_PROPS) {
        const v = cs.getPropertyValue(p);
        if (v && /(oklch|oklab|lab|lch|color)\(/.test(v)) n.style.setProperty(p, v.replace(MODERN, (m) => toRgba(m)), 'important');
      }
    }
  }
  async function captureShot(rect) {
    try {
      const { default: html2canvas } = await import('html2canvas');
      const scale = Math.min(1, 1200 / Math.max(rect.w, 1));
      const run = (s) => html2canvas(document.documentElement, {
        x: rect.x, y: rect.y, width: rect.w, height: rect.h, scrollX: 0, scrollY: 0, scale: s, useCORS: true, logging: false, backgroundColor: '#ffffff',
        windowWidth: document.documentElement.clientWidth, windowHeight: document.documentElement.clientHeight, ignoreElements: inHost, onclone: (doc) => fixColors(doc),
      });
      let url = (await Promise.race([run(scale), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 15000))])).toDataURL('image/png');
      if (url.length > 1.5e6) url = (await run(scale / 2)).toDataURL('image/png');
      return url.length < 1.7e6 ? url : null;
    } catch (e) { console.warn('[review] screenshot skipped:', e.message); return null; }
  }
  async function saveNew(ta, btn) {
    const text = ta.value.trim();
    if (!text) { ta.focus(); return say('Додай текст коментаря'); }
    btn.disabled = true; btn.textContent = 'Зберігаю…';
    const d = st.draft;
    const shot = await captureShot(d.rect);
    try {
      const body = { url: PAGE(), title: document.title, viewport: { w: innerWidth, h: innerHeight }, scrollY: sy(), rect: d.rect, anchor: d.info.anchor, elementText: d.info.elementText, computed: d.info.computed, text, type: popState.type, shot };
      const c = await api('POST', '/comments', body);
      st.comments.push(c); closePop(); render(); say('Коментар збережено' + (shot ? '' : ' (без скриншота)'));
    } catch (e) { btn.disabled = false; btn.textContent = 'Зберегти'; say('Помилка збереження: ' + e.message); }
  }
  function openEdit(id, initial) {
    const c = st.comments.find((x) => x.id === id); if (!c) return;
    if (st.draft) closePop();
    popState = { mode: 'edit', id, type: initial?.type || c.type }; st.openId = id;
    const ta = el('textarea', { value: initial?.text ?? c.text, rows: 4, on: { input: () => saveDraft() } });
    popTa = ta;
    const act = async (patch, msg) => { try { const u = await api('PATCH', '/comments/' + id, patch); Object.assign(c, u); closePop(); render(); if (msg) say(msg); } catch (e) { say('Помилка: ' + e.message); } };
    let armed = false;
    const del = el('button', { class: 'danger', textContent: 'Видалити', on: { click: async () => {
      if (!armed) { armed = true; del.textContent = 'Точно?'; return; }
      try { await api('DELETE', '/comments/' + id); st.comments = st.comments.filter((x) => x.id !== id); closePop(); render(); } catch (e) { say('Помилка: ' + e.message); }
    } } });
    pop.textContent = '';
    pop.append(el('h4', {}, el('span', { textContent: `№${numOf(c)} · ${c.status === 'done' ? 'виконано' : 'відкрито'}` }), el('button', { class: 'link', textContent: 'Закрити', on: { click: closePop } })),
      c.shot ? el('img', { src: `${API}/shot/${c.id}?t=${Date.now()}`, alt: '' }) : '',
      ta, typePicker(popState.type, (k) => { popState.type = k; saveDraft(); }),
      el('div', { class: 'meta', textContent: `Вікно ${c.viewport.w}×${c.viewport.h}${c.elementText ? ' · «' + c.elementText.slice(0, 50) + '»' : ''}` }),
      initial ? restoredHint() : '',
      el('div', { class: 'acts' }, del,
        el('button', { textContent: c.status === 'done' ? 'Відкрити знову' : 'Виконано', on: { click: () => act({ status: c.status === 'done' ? 'open' : 'done' }) } }),
        el('button', { class: 'primary', textContent: 'Зберегти', on: { click: () => act({ text: ta.value.trim(), type: popState.type }, 'Збережено') } })));
    pop.classList.add('open'); layout(); positionPop();
    if (initial) ta.setSelectionRange(ta.value.length, ta.value.length); // restored draft: caret at the end
    else saveDraft(true);
  }

  // ---------- mode & mouse ----------
  function setMode(on) {
    if (on && window.__review?.edit?.isOn()) window.__review.edit.leave(); // Едіт і Коментар взаємовиключні (обидва перехоплюють кліки)
    st.mode = on; capture.hidden = !on; $('.root').classList.toggle('mode', on); // .root.mode shows pins (see overlay.css)
    btnMode.classList.toggle('on', on);
    btnMode.firstChild.textContent = on ? 'Вийти ' : 'Коментар ';
    btnMode.querySelector('kbd').textContent = on ? 'Esc' : 'C';
    if (!on) { hoverBox.style.display = 'none'; selBox.style.display = st.draft ? 'block' : 'none'; st.drag = null; if (st.draft) closePop(); }
  }
  function drawDrag() {
    const d = st.drag; if (!d?.active) return;
    const x1 = d.x0 - sx(), y1 = d.y0 - sy(), x2 = d.cx, y2 = d.cy;
    place(selBox, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
    selBox.style.display = 'block';
  }
  capture.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    if (popState) closePop();
    st.drag = { x0: e.clientX + sx(), y0: e.clientY + sy(), cx: e.clientX, cy: e.clientY, sx: e.clientX, sy: e.clientY, active: false };
    hoverBox.style.display = 'none';
  });
  window.addEventListener('mousemove', (e) => {
    if (!st.mode) return;
    const d = st.drag;
    if (d) {
      d.cx = e.clientX; d.cy = e.clientY;
      if (!d.active && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.active = true;
      drawDrag();
    } else if (e.target === host) {
      const n = pickAt(e.clientX, e.clientY);
      if (!n || n === document.documentElement) { hoverBox.style.display = 'none'; return; }
      const r = n.getBoundingClientRect();
      place(hoverBox, { x: r.left, y: r.top, w: r.width, h: r.height }); hoverBox.style.display = 'block';
    }
  }, true);
  window.addEventListener('mouseup', (e) => {
    const d = st.drag; if (!d || e.button !== 0) return;
    st.drag = null;
    let rect, node;
    if (d.active) {
      const x = Math.min(d.x0, e.clientX + sx()), y = Math.min(d.y0, e.clientY + sy());
      rect = { x, y, w: Math.abs(e.clientX + sx() - d.x0), h: Math.abs(e.clientY + sy() - d.y0) };
      if (rect.w < 8 || rect.h < 8) { selBox.style.display = 'none'; return; }
      const cx = rect.x + rect.w / 2 - sx(), cy = rect.y + rect.h / 2 - sy();
      node = (cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight && pickAt(cx, cy)) || pickAt(e.clientX, e.clientY);
    } else {
      node = pickAt(e.clientX, e.clientY);
      if (!node) return;
      const r = node.getBoundingClientRect();
      rect = { x: r.left + sx(), y: r.top + sy(), w: r.width, h: r.height };
    }
    node = usable(node);
    hoverBox.style.display = 'none';
    st.draft = { rect, info: describe(node, rect) };
    selBox.classList.add('draft'); selBox.style.display = 'block';
    layout(); openNew();
  }, true);

  // ---------- grid overlay (dev): реальна розкладка site_brand ----------
  // Масштаб --u (1u = 1px макета 1920; на 1200 = 0.625px). Поле сторінки --space-product-page-x (50u), зазор --space-product-col-gap (5u),
  // ширина сторінки --size-product-page-w (1920u, по центру), 12 колонок --columns-contacts. Якщо на сторінці є реальний grid-контейнер
  // (.product: фото 905u + панель 910u; .contacts: 12 колонок) — беремо його фактичні колонки (computed grid-template-columns) і його поля.
  // Інші сторінки: 12 колонок за токенами сторінки.
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;left:0;top:0;height:0;visibility:hidden;pointer-events:none;';
  $('.root').append(probe);
  const lenPx = (expr, d) => { probe.style.width = ''; probe.style.width = expr; const w = probe.getBoundingClientRect().width; return w > 0 ? w : d; };
  const token = (cs, name, d) => { const v = parseFloat(cs.getPropertyValue(name)); return Number.isFinite(v) ? v : d; };
  const r1 = (v) => Math.round(v * 10) / 10;
  const REAL = '.product, .contacts';
  function drawGrid() {
    if (!st.grid) return;
    const cs = getComputedStyle(document.documentElement);
    const cw = document.documentElement.clientWidth;
    const u = lenPx('calc(1 * var(--u))', 1);
    const pageW = Math.min(cw, lenPx('var(--size-product-page-w)', 1920 * u));
    let padX = lenPx('var(--space-product-page-x)', 50 * u), gap = lenPx('var(--space-product-col-gap)', 5 * u);
    let cols = Math.max(1, Math.round(token(cs, '--columns-contacts', 12)));
    let tpl = null, src = 'токени сторінки';
    const real = document.querySelector(REAL);
    if (real) {
      const rcs = getComputedStyle(real), list = rcs.gridTemplateColumns.split(' ').map(parseFloat).filter((v) => v > 0);
      if (rcs.display === 'grid' && list.length) {
        tpl = list.map((v) => v + 'px').join(' '); cols = list.length; gap = parseFloat(rcs.columnGap) || 0; padX = parseFloat(rcs.paddingLeft) || padX;
        src = real.classList.contains('product') ? '.product' : '.contacts';
      }
    }
    gridLayer.style.width = cw + 'px';
    gridBox.style.maxWidth = pageW + 'px';
    gridBox.style.paddingInline = padX + 'px';
    gridCols.style.gridTemplateColumns = tpl || `repeat(${cols}, minmax(0, 1fr))`;
    gridCols.style.gap = gap + 'px';
    if (gridCols.children.length !== cols) { gridCols.textContent = ''; for (let i = 0; i < cols; i++) gridCols.append(el('div', { class: 'gcol' })); }
    const widths = [...gridCols.children].map((n) => n.getBoundingClientRect().width);
    const uniq = []; // унікальні колонки за значенням у u (0.1u)
    for (const w of widths) if (!uniq.some((x) => r1(x / u) === r1(w / u))) uniq.push(w);
    const both = (px) => `${r1(px / u)}u (${r1(px)}px)`;
    const colTxt = uniq.length === 1 ? `колонка ${both(uniq[0])}` : `колонки ${uniq.map((w) => r1(w / u) + 'u').join(' + ')} (${uniq.map((w) => r1(w) + 'px').join(' + ')})`;
    gridInfo.textContent = `${cols} кол · ${colTxt} · зазор ${both(gap)} · поле ${both(padX)} · сторінка ${both(pageW)} · 1u=${r1(u * 1000) / 1000}px · ${src}`;
  }
  function setGrid(on) {
    st.grid = on; store.set('review.grid', on ? '1' : '0');
    gridLayer.hidden = !on; btnGrid.classList.toggle('on', on);
    drawGrid();
  }
  addEventListener('resize', drawGrid);
  addEventListener('load', drawGrid);
  new MutationObserver(() => { if (st.grid) requestAnimationFrame(drawGrid); }).observe(document.body, { childList: true }); // сторінки з JS-рендером (товар) створюють .product після завантаження
  setInterval(() => { if (st.grid) drawGrid(); }, 800); // шаблон колонок може змінитись після рендеру/шрифтів

  // ---------- controls ----------
  btnGrid.addEventListener('click', () => setGrid(!st.grid));
  btnMode.addEventListener('click', () => setMode(!st.mode));
  btnList.addEventListener('click', () => { st.panel = !st.panel; panel.classList.toggle('open', st.panel); if (st.panel) refresh(); });
  document.addEventListener('keydown', (e) => {
    if (gateOpen()) return;
    const t = e.composedPath()[0];
    const typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if (e.key === 'Escape') {
      // Esc перехоплюємо ЛИШЕ коли оверлей має що закрити (поповер/режим коментаря/список) і глушимо подію: меню хедера, селект тощо її не побачать.
      if (popState) closePop(); else if (st.mode) setMode(false); else if (st.panel) { st.panel = false; panel.classList.remove('open'); } else return;
      e.preventDefault(); e.stopPropagation();
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'KeyG' || e.key === 'g' || e.key === 'G' || e.key === 'п' || e.key === 'П') { if (popState) return; e.preventDefault(); setGrid(!st.grid); return; }
    if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С') { e.preventDefault(); setMode(!st.mode); }
  }, true);
  // block site interaction (links/buttons) while in comment mode: handled by the capture layer covering the page.

  // ---------- restore draft after a reload (needs comments loaded and the page laid out) ----------
  function restoreDraft() {
    const d = draftStore.get();
    if (!d || typeof d !== 'object') return;
    if (!(Date.now() - d.ts <= DRAFT_TTL)) return clearDraft();
    if (d.url !== PAGE()) return;
    if (d.mode === 'edit') {
      if (!st.comments.some((c) => c.id === d.id)) return; // not clearing: the list may have failed to load
      setMode(true);
      return openEdit(d.id, { text: d.text, type: d.type });
    }
    if (d.mode !== 'new' || !d.rect || !d.info?.anchor) return clearDraft();
    const res = resolveRect({ anchor: d.info.anchor, rect: d.rect });
    const rect = res.anchored ? { x: res.x + sx(), y: res.y + sy(), w: res.w, h: res.h } : d.rect;
    st.draft = { rect, info: d.info, live: res.anchored };
    setMode(true);
    selBox.classList.add('draft'); selBox.style.display = 'block';
    layout(); openNew({ text: d.text, type: d.type });
  }

  render();
  const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise((ok) => addEventListener('load', ok, { once: true }));
  Promise.all([loaded, refresh()]).then(restoreDraft).catch((e) => console.warn('[review] draft restore skipped:', e.message));
  setGrid(store.get('review.grid', '0') === '1');
  const inspector = initInspector({
    shadow, root: $('.root'), beforeLayers: $('.capture'), bar: $('.bar'), beforeButton: btnMode, store,
    blocked: () => !!popState || gateOpen(),
  });
  // Едіт (E): живий перегляд правок + запис у review/edits.json (dev-tools/review/edit.js)
  const edit = initEdit({
    root: $('.root'), bar: $('.bar'), beforeButton: btnMode, host, api, say, mk: el, captureShot, selectorOf, PAGE,
    blocked: () => !!popState || gateOpen(),
    leaveOthers: () => { if (st.mode) setMode(false); },
  });
  window.__review = { state: st, refresh, setMode, setGrid, inspector, edit };
}
