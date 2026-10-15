// Фото-сцена з cross-fade (спільна для сторінки товару, галерей коктейлів і повноекранного перегляду).
// Сцена — контейнер (.product-stage) із шарами <img class="product-stage__img">. show() кладе нове фото поверх
// (opacity 0 → 1 за --duration-base, класи is-photo-enter / is-photo-leave у product.css), старе лишається під ним;
// у DOM не більше трьох шарів, після переходу — один. reduced-motion або перший показ (без src) — миттєва заміна.
// Кілька сцен на сторінці незалежні (стан у замиканні). warm(url) — попереднє завантаження великого кадру.
import { cssMs } from './duration.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const IMG = 'product-stage__img';

export function createPhotoStage(stage) {
  const layers = () => [...stage.querySelectorAll(`.${IMG}`)];
  let token = 0;
  let timer = 0;
  // photo: { src, alt, cutout }
  const show = ({ src, alt = '', cutout = false }) => {
    const my = ++token;
    clearTimeout(timer);
    const cur = layers().pop();
    if (reduceMotion.matches || !cur.getAttribute('src')) {
      layers().forEach((l) => { if (l !== cur) l.remove(); });
      cur.classList.remove('is-photo-enter', 'is-photo-leave');
      cur.classList.toggle('is-cutout', Boolean(cutout));
      cur.src = src;
      cur.alt = alt;
      return;
    }
    layers().slice(0, -2).forEach((l) => l.remove());
    const next = document.createElement('img');
    next.className = `${IMG} is-photo-enter`;
    next.classList.toggle('is-cutout', Boolean(cutout));
    next.alt = alt;
    next.src = src;
    const go = () => {
      if (my !== token) { next.remove(); return; }
      stage.append(next);
      void next.offsetWidth; // зафіксувати opacity 0 до переходу
      if (cutout || cur.classList.contains('is-cutout')) cur.classList.add('is-photo-leave');
      next.classList.remove('is-photo-enter');
      timer = setTimeout(() => {
        layers().forEach((l) => { if (l !== next) l.remove(); });
        next.classList.remove('is-photo-leave');
      }, cssMs('--duration-base') + 100);
    };
    // показуємо після завантаження, щоб не було миготіння порожнім шаром
    next.decode().then(go, go);
  };
  return { show };
}

// Попереднє підвантаження (Image + decode кладе кадр у пам'ять; кожен URL — один запит)
const warmed = new Map();
export function warm(url) {
  if (warmed.has(url)) return;
  const im = new Image();
  im.fetchPriority = 'low';
  im.decoding = 'async';
  im.src = url;
  warmed.set(url, im); // тримаємо посилання, щоб завантаження не скасувалось
  im.decode().catch(() => {});
}
// виклик у простої після події load (requestIdleCallback; запасно setTimeout)
export function whenIdle(fn) {
  const run = () => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500));
  if (document.readyState === 'complete') run(); else addEventListener('load', run, { once: true });
}
