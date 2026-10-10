// Плавна зміна сітки каталогу (фільтр / сортування / «Скинути»). Вузли карток НЕ перестворюються: лише hidden + порядок у DOM.
// FLIP на властивостях translate/scale/opacity (WAAPI): картки, що відпали, гаснуть на місці (position:absolute, .is-leaving),
// решта переїжджає на нові місця, нові з'являються (opacity + зсув --reveal-shift, stagger), висота сітки й порожній стан анімуються плавно.
// Інтервал повторних викликів: попередня анімація скасовується, нова стартує з поточного ВІЗУАЛЬНОГО стану (без стрибка, без «привидів»).
// Тривалості — з CSS-токенів (cssTimeMs); prefers-reduced-motion і ?reveal=off (та автоматизація без ?reveal=on, як reveal.js) — миттєво.
import { cssTimeMs } from './duration.js';

const instantMode = () => {
  const q = location.search;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  if (/[?&]reveal=off/.test(q)) return true;
  return !!navigator.webdriver && !/[?&]reveal=on/.test(q);
};

// Значення токена (у т.ч. calc()) → обчислене браузером значення через probe-елемент.
const probe = document.createElement('div');
probe.setAttribute('aria-hidden', 'true');
probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0';
const tokenMs = (name) => {
  probe.style.transitionDuration = `var(${name})`;
  return cssTimeMs(getComputedStyle(probe).transitionDuration);
};
const tokenPx = (name) => {
  probe.style.height = `var(${name})`;
  const v = parseFloat(getComputedStyle(probe).height) || 0;
  probe.style.height = '0';
  return v;
};

export function createGridMotion({ grid, empty, cards }) {
  document.body.append(probe);
  let gen = 0;
  let running = [];
  const footer = document.querySelector('.site-footer');
  const state = { emptyShown: empty && !empty.hidden };

  const all = [...cards.values()];
  const reset = () => {
    running.forEach((a) => a.cancel());
    running = [];
    grid.classList.remove('is-animating', 'is-collapsing');
    document.querySelectorAll('.catalog-grid > .catalog-empty').forEach((g) => g.remove());
    all.forEach((el) => {
      el.classList.remove('is-leaving', 'is-moving');
      el.removeAttribute('inert');
      el.style.removeProperty('--ghost-x'); el.style.removeProperty('--ghost-y');
      el.style.removeProperty('--ghost-w'); el.style.removeProperty('--ghost-h');
    });
  };
  const place = (order) => { // мінімум переміщень у DOM: видимі за порядком, решта — після них
    const rest = all.filter((el) => !order.includes(el));
    [...order, ...rest].forEach((el, i) => { if (grid.children[i] !== el) grid.insertBefore(el, grid.children[i] || null); });
  };
  const finalState = (order, isEmpty) => {
    all.forEach((el) => { el.hidden = !order.includes(el); });
    place(order);
    grid.hidden = isEmpty;
    empty.hidden = !isEmpty;
    state.emptyShown = isEmpty;
  };

  function update(slugs, animate = true) {
    const myGen = ++gen;
    const order = slugs.map((s) => cards.get(s));
    const isEmpty = order.length === 0;

    if (!animate || instantMode()) {
      reset();
      finalState(order, isEmpty);
      return;
    }

    // ---- 1. First: поточний ВІЗУАЛЬНИЙ стан (з урахуванням незавершених анімацій) ----
    const wasEmpty = state.emptyShown;
    const gridRect0 = grid.hidden ? null : grid.getBoundingClientRect(); // під час незавершеного «порожнього» переходу сітка ще в DOM (там згасають картки)
    const first = new Map();
    all.forEach((el) => {
      if (el.hidden) return;
      const r = el.getBoundingClientRect();
      first.set(el, { cx: r.left + r.width / 2, cy: r.top + r.height / 2, x: r.left - gridRect0.left, y: r.top - gridRect0.top, w: r.width, h: r.height, op: parseFloat(getComputedStyle(el).opacity) });
    });
    const footerTop0 = footer ? footer.getBoundingClientRect().top : 0;
    const emptyRect0 = wasEmpty ? empty.getBoundingClientRect() : null;
    const emptyOp0 = wasEmpty ? parseFloat(getComputedStyle(empty).opacity) : 1;

    const dFast = tokenMs('--duration-fast'), dBase = tokenMs('--duration-base');
    const lead = tokenMs('--catalog-leave-lead'), enterDelay = tokenMs('--catalog-enter-delay');
    const stagger = tokenMs('--reveal-stagger'), moveStagger = tokenMs('--catalog-move-stagger');
    const MAX_STEP = 6;
    const ease = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim() || 'ease-out';
    const shift = tokenPx('--reveal-shift');

    // ---- 2. скинути попередні анімації й застосувати КІНЦЕВУ розкладку (далі лише візуальна компенсація transform-ами) ----
    reset();
    const leaving = [...first.keys()].filter((el) => !order.includes(el));
    // картками далі керує цей модуль: прибрати CSS-перехід reveal (стан «з'явилась» фіксуємо)
    order.forEach((el) => { if (el.hasAttribute('data-reveal') && !el.classList.contains('is-done')) el.classList.add('is-in', 'is-done'); });
    all.forEach((el) => { el.hidden = !(order.includes(el) || leaving.includes(el)); });
    place(order);
    grid.hidden = false; // на час анімації сітка в DOM (там лишаються згасаючі картки); приховаємо в кінці
    empty.hidden = !isEmpty;
    state.emptyShown = isEmpty;
    grid.classList.toggle('is-collapsing', isEmpty);
    grid.classList.add('is-animating');
    const gridRect1 = grid.getBoundingClientRect();
    leaving.forEach((el) => {
      const f = first.get(el);
      el.style.setProperty('--ghost-x', `${f.x}px`); el.style.setProperty('--ghost-y', `${f.y}px`);
      el.style.setProperty('--ghost-w', `${f.w}px`); el.style.setProperty('--ghost-h', `${f.h}px`);
      el.classList.add('is-leaving');
      el.setAttribute('inert', '');
    });
    // порожній стан, що зникає, лишається «привидом» (клон) усередині сітки
    let emptyGhost = null;
    if (wasEmpty && !isEmpty) {
      emptyGhost = empty.cloneNode(true);
      emptyGhost.hidden = false; emptyGhost.setAttribute('inert', ''); emptyGhost.removeAttribute('data-catalog-empty');
      emptyGhost.classList.add('is-leaving');
      emptyGhost.style.setProperty('--ghost-x', `${emptyRect0.left - gridRect1.left}px`); emptyGhost.style.setProperty('--ghost-y', `${emptyRect0.top - gridRect1.top}px`);
      emptyGhost.style.setProperty('--ghost-w', `${emptyRect0.width}px`); emptyGhost.style.setProperty('--ghost-h', `${emptyRect0.height}px`);
      grid.append(emptyGhost);
    }

    // ---- 3. Last ----
    const last = new Map();
    order.forEach((el) => { const r = el.getBoundingClientRect(); last.set(el, { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }); });
    const footerDelta = footer ? footerTop0 - footer.getBoundingClientRect().top : 0;

    // ---- 4. Invert + Play ----
    const anims = [];
    const play = (el, keyframes, opts) => {
      const a = el.animate(keyframes, { easing: ease, fill: 'backwards', ...opts });
      anims.push(a);
      return a;
    };
    const hasLead = leaving.length > 0 || wasEmpty;
    const startMove = hasLead ? lead : 0; // переїзд решти — коли картки, що відпали, вже гаснуть

    leaving.forEach((el) => {
      el.classList.add('is-moving');
      const a = play(el, [{ opacity: first.get(el).op, scale: 1 }, { opacity: 0, scale: 0.98 }], { duration: dFast * Math.max(first.get(el).op, 0.3), fill: 'forwards' });
      a.onfinish = () => { if (myGen === gen) { el.hidden = true; el.classList.remove('is-leaving', 'is-moving'); el.removeAttribute('inert'); a.cancel(); } };
    });
    if (emptyGhost) {
      const a = play(emptyGhost, [{ opacity: emptyOp0 }, { opacity: 0 }], { duration: dFast, fill: 'forwards' });
      a.onfinish = () => emptyGhost.remove();
    }

    let enterI = 0;
    order.forEach((el, idx) => {
      const f = first.get(el), l = last.get(el);
      el.classList.add('is-moving');
      if (f) {
        const dx = f.cx - l.cx, dy = f.cy - l.cy;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          play(el, [{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], { duration: dBase, delay: startMove + Math.min(idx, 8) * moveStagger });
        }
        if (f.op < 0.99) play(el, [{ opacity: f.op }, { opacity: 1 }], { duration: dBase });
      } else {
        const d = startMove + enterDelay + Math.min(enterI, MAX_STEP) * stagger;
        enterI++;
        play(el, [{ opacity: 0, translate: `0 ${shift}px` }, { opacity: 1, translate: '0 0' }], { duration: dBase, delay: d });
      }
    });

    // порожній стан з'являється плавно
    if (isEmpty && !wasEmpty) {
      play(empty, [{ opacity: 0, translate: `0 ${shift}px` }, { opacity: 1, translate: '0 0' }], { duration: dBase, delay: lead + enterDelay });
    } else if (isEmpty && wasEmpty && emptyOp0 < 0.99) {
      play(empty, [{ opacity: emptyOp0 }, { opacity: 1 }], { duration: dBase });
    }

    // футер (і все під сіткою): розкладка вже кінцева, візуально футер плавно їде на нове місце (transform, без перерахунку розкладки)
    if (footer && Math.abs(footerDelta) > 0.5) {
      play(footer, [{ translate: `0 ${footerDelta}px` }, { translate: '0 0' }], { duration: dBase, delay: footerDelta > 0 ? startMove : 0 });
    }

    running = anims;
    Promise.all(anims.map((a) => a.finished.catch(() => null))).then(() => {
      if (myGen !== gen) return;
      reset();
      finalState(order, isEmpty);
    });
  }

  return { update };
}
