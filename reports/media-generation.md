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
| `excursions-pumpkin.webp` | 900×1192 | «Дегустація» — плитка «Гарбузівка» (пляшки в каталозі немає) | glass of golden-orange pumpkin spirit + small pumpkin on pure black, no bottle | 75 |
| `excursions-shop.webp` | 1600×1207 | «Магазин при дистилерії» (tour-card) | distillery shop: arched illuminated niches with UNLABELED bottles, wooden gift boxes | 75 |
| `excursions-hero.webp` | 2400×1350 | hero | modern distillery building with copper stills behind glass, green park, golden hour, clear upper sky, no people/text | 100 |

Разом: **7 зображень, 550 кредитів** (баланс 23 569 → 23 019). Ще один запит (темний зал дегустації з бочками-столами для тла «Ціни») відхилив класифікатор дозволів середовища — не повторювався; тло «Ціни» — наявне фото `brand-yasnocraft-bg.webp`.

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
