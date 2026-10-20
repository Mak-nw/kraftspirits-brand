// Плагін Vite шаблону посадкової сторінки (lp; docs/page-template.md): сторінка з'являється від самого файлу даних src/data/<slug>.js — без правок vite.config.js, main.css і <slug>.html.
//   · автовиявлення: lpSlugs(root) — усі src/data/*.js, що експортують `<slug>` = { slug, theme, sections } (tools/lp-pages.mjs);
//   · <slug>.html у корені: якщо немає — створюється з одного рядка <!--@page slug--> (файл варто закомітити; vite бере всі *.html кореня як сторінки);
//   · CSS: у src/styles/main.css маркер /*@lp-auto*/ замінюється на @import усіх src/styles/themes|media|pages/*.css (тема, ілюстрації-медіа, оптика сторінки);
//   · дані перевіряються ЛІНИВО (лише сторінки, згадані в HTML, що рендериться): помилка даних = помилка саме цієї сторінки (dev: оверлей Vite; build: збірка падає одним рядком);
//   · зміна даних/тем/partials → перезавантаження; поява/зникнення файлу даних чи CSS → перезапуск dev-сервера.
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_LOCALE } from '../src/i18n/config.js';
import { deepOverlay } from '../src/i18n/overlay.js';
import { lpView } from '../src/data/lp-schema.js';
import { checkFiles } from './lp-files.mjs';
import { loadLpPage, loadLpPages } from './lp-pages.mjs';

export const CSS_DIRS = ['themes', 'media', 'pages'];
export const lpCssImports = (root) => CSS_DIRS.flatMap((d) => {
  const dir = resolve(root, 'src/styles', d);
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.css')).sort().map((f) => `@import './${d}/${f}';`) : [];
}).join('\n');

// службові нотатки «що тут має бути за фото» (slot/bgSlot) — внутрішня мова проєкту; в англійській версії їх нема (у розмітку вони потрапляють як data-slot)
const stripSlots = (v) => (Array.isArray(v) ? v.map(stripSlots) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'slot' && k !== 'bgSlot').map(([k, x]) => [k, stripSlots(x)])) : v);

/** @returns {Promise<{ slugs: string[], plugin: () => object, view: (name: string) => object, ensure: (names: string[]) => Promise<void> }>} */
export async function createLp({ root, contactKeys }) {
  const slugs = Object.keys(await loadLpPages(root));
  for (const slug of slugs) {
    const html = resolve(root, `${slug}.html`);
    if (!existsSync(html)) { writeFileSync(html, `<!--@page ${slug}-->\n`); console.log(`[lp] створено ${slug}.html (один рядок <!--@page ${slug}-->) — закоміть файл`); }
  }
  const views = new Map(); // ключ `${locale}:${name}`
  // англійський оверлей сторінки: src/i18n/data/<name>.en.js (docs/i18n.md §3); немає файлу → сторінка лишається українською
  const overlayOf = async (name, locale) => {
    const f = resolve(root, 'src/i18n/data', `${name}.${locale}.js`);
    return existsSync(f) ? (await import(`${pathToFileURL(f).href}?v=${statSync(f).mtimeMs}`)).default : null;
  };
  const oneLine = (e) => Object.assign(new Error(String(e.message).split('\n')[0]), { stack: '' }); // у збірці — лише повідомлення, без стеку
  async function load(name, locale) {
    let data = await loadLpPage(root, name);
    if (!data) throw new Error(`lp: немає даних сторінки «${name}»: створіть src/data/${name}.js (const ${name} = { slug, theme, sections }) за схемою src/data/lp-schema.js`);
    if (locale !== DEFAULT_LOCALE) { const o = await overlayOf(name, locale); if (o) data = deepOverlay(data, o); data = stripSlots(data); }
    const theme = checkFiles(data, { root, contactKeys });
    return lpView(data, { themeTone: theme.tone, locale });
  }
  const ensure = async (names, locale = DEFAULT_LOCALE) => { for (const n of names) if (!views.has(`${locale}:${n}`)) { try { views.set(`${locale}:${n}`, await load(n, locale)); } catch (e) { throw oneLine(e); } } };
  return {
    slugs,
    ensure,
    view: (name, locale = DEFAULT_LOCALE) => views.get(`${locale}:${name}`),
    plugin() {
      const dataRe = /\/src\/data\/[^/]+\.js$/;
      const cssRe = /\/src\/styles\/(?:themes|media|pages)\/[^/]+\.css$/;
      let isBuild = false;
      return {
        name: 'lp-auto',
        enforce: 'pre',
        // підключення CSS тем/медіа/сторінок до main.css
        transform(code, id) {
          if (!id.split('?')[0].endsWith('/src/styles/main.css') || !code.includes('/*@lp-auto*/')) return null;
          return { code: code.replace('/*@lp-auto*/', lpCssImports(root)), map: null };
        },
        configResolved(cfg) { isBuild = cfg.command === 'build'; },
        // у збірці всі сторінки lp перевіряються до початку (збірка падає з поясненням); у dev помилка даних не зупиняє сервер — вона лише на своїй сторінці (оверлей Vite)
        async buildStart() { if (!isBuild) return; try { await ensure(slugs); await ensure(slugs, 'en'); } catch (e) { this.error(e.message); } },
        configureServer(server) {
          server.watcher.on('add', (f) => { if (dataRe.test(f) || cssRe.test(f)) server.restart(); });
          server.watcher.on('unlink', (f) => { if (dataRe.test(f) || cssRe.test(f)) server.restart(); });
        },
        handleHotUpdate({ file, server }) {
          if (dataRe.test(file) || /\/src\/i18n\/data\/[^/]+\.js$/.test(file) || cssRe.test(file) || file.includes('/partials/lp/') || file.includes('/partials/media/') || file.endsWith('/lp-schema.js')) {
            views.clear();
            server.ws.send({ type: 'full-reload' });
          }
        },
      };
    },
  };
}
