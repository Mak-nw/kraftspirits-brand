// СХЕМА ДАНИХ ШАБЛОНУ ПОСАДКОВОЇ СТОРІНКИ (lp) — єдине джерело правди для фронту й адмінки (docs/page-template.md; JSON Schema — docs/page-template.schema.json,
// генерується: node tools/lp-schema-json.mjs). Сторінка = ДАНІ (src/data/<сторінка>.js за цією схемою) + МЕДІА (шляхи в даних) + ТЕМА (src/styles/themes/<тема>.css).
// Поля адмінки = поля цієї схеми один-в-один: тип поля, обов'язковість, ліміт довжини (знаків), допустимі значення.
// Файл — чистий ESM без DOM/Node API: читають vite.config.js (збірка/dev) і інструменти. У браузер не потрапляє.
//
// Позначки полів: req — обов'язкове; max — ліміт знаків; enum — список значень; list — масив (min/max елементів); of — схема елемента масиву.
// [потрібно уточнити] у тексті — видимий плейсхолдер для замовника (дозволено в будь-якому текстовому полі); порожній рядок необов'язкового поля — блок не показується.

const T = (max, req = false, extra = {}) => ({ type: 'text', max, req, ...extra });   // текст (екранується)
const URL_ = (req = false) => ({ type: 'url', req });                                 // шлях або посилання (/assets/…, page.html#id, tel:, https:)
const E = (values, req = false, def) => ({ type: 'enum', values, req, def });
const N = (req = false) => ({ type: 'number', req });
const B = () => ({ type: 'bool' });
const L = (of, min = 0, max = 99, req = false) => ({ type: 'list', of, min, max, req });
const O = (fields, req = false) => ({ type: 'object', fields, req });

const ROOMS = ['warm', 'deep', 'paper'];                    // кімнати: кольори задає тема (warm/deep — темні, paper — світла)
const CTA = O({ text: T(24, true), href: URL_(true) });
const MEDIA_IMG = { img: URL_(), alt: T(140), slot: T(240) }; // slot — підказка «що тут має бути за фото» (режим ?slots=on, data-slot)

// спільні поля секції
const BASE = { type: { type: 'type', req: true }, id: { type: 'id', req: true }, room: E(ROOMS, false), join: B(), kicker: T(25), title: T(60, true), lead: T(320), caption: T(120) };

export const SCHEMA = {
  page: {
    slug: { type: 'id', req: true },            // ім'я файлу сторінки (<slug>.html) і ключ даних
    theme: { type: 'id', req: true },           // src/styles/themes/<theme>.css → клас body.theme-<theme>
    tone: E(['teal', 'green', 'gold', 'light', 'beige'], true), // тон основних кнопок DS (.btn--<tone>) на світлому/фото
    metaTitle: T(70, true),
    metaDescription: T(200, true),   // пошуковики показують ≈155 знаків
    sections: L({ type: 'section' }, 1, 20, true),
  },
  sections: {
    // 1. Перший екран: фото на весь екран, h1, лід, кнопка
    hero: { ...BASE, id: { type: 'id' }, room: E([], false), title: T(60, true), lead: T(160), ...MEDIA_IMG, img: URL_(true), cta: { ...CTA, req: true } },
    // 2. Шари / переваги: «розріз» із фото-смуг впритул (img у кожного пункту) + підписи; без фото — лише підписи. items: 2, 3, 4 або 6 (ділять 12 колонок)
    layers: { ...BASE, room: E(ROOMS, false, 'warm'), items: L(O({ key: { type: 'id', req: true }, icon: { type: 'icon' }, title: T(25, true), text: T(90, true), img: URL_(), slot: T(240) }), 2, 6, true) },
    // 3. Кроки: sticky-арка з медіа (scene — гравюра partials/media/<scene>.html АБО img — фото) + кроки-цифри
    steps: { ...BASE, room: E(ROOMS, false, 'deep'), scene: { type: 'partial' }, ...MEDIA_IMG, items: L(O({ key: { type: 'id', req: true }, value: T(8, true), title: T(25, true), text: T(160, true) }), 2, 5, true) },
    // 4. Порівняння: групи поруч (span колонок) — ярлик, число (+ «≈»), одиниця, медіа wall АБО list, факти
    compare: { ...BASE, room: E(ROOMS, false, 'paper'), note: T(200), groups: L(O({
      key: { type: 'id', req: true }, label: T(25, true), span: E([2, 3, 4, 5, 6, 7, 8, 9], true), align: E(['start', 'center'], false, 'start'), accent: B(),
      count: N(true), approx: B(), unit: T(40, true), wall: E(['one', 'four-minus-one']), list: L(T(90), 0, 8),
      facts: L(O({ value: T(60, true), label: T(60, true) }), 0, 3),
    }), 2, 3, true) },
    // 5. Плитки: медіа (engraving — гравюра partials/media/<engraving>.html + icon АБО img — фото 3:4) + назва, підпис, ноти
    tiles: { ...BASE, room: E(ROOMS, false, 'paper'), items: L(O({ key: { type: 'id', req: true }, engraving: { type: 'partial' }, icon: { type: 'icon' }, ...MEDIA_IMG, name: T(25, true), origin: T(60, true), notes: T(60) }), 2, 6, true) },
    // 6. Пропозиції/ціна: фото на всю секцію (bg) + шапка (маршрут, лід) + панелі DS + рядок контактів (foot)
    offers: { ...BASE, room: E(ROOMS, false, 'deep'), bg: URL_(), bgW: N(), bgH: N(), bgSlot: T(240),
      route: O({ from: T(30, true), to: T(30, true), icon: { type: 'icon', req: true } }),
      items: L(O({ key: { type: 'id', req: true }, title: T(25, true), price: T(14, true), priceNote: T(20), facts: L(O({ dt: T(40, true), dd: T(60, true) }), 0, 4), includes: L(T(90), 0, 5), cta: { ...CTA, req: true } }), 1, 3, true),
      foot: O({ text: T(160, true), ctas: L(O({ text: T(24, true), href: URL_(true), variant: E(['light', 'beige', 'gold', 'teal', 'green'], true) }), 0, 2), note: T(200) }) },
    // 7. Картка: ІСНУЮЧА панель tour-card (текст + фото), опційний список
    card: { ...BASE, room: E(ROOMS, false, 'warm'), text: T(320), list: L(T(90), 0, 4), photoFirst: B(), ...MEDIA_IMG, img: URL_(true), cta: { ...CTA, req: true } },
    // 8. Місце: панель DS з фактами й кнопками + мапа DS (координати — src/data/contacts.js)
    place: { ...BASE, room: E(ROOMS, false, 'deep'), facts: L(O({ label: T(30, true), value: T(90, true), icon: { type: 'icon' }, href: URL_() }), 1, 5, true), ctas: L(O({ text: T(24, true), href: URL_(true), variant: E(['green', 'teal', 'outline'], true) }), 0, 2) },
    // 9. Питання: ІСНУЮЧА група FAQ (faq-group + faq-item), дві колонки
    faq: { ...BASE, room: E(ROOMS, false, 'deep'), items: L(O({ q: T(90, true), a: T(600, true) }), 1, 12, true) },
  },
};

/* ------------------------------------------------------------------ перевірка даних (збірка падає з поясненням) */
const fail = (path, msg) => { throw new Error(`lp: ${path}: ${msg}`); };
function check(def, v, path) {
  const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
  if (empty) { if (def.req) fail(path, 'обов\'язкове поле порожнє'); return; }
  switch (def.type) {
    case 'text': if (typeof v !== 'string') fail(path, 'має бути текстом'); if ([...v].length > def.max) fail(path, `довжина ${[...v].length} > ${def.max} знаків`); break;
    case 'url': if (typeof v !== 'string' || /["<>\s]/.test(v)) fail(path, 'некоректне посилання'); break;
    case 'id': case 'partial': case 'icon': if (typeof v !== 'string' || !/^[a-z0-9-]+$/.test(v)) fail(path, 'лише латиниця, цифри, дефіс'); break;
    case 'enum': if (!def.values.includes(v)) fail(path, `допустимо: ${def.values.join(' | ')}`); break;
    case 'number': if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'має бути числом'); break;
    case 'bool': if (typeof v !== 'boolean') fail(path, 'має бути true/false'); break;
    case 'list': if (!Array.isArray(v)) fail(path, 'має бути списком'); if (v.length < def.min || v.length > def.max) fail(path, `елементів ${v.length}, допустимо ${def.min}–${def.max}`); v.forEach((x, i) => check(def.of, x, `${path}[${i}]`)); break;
    case 'object': for (const [k, d] of Object.entries(def.fields)) check(d, v[k], `${path}.${k}`); for (const k of Object.keys(v)) if (!(k in def.fields)) fail(`${path}.${k}`, 'невідоме поле (немає в схемі)'); break;
    default: break;
  }
}
export function validatePage(page) {
  const { sections, ...rest } = page;
  for (const [k, d] of Object.entries(SCHEMA.page)) if (k !== 'sections') check(d, rest[k], `${page.slug}.${k}`);
  if (!Array.isArray(sections) || !sections.length) fail(`${page.slug}.sections`, 'порожньо');
  const ids = new Set();
  sections.forEach((s, i) => {
    const path = `${page.slug}.sections[${i}](${s.id || s.type})`;
    const def = SCHEMA.sections[s.type];
    if (!def) fail(path, `невідомий type «${s.type}»; допустимо: ${Object.keys(SCHEMA.sections).join(', ')}`);
    if (ids.has(s.id)) fail(path, `id «${s.id}» повторюється`); ids.add(s.id);
    check({ type: 'object', fields: def }, s, path);
    if (s.type === 'compare') s.groups.forEach((g, j) => { if (g.wall && g.list?.length) fail(`${path}.groups[${j}]`, 'wall і list — взаємовиключні'); });
    if (s.type === 'compare') { const sum = s.groups.reduce((a, g) => a + g.span, 0); if (sum !== 12) fail(`${path}.groups`, `сума span = ${sum}, має бути 12`); }
    if (['layers', 'tiles'].includes(s.type) && 12 % s.items.length) fail(`${path}.items`, 'кількість має ділити 12 (2, 3, 4, 6)');
    if (s.type === 'steps' && !s.scene && !s.img) fail(path, 'потрібне медіа арки: scene або img');
    if (s.type === 'tiles') s.items.forEach((t, j) => { if (!t.engraving && !t.img) fail(`${path}.items[${j}]`, 'потрібне медіа: engraving або img'); });
    if (s.type === 'card' && !s.text && !s.list?.length) fail(path, 'потрібен text або list');
    if (s.type === 'offers') { const n = s.items.length; if (12 % n) fail(`${path}.items`, 'кількість має ділити 12'); }
  });
  return true;
}

/* ------------------------------------------------------------------ вигляд для partials (плоскі поля, екрановані рядки) */
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const li = (arr) => (arr || []).map((t) => ({ text: esc(t) }));
function head(s) { return { id: s.id, kicker: esc(s.kicker), title: esc(s.title), lead: esc(s.lead), caption: esc(s.caption) }; }

const VIEW = {
  hero: (s, p) => ({ ...head(s), img: s.img, alt: esc(s.alt), slot: esc(s.slot), ctaText: esc(s.cta.text), ctaHref: esc(s.cta.href), tone: p.tone }),
  layers: (s) => {
    const span = 12 / s.items.length;
    const cut = s.items.some((it) => it.img);
    return { ...head(s), cut: cut ? '1' : '', noCut: cut ? '' : '1',
      items: s.items.map((it) => ({ key: it.key, span, icon: it.icon || '', title: esc(it.title), text: esc(it.text), img: it.img || '', slot: esc(it.slot) })) };
  },
  steps: (s) => {
    const rich = !!(s.kicker || s.lead || s.caption);
    return { ...head(s), plainHead: rich ? '' : '1', richHead: rich ? '1' : '', scene: s.scene || '', img: s.img || '', alt: esc(s.alt), slot: esc(s.slot),
      items: s.items.map((it, i) => ({ key: it.key, n: i + 1, value: esc(it.value), title: esc(it.title), text: esc(it.text) })) };
  },
  compare: (s) => ({ ...head(s), note: esc(s.note),
    groups: s.groups.map((g) => ({ key: g.key, span: g.span, mods: `${g.accent ? ' lp-group--accent' : ''}${g.align === 'center' ? ' lp-group--center' : ''} lp-group--${g.key}`,
      label: esc(g.label), count: g.count, approx: g.approx ? '1' : '', unit: esc(g.unit), wall: g.wall || '', list: li(g.list),
      facts: (g.facts || []).map((f) => ({ value: esc(f.value), label: esc(f.label), valueMod: [...f.value].length > 16 ? ' lp-group__fact-value--wrap' : '' })) })) }),
  tiles: (s) => ({ ...head(s), items: s.items.map((it) => ({ key: it.key, span: 12 / s.items.length, engraving: it.engraving || '', icon: it.icon || '', img: it.img || '', alt: esc(it.alt), slot: esc(it.slot), name: esc(it.name), origin: esc(it.origin), notes: esc(it.notes) })) }),
  offers: (s, p) => ({ ...head(s), bg: s.bg || '', bgW: s.bgW || '', bgH: s.bgH || '', bgSlot: esc(s.bgSlot),
    routeFrom: esc(s.route?.from), routeTo: esc(s.route?.to), routeIcon: s.route?.icon || '',
    items: s.items.map((it) => ({ key: it.key, span: 12 / s.items.length, tone: p.tone, title: esc(it.title), price: esc(it.price), priceNote: esc(it.priceNote),
      facts: (it.facts || []).map((f) => ({ dt: esc(f.dt), dd: esc(f.dd), ddMod: [...f.dd].length > 24 ? ' lp-offer__dd--wrap' : '' })),
      includes: li(it.includes), ctaText: esc(it.cta.text), ctaHref: esc(it.cta.href) })),
    footText: esc(s.foot?.text), footNote: esc(s.foot?.note), footCtas: (s.foot?.ctas || []).map((c) => ({ text: esc(c.text), href: esc(c.href), variant: c.variant })) }),
  card: (s, p) => ({ ...head(s), text: esc(s.text), ctaText: esc(s.cta.text), ctaHref: esc(s.cta.href), tone: p.tone,
    photo: (s.img || '').replace(/^\/assets\/img\//, ''), alt: esc(s.alt), slot: esc(s.slot), cardMod: s.photoFirst ? ' tour-card--photo-first' : '',
    listHtml: (s.list || []).map((t) => `<li>${esc(t)}</li>`).join('') }),
  place: (s) => ({ ...head(s),
    facts: s.facts.map((f) => ({ label: esc(f.label), value: esc(f.value), icon: f.icon || '', href: f.href ? esc(f.href) : '', plain: f.href ? '' : '1', external: /^https?:/.test(f.href || '') || /^%contacts\.gmaps/.test(f.href || '') ? '1' : '' })),
    ctas: (s.ctas || []).map((c) => ({ text: esc(c.text), href: esc(c.href), variant: c.variant, arrow: c.variant === 'outline' ? '' : '1' })) }),
  faq: (s) => {
    const items = s.items.map((it, k) => ({ id: `${s.id}-${k + 1}`, q: esc(it.q), aHtml: `<p class="t-text">${esc(it.a)}</p>`, open: '', expanded: 'false' })); // як faq.html: закриті, відкриття — accordion.js
    const half = Math.ceil(items.length / 2);
    return { ...head(s), groups: [{ slug: `${s.id}-list`, title: esc(s.title), itemsLeft: items.slice(0, half), itemsRight: items.slice(half) }] };
  },
};

/** Перевіряє дані сторінки й повертає вигляд для partials/lp/page.html (секції — partials/lp/<type>.html). */
export function lpView(page) {
  validatePage(page);
  const sections = page.sections.map((s, i) => {
    const def = SCHEMA.sections[s.type];
    const room = s.room || def.room?.def || '';
    const next = page.sections[i + 1];
    const mods = `${s.join ? ' lp-sec--join' : ''}${next?.join ? ' lp-sec--join-next' : ''}`;
    return { type: s.type, room, mods, ...VIEW[s.type](s, page) };
  });
  return { slug: page.slug, theme: page.theme, tone: page.tone, metaTitle: esc(page.metaTitle), metaDescription: esc(page.metaDescription), sections };
}
