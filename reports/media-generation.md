# Генерація медіа — сторінка «Екскурсії» (16.10.2026)

Дозвіл замовника (через координатора): фотореалістичні кадри — Seedream (Magnific), без впізнаваних облич, без текстів і логотипів; кадри з бренд-пляшкою — наявні фото пляшок каталогу.
**Усе нижче — ЧЕРНЕТКИ (AI) до заміни реальною зйомкою.** На сторінці кожне місце позначене `data-slot` (огляд: `excursions.html?slots=on`).

Модель: **Seedream 5 Pro** (`seedream-5-pro`), 1 тест + серія. Вихід — webp (cwebp q80–82) у `public/assets/img/`.

| Файл | Розмір | Де | Промпт (скорочено) | Кредити |
|---|---|---|---|---|
| `excursions-tex-copper.webp` | 1024² | «Що на вас чекає» — смуга «Екскурсія» | macro hammered copper pot still surface, warm daylight, no text/logos/people (ТЕСТ) | 75 |
| `excursions-tex-glass.webp` | 1024² | смуга «Дегустація» | amber whisky in tulip nosing glass on dark oak barrel, warm low light | 75 |
| `excursions-tex-snacks.webp` | 1024² | смуга «Закуски» | overhead wooden board with walnuts, hazelnuts, crackers, candied dried fruit | 75 |
| `excursions-tex-group.webp` | 1024² | смуга «Група від 6 осіб» | tasting table, row of glasses, hands raising glasses, faces out of frame | 75 |
| `excursions-pumpkin.webp` | 900×1200 | «Дегустація» — плитка «Гарбузівка» (пляшки в каталозі немає) | glass of golden-orange pumpkin spirit + small pumpkin on pure black, no bottle | 75 |
| `excursions-shop.webp` | 1600×1207 | «Магазин при дистилерії» (tour-card) | distillery shop: arched illuminated niches with UNLABELED bottles, wooden gift boxes | 75 |
| `excursions-hero.webp` | 2400×1350 | hero | modern distillery building with copper stills behind glass, green park, golden hour, clear upper sky, no people/text | 100 |

Разом: **7 зображень, 750 кредитів** = 550 за початкові генерації (6×75 + 100 у таблиці) + 200 за перегенерацію `pumpkin` після перевірки (2 спроби × 100, див. «Правки після незалежної перевірки»; у таблиці лишено початкові 75). Баланс 23 569 → 22 819 (спершу 23 019 після початкових, далі −200). Ще один запит (темний зал дегустації з бочками-столами для тла «Ціни») відхилив класифікатор дозволів середовища — не повторювався; тло «Ціни» — наявне фото `brand-yasnocraft-bg.webp`.

## Перевикористано наявні фото сайту
- `home-tour-distillery.webp` (мідний куб, реальне фото головної) — арка «Від зерна до пляшки».
- `brand-yasnocraft-bg.webp` (зелене скло з краплями) — тло «Ціна» (кадр наближено до темного кута, тема).
- Пляшки каталогу `products/whiskey-white.webp` (як ньюмейк), `products/gin-yasnyi.webp`, `products/oak-notes.webp` (як віскі) — плитки дегустації; які саме продукти в дегустації — уточнити.
- `distillery-tour.webp` (реальне фото екскурсії в цеху) — пробувався в hero, але текст по центру лягає на мідний куб (нечитабельно) — замінено AI-кадром з чистим небом.

## Потрібна реальна зйомка (замінить чернетки)
1. Будівля дистилерії ззовні (hero; вільне небо у верхній третині під заголовок).
2. Мідь куба / зерно / келих / стіл дегустації — 4 квадрати ≥ 1024 px для «розрізу».
3. Келих гарбузівки (або пляшка, якщо буде в каталозі) на чорному, портрет 3:4.
4. Дегустаційні сети 4 і 8 келихів із закусками; зал дегустації з бочками-столами (тло «Ціни», темна ділянка під текст).
5. Вітрина магазину при дистилерії (≈ 6:5).

## Правки після незалежної перевірки (16.10.2026)
- `excursions-tex-group.webp`: на краю кадру було видно частину обличчя — файл обрізано (кадр 40…1004 px по x, 0…964 по y, збільшено до 1024²); облич у кадрі немає. Без нових кредитів.
- `excursions-pumpkin.webp`: гарбуз був обрізаний по правому краю самого файла. Перегенеровано Seedream 5 Pro (3:4, без людей/тексту/пляшки; 2 спроби × 100 кредитів — перша знову торкалась краю), кадр обрізано до 900×1200 так, щоб келих і гарбуз повністю в кадрі з чорним полем. Знову ЧЕРНЕТКА (AI).

## Фон «Ціна» екскурсій — фото виробництва (16.10.2026, коментар замовника 925d4459)
Наявні фото виробництва не годяться під світлий текст без затемнення: `distillery-tour.webp` (люди, яскравий цех), `home-tour-distillery.webp` (1514×1256, світлий куб на тлі вікон), `excursions-tex-copper.webp` (1024², замало й яскраво), `excursions-hero.webp` (будівля, світле небо). Згенеровано нове.
| Файл | Розмір | Промпт (скорочено) | Кредити |
|---|---|---|---|
| `excursions-price-bg.webp` (q80, 143 КБ) | 2560×1440 | wide interior of a modern craft whisky distillery, copper pot stills and column stills on the right, deep dark brown shadows, calm dark empty area left/center/top; no people, no text, no logos (Seedream 5 Pro, 16:9, 2 варіанти, обрано 1-й) | 200 (2 × 100) |
Кадр (`pages/excursions.css`): `--lp-offers-bg-pos: 0% 50%`, масштаб 1. Піксельний D14 по літерах без затемнення: 0 порушень на 1200/1440/1728/1920 × classic/none (на варіанті кадру «100% 50%» 2–6 літер ліда падали — тому зсув вліво). ЧЕРНЕТКА (AI) до заміни реальною зйомкою; `data-slot` у `bgSlot`.

### Фон «Ціна» екскурсій — перегенерація (16.10.2026, правка за verify-E1 дефект 3)
Попередній кадр (середня яскравість ≈20/255, куби лише вузькою смугою праворуч) не читався як «фото виробництва». Нова генерація (1 спроба, запасна не знадобилась):
| Файл | Розмір | Промпт (скорочено) | Кредити |
|---|---|---|---|
| `excursions-price-bg.webp` (q80, 368 КБ; перезаписано) | 2560×1440 | wide interior of a modern craft whisky distillery, symmetrical: tall polished copper pot/column stills brightly visible on far left and far right rising to top of frame, warm golden light, calm evenly lit warm dark-brown empty centre; no people/text/logos/bottles (Seedream 5 Pro, 16:9, 1 варіант) | 100 |
Кадр (`pages/excursions.css`): `--lp-offers-bg-pos: 50% 50%` (було `0% 50%`): куби по боках видно над і між панелями пропозицій, центр (під заголовком і лідом) — спокійна темно-коричнева стіна. Без overlay/filter/градієнта. ЧЕРНЕТКА (AI) до заміни реальною зйомкою; людей/текстів/логотипів на кадрі нема. Попередній файл збережено лише у scratchpad (не в репо).

## «Від зерна до пляшки» — стікі-картки (steps deck), 16.10.2026
Запит замовника: «давай зробимо цей фон як стікі карточки… на фоні карточки картинка» (реф `reports/client-refs/sticky-cards-ref.png`). Кожен крок — картка з фото на всю площу, текст поверх фото зліва БЕЗ затемнення, тож кадри генерувались з **темною спокійною зоною в лівих ~45%**. Модель **Seedream 5 Pro** (`seedream-5-pro`), 21:9, вихід 3024×1296 → webp q80, 2560×1097 (`cwebp -resize 2560 0`). Усі — **ЧЕРНЕТКИ (AI)** до заміни реальною зйомкою; на сторінці `data-slot` у кожній картці (`excursions.html?slots=on`). Людей, облич, рук, текстів, логотипів, етикеток у кадрах немає (перевірено переглядом).

| Файл | Крок | Промпт (скорочено) | Кредити |
|---|---|---|---|
| `excursions-deck-modern.webp` (131 КБ) | 1 «Сучасне виробництво» | ultra-wide modern craft whisky distillery: hammered copper pot stills + copper column stills with steel pipes in RIGHT half, warm golden light; LEFT 45% calm evenly dark shadowed wall, no details; no people/text/logos/labels | 100 |
| `excursions-deck-story.webp` (73 КБ) | 2 «Наша історія та філософія» | old whisky barrel cellar: rows of dark oak barrels on racks, vintage cooper's workbench with tools and brass funnel, single hanging lamp, RIGHT half; LEFT half falls off naturally into near-black shadow of the same cellar, no hard vertical edge; no people/text (2-га спроба; 1-ша мала зубчастий край «стіни» посередині кадру — відхилено) | 200 (2 × 100) |
| `excursions-deck-path.webp` (125 КБ) | 3 «Шлях від зерна до пляшки» | still life on dark wooden table: heap of barley grain with wheat ears → small copper vessel with clear distillate → plain unlabeled bottle of amber whisky, warm side light, RIGHT half; LEFT 45% calm dark background; no text/labels | 100 |
| `excursions-deck-place.webp` (92 КБ) | 4 «Ваше місце в історії» | cozy tasting room: long dark oak table with row of tulip nosing glasses with amber whisky, small water carafe, warm lamp light, barrels behind, RIGHT half; LEFT 45% calm dark wall; no people/hands/faces/text | 100 |

Разом **5 генерацій, 500 кредитів** (баланс до: 22 519). Наявні фото сайту (`distillery-tour`, `home-tour-distillery`, `excursions-tex-copper`, `excursions-hero*`) не підходять для картки 21:9 з текстом зліва без затемнення: портретні/квадратні або яскраві по всій площі (люди в `distillery-tour`). Попереднє фото арки `home-tour-distillery.webp` лишається на головній; на excursions більше не вживається.
Кадр: `imgPos`/`zoom` у даних не задані (центр, 1×): картка ≈ 2.2–2.6 : 1 обрізає кадр 21:9 лише трохи зверху/знизу; темна зона лишається зліва на всіх ширинах.

## Плитка «Гарбузівка» — окремий келих на жовтому тлі (16.10.2026, коментар замовника 4e835c33)
Запит: «зробити окрему фотку, лише бокал з жовтим вмістом, на фоні жовтого кольору». Замінює `excursions-pumpkin.webp` (келих + гарбуз на чорному; файл лишено на диску, не використовується).
| Файл | Розмір | Промпт (скорочено) | Кредити |
|---|---|---|---|
| `excursions-glass-yellow.webp` (q80, 25 КБ) | 1600×1600 (з 2048², 1:1) | studio product photo: single glencairn tasting glass with golden-yellow pumpkin spirit, centered, on seamless flat solid pastel yellow background; no pumpkin/people/text/logos/bottle (Seedream 5 Pro, 1:1, 1 спроба, запасна не знадобилась) | 100 |
Жовтого токена в палітрі DS немає, тож жовтий — лише в самому фото; тло кола плитки — нейтральний токен теми `tone: brown` (під квадратним фото на весь круг не видно). ЧЕРНЕТКА (AI) до погодження замовника/заміни реальною зйомкою; у плитці data-slot.

### Перегенерація келиха на ТЕМНОМУ тлі (16.10.2026, коментар замовника cf8fdedf)
Запит: «фон світліше чи темніше, проконтролювати щоб не губився бокал; ракурс як фото пляшок поруч; як поставлені пляшки, не на всю висоту». Замінює `excursions-glass-yellow.webp` (жовтий келих на жовтому: контур губився; файл видалено з репо разом із осиротілими `excursions-pumpkin.webp`, `excursions-hero.webp`).
| Файл | Розмір | Промпт (скорочено) | Кредити |
|---|---|---|---|
| `excursions-glass-dark.webp` (q82, 38 КБ ≤150) | 1600×1600 (з 2048², 1:1, без кропа) | studio product photo: single glencairn tulip glass with golden yellow-amber spirit, frontal eye-level, level horizon, soft light from above, glass centered like a bottle on a shelf, ≈65–70% of frame height with air above and below, seamless flat deep dark brown backdrop, rim/edges clearly lit; no pumpkin/people/text/logos/bottle (Seedream 5 Pro, 1:1, 1 спроба, запасна не знадобилась) | 100 |
Вибір тла: ТЕМНІШЕ за напій (глибокий коричневий ≈ rgb 26,13,10, як коричневі кола пляшок і кімната сторінки) — контур прозорого скла на темному світиться, на жовтому тлі він зникав. Виміри: келих 190–730 з 800 px = 67% висоти (по центру, повітря згори й знизу); контраст краю келиха проти тла (макс. яскравість краю по рядках кожні 10px): медіана 15.6 (ліво) / 16.9 (право), 99.2% рядків мають обидва краї ≥2:1, мін. 1.4 (один рядок, правий край); край вінця 19:1. У плитці: `imgPos: center`, `zoom: 1`, `tone: brown`. ЧЕРНЕТКА (AI) до погодження/заміни реальною зйомкою. Кредити за правку: 100 (баланс до генерації 44 200).

# Сторінка «Про дім» (about.html), 16.10.2026

Запит замовника: «по генераціям природнього формату — сідрім [Seedream]»; на hero — аеро-фото будівлі дистилерії. Модель **Seedream 5 Pro** (`seedream-5-pro`), вихід → webp (cwebp q78–84) у `public/assets/img/`. Людей, облич, рук, текстів, логотипів, етикеток у кадрах немає (перевірено переглядом). Фото засновника/директора **не генерувались** (реальні люди): у картці «Засновник і виробництво» — реальне фото куба + `data-slot` «ПОТРІБНЕ ФОТО». Усі AI-кадри — **ЧЕРНЕТКИ** до заміни реальною зйомкою; кожне місце на сторінці має `data-slot` (`about.html?slots=on`).

### Реальні фото замовника (без генерації)
| Файл | Джерело | Де |
|---|---|---|
| `about-hero-distillery.webp` (2000×1116, q84, 354 КБ) | `reports/client-photos/distillery-building-aerial.jpg` (2000 px — максимум наданого; ≥ 2400 px бракує) | hero, під зеленим градієнтом `fade: green` |
| `about-layer-still.webp` (1200²) | `photo/Фото Яснокрафт/Куби/Sequence 01…Still003.png` | «Чотири речі» — «Власна дистилерія» |
| `about-layer-bottling.webp` (1080²) | `Обладнання/IMG_2233.JPG` | «Повний цикл» |
| `about-layer-barrels.webp` (1080²) | `Обладнання/IMG_2217.JPG` (повернуто за EXIF) | «Два бренди» |
| `about-layer-gallery.webp` (1200²) | `Куби/605A1261.jpg` | «Відкриті двері» |
| `about-arch-stills.webp` (1600×2400) | `Куби/605A1258.jpg` | арка «Виробництво» |
| `about-card-still.webp` (1600×1333) | `Куби/605A1000.jpg` | картка «Засновник і виробництво» (тимчасово, замість портрета) |
| `about-tile-sightglass.webp` (1080²) | `Обладнання/IMG_2223.JPG` | коло «Контролювати шлях» |
| `about-tile-barrel.webp` (1080²) | `Обладнання/IMG_2222.JPG` | коло «Поважати час» (тон teal — принцип Bazylsprings) |
Перевикористано: `excursions-tex-glass.webp` (AI, сторінка екскурсій) — коло «Говорити чесно».

### Згенеровано
| Файл | Розмір | Де | Промпт (скорочено) | Кредити |
|---|---|---|---|---|
| `about-arch-build.webp` (q78, 211 КБ) | 1200×1800 (з 1664×2496, 2:3) | арка «15 місяців» | vertical: construction of a modern distillery building in Ukrainian countryside at early morning, raw concrete walls and columns from fresh foundation, formwork, rebar, scaffolding, tower crane, misty sky, green field; no people/text/logos/signs/flags | 100 |
| `about-catalog-bg.webp` (q80, 365 КБ) | 2560×1440 (16:9) | тло «Каталог» (offers) | dark tasting bar: far left/right dark oak shelves with plain UNLABELED clear gin and amber whisky bottles, warm light; centre and top — calm evenly dark warm-brown wall; no people/text/logos/labels | 100 |
| `about-tile-barley.webp` (q82) | 1080² (з 2048², 1:1) | коло «Не поспішати» | macro: heap of golden malted barley grains on dark oak board, a few barley ears, warm side light; no people/text | 100 |
| (не використано) `about-deck-build/parts/launch/bottling` | 3024×1296 (21:9) | колода «15 місяців» (варіант `deck: true`) | фундамент на світанку / цех у будівництві з деталями / нові мідні куби / лінія розливу — права половина, ліва 45% темна спокійна зона; no people/text/logos | 400 (4 × 100) |
Колоду відхилено вже після генерації: номер картки колоди тепер у колі (рішення замовника 938ee99f, вміщує 1–3 знаки), а значення історії — `2025`, `95%`, `2026`, `400 л` («202/5» рвалось). Історію зроблено кроками з аркою (як у копірайті); 4 кадри колоди в репозиторій не додано (лежать у scratchpad сесії; за потреби — у бібліотеці Magnific).

Разом: **7 генерацій, 700 кредитів** (1 спроба на кадр, запасні не знадобились; бюджет ≤ 900). Баланс до: 45 000.

### Потрібна реальна зйомка (замінить чернетки й тимчасові кадри)
1. Фасад дистилерії з землі ≥ 2400 px (hero; нинішнє аеро-фото — 2000 px).
2. Будівництво (травень 2025 — серпень 2026) і відкриття 8 серпня 2026 — арка «15 місяців».
3. Віктор Базильчук і Герман Марущак (або команда біля установки), ≈ 6:5, зі згодою на публікацію — картка «Засновник і виробництво».
4. Окремі кадри бражної, спиртової та вакуумної (з джин-кошиком) установок — арка «Виробництво».
5. Макро зерна, скла, сталі на дистилерії — кола «Принципи».
6. Пляшки обох брендів на дереві з темною зоною під текст — тло «Каталог».

## «Про дім» — повна переробка (16.10.2026, рукописна сторінка замість шаблону lp)

Принцип: спершу реальні фото замовника; ілюстрації (кристали, вісь «15 місяців», силуети установок) — ВЕКТОР (inline SVG, `partials/about/*.html`, кольори класами `.f-*` = токени). **Нових AI-генерацій: 0 кредитів** (бюджет ≤ 800 не витрачено): сторінка вистачило реальних кадрів. Людей і облич не генерували.

| Файл | Джерело | Де | Вага |
|---|---|---|---|
| `about-hero-distillery.webp` (2000×1116) | без змін (реальне аеро-фото замовника) | hero під `hero--fade-green` | 354 КБ |
| `about-viktor.webp` (400×400, q90) | `reports/client-photos/viktor-bazylchuk.png` (400×400 — усе, що надано); НЕ апскейлено, НЕ ретушовано; на сторінці ≤ 366 css px (панель 3 колонки − поля) | «Засновник і виробництво» | 26 КБ |
| `about-opening.webp` (960×1200, 4:5, q78) | `photo/Фото Яснокрафт/Відкриття_посту про відкриття/18.jpg` (кроп 3200×4000) — реальне фото відкриття 8.08.2026, обличчя гостей дрібні | «15 місяців», кінець шляху | 113 КБ |
| `about-stills-tall.webp` (960×1200, 4:5, q78) | `Куби/605A1258.jpg` | пара фото цеху | 93 КБ |
| `about-stills-wide.webp` (1672×941, q80) | `Куби/1.png` | пара фото цеху | 156 КБ |
| `about-arch-build.webp` | наявна AI-чернетка Seedream 5 Pro (див. вище), `data-slot` | «15 місяців», початок шляху (будівництво) | 211 КБ |
| пляшки `products/*.webp` | наявні кадри каталогу | «Один дім, два характери» | 19–41 КБ |

Видалено з репозиторію (більше ніде не вживаються після переробки): `about-arch-stills`, `about-card-still`, `about-catalog-bg`, `about-layer-barrels|bottling|gallery|still`, `about-tile-barley|barrel|sightglass` (.webp) — у історії git лишаються.
Чернетка до заміни: `about-arch-build.webp` (кадр будівництва) — потрібне реальне фото травня 2025 — серпня 2026.
