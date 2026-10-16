// Сторінка «Про дім» (about.html, рукописна): лише наявні модулі сайту — акордеони FAQ (accordion.js),
// поява блоків (reveal.js; ?reveal=off — статично), паралакс фото (parallax.js). Плавний скрол — глобальний scroll-behavior у base.css.
// Власної scroll-логіки й анімації в колах немає.
import { initAccordions, initAccordionKeys } from './accordion.js';

initAccordions();
initAccordionKeys();

await import('./reveal.js');
await import('./parallax.js');

