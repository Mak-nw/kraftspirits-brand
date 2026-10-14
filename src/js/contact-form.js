// Сторінка «Контакти»: форма зворотного зв'язку (валідація, відправка, успіх) і передвибір теми з ?topic=… (#form).
// Дані (теми, e-mail) — src/data/contacts.js. Бекенду на статичному хостингу немає, тому канал відправки один і конфігурований:
//  • VITE_FORM_ENDPOINT задано (змінна середовища збірки) → POST JSON на цей URL (Formspree/Getform/власний/Telegram-проксі), очікується 2xx;
//  • не задано (зараз) → чесний запасний канал: відкривається поштовий клієнт із готовим листом (mailto: на e-mail із contacts.js).
// Дані форми не зберігаються й не логуються.
import { initSelect } from './select.js';
import { contacts } from '../data/contacts.js';

const ENDPOINT = (import.meta.env.VITE_FORM_ENDPOINT || '').trim();
const MSG_MAX = 1500; // обрізання тексту в mailto (ліміт довжини URL у поштових клієнтах)

const form = document.getElementById('contact-form');
if (form) init();

function init() {
  const aside = document.getElementById('form');
  const success = aside.querySelector('[data-success]');
  const successTitle = success.querySelector('[data-success-title]');
  const successText = success.querySelector('[data-success-text]');
  const submitBtn = form.querySelector('[data-submit]');
  const submitLabel = form.querySelector('[data-submit-label]');
  const alertEl = form.querySelector('[data-form-alert]');
  const selectEl = form.querySelector('[data-select="topic"]');
  const topicBtn = selectEl.querySelector('.select__button');
  const select = initSelect(selectEl);
  const el = (name) => form.elements[name];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let submitted = false;

  topicBtn.setAttribute('aria-describedby', 'contact-topic-error');
  const topicLabel = (value) => contacts.topics.find((t) => t.value === value)?.label || '';

  // ---------- валідація ----------
  const PHONE_RE = /^[\d\s()+\-.]+$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const digits = (s) => s.replace(/\D/g, '');
  const controlOf = (name) => (name === 'topic' ? topicBtn : name === 'consent' ? el('consent') : el(name));
  const wrapOf = (name) => form.querySelector(`[data-field="${name}"]`);
  const errorOf = (name) => wrapOf(name).querySelector('.field__error > span');

  // повертає { поле: повідомлення } для невалідних; phone/email — спільне правило «хоча б одне»
  const check = () => {
    const errors = {};
    if (!select.value) errors.topic = 'Оберіть тему звернення';
    if (el('name').value.trim().length < 2) errors.name = 'Вкажіть, як до вас звертатись';
    const phone = el('phone').value.trim();
    const email = el('email').value.trim();
    if (!phone && !email) {
      errors.phone = 'Вкажіть телефон або e-mail, щоб ми могли відповісти';
      errors.email = errors.phone;
    } else {
      if (phone && !(PHONE_RE.test(phone) && digits(phone).length >= 9 && digits(phone).length <= 15)) errors.phone = 'Перевірте номер телефону';
      if (email && !EMAIL_RE.test(email)) errors.email = 'Перевірте адресу e-mail';
    }
    if (el('message').value.trim().length < 3) errors.message = 'Напишіть кілька слів про ваше питання';
    if (!el('consent').checked) errors.consent = 'Потрібна ваша згода, щоб надіслати звернення';
    return errors;
  };
  const ORDER = ['topic', 'name', 'phone', 'email', 'message', 'consent'];
  const paint = (name, msg) => {
    const wrap = wrapOf(name);
    const ctl = controlOf(name);
    wrap.classList.toggle('is-invalid', Boolean(msg));
    if (msg) { errorOf(name).textContent = msg; ctl.setAttribute('aria-invalid', 'true'); } else { ctl.removeAttribute('aria-invalid'); }
    if (!msg) errorOf(name).textContent = '';
  };
  // пара phone/email ділить одне повідомлення: показуємо його під телефоном, e-mail лише підсвічується й посилається на той самий id
  const paintAll = (errors) => {
    const shared = errors.phone && errors.phone === errors.email;
    ORDER.forEach((n) => paint(n, n === 'email' && shared ? '' : errors[n]));
    if (shared) { wrapOf('email').classList.add('is-invalid'); el('email').setAttribute('aria-invalid', 'true'); }
    el('email').setAttribute('aria-describedby', shared ? 'contact-phone-error' : 'contact-email-error');
  };
  const revalidate = () => { if (submitted) paintAll(check()); };

  form.addEventListener('input', revalidate);
  selectEl.addEventListener('select-change', revalidate);
  form.addEventListener('change', revalidate);

  // ---------- відправка ----------
  const setLoading = (on) => {
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    submitLabel.textContent = on ? 'Надсилаємо…' : 'Надіслати';
  };
  const showAlert = (nodes) => { alertEl.replaceChildren(...nodes); alertEl.hidden = false; };
  const hideAlert = () => { alertEl.hidden = true; alertEl.replaceChildren(); };

  const payload = () => ({
    topic: select.value,
    topicLabel: topicLabel(select.value),
    name: el('name').value.trim(),
    phone: el('phone').value.trim(),
    email: el('email').value.trim(),
    message: el('message').value.trim(),
    consent: true,
    page: location.origin + location.pathname,
  });

  // запасний канал: лист у поштовому клієнті; клік по прихованому <a> (а не location) — сторінка не навігується геть, якщо клієнта немає
  const openMailto = (d) => {
    const lines = [`Тема: ${d.topicLabel}`, `Ім'я: ${d.name}`];
    if (d.phone) lines.push(`Телефон: ${d.phone}`);
    if (d.email) lines.push(`E-mail: ${d.email}`);
    lines.push('', 'Повідомлення:', d.message.slice(0, MSG_MAX));
    const body = lines.join('\r\n');
    const href = `mailto:${contacts.email}?subject=${encodeURIComponent(`Звернення: ${d.topicLabel}`)}&body=${encodeURIComponent(body)}`;
    const a = document.createElement('a');
    a.href = href;
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const emailLink = () => {
    const a = document.createElement('a');
    a.href = `mailto:${contacts.email}`;
    a.textContent = contacts.email;
    return a;
  };

  const showSuccess = (mode) => {
    successTitle.textContent = mode === 'mailto' ? 'Майже готово' : 'Дякуємо!';
    if (mode === 'mailto') {
      successText.replaceChildren('Відкрито ваш поштовий клієнт — надішліть підготовлений лист. Якщо він не відкрився, напишіть нам на ', emailLink(), '.');
    } else {
      successText.textContent = 'Ми отримали ваше звернення й відповімо найближчим часом.';
    }
    form.inert = true;
    form.setAttribute('aria-hidden', 'true');
    success.inert = false;
    success.removeAttribute('aria-hidden');
    successTitle.focus();
  };
  const showForm = () => {
    form.reset();
    select.set('');
    submitted = false;
    paintAll({});
    hideAlert();
    setLoading(false);
    success.inert = true;
    success.setAttribute('aria-hidden', 'true');
    form.inert = false;
    form.removeAttribute('aria-hidden');
    topicBtn.focus();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitted = true;
    hideAlert();
    const errors = check();
    paintAll(errors);
    const firstBad = ORDER.find((n) => errors[n]);
    if (firstBad) { controlOf(firstBad).focus(); return; }
    if (el('website').value) { showSuccess('sent'); return; } // медова пастка: бот заповнив приховане поле — «успіх» без відправки
    const d = payload();
    setLoading(true);
    if (ENDPOINT) {
      try {
        const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) });
        if (!res.ok) throw new Error('bad status');
        showSuccess('sent');
      } catch {
        showAlert(['Не вдалося надіслати звернення. Спробуйте ще раз або напишіть нам на ', emailLink(), '.']);
      }
    } else {
      openMailto(d);
      showSuccess('mailto');
    }
    setLoading(false);
  });
  success.querySelector('[data-reset]').addEventListener('click', showForm);

  // ---------- передвибір теми: ?topic=excursion#form ----------
  const scrollSettled = () => new Promise((resolve) => {
    const done = () => { removeEventListener('scrollend', done); resolve(); };
    addEventListener('scrollend', done, { once: true });
    setTimeout(done, 900); // запасний вихід: scrollend не спрацьовує, якщо прокручувати не потрібно / не підтримується
  });
  const whenAgeOk = () => new Promise((resolve) => {
    const root = document.documentElement;
    if (root.classList.contains('age-ok') || !document.querySelector('.age-gate')) return resolve();
    const mo = new MutationObserver(() => { if (root.classList.contains('age-ok')) { mo.disconnect(); resolve(); } });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  });
  const applyTopic = async (value) => {
    if (!contacts.topics.some((t) => t.value === value)) return;
    select.set(value);
    revalidate();
    await whenAgeOk(); // поки ворота віку показані, скрол і фокус не чіпаємо
    aside.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    aside.classList.remove('is-highlight');
    void aside.offsetWidth; // перезапуск анімації спалаху
    aside.classList.add('is-highlight');
    aside.addEventListener('animationend', () => aside.classList.remove('is-highlight'), { once: true });
    await scrollSettled();
    if (!form.inert) el('name').focus(); // preventScroll за замовчуванням false: за потреби поле дотягується у видиму зону
  };

  const params = new URLSearchParams(location.search);
  const initial = params.get('topic');
  // ?size=200|50 (сторінка «Ф'ючерсні бочки»): префіл повідомлення, якщо воно порожнє
  const BARREL_SIZES = { 200: '200 L', 50: '50 L' };
  const size = BARREL_SIZES[params.get('size')];
  if (size && initial === 'barrel' && !el('message').value.trim()) el('message').value = `Цікавить бочка ${size}`;
  if (initial) applyTopic(initial);

  // посилання «Замовити …» на цій самій сторінці: без перезавантаження
  document.querySelectorAll('[data-topic-link]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    history.replaceState(null, '', a.getAttribute('href'));
    if (!form.inert) applyTopic(a.dataset.topicLink); else { showForm(); applyTopic(a.dataset.topicLink); }
  }));
}
