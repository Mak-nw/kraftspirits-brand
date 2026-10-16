// Спільна бібліотека QA-набору (див. tools/qa/README.md). Node ESM; єдина залежність — puppeteer-core.
// Усі утиліти не залежать від конкретної перевірки: запуск Chrome (чистий профіль, classic/none-смуга), відкриття сторінок зі службовими
// параметрами, збір консолі/мережі, масштаб --u, вимірювання, CLS, hscroll, safeHover, Tab-walker, контраст, токени.
import puppeteer from 'puppeteer-core';
import { mkdirSync, mkdtempSync, rmSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const QA_DIR = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(QA_DIR, '..', '..'); // site_brand/
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const DEFAULT_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const LIVE_URL = 'https://mak-nw.github.io/kraftspirits-brand/';
export const DEFAULT_URL = 'http://localhost:5200/';
export const DEFAULT_PRODUCTS = ['product?id=gin-yasnyi', 'product?id=whiskey-white'];

/* ------------------------------------------------------------------ CLI / ENV */
// --key value | --key=value | --flag ; ENV: QA_<KEY> (QA_URL, QA_WIDTHS, QA_DPR, QA_SCROLLBAR, QA_PAGES, QA_OUT, QA_JSON)
export function parseArgs(argv = process.argv.slice(2), defaults = {}, env = process.env) {
  const o = { ...defaults };
  for (const k of Object.keys(defaults)) {
    const e = env[`QA_${k.toUpperCase()}`];
    if (e !== undefined && e !== '') o[k] = e;
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { (o._ ||= []).push(a); continue; }
    let [k, v] = a.slice(2).split(/=(.*)/s);
    const camel = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (v === undefined) {
      const nxt = argv[i + 1];
      if (nxt !== undefined && !nxt.startsWith('--')) { v = nxt; i++; } else v = true;
    }
    o[camel] = v;
  }
  return normalizeOpts(o);
}
const csv = (v) => (Array.isArray(v) ? v : String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean));
function normalizeOpts(o) {
  o.url = String(o.url || DEFAULT_URL);
  if (!/\/$/.test(o.url)) o.url += '/';
  o.live = /^https:\/\//.test(o.url);
  o.widths = csv(o.widths).map(Number).filter(Boolean);
  o.dpr = csv(o.dpr).map(Number).filter(Boolean);
  if (!o.dpr.length) o.dpr = [1];
  o.scrollbar = o.scrollbar === 'both' ? ['classic', 'none'] : csv(o.scrollbar);
  if (!o.scrollbar.length) o.scrollbar = ['classic'];
  o.pagesList = o.pages ? csv(o.pages) : defaultPages();
  o.json = o.json === true || o.json === 'true' || o.json === '1';
  o.out = resolve(o.out || join(QA_DIR, '.out'));
  o.chrome = o.chrome || process.env.CHROME_PATH || DEFAULT_CHROME;
  o.height = Number(o.height) || 1080;
  return o;
}
/** усі *.html у корені проєкту (без обходу) + 2 товари */
export function defaultPages() {
  const list = readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, '')).sort();
  return [...list, ...DEFAULT_PRODUCTS];
}
/** 'catalog' | 'product?id=x' | 'catalog.html#gin' -> { name, path, query } */
export function pageSpec(spec) {
  const [pathAndQuery, hash = ''] = spec.split('#');
  const [p, q = ''] = pathAndQuery.split('?');
  const path = /\.html$/.test(p) ? p : `${p}.html`;
  return { spec, name: p.replace(/\.html$/, ''), path, query: q, hash: hash ? `#${hash}` : '', label: spec };
}
/**
 * URL сторінки зі службовими параметрами.
 * mode: 'static' (?age=ok&reveal=off&parallax=off) | 'anim' (?age=ok&reveal=on&parallax=off) | 'gate' (без age) | 'raw'
 */
export function pageUrl(base, spec, mode = 'static') {
  const s = typeof spec === 'string' ? pageSpec(spec) : spec;
  const params = new URLSearchParams(s.query);
  if (mode === 'static') { params.set('age', 'ok'); params.set('reveal', 'off'); params.set('parallax', 'off'); }
  else if (mode === 'anim') { params.set('age', 'ok'); params.set('reveal', 'on'); params.set('parallax', 'off'); }
  else if (mode === 'gate') { params.set('reveal', 'off'); params.set('parallax', 'off'); }
  const qs = params.toString();
  return `${base}${s.path}${qs ? `?${qs}` : ''}${s.hash}`;
}
export function matrix(o, { dprs = o.dpr, scrollbars = o.scrollbar, widths = o.widths } = {}) {
  const out = [];
  for (const scrollbar of scrollbars) for (const dpr of dprs) for (const width of widths) out.push({ scrollbar, dpr, width });
  return out;
}

/* ------------------------------------------------------------------ звіт */
export class Report {
  constructor(title) { this.title = title; this.items = []; this.infos = []; this.notes = []; this.stats = {}; this.ctx = { hero: {} }; } // ctx — контекст для умовних винятків allow (requires), напр. стан hero (D19)
  /** порушення: { rule, file, selector, page, value, msg } */
  add(v) { this.items.push(v); }
  info(v) { this.infos.push(v); }
  note(s) { this.notes.push(s); }
  get failed() { return this.items.length > 0; }
  byRule() { const m = {}; for (const i of this.items) m[i.rule] = (m[i.rule] || 0) + 1; return m; }
  toJSON() { return { title: this.title, violations: this.items.length, byRule: this.byRule(), items: this.items, infos: this.infos, notes: this.notes, stats: this.stats }; }
  print(opts = {}) {
    if (opts.json) { console.log(JSON.stringify(this.toJSON(), null, 2)); return; }
    const lim = opts.limit ?? 60;
    console.log(`${this.title}: ${this.items.length} порушень${this.items.length ? ` (${Object.entries(this.byRule()).map(([k, v]) => `${k}:${v}`).join(' ')})` : ''}`);
    // групуємо однакові повідомлення, щоб не друкувати сотні однакових рядків
    const groups = new Map();
    for (const v of this.items) {
      const key = [v.rule, v.file || '', v.selector || '', v.msg || '', v.value ?? ''].join('\u0001');
      const g = groups.get(key) || { v, pages: [] };
      if (v.page) g.pages.push(v.page);
      groups.set(key, g);
    }
    let n = 0;
    for (const { v, pages } of groups.values()) {
      if (n++ >= lim) { console.log(`  … ще ${groups.size - lim} груп (повний список: --json)`); break; }
      const pg = [...new Set(pages)];
      const where = [v.file, v.selector, pg.length ? `[${pg.slice(0, 4).join(', ')}${pg.length > 4 ? `, +${pg.length - 4}` : ''}]` : ''].filter(Boolean).join('  ');
      console.log(`  ${v.rule.padEnd(4)} ${where}${v.value !== undefined && v.value !== '' ? `  = ${v.value}` : ''}${v.msg ? `  — ${v.msg}` : ''}`);
    }
    for (const i of this.infos.slice(0, opts.infoLimit ?? 40)) console.log(`  info ${typeof i === 'string' ? i : `${i.rule || ''} ${i.msg || ''}`}`);
    for (const s of this.notes) console.log(`  note ${s}`);
  }
}

/** Обгортка запуску: розбір аргументів, finally-закриття ВСІХ запущених браузерів/тимчасових профілів, код виходу 0/1. */
export async function runMain(name, defaults, main) {
  const opts = parseArgs(process.argv.slice(2), defaults);
  mkdirSync(opts.out, { recursive: true });
  let code = 0;
  const onSig = async () => { await closeAll(); process.exit(130); };
  process.once('SIGINT', onSig); process.once('SIGTERM', onSig);
  try {
    const rep = await main(opts);
    const reports = Array.isArray(rep) ? rep : [rep];
    for (const r of reports) { r.print(opts); if (r.failed) code = 1; }
    if (opts.json && !opts.json_printed) { /* вже надруковано вище */ }
    try { writeFileSync(join(opts.out, `${name}.json`), JSON.stringify(reports.map((r) => r.toJSON()), null, 2)); } catch {}
  } catch (e) {
    console.error(`${name}: збій інструмента: ${e?.stack || e}`);
    code = 2;
  } finally {
    await closeAll();
  }
  process.exitCode = code;
  return code;
}

/* ------------------------------------------------------------------ Chrome */
const launched = new Set();
export async function closeAll() {
  for (const h of [...launched]) { await h.close().catch(() => {}); }
}
/**
 * Chrome з ЧИСТИМ профілем (новий user-data-dir на кожен запуск, видаляється в close()).
 * scrollbar: 'classic' — постійні смуги (як Windows / macOS «завжди»); 'none' — overlay/без смуги.
 */
export async function launch({ scrollbar = 'classic', chrome = DEFAULT_CHROME, out = join(QA_DIR, '.out'), extraArgs = [] } = {}) {
  const profRoot = join(out, 'profiles');
  mkdirSync(profRoot, { recursive: true });
  const userDataDir = mkdtempSync(join(profRoot, 'p-'));
  const args = ['--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--disable-sync', ...extraArgs];
  let ignoreDefaultArgs = [];
  if (scrollbar === 'classic') { ignoreDefaultArgs = ['--hide-scrollbars']; args.push('--disable-features=OverlayScrollbar'); }
  const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', userDataDir, ignoreDefaultArgs, args, defaultViewport: null });
  const pid = browser.process()?.pid;
  const handle = {
    browser, pid, userDataDir, scrollbar,
    async close() {
      launched.delete(handle);
      try { await Promise.race([browser.close(), sleep(5000)]); } catch {}
      // страховка: якщо свій процес живий — завершуємо ЛИШЕ його за PID (жодного pkill)
      if (pid) { try { process.kill(pid, 0); process.kill(pid, 'SIGKILL'); } catch {} }
      try { rmSync(userDataDir, { recursive: true, force: true }); } catch {}
    },
  };
  launched.add(handle);
  return handle;
}

/** Збір консолі й мережі: console.error/warn, pageerror, відповіді ≥400, requestfailed. */
export function attachCollector(page) {
  const c = { console: [], pageerrors: [], http: [], failed: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) c.console.push({ type: m.type(), text: m.text(), loc: m.location()?.url || '' }); });
  page.on('pageerror', (e) => c.pageerrors.push(String(e.message || e)));
  page.on('response', (r) => { if (r.status() >= 400) c.http.push({ status: r.status(), url: r.url() }); });
  page.on('requestfailed', (r) => {
    const err = r.failure()?.errorText || '';
    if (err === 'net::ERR_ABORTED') return; // скасування навігацією/зображенням поза екраном — не помилка сайту
    c.failed.push({ url: r.url(), error: err });
  });
  page.__qa = c;
  return c;
}

/**
 * Відкриває сторінку: viewport (width,height,dpr), collector підключено ДО goto, cache вимкнено опційно.
 * Повертає page. url — повний URL (див. pageUrl).
 */
export async function openPage(browser, url, { width = 1920, height = 1080, dpr = 1, cache = true, cpu = 0, initScript, waitUntil = 'load', timeout = 45000, settle = true } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: dpr });
  if (!cache) await page.setCacheEnabled(false);
  if (cpu > 1) { const cdp = await page.createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
  if (initScript) await page.evaluateOnNewDocument(initScript);
  attachCollector(page);
  const resp = await page.goto(url, { waitUntil, timeout }).catch((e) => { page.__qa.pageerrors.push(`goto: ${e.message}`); return null; });
  page.__status = resp?.status() ?? 0;
  if (settle) await waitStable(page);
  return page;
}

/** document.fonts.ready + мережа в спокої + 2 rAF (+ необов'язковий селектор, напр. картки каталогу) */
export async function waitStable(page, { selector, timeout = 15000, idle = 400 } = {}) {
  try {
    await page.evaluate(() => document.fonts?.ready);
    if (selector) await page.waitForSelector(selector, { timeout });
    await page.waitForNetworkIdle({ idleTime: idle, timeout }).catch(() => {});
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  } catch {}
}

/**
 * Стабілізація вимірювань геометрії (D12/D18): чекає, поки макет перестане змінюватись. Причина флейка D12 під навантаженням: --vw виставляє viewport.js
 * асинхронно (ResizeObserver) з ширини html, а смуга прокрутки (classic, 15px) з'являється/зникає, коли довантажуються шрифти/зображення й змінюється висота сторінки;
 * замір у вікні «смуга вже змінила clientWidth, а --vw ще старий» зсуває всі блоки на 7.5px (половина смуги).
 * Умови «стабільно» — ПІДРЯД `frames` кадрів rAF (за замовч. 4) без змін: (а) clientWidth, смуга (innerWidth−clientWidth), ширина html, scrollHeight;
 * (б) `--vw` = round(ширина html) (viewport.js догнав); (в) відбиток геометрії до 80 рівномірно вибраних елементів (left/width/top, 0.01px). Макс. `timeout` мс.
 * Повертає { stable, frames, waited, clientW, bar }.
 */
export async function waitLayoutStable(page, { frames = 4, timeout = 8000, minMs = 120 } = {}) {
  try {
    return await page.evaluate((frames, timeout, minMs) => new Promise((resolve) => {
      const root = document.documentElement; const t0 = performance.now(); let same = 0, last = '';
      const finger = () => {
        const r = root.getBoundingClientRect(); const vw = parseFloat(root.style.getPropertyValue('--vw')) || 0;
        const els = [...document.body.querySelectorAll('*')]; const step = Math.max(1, Math.floor(els.length / 80)); let g = '';
        for (let i = 0; i < els.length; i += step) { const b = els[i].getBoundingClientRect(); g += `${b.left.toFixed(2)},${b.width.toFixed(2)},${Math.round(b.top)};`; }
        return { sig: `${root.clientWidth}|${window.innerWidth - root.clientWidth}|${r.width.toFixed(2)}|${root.scrollHeight}|${g}`, vwOk: vw === Math.round(r.width), clientW: root.clientWidth, bar: window.innerWidth - root.clientWidth };
      };
      const tick = () => {
        const f = finger(); const now = performance.now();
        if (f.sig === last && f.vwOk) same++; else { same = 0; last = f.sig; }
        if ((same >= frames && now - t0 >= minMs) || now - t0 >= timeout) return resolve({ stable: same >= frames, frames: same, waited: Math.round(now - t0), clientW: f.clientW, bar: f.bar });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), frames, timeout, minMs);
  } catch { return { stable: false, frames: 0, waited: 0 }; }
}

/** page.evaluate з повтором: dev-сервер може перезавантажити сторінку (HMR від чужих правок) — «Execution context was destroyed» → чекаємо load і міряємо заново */
export async function evalRetry(page, fn, arg, tries = 4) {
  for (let i = 0; ; i++) {
    try { return await page.evaluate(fn, arg); } catch (e) {
      if (i >= tries - 1 || !/context was destroyed|navigation|Target closed|detached/i.test(String(e.message))) throw e;
      await sleep(400); await waitStable(page); await waitLayoutStable(page);
    }
  }
}

/**
 * Стабільний збір геометрії: чекаємо стабільного макета, збираємо `collect(cfg)` і ПОВТОРЮЄМО до збігу двох замірів підряд (підпис `sig(data)`), максимум 3 заміри → голосування 2 з 3
 * (якщо жодні два не збіглися — береться замір із clientWidth = --vw і note-прапор `unstable`). Повертає дані + `__stab: { samples, agreed, unstable }`.
 */
export async function collectStable(page, collect, cfg, sig, { max = 3 } = {}) {
  const samples = [];
  for (let i = 0; i < max; i++) {
    await waitLayoutStable(page);
    samples.push(await evalRetry(page, collect, cfg));
    if (i >= 1 && sig(samples[i]) === sig(samples[i - 1])) { const d = samples[i]; d.__stab = { samples: samples.length, agreed: true, unstable: false }; return d; }
  }
  const sigs = samples.map(sig); const pick = samples.find((s, i) => sigs.filter((x) => x === sigs[i]).length >= 2) || samples.find((s) => s.clientW === s.vw) || samples[samples.length - 1];
  pick.__stab = { samples: samples.length, agreed: sigs.some((x, i) => sigs.indexOf(x) !== i), unstable: !sigs.some((x, i) => sigs.indexOf(x) !== i) };
  return pick;
}

/** масштаб --u: clientWidth/1920 з обмеженням (як у tokens.css: clamp(1185px, --vw, 1920px) / 1920) */
export async function u(page) {
  return page.evaluate(() => {
    const el = document.documentElement;
    const vw = parseFloat(el.style.getPropertyValue('--vw')) || el.getBoundingClientRect().width;
    return Math.min(Math.max(vw, 1185), 1920) / 1920;
  });
}

/* ------------------------------------------------------------------ скриншоти */
export async function screenshot(page, out, name, { selector, clip, fullPage = false } = {}) {
  mkdirSync(out, { recursive: true });
  const path = join(out, `${name}.png`);
  if (selector) { const h = await page.$(selector); if (h) { await h.screenshot({ path }); return path; } }
  await page.screenshot({ path, clip, fullPage });
  return path;
}

/* ------------------------------------------------------------------ вимірювання (specification «утиліта вимірювань») */
export const measure = {
  /** прямокутник елемента в координатах ДОКУМЕНТА (px) */
  async rect(page, selector, index = 0) {
    return page.evaluate((sel, i) => {
      const el = document.querySelectorAll(sel)[i]; if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, r: r.right + scrollX, b: r.bottom + scrollY };
    }, selector, index);
  },
  /** усі видимі нащадки (за innerSel), що виходять за межі контейнера більш ніж на tol px */
  async inside(page, containerSel, innerSel = '*', tol = 0.5) {
    return page.evaluate((cs, is, t) => {
      const c = document.querySelector(cs); if (!c) return { error: `немає ${cs}` };
      const cr = c.getBoundingClientRect(); const bad = [];
      for (const el of c.querySelectorAll(is)) {
        if (!el.checkVisibility?.()) continue;
        const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue;
        const d = { l: cr.left - r.left, t: cr.top - r.top, r: r.right - cr.right, b: r.bottom - cr.bottom };
        if (d.l > t || d.t > t || d.r > t || d.b > t) bad.push({ sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : ''), over: d });
      }
      return { ok: bad.length === 0, bad };
    }, containerSel, innerSel, tol);
  },
  /** положення B відносно A: dx,dy (від лівого/верхнього краю A), відступи, у px і в u */
  async relative(page, selA, selB) {
    const k = await u(page);
    return page.evaluate((a, b, uu) => {
      const A = document.querySelector(a)?.getBoundingClientRect(), B = document.querySelector(b)?.getBoundingClientRect();
      if (!A || !B) return null;
      const px = { dx: B.left - A.left, dy: B.top - A.top, right: A.right - B.right, bottom: A.bottom - B.bottom, cx: (B.left + B.width / 2) - (A.left + A.width / 2), cy: (B.top + B.height / 2) - (A.top + A.height / 2) };
      return { px, u: Object.fromEntries(Object.entries(px).map(([k2, v]) => [k2, +(v / uu).toFixed(3)])) };
    }, selA, selB, k);
  },
  async styles(page, selector, props, pseudo = null) {
    return page.evaluate((sel, ps, pe) => {
      const el = document.querySelector(sel); if (!el) return null;
      const cs = getComputedStyle(el, pe); return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p) || cs[p]]));
    }, selector, props, pseudo);
  },
};

/* ------------------------------------------------------------------ CLS */
/** Додати ДО goto (evaluateOnNewDocument): збирає layout-shift із джерелами. Читати readCLS(page). */
export const CLS_INIT = () => {
  window.__cls = { value: 0, shifts: [] };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__cls.value += e.value;
        const pathOf = (n) => {
          if (!n || n.nodeType !== 1) return n?.parentElement ? pathOf(n.parentElement) : '(text)';
          const id = n.id ? `#${n.id}` : ''; const cl = typeof n.className === 'string' && n.className.trim() ? `.${n.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '';
          return n.tagName.toLowerCase() + id + cl;
        };
        window.__cls.shifts.push({ t: Math.round(e.startTime), v: +e.value.toFixed(5), sources: (e.sources || []).map((s) => ({ node: pathOf(s.node), prev: [s.previousRect.x, s.previousRect.y, s.previousRect.width, s.previousRect.height].map(Math.round), cur: [s.currentRect.x, s.currentRect.y, s.currentRect.width, s.currentRect.height].map(Math.round) })) });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
};
export const readCLS = (page) => page.evaluate(() => window.__cls || { value: 0, shifts: [] });

/* ------------------------------------------------------------------ hscroll */
/**
 * Горизонтальний скрол/зріз. На сайті html { overflow-x: clip } — scrollWidth його НЕ видає, тому додатково шукаємо елементи,
 * що виходять за межі в'юпорта (видима частина з урахуванням clip-предків окрім кореня).
 */
export async function hscroll(page, tol = 1) {
  return page.evaluate((tol2) => {
    const de = document.documentElement, vw = de.clientWidth;
    const res = { clientWidth: vw, innerWidth: innerWidth, scrollWidth: de.scrollWidth, bodyScrollWidth: document.body.scrollWidth, overflowPx: Math.max(de.scrollWidth, document.body.scrollWidth) - vw, offenders: [] };
    const clipsX = (el) => { const cs = getComputedStyle(el); return cs.overflowX !== 'visible' || cs.contain.includes('paint') || cs.clipPath !== 'none'; };
    const nameOf = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '');
    const seen = new Set();
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('template, [inert], [id^="__"]') || el instanceof SVGElement && el.closest('svg') !== el) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      // відсікання предками з overflow-x ≠ visible (окрім html/body)
      let left = r.left, right = r.right, p = el.parentElement, clipped = false;
      while (p && p !== document.body && p !== de) {
        if (clipsX(p)) { const pr = p.getBoundingClientRect(); left = Math.max(left, pr.left); right = Math.min(right, pr.right); if (right <= left) { clipped = true; break; } }
        p = p.parentElement;
      }
      if (clipped) continue;
      if (right > vw + tol2 || left < -tol2) {
        const nm = nameOf(el); if (seen.has(nm)) continue; seen.add(nm);
        res.offenders.push({ el: nm, left: +left.toFixed(1), right: +right.toFixed(1), over: +Math.max(right - vw, -left).toFixed(1) });
      }
    }
    res.offenders.sort((a, b) => b.over - a.over); res.offenders = res.offenders.slice(0, 8);
    return res;
  }, tol);
}
/** true, якщо справді є горизонтальний скрол або елементи за межами в'юпорта */
export const hscrollBad = (h) => h.overflowPx > 1 || h.offenders.length > 0;

/* ------------------------------------------------------------------ hover / focus */
/** Курсор у нейтральну точку (над порожнім місцем сторінки, не під хедером) */
export async function unhover(page) { await page.mouse.move(1, Math.floor((page.viewport()?.height || 800) / 2)).catch(() => {}); }
/**
 * Безпечний hover: миттєвий скрол (html має scroll-behavior: smooth → behavior:'instant'), елемент у середину екрана (не під sticky-хедер/пілюлю),
 * наведення в центр видимої точки, очікування переходу, перевірка :hover. Повертає { ok, rect }.
 */
export async function safeHover(page, handleOrSel, { wait = 650, retries = 2 } = {}) {
  const h = typeof handleOrSel === 'string' ? await page.$(handleOrSel) : handleOrSel;
  if (!h) return { ok: false, reason: 'немає елемента' };
  for (let i = 0; i <= retries; i++) {
    await h.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const y = r.top + scrollY - Math.round(innerHeight * 0.55) + r.height / 2;
      scrollTo({ top: Math.max(0, y), behavior: 'instant' });
    });
    await sleep(60);
    const pt = await h.evaluate((el) => {
      const r = el.getBoundingClientRect();
      // шукаємо точку всередині елемента, яка справді належить йому (а не накладці)
      const cand = [[0.5, 0.5], [0.3, 0.5], [0.7, 0.5], [0.5, 0.3], [0.5, 0.7], [0.15, 0.5], [0.85, 0.5]];
      for (const [fx, fy] of cand) { const x = r.left + r.width * fx, y = r.top + r.height * fy; const t = document.elementFromPoint(x, y); if (t && (el === t || el.contains(t) || t.contains(el) && t !== document.body && t !== document.documentElement)) return { x, y }; }
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await page.mouse.move(pt.x - 3, pt.y - 3); await page.mouse.move(pt.x, pt.y, { steps: 3 });
    await sleep(wait);
    const hov = await h.evaluate((el) => el.matches(':hover'));
    if (hov) return { ok: true, pt };
  }
  return { ok: false, reason: ':hover не встановився' };
}

/**
 * Tab-walker: реальні натискання Tab; на кожній зупинці — елемент, чи видимий, outline/box-shadow/ псевдо-кільце, контраст кільця до фону.
 * Повертає масив стопів. Зупиняється, коли фокус повертається на перший елемент або іде за межі сторінки.
 */
export async function tabWalk(page, { max = 220, minRing = 3 } = {}) {
  // html { scroll-behavior: smooth } (base.css) гасимо ЛИШЕ на час проходу: фокус на далекому елементі інакше ще «їде» в момент заміру кільця (знімок знизу від вікна → хибне «1:1»)
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo({ top: 0, behavior: 'instant' }); document.activeElement?.blur?.(); });
  await unhover(page);
  const stops = []; let first = null;
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    await sleep(70);
    let info = await page.evaluate(FOCUS_PROBE, minRing);
    if (!info) break;
    // перехід focus 0.15s: якщо щось не так — перевіряємо ще раз після завершення переходів (0.45s)
    if (info.visible && (!info.focusVisible || !info.ring || (info.ratio !== null && info.ratio < minRing))) { await sleep(520); info = (await page.evaluate(FOCUS_PROBE, minRing)) || info; }
    // підозрілий контраст за ланцюжком фонів (фон може малюватись псевдоелементами/картинками) — міряємо ПІКСЕЛЯМИ скриншота
    if (info.visible && info.ring && info.ratio !== null && info.ratio < minRing) info.pxRatio = await ringPixelContrast(page, info);
    if (first === null) first = info.path;
    else if (info.path === first && stops.length > 1) break;
    stops.push(info);
  }
  return stops;
}
function FOCUS_PROBE() {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  if (el.closest('[id^="__"]')) return { path: '#__dev-overlay', el: '#__dev', visible: false, focusVisible: true, rect: [0, 0, 0, 0], ring: null, ratio: null, bgUnknown: false, tag: '', insideAgeGate: false, devOverlay: true };
  const nameOf = (e) => e.tagName.toLowerCase() + (e.id ? `#${e.id}` : '') + (typeof e.className === 'string' && e.className.trim() ? `.${e.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '');
  const path = (() => { const p = []; for (let n = el, d = 0; n && n.nodeType === 1 && d < 5; n = n.parentElement, d++) p.unshift(nameOf(n)); return p.join(' > '); })();
  const r = el.getBoundingClientRect();
  const visible = el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) !== false && r.width > 0 && r.height > 0;
  const fv = el.matches(':focus-visible');
  const norm = (c) => { const cv = document.createElement('canvas'); cv.width = cv.height = 1; const x = cv.getContext('2d', { willReadFrequently: true }); x.clearRect(0, 0, 1, 1); x.fillStyle = '#000'; x.fillStyle = c; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const ringOf = (cs) => {
    const w = parseFloat(cs.outlineWidth) || 0;
    const o = cs.outlineStyle !== 'none' && w > 0 ? { kind: 'outline', width: w, offset: parseFloat(cs.outlineOffset) || 0, color: norm(cs.outlineColor) } : null;
    if (o) return o;
    if (cs.boxShadow && cs.boxShadow !== 'none') { const m = cs.boxShadow.match(/(rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-f]+)/i); if (m) return { kind: 'box-shadow', width: 1, offset: 0, color: norm(m[1]) }; }
    return null;
  };
  const cs = getComputedStyle(el);
  let ring = ringOf(cs), where = 'self';
  if (!ring) for (const pe of ['::after', '::before']) { const pcs = getComputedStyle(el, pe); if (pcs.content !== 'none') { const rr = ringOf(pcs); if (rr) { ring = rr; where = pe; break; } } }
  // фон під кільцем: перший непрозорий фон предків (альфа-змішування), поза межами елемента (outline зовні) — беремо фон ПРЕДКА
  const bgOf = (start) => {
    let layers = []; let node = start;
    for (; node && node.nodeType === 1; node = node.parentElement) {
      const c = getComputedStyle(node);
      const col = norm(c.backgroundColor);
      if (c.backgroundImage !== 'none') layers.push({ img: true });
      if (col[3] > 0) { layers.push({ col }); if (col[3] >= 0.999) break; }
    }
    let base = [255, 255, 255]; let unknown = false;
    for (const l of layers.reverse()) { if (l.img) { unknown = true; continue; } const a = l.col[3]; base = base.map((v, i) => Math.round(l.col[i] * a + v * (1 - a))); }
    return { rgb: base, unknown };
  };
  const bg = bgOf(ring && ring.offset < 0 ? el : (el.parentElement || el));
  const lum = (c) => { const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
  let ratio = null;
  if (ring) { const a = ring.color[3]; const fg = ring.color.slice(0, 3).map((v, i) => Math.round(v * a + bg.rgb[i] * (1 - a))); const L1 = lum(fg), L2 = lum(bg.rgb); ratio = +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2); }
  return { path, el: nameOf(el), visible, focusVisible: fv, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], rectF: [r.left, r.top, r.width, r.height], ring: ring ? { ...ring, color: ring.color.slice(0, 3).join(','), where } : null, ratio, bgUnknown: bg.unknown, tag: el.tagName.toLowerCase(), insideAgeGate: !!el.closest('[data-age-gate]') };
}

/* ------------------------------------------------------------------ контраст */
/** WCAG-контраст двох кольорів [r,g,b] (0..255) */
export function contrast(a, b) {
  const lum = (c) => { const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
  const L1 = lum(a), L2 = lum(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}
/** нормалізація довільного CSS-кольору в [r,g,b,a] у контексті сторінки (color-mix, rgb, hex, named…) */
export async function normColors(page, colors) {
  return page.evaluate((list) => list.map((c) => { const cv = document.createElement('canvas'); cv.width = cv.height = 1; const x = cv.getContext('2d', { willReadFrequently: true }); x.clearRect(0, 0, 1, 1); x.fillStyle = '#000'; x.fillStyle = c; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], +(d[3] / 255).toFixed(3)]; }), colors);
}

/* ------------------------------------------------------------------ токени */
/**
 * Розв'язані значення `--*` з :root. Повертає { name: { raw, value, kind } }:
 * raw — рядок із getPropertyValue (var() уже підставлені, calc лишається), value — computed: колір → 'rgb(...)'/'color(...)', довжина → px (число),
 * час → мс (число), інше — raw. Імена беруться з усіх стилів (:root-правила) цієї сторінки.
 */
export async function tokens(page) {
  return page.evaluate(() => {
    const root = document.documentElement, names = new Set();
    const walk = (rules) => { for (const r of rules) { if (r.cssRules && !(r instanceof CSSStyleRule)) walk(r.cssRules); if (r instanceof CSSStyleRule && /(^|,)\s*(:root|html)\s*(,|$)/.test(r.selectorText)) for (const p of r.style) if (p.startsWith('--')) names.add(p); } };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} }
    const host = document.createElement('div'); host.style.cssText = 'position:absolute;visibility:hidden;color:rgb(1,2,3);margin-left:0;transition-duration:0s';
    document.body.append(host);
    const cs = getComputedStyle(root), hs = getComputedStyle(host), out = {};
    for (const n of names) {
      const raw = cs.getPropertyValue(n).trim(); let value = raw, kind = 'raw';
      host.style.color = 'rgb(1, 2, 3)'; host.style.marginLeft = '0px'; host.style.transitionDuration = '0s';
      host.style.color = `var(${n})`; const c = hs.color;
      if (c !== 'rgb(1, 2, 3)' && raw) { value = c; kind = 'color'; }
      else {
        host.style.marginLeft = `var(${n})`;
        if (hs.marginLeft !== '0px' && /\d/.test(raw)) { value = parseFloat(hs.marginLeft); kind = 'length'; }
        else if (/^-?[\d.]+(s|ms)\b/.test(raw) || /^calc\(.*\d(s|ms)/.test(raw)) { host.style.transitionDuration = `var(${n})`; const t = parseFloat(hs.transitionDuration); if (!Number.isNaN(t)) { value = Math.round(t * 1000); kind = 'time-ms'; } }
        else if (/^-?[\d.]+$/.test(raw)) { value = parseFloat(raw); kind = 'number'; }
      }
      out[n] = { raw, value, kind };
    }
    host.remove();
    return out;
  });
}

/* ------------------------------------------------------------------ різне */
export function fmt(n, d = 2) { return Number.isFinite(n) ? +n.toFixed(d) : n; }
export const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0; };
export const uniq = (a) => [...new Set(a)];
export function outFile(o, name) { mkdirSync(o.out, { recursive: true }); return join(o.out, name); }
export const exists = existsSync;

/** Контраст кільця за пікселями скриншота: піксель кільця (±1px навколо очікуваного) проти фону на 3px далі назовні, макс. по 4 сторонах. null — не вдалось (кільце поза кадром). */
export async function ringPixelContrast(page, stop) {
  try {
    const dpr = page.viewport()?.deviceScaleFactor || 1;
    const b64 = await page.screenshot({ encoding: 'base64' });
    return await page.evaluate(async (b64s, r, ring, dpr2) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64s}`; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
      const get = (x, y) => { x = Math.round(x * dpr2); y = Math.round(y * dpr2); if (x < 0 || y < 0 || x >= img.width || y >= img.height) return null; const d = cx.getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2]]; };
      const lum = (c) => { const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
      const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const [L, T, W, H] = r; const w = ring.width, o = ring.offset; const dRing = o + w / 2, dBg = o + w + 3 / dpr2 + 1;
      const sides = [[L + W / 2, T - dRing, 0, -1], [L + W / 2, T + H + dRing, 0, 1], [L - dRing, T + H / 2, -1, 0], [L + W + dRing, T + H / 2, 1, 0]];
      let best = null;
      for (const [x, y, nx, ny] of sides) {
        const bg = get(x + nx * (dBg - dRing), y + ny * (dBg - dRing)); if (!bg) continue;
        let m = 0; for (let k = -1; k <= 1; k++) { const p = get(x + (nx ? 0 : 0) + (ny ? k / dpr2 : 0) * 0 + nx * k / dpr2, y + ny * k / dpr2); if (p) m = Math.max(m, cr(p, bg)); }
        best = best === null ? m : Math.max(best, m);
      }
      return best === null ? null : +best.toFixed(2);
    }, b64, stop.rectF, stop.ring, dpr);
  } catch { return null; }
}

/** Піксельний контраст тексту елемента: мода кольору = фон, піксель найбільш віддалений від моди = текст. Повертає ratio або null. */
export async function textPixelContrast(page, handle) {
  try {
    await handle.evaluate((el) => { const r = el.getBoundingClientRect(); scrollTo({ top: Math.max(0, r.top + scrollY - innerHeight * 0.5), behavior: 'instant' }); });
    await sleep(80);
    const b64 = await handle.screenshot({ encoding: 'base64', captureBeyondViewport: false }); // captureBeyondViewport:false — інакше у classic-смузі (--vw ≠ ширині захоплення) кліп мазав повз текст (порожній знімок, 1.03:1)
    return await page.evaluate(async (b64s) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64s}`; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, img.width, img.height).data; const counts = new Map();
      for (let i = 0; i < d.length; i += 4) { const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3); counts.set(k, (counts.get(k) || 0) + 1); }
      let mode = null, mc = 0; for (const [k, c] of counts) if (c > mc) { mc = c; mode = k; }
      const mk = [((mode >> 10) & 31) << 3, ((mode >> 5) & 31) << 3, (mode & 31) << 3];
      let far = null, fd = -1; for (let i = 0; i < d.length; i += 4) { const dist = (d[i] - mk[0]) ** 2 + (d[i + 1] - mk[1]) ** 2 + (d[i + 2] - mk[2]) ** 2; if (dist > fd) { fd = dist; far = [d[i], d[i + 1], d[i + 2]]; } }
      if (!far) return null;
      const lum = (c) => { const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
      const a = lum(mk), b = lum(far); return +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2);
    }, b64);
  } catch { return null; }
}
