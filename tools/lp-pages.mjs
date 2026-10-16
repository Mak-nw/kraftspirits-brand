// Автовиявлення сторінок шаблону lp: кожен src/data/<slug>.js, що експортує `<slug>` — об'єкт { slug, theme, sections: [...] }, є сторінкою <slug>.html (docs/page-template.md).
// Файли з «_» на початку й lp-schema.js пропускаються. Реєстрація в vite.config.js не потрібна: цей модуль читають збірка/dev і QA.
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const lpDataFiles = (root) => readdirSync(resolve(root, 'src/data')).filter((f) => f.endsWith('.js') && !f.startsWith('_') && f !== 'lp-schema.js');

/** @returns {Promise<Record<string, object>>} slug → дані сторінки (як у файлі; перевірку робить lpView) */
export async function loadLpPages(root, { bust = false } = {}) {
  const pages = {};
  for (const f of lpDataFiles(root)) {
    const slug = f.replace(/\.js$/, '');
    const url = pathToFileURL(resolve(root, 'src/data', f)).href + (bust ? `?v=${Date.now()}` : '');
    const m = await import(url);
    const d = m[slug];
    if (d && typeof d === 'object' && Array.isArray(d.sections) && d.theme) {
      if (d.slug !== slug) throw new Error(`lp: src/data/${f}: slug «${d.slug}» має збігатися з іменем файлу «${slug}»`);
      pages[slug] = d;
    }
  }
  return pages;
}
