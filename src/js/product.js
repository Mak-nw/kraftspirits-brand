import { PRODUCTS as PRODUCTS_UK, BRANDS, CATEGORIES as CATEGORIES_UK } from '../data/products.js';
import * as TEXTS_UK from '../data/product-texts.js';
import { t, locale, fmtPrice } from '../i18n/runtime.js';
import { localizeCategories, localizeProduct, localizeProductTexts } from '../i18n/localize.js';
import { initAccordions } from './accordion.js';
import { addToCart } from './cart-counter.js';
import { createPhotoStage, warm, whenIdle } from './photo-stage.js';

const PRODUCTS = PRODUCTS_UK.map((p) => localizeProduct(p, locale())); // мова сторінки: оверлеї src/i18n/data/*.en.js
const CATEGORIES = localizeCategories(CATEGORIES_UK, locale());
const { PRODUCT_TEXTS, PRODUCT_SERVE, PRODUCT_DELIVERY } = localizeProductTexts(TEXTS_UK, locale());
const base = import.meta.env.BASE_URL;
const main = document.querySelector('#product');
const tpl = (id) => document.querySelector(`#${id}`).content.firstElementChild.cloneNode(true);
const fmtVol = (l) => t('js.vol.l', { n: String(l).replace('.', locale() === 'en' ? '.' : ',') }); // «0,7 л» / «0.7 L»
const volIcon = (l) => (l <= 0.6 ? 'bottle-0-5' : l <= 0.85 ? 'bottle-0-7' : 'bottle-1'); // іконка пляшки за об'ємом (0,5 / 0,7 / 1 л)
const withIcon = (node, l) => { const i = el('span', `icon icon--${volIcon(l)}`); i.setAttribute('aria-hidden', 'true'); node.prepend(i); return node; };
// «іконка міцності + значення» (.strength): лише шапка продукту YC («42% alc»); у табах-акордеонах іконок немає (b2a56fb1)
const strengthNode = (text, cls = '') => { const n = el('span', `strength ${cls}`.trim()); const i = el('span', 'icon icon--strength'); i.setAttribute('aria-hidden', 'true'); n.append(i, text); return n; };
const fmtMl = (l) => t('js.vol.ml', { n: Math.round(l * 1000) }); // 0.5 л → «500 мл» (YasnoCraft 205:2442)
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
  p.append(el('strong', 't-nav', text == null ? label : `${label}:`));
  if (text != null) p.append(' ', text);
  return p;
};

// вміст власного таба: абзаци (text), список (items), абзаци після списку (note), кнопки-посилання (links: той самий .btn--light, що й на інших сторінках)
function customTabNodes(tab) {
  const nodes = (tab.text || []).map((s) => el('p', '', s));
  if (tab.items?.length) {
    const ul = el('ul');
    tab.items.forEach((s) => ul.append(el('li', '', s)));
    nodes.push(ul);
  }
  (tab.note || []).forEach((s) => nodes.push(el('p', '', s)));
  (tab.links || []).forEach((l) => {
    const a = el('a', 'btn btn--light');
    a.href = l.href;
    a.append(el('span', 'btn__inner t-btn', l.label));
    nodes.push(a);
  });
  return nodes;
}

// ---- тексти шести акордеонів: повні (3 позиції) або з products.js; порожній акордеон не показуємо ----
function buildSections(p) {
  const txt = PRODUCT_TEXTS[p.slug];
  const serve = PRODUCT_SERVE[p.slug];
  const volumes = p.volumes.map((v) => fmtVol(v.l)).join(' / ');
  const about = [];
  const sensory = [];
  const features = [];
  if (txt) {
    about.push(...[txt.lead, ...(txt.about || [])].filter(Boolean).map((s) => { const n = el('p'); n.textContent = s; return n; }));
    (txt.sensory || []).forEach(([k, v]) => sensory.push(labelled(k, v)));
    (txt.features || []).forEach((f) => { const li = el('li'); li.textContent = f; features.push(li); });
  } else {
    if (p.description) about.push(el('p', '', p.description));
    if (p.notes) sensory.push(labelled(t('js.product.taste'), p.notes));
    if (p.kind) features.push(el('li', '', t('js.product.type-line', { v: p.kind })));
    if (p.abv) features.push(el('li', '', t('js.product.abv-line', { v: p.abv })));
    if (p.volumes.length) features.push(el('li', '', `${p.volumes.length > 1 ? t('js.product.volumes') : t('js.product.volume')}: ${volumes}`));
  }
  const ul = features.length ? el('ul') : null;
  if (ul) ul.append(...features);
  // «Як подавати»
  const serveNodes = serve ? [el('p', '', serve)] : [];
  // «Характеристики»: пари «підпис — значення» лише з наявних полів
  const brandLabel = BRANDS.find((b) => b.id === p.brand)?.label;
  const catLabel = CATEGORIES.find((c) => c.id === p.category)?.label;
  const specRows = [
    [t('js.product.brand'), brandLabel],
    [t('js.product.category'), catLabel],
    [t('js.product.type'), p.kind],
    [t('js.product.abv'), p.abv ? `${p.abv}%` : null],
    [p.volumes.length > 1 ? t('js.product.volumes') : t('js.product.volume'), volumes],
    [t('js.product.country'), t('js.product.ukraine')],
    [t('js.product.maker'), t('js.product.maker-value')],
  ].filter(([, v]) => v);
  const dl = el('dl', 'product-specs');
  specRows.forEach(([k, v]) => {
    const dd = el('dd');
    dd.textContent = v;
    dl.append(el('dt', 't-nav', k), dd);
  });
  // «Доставка й оплата»
  const delivery = PRODUCT_DELIVERY.map(([k, v]) => labelled(k, v));
  // власні таби товару (подарункові набори, поле tabs у product-texts.js): замість «Про напій … Як подавати»; далі — «Характеристики» і «Доставка й оплата»
  if (txt?.tabs) {
    return [
      ...txt.tabs.map((tab) => [tab.title, customTabNodes(tab)]),
      [t('js.product.acc.specs'), specRows.length ? [dl] : []],
      [t('js.product.acc.delivery'), delivery],
    ].filter(([, nodes]) => nodes.length);
  }
  return [
    [t('js.product.acc.about'), about],
    [t('js.product.acc.sensory'), sensory],
    [t('js.product.acc.features'), ul ? [ul] : []],
    [t('js.product.acc.serve'), serveNodes],
    [t('js.product.acc.specs'), specRows.length ? [dl] : []],
    [t('js.product.acc.delivery'), delivery],
  ].filter(([, nodes]) => nodes.length);
}

function renderNotFound() {
  main.removeAttribute('data-pending'); // не знайдено: резерв висоти фрейму не потрібен
  main.removeAttribute('data-brand');
  document.body.classList.remove('page-product'); // «не знайдено»: бежеве тло без візерунка (зона header знову зелена)
  main.replaceChildren(tpl('product-notfound-template'));
  setMeta(t('js.product.notfound'));
  document.title = `${t('js.product.notfound')} — ${SUFFIX}`;
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
    b.setAttribute('aria-label', t('js.product.photo', { a: i + 1, b: slides.length }));
    const im = el('img');
    im.src = base + s.thumb;
    im.alt = '';
    b.append(im);
    thumbsNav.append(b);
    return b;
  });
  // зміна фото — cross-fade (спільний модуль photo-stage.js: нове <img> поверх, старе під ним; reduced-motion — миттєво)
  const photo = createPhotoStage(stage);
  const setPhoto = (s) => photo.show({ src: base + s.large, alt: p.name, cutout: s.cutout });
  const show = (i) => {
    active = i;
    const s = i < 0 ? mainSlide : slides[i];
    thumbs.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    setPhoto(s);
  };
  // повторний клік по активній мініатюрі повертає головне фото
  thumbs.forEach((b, i) => b.addEventListener('click', () => show(active === i ? -1 : i)));
  // Попереднє підвантаження великих кадрів (lg-webp): інакше перша заміна чекає мережу ≈1 с. Не на старті (LCP/пропускна здатність головного фото):
  // (а) на pointerenter/focus мініатюри — саме її кадр; (б) решта — у простої після події load (photo-stage.js: warm / whenIdle).
  thumbs.forEach((b, i) => { const w = () => warm(base + slides[i].large); b.addEventListener('pointerenter', w); b.addEventListener('focus', w); });
  whenIdle(() => slides.forEach((s) => warm(base + s.large)));
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
  const last = p.crumb || (sameCat ? p.nameLines.slice(1).join(' ') : p.nameLines.join(' ')); // crumb — коротка назва для крихт (подарункові набори: інакше крихти не вміщуються в 1 рядок)
  const crumbs = q('.product-crumbs');
  const items = [
    [t('js.product.crumb-catalog'), 'catalog.html'],
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
