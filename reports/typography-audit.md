# Аудит типографіки: ролі .t-* проти фактичних стилів (S11 + D13)

Дата: 2026-10-15. Інструменти: `tools/qa/ds-static.mjs` (S11), `tools/qa/typo-d13.mjs` + `ds-dynamic.mjs` (D13). Виправлення сторінок НЕ робилися.
**База аудиту** — комміт `f42e039` (HEAD, копія в scratchpad), щоб цифри не «пливли»: паралельний виконавець уже переводить тексти на `.t-desc` (робоче дерево). Для порівняння наведено і робоче дерево на момент аудиту.
Умови замірів: Chrome headless, ширини 1200/1440/1920, смуга прокрутки `none` (тоді `--u` = ширина/1920 і 16u = 12px на 1440), `?age=ok&reveal=off&parallax=off`, сторінки: 404, about, barrels, cart, catalog, cocktails, contacts, faq, feedback, index, offer, product (gin-yasnyi, whiskey-white) + ворота 18+ окремо; header/footer — у складі кожної сторінки. design-system.html виключена (демо варіантів).

## Підсумок

- Унікальних текстових стилів на сайті: **41**; збігаються з ролями **17**, **поза ролями — 24** (на кожній із трьох ширин однаково: 41/41/41, 24/24/24 — усе масштабується `--u`; винятки — `max(…, 12px/13px)` у barrels, які на 1200 дають інші пропорції).
- Ролей у base.css 21, але реально різних начерків 17: `.t-stat-label = .t-acc = .t-footer-head` (ідентичні), `.t-kicker = .t-faq` (ідентичні), `.t-text` = `.t-body` без CAPS.
- S11 (HEAD): **128** порушень = 97 власних шрифтових оголошень у 16 CSS-файлах + 31 типографічний токен у tokens.css поза ролями. Робоче дерево: 111 (80 + 31).
- D13 (HEAD): **94** види вузлів / **335** вузлів на 1440 (однакові числа на 1200/1920) — «поза ролями» або «роль перевизначена». Робоче дерево: 79 / 315.
- Причина скарги замовника підтверджена: на barrels 52 види «поза ролями» (≈25 власних селекторів із `font:`), на index 6 (чотири різні «описи»), а footer-посилання на всіх 12 сторінках мають іншу літерність, ніж ця ж роль `.t-nav` у шапці.

## (а) Таблиця ролей (computed на 1440, смуга none)

| Роль | Шрифт | Розмір, px | Вага | Line-height, px | Letter-spacing, px | Регістр |
|---|---|---|---|---|---|---|
| `.t-hero` | EB Garamond | 41.25 | 600 | 41.25 | 0 | CAPS |
| `.t-h2` | EB Garamond | 50.25 | 600 | 50.25 | 0 | CAPS |
| `.t-stat` | EB Garamond | 122.25 | 400 | 122.25 | 0 | CAPS |
| `.t-stat-label` | EB Garamond | 15 | 600 | 15 | 0 | успадковує |
| `.t-kicker` | EB Garamond | 15 | 600 | 21 | 0.45 | успадковує |
| `.t-lead` | EB Garamond | 30 | 500 | 30 | 0 | CAPS |
| `.t-chip` | EB Garamond | 18.75 | 500 | 18.75 | 0 | CAPS |
| `.t-body` | Manrope | 12 | 500 | 16.8 | 0.36 | CAPS |
| `.t-nav` | Manrope | 10.5 | 600 | 12 | 0.32 | CAPS |
| `.t-spec` | EB Garamond | 15 | 600 | 15 | 0.45 | успадковує |
| `.t-btn` | EB Garamond | 12 | 600 | 16.8 | 0.36 | CAPS |
| `.t-price` | Manrope | 15 | 400 | 15 | 0.45 | CAPS |
| `.t-product-name` | EB Garamond | 15 | 600 | 18 | 0 | CAPS |
| `.t-caption` | Manrope | 12 | 400 | 12 | 0.36 | CAPS |
| `.t-breadcrumb` | Manrope | 9 | 500 | 12.6 | 0.27 | CAPS |
| `.t-faq` | EB Garamond | 15 | 600 | 21 | 0.45 | успадковує |
| `.t-acc` | EB Garamond | 15 | 600 | 15 | 0 | успадковує |
| `.t-footer-head` | EB Garamond | 15 | 600 | 15 | 0 | успадковує |
| `.t-wordmark` | Cormorant | 102.75 | 600 | 102.75 | 0 | CAPS |
| `.t-text` | Manrope | 12 | 500 | 16.8 | 0.36 | успадковує |
| `.t-desc` | EB Garamond | 15 | 500 | 18 | 0.75 | успадковує |

Примітки: (1) роль без власного `text-transform` (`.t-text`, `.t-desc`, `.t-kicker`, `.t-spec`, `.t-faq`, `.t-acc`, `.t-footer-head`, `.t-stat-label`) **успадковує** регістр від батька — у D13 порівнюється з будь-яким; це крихко (`.t-text` у CAPS-батька стане CAPS), рекомендація — явний `text-transform: none` у ролі. (2) `.t-hero` (55u) меншa за `.t-h2` (67u) — назви вводять в оману, але не помилка. (3) `.t-price` за значеннями — Manrope 400, але в усіх реальних місцях (картка, кнопка) перевизначена на EB Garamond 500 (див. нижче).

## (б) Інвентар унікальних текстових стилів (усі сторінки, 1200/1440/1920)

Рядок = унікальний обчислений стиль; «Вузлів» — сума по всіх сторінках на 1440 (header/footer враховано на кожній сторінці). Повні дані по сторінках і ширинах: `d13.json` (генерується `--out`).

| # | Стиль @1440 (шрифт розмір/lh вага ls регістр) | @1200 розм/lh | @1920 розм/lh | Вузлів | Сторінок | Приклад (сторінка: селектор «текст») | Роль / найближча роль і різниця |
|---|---|---|---|---|---|---|---|
| 1 | Manrope 10.5/12 w600 ls0.32 none | 8.75/10 | 14/16 | 221 | 12 (404, about, barrels, cart, …) | 404: `a.nav-link.nav-link--on-light` «Головна» | **поза ролями.** ≈ `.t-nav`: регістр none→uppercase |
| 2 | EB Garamond 15/15 w500 ls0.45 uppercase | 12.5/12.5 | 20/20 | 32 | 4 (catalog, cocktails, index, product) | catalog: `p` «від 850 ₴» | **поза ролями.** ≈ `.t-spec`: вага 500→600 |
| 3 | Manrope 12/17.4 w500 ls0.36 none | 12/17.4 | 15/21.75 | 12 | 1 (barrels) | barrels: `p.bx-ledger__unit` «пляшок по 0,7 л» | **поза ролями.** ≈ `.t-text`: lh 17.4→16.8px |
| 4 | Manrope 13.5/19.6 w500 ls0.41 none | 13/18.85 | 18/26.1 | 11 | 1 (barrels) | barrels: `p.bx-layer__text` «Формує глибину та стру» | **поза ролями.** ≈ `.t-text`: розмір 13.5→12px, lh 19.6→16.8px |
| 5 | EB Garamond 12/16.8 w600 ls0.36 none | 10/14 | 16/22.4 | 8 | 2 (catalog, feedback) | catalog: `span.select__label` «Бренд» | **поза ролями.** ≈ `.t-btn`: регістр none→uppercase |
| 6 | EB Garamond 22.5/24.8 w600 ls0.68 uppercase | 18.75/20.63 | 30/33 | 7 | 1 (barrels) | barrels: `h3.bx-chapter__title` «Заливка» | **поза ролями.** ≈ `.t-chip`: вага 600→500, розмір 22.5→18.75px, lh 24.8→18.8px, ls 0.68→0px |
| 7 | EB Garamond 19.5/21.4 w600 ls0.58 uppercase | 16.25/17.88 | 26/28.6 | 4 | 1 (barrels) | barrels: `h3.bx-layer__title` «Сильний обпал» | **поза ролями.** ≈ `.t-kicker`: розмір 19.5→15px |
| 8 | EB Garamond 21/23.1 w600 ls0.63 uppercase | 17.5/19.25 | 28/30.8 | 4 | 1 (barrels) | barrels: `span.bx-finish__name` «Marsala» | **поза ролями.** ≈ `.t-chip`: вага 600→500, розмір 21→18.75px, lh 23.1→18.8px, ls 0.63→0px |
| 9 | EB Garamond 13.5/19.6 w500 ls0 none italic | 13/18.85 | 18/26.1 | 4 | 1 (barrels) | barrels: `span.bx-finish__notes` «абрикос, мед, мигдаль» | **поза ролями.** ≈ `.t-desc`: style italic→normal, розмір 13.5→15px, lh 19.6→18px, ls 0→0.75px |
| 10 | EB Garamond 19.5/19.5 w500 ls0 none | 16.25/16.25 | 26/26 | 4 | 1 (barrels) | barrels: `dd` «≈ 96» | **поза ролями.** ≈ `.t-chip`: розмір 19.5→18.75px, lh 19.5→18.8px, регістр none→uppercase |
| 11 | Manrope 8.91/13.4 w400 ls0.27 none | 7.41/11.11 | 11.91/17.86 | 3 | 1 (age-gate) | age-gate: `p.age-card__legal` «Інформація на сайті пр» | **поза ролями.** ≈ `.t-breadcrumb`: вага 400→500, lh 13.4→12.6px, регістр none→uppercase |
| 12 | EB Garamond 150/129 w400 ls0 none | 125/107.5 | 200/172 | 3 | 1 (barrels) | barrels: `span.bx-chapter__num` «63%» | **поза ролями.** ≈ `.t-stat`: розмір 150→122.25px, lh 129→122.3px, регістр none→uppercase |
| 13 | Manrope 10.5/10.5 w400 ls0.32 uppercase | 8.75/8.75 | 14/14 | 3 | 1 (catalog) | catalog: `span.select__value` «Усі» | **поза ролями.** ≈ `.t-nav`: вага 400→600, lh 10.5→12px |
| 14 | EB Garamond 48.75/48.8 w400 ls0 uppercase | 40.63/40.63 | 65/65 | 3 | 1 (index) | index: `p.stat__num` «( 2 )» | **поза ролями.** ≈ `.t-h2`: вага 400→600, розмір 48.75→50.25px, lh 48.8→50.3px |
| 15 | Manrope 12/16.8 w500 ls0.6 none | 10/14 | 16/22.4 | 3 | 1 (index) | index: `p.intro__body` «Нам було цікаво експер» | **поза ролями.** ≈ `.t-text`: ls 0.6→0.36px |
| 16 | EB Garamond 40.82/40.8 w600 ls0 uppercase | 33.95/33.95 | 54.57/54.57 | 2 | 1 (age-gate) | age-gate: `span.age-card__line` «Підтвердіть, що вам» | **поза ролями.** ≈ `.t-hero`: розмір 40.82→41.25px |
| 17 | EB Garamond 22.5/28.1 w500 ls0 none | 18.75/23.44 | 30/37.5 | 2 | 1 (barrels) | barrels: `p.hero__subtitle` «Екс-бурбонові бочки Wi» | **поза ролями.** ≈ `.t-chip`: розмір 22.5→18.75px, lh 28.1→18.8px, регістр none→uppercase |
| 18 | EB Garamond 47.25/40.6 w400 ls0 none | 39.38/33.86 | 63/54.18 | 2 | 1 (barrels) | barrels: `span.bx-ledger__approx` «≈» | **поза ролями.** ≈ `.t-h2`: вага 400→600, розмір 47.25→50.25px, lh 40.6→50.3px, регістр none→uppercase |
| 19 | EB Garamond 112.5/96.8 w400 ls0 none | 93.75/80.63 | 150/129 | 2 | 1 (barrels) | barrels: `span` «96» | **поза ролями.** ≈ `.t-stat`: розмір 112.5→122.25px, lh 96.8→122.3px, регістр none→uppercase |
| 20 | EB Garamond 25.5/25.5 w500 ls0 none | 21.25/21.25 | 34/34 | 2 | 1 (barrels) | barrels: `span.bx-ledger__cost-num` «≈ € 20,83» | **поза ролями.** ≈ `.t-lead`: розмір 25.5→30px, lh 25.5→30px, регістр none→uppercase |
| 21 | EB Garamond 87/74.8 w400 ls0 none | 72.5/62.35 | 116/99.76 | 2 | 1 (barrels) | barrels: `p.bx-cert__price` «€ 2 000» | **поза ролями.** ≈ `.t-stat`: розмір 87→122.25px, lh 74.8→122.3px, регістр none→uppercase |
| 22 | EB Garamond 66/69.3 w600 ls0 uppercase | 55/57.75 | 88/92.4 | 1 | 1 (barrels) | barrels: `h1.hero__title` «Ф'ючерсні бочки Bazyls» | **поза ролями.** ≈ `.t-h2`: розмір 66→50.25px, lh 69.3→50.3px |
| 23 | Manrope 12/18 w500 ls0.36 none | 12/18 | 14/21 | 1 | 1 (barrels) | barrels: `p.barrels-price__note` «Розрахунок наведено дл» | **поза ролями.** ≈ `.t-text`: lh 18→16.8px |
| 24 | Arial 13.33/normal w400 ls0 none | 13.33/normal | 13.33/normal | 1 | 1 (feedback) | feedback: `input` «(поле)» | **поза ролями.** ≈ `.t-stat-label`: шрифт Arial→EB Garamond, вага 400→600, розмір 13.33→15px, lh normal→15px |
| 25 | Manrope 12/16.8 w500 ls0.36 none | 10/14 | 16/22.4 | 162 | 8 (404, about, cart, cocktails, …) | 404: `p.under-construction__text` «Схоже, такої адреси не» | **ok:** `.t-text` |
| 26 | EB Garamond 12/16.8 w600 ls0.36 uppercase | 10/14 | 16/22.4 | 76 | 12 (404, about, barrels, cart, …) | 404: `span` «меню» | **ok:** `.t-btn` |
| 27 | EB Garamond 15/15 w600 ls0 none | 12.5/12.5 | 20/20 | 70 | 12 (404, about, barrels, cart, …) | 404: `h2` «Меню» | **ok:** `.t-stat-label` = `.t-acc` = `.t-footer-head` |
| 28 | EB Garamond 15/21 w600 ls0.45 none | 12.5/17.5 | 20/28 | 54 | 7 (about, barrels, cart, cocktails, …) | about: `p.under-construction__page` «Про дім» | **ok:** `.t-kicker` = `.t-faq` |
| 29 | Manrope 10.5/12 w600 ls0.32 uppercase | 8.75/10 | 14/16 | 39 | 12 (404, about, barrels, cart, …) | 404: `p.site-footer__copy.nav-link` «© 2026» | **ok:** `.t-nav` |
| 30 | EB Garamond 41.25/41.3 w600 ls0 uppercase | 34.38/34.38 | 55/55 | 35 | 11 (404, about, cart, catalog, …) | 404: `h1.under-construction__title` «Упс.. Сторінка не знай» | **ok:** `.t-hero` |
| 31 | EB Garamond 15/18 w600 ls0 uppercase | 12.5/15 | 20/24 | 30 | 3 (catalog, cocktails, index) | catalog: `h3` «Джин Ясногородський» | **ok:** `.t-product-name` |
| 32 | Cormorant 102.75/102.8 w600 ls0 uppercase | 85.63/85.63 | 137/137 | 26 | 12 (404, about, barrels, cart, …) | 404: `p.site-footer__wordmark.site-footer__wordmark--yc` «yasnocraft» | **ok:** `.t-wordmark` |
| 33 | EB Garamond 15/18 w500 ls0.75 none | 12.5/15 | 20/24 | 15 | 2 (cocktails, index) | cocktails: `p.cocktail__original` «Gin & Tonic» | **ok:** `.t-desc` |
| 34 | Manrope 9/12.6 w500 ls0.27 uppercase | 7.5/10.5 | 12/16.8 | 14 | 1 (product) | product: `a` «каталог» | **ok:** `.t-breadcrumb` (клас не призначено) |
| 35 | EB Garamond 50.25/50.3 w600 ls0 uppercase | 41.88/41.88 | 67/67 | 7 | 3 (barrels, cocktails, index) | barrels: `h2` «Що дає бочка» | **ok:** `.t-h2` |
| 36 | EB Garamond 18.75/18.8 w500 ls0 uppercase | 15.63/15.63 | 25/25 | 4 | 1 (index) | index: `span` «подарунок» | **ok:** `.t-chip` |
| 37 | EB Garamond 15/15 w600 ls0.45 none | 12.5/12.5 | 20/20 | 3 | 1 (product) | product: `button.product-volume` «500 мл» | **ok:** `.t-spec` (клас не призначено) |
| 38 | Manrope 11.88/16.6 w500 ls0.36 none | 9.88/13.82 | 15.88/22.23 | 2 | 1 (age-gate) | age-gate: `p.age-card__text` «Наш сайт присвячений а» | **ok:** `.t-text` |
| 39 | EB Garamond 11.88/16.6 w600 ls0.36 uppercase | 9.88/13.82 | 15.88/22.23 | 2 | 1 (age-gate) | age-gate: `span.btn__inner` «Так, мені є 18 років» | **ok:** `.t-btn` |
| 40 | Manrope 12/16.8 w500 ls0.36 uppercase | 10/14 | 16/22.4 | 1 | 1 (index) | index: `p.picker__text` «спробуйте наш метод пі» | **ok:** `.t-body` = `.t-text` |
| 41 | Manrope 12/12 w400 ls0.36 uppercase | 10/10 | 16/16 | 1 | 1 (product) | product: `span` «0,5 л» | **ok:** `.t-caption` (клас не призначено) |

### D13 по сторінках (1440; порушення = «поза ролями» + «роль перевизначена»)

| Сторінка | D13 HEAD: видів / вузлів | D13 робоче дерево: видів / вузлів |
|---|---|---|
| 404 | 2 / 17 | 2 / 17 |
| about | 2 / 17 | 2 / 17 |
| age-gate | 2 / 3 | 2 / 3 |
| barrels | 52 / 78 | 34 / 54 |
| cart | 2 / 17 | 2 / 17 |
| catalog | 6 / 37 | 6 / 37 |
| cocktails | 3 / 32 | 3 / 32 |
| contacts | 2 / 17 | 7 / 24 |
| faq | 2 / 17 | 2 / 17 |
| feedback | 7 / 23 | 7 / 23 |
| index | 6 / 24 | 4 / 21 |
| offer | 2 / 17 | 2 / 17 |
| product | 6 / 36 | 6 / 36 |
| **усього** | **94 / 335** | **79 / 315** |

Footer-пара (2 види × 12 сторінок) — це `.site-footer__list .t-nav {text-transform: none}` і адреса «Київська область…» (`li.nav-link`). Розбіжність contacts 2→7 між HEAD і робочим деревом — плаваюче підвантаження елементів MapLibre (+/− масштаб, атрибуція, «Щоб змінити масштаб»), а не зміна коду; ці 5 видів — сторонні віджети, стилізовані в contacts.css.

## (в) Розбіжності: та сама семантика — різний начерк

Числа — на 1440 (1u = 0,75px), стан HEAD.

**Головна (index) — «опис під заголовком блока»: 4 начерки**

| Селектор | Роль у розмітці | Фактичний стиль |
|---|---|---|
| `.brand-half__text` | `.t-desc` | EB Garamond 15/18, 500, ls 0.75, sentence |
| `.intro__body` | `.t-text` + перевизначення ls токеном `--ls-intro-body` | Manrope 12/16.8, 500, ls **0.60**, sentence |
| `.tour-card__body` | `.t-text` + те саме перевизначення | Manrope 12/16.8, 500, ls **0.60** |
| `.picker__text` | `.t-body` | Manrope 12/16.8, 500, ls 0.36, **CAPS** |

**Головна — заголовки h2:** `.intro__title`, «Побачте дистиляцію» — `.t-hero` (41.25px); `.picker__title` — `.t-h2` (50.25px). **Велике число:** `.stat--compact .stat__num` має клас `.t-stat`, але стиль 48.75/48.8 w400 (токен `--type-stat-compact-*`, 65u) замість ролі 122.25px — D13: «роль перевизначена».

**Бочки (barrels) — те саме, інакше:**

| Семантика | Селектори barrels (1440) | Еталон в інших місцях |
|---|---|---|
| H1 | `.hero__title` EB Garamond 66/69.3 (88u, lh 1.05) | `.t-hero` 41.25 на 404/about/cart/contacts/faq/feedback/offer; cocktails — `.t-h2` 50.25: **3 розміри h1** |
| Лід / підзаголовок у sentence case | `.hero__subtitle`, `.barrels-next__lead` EB Garamond 22.5/28.1 w500 | `.t-lead` 30/29.7 CAPS; ролі «лід у sentence case» немає |
| Малий заголовок (h3) | `.bx-layer__title` 19.5/21.4 ls .58; `.bx-chapter__title`, `.bx-ledger__size`, `.bx-cert__title` 22.5/24.8 ls .68; `.bx-finish__name` 21/23.1 ls .63 (усі w600 CAPS) | `.t-product-name` 15/18 ls 0 (catalog/cocktails/index); `.t-kicker` 15/21: **4 розміри малого заголовка на одній сторінці** і жоден не роль |
| Опис / пояснення | `.bx-layer__text`, `.bx-chapter__text`, `.bx-cert__list li` Manrope 13.5/19.6 ls .41 (18u, `max(…,13px)`); `.bx-ledger__unit`, `.bx-ledger__cost-label`, `.bx-finish__origin`, `.bx-cert__fact dt` Manrope 12/17.4; `.barrels-price__note` 12/18; `.bx-finish__notes` EB Garamond **italic** 13.5/19.6 ls 0 | index: `.t-desc` EB Garamond 15/18 ls .75; `.t-text` Manrope 12/16.8: **5 власних начерків «опису» на barrels** + 2 ролі на index |
| Велике число | `.bx-chapter__num` 150/129 (200u); `.bx-ledger__num` 112.5/96.8 (150u); `.bx-cert__price` 87/74.8 (116u); «≈» 47.25/40.6 (0.42em) | `.t-stat` 122.25 (163u); index `.stat__num` 48.75: **5 розмірів «великого числа»** |
| Значення / вартість | `.bx-ledger__cost-num` 25.5/25.5 w500; `.bx-cert__fact dd` 19.5/19.5 w500 | `.t-lead` 30, `.t-chip` 18.75 |

**Між сторінками:**

| Семантика | Розбіжність |
|---|---|
| Навігаційні посилання | шапка: `.t-nav` 10.5/12 w600 **CAPS**; футер: та ж роль `.t-nav`, але `text-transform: none` (footer.css:15) — **221 вузол, 12 сторінок** |
| Ціна на картці / в кнопці | `.t-price` за роллю Manrope 15/15 w400; насправді EB Garamond 15/15 w500 ls .45 CAPS (product-card.css:22, button.css:58; catalog, cocktails, index, product) — 32+ вузлів; найближча `.t-spec` (w600) |
| Підпис поля / фільтра | `.field__label` (feedback), `.select__label` (catalog): EB Garamond 12/16.8 w600 ls .36 **без CAPS** — `.t-btn` у CAPS; ролі «label» немає |
| Значення селекта | `.select__value` Manrope 10.5/10.5 w400 CAPS (ближче `.t-nav`, w600) |
| Юр. текст воріт | `.age-card__legal` Manrope 8.9/13.4 w400 sentence (ближче `.t-breadcrumb` w500 CAPS) |
| Масштаб воріт 18+ | `.t-hero` у воротах 40.82 проти 41.25 на сторінках, `.t-btn`/`.t-text` 11.88 проти 12 (≈−1%: воріт інший розрахунок `--u`) — підозра, варто перевірити окремо |
| Сторонні віджети | contacts: MapLibre-контроли (+/− 19.5 w600, атрибуція Manrope 10.5/14.5 w400, «Щоб змінити масштаб») — 5 власних начерків |
| Невидиме поле | feedback: `.field.visually-hidden input` — Arial 13.33 (UA-шрифт, без `font: inherit`) |

Кластеризація D13 (за h1–h4 і BEM-суфіксом), 1440, HEAD: `__label` — 4 начерки (`.t-btn` / `.t-text` / ≈`.t-btn` без CAPS / `.t-stat-label`); `h1` — 3; `h2` — 3 (`.t-stat-label`-клас у футері, `.t-h2`, `.t-hero`); `h3` — 3 (+ barrels три «поза ролями»); `__text` — 4 (`.t-text`, `.t-desc`, `.t-body`, barrels 13.5/19.6); `__num` — 2; `__lead` — 2.

## (г) Рекомендація: «поточний стиль → роль»

Позначки: **є** — роль існує, потрібна лише заміна класу/видалення оголошень; **Q** — потрібна нова роль або зміна визначення ролі (питання замовнику у формі, візуальна зміна можлива).

| Поточний стиль / селектори | Роль | Статус |
|---|---|---|
| Описи barrels: layer/chapter/cert-list 13.5/19.6; ledger unit/cost-label, finish origin, cert dt 12/17.4; price note 12/18 | `.t-desc` (або `.t-text`, якщо Manrope) — одне рішення на «опис» | **є** (виконавець уже робить для частини); різниця: шрифт/розмір змінюється |
| `.bx-finish__notes` (EB Garamond italic 13.5) | `.t-desc` (italic зникає) | **є**, але курсиву в DS немає — підтвердити |
| `.intro__body`, `.tour-card__body` (ls .60), `.picker__text` (CAPS) | `.t-desc` | **є**; токен `--ls-intro-body` видаляється |
| Footer-посилання `.t-nav` + `text-transform:none`; адреса | `.t-nav` (CAPS як у шапці) **або** нова `.t-nav-footer` | **Q**: футер у CAPS чи ні |
| `.t-price` у картці/кнопці (serif 500) | змінити визначення `.t-price` на serif 500 (токени `--type-price-card-*` → `--type-price-*`), 0 візуальної зміни | **Q** (зміна визначення ролі) |
| `.field__label`, `.select__label` (serif 12/16.8 w600 без CAPS) | нова `.t-label` | **Q** |
| `.field__control`, `.select--light .select__button/option` (Manrope 12 w500) | `.t-text` | **є** |
| `.select__button/__option/__value` (Manrope 10.5 w400 CAPS) | `.t-nav` (w600) або `.t-caption` (12/12 w400 CAPS) | **є**, вибір + незначна зміна розміру/ваги — підтвердити |
| `.stat--compact .stat__num` (48.75) | `.t-stat-compact` — промоція існуючих токенів `--type-stat-compact-*` у роль | **Q** |
| barrels `.bx-chapter__num` 200u, `.bx-ledger__num` 150u, `.bx-cert__price` 116u, «≈» 0.42em | `.t-stat` (163u) для всіх, «≈» — `.t-stat` без зменшення / окремо | **Q**: зведення 3 розмірів до одного змінює дизайн |
| barrels h3: layer 19.5, chapter/ledger/cert 22.5, finish name 21 | одна нова роль малого заголовка `.t-h3` (EB Garamond 600 CAPS ≈ 30u, ls 3%) | **Q** |
| barrels `.hero__title` 88u | `.t-hero` (55u) **або** нова `.t-hero-xl` | **Q** (зменшення H1 на 38%) |
| barrels `.hero__subtitle`, `.barrels-next__lead` (serif 22.5 sentence) | нова `.t-lead-s` (лід у sentence case) | **Q** |
| `.bx-ledger__cost-num` 25.5, `.bx-cert__fact dd` 19.5 | `.t-lead` (30 CAPS) / `.t-chip` (18.75 CAPS) | **є** з видимою різницею — **Q** |
| `.bx-route__point` (serif 15/21 w600) | `.t-kicker` | **є** (збіг за значеннями) |
| `.age-card__legal` 8.9/13.4 w400 | `.t-caption` (12/12 CAPS) — НЕ підходить (CAPS); нова `.t-legal` | **Q** |
| `.acc--product .acc__body strong`, `.product-specs dt` (font-weight bold), `.acc__body` (text-transform:none) | `.t-text` / `.t-spec` | **є** після перевірки |
| contacts: MapLibre-контроли | `.t-caption` / `.t-btn`, glyph +/− — іконка | **Q** (сторонній віджет) |
| design-system.css `.ds-meta`, `.ds-table` | `.t-caption`/`.t-text` (службова сторінка; можна виняток allow.json з рішенням замовника) | **є** |
| Дублі ролей: `.t-stat-label = .t-acc = .t-footer-head`; `.t-kicker = .t-faq`; `.t-body` vs `.t-text` | залишити як семантичні аліаси (один набір токенів) або злити | **Q** (чистка) |

Нові ролі для питання замовнику (мінімум): `.t-label`, `.t-h3`, `.t-lead-s`, `.t-stat-compact`, `.t-legal`, рішення про `.t-hero-xl`, футерний регістр `.t-nav`, визначення `.t-price`.

### Поради щодо S11

- `font: inherit` і `inherit|unset|initial|revert` — дозволені автоматично (4 випадки).
- `font-variant-numeric` — НЕ заборонено (вибір гліфів цифр, не начерк); 2 випадки, лише лічильник.
- `font-size: <em/%>` (оптична поправка гліфа): окремо у звіті як «em-частка»; на HEAD **немає** прямих оголошень — єдиний випадок `--font-size-barrels-ledger-approx: 0.42em` (токен, «≈» біля числа). Пропозиція: НЕ дозволяти за замовчуванням; якщо замовник схвалить зменшений «≈» — оформити роллю/модифікатором, а не винятком.
- `text-transform: none` — окрема категорія «скидання регістру ролі» (4 випадки: accordion.css:21, footer.css:15, select.css:61, :70) — це вже не «наслідування», а перевизначення ролі.
- `line-height` у `footer.css:13-14` (`var(--nav-box-h)` для висоти рядка-боксу) — позиційна поправка, але тримається на тій самій властивості: або `min-height`/`height`, або лишити як виняток з рішенням.

## (д) Обсяг міграції

Що прибирається (HEAD): **97** оголошень (barrels: 46 у 25 селекторах — 24 shorthand `font:` + `letter-spacing`/`text-transform`; select.css 18; field.css 6; contacts.css 4; design-system.css 5; footer 3; age-gate/button/product-card/stat/topic-tile по 2; accordion, acc-product, product, tour-card, sections по 1) і **31** токен: 20 `--font-size-barrels-*`/`--lh-barrels-*`, 2 `--*-age-legal`, `--ls-intro-body`, `--fw-bold`, 5 `--type-stat-compact-*`, 2 `--type-price-card-*` (останні 7 — не видалення, а промоція в ролі). Чисте видалення ≈ 24 токени. У робочому дереві виконавця вже зникло 17 оголошень (barrels/tour-card/sections).

Рівень правок:
1. **Питання замовнику** (форма): 8 пунктів вище; без відповіді нових ролей не створювати (п. 5в).
2. **Haiku (механічно, 0 візуальної дельти):** розставити `.t-*` у розмітці там, де стиль вже збігається (225 «неявних» видів вузлів без класу — інформація D13), видалити оголошення, що дублюють роль.
3. **Sonnet:** спільні компоненти (select, field, topic-tile, footer, product-card, button, stat, accordion) — ризик регресії на багатьох сторінках, перевірка D1/D2/D13 і скрінів; barrels.css (46 → 0) і токени barrels; contacts.css/MapLibre.
4. **Opus не потрібен** — композиція не змінюється; лише якщо замовник схвалить нову ієрархію barrels (три розміри числа/заголовків → ролі).
5. Після міграції: S11 і D13 = 0 (зараз у `npm run qa` вони червоні), D1 лишається для контролю ролей між сторінками.

## Контроль якості інструментів

- Позитивний контроль D13 (копія проєкту, синтетична сторінка лише з ролями): чиста = **0**; +1px розміру абзацу = **1** порушення («роль t-text перевизначена», 12.88→11.88px); +ls 0.1em = **1**; після повернення — знов **0**.
- S11 на HEAD знаходить 128; на робочому дереві 111 (різниця — реальна міграція виконавця).
- Обмеження D13: не бачить `::before/::after content`, `::placeholder`, `<option>`, текст усередині `<svg>`; регістр для ролей без власного `text-transform` порівнюється як «будь-який».

## Додаток: S11 — повний список (HEAD f42e039; файл:рядок, селектор — властивості)

**src/styles/barrels.css** (46)

- barrels.css:25 `.bx-slots` — font
- barrels.css:39 `.hero__title` — font, letter-spacing, text-transform
- barrels.css:40 `.hero__subtitle` — font
- barrels.css:58 `.bx-layer__title` — font, letter-spacing, text-transform
- barrels.css:59 `.bx-layer__text` — font, letter-spacing
- barrels.css:114 `.bx-chapter__num` — font
- barrels.css:115 `.bx-chapter__title` — font, letter-spacing, text-transform
- barrels.css:116 `.bx-chapter__text` — font, letter-spacing
- barrels.css:137 `.bx-ledger__size` — font, letter-spacing, text-transform
- barrels.css:145 `.bx-ledger__num` — font
- barrels.css:146 `.bx-ledger__approx` — font-size
- barrels.css:147 `.bx-ledger__unit` — font, letter-spacing
- barrels.css:156 `.bx-ledger__cost-num` — font
- barrels.css:157 `.bx-ledger__cost-label` — font, letter-spacing
- barrels.css:174 `.barrels-next__lead` — font
- barrels.css:185 `.bx-finish__name` — font, letter-spacing, text-transform
- barrels.css:186 `.bx-finish__origin` — font, letter-spacing
- barrels.css:187 `.bx-finish__notes` — font
- barrels.css:209 `.barrels-price__note` — font, letter-spacing
- barrels.css:214 `.bx-route` — font, letter-spacing
- barrels.css:228 `.bx-cert__title` — font, letter-spacing, text-transform
- barrels.css:229 `.bx-cert__price` — font
- barrels.css:231 `.bx-cert__fact dt` — font, letter-spacing
- barrels.css:232 `.bx-cert__fact dd` — font
- barrels.css:234 `.bx-cert__list` — font, letter-spacing

**src/styles/components/acc-product.css** (1)

- acc-product.css:6 `.acc--product .acc__body strong` — font-weight

**src/styles/components/accordion.css** (1)

- accordion.css:21 `.acc__body` — text-transform

**src/styles/components/age-gate.css** (2)

- age-gate.css:62 `.age-card__legal` — font
- age-gate.css:63 `.age-card__legal` — letter-spacing

**src/styles/components/button.css** (2)

- button.css:58 `.btn .t-price` — font-family, font-weight

**src/styles/components/field.css** (6)

- field.css:6 `.field__label` — font, letter-spacing
- field.css:11 `.field__control` — font, letter-spacing
- field.css:22 `.field__error > span` — font, letter-spacing

**src/styles/components/footer.css** (3)

- footer.css:13 `.site-footer__list` — line-height
- footer.css:14 `.site-footer__list li` — line-height
- footer.css:15 `.site-footer__list .t-nav` — text-transform

**src/styles/components/product-card.css** (2)

- product-card.css:22 `.product-card .t-price` — font-family, font-weight

**src/styles/components/select.css** (18)

- select.css:11 `.select__label` — font, letter-spacing
- select.css:17 `.select__button` — font, letter-spacing, text-transform
- select.css:42 `.select__option` — font, letter-spacing, text-transform
- select.css:45 `.select__option[aria-selected="true"]` — font-weight
- select.css:54 `.select--field .select__label` — font, letter-spacing
- select.css:61 `.select--light .select__button` — font, letter-spacing, text-transform
- select.css:70 `.select--light .select__option` — font, letter-spacing, text-transform
- select.css:71 `.select--light .select__option[aria-selected="true"]` — font-weight

**src/styles/components/stat.css** (2)

- stat.css:6 `.stat--compact .stat__num` — font, letter-spacing

**src/styles/components/topic-tile.css** (2)

- topic-tile.css:10 `.topic-tile` — font, letter-spacing

**src/styles/components/tour-card.css** (1)

- tour-card.css:14 `.tour-card .tour-card__body` — letter-spacing

**src/styles/contacts.css** (4)

- contacts.css:38 `.contacts-map .contacts-map__zoom-group .contacts-map__zoom` — font
- contacts.css:47 `.contacts-map .maplibregl-ctrl.maplibregl-ctrl-attrib` — font, letter-spacing
- contacts.css:54 `.contacts-map .maplibregl-cooperative-gesture-screen` — font

**src/styles/design-system.css** (5)

- design-system.css:9 `.ds-meta` — font, letter-spacing
- design-system.css:95 `.ds-table th, .ds-table td` — font, letter-spacing
- design-system.css:96 `.ds-table th` — font-weight

**src/styles/product.css** (1)

- product.css:95 `.product-specs dt` — font-weight

**src/styles/sections.css** (1)

- sections.css:27 `.intro__body` — letter-spacing

**src/styles/tokens.css** (31)

- tokens.css:42 `:root` — --fw-bold
- tokens.css:89 `:root` — --type-price-card-font, --type-price-card-weight
- tokens.css:671 `:root` — --ls-intro-body
- tokens.css:698 `:root` — --type-stat-compact-font, --type-stat-compact-weight, --type-stat-compact-size, --type-stat-compact-lh, --type-stat-compact-ls
- tokens.css:725 `:root` — --font-size-age-legal
- tokens.css:726 `:root` — --lh-age-legal
- tokens.css:847 `:root` — --font-size-barrels-hero
- tokens.css:848 `:root` — --lh-barrels-hero
- tokens.css:889 `:root` — --font-size-barrels-numeral
- tokens.css:890 `:root` — --lh-barrels-numeral
- tokens.css:891 `:root` — --font-size-barrels-lead
- tokens.css:892 `:root` — --lh-barrels-lead
- tokens.css:893 `:root` — --font-size-barrels-title
- tokens.css:894 `:root` — --font-size-barrels-copy
- tokens.css:895 `:root` — --lh-barrels-copy
- tokens.css:896 `:root` — --font-size-barrels-caption
- tokens.css:897 `:root` — --font-size-barrels-note
- tokens.css:901 `:root` — --lh-barrels-title
- tokens.css:992 `:root` — --font-size-barrels-price-xl
- tokens.css:994 `:root` — --font-size-barrels-fact
- tokens.css:996 `:root` — --lh-barrels-note
- tokens.css:1002 `:root` — --font-size-barrels-ledger-num
- tokens.css:1003 `:root` — --font-size-barrels-ledger-approx
- tokens.css:1007 `:root` — --font-size-barrels-ledger-cost
- tokens.css:1016 `:root` — --font-size-barrels-layer-title
- tokens.css:1024 `:root` — --font-size-barrels-finish-name

