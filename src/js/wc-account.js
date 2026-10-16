// account.html — СИМУЛЯЦІЯ шаблонів WooCommerce «Мій кабінет» (myaccount/*, order/form-tracking.php, tracking.php) без бекенду.
// Вхід — ДЕМО: будь-які непорожні логін і пароль → «увійшов» (sessionStorage ks_account). Справжній вхід, замовлення, нотатки й ТТН віддасть WooCommerce та плагін «Нової пошти».
// Який екран показати, вирішує inline-скрипт у account.html (до першого paint) і кладе результат у data-wc-active-* на .woocommerce; тут — наповнення, обробка форм і прибирання зайвого.
// Стани (?state=): login · login-error · lost · lost-sent · register · register-error · logout · dashboard · orders (&page=N) · empty-orders · order-view (&order=№) · tracking · tracking-result (&order=№) · tracking-error ·
// addresses · addresses-saved · account · account-saved · account-error; &guest=1 (tracking*) — відстеження без входу. Усі стани «усередині кабінету» самі вмикають демо-вхід.
import { initSelect } from './select.js';
import { query, state, fmtMoney, fmtVol, qs, qsa, resolveLines, calcTotals, showNotice, syncNativeSelect } from './wc-common.js';
import { DEMO_USER, ORDERS, STATUS, TRACK_STEPS, NOVA_POSHTA_TRACKING, ORDERS_PER_PAGE } from '../data/account-demo.js';
import { NP_AREAS, NP_CITIES, npWarehouses, SHIPPING_LABELS, PAYMENT_LABELS } from '../data/checkout-demo.js';

const SESSION_KEY = 'ks_account'; // { login, at } — є = «увійшов»
const USER_KEY = 'ks_account_user'; // збережені в демо зміни (ім'я, e-mail, телефон, адреса)
const FLASH_KEY = 'ks_account_flash'; // одноразове повідомлення після переходу (реєстрація)
const PHONE_RE = /^[\d\s()+\-.]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const root = qs('.woocommerce');
const view = root.dataset.wcActiveView;
const layout = root.dataset.wcActiveLayout;
const guestNav = root.dataset.wcActiveNav === 'guest';
const guestMode = layout === 'account' && guestNav;

// ---------- сховище (демо) ----------
const store = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* без збереження */ } },
  del: (k) => { try { sessionStorage.removeItem(k); } catch { /* без збереження */ } },
};
const isAuth = () => !!store.get(SESSION_KEY);
const login = (name) => store.set(SESSION_KEY, JSON.stringify({ login: name, at: Date.now() }));
const getUser = () => { try { return { ...DEMO_USER, ...JSON.parse(store.get(USER_KEY) || '{}') }; } catch { return { ...DEMO_USER }; } };
const saveUser = (patch) => store.set(USER_KEY, JSON.stringify({ ...JSON.parse(store.get(USER_KEY) || '{}'), ...patch }));

if (state === 'logout') { store.del(SESSION_KEY); store.del(USER_KEY); }
else if (layout === 'account' && !guestMode && !isAuth()) login(DEMO_USER.email); // стан усередині кабінету → демо-вхід, далі навігація працює

// ---------- прибираємо зайві екрани (одна розмітка = один стан) ----------
qsa('[data-wc-layout]', root).forEach((el) => { if (el.dataset.wcLayout !== layout) el.remove(); });
qsa('[data-wc-view]', root).forEach((el) => { if (el.dataset.wcView !== view) el.remove(); else el.hidden = false; });
qsa('[data-wc-nav]', root).forEach((el) => { if (el.dataset.wcNav !== root.dataset.wcActiveNav) el.remove(); else el.hidden = false; });
const section = qs(`[data-wc-view="${view}"]`, root);
const notices = qs('[data-wc-notices]', section);
if (layout === 'account') qs('[data-wc-layout="account"]', root).hidden = false; else qs('[data-wc-layout="guest"]', root).hidden = false;

// ---------- спільне: дати, суми, нотиси, валідація ----------
const fmtDate = (iso) => new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
const fmtWhen = (iso) => `${new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}, ${fmtTime(iso)}`;
const plural = (n) => { const m = n % 100; const d = n % 10; return m > 10 && m < 15 ? 'товарів' : d === 1 ? 'товар' : d > 1 && d < 5 ? 'товари' : 'товарів'; };
const findOrder = (num) => ORDERS.find((o) => o.number === String(num).replace(/^#/, '').trim());
const orderTotals = (o) => { const lines = resolveLines(o.lines); return { lines, t: calcTotals(lines, o.coupon), count: lines.reduce((s, l) => s + l.qty, 0) }; };
const shippingText = (o, t) => (o.shipping === 'np' ? (t.free ? 'Безкоштовно' : 'За тарифом перевізника') : SHIPPING_LABELS[o.shipping]);
const withGuest = (url) => (guestMode ? `${url}&guest=1` : url);
const note = (kind, text) => showNotice(notices, kind, text, { focus: true });
const noteQuiet = (kind, text) => showNotice(notices, kind, text);

// список помилок зверху (ul.woocommerce-error: кожен рядок — посилання на поле) + помилки під полями (.field__error), як у checkout
function createValidator(form, rules) {
  const wrap = (name) => qs(`#${name}_field`, form);
  const field = (name) => qs(`#${name}`, form); // id поля (у реєстрації id=reg_email|reg_password, name=email|password — як у form-login.php WooCommerce; у select-полів це прихований справжній <select>)
  const controlOf = (name) => qs(`#${name}_field .select__button`, form) || field(name);
  const paint = (name, msg, flag = !!msg) => {
    const w = wrap(name);
    w.classList.toggle('is-invalid', flag);
    w.classList.toggle('woocommerce-invalid', flag);
    const err = qs('.field__error > span', w);
    if (err) err.textContent = msg || '';
    const c = controlOf(name);
    if (flag) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid');
  };
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  function renderGroup(errors, extra = []) {
    const all = [...extra.map((text) => ({ text })), ...errors.map((e) => ({ name: e.name, text: e.long }))];
    if (!all.length) { notices.replaceChildren(); return; }
    const ul = qs('#wc-tpl-error').content.firstElementChild.cloneNode(true);
    ul.replaceChildren(...all.map((e) => {
      const li = document.createElement('li');
      if (e.name) {
        li.dataset.id = e.name;
        const a = document.createElement('a');
        a.href = `#${e.name}`;
        a.textContent = e.text;
        li.append(a);
      } else li.textContent = e.text;
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
  let submitted = false;
  function validate(focusFirst, extra = []) {
    const errors = [];
    rules.forEach((r) => {
      const w = wrap(r.name);
      if (!w || w.hidden) return;
      const v = r.check ? (field(r.name).checked ? 'on' : '') : (field(r.name).value || '').trim();
      let short = '';
      let long = '';
      if (r.check ? !v : !(r.test ? r.test(v) : !!v)) { short = r.check ? cap(r.msg) : 'Обов\'язкове поле'; long = r.check ? `${r.label} — ${r.msg}.` : `${r.label} — обов'язкове поле.`; }
      else if (r.bad && r.bad(v)) { short = cap(r.badMsg); long = `${r.label} — ${r.badMsg}.`; }
      paint(r.name, short);
      if (short) errors.push({ name: r.name, long });
    });
    renderGroup(errors, extra);
    if (errors.length && focusFirst) controlOf(errors[0].name).focus();
    return errors.length === 0;
  }
  form.addEventListener('input', () => { if (submitted) validate(false); });
  form.addEventListener('change', () => { if (submitted) validate(false); });
  return {
    validate: (focusFirst = true) => { submitted = true; return validate(focusFirst); },
    paint, field, wrap, controlOf, renderGroup,
    fail(name, short, long, focus = true) { paint(name, short); renderGroup([{ name, long }]); if (focus) controlOf(name).focus(); },
  };
}

// ---------- склад замовлення (order/order-details.php + order-details-customer.php) ----------
function fillOrderDetails(host, o) {
  const frag = qs('#wc-tpl-order-details').content.cloneNode(true);
  const { lines, t } = orderTotals(o);
  const rowTpl = qs('#wc-tpl-order-item');
  qs('[data-wc-rows]', frag).replaceChildren(...lines.map((l) => {
    const tr = rowTpl.content.firstElementChild.cloneNode(true);
    const a = qs('[data-wc-link]', tr);
    a.href = l.url;
    a.textContent = l.name;
    qs('[data-wc-qty]', tr).textContent = String(l.qty);
    qs('[data-wc-volume]', tr).textContent = fmtVol(l.volume);
    qs('[data-wc-line-total]', tr).textContent = fmtMoney(l.subtotal);
    return tr;
  }));
  qs('[data-wc-subtotal]', frag).textContent = fmtMoney(t.subtotal);
  qs('[data-wc-total]', frag).textContent = fmtMoney(t.total);
  qs('[data-wc-shipping]', frag).textContent = shippingText(o, t);
  qs('[data-wc-payment]', frag).textContent = PAYMENT_LABELS[o.payment];
  const row = qs('.cart-discount', frag);
  row.hidden = !t.discount;
  if (t.discount) { qs('th', row).textContent = `Купон: ${t.coupon}`; qs('[data-wc-discount]', row).textContent = `−${fmtMoney(t.discount)}`; }
  const lineBreaks = (parts) => parts.flatMap((p, i) => (i ? [document.createElement('br'), p] : [p]));
  qs('[data-wc-customer]', frag).replaceChildren(...lineBreaks([o.customer.name, o.customer.phone, o.customer.email]));
  qs('[data-wc-delivery]', frag).replaceChildren(...lineBreaks([SHIPPING_LABELS[o.shipping], o.customer.delivery]));
  host.replaceChildren(frag);
}

function fillNotes(root2, o) {
  const wrap = qs('[data-wc-notes-wrap]', root2);
  if (!o.notes.length) { wrap.remove(); return; }
  const tpl = qs('#wc-tpl-note');
  qs('[data-wc-notes]', wrap).replaceChildren(...o.notes.map((n) => {
    const li = tpl.content.firstElementChild.cloneNode(true);
    qs('[data-wc-note-text]', li).textContent = n.text;
    const p = qs('[data-wc-note-date]', li);
    p.textContent = fmtWhen(n.at);
    return li;
  }));
}

function fillOverview(root2, o) {
  qsa('[data-wc-order-number]', root2).forEach((el) => { el.textContent = o.number; });
  qsa('[data-wc-order-date]', root2).forEach((el) => { el.textContent = fmtDate(o.date); });
  qsa('[data-wc-order-status]', root2).forEach((el) => { el.textContent = STATUS[o.status].label; });
  const tot = qs('[data-wc-order-total]', root2);
  if (tot) tot.textContent = `${fmtMoney(orderTotals(o).t.total)} за ${orderTotals(o).count} ${plural(orderTotals(o).count)}`;
}

// ---------- таблиця замовлень (myaccount/orders.php) ----------
function fillOrdersRows(tbody, list) {
  const tpl = qs('#wc-tpl-order-row');
  tbody.replaceChildren(...list.map((o) => {
    const tr = tpl.content.firstElementChild.cloneNode(true);
    tr.classList.add(`woocommerce-orders-table__row--status-${o.status}`);
    const a = qs('[data-wc-number]', tr);
    a.href = `account.html?state=order-view&order=${o.number}`;
    a.textContent = `№${o.number}`;
    a.setAttribute('aria-label', `Замовлення №${o.number}`);
    const time = qs('time', tr);
    time.dateTime = o.date;
    time.textContent = fmtDate(o.date);
    qs('[data-wc-status]', tr).textContent = STATUS[o.status].label;
    const { t, count } = orderTotals(o);
    qs('[data-wc-total]', tr).textContent = fmtMoney(t.total);
    qs('[data-wc-count]', tr).textContent = `за ${count} ${plural(count)}`;
    const v = qs('[data-wc-view-link]', tr);
    v.href = `account.html?state=order-view&order=${o.number}`;
    v.setAttribute('aria-label', `Переглянути замовлення №${o.number}`);
    return tr;
  }));
}

// ---------- екрани ----------
const INIT = {
  login() {
    const form = qs('form', section);
    const v = createValidator(form, [
      { name: 'username', label: 'Логін або e-mail', test: (x) => !!x },
      { name: 'password', label: 'Пароль', test: (x) => !!x },
    ]);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!v.validate(true)) return;
      login(v.field('username').value.trim());
      location.href = 'account.html';
    });
    if (state === 'login-error') {
      v.field('username').value = 'olena@example.com';
      v.renderGroup([], ['Невірний логін або пароль. Перевірте дані й спробуйте ще раз.']);
      v.paint('password', '', true);
      v.paint('username', '', true);
    } else if (state === 'logout') noteQuiet('message', 'Ви вийшли з акаунта.');
  },
  lost() {
    const form = qs('form', section);
    const done = qs('[data-wc-lost-done]', section);
    const v = createValidator(form, [{ name: 'user_login', label: 'Логін або e-mail', test: (x) => !!x }]);
    const showDone = () => { form.hidden = true; done.hidden = false; };
    form.addEventListener('submit', (e) => { e.preventDefault(); if (v.validate(true)) showDone(); });
    if (state === 'lost-sent') showDone();
  },
  register() {
    const form = qs('form', section);
    const v = createValidator(form, [
      { name: 'reg_email', label: 'E-mail', test: (x) => !!x, bad: (x) => !EMAIL_RE.test(x), badMsg: 'перевірте адресу e-mail' },
      { name: 'reg_password', label: 'Пароль', test: (x) => !!x, bad: (x) => x.length < 8, badMsg: 'не менше 8 символів' },
      { name: 'reg_consent', label: 'Політика конфіденційності й оферта', check: true, msg: 'потрібна ваша згода' },
    ]);
    const exists = (focus = true) => v.fail('reg_email', 'Цей e-mail уже зареєстровано', 'E-mail — акаунт із такою адресою вже зареєстровано. Увійдіть або відновіть пароль.', focus);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!v.validate(true)) return;
      const email = v.field('reg_email').value.trim().toLowerCase();
      if (email === DEMO_USER.email) { exists(); return; }
      login(email);
      store.set(FLASH_KEY, 'registered');
      location.href = 'account.html';
    });
    if (state === 'register-error') {
      v.field('reg_email').value = DEMO_USER.email;
      v.field('reg_password').value = 'password123';
      v.field('reg_consent').checked = true;
      exists(false);
    }
  },
  dashboard() {
    const u = getUser();
    qs('[data-wc-user-name]', section).textContent = u.first;
    fillOrdersRows(qs('[data-wc-orders-rows]', section), ORDERS.slice(0, 3));
    if (store.get(FLASH_KEY)) { store.del(FLASH_KEY); noteQuiet('message', 'Акаунт створено. Ласкаво просимо!'); }
  },
  orders() {
    const empty = state === 'empty-orders';
    const list = empty ? [] : ORDERS;
    const pages = Math.max(1, Math.ceil(list.length / ORDERS_PER_PAGE));
    const page = Math.min(pages, Math.max(1, parseInt(query.get('page'), 10) || 1));
    qs('[data-wc-orders-list]', section).hidden = !list.length;
    qs('[data-wc-orders-empty]', section).hidden = !!list.length;
    if (!list.length) return;
    fillOrdersRows(qs('[data-wc-orders-rows]', section), list.slice((page - 1) * ORDERS_PER_PAGE, page * ORDERS_PER_PAGE));
    const nav = qs('[data-wc-pagination]', section);
    const prev = qs('[data-wc-prev]', nav);
    const next = qs('[data-wc-next]', nav);
    prev.hidden = page <= 1;
    next.hidden = page >= pages;
    prev.href = `account.html?state=orders${page - 1 > 1 ? `&page=${page - 1}` : ''}`;
    next.href = `account.html?state=orders&page=${page + 1}`;
    if (pages < 2) nav.remove();
  },
  'order-view'() {
    const asked = query.get('order');
    const o = findOrder(asked) || (asked ? null : ORDERS[1]); // без &order — демо-замовлення; невідомий номер — «не знайдено» (як view-order.php WooCommerce: нотис «Замовлення не знайдено»)
    if (!o) {
      qs('h1', section).textContent = 'Замовлення не знайдено';
      qsa('.woocommerce-order-overview, .wc-actions, [data-wc-notes-wrap], [data-wc-order-details]', section).forEach((el) => el.remove());
      qs('[data-wc-order-missing]', section).hidden = false;
      return;
    }
    qs('[data-wc-order-missing]', section).remove();
    fillOverview(section, o);
    const track = qs('[data-wc-track-link]', section);
    if (o.status === 'cancelled') track.remove(); else track.href = `account.html?state=tracking-result&order=${o.number}`;
    fillNotes(section, o);
    fillOrderDetails(qs('[data-wc-order-details]', section), o);
  },
  tracking() {
    const form = qs('form', section);
    const v = createValidator(form, [
      { name: 'orderid', label: 'Номер замовлення', test: (x) => !!x },
      { name: 'order_email', label: 'E-mail', test: (x) => !!x, bad: (x) => !EMAIL_RE.test(x), badMsg: 'перевірте адресу e-mail' },
    ]);
    const notFound = () => {
      v.paint('orderid', '', true);
      v.paint('order_email', '', true);
      v.renderGroup([], ['Не вдалося знайти замовлення з такими даними. Перевірте номер і e-mail із листа-підтвердження.']);
    };
    if (!guestMode) v.field('order_email').value = getUser().email;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!v.validate(true)) return;
      const o = findOrder(v.field('orderid').value);
      if (!o || o.customer.email.toLowerCase() !== v.field('order_email').value.trim().toLowerCase()) { notFound(); v.field('orderid').focus(); return; }
      location.href = withGuest(`account.html?state=tracking-result&order=${o.number}`);
    });
    if (state === 'tracking-error') { v.field('orderid').value = '99999'; v.field('order_email').value = getUser().email; notFound(); }
  },
  'tracking-result'() {
    const asked = query.get('order');
    const o = findOrder(asked || '10388');
    if (!o) { location.replace(withGuest('account.html?state=tracking-error')); return; }
    fillOverview(section, o);
    qs('[data-wc-track-again]', section).href = withGuest('account.html?state=tracking');
    const step = STATUS[o.status].step;
    const wrap = qs('[data-wc-timeline-wrap]', section);
    if (step < 0) {
      wrap.remove();
      qs('[data-wc-cancelled]', section).hidden = false;
      qs('[data-wc-ttn-wrap]', section).remove();
    } else {
      qs('[data-wc-cancelled]', section).remove();
      const tpl = qs('#wc-tpl-step');
      qs('[data-wc-steps]', section).replaceChildren(...TRACK_STEPS.map((label, i) => {
        const li = tpl.content.firstElementChild.cloneNode(true);
        qs('.cocktail__step-n', li).textContent = String(i + 1);
        const lab = qs('[data-wc-step-label]', li);
        lab.textContent = label;
        const when = qs('[data-wc-step-when]', li);
        const at = o.events[i];
        if (i < step) when.textContent = at ? `— ${fmtWhen(at)}` : '';
        else if (i === step) {
          li.setAttribute('aria-current', 'step');
          lab.classList.replace('t-text', 't-product-name');
          when.textContent = i === TRACK_STEPS.length - 1 ? `— отримано ${at ? fmtWhen(at) : ''}`.trim() : `— поточний етап${at ? `, ${fmtWhen(at)}` : ''}`;
        } else when.textContent = '';
        return li;
      }));
      const link = qs('[data-wc-ttn-link]', section);
      const text = qs('[data-wc-ttn-text]', section);
      if (o.ttn && step >= 3) {
        text.replaceChildren('Номер експрес-накладної: ', Object.assign(document.createElement('strong'), { className: 't-spec', textContent: o.ttn }));
        link.href = `${NOVA_POSHTA_TRACKING}${o.ttn}`;
        link.hidden = false;
      } else text.textContent = 'Номер експрес-накладної з\'явиться після передачі замовлення «Новій пошті».';
    }
    fillNotes(section, o);
    fillOrderDetails(qs('[data-wc-order-details]', section), o);
  },
  addresses() {
    const form = qs('form', section);
    const u = getUser();
    const pristine = {};
    ['billing_state', 'billing_city', 'billing_warehouse'].forEach((n) => { pristine[n] = qs('.select', qs(`#${n}_field`, form)).cloneNode(true); });
    const setSelect = (name, options, value) => {
      const w = qs(`#${name}_field`, form);
      qs('.select', w).replaceWith(pristine[name].cloneNode(true));
      syncNativeSelect(w, options, value);
      initSelect(qs('.select', w), { options, value });
    };
    const cityOpts = (a) => (NP_CITIES[a] || []).map((c) => ({ value: c, label: c }));
    const a = u.address;
    setSelect('billing_state', NP_AREAS, a.area);
    setSelect('billing_city', cityOpts(a.area), a.city);
    setSelect('billing_warehouse', npWarehouses(), a.warehouse);
    qs('#billing_first_name', form).value = u.first;
    qs('#billing_last_name', form).value = u.last;
    qs('#billing_phone', form).value = u.phone;
    form.addEventListener('select-change', (e) => {
      const w = e.target.closest('.form-row');
      if (!w) return;
      qs('select', w).value = e.detail.value;
      if (w.dataset.field === 'billing_state') { setSelect('billing_city', cityOpts(e.detail.value)); setSelect('billing_warehouse', []); }
      else if (w.dataset.field === 'billing_city') setSelect('billing_warehouse', npWarehouses());
    });
    const v = createValidator(form, [
      { name: 'billing_first_name', label: 'Ім\'я', test: (x) => x.length >= 2 },
      { name: 'billing_last_name', label: 'Прізвище', test: (x) => x.length >= 2 },
      { name: 'billing_phone', label: 'Телефон', test: (x) => !!x, bad: (x) => !(PHONE_RE.test(x) && x.replace(/\D/g, '').length >= 9 && x.replace(/\D/g, '').length <= 15), badMsg: 'вкажіть номер у форматі +380…' },
      { name: 'billing_state', label: 'Область', test: (x) => !!x },
      { name: 'billing_city', label: 'Місто', test: (x) => !!x },
      { name: 'billing_warehouse', label: 'Відділення або поштомат', test: (x) => !!x },
    ]);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!v.validate(true)) return;
      saveUser({
        first: v.field('billing_first_name').value.trim(), last: v.field('billing_last_name').value.trim(), phone: v.field('billing_phone').value.trim(),
        address: { area: v.field('billing_state').value, city: v.field('billing_city').value, warehouse: v.field('billing_warehouse').value },
      });
      note('message', 'Адресу збережено.');
    });
    if (state === 'addresses-saved') noteQuiet('message', 'Адресу збережено.');
  },
  account() {
    const form = qs('form', section);
    const u = getUser();
    qs('#account_first_name', form).value = u.first;
    qs('#account_last_name', form).value = u.last;
    qs('#account_display_name', form).value = u.display || `${u.first} ${u.last}`;
    qs('#account_email', form).value = u.email;
    const pw = () => ['password_current', 'password_1', 'password_2'].some((n) => qs(`#${n}`, form).value);
    const v = createValidator(form, [
      { name: 'account_first_name', label: 'Ім\'я', test: (x) => x.length >= 2 },
      { name: 'account_last_name', label: 'Прізвище', test: (x) => x.length >= 2 },
      { name: 'account_display_name', label: 'Відображуване ім\'я', test: (x) => x.length >= 2 },
      { name: 'account_email', label: 'E-mail', test: (x) => !!x, bad: (x) => !EMAIL_RE.test(x), badMsg: 'перевірте адресу e-mail' },
      { name: 'password_current', label: 'Поточний пароль', test: (x) => !!x || !pw() },
      { name: 'password_1', label: 'Новий пароль', test: (x) => !!x || !pw(), bad: (x) => !!x && x.length < 8, badMsg: 'не менше 8 символів' },
    ]);
    const mismatch = (focus = true) => v.fail('password_2', 'Паролі не збігаються', 'Підтвердження пароля — паролі не збігаються.', focus);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!v.validate(true)) return;
      if (pw() && qs('#password_1', form).value !== qs('#password_2', form).value) { mismatch(); return; }
      saveUser({ first: qs('#account_first_name', form).value.trim(), last: qs('#account_last_name', form).value.trim(), display: qs('#account_display_name', form).value.trim(), email: qs('#account_email', form).value.trim() });
      ['password_current', 'password_1', 'password_2'].forEach((n) => { qs(`#${n}`, form).value = ''; });
      note('message', 'Зміни збережено.');
    });
    if (state === 'account-saved') noteQuiet('message', 'Зміни збережено.');
    if (state === 'account-error') {
      qs('#password_current', form).value = 'oldpassword';
      qs('#password_1', form).value = 'newpassword1';
      qs('#password_2', form).value = 'newpassword2';
      mismatch(false);
    }
  },
};

try { INIT[view]?.(); } finally { document.documentElement.removeAttribute('data-wc-pending'); }
document.title = `${qs('h1', section).textContent.trim()} — YasnoCraft × Bazylsprings`;
