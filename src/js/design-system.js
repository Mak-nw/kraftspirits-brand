import '../styles/main.css';
import './reveal.js';
import { initSelects } from './select.js';
import { initAccordions } from './accordion.js';

initSelects();
initAccordions();

// Живі значення: підставляємо обчислені стилі, щоб документація не розходилась з токенами.
const px = (v) => `${Math.round(parseFloat(v) * 100) / 100}px`;

document.querySelectorAll('[data-token]').forEach((el) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(el.dataset.token).trim();
  el.textContent = v;
});

document.querySelectorAll('[data-spec]').forEach((el) => {
  const target = document.querySelector(el.dataset.spec);
  if (!target) return;
  const cs = getComputedStyle(target);
  const lh = cs.lineHeight === 'normal' ? 'normal' : px(cs.lineHeight);
  el.textContent = `${cs.fontFamily.split(',')[0].replace(/"/g, '')} ${cs.fontWeight} · ${px(cs.fontSize)} / ${lh} · ls ${cs.letterSpacing === 'normal' ? '0' : px(cs.letterSpacing)}`;
});

document.querySelectorAll('[data-width]').forEach((el) => {
  const target = document.querySelector(el.dataset.width);
  if (target) el.textContent = px(target.getBoundingClientRect().width);
});

const u = document.querySelector('[data-u]');
if (u) {
  const update = () => { u.textContent = `1 px макета = ${(Math.min(Math.max(innerWidth, 1200), 1920) / 1920).toFixed(4)} px (вікно ${innerWidth})`; };
  update(); addEventListener('resize', update);
}
