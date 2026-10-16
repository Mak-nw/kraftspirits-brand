# Симуляція верстальника: шаблон посадкової сторінки (lp)

Роль: зовнішній верстальник/WP-розробник, якому віддали шаблон і просять «підключити адмінку». Мета замовника (дослівно): «фронт та адмінка мають бути максимально співзамінні. Різниця має бути між медіа чи кольорами».
Перевірка: нова сторінка «Дегустації в дистилерії» (`tastings`), обмін тем `excursions` ⇄ `barrels`, стрес-дані, звірка схема ↔ поля, пошук прошитого під сторінку.

## 0. Середовище й метод

| | |
|---|---|
| Знімок коду | `git archive HEAD` (на момент запуску HEAD = `983936c`, «Екскурсії: excursions.html на шаблоні lp») → `/private/tmp/claude-501/-Users-admin-Documents-kraftspirits/2873102f-df87-4777-902b-ec722c943624/scratchpad/dev-sim/` (`node_modules` — символічне посилання на проєктні). У `site_brand` код не змінювався; єдина зміна — цей звіт. |
| Читав як зовнішній розробник | `docs/page-template.md`, `docs/page-template.schema.json`, `src/data/lp-schema.js`, `design-system.html#page-template`, приклади `barrels.js`/`excursions.js` і обидві теми. Код `lp.css`/partials відкривав лише для діагностики причин дефектів (як зробив би розробник) і для сценарію 5. |
| Dev-сервер симуляції | `vite --configLoader native --port 5346 --strictPort` (порти 5180/5190/5200 не чіпано), зупинено за PID (`lsof -ti tcp:5346` → `kill`). `cacheDir` у копії змінено на `.vite-sim`. |
| Інструменти | штатні `tools/qa/check-ds.mjs` (D3, D7, D8, D12, D13, S9) + власні скрипти в `dev-sim/sim/` (`metrics`, `limits`, `special`, `jsv`, `recon`, `cap`, `contrast`, `card`, `media`) і генератори даних `scratchpad/gen*.mjs`. Ширини: 1200/1440/1728/1920, смуга `none`, `?age=ok&reveal=off&parallax=off`. |
| Виконання | Усі прогони — headless Chrome (puppeteer-core). Прогони check-ds: `node tools/qa/check-ds.mjs --url http://localhost:5346/ --pages <…> --widths 1200,1440,1728,1920 --scrollbar none --dynamic-only --rules D8,D13,D12,D3,D7`. |
| Побічний ефект | Перший запуск dev із симлінком `node_modules` на мить зачепив кеш `node_modules/.vite` справжнього проєкту (Vite написав «Re-optimizing dependencies»); після цього `cacheDir` винесено. Шкоди немає, лише можливе повторне оптимізування залежностей у живих dev-серверів. |

Зауваження до формулювання завдання: тема живе в `src/styles/themes/<theme>.css` (у docs так і написано), а не в `themes/` у корені; саме туди я клав `tastings.css`.

## 1. Висновок у п'яти рядках

1. Схема й валідатор справді дають «ДАНІ + МЕДІА + ТЕМА»: нова сторінка зібралася з першої спроби, `D8 = 0`, `D13 = 0`; обмін тем `excursions ⇄ barrels` цілісний, `D8 = 0`.
2. Але шаблон **не витримує власних лімітів**: з трьох пропозицій у `offers` будь-яка реальна ціна («900 грн») дає горизонтальний скрол (+48…+78 px), а `card` з `text + list` на максимумі виштовхує кнопку за панель (фіксована висота 629u). Ліміт `price ≤ 14` недосяжний — реальна ємність 6 / 10 / 21 знак.
3. Схема обіцяє поля, які **мовчки не показуються** (9 пар «тип секції — поле»), а JSON Schema слабша за `validatePage` (7 перехресних правил і правило порожніх рядків розходяться).
4. Прошите під «бочки»: гравюри `barrels-scene`/`barrels-head`, маска стіни пляшок (96/383, spans 3/9), токени `--*-barrels-*` в загальному CSS, оптика й кадрування в темі прив'язані до `#id` і `key`.
5. Реєстрація нової сторінки потребує ручних правок коду (`vite.config.js`, `main.css`, меню), а QA-винятки прив'язані до імені сторінки.

## 2. Таблиця сценаріїв

| № | Що робили | Результат | Доказ | Статус |
|---|---|---|---|---|
| 1 | З нуля `tastings.html`: `src/data/tastings.js` (9 типів секцій, 3 пропозиції), `themes/tastings.css` (11 рядків `--lp-*`), медіа з `public/assets/img` | Збірка пройшла з першої спроби; розмітки/CSS не писав. Після збірки знайдено: hscroll від цін (D1), D12 +2 проти excursions | `npx vite build` → ok; `check-ds D8,D13` = 0; `D3`: `tastings@1200…1920` scrollWidth 1248/1498/1797/1998 | ok з дефектом D1 |
| 2 | Тема excursions → колірна схема barrels і навпаки (тільки теми): 8 варіантів (див. §3.2) | Сторінки цілісні, D8 = D13 = D3 = 0 на 4 ширинах; мін. контраст нефотографічного тексту 5.82 / 6.27 | `check-ds` по `x-*`, `y-*`; `sim/contrast.mjs`; знімки `scratchpad/shots-swap/cmp-*.png` | ok (дефекти D11, D12) |
| 3a | Порожні необов'язкові поля (видалені й `''`) | Блоки не показуються, верстка ціла (крім D1). Порожній `kicker` у `card` лишає порожній `<p>` (висота 0) | `v-empty`, `v-emptystr`: `sim/metrics.mjs` issues = 3 (лише ціни); `sim/q.mjs` | ok (косметика D18) |
| 3b | Усі 83 текстові поля = рівно `max` (реалістичні слова) | Валідатор пропускає; верстка ціла, **окрім ціни**; D8/D13 = 0 | `v-max`; `sim/limits.mjs`: 83/83 PASS; metrics issues = 3 (price), hscroll +546…+873 | дефект D1 |
| 3c | `max + 1` для кожного текстового поля, `min − 1`/`max + 1` для списків | Збірка падає з поясненням: `lp: tastings.sections[0](hero).title: довжина 61 > 60 знаків`, `…items: елементів 7, допустимо 2–6` | `node sim/limits.mjs` → 219 перевірок: 83/83 `max+1` FAIL, 83/83 `max` PASS; 53 перевірки списків; реальний `vite build` теж падає (рядок помилки зрозумілий, але з «failed to load config» і стеком) | ok (косметика D14) |
| 3d | 0 і максимум елементів у списках | 2…6 layers, 2…5 steps, 2…3 groups, `list` 0/8, facts 0/3, offers 1/3, facts 0/4, includes 0/5, place facts 1/5, faq 1/12 — верстка ціла | `v-minitems`: issues = 0, `v-maxitems`: issues = 3 (price) | ok |
| 3e | Відсутнє медіа (файли не існують) | Валідатор і збірка мовчать; у dev файл «є» (HTTP 200, HTML-fallback), `naturalWidth = 0` у 11 з 15 `<img>`; видно «зламану картинку», hero-тло темне; `qa` S9 ловить | `sim/media.mjs v-nomedia`: broken 11/15; `check-ds --rules S9`: «файл із даних відсутній у public/» | дефект D12 |
| 3f | Дуже довге слово (42 знаки, у межах ліміту) | Ламає h1, усі H2, заголовок картки, місце, FAQ, `dd` у пропозиціях: hscroll +265…+400, перекриття `dd`↔`dt` | `v-longword`: issues 18 на кожній ширині; ємність по ролях — таблиця §3.3 | дефект D3 |
| 3g | Ціна з багатьма знаками | `€ 1 234 567,89`, `12345678901234`, `99 999,99 грн` — усі валідні, усі ламають; hscroll +239…+344 | `v-price`; `sim/cap.mjs` | дефект D1 |
| 3h | Спеціальні дані: hero не першим / без hero / два hero, неіснуючі `scene`, `icon`, `engraving`, `theme`; однакові `key`; `{{…}}`, `%BASE_URL%` у тексті | Усе, крім `scene`, проходить без помилок; `scene: 'nope'` → ENOENT на рендері; без hero — 0 `<h1>` | `sim/special.mjs` (39 випадків), сторінки `v-s-*`, D7 | дефекти D6, D9, D13 |
| 3i | `card`: `text` 320 + `list` 4×90 і варіанти | Кнопка поза панеллю: `btnTop 793` при висоті 629 (1920), на 1200 — 496 при 393 | `sim/card.mjs`, таблиця §3.4 | дефект D2 |
| 4 | Схема ↔ docs ↔ дані ↔ partials ↔ JSON Schema | Усі поля docs є в схемі й навпаки; JSON Schema ≡ згенероване з `lp-schema.js`, але **слабша**; 9 полів не рендеряться | `node tools/lp-schema-json.mjs` + `diff` = IDENTICAL; `sim/jsv.mjs`; `sim/recon.mjs`; маркерний прогін `gen3.mjs` (130 полів, 9 відсутні в HTML) | дефекти D4, D5 |
| 5 | Прошите під сторінку (grep по partials/lp, lp.css, lp-media.css, lp.js, tokens, themes) | Знайдено: гравюри, стіна 96/383, `--*-barrels-*` у загальному CSS, оптика по `#id`/`key`, лічильники, 3 кроки в `data-step` | §3.5 | дефекти D10, D11 |

## 3. Деталі сценаріїв

### 3.1 Сценарій 1 — сторінка «Дегустації» лише даними

Що створено (копія репозиторію, не `site_brand`): `src/data/tastings.js` (hero, layers×3, steps×3 з фото в арці, compare×2 зі списками, tiles×4 з фото каталогу, offers×3, card зі списком, place, faq), `src/styles/themes/tastings.css` (теми: warm = green, deep = brown, paper = light, hero-ink = light, tile-bg — типовий), `tastings.html` (один рядок `<!--@page tastings-->`), рядок у `LP` у `vite.config.js` і `@import` у `main.css`. Нової розмітки/CSS немає. Медіа лише з `public/assets/img` (`hero-home.webp` 2560 px, `slider/*-lg.webp`, `distillery-tour.webp`, `gifts-bg.webp`, `products/*.webp`, `excursions-shop.webp`).

**Скільки зійшло з коробки**
- 9 з 9 типів секцій прийняли дані з першого разу; `npm run build` — без помилок з першої спроби.
- Тема — 11 токенів `--lp-*`, значення лише з палітри DS; D8 = 0, D13 = 0, D3 за межами цін = 0. Темний/світлий ink hero підбирається роллю `--lp-hero-ink`: на темному кадрі (hero-home) взяв `--color-light` — D8 пікселями пройшов (docs показують лише темні ink, випадок «світлий» довелося вивести самому).
- Не з коробки: (а) ціна на три панелі — hscroll (D1); (б) QA: D12 `tastings` 23 порушення проти 21 в excursions — через винятки, прив'язані до імені сторінки (D8 нижче); (в) реєстрація сторінки — 3 ручні правки коду.

**Що довелося вигадувати поза документацією** (кожне — запит до дефектів):
1. Які `icon` існують (docs відсилають до DS «Брендові іконки»; 9 із 22 іконок мають назви `barrels-*`, прив'язані до однієї сторінки); я обійшовся без іконок у layers.
2. Скільки знаків ціни влізе (docs: «≤ 14»; реально 6 при трьох пропозиціях).
3. Що можна класти в `card` (text + list одночасно — формально можна, фактично ні).
4. Який `tone` до якої теми (docs: «тон основних кнопок»; не сказано, що він ще й ставить варіант кнопок у hero/offers/card, і що `foot.ctas`/`place.ctas` мають свої `variant`).
5. Що `kicker`/`caption`/`lead` не в кожному типі показуються (див. D4).
6. Що `card.img` мусить починатися з `/assets/img/` (docs: «шлях»).
7. Що `hero.cta.href: '#price'` вимагає секції `offers` з `id = price` (зв'язок між секціями не описано).
8. Що `compare` без `wall` потребує `list` або порожній блок (не помилка, але порожнеча).
9. Які значення `scene`/`engraving` існують (лише `barrels-scene`, `barrels-head`; обидва «бочкові»).
10. Що hero повинен бути першим і єдиним (схема не вимагає; без нього немає `<h1>`).

### 3.2 Сценарій 2 — обмін тем

Варіанти (дані сторінки не чіпав, лише `theme`/`tone`):

| Сторінка | Тема | Тон | D8 | D13 | D3 | Мін. контраст тексту поза фото |
|---|---|---|---|---|---|---|
| excursions (еталон) | excursions | green | 0 | 0 | 0 | 6.27 |
| `y-exc-theme-barrels`: дані excursions | `barrels` повністю (разом з оптикою/кадруванням) | green | 0 | 0 | 0 | 5.82 |
| `x-exc-in-barrels`: дані excursions | лише ролі кольорів barrels + власне кадрування `#price` | green | 0 | 0 | 0 | 5.82 |
| `x-exc-in-barrels-tone` | ролі barrels | teal | 0 | 0 | 0 | 5.82 |
| barrels (еталон) | barrels | teal | 0 | 0 | 0 | 5.82 |
| `y-bar-theme-excursions`: дані barrels | `excursions` повністю | teal | 0 | 0 | 0 | 6.27 |
| `x-bar-in-exc` | ролі excursions | teal | 0 | 0 | 0 | 6.27 |
| `x-bar-in-exc-tone` | ролі excursions | green | 0 | 0 | 0 | 6.27 |
| tastings у темах barrels / excursions | `y-tast-theme-*` | gold | 0 | 0 | лише власний hscroll цін | 5.82 / 6.27 |

Доказ: `check-ds … --rules D8,D13,D3` (файли `out-swap/`, `out-y/`) і `sim/contrast.mjs` (власний прохід: колір тексту проти фактичного фону предків; текст на фото міряє D8 пікселями). Знімки: `scratchpad/shots-swap/cmp-exc.png`, `cmp-bar.png` (чотири колонки: еталон / ролі-обмін / повна тема / інший тон).

Висновок: сторінки лишаються цілісними, контраст D8 = 0. Але «замінити лише тему» не нульова операція:
- у темі `barrels` 9 правил оптики/кадрування прив'язані до `#benefits`, `#price`, `.lp-step--pour` тощо — на чужій сторінці вони або не спрацьовують (немає id), або застосовують чужий кадр (`#price` з барельним кроп-зумом 2× на фото YasnoCraft; D8 пройшов, але кадр підібраний під інше фото);
- `tone` лежить у даних, колір — у темі: обмін схеми = дві правки, невідповідність нічим не перевіряється (D11);
- `--lp-tile-bg` в одній темі `black`, в іншій типовий amber: на прозорих пляшках вигляд різний (рішення теми, не помилка).

### 3.3 Сценарій 3 — стрес-дані

**Ліміти схеми** (`sim/limits.mjs`, 219 перевірок): усі 83 текстові поля — `max` проходить, `max + 1` падає; 53 перевірки довжин списків — `min − 1`/`max + 1` падають, `min`/`max` проходять (єдині «відхилення» — артефакти фікстури: сума span, `text|list`, дубль id у клонованих секціях). Повідомлення містять шлях, індекс, id, обмеження: `lp: tastings.sections[1](why).title: довжина 76 > 60 знаків`. Довжина рахується в кодових точках (nbsp = 1; `👨‍👩‍👧‍👦` = 7).

**Верстка на межі** (`sim/metrics.mjs`, 4 ширини): при всіх 83 текстових полях на максимумі зі словами природної довжини ламається тільки ціна. Усе інше (3-рядкові заголовки, 12 FAQ, 6 плиток, 5 кроків, 3 групи по 8 пунктів) — без переповнення/перекриття, D13 = D8 = 0.

**Ємність по ролях** (найдовше слово без пробілів у великих літерах, `sim/cap.mjs`; значення однакові на 1200 і 1920, бо розміри в `u`):

| Роль | Макс. слово, знаків | Ліміт схеми | Висновок |
|---|---|---|---|
| hero h1 | 28 | 60 | довге слово ламає |
| hero lead | 35 | 160 | — |
| H2 секцій | 35 | 60 | вилізає на 4–6 px за в'юпорт (hscroll) |
| layer title / text | 37 / 53 | 25 / 90 | ок для title (25 < 37) |
| step title / text | 60 / 53 | 25 / 160 | — |
| group label / unit | 47 / 67 | 25 / 40 | — |
| offer title (3 панелі) | 30 | 25 | ок |
| **offer price** | **6 (3 панелі) / 10 (2) / 21 (1)** | **14** | **не вміщується** |
| offer fact `dd` | 16–18 | 60 | довге слово без пробілів — перекриття `dd`↔`dt` |
| **card title (shop)** | **14** | 60 | типове слово «Дегустаційний» (13) на межі |
| **place H2** | **12** | 60 | «Ясногородка» (11) на межі |
| **faq title** | **10** | 60 | «Запитання» (9) на межі, «Інформація» (10) |

`v-maxword` (один рядок з 60 літер «Ш») — повний крах: hscroll +3480…+5568 (екстремум, не реальний ризик). `v-longword` (одне слово 42 знаки): hscroll +265…+400, 18 порушень на кожній ширині.

**Ціна** (3 панелі: `900 грн`, `1600 грн`, `4500 грн`): `.lp-offer__price` має `white-space: nowrap`, роль `.t-stat` — 122 px при 1440. Вимірювання `scrollWidth`/`clientWidth` ціни: 430/355, 489/355 (1440); 358/295, 407/295 (1200); 516/426, 587/426 (1728); 574/472, 652/472 (1920). Горизонтальний скрол сторінки: 1248/1498/1797/1998 при вікні 1200/1440/1728/1920 (D3). При двох панелях `1500 грн` влізає (588 з 589), `12 500 грн` — ні.

**Відсутнє медіа**: див. рядок 3e. Додатково: `vite build` проходить, `qa:links` не бачить `src/data`; S9 ловить лише в `check-ds`.

**Спеціальні випадки** (`sim/special.mjs`, `v-s-*`):

| Випадок | Валідатор | Рендер |
|---|---|---|
| hero не першим / два hero / без hero | пропускає | без hero 0 `<h1>` (D7); hero останнім — перший заголовок h2 |
| `steps`: одночасно `scene` + `img` | пропускає | показується обидва |
| `scene: 'nope'` | пропускає | `ENOENT … partials/media/nope.html` на рендері, не на валідації |
| `engraving: 'nope'`, `icon: 'bogus'` | пропускає | порожнє місце / `icon--bogus` без стилю |
| однакові `key`, `key: 'head'` | пропускає | однакові класи `lp-layer--same` |
| `card.img = /uploads/x.jpg` | пропускає | перетворюється на `/assets/img/uploads/x.jpg` |
| `theme: 'nope'` | пропускає | клас `theme-nope` без ролей — чорні/прозорі кімнати |
| href `javascript:alert(1)`, `//evil.com`, `google.com` | пропускає | у `href` як є |
| `count = -5`, `1234567.891`, `1e21` | пропускає | лічильник: `String(Math.round(...))` — десяткові губляться, `1e21` → `1e+21` |
| `%BASE_URL%` у тексті | — | замінюється на `/`; `{{title}}`, `<!--@include header-->` — безпечно (екрануються) |
| `wall` + `list`; сума span ≠ 12; кількість не ділить 12; `steps` без медіа; `card` без text/list | відхиляє з поясненням | — |
| число як рядок `"4"` для `span`; невідоме поле `subtitle`; `tone: outline`; `variant: outline` у `foot.ctas` | відхиляє | — |

**`card` на максимумі** (`sim/card.mjs`; висота панелі фіксована, `overflow: clip`; позиція кнопки відраховується від верху картки):

| Дані | 1200 | 1440 | 1728 | 1920 | Висота картки (1200/1440/1728/1920) |
|---|---|---|---|---|---|
| title 60 + text 320 | кнопка 348 | 417 | 500 | 556 | 393 / 472 / 566 / 629 — **вміщується** |
| title 60 + list 4×90 | 372 (+22 вміст) | 446 (+26) | 535 (+31) | 595 (+34) | вміст виступає за панель |
| title 60 + text 320 + list 4×90 | 496 | 595 | 714 | 793 | **кнопка поза панеллю на 103…164 px, обрізана** |

### 3.4 Сценарій 4 — відповідність схема ↔ реальні поля

**Інвентар.** `node sim/recon.mjs`: усі поля з таблиць docs є в `SCHEMA`, і всі поля `SCHEMA` описані в docs (розбіжності скрипта — лише формат запису `cta.text / cta.href`, `route.*`, `foot.*`). `photoFirst` не використано жодною реальною сторінкою (є лише в `card`). У `tastings` не використано `room`, `join`, `scene`, `align`, `approx`, `wall`, `engraving`, `bgSlot`, `route`, `photoFirst` — для них відповідність перевірена на `barrels`/`excursions`/варіантах.

**Поля, що ніде не показуються** (маркерний прогін: 130 полів з унікальними маркерами; у HTML відсутні 9):
`hero.kicker`, `hero.caption`, `offers.caption`, `card.lead`, `card.caption`, `place.caption`, `faq.kicker`, `faq.lead`, `faq.caption`. Усі вони входять до «Спільних полів секції» (`BASE`) і є в docs, адмінка їх покаже, на сторінці вони не з'являться. Причина: `BASE` однаковий для всіх типів, а `partials/lp/<type>.html` використовують лише частину.

**JSON Schema ≡ згенероване, але слабша за `validatePage`:**

| Випадок | `lp-schema.js` | `page-template.schema.json` |
|---|---|---|
| `layers.items` = 5 (не ділить 12) | відхиляє | **приймає** (`minItems 2 … maxItems 6`) |
| `compare`: сума `span` ≠ 12 | відхиляє | **приймає** |
| `compare`: `wall` + `list` разом | відхиляє | **приймає** |
| `steps` без `scene`/`img`; `tiles` без `engraving`/`img`; `card` без `text`/`list` | відхиляє | **приймає** (немає `anyOf`/`required`) |
| обов'язкове `title: ''` | відхиляє | **приймає** (немає `minLength: 1`) |
| дубль `id` секцій | відхиляє | **приймає** |
| `hero.id: ''` (так у `barrels.js`!) | приймає | **відхиляє** (`pattern ^[a-z0-9-]+$`) |
| `hero.room` | відхиляє будь-що (`enum: []`) | `{"enum": []}` — недійсна схема, жодне значення не проходить |

Мінімальний валідатор (`sim/jsv.mjs`) на реальних даних: `barrels` дає 1 помилку JSON-схеми (`sections[0].id: ""`), `excursions` і `tastings` — 0.

**Чи зрозумілий опис полів WP-розробнику.** Таблиці docs читаються, обмеження вказано. Прогалини:
- одиниця ліміту («≤ 25») не названа (знаки/кодові точки; nbsp = 1);
- «шлях» зображення — без базового каталогу й вимог до формату; `card.img` має додаткове правило (`/assets/img/`);
- `scene`/`engraving`: «id медіа» без переліку допустимих значень (їх два, обидва «бочкові»);
- `icon`: посилання на розділ DS, без переліку; частина іконок має назви `barrels-*`;
- `room`/`join`: назви «warm/deep/paper» описують кімнати, колір задає тема — не пояснено, що значення різні в різних темах;
- `tone`: що саме він фарбує — не сказано;
- `place`: координати мапи беруться з `contacts.js` і не належать сторінці; перелік токенів `%contacts.*%` не наведено;
- `faq.a`: лише простий текст (`\n` склеюється, посилань/списків немає) — для textarea це обмеження слід назвати;
- `hero` має бути першою й єдиною секцією — у docs/схемі не вимагається.

**Таблиця відповідності «поле шаблону → тип поля адмінки».** Типи ACF: Text, Text Area, URL/Link, Image, Select, True/False, Number, Group, Repeater, Flexible Content. Для Gutenberg: кожен `type` секції = окремий блок, поле = атрибут (рядок, число, булеве, масив об'єктів = InnerBlocks або repeater-атрибут).

| Поле шаблону | Тип в `lp-schema` | ACF | Gutenberg-атрибут | Обмеження в адмінці |
|---|---|---|---|---|
| `slug` | id | Text (slug) | — (slug запису WP) | `^[a-z0-9-]+$`, унікальний |
| `theme` | id | Select | — (термін таксономії/опція) | значення = наявні `themes/*.css` |
| `tone` | enum | Select / Button group | — | teal, green, gold, light, beige; прив'язаний до теми |
| `metaTitle` | text ≤ 70 | Text | — (SEO-поле) | maxlength 70 |
| `metaDescription` | text ≤ 200 | Text Area | — | maxlength 200, без нових рядків |
| `sections` | list 1–20 | **Flexible Content** (layout = type) | InnerBlocks | min 1, max 20; hero першим (вручну) |
| `type` | type | назва layout | назва блоку | 9 значень |
| `id` | id | Text (slug) | string | унікальний; обов'язковий, крім hero |
| `room` | enum | Select | string | warm / deep / paper; типове за типом |
| `join` | bool | True/False | boolean | — |
| `kicker` | text ≤ 25 | Text | string | maxlength 25 (не в hero/faq — див. дефект D4) |
| `title` | text ≤ 60 | Text | string | обов'язкове, maxlength 60 |
| `lead` | text ≤ 320 (hero 160) | Text Area | string | maxlength залежить від типу |
| `caption` | text ≤ 120 | Text | string | maxlength 120 (не в hero/offers/card/place/faq) |
| `hero.img` | url | **Image** | image id/url | ≥ 2400 px по довгій стороні, обов'язкове |
| `*.alt` | text ≤ 140 | Text | string | порожній = декоративне |
| `*.slot` | text ≤ 240 | Text Area | string | службове, лише для `?slots=on` |
| `*.cta.text` | text ≤ 24 | Text | string | Group «cta» (обов'язковий) |
| `*.cta.href` | url | Link/URL | string | `^[^"<>\s]+$`; варто звузити схему |
| `layers.items[]` | list 2–6 | **Repeater** (min 2, max 6) | array | кількість ∈ {2,3,4,6} — потрібен validate-hook |
| `layers.items[].key` | id | Text (авто з title) | string | унікальний у списку |
| `layers.items[].icon` | icon | Select (іконки DS) | string | перелік потрібно віддати з коду |
| `layers.items[].title` / `.text` | text ≤ 25 / ≤ 90 | Text / Text Area | string | — |
| `layers.items[].img` | url | Image | image | квадрат ≥ 1024 px, необов'язкове |
| `steps.scene` | partial | Select (одне з медіа-partials) | string | реально одне значення; взаємовиключно з `img` |
| `steps.img` | url | Image | image | портрет, cover; або `scene` |
| `steps.items[]` | list 2–5 | Repeater | array | min 2, max 5 |
| `steps.items[].value` | text ≤ 8 | Text | string | велика цифра |
| `steps.items[].title` / `.text` | text ≤ 25 / ≤ 160 | Text / Text Area | string | — |
| `compare.note` | text ≤ 200 | Text Area | string | — |
| `compare.groups[]` | list 2–3 | Repeater | array | **сума `span` = 12** — validate-hook |
| `…groups[].span` | enum 2–9 | Select | number | залежить від кількості груп |
| `…groups[].align` | enum | Select | string | start / center |
| `…groups[].accent`, `.approx` | bool | True/False | boolean | — |
| `…groups[].count` | number | Number | number | **ціле ≥ 0** (схема приймає будь-яке число) |
| `…groups[].unit` / `.label` | text ≤ 40 / ≤ 25 | Text | string | — |
| `…groups[].wall` | enum | Select | string | `one` / `four-minus-one`; взаємовиключно зі `list` |
| `…groups[].list[]` | list 0–8 of text ≤ 90 | Repeater (1 підполе) | string[] | — |
| `…groups[].facts[]` | list 0–3 | Repeater | array | `value` ≤ 60, `label` ≤ 60 |
| `tiles.items[]` | list 2–6 | Repeater | array | кількість ∈ {2,3,4,6} |
| `tiles.items[].engraving` + `.icon` | partial + icon | Select + Select | string | або `img` |
| `tiles.items[].img` / `.alt` | url / text | Image / Text | image | 3:4, або engraving |
| `tiles.items[].name` / `.origin` / `.notes` | text ≤ 25 / 60 / 60 | Text | string | notes необов'язкове |
| `offers.bg`, `bgW`, `bgH`, `bgSlot` | url, number, number, text | Image (+ автозаповнення розмірів) | image | `bgW/bgH` — похідні від файлу, не вводяться вручну |
| `offers.route` (`from`, `to`, `icon`) | object | Group (усі три разом) | object | усі або жодного |
| `offers.items[]` | list 1–3 | Repeater | array | **реальна ємність ціни див. D1** |
| `…items[].price` / `.priceNote` | text ≤ 14 / ≤ 20 | Text | string | реально 6/10/21 знаків залежно від числа панелей |
| `…items[].facts[]` | list 0–4 | Repeater | array | `dt` ≤ 40, `dd` ≤ 60 |
| `…items[].includes[]` | list 0–5 of text ≤ 90 | Repeater | string[] | — |
| `offers.foot` (`text`, `ctas[]`, `note`) | object | Group + Repeater (0–2) | object | `ctas[].variant` ∈ light, beige, gold, teal, green |
| `card.text` | text ≤ 320 | Text Area | string | або `list`; разом — див. D2 |
| `card.list[]` | list 0–4 of text ≤ 90 | Repeater | string[] | — |
| `card.photoFirst` | bool | True/False | boolean | — |
| `card.img` | url | Image | image | ≈ 6:5; шлях лише під `/assets/img/` |
| `place.facts[]` | list 1–5 | Repeater | array | `label` ≤ 30, `value` ≤ 90, `icon`, `href` |
| `place.ctas[]` | list 0–2 | Repeater | array | `variant` ∈ green, teal, outline |
| `faq.items[]` | list 1–12 | Repeater | array | `q` ≤ 90, `a` ≤ 600 (Text Area без розмітки) |

Правила, яких немає в ACF «з коробки» і які треба писати PHP-хуками (`acf/validate_value`): сума `span` = 12; кількість ділить 12 (layers/tiles/offers); `wall` XOR `list`; `scene` XOR `img`; `engraving`+`icon` XOR `img`; `text` OR `list` у card; `route` усі три разом; унікальність `id` секцій і `key`; єдиний hero першим.

### 3.5 Сценарій 5 — що прошите під сторінку

`grep -in "barrel|excurs|бочк|екскурс|bazyl|yasno|wild turkey|63%|383|€"` по `partials/lp/*.html`, `lp.css`, `lp-media.css`, `lp.js`, `lp-schema.js`, `tokens.css`:

| Місце | Що прошито | Вплив |
|---|---|---|
| `partials/lp/*.html` | Ні «бочок», ні текстів, ні чисел. Єдиний прошитий рядок — `приблизно ` (укр.) у `group.html` (`.lp-sr`) | лише локалізація |
| `partials/media/barrels-scene.html` + `lp-media.css` (22 рядки `.lp-sc-*`/`.lp-scene`, `[data-step]`) | гравюра «бочка → пляшка»: стани для `data-step` 0…3, частини `pour`/`angels`, рівні рідини `--shift-barrels-cask-*` | придатна лише до `steps` рівно з 3 розділами про наливання/витримку/розлив |
| `partials/media/barrels-head.html` + `.lp-engraving` | днище бочки (клепки) для `tiles.engraving` | прив'язане до одного сюжету |
| `.lp-wall` (`wall: one | four-minus-one`), `barrels-bottle-block.svg` | маска 16 × 6 = 96 пляшок; `four-minus-one` = 383 = 4×96 − 1; токени `--span-barrels-ledger-50: 3`, `--size-barrels-wall-200-w` → група 1 span 3, група 2 span 9 | числа «96/383» і spans закодовані в CSS; на span 4/8 стіна не ламається, але геометрія підібрана під 3/9 |
| `tokens.css` блок «Шаблон…» і `lp.css`/`lp-media.css` | 41 токен `--size|shift|border|duration|scale|pos|origin|span|count|space-barrels-*` (та `--color-barrels-*`), які використовує **загальний** CSS (`--size-barrels-finish-icon`, `--size-barrels-block-w`…) | назви однієї сторінки в спільному коді (перейменувати на `--lp-*`) |
| `lp.css` | коментарі «barrels S4→S5», DS-стилі `.swatch--barrels-*` (3 правила) у файлі шаблону | косметика |
| `themes/barrels.css` | 4 правила `#benefits/#profit/#next/#price .lp-head`, 3 правила `.lp-step--pour/angels/bottle`, правило `.lp-group, .lp-offer` — «оптика чорнила, виміряна під конкретний текст», кадр `#price` | тема містить прив'язку до id секцій і `key` елементів, тобто до **змісту** |
| `themes/excursions.css` | кадр `#price` (`0% 0%`, scale 2, origin) | кадрування медіа лежить у темі, а не в даних |
| `lp.js` | лічильники `[data-count-to]` (`Math.round` → десяткові губляться, `String` → без роздільників тисяч), `data-step` за 45/45 % в'юпорта, `?slots=on`; про сторінки не знає | ок |
| `lp-schema.js` | enum-и (`tone`, `variant`, `wall`, `ROOMS`) і ліміти — ок; `VIEW.card` прибирає префікс `/assets/img/` (тому `card.img` має бути під ним) | прихований формат шляху |
| `vite.config.js` | `LP = { barrels, excursions }` і імпорти даних — ручний реєстр | нова сторінка = правка коду |
| `tools/qa/check-ds.allow.json` | винятки `D12` з `"page": "excursions"` (`faq-page__col`) | QA прив'язане до імені сторінки |

Медіа-ілюстрації `partials/media/*`: обидві — `barrels-*`, обидві прив'язані до сторінки (сюжет і числа); для інших сторінок у `scene`/`engraving` вибрати нічого. Стіна пляшок (CSS-маска) — третя «ілюстрація», також барельна.

## 4. Список дефектів за серйозністю

### 4.1 Блокує адмінку

| № | Дефект | Доказ | Мінімальна правка |
|---|---|---|---|
| D1 | **Ціна не вміщується.** `price ≤ 14` у схемі, але `.lp-offer__price` — `.t-stat` (122 px при 1440) + `white-space: nowrap`: реальна ємність 6 знаків при 3 панелях, 10 при 2, 21 при 1. Типова ціна «900 грн» при трьох пропозиціях → hscroll +48…+78 px (D3) і обрізання. Ліміт у схемі вводить в оману, збірка мовчить. | `check-ds D3`: `tastings@1200…1920`; `sim/pr.mjs`, `sim/cap.mjs`; `v-price`, `v-max` | Мінімум: у `validatePage` ємність за кількістю панелей (`{1: 21, 2: 10, 3: 6}`; можна рахувати зважені символи: цифри/пробіл) і зменшити `SCHEMA price` до 10; у docs написати «3 панелі — лише короткі ціни (≤ 6 знаків)»; або дозволити перенос `грн` окремим полем (`currency`) — нова структура, питання замовнику (CLAUDE.md 5б). |
| D2 | **`card`: `text + list` на межі лімітів виштовхує кнопку за фіксовану панель (629u, `overflow: clip`).** title 60 + text 320 вміщується; list 4×90 виступає на ≈ 5 % висоти; обидва — кнопка поза панеллю на 164 px (1920). | `sim/card.mjs`: `btnTop 793` при висоті 629 | У `validatePage`: `card`: `text` XOR `list` або сумарний бюджет `[...text].length + list.reduce(len) ≤ 320`; `list.max` з 4 до 3, `list[]` ≤ 70. У docs і схемі — число, не «мають вміститися». |
| D3 | **Довге слово ламає верстку мовчки** (немає `overflow-wrap`/`hyphens`): ємність h1 28, H2 35, заголовок картки 14, місця 12, FAQ 10, `dd` 16–18 знаків; ліміт схеми не обмежує довжину слова. 42-знакове слово → hscroll +265…+400. | `v-longword` (issues 18 × 4 ширини), `sim/cap.mjs` | Не візуальний стиль: `overflow-wrap: break-word; hyphens: auto` (на `html lang="uk"`) для `.lp-*`, `.tour-card`, `.faq-page__title`; плюс правило валідатора «слово ≤ 12/14 знаків» для заголовків картки/місця/FAQ. |
| D4 | **Дев'ять полів схеми не рендеряться:** `hero.kicker/caption`, `offers.caption`, `card.lead/caption`, `place.caption`, `faq.kicker/lead/caption` (спільні `BASE` для всіх типів). Адмінка покаже поле, на сайті — порожньо; «різниця між фронтом та адмінкою» ≠ 0. | маркерний прогін (130 полів → 9 відсутні): `gen3.mjs` + `v-markers.html` | Власні `BASE` по типах: у `SCHEMA` кожного типу лише ті з `kicker/lead/caption`, що є в partial; або додати вивід у partials (`hero`, `faq`, `card`, `place`, `offers` — вивід `{{caption}}` через існуючий `lp/head`). |
| D5 | **JSON Schema слабша за `validatePage`:** адмінка, що вірить JSON-схемі, пропустить 5 layers, `span` ≠ 12, `wall`+`list`, `steps` без медіа, `title: ''`, дубль id — збірка впаде пізніше; і навпаки — `barrels.js` (`hero.id: ''`) формально не проходить власну JSON-схему; `hero.room` = `{"enum": []}`. | `sim/jsv.mjs` (13 випадків), `diff` генерованого = IDENTICAL | У `tools/lp-schema-json.mjs`: `minLength: 1` для `req` text; `hero.room` — виключити з `properties`; для `id/url/…` необов'язкових — `anyOf [{maxLength:0},{pattern}]`; додати `allOf/if-then` для правил «один з двох», `prefixItems/enum` для кількості, і окремий `x-rules` з переліком перехресних правил, щоб PHP-розробник реалізував їх 1:1 (див. список у §3.4). |

### 4.2 Незручно (працює, але адмінку ускладнює)

| № | Дефект | Доказ | Мінімальна правка |
|---|---|---|---|
| D6 | **Валідатор не знає про файлові/зовнішні залежності:** `scene`, `engraving`, `icon`, `theme` — лише regex; `scene: 'nope'` падає з ENOENT на рендері, `icon: 'bogus'` мовчить, `theme: 'nope'` дає сторінку без кольорів; hero не першим/відсутній/два; `card.img` поза `/assets/img/` перетворюється мовчки. | `sim/special.mjs`; `v-s-scenenope` (HTTP 500), `v-s-nohero` (0 `<h1>`, D7) | У `lpView` (Node, `fs`): існування `partials/media/<scene>.html`, `themes/<theme>.css`, класу `icon--<icon>` (перелік зі схеми), правило «`sections[0].type === 'hero'`, hero один»; `card.img` — `startsWith('/assets/img/')`. |
| D7 | **Відсутнє медіа не ловиться збіркою** (dev віддає HTML-fallback зі статусом 200, у збірці — лише `qa` S9). | `sim/media.mjs` (11/15 зламано); `check-ds --rules S9` | Додати перевірку існування файлу в `lpView` (збірка падає); `S9` зробити частиною `npm run build`. |
| D8 | **QA-винятки прив'язані до імені сторінки** (`allow.json`: `"page": "excursions"`, D12 `faq-page__col`) → нова сторінка на шаблоні одразу отримує +2 порушення D12. | `tastings` 23 vs `excursions` 21 | Для lp-сторінок виняток по класу `.lp-faq`, не по `page`; у README шаблону — «нова сторінка → перевірити allow-list». |
| D9 | **Реєстрація сторінки — ручні правки коду:** `vite.config.js` (import + рядок `LP`), `main.css` (`@import` теми), `<slug>.html`, меню/футер. Для «адмінки» ці кроки мають відпасти. | docs «Як додати сторінку» п. 3–5; у симуляції зроблено 3 | `import.meta.glob('./src/data/*.js')` + `glob('./src/styles/themes/*.css')` (генерувати `@import` плагіном) + генерація `<slug>.html` плагіном у `configureServer`/`buildStart`. |
| D10 | **Колір і тон розділені:** `theme` (CSS) і `tone` (дані); обмін схеми = дві правки, невідповідність не перевіряється. | сценарій 2: `x-…-tone` варіанти | Реєстр `THEMES = { barrels: {tone: 'teal'}, … }` у `lp-schema.js`; `tone` — необов'язкове, типове з теми. |
| D11 | **Оптика й кадрування в темі прив'язані до змісту** (`#benefits`, `#price`, `.lp-step--pour` …; 9 правил у `barrels.css`; кадр `#price` у `excursions.css`). Заміна теми відриває їх від тексту; кадр фото — це медіа, а не колір. | §3.5; `y-*` варіанти | Кадрування `offers` — у дані (`bgPos`, `bgScale`, `bgOrigin`, перевірка діапазону); оптику чорнила — або рахувати від шрифтових метрик у CSS, або винести в окремий `<slug>.css`, не в тему кольорів. |
| D12 | **`place`: координати мапи глобальні** (`contacts.js`), дві сторінки не можуть мати різні локації; перелік токенів `%contacts.*%` не задокументований; `%BASE_URL%` заміна діє й у полях тексту. | `partials/lp/place.html`, `vite.config.js` | Поля `lat/lng/zoom` (необов'язкові) у `place`; у docs — перелік `%contacts.*%`; екранувати `%` у тексті. |
| D13 | **Фіксація зв'язків між секціями:** `hero.cta.href: '#price'` без перевірки, що така секція є; усі `href` приймають `javascript:`, `//host`; `key` не унікальні й дають однакові CSS-класи. | `sim/special.mjs` | У `validatePage`: якорні `href` (`#x`) звіряти з `id` секцій; `url` — `^(/[^/]|#|https?:|tel:|mailto:|[\w.-]+\.html)`; унікальність `key` у списку. |
| D14 | **Помилка збірки:** перший рядок зрозумілий, але перед ним «failed to load config», далі 10 рядків стеку; у dev при неправильних даних сервер лишається зі **старою** сторінкою (видно лише в терміналі). | `vite build` на title 76 > 60; dev: `server restart failed` | `try/catch` у `vite.config.js` → `console.error` одного рядка + `process.exit(1)` у build; у dev — overlay через `server.ws.send({type:'error'})`. |
| D15 | **Ілюстрації `scene`/`engraving`/`wall` прив'язані до бочок:** вибір — одне значення; `scene` вимагає 3 кроки в семантиці «налив/витримка/розлив». | §3.5 | У docs чесно позначити «медіа лише для сторінки бочок»; для нових сторінок — `img`. Довгостроково — загальний перелік ілюстрацій. |
| D16 | **Лічильник `count`:** схема приймає від'ємні, десяткові, `1e21`; JS округлює (`Math.round`) і не форматує тисячі. | `lp.js` (рядок із `String(Math.round(…))`) | У схемі `count`: ціле ≥ 0 (≤ 99 999); форматування `toLocaleString('uk')` у `lp.js`. |

### 4.3 Косметика

| № | Дефект | Правка |
|---|---|---|
| D17 | Порожній `kicker` у `card` лишає порожній `<p class="t-kicker">` (висота 0, але «сміття» у DOM); порожні `lp-tile__notes` лишаються в DOM (`display: none`). | `{{#kicker}}…{{/kicker}}` у `components/tour-card.html`; те саме для `notes`. |
| D18 | Зламане медіа дає іконку «битої картинки», hero падає на темне тло (при темній `--lp-hero-ink` — текст зникає). | Фон hero/tile як у `--lp-amber`; перевірка існування (D7). |
| D19 | Токени й коментарі з іменем сторінки в загальному коді: `--*-barrels-*` у `lp.css`/`lp-media.css`, `.swatch--barrels-*` у `lp.css`. | Перейменувати в `--lp-*`; swatch-и перенести в `design-system.css`. |
| D20 | `приблизно ` прошито українською в `group.html`. | Параметр `approxLabel` або константа в `lpView`. |
| D21 | `check-ds` D6 (`.lp-place__panel .contacts-data`: «немає focus-ring») і D12 для header/footer (13 порушень на кожній сторінці) — не шаблон, але шумлять у звітах нових сторінок. | Окремі задачі; для lp — додати в `allow.json` по класу. |
| D22 | FAQ `a` — один `<p>`; переноси рядків склеюються, форматування немає. | Описати в docs; за потреби — масив абзаців. |

## 5. Рекомендації

1. Порядок правок: D1, D2, D3 (верстка), D4 і D5 (контракт), далі D6, D7, D13 (валідатор), потім D9–D11 (реєстрація, тема), інше — за потреби.
2. Зробити контракт машинно-повним: з `lp-schema.js` генерувати і JSON Schema, і короткий **перелік перехресних правил** (`docs/page-template.rules.json`), щоб PHP-розробник реалізував їх 1:1. Додати тест у `npm run build`: «усі сторінки проходять і JS, і JSON валідатор» (подібний до `sim/jsv.mjs`).
3. Додати до `qa` контрактну перевірку «ліміти → верстка»: генерація `max`-даних (як `gen.mjs`) і прогін `D3`/overflow по `lp`; це знайшло б D1/D2/D3 до адмінки.
4. Прибрати `[потрібно уточнити]`-схеми поля `slot`/`bgSlot` з адмінки або позначити як службові.
5. До завдання «підключити адмінку» шаблон готовий **після D1–D5**; D6–D16 можна закривати поетапно, але без D1/D2 адмінка дозволить замовнику зламати сторінку введенням «звичайних» даних.
6. Для нових сторінок «лише даними» корисно додати генератор-скелет (`node tools/new-lp.mjs <slug> <theme>`), який створює дані, тему з ролей і `<slug>.html`, а реєстрацію робить автоматично (D9).

## 6. Артефакти (тимчасові, поза репозиторієм)

`/private/tmp/claude-501/-Users-admin-Documents-kraftspirits/2873102f-df87-4777-902b-ec722c943624/scratchpad/`: `dev-sim/` (копія з `tastings.*`, `variants/*`, `sim/*.mjs`), `gen*.mjs` (генератори варіантів), `out-base/`, `out-swap/`, `out-y/`, `out-var/` (check-ds JSON), `limits.tsv` (219 рядків), `markers.json`, `shots-base/`, `shots-v/`, `shots-swap/` (знімки), `metrics-v.txt`.

Типові команди відтворення (з `dev-sim/`):
```
npx vite --configLoader native --port 5346 --strictPort           # dev (зупинка: kill $(lsof -ti tcp:5346))
node sim/limits.mjs > ../limits.tsv                               # межі схеми
node sim/special.mjs                                              # спеціальні дані
node sim/metrics.mjs v-max,v-maxitems,v-longword 1200,1440,1728,1920 ../shots-v
node sim/contrast.mjs excursions,y-exc-theme-barrels 1440
node sim/card.mjs                                                 # card text+list
node sim/jsv.mjs                                                  # JSON Schema vs validatePage
node tools/qa/check-ds.mjs --url http://localhost:5346/ --pages tastings --widths 1200,1440,1728,1920 --scrollbar none --dynamic-only --rules D8,D13,D12,D3,D7
```
