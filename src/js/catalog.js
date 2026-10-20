import { PRODUCTS as PRODUCTS_UK, BRANDS, CATEGORIES as CATEGORIES_UK } from '../data/products.js';
import { t, tPlural, fmtPrice, locale } from '../i18n/runtime.js';
import { localizeCategories, localizeProduct } from '../i18n/localize.js';
import { initSelect } from './select.js';
import { createGridMotion } from './catalog-motion.js';

// ---- дані та стан ----
const ALL = 'all';
const PRODUCTS = PRODUCTS_UK.map((p) => localizeProduct(p, locale())); // мова сторінки: назви/ноти з src/i18n/data/products.en.js
const CATEGORIES = localizeCategories(CATEGORIES_UK, locale());
const SORTS = [
  { value: 'default', label: t('js.sort.default') },
  { value: 'price-asc', label: t('js.sort.price-asc') },
  { value: 'price-desc', label: t('js.sort.price-desc') },
  { value: 'name', label: t('js.sort.name') },
];
const base = import.meta.env.BASE_URL;
const grid = document.querySelector('[data-catalog-grid]');
const tpl = document.querySelector('#product-card-template');
const empty = document.querySelector('[data-catalog-empty]');
const countEl = document.querySelector('[data-catalog-count]');
const navItems = [...document.querySelectorAll('[data-cat]')];
const state = { category: ALL, brand: ALL, sort: 'default' };

// «14 позицій» / «14 products»
const plural = (n) => tPlural('js.catalog.items', n);

// ---- картки (розмітка — partials/components/product-card.html, вона ж у <template>) ----
const cards = new Map();
PRODUCTS.forEach((p) => {
  const a = tpl.content.firstElementChild.cloneNode(true);
  a.dataset.slug = p.slug;
  a.dataset.brand = p.brand;
  const h3 = a.querySelector('h3');
  h3.append(p.nameLines[0], document.createElement('br'), p.nameLines[1]);
  const media = a.querySelector('.product-card__media');
  const img = media.querySelector('img');
  const src = p.catalogImage || p.image; // catalogImage — студійне фото з макета 204:2223 (лише gin-yasnyi)
  if (src) {
    img.src = base + src;
    img.alt = p.name;
  } else {
    img.remove();
    const ph = document.createElement('span');
    ph.className = 'product-card__ph t-product-name';
    ph.textContent = p.name;
    media.append(ph);
  }
  const price = a.querySelector('.t-price');
  if (p.price == null) {
    price.remove();
  } else {
    a.href = `product.html?id=${encodeURIComponent(p.slug)}`;
    price.textContent = (p.volumes.length > 1 ? t('js.price.from') : '') + fmtPrice(p.price);
  }
  cards.set(p.slug, a);
  grid.append(a);
});

const motion = createGridMotion({ grid, empty, cards });

// ---- селекти ----
const sels = {
  brand: initSelect(document.querySelector('[data-select="brand"]'), { options: [{ value: ALL, label: t('js.select.all') }, ...BRANDS.map((b) => ({ value: b.id, label: b.label }))] }),
  category: initSelect(document.querySelector('[data-select="category"]'), { options: [{ value: ALL, label: t('js.select.all') }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))] }),
  sort: initSelect(document.querySelector('[data-select="sort"]'), { options: SORTS }),
};

// ---- URL: категорія у hash (#gin), бренд і сортування у query ----
const readUrl = () => {
  const q = new URLSearchParams(location.search);
  const hash = decodeURIComponent(location.hash.slice(1));
  state.category = CATEGORIES.some((c) => c.id === hash) ? hash : ALL;
  const b = q.get('brand');
  state.brand = BRANDS.some((x) => x.id === b) ? b : ALL;
  const s = q.get('sort');
  state.sort = SORTS.some((x) => x.value === s) ? s : 'default';
};
const writeUrl = () => {
  const u = new URL(location.href);
  state.brand === ALL ? u.searchParams.delete('brand') : u.searchParams.set('brand', state.brand);
  state.sort === 'default' ? u.searchParams.delete('sort') : u.searchParams.set('sort', state.sort);
  u.hash = state.category === ALL ? '' : state.category;
  history.replaceState(null, '', u);
};

// ---- фільтр + сортування ----
const sorters = {
  default: (a, b) => a.id - b.id,
  'price-asc': (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || a.id - b.id,
  'price-desc': (a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity) || a.id - b.id,
  name: (a, b) => a.name.localeCompare(b.name, locale()),
};
let firstApply = true;
const apply = () => {
  const shown = PRODUCTS
    .filter((p) => (state.category === ALL || p.category === state.category) && (state.brand === ALL || p.brand === state.brand))
    .sort(sorters[state.sort]);
  motion.update(shown.map((p) => p.slug), !firstApply); // hidden/порядок DOM/порожній стан; зі згасанням, FLIP-переїздом і плавною висотою (перший рендер — миттєво)
  firstApply = false;
  countEl.textContent = plural(shown.length);
  navItems.forEach((a) => {
    const on = a.dataset.cat === state.category;
    a.classList.toggle('is-active', on);
    on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
  });
  Object.keys(sels).forEach((k) => sels[k].set(state[k]));
};

document.addEventListener('select-change', (e) => {
  const key = e.target.dataset.select;
  if (!key) return;
  state[key] = e.detail.value;
  apply();
  writeUrl();
});
addEventListener('hashchange', () => { readUrl(); apply(); writeUrl(); });
empty.querySelector('.btn').addEventListener('click', (e) => {
  e.preventDefault();
  Object.assign(state, { category: ALL, brand: ALL, sort: 'default' });
  apply();
  writeUrl();
});

readUrl();
apply();
grid.removeAttribute('data-pending'); // картки відрендерені: резерв висоти сітки (CSS .catalog-grid[data-pending]) більше не потрібен
writeUrl();
// reveal підключаємо після рендеру карток, щоб вони потрапили в спостереження
await import('./reveal.js');
