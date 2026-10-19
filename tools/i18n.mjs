// Рушій i18n збірки (docs/i18n.md): статична генерація мовних версій сторінок. Чистий Node (без vite): його використовують vite.config.js і tools/qa/i18n.mjs.
//   · <!--@include …--> і дані дають розмітку українською з ключами %t.<ключ>% (словники src/i18n/<мова>/*.js) — translateHtml підставляє значення потрібної мови;
//   · /en/<сторінка>.html — тонкі «стаби» (enStubs), справжній вміст = корінь <сторінка>.html, відрендерений мовою en (vite.config.js: transformIndexHtml);
//   · localizeHtml: <html lang/data-locale>, посилання перемикача мови, hreflang/canonical (лише коли задано SITE_URL), robots noindex для чернеток, inline-скрипт «запам'ятана мова».
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_LOCALE, LANG_KEY, LOCALES, NO_LOCALE_PAGES, pageStatus } from '../src/i18n/config.js';
import { DICTS } from '../src/i18n/dicts.js';

const T_RE = /%t\.([\w.-]+)%/g;
const STUB = (name) => `<!--@i18n-stub ${name}-->\n`;

/** імена сторінок кореня (*.html), для яких існують мовні версії */
export const localizedPages = (root) => readdirSync(root).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5)).filter((n) => !NO_LOCALE_PAGES.includes(n));

/** Створює en/<name>.html (стаб-однорядкові файли, у .gitignore) і прибирає застарілі. Файли потрібні vite: dev віддає /en/<name>.html, build бере їх як входи. */
export function writeStubs(root) {
  const names = localizedPages(root);
  for (const [code, loc] of Object.entries(LOCALES)) {
    if (!loc.prefix) continue;
    const dir = resolve(root, loc.prefix);
    mkdirSync(dir, { recursive: true });
    for (const n of names) {
      const f = resolve(dir, `${n}.html`);
      if (!existsSync(f) || readFileSync(f, 'utf8') !== STUB(n)) writeFileSync(f, STUB(n));
    }
    for (const f of readdirSync(dir)) if (f.endsWith('.html') && !names.includes(f.slice(0, -5))) rmSync(resolve(dir, f));
  }
  return names;
}

/** %t.ключ% → рядок словника мови. Немає в en → українське з попередженням (qa:i18n); немає в uk → помилка. missing — масив для звіту. */
export function translateHtml(html, locale, { page = '', missing = [] } = {}) {
  return html.replace(T_RE, (_, key) => {
    const v = DICTS[locale][key];
    if (v !== undefined) return v;
    const fb = DICTS[DEFAULT_LOCALE][key];
    if (fb === undefined) throw new Error(`i18n: ключа «${key}» немає в словниках (${page || 'html'})`);
    missing.push(key);
    return fb;
  });
}

const urlOf = (siteUrl, base, locale, name) => `${siteUrl.replace(/\/$/, '')}${base}${LOCALES[locale].prefix}${name === 'index' ? '' : `${name}.html`}`;

/** Відносний шлях до сторінки в мові `to`, рахуючи від сторінки в мові `from` (той самий каталог / ../). */
export function relUrl(from, to, name) {
  const up = LOCALES[from].prefix ? '../' : '';
  return `${up}${LOCALES[to].prefix}${name}.html`;
}

/**
 * Мовна обробка готової розмітки сторінки.
 * @param {string} html розмітка після partials/contacts
 * @param {{ locale: string, name: string, base: string, siteUrl?: string, missing?: string[] }} o
 */
export function localizeHtml(html, { locale, name, base, siteUrl = '', missing = [] }) {
  const excluded = NO_LOCALE_PAGES.includes(name);
  const status = pageStatus(locale, name);
  let out = translateHtml(html, locale, { page: name, missing });

  // посилання перемикача мови: %lang.uk% / %lang.en% — сторінка в тій мові; %lang.cur.<код>% — позначка активної мови
  for (const code of Object.keys(LOCALES)) {
    const target = excluded ? (code === locale ? `${name}.html` : `${LOCALES[code].prefix}index.html`) : relUrl(locale, code, name); // 404/design-system мовних версій не мають: «інша мова» веде на головну тієї мови
    out = out.replaceAll(`%lang.${code}%`, target).replaceAll(`%lang.cur.${code}%`, code === locale ? ' aria-current="true"' : '');
  }

  const head = [];
  if (!excluded) {
    if (locale === DEFAULT_LOCALE) {
      // збережена мова en → одразу (до paint) на англійську версію цієї ж сторінки; англійські сторінки нічого не переспрямовують (петлі нема)
      head.push(`<script>(function(){try{if(localStorage.getItem('${LANG_KEY}')==='en')location.replace('${relUrl('uk', 'en', name)}'+location.search+location.hash)}catch(e){}})();</script>`);
    }
    if (status === 'draft') head.push('<meta name="robots" content="noindex">');
    if (siteUrl) {
      const canonicalLocale = status === 'draft' ? DEFAULT_LOCALE : locale;
      head.push(`<link rel="canonical" href="${urlOf(siteUrl, base, canonicalLocale, name)}">`);
      const alts = Object.keys(LOCALES).filter((c) => pageStatus(c, name) === 'done');
      if (alts.length > 1) {
        for (const c of alts) head.push(`<link rel="alternate" hreflang="${LOCALES[c].hreflang}" href="${urlOf(siteUrl, base, c, name)}">`);
        head.push(`<link rel="alternate" hreflang="x-default" href="${urlOf(siteUrl, base, DEFAULT_LOCALE, name)}">`);
      }
    }
  }
  if (head.length) out = /<meta charset[^>]*>/.test(out) ? out.replace(/(<meta charset[^>]*>)/, `$1\n  ${head.join('\n  ')}`) : out.replace(/<head>/, `<head>\n  ${head.join('\n  ')}`);

  if (locale !== DEFAULT_LOCALE) {
    // lang: повністю перекладена сторінка — en; чернетка (тіло ще українське) — lang="uk" на <html>, а перекладені шапка/футер/ворота мають власний lang="en"
    out = out.replace(/<html\b[^>]*>/, `<html lang="${status === 'done' ? locale : DEFAULT_LOCALE}" data-locale="${locale}">`);
    if (status !== 'done') out = out.replace(/<(header|footer) class="site-(header|footer)"/g, `<$1 lang="${locale}" class="site-$2"`).replace(/<div class="age-gate"/g, `<div lang="${locale}" class="age-gate"`);
  }
  return out;
}

/** sitemap.xml (лише коли задано SITE_URL): усі сторінки uk; у пар uk/en зі статусом done — xhtml:link alternate */
export function sitemapXml(root, base, siteUrl) {
  const names = localizedPages(root).filter((n) => !['account', 'cart', 'checkout'].includes(n));
  const row = (locale, name) => {
    const alts = Object.keys(LOCALES).filter((c) => pageStatus(c, name) === 'done');
    const links = alts.length > 1 ? alts.map((c) => `<xhtml:link rel="alternate" hreflang="${LOCALES[c].hreflang}" href="${urlOf(siteUrl, base, c, name)}"/>`).join('') : '';
    return `<url><loc>${urlOf(siteUrl, base, locale, name)}</loc>${links}</url>`;
  };
  const rows = names.flatMap((n) => Object.keys(LOCALES).filter((c) => pageStatus(c, n) === 'done').map((c) => row(c, n)));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.join('\n')}\n</urlset>\n`;
}
