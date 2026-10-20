// Браузерний i18n: мова сторінки і малий словник js.* (рядки, які малює сам JS). Мову ставить збірка: <html data-locale="en"> (для uk атрибута немає → 'uk').
import { DEFAULT_LOCALE } from './config.js';
import uk from './uk/js.js';
import en from './en/js.js';

const DICT = { uk, en };
/** додаткові словники сторінок (js-wc.js для кошика/оформлення/кабінету): не потрапляють у глобальний js.js */
export const extend = (ukDict, enDict) => { Object.assign(DICT.uk, ukDict); Object.assign(DICT.en, enDict); };
export const locale = () => document.documentElement.dataset.locale || DEFAULT_LOCALE;
/** t('js.cart.count', { n: 3 }) → «Кошик ( 3 )» / «Cart ( 3 )»; немає ключа в мові → українське (еталон) */
export function t(key, vars) {
  const s = DICT[locale()]?.[key] ?? DICT.uk[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`)) : s;
}
/** ціна: «1 150 ₴» (uk) / «₴1,150» (en) */
export const fmtPrice = (n) => t('js.price', { n: n.toLocaleString(locale() === 'en' ? 'en-GB' : 'uk-UA') });
/** множина: tPlural('js.count.items', 5) → ключі js.count.items.one|few|many (uk: 1 / 2–4 / 5+; en: one / many) */
export function tPlural(prefix, n, vars = {}) {
  const m10 = n % 10, m100 = n % 100;
  const form = locale() === 'en' ? (n === 1 ? 'one' : 'many') : (m10 === 1 && m100 !== 11 ? 'one' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'few' : 'many');
  return t(`${prefix}.${form}`, { n, ...vars });
}
/** об'єм: 0.7 → «0,7 л» / «0.7 L» */
export const fmtLiters = (l) => t('js.vol.l', { n: String(l).replace('.', locale() === 'en' ? '.' : ',') });
