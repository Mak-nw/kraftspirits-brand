// Поява елементів при вході у в'юпорт (один раз). Без JS / reduced-motion / друк — контент видно одразу.
// Розмітка: data-reveal="rise" (opacity + translateY) або data-reveal="fade" (лише opacity);
// секція з data-reveal-load (hero) з'являється одразу після завантаження.
import { cssTimeMs } from './duration.js';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const els = [...document.querySelectorAll('[data-reveal]')];
// автоматизація (скриншоти fullPage, тести) не скролить → не ховаємо; ?reveal=off вимикає, ?reveal=on примусово вмикає
const q = location.search;
const skip = /[?&]reveal=off/.test(q) || (navigator.webdriver && !/[?&]reveal=on/.test(q));

if (els.length && !reduce && !skip && 'IntersectionObserver' in window) {
  const cs = getComputedStyle(root);
  const ms = (name) => cssTimeMs(cs.getPropertyValue(name));
  const MAX_STEP = 6;
  const pending = new Set();

  const show = (el, i, animate) => {
    if (!pending.delete(el)) return;
    io.unobserve(el);
    if (!animate) { el.classList.add('is-in', 'is-done'); return; }
    el.style.setProperty('--i', Math.min(i, MAX_STEP));
    el.classList.add('is-in');
    const delay = ms('--duration-reveal') + Math.min(i, MAX_STEP) * ms('--reveal-stagger') + 100;
    setTimeout(() => { el.classList.add('is-done'); el.style.removeProperty('--i'); }, delay);
  };
  const batch = (list) => {
    list.sort((a, b) => a.top - b.top || a.left - b.left);
    let k = 0;
    list.forEach(({ el, past }) => { show(el, k, !past); if (!past) k++; });
  };

  const io = new IntersectionObserver((entries) => {
    const hit = [];
    entries.forEach((e) => {
      const r = e.boundingClientRect;
      const past = !e.isIntersecting && r.bottom <= (e.rootBounds ? e.rootBounds.top : 0);
      if (e.isIntersecting || past) hit.push({ el: e.target, top: r.top, left: r.left, past });
    });
    batch(hit);
  });

  // стартовий стан: у в'юпорті на старті — одразу видимі (крім hero: анімується при завантаженні)
  const load = [];
  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    const inView = r.bottom > 0 && r.top < innerHeight;
    pending.add(el);
    if (inView && el.closest('[data-reveal-load]')) load.push({ el, top: r.top, left: r.left, past: false });
    else if (inView) show(el, 0, false);
    else io.observe(el);
  });
  root.classList.add('js-reveal');
  void root.offsetHeight; // зафіксувати прихований стан, щоб перехід відпрацював
  batch(load);

  // fallback: якщо щось у в'юпорті (чи вище) лишилось прихованим — показати через 2.5 с після останньої прокрутки
  let timer;
  const sweep = () => {
    const rest = [...pending].map((el) => { const r = el.getBoundingClientRect(); return { el, top: r.top, left: r.left, bottom: r.bottom }; })
      .filter((x) => x.top < innerHeight);
    batch(rest.map((x) => ({ ...x, past: x.bottom <= 0 })));
  };
  const arm = () => { clearTimeout(timer); timer = setTimeout(sweep, 2500); };
  // IntersectionObserver не спрацьовує, якщо елемент «перестрибнули» (якір, швидкий скрол): показуємо все, що вище в'юпорта
  let raf = 0;
  const passed = () => {
    raf = 0;
    batch([...pending].map((el) => { const r = el.getBoundingClientRect(); return { el, top: r.top, left: r.left, bottom: r.bottom }; })
      .filter((x) => x.bottom <= 0).map((x) => ({ ...x, past: true })));
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(passed); arm(); }, { passive: true });
  addEventListener('resize', arm);
  addEventListener('hashchange', arm);
  addEventListener('beforeprint', () => [...pending].forEach((el) => show(el, 0, false)));
  arm();
}
