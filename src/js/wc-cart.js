// cart.html — симуляція шаблону WooCommerce cart/cart.php на реальному кошику сайту (localStorage 'ks_cart').
// Зміна кількості (± або введення) застосовується одразу — кнопки «Оновити кошик» і поля купона немає (рішення замовника); видалення — нотис з «Повернути».
// Стани: ?state=empty, ?demo=1 (демо-позиції в порожній кошик). Деталі — wc-common.js.
import {
  state, SHIPPING_TARIFF, fmtMoney, fmtVol, qs, qsa, readCart, writeCart, renderCartCount, seedDemoIfNeeded, resolveLines,
  calcTotals, showNotice, clearNotices,
} from './wc-common.js';
import { t } from '../i18n/runtime.js';

// Модуль у try/finally (як wc-checkout.js): при падінні будь-якого коду сторінка не лишається прихованою (verify-D2); без JS — <noscript> у cart.html
try {

  const form = qs('.woocommerce-cart-form');
  const filled = qsa('[data-wc-filled]');
  const empty = qs('[data-wc-empty]');
  const notices = qs('[data-wc-notices]');
  const tbody = qs('tbody', form);
  const rowTpl = qs('#wc-tpl-row');
  const forceEmpty = state === 'empty';
  let removed = null; // { item, index } — для «Повернути»

  seedDemoIfNeeded();

  function renderTotals(lines) {
    const t = calcTotals(lines);
    qs('[data-wc-subtotal]').textContent = fmtMoney(t.subtotal);
    qs('[data-wc-total]').textContent = fmtMoney(t.total);
    qs('[data-wc-shipping]').textContent = SHIPPING_TARIFF;
  }

  function render() {
    const lines = forceEmpty ? [] : resolveLines(readCart());
    const isEmpty = lines.length === 0;
    filled.forEach((el) => { el.hidden = isEmpty; });
    empty.hidden = !isEmpty;
    qsa('.cart_item', tbody).forEach((tr) => tr.remove());
    if (!isEmpty) {
      lines.forEach((l, i) => {
        const tr = rowTpl.content.firstElementChild.cloneNode(true);
        tr.dataset.index = String(l.index);
        qsa('[data-wc-link]', tr).forEach((a) => { a.href = l.url; });
        qs('img', tr).src = l.image;
        qs('[data-wc-name]', tr).textContent = l.name;
        qs('[data-wc-volume]', tr).textContent = fmtVol(l.volume);
        qs('[data-wc-remove]', tr).setAttribute('aria-label', t('js.cart.remove', { name: l.name }));
        qs('[data-wc-price]', tr).textContent = fmtMoney(l.price);
        qs('[data-wc-subtotal-row]', tr).textContent = fmtMoney(l.subtotal);
        const input = qs('input.qty', tr);
        input.id = `cart_qty_${i}`;
        input.name = `cart[${l.index}][qty]`;
        input.value = String(l.qty);
        qs('label', tr).htmlFor = input.id;
        tbody.append(tr);
      });
      renderTotals(lines);
      syncAllQty();
    }
    if (!forceEmpty) renderCartCount();
  }

  const save = (list) => { writeCart(list); render(); };

  // кількість у рядку → сховище, суми рядка й підсумку перераховуються на місці (DOM рядків не перебудовується — фокус на кнопці ± лишається)
  function commitQty(tr) {
    const list = readCart();
    const row = list[Number(tr.dataset.index)];
    if (!row) return;
    row.qty = Math.max(1, Math.min(99, parseInt(qs('input.qty', tr).value, 10) || 1));
    writeCart(list);
    const lines = resolveLines(list);
    const line = lines.find((l) => l.index === Number(tr.dataset.index));
    if (line) qs('[data-wc-subtotal-row]', tr).textContent = fmtMoney(line.subtotal);
    renderTotals(lines);
    renderCartCount();
  }

  function removeLine(tr) {
    const list = readCart();
    const index = Number(tr.dataset.index);
    const [item] = list.splice(index, 1);
    removed = { item, index };
    const line = resolveLines([item])[0];
    save(list);
    showNotice(notices, 'message-link', t('js.cart.removed', { name: line ? line.name : t('js.cart.product') }), {
      href: '#', link: t('js.cart.undo'), focus: true,
      onClick: () => { const l = readCart(); l.splice(Math.min(removed.index, l.length), 0, removed.item); save(l); clearNotices(notices); },
    });
  }

  // «−» вимикається на мінімумі (1), «+» — на максимумі (99)
  const syncQtyButtons = (box) => {
    const input = qs('input.qty', box), v = parseInt(input.value, 10) || 1;
    qs('[data-wc-qty-step="-1"]', box).disabled = v <= 1;
    qs('[data-wc-qty-step="1"]', box).disabled = v >= 99;
  };
  const syncAllQty = () => qsa('.quantity', form).forEach(syncQtyButtons);

  form.addEventListener('click', (e) => {
    const step = e.target.closest('[data-wc-qty-step]');
    if (step) {
      const input = qs('input.qty', step.closest('.quantity'));
      input.value = String(Math.max(1, Math.min(99, (parseInt(input.value, 10) || 1) + Number(step.dataset.wcQtyStep))));
      commitQty(step.closest('tr'));
      syncQtyButtons(step.closest('.quantity'));
      return;
    }
    const rm = e.target.closest('[data-wc-remove]');
    if (rm) { e.preventDefault(); removeLine(rm.closest('tr')); }
  });
  form.addEventListener('change', (e) => { if (e.target.matches('input.qty')) { const input = e.target; input.value = String(Math.max(1, Math.min(99, parseInt(input.value, 10) || 1))); commitQty(input.closest('tr')); syncQtyButtons(input.closest('.quantity')); } });
  form.addEventListener('submit', (e) => e.preventDefault());

  // початковий стан
  render();
} finally { document.documentElement.removeAttribute('data-wc-pending'); } // наповнення готове — вміст і футер показуються (inline-скрипт cart.html ставить атрибут до paint)
