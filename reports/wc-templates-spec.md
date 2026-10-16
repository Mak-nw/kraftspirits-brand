# Специфікація WooCommerce-шаблонів: «Мій кабінет», «Кошик», «Оформлення замовлення»

Мета: зверстати три сторінки «як стандартні шаблони WooCommerce» (лише вигляд, без адмінки), щоб розробник потім підставив справжні шаблони/шорткоди. Із кастомного — лише колір (за вимогою замовника), решта — стандартна структура WooCommerce.

Джерела (офіційні, перевірені під час підготовки):
- Шаблони плагіна (GitHub, гілка trunk): `https://github.com/woocommerce/woocommerce/tree/trunk/plugins/woocommerce/templates` — `myaccount/*.php`, `order/*.php`, `cart/*.php`, `checkout/*.php`, `notices/*.php`; функція полів — `plugins/woocommerce/includes/wc-template-functions.php` (`woocommerce_form_field`), поля — `includes/class-wc-checkout.php`, `class-wc-countries.php`.
- Перевизначення шаблонів: https://developer.woocommerce.com/docs/theming/theme-development/template-structure/ (також https://developer.woocommerce.com/docs/template-structure-overriding-templates-via-a-theme/)
- Класична тема: https://developer.woocommerce.com/docs/theming/theme-development/classic-theme-developer-handbook/
- Шорткоди сторінок: https://woocommerce.com/document/woocommerce-shortcodes/page-shortcodes
- Блоки Cart/Checkout як типові (8.3): https://developer.woocommerce.com/2023/08/18/cart-and-checkout-blocks-becoming-the-default-experience/ ; статус: https://woo.com/document/cart-checkout-blocks-status/
- Стилі блоків і застереження про внутрішні класи: https://developer.woocommerce.com/docs/theming/block-theme-development/css-styling/ , https://developer.woocommerce.com/docs/theming/block-theme-development/cart-and-checkout/
- Nova Poshta плагіни: https://wordpress.org/plugins/catcode-delivery-with-nova-poshta-for-woocommerce , https://fair.pm/packages/plugins/wc-ukr-shipping/ , https://en-za.wordpress.org/plugins/shipping-nova-poshta-for-woocommerce/

Позначки достовірності: **[T]** — прочитано в коді шаблону trunk; **[D]** — з офіційної документації; **[M]** — із знань про поведінку WooCommerce JS/ядра, у цій сесії дослівно не звірено (розробнику звірити з його версією WooCommerce).

---

## 1. Сторінка → шаблони → DOM/класи → поля й дії

Загальний обгортальний контейнер усіх сторінок — `<div class="woocommerce">` (шорткод) [M]. Нотиси над вмістом: `<div class="woocommerce-notices-wrapper">` [M].

### 1.1 Мій кабінет — гість (логін / реєстрація / забули пароль)

| Шаблон | Обов'язкові елементи DOM / класи | Поля й дії |
|---|---|---|
| `myaccount/form-login.php` [T] | `div#customer_login.u-columns.col2-set` > `div.u-column1.col-1` (Вхід) і `div.u-column2.col-2` (Реєстрація; лише якщо реєстрація ввімкнена). Форма входу: `form.woocommerce-form.woocommerce-form-login.login`; рядок поля: `p.woocommerce-form-row.woocommerce-form-row--wide.form-row.form-row-wide` > `label[for]` + `input.woocommerce-Input.woocommerce-Input--text.input-text`; чекбокс «Запам'ятати мене»: `label.woocommerce-form__label.woocommerce-form__label-for-checkbox.woocommerce-form-login__rememberme` > `input.woocommerce-form__input.woocommerce-form__input-checkbox` + `span`; кнопка: `button.woocommerce-button.button.woocommerce-form-login__submit[name=login]`; посилання: `p.woocommerce-LostPassword.lost_password > a` | `username` (логін або e-mail, обов'язково), `password` (обов'язково), `rememberme`, nonce `woocommerce-login-nonce`. Дії: Увійти, «Забули пароль?», перемикання на реєстрацію |
| `myaccount/form-login.php` (праве вікно) [T] | `form.woocommerce-form.woocommerce-form-register.register`; `button.woocommerce-Button.woocommerce-button.button.woocommerce-form-register__submit[name=register]` | `email` (завжди), `username` (якщо не авто-генерація), `password` (якщо не авто-генерація; інакше `<p>` «Посилання для встановлення пароля буде надіслано на e-mail»), nonce `woocommerce-register-nonce` |
| `myaccount/form-lost-password.php` [T] | `form.woocommerce-ResetPassword.lost_reset_password`; `p.woocommerce-form-row.woocommerce-form-row--first.form-row.form-row-first`; `button.woocommerce-Button.button` | `user_login` (логін/e-mail), hidden `wc_reset_password`, nonce. Далі: `lost-password/lost-password-confirmation` (нотис «лист надіслано») і `form-reset-password.php` (`password_1`, `password_2`) |

Помилка входу/реєстрації виводиться як `ul.woocommerce-error[role=alert] > li` над формою [T notices/error.php].

### 1.2 Мій кабінет — авторизований

| Шаблон | Обов'язкові елементи DOM / класи | Поля й дії |
|---|---|---|
| `myaccount/my-account.php` [T] | Двоє дітей: `nav.woocommerce-MyAccount-navigation` і `div.woocommerce-MyAccount-content` (макет «меню зліва + вміст» створює тема CSS, у ядрі це float/ширини 30%/68%) | — |
| `myaccount/navigation.php` [T] | `nav.woocommerce-MyAccount-navigation > ul > li.woocommerce-MyAccount-navigation-link.woocommerce-MyAccount-navigation-link--{endpoint}[.is-active] > a[aria-current=page]` | Типові ендпоінти [M]: `dashboard`, `orders`, `downloads` (лише для цифрових), `edit-address`, `edit-account`, `customer-logout`. Решту додають плагіни через `woocommerce_account_menu_items` |
| `myaccount/dashboard.php` [T] | Два «голі» `<p>` без класів: вітання з посиланням «Вийти» та підказка з посиланнями на замовлення/адреси/дані | Лише посилання |
| `myaccount/orders.php` (архів замовлень) [T] | `table.woocommerce-orders-table.woocommerce-MyAccount-orders.shop_table.shop_table_responsive.my_account_orders.account-orders-table`; `th.woocommerce-orders-table__header.woocommerce-orders-table__header-{order-number\|order-date\|order-status\|order-total\|order-actions}`; рядок `tr.woocommerce-orders-table__row.woocommerce-orders-table__row--status-{processing\|completed\|...}.order`; комірки `.woocommerce-orders-table__cell.woocommerce-orders-table__cell-{колонка}[data-title]`; номер — `th[scope=row] > a`; дата — `time[datetime]`; дії — `a.woocommerce-button.button.{view\|pay\|cancel}`; пагінація `div.woocommerce-pagination.woocommerce-pagination--without-numbers.woocommerce-Pagination` з `a.woocommerce-button--previous/--next.button` | Колонки: №, Дата, Статус, Сума («X за N товар(ів)»), Дії (Переглянути; Сплатити/Скасувати за станом). **Порожньо:** `div.woocommerce-message.woocommerce-message--info.woocommerce-Message.woocommerce-Message--info.woocommerce-info` або `.notice` з текстом «Замовлень ще немає» + `a.woocommerce-Button.wc-forward.button` «До магазину» [T] |
| `myaccount/view-order.php` [T] | `p` з `mark.order-number`, `mark.order-date`, `mark.order-status`; нотатки: `h2` + `ol.woocommerce-OrderUpdates.commentlist.notes > li.woocommerce-OrderUpdate.comment.note > div.woocommerce-OrderUpdate-inner.comment_container > div.woocommerce-OrderUpdate-text.comment-text > p.woocommerce-OrderUpdate-meta.meta + div.woocommerce-OrderUpdate-description.description`; далі хук `woocommerce_view_order` підключає `order/order-details.php` і `order-details-customer.php` | Лише перегляд, кнопки дій (Сплатити/Скасувати/Замовити знову) |
| `order/order-details.php` [T] | `section.woocommerce-order-details > h2.woocommerce-order-details__title + table.woocommerce-table.woocommerce-table--order-details.shop_table.order_details`; `thead th.woocommerce-table__product-name.product-name / th.woocommerce-table__product-table.product-total`; `tbody tr.woocommerce-table__line-item.order_item` (з `order-details-item.php`); `tfoot tr > th[scope=row] + td` (Підсумок, Доставка, Оплата, Разом); примітка клієнта; рядок дій `th.order-actions--heading`, `a.woocommerce-button.button.order-actions-button` | Лише перегляд |
| `order/order-details-customer.php` [T] | `section.woocommerce-customer-details`; дві колонки `section.woocommerce-columns.woocommerce-columns--2.woocommerce-columns--addresses.col2-set.addresses` > `div.woocommerce-column.woocommerce-column--1.woocommerce-column--billing-address.col-1` / `--shipping-address.col-2` > `h2.woocommerce-column__title` + `address` > `p.woocommerce-customer-details--phone` / `--email` | Лише перегляд |
| `myaccount/my-address.php` [T] | `div.u-columns.woocommerce-Addresses.col2-set.addresses` > `div.u-column1.col-1.woocommerce-Address` (+ `u-column2 col-2`) > `header.woocommerce-Address-title.title > h2 + a.edit` ; `address` (або «Адресу ще не вказано») | Дія: «Редагувати/Додати» адресу → `form-edit-address.php` (ті самі `woocommerce_form_field`, що в checkout; кнопка `button.button[name=save_address]`) |
| `myaccount/form-edit-account.php` [T] | `form.woocommerce-EditAccountForm.edit-account`; рядки `p.woocommerce-form-row.woocommerce-form-row--first/--last/--wide.form-row.form-row-first/-last/-wide`; `fieldset > legend` «Зміна пароля»; `button.woocommerce-Button.button[name=save_account_details]`; `<div class="clear">` після пар | `account_first_name`, `account_last_name`, `account_display_name` (+ опис `span#account_display_name_description > em`), `account_email`, `password_current`, `password_1`, `password_2`, hidden `action`, nonce `save-account-details-nonce`. Усі окрім паролів обов'язкові (`aria-required`) |

### 1.3 Відстеження замовлення

| Шаблон | Елементи | Поля й дії |
|---|---|---|
| `order/form-tracking.php` [T] | `form.woocommerce-form.woocommerce-form-track-order.track_order`; вступний `<p>`; `p.form-row.form-row-first` (`label[for=orderid]` + `input.input-text#orderid`) і `p.form-row.form-row-last` (`input.input-text#order_email`), `div.clear`, `p.form-row > button.button[name=track]`, hidden nonce `woocommerce-order-tracking-nonce` | `orderid` (№ замовлення з листа-підтвердження), `order_email` (billing e-mail). Шорткод: `[woocommerce_order_tracking]` [D] |
| `order/tracking.php` (результат) [T] | `p.order-info > mark.order-number + mark.order-date + mark.order-status`; за наявності нотаток: `h2` + `ol.commentlist.notes > li.comment.note > div.comment_container > div.comment-text > p.meta + div.description`; нижче ядро виводить `order/order-details.php` і `order-details-customer.php` | Результат: «Замовлення №… створено … і зараз має статус …». Помилка (невірний №/e-mail): `ul.woocommerce-error` над формою: «Не вдалося знайти замовлення з такими даними» [M] |

Важливо: у ядрі **немає** відстеження посилки перевізника (ТТН Нової пошти). `[woocommerce_order_tracking]` показує лише статус замовлення в магазині та нотатки. ТТН з'являється в «Order updates» як нотатка клієнту, якщо плагін доставки її туди пише [M].

### 1.4 Кошик

| Шаблон | Елементи | Поля й дії |
|---|---|---|
| `cart/cart.php` [T] | `form.woocommerce-cart-form` > `table.shop_table.shop_table_responsive.cart.woocommerce-cart-form__contents`; `thead th.product-remove / .product-thumbnail / .product-name / .product-price / .product-quantity / .product-subtotal`; `tr.woocommerce-cart-form__cart-item.cart_item`; `td.product-remove > a.remove[role=button]` (×); `td.product-thumbnail > a > img`; `td.product-name[data-title] > a`; `td.product-price`; `td.product-quantity > .quantity > input.input-text.qty.text[name="cart[key][qty]"]`; `td.product-subtotal`; останній рядок `td.actions[colspan=6]` > `div.coupon` (`label.screen-reader-text`, `input#coupon_code.input-text[name=coupon_code]`, `button.button[name=apply_coupon]`) + `button.button[name=update_cart]`; nonce `woocommerce-cart-nonce` | Кількість (мін/макс/крок), видалення рядка, купон, «Оновити кошик» (у нових версіях `disabled aria-disabled=true`, поки не змінено кількість [M]), `p.backorder_notification`, мета-дані варіації `dl.variation` [M] |
| `cart/cart-totals.php` [T] | `div.cart-collaterals` > `div.cart_totals[.calculated_shipping]` > `h2` + `table.shop_table.shop_table_responsive` з рядками `tr.cart-subtotal`, `tr.cart-discount.coupon-{код}`, `tr.shipping` (`ul#shipping_method`, калькулятор `.shipping-calculator-button`/`form.woocommerce-shipping-calculator`), `tr.fee`, `tr.tax-rate`/`tr.tax-total`, `tr.order-total`; кнопка `div.wc-proceed-to-checkout > a.checkout-button.button.alt.wc-forward` | Підсумок, купон, доставка, «Перейти до оформлення» |
| `cart/cart-empty.php` [T] | Текст `p.cart-empty.woocommerce-info` «Ваш кошик порожній.» (з `wc-empty-cart-message`, [M]) + `p.return-to-shop > a.button.wc-backward` | Одна дія: «Повернутися до магазину» |
| `cart/cross-sells.php` [M] | `div.cross-sells` — за потреби, у нас не показуємо | — |

### 1.5 Оформлення замовлення

| Шаблон | Елементи | Поля й дії |
|---|---|---|
| `checkout/form-checkout.php` [T] | `form.checkout.woocommerce-checkout[name=checkout]` > `div#customer_details.col2-set` > `div.col-1` (billing) + `div.col-2` (shipping/нотатки); `h3#order_review_heading`; `div#order_review.woocommerce-checkout-review-order`. До форми: `form-login.php` (`div.woocommerce-form-login-toggle`, `a.showlogin`) та `form-coupon.php` (`div.woocommerce-form-coupon-toggle > div.woocommerce-info > a.showcoupon`; `form.checkout_coupon.woocommerce-form-coupon#woocommerce-checkout-form-coupon` приховано `display:none`; `p.form-row.form-row-first` input `#coupon_code`; `p.form-row.form-row-last` кнопка `button.button[name=apply_coupon]`) [T] | Гість-«логін» всередині checkout, купон, дані клієнта, замовлення, оплата |
| `checkout/form-billing.php` [T] | `div.woocommerce-billing-fields` > `h3` («Платіжні дані»/«Дані для оплати й доставки») + `div.woocommerce-billing-fields__field-wrapper` (поля); опціонально `div.woocommerce-account-fields` > `p.form-row.form-row-wide.create-account` (`label.woocommerce-form__label-for-checkbox.checkbox > input#createaccount`) + `div.create-account` (`account_password`) | Поля див. розділ 5 |
| `checkout/form-shipping.php` [T] | `div.woocommerce-shipping-fields` > `h3#ship-to-different-address > label.checkbox > input#ship-to-different-address-checkbox[name=ship_to_different_address]` + `div.shipping_address` > `div.woocommerce-shipping-fields__field-wrapper`; далі `div.woocommerce-additional-fields` > `h3` «Додаткова інформація» + `div.woocommerce-additional-fields__field-wrapper` (`order_comments`, textarea `.input-text`, `rows=2`) | Чекбокс «Доставити за іншою адресою», нотатки до замовлення |
| `checkout/review-order.php` [T] | `table.shop_table.woocommerce-checkout-review-order-table` (`thead th.product-name/.product-total`; `tbody tr.cart_item > td.product-name (+ strong.product-quantity ×N) / td.product-total`; `tfoot`: `tr.cart-subtotal`, `tr.cart-discount.coupon-*`, блок доставки `tr.woocommerce-shipping-totals.shipping`, `tr.fee`, `tr.tax-rate`/`tax-total`, `tr.order-total`) | Оновлюється AJAX при зміні полів |
| `checkout/payment.php` [T] | `div#payment.woocommerce-checkout-payment` > `ul.wc_payment_methods.payment_methods.methods` > `li.wc_payment_method.payment_method_{id}` (`checkout/payment-method.php`: `input#payment_method_{id}.input-radio[name=payment_method]` + `label[for]` + `div.payment_box.payment_method_{id}` приховано, якщо не вибрано) ; `div.form-row.place-order` > `noscript > button.button.alt[name=woocommerce_checkout_update_totals]` + `div.woocommerce-terms-and-conditions-wrapper` (`p.form-row.validate-required > label.woocommerce-form__label-for-checkbox.checkbox > input#terms[name=terms] + span.woocommerce-terms-and-conditions-checkbox-text + abbr.required`; privacy-текст `p.woocommerce-privacy-policy-text`) + `button#place_order.button.alt[name=woocommerce_checkout_place_order]` + hidden nonce `woocommerce-process-checkout-nonce`. Порожній список: `li.woocommerce-notice.woocommerce-notice--info.woocommerce-info` | Вибір оплати, згода з умовами, «Підтвердити замовлення» |
| `checkout/thankyou.php` [T] | `div.woocommerce-order` > успіх: `p.woocommerce-notice.woocommerce-notice--success.woocommerce-thankyou-order-received` + `ul.woocommerce-order-overview.woocommerce-thankyou-order-details.order_details > li.woocommerce-order-overview__order.order / __date.date / __email.email / __total.total / __payment-method.method` (в кожному `strong`); далі `order/order-details.php` та `order-details-customer.php`; помилка оплати: `p.woocommerce-notice.woocommerce-notice--error.woocommerce-thankyou-order-failed` + `p.woocommerce-thankyou-order-failed-actions > a.button.pay` (+ «Мій кабінет»). Без замовлення: `order-received.php` («Дякуємо, замовлення отримано.») | Лише перегляд, кнопки «Оплатити» / «Мій кабінет» |

### 1.6 Нотиси й поля (спільні)

- Нотиси [T]: успіх `div.woocommerce-message[role=alert]`; помилка `ul.woocommerce-error[role=alert] > li`; інфо `div.woocommerce-info[role=status]`. У checkout AJAX-помилки йдуть у `div.woocommerce-NoticeGroup.woocommerce-NoticeGroup-checkout` вгорі форми [M]. Нотис «Товар додано до кошика» містить `a.button.wc-forward` [M].
- Поле `woocommerce_form_field()` [T]: `p.form-row.{form-row-first|form-row-last|form-row-wide}[.address-field][.validate-required][.validate-email][.validate-phone][.woocommerce-validated|.woocommerce-invalid.woocommerce-invalid-required-field]#{id}_field[data-priority]` > `label.{класи}[for]` (текст + `&nbsp;<span class="required" aria-hidden="true">*</span>` або `<span class="optional">(необов'язково)</span>`) + `span.woocommerce-input-wrapper` > `input.input-text` | `select.select` | `select.country_select` | `select.state_select` | `textarea.input-text` | `label.checkbox > input.input-checkbox` | `input.input-radio + label.radio`. Опис — `span.description#{id}-description`. Класи `woocommerce-validated/invalid` ставить JS (checkout.js) на blur/зміну [M].
- JS-залежності [M]: `select2`/`selectWoo` обгортає `select.country_select`, `select.state_select` і (за налаштуванням) інші `select` — створює `span.select2.select2-container`, випадний список `span.select2-dropdown` у `<body>` (стилізується глобально, не всередині `.woocommerce`), `.select2-selection--single`, `.select2-results__option`, `.select2-search__field`; `blockUI` додає `div.blockUI.blockOverlay` та клас `.processing` на форму/блок під час AJAX; `jquery-payment` для карток; `wc-cart.js` оновлює `.woocommerce-cart-form` й `.cart_totals` через AJAX (`wc_fragments`, `.blockUI`); `checkout.js` шле `update_order_review` при зміні поля з класом `.update_totals_on_change`, оновлює `#order_review`, `#payment`; `wc-add-to-cart`, `cart-fragments` оновлюють міні-кошик.

---

## 2. Рекомендований підхід

### 2.1 Класичні шаблони/шорткоди чи блоки

| Сторінка | Що актуальне зараз | Що ймовірніше обере розробник |
|---|---|---|
| Мій кабінет | **Блокової версії My Account немає** [D: «currently there is not a block based alternative»]. Лише `[woocommerce_my_account]` і `[woocommerce_order_tracking]` + шаблони `myaccount/*.php`, `order/*.php` | Класичні шаблони. Варіантів немає |
| Кошик | З WooCommerce 8.3 блок Cart — типовий для нових магазинів [D]; шорткод `[woocommerce_cart]` і `cart/*.php` лишаються підтримуваними | Залежить від теми: у класичній темі (наш Vite-фронт → HTML/CSS-тема, швидше за все класична PHP-тема) — шорткод; у block-темі (FSE) — блок |
| Оформлення | Те саме: блок Checkout типовий [D]; шорткод `[woocommerce_checkout]` підтримується «для магазинів із кастомізованим checkout та специфічними потребами» [D] | Для України (Нова пошта, LiqPay/Monobank, свої поля) частіше класичний шорткод: більшість українських плагінів доставки спершу працюють саме в ньому; блоковий checkout явно підтримує лише частина (CatCode — так; WC Ukraine Shipping — «не підтримує checkout blocks» за FAQ плагіна) |

**Висновок для нас.** Верстаємо **класичну структуру** (розділ 1): вона (а) є єдиною для Мого кабінету та відстеження, (б) стабільно описана класами `woocommerce-*` у відкритому коді, (в) дає розробнику найпростіший шлях: або взяти шаблони як є (`woocommerce/` у темі), або підключити наш CSS до шорткодів. Блокові Cart/Checkout мають власні класи `wc-block-components-*`, які офіційні документи **не радять** вказувати напряму («internal block markup is private and may change») [D], а кнопка блока `.wc-block-components-button` не має класу `.button` і не успадковує стилі теми [D]. Якщо розробник обере блоки — нашу верстку кошика/оформлення доведеться переписати на селектори `wc-block-*` або на глобальні стилі (`theme.json`), це окрема робота. Питання розробнику: «Класична тема чи block-тема? Нова пошта/оплата — який плагін і чи є в нього підтримка Checkout Block?»

### 2.2 Як тема перекриває шаблони

- Копіюється файл із `plugins/woocommerce/templates/…` у `wp-content/themes/<тема>/woocommerce/…` із тим самим шляхом без `templates/` [D]. Тема має оголосити `add_theme_support('woocommerce')` (хук `after_setup_theme`) [D].
- Версія шаблону у шапці файлу (`@version`) порівнюється зі статусом системи: застарілий override помічається в WooCommerce → System Status [D].
- Не вилучати виклики `do_action(...)`: на них навішуються плагіни (Нова пошта, оплата, купони) [D].
- Якщо в темі є `woocommerce.php`, `woocommerce/archive-product.php` не спрацює [D] (не стосується наших трьох сторінок).
- Для block-тем перекриття — файлами `templates/*.html` і `parts/`, не PHP [D].

### 2.3 Що можна кастомізувати без правок логіки

1. **CSS-змінні/токени**: усі кольори, шрифти, відступи беруться з `tokens.css`; різні сторінки/бренди — через теми `.theme-*` (як у lp). Це і є «лише змінити колір».
2. **CSS-класи** `woocommerce-*` (розділ 1) — стабільні 10+ років, публічний контракт шаблонів.
3. **Хуки** (`woocommerce_*` actions/filters): зміна тексту кнопок, порядку полів (`woocommerce_checkout_fields`, `priority`), додаткових класів (`class`, `input_class`, `label_class`), вимкнення полів (`woocommerce_enable_order_notes_field`), клас кнопок теми через `wc_wp_theme_get_element_class_name('button')` (додає наш `.btn` до `button.button` без перевизначення шаблонів [T: `[theme-button-class]`]).
4. **Налаштування WooCommerce** (WooCommerce → Налаштування → Акаунти й конфіденційність): реєстрація, авто-генерація логіна/пароля, купони, примітки.

Чого не можна/не варто: видаляти хуки з шаблонів; міняти назви полів форм (`billing_*`, `username`, `password`, `orderid`, `order_email`, `coupon_code`, `cart[..][qty]`) — на них спирається обробка POST/AJAX; прибирати `#order_review`, `#payment`, `#place_order`, `.woocommerce-checkout-review-order-table`, `.cart_totals`, `.woocommerce-cart-form`, `.woocommerce-notices-wrapper` — JS шукає їх за id/класом; ховати поля через `display:none` для обов'язкових полів (валідація впаде); переписувати AJAX-кнопки на ссилки; стилізувати внутрішню розмітку `select2` без урахування, що випадний список виводиться в `<body>`.

### 2.4 Відображення класів WooCommerce на компоненти дизайн-системи (без нових візуальних елементів)

Реалізація: окремий файл `src/styles/woocommerce.css` (скоуп `.woocommerce …` або `body.woocommerce-page`), який **лише застосовує токени/правила наявних компонентів** до класів WooCommerce. Кожне `@apply`-подібне зіставлення робиться селектором, що ділить декларації з компонентом (без нових кольорів/розмірів). Для кнопок, полів, чекбоксів найпростіше — зробити так, щоб сама тема додавала до WC-елементів наші класи через хуки/фільтри (`woocommerce_form_field_args` додає `input_class => ['field__control']`, `wc_wp_theme_get_element_class_name('button')` → `btn btn--green`), а решту покрити селекторами.

| Елемент WooCommerce | Компонент дизайн-системи | Примітка |
|---|---|---|
| `button.button`, `a.button` (основні: `[name=login]`, `[name=register]`, `[name=save_account_details]`, `[name=track]`, `.checkout-button`, `#place_order`, `button.button.alt`) | `.btn` + тон `.btn--green` / `--teal` / `--gold` залежно від бренду; `.button.alt` = головна дія (суцільна), `.button` без `.alt` = вторинна `.btn--outline` | Висота/радіус/шрифт — з `.btn`; hover/focus уже у `button.css` |
| `[name=apply_coupon]`, `[name=update_cart]`, `.woocommerce-pagination .button`, `a.button.view/pay/cancel`, `.wc-backward` | `.btn--outline` | Вторинні дії |
| `p.form-row` + `label` + `input.input-text`, `textarea.input-text` | `.field` / `.field__label` / `.field__control` | `p.form-row-first/-last` → дві колонки (як `feedback-pair`); `form-row-wide` → на всю ширину |
| `span.woocommerce-input-wrapper` | прозорий блок (display: contents або block) | Службовий |
| `.woocommerce-invalid` / `.woocommerce-invalid-required-field`, `ul.woocommerce-error` | стан `.field.is-invalid` (колір `--color-field-error`, ромб-маркер) та `.contact-form__alert` | Помилка під полем у WC виводиться лише в `ul.woocommerce-error` угорі (не під полем) — тож `.field__error` для WC не потрібен; ромб-маркер можна додати до `li` помилки тим самим правилом |
| `select.country_select`, `select.state_select`, `select2-*` | `.select` / `.select--field` (`.select__button`, `.select__list`, `.select__option`) | `select2` лишається функціонально, його контейнер/список отримують ті самі токени (рамка, шрифт, hover опції) |
| `label.checkbox`/`.woocommerce-form__label-for-checkbox`, `input.input-checkbox`, `input.input-radio` | `.check` / `.check-field` (`.check__box`, `.check__input`) | Правило вирівнювання по базовій лінії з CLAUDE.md |
| `div.u-columns.col2-set`, `#customer_details` | сітка сторінки (`--grid-*`) у дві колонки | Без нових відступів |
| Ліве меню `nav.woocommerce-MyAccount-navigation ul` | Наявна навігація/чіпи (`.chip` для активного/неактивного) або посилання в рядках, як `.nav` | **Нового компонента «вертикальне меню» в DS немає** — див. питання нижче |
| Панель вмісту кабінету, `div.cart_totals`, `#order_review`, `.woocommerce-order-overview`, `section.woocommerce-customer-details` | `.contacts-panel` (світла панель з рамкою) | Одна панель = один логічний блок |
| `table.shop_table` (кошик, review-order, orders, order-details) | Немає окремого компонента таблиці. Пропозиція: рядки як `.acc`-подібні розділювачі `--color-line` (лише лінії-токени), текст — ролі `.t-*` | **Потрібно рішення замовника** (нова візуальна форма) |
| `.quantity input.qty` | `.field__control` у стислій ширині | Стрілки `type=number` ховаються токенами; степпер ±  у DS немає |
| `a.remove` (×) | Іконка з `components/icon.css` | — |
| Статус замовлення `mark.order-status`, `tr--status-*` | `.chip` (без нового кольору, колір тексту/рамки з токенів) | Різні кольори статусів не вводимо — один стиль, різниця лише текстом |
| `div.woocommerce-message` (успіх), `div.woocommerce-info`, `ul.woocommerce-error` | `.contact-success` (успіх), `.contact-form__alert` (помилка); інфо = нейтральний рядок на `--color-line` | Для успіху/інфо окремих компонентів у DS нема: використати наявні, підтвердити з замовником |
| Заголовки `h2/h3` усередині WC | Ролі `.t-*` (h2 → `.t-h2` тощо) | Один `h1` на сторінку — заголовок сторінки |
| Тіло Thank-you: `ul.order_details` | `.contacts-panel` + список ролей `.t-*` | — |

Нові візуальні елементи (за правилом CLAUDE.md «спершу в design-system.html, питання — у форму»): ймовірно потрібні **таблиця/рядок замовлення**, **степпер кількості**, **вертикальне меню кабінету**, **нотис успіху/інфо**, **пагінація**. Рекомендація: не вигадувати, а свести до існуючих (лінії + ролі + `.chip` + `.btn--outline`) і показати замовнику 1 варіант на підтвердження.

---

## 3. Що з вимог замовника є «з коробки» у WooCommerce

| Вимога | Статус | Як |
|---|---|---|
| Вхід (логін + пароль) | З коробки | `myaccount/form-login.php`, поля `username`, `password`, «Запам'ятати мене» [T] |
| Реєстрація | З коробки (вмикається в налаштуваннях) | Права колонка `form-login.php`; також «Створити акаунт» у checkout (`createaccount`) [T] |
| Відновлення пароля (Lost password) | З коробки | `form-lost-password.php` → лист → `form-reset-password.php` [T] |
| Мій кабінет: панель, замовлення, адреси, дані акаунта, вихід | З коробки | ендпоінти `dashboard`, `orders`, `edit-address`, `edit-account`, `customer-logout` [T/M] |
| Архів замовлень | З коробки | `myaccount/orders.php` + `view-order.php` + пагінація [T] |
| Відстеження замовлення | З коробки (форма) | `[woocommerce_order_tracking]`: № замовлення + e-mail → статус і нотатки [D][T]. Працює й для гостей |
| Відстеження посилки (ТТН, статус Нової пошти, карта) | **Немає в ядрі** | Потрібен плагін доставки (Нова пошта / Shipment Tracking тощо); виводить ТТН у нотатках або власному блоці |
| Двомовність (UK+EN) | Немає в ядрі | Потрібен плагін перекладів (WPML/Polylang/TranslatePress); для верстки — тексти шаблонів беруться з `.po`, ми ставимо українські |
| Вхід через Google/соцмережі, 2FA, магазинний «Список бажань» | Немає | Плагіни. Не верстаємо, замовник не просив |
| Купони | З коробки | Кошик і checkout [T] |
| Оплата LiqPay/Monobank/Fondy; Нова пошта | Плагін | Поле/блок виводить плагін у `#payment` і в checkout/shipping |

---

## 4. Стани, які треба зверстати

**Мій кабінет (гість)**
1. Форма входу: за замовчуванням; фокус; помилка («Невірний логін або пароль», `ul.woocommerce-error`); disabled/завантаження кнопки.
2. Форма реєстрації (або приховано, якщо реєстрація вимкнена); помилка «E-mail вже зареєстровано».
3. Забули пароль: форма; успіх «Лист надіслано» (`.woocommerce-message`); форма нового пароля; помилка недійсного посилання.
4. Відстеження: порожня форма; помилка валідації (порожні поля / не знайдено); результат (статус + нотатки + склад замовлення + адреса).

**Мій кабінет (авторизований)**
5. Навігація: звичайний/активний/hover/focus пункт.
6. Dashboard (привітання).
7. Замовлення: таблиця з N рядками; **0 замовлень** (інфо + кнопка «До магазину»); пагінація (перша/середня/остання сторінка); кнопки дій за статусом (Сплатити, Скасувати).
8. Перегляд замовлення (з нотатками і без).
9. Адреси: обидві вказані / ще не вказані / лише billing; форма редагування адреси.
10. Дані акаунта: форма; помилка валідації (пароль не збігається); успіх «Зміни збережено».

**Кошик**
11. Із товарами; 1 товар; багато (прокрутка не потрібна, діапазон 1200–1920).
12. Зміна кількості → «Оновити кошик» активна / неактивна (disabled).
13. Купон: поле; успіх «Купон застосовано» (рядок `cart-discount`); помилка «Купон недійсний»; «Оновлення» (blockUI).
14. **Порожній кошик** (`cart-empty` + `return-to-shop`).
15. Нотис «Товар видалено. Повернути?» (`woocommerce-message` з посиланням `restore-item`) [M].
16. Помилка наявності («Недостатньо товару на складі»).

**Оформлення**
17. Форма за замовчуванням; поле з фокусом; обов'язкове поле порожнє (`woocommerce-invalid`); невірний e-mail/телефон; блок помилок угорі (`woocommerce-NoticeGroup-checkout`).
18. «Доставити за іншою адресою» згорнуто/розгорнуто; «Створити акаунт» згорнуто/розгорнуто; купон-тогл згорнуто/розгорнуто; «Вже купували? Увійти» згорнуто/розгорнуто.
19. Оновлення підсумку (`.processing`, blockUI-оверлей) і disabled-кнопка «Підтвердити замовлення».
20. Способи оплати: обраний/необраний, `payment_box` відкрито; «Немає способів оплати».
21. Доставка: список методів (radio) і блок Нової пошти.
22. Згода з умовами: не відмічено (помилка), відмічено.
23. Thank-you: успіх (огляд замовлення + деталі + адреса); помилка оплати (з кнопкою «Сплатити»); замовлення не знайдено.

---

## 5. Поля checkout для України

Поля розробника: фактичний набір, порядок, мітки й обов'язковість налаштовуються фільтром `woocommerce_checkout_fields`/`woocommerce_default_address_fields` (плагін доставки або Checkout Field Editor). У верстці показуємо їх як звичайні поля (`.field`, `.select`) — на вигляд це текст/вибір.

| Поле | Ключ WooCommerce [M] | Тип у верстці | Обов'язкове | Примітка |
|---|---|---|---|---|
| Ім'я | `billing_first_name` | `.field` (текст) | так | `form-row-first` |
| Прізвище | `billing_last_name` | `.field` | так | `form-row-last` |
| Телефон | `billing_phone` | `.field` (tel) | так | формат `+380…`, `validate-phone` |
| E-mail | `billing_email` | `.field` (email) | так | `validate-email`, `form-row-wide` |
| Область | `billing_state` (або поле плагіну) | `.select` | так | у WC це `state_select` + select2, якщо країна має області |
| Місто | `billing_city` / поле плагіну доставки | `.select` з пошуком або `.field` | так | у Нової пошти — довідник міст зі живим пошуком |
| Відділення / поштомат Нової пошти | поле плагіну (напр. CatCode) | `.select` з пошуком | так, за методом доставки | залежить від міста; приховане, якщо кур'єр |
| Адреса (кур'єр: вулиця, будинок, кв.) | `billing_address_1` (+`_2`) | `.field` | лише для адресної доставки | показ залежить від методу доставки |
| Метод доставки | радіо в `review-order` (`ul#shipping_method`) | `.check` radio | так | з плагіну |
| Коментар до замовлення | `order_comments` | `.field` (textarea) | ні | `woocommerce-additional-fields` |
| Країна, індекс, компанія | `billing_country`, `billing_postcode`, `billing_company` | — | вимкнути | Для UK-сайту країну фіксуємо «Україна» (прихована); `company` та `address_2` у верстці не показуємо |
| Створити акаунт | `createaccount` | `.check` | ні | Лише гості, якщо ввімкнено |
| Згода з умовами | `terms` | `.check` | так | Посилання на юридичні сторінки сайту |

---

## 6. Підсумок і рекомендації

1. Верстати **класичні шаблони** (розділ 1): для кабінету та відстеження блоків немає; для кошика/оформлення блоки існують, але змінюють усю розмітку й не рекомендують стилізацію за внутрішніми класами.
2. Орієнтир для замовника «лише колір»: усі форми/кнопки/нотиси успадковують нашу дизайн-систему через `woocommerce.css` на токенах; кольори сторінок — теми `.theme-*` (YasnoCraft / Bazylsprings).
3. Для статичного фронту створюємо три HTML-сторінки (`account.html`, `cart.html`, `checkout.html`) з **точною WC-розміткою та класами** з розділу 1 + кнопки/поля з розділу 2.4; кожну в різних станах (розділ 4) — окремими блоками-демо в `design-system.html` або через `?state=…` (за зразком `?age=ok`), щоб розробник міг скопіювати у `woocommerce/…`.
4. Питання замовнику (у форму, не здогадом): (а) таблиця замовлення/кошика; (б) степпер кількості; (в) вертикальне меню кабінету; (г) нотиси успіху/інфо; (д) статус замовлення — чипом без кольорів?; (е) чи потрібна реєстрація (чи лише гостьове оформлення + відстеження за № і e-mail).
5. Питання розробнику: класична тема чи block-тема; плагін Нової пошти й оплати та їхня підтримка блокового checkout; чи потрібна двомовність і який плагін.
6. Те, що позначено [M], розробник має звірити з фактичною версією WooCommerce (JS-поведінка, список ендпоінтів, назви полів і точні класи нотисів у вашій версії).
