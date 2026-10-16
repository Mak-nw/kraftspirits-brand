#!/usr/bin/env node
// Контрактна перевірка шаблону посадкової сторінки (lp): «поля адмінки = поля фронту» без браузера.  npm run qa:lp
//   1. JS ≡ JSON: validatePage (збірка) і docs/page-template.schema.json (ajv) дають ОДНАКОВИЙ вердикт на корпусі «справжні сторінки + мутації кожного поля»
//      (ліміти max / max+1, порожні, типи, enum, посилання, довге слово, кількість пунктів, зайві поля) і на перехресних правилах; правила, яких JSON Schema
//      не виражає (x-rules: сума span, унікальність id/key, якорі), — JS відхиляє, JSON приймає (очікувана асиметрія, перелічена в звіті).
//   2. Файл docs/page-template.schema.json = свіжа генерація з lp-schema.js (нічого не забули перегенерувати).
//   3. Маркерний прогін: у кожне поле кожного типу секції кладеться унікальний маркер, секція рендериться тим самим рушієм partials (tools/html-partials.mjs),
//      і кожен маркер має бути в HTML — поле, що є в схемі (адмінці), але не показується на сторінці, = помилка.
//   4. Справжні сторінки (src/data/*.js, автовиявлення tools/lp-pages.mjs) проходять і JS, і JSON, і render.
// Код виходу: 0 — усе гаразд, 1 — розбіжності. Без аргументів. Залежність: ajv (devDependency).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { SCHEMA, RULES, PAGE_RULES, FILE_RULES, COLS_BY_TYPE, PAD_STEPS, PRICE_MAX, CARD_TEXT_MAX, CARD_LIST_MAX, MAX_WORD, COUNT_MAX, validatePage, lpView, divisors } from '../../src/data/lp-schema.js';
import { jsonSchemaText, buildJsonSchema } from '../lp-schema-json.mjs';
import { loadLpPages } from '../lp-pages.mjs';
import { checkFiles, themeInfo } from '../lp-files.mjs';
import { contacts, contactsView } from '../../src/data/contacts.js';
import { createRenderer } from '../html-partials.mjs';
import { ROOT } from './lib.mjs';

const DEL = Symbol('delete');
// текст рівно max знаків зі словами по 20 (слово ≤ MAX_WORD)
const maxText = (max, word = 20) => { const w = 'аб'.repeat(10).slice(0, Math.min(20, word)); let t = ''; while (t.length < max) t += (t ? ' ' : '') + w; t = t.slice(0, max); return t.endsWith(' ') ? `${t.slice(0, -1)}б` : t; };
const clone = (o) => structuredClone(o);
let bad = 0; let total = 0;
const rows = [];
const VERBOSE = !!process.env.LP_CONTRACT_VERBOSE; // LP_CONTRACT_VERBOSE=1 — друкувати кожну перевірку
const note = (ok, label, detail = '') => { total++; if (VERBOSE) console.log(`${ok ? '  ok     ' : '  ПРОВАЛ '}${label}`); if (!ok) { bad++; rows.push(`  ПРОВАЛ  ${label} ${detail}`); } };

/* ------------------------------------------------------------------ ajv */
const ajv = new Ajv2020({ strict: true, strictTuples: false, allowUnionTypes: true });
ajv.addKeyword('x-rules');
const jsonSchema = buildJsonSchema();
const validateJson = ajv.compile(jsonSchema);
const jsOk = (p) => { try { validatePage(clone(p)); return true; } catch (e) { return e.message; } };
const jsonOk = (p) => validateJson(clone(p));

note(readFileSync(resolve(ROOT, 'docs/page-template.schema.json'), 'utf8') === jsonSchemaText(), 'docs/page-template.schema.json = генерація з lp-schema.js', '(запусти node tools/lp-schema-json.mjs)');

/* ------------------------------------------------------------------ генератор повних даних (кожне поле заповнене) */
let n = 0;
const mk = () => `Q${(++n).toString(36)}`;
const markers = []; // { marker, path }
function fillValue(def, path, o = {}) {
  switch (def.type) {
    case 'text': { const m = mk(); markers.push({ marker: m, path }); return m; }
    case 'url': { const m = `${def.startsWith || '/'}q${(++n).toString(36)}`; markers.push({ marker: m, path }); return m; }
    case 'id': { const m = `i${(++n).toString(36)}`; markers.push({ marker: m, path }); return m; }
    case 'partial': return def.kind === 'scene' ? 'scene-barrels' : def.kind === 'engraving' ? 'engraving-barrels-head' : 'wall-barrels-one';
    case 'icon': return 'pin';
    case 'enum': return def.sample ?? def.values[0];
    case 'number': return def.min !== undefined ? Math.max(def.min, 7) : 7;
    case 'bool': return true;
    case 'list': {
      const count = def.divides ? divisors(def)[0] : Math.max(def.min, 1);
      return Array.from({ length: o.count ?? count }, (_, i) => fillValue(def.of, `${path}[${i}]`));
    }
    case 'object': return Object.fromEntries(Object.entries(def.fields).map(([k, d]) => [k, fillValue(d, `${path}.${k}`)]));
    default: return undefined;
  }
}
const fullSection = (type) => { const s = fillValue({ type: 'object', fields: SCHEMA.sections[type] }, type); s.type = type; s.id = `s-${type}`; if ('stack' in s) s.stack = false; if ('pad' in s) { if ('join' in s) s.join = false; if ('loose' in s) s.loose = false; } return s; }; // pad несумісний з join/loose/stack (правило pad-exclusive) — у повному прикладі вони вимкнені // stack: true дозволено лише після card/place — перевіряється окремо нижче (блок «стек»)

/** повні варіанти секцій: взаємовиключні поля (XOR) розкладено по варіантах, щоб покрити обидві гілки */
function variantsOf(type) {
  const s = fullSection(type);
  const out = [];
  if (type === 'steps') {
    const a = clone(s); delete a.img; delete a.alt; out.push(['scene', a]);
    const b = clone(s); delete b.scene; out.push(['img', b]);
  } else if (type === 'tiles') {
    const a = clone(s); delete a.shape; delete a.leadCols; delete a.captionOver; a.items.forEach((t) => { delete t.img; delete t.alt; delete t.tone; delete t.imgPos; delete t.zoom; }); out.push(['engraving+icon', a]);
    const b = clone(s); delete b.shape; delete b.leadCols; delete b.captionOver; b.items.forEach((t) => { delete t.engraving; delete t.icon; delete t.tone; delete t.imgPos; delete t.zoom; }); out.push(['img+alt', b]);
    const c = clone(s); c.items.forEach((t) => { delete t.engraving; delete t.icon; t.origin = `${t.origin.slice(0, 20)}\nаб`; }); out.push(['circle', c]);
  } else if (type === 'card') {
    const a = clone(s); delete a.list; out.push(['text', a]);
    const b = clone(s); delete b.text; out.push(['list', b]);
  } else if (type === 'compare') {
    const a = clone(s); a.groups.forEach((g, i) => { g.span = i === 0 ? 3 : 7; g.approx = false; });
    a.groups[0].wall = 'wall-barrels-one'; delete a.groups[0].list; // група 1 — wall
    a.groups[1].wall = undefined; delete a.groups[1].wall; // група 2 — list
    out.push(['wall+list', a]);
    const b = clone(a); b.groups[1].wall = 'wall-barrels-four-minus-one'; delete b.groups[1].list; out.push(['wall four-minus-one', b]);
  } else { if (['layers', 'formats', 'offers'].includes(type)) delete s.cols; out.push(['', s]); } // cols цих типів залежить від кількості пунктів — перевіряється окремо (блок «cols і pad» нижче)
  return out;
}
const pageOf = (sections, extra = {}) => ({ slug: 'qa-x', theme: 'barrels', tone: 'teal', metaTitle: mk(), metaDescription: mk(), sections: [(() => { const h = fullSection('hero'); return h; })(), ...sections], ...extra });
const withIds = (sections) => sections.map((s, i) => ({ ...s, id: `s${i}-${s.type}` }));

/* ------------------------------------------------------------------ 3. маркерний прогін + валідні варіанти */
const render = (page) => { const view = lpView(clone(page), {}); return createRenderer({ root: ROOT, getLpPage: () => view })('<!--@page qa-x-->'); };
const heroPage = pageOf([]);
// кожне поле з текстовим/посилальним значенням має бути в HTML секції (інакше адмінка покаже поле, якого на сторінці немає)
function shownCheck(type, label, html, sec) {
  const vals = [];
  (function collect(def, v, path) {
    if (v === undefined || v === null) return;
    if (['text', 'url', 'id'].includes(def.type)) vals.push([path, v]);
    else if (def.type === 'list') v.forEach((x, i) => collect(def.of, x, `${path}[${i}]`));
    else if (def.type === 'object') for (const [k, d] of Object.entries(def.fields)) collect(d, v[k], `${path}.${k}`);
  }({ type: 'object', fields: SCHEMA.sections[type] }, sec, type));
  for (const [path, v] of vals) {
    if (path === `${type}.type` || path === `${type}.id`) continue;
    const shown = path === `${type}.img` && type === 'card' ? html.includes(v.replace(/^\/assets\/img\//, '')) : html.includes(v);
    note(shown, `render ${type}${label ? ` [${label}]` : ''}: поле ${path.slice(type.length + 1)} показується`, `значення «${v}» відсутнє в HTML`);
  }
}
shownCheck('hero', '', render(heroPage), heroPage.sections[0]);
const validPages = [['hero', heroPage]];
for (const type of Object.keys(SCHEMA.sections).filter((t) => t !== 'hero')) {
  for (const [label, s] of variantsOf(type)) {
    const page = pageOf(withIds([s]));
    const html = render(page);
    shownCheck(type, label, html, s);
    if (type === 'tiles') { // enum-поля, що не маркуються текстом: shape → клас секції, tone/imgPos → модифікатори плитки, лід круглого варіанта — під рядом
      const circ = s.shape === 'circle';
      note(html.includes('lp-tiles--circle') === circ, `render tiles [${label}]: shape ${circ ? 'дає' : 'не дає'} клас lp-tiles--circle`);
      note(html.includes('lp-tile--tone-') === circ && html.includes('lp-tile--pos-') === circ, `render tiles [${label}]: tone і imgPos ${circ ? 'дають' : 'не дають'} модифікатори плитки`);
      if (circ) note(html.indexOf('lp-tiles__lead') > html.lastIndexOf('lp-tile__caption') && !html.includes('<p class="lp-head__lead'), 'render tiles [circle]: лід — під рядом плиток, не в шапці');
    }
    validPages.push([`${type}${label ? ` [${label}]` : ''}`, page]);
  }
}
for (const [label, p] of validPages) {
  note(jsOk(p) === true, `валідна сторінка (JS): ${label}`, String(jsOk(p)));
  note(jsonOk(p) === true, `валідна сторінка (JSON): ${label}`, JSON.stringify(validateJson.errors?.slice(0, 2)));
}

/* ------------------------------------------------------------------ 4. справжні сторінки */
const real = await loadLpPages(ROOT);
for (const [slug, data] of Object.entries(real)) {
  note(jsOk(data) === true, `справжня сторінка ${slug} (JS)`, String(jsOk(data)));
  note(jsonOk(data) === true, `справжня сторінка ${slug} (JSON)`, JSON.stringify(validateJson.errors?.slice(0, 3)));
  try { render({ ...data, tone: data.tone || 'teal' }); note(true, `рендер ${slug}`); } catch (e) { note(false, `рендер ${slug}`, e.message); }
  try { checkFiles(data, { root: ROOT, contactKeys: Object.keys(contactsView(contacts)) }); note(true, `файли ${slug} (тема, гравюри, іконки, медіа, посилання)`); } catch (e) { note(false, `файли ${slug}`, e.message); }
}

/* ------------------------------------------------------------------ 1. мутації полів: JS ≡ JSON ≡ очікуване */
// поля, що беруть участь у перехресних правилах (їх пропуск/порожнє дає інший вердикт — перевіряємо окремо нижче)
const XOR_FIELDS = new Set(['steps.scene', 'steps.img', 'steps.alt', 'tiles.items.engraving', 'tiles.items.img', 'tiles.items.icon', 'tiles.items.alt', 'tiles.items.origin', 'tiles.shape', 'tiles.leadCols', 'tiles.captionOver', 'tiles.items.tone', 'tiles.items.imgPos', 'tiles.items.zoom', 'card.text', 'card.list', 'compare.groups.wall', 'compare.groups.list', 'offers.bg', 'offers.bgW', 'offers.bgH', 'offers.bgSlot']);
const setAt = (obj, path, value) => { // path: масив ключів
  let o = obj; for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
  const k = path[path.length - 1]; if (value === DEL) delete o[k]; else o[k] = value;
};
const getAt = (obj, path) => path.reduce((o, k) => o?.[k], obj);
function mutantsFor(def, key, type) {
  const m = []; // [label, value, expectedValid]
  const opt = !def.req;
  switch (def.type) {
    case 'text':
      m.push(['max', maxText(def.max, def.word ?? 20), true], ['max+1', maxText(def.max + 1, def.word ?? 20), false]);
      const w = def.word ?? MAX_WORD; if (def.max > w) m.push(['слово>ліміту слова', 'в'.repeat(w + 1), false], ['слово = ліміт слова', 'в'.repeat(w), true]);
      m.push(['число замість тексту', 5, false]);
      m.push(['порожній рядок', '', opt]);
      m.push(['відсутнє', DEL, opt]);
      break;
    case 'url':
      if (def.startsWith) { m.push(['без префікса', '/other/x.webp', false], ['https', 'https://a.b/c.webp', false], ['з префіксом', `${def.startsWith}x.webp`, true], ['javascript:', 'javascript:alert(1)', false], ['//host', '//evil.com/x', false], ['порожній', '', opt], ['відсутнє', DEL, opt]); break; }
      m.push(['javascript:', 'javascript:alert(1)', false], ['//host', '//evil.com/x', false], ['ftp', 'ftp://x.y', false], ['пробіл', '/a b', false], ['лапка', '/a"b', false],
        ['https', 'https://a.b/c?d=1&e=2', true], ['%contacts%', '%contacts.phone%', true], ['сторінка.html?q', 'catalog.html?x=1#y', true], ['tel', 'tel:+380671234567', true],
        ['порожній', '', opt], ['відсутнє', DEL, opt]);
      break;
    case 'id': case 'partial': case 'icon':
      m.push(['велика літера', 'Ab', false], ['пробіл', 'a b', false], ['валідний', def.kind ? `${def.kind}-x-1` : 'a-b-1', true], ['порожній', '', opt], ['відсутнє', DEL, opt]);
      if (def.kind) m.push(['без префікса виду', 'a-b-1', false], ['чужий вид', `${def.kind === 'scene' ? 'wall' : 'scene'}-x`, false]);
      break;
    case 'enum':
      m.push(['поза переліком', 'zzz', false], ['рядок замість числа', String(def.values[0]) === def.values[0] ? 5 : String(def.values[0]), false], ['відсутнє', DEL, opt]);
      break;
    case 'number':
      m.push(['рядок', '4', false], ['NaN-подібне', 'x', false]);
      if (def.int) m.push(['дробове', 1.5, false]);
      if (def.min !== undefined) m.push(['менше min', def.min - 1, false], ['min', def.min, true]);
      if (def.max !== undefined) m.push(['більше max', def.max + 1, false], ['max', def.max, true]);
      m.push(['відсутнє', DEL, opt]);
      break;
    case 'bool': m.push(['рядок', 'yes', false], ['false', false, true], ['відсутнє', DEL, opt]); break;
    case 'list': m.push(['не масив', 'x', false], ['елемент не того типу', 5, false]); break;
    case 'object': m.push(['зайве поле', { __x: 1 }, false]); break;
    default: break;
  }
  return m;
}
let mutCount = 0;
function runMutations(label, page, sectionIndex) {
  const s = page.sections[sectionIndex]; const type = s.type;
  const defs = SCHEMA.sections[type];
  const targets = []; // { path, def, key, scopeKey }
  (function walk(def, path, scopeKey) {
    if (def.type === 'object') for (const [k, d] of Object.entries(def.fields)) { if (k === 'type') continue; const sk = `${scopeKey}.${k}`; targets.push({ path: [...path, k], def: d, key: k, scopeKey: sk }); walk(d, [...path, k], sk); }
    else if (def.type === 'list' && def.of.type === 'object') walk(def.of, [...path, 0], scopeKey);
    else if (def.type === 'list') { /* список скалярів: елемент перевіряємо окремо нижче */ }
  }({ type: 'object', fields: defs }, ['sections', sectionIndex], type));
  for (const t of targets) {
    if (t.key === 'id' && t.path.length === 3) continue; // id секції: унікальність/якорі — окремо
    const skip = XOR_FIELDS.has(t.scopeKey);
    for (const [lab, val, exp] of mutantsFor(t.def, t.key, type)) {
      if (skip && (exp || lab === 'false')) continue; // поле з перехресним правилом: валідні/порожні значення — у блоці «правила» нижче
      if (t.key === 'span' && exp) continue;
      if (t.key === 'cols' && exp) continue;   // cols залежить від кількості пунктів/сум span (правила cols-items-divide, compare-span-sum) — перевіряється в блоці «правила» нижче
      if (t.def.type === 'enum' && lab === 'рядок замість числа' && typeof t.def.values[0] === 'string') continue;
      const p = clone(page); setAt(p, t.path, val);
      const js = jsOk(p) === true; const jn = jsonOk(p) === true;
      mutCount++;
      note(js === exp && jn === exp, `${label}: ${t.scopeKey} — ${lab}`, `очікувано ${exp ? 'ВАЛІДНО' : 'НЕВАЛІДНО'}; JS=${js ? 'валідно' : 'ні'}, JSON=${jn ? 'валідно' : 'ні'}${js ? '' : ` (${jsOk(p)})`}`);
    }
    // списки: min-1, max+1, кожна кількість
    if (t.def.type === 'list') {
      const base = getAt(page, t.path); const proto = (Array.isArray(base) && base[0] !== undefined) ? base[0] : undefined;
      if (proto !== undefined) {
        for (let k = 0; k <= t.def.max + 1; k++) {
          if (k > 14) break;
          const arr = Array.from({ length: k }, (_, i) => { const e = clone(proto); if (e && typeof e === 'object' && 'key' in e) e.key = `k${i}`; return e; });
          const okLen = k >= t.def.min && k <= t.def.max && (!t.def.divides || t.def.divides % k === 0) && !(t.def.req === false && k === 0 && false);
          const emptyOk = k === 0 && !t.def.req;
          if (skip && k === 0) continue;
          if (t.scopeKey === 'compare.groups' || t.scopeKey === 'offers.items' || t.scopeKey === 'card.list' || t.scopeKey === 'offers.items.facts') { /* залежності правил (сума span, ціна): перевіряємо лише невалідні межі */ if (okLen || emptyOk) continue; }
          const p = clone(page); setAt(p, t.path, arr);
          const exp = okLen || emptyOk;
          const js = jsOk(p) === true; const jn = jsonOk(p) === true;
          mutCount++;
          note(js === exp && jn === exp, `${label}: ${t.scopeKey} — елементів ${k}`, `очікувано ${exp ? 'ВАЛІДНО' : 'НЕВАЛІДНО'}; JS=${js ? 'валідно' : 'ні'}, JSON=${jn ? 'валідно' : 'ні'}${js ? '' : ` (${jsOk(p)})`}`);
        }
      }
    }
  }
}
for (const [label, p] of validPages.slice(1)) runMutations(label, p, 1);
// hero
runMutations('hero', validPages[0][1], 0);

/* ------------------------------------------------------------------ перехресні правила: JS і JSON за очікуванням */
function cross(label, mut, js, json = js, base = 'type') {
  const src = validPages.find(([l]) => l.startsWith(base))?.[1];
  const p = clone(src); mut(p);
  const a = jsOk(p) === true; const b = jsonOk(p) === true;
  note(a === js && b === json, `правило: ${label}`, `очікувано JS=${js ? 'валідно' : 'ні'} JSON=${json ? 'валідно' : 'ні'}; фактично JS=${a ? 'валідно' : 'ні'}${a ? '' : ` (${jsOk(p)})`} JSON=${b ? 'валідно' : 'ні'}`);
}
const S = (p, i = 1) => p.sections[i];
cross('layers: 5 пунктів (не ділить 12)', (p) => { S(p).items = Array.from({ length: 5 }, (_, i) => ({ ...S(p).items[0], key: `k${i}` })); }, false, false, 'layers');
for (const k of [2, 3, 4, 6]) cross(`layers: ${k} пунктів ділить 12`, (p) => { S(p).items = Array.from({ length: k }, (_, i) => ({ ...S(p).items[0], key: `k${i}` })); }, true, true, 'layers');
cross('tiles: 5 пунктів', (p) => { S(p).items = Array.from({ length: 5 }, (_, i) => ({ ...S(p).items[0], key: `k${i}` })); }, false, false, 'tiles [engraving');
cross('compare: сума span = 11 (JS відхиляє; JSON не виражає)', (p) => { S(p).groups[1].span = 8; }, false, true, 'compare [wall+list');
cross('compare: cols 12, сума span = 12 (3+9)', (p) => { delete S(p).cols; S(p).groups[1].span = 9; }, true, true, 'compare [wall+list');
cross('compare: cols 10, сума span = 10 (3+7)', () => {}, true, true, 'compare [wall+list');
cross('compare: cols 10, але сума span = 12 (JS відхиляє; JSON не виражає)', (p) => { S(p).groups[1].span = 9; }, false, true, 'compare [wall+list');
cross('compare: wall і list в одній групі', (p) => { S(p).groups[0].list = ['x']; }, false, false, 'compare [wall+list');
cross('compare: 3 групи, сума 12 (4+4+4)', (p) => { const g = S(p).groups; g.push({ ...clone(g[1]), key: 'g3' }); delete S(p).cols; g[0].span = 4; g[0].wall = undefined; delete g[0].wall; g[0].list = ['x']; g[1].span = 4; g[2].span = 4; }, true, true, 'compare [wall+list');
cross('steps: і scene, і img', (p) => { S(p).img = '/q1'; }, false, false, 'steps [scene');
cross('steps: ні scene, ні img', (p) => { delete S(p).scene; }, false, false, 'steps [scene');
cross('steps: alt без img', (p) => { S(p).alt = 'x'; }, false, false, 'steps [scene');
cross('tiles: і engraving, і img', (p) => { S(p).items[0].img = '/q1'; }, false, false, 'tiles [engraving');
cross('tiles: ні engraving, ні img', (p) => { delete S(p).items[0].engraving; delete S(p).items[0].icon; }, false, false, 'tiles [engraving');
cross('tiles: icon без engraving', (p) => { delete S(p).items[0].engraving; S(p).items[0].img = '/q1'; }, false, false, 'tiles [engraving');
cross('tiles: shape circle без img у плитці', (p) => { delete S(p).items[0].img; delete S(p).items[0].alt; S(p).items[0].engraving = 'engraving-barrels-head'; }, false, false, 'tiles [circle');
cross('tiles: shape circle, усі плитки з фото (валідно)', () => {}, true, true, 'tiles [circle');
cross('tiles: leadCols без shape circle', (p) => { delete S(p).shape; delete S(p).captionOver; S(p).items.forEach((t) => { delete t.tone; delete t.imgPos; delete t.zoom; }); }, false, false, 'tiles [circle');
cross('tiles: circle, origin в один рядок', (p) => { S(p).items[0].origin = 'аб аб'; }, false, false, 'tiles [circle');
cross('tiles: circle, origin у три рядки', (p) => { S(p).items[0].origin = 'аб\nаб\nаб'; }, false, false, 'tiles [circle');
cross('tiles: tone без shape circle', (p) => { delete S(p).shape; delete S(p).leadCols; delete S(p).captionOver; S(p).items.forEach((t) => { delete t.imgPos; delete t.zoom; }); }, false, false, 'tiles [circle');
cross('tiles: imgPos без shape circle', (p) => { delete S(p).shape; delete S(p).leadCols; delete S(p).captionOver; S(p).items.forEach((t) => { delete t.tone; delete t.zoom; }); }, false, false, 'tiles [circle');
cross('tiles: без shape і без leadCols/tone/imgPos/zoom (валідно)', (p) => { delete S(p).shape; delete S(p).leadCols; delete S(p).captionOver; S(p).items.forEach((t) => { delete t.tone; delete t.imgPos; delete t.zoom; }); }, true, true, 'tiles [circle');
cross('tiles: captionOver без shape circle', (p) => { delete S(p).shape; delete S(p).leadCols; S(p).items.forEach((t) => { delete t.tone; delete t.imgPos; delete t.zoom; }); }, false, false, 'tiles [circle');
cross('tiles: zoom без shape circle', (p) => { delete S(p).shape; delete S(p).leadCols; delete S(p).captionOver; S(p).items.forEach((t) => { delete t.tone; delete t.imgPos; }); }, false, false, 'tiles [circle');
cross('tiles: zoom поза кроками (1.3)', (p) => { S(p).items[0].zoom = 1.3; }, false, false, 'tiles [circle');
cross('tiles: zoom = 2 (крайній крок)', (p) => { S(p).items[0].zoom = 2; }, true, true, 'tiles [circle');
cross('tiles: tone поза переліком', (p) => { S(p).items[0].tone = 'red'; }, false, false, 'tiles [circle');
cross('tiles: alt без img', (p) => { S(p).items[0].alt = 'x'; }, false, false, 'tiles [engraving');
cross('card: text і list разом', (p) => { S(p).list = ['x']; }, false, false, 'card [text');
cross('card: ні text, ні list', (p) => { delete S(p).text; }, false, false, 'card [text');
cross(`card: text = ${CARD_TEXT_MAX} знаків`, (p) => { S(p).text = 'а '.repeat(CARD_TEXT_MAX / 2).trim().padEnd(CARD_TEXT_MAX, 'б'); }, true, true, 'card [text');
cross(`card: list = ${CARD_LIST_MAX + 1} пунктів`, (p) => { delete S(p).text; S(p).list = Array(CARD_LIST_MAX + 1).fill('x'); }, false, false, 'card [list');
cross(`card: list = ${CARD_LIST_MAX} пунктів`, (p) => { delete S(p).text; S(p).list = Array(CARD_LIST_MAX).fill('x'); }, true, true, 'card [list');
/* стек великих блоків (stack) і hero.panel: правила + видимий ефект на сторінці (поле схеми ⇒ вигляд) */
{
  const hero = clone(heroPage.sections[0]); hero.panel = false;
  const card = clone(fullSection('card')); card.id = 'a-card'; delete card.list; delete card.room; card.room = 'warm';
  const place = clone(fullSection('place')); place.id = 'a-place'; delete place.room; place.join = false; place.stack = true; delete place.pad; delete place.cols;
  const stackPage = (mut) => { const pg = pageOf([]); pg.sections = [clone(hero), clone(card), clone(place)]; mut?.(pg); return pg; };
  const both = (label, pg, exp) => { const a = jsOk(pg) === true; const b = jsonOk(pg) === true; note(a === exp, `правило: ${label} (JS)`, String(jsOk(pg))); return b; };
  note(both('stack після card — дозволено', stackPage(), true) === true, 'правило: stack після card — дозволено (JSON)');
  note(both('stack після hero — відхиляє (JS; JSON не виражає)', stackPage((pg) => { pg.sections = [pg.sections[0], pg.sections[2]]; }), false) === true, 'правило: stack після hero — JSON не виражає (очікувана асиметрія)');
  note(both('stack на першій після place — дозволено (place → place)', stackPage((pg) => { const c2 = clone(pg.sections[2]); c2.id = 'a-place2'; pg.sections.push(c2); }), true) === true, 'правило: place → place stack (JSON)');
  const withRoom = stackPage((pg) => { pg.sections[2].room = 'deep'; });
  note(jsOk(withRoom) !== true && jsonOk(withRoom) !== true, 'правило: stack разом з room — відхиляють і JS, і JSON');
  const withJoin = stackPage((pg) => { pg.sections[2].join = true; });
  note(jsOk(withJoin) !== true && jsonOk(withJoin) !== true, 'правило: stack разом з join: true — відхиляють і JS, і JSON');
  const noStack = stackPage((pg) => { pg.sections[2].stack = false; pg.sections[2].room = 'deep'; });
  note(jsOk(noStack) === true && jsonOk(noStack) === true, 'правило: без stack room задається як звичайно');
  // видимий ефект: клас стека, спільна кімната попередньої, відсутність власної
  const htmlStack = render(stackPage());
  const sec = (id) => (htmlStack.match(new RegExp(`<section[^>]*id="${id}"[^>]*>`)) || [''])[0];
  note(/lp-sec--stack\b/.test(sec('a-place')) && /lp-room--warm/.test(sec('a-place')) && !/lp-room--deep/.test(sec('a-place')), 'render: stack → секція має lp-sec--stack і кімнату попередньої (warm), а не свою типову (deep)', sec('a-place'));
  note(/lp-sec--stack-next/.test(sec('a-card')), 'render: попередня секція стека має lp-sec--stack-next', sec('a-card'));
  const htmlPlain = render(stackPage((pg) => { pg.sections[2].stack = false; }));
  note(!/lp-sec--stack/.test(htmlPlain) && /lp-room--deep/.test((htmlPlain.match(/<section[^>]*id="a-place"[^>]*>/) || [''])[0]), 'render: без stack класів стека немає, кімната — власна (deep)');
  // hero.panel: панель DS з H1, лідом і кнопкою всередині; без panel — панелі в hero немає
  const hp = pageOf([]); hp.sections[0].panel = true; const hHtml = render(hp);
  const heroOf = (h) => { const i = h.indexOf('<section class="hero'); return h.slice(i, h.indexOf('</section>', i)); };
  const heroBlock = heroOf(hHtml);
  note(/class="contacts-panel hero__panel"/.test(heroBlock) && /hero--panel/.test(heroBlock), 'render: hero.panel → панель .contacts-panel і клас hero--panel');
  note(/contacts-panel[\s\S]*<h1[\s\S]*hero__subtitle[\s\S]*btn[\s\S]*<\/div>\s*<\/div>/.test(heroBlock), 'render: hero.panel → H1, лід і кнопка всередині панелі');
  const hn = pageOf([]); hn.sections[0].panel = false; const nHtml = render(hn);
  note(!/contacts-panel|hero--panel/.test(heroOf(nHtml)), 'render: без hero.panel панелі немає');
  note(/<img class="hero__bg"[^>]*fetchpriority="high"/.test(nHtml), 'render: hero-фото має fetchpriority="high"');
}
cross('offers: bg без bgW/bgH', (p) => { delete S(p).bgW; }, false, false, 'offers');
cross('offers: bgW без bg', (p) => { delete S(p).bg; }, false, false, 'offers');
for (const [cnt, cap] of Object.entries(PRICE_MAX)) {
  const setN = (p, c, len) => { const it = S(p).items; S(p).items = Array.from({ length: +c }, (_, i) => ({ ...clone(it[0]), key: `p${i}`, price: '0'.repeat(len) })); };
  cross(`offers: ${cnt} пропозицій, price = ${cap} знаків`, (p) => setN(p, cnt, cap), true, true, 'offers');
  if (cap < SCHEMA.sections.offers.items.of.fields.price.max) cross(`offers: ${cnt} пропозицій, price = ${cap + 1} знаків`, (p) => setN(p, cnt, cap + 1), false, false, 'offers');
}
cross('hero не першою', (p) => { p.sections.reverse(); }, false, false, 'layers');
cross('два hero', (p) => { p.sections.push({ ...clone(p.sections[0]), id: 'h2' }); }, false, false, 'layers');
cross('без hero', (p) => { p.sections.shift(); }, false, false, 'layers');
cross('hero.id = "" (як у barrels.js)', (p) => { p.sections[0].id = ''; }, true, true, 'layers');
cross('hero.room не існує в схемі', (p) => { p.sections[0].room = 'warm'; }, false, false, 'layers');
cross('дубль id секцій (JS відхиляє; JSON не виражає)', (p) => { p.sections.push({ ...clone(p.sections[1]) }); }, false, true, 'layers');
cross('дубль key у списку (JS відхиляє; JSON не виражає)', (p) => { S(p).items[1].key = S(p).items[0].key; }, false, true, 'layers');
cross('якір на неіснуючу секцію (JS відхиляє; JSON не виражає)', (p) => { p.sections[0].cta.href = '#nope'; }, false, true, 'layers');
cross('якір на наявну секцію', (p) => { p.sections[0].cta.href = `#${p.sections[1].id}`; }, true, true, 'layers');
cross('tone відсутній (дозволено: бере тема)', (p) => { delete p.tone; }, true, true, 'layers');
cross('tone поза переліком', (p) => { p.tone = 'red'; }, false, false, 'layers');
cross('невідоме поле сторінки', (p) => { p.subtitle = 'x'; }, false, false, 'layers');
for (const [sp, c] of Object.entries({ 2: { plain: 999, approx: 99 }, 3: { approx: 999 } })) for (const [kind, cap] of Object.entries(c)) {
  const set = (cnt) => (p) => { delete S(p).cols; const g = S(p).groups; g.push(clone(g[1])); g.forEach((x, i) => { x.span = i === 0 ? +sp : (i === 1 ? 12 - 2 - +sp : 2); x.key = `g${i}`; if (i > 0) delete x.wall; x.approx = false; }); g[0].approx = kind === 'approx'; g[0].count = cnt; g.forEach((x, i) => { if (x.wall && x.list) delete x.list; }); };
  cross(`count = ${cap} при span ${sp}${kind === 'approx' ? ' з «≈»' : ''}`, set(cap), true, true, 'compare [wall four-minus-one');
  cross(`count = ${cap + 1} при span ${sp}${kind === 'approx' ? ' з «≈»' : ''}`, set(cap + 1), false, false, 'compare [wall four-minus-one');
}
cross('count = 0', (p) => { S(p).groups[0].count = 0; }, true, true, 'compare [wall+list');
cross(`count = ${COUNT_MAX}`, (p) => { S(p).groups[0].count = COUNT_MAX; }, true, true, 'compare [wall+list');

/* поле `cols` (ширина вмісту секції в колонках) і `pad` (вертикальний відступ секції): правила + видимий ефект на сторінці */
{
  const byType = (t) => validPages.find(([l]) => l.startsWith(t))?.[1];
  const sec = (pg) => pg.sections[1];
  // допустимі значення залежать від типу
  for (const [type, vals] of Object.entries(COLS_BY_TYPE)) {
    const base = byType(type); if (!base) continue;
    for (const c of [2, 4, 6, 8, 10, 12]) {
      const exp = vals.includes(c);
      const p = clone(base); sec(p).cols = c;
      if (type === 'compare') { sec(p).groups[0].span = 3; sec(p).groups[1].span = c - 3; }
      const a = jsOk(p) === true; const b = jsonOk(p) === true;
      note(a === exp && b === exp, `cols: ${type}, cols = ${c} — ${exp ? 'дозволено' : 'нижче мінімуму типу'}`, `очікувано ${exp ? 'ВАЛІДНО' : 'НЕВАЛІДНО'}; JS=${a}${a ? '' : ` (${jsOk(p)})`} JSON=${b}`);
    }
    for (const c of [3, 9, 11, 13, 1, 0]) { const p = clone(base); sec(p).cols = c; note(jsOk(p) !== true && jsonOk(p) !== true, `cols: ${type}, cols = ${c} (непарне/поза 2–12) — відхиляють JS і JSON`); }
  }
  for (const type of ['steps', 'card', 'place', 'hero']) { const base = byType(type) || validPages[0][1]; const p = clone(base); p.sections[type === 'hero' ? 0 : 1].cols = 10; note(jsOk(p) !== true && jsonOk(p) !== true, `cols: ${type} фіксованої композиції — поле не приймається`); }
  // cols і кількість пунктів: пункт займає ціле число колонок
  const cnt = (type, n, cols) => { const p = clone(byType(type)); const it = sec(p).items; sec(p).items = Array.from({ length: n }, (_, i) => ({ ...clone(it[0]), key: `k${i}` })); if (cols) sec(p).cols = cols; else delete sec(p).cols; return p; };
  for (const [type, n, cols, exp] of [['layers', 2, 10, true], ['layers', 3, 10, false], ['layers', 4, 10, false], ['layers', 4, 8, true], ['layers', 3, 12, true], ['layers', 6, 8, false], ['offers', 1, 10, true], ['offers', 2, 10, true], ['offers', 3, 10, false], ['offers', 3, 12, true], ['formats', 2, 10, true]]) {
    const p = cnt(type, n, cols); const a = jsOk(p) === true; const b = jsonOk(p) === true;
    note(a === exp && b === exp, `правило cols-items-divide: ${type}, ${n} пунктів на ${cols} колонок`, `очікувано ${exp ? 'ВАЛІДНО' : 'НЕВАЛІДНО'}; JS=${a}${a ? '' : ` (${jsOk(p)})`} JSON=${b}`);
  }
  { const p = cnt('tiles', 4, 10); note(jsOk(p) === true && jsonOk(p) === true, 'tiles: 4 плитки на 10 колонок — дозволено (n рівних блоків контейнера)'); }
  // pad
  for (const type of ['layers', 'steps', 'compare', 'formats', 'tiles', 'offers', 'card', 'place', 'faq']) {
    const base = byType(type); if (!base) continue;
    for (const k of PAD_STEPS) { const p = clone(base); sec(p).pad = k; note(jsOk(p) === true && jsonOk(p) === true, `pad: ${type}, pad = ${k} — дозволено`, `${jsOk(p)}`); }
    const bad = clone(base); sec(bad).pad = 45; note(jsOk(bad) !== true && jsonOk(bad) !== true, `pad: ${type}, pad = 45 (поза кроками шкали) — відхиляють JS і JSON`);
    for (const other of ['join', 'loose', 'stack']) {
      if (!(other in SCHEMA.sections[type])) continue;
      const p = clone(base); sec(p).pad = 40; sec(p)[other] = true;
      note(jsOk(p) !== true && jsonOk(p) !== true, `правило pad-exclusive: ${type}, pad разом з ${other}: true — відхиляють JS і JSON`);
    }
  }
  { const p = clone(byType('layers')); p.sections[0].pad = 40; note(jsOk(p) !== true && jsonOk(p) !== true, 'pad: hero не приймає'); }
  // видимий ефект на сторінці: cols → клас lp-cols--N на секції (12 = типово, класу немає), pad → lp-pad--N, tiles на 10 колонок з 4 плитками → рівний поділ (клас сітки lp-tiles__grid--n4, без lp-span)
  const secTag = (html, id) => (html.match(new RegExp(`<section[^>]*id="${id}"[^>]*>`)) || [''])[0];
  for (const type of Object.keys(COLS_BY_TYPE)) {
    const base = byType(type); if (!base) continue;
    const id = sec(base).id;
    const p10 = clone(base); sec(p10).cols = 10; if (type === 'compare') { sec(p10).groups[0].span = 3; sec(p10).groups[1].span = 7; }
    note(/lp-cols--10\b/.test(secTag(render(p10), id)), `render ${type}: cols: 10 → клас lp-cols--10 на секції`, secTag(render(p10), id));
    const p12 = clone(base); sec(p12).cols = 12; if (type === 'compare') { sec(p12).groups[1].span = 9; }
    note(!/lp-cols--/.test(secTag(render(p12), id)), `render ${type}: cols: 12 (типово) не дає класу`);
  }
  for (const type of ['layers', 'steps', 'compare', 'formats', 'tiles', 'offers', 'card', 'place', 'faq']) {
    const base = byType(type); if (!base) continue; const p = clone(base); sec(p).pad = 40; if ('join' in sec(p)) sec(p).join = false; if ('loose' in sec(p)) sec(p).loose = false;
    note(/lp-pad--40\b/.test(secTag(render(p), sec(p).id)), `render ${type}: pad: 40 → клас lp-pad--40 на секції`);
  }
  { const p = cnt('tiles', 4, 10); sec(p).id = 'eq'; const html = render(p); note(/lp-tiles__grid--eq lp-tiles__grid--n4/.test(html) && !/lp-tile lp-span--/.test(html), 'render tiles: 4 плитки на 10 колонок → рівний поділ (lp-tiles__grid--n4), без lp-span'); }
  { const html = render(byType('tiles [circle')); note(/lp-tile--zoom-75/.test(html) && /t-spec/.test(html), 'render tiles [circle]: zoom → клас lp-tile--zoom-75; підпис — роль .t-spec'); note(/lp-tiles--over/.test(html), 'render tiles [circle]: captionOver → клас lp-tiles--over'); const p2 = clone(byType('tiles [circle')); sec(p2).captionOver = false; note(!/lp-tiles--over/.test(render(p2)), 'render tiles [circle]: captionOver: false (типово) не дає класу'); }
}

/* ------------------------------------------------------------------ файлові перевірки (tools/lp-files.mjs): зіпсуй → падає з поясненням */
const contactKeys = Object.keys(contactsView(contacts));
const realFiles = Object.values(real)[0];
if (realFiles) {
  const fileCase = (label, mut, expect) => {
    const p = clone(realFiles); mut(p);
    let msg = ''; try { validatePage(clone(p)); checkFiles(p, { root: ROOT, contactKeys }); } catch (e) { msg = e.message; }
    note(msg.includes(expect), `файли: ${label}`, msg ? `повідомлення: ${msg.slice(0, 140)}` : 'помилки не було');
  };
  const sec = (p, type) => p.sections.find((x) => x.type === type);
  fileCase('theme не існує', (p) => { p.theme = 'nope'; }, 'themes/nope.css');
  fileCase('hero.img не існує', (p) => { p.sections[0].img = '/assets/img/nope.webp'; }, 'відсутній у public/');
  fileCase('icon не існує', (p) => { const t = p.sections.find((x) => x.type === 'layers' || x.type === 'place'); if (t.items) t.items[0].icon = 'bogus'; else t.facts[0].icon = 'bogus'; }, '.icon--bogus');
  fileCase('href на неіснуючу сторінку', (p) => { p.sections[0].cta.href = 'nopage.html'; }, 'nopage.html');
  fileCase('%contacts.ключ% не існує', (p) => { p.sections[0].cta.href = '%contacts.nope%'; }, '%contacts.nope%');
  const withScene = Object.values(real).map((pg) => [pg, pg.sections.find((x) => x.type === 'steps' && x.scene)]).find(([, x]) => x);
  if (withScene) { const [pg] = withScene; const p = clone(pg); p.sections.find((x) => x.type === 'steps').scene = 'scene-nope'; let msg = ''; try { validatePage(clone(p)); checkFiles(p, { root: ROOT, contactKeys }); } catch (e) { msg = e.message; } note(msg.includes('partials/media/scene-nope.html'), 'файли: scene не існує', msg); }
}

/* ------------------------------------------------------------------ docs ↔ схема: кожне правило й кожне поле описано в docs/page-template.md */
{
  const docs = readFileSync(resolve(ROOT, 'docs/page-template.md'), 'utf8');
  const expressed = new Map([...RULES.map((r) => [r.id, !!r.json]), ...PAGE_RULES.map((r) => [r.id, !!r.json]), ...FILE_RULES.map((r) => [r.id, false])]);
  for (const [id, ex] of expressed) {
    const row = docs.split('\n').find((l) => l.startsWith(`| \`${id}\``));
    note(!!row, `docs: правило \`${id}\` є в «Додаткових перевірках»`);
    if (row) note(row.trim().replace(/\|$/, '').split('|').pop().trim() === (ex ? 'так' : 'ні') || /так \(|ні \(/.test(row.split('|').slice(-2)[0] ?? ''), `docs: правило \`${id}\` — колонка «У JSON Schema» = ${ex ? 'так' : 'ні'}`, row.slice(-40));
  }
  const names = new Set();
  const collect = (def) => { if (def.type === 'object') for (const [k, d] of Object.entries(def.fields)) { names.add(k); collect(d); } else if (def.type === 'list' && def.of) collect(def.of); };
  for (const f of Object.values(SCHEMA.sections)) collect({ type: 'object', fields: f });
  for (const k of Object.keys(SCHEMA.page)) names.add(k);
  names.delete('type');
  for (const k of names) note(docs.includes(`\`${k}`) || docs.includes(`${k}\``) || docs.includes(`.${k}\``), `docs: поле \`${k}\` описано`);
}

console.log(`lp-contract: перевірок ${total}, з них мутацій полів ${mutCount}; розбіжностей ${bad}`);
const inexpressible = RULES.filter((r) => !r.json).map((r) => r.id);
console.log(`  правила, яких JSON Schema не виражає (x-rules): ${inexpressible.join(', ')}, ids-unique, keys-unique, anchors-exist, stack-after-block + файлові (FILE_RULES)`);
if (rows.length) console.log(rows.slice(0, 80).join('\n') + (rows.length > 80 ? `\n  … ще ${rows.length - 80}` : ''));
process.exit(bad ? 1 : 0);
