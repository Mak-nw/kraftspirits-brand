// Шаблон посадкової сторінки (lp: barrels.html, excursions.html; docs/page-template.md). Поведінка залежить лише від того, які секції є в даних:
// (1) зациклені SVG-анімації грають лише поки секція [data-loop] у в'юпорті (клас .is-playing; CSS ставить animation-play-state: paused поза екраном);
// (2) лічильники [data-count-to] 0 → значення при вході у в'юпорт (--duration-reveal, ease-out; без reduced-motion; значення в DOM — фінальне для SEO/без JS; до старту число приховане, без мигання);
// (3) reveal і паралакс hero — спільні модулі сайту; (4) кроки [data-steps] перемикають стан гравюри арки (data-step);
// (5) ?slots=on — огляд місць під фото; (6) FAQ — акордеони DS (accordion.js); (7) мапа DS (contacts-map.js) — лише якщо секція «місце» є на сторінці.
import { cssTimeMs } from './duration.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

if ('IntersectionObserver' in window) {
  const loops = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-playing', e.isIntersecting));
  });
  document.querySelectorAll('[data-loop]').forEach((el) => loops.observe(el));

  // (4) кроки: активний крок = той, що перетинає середню смугу в'юпорта; data-step на секції [data-steps]
  //     керує гравюрою (CSS: підсвічена частина, рівень рідини). До першого розділу — "0" (бочка порожня). Це стан, не скрол-анімація;
  //     при reduced-motion стан теж перемикається, лише без переходів (reveal.css гасить transition/animation).
  document.querySelectorAll('[data-steps]').forEach((sec) => {
    sec.dataset.step = '0';
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) sec.dataset.step = e.target.dataset.step; });
    }, { rootMargin: '-45% 0px -45% 0px' });
    sec.querySelectorAll('[data-step]').forEach((ch) => io.observe(ch));
  });

  // (2) лічильники: до старту число приховане CSS (lp.css: html.js .page-lp [data-count-to]:not([data-count]) { opacity: 0 }), тож 383 → 0 → … не мигає;
  //     у DOM воно завжди фінальне (SEO/без JS: html.js немає — видно одразу). data-count: "run" (рахує) → "done" (фінал). reduced-motion — одразу "done".
  const counterEls = [...document.querySelectorAll('[data-count-to]')];
  if (!reduce) {
    const dur = cssTimeMs(getComputedStyle(document.documentElement).getPropertyValue('--duration-reveal')) || 1100;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const run = (el) => {
      const to = Number(el.dataset.countTo);
      if (!Number.isFinite(to)) { el.dataset.count = 'done'; return; }
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min((now - t0) / dur, 1);
        el.textContent = Math.round(to * easeOut(k)).toLocaleString('uk-UA'); // 1 234: ті самі розряди, що в HTML (lpView, fmt)
        if (k < 1) requestAnimationFrame(tick); else el.dataset.count = 'done';
      };
      el.textContent = '0';
      el.dataset.count = 'run'; // показати число в тому ж кадрі, що й «0»
      requestAnimationFrame(tick);
    };
    const counters = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { counters.unobserve(e.target); run(e.target); } });
    }, { threshold: 0.6 });
    counterEls.forEach((el) => counters.observe(el));
  } else {
    counterEls.forEach((el) => { el.dataset.count = 'done'; });
  }
}
else document.querySelectorAll('[data-count-to]').forEach((el) => { el.dataset.count = 'done'; });

// (5) ?slots=on — режим огляду для замовника: обводить місця під майбутні фото/тексти ([data-slot]) і показує їхній перелік.
//     На звичайній сторінці нічого не змінюється (атрибути data-slot невидимі).
if (/[?&]slots=on/.test(location.search)) {
  document.documentElement.classList.add('show-slots');
  const list = document.createElement('ol');
  list.className = 'lp-slots t-text';
  list.setAttribute('aria-label', 'Місця під фото й тексти');
  document.querySelectorAll('[data-slot]').forEach((el, i) => {
    el.dataset.slotN = String(i + 1);
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${el.dataset.slot}`;
    list.append(li);
  });
  document.body.append(list);
}

// (6) FAQ (секція faq): ті самі акордеони й клавіатура, що на faq.html
if (document.querySelector('[data-faq-list]')) {
  const { initAccordions, initAccordionKeys } = await import('./accordion.js');
  initAccordions();
  initAccordionKeys();
}
// (7) мапа (секція place): той самий модуль, що на contacts.html (maplibre — окремий чанк, вантажиться лише тут)
if (document.querySelector('[data-contacts-map]')) import('./contacts-map.js');

await import('./reveal.js');
await import('./parallax.js');
