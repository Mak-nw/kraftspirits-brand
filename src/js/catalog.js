import { PRODUCTS, BRANDS, CATEGORIES } from '../data/products.js';
import { initSelect } from './select.js';

// ---- дані та стан ----
const ALL = 'all';
const SORTS = [
  { value: 'default', label: 'за замовчуванням' },
  { value: 'price-asc', label: 'ціна: зростання' },
  { value: 'price-desc', label: 'ціна: спадання' },
  { value: 'name', label: 'назва А–Я' },
];
const base = import.meta.env.BASE_URL;
const grid = document.querySelector('[data-catalog-grid]');
const tpl = document.querySelector('#product-card-template');
const empty = document.querySelector('[data-catalog-empty]');
const countEl = document.querySelector('[data-catalog-count]');
const navItems = [...document.querySelectorAll('[data-cat]')];
const state = { category: ALL, brand: ALL, sort: 'default' };

const fmtPrice = (n) => `${n.toLocaleString('uk-UA')} ₴`;
// «позиція / позиції / позицій»
const plural = (n) => {
  const m10 = n % 10, m100 = n % 100;
  const word = m10 === 1 && m100 !== 11 ? 'позиція' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'позиції' : 'позицій';
  return `${n} ${word}`;
};

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
    price.textContent = (p.volumes.length > 1 ? 'від ' : '') + fmtPrice(p.price);
  }
  cards.set(p.slug, a);
  grid.append(a);
});

// ---- селекти ----
const sels = {
  brand: initSelect(document.querySelector('[data-select="brand"]'), { options: [{ value: ALL, label: 'Усі' }, ...BRANDS.map((b) => ({ value: b.id, label: b.label }))] }),
  category: initSelect(document.querySelector('[data-select="category"]'), { options: [{ value: ALL, label: 'Усі' }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))] }),
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
  name: (a, b) => a.name.localeCompare(b.name, 'uk'),
};
const apply = () => {
  const shown = PRODUCTS
    .filter((p) => (state.category === ALL || p.category === state.category) && (state.brand === ALL || p.brand === state.brand))
    .sort(sorters[state.sort]);
  const keep = new Set(shown.map((p) => p.slug));
  cards.forEach((el, slug) => { el.hidden = !keep.has(slug); });
  shown.forEach((p) => grid.append(cards.get(p.slug))); // порядок DOM = порядок сортування
  countEl.textContent = plural(shown.length);
  empty.hidden = shown.length > 0;
  grid.hidden = shown.length === 0;
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
