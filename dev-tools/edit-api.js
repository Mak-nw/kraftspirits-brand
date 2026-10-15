// DEV-ONLY: API правок «Едіт» (E) для review-оверлею. Підключається з vite-plugin-review.js (apply: 'serve'), у збірку не потрапляє.
// Файл даних: <reviewDir>/edits.json (недоторканний замовницький, як comments.json); скриншоти: <reviewDir>/shots/e-<id>.png.
// Записи: draft (чернетка, лише в браузері замовника + файл) -> open (надіслано, бачить хук) -> done (виконано агентом, rv.py edits done).
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { randomBytes } from 'node:crypto';

const ID_RE = /^[a-f0-9]{8}$/;
const TYPES = ['spacing', 'size', 'text', 'move', 'role', 'span', 'align', 'color', 'hide'];
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
      if (s.isDirectory()) { if (recursive) walk(p, true, out); } else if (/\.(js|mjs|html|json)$/.test(n)) out.push(p);
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
      group: str(b.group, 60),
      from: clean(b.from ?? null),
      to: clean(b.to ?? null),
      desc: str(b.desc, 600),
      scope: str(b.scope, 200),
      scopeCount: Number.isFinite(b.scopeCount) ? b.scopeCount : 0,
      note: str(b.note, 2000),
      restore: clean(b.restore ?? null),
    };
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
    m = p.match(/^\/__review\/api\/edits(?:\/([^/]+)(\/shot)?)?$/);
    if (!m) return false;
    const id = m[1], isShot = !!m[2];
    if (id !== undefined && !ID_RE.test(id)) { send(res, 400, { error: 'bad id' }); return true; }

    if (req.method === 'GET' && !id) { send(res, 200, { edits: load() }); return true; }

    if (req.method === 'POST' && !id) {
      const body = await readBody(req);
      const now = new Date().toISOString();
      const rec = { id: randomBytes(4).toString('hex'), createdAt: now, updatedAt: now, ...sanitize(body), status: 'draft', shot: null };
      if (rec.type === 'text') Object.assign(rec, findSource(rec.from?.text));
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
