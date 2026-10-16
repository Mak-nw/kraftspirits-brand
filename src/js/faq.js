// Сторінка FAQ (faq.html): акордеони рядків faq-item (src/js/accordion.js — плавне відкриття, aria-expanded), клавіатура ↑/↓/Home/End між питаннями,
// поява блоків (reveal). Дані й розмітка — src/data/faq.js → vite.config.js (@each). Відповіді за замовчуванням закриті (нативний details без open).
import { initAccordions, initAccordionKeys } from './accordion.js';

initAccordions();
initAccordionKeys();
await import('./reveal.js');
