// Підготовка юридичних документів (src/data/legal.js) до шаблону (лише збірка/dev: імпортує vite.config.js; у браузер не потрапляє).
// legalLists(LEGAL) → { legalPrivacy: [doc], legalCookies: [doc], … }: для кожного документа список з ОДНОГО елемента
// під <!--@each legalPrivacy sections/legal-doc--> (ключ = 'legal' + Slug у CamelCase: 'age-policy' → legalAgePolicy).
// Елемент: { slug, title, lead, updated, sections: [{ slug, title, bodyHtml }] } — рядки екрановані; sections —
// вкладений цикл <!--@each sections sections/faq-nav--> (навігація, як у FAQ) і <!--@each sections sections/legal-section-->.
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SLUG_RE = /^[a-z0-9-]+$/;
// id, зайняті хедером/футером/partial-ами на кожній сторінці: розділ з таким slug зламав би якір
const RESERVED_IDS = new Set(['contacts', 'site-menu', 'age-gate']);

export function legalView(doc) {
  if (!doc.slug || !SLUG_RE.test(doc.slug)) throw new Error(`legal.js: некоректний slug документа «${doc.slug}» (латиниця, цифри, дефіс)`);
  if (!doc.title) throw new Error(`legal.js «${doc.slug}»: немає title`);
  if (!doc.lead) throw new Error(`legal.js «${doc.slug}»: немає lead`);
  if (!doc.sections?.length) throw new Error(`legal.js «${doc.slug}»: порожній sections`);
  const slugs = new Set();
  const sections = doc.sections.map((s, k) => {
    if (!s.slug || !SLUG_RE.test(s.slug)) throw new Error(`legal.js «${doc.slug}» розділ №${k + 1}: некоректний slug «${s.slug}»`);
    if (slugs.has(s.slug)) throw new Error(`legal.js «${doc.slug}»: slug розділу «${s.slug}» повторюється`);
    if (RESERVED_IDS.has(s.slug)) throw new Error(`legal.js «${doc.slug}»: slug «${s.slug}» зайнятий id сторінки (хедер/футер)`);
    slugs.add(s.slug);
    if (!s.title) throw new Error(`legal.js «${doc.slug}» розділ «${s.slug}»: немає title`);
    const paras = (Array.isArray(s.body) ? s.body : [s.body]).filter((p) => p && String(p).trim());
    if (!paras.length) throw new Error(`legal.js «${doc.slug}» розділ «${s.slug}»: порожній body`);
    // абзаци — готова розмітка з екранованого тексту (роль .t-text, як відповідь FAQ)
    return { slug: s.slug, title: esc(s.title), bodyHtml: paras.map((p) => `<p class="t-text">${esc(p)}</p>`).join('') };
  });
  return { slug: doc.slug, title: esc(doc.title), lead: esc(doc.lead), updated: esc(doc.updated ?? ''), sections };
}

export function legalLists(docs) {
  const lists = {};
  for (const doc of docs) {
    const key = `legal${doc.slug.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase())}`;
    if (lists[key]) throw new Error(`legal.js: документ «${doc.slug}» повторюється`);
    lists[key] = [legalView(doc)];
  }
  return lists;
}
