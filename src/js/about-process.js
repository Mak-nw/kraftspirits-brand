// about, секція 3: стрічка арок процесу. (1) Lottie етапів — lottie-web light (svg), динамічний імпорт: вантажиться лише на about;
// анімації ЗАЦИКЛЕНІ й працюють завжди (без прив'язки до появи у в'юпорті); пауза лише коли вкладка прихована; prefers-reduced-motion → статичний кадр (data-poster).
// (2) Горизонтальна прокрутка: нативний overflow-x + scroll-snap по аркі; перетягування мишею, клавіші ← → Home End (в'юпорт tabindex=0, role=region).
const root = document.querySelector('[data-process]');
const base = import.meta.env.BASE_URL;

if (root) {
  const viewport = root.querySelector('[data-process-viewport]');
  const items = [...root.querySelectorAll('.about-process__item')];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const step = () => (items[1] ? items[1].offsetLeft - items[0].offsetLeft : viewport.clientWidth);
  const smooth = () => (reduce.matches ? 'auto' : 'smooth');
  const goTo = (i) => viewport.scrollTo({ left: Math.max(0, Math.min(items.length - 1, i)) * step(), behavior: smooth() });
  const current = () => Math.round(viewport.scrollLeft / step());

  // клавіатура
  viewport.addEventListener('keydown', (e) => {
    const k = { ArrowRight: () => goTo(current() + 1), ArrowLeft: () => goTo(current() - 1), Home: () => goTo(0), End: () => goTo(items.length - 1) }[e.key];
    if (!k) return;
    e.preventDefault();
    k();
  });

  // перетягування мишею (на дотик працює нативний свайп)
  let drag = null;
  viewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: viewport.scrollLeft, moved: false, id: e.pointerId };
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 4) return;
    if (!drag.moved) { drag.moved = true; viewport.classList.add('is-dragging'); viewport.setPointerCapture(e.pointerId); }
    viewport.scrollLeft = drag.left - dx;
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    if (!moved) return;
    viewport.classList.remove('is-dragging');
    goTo(current()); // дотягнути до найближчої арки
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

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
