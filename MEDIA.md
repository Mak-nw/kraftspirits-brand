# MEDIA — медіа сайту (YasnoCraft × Bazylsprings)

Джерело: `photo/generative/site/` (тільки читання) та растрові слоти Figma (файл JO2rsMY0AhFutzAQwfl0WV, сторінка des_brand 194:1183).
Усі шляхи нижче — відносно `site_brand/public/assets/` (на сайті — `/assets/...`).

## (а) Іконки — `brand-icons/` (фірмовий стиль іконок замовника)

Стиль (з `icons.json`): лінійні, stroke `#223420`, товщина 1.5, round cap/join, без заливки. Окремо від `icons/` (там іконки, вивантажені з Figma: стрілки/шеврони/плюси).
Для кожної іконки є варіанти: `*.svg` (контур), `*.filled.svg` (заповнений — тільки bottle-*), `*.json` (Lottie-анімація), `*.static.json` (Lottie, статичний кадр). `icons.json`/`bottles.json` — маніфест (розміри, шляхи, `volume`, `label`); шляхи в маніфесті вказують на `/assets/icons/...` — при використанні замінити на `/assets/brand-icons/...`.

| Файл(и) | Призначення | Де у Figma-макетах |
|---|---|---|
| basket.svg / .json / .static.json | кошик | У макетах іконки немає: пункт «Кошик ( 0 )» (194:1380, 1436, 1506, 1571) — лише текст. Іконку додаємо з бренд-набору |
| bottle-0-5 / bottle-0-7 / bottle-1 (.svg, .filled.svg, .json, .static.json) | селектор об'єму 0,5 / 0,7 / 1 л (default = контур, active = filled) | Картка товару: «0.5 л» (194:1396, 1531) — лише текст у Frame 65; іконки об'єму в макеті немає |
| process-01-malting … process-08-bottling (.svg) | 8 етапів виробництва: 01 солодування, 02 затирання/варіння, 03 ферментація, 04 дистиляція, 05 витримка, 06 купажування, 07 фільтрація, 08 розлив | Блок «8 — Етапів до результату» (194:1284–1286): у макеті лише цифра «8» без піктограм |
| arrow-down.svg | стрілка вниз (випадаючі фільтри/акордеони) | Каталог: фільтри Бренд/категорія/сортування (194:1479, 1484, 1490) — там шеврон-вектор «Vector 2» 12×6; у `assets/icons/` є chevron-down.svg з Figma — у макеті пріоритет має він |
| arrow-up-right.svg | стрілка ↗ у кнопках CTA | Кнопки «Вивчити асортимент» (194:1354, 1365, 1342 «Vector 1» 12×12) — у макеті власна стрілка (`assets/icons/arrow*.svg`) |
| headset.svg | «підказати?» (консультація/підтримка) | Шапка «підказати?» (194:1381 та копії) — у макеті лише текст |

Висновок: у Figma-макетах жодна з іконок brand-icons не намальована явно (там текстові пункти й власні стрілки/шеврони/плюси з `icons/`). brand-icons — набір для сайту згідно зі словами замовника; питання у розділі (г).

## (б) Слоти Figma → файл (`img/`)

Усі веб-файли — webp q85 (alpha збережено де було).

| Вузол Figma | Слот (px) | Файл | Джерело | Примітка |
|---|---|---|---|---|
| 194:1367 «…__994 1» hero фон | 2276×1281 (cover, виходить за кадр) | `img/hero-home.webp` (2560×1440) | photo/generative/site/magnific…__994.png | Figma містить лише 1024×576 копію; взято оригінал 2560×1440. 2× слота > джерела, лишено як є |
| 194:1345 «…__995 1» блок YasnoCraft | 1090×1090 cover | `img/brand-yasnocraft-bg.webp` (2048²) | magnific…__995.png | |
| 194:1356 «…__997 1» блок Bazylsprings | 1038×1038, вирівнювання bottom | `img/brand-bazylsprings-bg.webp` (2048²) | magnific…__997.png | |
| 194:1291 «image 43» фон «не знаєте з чого почати» | 1920×609 cover | `img/gifts-bg.webp` (1600×1200) | photo/generative/site/img/occasions/intro.jpg (збіг з Figma-растром 1600×1200, відхилення ~1/255) | Рамка обрізає центральну смугу. Для 1920 px ширини джерела (1600) замало — апскейл у браузері |
| 194:1328 / 1447 / 1454 / 1461 / 1468 «image 27» фото в картці товару/каталогу | 383×287 / 479×348, contain | `img/product-card-gin-barrel.webp` (800×1060, alpha); також наявний `img/product-card-sample.png` (1328×1760, той самий файл, md5 збігається з Figma-растром) | Figma (растр 1328×1760, прозорий PNG-виріз пляшки з тінню) | Пляшка з воском на корку і крафтовою етикеткою = «Джин Бочковий». Фон картки задає макет (сіро-зелений) |
| 194:1423 / 194:1522 «image 37» велика пляшка (дві сторінки товару) | 205×953 (видимі 875) | `img/product-hero-gin-yasnyi.webp` (1328×1760, alpha) | Figma (прозорий виріз; в old-site 300×828 `cutout/gin-yasnyi.webp` — лише низька роздільність, не взято) | У макеті вузол показує кроп: img ширина 350.83%, left −117.13% (тобто центральна частина пляшки) |
| 194:1418 «image 38» мініатюра 1 | 160×212 cover | `img/gallery-gin-yasnyi-1.webp` (320×424) | photo/generative/site/img/products/gin-yasnyi.jpg (відхилення 0.7/255) | |
| 194:1419 «image 39» мініатюра 2 | 160×212 | `img/gallery-gin-yasnyi-2.webp` | …/products/gallery/gin-yasnyi-1.jpg (джин з ялівцем на білому столі) | |
| 194:1420 «image 40» мініатюра 3 | 160×212 | `img/gallery-gin-yasnyi-3.webp` | …/products/gallery/gin-yasnyi-2.jpg (пляшка біля вікна з лимоном) | |
| 194:1421 «image 42» мініатюра 4 | 160×212 | в макеті той самий файл, що й image 38 (спільний asset-хеш) → `gallery-gin-yasnyi-1.webp` | `gallery-gin-yasnyi-extra-3.webp` ← `photo/generative/site/img/products/gallery/gin-yasnyi-3.jpg`; `gallery-gin-yasnyi-extra-4.webp` ← `photo/generative/site/img/products/gallery/gin-yasnyi-4.jpg` | Імовірно плейсхолдер. Додатково підготовлено `gallery-gin-yasnyi-extra-3.webp` (наливання в склянку) та `-extra-4.webp` (склянка з льодом, стіл) як кандидати для 4-го слоту. Кандидати на 4-ту мініатюру галереї картки, слот image 42 у Figma — дубль, рішення за замовником |
| 194:1273 «image 44» фото праворуч «Усе в одному місці» | 944×941 cover | `img/distillery-tour.webp` (2000×1333) | photo/generative/site/img/about/visit-tour.webp (піксельний збіг з Figma-растром) | Екскурсія біля мідних кубів |
| 194:1518 «image 45» (вільний) | 872×882 | не скопійовано | Figma | Ескіз етикетки Bazylsprings 700 мл / 42 % (повернутий ромб на темному фоні). Не фото сайту |
| 194:1584 «image 35» (вільний) | 1728×914 | не скопійовано | Figma | Скриншот сторінки брендбуку (колірна система, вікно Preview). Референс, не медіа сайту |
| 194:1585 «image 34» (вільний) | 976×244 | не скопійовано | Figma | Фрагмент палітри брендбуку. Референс |

Додатково скопійовано з old-site (є в макеті за змістом): `img/product-gin-barrel.webp` (1328×1760, `products/gin-barrel.jpg` — «Джин Бочковий» із фоном) і `img/product-gin-yasnyi.webp` (1328×1760, `products/gin-yasnyi.jpg`).

Каталог (194:1444…): 4 однакові картки «Джин Бочковий 1 250 ₴» з image 27 = gin-barrel (виріз). Відповідна пляшка у старих фото є: `products/gin-barrel.jpg` (з фоном) та `products/cutout/gin-barrel.webp` (300×828, низька роздільність).

Існуючі раніше файли в `img/` (логотипи, product-frame-*.svg, product-card-sample.png) не змінювались.

## (в) Не використано в поточних макетах (кандидати для каталогу) — НЕ скопійовано

`photo/generative/site/img/`:
- products/: barley-spirit.jpg (ячмінний дистилят), tincture-herbal.jpg (настоянка трав'яна), tincture-rowan.jpg (настоянка горобинова), whiskey-white.jpg (White Whiskey — «1 місце» з блоку статистики), schnapps-plum.jpg / schnapps-pear.jpg / schnapps-cherry.jpg (фруктові шнапси: слива, груша, вишня), calvados-3.jpg / calvados-5.jpg (кальвадос 3/5 років), oak-notes.jpg (дубові ноти; опис за назвою), gin-garden.jpg (джин «сад»; опис за назвою), fruit-watermelon.jpg («фрукт у пляшці», кавун).
- products/cutout/: calvados-3, calvados-5, tincture-herbal, schnapps-plum, schnapps-pear (webp 300×828), gin-barrel, gin-yasnyi (низька роздільність).
- products/gallery/: calvados-5-1…4, fruit-watermelon-1…4.
- about/: about-hero.webp, about-place.webp, about-home.jpg, visit-barrels.webp (візит, бочки), about/brands/yasnocraft-panel|detail, bazylsprings-panel|detail (.webp) — сторінка «про дім» ще не в макетах.
- hero/: hero-home.jpg (мідний куб біля бочок, бар; відрізняється від Figma-героя 994), hero-yasnocraft.jpg, hero-bazylsprings.jpg (1800×1800; у макеті для блоків брендів — інші кадри 995/997).
- occasions/: gift.jpg, collection.jpg, tasting.jpg, bar.jpg (події «подарунок / колекція / дегустація / бар-ресторан» — підписи у 194:1299–1323; фото в макеті відсутні, потенційні картки; intro.jpg використано як gifts-bg).
- brands/: yasnocraft-logo.svg, bazylsprings-logo.svg (логотипи вже є в assets/img у власних версіях).

## (г) Питання до замовника

1. Hero: у макеті кадр 994 (пейзаж із кухнею/каміном?) відрізняється від old-site hero-home.jpg (мідний куб). Підтвердити, що hero = 994.
2. image 43 («не знаєте з чого почати»): збігається з occasions/intro.jpg; рамка 1920×609 а джерело 1600×1200 — потрібен ширший/більший файл?
3. image 42 (4-та мініатюра) = дубль image 38. Яке фото має бути: gin-yasnyi-3 (наливання), gin-yasnyi-4 (склянка з льодом) чи інше?
4. Каталог показує 4 однакові «Джин Бочковий» — це плейсхолдер? Які реальні 14 позицій і фото (див. розділ в)?
5. Іконки brand-icons: у макетах їх немає (кошик, об'єм пляшки, 8 етапів, headset, стрілки — лише текст/власні стрілки). Де саме їх ставити (кошик у шапці, селектор об'єму на картці, піктограми над «8 етапів», headset біля «підказати?»)?
6. image 45 (етикетка Bazylsprings), 35 та 34 (кадри брендбуку) — не медіа сайту, підтвердити, що не потрібні.
7. «image 37» у вузлі використовується як кроп (350 %); для Bazylsprings-картки (194:1520) теж джин «Ясногородський» — чи для віскі Bazylsprings потрібна власна пляшка?

## (д) Нові ассети — product page YasnoCraft, новий макет (Figma 205:2430)

| Вузол Figma | Слот | Файл | Примітка |
|---|---|---|---|
| 206:2493 «magnific__studio-product-photograph-of-the-bottle-from-image__20078 1» | 900×968 (cover) | `img/product-hero-gin-yasnogorodskyi.webp` (1800×1936, webp q85) | Figma-растр 2048×2048 PNG без альфи; центрально обрізаний до пропорції слота 900:968 і приведений до 2× слота. Студійне фото пляшки «джин Ясногородський». Використано як `hero` gin-yasnyi |
| 205:2435 «Subtract» | 914×352 | `img/product-frame-yc-arch.svg` | Арка шапки панелі (зелений прямокутник з арковим вирізом), вектор з Figma без змін |
| 205:2438 «YasnoCraft_logo_round_colour 1» | 182×156 | `img/yasnocraft-logo-round-colour.webp` (PNG-оригінал лишено в `public/assets/img/` як джерело) | md5 PNG збігається з Figma-растром (2400×2050); webp = `cwebp -lossless -exact -z 9` (пікселі й альфа ідентичні PNG; 245 → 73 КБ) |
| 206:2505 / 206:2507 логотипи header | 201.8×29.5 / 178.9×59.6 | `img/yasnocraft-logo-no-mountains.webp`, `img/bazylsprings-logo.webp` (у розмітці: header, hero, design-system) | md5 PNG-оригіналів збігається з Figma-растрами; PNG лишено в `public/assets/img/` як джерело. webp = `cwebp -lossless -exact -z 9` (пікселі й альфа ідентичні PNG; 128 → 25 КБ і 204 → 53 КБ) |
| 206:2521 «image 39» і 194:1420 «image 40» | 126×167 (cover) | `img/gallery-gin-yasnyi-2.webp`, `img/gallery-gin-yasnyi-3.webp` (320×424; великі — `-2-lg`, `-3-lg`) | Figma-растри 896×1200 візуально збігаються з уже наявними gallery-gin-yasnyi-2/3 — нових файлів немає |

Не використовується більше на сторінці товару (файли лишились): `img/product-hero-gin-yasnyi.webp` (старий виріз-кроп), `img/gallery-gin-yasnyi-1.webp`, `-extra-3*.webp`, `product-frame-subtract.svg`.
Для інших YasnoCraft-товарів: вирізи `img/products/*.webp` на тлі `--color-ycp-stage-bg` (#d3cfc4 = середнє по краях студійного фото 206:2493; растр без суцільної заливки).

## (е) Нові фото з generative/newbottles

Джерело: `generative/newbottles/<ключ>.png` (замовник). Процедура — README, «Нові фото пляшок».

| Джерело | Файл | Примітка |
|---|---|---|
| `yasnyi.png` (1728×2304, студійне фото джину на бежевому тлі) → `gin-yasnyi` | `img/product-hero-yasnyi-new.webp` (1800×1936, q85) | `hero` gin-yasnyi (слот 900×968). Фото 3:4 вужче за 0.93, а пляшка займає ~83 % висоти, тому боки добудовано крайовим кольором тла (без обрізання пляшки). Замінило `product-hero-gin-yasnogorodskyi.webp` (файл лишився на диску, не використовується) |
| той самий | `img/products/gin-yasnyi.webp` (800×1060, webp q84 з альфою) | `image` gin-yasnyi: виріз через сервіс видалення фону (3 кредити; у сервіс відправлено лише цей файл). Бекап попереднього — scratchpad/products-backup/gin-yasnyi.prev.webp. `catalogImage` видалено; `img/product-card-gin-yasnyi-studio.webp` більше не використовується |

Розбіжність: на етикетці «ЯСНИЙ», 500ml, 40% alc; на сайті «Джин Ясногородський», 43 %. Назву не змінювали.

### (е.2) Решта 10 фото з generative/newbottles (виконано)

Таблиця синонімів «файл → slug»: `tools/bottle-map.json` (використовує `tools/import-bottle.mjs`; виріз — `node tools/import-bottle.mjs --cutout <png з альфою> <slug>`). Для кожного: hero `img/product-hero-<slug>-new.webp` (1800×1936, q85, 900:968, боки добудовано крайовим кольором тла; `gallery` не додавалась) + виріз `img/products/<slug>.webp` (800×1060, webp q84 з альфою, висота пляшки 740, низ y=902, по центру). Виріз — сервіс видалення фону (Magnific, `images_remove_background`, 3 кредити на файл, 30 загалом; у сервіс відправлено лише ці 10 файлів). Бекапи попередніх вирізів — scratchpad/products-backup/<slug>.prev.webp.

| Джерело | slug | Напис на етикетці | Розбіжність із сайтом |
|---|---|---|---|
| `bochkovyi.png` | gin-barrel | Джин БОЧКОВИЙ витриманий, 500ml, 40% alc | сайт: 45 % |
| `sadovyi.png` | gin-garden | Джин САДОВИЙ крафтовий, 500ml, 40% alc | сайт: 42 % |
| `kalvados-3.png` | calvados-3 | Кальвадос 3 РОКИ витриманий, 500ml, 40% alc | сайт: 0,7 л |
| `kalvados-5.png` | calvados-5 | Кальвадос 5 РОКІВ витриманий, 500ml, 40% alc | сайт: 0,7 л |
| `shnaps-slyvovyi.png` | schnapps-plum | Фруктовий шнапс СЛИВОВИЙ крафтовий, 500ml, 40% alc | немає |
| `shnaps-hrushevyi.png` | schnapps-pear | Фруктовий шнапс ГРУШЕВИЙ крафтовий, 500ml, 40% alc | немає |
| `shnaps-vyshnevyi.png` | schnapps-cherry | Фруктовий шнапс ВИШНЕВИЙ крафтовий, 500ml, 40% alc | немає |
| `nastoyanka-travyana.png` | tincture-herbal | Настоянка ТРАВ'ЯНА крафтова, 500ml, 40% alc | сайт: 35 % |
| `nastoyanka-gorobynova.png` | tincture-rowan | Настоянка ГОРОБИНОВА крафтова, 500ml, 40% alc | сайт: 30 % |
| `frukt-kavun.png` | fruit-watermelon | Фрукт у пляшці КАВУН крафтовий, 500ml, 40% alc | сайт: 0,7 л |

Назви й дані на сайті не змінювали. `img/product-card-gin-barrel.webp` більше не використовується (лишився на диску); `product-hero-gin-yasnogorodskyi.webp`, `product-card-gin-yasnyi-studio.webp` — теж.

### (е.3) Віскі Bazylsprings (3 фото, виконано)

Джерело: `generative/newbottles/whisky-white-whiskey.png`, `whisky-barley-spirit.png`, `whisky-oak-notes.png` (PNG 1728×2304, замовник; синоніми — `tools/bottle-map.json`). Hero BS — пропорція слота 194:1520, 866:875 (1732×1750, webp q85; боки добудовано крайовим кольором тла, `heroRatio` у bottle-map.json): `img/product-hero-whiskey-white-new.webp`, `-barley-spirit-new.webp`, `-oak-notes-new.webp`. Виріз для каталогу/слайдера (800×1060, альфа, висота 740, низ y 902): `img/products/whiskey-white.webp`, `barley-spirit.webp`, `oak-notes.webp` (попередні — у scratchpad products-backup). Кредити сервісу видалення фону: 4 запуски × 3 = 12 (whisky-white-whiskey.png замовник замінив під час роботи — темну пляшку на прозору з коричневою етикеткою; виріз зроблено заново з нового файлу).

| Джерело | slug | Напис на етикетці | Розбіжність із сайтом |
|---|---|---|---|
| `whisky-white-whiskey.png` | whiskey-white | BAZYLSPRINGS (WHISKY HOUSE), WHITE WHISKEY, 700ML, 42% | сайт: 0,5 л, 45 % |
| `whisky-barley-spirit.png` | barley-spirit | BAZYLSPRINGS (WHISKY HOUSE; логотип і назва бренду двічі), BARLEY SPIRIT, 700ML, 42% | сайт: 0,7 л збігається; 45 % |
| `whisky-oak-notes.png` | oak-notes | BAZYLSPRINGS (WHISKY HOUSE), OAK NOTES, 700ML, 42% | сайт: 0,5 л; міцність 42 % збігається |

Barley Spirit і Oak Notes — темне скло й вміст; White Whiskey — прозора пляшка з коричневою етикеткою (скло у вирізі напівпрозоре), тіні від пляшки у вирізі немає. Назви й дані на сайті не змінювали.


## (е) Слайдер-ассети сторінки товару (generative/slider)

Джерело (лише читання): `../generative/slider/` — 4 PNG 1728×2304 (3:4). Замовник: джин → усі позиції YasnoCraft, віскі → усі позиції Bazylsprings. Генерація: `node tools/make-slide.mjs` (окремо від hero-логіки import-bottle). Файли спільні для всього бренду (по 2 слайди = 2 мініатюри; hero товару лишається першим кадром, повторний клік по мініатюрі повертає його).

| Джерело | Бренд | Файли в `public/assets/img/slider/` | Великі / мініатюри | Кадрування |
|---|---|---|---|---|
| gin-studio.png (пляшка на темно-зеленому тлі) | YC | `yc-gin-studio-lg.webp`, `yc-gin-studio-thumb.webp` | 1800×1936 (900:968) q85 / 252×334 (126×167) q82 | боки добудовано крайовим тлом (пляшка ціла) |
| gin-herbs.png (пляшка похило в траві з ялівцем і м'ятою) | YC | `yc-gin-herbs-lg.webp`, `yc-gin-herbs-thumb.webp` | те саме, large q48 (щільна текстура трави) | кроп по висоті (зсув 35%), пляшка ціла |
| whisky-studio.png (Oak Notes на темно-синьому тлі) | BS | `bs-whisky-studio-lg.webp`, `bs-whisky-studio-thumb.webp` | 1732×1750 (866:875) q85 / 320×424 (160×212) q82 | боки добудовано тлом (пляшка ціла) |
| whisky-wheat.png (пляшка лежить у пшениці, бочки на тлі) | BS | `bs-whisky-wheat-lg.webp`, `bs-whisky-wheat-thumb.webp` | те саме, large q72 | кроп по висоті (зсув 62%) |

Застосування: `gallery` усіх 14 товарів у `src/data/products.js` (шляхи без початкового «/»). Нові товари дістають ті самі слайди: додати `gallery` за зразком.


## (ж) «Ф'ючерсні бочки» — редизайн «Світло в погребі» (15.10) і доопрацювання за рев'ю

Реальні кадри дистилерії (джерело — `../photo/…`, лише читання; EXIF-поворот застосовано):

| Файл | Джерело | Розмір / вага | Де | Статус |
|---|---|---|---|---|
| `img/barrels-price-bg.webp` | `photo/Фото Яснокрафт 4/Обладнання/IMG_2221.JPG` (легке підняття тіней, webp q74) | 1620×1080, 25 KB | barrels.html, «Ціна» — смуга під сертифікатами, БЕЗ затемнення (рев'ю 003d2383) | реальне фото днищ бочок; СЛОТ — нова зйомка. **ТЗ (FIX-8):** джерело лише 1620×1080 (більших кадрів днищ бочок у photo/ нема: кадри ≥ 2400 px — подієві, з людьми; зал із бочками 605A1146 — строкатий), на смузі розтягується й ще наближається ×2 (праворуч) — розмите. Потрібно: зйомка ряду днищ бочок у погребі, ≥ 3200 px по довгій стороні, права/центральна частина кадру темна (L ≤ 0.16) під світлий текст шапки, без людей і написів |

**AI-зображення** (згенеровано 15.10 з дозволу замовника за ТЗ IMG-T1…T4 нижче; Seedream 5 Pro, 2k 2048², по одному кадру, 4 × 100 = 400 кредитів; обробка: зменшення до 1024² (sips), WebP `cwebp -m 6` — для деталізованих цільовий розмір ≤ 120 KB, дуб — q78):

| Файл | Що | Розмір / вага | Де | Статус |
|---|---|---|---|---|
| `img/barrels-tex-char.webp` | макро обпаленої клепки («алігаторна» шкірка, бурштинові відблиски в тріщинах) | 1024×1024, 114 KB | barrels.html, «Що дає бочка» — коло «Сильний обпал» | **AI** (IMG-T1) |
| `img/barrels-tex-caramel.webp` | макро карамелізованого дуба (глянцеві карамельні цукри на волокнах) | 1024×1024, 116 KB | коло «Карамелізація целюлози» | **AI** (IMG-T2) |
| `img/barrels-tex-toast.webp` | макро підсмаженого білого дуба (золотисто-коричневий, пори й промені) | 1024×1024, 114 KB | коло «Ароматичні сполуки» | **AI** (IMG-T3) |
| `img/barrels-tex-oak.webp` | макро сирого білого дуба (світлий медовий, прямі волокна) | 1024×1024, 95 KB | коло «Феноли та смак» | **AI** (IMG-T4) |

Підключення — параметр `img` у `barrels-layer` (barrels.html, design-system); `data-slot` на колі лишається: за потреби AI-кадр можна замінити на макрозйомку.

Векторні ассети (кольорів у файлах немає — маски, колір задають токени `--color-lp-*`):

| Файл | Призначення |
|---|---|
| ~~`img/barrels-bottle-block.svg`~~ | видалено 19.10: «стіна пляшок» тепер inline SVG `partials/media/wall-barrels-units.html` (контур пляшки 22 × 50 у pattern; блок 8 × 12 = 96 на колонку, кількість — з даних) |

Видалено під час доопрацювання (арки й ілюстративні фактури прибрано за рішенням замовника): `barrels-staves.webp`, `barrels-amber.webp`, `barrels-heads-chalk.webp`, `barrels-tex-char|caramel|toast|oak.svg`, `barrels-pattern-diamond.svg`.

Слоти під майбутні фото (позначені `data-slot`, огляд — `barrels.html?slots=on`): hero (ТЗ IMG-1, зараз наявний AI-кадр `barrels-hero.webp`); 4 фото-текстури шарів клепки в колах S2 (IMG-T1…T4 — AI-кадри вже підключені, див. таблицю вище; за потреби — макрозйомка); 4 днища бочок з-під вин — марсала / мадера / портвейн / херес (IMG-4, зараз гравюри на плашках); тло «Ціни» (зараз реальний кадр IMG_2221).

**ТЗ IMG-T1…T4 — фото-текстури шарів клепки (S2 «Що дає бочка»)** — ВИКОНАНО 15.10 (4 кадри Seedream 5 Pro, 400 кредитів; файли — у таблиці AI-зображень). Кола діаметром до 360 px на 1920 (@2x ≈ 720 px), кадрування кругле — фактура рівномірна на всю площу, центр важливий, краї обрізаються. Генерація: квадрат 1:1, 2048×2048 (Seedream 5 Pro, 2k); здача — WebP 1024×1024, q≈78, ≤ 120 KB кожна, sRGB → `public/assets/img/barrels-tex-{char|caramel|toast|oak}.webp`, підключення — параметр `img` у `barrels-layer` (barrels.html). Стиль: фотографічна макрозйомка (НЕ ілюстрація й НЕ 3D-рендер), погляд строго зверху на площину, м'яке рівне світло, різкість на всю площу, без віньєтки, тексту, логотипів, людей і предметів; тони в межах палітри (вугільний → карамель/бурштин → підсмажений дуб → світлий дуб), без насиченого червоного й зеленого. Промпти (англ.):
- T1 обпал: `Extreme close-up macro photograph of the heavily charred inner surface of a bourbon barrel stave, deep alligator-skin char pattern with cracked glossy black blisters, faint warm amber glints in the cracks, top-down flat view, even soft studio light, texture fills the entire frame edge to edge, sharp focus throughout, no vignette, photorealistic, square 1:1`
- T2 карамелізація: `Extreme close-up macro photograph of caramelized oak wood just beneath the char layer of a whiskey barrel stave, glossy dark caramel and amber sugars soaked into the wood grain, translucent toffee tones, top-down flat view, even soft light, texture fills the entire frame, sharp focus, no vignette, photorealistic, square 1:1`
- T3 тост: `Extreme close-up macro photograph of a toasted American white oak barrel stave surface, medium golden-brown toast, tight visible wood grain and pores, subtle roasting gradient, top-down flat view, even soft light, texture fills the entire frame, sharp focus, no vignette, photorealistic, square 1:1`
- T4 дуб: `Extreme close-up macro photograph of raw untoasted American white oak, light honey-beige wood with fine straight grain and medullary rays, matte surface, top-down flat view, even soft daylight, texture fills the entire frame, sharp focus, no vignette, photorealistic, square 1:1`
- Negative для всіх: `illustration, drawing, vector, 3d render, cgi, text, watermark, logo, people, hands, glass, bottle, liquid splash, vignette, blur, oversaturated`
Кредити: Seedream 5 Pro 2k = 100 / кадр (simulate_cost: exact) → 4 текстури = 400; баланс 24 070 → 23 670. Інші генерації (днища IMG-4, hero IMG-1) — НЕ запускали, лише з окремого дозволу замовника.

## Фото коктейлів (AI) — `img/cocktails/<slug>-1.webp`

Статус: **AI-зображення, чернетка на затвердження замовником.** 15 кадрів 1120×1400 (4:5), WebP q80, 27–45 КБ. Мапінг slug → файл/alt/склянка/фон/вартість: `reports/cocktail-photos.json`; контактний лист: `reports/cocktail-photos-sheet.png`.
- Пляшка на кожному кадрі — **РЕАЛЬНА** (прозорий виріз `img/products/<slug>.webp`, етикетка справжня), однакова висота (66 % кадру), позиція ліворуч (≈29 % ширини), спільна тінь і м’яке відображення додані в Pillow. Бокал із коктейлем **згенеровано AI** (модель z-image, Magnific, 5 кредитів/кадр, без тексту/логотипів/людей), однотонний пастельний фон під колір напою; бокал праворуч (≈69 %), лінія столу єдина (80 % висоти).
- Витрати: 101 кредит (15 кадрів + 3 повтори + пілотне порівняння моделей: Classic Fast 1, Flux.2 Klein 10, z-image 5). Баланс до 23 670, після 23 569. Обрано z-image як найдешевшу модель із фотореалістичним результатом (Classic Fast — 1 кредит, але ігнорує композицію).
- Примітки: «Джин-смеш з базиліком» — AI видав келих на ніжці замість рокс (ліміт повторів вичерпано); бокали «Джин-тонік» і «Трав’яний тонік» — обидва баллон; бокал у кадрі збільшено/зменшено в Pillow до реальних пропорцій відносно пляшки. Пляшка в кадрі лише для відповідності напою з `cocktails.js` (product).
