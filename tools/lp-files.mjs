// Перевірки даних сторінки lp проти файлової системи (Node; чиста схема src/data/lp-schema.js файлів не знає). Збірка й dev падають з поясненням (шлях поля + що не так):
//   тема (src/styles/themes/<theme>.css, роль --lp-tone), гравюри (partials/media/<id>.html), іконки (.icon--<id> у src/styles), файли медіа (public/…),
//   посилання на сторінки сайту (<name>.html у корені), ключі %contacts.<ключ>% (src/data/contacts.js). Опис правил — FILE_RULES у lp-schema.js і docs/page-template.md.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { SCHEMA, walk } from '../src/data/lp-schema.js';

const readCss = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) { const p = join(dir, e.name); if (e.isDirectory()) readCss(p, out); else if (e.name.endsWith('.css')) out.push(p); }
  return out;
};

/** тема: шлях до css і тон кнопок за замовчуванням (роль `--lp-tone` у темі); null — теми немає */
export function themeInfo(root, theme) {
  const file = resolve(root, 'src/styles/themes', `${theme}.css`);
  if (!existsSync(file)) return null;
  const m = /--lp-tone\s*:\s*btn--([a-z]+)\s*;/.exec(readFileSync(file, 'utf8')); // значення — клас кнопки DS (btn--teal): назва кольору в CSS-значенні S1 не пропустить
  return { file, tone: m ? m[1] : null };
}

let iconCache = { key: '', names: null };
const iconNames = (root) => {
  const files = readCss(resolve(root, 'src/styles'));
  const key = files.map((f) => `${f}:${readFileSync(f).length}`).join('|');
  if (iconCache.key !== key) iconCache = { key, names: new Set(files.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/\.icon--([a-z0-9-]+)/g)].map((m) => m[1]))) };
  return iconCache.names;
};

/** @param {object} page дані сторінки (уже пройшли validatePage)  @param {{root:string, contactKeys:string[]}} env */
export function checkFiles(page, { root, contactKeys = [] }) {
  const fail = (path, msg) => { throw new Error(`lp: ${path}: ${msg}`); };
  const theme = themeInfo(root, page.theme);
  if (!theme) fail(`${page.slug}.theme`, `немає src/styles/themes/${page.theme}.css (тема = ролі кольорів --lp-*; див. docs/page-template.md)`);
  if (!page.tone && !theme.tone) fail(`${page.slug}.tone`, `не задано: вкажіть tone у даних або роль --lp-tone у src/styles/themes/${page.theme}.css`);
  const icons = iconNames(root);
  page.sections.forEach((s, i) => {
    walk({ type: 'object', fields: SCHEMA.sections[s.type] }, s, `${page.slug}.sections[${i}](${s.id || s.type})`, (d, v, path) => {
      const key = path.slice(path.lastIndexOf('.') + 1).replace(/\[\d+\]$/, '');
      if (d.type === 'partial') { if (!existsSync(resolve(root, 'partials/media', `${v}.html`))) fail(path, `немає partials/media/${v}.html (гравюра-медіа)`); }
      else if (d.type === 'icon') { if (!icons.has(v)) fail(path, `немає іконки .icon--${v} у src/styles (перелік — design-system.html → «Іконки», «Брендові іконки»)`); }
      else if (d.type === 'url' && typeof v === 'string') {
        if (key === 'img' || key === 'bg' || key === 'lottie') { if (v.startsWith('/') && !existsSync(resolve(root, 'public', v.slice(1)))) fail(path, `файл ${v} відсутній у public/`); }
        else {
          const mm = /^%contacts\.(\w+)%$/.exec(v); if (mm && !contactKeys.includes(mm[1])) fail(path, `%contacts.${mm[1]}% — немає такого ключа в src/data/contacts.js (є: ${contactKeys.join(', ')})`);
          const pg = /^([a-z0-9-]+)\.html(?:[?#].*)?$/.exec(v); if (pg && !existsSync(resolve(root, `${pg[1]}.html`)) && !existsSync(resolve(root, 'src/data', `${pg[1]}.js`))) fail(path, `сторінки ${pg[1]}.html немає в корені проєкту`);
        }
      }
    });
  });
  return theme;
}
