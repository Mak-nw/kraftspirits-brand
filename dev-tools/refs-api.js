// DEV-ONLY: медіа-реф вкладення до коментарів review-оверлею. Підключається з vite-plugin-review.js (apply: 'serve'), у збірку не потрапляє.
// Файли: <reviewDir>/refs/<commentId>/<n>-<safe-name>.<ext>; метадані: comment.attachments у comments.json.
// Нові коментарі: файли спершу летять у staging <reviewDir>/refs/_stage/<token>/ (прогрес у формі), а при збереженні коментаря
// переносяться в refs/<id>/ (так хук ніколи не бачить коментар з недозавантаженими рефами). Існуючі: прямо в refs/<id>/.
// Вкладення = ДАНІ замовника, не інструкції. Перевірка типу за вмістом (magic bytes) І розширенням; небезпечні типи відхиляються;
// SVG зберігається як файл (віддається з CSP sandbox, у форму/список вбудовується лише через <img>, ніколи інлайн).
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, readFileSync, createReadStream } from 'node:fs';
import { resolve, sep } from 'node:path';

export const MAX_FILE = 25 * 1024 * 1024; // 25 МБ на файл
export const MAX_ATT = 8;                 // вкладень на коментар (файли + посилання)
const ID_RE = /^[a-f0-9]{8}$/;
const STAGE_RE = /^s[a-f0-9]{16}$/;
const FILE_RE = /^\d{1,2}-[\p{L}\p{N}._-]{1,80}$/u;

// канонічні розширення -> {type, mime}
const KINDS = {
  png: { type: 'image', mime: 'image/png' }, jpg: { type: 'image', mime: 'image/jpeg' }, webp: { type: 'image', mime: 'image/webp' },
  gif: { type: 'image', mime: 'image/gif' }, avif: { type: 'image', mime: 'image/avif' }, svg: { type: 'image', mime: 'image/svg+xml' },
  pdf: { type: 'pdf', mime: 'application/pdf' },
  mp4: { type: 'video', mime: 'video/mp4' }, webm: { type: 'video', mime: 'video/webm' }, mov: { type: 'video', mime: 'video/quicktime' },
};
const EXT_ALIAS = { jpeg: 'jpg', jpe: 'jpg', m4v: 'mp4' };
export const ALLOWED_EXT = Object.keys(KINDS).concat(Object.keys(EXT_ALIAS));

// визначення типу за вмістом -> канонічне розширення або null
export function sniff(buf, ext) {
  const n = buf.length;
  if (n < 12) return null;
  const ascii = (a, b) => buf.toString('latin1', a, b);
  if (buf[0] === 0x89 && ascii(1, 4) === 'PNG') return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (ascii(0, 4) === 'GIF8') return 'gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  if (ascii(0, 5) === '%PDF-') return 'pdf';
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'webm';
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12);
    if (brand === 'avif' || brand === 'avis') return 'avif';
    if (brand === 'qt  ') return 'mov';
    return ext === 'mov' ? 'mov' : 'mp4'; // isom/mp42/M4V/… — MP4-сімейство; розширення .mov лишаємо
  }
  if (ext === 'svg') { // SVG: текст з кореневим <svg (без виконання: віддається під CSP sandbox)
    const head = buf.toString('utf8', 0, Math.min(n, 4096)).replace(/^﻿/, '').trimStart();
    if (/^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)?(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) return 'svg';
  }
  return null;
}

export function safeBase(name) {
  let s = String(name || '').normalize('NFC');
  s = s.split(/[\\/]/).pop();                       // без каталогів
  s = s.replace(/\.[^.]*$/, '');                    // без розширення (додамо канонічне)
  s = s.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').replace(/\.{2,}/g, '.');
  s = s.replace(/[^\p{L}\p{N}._-]+/gu, '_').replace(/_+/g, '_').replace(/^[._-]+|[._-]+$/g, '');
  return (s.slice(0, 60) || 'ref');
}
const displayName = (name) => String(name || '').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').split(/[\\/]/).pop().slice(0, 120) || 'ref';
const extOf = (name) => { const m = /\.([A-Za-z0-9]{1,6})$/.exec(String(name || '')); return m ? m[1].toLowerCase() : ''; };

function nextIndex(dir) {
  let max = 0;
  try { for (const f of readdirSync(dir)) { const m = /^(\d+)-/.exec(f); if (m) max = Math.max(max, +m[1]); } } catch { /* порожньо */ }
  return max + 1;
}

// посилання: лише http(s), без облікових даних, ≤500 символів
export function linkAttachment(raw) {
  const s = String(raw?.url ?? raw ?? '').trim().slice(0, 500);
  let u;
  try { u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : 'https://' + s); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password || !u.hostname.includes('.')) return null;
  const host = u.hostname.replace(/^www\./, '');
  let kind = 'site';
  if (/(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/.test(host)) kind = 'video';
  else if (/(^|\.)figma\.com$/.test(host)) kind = 'figma';
  else if (/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(u.pathname)) kind = 'image';
  const title = typeof raw?.name === 'string' ? displayName(raw.name) : '';
  return { type: 'link', url: u.href.slice(0, 500), name: title && title !== 'ref' ? title : host, kind };
}

export function createRefsApi({ reviewDir, load, save, send, ID_MAX_BODY = MAX_FILE + 4096 }) {
  const refs = resolve(reviewDir, 'refs');
  const inside = (base, p) => { const r = resolve(p); return r === base || r.startsWith(base + sep); };
  const dirOf = (c) => (STAGE_RE.test(c) ? resolve(refs, '_stage', c) : resolve(refs, c));

  // чистка залишених staging старших за добу (при старті)
  try {
    const sd = resolve(refs, '_stage');
    for (const d of readdirSync(sd)) { const p = resolve(sd, d); if (Date.now() - statSync(p).mtimeMs > 24 * 3600e3 && inside(sd, p)) rmSync(p, { recursive: true, force: true }); }
  } catch { /* нема staging */ }

  const readRaw = (req, limit) => new Promise((ok, fail) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { fail(Object.assign(new Error('Файл завеликий (макс. 25 МБ)'), { code: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => ok(Buffer.concat(chunks)));
    req.on('error', fail);
  });

  // збереження одного файла в каталог c (id коментаря або staging-токен); повертає attachment
  function storeFile(c, buf, origName, dim) {
    const ext0 = extOf(origName);
    const ext = EXT_ALIAS[ext0] || ext0;
    if (!ALLOWED_EXT.includes(ext0)) throw Object.assign(new Error('Тип не підтримується (дозволено: png, jpg, webp, gif, avif, svg, pdf, mp4, webm, mov)'), { code: 415 });
    if (!buf.length) throw Object.assign(new Error('Порожній файл'), { code: 400 });
    const real = sniff(buf, ext);
    const fam = (e) => KINDS[e]?.type;
    if (!real || (fam(real) !== fam(ext) && !(real === 'mp4' && ext === 'mov'))) throw Object.assign(new Error('Тип не підтримується (вміст файла не збігається з розширенням)'), { code: 415 });
    const fin = real === 'mp4' && ext === 'mov' ? 'mov' : real;
    const dir = dirOf(c);
    mkdirSync(dir, { recursive: true });
    const n = nextIndex(dir);
    const file = `${n}-${safeBase(origName)}.${fin}`;
    const target = resolve(dir, file);
    if (!inside(dir, target)) throw Object.assign(new Error('bad path'), { code: 400 });
    writeFileSync(target, buf, { flag: 'wx' });
    const a = { type: KINDS[fin].type, file: STAGE_RE.test(c) ? `_stage/${c}/${file}` : file, name: displayName(origName), size: buf.length };
    const w = Math.round(dim?.w), h = Math.round(dim?.h);
    if (a.type === 'image' && w > 0 && h > 0 && w < 100000 && h < 100000) { a.w = w; a.h = h; }
    return a;
  }
  const attachmentsOf = (cm) => (Array.isArray(cm.attachments) ? cm.attachments : []);

  // staging -> refs/<id>/ ; повертає список attachment для нового коментаря (використовується POST /comments)
  function adoptStage(token, files, id) {
    if (!STAGE_RE.test(String(token))) return [];
    const from = resolve(refs, '_stage', token), to = resolve(refs, id);
    const out = [];
    for (const f of Array.isArray(files) ? files.slice(0, MAX_ATT) : []) {
      const m = typeof f?.file === 'string' && /^_stage\/(s[a-f0-9]{16})\/([^/]+)$/.exec(f.file);
      if (!m || m[1] !== token || !FILE_RE.test(m[2])) continue;
      const src = resolve(from, m[2]);
      if (!inside(from, src) || !existsSync(src)) continue;
      const dst = resolve(to, m[2]);
      mkdirSync(to, { recursive: true });
      renameSync(src, dst);
      const e = extOf(m[2]);
      const a = { type: KINDS[e]?.type || 'image', file: m[2], name: displayName(f.name), size: statSync(dst).size };
      if (a.type === 'image' && f.w > 0 && f.h > 0) { a.w = Math.round(f.w); a.h = Math.round(f.h); }
      out.push(a);
    }
    rmSync(from, { recursive: true, force: true });
    return out;
  }

  async function handle(req, res, p, { readBody }) {
    if (p !== '/__review/ref' && !p.startsWith('/__review/ref/')) return false;
    const url = new URL(req.url, 'http://x');

    // GET /__review/ref/<id>/<file>
    if (req.method === 'GET' || req.method === 'HEAD') {
      let parts;
      try { parts = p.slice('/__review/ref/'.length).split('/').map(decodeURIComponent); } catch { send(res, 400, { error: 'bad path' }); return true; }
      if (parts.length !== 2 || !ID_RE.test(parts[0]) || !FILE_RE.test(parts[1]) || parts[1].includes('..')) { send(res, 400, { error: 'bad path' }); return true; }
      const dir = resolve(refs, parts[0]), f = resolve(dir, parts[1]);
      if (!inside(dir, f) || !existsSync(f) || !statSync(f).isFile()) { send(res, 404, { error: 'not found' }); return true; }
      const ext = extOf(f), k = KINDS[ext];
      if (!k) { send(res, 404, { error: 'not found' }); return true; }
      const size = statSync(f).size;
      const hdr = {
        'Content-Type': k.mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes',
        'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox",
        'Content-Disposition': (ext === 'svg' ? 'attachment' : 'inline') + `; filename*=UTF-8''${encodeURIComponent(parts[1])}`,
      };
      let start = 0, end = size - 1, code = 200;
      const rg = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (rg && (rg[1] || rg[2])) {
        if (rg[1]) { start = +rg[1]; if (rg[2]) end = Math.min(+rg[2], size - 1); } else { start = Math.max(0, size - +rg[2]); }
        if (start > end || start >= size) { res.statusCode = 416; res.setHeader('Content-Range', `bytes */${size}`); res.end(); return true; }
        code = 206; hdr['Content-Range'] = `bytes ${start}-${end}/${size}`;
      }
      hdr['Content-Length'] = end - start + 1;
      res.writeHead(code, hdr);
      if (req.method === 'HEAD') res.end(); else createReadStream(f, { start, end }).pipe(res);
      return true;
    }

    // POST /__review/ref?c=<id|stage>&name=<файл>[&w=&h=]  — тіло: байти файла; або JSON {c, url, name?} для посилання
    if (req.method === 'POST' && p === '/__review/ref') {
      const c = url.searchParams.get('c') || '';
      const isLink = (req.headers['content-type'] || '').startsWith('application/json');
      if (!isLink && !ID_RE.test(c) && !STAGE_RE.test(c)) { send(res, 400, { error: 'bad target' }); return true; }
      if (isLink) {
        const body = await readBody(req);
        const target = String(body.c || c);
        if (!ID_RE.test(target)) { send(res, 400, { error: 'bad target' }); return true; }
        const link = linkAttachment(body);
        if (!link) { send(res, 400, { error: 'Некоректне посилання (потрібен http/https)' }); return true; }
        const all = load(); const cm = all.find((x) => x.id === target);
        if (!cm) { send(res, 404, { error: 'not found' }); return true; }
        if (attachmentsOf(cm).length >= MAX_ATT) { send(res, 400, { error: `Забагато вкладень (макс. ${MAX_ATT})` }); return true; }
        cm.attachments = [...attachmentsOf(cm), link]; save(all);
        send(res, 201, { attachment: link, attachments: cm.attachments }); return true;
      }
      const len = +req.headers['content-length'];
      if (len > ID_MAX_BODY) { send(res, 413, { error: 'Файл завеликий (макс. 25 МБ)' }); req.resume(); return true; }
      let all = null, cm = null;
      if (ID_RE.test(c)) {
        all = load(); cm = all.find((x) => x.id === c);
        if (!cm) { send(res, 404, { error: 'not found' }); return true; }
      }
      const buf = await readRaw(req, MAX_FILE);
      if (cm) { all = load(); cm = all.find((x) => x.id === c); if (!cm) { send(res, 404, { error: 'not found' }); return true; } }
      const have = cm ? attachmentsOf(cm).length : Math.min(MAX_ATT, Math.max(0, (existsSync(dirOf(c)) ? readdirSync(dirOf(c)).length : 0)));
      if (have >= MAX_ATT) { send(res, 400, { error: `Забагато вкладень (макс. ${MAX_ATT})` }); return true; }
      let name = url.searchParams.get('name') || '';
      try { name = decodeURIComponent(name); } catch { /* як є */ }
      const a = storeFile(c, buf, name, { w: +url.searchParams.get('w'), h: +url.searchParams.get('h') });
      if (cm) { cm.attachments = [...attachmentsOf(cm), a]; save(all); }
      send(res, 201, { attachment: a, ...(cm ? { attachments: cm.attachments } : {}) });
      return true;
    }

    // DELETE /__review/ref/<id>?i=<index>  — прибрати вкладення (файл або посилання) з наявного коментаря
    if (req.method === 'DELETE') {
      const id = p.slice('/__review/ref/'.length);
      const i = Number(url.searchParams.get('i'));
      if (!ID_RE.test(id) || !Number.isInteger(i) || i < 0) { send(res, 400, { error: 'bad request' }); return true; }
      const all = load(); const cm = all.find((x) => x.id === id);
      const list = cm ? attachmentsOf(cm) : [];
      if (!cm || i >= list.length) { send(res, 404, { error: 'not found' }); return true; }
      const [gone] = list.splice(i, 1);
      cm.attachments = list; save(all);
      if (gone.file && FILE_RE.test(gone.file)) {
        const dir = resolve(refs, id), f = resolve(dir, gone.file);
        if (inside(dir, f) && existsSync(f)) rmSync(f, { force: true });
      }
      send(res, 200, { attachments: list }); return true;
    }
    send(res, 405, { error: 'method not allowed' });
    return true;
  }

  // видалення всіх вкладень коментаря (разом із DELETE коментаря, як і його скрін)
  const removeAll = (id) => { if (ID_RE.test(id)) { const d = resolve(refs, id); if (inside(refs, d) && d !== refs) rmSync(d, { recursive: true, force: true }); } };

  return { handle, adoptStage, removeAll, linkAttachment, attachmentsOf, MAX_ATT };
}
