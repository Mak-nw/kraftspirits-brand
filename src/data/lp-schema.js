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
export const GRID_COLS = 10;                 // колонок сітки (tokens.css --grid-cols): типова ширина вмісту секції = 10 колонок; сума span груп compare = cols
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
// steps deck: теги кроку — рядок підписів .t-chip над поясненням (без плашок); кількість і довжина — щоб рядок уміщався в текстову колонку картки (5 колонок) на 1200
export const DECK_TAGS_MAX = 4;
export const DECK_TAG_MAX = 20;
export const COUNT_MAX = 99999;              // лічильник групи compare: ціле 0…99 999
// число `.t-stat` не переноситься: у вузьких групах (span 2–3) вміщується менше цифр (разом із розділювачем розрядів; з «≈» — ще менше)
export const COUNT_CAP = { 2: { plain: 999, approx: 99 }, 3: { plain: 99999, approx: 999 } };
export const LABELS = { approx: 'приблизно ' };
export const LABELS_EN = { approx: 'approximately ' };   // службовий текст для читачів екрана

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
export const TILE_TONES = ['black', 'brown', 'green', 'teal'];  // тло круглого кадру плитки: роль теми --lp-tile-<тон> (значення — токени палітри)
export const TILE_POS = ['top', 'center', 'bottom', 'whole'];        // кадрування фото в колі: object-position (верх — пляшка обрізана знизу)
export const TILE_ZOOM = [0.75, 1, 1.25, 1.5, 1.75, 2];             // масштаб фото в колі (кроки --scale-lp-zoom-*): 1 — як є; більше — пляшка/келих крупніше, кадр лишається колом
export const PAD_STEPS = [20, 30, 40, 50, 70, 100];          // `pad`: крок шкали простору DS (--space-<крок>), однаковий верхній і нижній padding секції замість типових 150u
// `cols`: ширина вмісту секції в колонках сітки (контейнер = --grid-span-N по центру, 8 → колонки 2–9, 6 → 3–8; 10 = уся сітка = типово, поле не задають). Лише ПАРНА кількість ≤ 10: по центру краї мають лежати на межах колонок (D12).
// Мінімум залежить від типу (виміряна ємність текстів у вужчому контейнері); нижче мінімуму значення відхиляється збіркою.
export const COLS_BY_TYPE = { layers: [6, 8, 10], steps: [8, 10], compare: [8, 10], formats: [8, 10], tiles: [6, 8, 10], offers: [8, 10], faq: [6, 8, 10] };
export const HEAD_COLS = [4, 6];   // `titleCols`: ширина заголовка по центру в колонках (4 — типово, --size-heading-w; 6 — широкий, --size-heading-w-wide: довгий заголовок в 2 рядки, рев'ю d0234bbc, 58f675f7)
export const HERO_TITLE_SIZES = ['large'];   // `hero.titleSize`: 'large' — H1 hero роллю .t-h2 (67u) замість .t-hero (55u; рев'ю 1574e475); без поля — .t-hero
export const PLACE_TITLE_SIZES = ['small'];   // `place.titleSize`: 'small' — H2 панелі роллю .t-lead (40u) замість .t-h2 (67u): довге слово («Ясногородка») вміщується в панель цілим, не розривається дефісом (дефект E3-B); без поля — .t-h2
export const HERO_FADES = ['green', 'teal', 'brown'];       // `hero.fade`: колір градієнта знизу вгору (токен палітри --color-<значення>; без поля — градієнта немає; рішення замовника 53422015)
export const PANEL_TONES = ['green', 'teal'];            // тон великої панелі formats: роль теми --lp-format-<тон> (значення — токени палітри)
export const TAB_LABEL_MAX = 20;   // `tabs[].label`: підпис вкладки (чіп .product-volume у ряду)
export const LOOKS = ['about'];   // `look`: 'about' — вигляд компонентів сторінки «Про нас» (арки lp-arch, картки-арки принципів, панелі brand-panel, картка tour-card з мапою); без поля — типовий вигляд шаблону (barrels не змінюється)
const LOOK = { look: E(LOOKS) };
const CTA = O({ text: T(24, true, { word: BTN_WORD }), href: URL_(true) });
const MEDIA_IMG = { img: URL_(), alt: T(140), slot: T(240) }; // slot — підказка «що тут має бути за фото» (режим ?slots=on, data-slot)

// спільні поля секції. Кожен тип бере лише ті, що його partial справді показує (поле в схемі ⇒ воно є на сторінці; перевіряє lp-contract)
const BASE = { type: { type: 'type', req: true }, id: { type: 'id', req: true }, room: E(ROOMS, false), join: B(), pad: E(PAD_STEPS, false), kicker: T(25), title: T(60, true), lead: T(320), caption: T(120) };
const COLS = (type) => ({ type: 'enum', values: COLS_BY_TYPE[type], req: false, def: 10, sample: 10 });   // sample — значення для контрактних прогонів (qa:lp): 10 = типова повна ширина (збігається з типовим; видимий ефект cols перевіряється окремо зі значенням 8)
const TITLE = { titleCols: E(HEAD_COLS) };   // ширина центрованого заголовка секції (H1/H2): 4 колонки типово, 6 — широкий варіант
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
    // Вкладки верхнього рівня (необов'язково): сторінка з кількома «під-сторінками» (напр. «B2B» / «Івенти»). Секції лишаються ПЛОСКИМ списком `sections`; кожна вкладка починається зі
    // своєї hero-секції (`start` = її `id`) і триває до наступного старту. Перемикач — компонент DS `.tabs` (WAI-ARIA, src/js/tabs.js), hash `#<key>` відкриває вкладку; перша — типова.
    tabs: L(O({ key: { type: 'id', req: true }, label: T(TAB_LABEL_MAX, true, { word: BTN_WORD }), start: { type: 'id', req: true } }), 2, 3),
    tabsLabel: T(40),   // aria-label перемикача вкладок (назва групи для читачів екрана)
  },
  sections: {
    // 1. Перший екран: фото на весь екран, h1, лід, кнопка (кімнати немає, kicker/caption не показуються)
    hero: { ...base('room', 'join', 'pad', 'kicker', 'caption'), ...TITLE, titleSize: E(HERO_TITLE_SIZES), id: { type: 'id' }, lead: T(160), ...MEDIA_IMG, img: URL_(true), panel: B(), fade: E(HERO_FADES), cta: { ...O({ text: T(24, true, { word: BTN_WORD }), href: URL_(true), variant: E(['light', 'beige', 'gold', 'teal', 'green']) }), req: true } },   // cta.variant — тон кнопки hero (типово — тон сторінки): на градієнті hero.fade кнопка тону сторінки зливається з тлом — задають світлу (beige)
    // 2. Шари / переваги: «розріз» із фото-смуг впритул (img у кожного пункту) + підписи; без фото — лише підписи. items: 2–6 (n рівних блоків контейнера; 4 на 10 колонок — по 348.55u)
    layers: { ...BASE, ...TITLE, ...LOOK, shape: E(['barrel']), room: E(ROOMS, false, 'warm'), cols: COLS('layers'), items: L(O({ key: { type: 'id', req: true }, icon: { type: 'icon' }, title: T(25, true), value: T(12), text: T(90, true), img: URL_(), slot: T(240) }), 2, 6, true) },   // value — число-показник під назвою роллю .t-stat-label (як «3660 л.» у «Три установки» на about), напр. «3 660 л»
    // 3. Кроки: sticky-арка з медіа (scene — гравюра partials/media/scene-<назва>.html АБО img — фото) + кроки-цифри.
    //    deck: true — «колода»: кожен крок = велика картка з фото на тлі (img кроку, cover), картки прилипають під header і наїжджають одна на одну (CSS sticky);
    //    тоді арки немає (scene/img секції не задаються), cols (10 · 12) — ширина колоди, у кроку — img (обов'язково), alt, slot, imgPos, zoom, tags
    steps: { ...BASE, ...TITLE, room: E(ROOMS, false, 'deep'), deck: B(), split: B(), cols: COLS('steps'), scene: { type: 'partial', kind: 'scene' }, ...MEDIA_IMG, items: L(O({ key: { type: 'id', req: true }, value: T(5, true), title: T(25, true), text: T(160, true),
      ...MEDIA_IMG, lottie: URL_(false, { startsWith: '/assets/lottie/' }), imgPos: E(TILE_POS), zoom: E(TILE_ZOOM), tags: L(T(DECK_TAG_MAX), 0, DECK_TAGS_MAX) }), 2, 5, true) },
    // 4. Порівняння: групи поруч (span колонок) — ярлик, число (+ «≈»), одиниця, медіа cellar (кімната-погріб partials/media/cellar-<назва>.html, бочка по центру) АБО list, факти
    compare: { ...BASE, ...TITLE, room: E(ROOMS, false, 'paper'), cols: COLS('compare'), note: T(200), reveal: B(), groups: L(O({
      key: { type: 'id', req: true }, label: T(25, true), span: E([2, 3, 4, 5, 6, 7, 8], true), align: E(['start', 'center'], false, 'start'), accent: B(),
      count: N(true, { int: true, min: 0, max: COUNT_MAX }), approx: B(), countWord: T(20), unit: T(40), cellar: { type: 'partial', kind: 'cellar' }, liters: N(false, { int: true, min: 1, max: 1000 }), list: L(T(90), 0, 8),
      facts: L(O({ value: T(60, true), label: T(60, true) }), 0, 3),
    }), 2, 3, true) },
    // 4б. Формати: дві великі панелі поруч (по 5 колонок, шов 5u): підпис, капсула з великим числом і одиницею, 2–4 колонки (назва + опис), 0–2 факти
    formats: { ...BASE, ...TITLE, ...LOOK, room: E(ROOMS, false, 'warm'), cols: COLS('formats'), items: L(O({
      key: { type: 'id', req: true }, tone: E(PANEL_TONES, true), lead: T(25), value: T(5, true), unit: T(25, true),
      items: L(O({ title: T(25, true), text: T(90, true) }), 2, 4, true),
      facts: L(O({ label: T(30, true), value: T(60, true) }), 0, 2),
    }), 2, 2, true) },
    // 5. Плитки: медіа (engraving — гравюра partials/media/engraving-<назва>.html + icon АБО img — фото 3:4) + назва, підпис, ноти.
    //    shape: 'circle' — коло замість рамки 3:4: лише з фото, tone (тло кола), imgPos (кадр) і zoom (масштаб фото в колі) за даними, captionOver (назва й опис поверх фото всередині кола), лід — у шапці під H2 (ширина leadCols)
    tiles: { ...BASE, ...TITLE, ...LOOK, room: E(ROOMS, false, 'paper'), cols: COLS('tiles'), shape: E(['circle']), captionOver: B(), bare: B(), perRow: E([3]), leadCols: E([2, 3, 4, 5, 6]), loose: B(), items: L(O({ key: { type: 'id', req: true }, engraving: { type: 'partial', kind: 'engraving' }, icon: { type: 'icon' }, ...MEDIA_IMG, tone: E(TILE_TONES), imgPos: E(TILE_POS), zoom: E(TILE_ZOOM), name: T(25, true), origin: T(60, true), notes: T(60) }), 2, 6, true) },
    // 6. Пропозиції/ціна: фото на всю секцію (bg) + шапка (маршрут, лід) + панелі DS + необов'язковий рядок-підпис (foot; нема даних — блок не рендериться)
    offers: { ...base('caption'), ...TITLE, ...LOOK, room: E(ROOMS, false, 'deep'), cols: COLS('offers'), airy: B(), scene: { type: 'partial', kind: 'scene' }, bg: URL_(), bgW: N(false, { int: true, min: 1, max: 10000 }), bgH: N(false, { int: true, min: 1, max: 10000 }), bgSlot: T(240),
      route: O({ from: T(30, true), to: T(30, true), icon: { type: 'icon', req: true } }),
      items: L(O({ key: { type: 'id', req: true }, title: T(25, true), price: T(PRICE_MAX[1], true), priceNote: T(20), facts: L(O({ dt: T(40, true), dd: T(60, true) }), 0, 4), includes: L(T(90), 0, 5), cta: { ...CTA, req: true } }), 1, 3, true),
      foot: O({ text: T(160, true), ctas: L(O({ text: T(24, true, { word: BTN_WORD }), href: URL_(true), variant: E(['light', 'beige', 'gold', 'teal', 'green'], true) }), 0, 2), note: T(200) }) },
    // 7. Картка: ІСНУЮЧА панель tour-card (текст АБО список + фото)
    card: { ...base('lead', 'caption'), ...STACK, title: T(CARD_TITLE_MAX, true), room: E(ROOMS, false, 'warm'), text: T(CARD_TEXT_MAX), list: L(T(CARD_ITEM_MAX), 0, CARD_LIST_MAX), photoFirst: B(), ...MEDIA_IMG, img: URL_(true, { startsWith: '/assets/img/' }), cta: { ...CTA, req: true } },
    // 8. Місце: панель DS з фактами й кнопками + мапа DS (координати — src/data/contacts.js)
    place: { ...base('caption'), ...STACK, ...LOOK, titleSize: E(PLACE_TITLE_SIZES), room: E(ROOMS, false, 'deep'), facts: L(O({ label: T(30, true), value: T(90, true), icon: { type: 'icon' }, href: URL_() }), 1, 5, true), ctas: L(O({ text: T(24, true, { word: BTN_WORD }), href: URL_(true), variant: E(['green', 'teal', 'outline'], true) }), 0, 2) },
    // 8б. Бренди: ІСНУЮЧА секція головної «Два характери» (partials/sections/brands: дві половини brand-half з вирізом-пляшкою) під шапкою (H2 + лід) у кімнаті. Тексти карток, лого, фото й посилання — ті самі, що на головній (ключі t.home.choice.*); у даних секції лише шапка
    // 8в. ВИНЯТКОВИЙ тип 1:1 макет замовника (лише за його прямою вказівкою, docs/page-template.md): сирий партіал partials/lp/b2b-ref-<n>.html + src/styles/b2b-ref.css; стилів не валідуємо, поля необов'язкові (кожен n показує свою підмножину)
    ref: { type: { type: 'type', req: true }, id: { type: 'id', req: true }, n: E(['7', '8', '9', '11'], true), title: T(60), text: T(400), img: URL_(), alt: T(140), cta: O({ text: T(40, true), href: URL_(true) }), items: L(O({ title: T(40, true), text: T(200, true) }), 0, 4) },
    // 9. Питання: ІСНУЮЧА група FAQ (faq-group + faq-item), дві колонки (кікера, ліду й підпису немає — лише заголовок групи)
    faq: { ...base('kicker', 'lead', 'caption'), room: E(ROOMS, false, 'deep'), cols: COLS('faq'), items: L(O({ q: T(90, true), a: T(600, true) }), 1, 12, true) },
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
const DECK_ON = { properties: { deck: { const: true } }, required: ['deck'] };   // steps deck: true

/* path: де застосовується (''=секція; 'groups'/'items' = кожен елемент списку з таким ім'ям). check(target) → повідомлення про помилку або ''. json — фрагмент allOf для JSON Schema (де виразимо). */
export const RULES = [
  { id: 'cellar-xor-list', types: ['compare'], path: 'groups', doc: 'у групі `cellar` і `list` взаємовиключні',
    check: (g) => (g.cellar && g.list?.length ? 'cellar і list — взаємовиключні' : ''), json: { not: { allOf: [present('cellar'), present('list', 'arr')] } } },
  { id: 'compare-span-sum', types: ['compare'], path: '', doc: 'сума `span` усіх груп = `cols` секції (типово 10)',
    check: (s) => { const sum = s.groups.reduce((a, g) => a + g.span, 0); const cols = s.cols || GRID_COLS; return sum === cols ? '' : `groups: сума span = ${sum}, має дорівнювати cols = ${cols}`; }, json: null },
  { id: 'pad-exclusive', types: ['layers', 'steps', 'compare', 'formats', 'tiles', 'offers', 'card', 'place', 'faq'], path: '', doc: '`pad` задає власний верхній і нижній відступ секції, тож не задається разом з `loose` (інший розмір того самого відступу), `join` (верх = 0) і `stack` (верх = зазор стека). Нижній відступ перед `join`-секцією лишається за сусідом; перед секцією-стеком `pad` перемагає: він і є зазор до стекової секції (її верх = 0)',
    check: (s) => (has(s.pad) && (s.loose === true || s.join === true || s.stack === true) ? 'pad не задається разом з loose, join або stack' : ''),
    json: { if: { required: ['pad'], properties: { pad: { type: 'number' } } }, then: { not: { anyOf: ['loose', 'join', 'stack'].map((k) => ({ required: [k], properties: { [k]: { const: true } } })) } } } },
  { id: 'compare-count-capacity', types: ['compare'], path: 'groups', doc: `число не переноситься, тому у вузьких групах воно обмежене: \`span\` 2 — count ≤ ${COUNT_CAP[2].plain} (з \`approx\` ≤ ${COUNT_CAP[2].approx}); \`span\` 3 — з \`approx\` ≤ ${COUNT_CAP[3].approx}; від 4 колонок — без обмеження понад ${COUNT_MAX}`,
    check: (g) => { const cap = COUNT_CAP[g.span]?.[g.approx ? 'approx' : 'plain']; return cap !== undefined && g.count > cap ? `count ${g.count} не вміщується в групу на ${g.span} колонки${g.approx ? ' з «≈»' : ''} (≤ ${cap})` : ''; },
    json: { allOf: Object.entries(COUNT_CAP).flatMap(([sp, c]) => [
      { if: { properties: { span: { const: +sp }, approx: { const: true } }, required: ['span', 'approx'] }, then: { properties: { count: { type: 'integer', maximum: c.approx } } } },
      { if: { properties: { span: { const: +sp } }, required: ['span'], not: { properties: { approx: { const: true } }, required: ['approx'] } }, then: { properties: { count: { type: 'integer', maximum: c.plain } } } },
    ]) } },
  { id: 'steps-media', types: ['steps'], path: '', doc: 'арка кроків: рівно одне з `scene` (гравюра) або `img` (фото); з `deck: true` арки немає — `scene`, `img`, `alt`, `slot` секції не задаються (фото — у кожному кроці)',
    check: (s) => (s.deck === true
      ? ([s.scene, s.img, s.alt, s.slot].some(has) ? 'deck: true — арки немає: scene / img / alt / slot секції не задаються (фото — у кроках)' : '')
      : (has(s.scene) === has(s.img) ? 'потрібне медіа арки: рівно одне з scene або img' : '')),
    json: { if: DECK_ON, then: { not: { anyOf: [present('scene'), present('img'), present('alt'), present('slot')] } }, else: exactlyOne('scene', 'img') } },
  { id: 'steps-deck-fields', types: ['steps'], path: '', doc: `\`deck: true\`: кожен крок — з фото \`img\` (тло картки); з \`split: true\` (картка «текст зліва на тоновому фоні | медіа справа») — РІВНО одне з \`img\` (фото) або \`lottie\` (векторна Lottie-анімація, \`alt\` — її підпис для читачів екрана); поля кроку \`img\`, \`alt\`, \`slot\`, \`imgPos\`, \`zoom\`, \`tags\` (до ${DECK_TAGS_MAX} по ≤ ${DECK_TAG_MAX}), \`lottie\` і \`cols\`, \`split\` секції — лише з \`deck: true\` (\`lottie\` — лише з \`split\`)`,
    check: (s) => {
      if (s.deck === true) {
        if (s.split === true) { const bad = s.items.findIndex((it) => has(it.img) === has(it.lottie)); return bad < 0 ? '' : `items[${bad}]: split: true — рівно одне з img (фото) або lottie (анімація)`; }
        const bl = s.items.findIndex((it) => has(it.lottie)); if (bl >= 0) return `items[${bl}].lottie — лише з split: true`;
        const bad = s.items.findIndex((it) => !has(it.img)); return bad < 0 ? '' : `items[${bad}].img: deck: true — кожна картка-крок потребує фото img`;
      }
      if (has(s.cols)) return 'cols — лише з deck: true (арка + кроки мають фіксовану композицію)';
      if (s.split === true) return 'split — лише з deck: true';
      const bad = s.items.findIndex((it) => ['img', 'alt', 'slot', 'imgPos', 'zoom', 'tags', 'lottie'].some((k) => has(it[k])));
      return bad < 0 ? '' : `items[${bad}]: img / alt / slot / imgPos / zoom / tags / lottie кроку — лише з deck: true`;
    },
    json: { if: DECK_ON, then: { if: { properties: { split: { const: true } }, required: ['split'] },
        then: { properties: { items: { type: 'array', items: { type: 'object', ...exactlyOne('img', 'lottie') } } } },
        else: { properties: { items: { type: 'array', items: { type: 'object', ...present('img'), not: present('lottie') } } } } },
      else: { allOf: [{ not: { required: ['cols'], properties: { cols: { type: 'number' } } } }, { not: { required: ['split'], properties: { split: { const: true } } } },
        { properties: { items: { type: 'array', items: { type: 'object', not: { anyOf: [present('img'), present('alt'), present('slot'), present('imgPos'), present('lottie'), present('tags', 'arr'), { required: ['zoom'], properties: { zoom: { type: 'number' } } }] } } } } }] } } },
  { id: 'steps-alt-needs-img', types: ['steps'], path: '', doc: '`alt` має сенс лише з `img`',
    check: (s) => (has(s.alt) && !has(s.img) ? 'alt доступний лише разом з img' : ''), json: dependent('alt', 'img') },
  { id: 'tiles-media', types: ['tiles'], path: 'items', doc: 'плитка: рівно одне з `engraving` (гравюра + `icon`) або `img` (фото)',
    check: (t) => (has(t.engraving) === has(t.img) ? 'потрібне медіа: рівно одне з engraving або img' : ''), json: exactlyOne('engraving', 'img') },
  { id: 'tiles-icon-needs-engraving', types: ['tiles'], path: 'items', doc: '`icon` плитки показується лише в гравюрі (`engraving`)',
    check: (t) => (has(t.icon) && !has(t.engraving) ? 'icon доступний лише разом з engraving' : ''), json: dependent('icon', 'engraving') },
  { id: 'tiles-alt-needs-img', types: ['tiles'], path: 'items', doc: '`alt` плитки має сенс лише з `img`',
    check: (t) => (has(t.alt) && !has(t.img) ? 'alt доступний лише разом з img' : ''), json: dependent('alt', 'img') },
  { id: 'tiles-bare-engraving', types: ['tiles'], path: '', doc: '`bare` (коло без решітки гравюри) — лише коли кожна плитка з `engraving`',
    check: (s) => (s.bare === true && s.items.some((it) => !has(it.engraving)) ? 'bare потребує engraving у кожній плитці' : ''),
    json: { if: { properties: { bare: { const: true } }, required: ['bare'] }, then: { properties: { items: { type: 'array', items: { type: 'object', ...present('engraving') } } } } } },
  { id: 'tiles-perrow-6', types: ['tiles'], path: '', doc: '`perRow: 3` (плитки в два ряди по три) — рівно 6 плиток',
    check: (s) => (has(s.perRow) && s.items.length !== 6 ? 'perRow: 3 потребує рівно 6 плиток' : ''),
    json: { if: { required: ['perRow'], properties: { perRow: { type: 'number' } } }, then: { properties: { items: { type: 'array', minItems: 6, maxItems: 6 } } } } },
  { id: 'tiles-circle-needs-img', types: ['tiles'], path: '', doc: '`shape: circle`: кожна плитка з фото `img` (гравюри в колі немає)',
    check: (s) => (s.shape === 'circle' && s.items.some((it) => !has(it.img)) ? 'shape: circle потребує img у кожній плитці' : ''),
    json: { if: { properties: { shape: { const: 'circle' } }, required: ['shape'] }, then: { properties: { items: { type: 'array', items: { type: 'object', ...present('img') } } } } } },
  { id: 'tiles-circle-fields', types: ['tiles'], path: '', doc: '`leadCols` і `captionOver` секції, `tone`, `imgPos` і `zoom` плитки мають сенс лише з `shape: circle`',
    check: (s) => (!has(s.shape) && (has(s.leadCols) || s.captionOver === true || s.items.some((it) => has(it.tone) || has(it.imgPos) || has(it.zoom))) ? 'leadCols/captionOver/tone/imgPos/zoom — лише з shape: circle' : ''),
    json: { if: { not: present('shape') }, then: { allOf: [{ not: { properties: { leadCols: { type: 'integer' } }, required: ['leadCols'] } }, { not: { properties: { captionOver: { const: true } }, required: ['captionOver'] } }, { properties: { items: { type: 'array', items: { type: 'object', not: { anyOf: [present('tone'), present('imgPos'), { required: ['zoom'], properties: { zoom: { type: 'number' } } }] } } } } }] } } },
  { id: 'tiles-circle-origin-2lines', types: ['tiles'], path: '', doc: '`shape: circle`: `origin` плитки — рівно два рядки (один переніс `\\n`, кожен ≤ 32 знаки): підпис під колом завжди в 2 рядки по центру',
    check: (s) => { if (s.shape !== 'circle') return ''; const bad = s.items.findIndex((it) => !/^[^\n]{1,32}\n[^\n]{1,32}$/u.test(it.origin)); return bad < 0 ? '' : `items[${bad}].origin: у колі потрібні рівно два рядки (один переніс), кожен ≤ 32 знаки`; },
    json: { if: { properties: { shape: { const: 'circle' } }, required: ['shape'] }, then: { properties: { items: { type: 'array', items: { type: 'object', properties: { origin: { type: 'string', pattern: '^[^\\n]{1,32}\\n[^\\n]{1,32}$' } } } } } } } },
  { id: 'offers-bg-size', types: ['offers'], path: '', doc: 'з `bg` потрібні `bgW` і `bgH` (розміри файлу в пікселях; без них зсув макета при завантаженні)',
    check: (s) => (has(s.bg) && !(has(s.bgW) && has(s.bgH)) ? 'з bg потрібні bgW і bgH' : (!has(s.bg) && (has(s.bgW) || has(s.bgH) || has(s.bgSlot)) ? 'bgW/bgH/bgSlot без bg' : '')),
    json: { allOf: [{ if: present('bg'), then: { required: ['bgW', 'bgH'], properties: { bgW: { type: 'integer' }, bgH: { type: 'integer' } } } },
      { if: { not: present('bg') }, then: { properties: { bgW: { type: 'null' }, bgH: { type: 'null' }, bgSlot: { type: ['string', 'null'], maxLength: 0 } } } }] } },
  { id: 'offers-media', types: ['offers'], path: '', doc: 'фон секції — не більше одного з `bg` (фото на всю секцію) або `scene` (гравюра-панорама `scene-…` під шапкою, за панелями; потрібна всій ширині вікна)',
    check: (s) => (has(s.bg) && has(s.scene) ? 'bg і scene разом не задаються: оберіть одне' : ''),
    json: { not: { allOf: [present('bg'), present('scene')] } } },
  { id: 'offers-price-capacity', types: ['offers'], path: '', doc: `довжина \`price\` залежить від кількості пропозицій: 1 — ≤ ${PRICE_MAX[1]}, 2 — ≤ ${PRICE_MAX[2]}, 3 — ≤ ${PRICE_MAX[3]} знаків (цифри; слова вужче — одиницю («грн», «з людини») пишіть у \`priceNote\`)`,
    check: (s) => { const cap = PRICE_MAX[s.items.length]; const bad = s.items.findIndex((it) => [...it.price].length > cap); return bad < 0 ? '' : `items[${bad}].price: довжина ${[...s.items[bad].price].length} > ${cap} знаків при ${s.items.length} пропозиціях (одиницю виміру — в priceNote)`; },
    json: { allOf: Object.entries(PRICE_MAX).map(([n, cap]) => ({ if: { properties: { items: { type: 'array', minItems: +n, maxItems: +n } }, required: ['items'] }, then: { properties: { items: { type: 'array', items: { type: 'object', properties: { price: { type: 'string', maxLength: cap } } } } } } })) } },
  { id: 'layers-barrel-needs-look', types: ['layers'], path: '', doc: '`shape: barrel` (кадр-бочка замість арки): лише з `look: about` (арки-фото `.lp-arch`) і фото `img` у кожному пункті',
    check: (s) => (s.shape === 'barrel' && (s.look !== 'about' || s.items.some((it) => !has(it.img))) ? 'shape: barrel потребує look: about і img у кожному пункті' : ''),
    json: { if: { properties: { shape: { const: 'barrel' } }, required: ['shape'] }, then: { properties: { look: { const: 'about' }, items: { type: 'array', items: { type: 'object', ...present('img') } } }, required: ['look'] } } },
  { id: 'look-tiles-circle', types: ['tiles'], path: '', doc: '`look: about`: картки-арки з колом-фото — лише з `shape: circle` (кожна плитка з фото)',
    check: (s) => (s.look === 'about' && s.shape !== 'circle' ? 'look: about потребує shape: circle' : ''),
    json: { if: { properties: { look: { const: 'about' } }, required: ['look'] }, then: { properties: { shape: { const: 'circle' } }, required: ['shape'] } } },
  { id: 'stack-exclusive', types: ['card', 'place'], path: '', doc: '`stack: true` бере кімнату попередньої секції, тож `room` і `join` разом з ним не задаються',
    check: (s) => (s.stack === true && (has(s.room) || s.join === true) ? 'stack: true бере кімнату попередньої секції — room і join не задаються' : ''),
    json: { if: { properties: { stack: { const: true } }, required: ['stack'] }, then: { not: { anyOf: [present('room'), { properties: { join: { const: true } }, required: ['join'] }] } } } },
  { id: 'card-text-xor-list', types: ['card'], path: '', doc: `панель має фіксовану висоту: заголовок ≤ ${CARD_TITLE_MAX}; рівно одне з \`text\` (≤ ${CARD_TEXT_MAX}) або \`list\` (≤ ${CARD_LIST_MAX} пунктів по ≤ ${CARD_ITEM_MAX}) — разом не вміщуються`,
    check: (s) => (has(s.text) === has(s.list) ? 'потрібне рівно одне з text або list (разом не вміщуються у панель)' : ''), json: exactlyOne('text', 'list', 'str', 'arr') },
];

/* Правила сторінки: hero першим і єдиним; id секцій і key у списках унікальні; якорі `#id` ведуть на секцію сторінки */
export const PAGE_RULES = [
  { id: 'hero-first', doc: 'перша секція — `hero`, і вона єдина (без неї немає `<h1>`)', json: true },
  { id: 'tabs-start-hero', doc: '`tabs` (2–3 вкладки): `tabs[].start` — `id` hero-секції; перша вкладка стартує з першої секції; кожна наступна hero сторінки — старт вкладки (без `tabs` hero лише одна); `key` і `start` унікальні; `tabsLabel` лише разом з `tabs`', json: null },
  { id: 'ids-unique', doc: '`id` секцій унікальні в межах сторінки', json: null },
  { id: 'keys-unique', doc: '`key` унікальний у межах свого списку (`layers.items`, `steps.items`, `tiles.items`, `compare.groups`, `formats.items`, `offers.items`) — з нього будується CSS-клас', json: null },
  { id: 'stack-after-block', doc: '`stack: true` дозволено лише секції, перед якою стоїть `card` або `place` (стек = ряд великих блоків; після hero чи інших типів стека немає)', json: null },
  { id: 'anchors-exist', doc: 'посилання-якір `#id` (у кнопках, `place.facts[].href` тощо) має вести на `id` секції цієї сторінки', json: null },
];

/* Перевірки проти файлової системи (tools/lp-files.mjs; збірка падає з поясненням) — у чистій схемі лише опис для docs і x-rules */
export const FILE_RULES = [
  { id: 'theme-exists', doc: '`theme`: є файл `src/styles/themes/<theme>.css` з роллю `--lp-tone` (або `tone` задано в даних)' },
  { id: 'media-partials-exist', doc: '`steps.scene` / `offers.scene` (`scene-…`), `tiles.items[].engraving` (`engraving-…`), `compare.groups[].cellar` (`cellar-…`): є `partials/media/<id>.html`' },
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
  // вкладки: start кожної — id hero-секції; перша вкладка стартує з першої секції; key і start унікальні; решта hero лише на стартах
  const tabStarts = new Set();
  if (page.tabs) {
    const keys = new Set();
    page.tabs.forEach((tb, j) => {
      const p = `${page.slug}.tabs[${j}]`;
      if (keys.has(tb.key)) fail(`${p}.key`, `key «${tb.key}» повторюється`); keys.add(tb.key);
      if (tabStarts.has(tb.start)) fail(`${p}.start`, `start «${tb.start}» повторюється`); tabStarts.add(tb.start);
      const k = sections.findIndex((x) => x.id === tb.start);
      if (k < 0 || sections[k].type !== 'hero') fail(`${p}.start`, `«${tb.start}» має бути id hero-секції`);
      if (j === 0 && k !== 0) fail(`${p}.start`, 'перша вкладка стартує з першої секції сторінки');
    });
    sections.forEach((x, k) => { if (x.type === 'hero' && !tabStarts.has(x.id) && k > 0) fail(`${page.slug}.sections[${k}]`, 'hero без вкладки: додайте її id в tabs[].start'); });
  } else if (page.tabsLabel) fail(`${page.slug}.tabsLabel`, 'задається лише разом з tabs');
  sections.forEach((s, i) => {
    const path = `${page.slug}.sections[${i}](${s.id || s.type})`;
    const def = SCHEMA.sections[s.type];
    if (!def) fail(path, `невідомий type «${s.type}»; допустимо: ${Object.keys(SCHEMA.sections).join(', ')}`);
    if (i === 0 && s.type !== 'hero') fail(path, 'перша секція має бути hero (без нього немає <h1>)');
    if (i > 0 && s.type === 'hero' && !(tabStarts.has(s.id))) fail(path, 'hero може бути лише першою (і єдиною) секцією; з `tabs` — ще й на початку кожної вкладки (tabs[].start = id цієї hero)');
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
let LOC = 'uk'; // мова поточного lpView (env.locale): числа, службові підписи, одиниця «шт.»
const fmt = (n) => Number(n).toLocaleString(LOC === 'en' ? 'en-GB' : 'uk-UA'); // 1 234 (nbsp); те саме робить lp.js під час лічби
// Кімната-погріб (compare.groups[].cellar, partials/media/cellar-*.html; рішення замовника 19.10: «погріб у перспективі», бочка по центру кімнати): геометрія рахується з count, span і liters групи.
// Кімната = ширина групи (span колонок + зазори, у u як сітка: колонка 115.42u, зазор 40u) × CELLAR.h; стелажі з двох боків ідуть углиб до точки сходу (перспектива), пляшки тонуть у фоні.
// Одиниця виміру — ПРОЛІТ стелажа = 2 стіни × 4 полиці × 6 пляшок = 48 (96 = 2 прольоти, 383 = 7 повних + 47: найдальша пляшка-«хвіст» не добудована). Бочка — по центру кімнати на підлозі; розмір ∝ літражу^(1/3) (об'єм → лінійний розмір).
const CELLAR = { h: 420, col: 115.42, gap: 40, vy: 0.42, depth: 0.42, fade: 0.32, shelves: [0.24, 0.47, 0.70, 0.93], top: 0.02, wallX: [0.04, 0.96], perShelf: 6, bottleW: 22, bottleH: 50, bottleK: 0.78,
  wRef: 673, qMin: 0.55, barrelRef: 200, barrelWRef: 297, barrelBase: 0.97, caskW: 344, caskBottom: 652, caskCx: 260, stroke: 0.9 };   // stroke — як --svg-stroke-hair (одиниці viewBox); барель: ширина 200 L = barrelWRef, нижній край підставок на barrelBase висоти кімнати
const cellarView = (count, span, liters, key) => {
  const C = CELLAR, W = span * C.col + (span - 1) * C.gap, H = C.h, vx = W / 2, vy = H * C.vy;
  const nw = Math.min(1, W / C.wRef), q = Math.max(C.qMin, Math.sqrt(nw)), depth = C.depth / Math.sqrt(nw);   // вузька кімната: пляшки дрібніші, перспектива глибша (інакше пляшки злипаються)
  const sc = (z) => 1 / (1 + depth * z);
  const P = (X, Y, z) => [vx + (X - vx) * sc(z), vy + (Y - vy) * sc(z)];
  const fade = (z) => Math.max(0.04, Math.exp(-z * C.fade));
  const per = 2 * C.shelves.length * C.perShelf;   // пляшок на проліт
  const n = Math.max(0, Math.floor(count)), bays = Math.max(1, Math.ceil(n / per));
  const wx = C.wallX.map((k) => W * k), ys = C.shelves.map((k) => H * k), yTop = H * C.top;
  const f = (x) => +x.toFixed(1), o = (x) => +x.toFixed(3);
  let lines = '';
  const ln = (a, b, op) => { lines += `<line x1='${f(a[0])}' y1='${f(a[1])}' x2='${f(b[0])}' y2='${f(b[1])}' opacity='${o(op)}'/>`; };
  for (const X of wx) for (const Y of [...ys, yTop]) for (let z = 0; z < bays; z += 0.5) ln(P(X, Y, z), P(X, Y, z + 0.5), fade(z + 0.25));   // полиці: сегменти з затемненням
  for (let k = 0; k <= bays; k++) for (const X of wx) ln(P(X, yTop, k), P(X, ys[3], k), fade(k));   // стійки прольотів
  { const [ax, ay] = P(wx[0], yTop, bays), [bx, by] = P(wx[1], ys[3], bays); lines += `<rect x='${f(ax)}' y='${f(ay)}' width='${f(bx - ax)}' height='${f(by - ay)}' opacity='${o(fade(bays))}'/>`; }   // торцева стіна
  const list = [];
  for (let k = 0; k < bays; k++) for (const [wi, X] of wx.entries()) for (const Y of ys) for (let i = 0; i < C.perShelf; i++) list.push({ z: k + (i + 0.5) / C.perShelf, X, Y, wi });
  list.sort((a, b) => a.z - b.z);
  const keep = list.slice(0, n).sort((a, b) => b.z - a.z);   // рівно count пляшок (найдальша — неповний проліт); малюються від дальніх до ближніх
  const bh = (ys[1] - ys[0]) * C.bottleK * q; let bottles = '';
  for (const b of keep) {
    const s = sc(b.z), [x, y] = P(b.X, b.Y, b.z), h = bh * s, w = h * C.bottleW / C.bottleH, xx = b.wi === 0 ? x + w * 0.1 : x - w * 1.1;
    bottles += `<use href='#lp-cellar-bottle-${key}' transform='translate(${f(xx)} ${f(y - h)}) scale(${o(w / C.bottleW)} ${o(h / C.bottleH)})' opacity='${o(0.92 * fade(b.z))}'/>`;
  }
  const k = (C.barrelWRef / C.caskW) * Math.cbrt((liters || C.barrelRef) / C.barrelRef);   // масштаб бочки з сцени (344 × 284 од.) у кімнаті
  return { cellarW: o(W), cellarH: H, cellarLines: lines, cellarBottles: bottles, cellarBarrel: `translate(${f(vx - C.caskCx * k)} ${f(H * C.barrelBase - C.caskBottom * k)}) scale(${o(k)})`, cellarStroke: o(C.stroke / k) };
};
const titleMod = (s) => (s.titleCols === 6 ? ' heading-wide' : '');   // клас-модифікатор ширини заголовка (base.css .heading-wide)
function head(s) { return { id: s.id, kicker: t(s.kicker), title: t(s.title), titleMod: titleMod(s), lead: t(s.lead), caption: t(s.caption) }; }

const colsOf = (s) => s.cols || GRID_COLS;   // ширина вмісту секції в колонках (типово 10)
const VIEW = {
  hero: (s, p) => ({ id: s.id, title: t(s.title), titleRole: s.titleSize === 'large' ? 't-h2' : 't-hero', titleMod: titleMod(s), lead: t(s.lead), img: s.img, alt: t(s.alt), slot: t(s.slot), ctaText: t(s.cta.text), ctaHref: esc(s.cta.href), tone: s.cta.variant || p.tone, panel: s.panel ? '1' : '', mods: (s.panel ? ' hero--panel' : '') + (s.fade ? ` hero--fade hero--fade-${s.fade}` : '') }),
  layers: (s) => {
    const cut = s.items.some((it) => it.img);
    const about = s.look === 'about';
    return { ...head(s), look: about ? '1' : '', noLook: about ? '' : '1', lookMod: about ? ' lp-look--about' : '', arches: `lp-arches--n${s.items.length}${s.shape === 'barrel' ? ' lp-arches--barrel' : ''}`, cut: cut ? '1' : '', noCut: cut ? '' : '1', nMod: ` lp-layers--n${s.items.length}`,   // n рівних блоків контейнера (lp.css): 2, 5 лягають на колонки, 3, 4, 6 — рівний поділ
      items: s.items.map((it) => ({ key: it.key, span: '', icon: it.icon || '', title: t(it.title), value: t(it.value), text: t(it.text), img: it.img || '', slot: t(it.slot) })) };
  },
  steps: (s) => {
    const rich = !!(s.kicker || s.lead || s.caption);
    const deck = s.deck === true;   // колода карток з фото замість арки + списку (lp.css «steps deck»)
    const split = deck && s.split === true;   // картка «текст на тоновому фоні | медіа справа» (фото або Lottie)
    return { ...head(s), plainHead: rich ? '' : '1', richHead: rich ? '1' : '', arch: deck ? '' : '1', deck: deck ? '1' : '', deckMod: deck ? ` lp-steps--deck${split ? ' lp-steps--split' : ''} lp-steps--n${s.items.length}` : '', split: split ? '1' : '', noSplit: split ? '' : '1',
      scene: s.scene || '', img: s.img || '', alt: t(s.alt), slot: t(s.slot),
      items: s.items.map((it, i) => ({ key: it.key, n: i + 1, value: t(it.value), title: t(it.title), text: t(it.text),
        img: it.img || '', lottie: it.lottie || '', alt: t(it.alt), slot: t(it.slot), posMod: `${it.imgPos ? ` lp-steps__card--pos-${it.imgPos}` : ''}${it.zoom ? ` lp-steps__card--zoom-${Math.round(it.zoom * 100)}` : ''}`, tags: li(it.tags) })) };
  },
  compare: (s) => ({ ...head(s), note: t(s.note), rv: s.reveal === false ? '' : '1',   // reveal: false — групи без появи і без count-up (число одразу фінальне)
    groups: s.groups.map((g) => ({ rv: s.reveal === false ? '' : '1', key: g.key, span: g.span, mods: `${g.cellar ? ' lp-group--has-cellar' : ''}${g.accent ? ' lp-group--accent' : ''}${g.align === 'center' ? ' lp-group--center' : ''} lp-group--${g.key}`,
      label: t(g.label), count: g.count, countText: fmt(g.count), approx: g.approx ? '1' : '', approxLabel: LOC === 'en' ? LABELS_EN.approx : LABELS.approx, sizeShow: g.countWord ? '' : '1', inlineLiters: g.countWord ? '1' : '', countWord: t(g.countWord), unit: t(g.unit), cellar: g.cellar || '', ...(g.cellar ? cellarView(g.count, g.span, g.liters, g.key) : {}), list: li(g.list),
      facts: (g.facts || []).map((f) => ({ value: t(f.value), label: t(f.label), valueMod: [...f.value].length > 16 ? ' lp-group__fact-value--wrap' : '' })) })) }),
  formats: (s) => ({ ...head(s), look: s.look === 'about' ? '1' : '', noLook: s.look === 'about' ? '' : '1', lookMod: s.look === 'about' ? ' lp-look--about' : '',
    items: s.items.map((it) => ({ key: it.key, tone: it.tone, span: colsOf(s) / s.items.length, lead: t(it.lead), leadGap: !it.lead && s.items.some((x) => x.lead) ? '1' : '',   // lead у ОДНІЙ панелі: у другій — порожній рядок тієї ж висоти (спільні рядки subgrid)
      value: t(it.value), unit: t(it.unit),
      cols: it.items.length, drinks: it.items.map((d) => ({ title: t(d.title), text: t(d.text) })), facts: (it.facts || []).map((f) => ({ label: t(f.label), value: t(f.value) })) })) }),
  tiles: (s) => {
    const round = s.shape === 'circle';   // коло: лід — у шапці під H2, як в інших секціях (рев'ю ce0223c5); раніше стояв під рядом плиток
    const n = s.items.length; const cols = colsOf(s);
    const about = s.look === 'about';
    const per = s.perRow || n;
    const eq = cols % per !== 0;            // пунктів не ділять колонок (напр. 4 плитки на 10 колонок): n рівних блоків контейнера з зазором колонок, краї ряду — на межах колонок
    return { ...head(s), look: about ? '1' : '', noLook: about ? '' : '1', lookMod: about ? ' lp-look--about' : '', arches: `lp-arches--n${n}`, shapeMod: `${round ? ' lp-tiles--circle' : ''}${s.leadCols ? ` lp-tiles--lead-${s.leadCols}` : ''}${round && s.captionOver ? ' lp-tiles--over' : ''}${s.bare ? ' lp-tiles--bare' : ''}${s.items.every((it) => it.engraving === 'engraving-crown') ? ' lp-tiles--crown' : ''}${s.loose ? ' lp-sec--loose' : ''}`,
      gridMod: `${eq ? ` lp-tiles__grid--eq lp-tiles__grid--n${per}` : ''}${s.perRow ? ' lp-tiles__grid--rows' : ''}`,
      items: s.items.map((it) => ({ key: it.key, span: eq ? '' : cols / per, engraving: it.engraving || '', icon: it.icon || '', img: it.img || '', alt: t(it.alt), slot: t(it.slot),
        toneMod: it.tone ? ` lp-tile--tone-${it.tone}` : '', posMod: `${it.imgPos ? ` lp-tile--pos-${it.imgPos}` : ''}${it.zoom ? ` lp-tile--zoom-${Math.round(it.zoom * 100)}` : ''}`, originRole: round ? 't-spec' : 't-text', name: t(it.name), origin: t(it.origin), notes: t(it.notes) })) };
  },
  offers: (s, p) => ({ ...head(s), look: s.look === 'about' ? '1' : '', noLook: s.look === 'about' ? '' : '1', gridMod: ` lp-offers__grid--n${s.items.length}`, offersMod: `${s.scene ? ' lp-offers--scene' : ''}${s.airy ? ' lp-offers--airy' : ''}`, scene: s.scene || '', bg: s.bg || '', bgW: s.bgW || '', bgH: s.bgH || '', bgSlot: t(s.bgSlot),
    routeFrom: t(s.route?.from), routeTo: t(s.route?.to), routeIcon: s.route?.icon || '',
    items: s.items.map((it) => ({ key: it.key, span: '', tone: p.tone, look: s.look === 'about' ? '1' : '', noLook: s.look === 'about' ? '' : '1', title: t(it.title), price: t(it.price), priceNote: t(it.priceNote),
      facts: (it.facts || []).map((f) => ({ swapMod: s.look === 'about' ? ' lp-offer__fact--swap' : '', dt: t(f.dt), dd: t(f.dd).replace(LOC === 'en' ? /\bpcs\b/g : /шт\./g, `<span class="lp-offer__unit">${LOC === 'en' ? 'pcs' : 'шт.'}</span>`), ddMod: [...f.dd].length > 24 || longestRun(f.dd) > 14 ? ' lp-offer__dd--wrap' : '' })),
      includes: li(it.includes), ctaText: t(it.cta.text), ctaHref: esc(it.cta.href) })),
    footText: t(s.foot?.text), footNote: t(s.foot?.note), footCtas: (s.foot?.ctas || []).map((c) => ({ text: t(c.text), href: esc(c.href), variant: c.variant })) }),
  card: (s, p) => ({ ...head(s), text: t(s.text), ctaText: t(s.cta.text), ctaHref: esc(s.cta.href), tone: p.tone,
    photo: (s.img || '').replace(/^\/assets\/img\//, ''), alt: t(s.alt), slot: t(s.slot), cardMod: s.photoFirst ? ' tour-card--photo-first' : '',
    listHtml: (s.list || []).map((x) => `<li>${t(x)}</li>`).join('') }),
  place: (s) => ({ ...head(s), look: s.look === 'about' ? '1' : '', noLook: s.look === 'about' ? '' : '1', lookMod: s.look === 'about' ? ' lp-look--about' : '',
    titleRole: s.look === 'about' ? 't-hero' : (s.titleSize === 'small' ? 't-lead' : 't-h2'),   // look: about — заголовок картки tour-card (роль .t-hero, як у «Те, що сподобалось — із собою»)
    facts: s.facts.map((f) => ({ label: t(f.label), value: t(f.value), icon: f.icon || '', href: f.href ? esc(f.href) : '', plain: f.href ? '' : '1', external: /^https?:/.test(f.href || '') || /^%contacts\.gmaps/.test(f.href || '') ? '1' : '' })),
    ctas: (s.ctas || []).map((c) => ({ text: t(c.text), href: esc(c.href), variant: c.variant, arrow: c.variant === 'outline' ? '' : '1' })) }),
  ref: (s) => ({ id: s.id, n: s.n, title: t(s.title), text: t(s.text), img: s.img || '', alt: t(s.alt), ctaText: t(s.cta?.text), ctaHref: esc(s.cta?.href || ''), items: (s.items || []).map((it) => ({ title: t(it.title), text: t(it.text) })) }),
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
  LOC = env.locale || 'uk';
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
    const mods = `${s.cols && s.cols !== GRID_COLS ? ` lp-cols--${s.cols}` : ''}${s.pad ? ` lp-pad--${s.pad}` : ''}${s.join ? ' lp-sec--join' : ''}${next?.join ? ' lp-sec--join-next' : ''}${s.stack ? ' lp-sec--stack' : ''}${next?.stack ? ' lp-sec--stack-next' : ''}`;
    return { room, mods, ...VIEW[s.type](s, p), type: s.type === 'ref' ? `b2b-ref-${s.n}` : s.type };   // (hero задає свої mods: hero--panel)
  });
  if (page.tabs) {   // вкладки: у плоский список вставляються службові блоки (partials/lp/tabbar|tabpanel-open|tabpanel-close|tabs-close): перемикач + обгортки панелей
    const starts = page.tabs.map((tb) => sections.findIndex((x) => x.id === tb.start));
    const tabsView = page.tabs.map((tb, j) => ({ key: tb.key, label: t(tb.label), active: j === 0 ? ' is-active' : '', selected: j === 0 ? 'true' : 'false', tabindex: j === 0 ? '' : ' tabindex="-1"' }));
    const wrapped = [{ type: 'tabbar', room: 'deep', mods: '', tabsLabel: t(page.tabsLabel || ''), tabs: tabsView }];
    sections.forEach((s, i) => {
      const j = starts.indexOf(i);
      if (j >= 0) { if (j > 0) wrapped.push({ type: 'tabpanel-close', mods: '' }); wrapped.push({ type: 'tabpanel-open', mods: '', ...tabsView[j] }); }
      wrapped.push(s);
    });
    wrapped.push({ type: 'tabpanel-close', mods: '' }, { type: 'tabs-close', mods: '' });
    return { slug: page.slug, theme: page.theme, tone, metaTitle: t(page.metaTitle), metaDescription: t(page.metaDescription), sections: wrapped, tabs: tabsView };
  }
  return { slug: page.slug, theme: page.theme, tone, metaTitle: t(page.metaTitle), metaDescription: t(page.metaDescription), sections };
}
