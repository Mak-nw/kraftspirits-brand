# verify-D: незалежна перевірка кошика, оформлення, кабінету (HEAD b5be278 + робоче дерево)

Метод: власний dev (5345), копія HEAD (5346), збірка `BASE_PATH=/kraftspirits-brand/` + preview (5348); puppeteer, 1200/1440/1728/1920, classic і none. Код проєкту не чіпав. Процеси зупинено за портом власних серверів.

## Вердикт: FIX (1 серйозний функціональний дефект, кілька середніх/дрібних)

| Пункт | Вердикт | Доказ |
|---|---|---|
| 1. Стани cart (5), checkout (error/thanks/empty/demo), account (20 станів) | PASS | усі 34 URL: HTTP 200, консоль/pageerror/4xx 0, hscroll 0 |
| 1. Повний сценарій товар → кошик → оформлення → подяка | **FIX** | після реального замовлення кошик знову містить 3 демо-позиції, лічильник «Кошик ( 4 )» (див. D1) |
| 1. Вхід/вихід, відстеження, архів | PASS | порожні поля → помилки; будь-який логін/пароль → кабінет; «Вийти» чистить сесію; 6 замовлень (4+2, `&page=2`), статуси, перегляд; відстеження №+e-mail → таймлайн 6 кроків; ТТН `novaposhta.ua/tracking/?cargo_number=…`, `target=_blank rel=noopener`; скасоване без ТТН |
| 2. Відповідність WC-специфікації | PASS з ризиками | таблиця нижче |
| 3. Нових візуальних елементів немає | PASS | `woocommerce.css` 137 рядків: лише hairline-рядки токенами, `::after` clearfix (невидимий), фон-ромби = існуючий візерунок каталогу; ромб у помилці = `.field__error > span::before` (field.css:23), описаний у design-system.html (рядок 1052); виняток allow.json для WC немає; S1–S11 = 0 |
| 3. Сітка | PASS | кошик 1–8/9–12, оформлення 1–7/8–12, подяка 1–8/9–12, вхід 1–6/7–12, кабінет 1–3/4–12; похибка ≤0.06px на 4 ширинах × classic/none; D12 = 0 |
| 3. Ролі `.t-*` (S11/D13), контраст (D8/D14) на цих сторінках | PASS | 0 порушень на cart/checkout/account |
| 3. Стани кнопок | PASS | «Переглянути», «Наступні», «Попередні», «Застосувати купон» = еталон `.contacts-panel .btn--outline` (default/hover/active/focus однакові); ± кількості (arrow-btn) hover/active/focus з токенів; disabled «Оновити кошик» opacity .4; `qa:states` 0 |
| 4. CLS checkout | **FIX (дрібно)** | збірка, холодні, ширина 1920 / cpu×1: [0,0,0,0,0.0911]; 1440: [0.0604,0,0,0,0]; cpu×4 1440: [0.0604,0,0.0604,0.0604,0]; 1920 cpu×4: 4 з 5 = 0.0911. Медіана 0 (cpu×1) / 0.06–0.09 (cpu×4); макс 0.0911. Поріг 0.1 проходить, поріг qa:cls за замовчуванням 0.01 — ні. Джерело: рядок «Доставка» (`tfoot` 307→349px) — порожній `<p data-wc-shipping-note>` наповнює JS після paint. Найменша правка: текст за замовчуванням у розмітці + `min-height` на 2 рядки для цього `<p>` (у копії не перевіряв). Решта: cart ≤0.0005, account ≤0.0005, thanks 0…0.066 (1 з 5 на 1920) |
| 4. hscroll product@1200 (`.site-header__logo--yc` 3832) | не відтворено | на HEAD і робочому дереві, dev і збірка, classic/none, dpr 1/2, ворота/без воріт: scrollWidth=clientWidth=136/138. `qa:hscroll` 23 сторінки × 8 комбінацій = 0 |
| 4. Tab-порядок | PASS | cart: ×, назва, −, qty, +, … , купон, «Застосувати», «Перейти»; checkout: поля → селекти → коментар → доставка → оплата → згоди → submit; account: меню → вміст; прихованих зупинок 0 (радіо — одна зупинка на групу, штатно) |
| 4. Доступність | PASS з дефектами | label/for і aria-required є на всіх input; після помилки фокус на першому полі, посилання в переліку переводить фокус; notice `role=alert`; поля помилок `role=alert`. Дефект D3 (селекти) |
| 5. qa:check-ds повний | FIX (не від цих сторінок) | 13 → після повтору лишилося D14 «700 мл» на product?id=gin-yasnyi (мін. 2.12:1, 4 ширини × 2 смуги); відтворюється і на a770d9d (до кошика/кабінету). D2 і D8 faq на 1920 — флейк під навантаженням, при повторі 0. D15 = 0, D12 = 0 |
| 5. qa:links | PASS | 1150 посилань, 0; у футері посилань на cart/account немає (є лише в header) |
| 5. build BASE_PATH=/kraftspirits-brand/ | PASS | збірка 0.4с; шляхи з базою, фон `catalog-pattern-diamond.svg` з базою |
| 5. Позитивні контролі | PASS | (1) `#ff0000` і `3px double #c00` у woocommerce.css → check-ds S1 ловить 2; (2) прибрано `aria-required` → мій a11y-аудит 3 → 7 проблем на checkout (check-ds цього НЕ ловить); (3) `id="place_order"` → `place_ord` → мій DOM-перелік «missing #place_order» (check-ds НЕ ловить) |

## Відповідність WC: очікується → є (ключове)
Є: `.woocommerce`, `.woocommerce-notices-wrapper`, `form.woocommerce-cart-form`, `table.shop_table.cart`, `tr.cart_item`, `a.remove`, `.quantity input.qty[name=cart[i][qty]]`, `input#coupon_code[name=coupon_code]`, `apply_coupon`, `update_cart`, `.cart-collaterals .cart_totals`, `.wc-proceed-to-checkout a.checkout-button`, `form.checkout[name=checkout]`, `#customer_details .col-1/.col-2`, `.woocommerce-billing-fields`, `#order_review`, `table.woocommerce-checkout-review-order-table`, `#payment`, `ul.wc_payment_methods`, `#place_order`, `billing_first_name/last_name/phone/email/state/city/address_1`, `order_comments`, `shipping_method[0]`, `payment_method`, `terms`, `.woocommerce-order-overview__*`, `form.woocommerce-form-login.login` (`username`, `password`, `rememberme`, `login`), `form.woocommerce-ResetPassword` (`user_login`), `.woocommerce-MyAccount-navigation(-link)`, `.woocommerce-MyAccount-content`, `table.woocommerce-orders-table…`, `.woocommerce-pagination`, `form.track_order` (`orderid`, `order_email`, `track`), `form.woocommerce-EditAccountForm`.
Відхилення (ризик для розробника):
- Реєстрація: поля `reg_email`/`reg_password` замість `email`/`password` (`username` немає) — СЕРЕДНІЙ: обробник WC читає `$_POST['email']`.
- Вхід і реєстрація — окремі екрани, немає `#customer_login.u-columns.col2-set`, `input.woocommerce-Input` — низький/середній (шаблон form-login.php доведеться перекроїти).
- Селекти НП: кнопка з `id=billing_state` + прихований `input[name]`, не `<select>`; `billing_country`, `postcode`, `ship-to-different-address` відсутні — СЕРЕДНІЙ: `checkout.js` WC і плагіни НП очікують `select#billing_state`.
- h2 замість h3 (`#order_review_heading`, заголовки блоків) — низький (CSS WC на h3 не діє); нонси (`woocommerce-*-nonce`, `_wpnonce`) відсутні — очікувано для статики.
- `mark.order-number` у перегляді замовлення, `account_display_name` у даних акаунта, `.woocommerce-address-fields__field-wrapper`, `input[name=action]` відсутні — низький/середній (`account_display_name` обов'язкове поле WC).
- Додатково: кабінет без `li.is-active` (є `aria-current`) — низький.

## Дефекти за серйозністю
1. **D1 (серйозний, функціональний)**: `wc-common.js` `seedDemoIfNeeded()` — `DEMO_STATES` містить `thanks`; після `writeCart([])` на сторінці подяки кошик порожній → автозасів демо-позицій (gin ×2, calvados, whiskey). Наслідок: після справжнього замовлення «Кошик ( 4 )», `ks_cart` повний, це видно й на cart.html. Відтворення: товар → оформлення → submit → `localStorage.ks_cart`. Найменша правка: не засівати для `state=thanks`, якщо є `ks_order` у sessionStorage (або без `?demo`).
2. D2 (середній): CLS checkout 0.06–0.09 (див. вище), порушує поріг qa:cls 0.01.
3. D3 (середній, a11y): кнопки-селекти (область/місто/відділення) без `aria-required` і `aria-describedby` на рядок помилки; зірочка `*` у назві не `aria-hidden`.
4. D4 (дрібний): `account.html?state=order-view&order=99999` мовчки показує №10427 замість «не знайдено».
5. D5 (дрібний): кошик — панелі однакової висоти (stretch), у середині ~300px порожнього місця в обох панелях; «×» видалення малопомітний.
6. D6 (дрібний): у thanks адреса «м. Київ, Київ, Відділення №1» (дубль, демо-довідник).
7. Поза обсягом, але червоне: D14 product «700 мл» (існувало до цих правок).

## Нові візуальні елементи (0 без погодження)
Не знайдено. Перевірено: border/outline/box-shadow/mask/filter/transform/gradient/::before/::after/@keyframes у woocommerce.css, nav.css (+1 правило: selected для `aria-current` — наявні токени `--btn-*-selected`), tokens.css (+ `--span-wc-*`, `--size-wc-thumb-h`, `--size-wc-qty-w` — розкладка, не візуальні значення). `.cocktail__steps` перевикористано для таймлайну, `.contact-form__alert`/`.contact-success` для нотисів.

## Повторно використано / дублі
`.contacts-panel`, `.btn--green/--outline`, `.field`, `.select--light.select--field`, `.check`, `.arrow-btn`, `.nav-cell--outline.nav-cell--block`, `.cocktail__steps`. Паралельних родин класів не знайдено (`wc-*` — лише розкладка/обгортки). Дубль правила: фон сторінки (ромби) повторює product.css для трьох body-класів.

## Демо-дані (вигадані)
Купон DEMO10 (−10%), поріг безкоштовної доставки 3000 ₴, способи оплати (картка, реквізити; перелік в оферті не затверджено), довідник НП (області/міста/відділення), 6 замовлень №10431…10244 з датами, статусами, нотатками, ТТН 2045…, користувач Олена Коваленко / olena@example.com, будь-який логін/пароль для входу, лист відновлення пароля й реєстрація (імітація).

## Візуально (1440/1920)
Кошик: бежева панель таблиці 8 колонок і панель підсумку 4 на зеленому ромбовому фоні; рядки — hairline, стрілки кількості кільцями, кнопка «Перейти» внизу підсумку. Оформлення: форма 7 колонок, помилки списком у рамці та під полями з ромбом; праворуч замовлення й оплата. Кабінет: стопка кнопок-меню зліва, поточна — світла заливка; панель вмісту з таблицею, таймлайном 1–6, ТТН і зеленою кнопкою. Найслабше: порожнини в стретч-панелях кошика/замовлень; дрібне «×»; щільний перелік помилок у рамці.

## Не перевірено
Safari/Firefox, тач, справжній hover, екранні читачі, поведінка на WP з реальними шаблонами, ширини поза 1200–1920, `qa:ink`, `qa:arch`, правка CLS у копії, робоче дерево містило чужі незакомічені зміни (design-system.html, feedback.html, cocktails.css).
