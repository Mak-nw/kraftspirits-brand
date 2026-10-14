# QA-набір site_brand

Спільний набір перевірок замість одноразових puppeteer-скриптів. Node ESM, єдина залежність — `puppeteer-core` (devDependency; Chrome береться системний:
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, інший — `--chrome <шлях>` або `CHROME_PATH`).
Спершу запусти те, що вже є тут; одноразовий скрипт — лише коли набір не покриває задачу (і тоді користуйся `lib.mjs`).

## Команди (з `site_brand/`)

| Команда | Що робить |
|---|---|
| `npm run qa` | швидкий smoke: check-ds (static) + links + hscroll (1200/1440/1920) + states, ширина 1920 |
| `npm run qa:full` | повний: ширини 1200,1440,1920 × dpr 1,2 × смуга classic+none; check-ds static+dynamic, links, hscroll, states, arch, cls |
| `npm run qa:check-ds` | check-ds (S1–S9 статика + D1–D11 у браузері); `-- --static-only` / `-- --dynamic-only` / `-- --rules S4,D5` |
| `npm run qa:links` | усі внутрішні `<a href>` і якорі; `-- --matrix` друкує «звідки → куди» |
| `npm run qa:states` | стани кнопок проти токенів `--btn-*` + транзиції + фокус-кільце |
| `npm run qa:arch` | товщина контуру арки 14 карток каталогу, 8 ширин × dpr 1,2 × classic/none |
| `npm run qa:cls` | холодний CLS: N запусків, чистий профіль, кеш вимкнено, `--cpu 4` throttle |
| `npm run qa:hscroll` | горизонтальний скрол/зріз: сторінки × ширини × смуга |
| `npm run qa:ink` | піксельний (ink) еталон вирівнювання чекбокс ↔ перший гліф підпису (feedback, design-system, ворота; dpr 4; допуск 0.5px); `-- --icons` додатково міряє іконки кнопок/nav/select/специфікацій (лише інформація) |

Аргументи після `--` (або ENV `QA_<КЛЮЧ>`: `QA_URL`, `QA_WIDTHS`, `QA_DPR`, `QA_SCROLLBAR`, `QA_PAGES`, `QA_OUT`):

- `--url` — за замовч. `http://localhost:5200/`; живий сайт: `https://mak-nw.github.io/kraftspirits-brand/` (база з `/` на кінці).
- `--widths 1200,1440,1920`, `--dpr 1,2`, `--scrollbar classic|none|both`, `--height 1080`.
- `--pages index,catalog,"product?id=gin-yasnyi"` — за замовч. усі `*.html` у корені + 2 товари (`gin-yasnyi`, `whiskey-white`). Аргумент із `?` у лапках (zsh).
- `--json` — результат JSON у stdout; `--out <dir>` — за замовч. `tools/qa/.out/` (у `.gitignore`; там чисті профілі Chrome, збірка `dist/` для S7/S9, `<інструмент>.json`).
- Код виходу: `0` — порушень немає, `1` — є, `2` — збій інструмента.

Службові параметри додаються автоматично: статичні заміри — `?age=ok&reveal=off&parallax=off`; анімаційні — `?age=ok&reveal=on&parallax=off`; перевірка воріт (D10) — без `age`.
Кожен запуск — новий Chrome з новим профілем (видаляється), усі процеси закриваються в `finally` (за PID, **без pkill**); dev-сервер перевірок запускай власний
(`npx vite --port 5340 --strictPort`, зупинка за PID). У dev-режимі overlay design-machine (`#__review-host`, `[id^="__"]`) ігнорується.

## check-ds: правила

Статичні (CSS/HTML/JS у `src/`, `partials/`, `*.html`; `tokens.css` — джерело, його не перевіряють): **S1** hex/rgb/hsl/іменований колір поза tokens.css (і в SVG-атрибутах HTML) ·
**S2** px/rem у font-size/line-height/letter-spacing/padding/margin/gap/width/height (+min/max) · **S3** `style="` у HTML, partials і JS-шаблонах · **S4** `text-decoration: underline`
поза футером і `.age-card__legal` · **S5** `var(--x)` на неіснуючий токен · **S6** невикористані токени (інформаційно) · **S7** дубль `id` в одному HTML (після `vite build` у `.out/dist`) ·
**S8** `@import`/`url()` у CSS на неіснуючі файли · **S9** `href`/`src` на неіснуючі файли у збірці, незаповнені `%плейсхолдери%`, шляхи зображень у `src/data/*.js`.

Динамічні (за ширинами/смугою): **D1** роль `.t-*` → однакові font-family/size/line-height/weight/letter-spacing на всіх сторінках для того самого контексту (допуск 0.5px) ·
**D2** висоти `.btn .chip .nav-cell .select .product-card--catalog` однакові між сторінками · **D3** hscroll · **D4** консоль/4xx/failed · **D5** підкреслення (default/hover/focus-visible
через CDP `forcePseudoState`) поза футером/воротами · **D6** Tab-walker: кільце focus-visible ≥3:1 (спершу за ланцюжком фонів, при сумнівах — за пікселями скриншота) ·
**D7** рівно один h1, без пропусків рівнів · **D8** контраст ролей `.t-*` ≥4.5:1 (≥3:1 великий; disabled не рахується; сумнівні міряються піксельно) · **D9** alt/імена кнопок і полів ·
**D10** вікові ворота показуються без `?age=ok` · **D11** центрування контролів з підписом. Метод — по РЕАЛЬНОМУ тексту, не арифметикою line-height: перший символ підпису беремо через `Range.getClientRects()` (content-area шрифту; `top` = базова лінія − округлений ascent, Chrome округлює ascent/descent), метрики шрифту — з canvas (`fontBoundingBoxAscent/Descent`, `actualBoundingBoxAscent` літери «H» = cap-height) → базова лінія й ОПТИЧНИЙ центр = центр великих літер `baseline − cap/2`. Чекбокс/радіо: центр боксу = цей оптичний центр першого рядка (допуск 0.5px, `alignCheckTolerancePx`; 1–3 рядки, перевіряється лише перший). Іконка у `.btn__inner`/`.nav-cell`: центр іконки = центр content-area тексту (допуск 1px, `alignIconTolerancePx`) + діагностично відхилення від cap-центру (інформація). Що D11 НЕ бачить: розтушовування й округлення на растері — для цього `qa:ink`.

**Піксельний ink-замір (`npm run qa:ink`, `tools/qa/ink.mjs`).** Знімок в'юпорта при dpr 4 «з» і «без» елемента (бокс `visibility:hidden`, перший гліф `color:transparent`); різниця = маска чорнила без впливу фону; центр = середина рядків маски (поріг 50% піку). Малу першу літеру міряємо як велику (cap-height). Це еталон для підозрілих місць; допуск 0.5px. Обмеження: `setViewport({deviceScaleFactor})` — емуляція, у ній Chrome прив'язує базову лінію тексту й межі боксів до ЦІЛИХ CSS px (у справжньому hi-dpi — до px пристрою, там похибка ≤0.25), тому ink-похибка залишкового округлення зсуву ≤0.5px; зсув боксу на 1px піксельний замір ловить не на всіх ширинах (на 1200 — ні), 2px — завжди; layout-D11 ловить 1px на всіх.

Звіт: `правило  файл:рядок / селектор / сторінка@ширина  = значення — повідомлення`. Однакові повідомлення групуються.

### Винятки — `check-ds.allow.json`
Запис `{ rule, file?, selector?, page?, prop?, value?(RegExp), reason, date, decision }`; без `reason` ігнорується. Коментарі CSS/HTML ігноруються автоматично. Нові винятки лише з рішенням замовника.
Секції `dynamic` і `static` — пороги й дозволені контексти (підкреслення: `.site-footer`, `.age-card__legal`).

## states
Для сімейств `btn` (gold, light, beige, green, teal, outline), `nav-cell` (outline, fill, ghost), `arrow-btn`, `chip`/`chip-picker` (+selected), `nav-link` (+on-light) знаходить реальний елемент на сторінках,
проходить default → hover (safeHover) → focus (клавіатурний) → active (mouse down, відпускання поза елементом) → disabled (тимчасовий `aria-disabled`) і порівнює computed bg/text/border/icon-filter
з розв'язаними `--btn-<варіант>-<властивість>-<стан>` (ST1); транзиції: default/hover = `--btn-transition-duration` (≥0.3s), focus/active = `--btn-transition-duration-focus` (ST2); кільце за `--focus-ring-width` (ST3).
Не покрито: select, check, row-faq, row-product, catnav, thumb, volume, choice.

## arch
Піксельний замір скриншота: покриття кольору арки (`--color-green`) на тлі `--color-card-bg-catalog` уздовж ліній через центр арки; сума = товщина в device px. Критерії: мін. ≥0.5×очікуваної (2.476u×DPR), розкид сторони між картками ≤0.5 device px (верх — лише мінімум: у центрі арка товстіша).

## Бібліотека `lib.mjs`
`parseArgs`, `pageUrl`, `launch({scrollbar})`, `openPage`, `waitStable`, `u`, `tokens`, `normColors`, `contrast`, `measure.{rect,inside,relative,styles}`, `hscroll`, `safeHover`/`unhover`, `tabWalk`, `ringPixelContrast`, `textPixelContrast`, `CLS_INIT/readCLS`, `Report`, `runMain`.

## Як додати перевірку
1. Статичну — у `ds-static.mjs` (`want('Sx')` + `add({rule,file,line,selector,value,msg})`); динамічну — у `ds-dynamic.mjs` (дані збирай у `COLLECT`, аналізуй нижче, `addV`). Нова заборона замовника = нове правило S/D + рядок тут і у `CLAUDE.md`.
2. Окремий інструмент — файл `tools/qa/<name>.mjs` з `export async function runX(o)` → `Report`, + `runMain` під `import.meta.url`, скрипт `qa:<name>` у `package.json`, підключення в `run.mjs`.
3. Позитивний контроль обов'язковий: внеси навмисне порушення в КОПІЮ проєкту (не в проєкт) і переконайся, що перевірка падає.

## Відомі обмеження
- Фони, намальовані картинками/псевдоелементами, ланцюжок фонів не бачить; для D6/D8 це компенсується піксельним заміром лише для «підозрілих» елементів.
- `hscroll`: у `html` стоїть `overflow-x: clip`, тому `scrollWidth` не показує зріз — додатково шукаються елементи за межами в'юпорта.
- Навігаційні `catalog.html#<категорія>` — не DOM-якорі (хеш читає `catalog.js`), links їх не вимагає.
- Живий сайт: без навантаження (послідовно, один Chrome на комбінацію).
