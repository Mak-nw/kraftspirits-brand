// Вікова верифікація. Розмітка: partials/components/age-gate.html (єдиний include на кожній сторінці), стилі: components/age-gate.css.
// «Підтверджено» визначає inline-скрипт у <head> (partials/head-age.html): ставить html.age-ok ДО першого paint і читає ?age=ok.
// Тут — лише інтерактив, коли ворота показані. JS не ставить style: тільки класи/атрибути.
// Сховище: «запам'ятати» ВВІМКНЕНО → localStorage ks_age_ok {ok, ts} (термін cfg.days); вимкнено → sessionStorage (вкладка/сесія).
// Esc не закриває. Відмова («Ні») лише в пам'яті сторінки, не зберігається.
import { cssMs } from './duration.js';

const root = document.documentElement;
const gate = document.querySelector('[data-age-gate]');
const cfg = window.ksAge || { key: 'ks_age_ok', days: 30 };

const store = (kind, fn) => { try { return fn(window[kind]); } catch { return null; } };

function init() {
  const panels = [...gate.querySelectorAll('[data-age-panel]')];
  const remember = gate.querySelector('[data-age-remember]');
  const prevFocus = document.activeElement;
  let closed = false;
  let heading = null;

  // сторінка під діалогом: inert + aria-hidden (Tab і скрінрідер у неї не заходять)
  const hidden = [...document.body.children].filter((el) => el !== gate && !['SCRIPT', 'TEMPLATE', 'STYLE'].includes(el.tagName));
  const touched = hidden.map((el) => { const had = el.hasAttribute('aria-hidden'); el.inert = true; el.setAttribute('aria-hidden', 'true'); return { el, had }; });
  const release = () => touched.forEach(({ el, had }) => { el.inert = false; if (!had) el.removeAttribute('aria-hidden'); });

  const setState = (name, focus = true) => {
    panels.forEach((p) => {
      const on = p.dataset.agePanel === name;
      p.inert = !on;
      if (on) p.removeAttribute('aria-hidden'); else p.setAttribute('aria-hidden', 'true');
      if (on) {
        heading = p.querySelector('[data-age-title]');
        gate.setAttribute('aria-labelledby', heading.id);
        gate.setAttribute('aria-describedby', p.querySelector('.age-card__text').id);
      }
    });
    if (focus) heading.focus({ preventScroll: true });
  };
  const active = panels.find((p) => !p.inert && p.dataset.agePanel === 'ask') || panels[0];
  setState(active.dataset.agePanel);

  // фокус-пастка
  const focusables = () => [...gate.querySelectorAll('a[href], button, input')].filter((el) => !el.closest('[inert]'));
  gate.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const list = focusables();
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1], a = document.activeElement;
    if (e.shiftKey && (a === first || a === heading || !gate.contains(a))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (a === last || !gate.contains(a))) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener('focusin', (e) => { if (!closed && !gate.contains(e.target)) heading.focus({ preventScroll: true }); });

  const save = () => {
    const val = JSON.stringify({ ok: true, ts: Date.now() });
    if (remember.checked) {
      store('localStorage', (s) => s.setItem(cfg.key, val));
      store('sessionStorage', (s) => s.removeItem(cfg.key));
    } else {
      store('sessionStorage', (s) => s.setItem(cfg.key, val));
      store('localStorage', (s) => s.removeItem(cfg.key)); // прибрати протермінований запис
    }
  };

  const finish = () => {
    closed = true;
    root.classList.add('age-ok');
    gate.classList.remove('is-closing');
    release();
    if (prevFocus && prevFocus !== document.body && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
    else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  };
  const confirm = () => {
    save();
    const ms = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : cssMs('--duration-base', gate);
    if (!ms) { finish(); return; }
    gate.classList.add('is-closing');
    setTimeout(finish, ms + 30);
  };

  gate.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'confirm') confirm();
    else if (btn.dataset.action === 'deny') setState('deny');
    else if (btn.dataset.action === 'back') setState('ask');
  });
}

if (gate && !root.classList.contains('age-ok')) init();
