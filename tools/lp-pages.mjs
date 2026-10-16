// Автовиявлення сторінок шаблону lp: кожен src/data/<slug>.js, що експортує `<slug>` — об'єкт { slug, theme, sections: [...] }, є сторінкою <slug>.html (docs/page-template.md).
// Файли з «_» на початку й lp-schema.js пропускаються. Реєстрація в vite.config.js не потрібна: цей модуль читають збірка/dev і QA.
import { existsSync, readdirSync, statSync } from 'node:fs';
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

/** дані однієї сторінки (свіжий імпорт: кеш Node обходиться версією файлу); null — файлу/експорту немає */
export async function loadLpPage(root, slug) {
  const file = resolve(root, 'src/data', `${slug}.js`);
  if (!existsSync(file)) return null;
  const m = await import(`${pathToFileURL(file).href}?v=${statSync(file).mtimeMs}`);
  const d = m[slug];
  if (!d || typeof d !== 'object' || !Array.isArray(d.sections)) throw new Error(`lp: src/data/${slug}.js має експортувати const ${slug} = { slug, theme, sections: [...] }`);
  if (d.slug !== slug) throw new Error(`lp: src/data/${slug}.js: slug «${d.slug}» має збігатися з іменем файлу «${slug}»`);
  return d;
}
