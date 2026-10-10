// Доступний випадний список (button + listbox). Розмітка — partials/components/select.html.
// Варіанти: initSelect(el, { options: [{ value, label }], value }) або атрибут data-options="v1:Підпис 1|v2:Підпис 2".
// Клавіатура: Enter/Space/↓/↑ відкривають; ↑↓ Home End рухають; Enter/Space обирають; Esc закриває; Tab закриває; літера — перехід до пункту.
// Подія 'select-change' (bubbles) з detail { value, label }.
export function initSelect(el, config = {}) {
  const button = el.querySelector('.select__button');
  const list = el.querySelector('.select__list');
  const valueEl = el.querySelector('[data-select-value]');
  let options = config.options || [];
  if (!options.length && el.dataset.options) {
    options = el.dataset.options.split('|').map((o) => { const i = o.indexOf(':'); return { value: o.slice(0, i), label: o.slice(i + 1) }; });
  }
  let value = config.value ?? options[0]?.value;
  let active = -1;
  const id = button.id;

  list.replaceChildren(...options.map((o, i) => {
    const li = document.createElement('li');
    li.className = 'select__option';
    li.id = `${id}-opt-${i}`;
    li.setAttribute('role', 'option');
    li.dataset.value = o.value;
    li.textContent = o.label;
    return li;
  }));
  const items = [...list.children];

  const paint = () => {
    items.forEach((li, i) => { li.setAttribute('aria-selected', String(options[i].value === value)); });
    const cur = options.find((o) => o.value === value);
    if (cur) valueEl.textContent = cur.label;
  };
  const setActive = (i) => {
    active = Math.max(0, Math.min(items.length - 1, i));
    items.forEach((li, k) => li.classList.toggle('is-active', k === active));
    button.setAttribute('aria-activedescendant', items[active].id);
    items[active].scrollIntoView({ block: 'nearest' });
  };
  const open = () => {
    el.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  };
  const close = () => {
    el.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    button.removeAttribute('aria-activedescendant');
    items.forEach((li) => li.classList.remove('is-active'));
  };
  const choose = (i) => {
    const next = options[i].value;
    close();
    if (next === value) return;
    value = next;
    paint();
    el.dispatchEvent(new CustomEvent('select-change', { bubbles: true, detail: { value, label: options[i].label } }));
  };
  const isOpen = () => el.classList.contains('is-open');

  button.addEventListener('click', () => (isOpen() ? close() : open()));
  list.addEventListener('click', (e) => { const li = e.target.closest('.select__option'); if (li) { choose(items.indexOf(li)); button.focus(); } });
  list.addEventListener('mousemove', (e) => { const li = e.target.closest('.select__option'); if (li) setActive(items.indexOf(li)); });
  button.addEventListener('keydown', (e) => {
    const k = e.key;
    if (!isOpen()) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) { e.preventDefault(); open(); }
      return;
    }
    if (k === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (k === 'Home') { e.preventDefault(); setActive(0); }
    else if (k === 'End') { e.preventDefault(); setActive(items.length - 1); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(active); }
    else if (k === 'Escape') { e.preventDefault(); close(); }
    else if (k === 'Tab') close();
    else if (k.length === 1) {
      const n = options.findIndex((o, i) => i > active && o.label.toLowerCase().startsWith(k.toLowerCase()));
      const m = n >= 0 ? n : options.findIndex((o) => o.label.toLowerCase().startsWith(k.toLowerCase()));
      if (m >= 0) setActive(m);
    }
  });
  document.addEventListener('click', (e) => { if (!el.contains(e.target)) close(); });
  el.addEventListener('focusout', (e) => { if (!el.contains(e.relatedTarget)) close(); });

  paint();
  return {
    get value() { return value; },
    set(v) { if (options.some((o) => o.value === v)) { value = v; paint(); } },
  };
}

export function initSelects(root = document) {
  return [...root.querySelectorAll('[data-select]')].map((el) => initSelect(el));
}
