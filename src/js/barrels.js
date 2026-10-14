// Сторінка «Ф'ючерсні бочки»: (1) зациклені SVG-анімації грають лише поки секція [data-loop] у в'юпорті (клас .is-playing; CSS ставить animation-play-state: paused поза екраном);
// (2) лічильники [data-count-to] 0 → значення при вході у в'юпорт (--duration-reveal, ease-out; без reduced-motion; значення стартово в DOM для SEO/без JS);
// (3) reveal і паралакс hero — спільні модулі сайту.
import { cssTimeMs } from './duration.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

if ('IntersectionObserver' in window) {
  const loops = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-playing', e.isIntersecting));
  });
  document.querySelectorAll('[data-loop]').forEach((el) => loops.observe(el));

  if (!reduce) {
    const dur = cssTimeMs(getComputedStyle(document.documentElement).getPropertyValue('--duration-reveal')) || 1100;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const run = (el) => {
      const to = Number(el.dataset.countTo);
      if (!Number.isFinite(to)) return;
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min((now - t0) / dur, 1);
        el.textContent = String(Math.round(to * easeOut(k)));
        if (k < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      requestAnimationFrame(tick);
    };
    const counters = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { counters.unobserve(e.target); run(e.target); } });
    }, { threshold: 0.6 });
    document.querySelectorAll('[data-count-to]').forEach((el) => counters.observe(el));
  }
}

await import('./reveal.js');
await import('./parallax.js');
