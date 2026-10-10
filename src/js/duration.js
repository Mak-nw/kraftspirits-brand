// Тривалість із CSS-змінної (напр. '0.4s', '.4s', '80ms') → мілісекунди.
// Мінімізатор CSS переписує 0.08s → 80ms, тож parseFloat дає 80 «секунд» (≈8 хв). Одиницю читаємо явно.
// Без одиниці — секунди (токени мають одиницю; це лише запасний варіант). Некоректне значення → 0.
const TIME_RE = /^(-?(?:\d+\.?\d*|\.\d+))(ms|s)?$/i;

export function cssTimeMs(raw) {
  const m = TIME_RE.exec(String(raw ?? '').trim());
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return m[2] && m[2].toLowerCase() === 'ms' ? n : n * 1000;
}

export const cssMs = (name, el = document.documentElement) => cssTimeMs(getComputedStyle(el).getPropertyValue(name));
