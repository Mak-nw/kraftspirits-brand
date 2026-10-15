// Сторінка FAQ (faq.html): акордеони рядків faq-item (src/js/accordion.js — плавне відкриття, aria-expanded), клавіатура ↑/↓/Home/End між питаннями,
// поява блоків (reveal). Дані й розмітка — src/data/faq.js → vite.config.js (@each). Без JS усі відповіді відкриті (див. інлайн-скрипт у faq.html).
import { initAccordions, initAccordionKeys } from './accordion.js';

initAccordions();
initAccordionKeys();
await import('./reveal.js');
