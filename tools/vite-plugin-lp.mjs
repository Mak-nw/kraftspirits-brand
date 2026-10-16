// Плагін Vite шаблону посадкової сторінки (lp; docs/page-template.md): сторінка з'являється від самого файлу даних src/data/<slug>.js — без правок vite.config.js, main.css і <slug>.html.
//   · автовиявлення: lpSlugs(root) — усі src/data/*.js, що експортують `<slug>` = { slug, theme, sections } (tools/lp-pages.mjs);
//   · <slug>.html у корені: якщо немає — створюється з одного рядка <!--@page slug--> (файл варто закомітити; vite бере всі *.html кореня як сторінки);
//   · CSS: у src/styles/main.css маркер /*@lp-auto*/ замінюється на @import усіх src/styles/themes|media|pages/*.css (тема, ілюстрації-медіа, оптика сторінки);
//   · дані перевіряються ЛІНИВО (лише сторінки, згадані в HTML, що рендериться): помилка даних = помилка саме цієї сторінки (dev: оверлей Vite; build: збірка падає одним рядком);
//   · зміна даних/тем/partials → перезавантаження; поява/зникнення файлу даних чи CSS → перезапуск dev-сервера.
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lpView } from '../src/data/lp-schema.js';
import { checkFiles } from './lp-files.mjs';
import { loadLpPage, loadLpPages } from './lp-pages.mjs';

export const CSS_DIRS = ['themes', 'media', 'pages'];
export const lpCssImports = (root) => CSS_DIRS.flatMap((d) => {
  const dir = resolve(root, 'src/styles', d);
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.css')).sort().map((f) => `@import './${d}/${f}';`) : [];
}).join('\n');

/** @returns {Promise<{ slugs: string[], plugin: () => object, view: (name: string) => object, ensure: (names: string[]) => Promise<void> }>} */
export async function createLp({ root, contactKeys }) {
  const slugs = Object.keys(await loadLpPages(root));
  for (const slug of slugs) {
    const html = resolve(root, `${slug}.html`);
    if (!existsSync(html)) { writeFileSync(html, `<!--@page ${slug}-->\n`); console.log(`[lp] створено ${slug}.html (один рядок <!--@page ${slug}-->) — закоміть файл`); }
  }
  const views = new Map();
  const oneLine = (e) => Object.assign(new Error(String(e.message).split('\n')[0]), { stack: '' }); // у збірці — лише повідомлення, без стеку
  async function load(name) {
    const data = await loadLpPage(root, name);
    if (!data) throw new Error(`lp: немає даних сторінки «${name}»: створіть src/data/${name}.js (const ${name} = { slug, theme, sections }) за схемою src/data/lp-schema.js`);
    const theme = checkFiles(data, { root, contactKeys });
    return lpView(data, { themeTone: theme.tone });
  }
  const ensure = async (names) => { for (const n of names) if (!views.has(n)) { try { views.set(n, await load(n)); } catch (e) { throw oneLine(e); } } };
  return {
    slugs,
    ensure,
    view: (name) => views.get(name),
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
        async buildStart() { if (!isBuild) return; try { await ensure(slugs); } catch (e) { this.error(e.message); } },
        configureServer(server) {
          server.watcher.on('add', (f) => { if (dataRe.test(f) || cssRe.test(f)) server.restart(); });
          server.watcher.on('unlink', (f) => { if (dataRe.test(f) || cssRe.test(f)) server.restart(); });
        },
        handleHotUpdate({ file, server }) {
          if (dataRe.test(file) || cssRe.test(file) || file.includes('/partials/lp/') || file.includes('/partials/media/') || file.endsWith('/lp-schema.js')) {
            views.clear();
            server.ws.send({ type: 'full-reload' });
          }
        },
      };
    },
  };
}
