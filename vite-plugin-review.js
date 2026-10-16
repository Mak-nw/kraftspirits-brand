// DEV-ONLY review mode: injects an overlay in `vite dev` and serves a tiny comments API.
// Nothing is added to `vite build` (apply: 'serve').
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createEditsApi } from './dev-tools/edit-api.js';
import { createRefsApi } from './dev-tools/refs-api.js'; // медіа-реф вкладення до коментарів: review/refs/<id>/

const MAX_BODY = 2 * 1024 * 1024;
const ID_RE = /^[a-f0-9]{8}$/;
const TYPES = ['design', 'text', 'bug', 'question'];
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function reviewMode({ dir } = {}) {
  // REVIEW_DIR (ENV) — підміна каталогу даних для автотестів (щоб не чіпати справжні comments.json/edits.json)
  const reviewDir = resolve(process.env.REVIEW_DIR || dir);
  const editsApi = createEditsApi({ reviewDir, root: process.cwd() }); // API «Едіт» (E): edits.json
  const file = resolve(reviewDir, 'comments.json');
  const shots = resolve(reviewDir, 'shots');

  const load = () => {
    try { return JSON.parse(readFileSync(file, 'utf8')).comments || []; } catch { return []; }
  };
  const save = (comments) => {
    mkdirSync(shots, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify({ comments }, null, 2) + '\n');
    renameSync(tmp, file);
  };
  const send = (res, code, body, type = 'application/json') => {
    res.statusCode = code;
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'no-store');
    res.end(type === 'application/json' ? JSON.stringify(body) : body);
  };
  const readBody = (req) => new Promise((ok, fail) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { fail(Object.assign(new Error('too large'), { code: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { fail(Object.assign(new Error('bad json'), { code: 400 })); } });
    req.on('error', fail);
  });
  const refsApi = createRefsApi({ reviewDir, load, save, send });
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  const num = (v) => (Number.isFinite(v) ? Math.round(v * 1000) / 1000 : 0);
  const sanitize = (b) => ({
    url: str(b.url, 300),
    title: str(b.title, 200),
    viewport: { w: num(b.viewport?.w), h: num(b.viewport?.h) },
    scrollY: num(b.scrollY),
    rect: { x: num(b.rect?.x), y: num(b.rect?.y), w: num(b.rect?.w), h: num(b.rect?.h) },
    anchor: b.anchor && typeof b.anchor.selector === 'string'
      ? { selector: str(b.anchor.selector, 500), relX: num(b.anchor.relX), relY: num(b.anchor.relY), relW: num(b.anchor.relW), relH: num(b.anchor.relH) }
      : null,
    elementText: str(b.elementText, 120),
    computed: b.computed && typeof b.computed === 'object'
      ? Object.fromEntries(Object.entries(b.computed).slice(0, 12).map(([k, v]) => [str(k, 40), str(String(v), 120)]))
      : {},
    text: str(b.text, 4000),
    type: TYPES.includes(b.type) ? b.type : 'design',
  });

  return {
    name: 'site-brand-review-mode',
    apply: 'serve',
    transformIndexHtml: {
      order: 'post',
      handler: () => [{ tag: 'script', attrs: { type: 'module', src: '/__review/overlay.js' }, injectTo: 'body' }],
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://x');
        const p = url.pathname;
        if (!p.startsWith('/__review/')) return next();
        const host = (req.headers.host || '').replace(/:\d+$/, '');
        if (!LOCAL_HOSTS.has(host)) return send(res, 403, { error: 'forbidden host' });

        if (p === '/__review/overlay.js') { req.url = '/dev-tools/review/overlay.js'; return next(); }

        try {
          if (await editsApi(req, res, p, { send, readBody })) return;
          if (await refsApi.handle(req, res, p, { readBody })) return;
          if (p.startsWith('/__review/api/shot/')) {
            const id = p.slice('/__review/api/shot/'.length);
            const f = resolve(shots, `${id}.png`);
            if (!ID_RE.test(id) || !existsSync(f)) return send(res, 404, { error: 'not found' });
            return send(res, 200, readFileSync(f), 'image/png');
          }
          const m = p.match(/^\/__review\/api\/comments(?:\/([^/]+))?$/);
          if (!m) return send(res, 404, { error: 'not found' });
          const id = m[1];
          if (id !== undefined && !ID_RE.test(id)) return send(res, 400, { error: 'bad id' });

          if (req.method === 'GET' && !id) return send(res, 200, { comments: load() });

          if (req.method === 'POST' && !id) {
            const body = await readBody(req);
            const c = { id: randomBytes(4).toString('hex'), createdAt: new Date().toISOString(), ...sanitize(body), status: 'open', shot: null };
            const m2 = typeof body.shot === 'string' && body.shot.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
            if (m2) {
              mkdirSync(shots, { recursive: true });
              writeFileSync(resolve(shots, `${c.id}.png`), Buffer.from(m2[1], 'base64'));
              c.shot = `review/shots/${c.id}.png`;
            }
            // медіа-реф вкладення: файли зі staging (завантажені з форми) + посилання (type:'link'); старі коментарі без поля лишаються як є
            const att = refsApi.adoptStage(body.stage, body.stageFiles, c.id);
            for (const l of (Array.isArray(body.links) ? body.links : [])) { const a = refsApi.linkAttachment(l); if (a && att.length < refsApi.MAX_ATT) att.push(a); }
            c.attachments = att.slice(0, refsApi.MAX_ATT);
            const all = load(); all.push(c); save(all);
            return send(res, 201, c);
          }

          if (req.method === 'PATCH' && id) {
            const body = await readBody(req);
            const all = load(); const c = all.find((x) => x.id === id);
            if (!c) return send(res, 404, { error: 'not found' });
            if (typeof body.text === 'string') c.text = body.text.slice(0, 4000);
            if (TYPES.includes(body.type)) c.type = body.type;
            if (body.status === 'open' || body.status === 'done') c.status = body.status;
            save(all);
            return send(res, 200, c);
          }

          if (req.method === 'DELETE' && id) {
            const all = load();
            if (!all.some((x) => x.id === id)) return send(res, 404, { error: 'not found' });
            save(all.filter((x) => x.id !== id));
            const f = resolve(shots, `${id}.png`);
            if (existsSync(f)) unlinkSync(f);
            refsApi.removeAll(id);
            return send(res, 200, { ok: true });
          }
          return send(res, 405, { error: 'method not allowed' });
        } catch (e) {
          return send(res, [400, 404, 413, 415].includes(e.code) ? e.code : 500, { error: e.message });
        }
      });
    },
  };
}
