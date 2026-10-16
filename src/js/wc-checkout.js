// checkout.html — симуляція шаблонів WooCommerce checkout/form-checkout.php, review-order.php, payment.php, thankyou.php на реальному кошику сайту.
// Бекенду немає: «Підтвердити замовлення» перевіряє поля (як checkout.js WooCommerce: помилки зверху + .woocommerce-invalid у полях), зберігає знімок замовлення в sessionStorage,
// очищає кошик і веде на ?state=thanks. Стани: ?state=error (помилки валідації) | thanks (подяка) | empty (порожній кошик); ?demo=1 (демо-позиції). Довідники НП — src/data/checkout-demo.js (демо).
import { initSelect } from './select.js';
import {
  state, FREE_SHIPPING_FROM, fmtMoney, fmtVol, qs, qsa, readCart, writeCart, seedDemoIfNeeded, resolveLines, getCoupon, setCoupon, calcTotals,
} from './wc-common.js';
import { NP_AREAS, NP_CITIES, npWarehouses, npAddress, SHIPPING_LABELS, PAYMENT_LABELS } from '../data/checkout-demo.js';

const ORDER_KEY = 'ks_order'; // те саме значення — у wc-common.js (seedDemoIfNeeded)
seedDemoIfNeeded();

const views = Object.fromEntries(qsa('[data-wc-view]').map((v) => [v.dataset.wcView, v]));
const lines = resolveLines(readCart());
const view = state === 'thanks' ? 'thanks' : (state === 'empty' || !lines.length ? 'empty' : 'form');
Object.entries(views).forEach(([k, el]) => { if (k === view) el.hidden = false; else el.remove(); });

const rowTpl = qs('#wc-tpl-review-row');
function fillRows(tbody, list, extraClass = '') {
  tbody.replaceChildren(...list.map((l) => {
    const tr = rowTpl.content.firstElementChild.cloneNode(true);
    if (extraClass) tr.className = `${tr.className} ${extraClass}`;
    qs('[data-wc-name]', tr).textContent = l.name;
    qs('[data-wc-qty]', tr).textContent = String(l.qty);
    qs('[data-wc-volume]', tr).textContent = fmtVol(l.volume);
    qs('[data-wc-line-total]', tr).textContent = fmtMoney(l.subtotal);
    return tr;
  }));
}
function fillTotals(root, t, shippingText) {
  qs('[data-wc-subtotal]', root).textContent = fmtMoney(t.subtotal);
  qs('[data-wc-total]', root).textContent = fmtMoney(t.total);
  const row = qs('.cart-discount', root);
  row.hidden = !t.discount;
  if (t.discount) { qs('th', row).textContent = `Купон: ${t.coupon}`; qs('[data-wc-discount]', row).textContent = `−${fmtMoney(t.discount)}`; }
  const sh = qs('[data-wc-shipping]', root);
  if (sh) sh.textContent = shippingText;
}

try {
  if (view === 'form') initForm();
  if (view === 'thanks') initThanks();
} finally { document.documentElement.removeAttribute('data-wc-pending'); } // наповнення готове — вміст і футер показуються (inline-скрипт checkout.html ставить атрибут до paint)

function initForm() {
  const form = views.form;
  const notices = qs('[data-wc-notices]', form);
  const totals = calcTotals(lines);
  fillRows(qs('[data-wc-rows]', form), lines);
  fillTotals(form, totals, '');
  const noteEl = qs('[data-wc-shipping-note]', form);

  // ---------- Нова пошта: область → місто → відділення/поштомат (демо-довідники; лише їхня логіка залежності) ----------
  const wrap = (name) => qs(`#${name}_field`, form);
  const pristine = {};
  ['billing_state', 'billing_city', 'billing_warehouse'].forEach((n) => { pristine[n] = qs('.select', wrap(n)).cloneNode(true); });
  const setSelect = (name, options) => {
    const w = wrap(name);
    const fresh = pristine[name].cloneNode(true);
    qs('.select', w).replaceWith(fresh);
    qs('input[type="hidden"]', w).value = '';
    initSelect(fresh, { options });
  };
  setSelect('billing_state', NP_AREAS);
  setSelect('billing_city', []);
  setSelect('billing_warehouse', []);
  form.addEventListener('select-change', (e) => {
    const w = e.target.closest('.form-row');
    if (!w) return;
    const name = w.dataset.field;
    qs('input[type="hidden"]', w).value = e.detail.value;
    if (name === 'billing_state') {
      setSelect('billing_city', (NP_CITIES[e.detail.value] || []).map((c) => ({ value: c, label: c })));
      setSelect('billing_warehouse', []);
    } else if (name === 'billing_city') {
      setSelect('billing_warehouse', npWarehouses());
    }
    if (submitted) validate(false);
  });

  // ---------- доставка / оплата ----------
  const method = () => qs('input[name="shipping_method[0]"]:checked', form).value;
  const shipNote = (m) => ({
    np: totals.free ? `Доставка безкоштовна (від ${fmtMoney(FREE_SHIPPING_FROM)}).` : `За тарифом перевізника; безкоштовно від ${fmtMoney(FREE_SHIPPING_FROM)}.`,
    courier: 'Вартість доставки по Києву розраховується окремо.',
    pickup: 'Адресу дистилерії дивіться на сторінці «Контакти».',
  }[m]);
  const applyShipping = () => {
    const m = method();
    noteEl.textContent = shipNote(m);
    qsa('[data-wc-for]', form).forEach((el) => { el.hidden = el.dataset.wcFor !== m; });
  };
  const applyPayment = () => {
    const p = qs('input[name="payment_method"]:checked', form).value;
    qsa('.wc_payment_method', form).forEach((li) => { qs('.payment_box', li).hidden = !li.classList.contains(`payment_method_${p}`); });
  };
  form.addEventListener('change', (e) => {
    if (e.target.name === 'shipping_method[0]') { applyShipping(); if (submitted) validate(false); }
    if (e.target.name === 'payment_method') applyPayment();
  });
  applyShipping();
  applyPayment();

  // ---------- валідація ----------
  const PHONE_RE = /^[\d\s()+\-.]+$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const digits = (s) => s.replace(/\D/g, '');
  const field = (name) => qs(`[name="${name}"]`, form); // у select-полів id кнопки = name, тож form.elements[name] дав би список
  const val = (name) => (field(name)?.value || '').trim();
  const RULES = [
    { name: 'billing_first_name', label: 'Ім\'я', test: (v) => v.length >= 2 },
    { name: 'billing_last_name', label: 'Прізвище', test: (v) => v.length >= 2 },
    { name: 'billing_phone', label: 'Телефон', test: (v) => !!v, bad: (v) => !(PHONE_RE.test(v) && digits(v).length >= 9 && digits(v).length <= 15), badMsg: 'вкажіть номер у форматі +380…' },
    { name: 'billing_email', label: 'E-mail', test: (v) => !!v, bad: (v) => !EMAIL_RE.test(v), badMsg: 'перевірте адресу e-mail' },
    { name: 'billing_state', label: 'Область', test: (v) => !!v },
    { name: 'billing_city', label: 'Місто', test: (v) => !!v },
    { name: 'billing_warehouse', label: 'Відділення або поштомат', test: (v) => !!v },
    { name: 'billing_address_1', label: 'Адреса доставки', test: (v) => v.length >= 5 },
    { name: 'terms', label: 'Умови та оферта', check: true, msg: 'потрібна ваша згода з умовами' },
    { name: 'age_confirm', label: 'Підтвердження віку 18+', check: true, msg: 'підтвердіть, що вам виповнилося 18 років' },
  ];
  const controlOf = (name) => (qs(`#${name}_field .select__button`, form) || field(name));
  const paint = (name, msg) => {
    const w = wrap(name);
    w.classList.toggle('is-invalid', !!msg);
    w.classList.toggle('woocommerce-invalid', !!msg);
    w.classList.toggle('woocommerce-invalid-required-field', !!msg);
    const err = qs('.field__error > span', w);
    if (err) err.textContent = msg || '';
    const c = controlOf(name);
    if (msg) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid');
  };
  let submitted = false;
  function validate(focusFirst) {
    const errors = [];
    RULES.forEach((r) => {
      const w = wrap(r.name);
      if (!w || w.hidden) { if (w) paint(r.name, ''); return; }
      let short = '';
      let long = '';
      if (r.check) {
        if (!field(r.name).checked) { short = r.msg[0].toUpperCase() + r.msg.slice(1); long = `${r.label} — ${r.msg}.`; }
      } else {
        const v = val(r.name);
        if (!r.test(v)) { short = 'Обов\'язкове поле'; long = `${r.label} — обов'язкове поле.`; }
        else if (r.bad && r.bad(v)) { short = r.badMsg[0].toUpperCase() + r.badMsg.slice(1); long = `${r.label} — ${r.badMsg}.`; }
      }
      paint(r.name, short);
      if (short) errors.push({ name: r.name, long });
    });
    renderGroup(errors);
    if (errors.length && focusFirst) controlOf(errors[0].name).focus();
    return errors.length === 0;
  }
  function renderGroup(errors) {
    if (!errors.length) { notices.replaceChildren(); return; }
    const ul = qs('#wc-tpl-error').content.firstElementChild.cloneNode(true);
    ul.replaceChildren(...errors.map((e) => {
      const li = document.createElement('li');
      li.dataset.id = e.name;
      const a = document.createElement('a');
      a.href = `#${e.name}`;
      a.textContent = e.long;
      li.append(a);
      return li;
    }));
    notices.replaceChildren(ul);
  }
  notices.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    controlOf(a.getAttribute('href').slice(1))?.focus();
  });
  form.addEventListener('input', () => { if (submitted) validate(false); });
  form.addEventListener('change', (e) => { if (submitted && e.target.type === 'checkbox') validate(false); });

  // ---------- відправка → знімок замовлення → подяка ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitted = true;
    if (!validate(true)) return;
    const m = method();
    const area = qs('#billing_state_field .select__value', form)?.textContent;
    const city = qs('#billing_city_field .select__value', form)?.textContent;
    const wh = qs('#billing_warehouse_field .select__value', form)?.textContent;
    const delivery = m === 'np' ? npAddress(area, city, wh) : m === 'courier' ? `Київ, ${val('billing_address_1')}` : SHIPPING_LABELS.pickup;
    const order = {
      number: String(10000 + Math.floor(Math.random() * 9000)),
      date: new Date().toISOString(),
      name: `${val('billing_first_name')} ${val('billing_last_name')}`,
      phone: val('billing_phone'), email: val('billing_email'),
      shipping: m, delivery, payment: qs('input[name="payment_method"]:checked', form).value,
      lines, coupon: totals.coupon,
    };
    try { sessionStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch { /* без збереження: подяка покаже демо-дані */ }
    writeCart([]);
    setCoupon('');
    const next = new URLSearchParams(location.search);
    next.delete('demo');
    next.set('state', 'thanks');
    location.href = `checkout.html?${next}`;
  });

  // ---------- стан «помилки валідації» (?state=error): частково заповнена форма → та сама перевірка, що при відправці ----------
  if (state === 'error') {
    field('billing_first_name').value = 'Олена';
    field('billing_email').value = 'olena@';
    submitted = true;
    validate(false);
  }
}

function initThanks() {
  const root = views.thanks;
  let order = null;
  try { order = JSON.parse(sessionStorage.getItem(ORDER_KEY) || 'null'); } catch { /* демо */ }
  if (!order) {
    const demoLines = resolveLines(readCart());
    order = {
      number: '10427', date: new Date().toISOString(), name: 'Олена Коваленко', phone: '+380 50 123 45 67', email: 'name@example.com',
      shipping: 'np', delivery: 'Київська область, Бровари, Відділення №1', payment: 'card', lines: demoLines, coupon: getCoupon(),
    };
  }
  const t = calcTotals(order.lines, order.coupon);
  qs('[data-wc-order-number]', root).textContent = order.number;
  qs('[data-wc-order-date]', root).textContent = new Date(order.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  qs('[data-wc-order-email]', root).textContent = order.email;
  qs('[data-wc-order-total]', root).textContent = fmtMoney(t.total);
  qs('[data-wc-order-method]', root).textContent = PAYMENT_LABELS[order.payment] || PAYMENT_LABELS.card;
  fillRows(qs('[data-wc-rows]', root), order.lines, 'woocommerce-table__line-item order_item');
  fillTotals(root, t, order.shipping === 'np' && !t.free ? 'За тарифом перевізника' : (order.shipping === 'np' ? 'Безкоштовно' : SHIPPING_LABELS[order.shipping]));
  const addr = qs('[data-wc-address]', root);
  const parts = [order.name, order.phone, order.email, order.delivery];
  addr.replaceChildren(...parts.flatMap((p, i) => (i ? [document.createElement('br'), p] : [p])));
}
