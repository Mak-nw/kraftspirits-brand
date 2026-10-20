// Спільне для cart.html і checkout.html (симуляція WooCommerce-шаблонів без бекенду).
// Кошик — РЕАЛЬНИЙ кошик сайту (cart-counter.js: localStorage 'ks_cart' = [{ slug, volume, qty }]); дані товарів — src/data/products.js.
// Службові параметри (лише для перегляду/перевірок): ?state=<стан сторінки>, ?demo=1 — покласти демо-позиції в порожній кошик.
import { PRODUCTS as PRODUCTS_UK } from '../data/products.js';
import { t, locale, extend } from '../i18n/runtime.js';
import wcUk from '../i18n/uk/js-wc.js';
import wcEn from '../i18n/en/js-wc.js';

extend(wcUk, wcEn); // рядки кошика/оформлення/кабінету (js.wc.*) — лише на цих сторінках
import { localizeProduct } from '../i18n/localize.js';
import { readCart, writeCart, renderCartCount } from './cart-counter.js';

const PRODUCTS = PRODUCTS_UK.map((p) => localizeProduct(p, locale())); // назви позицій мовою сторінки

export { readCart, writeCart, renderCartCount };

const base = import.meta.env.BASE_URL;
export const query = new URLSearchParams(location.search);
export const state = query.get('state') || '';

export const SHIPPING_TARIFF = t('js.ship.tariff'); // значення рядка «Доставка» для «Нової пошти» (кошик, подяка, кабінет); зірочка — примітка SHIPPING_TARIFF_NOTE під таблицею підсумків
export const SHIPPING_TARIFF_NOTE = t('js.ship.tariff-note');
const DEMO_ITEMS = [
  { slug: 'gin-yasnyi', volume: 0.7, qty: 2 },
  { slug: 'calvados-3', volume: 0.7, qty: 1 },
  { slug: 'whiskey-white', volume: 0.5, qty: 1 },
];
const ORDER_KEY = 'ks_order'; // знімок останнього справжнього замовлення (пише wc-checkout.js)
const hasRealOrder = () => { try { return !!sessionStorage.getItem(ORDER_KEY); } catch { return false; } };
const DEMO_STATES = ['error', 'thanks'];

export const fmtMoney = (n) => t('js.money', { n: n.toLocaleString(locale() === 'en' ? 'en-GB' : 'uk-UA') }); // «1 150 ₴» (nbsp) / «₴1,150»
export const fmtVol = (l) => t('js.vol.nbsp', { n: String(l).replace('.', locale() === 'en' ? '.' : ',') }); // «0,7 л» (nbsp) / «0.7 L»
/** мова для Date.toLocale…String */
export const dateLocale = () => (locale() === 'en' ? 'en-GB' : 'uk-UA');
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

// порожній кошик + явний запит демо (?demo=1 або стан, якому потрібні позиції) → демо-позиції в сховищі.
// Після РЕАЛЬНОГО оформлення (знімок замовлення ks_order у sessionStorage) сторінка подяки кошик не засіває: кошик лишається порожнім; демо там лише за явним ?demo.
export function seedDemoIfNeeded() {
  if (state === 'empty') return;
  if (!(query.has('demo') || DEMO_STATES.includes(state))) return;
  if (state === 'thanks' && !query.has('demo') && hasRealOrder()) return;
  if (!readCart().length) writeCart(DEMO_ITEMS.map((i) => ({ ...i })));
}

// рядки кошика з даними товарів (позиції зі slug, якого вже немає в каталозі, пропускаємо)
export function resolveLines(list = readCart()) {
  const out = [];
  list.forEach((r, index) => {
    const p = PRODUCTS.find((x) => x.slug === r.slug);
    if (!p) return;
    const v = p.volumes.find((x) => x.l === r.volume) || p.volumes[0];
    const qty = Math.max(1, Math.min(99, Number(r.qty) || 1));
    out.push({
      index, slug: p.slug, name: p.name, volume: v.l, qty, price: v.price, subtotal: v.price * qty,
      url: `product.html?id=${p.slug}`, image: p.image ? `${base}${p.image}` : '',
    });
  });
  return out;
}

// доставку в суму не входить (рахується за тарифами перевізника): разом = проміжний підсумок
export function calcTotals(lines) {
  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
  return { subtotal, total: subtotal };
}

// справжній прихований <select name="billing_state|billing_city|billing_warehouse"> (його читають checkout.js WooCommerce і плагін «Нової пошти»; серверні дані підставляються в нього без зміни розмітки):
// варіанти й вибране значення синхронізуються з кнопкою-select (.select) у тій самій обгортці .form-row; перший варіант (плейсхолдер, value="") лишається
export function syncNativeSelect(wrapper, options, value = '') {
  const sel = qs('select', wrapper);
  sel.replaceChildren(sel.options[0], ...options.map((o) => new Option(o.label, o.value)));
  sel.value = value;
  return sel;
}

// нотис із <template> сторінки (розмітка нотисів — partials/components/wc-notice|wc-error): повністю замінює попередні
export function showNotice(wrapper, kind, text, opts = {}) {
  const tpl = qs(`#wc-tpl-${kind}${opts.href ? '-link' : ''}`);
  const node = tpl.content.firstElementChild.cloneNode(true);
  const t = qs('[data-wc-text]', node);
  if (t) t.textContent = text; else node.firstElementChild.textContent = text;
  if (opts.href) {
    const a = qs('a', node);
    a.href = opts.href;
    qs('[data-wc-link]', node).textContent = opts.link;
    if (opts.onClick) a.addEventListener('click', (e) => { e.preventDefault(); opts.onClick(); });
  }
  wrapper.replaceChildren(node);
  if (opts.focus) wrapper.focus({ preventScroll: false });
  return node;
}
export const clearNotices = (wrapper) => wrapper.replaceChildren();
