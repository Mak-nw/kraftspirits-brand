// DEV-ONLY: API правок «Едіт» (E) для review-оверлею. Підключається з vite-plugin-review.js (apply: 'serve'), у збірку не потрапляє.
// Файл даних: <reviewDir>/edits.json (недоторканний замовницький, як comments.json); скриншоти: <reviewDir>/shots/e-<id>.png.
// Записи: draft (чернетка, лише в браузері замовника + файл) -> open (надіслано, бачить хук) -> done (виконано агентом, rv.py edits done).
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { randomBytes } from 'node:crypto';

const ID_RE = /^[a-f0-9]{8}$/;
const TYPES = ['spacing', 'size', 'text', 'move', 'role', 'span', 'align', 'color', 'opacity', 'hide'];
const STATUSES = ['draft', 'open', 'done'];

// чистка довільного JSON з клієнта: глибина ≤5, рядки ≤2000 (text — до 8000), масиви ≤40, ключі ≤30
function clean(v, depth = 0, limit = 2000) {
  if (typeof v === 'string') return v.slice(0, limit);
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 1000) / 1000 : 0;
  if (typeof v === 'boolean' || v === null) return v;
  if (depth >= 5) return null;
  if (Array.isArray(v)) return v.slice(0, 40).map((x) => clean(x, depth + 1, limit));
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).slice(0, 30).map(([k, x]) => [String(k).slice(0, 40), clean(x, depth + 1, k === 'text' || k === 'value' ? 8000 : limit)]));
  }
  return null;
}
// Лише токени системи: color — колір з --color-* (опційно color-mix з прозорістю); opacity — --opacity-* або 1. Повертає текст помилки або ''.
const COLOR_CSS = /^(var\(--color-[\w-]+\)|color-mix\(in srgb, var\(--color-[\w-]+\) [\d.]+%, transparent\))$/;
export function tokenError(b) {
  const to = b && b.to;
  if (b?.type === 'color') {
    if (!to || typeof to !== 'object') return 'color: потрібне «to»';
    if (typeof to.token !== 'string' || !/^--color-[\w-]+$/.test(to.token)) return 'color: дозволені лише токени кольору системи (--color-*)';
    if (to.css != null && !COLOR_CSS.test(String(to.css))) return 'color: значення не з токенів (потрібно var(--color-*) або color-mix з токена)';
    if (to.alphaToken != null && !/^--opacity-[\w-]+$/.test(String(to.alphaToken))) return 'color: alphaToken має бути --opacity-*';
  }
  if (b?.type === 'opacity') {
    if (!to || typeof to !== 'object') return 'opacity: потрібне «to»';
    const ok = (typeof to.token === 'string' && /^--opacity-[\w-]+$/.test(to.token)) || to.value === 1;
    if (!ok) return 'opacity: дозволені лише токени --opacity-* або 1 (без прозорості)';
    if (to.css != null && !/^(var\(--opacity-[\w-]+\)|1)$/.test(String(to.css))) return 'opacity: значення не з токенів';
  }
  return '';
}
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

export function createEditsApi({ reviewDir, root, sourceDirs = ['src/data', 'partials', '.'] }) {
  const file = resolve(reviewDir, 'edits.json');
  const shots = resolve(reviewDir, 'shots');
  const configFile = resolve(reviewDir, 'edit.config.json');

  const load = () => { try { return JSON.parse(readFileSync(file, 'utf8')).edits || []; } catch { return []; } };
  const save = (edits) => {
    mkdirSync(shots, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify({ edits }, null, 2) + '\n');
    renameSync(tmp, file);
  };

  // --- пошук джерела тексту: src/data/*.js, partials/**, корінь *.html; не знайшли -> "html" ---
  function walk(dir, recursive, out) {
    let names = [];
    try { names = readdirSync(dir); } catch { return; }
    for (const n of names) {
      if (n === 'node_modules' || n === 'dist' || n.startsWith('.')) continue;
      const p = join(dir, n);
      let s; try { s = statSync(p); } catch { continue; }
      if (s.isDirectory()) { if (recursive) walk(p, true, out); } else if (/\.(js|mjs|html|json|css)$/.test(n)) out.push(p);
    }
  }
  const escHtml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function findSource(text) {
    const t = (text || '').replace(/\s+/g, ' ').trim();
    if (t.length < 2) return { source: 'html' };
    const variants = [...new Set([t, escHtml(t), t.replace(/ /g, '&nbsp;'), t.replace(/'/g, '’')])];
    const files = [];
    for (const d of sourceDirs) walk(resolve(root, d), d !== '.', files);
    for (const f of files) {
      let c; try { c = readFileSync(f, 'utf8'); } catch { continue; }
      for (const v of variants) {
        const i = c.indexOf(v);
        if (i >= 0) return { source: relative(root, f), sourceLine: c.slice(0, i).split('\n').length };
      }
      const flat = c.replace(/\s+/g, ' ');
      if (variants.some((v) => flat.includes(v))) return { source: relative(root, f) };
    }
    return { source: 'html' };
  }

  // --- джерело для color/opacity: перший `class="…cls…"` у partials/*.html або кореневих *.html (source:line) + правило `.cls {` у src/styles (sourceCss) ---
  function findClassSource(selector) {
    const last = String(selector || '').split(/\s*>\s*|\s+/).pop() || '';
    const cls = [...last.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((x) => x[1]).filter((c) => !/^(is-|has-|js-)/.test(c));
    const id = (last.match(/#([A-Za-z_][\w-]*)/) || [])[1];
    if (!cls.length && !id) return {};
    const out = {};
    const html = []; walk(resolve(root, 'partials'), true, html); walk(root, false, html);
    const css = []; walk(resolve(root, 'src/styles'), true, css);
    const hasCls = (line, c) => new RegExp(`class\\s*=\\s*["'][^"']*(?:^|[\\s"'])${c.replace(/[-]/g, '\\-')}(?=[\\s"'])`).test(line) || (id && line.includes(`id="${id}"`));
    const lineHas = (l, need) => (need.length && need.every((k) => hasCls(l, k))) || (id && l.includes(`id="${id}"`));
    for (const need of [cls, cls.slice(-1)]) { // спершу рядок з УСІМА класами, потім з останнім (найспецифічнішим)
      if (out.source || (!need.length && !id)) continue;
      for (const f of html.filter((x) => /\.html$/.test(x))) {
        let c; try { c = readFileSync(f, 'utf8'); } catch { continue; }
        const i = c.split('\n').findIndex((l) => lineHas(l, need));
        if (i >= 0) { out.source = relative(root, f); out.sourceLine = i + 1; break; }
      }
    }
    for (const k of [...cls].reverse()) {
      if (out.sourceCss) break;
      const re = new RegExp(`(^|[\\s,>+~])\\.${k}(?![\\w-])[^{]*\\{`);
      for (const f of css.filter((x) => /\.css$/.test(x))) {
        let c; try { c = readFileSync(f, 'utf8'); } catch { continue; }
        const i = c.split('\n').findIndex((l) => re.test(l));
        if (i >= 0) { out.sourceCss = `${relative(root, f)}:${i + 1}`; break; }
      }
    }
    return out;
  }

  const sanitize = (b) => {
    const out = {
      url: str(b.url, 300),
      title: str(b.title, 200),
      viewport: { w: clean(b.viewport?.w) || 0, h: clean(b.viewport?.h) || 0 },
      uPx: typeof b.uPx === 'number' ? Math.round(b.uPx * 1e4) / 1e4 : 0,
      selector: str(b.selector, 500),
      parentSelector: str(b.parentSelector, 500),
      elementText: str(b.elementText, 120),
      type: TYPES.includes(b.type) ? b.type : 'spacing',
      prop: str(b.prop, 60),
      target: str(b.target, 20), // color: text | background | border | icon
      group: str(b.group, 60),
      from: clean(b.from ?? null),
      to: clean(b.to ?? null),
      desc: str(b.desc, 600),
      scope: str(b.scope, 200),
      scopeCount: Number.isFinite(b.scopeCount) ? b.scopeCount : 0,
      note: str(b.note, 2000),
      restore: clean(b.restore ?? null),
    };
    if (out.type === 'move') { out.tracks = clean(b.tracks ?? null); out.source = str(b.source, 600); } // tracks: before/after (токени і u), source: підказка виконавцю
    return out;
  };

  // повертає true, якщо запит оброблено; p — pathname після /__review/api/
  return async function handle(req, res, p, { send, readBody }) {
    if (p === '/__review/api/edit-config') {
      let cfg = {};
      try { cfg = JSON.parse(readFileSync(configFile, 'utf8')); } catch { /* типові значення в клієнті */ }
      send(res, 200, cfg); return true;
    }
    let m = p.match(/^\/__review\/api\/edit-shot\/([^/]+)$/);
    if (m) {
      const f = resolve(shots, `e-${m[1]}.png`);
      if (!ID_RE.test(m[1]) || !existsSync(f)) send(res, 404, { error: 'not found' });
      else send(res, 200, readFileSync(f), 'image/png');
      return true;
    }
    if (p === '/__review/api/edits/send' && req.method === 'POST') {
      const body = await readBody(req);
      const all = load(); const now = new Date().toISOString(); const changed = [];
      for (const e of all) if (e.status === 'draft' && e.url === str(body.url, 300)) { e.status = 'open'; e.sentAt = now; e.updatedAt = now; changed.push(e.id); }
      save(all); send(res, 200, { sent: changed }); return true;
    }
    if (p === '/__review/api/edits/clear-drafts' && req.method === 'POST') { // видаляє ЛИШЕ чернетки (draft) сторінки; open/done не чіпає
      const body = await readBody(req); const u = str(body.url, 300);
      const all = load(); const gone = all.filter((e) => e.status === 'draft' && (!u || e.url === u));
      save(all.filter((e) => !gone.includes(e)));
      for (const e of gone) { const f = resolve(shots, `e-${e.id}.png`); if (existsSync(f)) unlinkSync(f); }
      send(res, 200, { removed: gone.map((e) => e.id) }); return true;
    }
    m = p.match(/^\/__review\/api\/edits(?:\/([^/]+)(\/shot)?)?$/);
    if (!m) return false;
    const id = m[1], isShot = !!m[2];
    if (id !== undefined && !ID_RE.test(id)) { send(res, 400, { error: 'bad id' }); return true; }

    if (req.method === 'GET' && !id) { send(res, 200, { edits: load() }); return true; }

    if (req.method === 'POST' && !id) {
      const body = await readBody(req);
      const now = new Date().toISOString();
      const terr = tokenError(body); if (terr) { send(res, 400, { error: terr }); return true; }
      if (typeof body.id === 'string' && ID_RE.test(body.id)) { // upsert за id клієнта (ідемпотентно; keepalive-запити при перезавантаженні)
        const all0 = load(); const ex = all0.find((x) => x.id === body.id);
        if (ex) {
          const s2 = sanitize({ ...ex, ...body });
          for (const k of ['to', 'desc', 'scope', 'scopeCount', 'note', 'restore', 'viewport', 'uPx', 'parentSelector', 'selector', 'elementText', 'tracks', 'source']) if (k in s2 && !(k === 'source' && ex.type !== 'move')) ex[k] = s2[k];
          ex.updatedAt = now; save(all0); send(res, 200, ex); return true;
        }
      }
      const rec = { id: (typeof body.id === 'string' && ID_RE.test(body.id)) ? body.id : randomBytes(4).toString('hex'), createdAt: now, updatedAt: now, ...sanitize(body), status: 'draft', shot: null };
      if (rec.type === 'text') Object.assign(rec, findSource(rec.from?.text));
      else if (rec.type === 'color' || rec.type === 'opacity') Object.assign(rec, findClassSource(rec.selector));
      const all = load(); all.push(rec); save(all);
      send(res, 201, rec); return true;
    }

    if (req.method === 'POST' && id && isShot) {
      const body = await readBody(req);
      const all = load(); const e = all.find((x) => x.id === id);
      if (!e) { send(res, 404, { error: 'not found' }); return true; }
      const mm = typeof body.shot === 'string' && body.shot.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
      if (!mm) { send(res, 400, { error: 'bad shot' }); return true; }
      mkdirSync(shots, { recursive: true });
      writeFileSync(resolve(shots, `e-${id}.png`), Buffer.from(mm[1], 'base64'));
      e.shot = `review/shots/e-${id}.png`; save(all);
      send(res, 200, e); return true;
    }

    if (req.method === 'PATCH' && id && !isShot) {
      const body = await readBody(req);
      const all = load(); const e = all.find((x) => x.id === id);
      if (!e) { send(res, 404, { error: 'not found' }); return true; }
      const terr = 'to' in body ? tokenError({ type: e.type, to: body.to }) : ''; if (terr) { send(res, 400, { error: terr }); return true; }
      const s = sanitize({ ...e, ...body });
      for (const k of ['to', 'desc', 'scope', 'scopeCount', 'note', 'restore', 'viewport', 'uPx']) if (k in body) e[k] = s[k];
      if (STATUSES.includes(body.status)) e.status = body.status;
      e.updatedAt = new Date().toISOString();
      save(all); send(res, 200, e); return true;
    }

    if (req.method === 'DELETE' && id && !isShot) {
      const all = load();
      if (!all.some((x) => x.id === id)) { send(res, 404, { error: 'not found' }); return true; }
      save(all.filter((x) => x.id !== id));
      const f = resolve(shots, `e-${id}.png`);
      if (existsSync(f)) unlinkSync(f);
      send(res, 200, { ok: true }); return true;
    }
    send(res, 405, { error: 'method not allowed' }); return true;
  };
}
