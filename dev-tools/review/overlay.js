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

  const st = { comments: [], mode: false, panel: false, filter: 'open', draft: null, openId: null, drag: null, flashId: null, grid: false, refs: null };

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
  async function api(method, path, body, opts) {
    const r = await fetch((path.startsWith('/ref') ? '/__review' : API) + path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, ...(opts || {}) });
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
        el('div', { class: 't' }, el('b', { textContent: `${TYPES[c.type] || c.type}${c.status === 'done' ? ' · виконано' : ''}` }), el('span', { textContent: c.text || '(без тексту)' }), attachStrip(c)),
        c.status === 'open' ? el('button', { class: 'row-add', type: 'button', textContent: '📎', title: 'Додати реф до коментаря', 'aria-label': `Додати реф до коментаря ${numOf(c)}`, on: { click: (e) => { e.stopPropagation(); goTo(c); openEdit(c.id, { focusRefs: true }); } } }) : '')) : el('div', { class: 'empty', textContent: 'Немає коментарів' })),
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
    clearDraft(); popTa = null; if (st.refs) { st.refs.destroy(); st.refs = null; }
    pop.classList.remove('open'); pop.textContent = ''; popState = null; st.openId = null;
    if (st.draft) { st.draft = null; selBox.style.display = 'none'; selBox.classList.remove('draft'); }
    layout();
  }
  function typePicker(cur, onPick) {
    const wrap = el('div', { class: 'types' });
    const draw = (v) => { wrap.textContent = ''; for (const [k, t] of Object.entries(TYPES)) wrap.append(el('button', { class: 'tab' + (v === k ? ' on' : ''), textContent: t, on: { click: () => { onPick(k); draw(k); } } })); };
    draw(cur); return wrap;
  }

  // ---------- медіа-реф вкладення до коментаря ----------
  // Вставка з буфера (Cmd/Ctrl+V), drag&drop на форму, кнопка «Додати реф», поле посилань. Ліміти дублюються на сервері (dev-tools/refs-api.js).
  const REF_MAX_FILE = 25 * 1024 * 1024, REF_MAX = 8;
  const REF_EXT = { png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image', avif: 'image', svg: 'image', pdf: 'pdf', mp4: 'video', webm: 'video', mov: 'video' };
  const REF_ACCEPT = Object.keys(REF_EXT).map((e) => '.' + e).join(',');
  const REF_ICON = { pdf: 'PDF', video: 'VID', link: 'URL', image: 'IMG' };
  const fmtSize = (b) => (b < 1024 ? `${b} Б` : b < 1048576 ? `${Math.round(b / 1024)} КБ` : `${(b / 1048576).toFixed(1)} МБ`);
  const attsOf = (c) => (Array.isArray(c?.attachments) ? c.attachments : []);
  const refUrl = (id, a) => `/__review/ref/${id}/${encodeURIComponent(a.file)}`;
  const extOfName = (n) => { const m = /\.([A-Za-z0-9]{1,6})$/.exec(n || ''); return m ? m[1].toLowerCase() : ''; };
  let pasteSeq = 0;
  function imgSize(url) {
    return new Promise((ok) => {
      const im = new Image(); const t = setTimeout(() => ok(null), 4000);
      im.onload = () => { clearTimeout(t); ok(im.naturalWidth > 0 ? { w: im.naturalWidth, h: im.naturalHeight } : null); };
      im.onerror = () => { clearTimeout(t); ok(null); };
      im.src = url;
    });
  }
  // mode 'new': файли летять у staging (прогрес), на «Зберегти» коментар забирає їх; mode 'edit': прямо в refs/<id>/ і в comments.json
  function makeRefs({ mode, c }) {
    const stage = 's' + [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const items = []; // new: усі; edit: лише завантажувані/з помилкою
    const blobs = [];
    const err = el('div', { class: 'ref-err', role: 'alert', 'aria-live': 'assertive' });
    const list = el('ul', { class: 'ref-list', 'aria-label': 'Вкладені реф-матеріали' });
    const count = el('span', { class: 'ref-count' });
    const input = el('input', { type: 'file', multiple: true, accept: REF_ACCEPT, class: 'ref-file', tabindex: -1, 'aria-hidden': 'true' });
    const addBtn = el('button', { class: 'ref-add', type: 'button', textContent: 'Додати реф', 'aria-label': 'Додати реф: вибрати файли', on: { click: () => input.click() } });
    const linkIn = el('input', { type: 'text', class: 'ref-link', placeholder: 'Посилання: YouTube, Figma, сайт, картинка', 'aria-label': 'Посилання на реф (Enter, щоб додати)', on: {
      keydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addLinks(linkIn.value); } },
      paste: (e) => { const t = e.clipboardData?.getData('text') || ''; if (/\s/.test(t.trim())) { e.preventDefault(); e.stopPropagation(); addLinks(t); } },
    } });
    const linkBtn = el('button', { class: 'ref-add', type: 'button', textContent: 'Додати', 'aria-label': 'Додати посилання', on: { click: () => addLinks(linkIn.value) } });
    const hint = el('div', { class: 'ref-hint', textContent: `Вставте ⌘/Ctrl+V, перетягніть файли сюди або «Додати реф». Файл до 25 МБ, до ${REF_MAX} вкладень. png, jpg, webp, gif, avif, svg, pdf, mp4, webm, mov` });
    const node = el('div', { class: 'refs', role: 'group', 'aria-label': 'Реф-медіа до коментаря' },
      el('div', { class: 'ref-row' }, addBtn, count), list, el('div', { class: 'ref-row' }, linkIn, linkBtn), err, hint, input);
    let errT = 0;
    const fail = (msg) => { err.textContent = msg; clearTimeout(errT); errT = setTimeout(() => { err.textContent = ''; }, 7000); };
    const persisted = () => (mode === 'edit' ? attsOf(c) : []);
    const total = () => persisted().length + items.filter((i) => i.state !== 'err').length;
    const busy = () => items.some((i) => i.state === 'up');

    function row(thumb, name, sub, extra, remove) {
      return el('li', { class: 'ref-item' }, thumb, el('div', { class: 'ref-meta' }, el('span', { class: 'ref-name', textContent: name, title: name }), sub, extra || ''),
        el('button', { class: 'ref-x', type: 'button', textContent: '×', 'aria-label': `Видалити реф ${name}`, on: { click: remove } }));
    }
    const icon = (t) => el('span', { class: 'ref-ic', textContent: REF_ICON[t] || 'REF', 'aria-hidden': 'true' });
    function draw() {
      list.textContent = '';
      persisted().forEach((a, i) => {
        const href = a.type === 'link' ? a.url : refUrl(c.id, a);
        const thumb = el('a', { class: 'ref-th', href, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Відкрити ${a.name}` }, a.type === 'image' ? el('img', { src: href, alt: '' }) : icon(a.type));
        list.append(row(thumb, a.name, el('span', { class: 'ref-sub', textContent: a.type === 'link' ? (a.kind || 'link') : fmtSize(a.size || 0) }), '', () => removePersisted(i)));
      });
      for (const it of items) {
        const thumb = it.type === 'image' && it.blob && it.state !== 'err' ? el('span', { class: 'ref-th' }, el('img', { src: it.blob, alt: '' })) : el('span', { class: 'ref-th' }, icon(it.type));
        const sub = it.state === 'err' ? el('span', { class: 'ref-sub bad', role: 'alert', textContent: it.err || 'Помилка' })
          : it.state === 'up' ? el('span', { class: 'ref-sub', textContent: `Завантаження ${it.pct}%` }) : el('span', { class: 'ref-sub', textContent: it.type === 'link' ? it.att.kind : fmtSize(it.size) });
        const bar = it.state === 'up' ? el('progress', { class: 'ref-prog', max: 100, value: it.pct, 'aria-label': `Завантаження ${it.name}` }) : '';
        list.append(row(thumb, it.name, sub, bar, () => { const k = items.indexOf(it); if (k >= 0) items.splice(k, 1); if (it.xhr && it.state === 'up') it.xhr.abort(); draw(); }));
      }
      count.textContent = `${total()}/${REF_MAX}`;
      addBtn.disabled = linkBtn.disabled = total() >= REF_MAX;
      positionPop();
    }
    async function removePersisted(i) {
      try { const r = await api('DELETE', `/ref/${c.id}?i=${i}`); c.attachments = r.attachments; draw(); renderPanel(); } catch (e) { fail('Не вдалося видалити реф: ' + e.message); }
    }
    function upload(it, file) {
      const xhr = new XMLHttpRequest(); it.xhr = xhr;
      const q = `c=${mode === 'edit' ? c.id : stage}&name=${encodeURIComponent(file.name)}${it.w ? `&w=${it.w}&h=${it.h}` : ''}`;
      xhr.open('POST', `/__review/ref?${q}`);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) { it.pct = Math.min(99, Math.round((e.loaded / e.total) * 100)); draw(); } };
      xhr.onload = () => {
        let j = {}; try { j = JSON.parse(xhr.responseText); } catch { /* not json */ }
        if (xhr.status === 201 && j.attachment) {
          it.att = j.attachment; it.state = 'done'; it.pct = 100;
          if (mode === 'edit') { c.attachments = j.attachments; const k = items.indexOf(it); if (k >= 0) items.splice(k, 1); renderPanel(); }
        } else { it.state = 'err'; it.err = j.error || `Помилка ${xhr.status}`; if (it.blob) { URL.revokeObjectURL(it.blob); } }
        draw();
      };
      xhr.onerror = () => { it.state = 'err'; it.err = 'Немає звʼязку з сервером'; draw(); };
      xhr.send(file);
    }
    async function addFiles(files) {
      const rejected = [];
      for (const f0 of Array.from(files || [])) {
        let f = f0;
        const ext = extOfName(f.name), type = REF_EXT[ext];
        if (!type) { rejected.push(`Тип не підтримується: ${f.name || 'файл'}`); continue; }
        if (f.size > REF_MAX_FILE) { rejected.push(`Файл завеликий (макс. 25 МБ): ${f.name}`); continue; }
        if (f.size === 0) { rejected.push(`Порожній файл: ${f.name}`); continue; }
        if (total() >= REF_MAX) { rejected.push(`Забагато вкладень (макс. ${REF_MAX})`); break; }
        if (/^image\.\w+$/i.test(f.name)) f = new File([f], `paste-${Date.now().toString(36)}-${++pasteSeq}.${ext}`, { type: f.type });
        const it = { name: f.name, size: f.size, type, state: 'up', pct: 0 };
        if (type === 'image') { it.blob = URL.createObjectURL(f); blobs.push(it.blob); const d = await imgSize(it.blob); if (d) { it.w = d.w; it.h = d.h; } }
        items.push(it); draw(); upload(it, f);
      }
      if (rejected.length) { fail(rejected.join('. ')); say(rejected[0]); }
    }
    async function addLinks(text) {
      const urls = String(text || '').split(/[\s,]+/).filter(Boolean);
      if (!urls.length) return;
      const bad = [];
      for (const u of urls) {
        if (total() >= REF_MAX) { bad.push(`Забагато вкладень (макс. ${REF_MAX})`); break; }
        let url; try { url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u); } catch { bad.push(`Некоректне посилання: ${u}`); continue; }
        if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) { bad.push(`Некоректне посилання (потрібен http/https): ${u}`); continue; }
        if (mode === 'edit') {
          try { const r = await api('POST', '/ref', { c: c.id, url: url.href }); c.attachments = r.attachments; renderPanel(); } catch (e) { bad.push('Не вдалося додати посилання: ' + e.message); }
        } else {
          const host = url.hostname.replace(/^www\./, '');
          const kind = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/.test(host) ? 'video' : /(^|\.)figma\.com$/.test(host) ? 'figma' : /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(url.pathname) ? 'image' : 'site';
          items.push({ name: host, type: 'link', state: 'done', pct: 100, att: { type: 'link', url: url.href, name: host, kind } });
        }
      }
      linkIn.value = ''; draw();
      if (bad.length) fail(bad.join('. '));
    }
    input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
    draw();
    return {
      node, addFiles, addLinks, busy, addBtn,
      payload: () => ({
        stage,
        stageFiles: items.filter((i) => i.state === 'done' && i.type !== 'link').map((i) => ({ file: i.att.file, name: i.att.name, w: i.att.w, h: i.att.h })),
        links: items.filter((i) => i.type === 'link').map((i) => ({ url: i.att.url })),
      }),
      destroy: () => { for (const x of items) if (x.xhr && x.state === 'up') x.xhr.abort(); blobs.forEach((b) => URL.revokeObjectURL(b)); },
    };
  }
  // drag&drop на форму й Cmd/Ctrl+V: працюють, поки відкрита форма з реф-блоком
  const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');
  ['dragenter', 'dragover'].forEach((t) => pop.addEventListener(t, (e) => { if (!st.refs || !hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; pop.classList.add('drop'); }));
  pop.addEventListener('dragleave', (e) => { if (!pop.contains(e.relatedTarget) && e.relatedTarget !== null) pop.classList.remove('drop'); else if (e.relatedTarget === null) pop.classList.remove('drop'); });
  pop.addEventListener('drop', (e) => { if (!st.refs || !hasFiles(e)) return; e.preventDefault(); pop.classList.remove('drop'); st.refs.addFiles(e.dataTransfer.files); });
  document.addEventListener('paste', (e) => {
    if (!st.refs || !pop.classList.contains('open')) return;
    const files = Array.from(e.clipboardData?.files || []);
    if (!files.length) return; // текст вставляється як звичайно
    e.preventDefault(); e.stopPropagation(); st.refs.addFiles(files);
  }, true);
  function attachStrip(c) { // мініатюри в списку коментарів
    const a = attsOf(c); if (!a.length) return '';
    return el('div', { class: 'row-refs', 'aria-label': `Реф-вкладень: ${a.length}` },
      ...a.slice(0, 4).map((x) => (x.type === 'image' ? el('img', { src: refUrl(c.id, x), alt: '', title: x.name }) : el('span', { class: 'ref-ic', textContent: REF_ICON[x.type] || 'REF', title: x.name }))),
      a.length > 4 ? el('span', { class: 'row-more', textContent: `+${a.length - 4}` }) : '', el('span', { class: 'row-more', textContent: `📎 ${a.length}` }));
  }
  function openNew(initial) {
    popState = { mode: 'new', type: initial?.type || 'design' };
    const ta = el('textarea', { placeholder: 'Що змінити?', rows: 4, value: initial?.text || '', on: {
      keydown: (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save.click(); },
      input: () => saveDraft(),
    } });
    popTa = ta;
    if (st.refs) st.refs.destroy();
    st.refs = makeRefs({ mode: 'new' });
    const save = el('button', { class: 'primary', textContent: 'Зберегти', on: { click: () => saveNew(ta, save) } });
    pop.textContent = '';
    pop.append(el('h4', {}, el('span', { textContent: 'Новий коментар' })), ta, typePicker(popState.type, (k) => { popState.type = k; saveDraft(); }), st.refs.node,
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
    if (st.refs?.busy()) return say('Дочекайся завантаження рефів');
    const refs = st.refs ? st.refs.payload() : {};
    btn.disabled = true; btn.textContent = 'Зберігаю…';
    const d = st.draft;
    const shot = await captureShot(d.rect);
    try {
      const body = { url: PAGE(), title: document.title, viewport: { w: innerWidth, h: innerHeight }, scrollY: sy(), rect: d.rect, anchor: d.info.anchor, elementText: d.info.elementText, computed: d.info.computed, text, type: popState.type, shot, ...refs };
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
    if (st.refs) st.refs.destroy();
    st.refs = c.status === 'open' || attsOf(c).length ? makeRefs({ mode: 'edit', c }) : null;
    const act = async (patch, msg) => { try { const u = await api('PATCH', '/comments/' + id, patch); Object.assign(c, u); closePop(); render(); if (msg) say(msg); } catch (e) { say('Помилка: ' + e.message); } };
    let armed = false;
    const del = el('button', { class: 'danger', textContent: 'Видалити', on: { click: async () => {
      if (!armed) { armed = true; del.textContent = 'Точно?'; return; }
      try { await api('DELETE', '/comments/' + id); st.comments = st.comments.filter((x) => x.id !== id); closePop(); render(); } catch (e) { say('Помилка: ' + e.message); }
    } } });
    pop.textContent = '';
    pop.append(el('h4', {}, el('span', { textContent: `№${numOf(c)} · ${c.status === 'done' ? 'виконано' : 'відкрито'}` }), el('button', { class: 'link', textContent: 'Закрити', on: { click: closePop } })),
      c.shot ? el('img', { src: `${API}/shot/${c.id}?t=${Date.now()}`, alt: '' }) : '',
      ta, typePicker(popState.type, (k) => { popState.type = k; saveDraft(); }), st.refs ? st.refs.node : '',
      el('div', { class: 'meta', textContent: `Вікно ${c.viewport.w}×${c.viewport.h}${c.elementText ? ' · «' + c.elementText.slice(0, 50) + '»' : ''}` }),
      initial ? restoredHint() : '',
      el('div', { class: 'acts' }, del,
        el('button', { textContent: c.status === 'done' ? 'Відкрити знову' : 'Виконано', on: { click: () => act({ status: c.status === 'done' ? 'open' : 'done' }) } }),
        el('button', { class: 'primary', textContent: 'Зберегти', on: { click: () => act({ text: ta.value.trim(), type: popState.type }, 'Збережено') } })));
    pop.classList.add('open'); layout(); positionPop();
    if (initial?.focusRefs && st.refs) st.refs.addBtn.focus();
    else if (initial?.text !== undefined) ta.setSelectionRange(ta.value.length, ta.value.length); // restored draft: caret at the end
    if (!initial?.focusRefs && initial?.text === undefined) saveDraft(true);
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

  // ---------- grid overlay (dev): АКТУАЛЬНА сітка site_brand ----------
  // Єдина сітка сайту береться з токенів (computed, без зашитих чисел): --grid-cols (кількість колонок), --grid-margin (поле від краю вікна до колонки 1),
  // --grid-gap (зазор між колонками), --grid-w (ширина всіх колонок = 1920u − 2 поля). Одиниця --u (1u = 1px макета 1920; на 1200 = 0.625px).
  // Зараз: 10 колонок, зазор 40u, поле 202.9u, колонка 115.42u, ширина сітки 1514.2u. Токен змінився → оверлей оновлюється сам.
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;left:0;top:0;height:0;visibility:hidden;pointer-events:none;';
  $('.root').append(probe);
  const lenPx = (expr, d) => { probe.style.width = ''; probe.style.width = expr; const w = probe.getBoundingClientRect().width; return w > 0 ? w : d; };
  const token = (cs, name, d) => { const v = parseFloat(cs.getPropertyValue(name)); return Number.isFinite(v) ? v : d; };
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;
  function drawGrid() {
    if (!st.grid) return;
    const cs = getComputedStyle(document.documentElement);
    const cw = document.documentElement.clientWidth;
    const u = lenPx('calc(1 * var(--u))', 1);
    const cols = Math.max(1, Math.round(token(cs, '--grid-cols', 10)));
    const padX = lenPx('var(--grid-margin)', 0), gap = lenPx('var(--grid-gap)', 0), gridW = lenPx('var(--grid-w)', cw - 2 * padX);
    gridLayer.style.width = cw + 'px';
    gridBox.style.maxWidth = (gridW + 2 * padX) + 'px';
    gridBox.style.paddingInline = padX + 'px';
    gridCols.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    gridCols.style.gap = gap + 'px';
    if (gridCols.children.length !== cols) { gridCols.textContent = ''; for (let i = 0; i < cols; i++) gridCols.append(el('div', { class: 'gcol' })); }
    const colW = gridCols.firstElementChild ? gridCols.firstElementChild.getBoundingClientRect().width : 0;
    const both = (px) => `${r2(px / u)}u (${r1(px)}px)`;
    gridInfo.textContent = `${cols} кол · колонка ${both(colW)} · зазор ${both(gap)} · поле ${both(padX)} · сітка ${both(gridW)} · 1u=${r1(u * 1000) / 1000}px`;
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
