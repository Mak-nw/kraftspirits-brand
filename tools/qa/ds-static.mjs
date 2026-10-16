// Статичні перевірки check-ds (S1–S9): CSS/HTML/JS без браузера. Для S7/S9 потрібен зібраний HTML (vite build у temp outDir).
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, relative, resolve, dirname, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.out', '.vite', 'screenshots', 'scratch']);
export function walk(dir, exts, acc = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP_DIRS.has(n) || n.startsWith('.')) continue;
    const p = join(dir, n); const st = statSync(p);
    if (st.isDirectory()) walk(p, exts, acc); else if (exts.includes(extname(n))) acc.push(p);
  }
  return acc;
}
const rel = (p) => relative(ROOT, p);
const read = (p) => readFileSync(p, 'utf8');

/* ---------- allow.json ---------- */
export function loadAllow(path) {
  let j = { allow: [], dynamic: {}, static: {} };
  try { j = { ...j, ...JSON.parse(read(path)) }; } catch (e) { console.error(`check-ds: не вдалось прочитати ${path}: ${e.message}`); }
  j.allow = (j.allow || []).filter((a) => a.reason && a.rule);
  return j;
}
/** Точний збіг класів/тегів (не підрядок): кожен токен виняткового селектора (`div`, `cocktail__body`, `product-card--catalog`…) має бути ТОЧНО серед токенів селектора порушення.
 *  `site-header__logo` не маскує `site-header__logos`; `.a.b` матчить `div.a.b > x`, але не `div.a`. */
const selTokens = (s) => String(s).split(/[^A-Za-z0-9_-]+/).filter(Boolean);
export function selectorMatches(allowSel, violationSel) {
  const need = selTokens(allowSel), have = new Set(selTokens(violationSel));
  return need.length > 0 && need.every((t) => have.has(t));
}
export function isAllowed(allow, v) {
  return allow.allow.some((a) =>
    (a.rule === '*' || a.rule === v.rule) &&
    (!a.file || (v.file || '').includes(a.file)) &&
    (!a.selector || selectorMatches(a.selector, v.selector || '')) &&
    (!a.page || (v.page || '').includes(a.page)) &&
    (!a.prop || new RegExp(a.prop).test(v.prop || '')) &&
    (!a.value || new RegExp(a.value).test(String(v.value ?? ''))));
}

/* ---------- мінімальний CSS-парсер (коментарі, рядки, дужки, вкладені блоки) ---------- */
export function parseCss(text) {
  const decls = [], imports = [], urls = [];
  const stack = []; let buf = '', bufLine = 1, line = 1, depth = 0, i = 0;
  const n = text.length;
  const selector = () => stack.filter((s) => !s.startsWith('@')).join(' ');
  const atCtx = () => stack.filter((s) => s.startsWith('@')).join(' ');
  const flush = () => {
    const s = buf.trim(); buf = '';
    if (!s) return;
    if (s.startsWith('@import')) { imports.push({ line: bufLine, text: s }); return; }
    if (s.startsWith('@')) return;
    const c = s.indexOf(':'); if (c < 1) return;
    const prop = s.slice(0, c).trim().toLowerCase(), value = s.slice(c + 1).trim();
    if (!/^(--[\w-]+|[a-z-]+)$/i.test(prop)) return;
    decls.push({ line: bufLine, selector: selector(), at: atCtx(), prop, value });
  };
  const push = (ch) => { if (!buf.trim()) bufLine = line; buf += ch; };
  while (i < n) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '*') { const e = text.indexOf('*/', i + 2); const chunk = text.slice(i, e < 0 ? n : e + 2); line += (chunk.match(/\n/g) || []).length; i = e < 0 ? n : e + 2; push(' '); continue; }
    if (ch === '"' || ch === "'") { let j = i + 1; while (j < n && text[j] !== ch) { if (text[j] === '\\') j++; j++; } const chunk = text.slice(i, j + 1); push(chunk); line += (chunk.match(/\n/g) || []).length; i = j + 1; continue; }
    if (ch === '\n') { line++; push(ch); i++; continue; }
    if (ch === '(') { depth++; push(ch); i++; continue; }
    if (ch === ')') { depth = Math.max(0, depth - 1); push(ch); i++; continue; }
    if (depth === 0) {
      if (ch === '{') { stack.push(buf.trim().replace(/\s+/g, ' ')); buf = ''; i++; continue; }
      if (ch === '}') { flush(); stack.pop(); i++; continue; }
      if (ch === ';') { flush(); i++; continue; }
    }
    push(ch); i++;
  }
  flush();
  for (const d of decls) for (const m of d.value.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) urls.push({ line: d.line, url: m[2], selector: d.selector, prop: d.prop });
  return { decls, imports, urls };
}

/* ---------- HTML: прибрати коментарі (збереживши нумерацію рядків) ---------- */
const stripHtmlComments = (h) => h.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

/* ---------- запуск vite build у temp outDir ---------- */
export function buildDist(outDir, { reuse = false } = {}) {
  if (reuse && existsSync(join(outDir, 'index.html'))) return { ok: true, reused: true };
  rmSync(outDir, { recursive: true, force: true }); mkdirSync(outDir, { recursive: true });
  const r = spawnSync(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], { cwd: ROOT, env: { ...process.env, BASE_PATH: '/' }, encoding: 'utf8', timeout: 180000 });
  return { ok: r.status === 0, stderr: (r.stderr || '') + (r.stdout || '') };
}

const stripUrl = (v) => v.replace(/url\([^)]*\)/g, 'url()');

/**
 * Виконує S1–S11. Повертає { items:[{rule,file,line,selector,prop,value,msg}], infos:[…], stats }.
 * opts: { allow, dist (шлях до зібраного HTML), rules:Set|null }
 */
export function runStatic({ allow, dist, rules = null, root = ROOT }) {
  const want = (r) => !rules || rules.has(r);
  const S = allow.static || {};
  const sizeRe = new RegExp(S.sizeProps || '^$'), colorPropRe = new RegExp(S.colorProps || '^$');
  const named = new Set((S.namedColors || []).map((s) => s.toLowerCase()));
  const underlineSel = (S.underlineAllowSelectors || []).map((s) => new RegExp(s));
  const items = [], infos = [], stats = {};
  const add = (v) => items.push(v);

  const cssFiles = walk(join(root, 'src/styles'), ['.css']);
  const tokensPath = join(root, 'src/styles/tokens.css');
  const htmlFiles = [...readdirSync(root).filter((f) => f.endsWith('.html')).map((f) => join(root, f)), ...walk(join(root, 'partials'), ['.html'])];
  const jsFiles = walk(join(root, 'src'), ['.js']);
  const parsed = new Map();
  for (const f of cssFiles) parsed.set(f, parseCss(read(f)));
  stats.cssFiles = cssFiles.length; stats.htmlFiles = htmlFiles.length; stats.jsFiles = jsFiles.length;

  /* --- S1: кольори поза tokens.css --- */
  if (want('S1')) {
    for (const [f, p] of parsed) {
      if (f === tokensPath) continue;
      for (const d of p.decls) {
        const v = stripUrl(d.value);
        const m = v.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/);
        if (m) { add({ rule: 'S1', file: rel(f), line: d.line, selector: d.selector, prop: d.prop, value: m[0] === '#' ? m[0] : d.value.slice(0, 80), msg: 'колір поза tokens.css' }); continue; }
        if (colorPropRe.test(d.prop)) for (const w of v.toLowerCase().split(/[^a-z-]+/)) if (named.has(w)) { add({ rule: 'S1', file: rel(f), line: d.line, selector: d.selector, prop: d.prop, value: w, msg: 'іменований колір поза tokens.css' }); break; }
      }
    }
    for (const f of htmlFiles) {
      const raw = stripHtmlComments(read(f));
      for (const m of raw.matchAll(/\b(fill|stroke|stop-color|flood-color|color|bgcolor)\s*=\s*"(#[0-9a-fA-F]{3,8}|rgba?\([^"]*|hsla?\([^"]*)"/g))
        add({ rule: 'S1', file: rel(f), line: lineOf(raw, m.index), selector: `[${m[1]}]`, prop: m[1], value: m[2], msg: 'колір у SVG/HTML-атрибуті' });
    }
  }

  /* --- S2: px/rem у розмірних властивостях поза tokens.css --- */
  if (want('S2')) {
    for (const [f, p] of parsed) {
      if (f === tokensPath) continue;
      for (const d of p.decls) {
        if (!sizeRe.test(d.prop)) continue;
        const v = stripUrl(d.value);
        const m = v.match(/(?<![\w.-])-?\d*\.?\d+(px|rem)\b/g);
        if (m) add({ rule: 'S2', file: rel(f), line: d.line, selector: d.selector, prop: d.prop, value: d.value.slice(0, 80), msg: 'px/rem замість токена/--u/em' });
      }
    }
  }

  /* --- S3: inline style --- */
  if (want('S3')) {
    for (const f of htmlFiles) {
      const raw = stripHtmlComments(read(f));
      for (const m of raw.matchAll(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/g)) add({ rule: 'S3', file: rel(f), line: lineOf(raw, m.index), selector: raw.slice(Math.max(0, raw.lastIndexOf('<', m.index)), m.index).replace(/\s+/g, ' ').slice(0, 50), value: m[2].slice(0, 70), msg: 'inline style' });
    }
    for (const f of jsFiles) {
      const raw = read(f);
      for (const m of raw.matchAll(/\sstyle\s*=\s*(\\?["'])(?!\s*\+|\s*\$\{)([^"'\\]+)/g)) add({ rule: 'S3', file: rel(f), line: lineOf(raw, m.index), selector: '(розмітка у JS-рядку)', value: m[2].slice(0, 70), msg: 'inline style у шаблоні JS' });
    }
  }

  /* --- S4: text-decoration: underline поза футером/юридичним текстом воріт --- */
  if (want('S4')) {
    for (const [f, p] of parsed) {
      for (const d of p.decls) {
        if (!/^text-decoration(-line)?$/.test(d.prop) || !/underline/.test(d.value)) continue;
        if (underlineSel.some((re) => re.test(d.selector))) continue;
        add({ rule: 'S4', file: rel(f), line: d.line, selector: d.selector, prop: d.prop, value: d.value, msg: 'underline поза футером/юридичним текстом воріт' });
      }
    }
  }

  /* --- S5/S6: var(--x) → існуючий токен; невикористані токени --- */
  const defined = new Map(); // name -> {file,line}
  const used = new Map();    // name -> count
  for (const [f, p] of parsed) for (const d of p.decls) {
    if (d.prop.startsWith('--') && !defined.has(d.prop)) defined.set(d.prop, { file: rel(f), line: d.line });
  }
  // динамічні змінні: JS setProperty('--x'), style="--x:…" у HTML
  const dynDefined = new Set();
  for (const f of jsFiles) for (const m of read(f).matchAll(/setProperty\(\s*['"`](--[\w-]+)/g)) dynDefined.add(m[1]);
  for (const f of htmlFiles) for (const m of stripHtmlComments(read(f)).matchAll(/(--[\w-]+)\s*:/g)) dynDefined.add(m[1]);
  const jsMentions = new Set();
  for (const f of jsFiles) for (const m of read(f).matchAll(/['"`](--[\w-]+)['"`]/g)) jsMentions.add(m[1]);
  for (const [f, p] of parsed) for (const d of p.decls) for (const m of d.value.matchAll(/var\(\s*(--[\w-]+)(\s*,)?/g)) {
    const name = m[1]; used.set(name, (used.get(name) || 0) + (f === tokensPath && name === d.prop ? 0 : 1));
    if (want('S5') && !defined.has(name) && !dynDefined.has(name)) add({ rule: 'S5', file: rel(f), line: d.line, selector: d.selector, prop: d.prop, value: name, msg: m[2] ? 'токен не існує (є fallback)' : 'токен не існує' });
  }
  for (const f of htmlFiles) for (const m of stripHtmlComments(read(f)).matchAll(/var\(\s*(--[\w-]+)/g)) { used.set(m[1], (used.get(m[1]) || 0) + 1); }
  if (want('S6')) {
    const tp = parsed.get(tokensPath);
    const unused = [];
    if (tp) for (const d of tp.decls) if (d.prop.startsWith('--') && !(used.get(d.prop) > 0) && !jsMentions.has(d.prop)) unused.push(d.prop);
    stats.unusedTokens = unused.length;
    if (unused.length) infos.push({ rule: 'S6', msg: `невикористаних токенів у tokens.css: ${unused.length} (інформаційно): ${unused.slice(0, 12).join(' ')}${unused.length > 12 ? ' …' : ''}`, list: unused });
  }
  stats.tokensDefined = defined.size;

  /* --- S11: текст = лише ролі .t-* (CLAUDE.md п. 5в): заборонені типографічні властивості поза base.css + сторінкові типо-токени в tokens.css --- */
  if (want('S11')) {
    const S11 = S.s11 || {};
    const forbidden = new RegExp(S11.props || '^(font|font-size|font-family|font-weight|line-height|letter-spacing|text-transform)$');
    const inheritRe = new RegExp(S11.inheritValues || '^(inherit|unset|initial|revert|revert-layer)$', 'i');
    const basePath = join(root, 'src/styles/base.css');
    const catOf = (d) => {
      const v = d.value.replace(/\s*!important\s*$/, '').trim();
      if (d.prop === 'font-size' && /^-?[\d.]+(em|%)$/.test(v)) return 'em-частка';
      if (d.prop === 'text-transform' && /^none$/i.test(v)) return 'text-transform:none (скидання регістру ролі)';
      if (/var\(\s*--(type|font-size|lh|ls)-/.test(v) && /(barrels|age|cocktail|catalog|product|contacts|feedback|ds-)/.test(v)) return 'сторінковий токен';
      if (/var\(/.test(v)) return 'токен без ролі';
      return 'власне значення';
    };
    stats.s11 = { inheritAllowed: 0, fontVariantNumeric: 0, byCat: {} };
    for (const [f, p] of parsed) {
      if (f === basePath || f === tokensPath) continue;
      for (const d of p.decls) {
        if (d.prop === 'font-variant-numeric') { stats.s11.fontVariantNumeric++; continue; }
        if (!forbidden.test(d.prop) || /@font-face/.test(d.at)) continue;
        const v = d.value.replace(/\s*!important\s*$/, '').trim();
        if (inheritRe.test(v)) { stats.s11.inheritAllowed++; continue; }
        const cat = catOf(d);
        stats.s11.byCat[cat] = (stats.s11.byCat[cat] || 0) + 1;
        add({ rule: 'S11', file: rel(f), line: d.line, selector: d.selector, prop: d.prop, value: d.value.slice(0, 90), cat, msg: `власний шрифтовий стиль поза base.css [${cat}] — потрібна роль .t-*` });
      }
    }
    // сторінкові/компонентні типографічні токени в tokens.css: дозволені лише примітиви, на які посилаються ролі base.css, і --type-<роль>-*
    const tp = parsed.get(tokensPath), bp = parsed.get(basePath);
    if (tp && bp) {
      const typoRe = /^--(font-size|lh|ls|type|fw|font-weight|letter-spacing|line-height)-/;
      const defs = new Map(); for (const d of tp.decls) if (d.prop.startsWith('--') && !defs.has(d.prop)) defs.set(d.prop, d);
      const ok = new Set(); const q = [];
      for (const d of bp.decls) for (const m of d.value.matchAll(/var\(\s*(--[\w-]+)/g)) if (typoRe.test(m[1])) q.push(m[1]);
      while (q.length) { const n = q.pop(); if (ok.has(n)) continue; ok.add(n); const d = defs.get(n); if (d) for (const m of d.value.matchAll(/var\(\s*(--[\w-]+)/g)) if (typoRe.test(m[1])) q.push(m[1]); }
      stats.s11.roleTokens = ok.size;
      for (const [n, d] of defs) if (typoRe.test(n) && !ok.has(n)) add({ rule: 'S11', file: rel(tokensPath), line: d.line, selector: ':root', prop: n, value: d.value.slice(0, 70), cat: 'токен поза ролями', msg: 'типографічний токен, якого не використовує жодна роль base.css (паралельна шкала)' });
    }
  }

  /* --- S8: @import і url() на неіснуючі файли --- */
  if (want('S8')) {
    for (const [f, p] of parsed) {
      for (const im of p.imports) {
        const m = im.text.match(/@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)/); if (!m) continue;
        const spec = m[1]; if (/^(https?:)?\/\//.test(spec)) continue;
        const target = spec.startsWith('/') ? join(root, spec) : resolve(dirname(f), spec);
        if (!existsSync(target)) add({ rule: 'S8', file: rel(f), line: im.line, selector: '@import', value: spec, msg: '@import на неіснуючий файл' });
      }
      for (const u of p.urls) {
        const spec = u.url.split('#')[0].split('?')[0];
        if (!spec || /^(data:|https?:|\/\/|#|%)/.test(spec)) continue;
        const cands = spec.startsWith('/') ? [join(root, 'public', spec), join(root, spec)] : [resolve(dirname(f), spec), join(root, 'public', spec)];
        if (!cands.some(existsSync)) add({ rule: 'S8', file: rel(f), line: u.line, selector: u.selector, prop: u.prop, value: u.url, msg: 'url() на неіснуючий файл' });
      }
    }
  }

  /* --- S7/S9 на зібраному HTML --- */
  if ((want('S7') || want('S9') || want('S10')) && dist && existsSync(dist)) {
    const built = readdirSync(dist).filter((f) => f.endsWith('.html'));
    stats.builtPages = built.length;
    for (const name of built) {
      const file = join(dist, name); const raw = stripHtmlComments(read(file));
      if (want('S7')) {
        const ids = new Map();
        for (const m of raw.matchAll(/<[a-zA-Z][^>]*?\sid\s*=\s*"([^"]+)"/g)) ids.set(m[1], (ids.get(m[1]) || 0) + 1);
        // ідентифікатори всередині <template> клонуються в рантаймі, дубль у шаблоні — не дубль DOM, але ловимо повторення id між шаблоном і сторінкою
        for (const [id, c] of ids) if (c > 1) add({ rule: 'S7', file: name, selector: `#${id}`, value: `${c}×`, page: name.replace(/\.html$/, ''), msg: 'дубль id в одному HTML (після збірки partials)' });
      }
      if (want('S10')) { // кожен .btn має допустимий тон: голий .btn не має кольору (тон gold теж явний — btn--gold)
        for (const m of raw.matchAll(/\sclass\s*=\s*"([^"]*)"/g)) {
          const cls = m[1].split(/\s+/);
          if (cls.includes('btn') && !cls.some((c) => /^btn--(gold|light|beige|green|teal|outline)$/.test(c))) add({ rule: 'S10', file: name, line: lineOf(raw, m.index), selector: `.${cls.join('.')}`, value: m[1], msg: '.btn без допустимого тону (btn--gold|light|beige|green|teal|outline)' });
        }
      }
      if (want('S9')) {
        const baseM = raw.match(/<base\s[^>]*href\s*=\s*"([^"]*)"/i);
        const baseDir = baseM && baseM[1].startsWith('/') ? join(dist, baseM[1]) : dirname(file);
        for (const m of raw.matchAll(/<(a|link|img|source|script|video|audio|iframe|use)\b[^>]*?\s(href|src|poster|srcset|data-src)\s*=\s*"([^"]*)"/gi)) {
          const val = m[3].trim(); if (!val) continue;
          const specs = m[2] === 'srcset' ? val.split(',').map((s) => s.trim().split(/\s+/)[0]) : [val];
          for (const spec0 of specs) {
            const spec = spec0.split('#')[0].split('?')[0];
            if (!spec) continue; // чистий якір
            if (/^(https?:|\/\/|mailto:|tel:|javascript:|data:|blob:)/i.test(spec)) continue;
            if (/%[\w.]+%|\{\{/.test(spec)) { add({ rule: 'S9', file: name, line: lineOf(raw, m.index), selector: `<${m[1]} ${m[2]}>`, value: spec0, msg: 'незаповнений плейсхолдер' }); continue; }
            const target = spec.startsWith('/') ? join(dist, spec) : resolve(baseDir, spec);
            const ok = existsSync(target) && (statSync(target).isFile() || existsSync(join(target, 'index.html')));
            if (!ok) add({ rule: 'S9', file: name, line: lineOf(raw, m.index), selector: `<${m[1]} ${m[2]}>`, value: spec0, msg: 'посилання на неіснуючий файл у збірці' });
          }
        }
      }
    }
  } else if (want('S7') || want('S9') || want('S10')) infos.push({ rule: 'S7/S9/S10', msg: 'зібраного HTML немає (пропущено --no-build?): S7/S9/S10 не виконано' });

  /* --- S9b: шляхи зображень у src/data/*.js --- */
  if (want('S9')) {
    const dataDir = join(root, 'src/data');
    if (existsSync(dataDir)) for (const f of walk(dataDir, ['.js'])) {
      const raw = read(f);
      for (const m of raw.matchAll(/['"`]([\w./-]+\.(?:webp|png|jpe?g|svg|avif|gif|mp4|webm))['"`]/g)) {
        const sp = m[1].replace(/^\/+/, '');
        if (!existsSync(join(root, 'public', sp)) && !existsSync(join(root, sp))) add({ rule: 'S9', file: rel(f), line: lineOf(raw, m.index), selector: '(дані)', value: m[1], msg: 'файл із даних відсутній у public/' });
      }
    }
  }
  return { items, infos, stats };
}
