import { defineConfig } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { reviewMode } from './vite-plugin-review.js';
import { contacts, contactsView } from './src/data/contacts.js';
import { barrels, barrelsView } from './src/data/barrels.js';
import { COCKTAILS } from './src/data/cocktails.js';
import { PRODUCTS } from './src/data/products.js';
import { cocktailsView } from './src/data/cocktails-view.js';
import { FAQ } from './src/data/faq.js';
import { faqView } from './src/data/faq-view.js';

const root = import.meta.dirname;

// base збірки: змінна BASE_PATH (напр. BASE_PATH=/kraftspirits-brand/ для GitHub Pages нового репо);
// без неї — '/kraftspirits/' (старе поведінка). Нормалізація: починається і закінчується на '/'.
const DEFAULT_BASE = '/kraftspirits/';
function normalizeBase(raw) {
  let p = (raw ?? '').trim() || DEFAULT_BASE;
  if (!p.startsWith('/')) p = `/${p}`;
  if (!p.endsWith('/')) p = `${p}/`;
  return p;
}
const BUILD_BASE = normalizeBase(process.env.BASE_PATH);

// %contacts.<ключ>% у HTML -> значення з src/data/contacts.js (адреса, координати, телефон, e-mail, посилання мапи, теми) з екрануванням для атрибутів/тексту
const CONTACTS = contactsView(contacts);
const escapeHtml = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const fillContacts = (html) => html.replace(/%contacts\.(\w+)%/g, (m, key) => (key in CONTACTS ? (key.endsWith('Html') ? CONTACTS[key] : escapeHtml(CONTACTS[key])) : m)); // ключі *Html — готова розмітка (екранування в contacts.js)

// %barrels.<ключ>% у HTML -> значення з src/data/barrels.js (ціни, кількість пляшок, дрібний текст) для barrels.html
const BARRELS = barrelsView(barrels);
const fillBarrels = (html) => html.replace(/%barrels\.(\w+)%/g, (m, key) => (key in BARRELS ? escapeHtml(BARRELS[key]) : m));

// <!--@include name--> -> partials/name.html (вкладені include підтримуються).
// Параметри: <!--@include cta title="Текст"--> -> у partial {{title}} замінюється значенням;
// {{key|типове}} — значення за замовчуванням; {{#key}}...{{/key}} — блок лише коли key задано.
const INCLUDE_RE = /<!--@include ([\w/-]+)((?:\s+[\w-]+="[^"]*")*)\s*-->/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;
// <!--@each list name--> -> partials/name.html для КОЖНОГО елемента списку (параметри = поля елемента, уже екрановані);
// list — ключ у LISTS (верхній рівень) або поле-масив поточного елемента (вкладений цикл: фото, кроки, інгредієнти коктейлю).
const EACH_RE = /<!--@each ([\w]+) ([\w/-]+)\s*-->/g;
// Списки для @each (будуються з src/data/* під час збірки/dev): cocktails.html
const COCKTAILS_VIEW = cocktailsView(COCKTAILS, PRODUCTS);
const LISTS = { cocktails: COCKTAILS_VIEW, cocktailsDemo: COCKTAILS_VIEW.slice(1, 2) }; // cocktailsDemo — один блок для design-system.html
// faq.html: групи питань (src/data/faq.js) — <!--@each faq sections/faq-group--> і навігація <!--@each faq sections/faq-nav-->; faqDemo — два рядки для design-system.html
const FAQ_VIEW = faqView(FAQ);
LISTS.faq = FAQ_VIEW;
LISTS.faqDemo = FAQ_VIEW[0].items.slice(0, 2).map((it, k) => (k === 0 ? { ...it, open: ' open', expanded: 'true' } : { ...it, open: '', expanded: 'false' })); // design-system.html#faq: відкритий (2 абзаци) і закритий рядок

function htmlPartials() {
  let base = '/'; // config.base: BUILD_BASE у build/preview, '/' у dev
  const BLOCK_RE = /\{\{#([\w-]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  const blocks = (tpl, params) => {
    // {{#key}}...{{/key}} — блок лише якщо параметр key непорожній; повтор — для вкладених блоків з іншим ключем
    let prev;
    do { prev = tpl; tpl = tpl.replace(BLOCK_RE, (__, key, body) => (params[key] && params[key].length !== 0 ? body : '')); } while (tpl !== prev);
    return tpl;
  };
  const fill = (tpl, params) => blocks(tpl, params)
    // {{key}} або {{key|типове значення}}
    .replace(/\{\{([\w-]+)(?:\|([^}]*))?\}\}/g, (__, key, def) => params[key] ?? def ?? '');
  const readPartial = (name) => readFileSync(resolve(root, 'partials', `${name}.html`), 'utf8');
  const render = (html, scope = {}) =>
    html
      .replace(EACH_RE, (_, key, name) => {
        const list = Array.isArray(scope[key]) ? scope[key] : LISTS[key] || [];
        const tpl = readPartial(name);
        return list.map((item) => render(fill(tpl, item), item)).join('');
      })
      .replace(INCLUDE_RE, (_, name, rawAttrs) => {
        const params = Object.fromEntries([...rawAttrs.matchAll(ATTR_RE)].map((m) => [m[1], m[2]]));
        return render(fill(readPartial(name), params));
      });
  return {
    name: 'html-partials',
    configResolved(config) { base = config.base; },
    // %BASE_URL% (404.html: <base href>) підставляємо самі, щоб dev і build/preview давали однаковий результат
    transformIndexHtml: { order: 'pre', handler: (html) => fillBarrels(fillContacts(render(html))).replaceAll('%BASE_URL%', base) },
    handleHotUpdate({ file, server }) {
      if (file.includes('/partials/')) server.ws.send({ type: 'full-reload' });
    },
  };
}

// кожен *.html у корені — окрема сторінка
const pages = Object.fromEntries(
  readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace('.html', ''), resolve(root, f)])
);

// base: BUILD_BASE лише для збірки й `vite preview` (GitHub Pages); dev — корінь
export default defineConfig(({ command, isPreview }) => ({
  optimizeDeps: { exclude: ['maplibre-gl'] }, // maplibre-gl 6 шукає воркер відносно свого файлу (import.meta.url) — у dev без прекомпіляції
  base: command === 'build' || isPreview ? BUILD_BASE : '/',
  // reviewMode (design-machine, модуль 05) — ЛИШЕ dev-сервер: коментарі/сітка/інспектори; дані в ../review (поза репозиторієм). У збірці/preview плагіна немає.
  plugins: [htmlPartials(), ...(command === 'serve' && !isPreview ? [reviewMode({ dir: resolve(root, '../review') })] : [])],
  build: { rollupOptions: { input: pages }, chunkSizeWarningLimit: 1200 }, // maplibre-gl (~1 МБ, лише чанк сторінки контактів) перевищує типовий поріг 500 кБ
}));
