// Браузерний i18n: мова сторінки і малий словник js.* (рядки, які малює сам JS). Мову ставить збірка: <html data-locale="en"> (для uk атрибута немає → 'uk').
import { DEFAULT_LOCALE } from './config.js';
import uk from './uk/js.js';
import en from './en/js.js';

const DICT = { uk, en };
export const locale = () => document.documentElement.dataset.locale || DEFAULT_LOCALE;
/** t('js.cart.count', { n: 3 }) → «Кошик ( 3 )» / «Cart ( 3 )»; немає ключа в мові → українське (еталон) */
export function t(key, vars) {
  const s = DICT[locale()]?.[key] ?? DICT.uk[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`)) : s;
}
/** ціна: «1 150 ₴» (uk) / «₴1,150» (en) */
export const fmtPrice = (n) => t('js.price', { n: n.toLocaleString(locale() === 'en' ? 'en-GB' : 'uk-UA') });
