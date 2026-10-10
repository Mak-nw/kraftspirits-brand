// Службова змінна --vw = ширина в'юпорта БЕЗ смуги прокрутки (clientWidth), у px.
// tokens.css рахує --u від неї; 100vw включає смугу (≈15 px у браузерах з постійними смугами) і дає горизонтальний скрол.
// До виконання скрипта діє fallback 100vw (overlay-смуги = 0 → збігається).
const root = document.documentElement;
let last = 0;
const sync = () => {
  const w = root.clientWidth;
  if (w && w !== last) { last = w; root.style.setProperty('--vw', `${w}px`); }
};
sync();
new ResizeObserver(sync).observe(root);
addEventListener('resize', sync);
addEventListener('load', sync);
