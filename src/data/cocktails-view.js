// Підготовка даних коктейлів до шаблону (лише збірка/dev: імпортує vite.config.js; у браузер не потрапляє).
// Повертає масив «параметрів» для partials/components/cocktail.html: усі рядки вже екрановані для HTML/атрибутів,
// списки (photos, ingredients, steps) — масиви для вкладених <!--@each … -->. Дані — src/data/cocktails.js.
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmtPrice = (n) => `${n.toLocaleString('uk-UA')} ₴`;

export function cocktailsView(cocktails, products) {
  const slugs = new Set();
  return cocktails.map((c, i) => {
    if (!c.slug || !/^[a-z0-9-]+$/.test(c.slug)) throw new Error(`cocktails.js: некоректний slug «${c.slug}» (латиниця, цифри, дефіс)`);
    if (slugs.has(c.slug)) throw new Error(`cocktails.js: slug «${c.slug}» повторюється`);
    slugs.add(c.slug);
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
      multi: photos.length > 1 ? 'true' : '',
      photos: photos.map((ph, k) => ({
        src: `/${esc(ph.src)}`,
        rel: esc(ph.src), // для data-src: JS додає import.meta.env.BASE_URL (Vite переписує під base лише src/href, не data-*)
        thumb: `/${esc(ph.thumb || ph.src)}`,
        alt: esc(ph.alt),
        label: esc(`Фото ${k + 1} з ${photos.length}: ${ph.alt}`),
        pressed: k === 0 ? 'true' : 'false',
        slot: esc(ph.slot || `Фото ${k + 1}: ${c.title}`),
      })),
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
      productPrice: p?.price != null ? `${p.volumes.length > 1 ? 'від ' : ''}${fmtPrice(p.price)}` : '',
      productNote: esc(c.productNote || ''),
    };
  });
}
