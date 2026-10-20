// Таби (WAI-ARIA tablist): [data-tabs] > [role=tablist] > [role=tab] + [role=tabpanel]. Кілька екземплярів на сторінці незалежні;
// id/aria-controls задає розмітка (унікальні з префіксом slug). Клавіатура: ←/→ (по колу), Home/End — перехід і вибір; Tab — у панель.
// Необов'язково: [data-tabs-hash] на корені + data-tab-key у вкладок — hash адреси (#<key>) відкриває вкладку, клік пише hash (replaceState, без стрибка скролу), без hash — перша.
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
  const hashed = root.hasAttribute('data-tabs-hash');
  const fromHash = () => {
    const i = tabs.findIndex((t) => `#${t.dataset.tabKey}` === location.hash);
    if (i >= 0) select(i, false);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { select(i, false); if (hashed && t.dataset.tabKey) history.replaceState(null, '', `#${t.dataset.tabKey}`); });
    t.addEventListener('keydown', (e) => {
      const n = tabs.length;
      const to = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
      if (to == null) return;
      e.preventDefault();
      select(to, true);
      if (hashed && tabs[to].dataset.tabKey) history.replaceState(null, '', `#${tabs[to].dataset.tabKey}`);
    });
  });
  if (hashed) { fromHash(); addEventListener('hashchange', fromHash); }
  return { select };
}
