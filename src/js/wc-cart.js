// cart.html — симуляція шаблону WooCommerce cart/cart.php на реальному кошику сайту (localStorage 'ks_cart').
// Поведінка як у класичному WC: зміна кількості лише вмикає «Оновити кошик» (застосовується за натисканням), видалення — нотис з «Повернути», купон — нотис успіху/помилки.
// Стани: ?state=empty | updated | coupon-error | coupon-applied, ?demo=1 (демо-позиції в порожній кошик). Деталі — wc-common.js.
import {
  state, DEMO_COUPON, fmtMoney, fmtVol, qs, qsa, readCart, writeCart, renderCartCount, seedDemoIfNeeded, resolveLines,
  getCoupon, setCoupon, calcTotals, showNotice, clearNotices,
} from './wc-common.js';

const form = qs('.woocommerce-cart-form');
const filled = qsa('[data-wc-filled]');
const empty = qs('[data-wc-empty]');
const notices = qs('[data-wc-notices]');
const tbody = qs('tbody', form);
const actionsRow = qs('[data-wc-actions-row]', form);
const rowTpl = qs('#wc-tpl-row');
const couponField = qs('.coupon', form);
const couponInput = qs('#coupon_code', form);
const updateBtn = qs('[name="update_cart"]', form);
const forceEmpty = state === 'empty';
let removed = null; // { item, index } — для «Повернути»

seedDemoIfNeeded();

const setUpdateEnabled = (on) => { updateBtn.disabled = !on; updateBtn.setAttribute('aria-disabled', String(!on)); };

function renderTotals(lines) {
  const t = calcTotals(lines);
  qs('[data-wc-subtotal]').textContent = fmtMoney(t.subtotal);
  qs('[data-wc-total]').textContent = fmtMoney(t.total);
  qs('[data-wc-shipping]').textContent = t.free ? 'Безкоштовно' : 'За тарифом перевізника';
  const row = qs('.cart-discount');
  row.hidden = !t.discount;
  if (t.discount) {
    qs('th', row).textContent = `Купон: ${t.coupon}`;
    const td = qs('[data-wc-discount]', row);
    td.replaceChildren(`−${fmtMoney(t.discount)} `);
    const a = document.createElement('a');
    a.className = 'woocommerce-remove-coupon t-caption';
    a.href = '#';
    a.textContent = 'Видалити';
    a.dataset.wcRemoveCoupon = '';
    td.append(a);
  }
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
      qs('[data-wc-remove]', tr).setAttribute('aria-label', `Видалити «${l.name}»`);
      qs('[data-wc-price]', tr).textContent = fmtMoney(l.price);
      qs('[data-wc-subtotal-row]', tr).textContent = fmtMoney(l.subtotal);
      const input = qs('input.qty', tr);
      input.id = `cart_qty_${i}`;
      input.name = `cart[${l.index}][qty]`;
      input.value = String(l.qty);
      qs('label', tr).htmlFor = input.id;
      tbody.insertBefore(tr, actionsRow);
    });
    renderTotals(lines);
  }
  setUpdateEnabled(false);
  if (!forceEmpty) renderCartCount();
}

const save = (list) => { writeCart(list); render(); };

function applyUpdate() {
  const list = readCart();
  qsa('.cart_item', tbody).forEach((tr) => {
    const row = list[Number(tr.dataset.index)];
    if (row) row.qty = Math.max(1, Math.min(99, parseInt(qs('input.qty', tr).value, 10) || 1));
  });
  save(list);
  showNotice(notices, 'message', 'Кошик оновлено.', { focus: true });
}

function removeLine(tr) {
  const list = readCart();
  const index = Number(tr.dataset.index);
  const [item] = list.splice(index, 1);
  removed = { item, index };
  const line = resolveLines([item])[0];
  save(list);
  showNotice(notices, 'message-link', `«${line ? line.name : 'Товар'}» видалено.`, {
    href: '#', link: 'Повернути', focus: true,
    onClick: () => { const l = readCart(); l.splice(Math.min(removed.index, l.length), 0, removed.item); save(l); clearNotices(notices); },
  });
}

function applyCoupon() {
  const code = couponInput.value.trim().toUpperCase();
  couponField.classList.remove('is-invalid');
  couponInput.removeAttribute('aria-invalid');
  if (!code) { fail('Будь ласка, введіть код купона.'); return; }
  if (code === DEMO_COUPON.code) {
    setCoupon(code);
    couponInput.value = '';
    render();
    showNotice(notices, 'message', 'Купон застосовано.', { focus: true });
    return;
  }
  couponInput.value = code;
  fail(`Купон «${code}» не існує.`);
}
function fail(text, focus = true) {
  couponField.classList.add('is-invalid');
  couponInput.setAttribute('aria-invalid', 'true');
  showNotice(notices, 'error', text, { focus });
}

form.addEventListener('click', (e) => {
  const step = e.target.closest('[data-wc-qty-step]');
  if (step) {
    const input = qs('input.qty', step.closest('.quantity'));
    input.value = String(Math.max(1, Math.min(99, (parseInt(input.value, 10) || 1) + Number(step.dataset.wcQtyStep))));
    setUpdateEnabled(true);
    return;
  }
  const rm = e.target.closest('[data-wc-remove]');
  if (rm) { e.preventDefault(); removeLine(rm.closest('tr')); }
});
document.addEventListener('click', (e) => { // «Видалити» купон у підсумку (рядок cart-discount, поза формою)
  if (!e.target.closest('[data-wc-remove-coupon]')) return;
  e.preventDefault();
  setCoupon('');
  render();
  showNotice(notices, 'message', 'Купон видалено.', { focus: true });
});
form.addEventListener('input', (e) => { if (e.target.matches('input.qty')) setUpdateEnabled(true); });
couponInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } });
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = e.submitter && e.submitter.name;
  if (name === 'apply_coupon') applyCoupon();
  else if (name === 'update_cart' && !updateBtn.disabled) applyUpdate();
});

// початковий стан
if (state === 'coupon-applied' && !getCoupon()) setCoupon(DEMO_COUPON.code);
render();
if (state === 'updated') showNotice(notices, 'message', 'Кошик оновлено.');
if (state === 'coupon-error') { couponInput.value = 'SALE20'; fail('Купон «SALE20» не існує.', false); }
if (state === 'coupon-applied') showNotice(notices, 'message', 'Купон застосовано.');
