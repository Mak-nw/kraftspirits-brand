// D12: прив'язка блоків до колонок сітки. Збір геометрії — у браузері (COLLECT_GRID), аналіз — у Node (analyzeGrid).
// Підключається з ds-dynamic.mjs (правило D12) і з tools/qa/grid-overlay.mjs (скрін-оверлей сітки). Опис — tools/qa/README.md.
//
// Сітка (профіль): 10 колонок (рішення замовника 16.10.2026 «весь сайт на 10 колонок»), контейнер = в'юпорт − 2×поле, gap між колонками; усе в u (1u = clientWidth/1920, як у tokens.css).
//   початок колонки k (0..9) = поле + k·(колонка + gap); кінець = початок + колонка; колонка = (контейнер − 9·gap)/10 = 115.42u.
// Лівий край блока має збігатися з ПОЧАТКОМ колонки, правий — з КІНЦЕМ колонки; ширина = n колонок + (n−1)·gap.
// Допуск: ≤ okPx (0.5) — норма; okPx…failPx (≤1) — «підозріле»; > failPx (1px) — порушення.
// Виняток-bleed: край блока на краю в'юпорта (0 / clientWidth) — це «на всю ширину», не перевіряється; внутрішній край
//   блока, що виходить за один із країв (напр. половинка екрана), може лежати на осі в'юпорта або середині gap.

export const GRID_DEFAULTS = {
  cols: 10,
  okPx: 0.5,
  failPx: 1,
  minBlockU: 60,        // блоки вужчі за 60u не перевіряються (значки, дрібні підписи)
  minHeightU: 20,
  profiles: {
    catalog: { marginU: 202.9, gapU: 40, panelGapU: 5, note: 'ЄДИНА сітка сайту (tokens.css: --grid-margin/--grid-gap/--grid-col): 10 колонок, поле 202.9u, gap 40u, колонка 115.42u, ширина 1514.2u' },
  },
  pageProfile: { default: 'catalog' }, // одна сітка для всіх сторінок (рішення замовника 16.10.2026); окремих профілів 50u/5u більше нема
  regionProfile: { header: 'catalog', footer: 'catalog' }, // header/footer однакові на всіх сторінках → єдина еталонна сітка (не залежить від профілю сторінки)
  skipSelectors: ['.btn', '.chip', '.nav-cell', '.select', '.arrow-btn', '.nav-link', 'button', 'input', 'select', 'textarea', 'label', '.visually-hidden', '.skip-link', '.hit-area', '.maplibregl-ctrl', '.maplibregl-ctrl-group', '.product-thumbs' /* мініатюри — накладка всередині фото з відступом-токеном, не блок сітки */],
  noRecordSelectors: ['dt', 'dd', 'li', 'td', 'th', 'tr', 'option'], // комірки/пункти списків: перевіряється їхній контейнер (ul/dl/table), не кожен пункт
  recordAlwaysSelectors: ['li.lp-layer', 'li.lp-arches__item', 'li.about-principle'], // li.about-principle: 4 рівні колонки без фону (арку прибрано, рішення замовника c8b031dd), як layers; виняток із noRecordSelectors: пункти layers — n рівних блоків контейнера (4 на 10 колонок; li.lp-arches__item — те саме для look: about, арки-фото layers), схема «рівний поділ» (applyEqualDivision) приймає їхні внутрішні шви; діти (назва, текст) успадковують перевірений ліво-край пункту
  deep: false,          // true: заходити всередину карток/панелей із власним фоном/рамкою (за замовч. картка = завершений компонент)
};

/** Параметри сітки для ширини в'юпорта */
export function gridFor(profile, vw, u, cols = 10) {
  const margin = profile.marginU * u, gap = profile.gapU * u;
  const inner = vw - 2 * margin;
  const col = (inner - (cols - 1) * gap) / cols;
  const starts = [], ends = [];
  for (let k = 0; k < cols; k++) { starts.push(margin + k * (col + gap)); ends.push(margin + k * (col + gap) + col); }
  const panelGap = (profile.panelGapU || 0) * u;
  return { margin, gap, col, cols, starts, ends, inner, vw, panelGap };
}

/* ------------------------------------------------------------------ збір у браузері */
export function COLLECT_GRID(cfg) {
  const clientW = document.documentElement.clientWidth;
  const vwVar = parseFloat(document.documentElement.style.getPropertyValue('--vw')) || clientW;
  const vw = Math.min(clientW, vwVar); // ефективна ширина макета: сторінка рахує --u від --vw (напр. cocktails: scrollbar-gutter резервує 15px і в overlay-режимі)
  const rootEl = cfg.root ? document.querySelector(cfg.root) : document.body;
  const uVal = Math.min(Math.max(vwVar, 1185), 1920) / 1920;
  const out = { vw, clientW, u: uVal, scrollY: window.scrollY, blocks: [], stats: { decor: 0, controls: 0, panels: 0, inherited: 0, floating: 0, small: 0 } };
  if (!rootEl) return out;
  const minW = cfg.minBlockU * uVal, minH = cfg.minHeightU * uVal;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'BR', 'SOURCE', 'PATH', 'USE', 'HR']);
  const MEDIA = new Set(['IMG', 'VIDEO', 'CANVAS', 'IFRAME', 'PICTURE']);
  const clsOf = (el) => (typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : []);
  const nameOf = (el) => { const c = clsOf(el).filter((x) => !/^(is-|js-|has-|in-view|reveal)/.test(x)).slice(0, 2); return el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (c.length ? `.${c.join('.')}` : ''); };
  const pathOf = (el) => { const p = []; for (let n = el, d = 0; n && n !== document.body && d < 3; n = n.parentElement, d++) p.unshift(nameOf(n)); return p.join(' > '); };
  const alpha = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return c === 'transparent' ? 0 : 1; const p = m[1].split(/[,/ ]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
  const hasBox = (cs) => alpha(cs.backgroundColor) > 0.02 || cs.backgroundImage !== 'none' || ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none');
  const hasText = (el) => (el.textContent || '').trim().length > 0;
  const isLeaf = (el) => hasText(el) && [...el.children].every((k) => { const d = getComputedStyle(k).display; return d === 'inline' || d === 'none' || k.tagName === 'svg' || k.tagName === 'BR' || /^(SPAN|A|EM|STRONG|B|I|SMALL|SUP|SUB|MARK|ABBR)$/.test(k.tagName) && d.startsWith('inline'); });
  const inkWidth = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); const rs = [...rg.getClientRects()].filter((q) => q.width > 0 && q.height > 0); if (!rs.length) return 0; return Math.max(...rs.map((q) => q.right)) - Math.min(...rs.map((q) => q.left)); };
  const skipSel = cfg.skipSelectors.join(',');
  const noRecSel = (cfg.noRecordSelectors || []).join(',');
  const recSel = (cfg.recordAlwaysSelectors || []).join(',');

  const walk = (el, anc) => {
    for (const c of el.children) {
      if (SKIP_TAGS.has(c.tagName.toUpperCase()) || (c.id && c.id.startsWith('__')) || c.closest('template')) continue;
      const cs = getComputedStyle(c);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (cs.display === 'contents') { walk(c, anc); continue; }
      if (c.getAttribute('aria-hidden') === 'true') { out.stats.decor++; continue; }
      if (skipSel && c.matches(skipSel)) { out.stats.controls++; continue; }
      const r = c.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) { if (r.width >= 1 || r.height < 1) walk(c, anc); continue; } // обгортка нульової висоти (напр. header над hero) — вміст усе одно перевіряємо
      if (r.right <= 0 || r.left >= vw) continue; // поза екраном (слайдер, зсунуті шари)
      const pos = cs.position;
      if (pos === 'absolute') { // абсолютні: лише змістовні (текст або зображення-вміст, що не заливає предка як фон)
        const op = (c.offsetParent || document.documentElement).getBoundingClientRect();
        const coversParent = r.width >= op.width * 0.95 && r.height >= op.height * 0.95;
        const content = hasText(c) || c.querySelector('img, video, picture');
        if (!content || (coversParent && !hasText(c)) || r.width < minW) { out.stats.decor++; continue; }
      }
      const parentCs = getComputedStyle(c.parentElement);
      const media = MEDIA.has(c.tagName.toUpperCase());
      const inline = cs.display === 'inline';
      const leaf = !media && isLeaf(c);
      const blockKids = [...c.children].some((k) => { const d = getComputedStyle(k).display; return d !== 'inline' && d !== 'none' && d !== 'contents' && !SKIP_TAGS.has(k.tagName.toUpperCase()); });
      const box = hasBox(cs);
      let rec = null; let nextAnc = anc;
      const structural = !inline && (media || leaf || blockKids || box) && r.width >= minW && r.height >= minH && !(noRecSel && c.matches(noRecSel) && !box && !(recSel && c.matches(recSel)));
      if (!structural) { if (!inline && r.width < minW) out.stats.small++; }
      else {
        const bleedL = r.left <= 1.0, bleedR = r.right >= vw - 1.0;
        let testL = !bleedL, testR = !bleedR; let why = '';
        // внутрішні краї, що збігаються з уже перевіреним краєм найближчого блока-предка, не дублюємо
        if (testL && anc.testedL && Math.abs(r.left - anc.L) <= 0.5) { testL = false; out.stats.inherited++; }
        if (testR && anc.testedR && Math.abs(r.right - anc.R) <= 0.5) { testR = false; out.stats.inherited++; }
        let shrink = false;
        if (leaf && (testL || testR)) { // текст, стиснутий за вмістом: правий край довільний → перевіряємо лише край, притиснутий до поля предка
          const ink = inkWidth(c);
          if (Math.abs(ink - r.width) <= 1.5) {
            shrink = true;
            const pr = c.parentElement.getBoundingClientRect();
            const pl = parseFloat(parentCs.paddingLeft) + parseFloat(parentCs.borderLeftWidth), prr = parseFloat(parentCs.paddingRight) + parseFloat(parentCs.borderRightWidth);
            const flushL = Math.abs(r.left - (pr.left + pl)) <= 1, flushR = Math.abs(r.right - (pr.right - prr)) <= 1;
            if (flushL && !flushR) testR = false; else if (flushR && !flushL) testL = false; else if (flushL && flushR) { /* обидва — норма */ } else { testL = false; testR = false; out.stats.floating++; why = 'floating'; }
          }
        }
        if (testL || testR) {
          rec = { region: c.closest('footer') ? 'footer' : c.closest('header') ? 'header' : 'main', sel: nameOf(c), path: pathOf(c), tag: c.tagName.toLowerCase(), L: r.left, R: r.right, T: r.top + window.scrollY, B: r.bottom + window.scrollY, W: r.width, H: r.height, leaf, shrink, box, media, pos, bleedL, bleedR, testL, testR, text: (c.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28), why };
          out.blocks.push(rec);
        }
        nextAnc = { L: r.left, R: r.right, testedL: !bleedL && (testL || anc.testedL && Math.abs(r.left - anc.L) <= 0.5), testedR: !bleedR && (testR || anc.testedR && Math.abs(r.right - anc.R) <= 0.5) };
        // картка/панель з власним фоном чи рамкою, що не на всю ширину = завершений компонент, всередину не заходимо
        const panel = box && !(bleedL || bleedR) && !media;
        if (panel && !cfg.deep) { out.stats.panels++; continue; }
        if (media) continue;
      }
      walk(c, nextAnc);
    }
  };
  walk(rootEl, { L: -1e9, R: 1e9, testedL: false, testedR: false });
  return out;
}

/* ------------------------------------------------------------------ аналіз у Node */
const near = (arr, x) => { let bi = 0, bd = Infinity; arr.forEach((v, i) => { const d = Math.abs(v - x); if (d < bd) { bd = d; bi = i; } }); return { i: bi, v: arr[bi], d: x - arr[bi], ad: bd }; };

/** Оцінка одного блока щодо профілю сітки. Повертає { status: ok|suspect|fail, sides:{L,R}, cols } */
export function evalBlock(b, g, cfg) {
  const okPx = cfg.okPx ?? 0.5, failPx = cfg.failPx ?? 1;
  const bleeds = b.bleedL || b.bleedR;
  const axis = bleeds ? [g.vw / 2, ...g.ends.slice(0, -1).map((e) => e + g.gap / 2)] : [];
  const sideEval = (x, kind) => {
    const n = near(kind === 'L' ? g.starts : g.ends, x);
    let best = { ...n, via: kind === 'L' ? `поч.кол.${n.i + 1}` : `кін.кол.${n.i + 1}` };
    // найближча межа ІНШОГО типу — діагностика (лівий край на кінці колонки / правий на початку)
    const alt = near(kind === 'L' ? g.ends : g.starts, x);
    if (axis.length) { const a = near(axis, x); if (a.ad < best.ad) best = { ...a, via: Math.abs(a.v - g.vw / 2) < 0.01 ? 'вісь в\'юпорта' : 'середина gap' }; }
    const s = best.ad <= okPx ? 'ok' : best.ad <= failPx ? 'suspect' : 'fail';
    return { x, status: s, delta: best.d, via: best.via, altType: { v: alt.v, d: x - alt.v, i: alt.i + 1 } };
  };
  const sides = {};
  if (b.testL) sides.L = sideEval(b.L, 'L');
  if (b.testR) sides.R = sideEval(b.R, 'R');
  const order = { ok: 0, suspect: 1, fail: 2 };
  let status = 'ok';
  for (const s of Object.values(sides)) if (order[s.status] > order[status]) status = s.status;
  // ширина в колонках
  const n = (b.W + g.gap) / (g.col + g.gap);
  const nr = Math.max(1, Math.round(n));
  const expectedW = nr * g.col + (nr - 1) * g.gap;
  return { status, sides, cols: { fact: n, expected: nr, widthDelta: b.W - expectedW }, bothTested: b.testL && b.testR };
}

/**
 * Профіль «великі блоки»: два (і більше) великих блоки-панелі, що стоять ПОРЯД із зазором --grid-gap-panels (5u, не 40u колонок), мають внутрішній шов не на межі колонки.
 * Це не «масове allow», а перевірка схеми шва — вона приймає внутрішні краї пари (A.права ↔ B.ліва, B.ліва − A.права = panelGap ±0.6px, однакова висота-зона):
 *   (а) A закінчується на кінці колонки, B починається через panelGap (менший блок B заходить у зазор колонок);
 *   (б) B починається на початку колонки, A закінчується за panelGap до неї (менший блок A заходить у зазор);
 *   (в) рівний поділ сітки на n = 2…4 панелі (шов — k·(w+gap) від поля, w = (контейнер − (n−1)·panelGap)/n; для n=2 — центр ± panelGap/2).
 * Зовнішні краї пари (ті, що не приймаються цим правилом) і далі мусять лежати на колонках. Пара без зазору panelGap (напр. 40u) схему не задовольняє — лишається порушенням.
 */
export function applyPanelPairs(results, grids, cfg) {
  const okPx = cfg.okPx ?? 0.5, tolGap = 0.6;
  const rs = results.filter((r) => r.block.region === 'main');
  for (const a of rs) for (const b of rs) {
    if (a === b) continue;
    const A = a.block, B = b.block, g = grids[a.profile];
    if (!g.panelGap) continue;
    const gapPx = B.L - A.R;
    if (Math.abs(gapPx - g.panelGap) > tolGap) continue;
    const ov = Math.min(A.B, B.B) - Math.max(A.T, B.T);
    if (ov < 0.5 * Math.min(A.H, B.H)) continue; // не в одному ряду
    const nearEnd = near(g.ends, A.R).ad <= okPx, nearStart = near(g.starts, B.L).ad <= okPx;
    let via = '';
    if (nearEnd) via = `шов великих блоків: A на кінці кол.${near(g.ends, A.R).i + 1} + ${(g.panelGap / (g.vw / 1920)).toFixed(1)}u`;
    else if (nearStart) via = `шов великих блоків: B на початку кол.${near(g.starts, B.L).i + 1} − ${(g.panelGap / (g.vw / 1920)).toFixed(1)}u`;
    else for (let n = 2; n <= 4 && !via; n++) {
      const w = (g.inner - (n - 1) * g.panelGap) / n;
      for (let k = 1; k < n; k++) if (Math.abs(A.R - (g.margin + k * w + (k - 1) * g.panelGap)) <= okPx) { via = `шов великих блоків: рівний поділ на ${n}, шов ${k}`; break; }
    }
    if (!via) continue;
    for (const [res, key, blk] of [[a, 'R', A], [b, 'L', B]]) {
      const sd = res.ev.sides[key]; if (!sd || sd.status === 'ok') continue;
      sd.status = 'ok'; sd.via = via; sd.pair = true;
      const order = { ok: 0, suspect: 1, fail: 2 }; let st = 'ok';
      for (const x of Object.values(res.ev.sides)) if (order[x.status] > order[st]) st = x.status;
      res.ev.status = st;
    }
  }
}

/**
 * Схема «рівний поділ контейнера на n блоків» (поле `cols` шаблону lp, напр. 4 плитки на 10 колонок): РЯД з n ≥ 2 однакових блоків (той самий тег, та сама висота й верх, однакова ширина w) із зазором
 * колонок (gap, 40u) між сусідніми, що заповнює колонки від ПОЧАТКУ колонки i до КІНЦЯ колонки j: w = (ends[j] − starts[i] − (n−1)·gap) / n. Внутрішні краї блоків ряду (L при k>0, R при k<n−1) не мусять
 * лежати на межах колонок; зовнішні (початок першого, кінець останнього) мусять — вони перевіряються як звичайно, а тут ряд приймається лише якщо вони на колонках. Ряд, де ширини різні, зазор ≠ gap
 * або крайній блок не на колонці, схему не задовольняє — порушення лишається (позитивний контроль: tools/qa/lp-cols.mjs і перевірка зламаного ряду).
 */
export function applyEqualDivision(results, grids, cfg) {
  const okPx = cfg.okPx ?? 0.5, tolGap = 0.6;
  const main = results.filter((r) => r.block.region === 'main');
  for (const r of main) {
    if (r.ev.status === 'ok') continue;
    const g = grids[r.profile]; const B = r.block;
    const mates = main.filter((m) => m.block.tag === B.tag && Math.abs(m.block.T - B.T) <= 1 && Math.abs(m.block.H - B.H) <= 1 && Math.abs(m.block.W - B.W) <= okPx && m.block.W > 0).sort((a, b) => a.block.L - b.block.L);
    const idx = mates.indexOf(r); if (idx < 0) continue;
    let lo = idx, hi = idx;
    while (lo > 0 && Math.abs(mates[lo].block.L - mates[lo - 1].block.R - g.gap) <= tolGap) lo--;
    while (hi < mates.length - 1 && Math.abs(mates[hi + 1].block.L - mates[hi].block.R - g.gap) <= tolGap) hi++;
    const n = hi - lo + 1; if (n < 2) continue;
    const first = mates[lo].block, last = mates[hi].block;
    const si = near(g.starts, first.L), ei = near(g.ends, last.R);
    if (si.ad > okPx || ei.ad > okPx) continue;
    const via = `рівний поділ колонок ${si.i + 1}–${ei.i + 1} на ${n} блоків (зазор колонок)`;
    for (const key of ['L', 'R']) { const sd = r.ev.sides[key]; if (!sd || sd.status === 'ok') continue; sd.status = 'ok'; sd.via = via; sd.pair = true; }
    const order = { ok: 0, suspect: 1, fail: 2 }; let st = 'ok';
    for (const x of Object.values(r.ev.sides)) if (order[x.status] > order[st]) st = x.status;
    r.ev.status = st;
  }
}

/**
 * Аналіз зібраних даних сторінки. cfg — GRID_DEFAULTS + allow.json.grid; pageName — для вибору профілю.
 * Повертає { profile, results:[{block, ev, evAll:{profile:ev}, alt:[profile...]}], counts }
 */
export function analyzeGrid(data, cfg, pageName) {
  const profName = cfg.pageProfile[pageName] || cfg.pageProfile.default;
  const grids = {}; for (const [k, p] of Object.entries(cfg.profiles)) grids[k] = gridFor(p, data.vw, data.u, cfg.cols);
  const results = data.blocks.map((b) => {
    const pn = (cfg.regionProfile || {})[b.region] || profName;
    const evAll = {}; for (const k of Object.keys(grids)) evAll[k] = evalBlock(b, grids[k], cfg);
    const ev = evAll[pn];
    const alt = ev.status === 'ok' ? [] : Object.keys(grids).filter((k) => k !== pn && evAll[k].status === 'ok');
    return { block: b, ev, evAll, alt, profile: pn };
  });
  applyPanelPairs(results, grids, cfg);
  applyEqualDivision(results, grids, cfg);
  const counts = { total: results.length, ok: 0, suspect: 0, fail: 0 };
  for (const r of results) counts[r.ev.status]++;
  return { profile: profName, grid: grids[profName], grids, results, counts };
}

/** Рядок-опис порушення (укр.) */
export function describe(r, g) { // g — сітка профілю, за яким оцінено блок (a.grids[r.profile])
  const b = r.block; const parts = [];
  for (const k of ['L', 'R']) {
    const s = r.ev.sides[k]; if (!s) continue;
    const sign = s.delta >= 0 ? '+' : '';
    parts.push(`${k === 'L' ? 'ліво' : 'право'} ${(s.x / g.vw * 1920).toFixed(1)}u: ${s.via} ${sign}${s.delta.toFixed(2)}px [${s.status}]`);
  }
  const c = r.ev.cols;
  parts.push(`ширина ${b.W.toFixed(1)}px = ${c.fact.toFixed(2)} кол (очікув. ${c.expected}, Δ${c.widthDelta >= 0 ? '+' : ''}${c.widthDelta.toFixed(2)}px)`);
  if (r.alt.length) parts.push(`збігається з сіткою «${r.alt.join(', ')}»`);
  return parts.join('; ');
}
