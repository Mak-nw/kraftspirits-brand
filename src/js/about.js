// Сторінка «Про дім» (about.html, рукописна): лише наявні модулі сайту — акордеони FAQ (accordion.js), мапа DS (contacts-map.js),
// поява блоків (reveal.js; ілюстрації кристалів/установок/шляху «оживають» CSS-переходами за класом .is-in, який ставить reveal),
// паралакс фото hero (parallax.js). Без reduced-motion і ?reveal=off усе видно одразу (reveal.css). Власної scroll-логіки немає.
import { initAccordions, initAccordionKeys } from './accordion.js';

initAccordions();
initAccordionKeys();

// підсвітка кристала при наведенні/фокусі на його підпис (і навпаки): лише клас-стан на сцені; рух — CSS (transform), reduced-motion гасить reveal.css
const stage = document.querySelector('.about-pillars__stage');
if (stage) {
  const set = (k) => { if (k) stage.dataset.active = k; else delete stage.dataset.active; };
  stage.querySelectorAll('[data-pillar]').forEach((el) => {
    el.addEventListener('pointerenter', () => set(el.dataset.pillar));
    el.addEventListener('pointerleave', () => set(null));
  });
  stage.querySelectorAll('[data-crystal]').forEach((el) => {
    el.addEventListener('pointerenter', () => set(el.dataset.crystal));
    el.addEventListener('pointerleave', () => set(null));
  });
}

if (document.querySelector('[data-contacts-map]')) import('./contacts-map.js');
await import('./reveal.js');
await import('./parallax.js');
