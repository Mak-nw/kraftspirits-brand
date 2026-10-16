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
