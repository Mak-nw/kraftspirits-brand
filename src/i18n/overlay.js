// Оверлей мовних полів поверх базових (українських) даних. Чистий ES (браузер + Node).
//   · об'єкт → ключі накладаються рекурсивно; рядок/число/null → замінює;
//   · масив → поелементно за індексом: undefined/null в оверлеї = лишити базове (так у en-файлі стоять лише текстові елементи, решта — порожні `,`/`null`);
//   · ключ `$drop: ['slot', …]` в оверлеї об'єкта — прибрати ці поля (службові нотатки, що не мають англійської);
// Відсутній ключ/елемент в оверлеї = українське (еталон): qa:i18n (І4) показує такі прогалини для сторінок зі статусом done.
export function deepOverlay(base, over) {
  if (over === undefined) return base;
  if (Array.isArray(base) && Array.isArray(over)) return base.map((b, i) => (over[i] === undefined || over[i] === null ? b : deepOverlay(b, over[i])));
  if (base && over && typeof base === 'object' && typeof over === 'object' && !Array.isArray(base) && !Array.isArray(over)) {
    const out = { ...base };
    for (const [k, v] of Object.entries(over)) {
      if (k === '$drop') { for (const d of v) delete out[d]; continue; }
      out[k] = deepOverlay(base[k], v);
    }
    return out;
  }
  return over;
}
/** список об'єктів з ключем-полем (slug/id): оверлей — об'єкт { [slug]: часткові дані } */
export const overlayList = (list, over, keyField = 'slug') => (over ? list.map((it) => deepOverlay(it, over[it[keyField]])) : list);
/** всі шляхи рядків із кириличними літерами (для qa:i18n І4: у локалізованих даних не лишилось українського) */
export function cyrPaths(v, path = '', out = [], skip = /(^|\.)(slot|bgSlot|draft)$/) {
  if (typeof v === 'string') { if (/[А-Яа-яІіЇїЄєҐґ]/.test(v) && !skip.test(path)) out.push(`${path}: ${v.slice(0, 40)}`); }
  else if (Array.isArray(v)) v.forEach((x, i) => cyrPaths(x, `${path}[${i}]`, out, skip));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) cyrPaths(x, path ? `${path}.${k}` : k, out, skip);
  return out;
}
