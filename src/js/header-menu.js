// Випадне меню header 3: кнопка «меню» (aria-expanded/aria-controls) відкриває панель під пілюлею.
// Клавіатура: Enter/Space (нативно), ArrowDown на кнопці — відкрити й на перший пункт, Esc (слухач на document, з будь-яким фокусом; фокус повертається на кнопку, лише якщо був у меню/кнопці) — закрити,
// ArrowUp/ArrowDown/Home/End між пунктами; клік поза панеллю, вихід фокусу за межі кнопки й панелі (а не всієї групи .site-header__side) або клік по пункту — закривають.
// Ховер (лише мишка/тачпад: (hover: hover) and (pointer: fine)): pointerenter на кнопці відкриває меню без затримки; воно лишається відкритим,
// поки курсор над кнопкою або над панеллю (+ «місток» ::before у CSS); після виходу з обох закривається через --header3-menu-close-delay (0.25s).
// Клік по кнопці, коли меню відкрите ховером, «закріплює» його (нічого не закриває, без мигання); наступний клік, Esc, клік поза або перехід за пунктом закривають.
// Анімацію (opacity/transform) веде CSS (--duration-base, --ease-out; reduced-motion — миттєво).
// Та сама поведінка (initDropdown) — у випадайці мови зліва від «Кошика» (.site-header__lang-btn + .site-header__menu--lang; docs/i18n.md): окремий екземпляр, спільна логіка.
import { LANG_KEY } from '../i18n/config.js';
import { t } from '../i18n/runtime.js';

// outside — селектор «своєї» зони: pointerdown поза нею закриває; labels — [відкрити, закрити] для aria-label кнопки (null — підпис кнопки не змінюється)
function initDropdown(header, btn, menu, { outside, labels }) {
  // пункти, видимі на поточній ширині: адаптив (≤1023) додає в меню каталог/кошик/«підказати?», які на ширших екранах є кнопками пілюлі й у меню приховані (display: none)
  const getItems = () => [...menu.querySelectorAll('a')].filter((a) => a.getClientRects().length > 0);

  const setOpen = (open, focusBtn = false) => {
    if (!open) { hoverOpened = false; pinned = false; cancelClose(); }
    menu.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (labels) btn.setAttribute('aria-label', open ? labels[1] : labels[0]);
    if (focusBtn) btn.focus();
  };
  const isOpen = () => btn.getAttribute('aria-expanded') === 'true';

  // ховер-відкриття
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  let timer = 0;
  let hoverOpened = false; // відкрито ховером і ще не закріплено кліком
  let pinned = false;
  const closeDelay = () => {
    const v = getComputedStyle(header).getPropertyValue('--header3-menu-close-delay').trim();
    return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000 || 250;
  };
  const cancelClose = () => { clearTimeout(timer); timer = 0; };
  const scheduleClose = () => {
    cancelClose();
    if (!isOpen() || pinned || !hoverOpened) return;
    timer = setTimeout(() => {
      timer = 0;
      if (!pinned && !menu.contains(document.activeElement)) { hoverOpened = false; setOpen(false); }
    }, closeDelay());
  };
  let escaped = false; // закрито Esc, поки курсор над кнопкою/панеллю: не відкривати знову, доки курсор не вийде з обох і не повернеться
  const hoverIn = (e) => {
    if (e.pointerType !== 'mouse' || !fine.matches || escaped) return;
    cancelClose();
    if (!isOpen()) { hoverOpened = true; pinned = false; setOpen(true); }
  };
  const hoverOut = (e) => { if (e.pointerType === 'mouse' && fine.matches) { escaped = false; scheduleClose(); } };
  btn.addEventListener('pointerenter', hoverIn);
  menu.addEventListener('pointerenter', hoverIn);
  btn.addEventListener('pointerleave', hoverOut);
  menu.addEventListener('pointerleave', hoverOut);

  btn.addEventListener('click', () => {
    cancelClose();
    if (isOpen() && hoverOpened) { hoverOpened = false; pinned = true; return; } // відкрито ховером: клік закріплює, не закриває
    pinned = false;
    setOpen(!isOpen());
  });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); getItems()[0]?.focus(); }
  });
  menu.addEventListener('keydown', (e) => {
    const items = getItems();
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? items[i - 1] : btn).focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  // Esc закриває меню з будь-яким фокусом (WCAG 1.4.13: контент по ховеру можна закрити без руху курсора): слухач на document, бо відкрите ховером меню лишає фокус на body.
  // Фокус повертаємо на кнопку лише коли він був у кнопці/панелі (клавіатурний сценарій); якщо меню відкрито ховером, фокус не рухаємо.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented || !isOpen()) return;
    e.preventDefault();
    const a = document.activeElement;
    escaped = btn.matches(':hover') || menu.matches(':hover');
    setOpen(false, btn.contains(a) || menu.contains(a));
  });
  document.addEventListener('pointerdown', (e) => { if (isOpen() && !e.target.closest(outside)) setOpen(false); });
  // Tab/Shift+Tab за межі кнопки+панелі (навіть до сусіднього «каталог») закриває меню.
  // relatedTarget === null (Shift+Tab з першого елемента, у браузерний інтерфейс або по колу): дивимось, де фокус після тіку; на body лишаємо відкритим лише якщо курсор над кнопкою/панеллю (клік по полях меню).
  const inside = (n) => !!n && (btn.contains(n) || menu.contains(n));
  header.addEventListener('focusout', (e) => {
    if (!isOpen()) return;
    if (e.relatedTarget) { if (!inside(e.relatedTarget)) setOpen(false); return; }
    setTimeout(() => {
      if (!isOpen()) return;
      const a = document.activeElement;
      if (inside(a)) return;
      if ((a && a !== document.body) || !(btn.matches(':hover') || menu.matches(':hover'))) setOpen(false);
    }, 0);
  });
}

function init(header) {
  const btn = header.querySelector('.site-header__menu-btn');
  const menu = header.querySelector('.site-header__menu:not(.site-header__menu--lang)');
  if (btn && menu) initDropdown(header, btn, menu, { outside: '.site-header__side:not(.site-header__side--end), .site-header__menu:not(.site-header__menu--lang)', labels: [t('js.menu.open'), t('js.menu.close')] });
  const langBtn = header.querySelector('.site-header__lang-btn');
  const langMenu = header.querySelector('.site-header__menu--lang');
  if (langBtn && langMenu) { initDropdown(header, langBtn, langMenu, { outside: '.site-header__lang', labels: null }); initLangLinks(langMenu); }

  // поточна сторінка: aria-current для посилання на неї (візуального стану в Figma немає); посилання перемикача мови (data-lang) мають власний aria-current
  const here = location.pathname.split('/').pop() || 'index.html';
  header.querySelectorAll('a[href$=".html"]:not([data-lang])').forEach((a) => { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });
}

// Посилання мов ведуть на ту саму сторінку іншою мовою (шлях рахує збірка); тут додаємо поточні ?query і #hash (кошик, фільтри каталогу, ?age=ok) і запам'ятовуємо вибір (LANG_KEY).
function initLangLinks(menu) {
  const links = [...menu.querySelectorAll('a[data-lang]')];
  const path = new Map(links.map((a) => [a, a.getAttribute('href')]));
  const sync = () => links.forEach((a) => a.setAttribute('href', path.get(a) + location.search + location.hash));
  sync();
  addEventListener('hashchange', sync);
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-lang]');
    if (!a) return;
    try { localStorage.setItem(LANG_KEY, a.dataset.lang); } catch { /* приватний режим: без збереження */ }
    sync();
    if (a.getAttribute('aria-current') === 'true') e.preventDefault(); // поточна мова: нічого не перезавантажуємо
  });
}

document.querySelectorAll('.site-header').forEach(init);

// те саме для меню футера (partials/footer.html — на кожній сторінці разом із цим скриптом): aria-current="page" на посиланні на поточну сторінку;
// візуального стану немає (стилів [aria-current] у футері немає) — лише семантика для читачів екрана
{
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-footer a[href$=".html"]').forEach((a) => { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });
}
