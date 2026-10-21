// Підготовка даних коктейлів до шаблону (лише збірка/dev: імпортує vite.config.js; у браузер не потрапляє).
// Повертає масив «параметрів» для partials/components/cocktail.html: усі рядки вже екрановані для HTML/атрибутів,
// списки (photos, ingredients, steps) — масиви для вкладених <!--@each … -->. Дані — src/data/cocktails.js.
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const LIMITS = { description: 320, ingredients: 7, steps: 6, photos: 1 };

export function cocktailsView(cocktails, products, locale = 'uk') {
  const en = locale === 'en';
  const fmtPrice = (n) => (en ? `₴${n.toLocaleString('en-GB')}` : `${n.toLocaleString('uk-UA')} ₴`); // як fmtPrice() у src/i18n/runtime.js
  const slugs = new Set();
  return cocktails.map((c, i) => {
    if (!c.slug || !/^[a-z0-9-]+$/.test(c.slug)) throw new Error(`cocktails.js: некоректний slug «${c.slug}» (латиниця, цифри, дефіс)`);
    if (slugs.has(c.slug)) throw new Error(`cocktails.js: slug «${c.slug}» повторюється`);
    slugs.add(c.slug);
    // межі, за яких блок лишається висотою картки каталогу (довші дані — блок росте, але адмінка має попереджати раніше): помилка збірки з поясненням
    const fail = (msg) => { throw new Error(`cocktails.js «${c.slug}»: ${msg}`); };
    if (!c.title) fail('немає title');
    if (!c.description) fail('немає description');
    if (c.description.length > LIMITS.description) fail(`description ${c.description.length} символів — максимум ${LIMITS.description} (2–3 речення)`);
    if (!c.ingredients?.length || c.ingredients.length > LIMITS.ingredients) fail(`ingredients: ${c.ingredients?.length || 0} — потрібно 1–${LIMITS.ingredients}`);
    if (!c.steps?.length || c.steps.length > LIMITS.steps) fail(`steps: ${c.steps?.length || 0} — потрібно 1–${LIMITS.steps}`);
    if (!c.photos?.length) fail('photos порожній — потрібно 1–3 фото');
    const photos = (c.photos || []).slice(0, 3); // 1–3: колонка мініатюр сторінки товару (3×167 + 2×7 + 2×15 = 545u) вміщується у висоту блоку = картка каталогу 547.67u
    if (!photos.length) throw new Error(`cocktails.js: «${c.slug}» без фото (потрібно 1–3)`);
    if ((c.photos || []).length > 3) console.warn(`[cocktails] «${c.slug}»: фото більше 3 — показуються перші 3`);
    const p = products.find((x) => x.slug === c.product);
    if (c.product && !p) console.warn(`[cocktails] «${c.slug}»: товар «${c.product}» не знайдено в products.js — картка не показується`);
    const title = esc(c.title);
    return {
      slug: c.slug,
      title,
      original: esc(c.original || ''),
      description: esc(c.description),
      draft: c.draft ? 'true' : '',
      // перше фото — на сцені; LCP — лише перший блок сторінки (решта lazy)
      photoSrc: `/${esc(photos[0].src)}`,
      photoAlt: esc(photos[0].alt),
      loading: i === 0 ? 'eager' : 'lazy',
      fetchpriority: i === 0 ? 'high' : 'auto',
      ingredients: (c.ingredients || []).map((x) => ({ name: esc(x.name), amount: esc(x.amount) })),
      steps: (c.steps || []).map((text, k) => ({ n: String(k + 1), text: esc(text) })),
      glass: esc(c.serve?.glass || ''),
      garnish: esc(c.serve?.garnish || ''),
      hasProduct: p ? 'true' : '',
      productSlug: p ? esc(p.slug) : '',
      productBrand: p ? esc(p.brand) : '',
      productName: p ? esc(p.name) : '',
      // картка — дослівно як у каталозі (catalog.js): назва nameLines[0] <br> nameLines[1], фото catalogImage || image, ціна «від …» для кількох об'ємів
      productNameHtml: p ? (p.nameLines || [p.name]).map(esc).join('<br>') : '',
      productImage: p && (p.catalogImage || p.image) ? `/${esc(p.catalogImage || p.image)}` : '',
      productPrice: p?.price != null ? `${p.volumes.length > 1 ? (en ? 'from ' : 'від ') : ''}${fmtPrice(p.price)}` : '',
      productNote: esc(c.productNote || ''),
    };
  });
}
