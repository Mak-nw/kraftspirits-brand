// DEV-ONLY inspectors (loaded from overlay.js, never part of the build):
//   S = paddings (green), flex/grid gaps (orange), measured spacing between sibling boxes (violet) + hover redline distances, T = typography labels, K = colour labels.
// Everything is drawn in the overlay's Shadow DOM; the site's DOM/styles are only read.

const MODES = [
  { id: 's', code: 'KeyS', label: 'Стиль', key: 'review.insp.s', title: 'Відступи (зелений), gap (помаранчевий), відстані між сусідніми блоками (фіолетовий); при наведенні — відстані до сусідів і краю батька' },
  { id: 't', code: 'KeyT', label: 'Текст', key: 'review.insp.t', title: 'Типографіка: розмір/інтерліньяж, вага, трекінг, клас, шрифт' },
  { id: 'k', code: 'KeyK', label: 'Колір', key: 'review.insp.k', title: 'Кольори тексту, фону й рамки з назвою токена' },
];
const MAX_LABELS = 300;      // labels per mode per frame
const MAX_BANDS = 2500;      // filled bands per frame
const MIN_BAND = 3;          // px, thinnest band shown
const MIN_LABEL = 18;        // px, longest side of a band that gets a label
const GROUP_LIMIT = 30;      // longer lists of identical objects are cut to GROUP_SHOWN
const GROUP_SHOWN = 6;
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META', 'TEMPLATE', 'HEAD', 'TITLE', 'BR', 'WBR']);
// Класи ролей типографіки site_brand (src/styles/base.css): t-hero, t-h2, t-stat, t-stat-label, t-kicker, t-lead, t-chip, t-body, t-nav, t-nav-head,
// t-spec, t-btn(--alt), t-price, t-product-name, t-caption, t-breadcrumb, t-faq, t-acc, t-footer-head, t-wordmark, t-text, t-desc, t-note.
// Не список, а шаблон: нова роль t-* підхопиться автоматично.
const TYPE_CLASS = /^t-[a-z0-9]+(?:-[a-z0-9]+)*$/;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v) => (Math.round(v * 10) / 10).toString();
const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

export function initInspector({ shadow, root, beforeLayers, bar, beforeButton, store, blocked }) {
  // масштаб --u (1u = 1px макета 1920; на 1200 = 0.625px): розмір у u = px / u
  let uPx = 1, uAt = 0;
  const unitPx = () => {
    const now = performance.now();
    if (now - uAt > 300) {
      uAt = now;
      const p = document.createElement('div');
      p.style.cssText = 'position:absolute;visibility:hidden;width:calc(1000 * var(--u));height:0';
      root.append(p);
      const w = p.getBoundingClientRect().width / 1000;
      p.remove();
      uPx = w > 0 ? w : 1;
    }
    return uPx;
  };
  const st = { s: false, t: false, k: false };
  const stats = { lastMs: 0, avgMs: 0, runs: 0, labels: { s: 0, t: 0, k: 0 }, extra: { s: 0, t: 0, k: 0 } };

  // ---------- DOM ----------
  const layers = {};
  const wrap = document.createElement('div');
  wrap.className = 'insp';
  for (const m of MODES) {
    const d = document.createElement('div');
    d.className = `insp-layer insp-${m.id}`;
    d.hidden = true;
    layers[m.id] = d;
    wrap.append(d);
  }
  const hov = document.createElement('div');
  hov.className = 'insp-layer insp-h';
  hov.hidden = true;
  wrap.append(hov);
  const more = document.createElement('div');
  more.className = 'insp-more';
  more.hidden = true;
  wrap.append(more);
  root.insertBefore(wrap, beforeLayers);

  const buttons = {};
  for (const m of MODES) {
    const b = document.createElement('button');
    b.className = 'btn alt';
    b.dataset.act = `insp-${m.id}`;
    b.title = m.title;
    b.innerHTML = `${m.label} <kbd>${m.code.slice(3)}</kbd>`;
    bar.insertBefore(b, beforeButton);
    b.addEventListener('click', () => setMode(m.id, !st[m.id]));
    buttons[m.id] = b;
  }
  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.textContent = 'C коментар · G сітка · S стиль · T текст · K колір';
  root.append(legend);

  // ---------- colours ----------
  const colorCache = new Map();
  let ctx2d = null;
  function parseColor(str) {
    let c = colorCache.get(str);
    if (c !== undefined) return c;
    let m = str.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean);
      const a = p.length > 3 ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1;
      c = [parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2]), a];
    } else if ((m = str.match(/^color\(srgb ([^)]+)\)$/))) {
      const p = m[1].split(/[\s/]+/).filter(Boolean);
      const a = p.length > 3 ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1;
      c = [parseFloat(p[0]) * 255, parseFloat(p[1]) * 255, parseFloat(p[2]) * 255, a];
    } else {
      try {
        if (!ctx2d) { const cv = document.createElement('canvas'); cv.width = cv.height = 1; ctx2d = cv.getContext('2d', { willReadFrequently: true }); }
        ctx2d.clearRect(0, 0, 1, 1);
        ctx2d.fillStyle = '#000'; ctx2d.fillStyle = str; ctx2d.fillRect(0, 0, 1, 1);
        const d = ctx2d.getImageData(0, 0, 1, 1).data;
        c = [d[0], d[1], d[2], d[3] / 255];
      } catch { c = [0, 0, 0, 0]; }
    }
    if (c.some((v) => !Number.isFinite(v))) c = [0, 0, 0, 0];
    colorCache.set(str, c);
    return c;
  }
  const hex = (c) => '#' + [0, 1, 2].map((i) => Math.max(0, Math.min(255, Math.round(c[i]))).toString(16).padStart(2, '0')).join('').toUpperCase();
  const fmtColor = (c) => (c[3] >= 0.995 ? hex(c) : `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.round(c[3] * 100) / 100})`);
  const colorKey = (c) => `${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.round(c[3] * 100)}`;

  // token map: every custom property declared on :root/html that resolves to a colour
  let tokenMap = null;
  function buildTokens() {
    const names = new Set();
    const walk = (rules) => {
      for (const rule of rules) {
        if (rule.style && rule.selectorText && /(^|,)\s*(:root|html)\s*(,|$)/.test(rule.selectorText)) {
          for (let i = 0; i < rule.style.length; i++) { const n = rule.style[i]; if (n.startsWith('--')) names.add(n); }
        }
        if (rule.cssRules) walk(rule.cssRules);
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch { /* cross-origin */ } }
    const outer = document.createElement('div');
    outer.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;color:rgb(1, 2, 3)';
    const probe = document.createElement('span');
    outer.append(probe);
    root.append(outer);
    const cs = getComputedStyle(document.documentElement);
    const map = new Map();
    for (const name of names) {
      const raw = cs.getPropertyValue(name).trim();
      if (!raw || /^-?[\d.]+(px|em|rem|%|ms|s)?$/.test(raw)) continue;
      probe.style.color = `var(${name})`;
      const val = getComputedStyle(probe).color;
      if (val === 'rgb(1, 2, 3)' && !/rgb\(\s*1\s*,\s*2\s*,\s*3\s*\)|#010203/i.test(raw)) continue; // not a colour
      const k = colorKey(parseColor(val));
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(name);
    }
    outer.remove();
    tokenMap = map;
  }
  // схема site_brand: базова палітра --color-* (green, teal, gold, light, beige, …) — джерело; далі --color-hover-*; далі семантичні контекстні (--btn-*, --nav-* тощо).
  // Усередині групи — перше за порядком оголошення в tokens.css (базові кольори йдуть першими, аліаси на кшталт --color-bg-page — пізніше).
  const tierOf = (n) => (/^--color-hover-/.test(n) ? 1 : /^--color-/.test(n) ? 0 : 2);
  function tokenFor(c) {
    if (!tokenMap) return '';
    const list = tokenMap.get(colorKey(c));
    if (!list) return '';
    let best = list[0], bt = tierOf(best);
    for (const n of list) { const t = tierOf(n); if (t < bt) { best = n; bt = t; } }
    return best;
  }

  // ---------- collection ----------
  const hasOwnText = (el) => { for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && /\S/.test(n.data)) return true; return false; };
  const visible = (el) => { try { return el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true; } catch { return true; } };

  function collect(vw, vh) {
    const out = [];
    const push = (el) => {
      if (SKIP.has(el.tagName)) return;
      if (el instanceof SVGElement && el.localName !== 'svg') return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') return;
      out.push({ el, r, cs });
    };
    push(document.documentElement);
    for (const el of document.body.querySelectorAll('*')) push(el);
    if (document.body) push(document.body);
    return out;
  }

  const clip = (x, y, w, h, vw, vh) => {
    const x0 = Math.max(x, 0), y0 = Math.max(y, 0), x1 = Math.min(x + w, vw), y1 = Math.min(y + h, vh);
    return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null;
  };
  const box = (cls, b) => `<i class="${cls}" style="left:${b[0]}px;top:${b[1]}px;width:${b[2]}px;height:${b[3]}px"></i>`;
  const label = (cls, x, y, inner, extra = '') => `<b class="lb ${cls}" style="left:${Math.round(x)}px;top:${Math.round(y)}px;${extra}">${inner}</b>`;

  // boxes of the in-flow children (absolute/fixed, inline, display:contents and hidden ones are not neighbours)
  function flowRects(el) {
    const out = [];
    for (const ch of el.children) {
      if (SKIP.has(ch.tagName)) continue;
      const c = getComputedStyle(ch);
      if (c.display === 'none' || c.display === 'contents' || c.display === 'inline' || c.position === 'absolute' || c.position === 'fixed' || c.visibility === 'hidden') continue;
      const q = ch.getBoundingClientRect();
      if (q.width > 0 && q.height > 0) out.push(q);
    }
    return out;
  }

  // ---------- S: padding + gap ----------
  function drawS(items, vw, vh) {
    const u = unitPx();
    let html = '', bands = 0;
    const labels = [];
    for (const { el, r, cs } of items) {
      const pt = px(cs.paddingTop), pr = px(cs.paddingRight), pb = px(cs.paddingBottom), pl = px(cs.paddingLeft);
      if ((pt || pr || pb || pl) && cs.display !== 'inline' && visible(el)) {
        const bt = px(cs.borderTopWidth), br = px(cs.borderRightWidth), bb = px(cs.borderBottomWidth), bl = px(cs.borderLeftWidth);
        const x = r.left + bl, y = r.top + bt, w = r.width - bl - br, h = r.height - bt - bb;
        const raw = [[x, y, w, pt], [x, y + h - pb, w, pb], [x, y + pt, pl, h - pt - pb], [x + w - pr, y + pt, pr, h - pt - pb]];
        let bestB = null, bestL = 0;
        for (const b of raw) {
          if (b[2] <= 0 || b[3] <= 0) continue;
          const c = clip(b[0], b[1], b[2], b[3], vw, vh);
          if (!c || Math.min(c[2], c[3]) < MIN_BAND) continue;
          if (bands++ < MAX_BANDS) html += box('bp', c);
          const long = Math.max(c[2], c[3]);
          if (long > bestL) { bestL = long; bestB = c; }
        }
        if (bestB && bestL >= MIN_LABEL) {
          const txt = pt === pr && pr === pb && pb === pl ? num(pt) : [pt, pr, pb, pl].map(num).join(' ');
          labels.push({ pri: bestB[2] * bestB[3], cls: 'lp', cx: bestB[0] + bestB[2] / 2, cy: bestB[1] + bestB[3] / 2, txt });
        }
      }
      // spacing between sibling boxes: exact bounding-box distance to the nearest neighbour right/below.
      // Orange = equals the container's CSS gap; violet = anything else (margin, bleed, free grid tracks, justify-content).
      if (el.children.length > 1 && el.children.length <= 80 && visible(el)) {
        const d = cs.display;
        const gapBox = d === 'flex' || d === 'inline-flex' || d === 'grid' || d === 'inline-grid';
        const cg = gapBox ? px(cs.columnGap) : 0, rg = gapBox ? px(cs.rowGap) : 0;
        const rects = flowRects(el);
        const seen = new Set();
        let lab = 0;
        const add = (band, val, isGap) => {
          const k = band.map(Math.round).join(',');
          if (seen.has(k)) return;
          seen.add(k);
          if (val > Math.max(vw, vh)) return; // проміжок більший за екран — не відступ, а різні частини сторінки
          const c = clip(band[0], band[1], band[2], band[3], vw, vh);
          if (!c || Math.min(c[2], c[3]) < MIN_BAND) return;
          if (bands++ < MAX_BANDS) html += box(isGap ? 'bg' : 'bn', c);
          if (Math.max(c[2], c[3]) >= MIN_LABEL && lab < 6) {
            lab++;
            labels.push({ pri: c[2] * c[3], cls: isGap ? 'lg' : 'ln', cx: c[0] + c[2] / 2, cy: c[1] + c[3] / 2, txt: `${num(val)} · ${num(val / u)}u` });
          }
        };
        for (const a of rects) {
          let nx = null, ny = null;
          for (const b of rects) {
            if (a === b) continue;
            const dx = b.left - a.right, oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (dx >= 0.5 && oy >= 1 && (!nx || dx < nx.d)) nx = { d: dx, y0: Math.max(a.top, b.top), h: oy };
            const dy = b.top - a.bottom, ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            if (dy >= 0.5 && ox >= 1 && (!ny || dy < ny.d)) ny = { d: dy, x0: Math.max(a.left, b.left), w: ox };
          }
          if (nx) add([a.right, nx.y0, nx.d, nx.h], nx.d, cg > 0 && Math.abs(nx.d - cg) <= 1.5);
          if (ny) add([ny.x0, a.bottom, ny.w, ny.d], ny.d, rg > 0 && Math.abs(ny.d - rg) <= 1.5);
        }
      }
    }
    labels.sort((a, b) => b.pri - a.pri);
    const shown = labels.slice(0, MAX_LABELS);
    for (const l of shown) html += label(l.cls, l.cx, l.cy, l.txt, 'transform:translate(-50%,-50%)');
    return { html, shown: shown.length, extra: labels.length - shown.length };
  }

  // ---------- T: typography ----------
  // шрифти сайту: EB Garamond (заголовки), Manrope (текст/кнопки), Cormorant (wordmark); «fallback», якщо @font-face з такою назвою ще не завантажений
  function fontName(cs) {
    const first = cs.fontFamily.split(',')[0].trim().replace(/["']/g, '');
    try {
      const faces = [...document.fonts].filter((f) => f.family.replace(/["']/g, '') === first);
      if (faces.length && !faces.some((f) => f.status === 'loaded')) return first + ' (fallback)';
    } catch { /* ignore */ }
    return first;
  }
  function trackingEm(cs, size) {
    if (cs.letterSpacing === 'normal') return '0em';
    const v = Math.round((px(cs.letterSpacing) / size) * 1000) / 1000;
    return (v < 0 ? '−' + Math.abs(v) : String(v)) + 'em';
  }
  function limitGroups(list, keyOf) {
    const count = new Map();
    for (const it of list) { const k = keyOf(it); count.set(k, (count.get(k) || 0) + 1); }
    const seen = new Map(), out = [];
    for (const it of list) {
      const k = keyOf(it), total = count.get(k), n = seen.get(k) || 0;
      seen.set(k, n + 1);
      if (total > GROUP_LIMIT) {
        if (n >= GROUP_SHOWN) continue;
        if (n === 0) it.times = total;
      }
      out.push(it);
    }
    return out;
  }
  function drawT(items, vw, vh) {
    const u = unitPx();
    let list = [];
    for (const it of items) {
      const { el, r, cs } = it;
      if (!hasOwnText(el)) continue;
      const size = px(cs.fontSize);
      if (size <= 0 || !visible(el)) continue;
      const lh = cs.lineHeight === 'normal' ? 'normal' : num(px(cs.lineHeight));
      const cls = [...el.classList].filter((c) => TYPE_CLASS.test(c)).join(' ');
      const lhPx = cs.lineHeight === 'normal' ? 0 : px(cs.lineHeight);
      const inU = ` (${num(size / u)}/${lhPx ? num(lhPx / u) : 'normal'}u)`;
      const sig = `${num(size)}/${lh}px${inU} · ${cs.fontWeight} · ${trackingEm(cs, size)}`;
      list.push({ it, size, sig, cls, font: fontName(cs), key: `${el.localName}|${el.className}|${sig}|${el.parentElement ? el.parentElement.className : ''}` });
    }
    list = limitGroups(list, (x) => x.key);
    list.sort((a, b) => b.size - a.size);
    const shown = list.slice(0, MAX_LABELS);
    let html = '';
    for (const x of shown) {
      const r = x.it.r;
      const txt = `${x.sig}${x.cls ? ' · ' + x.cls : ''} · ${x.font}${x.times ? ` · ×${x.times}` : ''}`;
      const y = r.top - 15 >= 0 ? r.top - 15 : r.top + 1;
      html += `<i class="tb" style="left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px"></i>`;
      html += label('lt', Math.min(Math.max(r.left, 0), vw - 60), y, esc(txt));
    }
    return { html, shown: shown.length, extra: list.length - shown.length };
  }

  // ---------- K: colours ----------
  function drawK(items, vw, vh) {
    if (!tokenMap) buildTokens();
    let list = [];
    for (const it of items) {
      const { el, r, cs } = it;
      const lines = [];
      if (hasOwnText(el) && px(cs.fontSize) > 0 && visible(el)) {
        const c = parseColor(cs.color);
        if (c[3] > 0.05) lines.push(['text', c]);
      }
      const bg = parseColor(cs.backgroundColor);
      if (bg[3] > 0.05 && visible(el)) lines.push(['bg', bg]);
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
        if (px(cs[`border${side}Width`]) >= 1 && cs[`border${side}Style`] !== 'none') {
          const c = parseColor(cs[`border${side}Color`]);
          if (c[3] > 0.05) { lines.push(['border', c]); break; }
        }
      }
      if (!lines.length) continue;
      list.push({ it, lines, area: r.width * r.height, key: `${el.localName}|${el.className}|${lines.map((l) => l[0] + colorKey(l[1])).join('|')}|${el.parentElement ? el.parentElement.className : ''}` });
    }
    list = limitGroups(list, (x) => x.key);
    list.sort((a, b) => b.area - a.area);
    const shown = list.slice(0, MAX_LABELS);
    let html = '';
    for (const x of shown) {
      const r = x.it.r;
      const inner = x.lines.map(([kind, c]) => {
        const tok = tokenFor(c);
        return `<span class="kl"><i class="sw" style="background:${fmtColor(c)}"></i>${kind} ${esc(fmtColor(c))}${tok ? ' · ' + esc(tok) : ''}</span>`;
      }).join('') + (x.times ? `<span class="kl">×${x.times}</span>` : '');
      let y = r.bottom + 1;
      if (y > vh - 16 * x.lines.length - 4) y = Math.max(r.top, 0) + 1;
      html += label('lk', Math.min(Math.max(r.left, 2), vw - 120), y, inner);
    }
    return { html, shown: shown.length, extra: list.length - shown.length };
  }

  // ---------- S: hover redline (відстані навіть до сусідів і краю батька, як у Figma) ----------
  const host = root.getRootNode().host;
  let mouse = null, hoverRaf = 0;
  function hoverTarget() {
    if (!mouse) return null;
    for (const e of document.elementsFromPoint(mouse.x, mouse.y)) {
      if (e === host || (host && host.contains(e)) || SKIP.has(e.tagName) || e === document.documentElement) continue;
      return e;
    }
    return null;
  }
  function drawHover() {
    hoverRaf = 0;
    if (!st.s) { hov.innerHTML = ''; return; }
    const el = hoverTarget();
    if (!el) { hov.innerHTML = ''; return; }
    const u = unitPx(), vw = document.documentElement.clientWidth, vh = innerHeight;
    const r = el.getBoundingClientRect();
    const par = el.parentElement;
    const sib = par ? [...par.children].filter((c) => c !== el && !SKIP.has(c.tagName)).map((c) => ({ c, cs: getComputedStyle(c) }))
      .filter((x) => x.cs.display !== 'none' && x.cs.display !== 'contents' && x.cs.display !== 'inline' && x.cs.position !== 'absolute' && x.cs.position !== 'fixed' && x.cs.visibility !== 'hidden')
      .map((x) => x.c.getBoundingClientRect()).filter((q) => q.width > 0 && q.height > 0) : [];
    const pr = par && par !== document.documentElement ? par.getBoundingClientRect() : null;
    let html = `<i class="bh" style="left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px"></i>`;
    const tag = el.localName + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
    html += label('lh lhd', Math.min(Math.max(r.left, 0), vw - 140), r.top - 16 >= 0 ? r.top - 16 : r.top + 1, `${esc(tag)} ${num(r.width)}×${num(r.height)} · ${num(r.width / u)}×${num(r.height / u)}u`);
    const line = (x0, y0, x1, y1, v) => {
      const L = Math.abs(x1 - x0) + Math.abs(y1 - y0);
      if (L < 0.5) return '';
      const x = Math.min(x0, x1), y = Math.min(y0, y1);
      const horiz = y0 === y1;
      let out = `<i class="hl" style="left:${x}px;top:${y}px;width:${horiz ? L : 1}px;height:${horiz ? 1 : L}px"></i>`;
      out += label('lh', (x0 + x1) / 2, (y0 + y1) / 2, `${num(v)} · ${num(v / u)}u`, 'transform:translate(-50%,-50%)');
      return out;
    };
    const cy = Math.min(Math.max(r.top + r.height / 2, 0), vh), cx = Math.min(Math.max(r.left + r.width / 2, 0), vw);
    // nearest neighbour per side (sibling overlapping on the cross axis, else parent edge)
    const best = { l: null, r: null, t: null, b: null };
    for (const q of sib) {
      const oy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top), ox = Math.min(r.right, q.right) - Math.max(r.left, q.left);
      let d;
      if (oy >= 1) {
        d = r.left - q.right; if (d >= 0 && (!best.l || d < best.l.d)) best.l = { d, at: q.right };
        d = q.left - r.right; if (d >= 0 && (!best.r || d < best.r.d)) best.r = { d, at: q.left };
      }
      if (ox >= 1) {
        d = r.top - q.bottom; if (d >= 0 && (!best.t || d < best.t.d)) best.t = { d, at: q.bottom };
        d = q.top - r.bottom; if (d >= 0 && (!best.b || d < best.b.d)) best.b = { d, at: q.top };
      }
    }
    if (pr) {
      if (!best.l && r.left >= pr.left) best.l = { d: r.left - pr.left, at: pr.left };
      if (!best.r && pr.right >= r.right) best.r = { d: pr.right - r.right, at: pr.right };
      if (!best.t && r.top >= pr.top) best.t = { d: r.top - pr.top, at: pr.top };
      if (!best.b && pr.bottom >= r.bottom) best.b = { d: pr.bottom - r.bottom, at: pr.bottom };
    }
    if (best.l) html += line(best.l.at, cy, r.left, cy, best.l.d);
    if (best.r) html += line(r.right, cy, best.r.at, cy, best.r.d);
    if (best.t) html += line(cx, best.t.at, cx, r.top, best.t.d);
    if (best.b) html += line(cx, r.bottom, cx, best.b.at, best.b.d);
    hov.innerHTML = html;
  }
  const requestHover = () => { if (!hoverRaf && st.s) hoverRaf = requestAnimationFrame(drawHover); };
  addEventListener('mousemove', (e) => { mouse = { x: e.clientX, y: e.clientY }; requestHover(); }, { passive: true, capture: true });
  document.addEventListener('mouseleave', () => { mouse = null; hov.innerHTML = ''; });

  // ---------- update loop ----------
  const drawers = { s: drawS, t: drawT, k: drawK };
  const lastHtml = { s: '', t: '', k: '' };
  let pending = false, lastRun = 0, timer = 0, mutTimer = 0;
  function update() {
    pending = false;
    if (!st.s && !st.t && !st.k) return;
    const t0 = performance.now();
    const vw = document.documentElement.clientWidth, vh = innerHeight;
    const items = collect(vw, vh);
    const notes = [];
    for (const m of MODES) {
      if (!st[m.id]) continue;
      const res = drawers[m.id](items, vw, vh);
      stats.labels[m.id] = res.shown; stats.extra[m.id] = res.extra;
      if (res.extra > 0) notes.push(`${m.id.toUpperCase()} +${res.extra}`);
      if (res.html !== lastHtml[m.id]) { layers[m.id].innerHTML = res.html; lastHtml[m.id] = res.html; }
    }
    more.hidden = !notes.length;
    more.textContent = notes.join(' · ');
    const dt = performance.now() - t0;
    stats.lastMs = dt; stats.runs++; stats.avgMs += (dt - stats.avgMs) / stats.runs;
    lastRun = performance.now();
    requestHover();
  }
  // rAF throttle, at most ~30 fps
  function request() {
    if (pending || (!st.s && !st.t && !st.k)) return;
    pending = true;
    const wait = Math.max(0, 33 - (performance.now() - lastRun));
    clearTimeout(timer);
    timer = setTimeout(() => requestAnimationFrame(update), wait);
  }
  function requestDebounced() { clearTimeout(mutTimer); mutTimer = setTimeout(request, 150); }

  addEventListener('scroll', request, { passive: true, capture: true });
  addEventListener('resize', request);
  addEventListener('load', request);
  addEventListener('transitionend', requestDebounced, true);
  try { document.fonts.ready.then(() => { colorCache.clear(); request(); }); } catch { /* ignore */ }
  const mo = new MutationObserver(requestDebounced);
  const startObserve = () => document.body && mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  if (document.body) startObserve(); else addEventListener('DOMContentLoaded', startObserve, { once: true });

  // ---------- modes + keys ----------
  function setMode(id, on) {
    st[id] = !!on;
    store.set(MODES.find((m) => m.id === id).key, on ? '1' : '0');
    layers[id].hidden = !on;
    if (id === 's') { hov.hidden = !on; if (!on) hov.innerHTML = ''; else requestHover(); }
    buttons[id].classList.toggle('on', !!on);
    if (!on) { layers[id].innerHTML = ''; lastHtml[id] = ''; stats.labels[id] = 0; stats.extra[id] = 0; }
    if (on && id === 'k') tokenMap = null; // rebuild: stylesheets may have changed (HMR)
    if (!st.s && !st.t && !st.k) { more.hidden = true; clearTimeout(timer); pending = false; }
    else request();
  }
  document.addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const m = MODES.find((x) => x.code === e.code);
    if (!m) return;
    const t = e.composedPath()[0];
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    if (blocked()) return;
    e.preventDefault();
    setMode(m.id, !st[m.id]);
  }, true);

  for (const m of MODES) if (store.get(m.key, '0') === '1') setMode(m.id, true);
  return { state: st, stats, update, setMode, request };
}
