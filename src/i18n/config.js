// i18n сайту (docs/i18n.md). Мови, префікси шляхів, статус перекладу сторінок. Чистий ES-модуль: його імпортують і vite.config.js (збірка), і tools/qa/i18n.mjs, і браузерний runtime.js.
export const DEFAULT_LOCALE = 'uk';
export const LANG_KEY = 'ks_lang'; // localStorage: обрана мова ('uk' | 'en'); пише перемикач (header-menu.js), читає inline-скрипт у <head> (tools/i18n.mjs)

// prefix — підкаталог мовної версії у dist (uk — корінь, en — /en/). short — підпис у кнопці перемикача; name — рідна назва мови в списку (не перекладається).
export const LOCALES = {
  uk: { code: 'uk', short: 'UA', name: 'Українська', hreflang: 'uk', prefix: '' },
  en: { code: 'en', short: 'EN', name: 'English', hreflang: 'en', prefix: 'en/' },
};

// Сторінки без мовних версій: службова 404 (одна на весь сайт, <base href>) і внутрішня дизайн-система.
export const NO_LOCALE_PAGES = ['404', 'design-system'];

// Статус перекладу сторінки за мовою: 'done' — текст повністю перекладений (lang="en", індексується, у sitemap);
// відсутній запис = 'draft' — /en/<сторінка>.html існує (шапка, футер, вікові ворота англійською), тіло ще українською:
// <html lang="uk" data-locale="en">, <meta name="robots" content="noindex">, canonical → українська сторінка, у sitemap немає.
// Після повного перекладу сторінки — рядок сюди і перевірка `npm run qa:i18n`.
export const PAGE_STATUS = {
  en: { index: 'done', catalog: 'done', cart: 'done', contacts: 'done', feedback: 'done', product: 'done', about: 'done', faq: 'done', cocktails: 'done', barrels: 'done', excursions: 'done', offer: 'done', privacy: 'done', cookies: 'done', delivery: 'done', 'age-policy': 'done', 'barrels-terms': 'done' },
};
export const pageStatus = (locale, name) => (locale === DEFAULT_LOCALE ? 'done' : PAGE_STATUS[locale]?.[name] || 'draft');
