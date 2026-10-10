import { PRODUCTS, BRANDS, CATEGORIES } from '../data/products.js';
import { PRODUCT_TEXTS, PRODUCT_SERVE, PRODUCT_DELIVERY } from '../data/product-texts.js';
import { initAccordions } from './accordion.js';
import { addToCart } from './cart-counter.js';
import { cssMs } from './duration.js';

const base = import.meta.env.BASE_URL;
const main = document.querySelector('#product');
const tpl = (id) => document.querySelector(`#${id}`).content.firstElementChild.cloneNode(true);
const fmtPrice = (n) => `${n.toLocaleString('uk-UA')} ₴`;
const fmtVol = (l) => `${String(l).replace('.', ',')} л`;
const volIcon = (l) => (l <= 0.6 ? 'bottle-0-5' : l <= 0.85 ? 'bottle-0-7' : 'bottle-1'); // іконка пляшки за об'ємом (0,5 / 0,7 / 1 л)
const withIcon = (node, l) => { const i = el('span', `icon icon--${volIcon(l)}`); i.setAttribute('aria-hidden', 'true'); node.prepend(i); return node; };
// «пляшка + об'єм» (.vol--inline): окремий вузол або фрагменти тексту, де згадано об'єм у літрах («0,5 л», «0,7 л»)
const volNode = (l) => { const n = el('span', 'vol vol--inline'); n.append(el('span', `icon icon--${volIcon(l)}`), fmtVol(l)); n.firstChild.setAttribute('aria-hidden', 'true'); return n; };
// «іконка міцності + значення» (.strength): шапка продукту YC («42% alc») і рядок «Міцність» у «Характеристиках»
const strengthNode = (text, cls = '') => { const n = el('span', `strength ${cls}`.trim()); const i = el('span', 'icon icon--strength'); i.setAttribute('aria-hidden', 'true'); n.append(i, text); return n; };
const richVol = (str) => {
  const parts = String(str).split(/(\d+[.,]?\d*)\s+л(?![а-яіїєґ])/i);
  const out = [];
  parts.forEach((t, i) => { if (i % 2) out.push(volNode(parseFloat(t.replace(',', '.')))); else if (t) out.push(t); });
  return out;
};
const fmtMl = (l) => `${Math.round(l * 1000)} мл`; // 0.5 л → «500 мл» (YasnoCraft 205:2442)
const SUFFIX = 'YasnoCraft × Bazylsprings';

const setMeta = (title, description) => {
  document.title = `${title} — ${SUFFIX}`;
  let m = document.querySelector('meta[name="description"]');
  if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.append(m); }
  if (description) m.content = description;
};

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const labelled = (label, text) => {
  const p = el('p');
  p.append(el('strong', '', text == null ? label : `${label}:`));
  if (text != null) p.append(' ', ...richVol(text));
  return p;
};

// ---- тексти шести акордеонів: повні (3 позиції) або з products.js; порожній акордеон не показуємо ----
function buildSections(p) {
  const t = PRODUCT_TEXTS[p.slug];
  const serve = PRODUCT_SERVE[p.slug];
  const volumes = p.volumes.map((v) => fmtVol(v.l)).join(' / ');
  const about = [];
  const sensory = [];
  const features = [];
  if (t) {
    about.push(...[t.lead, ...t.about].filter(Boolean).map((s) => { const n = el('p'); n.append(...richVol(s)); return n; }));
    t.sensory.forEach(([k, v]) => sensory.push(labelled(k, v)));
    t.features.forEach((f) => { const li = el('li'); li.append(...richVol(f)); features.push(li); });
  } else {
    if (p.description) about.push(el('p', '', p.description));
    if (p.notes) sensory.push(labelled('Смак', p.notes));
    if (p.kind) features.push(el('li', '', `Тип: ${p.kind}`));
    if (p.abv) features.push(el('li', '', `Міцність: ${p.abv}%`));
    if (p.volumes.length) { const li = el('li', '', `${p.volumes.length > 1 ? "Об'єми" : "Об'єм"}: `); p.volumes.forEach((v, i) => li.append(i ? ' ' : '', volNode(v.l))); features.push(li); }
  }
  const ul = features.length ? el('ul') : null;
  if (ul) ul.append(...features);
  // «Як подавати»
  const serveNodes = serve ? [el('p', '', serve)] : [];
  // «Характеристики»: пари «підпис — значення» лише з наявних полів
  const brandLabel = BRANDS.find((b) => b.id === p.brand)?.label;
  const catLabel = CATEGORIES.find((c) => c.id === p.category)?.label;
  const specRows = [
    ['Бренд', brandLabel],
    ['Категорія', catLabel],
    ['Тип', p.kind],
    ['Міцність', p.abv ? `${p.abv}%` : null],
    [p.volumes.length > 1 ? "Об'єми" : "Об'єм", volumes],
    ['Країна', 'Україна'],
    ['Виробник', 'Дистилерія в Ясногородці, Київська область'],
  ].filter(([, v]) => v);
  const dl = el('dl', 'product-specs');
  specRows.forEach(([k, v]) => {
    const dd = el('dd');
    if (k.startsWith("Об'єм")) p.volumes.forEach((x) => dd.append(volNode(x.l))); else if (k === 'Міцність') dd.append(strengthNode(v, 'strength--inline')); else dd.textContent = v;
    dl.append(el('dt', '', k), dd);
  });
  // «Доставка й оплата»
  const delivery = PRODUCT_DELIVERY.map(([k, v]) => labelled(k, v));
  return [
    ['Про напій', about],
    ['Колір, смак, аромат', sensory],
    ['Особливості', ul ? [ul] : []],
    ['Як подавати', serveNodes],
    ['Характеристики', specRows.length ? [dl] : []],
    ['Доставка й оплата', delivery],
  ].filter(([, nodes]) => nodes.length);
}

function renderNotFound() {
  main.removeAttribute('data-pending'); // не знайдено: резерв висоти фрейму не потрібен
  main.removeAttribute('data-brand');
  document.body.classList.remove('page-product'); // «не знайдено»: бежеве тло без візерунка (зона header знову зелена)
  main.replaceChildren(tpl('product-notfound-template'));
  setMeta('Товар не знайдено');
  document.title = `Товар не знайдено — ${SUFFIX}`;
}

function renderProduct(p) {
  main.removeAttribute('data-pending'); // фрейм відрендерено: резерв висоти (CSS .product[data-pending]) більше не потрібен
  main.dataset.brand = p.brand;
  const root = document.querySelector('#product-template').content.cloneNode(true);
  const q = (s) => root.querySelector(s);

  // шапка бренду
  q('[data-head]').replaceWith(tpl(p.brand === 'bazylsprings' ? 'product-head-bs' : 'product-head-yc'));

  // заголовок
  const h1 = q('[data-title]');
  p.nameLines.forEach((line) => h1.append(el('span', '', line)));

  // фото: головне (hero зі студійним фото або image) + 2 мініатюри з gallery (спільні файли slider/*; обидва бренди — однакові накладки на фото в лівому верхньому куті фрейму); повторний клік повертає головне фото
  const isYc = p.brand !== 'bazylsprings';
  const mainSlide = { large: p.hero || p.image, cutout: isYc && !p.hero };
  const slides = p.gallery || [];
  const stage = q('[data-stage]');
  const thumbsNav = q('[data-thumbs]');
  let active = -1; // -1 = головне фото
  const thumbs = slides.map((s, i) => {
    const b = el('button', 'product-thumb');
    b.type = 'button';
    b.dataset.reveal = 'rise';
    b.setAttribute('aria-label', `Фото ${i + 1} з ${slides.length}`);
    const im = el('img');
    im.src = base + s.thumb;
    im.alt = '';
    b.append(im);
    thumbsNav.append(b);
    return b;
  });
  // зміна фото — cross-fade: нове <img> з'являється поверх (opacity 0 → 1 за --duration-base), старе лишається під ним
  // (якщо одне з фото — виріз з прозорістю, старе гаситься одночасно). У DOM не більше трьох шарів; після завершення лишається один.
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const layers = () => [...stage.querySelectorAll('.product-stage__img')];
  let swapToken = 0;
  let swapTimer = 0;
  const setPhoto = (s) => {
    const url = base + s.large;
    const my = ++swapToken;
    clearTimeout(swapTimer);
    const cur = layers().pop();
    if (reduceMotion.matches || !cur.getAttribute('src')) {
      layers().forEach((l) => { if (l !== cur) l.remove(); });
      cur.classList.remove('is-photo-enter', 'is-photo-leave');
      cur.classList.toggle('is-cutout', Boolean(s.cutout));
      cur.src = url;
      cur.alt = p.name;
      return;
    }
    layers().slice(0, -2).forEach((l) => l.remove());
    const next = el('img', 'product-stage__img is-photo-enter');
    next.classList.toggle('is-cutout', Boolean(s.cutout));
    next.alt = p.name;
    next.src = url;
    const go = () => {
      if (my !== swapToken) { next.remove(); return; }
      stage.append(next);
      void next.offsetWidth; // зафіксувати opacity 0 до переходу
      if (s.cutout || cur.classList.contains('is-cutout')) cur.classList.add('is-photo-leave');
      next.classList.remove('is-photo-enter');
      swapTimer = setTimeout(() => {
        layers().forEach((l) => { if (l !== next) l.remove(); });
        next.classList.remove('is-photo-leave');
      }, cssMs('--duration-base') + 100);
    };
    // показуємо після завантаження, щоб не було миготіння порожнім шаром
    next.decode().then(go, go);
  };
  const show = (i) => {
    active = i;
    const s = i < 0 ? mainSlide : slides[i];
    thumbs.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    setPhoto(s);
  };
  // повторний клік по активній мініатюрі повертає головне фото
  thumbs.forEach((b, i) => b.addEventListener('click', () => show(active === i ? -1 : i)));
  if (!slides.length) thumbsNav.hidden = true;
  show(-1);

  // об'єм / ціна / кнопка
  const volWrap = q('[data-volumes]');
  volWrap.classList.add(isYc ? 't-spec' : 't-caption');
  const fmtVolRow = isYc ? fmtMl : fmtVol;
  const btn = q('.btn');
  const priceEl = btn.querySelector('.t-price');
  // btn — із шаблону без параметра reveal, тож атрибут ставимо тут (reveal.js підхопить після рендеру)
  btn.dataset.reveal = 'rise';
  btn.classList.remove('btn--green');
  btn.classList.add(p.brand === 'bazylsprings' ? 'btn--teal' : 'btn--green');
  btn.classList.add('btn--serif'); // 205:2445: ціна й текст кнопки — EB Garamond (рішення замовника: однаково для YasnoCraft і Bazylsprings)
  let current = p.volumes[0];
  const renderBtn = () => {
    btn.dataset.add = p.slug;
    btn.dataset.volume = String(current.l);
    if (current.price == null) priceEl.remove(); else priceEl.textContent = fmtPrice(current.price);
  };
  if (p.volumes.length > 1) {
    const bs = p.volumes.map((v) => {
      const b = withIcon(el('button', 'product-volume', fmtVolRow(v.l)), v.l);
      b.type = 'button';
      b.addEventListener('click', () => {
        current = v;
        bs.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        renderBtn();
      });
      volWrap.append(b);
      return b;
    });
    bs[0].setAttribute('aria-pressed', 'true');
  } else {
    volWrap.append(withIcon(el('span', '', fmtVolRow(current.l)), current.l));
  }
  // YasnoCraft (205:2441): після об'єму — міцність «40% alc» з даних
  if (isYc && p.abv) volWrap.append(strengthNode(`${p.abv}% alc`));
  renderBtn();
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    addToCart(p.slug, current.l, 1);
  });

  // акордеони (усі закриті за замовчуванням)
  const acc = q('[data-acc]');
  buildSections(p).forEach(([title, nodes]) => {
    const item = tpl('acc-item-template');
    item.querySelector('summary').textContent = title;
    item.querySelector('[data-acc-body]').append(...nodes);
    if (p.brand === 'bazylsprings') item.classList.add('acc--teal');
    acc.append(item);
  });

  // крихти: каталог / бренд / категорія / назва
  const brand = BRANDS.find((b) => b.id === p.brand);
  const cat = CATEGORIES.find((c) => c.id === p.category);
  const sameCat = cat && p.nameLines[0].toLowerCase() === cat.label.toLowerCase();
  const last = sameCat ? p.nameLines.slice(1).join(' ') : p.nameLines.join(' ');
  const crumbs = q('.product-crumbs');
  const items = [
    ['каталог', 'catalog.html'],
    [brand.label, `catalog.html?brand=${brand.id}`],
    [cat.label, `catalog.html?brand=${brand.id}#${cat.id}`],
    [last, null],
  ];
  items.forEach(([text, href], i) => {
    if (i) crumbs.append(el('span', '', '/'));
    if (href) { const a = el('a', '', text); a.href = href; crumbs.append(a); }
    else { const s = el('span', '', text); s.setAttribute('aria-current', 'page'); crumbs.append(s); }
  });

  main.replaceChildren(root);
  initAccordions(main);
  setMeta(p.name, PRODUCT_TEXTS[p.slug]?.lead || p.description);
}

const id = new URLSearchParams(location.search).get('id');
const product = PRODUCTS.find((p) => p.slug === id);
product ? renderProduct(product) : renderNotFound();
// reveal після рендеру, щоб елементи потрапили в спостереження
await import('./reveal.js');
