import { PRODUCTS } from '../data/products.js';
import { OCCASIONS, HITS, DEFAULT_IMAGE } from '../data/occasions.js';
import { cssMs } from './duration.js';

// «Не знаєте з чого почати?»: чіпи-події → добірка товарів у слайдері (одна позиція за раз) + фон секції (кросфейд шарів).
// Розмітка картки і чіпа — partials у <template> (components/product-card, components/chip), як у catalog.html.
// викликається з home.js синхронно: чіпи й картка мають бути живими вузлами до запуску reveal.js
export function initPicker() {
  const root = document.querySelector('[data-picker]');
  if (root) init(root);
}

function init(root) {
  const base = import.meta.env.BASE_URL;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ms = (name) => (reduce ? 0 : cssMs(name));

  const row = root.querySelector('[data-chips]');
  const slider = root.querySelector('[data-slider]');
  const track = slider.querySelector('[data-slider-track]');
  const prevBtn = slider.querySelector('[data-slider-prev]');
  const nextBtn = slider.querySelector('[data-slider-next]');
  const bgs = root.querySelector('[data-picker-bgs]');
  const cardTpl = root.querySelector('#picker-card-template');
  const chipTpl = root.querySelector('#picker-chip-template');

  const bySlug = new Map(PRODUCTS.map((p) => [p.slug, p]));
  const pick = (slugs) => slugs.map((s) => bySlug.get(s)).filter((p) => p && p.status === 'available');
  const hits = pick(HITS);

  const state = { occasion: null, list: hits, i: 0 };

  // ---- картка ----
  const fmtPrice = (n) => `${n.toLocaleString('uk-UA')} ₴`;
  const renderCard = (p) => {
    const a = cardTpl.content.firstElementChild.cloneNode(true);
    a.dataset.slug = p.slug;
    a.dataset.brand = p.brand;
    a.href = `product.html?id=${encodeURIComponent(p.slug)}`;
    const h3 = a.querySelector('h3');
    h3.append(p.nameLines[0], document.createElement('br'), p.nameLines[1]);
    const media = a.querySelector('.product-card__media');
    const img = media.querySelector('img');
    if (p.image) {
      img.src = base + p.image;
      img.alt = p.name;
      img.loading = 'eager';
    } else {
      img.remove();
      const ph = document.createElement('span');
      ph.className = 'product-card__ph t-product-name';
      ph.textContent = p.name;
      media.append(ph);
    }
    const price = a.querySelector('.t-price');
    if (p.price == null) price.remove();
    else price.textContent = (p.volumes.length > 1 ? 'від ' : '') + fmtPrice(p.price);
    return a;
  };

  let swapTimer = 0;
  const showCard = (animate, dir) => {
    const next = renderCard(state.list[state.i]);
    clearTimeout(swapTimer);
    const hadFocus = track.contains(document.activeElement); // фокус на картці не повинен губитися після заміни
    if (!animate || !track.children.length || reduce) {
      track.replaceChildren(next);
      if (hadFocus) next.focus({ preventScroll: true });
      return;
    }
    // у треку не більше двох карток: поточна (верхня) гаситься (is-leave), решта (ще не погашені) прибираються одразу
    const prev = track.lastElementChild;
    [...track.children].forEach((el) => { if (el !== prev) el.remove(); });
    prev.classList.remove('is-enter', 'is-delay');
    // перша картка несе data-reveal з partial; reveal.css (.js-reveal [data-reveal]:not(.is-done), specificity 0,3,0) перебиває .is-leave/.is-delay,
    // тож знімаємо data-reveal і закриваємо reveal для цієї картки — гаситься за --duration-fast, як решта
    prev.removeAttribute('data-reveal');
    prev.classList.add('is-done', 'is-leave');
    next.removeAttribute('data-reveal');
    track.dataset.dir = dir;
    next.classList.add('is-enter', 'is-delay'); // з'являється після того, як стара майже зникла (затримка = --duration-fast)
    track.append(next);
    if (hadFocus) next.focus({ preventScroll: true });
    void next.offsetWidth;
    next.classList.remove('is-enter');
    swapTimer = setTimeout(() => {
      [...track.children].forEach((el) => { if (el !== next) el.remove(); });
      next.classList.remove('is-delay');
    }, ms('--duration-fast') + ms('--duration-base') + 50);
  };

  const syncArrows = () => {
    const off = state.list.length < 2;
    [prevBtn, nextBtn].forEach((b) => b.setAttribute('aria-disabled', String(off)));
  };

  const go = (step) => {
    const n = state.list.length;
    if (n < 2) return;
    state.i = (state.i + step + n) % n;
    showCard(true, step < 0 ? 'prev' : 'next');
  };
  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  slider.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  });

  // ---- фон: шари по подіях, кросфейд ----
  // Вузли шарів ніколи не переставляються в DOM: переміщення скидає CSS-transition (шар «стрибає» з 1 до 0).
  // Порядок накладання задає data-rank (1 = найстаріший … N = найновіший), z-index за ним — у sections.css.
  const layers = new Map();
  const order = []; // id шарів за свіжістю вибору; останній — найвищий
  const bgOf = (id) => (id === 'intro' ? { id, image: DEFAULT_IMAGE } : id ? OCCASIONS.find((o) => o.id === id) : null); // 'intro' — фон початкового стану, не чіп
  root.querySelectorAll('.picker__bg[data-occasion]').forEach((el) => layers.set(el.dataset.occasion, el));
  const initial = bgs.querySelector('.picker__bg.is-active');
  if (initial) { order.push(initial.dataset.occasion); initial.dataset.rank = '1'; }
  const ensureLayer = (id) => {
    if (layers.has(id)) return layers.get(id);
    const img = document.createElement('img');
    img.className = 'picker__bg';
    img.dataset.occasion = id;
    img.alt = '';
    img.src = base + bgOf(id).image;
    bgs.append(img);
    layers.set(id, img);
    return img;
  };
  const loaded = (img) => (img.complete && img.naturalWidth ? Promise.resolve() : new Promise((res) => { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); }));

  // новий шар (з нульовою opacity) отримує найвищий ранг; шар, що вже видно (повторний вибір, ще утримується або проявляється),
  // зберігає ранг — інакше він одразу закриває верхній шар і видимий стрибок. Старий: повний (1) утримується й гаснить під новим,
  // частковий (<1) гаситься плавно з поточного значення (is-out), щоб не було стрибка при зникненні
  const setBg = (id) => {
    const next = ensureLayer(id);
    const cur = bgs.querySelector('.picker__bg.is-active');
    if (cur === next) return; // вже активний: нічого не змінюємо
    void next.offsetWidth; // фіксуємо стиль opacity 0 до активації, інакше щойно створений шар з'являється миттєво, без проявлення
    const visible = parseFloat(getComputedStyle(next).opacity) > 0.001;
    if (!visible) {
      const at = order.indexOf(id);
      if (at !== -1) order.splice(at, 1);
      order.push(id);
    }
    order.forEach((k, i) => { layers.get(k).dataset.rank = String(i + 1); });
    if (cur) {
      const p = parseFloat(getComputedStyle(cur).opacity);
      cur.classList.toggle('is-out', p < 0.999);
      cur.classList.remove('is-active');
    }
    next.classList.remove('is-out');
    next.classList.add('is-active');
    bgs.dataset.occasion = id;
  };

  // ---- вибір події ----
  let token = 0;
  const select = async (id) => {
    const my = ++token;
    const occ = id ? bgOf(id) : null;
    state.occasion = id;
    state.list = occ ? pick(occ.slugs) : hits;
    state.i = 0;
    chips.forEach((c, k) => {
      const on = !!occ && OCCASIONS[k].id === id;
      c.setAttribute('aria-pressed', String(on));
      c.classList.toggle('is-active', on);
    });
    const bgId = occ ? occ.id : 'intro';
    await loaded(ensureLayer(bgId)); // без мигання: показуємо фон, лише коли він завантажений
    if (my !== token) return;
    setBg(bgId);
    root.dataset.occasion = occ ? occ.id : '';
    syncArrows();
    showCard(true, 'next');
  };

  // ---- чіпи з даних ----
  const chips = OCCASIONS.map((o) => {
    const c = chipTpl.content.firstElementChild.cloneNode(true);
    c.querySelector('.t-chip').textContent = o.title;
    c.dataset.occasion = o.id;
    return c;
  });
  row.replaceChildren(...chips);
  row.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    select(chip.getAttribute('aria-pressed') === 'true' ? null : chip.dataset.occasion);
  });

  // ---- попереднє завантаження при першому hover/focus чіпа ----
  const warmed = new Set();
  const warm = (e) => {
    const chip = e.target.closest?.('.chip');
    if (!chip || warmed.has(chip)) return;
    warmed.add(chip);
    const occ = bgOf(chip.dataset.occasion);
    ensureLayer(occ.id);
    pick(occ.slugs).forEach((p) => { if (p.image) new Image().src = base + p.image; });
  };
  row.addEventListener('pointerover', warm);
  row.addEventListener('focusin', warm);

  // ---- початковий стан: «Хіти», фон intro, чіпи не активні ----
  if (hits.length) showCard(false);
  syncArrows();
}
