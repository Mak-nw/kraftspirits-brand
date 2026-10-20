#!/usr/bin/env node
// qa:i18n — повнота і коректність мовних версій (docs/i18n.md). Без браузера (Node + збірка у тимчасовий каталог поза репо).
//   І1 ключі словників uk і en збігаються (по файлах);  І2 кожен %t.ключ% у partials/сторінках є в uk;  І3 порожніх значень немає, у en немає українських літер (окрім ключів-винятків);
//   І4 оверлеї даних (products/occasions.en.js): усі slug/id, усі поля;  І5 збірка: у сторінках зі статусом done (src/i18n/config.js) немає кирилиці у видимому тексті й атрибутах (alt/aria-label/title/placeholder/content);
//   І6 /en/-сторінки: lang/data-locale, чернетки мають noindex, перемикач веде в uk і en;  І7 жодних `%t.`/`%lang.` у результаті;  І8 D-правила на en (D17: найдовший рядок заголовків) — перевіряє npm run qa:check-ds на /en/ сторінках.
//   node tools/qa/i18n.mjs [--out <каталог збірки>] [--no-build] [--json]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ROOT } from './lib.mjs';
import { DICT_FILES } from '../../src/i18n/dicts.js';
import { LOCALES, NO_LOCALE_PAGES, PAGE_STATUS, pageStatus } from '../../src/i18n/config.js';
import productsEn from '../../src/i18n/data/products.en.js';
import occasionsEn from '../../src/i18n/data/occasions.en.js';
import { PRODUCTS } from '../../src/data/products.js';
import { OCCASIONS } from '../../src/data/occasions.js';
import { COCKTAILS } from '../../src/data/cocktails.js';
import { FAQ } from '../../src/data/faq.js';
import { LEGAL } from '../../src/data/legal.js';
import { contacts } from '../../src/data/contacts.js';
import cocktailsEn from '../../src/i18n/data/cocktails.en.js';
import faqEn from '../../src/i18n/data/faq.en.js';
import legalEn from '../../src/i18n/data/legal.en.js';
import contactsEn from '../../src/i18n/data/contacts.en.js';
import { cyrPaths, deepOverlay } from '../../src/i18n/overlay.js';
import { loadLpPages } from '../../tools/lp-pages.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const errs = [];
const fail = (rule, msg) => errs.push(`${rule} ${msg}`);
const CYR = /[А-Яа-яІіЇїЄєҐґ]/;

// І1
for (const f of Object.keys(DICT_FILES.uk)) {
  const u = Object.keys(DICT_FILES.uk[f]), e = Object.keys(DICT_FILES.en[f] || {});
  for (const k of u) if (!e.includes(k)) fail('І1', `en/${f}.js: немає ключа «${k}»`);
  for (const k of e) if (!u.includes(k)) fail('І1', `en/${f}.js: зайвий ключ «${k}» (немає в uk)`);
}
// І3
for (const [k, v] of Object.entries(Object.assign({}, ...Object.values(DICT_FILES.en)))) {
  if (!String(v).trim()) fail('І3', `en: порожнє значення «${k}»`);
  else if (CYR.test(v)) fail('І3', `en: українські літери в «${k}»: ${v.slice(0, 50)}`);
}
// І2: ключі в розмітці
const files = [];
const walk = (d) => { for (const f of readdirSync(d, { withFileTypes: true })) { const p = join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.html')) files.push(p); } };
walk(resolve(ROOT, 'partials'));
for (const f of readdirSync(ROOT).filter((x) => x.endsWith('.html'))) files.push(resolve(ROOT, f));
const allKeys = new Set(Object.keys(Object.assign({}, ...Object.values(DICT_FILES.uk))));
const used = new Set();
for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/%t\.([\w.-]+)%/g)) { used.add(m[1]); if (!allKeys.has(m[1])) fail('І2', `${f.replace(ROOT, '')}: ключа «${m[1]}» немає в src/i18n/uk`); }
const unused = [...allKeys].filter((k) => !used.has(k) && !k.startsWith('js.'));
// І4
for (const p of PRODUCTS) for (const fld of ['name', 'nameLines', 'kind', 'notes', 'badge', 'description']) {
  const v = productsEn[p.slug]?.[fld];
  if (v === undefined) { fail('І4', `products.en.js: ${p.slug}.${fld} відсутнє`); continue; }
  if ((p[fld] === null) !== (v === null)) fail('І4', `products.en.js: ${p.slug}.${fld} null не збігається з uk`);
  if (JSON.stringify(v ?? '').match(CYR)) fail('І4', `products.en.js: ${p.slug}.${fld} містить кирилицю`);
}
for (const o of OCCASIONS) for (const fld of ['title', 'label']) if (!occasionsEn[o.id]?.[fld] || CYR.test(occasionsEn[o.id][fld])) fail('І4', `occasions.en.js: ${o.id}.${fld}`);

// І4б: оверлеї даних (src/i18n/data/*.en.js) — ключі існують у базових даних (опечатка не мовчить), масиви не довші за базові; для сторінок done у злитих даних немає кирилиці
const extra = (base, over, path, out = []) => {
  if (Array.isArray(over)) { if (!Array.isArray(base) || over.length > base.length) out.push(`${path}: масив довший за базовий`); else over.forEach((o, i) => o != null && extra(base[i], o, `${path}[${i}]`, out)); }
  else if (over && typeof over === 'object') { if (!base || typeof base !== 'object') out.push(`${path}: немає в базових даних`); else for (const [k, v] of Object.entries(over)) { if (k === '$drop') continue; if (!(k in base)) out.push(`${path}.${k}: немає в базових даних`); else extra(base[k], v, `${path}.${k}`, out); } }
  return out;
};
const byKey = (list, key = 'slug') => Object.fromEntries(list.map((x) => [x[key], x]));
const overlaySets = [
  ['cocktails', byKey(COCKTAILS), cocktailsEn, ['cocktails']],
  ['faq', byKey(FAQ), faqEn, ['faq']],
  ['legal', byKey(LEGAL), legalEn, LEGAL.map((d) => d.slug)],
  ['contacts', { c: contacts }, { c: contactsEn }, ['contacts', 'feedback']],
];
for (const [name, base, over, pages] of overlaySets) {
  for (const e of extra(base, over, name)) fail('І4', `${name}.en.js: ${e}`);
  if (pages.some((pg) => pageStatus('en', pg) === 'done')) {
    for (const [k, b] of Object.entries(base)) for (const c of cyrPaths(deepOverlay(b, over[k]), k)) fail('І4', `${name}.en.js: українське лишилось у ${c}`);
  }
}
const lpPagesBase = await loadLpPages(ROOT);
for (const [slug, base] of Object.entries(lpPagesBase)) {
  let over; try { over = (await import(`../../src/i18n/data/${slug}.en.js`)).default; } catch { over = null; }
  if (over) for (const e of extra(base, over, slug)) fail('І4', `${slug}.en.js: ${e}`);
  if (pageStatus('en', slug) === 'done') {
    if (!over) { fail('І4', `${slug}.en.js: немає файлу, а сторінка done`); continue; }
    for (const c of cyrPaths(deepOverlay(base, over), slug)) fail('І4', `${slug}.en.js: українське лишилось у ${c}`);
  }
}

// І5–І7: збірка
let dist = opt('out'), tmp;
if (!flag('no-build') && !dist) {
  tmp = mkdtempSync(join(tmpdir(), 'qa-i18n-'));
  dist = tmp;
  try { execFileSync('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir'], { cwd: ROOT, env: { ...process.env, BASE_PATH: '/kraftspirits-brand/' }, stdio: 'pipe' }); } catch (e) { fail('І5', `збірка не пройшла: ${String(e.stderr || e.message).split('\n').slice(0, 3).join(' ')}`); dist = null; }
}
const rows = [];
if (dist && existsSync(dist)) {
  const visible = (html) => html
    .replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<a\b[^>]*\blang="uk"[^>]*>[\s\S]*?<\/a>/g, ''); // назва мови «Українська» у списку перемикача — рідна, не перекладається
  const names = readdirSync(resolve(dist, 'en')).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5)).sort();
  for (const n of names) {
    const html = readFileSync(resolve(dist, 'en', `${n}.html`), 'utf8');
    const st = pageStatus('en', n);
    const vis = visible(html);
    const cyr = [...vis.matchAll(/[^<>]{0,25}[А-Яа-яІіЇїЄєҐґ][^<>]{0,25}/g)].map((m) => m[0].trim());
    const cyrBody = vis.replace(/<(header|footer)[\s\S]*?<\/\1>/g, '').replace(/<div[^>]*data-age-gate[\s\S]*?<\/section>\s*<\/div>\s*<p class="age-card__nojs[^<]*<\/p>\s*<\/div>\s*<\/div>/g, '');
    const cyrBodyN = (cyrBody.match(/[А-Яа-яІіЇїЄєҐґ]+/g) || []).length;
    rows.push({ page: n, status: st, cyrWordsTotal: (vis.match(/[А-Яа-яІіЇїЄєҐґ]+/g) || []).length, cyrWordsBody: cyrBodyN });
    if (st === 'done' && cyr.length) fail('І5', `en/${n}.html (done): українське у видимому тексті/атрибутах: ${cyr.slice(0, 5).join(' | ')}`);
    const hasLang = /<html lang="(en|uk)" data-locale="en">/.test(html);
    if (!hasLang) fail('І6', `en/${n}.html: немає <html lang data-locale="en">`);
    if (st === 'done' && !html.includes('<html lang="en"')) fail('І6', `en/${n}.html (done): lang має бути en`);
    if (st === 'draft' && !html.includes('name="robots" content="noindex"')) fail('І6', `en/${n}.html (draft): немає noindex`);
    if (!/data-lang="uk"/.test(html) || !/data-lang="en"/.test(html)) fail('І6', `en/${n}.html: перемикач мови не має обох мов`);
    if (/%t\.|%lang\./.test(html)) fail('І7', `en/${n}.html: лишились незамінені %t.*/%lang.*`);
  }
  for (const f of readdirSync(dist).filter((x) => x.endsWith('.html'))) {
    const html = readFileSync(resolve(dist, f), 'utf8');
    if (/%t\.|%lang\./.test(html)) fail('І7', `${f}: лишились незамінені %t.*/%lang.*`);
    if (!NO_LOCALE_PAGES.includes(f.slice(0, -5)) && !existsSync(resolve(dist, 'en', f))) fail('І6', `немає en/${f}`);
  }
}
if (tmp) rmSync(tmp, { recursive: true, force: true });

console.log('qa:i18n — статус сторінок en (done = повний переклад; draft = шапка/футер/ворота англійською, тіло українське)');
for (const r of rows) console.log(`  ${r.page.padEnd(14)} ${r.status.padEnd(6)} укр. слів у тілі: ${String(r.cyrWordsBody).padStart(5)}`);
console.log(`  ключів uk/en: ${allKeys.size}; невикористаних у розмітці (крім js.*): ${unused.length}${unused.length ? ` — ${unused.slice(0, 5).join(', ')}…` : ''}`);
if (flag('json')) console.log(JSON.stringify({ errs, rows }, null, 1));
if (errs.length) { console.log(`FAIL (${errs.length})`); errs.forEach((e) => console.log('  ' + e)); process.exit(1); }
console.log('OK: 0 зауважень');
