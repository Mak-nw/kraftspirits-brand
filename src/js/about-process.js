// about, секція 3: стрічка арок процесу. (1) Pinned horizontal scroll: секція `.about-place` sticky 100svh, за нею в потоці розпірка `.about-place-run`
// (висота = хід треку, токен --size-about-process-run); вертикальний скрол обгортки `.about-stack` (0 → висота розпірки) = прогрес p 0→1,
// єдиний трек `.about-track` (текст на ширину в'юпорта + стрічка арок) зсувається вліво translate3d на ВЕСЬ екран (p=0: текст по центру, арок не видно; p=1: остання арка по центру), далі сторінка гортається вниз («15 місяців» заїжджає поверх).
// Плавність — lerp прогресу в rAF з тим самим токеном інерції, що в паралаксі (--parallax-lerp); без scroll-snap, без перехоплення колеса/клавіш.
// prefers-reduced-motion: pinned вимкнено (CSS), стрічка — нативний горизонтальний overflow (в'юпорт стає фокусним, нативні стрілки).
// (2) Lottie етапів — lottie-web light (svg), динамічний імпорт: вантажиться лише на about; анімації ЗАЦИКЛЕНІ й працюють завжди (без прив'язки до появи у в'юпорті);
// пауза лише коли вкладка прихована; reduced-motion → статичний кадр (data-poster).
const root = document.querySelector('[data-process]');
const base = import.meta.env.BASE_URL;

if (root) {
  const viewport = root.querySelector('[data-process-viewport]');
  const list = document.querySelector('[data-process-track]');
  const run = document.querySelector('[data-process-run]');
  const stack = run?.parentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let teardown = null;

  const pinOn = () => {
    if (!run || !stack || !list) return;
    const tokens = getComputedStyle(document.documentElement);
    const LERP = Math.min(Math.max(parseFloat(tokens.getPropertyValue('--parallax-lerp')) || 0.08, 0.01), 1);
    let travel = 0, cur = 0, target = 0, raf = 0, last = 0, set = NaN;
    const measure = () => { travel = run.offsetHeight; };
    const aim = () => (travel > 0 ? Math.min(Math.max(-stack.getBoundingClientRect().top / travel, 0), 1) : 0);
    const write = () => {
      const v = Math.round(-cur * travel * 10) / 10 + 0; // ±0 → 0
      if (v !== set) { set = v; list.style.transform = `translate3d(${v}px,0,0)`; }
    };
    const frame = (now) => {
      raf = 0;
      const k = 1 - Math.pow(1 - LERP, Math.min(now - (last || now - 16.7), 64) / 16.7);
      last = now;
      cur += (target - cur) * k;
      if (Math.abs(target - cur) < 0.0002) cur = target;
      write();
      if (cur !== target) raf = requestAnimationFrame(frame); else last = 0;
    };
    const onScroll = () => { target = aim(); if (!raf) raf = requestAnimationFrame(frame); };
    const onResize = () => { measure(); target = aim(); cur = target; write(); };
    measure();
    target = cur = aim();
    write();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize);
    addEventListener('load', onResize);
    const ro = new ResizeObserver(onResize); ro.observe(run);
    teardown = () => {
      removeEventListener('scroll', onScroll); removeEventListener('resize', onResize); removeEventListener('load', onResize); ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      list.style.transform = '';
    };
  };
  const applyMode = () => {
    const noPin = reduce.matches; // pinned на всіх ширинах (рішення замовника 0f3ae2a4); без pin лише prefers-reduced-motion
    if (noPin) { teardown?.(); teardown = null; viewport.setAttribute('tabindex', '0'); } // нативно прокручувана область має бути фокусною
    else { viewport.removeAttribute('tabindex'); if (!teardown) pinOn(); }
  };
  applyMode();
  reduce.addEventListener('change', applyMode);

  // Lottie
  const slots = [...root.querySelectorAll('[data-lottie]')];
  const anims = [];
  const { default: lottie } = await import('lottie-web/build/player/esm/lottie_light.min.js');
  const play = () => anims.forEach((a) => a.play());
  const still = () => anims.forEach((a) => { a.pause(); a.goToAndStop(a.poster, true); });
  slots.forEach((slot) => {
    const a = lottie.loadAnimation({
      container: slot, renderer: 'svg', loop: true, autoplay: false,
      path: `${base}assets/lottie/${slot.dataset.lottie}.json`,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    });
    a.poster = Number(slot.dataset.poster) || 0;
    a.addEventListener('DOMLoaded', () => { if (reduce.matches) a.goToAndStop(a.poster, true); else a.play(); });
    anims.push(a);
  });
  reduce.addEventListener('change', () => (reduce.matches ? still() : play()));
  document.addEventListener('visibilitychange', () => { if (reduce.matches) return; if (document.hidden) anims.forEach((a) => a.pause()); else play(); });
}
