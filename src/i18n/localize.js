// Локалізація даних: оверлей полів мови поверх базових (українських) даних із src/data/*.js. Немає запису/поля в оверлеї → лишається українське (qa:i18n покаже прогалини для сторінок зі статусом done).
import { DEFAULT_LOCALE } from './config.js';
import productsEn from './data/products.en.js';
import occasionsEn from './data/occasions.en.js';

const OVERLAYS = { products: { en: productsEn }, occasions: { en: occasionsEn } };
const merge = (kind, item, key, locale) => (locale === DEFAULT_LOCALE ? item : { ...item, ...(OVERLAYS[kind][locale]?.[key] || {}) });
export const localizeProduct = (p, locale) => merge('products', p, p.slug, locale);
export const localizeOccasion = (o, locale) => merge('occasions', o, o.id, locale);
