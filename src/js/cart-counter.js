// Stub кошика (повноцінний кошик — окрема задача). Сховище: localStorage 'ks_cart' = [{ slug, volume, qty }].
// Лічильник «Кошик ( N )» у header знаходимо за посиланням на cart.html (розмітку header не змінюємо).
import { t } from '../i18n/runtime.js';
export const CART_KEY = 'ks_cart';

export function readCart() {
  try {
    const list = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

export function addToCart(slug, volume, qty = 1) {
  const list = readCart();
  const row = list.find((r) => r.slug === slug && r.volume === volume);
  if (row) row.qty += qty; else list.push({ slug, volume, qty });
  try { localStorage.setItem(CART_KEY, JSON.stringify(list)); } catch { /* приватний режим: без збереження */ }
  renderCartCount(list);
  return list;
}

// Запис усього списку (кошик: зміна кількості, видалення, очищення після замовлення). Формат рядка — той самий { slug, volume, qty }.
export function writeCart(list) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(list)); } catch { /* приватний режим: без збереження */ }
  renderCartCount(list);
  return list;
}

export function renderCartCount(list = readCart()) {
  const n = list.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  document.querySelectorAll('.site-header a[href$="cart.html"]').forEach((a) => { (a.querySelector('[data-cart-label]') || a).textContent = t('js.cart.count', { n }); });
}

renderCartCount();
addEventListener('storage', (e) => { if (e.key === CART_KEY) renderCartCount(); });
