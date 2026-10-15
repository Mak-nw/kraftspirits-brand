// Сторінка «Коктейлі» (cocktails.html). Розмітку будує vite.config.js із src/data/cocktails.js; тут лише поведінка:
// галерея кожного блоку (мініатюри → сцена з cross-fade, клік по фото → повноекранний перегляд), таби, ?slots=on.
import { createPhotoStage, warm } from './photo-stage.js';
import { createLightbox } from './lightbox.js';
import { initTabs } from './tabs.js';

const base = import.meta.env.BASE_URL;
const lightbox = createLightbox(document.querySelector('[data-lightbox]'));

document.querySelectorAll('[data-cocktail]').forEach((block) => {
  // галерея
  const gallery = block.querySelector('[data-gallery]');
  const stage = createPhotoStage(gallery.querySelector('[data-stage]'));
  const thumbs = [...gallery.querySelectorAll('[data-photo]')];
  const first = gallery.querySelector('.product-stage__img');
  const photos = thumbs.length ? thumbs.map((b) => ({ src: base + b.dataset.src, alt: b.dataset.alt })) : [{ src: first.getAttribute('src'), alt: first.alt }];
  let active = 0;
  const select = (i) => {
    if (i === active) return;
    active = i;
    thumbs.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    stage.show(photos[i]);
  };
  thumbs.forEach((b, i) => {
    b.addEventListener('click', () => select(i));
    const w = () => warm(photos[i].src); // великий кадр — лише коли до мініатюри наводять/фокусують (15 блоків × 2 кадри не вантажимо наперед)
    b.addEventListener('pointerenter', w);
    b.addEventListener('focus', w);
  });
  const zoom = gallery.querySelector('[data-gallery-open]');
  // гортання в повноекранному перегляді синхронізує вибране фото блоку
  zoom.addEventListener('click', () => lightbox?.open(photos, active, { from: zoom, change: (i) => select(i) }));

  // таби
  block.querySelectorAll('[data-tabs]').forEach(initTabs);

  // картка товару — як у каталозі: catalog.js ставить alt = p.name (назва з products.js, а не текст h3 з <br>)
  const item = block.querySelector('.cocktail__item');
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
    const n = b.querySelectorAll('[data-photo]').length || 1;
    li.textContent = `${title}: фото ${n}, тексти${b.hasAttribute('data-draft') ? ' (чернетка)' : ''}, товар ${b.querySelector('.product-card')?.dataset.slug || '—'}`;
    list.append(li);
  });
  document.body.append(list);
}

await import('./reveal.js');
