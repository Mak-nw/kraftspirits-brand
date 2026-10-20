// Локалізація даних для збірки (лише Node: vite.config.js, tools/qa). Браузерні дані (товари, події) — у localize.js; сюди великі набори потрапляти не повинні.
// Кожен набір — оверлей `src/i18n/data/<набір>.en.js` поверх базових українських даних (overlay.js). uk → дані без змін (±0 байт у виводі).
import { DEFAULT_LOCALE } from './config.js';
import { overlayList } from './overlay.js';
import cocktailsEn from './data/cocktails.en.js';
import faqEn from './data/faq.en.js';
import legalEn from './data/legal.en.js';

export { localizeContacts } from './localize.js'; // контакти — у браузерному наборі (теми форми потрібні contact-form.js)
const OVER = { cocktails: { en: cocktailsEn }, faq: { en: faqEn }, legal: { en: legalEn } };
const over = (kind, locale) => (locale === DEFAULT_LOCALE ? null : OVER[kind][locale] || {});
export const localizeCocktails = (list, locale) => (over('cocktails', locale) ? overlayList(list, over('cocktails', locale), 'slug') : list);
export const localizeFaq = (groups, locale) => (over('faq', locale) ? overlayList(groups, over('faq', locale), 'slug') : groups);
export const localizeLegal = (docs, locale) => (over('legal', locale) ? overlayList(docs, over('legal', locale), 'slug') : docs);
