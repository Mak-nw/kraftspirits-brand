// Спільне для cart.html і checkout.html (симуляція WooCommerce-шаблонів без бекенду).
// Кошик — РЕАЛЬНИЙ кошик сайту (cart-counter.js: localStorage 'ks_cart' = [{ slug, volume, qty }]); дані товарів — src/data/products.js.
// Службові параметри (лише для перегляду/перевірок): ?state=<стан сторінки>, ?demo=1 — покласти демо-позиції в порожній кошик.
import { PRODUCTS } from '../data/products.js';
import { readCart, writeCart, renderCartCount } from './cart-counter.js';

export { readCart, writeCart, renderCartCount };

const base = import.meta.env.BASE_URL;
export const query = new URLSearchParams(location.search);
export const state = query.get('state') || '';

export const FREE_SHIPPING_FROM = 3000; // ₴: безкоштовна доставка «Новою поштою» (legal.js, «Доставка, оплата й повернення» п. 2.2)
export const DEMO_COUPON = { code: 'DEMO10', percent: 10 }; // лише демо купона (для стану «купон застосовано»); справжні купони — у налаштуваннях WooCommerce
const COUPON_KEY = 'ks_coupon';
const DEMO_ITEMS = [
  { slug: 'gin-yasnyi', volume: 0.7, qty: 2 },
  { slug: 'calvados-3', volume: 0.7, qty: 1 },
  { slug: 'whiskey-white', volume: 0.5, qty: 1 },
];
const ORDER_KEY = 'ks_order'; // знімок останнього справжнього замовлення (пише wc-checkout.js)
const hasRealOrder = () => { try { return !!sessionStorage.getItem(ORDER_KEY); } catch { return false; } };
const DEMO_STATES = ['updated', 'coupon-error', 'coupon-applied', 'error', 'thanks'];

export const fmtMoney = (n) => `${n.toLocaleString('uk-UA')} ₴`;
export const fmtVol = (l) => `${String(l).replace('.', ',')} л`;
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

export const getCoupon = () => { try { return sessionStorage.getItem(COUPON_KEY) || ''; } catch { return ''; } };
export const setCoupon = (code) => { try { if (code) sessionStorage.setItem(COUPON_KEY, code); else sessionStorage.removeItem(COUPON_KEY); } catch { /* без збереження */ } };

export function calcTotals(lines, coupon = getCoupon()) {
  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
  const discount = coupon === DEMO_COUPON.code ? Math.round(subtotal * DEMO_COUPON.percent / 100) : 0;
  const total = subtotal - discount;
  const free = subtotal >= FREE_SHIPPING_FROM;
  return { subtotal, discount, total, free, coupon: discount ? coupon : '' };
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
