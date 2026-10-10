// Легкий повільний паралакс фото ВСЕРЕДИНІ контейнера (лише головна). Розмітка: data-parallax на контейнері (overflow hidden/clip),
// фото — прямий нащадок <img>; варіант data-parallax="soft" бере --parallax-range-soft. Зсув: CSS-змінні --parallax-y (px) і --parallax-s
// (масштаб) на контейнері, їх читають `translate`/`scale` фото (parallax.css) — без layout/reflow, окремо від transform hover-zoom і opacity reveal.
// Нейтральна точка (y = 0, масштаб 1) = кадр макета / ?parallax=off. Рух односторонній: фото зсувається вниз на 0…range, а масштаб
// 1 + y/h (origin — низ) рівно перекриває відкритий верхній край, тож порожніх країв нема й у нейтралі нічого не збільшено.
// Нейтраль: контейнер по центру в'юпорта; для контейнера, що на scroll=0 уже вище цієї точки (hero), — стан при scroll=0.
// Вимкнено: ?parallax=off, prefers-reduced-motion (клас .js-parallax не додається → статична позиція).
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const off = /[?&]parallax=off/.test(location.search);
const boxes = [...document.querySelectorAll('[data-parallax]')];

if (boxes.length && !reduce && !off && 'IntersectionObserver' in window) {
  const num = (cs, name) => parseFloat(cs.getPropertyValue(name)) || 0;
  const rootCs = getComputedStyle(root);
  const LERP = Math.min(Math.max(num(rootCs, '--parallax-lerp'), 0.01), 1);
  const EPS = 0.05; // px: нижче цього вважаємо, що інерція згасла

  root.classList.add('js-parallax');
  const items = boxes.map((el) => ({ el, top: 0, h: 0, w: 0, range: 0, pn: 0, cur: 0, target: 0, live: false, set: NaN, bleed: el.hasAttribute('data-parallax-bleed') }));
  const live = new Set();
  let vh = innerHeight;
  let raf = 0;
  let last = 0;

  const measure = () => {
    vh = innerHeight;
    const sy = scrollY;
    items.forEach((it) => {
      const r = it.el.getBoundingClientRect();
      it.top = r.top + sy;
      it.h = r.height;
      it.w = it.el.clientWidth || r.width; // ширина самого фото (без рамки контейнера)
      it.range = num(getComputedStyle(it.el), '--parallax-range') * it.h;
      it.pn = Math.min(0, (it.top + it.h / 2 - vh / 2) / (vh / 2 + it.h / 2)); // p при scroll=0, якщо контейнер там уже вище центру
    });
  };
  // ціль: 0 у нейтралі (контейнер по центру в'юпорта / hero при scroll=0) → +range, коли контейнер виходить угору; знак — фото рухається повільніше за контейнер
  const aim = (it) => {
    const centre = it.top + it.h / 2 - scrollY;
    const p = Math.max(-1, Math.min(1, (centre - vh / 2) / (vh / 2 + it.h / 2)));
    return Math.max(0, Math.min(1, (it.pn - p) / (it.pn + 1))) * it.range;
  };
  const write = (it, v) => {
    const s = v.toFixed(2);
    if (s !== it.set) {
      it.set = s;
      it.el.style.setProperty('--parallax-y', `${s}px`);
      const sy = v > 0 ? 1 + (v + 1) / it.h : 1; // +1px запасу проти шва (бордюр tour-card, субпіксель)
      // data-parallax-bleed: окремий запас ПО ШИРИНІ (по 1px з кожного боку, origin 50% ⇒ симетрично) — бічні краї покриті і при v = 0 / субпіксельних зсувах
      const sx = it.bleed ? Math.max(sy, 1 + 2 / it.w) : sy;
      it.el.style.setProperty('--parallax-s', sy.toFixed(5));
      it.el.style.setProperty('--parallax-sx', sx.toFixed(5));
    }
  };

  const frame = (now) => {
    raf = 0;
    const k = 1 - Math.pow(1 - LERP, Math.min(now - (last || now - 16.7), 64) / 16.7);
    last = now;
    let moving = false;
    live.forEach((it) => {
      it.target = aim(it);
      const d = it.target - it.cur;
      if (Math.abs(d) < EPS) it.cur = it.target; else { it.cur += d * k; moving = true; }
      write(it, it.cur);
    });
    if (moving) raf = requestAnimationFrame(frame); else last = 0;
  };
  const kick = () => { if (!raf && live.size) raf = requestAnimationFrame(frame); };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const it = items.find((x) => x.el === e.target);
      if (e.isIntersecting) { if (!it.live) { it.live = true; live.add(it); } }
      else if (it.live) { it.live = false; live.delete(it); }
    });
    kick();
  }, { rootMargin: '10% 0px' });

  measure();
  // стартова позиція без «наїзду»: одразу в ціль (також для якоря/відновленого скролу)
  items.forEach((it) => { it.cur = it.target = aim(it); write(it, it.cur); io.observe(it.el); });

  addEventListener('scroll', kick, { passive: true });
  const remeasure = () => { measure(); items.forEach((it) => { it.target = aim(it); }); kick(); };
  addEventListener('resize', remeasure);
  addEventListener('load', remeasure);
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);
}
