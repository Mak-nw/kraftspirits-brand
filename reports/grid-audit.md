# Аудит прив'язки блоків до колонок сітки (правило D12)

Замовник: «треба запустити перевірку по прив'язки елементів до колонок. Наприклад у футері ігнор колонок. Перевірити всі блоки, щоб вони стояли згідно сітки колон».

Інструмент: `tools/qa/grid-d12.mjs` (+ інтеграція в `ds-dynamic.mjs`, `check-ds.mjs`, `check-ds.allow.json → grid`, `npm run qa:grid`, `tools/qa/grid-overlay.mjs`). Прогін: dev `localhost:5400`, ширини 1200/1440/1728/1920, смуга none, сторінки index, catalog, product (3 варіанти), contacts, feedback, barrels, cocktails, about, faq, offer, 404, cart + вікові ворота 18+ окремо. design-system.html пропущено (950 демо-блоків, 931 «порушення» — демо-сторінка має власну розкладку; прогін `--pages design-system` для довідки). Сирі дані: `check-ds --rules D12 --out <dir>` → `<dir>/grid-d12.json`. Виправлень у сторінках/CSS не робилося.

## Короткий підсумок

- **Єдиної сітки в проєкті немає.** Є три різні «сітки» і десяток ручних контейнерів у u; лише їхні фрагменти дійсно 12-колонкові (каталог, коктейлі, контакти, фідбек).
- Зі 1911 блоко-вимірів (60 сторінко-ширин) на межах колонок лежить 386, «підозрілих» (0.5–1px) 2, порушень (>1px) 1523. Порушення однакові в u на всіх чотирьох ширинах (усе масштабується `--u`), тож це геометрія, а не адаптивність.
- Повністю «зелені» у main: **contacts, feedback** (панелі 5/7 і 12-колонкове вікно). Майже зелені: **catalog** (картки 4×3 колонки ідеальні; 3 порушення — заголовок-навігація й панель фільтрів), **cocktails** (фото 4 / текст 5 / товар 3 колонки ідеальні; порушують лише вступ і колонка опису 653u = 4.49 кол.).
- Найгірші: **barrels** (41 унікальний блок: контейнер 1508u/gap 100u поза сіткою), **index** (23 у main), **футер** і **хедер** (на кожній сторінці).
- Унікальних блоків-порушників (по всіх ширинах): index main 23, barrels main 41, catalog main 3, product main 3 (медіа 905u ≠ 907.5u, панель 910u), cocktails main 3, about/faq/offer/404/cart main 2 (під-конструкція) кожна, age-gate 1; header 6 і footer 9 — спільні для всіх сторінок.
- Позитивний контроль (копія проєкту): зсув панелі контактів на 7px — D12 дає `ліво +7.00px [fail]` і `право +7.00px [fail]`; розтягнення правого краю на 40px (≈ півколонки) — `право +40.00px [fail]`, ширина 5.35 кол. замість 5. Контрольні правки лише в копії.

## (а) Опис сітки

**Масштаб.** `--u = clamp(1185px, --vw, 1920px) / 1920` (`tokens.css`, `--vw` = ширина макета без смуги прокрутки, `viewport.js`). 1u = 1px макета: на 1920 = 1px, 1728 = 0.9px, 1440 = 0.75px, 1200 = 0.625px.

**Глобального токена сітки немає** (`--grid-*`, `--columns`, `--span` — єдиного нема). Знайдено:

| Де | колонки | поле зліва/справа | gap | токени |
|---|---|---|---|---|
| Каталог (картки, фільтри) | 4 картки = 12 кол. × 3 | 47.5u (контейнер 1825u) | 40u | `--size-catalog-grid-w` 1825u, `--space-catalog-grid-gap` 40u; колонка 115.42u |
| Коктейлі (блок 4/5/3) | 12 | 47.5u (1825u) | 40u | `--count-cocktail-cols`, `--span-cocktail-media/body/item` = 4/5/3 |
| Контакти (5/7) | 12 | 50u | 5u | `--columns-contacts`, `--span-contacts-main/aside`, `--space-contacts-gap` |
| Фідбек (6/6) | 12 | 50u | 50u між стовпцями вікна | `--columns-feedback`, `--space-feedback-col-gap` |
| Товар (фото / панель) | 2 половини | 50u | 5u | `--space-product-col-gap`; фото 905u, панель 910u (у Figma-значеннях, не за формулою) |
| Header/footer | — | `--gutter` 47u | — | footer: `--footer-col-menu-w` 471u, `--footer-col-catalog-w` 442u, далі `1fr auto` |
| Інші контейнери | — | 43u (тури/бренд-половинки), 50u (intro), 206u (barrels `--container-wide` 1508u), 47u (`--container-full` 1826u) | різні | `--container-*` |

«Розділ Відступи та контейнери» у `design-system.html` показує лише смужки `--space-*`/`--gutter`/`--container-text|wide|full` — колонок і gap там нема.

**Еталонні профілі D12** (`check-ds.allow.json → grid`), 12 колонок: `catalog` — поле 47.5u, gap 40u (колонка 115.42u) — для всього сайту за замовчуванням і для header/footer; `product` — поле 50u, gap 5u (колонка 147.08u) — для product/contacts/feedback.

Реальні px (поле / gap / колонка):

| ширина | u | catalog: поле / gap / колонка | product: поле / gap / колонка |
|---|---|---|---|
| 1200 | 0.625 | 29.69 / 25.00 / 72.14 | 31.25 / 3.13 / 91.93 |
| 1440 | 0.75 | 35.63 / 30.00 / 86.56 | 37.50 / 3.75 / 110.31 |
| 1728 | 0.9 | 42.75 / 36.00 / 103.88 | 45.00 / 4.50 / 132.38 |
| 1920 | 1 | 47.50 / 40.00 / 115.42 | 50.00 / 5.00 / 147.08 |

Формула: початок колонки k (0..11) = поле + k·(колонка + gap); кінець = початок + колонка; блок із n колонок має ширину n·колонка + (n−1)·gap. Центр макета = середина gap між колонками 6 і 7 → **симетрично по центру можна ставити лише блоки з парною кількістю колонок (2/4/6/8/10)**; 3 або 5 колонок по центру на 12-колонковій сітці неможливі.

Спостереження: `cocktails.html` при overlay-смузі (macOS) резервує `scrollbar-gutter: stable` — `--vw` = 1905 при clientWidth 1920 (праві 15px порожні); D12 рахує сітку за `--vw`.

**Метод D12** — див. `tools/qa/README.md` (рядок D12). Допуски: ≤0.5px норма, 0.5–1px «підозріле» (у JSON), >1px порушення (у звіті; відхилення нижче в u = px при 1920).

## (б) Порушення по сторінках

Таблиці — тільки порушення >1px, значення на 1920 (u = px). «vs межа» — найближча межа: лівий край — початок колонки, правий — кінець колонки; у дужках відхилення (+ = правіше межі). Блоки без одного з країв — край збігається з уже перевіреним краєм предка або «на всю ширину». Заголовки/абзаци: перевіряється рамка блоку, не видимий текст (див. «Сліпі зони»).

**Підозрілі 0.5–1px:** лише 2 — `footer__cols` і `footer__legal` на cocktails@1920 (−0.50/+0.50px, бо там `--vw` = 1905: поле футера 47u проти 47.5u). На інших сторінках футерні `47u` проти `47.5u` дають рівно 0.5px (у допуску). Це зайвий півпіксель: `--gutter` 47 vs поле каталогу 47.5 — бажано привести до одного значення.


#### Футер (однаковий на всіх сторінках; 1920)

| блок | лівий край vs межа | правий край vs межа | ширина, кол. (факт / очікув.) |
|---|---|---|---|
| `r__top > div.site-footer__cols > section.site-footer__col.site-footer__col--menu` | 43.0u → поч.кол.1 (-4.50u) | 522.0u → кін.кол.3 (+48.25u) | 3.34 / 3 |
| `ooter__cols > section.site-footer__col.site-footer__col--menu > h2.t-footer-head` | 49.0u → поч.кол.1 (+1.50u) | 518.0u → кін.кол.3 (+44.25u) | 3.28 / 3 |
| `r__cols > section.site-footer__col.site-footer__col--menu > ul.site-footer__list` | 49.0u → поч.кол.1 (+1.50u) | 518.0u → кін.кол.3 (+44.25u) | 3.28 / 3 |
| `div.site-footer__top > div.site-footer__cols > section.site-footer__col` | 514.0u → поч.кол.4 (+0.25u) | 964.0u → кін.кол.6 (+24.00u) | 3.15 / 3 |
| `div.site-footer__cols > section.site-footer__col > h2.t-footer-head` | 518.0u → поч.кол.4 (+4.25u) | 960.0u → кін.кол.6 (+20.00u) | 3.10 / 3 |
| `div.site-footer__cols > section.site-footer__col > ul.site-footer__list` | 518.0u → поч.кол.4 (+4.25u) | 960.0u → кін.кол.6 (+20.00u) | 3.10 / 3 |
| `-footer__top > div.site-footer__cols > h2.site-footer__col.site-footer__col--end` | 1786.5u → поч.кол.12 (+29.40u) | 1877.0u → кін.кол.12 (+4.50u) | 0.84 / 1 |
| `top > div.site-footer__legal > p.site-footer__wordmark.site-footer__wordmark--yc` | 457.0u → поч.кол.4 (-56.75u) | 1463.0u → кін.кол.9 (+56.75u) | 6.73 / 7 |
| `ooter.site-footer > div.site-footer__bottom > p.site-footer__wordmark.t-wordmark` | 457.0u → поч.кол.4 (-56.75u) | 1463.0u → кін.кол.9 (+56.75u) | 6.73 / 7 |

#### Хедер (1920, сторінка catalog)

| блок | лівий край vs межа | правий край vs межа | ширина, кол. (факт / очікув.) |
|---|---|---|---|
| `header.site-header > div.site-header__bar` | 351.7u → поч.кол.3 (-6.66u) | 1568.3u → кін.кол.10 (+6.66u) | 8.09 / 8 |
| `header.site-header > div.site-header__bar > div.site-header__side` | 366.7u → поч.кол.3 (+8.34u) | 762.2u → кін.кол.5 (-22.36u) | 2.80 / 3 |
| `header.site-header > div.site-header__bar > div.site-header__logos` | 762.2u → поч.кол.6 (-62.36u) | 1157.8u → кін.кол.7 (+62.36u) | 2.80 / 3 |
| `header__bar > div.site-header__logos > a.site-header__logo.site-header__logo--yc` | 739.6u → поч.кол.5 (+70.47u) | 960.0u → кін.кол.6 (+20.00u) | 1.68 / 2 |
| `header__bar > div.site-header__logos > a.site-header__logo.site-header__logo--bs` | 960.0u → поч.кол.7 (-20.00u) | 1180.4u → кін.кол.8 (-70.47u) | 1.68 / 2 |
| `ite-header > div.site-header__bar > div.site-header__side.site-header__side--end` | 1157.8u → поч.кол.8 (+22.36u) | 1553.3u → кін.кол.10 (-8.34u) | 2.80 / 3 |

#### index (@1920, сітка «catalog»)

| блок | лівий край vs межа | правий край vs межа | ширина, кол. (факт / очікув.) |
|---|---|---|---|
| `main > section.hero > h1.hero__logos` | 468.5u → поч.кол.4 (-45.25u) | 1451.5u → кін.кол.9 (+45.25u) | 6.58 / 7 |
| `section.hero > h1.hero__logos > span.hero__logo.hero__logo--yc` | 529.9u → поч.кол.4 (+16.11u) | 1390.1u → кін.кол.9 (-16.13u) | 5.79 / 6 |
| `ection.brands > article.brand-half.brand-half--yasnocraft > div.brand-half__card` | 43.0u → поч.кол.1 (-4.50u) | 955.0u → кін.кол.6 (+15.00u) | 6.13 / 6 |
| `and-half.brand-half--yasnocraft > div.brand-half__card > div.brand-half__content` | 258.0u → поч.кол.2 (+55.08u) | 740.0u → кін.кол.5 (-44.58u) | 3.36 / 3 |
| `div.brand-half__content > div.brand-half__logo > img` | 298.0u → поч.кол.3 (-60.33u) | 700.0u → кін.кол.4 (+70.83u) | 2.84 / 3 |
| `tion.brands > article.brand-half.brand-half--bazylsprings > div.brand-half__card` | 965.0u → поч.кол.7 (-15.00u) | 1879.0u → кін.кол.12 (+6.50u) | 6.14 / 6 |
| `d-half.brand-half--bazylsprings > div.brand-half__card > div.brand-half__content` | 1181.0u → поч.кол.8 (+45.58u) | 1663.0u → кін.кол.11 (-54.08u) | 3.36 / 3 |
| `main > section.intro > div.stats` | 555.0u → поч.кол.4 (+41.25u) | 1365.0u → кін.кол.9 (-41.25u) | 5.47 / 5 |
| `section.intro > div.stats > div.stat.stat--compact` | — | 805.0u → кін.кол.5 (+20.42u) | 1.87 / 2 |
| `main > section.intro > div.intro__text` | 50.0u → поч.кол.1 (+2.50u) | 1870.0u → кін.кол.12 (-2.50u) | 11.97 / 12 |
| `section.intro > div.intro__text > h2.intro__title.t-hero` | 363.0u → поч.кол.3 (+4.67u) | 1557.0u → кін.кол.10 (-4.67u) | 7.94 / 8 |
| `section.intro > div.intro__text > p.intro__body.t-text` | 631.0u → поч.кол.5 (-38.17u) | 1289.0u → кін.кол.8 (+38.17u) | 4.49 / 4 |
| `main > section.tours > article.tour-card` | 43.0u → поч.кол.1 (-4.50u) | 1879.0u → кін.кол.12 (+6.50u) | 12.07 / 12 |
| `section.tours > article.tour-card > div.tour-card__text` | — | 1117.0u → кін.кол.7 (+21.58u) | 7.17 / 7 |
| `section.tours > article.tour-card > div.tour-card__photo` | 1117.0u → поч.кол.8 (-18.42u) | — | 5.16 / 5 |
| `main > section.tours > article.tour-card.tour-card--photo-first` | 43.0u → поч.кол.1 (-4.50u) | 1879.0u → кін.кол.12 (+6.50u) | 12.07 / 12 |
| `section.tours > article.tour-card.tour-card--photo-first > div.tour-card__text` | 805.0u → поч.кол.6 (-19.58u) | — | 7.17 / 7 |
| `section.tours > article.tour-card.tour-card--photo-first > div.tour-card__photo` | — | 805.0u → кін.кол.5 (+20.42u) | 5.16 / 5 |
| `section.picker > div.picker__content > div.picker__head` | 379.0u → поч.кол.3 (+20.67u) | 1541.0u → кін.кол.10 (-20.67u) | 7.73 / 8 |
| `div.picker__content > div.picker__head > h2.picker__title.t-h2` | 679.0u → поч.кол.5 (+9.83u) | 1241.0u → кін.кол.8 (-9.83u) | 3.87 / 4 |
| `div.picker__content > div.picker__head > p.picker__text.t-body` | 710.0u → поч.кол.5 (+40.83u) | 1210.0u → кін.кол.8 (-40.83u) | 3.47 / 3 |
| `section.picker > div.picker__content > div.slider` | 652.9u → поч.кол.5 (-16.29u) | 1267.1u → кін.кол.8 (+16.29u) | 4.21 / 4 |
| `div.picker__content > div.slider > div.slider__track` | 746.9u → поч.кол.5 (+77.71u) | 1173.1u → кін.кол.7 (+77.71u) | 3.00 / 3 |

#### catalog (@1920, сітка «catalog»)

| блок | лівий край vs межа | правий край vs межа | ширина, кол. (факт / очікув.) |
|---|---|---|---|
| `main.catalog-page > nav.catalog-nav.t-hero` | 394.0u → поч.кол.3 (+35.67u) | 1526.0u → кін.кол.10 (-35.67u) | 7.54 / 8 |
| `alog-page > div.catalog-bar > div.catalog-bar__group.catalog-bar__group--filters` | — | 692.9u → кін.кол.4 (+63.74u) | 4.41 / 4 |
| `main.catalog-page > div.catalog-bar > div.catalog-bar__group` | 1525.0u → поч.кол.11 (-76.67u) | — | 2.49 / 2 |

#### product (@1920, сітка «product»)

| блок | лівий край vs межа | правий край vs межа | ширина, кол. (факт / очікув.) |
|---|---|---|---|
| `main.product > div.product-media` | 50.0u → поч.кол.1 (+0.00u) | 955.0u → кін.кол.6 (-2.50u) | 5.98 / 6 |
| `main.product > div.product-media > nav.product-thumbs` | 65.0u → поч.кол.1 (+15.00u) | 191.0u → кін.кол.1 (-6.08u) | 0.86 / 1 |
| `main.product > article.product-panel` | 960.0u → поч.кол.7 (-2.50u) | 1870.0u → кін.кол.12 (+0.00u) | 6.02 / 6 |

#### barrels (@1920, сітка «catalog»)

| блок | лівий край vs межа | правий край vs межа | ширина, кол. (факт / очікув.) |
|---|---|---|---|
| `section.hero.hero--barrels > div.hero__content > h1.hero__title` | 410.0u → поч.кол.3 (+51.67u) | 1510.0u → кін.кол.10 (-51.67u) | 7.34 / 7 |
| `main > section.barrels-benefits.bx-room > div.barrels-benefits__grid` | 206.0u → поч.кол.2 (+3.08u) | 1714.0u → кін.кол.11 (-3.08u) | 9.96 / 10 |
| `div.barrels-benefits__grid > div.barrels-benefits__head > h2.t-h2` | 205.3u → поч.кол.2 (+2.35u) | — | 9.97 / 10 |
| `ol.bx-layers > li.bx-layer.bx-layer--char > span.bx-layer__tex` | — | 559.0u → кін.кол.4 (-70.17u) | 2.53 / 3 |
| `ol.bx-layers > li.bx-layer.bx-layer--char > div.bx-layer__plate` | — | 559.0u → кін.кол.4 (-70.17u) | 2.53 / 3 |
| `ol.bx-layers > li.bx-layer.bx-layer--caramel > span.bx-layer__tex` | 591.0u → поч.кол.4 (+77.25u) | 944.0u → кін.кол.6 (+4.00u) | 2.53 / 3 |
| `ol.bx-layers > li.bx-layer.bx-layer--caramel > div.bx-layer__plate` | 591.0u → поч.кол.4 (+77.25u) | 944.0u → кін.кол.6 (+4.00u) | 2.53 / 3 |
| `ol.bx-layers > li.bx-layer.bx-layer--toast > span.bx-layer__tex` | 976.0u → поч.кол.7 (-4.00u) | 1329.0u → кін.кол.9 (-77.25u) | 2.53 / 3 |
| `ol.bx-layers > li.bx-layer.bx-layer--toast > div.bx-layer__plate` | 976.0u → поч.кол.7 (-4.00u) | 1329.0u → кін.кол.9 (-77.25u) | 2.53 / 3 |
| `ol.bx-layers > li.bx-layer.bx-layer--oak > span.bx-layer__tex` | 1361.0u → поч.кол.9 (+70.17u) | — | 2.53 / 3 |
| `ol.bx-layers > li.bx-layer.bx-layer--oak > div.bx-layer__plate` | 1361.0u → поч.кол.9 (+70.17u) | — | 2.53 / 3 |
| `main > section.barrels-how.bx-room > div.barrels-how__grid` | 206.0u → поч.кол.2 (+3.08u) | 1714.0u → кін.кол.11 (-3.08u) | 9.96 / 10 |
| `section.barrels-how.bx-room > div.barrels-how__grid > h2.barrels-how__title.t-h2` | 205.3u → поч.кол.2 (+2.35u) | — | 9.97 / 10 |
| `section.barrels-how.bx-room > div.barrels-how__grid > div.barrels-how__stage` | — | 910.0u → кін.кол.6 (-30.00u) | 4.79 / 5 |
| `section.barrels-how.bx-room > div.barrels-how__grid > div.barrels-how__chapters` | 1010.0u → поч.кол.7 (+30.00u) | — | 4.79 / 5 |
| `rrels-how__chapters > article.bx-chapter.bx-chapter--pour > h3.bx-chapter__title` | 1009.2u → поч.кол.7 (+29.25u) | — | 4.79 / 5 |
| `barrels-how__chapters > article.bx-chapter.bx-chapter--pour > p.bx-chapter__text` | — | 1570.0u → кін.кол.10 (+8.33u) | 3.86 / 4 |
| `rrels-how__chapters > article.bx-chapter.bx-chapter--angels > p.bx-chapter__text` | 1009.3u → поч.кол.7 (+29.28u) | 1569.3u → кін.кол.10 (+7.61u) | 3.86 / 4 |
| `rrels-how__chapters > article.bx-chapter.bx-chapter--bottle > p.bx-chapter__text` | 1009.3u → поч.кол.7 (+29.28u) | 1569.3u → кін.кол.10 (+7.61u) | 3.86 / 4 |
| `main > section.barrels-profit.bx-room > div.barrels-profit__grid` | 206.0u → поч.кол.2 (+3.08u) | 1714.0u → кін.кол.11 (-3.08u) | 9.96 / 10 |
| `arrels-profit.bx-room > div.barrels-profit__grid > h2.barrels-profit__title.t-h2` | 205.2u → поч.кол.2 (+2.29u) | 965.2u → кін.кол.6 (+25.20u) | 5.15 / 5 |
| `-profit.bx-room > div.barrels-profit__grid > article.bx-ledger.bx-ledger--accent` | 591.3u → поч.кол.4 (+77.58u) | 943.3u → кін.кол.6 (+3.33u) | 2.52 / 3 |
| `.barrels-profit__grid > article.bx-ledger.bx-ledger--accent > h3.bx-ledger__size` | — | 740.5u → кін.кол.5 (-44.04u) | 1.22 / 1 |
| `iv.barrels-profit__grid > article.bx-ledger.bx-ledger--accent > p.bx-ledger__num` | — | 776.6u → кін.кол.5 (-7.99u) | 1.45 / 1 |
| `v.barrels-profit__grid > article.bx-ledger.bx-ledger--accent > p.bx-ledger__unit` | 590.7u → поч.кол.4 (+76.98u) | — | 1.01 / 1 |
| `v.barrels-profit__grid > article.bx-ledger.bx-ledger--accent > p.bx-ledger__cost` | — | 817.1u → кін.кол.5 (+32.49u) | 1.71 / 2 |
| `ticle.bx-ledger.bx-ledger--accent > p.bx-ledger__cost > span.bx-ledger__cost-num` | 589.0u → поч.кол.4 (+75.28u) | — | 1.72 / 2 |
| `cle.bx-ledger.bx-ledger--accent > p.bx-ledger__cost > span.bx-ledger__cost-label` | 590.7u → поч.кол.4 (+76.98u) | — | 1.71 / 2 |
| `els-profit.bx-room > div.barrels-profit__grid > article.bx-ledger.bx-ledger--200` | 976.7u → поч.кол.7 (-3.34u) | 1708.0u → кін.кол.11 (-9.10u) | 4.96 / 5 |
| `div.barrels-profit__grid > article.bx-ledger.bx-ledger--200 > h3.bx-ledger__size` | 1547.9u → поч.кол.11 (-53.76u) | — | 1.29 / 1 |
| `div.barrels-profit__grid > article.bx-ledger.bx-ledger--200 > p.bx-ledger__num` | 1456.7u → поч.кол.10 (+10.47u) | 1714.0u → кін.кол.11 (-3.10u) | 1.91 / 2 |
| `div.barrels-profit__grid > article.bx-ledger.bx-ledger--200 > p.bx-ledger__cost` | 1483.0u → поч.кол.10 (+36.73u) | — | 1.71 / 2 |
| `main > section.barrels-next.bx-room > div.barrels-next__grid` | 206.0u → поч.кол.2 (+3.08u) | 1714.0u → кін.кол.11 (-3.08u) | 9.96 / 10 |
| `div.barrels-next__grid > div.barrels-next__head > h2.t-h2` | 205.3u → поч.кол.2 (+2.35u) | — | 9.97 / 10 |
| `div.barrels-next__grid > div.barrels-next__head > p.barrels-next__lead` | 205.4u → поч.кол.2 (+2.49u) | 1025.4u → кін.кол.7 (-70.01u) | 5.53 / 6 |
| `rels-next.bx-room > div.barrels-next__grid > figure.bx-finish.bx-finish--marsala` | — | 553.0u → кін.кол.4 (-76.17u) | 2.49 / 2 |
| `rels-next.bx-room > div.barrels-next__grid > figure.bx-finish.bx-finish--madeira` | 593.0u → поч.кол.5 (-76.17u) | 940.0u → кін.кол.6 (-0.00u) | 2.49 / 2 |
| `barrels-next.bx-room > div.barrels-next__grid > figure.bx-finish.bx-finish--port` | 980.0u → поч.кол.7 (-0.00u) | 1327.0u → кін.кол.8 (+76.17u) | 2.49 / 2 |
| `rrels-next.bx-room > div.barrels-next__grid > figure.bx-finish.bx-finish--sherry` | 1367.0u → поч.кол.9 (+76.17u) | — | 2.49 / 2 |
| `main > section.barrels-price.bx-room > div.barrels-price__grid` | 206.0u → поч.кол.2 (+3.08u) | 1714.0u → кін.кол.11 (-3.08u) | 9.96 / 10 |
| `section.barrels-price.bx-room > div.barrels-price__grid > p.barrels-price__note` | — | 1106.0u → кін.кол.7 (+10.58u) | 6.05 / 6 |

#### cocktails (@1920, сітка «catalog»)

| блок | лівий край vs межа | правий край vs межа | ширина, кол. (факт / очікув.) |
|---|---|---|---|
| `article.cocktail > div.cocktail__media > div.product-thumbs.cocktail__thumbs` | 62.5u → поч.кол.1 (+14.99u) | 188.5u → кін.кол.1 (+25.57u) | 1.07 / 1 |
| `div.cocktail__body > div.cocktail__head > p.cocktail__desc.t-text` | — | 1327.1u → кін.кол.8 (+76.32u) | 4.49 / 4 |
| `div.tabs__panels > div.tabs__panel > dl.product-specs.cocktail__specs` | — | 1327.1u → кін.кол.8 (+76.32u) | 4.49 / 4 |

#### about (@1920, сітка «catalog»)

| блок | лівий край vs межа | правий край vs межа | ширина, кол. (факт / очікув.) |
|---|---|---|---|
| `nstruction-page > section.under-construction > p.under-construction__text.t-text` | 660.0u → поч.кол.5 (-9.17u) | 1260.0u → кін.кол.8 (+9.17u) | 4.12 / 4 |
| `construction-page > section.under-construction > div.under-construction__actions` | 759.8u → поч.кол.6 (-64.80u) | 1160.2u → кін.кол.7 (+64.79u) | 2.83 / 3 |

#### faq (@1920, сітка «catalog»)

| блок | лівий край vs межа | правий край vs межа | ширина, кол. (факт / очікув.) |
|---|---|---|---|
| `nstruction-page > section.under-construction > p.under-construction__text.t-text` | 660.0u → поч.кол.5 (-9.17u) | 1260.0u → кін.кол.8 (+9.17u) | 4.12 / 4 |
| `construction-page > section.under-construction > div.under-construction__actions` | 759.8u → поч.кол.6 (-64.80u) | 1160.2u → кін.кол.7 (+64.79u) | 2.83 / 3 |

#### offer (@1920, сітка «catalog»)

| блок | лівий край vs межа | правий край vs межа | ширина, кол. (факт / очікув.) |
|---|---|---|---|
| `nstruction-page > section.under-construction > p.under-construction__text.t-text` | 660.0u → поч.кол.5 (-9.17u) | 1260.0u → кін.кол.8 (+9.17u) | 4.12 / 4 |
| `construction-page > section.under-construction > div.under-construction__actions` | 759.8u → поч.кол.6 (-64.80u) | 1160.2u → кін.кол.7 (+64.79u) | 2.83 / 3 |

#### 404 (@1920, сітка «catalog»)

| блок | лівий край vs межа | правий край vs межа | ширина, кол. (факт / очікув.) |
|---|---|---|---|
| `nstruction-page > section.under-construction > p.under-construction__text.t-text` | 660.0u → поч.кол.5 (-9.17u) | 1260.0u → кін.кол.8 (+9.17u) | 4.12 / 4 |
| `construction-page > section.under-construction > div.under-construction__actions` | 759.8u → поч.кол.6 (-64.80u) | 1160.2u → кін.кол.7 (+64.79u) | 2.83 / 3 |

#### cart (@1920, сітка «catalog»)

| блок | лівий край vs межа | правий край vs межа | ширина, кол. (факт / очікув.) |
|---|---|---|---|
| `nstruction-page > section.under-construction > p.under-construction__text.t-text` | 660.0u → поч.кол.5 (-9.17u) | 1260.0u → кін.кол.8 (+9.17u) | 4.12 / 4 |
| `construction-page > section.under-construction > div.under-construction__actions` | 759.8u → поч.кол.6 (-64.80u) | 1160.2u → кін.кол.7 (+64.79u) | 2.83 / 3 |

#### age-gate (@1920, сітка «catalog»)

| блок | лівий край vs межа | правий край vs межа | ширина, кол. (факт / очікув.) |
|---|---|---|---|
| `div.age-gate > div.age-card` | 530.0u → поч.кол.4 (+16.25u) | 1390.0u → кін.кол.9 (-16.25u) | 5.79 / 6 |

## (в) Футер детально

Розмітка: `partials/footer.html`, стилі `src/styles/components/footer.css`. Рядок колонок: `.site-footer__cols { display:grid; grid-template-columns: var(--footer-col-menu-w) var(--footer-col-catalog-w) 1fr auto }` = 471u / 442u / решта / авто, з полями `padding: 0 var(--gutter)` (47u) і від'ємними margin/padding «ring-room» (кільце фокуса) на колонках.

Де саме ігнорує колонки (каталог-сітка: поле 47.5u, колонка 115.42u, gap 40u; початок колонок: 1→47.5, 2→202.9, 3→358.3, 4→513.8, 5→669.2, 6→824.6, 7→980, 8→1135.4, 9→1290.8, 10→1446.2, 11→1601.7, 12→1757.1):

1. **«Меню»**: текст із 49u (47 + `--footer-menu-x` 2u) — лівий край на 1.5u правіше початку колонки 1; бокс секції починається на 43u (−4.5u, ring-room). Ширина 471u = 3.34 кол. (має 3 кол. = 3×115.42 + 2×40 = 426.3u або 4 кол. = 581.7u).
2. **«Каталог»**: початок 518u замість 513.8u колонки 4 (+4.25u); права межа 960u замість кінця колонки 6 = 940.0u (+20u); ширина 442u = 3.10 кол. (має 3 кол. = 426.3u).
3. **«Контакти»**: початок 960u (рівно центр сторінки = середина gap між кол. 6 і 7) замість 980u початку кол. 7 (−20u); ширина 838.5u = 5.65 кол. (бажано 3 кол. = 426.3u або 6 = 892.5u).
4. **Четвертий елемент `h2.site-footer__col--end`** — зайвий заголовок «Контакти» (дубль, видимий, 90.5u, x 1786.5–1877) у колонці `auto`; без вмісту. Лівий край 1786.5u не на колонці 12 (1757.1), правий 1877u виходить за поле (1872.5). За сіткою його або видаляють (схоже на дефект розмітки), або дають окрему колонку.
5. **Вордмарки** `yasnocraft` і `bazylsprings` — бокс 1006u (`--container-heading-narrow`) по центру: 457–1463u, 6.73 кол., обидві межі в середині колонок 4 і 9 (відхилення ±56.75u від межі). Видимий текст по центру симетричний, тож візуально це «центрований напис», але рамка не в сітці; за сіткою — 8 колонок 3–10 (358.3 … 1561.7u, 1203.3u) або 6 колонок 4–9 (513.8 … 1406.2u, 892.5u).
6. У нижньому рядку `© 2026` лівий край 47u і «Публічна оферта» правий край 1873u у допуску (0.5px) — окрім розбіжності 47/47.5.

Як має бути за сіткою (12 колонок): «Меню» — колонки 1–3, «Каталог» — 4–6, «Контакти» — 7–9 (або 7–12), решта порожня/додаткова колонка 10–12; права межа блоку = кінець колонки 12 (1872.5u). Реалізація: `grid-template-columns: repeat(var(--grid-cols), minmax(0, 1fr)); column-gap: var(--grid-gap)` + `grid-column: 1 / span 3` тощо; ring-room тримати паддінгом усередині колонки, а не відступом боксу.

Таблиця порушень футера і хедера (однакові на всіх сторінках) — вгорі розділу (б).

## (г) Групи причин і фікс (рівень правок)

| № | Причина | Де | Рекомендація | Рівень |
|---|---|---|---|---|
| 1 | Немає токенів сітки; контейнери й ширини задані числами u з Figma (`--container-heading 1162`, `-narrow 1006`, `-text 712`, `--container-picker-title 562`, intro 1194/658, under-construction 600/400, cocktail-text 653/658) | index (intro, picker), footer wordmark, catalog-nav, cocktails intro/опис, about/faq/offer/404/cart, age-gate (860u) | додати `--grid-cols: 12`, `--grid-margin`, `--grid-gap`, `--grid-col`, функцію `--span-n = calc(n * col + (n-1) * gap)`; замінити числові ширини на `--span-*` з ПАРНОЮ кількістю колонок для центрованих блоків (2/4/6/8/10) | Opus (рішення про поле 47.5u vs 50u, профілі) + Haiku (масова заміна токенів) |
| 2 | Розбіжні бокові поля: 43u (тури, brand-half), 47u (`--gutter`, footer), 47.5u (каталог), 50u (intro/товар/контакти), 206u (barrels) | index, footer, barrels, header-pill | одне поле (рекомендація 47.5u = каталог; для «панельних» сторінок профіль 50u/gap 5u залишити окремим офіційним профілем) | Sonnet |
| 3 | Блоки-«половинки» з внутрішнім padding у px-еквівалентах (brand-half card 43u, контент 482u, лого 402/263u) | index brands | card = колонки 1–6 і 7–12 (47.5…940 / 980…1872.5), контент 482u→ 4 кол. (581.7u) або 3 кол. | Sonnet |
| 4 | Картки/рядки з фіксованою шириною й центруванням: stats 3×250u+gap 30u; slider track 426u по центру (3 кол. не можна по центру); tour-card 1835u (поле 43u) і його колонки 1074/762u | index intro, picker, tours | stats — 3×4 колонки (або 3×2 по центру 8 колонок); slider — 4 кол. по центру; tour-card — 12 кол., колонки 7/5 → 5/7 за сіткою (ширини 7·колонка+6·gap) | Sonnet |
| 5 | Хедер-пілюля 1216.7u по центру (351.7…1568.3u) і внутрішні блоки 395.5u / лого 220.4u | усі сторінки | пілюля = 8 колонок (1203.3u) або 10 (1508.5u); три зони = рівні частини в колонках | Opus (дизайн фіксованої пілюлі) |
| 6 | Barrels: контейнер `--container-wide` 1508u (поле 206u) і gap 100u між великими колонками, власні мікросітки (4 «шари» 2.53 кол., 4 «вина» 2.49 кол., ledger 2.52 кол.) | barrels (41 блок) | перевести кімнати на сітку каталогу: stage/chapters 6+6 колонок (gap 40u), шари/вина 4×3 колонки, ledger 3/3/6 колонок; заголовки — span колонок | Opus (композиція) + Sonnet |
| 7 | Фото/панель товару 905u/910u замість рівних половин (907.5u+907.5u при gap 5u) | product | `grid-template-columns: repeat(2, 1fr)` замість px-значень; (2.5u — незначно, але правило ловить) | Haiku |
| 8 | Каталог: заголовок-навігація 1132u, група фільтрів 645u і сортування 347.5u | catalog | заголовок = 8 колонок (1203.3u) або 6; фільтри = 4 колонки, сортування = 2–3 колонки (селекти по ширині колонки) | Sonnet |
| 9 | Текстова колонка коктейлів 652.9u (4.49 кол.) | cocktails (вступ, опис, специфікації) | `max-width: span 4` (581.7u) або 5 (737.1u) | Haiku |
| 10 | Футер: колонки в px (471/442u) + `1fr auto`, зайвий h2 «Контакти», вордмарки 1006u, ring-room як зсув боксу | footer | див. (в) | Sonnet |
| 11 | Вікові ворота: картка 860u (5.79 кол.) | gate 18+ | 6 колонок (892.5u) | Haiku |
| 12 | `--gutter` 47u vs поле каталогу 47.5u (півпіксель, межа допуску) | footer/header/усі | один токен поля | Haiku |

Орієнтовно: дизайн-рішення про єдину сітку (поле 47.5 vs 50, чи лишати 2-й профіль 5u-gap) — **питання замовнику в формі**; після цього токени — Opus/Sonnet, масова заміна — Haiku/Sonnet, barrels і хедер — Opus.

## (д) Що D12 НЕ бачить (сліпі зони)

- **Текст всередині блоку**: перевіряється рамка блоку (box), не видимий край гліфів. Центрований напис у рамці не на колонках дає порушення, хоч візуально симетричний; лівий край тексту з внутрішнім padding ігнорується.
- **Внутрішність карток/панелей** з власним фоном/рамкою, що не на всю ширину (product-panel, contacts-панелі, feedback-вікно, картки каталогу, barrels-плашки): вони самі перевіряються, їхній вміст — ні (`--grid-deep` вмикає, але шумить).
- **Кнопки, чіпи, селекти, поля, пункти навігації** (розмір за вмістом) — пропускаються; їх положення визначає контейнер.
- **Вертикальна сітка** (рядки, ритм відступів), висоти — не перевіряються.
- **Стани й динаміка**: hover, відкриті акордеони/таби, не активні слайди слайдера (поза екраном), лайтбокс, кошик, інші модалки (лише ворота 18+), mobile/tablet, ширини поза 1185–1920.
- **Декор**: абсолютні позиціоновані фони/орнаменти, `aria-hidden`, елементи <60u×20u, комірки списків (dt/dd/li).
- Блоки, чий край збігається з краєм предка, не дублюються (покриті предком).
- Центр-симетрія на непарних спанах: правило пише ширину в колонках, але рішення «чи достатньо симетрії» лишається за людиною.
- Один еталон-профіль на сторінку: якщо блок свідомо стоїть у «чужій» сітці, це видно лише по полю «збігається з сіткою …»; допустимі свідомі винятки заносяться в `check-ds.allow.json` з рішенням замовника.

## Скрін-оверлей

Скрипт `tools/qa/grid-overlay.mjs` (запуск: `node tools/qa/grid-overlay.mjs --url http://localhost:5200/`) малює поверх сторінки 12 колонок (червоні/сині смуги з номерами 1–12, межі колонок чорними лініями) і контури блоків D12: зелений штрих — на межах колонок, жовтий — 0.5–1px, червоний — >1px. Файли `reports/grid/*.png` (1440px, повна висота):

- `index-1440.png` — картки брендів, лічильники, заголовок intro, тури, picker: червоні рамки майже скрізь; тури й бренд-картки зсунуті від колонки 1 на 4.5u ліворуч, заголовок і абзац intro — відцентровані блоки по 3.5–8 колонок з краями всередині колонок; picker-слайдер — 3 колонки по центру (5–7 за сіткою, не на межах); футер: три колонки не збігаються з колонками, четвертий «Контакти» в куті біля правого краю.
- `catalog-1440.png` — 4 ряди карток лежать точно по 3 колонки (зелені штрихові контури), заголовок-навігація і панель фільтрів — червоні.
- `product-id_gin_yasnyi-1440.png` — фото і панель майже збігаються з половинами (профіль 50u/5u), відхилення по 2.5u у середині.
- `contacts-1440.png` — дві панелі точно на колонках 1–5 і 6–12 (єдина «зелена» сторінка), хедер/футер червоні.
- `barrels-1440.png` — кімнати стоять у вужчому контейнері 206u з великими gap: більшість червоних контурів, плашки шарів/вин не на колонках.
- `cocktails-1440.png` — фото 4 / текст 5 / товар 3 колонки зелені, вступ і текстова колонка 4.49 кол. — червоні.

Оверлей використовує профіль сторінки (catalog 47.5u/40u або product 50u/5u).
