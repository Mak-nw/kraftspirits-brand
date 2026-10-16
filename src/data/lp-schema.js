// СХЕМА ДАНИХ ШАБЛОНУ ПОСАДКОВОЇ СТОРІНКИ (lp) — єдине джерело правди для фронту й адмінки (docs/page-template.md; JSON Schema — docs/page-template.schema.json,
// генерується з ЦЬОГО Ж файлу: node tools/lp-schema-json.mjs). Сторінка = ДАНІ (src/data/<сторінка>.js за цією схемою) + МЕДІА (шляхи в даних) + ТЕМА (src/styles/themes/<тема>.css).
// Поля адмінки = поля цієї схеми один-в-один: тип поля, обов'язковість, ліміт довжини (знаків), допустимі значення.
// Файл — чистий ESM без DOM/Node API: читають vite.config.js (збірка/dev), tools/lp-schema-json.mjs і QA. У браузер не потрапляє.
//
// Позначки полів: req — обов'язкове; max — ліміт знаків (кодових точок); enum — список значень; list — масив (min/max елементів); of — схема елемента масиву.
// Порожнє значення необов'язкового поля ('' / null / відсутнє / порожній масив) = поле не задано, блок не показується.
// [потрібно уточнити] у тексті — видимий плейсхолдер для замовника (дозволено в будь-якому текстовому полі).
//
// ПРАВИЛА (RULES, PAGE_RULES): перехресні перевірки, що не виражаються типом поля. Кожне правило — ОДИН об'єкт: check() для validatePage і (де JSON Schema це вміє)
// json-фрагмент для tools/lp-schema-json.mjs; правила без json потрапляють у «x-rules» згенерованої JSON Schema й у docs («Додаткові перевірки»).
// Контракт «поле схеми ⇒ показується на сторінці» перевіряє tools/qa/lp-contract.mjs (маркерний прогін), «JS ≡ JSON» — він же (ajv).

/* ------------------------------------------------------------------ ліміти й константи */
export const GRID_COLS = 12;                 // колонок сітки: кількість пунктів і сума span мають ділити/давати 12
export const MAX_WORD = 30;                  // найдовше слово без пробілу (знаків) у тексті: довше не вміститься у вузьку колонку
export const BTN_WORD = 16;                  // найдовше слово в тексті кнопки (кнопки DS не переносять рядок)
// ціна `.t-stat` (≈122px на 1440) не переноситься по словах → ємність залежить від кількості панелей: цифри 21 / 10 / 6 знаків; слова — вужче (одиницю — у priceNote)
export const PRICE_MAX = { 1: 21, 2: 10, 3: 6 };
// card (панель tour-card, висота фіксована 629u, заголовок .t-hero займає до 3 рядків): ЛИБО абзац, ЛИБО список (разом не вміщаються). Межі виміряно: з ними
// проміжок «текст → кнопка» ≥ 50u (при заголовку в 3 рядки — не менше 0) на 1200–1920 (одиниці u масштабуються з вікном)
export const CARD_TITLE_MAX = 36;
export const CARD_TEXT_MAX = 260;
export const CARD_LIST_MAX = 3;
export const CARD_ITEM_MAX = 60;
export const COUNT_MAX = 99999;              // лічильник групи compare: ціле 0…99 999
// число `.t-stat` не переноситься: у вузьких групах (span 2–3) вміщується менше цифр (разом із розділювачем розрядів; з «≈» — ще менше)
export const COUNT_CAP = { 2: { plain: 999, approx: 99 }, 3: { plain: 99999, approx: 999 } };
export const LABELS = { approx: 'приблизно ' };   // службовий текст для читачів екрана

const T = (max, req = false, extra = {}) => ({ type: 'text', max, req, ...extra });   // текст (екранується)
const URL_ = (req = false, extra = {}) => ({ type: 'url', req, ...extra });            // посилання або шлях (див. URL_SOURCE); extra.startsWith — обов'язковий префікс шляху
const E = (values, req = false, def) => ({ type: 'enum', values, req, def });
const N = (req = false, extra = {}) => ({ type: 'number', req, ...extra });           // extra: int, min, max
const B = () => ({ type: 'bool' });
const L = (of, min = 0, max = 99, req = false, extra = {}) => ({ type: 'list', of, min: req ? Math.max(min, 1) : min, max, req, ...extra }); // extra: divides
const O = (fields, req = false) => ({ type: 'object', fields, req });

// допустимі посилання: якір #id · шлях від кореня /… (не //host) · http(s) · tel: · mailto: · %contacts.<ключ>% · файл-сторінка name.html[?query][#id]
export const URL_SOURCE = String.raw`#[a-z0-9-]+|/(?!/)[^\s"<>]*|https?://[^\s"<>]+|tel:\+?[0-9]+|mailto:[^\s"<>]+|%contacts\.\w+%|[a-z0-9-]+\.html(?:[?#][^\s"<>]*)?`;
const URL_RE = new RegExp(`^(?:${URL_SOURCE})$`);
const ID_RE = /^[a-z0-9-]+$/;
const wordRes = {};
const wordRe = (n) => (wordRes[n] ||= new RegExp(`[^ \\n\\r\\t]{${n + 1}}`, 'u'));  // слово довше n знаків
export const wordPattern = (n = MAX_WORD) => `^(?![\\s\\S]*[^ \\n\\r\\t]{${n + 1}})[\\s\\S]*$`; // те саме для JSON Schema (ECMA 262, режим u)

const ROOMS = ['warm', 'deep', 'paper'];                    // кімнати: кольори задає тема (warm/deep — темні, paper — світла)
export const TONES = ['teal', 'green', 'gold', 'light', 'beige'];
const CTA = O({ text: T(24, true, { word: BTN_WORD }), href: URL_(true) });
const MEDIA_IMG = { img: URL_(), alt: T(140), slot: T(240) }; // slot — підказка «що тут має бути за фото» (режим ?slots=on, data-slot)

// спільні поля секції. Кожен тип бере лише ті, що його partial справді показує (поле в схемі ⇒ воно є на сторінці; перевіряє lp-contract)
const BASE = { type: { type: 'type', req: true }, id: { type: 'id', req: true }, room: E(ROOMS, false), join: B(), kicker: T(25), title: T(60, true), lead: T(320), caption: T(120) };
const STACK = { stack: B() };   // card / place: «стек великих блоків» — секція стоїть під попередньою card/place в ТІЙ САМІЙ кімнаті, зазор --grid-gap-panels (5u)
const base = (...omit) => { const b = { ...BASE }; omit.forEach((k) => delete b[k]); return b; };

export const SCHEMA = {
  page: {
    slug: { type: 'id', req: true },            // ім'я файлу сторінки (<slug>.html) і ключ даних
    theme: { type: 'id', req: true },           // src/styles/themes/<theme>.css → клас body.theme-<theme>
    tone: E(TONES, false),                      // тон основних кнопок DS (.btn--<tone>); типово — --lp-tone теми
    metaTitle: T(70, true),
    metaDescription: T(200, true),   // пошуковики показують ≈155 знаків
    sections: L({ type: 'section' }, 1, 20, true),
  },
  sections: {
    // 1. Перший екран: фото на весь екран, h1, лід, кнопка (кімнати немає, kicker/caption не показуються)
    hero: { ...base('room', 'join', 'kicker', 'caption'), id: { type: 'id' }, lead: T(160), ...MEDIA_IMG, img: URL_(true), panel: B(), cta: { ...CTA, req: true } },
    // 2. Шари / переваги: «розріз» із фото-смуг впритул (img у кожного пункту) + підписи; без фото — лише підписи. items: 2, 3, 4 або 6 (ділять 12 колонок)
    layers: { ...BASE, room: E(ROOMS, false, 'warm'), items: L(O({ key: { type: 'id', req: true }, icon: { type: 'icon' }, title: T(25, true), text: T(90, true), img: URL_(), slot: T(240) }), 2, 6, true, { divides: GRID_COLS }) },
    // 3. Кроки: sticky-арка з медіа (scene — гравюра partials/media/scene-<назва>.html АБО img — фото) + кроки-цифри
    steps: { ...BASE, room: E(ROOMS, false, 'deep'), scene: { type: 'partial', kind: 'scene' }, ...MEDIA_IMG, items: L(O({ key: { type: 'id', req: true }, value: T(5, true), title: T(25, true), text: T(160, true) }), 2, 5, true) },
    // 4. Порівняння: групи поруч (span колонок) — ярлик, число (+ «≈»), одиниця, медіа wall (ілюстрація partials/media/wall-<назва>.html) АБО list, факти
    compare: { ...BASE, room: E(ROOMS, false, 'paper'), note: T(200), groups: L(O({
      key: { type: 'id', req: true }, label: T(25, true), span: E([2, 3, 4, 5, 6, 7, 8, 9], true), align: E(['start', 'center'], false, 'start'), accent: B(),
      count: N(true, { int: true, min: 0, max: COUNT_MAX }), approx: B(), unit: T(40, true), wall: { type: 'partial', kind: 'wall' }, list: L(T(90), 0, 8),
      facts: L(O({ value: T(60, true), label: T(60, true) }), 0, 3),
    }), 2, 3, true) },
    // 5. Плитки: медіа (engraving — гравюра partials/media/engraving-<назва>.html + icon АБО img — фото 3:4) + назва, підпис, ноти
    tiles: { ...BASE, room: E(ROOMS, false, 'paper'), items: L(O({ key: { type: 'id', req: true }, engraving: { type: 'partial', kind: 'engraving' }, icon: { type: 'icon' }, ...MEDIA_IMG, name: T(25, true), origin: T(60, true), notes: T(60) }), 2, 6, true, { divides: GRID_COLS }) },
    // 6. Пропозиції/ціна: фото на всю секцію (bg) + шапка (маршрут, лід) + панелі DS + необов'язковий рядок-підпис (foot; нема даних — блок не рендериться)
    offers: { ...base('caption'), room: E(ROOMS, false, 'deep'), bg: URL_(), bgW: N(false, { int: true, min: 1, max: 10000 }), bgH: N(false, { int: true, min: 1, max: 10000 }), bgSlot: T(240),
      route: O({ from: T(30, true), to: T(30, true), icon: { type: 'icon', req: true } }),
      items: L(O({ key: { type: 'id', req: true }, title: T(25, true), price: T(PRICE_MAX[1], true), priceNote: T(20), facts: L(O({ dt: T(40, true), dd: T(60, true) }), 0, 4), includes: L(T(90), 0, 5), cta: { ...CTA, req: true } }), 1, 3, true, { divides: GRID_COLS }),
      foot: O({ text: T(160, true), ctas: L(O({ text: T(24, true, { word: BTN_WORD }), href: URL_(true), variant: E(['light', 'beige', 'gold', 'teal', 'green'], true) }), 0, 2), note: T(200) }) },
    // 7. Картка: ІСНУЮЧА панель tour-card (текст АБО список + фото)
    card: { ...base('lead', 'caption'), ...STACK, title: T(CARD_TITLE_MAX, true), room: E(ROOMS, false, 'warm'), text: T(CARD_TEXT_MAX), list: L(T(CARD_ITEM_MAX), 0, CARD_LIST_MAX), photoFirst: B(), ...MEDIA_IMG, img: URL_(true, { startsWith: '/assets/img/' }), cta: { ...CTA, req: true } },
    // 8. Місце: панель DS з фактами й кнопками + мапа DS (координати — src/data/contacts.js)
    place: { ...base('caption'), ...STACK, room: E(ROOMS, false, 'deep'), facts: L(O({ label: T(30, true), value: T(90, true), icon: { type: 'icon' }, href: URL_() }), 1, 5, true), ctas: L(O({ text: T(24, true, { word: BTN_WORD }), href: URL_(true), variant: E(['green', 'teal', 'outline'], true) }), 0, 2) },
    // 9. Питання: ІСНУЮЧА група FAQ (faq-group + faq-item), дві колонки (кікера, ліду й підпису немає — лише заголовок групи)
    faq: { ...base('kicker', 'lead', 'caption'), room: E(ROOMS, false, 'deep'), items: L(O({ q: T(90, true), a: T(600, true) }), 1, 12, true) },
  },
};

/* ------------------------------------------------------------------ перехресні правила
   present(f, kind) — JSON-фрагмент «поле задано» ('' і [] = не задано, як у validatePage). */
const present = (f, kind = 'str') => (kind === 'arr'
  ? { required: [f], properties: { [f]: { type: 'array', minItems: 1 } } }
  : { required: [f], properties: { [f]: { type: 'string', minLength: 1 } } });
const has = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '');
const exactlyOne = (a, b, ka = 'str', kb = 'str') => ({ oneOf: [{ allOf: [present(a, ka), { not: present(b, kb) }] }, { allOf: [present(b, kb), { not: present(a, ka) }] }] });
const dependent = (f, req, kf = 'str', kr = 'str') => ({ if: present(f, kf), then: present(req, kr) });

/* path: де застосовується (''=секція; 'groups'/'items' = кожен елемент списку з таким ім'ям). check(target) → повідомлення про помилку або ''. json — фрагмент allOf для JSON Schema (де виразимо). */
export const RULES = [
  { id: 'wall-xor-list', types: ['compare'], path: 'groups', doc: 'у групі `wall` і `list` взаємовиключні',
    check: (g) => (g.wall && g.list?.length ? 'wall і list — взаємовиключні' : ''), json: { not: { allOf: [present('wall'), present('list', 'arr')] } } },
  { id: 'compare-span-sum', types: ['compare'], path: '', doc: 'сума `span` усіх груп = 12',
    check: (s) => { const sum = s.groups.reduce((a, g) => a + g.span, 0); return sum === GRID_COLS ? '' : `groups: сума span = ${sum}, має бути ${GRID_COLS}`; }, json: null },
  { id: 'compare-count-capacity', types: ['compare'], path: 'groups', doc: `число не переноситься, тому у вузьких групах воно обмежене: \`span\` 2 — count ≤ ${COUNT_CAP[2].plain} (з \`approx\` ≤ ${COUNT_CAP[2].approx}); \`span\` 3 — з \`approx\` ≤ ${COUNT_CAP[3].approx}; від 4 колонок — без обмеження понад ${COUNT_MAX}`,
    check: (g) => { const cap = COUNT_CAP[g.span]?.[g.approx ? 'approx' : 'plain']; return cap !== undefined && g.count > cap ? `count ${g.count} не вміщується в групу на ${g.span} колонки${g.approx ? ' з «≈»' : ''} (≤ ${cap})` : ''; },
    json: { allOf: Object.entries(COUNT_CAP).flatMap(([sp, c]) => [
      { if: { properties: { span: { const: +sp }, approx: { const: true } }, required: ['span', 'approx'] }, then: { properties: { count: { type: 'integer', maximum: c.approx } } } },
      { if: { properties: { span: { const: +sp } }, required: ['span'], not: { properties: { approx: { const: true } }, required: ['approx'] } }, then: { properties: { count: { type: 'integer', maximum: c.plain } } } },
    ]) } },
  { id: 'steps-media', types: ['steps'], path: '', doc: 'арка кроків: рівно одне з `scene` (гравюра) або `img` (фото)',
    check: (s) => (has(s.scene) === has(s.img) ? 'потрібне медіа арки: рівно одне з scene або img' : ''), json: exactlyOne('scene', 'img') },
  { id: 'steps-alt-needs-img', types: ['steps'], path: '', doc: '`alt` має сенс лише з `img`',
    check: (s) => (has(s.alt) && !has(s.img) ? 'alt доступний лише разом з img' : ''), json: dependent('alt', 'img') },
  { id: 'tiles-media', types: ['tiles'], path: 'items', doc: 'плитка: рівно одне з `engraving` (гравюра + `icon`) або `img` (фото)',
    check: (t) => (has(t.engraving) === has(t.img) ? 'потрібне медіа: рівно одне з engraving або img' : ''), json: exactlyOne('engraving', 'img') },
  { id: 'tiles-icon-needs-engraving', types: ['tiles'], path: 'items', doc: '`icon` плитки показується лише в гравюрі (`engraving`)',
    check: (t) => (has(t.icon) && !has(t.engraving) ? 'icon доступний лише разом з engraving' : ''), json: dependent('icon', 'engraving') },
  { id: 'tiles-alt-needs-img', types: ['tiles'], path: 'items', doc: '`alt` плитки має сенс лише з `img`',
    check: (t) => (has(t.alt) && !has(t.img) ? 'alt доступний лише разом з img' : ''), json: dependent('alt', 'img') },
  { id: 'offers-bg-size', types: ['offers'], path: '', doc: 'з `bg` потрібні `bgW` і `bgH` (розміри файлу в пікселях; без них зсув макета при завантаженні)',
    check: (s) => (has(s.bg) && !(has(s.bgW) && has(s.bgH)) ? 'з bg потрібні bgW і bgH' : (!has(s.bg) && (has(s.bgW) || has(s.bgH) || has(s.bgSlot)) ? 'bgW/bgH/bgSlot без bg' : '')),
    json: { allOf: [{ if: present('bg'), then: { required: ['bgW', 'bgH'], properties: { bgW: { type: 'integer' }, bgH: { type: 'integer' } } } },
      { if: { not: present('bg') }, then: { properties: { bgW: { type: 'null' }, bgH: { type: 'null' }, bgSlot: { type: ['string', 'null'], maxLength: 0 } } } }] } },
  { id: 'offers-price-capacity', types: ['offers'], path: '', doc: `довжина \`price\` залежить від кількості пропозицій: 1 — ≤ ${PRICE_MAX[1]}, 2 — ≤ ${PRICE_MAX[2]}, 3 — ≤ ${PRICE_MAX[3]} знаків (цифри; слова вужче — одиницю («грн», «з людини») пишіть у \`priceNote\`)`,
    check: (s) => { const cap = PRICE_MAX[s.items.length]; const bad = s.items.findIndex((it) => [...it.price].length > cap); return bad < 0 ? '' : `items[${bad}].price: довжина ${[...s.items[bad].price].length} > ${cap} знаків при ${s.items.length} пропозиціях (одиницю виміру — в priceNote)`; },
    json: { allOf: Object.entries(PRICE_MAX).map(([n, cap]) => ({ if: { properties: { items: { type: 'array', minItems: +n, maxItems: +n } }, required: ['items'] }, then: { properties: { items: { type: 'array', items: { type: 'object', properties: { price: { type: 'string', maxLength: cap } } } } } } })) } },
  { id: 'stack-exclusive', types: ['card', 'place'], path: '', doc: '`stack: true` бере кімнату попередньої секції, тож `room` і `join` разом з ним не задаються',
    check: (s) => (s.stack === true && (has(s.room) || s.join === true) ? 'stack: true бере кімнату попередньої секції — room і join не задаються' : ''),
    json: { if: { properties: { stack: { const: true } }, required: ['stack'] }, then: { not: { anyOf: [present('room'), { properties: { join: { const: true } }, required: ['join'] }] } } } },
  { id: 'card-text-xor-list', types: ['card'], path: '', doc: `панель має фіксовану висоту: заголовок ≤ ${CARD_TITLE_MAX}; рівно одне з \`text\` (≤ ${CARD_TEXT_MAX}) або \`list\` (≤ ${CARD_LIST_MAX} пунктів по ≤ ${CARD_ITEM_MAX}) — разом не вміщуються`,
    check: (s) => (has(s.text) === has(s.list) ? 'потрібне рівно одне з text або list (разом не вміщуються у панель)' : ''), json: exactlyOne('text', 'list', 'str', 'arr') },
];

/* Правила сторінки: hero першим і єдиним; id секцій і key у списках унікальні; якорі `#id` ведуть на секцію сторінки */
export const PAGE_RULES = [
  { id: 'hero-first', doc: 'перша секція — `hero`, і вона єдина (без неї немає `<h1>`)', json: true },
  { id: 'ids-unique', doc: '`id` секцій унікальні в межах сторінки', json: null },
  { id: 'keys-unique', doc: '`key` унікальний у межах свого списку (`layers.items`, `steps.items`, `tiles.items`, `compare.groups`, `offers.items`) — з нього будується CSS-клас', json: null },
  { id: 'stack-after-block', doc: '`stack: true` дозволено лише секції, перед якою стоїть `card` або `place` (стек = ряд великих блоків; після hero чи інших типів стека немає)', json: null },
  { id: 'anchors-exist', doc: 'посилання-якір `#id` (у кнопках, `place.facts[].href` тощо) має вести на `id` секції цієї сторінки', json: null },
];

/* Перевірки проти файлової системи (tools/lp-files.mjs; збірка падає з поясненням) — у чистій схемі лише опис для docs і x-rules */
export const FILE_RULES = [
  { id: 'theme-exists', doc: '`theme`: є файл `src/styles/themes/<theme>.css` з роллю `--lp-tone` (або `tone` задано в даних)' },
  { id: 'media-partials-exist', doc: '`steps.scene` (`scene-…`), `tiles.items[].engraving` (`engraving-…`), `compare.groups[].wall` (`wall-…`): є `partials/media/<id>.html`' },
  { id: 'icons-exist', doc: '`icon` (layers, tiles, place, route): є клас `.icon--<icon>` у `src/styles/`' },
  { id: 'media-files-exist', doc: 'кожен шлях `img` / `bg` веде на наявний файл у `public/` (`card.img` — лише під `/assets/img/`)' },
  { id: 'contacts-keys-exist', doc: '`%contacts.<ключ>%` у посиланнях: ключ є в `src/data/contacts.js`' },
  { id: 'slug-matches-file', doc: '`slug` = ім\'я файлу даних `src/data/<slug>.js`' },
];

/* ------------------------------------------------------------------ перевірка даних (збірка падає з поясненням) */
const fail = (path, msg) => { throw new Error(`lp: ${path}: ${msg}`); };
const isEmpty = (def, v) => v === undefined || v === null || (v === '' && ['text', 'url', 'id', 'partial', 'icon', 'enum'].includes(def.type)) || (Array.isArray(v) && !v.length);
function check(def, v, path) {
  if (isEmpty(def, v)) { if (def.req) fail(path, 'обов\'язкове поле порожнє'); return; }
  switch (def.type) {
    case 'text':
      if (typeof v !== 'string') fail(path, 'має бути текстом');
      if ([...v].length > def.max) fail(path, `довжина ${[...v].length} > ${def.max} знаків`);
      if (wordRe(def.word ?? MAX_WORD).test(v)) fail(path, `слово довше ${def.word ?? MAX_WORD} знаків без пробілу (не вміститься в колонку)`);
      break;
    case 'url':
      if (typeof v !== 'string' || !URL_RE.test(v)) fail(path, `некоректне посилання «${String(v).slice(0, 40)}» (допустимо: #якір, /шлях, https://…, tel:, mailto:, %contacts.ключ%, сторінка.html)`);
      if (def.startsWith && !v.startsWith(def.startsWith)) fail(path, `шлях має починатися з ${def.startsWith}`);
      break;
    case 'id': case 'partial': case 'icon':
      if (typeof v !== 'string' || !ID_RE.test(v)) fail(path, 'лише латиниця, цифри, дефіс');
      if (def.kind && !v.startsWith(`${def.kind}-`)) fail(path, `назва ілюстрації виду «${def.kind}» має починатися з «${def.kind}-» (partials/media/${def.kind}-<назва>.html)`);
      break;
    case 'enum': if (!def.values.includes(v)) fail(path, `допустимо: ${def.values.join(' | ')}`); break;
    case 'number':
      if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'має бути числом');
      if (def.int && !Number.isInteger(v)) fail(path, 'має бути цілим числом');
      if (def.min !== undefined && v < def.min) fail(path, `менше ${def.min}`);
      if (def.max !== undefined && v > def.max) fail(path, `більше ${def.max}`);
      break;
    case 'bool': if (typeof v !== 'boolean') fail(path, 'має бути true/false'); break;
    case 'list':
      if (!Array.isArray(v)) fail(path, 'має бути списком');
      if (v.length < def.min || v.length > def.max) fail(path, `елементів ${v.length}, допустимо ${def.min}–${def.max}`);
      if (def.divides && def.divides % v.length) fail(path, `кількість має ділити ${def.divides} (${divisors(def).join(', ')})`);
      v.forEach((x, i) => check(def.of, x, `${path}[${i}]`));
      break;
    case 'object':
      if (typeof v !== 'object' || Array.isArray(v)) fail(path, 'має бути об\'єктом');
      for (const [k, d] of Object.entries(def.fields)) check(d, v[k], `${path}.${k}`);
      for (const k of Object.keys(v)) if (!(k in def.fields)) fail(`${path}.${k}`, 'невідоме поле (немає в схемі)');
      break;
    default: break;
  }
}
/** допустимі кількості елементів списку з def.divides: ті з min…max, що ділять число */
export const divisors = (def) => { const r = []; for (let n = def.min; n <= def.max; n++) if (def.divides % n === 0) r.push(n); return r; };

/** обходить усі поля даних за схемою: fn(def, value, path) для кожного значення (секція: def = { type: 'object', fields: SCHEMA.sections[type] }) */
export function walk(def, v, path, fn) {
  if (v === undefined || v === null) return;
  fn(def, v, path);
  if (def.type === 'list' && Array.isArray(v) && def.of) v.forEach((x, i) => walk(def.of, x, `${path}[${i}]`, fn));
  if (def.type === 'object' && typeof v === 'object') for (const [k, d] of Object.entries(def.fields)) walk(d, v[k], `${path}.${k}`, fn);
}

export function validatePage(page) {
  const { sections, ...rest } = page;
  for (const [k, d] of Object.entries(SCHEMA.page)) if (k !== 'sections') check(d, rest[k], `${page.slug}.${k}`);
  for (const k of Object.keys(rest)) if (!(k in SCHEMA.page)) fail(`${page.slug}.${k}`, 'невідоме поле сторінки (немає в схемі)');
  if (!Array.isArray(sections) || !sections.length) fail(`${page.slug}.sections`, 'порожньо');
  if (sections.length > SCHEMA.page.sections.max) fail(`${page.slug}.sections`, `секцій ${sections.length}, допустимо 1–${SCHEMA.page.sections.max}`);
  const ids = new Set();
  sections.forEach((s, i) => {
    const path = `${page.slug}.sections[${i}](${s.id || s.type})`;
    const def = SCHEMA.sections[s.type];
    if (!def) fail(path, `невідомий type «${s.type}»; допустимо: ${Object.keys(SCHEMA.sections).join(', ')}`);
    if (i === 0 && s.type !== 'hero') fail(path, 'перша секція має бути hero (без нього немає <h1>)');
    if (i > 0 && s.type === 'hero') fail(path, 'hero може бути лише першою (і єдиною) секцією');
    if (s.id) { if (ids.has(s.id)) fail(path, `id «${s.id}» повторюється`); ids.add(s.id); }
    check({ type: 'object', fields: def }, s, path);
    if (s.stack === true && !['card', 'place'].includes(sections[i - 1]?.type)) fail(path, 'stack: true дозволено лише після секції card або place (стек великих блоків)');
    // key унікальні в межах списку
    walk({ type: 'object', fields: def }, s, path, (d, v, p) => {
      if (d.type === 'list' && d.of?.type === 'object' && d.of.fields.key && Array.isArray(v)) {
        const seen = new Set(); v.forEach((x, j) => { if (seen.has(x.key)) fail(`${p}[${j}].key`, `key «${x.key}» повторюється у списку`); seen.add(x.key); });
      }
    });
    // правила типу секції
    for (const r of RULES) {
      if (!r.types.includes(s.type)) continue;
      const targets = r.path ? (s[r.path] || []).map((t, j) => [t, `${path}.${r.path}[${j}]`]) : [[s, path]];
      for (const [t, p] of targets) { const msg = r.check(t); if (msg) fail(p, msg); }
    }
  });
  // якорі #id мають вести на секцію сторінки
  sections.forEach((s, i) => walk({ type: 'object', fields: SCHEMA.sections[s.type] }, s, `${page.slug}.sections[${i}](${s.id || s.type})`, (d, v, p) => {
    if (d.type === 'url' && typeof v === 'string' && v.startsWith('#') && !ids.has(v.slice(1))) fail(p, `якір «${v}» не веде ні на одну секцію сторінки (id: ${[...ids].join(', ') || '—'})`);
  }));
  return true;
}

/* ------------------------------------------------------------------ вигляд для partials (плоскі поля, екрановані рядки) */
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// у ТЕКСТІ %contacts.ключ% / %BASE_URL% не мають перетворюватися на підстановку збірки (вона діє на весь HTML); у посиланнях (href) — навпаки, потрібні
const t = (v) => esc(v).replace(/%(?=(?:contacts\.\w+|BASE_URL)%)/g, '&#37;');
const li = (arr) => (arr || []).map((x) => ({ text: t(x) }));
const longestRun = (s) => Math.max(0, ...String(s).split(/[ \n]+/).map((w) => [...w].length)); // найдовший непереносний відрізок (nbsp не розриває)
const fmt = (n) => Number(n).toLocaleString('uk-UA'); // 1 234 (nbsp); те саме робить lp.js під час лічби
function head(s) { return { id: s.id, kicker: t(s.kicker), title: t(s.title), lead: t(s.lead), caption: t(s.caption) }; }

const VIEW = {
  hero: (s, p) => ({ id: s.id, title: t(s.title), lead: t(s.lead), img: s.img, alt: t(s.alt), slot: t(s.slot), ctaText: t(s.cta.text), ctaHref: esc(s.cta.href), tone: p.tone, panel: s.panel ? '1' : '', mods: s.panel ? ' hero--panel' : '' }),
  layers: (s) => {
    const span = GRID_COLS / s.items.length;
    const cut = s.items.some((it) => it.img);
    return { ...head(s), cut: cut ? '1' : '', noCut: cut ? '' : '1',
      items: s.items.map((it) => ({ key: it.key, span, icon: it.icon || '', title: t(it.title), text: t(it.text), img: it.img || '', slot: t(it.slot) })) };
  },
  steps: (s) => {
    const rich = !!(s.kicker || s.lead || s.caption);
    return { ...head(s), plainHead: rich ? '' : '1', richHead: rich ? '1' : '', scene: s.scene || '', img: s.img || '', alt: t(s.alt), slot: t(s.slot),
      items: s.items.map((it, i) => ({ key: it.key, n: i + 1, value: t(it.value), title: t(it.title), text: t(it.text) })) };
  },
  compare: (s) => ({ ...head(s), note: t(s.note),
    groups: s.groups.map((g) => ({ key: g.key, span: g.span, mods: `${g.accent ? ' lp-group--accent' : ''}${g.align === 'center' ? ' lp-group--center' : ''} lp-group--${g.key}`,
      label: t(g.label), count: g.count, countText: fmt(g.count), approx: g.approx ? '1' : '', approxLabel: LABELS.approx, unit: t(g.unit), wall: g.wall || '', list: li(g.list),
      facts: (g.facts || []).map((f) => ({ value: t(f.value), label: t(f.label), valueMod: [...f.value].length > 16 ? ' lp-group__fact-value--wrap' : '' })) })) }),
  tiles: (s) => ({ ...head(s), items: s.items.map((it) => ({ key: it.key, span: GRID_COLS / s.items.length, engraving: it.engraving || '', icon: it.icon || '', img: it.img || '', alt: t(it.alt), slot: t(it.slot), name: t(it.name), origin: t(it.origin), notes: t(it.notes) })) }),
  offers: (s, p) => ({ ...head(s), bg: s.bg || '', bgW: s.bgW || '', bgH: s.bgH || '', bgSlot: t(s.bgSlot),
    routeFrom: t(s.route?.from), routeTo: t(s.route?.to), routeIcon: s.route?.icon || '',
    items: s.items.map((it) => ({ key: it.key, span: GRID_COLS / s.items.length, tone: p.tone, title: t(it.title), price: t(it.price), priceNote: t(it.priceNote),
      facts: (it.facts || []).map((f) => ({ dt: t(f.dt), dd: t(f.dd), ddMod: [...f.dd].length > 24 || longestRun(f.dd) > 14 ? ' lp-offer__dd--wrap' : '' })),
      includes: li(it.includes), ctaText: t(it.cta.text), ctaHref: esc(it.cta.href) })),
    footText: t(s.foot?.text), footNote: t(s.foot?.note), footCtas: (s.foot?.ctas || []).map((c) => ({ text: t(c.text), href: esc(c.href), variant: c.variant })) }),
  card: (s, p) => ({ ...head(s), text: t(s.text), ctaText: t(s.cta.text), ctaHref: esc(s.cta.href), tone: p.tone,
    photo: (s.img || '').replace(/^\/assets\/img\//, ''), alt: t(s.alt), slot: t(s.slot), cardMod: s.photoFirst ? ' tour-card--photo-first' : '',
    listHtml: (s.list || []).map((x) => `<li>${t(x)}</li>`).join('') }),
  place: (s) => ({ ...head(s),
    facts: s.facts.map((f) => ({ label: t(f.label), value: t(f.value), icon: f.icon || '', href: f.href ? esc(f.href) : '', plain: f.href ? '' : '1', external: /^https?:/.test(f.href || '') || /^%contacts\.gmaps/.test(f.href || '') ? '1' : '' })),
    ctas: (s.ctas || []).map((c) => ({ text: t(c.text), href: esc(c.href), variant: c.variant, arrow: c.variant === 'outline' ? '' : '1' })) }),
  faq: (s) => {
    // як faq.html: закриті, відкриття — accordion.js; порожній рядок у відповіді = новий абзац
    const items = s.items.map((it, k) => ({ id: `${s.id}-${k + 1}`, q: t(it.q), aHtml: it.a.split(/\n\s*\n/).map((para) => `<p class="t-text">${t(para.trim())}</p>`).join(''), open: '', expanded: 'false' }));
    const half = Math.ceil(items.length / 2);
    return { ...head(s), groups: [{ slug: `${s.id}-list`, title: t(s.title), itemsLeft: items.slice(0, half), itemsRight: items.slice(half) }] };
  },
};

/**
 * Перевіряє дані сторінки й повертає вигляд для partials/lp/page.html (секції — partials/lp/<type>.html).
 * env.themeTone — тон кнопок за замовчуванням з теми (`--lp-tone` у src/styles/themes/<theme>.css); якщо `tone` у даних не задано.
 */
export function lpView(page, env = {}) {
  validatePage(page);
  const tone = page.tone || env.themeTone;
  if (!tone) fail(`${page.slug}.tone`, `не задано: вкажіть tone у даних або роль --lp-tone у src/styles/themes/${page.theme}.css`);
  if (!TONES.includes(tone)) fail(`${page.slug}.tone`, `тон теми «${tone}» поза переліком: ${TONES.join(' | ')}`);
  const p = { ...page, tone };
  let prevRoom = '';
  const sections = page.sections.map((s, i) => {
    const def = SCHEMA.sections[s.type];
    const room = s.stack ? prevRoom : (s.room || def.room?.def || '');   // стек: кімната попередньої секції (тло одне)
    prevRoom = room;
    const next = page.sections[i + 1];
    const mods = `${s.join ? ' lp-sec--join' : ''}${next?.join ? ' lp-sec--join-next' : ''}${s.stack ? ' lp-sec--stack' : ''}${next?.stack ? ' lp-sec--stack-next' : ''}`;
    return { type: s.type, room, mods, ...VIEW[s.type](s, p) };   // (hero задає свої mods: hero--panel)
  });
  return { slug: page.slug, theme: page.theme, tone, metaTitle: t(page.metaTitle), metaDescription: t(page.metaDescription), sections };
}
