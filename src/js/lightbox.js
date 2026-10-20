// Повноекранний перегляд фото (один <dialog data-lightbox> на сторінку, partials/components/lightbox.html).
// open(photos, index): photos = [{ src, alt }]. Модальний діалог (showModal): фокус усередині, Esc закриває, фокус повертається
// на кнопку, з якої відкрили. ←/→ і стрілки — гортання по колу, лічильник «N з M». Фото — спільна cross-fade сцена (photo-stage.js).
import { createPhotoStage, warm } from './photo-stage.js';
import { t } from '../i18n/runtime.js';

export function createLightbox(dialog) {
  if (!dialog) return null;
  const stage = createPhotoStage(dialog.querySelector('[data-lightbox-stage]'));
  const count = dialog.querySelector('[data-lightbox-count]');
  const prev = dialog.querySelector('[data-lightbox-prev]');
  const next = dialog.querySelector('[data-lightbox-next]');
  let list = [];
  let index = 0;
  let opener = null;
  let onChange = null;
  const go = (i) => {
    index = (i + list.length) % list.length;
    stage.show(list[index]);
    count.textContent = t('js.of', { a: index + 1, b: list.length });
    if (list.length > 1) warm(list[(index + 1) % list.length].src);
    onChange?.(index);
  };
  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
  });
  dialog.querySelector('[data-lightbox-close]').addEventListener('click', () => dialog.close());
  // клік по тлу (поза фото й кнопками) — закрити
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('has-lightbox');
    opener?.focus({ preventScroll: true });
  });
  return {
    open(photos, i = 0, { from, change } = {}) {
      list = photos;
      opener = from || document.activeElement;
      onChange = change || null;
      const single = list.length < 2;
      prev.hidden = single;
      next.hidden = single;
      count.hidden = single;
      document.documentElement.classList.add('has-lightbox');
      dialog.showModal();
      go(i);
    },
  };
}
