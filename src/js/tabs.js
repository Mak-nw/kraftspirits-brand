// Таби (WAI-ARIA tablist): [data-tabs] > [role=tablist] > [role=tab] + [role=tabpanel]. Кілька екземплярів на сторінці незалежні;
// id/aria-controls задає розмітка (унікальні з префіксом slug). Клавіатура: ←/→ (по колу), Home/End — перехід і вибір; Tab — у панель.
// Стан: aria-selected + .is-active (вигляд — .product-volume, product.css), roving tabindex. Без JS видно всі панелі (CSS лише під html.js).
export function initTabs(root) {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((t) => root.querySelector(`#${CSS.escape(t.getAttribute('aria-controls'))}`));
  const select = (i, focus) => {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', String(on));
      t.classList.toggle('is-active', on);
      t.tabIndex = on ? 0 : -1;
      panels[k]?.classList.toggle('is-active', on);
    });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i, false));
    t.addEventListener('keydown', (e) => {
      const n = tabs.length;
      const to = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
      if (to == null) return;
      e.preventDefault();
      select(to, true);
    });
  });
}
