// D14 — контраст тексту НА ЗОБРАЖЕННІ, піксельно ПО ЛІТЕРАХ (замість одного коефіцієнта на весь бокс, як D8).
// Для кожного видимого текстового вузла, під яким у стеку є img/video/canvas, background-image (або ::before/::after з картинкою/градієнтом):
//   1) скріншот в'юпорта з усім текстом прозорим (`-webkit-text-fill-color: transparent`) (БЕЗ тексту) = пікселі ПІД літерами;
//   2) два скріншоти з текстом чисто чорним і чисто білим: покриття літери = (W − K)/255 — маска чорнила, незалежна від кольору й фону;
//   3) для кожної літери (Range на символ) беруться пікселі з покриттям ≥ 0.6 (запас 0.3), ефективний колір чорнила = computed color × (alpha × opacity предків)
//      накладений на піксель фону, контраст WCAG чорнило ↔ піксель фону;
//   4) частка пікселів літери нижче порога (4.5; великий текст ≥24px або ≥18.66px bold — 3). ЛІТЕРА «погана», якщо >50% її пікселів нижче порога.
//      Вузол = FAIL, якщо погана хоч одна літера. Літери, перекриті іншим елементом (fixed-хедер, оверлей), не рахуються.
// Прокрутка тайлами по висоті в'юпорта (кожна літера міряється в тайлі, де вона повністю видима). Профіль сторінок — D14_PAGES.
export const D14_PAGES = ['barrels', 'excursions', 'index', 'contacts', 'about', 'product', 'cocktails'];
export const D14_DEFAULTS = { textMin: 4.5, largeMin: 3, badLetterShare: 0.5, covCore: 0.6, covFallback: 0.3, minPixels: 3 };

/** виконується в браузері: аналіз одного тайла (3 знімка в base64) */
export async function EVAL_TILE(b64, cfg) {
  const load = async (s) => { const im = new Image(); im.src = `data:image/png;base64,${s}`; await im.decode(); const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(im, 0, 0); return { w: im.width, h: im.height, d: cx.getImageData(0, 0, im.width, im.height).data }; };
  const [K, W, B] = [await load(b64.k), await load(b64.w), await load(b64.bg)];
  const sc = K.w / window.innerWidth;
  const st = (window.__d14 ||= { done: new Set(), ids: new WeakMap(), n: 0, els: new Map() });
  const idOf = (el) => st.ids.get(el) ?? (st.ids.set(el, ++st.n), st.n);
  const norm = (c) => { const cv = document.createElement('canvas'); cv.width = cv.height = 1; const x = cv.getContext('2d', { willReadFrequently: true }); x.clearRect(0, 0, 1, 1); x.fillStyle = '#000'; x.fillStyle = c; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const clsOf = (el) => (typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : []);
  const nameOf = (el) => { const c = clsOf(el).filter((x) => !/^(is-|js-|has-|in-view|reveal)/.test(x)).slice(0, 2); return el.tagName.toLowerCase() + (c.length ? `.${c.join('.')}` : ''); };
  const pathOf = (el) => { const p = []; for (let n = el, d = 0; n && n !== document.body && d < 3; n = n.parentElement, d++) p.unshift(nameOf(n)); return p.join(' > '); };
  const imgLayer = (b) => {
    if (/^(IMG|VIDEO|CANVAS|PICTURE)$/.test(b.tagName)) return b.tagName.toLowerCase();
    const cs = getComputedStyle(b); if (cs.backgroundImage !== 'none') return cs.backgroundImage.startsWith('url') ? 'background-image' : 'градієнт';
    for (const ps of ['::before', '::after']) { const p = getComputedStyle(b, ps); if (p.content !== 'none' && p.backgroundImage !== 'none') return `${ps} ${p.backgroundImage.startsWith('url') ? 'background-image' : 'градієнт'}`; }
    return null;
  };
  const out = { els: [], canvas: 0, measured: 0, covered: 0, noImage: 0, candidates: 0 };
  const vh = window.innerHeight, vw = window.innerWidth;
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('template, svg, script, style, [id^="__"]') || /^(SCRIPT|STYLE|NOSCRIPT|OPTION)$/.test(el.tagName)) continue;
    const nodes = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (!nodes.length) continue;
    if (el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) === false) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
    const id = idOf(el); if (st.done.has(id)) continue;
    const cs = getComputedStyle(el); let op = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity);
    const fg = norm(cs.color); const a = fg[3] * op; if (a <= 0.001 && op <= 0.001) continue;
    // letters
    const letters = [];
    nodes.forEach((n) => { const t = n.textContent; for (let i = 0; i < t.length; i++) { if (!t[i].trim()) continue; const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1); const q = [...rg.getClientRects()].find((x) => x.width > 0 && x.height > 0); if (q) letters.push({ ch: t[i], q }); } });
    if (!letters.length) continue;
    if (letters.some((l) => l.q.top < 0 || l.q.bottom > vh || l.q.left < 0 || l.q.right > vw)) continue; // повністю в цьому тайлі? інакше — наступний
    // чи є зображення під текстом (5 точок бокса)
    let layer = null;
    for (const [fx, fy] of [[0.5, 0.5], [0.15, 0.5], [0.85, 0.5], [0.5, 0.15], [0.5, 0.85]]) {
      const stack = document.elementsFromPoint(Math.min(vw - 1, Math.max(0, r.left + r.width * fx)), Math.min(vh - 1, Math.max(0, r.top + r.height * fy)));
      const idx = stack.findIndex((s) => s === el || el.contains(s));
      for (const b of stack.slice(idx >= 0 ? idx + 1 : 0)) { if (el.contains(b)) continue; const l = imgLayer(b); if (l) { layer = layer || l; break; } }
      if (layer) break;
    }
    if (!layer) { out.noImage++; st.done.add(id); continue; }
    if (layer === 'canvas') { out.canvas++; st.done.add(id); continue; } // WebGL-карта (maplibre): кадр у скріншотах нестабільний — не міряємо, рахуємо в info
    out.candidates++;
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700, large = size >= 24 || (size >= 18.66 && bold);
    const thr = large ? cfg.largeMin : cfg.textMin;
    let bad = 0, meas = 0, minRatio = Infinity; const badCh = [], badInfo = []; let worst = 0;
    for (const { ch, q } of letters) {
      const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      if (cs.pointerEvents !== 'none' && (!top || !(top === el || el.contains(top)))) { out.covered++; continue; } // pointer-events:none елемент у hit-test не потрапляє — перекриття не перевіряємо
      const x0 = Math.max(0, Math.floor(q.left * sc)), x1 = Math.min(K.w, Math.ceil(q.right * sc)), y0 = Math.max(0, Math.floor(q.top * sc)), y1 = Math.min(K.h, Math.ceil(q.bottom * sc));
      let sumr = 0, sumg = 0, sumb = 0;
      const pass = (cmin) => { const ratios = []; sumr = sumg = sumb = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * K.w + x) * 4; const cov = ((W.d[i] - K.d[i]) + (W.d[i + 1] - K.d[i + 1]) + (W.d[i + 2] - K.d[i + 2])) / (3 * 255 * Math.max(op, 0.05)); if (cov < cmin) continue; const br = B.d[i], bg = B.d[i + 1], bb = B.d[i + 2]; const er = fg[0] * a + br * (1 - a), eg = fg[1] * a + bg * (1 - a), eb = fg[2] * a + bb * (1 - a); const L1 = lum(er, eg, eb), L2 = lum(br, bg, bb); ratios.push((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)); sumr += br; sumg += bg; sumb += bb; } return ratios; };
      let rs = pass(cfg.covCore); if (rs.length < cfg.minPixels) rs = pass(cfg.covFallback); if (rs.length < cfg.minPixels) continue;
      if (cfg.debugText && nodes[0].textContent.includes(cfg.debugText)) (out.debug ||= []).push(`${ch} q=${Math.round(q.left)},${Math.round(q.top)} ${Math.round(q.width)}x${Math.round(q.height)} n=${rs.length} bg=${Math.round(sumr / rs.length)} min=${Math.min(...rs).toFixed(1)}`);
      meas++; const below = rs.filter((v) => v < thr).length / rs.length; rs.sort((m, n) => m - n); minRatio = Math.min(minRatio, rs[0]);
      if (below > cfg.badLetterShare) { bad++; worst = Math.max(worst, below); if (badCh.length < 12) badCh.push(ch); if (badInfo.length < 2) badInfo.push(`«${ch}» n=${rs.length} фон≈rgb(${Math.round(sumr / rs.length)},${Math.round(sumg / rs.length)},${Math.round(sumb / rs.length)})`); }
    }
    st.done.add(id); out.measured += meas;
    out.els.push({ el: pathOf(el), text: nodes.map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim().slice(0, 40), layer, size: +size.toFixed(1), large, thr, letters: letters.length, measured: meas, bad, worst: +worst.toFixed(2), minRatio: meas ? +minRatio.toFixed(2) : null, badCh: badCh.join(''), badInfo: badInfo.join('; '), ink: `rgba(${fg[0]},${fg[1]},${fg[2]},${+a.toFixed(2)})`, y: Math.round(r.top + scrollY), op: +op.toFixed(2), color: cs.color });
  }
  return out;
}

const STYLE = (c) => `[id^="__"]{display:none !important}*,*::before,*::after{-webkit-text-fill-color:${c} !important;text-shadow:none !important;caret-color:transparent !important;transition:none !important;animation:none !important}*::placeholder{-webkit-text-fill-color:${c} !important}`; // dev-overlay design-machine (#__review-host) ховаємо; лише заливка тексту (НЕ color): фони/рамки/іконки від currentColor лишаються на місці

/**
 * Міряє D14 на відкритій сторінці. Повертає { hits:[…FAIL-вузли], stats, all:[…усі виміряні вузли] }.
 */
export async function measureTextOnImage(page, cfgIn = {}) {
  const cfg = { ...D14_DEFAULTS, ...cfgIn };
  const vh = page.viewport()?.height || 1080;
  const total = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
  await page.evaluate(() => { window.__d14 = undefined; });
  const stats = { tiles: 0, canvas: 0, candidates: 0, noImage: 0, covered: 0, lettersMeasured: 0 };
  const all = [];
  const settle = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const shot = async (css) => {
    await page.evaluate((c) => { let s = document.getElementById('qa-d14-style'); if (!s) { s = document.createElement('style'); s.id = 'qa-d14-style'; document.head.appendChild(s); } s.textContent = c; }, css);
    await settle();
    return page.screenshot({ encoding: 'base64', captureBeyondViewport: false });
  };
  for (let y = 0; y < total; y += Math.round(vh * 0.8)) {
    await page.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), y);
    await settle();
    const k = await shot(STYLE('#000')), w = await shot(STYLE('#fff')), bg = await shot(STYLE('transparent'));
    await page.evaluate(() => document.getElementById('qa-d14-style')?.remove());
    await settle();
    const r = await page.evaluate(EVAL_TILE, { k, w, bg }, cfg);
    stats.tiles++; stats.candidates += r.candidates; stats.canvas += r.canvas; stats.noImage += r.noImage; stats.covered += r.covered; stats.lettersMeasured += r.measured;
    all.push(...r.els); if (r.debug) (stats.debug ||= []).push(...r.debug);
    if (y + vh >= total) break;
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  return { hits: all.filter((e) => e.bad > 0), all, stats };
}
