// Сторінка «Про дім» (about.html, рукописна): лише наявні модулі сайту — акордеони FAQ (accordion.js), мапа DS (contacts-map.js),
// поява блоків (reveal.js; етапи процесу й силуети установок з'являються CSS-переходами за класом .is-in, який ставить reveal),
// паралакс фото hero (parallax.js). Без reduced-motion і ?reveal=off усе видно одразу (reveal.css). Власної scroll-логіки немає.
import { initAccordions, initAccordionKeys } from './accordion.js';

initAccordions();
initAccordionKeys();

if (document.querySelector('[data-contacts-map]')) import('./contacts-map.js');
await import('./reveal.js');
await import('./parallax.js');
