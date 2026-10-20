// Локалізація даних для БРАУЗЕРА і збірки: оверлей полів мови поверх базових (українських) даних із src/data/*.js. Немає запису/поля в оверлеї → лишається українське (qa:i18n покаже прогалини для сторінок зі статусом done).
// Лише малі набори (потрапляють у JS сторінок): товари, події, категорії, тексти сторінки товару, контакти. Великі (коктейлі, FAQ, юридичні) — localize-build.js (лише Node).
import { DEFAULT_LOCALE } from './config.js';
import { deepOverlay } from './overlay.js';
import productsEn from './data/products.en.js';
import occasionsEn from './data/occasions.en.js';
import categoriesEn from './data/categories.en.js';
import productTextsEn from './data/product-texts.en.js';
import contactsEn from './data/contacts.en.js';
import demoEn from './data/demo.en.js';

const OVERLAYS = { products: { en: productsEn }, occasions: { en: occasionsEn } };
const merge = (kind, item, key, locale) => (locale === DEFAULT_LOCALE ? item : { ...item, ...(OVERLAYS[kind][locale]?.[key] || {}) });
export const localizeProduct = (p, locale) => merge('products', p, p.slug, locale);
export const localizeOccasion = (o, locale) => merge('occasions', o, o.id, locale);
export const localizeCategories = (cats, locale) => (locale === DEFAULT_LOCALE ? cats : cats.map((c) => ({ ...c, label: (locale === 'en' && categoriesEn[c.id]) || c.label })));
/** { PRODUCT_TEXTS, PRODUCT_SERVE, PRODUCT_DELIVERY } мовою сторінки (src/data/product-texts.js + оверлей) */
export function localizeProductTexts({ PRODUCT_TEXTS, PRODUCT_SERVE, PRODUCT_DELIVERY }, locale) {
  if (locale === DEFAULT_LOCALE) return { PRODUCT_TEXTS, PRODUCT_SERVE, PRODUCT_DELIVERY };
  const o = locale === 'en' ? productTextsEn : {};
  return {
    PRODUCT_TEXTS: Object.fromEntries(Object.entries(PRODUCT_TEXTS).map(([k, v]) => [k, deepOverlay(v, o.texts?.[k])])),
    PRODUCT_SERVE: deepOverlay(PRODUCT_SERVE, o.serve),
    PRODUCT_DELIVERY: deepOverlay(PRODUCT_DELIVERY, o.delivery),
  };
}
export const localizeContacts = (contacts, locale) => (locale === DEFAULT_LOCALE ? contacts : deepOverlay(contacts, locale === 'en' ? contactsEn : undefined));

/** демо-довідники оформлення (область/місто/відділення Нової пошти, способи доставки й оплати): src/data/checkout-demo.js + оверлей demo.en.js */
export function localizeCheckoutDemo(d, locale) {
  if (locale === DEFAULT_LOCALE) return d;
  const o = demoEn.checkout;
  return {
    ...d,
    NP_AREAS: deepOverlay(d.NP_AREAS, o.areas),
    NP_CITIES: deepOverlay(d.NP_CITIES, o.cities),
    npWarehouses: () => deepOverlay(d.npWarehouses(), o.warehouses),
    SHIPPING_LABELS: deepOverlay(d.SHIPPING_LABELS, o.shipping),
    PAYMENT_LABELS: deepOverlay(d.PAYMENT_LABELS, o.payment),
  };
}
/** демо-акаунт і замовлення (src/data/account-demo.js + оверлей demo.en.js): ім'я, етапи, статуси, нотатки, адреса отримувача */
export function localizeAccountDemo(d, locale) {
  if (locale === DEFAULT_LOCALE) return d;
  const o = demoEn.account;
  return {
    ...d,
    DEMO_USER: deepOverlay(d.DEMO_USER, o.user),
    TRACK_STEPS: deepOverlay(d.TRACK_STEPS, o.steps),
    STATUS: deepOverlay(d.STATUS, o.status),
    ORDERS: deepOverlay(d.ORDERS, o.orders),
  };
}
