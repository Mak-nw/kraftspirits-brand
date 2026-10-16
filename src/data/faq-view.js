// Підготовка даних FAQ до шаблону (лише збірка/dev: імпортує vite.config.js; у браузер не потрапляє).
// Повертає масив груп для <!--@each faq sections/faq-group-->: рядки екрановані,
// items — масив параметрів partials/components/faq-item.html (вкладений <!--@each items components/faq-item-->). Дані — src/data/faq.js.
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function faqView(groups) {
  const slugs = new Set();
  return groups.map((g) => {
    if (!g.slug || !/^[a-z0-9-]+$/.test(g.slug)) throw new Error(`faq.js: некоректний slug групи «${g.slug}» (латиниця, цифри, дефіс)`);
    if (slugs.has(g.slug)) throw new Error(`faq.js: slug «${g.slug}» повторюється`);
    slugs.add(g.slug);
    if (!g.title) throw new Error(`faq.js «${g.slug}»: немає title`);
    if (!g.items?.length) throw new Error(`faq.js «${g.slug}»: порожній items`);
    const items = g.items.map((it, k) => {
        const paras = (Array.isArray(it.a) ? it.a : [it.a]).filter((p) => p && String(p).trim());
        if (!it.q) throw new Error(`faq.js «${g.slug}» №${k + 1}: немає q`);
        if (!paras.length) throw new Error(`faq.js «${g.slug}» №${k + 1}: немає відповіді a`);
        return {
          id: `${g.slug}-${k + 1}`,
          q: esc(it.q),
          // абзаци відповіді — готова розмітка з екранованого тексту (роль .t-text, як відповідь faq-item)
          aHtml: paras.map((p) => `<p class="t-text">${esc(p)}</p>`).join(''),
          // за замовчуванням усі відповіді закриті (без open у розмітці); open — лише у faqDemo для design-system.html
          open: '',
          expanded: 'false',
        };
      });
    // дві незалежні колонки (колонкове заповнення): перша половина питань — ліва колонка, друга — права; непарна кількість — зайве питання в лівій
    const half = Math.ceil(items.length / 2);
    return { slug: g.slug, title: esc(g.title), items, itemsLeft: items.slice(0, half), itemsRight: items.slice(half) };
  });
}
