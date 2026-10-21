// Сторінка «Коктейлі» (cocktails.html). Розмітку будує vite.config.js із src/data/cocktails.js; тут лише поведінка:
// таби рецепта, назва товару в картці як у каталозі, ?slots=on, reveal і паралакс (hero, фото блоків — спільні модулі сайту).
import { initTabs } from './tabs.js';

document.querySelectorAll('[data-cocktail]').forEach((block) => {
  block.querySelectorAll('[data-tabs]').forEach(initTabs);

  // картка товару — як у каталозі: catalog.js ставить alt = p.name (назва з products.js, а не текст h3 з <br>)
  const item = block.querySelector('.tour-card__aside');
  const img = item?.querySelector('.product-card__media img');
  if (img) img.alt = item.dataset.name;
});

// ?slots=on — огляд місць під фото/тексти замовника (як на бочках): обведення [data-slot] і перелік
if (/[?&]slots=on/.test(location.search)) {
  document.documentElement.classList.add('show-slots');
  const list = document.createElement('ol');
  list.className = 'lp-slots';
  document.querySelectorAll('[data-cocktail]').forEach((b) => {
    const li = document.createElement('li');
    const title = b.querySelector('h2').textContent;
    li.textContent = `${title}: фото 1, тексти${b.hasAttribute('data-draft') ? ' (чернетка)' : ''}, товар ${b.querySelector('.product-card')?.dataset.slug || '—'}`;
    list.append(li);
  });
  document.body.append(list);
}

await import('./reveal.js');
await import('./parallax.js');
