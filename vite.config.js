import { defineConfig } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { createRenderer } from './tools/html-partials.mjs';
import { reviewMode } from './vite-plugin-review.js';
import { contacts, contactsView } from './src/data/contacts.js';
import { createLp } from './tools/vite-plugin-lp.mjs';
import { COCKTAILS } from './src/data/cocktails.js';
import { PRODUCTS } from './src/data/products.js';
import { cocktailsView } from './src/data/cocktails-view.js';
import { FAQ } from './src/data/faq.js';
import { faqView } from './src/data/faq-view.js';
import { LEGAL } from './src/data/legal.js';
import { legalLists } from './src/data/legal-view.js';
import { localizeHtml, sitemapXml, writeStubs } from './tools/i18n.mjs';

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

// ШАБЛОН ПОСАДКОВОЇ СТОРІНКИ (docs/page-template.md): <!--@page name--> у <name>.html -> уся сторінка з partials/lp/page.html і секцій partials/lp/<type>.html
// за даними src/data/<name>.js (схема й перевірка — src/data/lp-schema.js + tools/lp-files.mjs: збірка падає з поясненням, якщо дані не за схемою).
// <!--@lp name id--> -> одна секція сторінки (демо в design-system.html). Нова сторінка = ЛИШЕ файл даних src/data/<name>.js (+ тема в src/styles/themes/): сторінку, <name>.html і CSS
// плагін lp-auto (tools/vite-plugin-lp.mjs) підхоплює сам; реєстрації в цьому файлі немає.
const LP = await createLp({ root, contactKeys: Object.keys(CONTACTS) });
const LP_NAMES_RE = /<!--@(?:page|lp) ([a-z0-9]+(?:-[a-z0-9]+)*)/g;

// Списки для @each (будуються з src/data/* під час збірки/dev): cocktails.html
const COCKTAILS_VIEW = cocktailsView(COCKTAILS, PRODUCTS);
const LISTS = { cocktails: COCKTAILS_VIEW, cocktailsDemo: COCKTAILS_VIEW.slice(1, 2).map((c) => ({ ...c, loading: 'eager', fetchpriority: 'auto' })) }; // cocktailsDemo — один блок для design-system.html (фото eager: інакше lazy-кадр поза екраном не завантажений, і кільце мініатюр міряється на зеленому тлі панелі)
// faq.html: групи питань (src/data/faq.js) — <!--@each faq sections/faq-group-->; faqDemo — два рядки для design-system.html
const FAQ_VIEW = faqView(FAQ);
LISTS.faq = FAQ_VIEW;
// юридичні сторінки (src/data/legal.js): legalPrivacy / legalCookies / legalOffer / legalDelivery / legalAgePolicy / legalBarrelsTerms — список з одного документа
// для <!--@each legalX sections/legal-doc--> (вкладений цикл sections → legal-section)
Object.assign(LISTS, legalLists(LEGAL));
LISTS.faqDemo = FAQ_VIEW[0].items.slice(0, 2).map((it, k) => (k === 0 ? { ...it, open: ' open', expanded: 'true' } : { ...it, open: '', expanded: 'false' })); // design-system.html#faq: відкритий (2 абзаци) і закритий рядок
LISTS.faqDemoOpen = LISTS.faqDemo.slice(0, 1); LISTS.faqDemoClosed = LISTS.faqDemo.slice(1, 2); // демо в двох колонках .faq-page__col (design-system.html)

const I18N_MISSING = []; // ключі, яких немає в en (для сторінок-чернеток це нормально; повнота — npm run qa:i18n)

function htmlPartials() {
  let base = '/'; // config.base: BUILD_BASE у build/preview, '/' у dev
  // рушій partials (include/each/page/lp) — tools/html-partials.mjs; його ж використовує контрактна перевірка шаблону lp (tools/qa/lp-contract.mjs)
  const render = createRenderer({ root, lists: LISTS, getLpPage: (name) => LP.view(name) });
  return {
    name: 'html-partials',
    configResolved(config) { base = config.base; },
    // %BASE_URL% (404.html: <base href>) підставляємо самі, щоб dev і build/preview давали однаковий результат
    // i18n (docs/i18n.md): en/<name>.html — стаб; вміст = корінь <name>.html, мова en. Для обох мов: partials → %contacts.*% → %t.*% (словники) → мовна обробка (lang, перемикач, hreflang).
    transformIndexHtml: {
      order: 'pre',
      handler: async (html, ctx) => {
        const rel = relative(root, ctx.filename || '').split('\\').join('/');
        const enName = /^en\/([\w-]+)\.html$/.exec(rel)?.[1];
        const locale = enName ? 'en' : 'uk';
        const name = enName || basename(rel, '.html');
        if (enName) html = readFileSync(resolve(root, `${enName}.html`), 'utf8');
        await LP.ensure([...html.matchAll(LP_NAMES_RE)].map((m) => m[1]));
        const out = localizeHtml(fillContacts(render(html)), { locale, name, base, siteUrl: process.env.SITE_URL, missing: I18N_MISSING });
        return out.replaceAll('%BASE_URL%', base);
      },
    },
    generateBundle() { if (process.env.SITE_URL) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(root, base, process.env.SITE_URL) }); },
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
// мовні версії: en/<сторінка>.html — стаби, згенеровані тут же (tools/i18n.mjs, у .gitignore); входи збірки 'en/<сторінка>' → dist/en/<сторінка>.html
for (const n of writeStubs(root)) pages[`en/${n}`] = resolve(root, 'en', `${n}.html`);

// base: BUILD_BASE лише для збірки й `vite preview` (GitHub Pages); dev — корінь
export default defineConfig(({ command, isPreview }) => ({
  optimizeDeps: { exclude: ['maplibre-gl'] }, // maplibre-gl 6 шукає воркер відносно свого файлу (import.meta.url) — у dev без прекомпіляції
  base: command === 'build' || isPreview ? BUILD_BASE : '/',
  // reviewMode (design-machine, модуль 05) — ЛИШЕ dev-сервер: коментарі/сітка/інспектори; дані в ../review (поза репозиторієм). У збірці/preview плагіна немає.
  plugins: [LP.plugin(), htmlPartials(), ...(command === 'serve' && !isPreview ? [reviewMode({ dir: resolve(root, '../review') })] : [])],
  build: { rollupOptions: { input: pages }, chunkSizeWarningLimit: 1200 }, // maplibre-gl (~1 МБ, лише чанк сторінки контактів) перевищує типовий поріг 500 кБ
}));
