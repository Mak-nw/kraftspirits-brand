// Акордеон на <details>: плавне відкриття/закриття (висота + opacity тіла через Web Animations API), aria-expanded.
// Тривалість і крива — токени --duration-accordion / --ease-accordion. Іконка «+» ↔ «−» анімується в CSS (accordion.css) за тими ж токенами.
// Швидкі повторні кліки: поточна анімація скасовується, нова стартує з поточної висоти/opacity (реверс без стрибка).
// Без WAAPI / prefers-reduced-motion — миттєво. Без JS працює нативний <details>.
import { cssMs } from './duration.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function setup(d) {
  if (d.dataset.accReady !== undefined) return;
  const summary = d.querySelector(':scope > summary');
  if (!summary) return;
  d.dataset.accReady = '';
  const body = d.querySelector(':scope > .acc__body');
  let target = d.open; // останній запитаний стан (true = відкрито)
  let anim = null;
  let bodyAnim = null;

  const sync = () => summary.setAttribute('aria-expanded', String(target));
  sync();
  // нативні зміни (пошук по сторінці, атрибут open ззовні) — лише коли наша анімація не йде
  d.addEventListener('toggle', () => { if (!anim) { target = d.open; sync(); } });

  const finish = () => {
    d.open = target;
    d.classList.remove('is-animating', 'is-closing');
    anim?.cancel();
    bodyAnim?.cancel();
    anim = bodyAnim = null;
    sync();
  };

  const closedHeight = () => {
    const cs = getComputedStyle(d);
    return summary.getBoundingClientRect().height
      + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
      + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
  };

  const run = (open) => {
    target = open;
    sync();
    const dur = reduce.matches || !d.animate ? 0 : cssMs('--duration-accordion');
    if (!dur) { finish(); return; }

    const wasOpen = d.open;
    const fromH = d.getBoundingClientRect().height; // поточна відображена висота (з урахуванням анімації в ході)
    const fromO = body && wasOpen ? parseFloat(getComputedStyle(body).opacity) : 0;
    anim?.cancel();
    bodyAnim?.cancel();

    d.classList.add('is-animating');
    d.classList.toggle('is-closing', !open);
    d.open = true; // при закритті лишається відкритим до кінця анімації
    const toH = open ? d.getBoundingClientRect().height : closedHeight(); // природна висота відкритого / висота закритого рядка
    const opts = { duration: dur, easing: cssVar('--ease-accordion') || 'ease', fill: 'forwards' };
    const mine = d.animate({ height: [`${fromH}px`, `${toH}px`] }, opts);
    anim = mine;
    bodyAnim = body ? body.animate({ opacity: [fromO, open ? 1 : 0] }, opts) : null;
    mine.onfinish = () => { if (anim === mine) finish(); };
  };

  summary.addEventListener('click', (e) => {
    e.preventDefault(); // Enter/Space на summary теж генерують click
    run(!target);
  });
}

export function initAccordions(root = document) {
  root.querySelectorAll('details.acc').forEach(setup);
}
