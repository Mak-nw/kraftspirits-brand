#!/usr/bin/env node
// Геометрія «стека великих блоків» (lp: stack: true у card/place) і hero.panel — у браузері.  npm run qa:lp-stack
//   Стек: секція .lp-sec--stack має ТЕ САМЕ тло, що попередня (background-color), а відстань між нижнім краєм останнього блоку попередньої секції
//   і верхнім краєм першого блоку стекової = --grid-gap-panels (5u) ±1px; без верхнього відступу секції (padding-top стекової = 5u, padding-bottom попередньої = 0).
//   hero.panel (опція; зараз не вживається — перевірка спрацьовує, лише коли панель є): .hero__panel лежить усередині hero, по центру в'юпорта (±1px), шириною 6 колонок (--grid-span-6), непрозоре тло; H1 усередині панелі; над фото hero немає
//   оверлея (псевдоелементи, filter, backdrop-filter, градієнт у фоні — 0).
//   Позитивні контролі (в тому ж прогоні, на першій сторінці зі стеком): (а) «розірвати стек» — повернути секції власний відступ (padding-top 150u) → МАЄ бути порушення;
//   (б) «повернути оверлей» — на hero додати ::after з градієнтом → МАЄ бути порушення.
// Код виходу: 0 — усе гаразд, 1 — порушення / контроль не спрацював, 2 — збій. Параметри: --url (за замовч. http://localhost:5200/), --widths, --scrollbar, --pages.
import { Report, runMain, launch, openPage, pageUrl, pageSpec, matrix, sleep } from './lib.mjs';

const PROBE = () => {
  const px = (expr) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;visibility:hidden;height:0;width:${expr}`; document.body.appendChild(d); const w = d.getBoundingClientRect().width; d.remove(); return w; };
  const gap5 = px('var(--grid-gap-panels)'); const span6 = px('var(--grid-span-6)'); const vw = document.documentElement.clientWidth;
  const bgOf = (el) => getComputedStyle(el).backgroundColor;
  const lastBlockBottom = (sec) => { const kids = [...sec.querySelectorAll('.tour-card, .lp-place__grid')]; return kids.length ? Math.max(...kids.map((k) => k.getBoundingClientRect().bottom)) : sec.getBoundingClientRect().bottom; };
  const firstBlockTop = (sec) => { const kids = [...sec.querySelectorAll('.tour-card, .lp-place__grid')]; return kids.length ? Math.min(...kids.map((k) => k.getBoundingClientRect().top)) : sec.getBoundingClientRect().top; };
  const stacks = [...document.querySelectorAll('.lp-sec--stack')].map((el) => { const prev = el.previousElementSibling; return { id: el.id, prevId: prev?.id || '', bg: bgOf(el), prevBg: prev ? bgOf(prev) : '', gap: firstBlockTop(el) - lastBlockBottom(prev), padTop: parseFloat(getComputedStyle(el).paddingTop), prevPadBottom: prev ? parseFloat(getComputedStyle(prev).paddingBottom) : -1, prevIsStackNext: !!prev?.classList.contains('lp-sec--stack-next') }; });
  const hp = document.querySelector('.hero__panel'); let panel = null;
  if (hp) {
    const hero = hp.closest('.hero'); const b = hp.getBoundingClientRect(); const cs = getComputedStyle(hp); const h1 = hp.querySelector('h1');
    const pseudo = (el) => ['::before', '::after'].some((p) => { const c = getComputedStyle(el, p); return c.content !== 'none' && c.content !== 'normal'; });
    const over = [hero, hero.querySelector('.hero__bg'), hero.querySelector('.hero__content')].filter(Boolean).flatMap((el) => { const c = getComputedStyle(el); const o = []; if (pseudo(el)) o.push('псевдоелемент'); if (c.filter !== 'none') o.push('filter'); if (c.backdropFilter && c.backdropFilter !== 'none') o.push('backdrop-filter'); if (/gradient/.test(c.backgroundImage)) o.push('gradient'); if (c.boxShadow !== 'none') o.push('box-shadow'); return o.map((x) => `${el.className.split(' ')[0]}: ${x}`); });
    panel = { cx: b.left + b.width / 2, vw, width: b.width, span6, bgA: parseFloat((cs.backgroundColor.match(/[\d.]+/g) || [0, 0, 0, 1])[3] ?? 1), h1In: !!h1, heroOver: over, imgOpacity: getComputedStyle(hero.querySelector('.hero__bg')).opacity };
  }
  return { gap5, stacks, panel };
};

await runMain('lp-stack', { widths: '1200,1440,1728,1920', scrollbar: 'both', pages: 'excursions,barrels' }, async (o) => {
  const rep = new Report('lp-stack');
  let ctl = null; let heroCtl = null; let stackCount = 0; let panelCount = 0;
  for (const combo of matrix(o, { dprs: [o.dpr[0]] })) {
    const L = await launch({ scrollbar: combo.scrollbar, chrome: o.chrome, out: o.out });
    try {
      for (const spec of o.pagesList.map(pageSpec)) {
        const label = `${spec.label}@${combo.width}${combo.scrollbar === 'classic' ? '' : '/' + combo.scrollbar}`;
        const page = await openPage(L.browser, pageUrl(o.url, spec, 'static'), { width: combo.width, height: 1080, dpr: 1 });
        await sleep(400);
        const d = await page.evaluate(PROBE);
        for (const s of d.stacks) {
          stackCount++;
          if (s.bg !== s.prevBg) rep.add({ rule: 'STACK', page: label, selector: `#${s.id}`, value: `тло ${s.bg} ≠ тло попередньої #${s.prevId} ${s.prevBg}`, msg: 'стек: те саме тло (кімната)' });
          if (Math.abs(s.gap - d.gap5) > 1) rep.add({ rule: 'STACK', page: label, selector: `#${s.id}`, value: `зазор ${s.gap.toFixed(1)}px ≠ 5u (${d.gap5.toFixed(1)}px)`, msg: 'стек: зазор між блоками = --grid-gap-panels' });
          if (!s.prevIsStackNext || s.prevPadBottom !== 0) rep.add({ rule: 'STACK', page: label, selector: `#${s.prevId}`, value: `padding-bottom ${s.prevPadBottom}, stack-next ${s.prevIsStackNext}`, msg: 'стек: попередня секція без нижнього відступу' });
        }
        if (d.panel) {
          panelCount++;
          const p = d.panel;
          if (Math.abs(p.cx - p.vw / 2) > 1) rep.add({ rule: 'PANEL', page: label, selector: '.hero__panel', value: `центр ${p.cx.toFixed(1)} ≠ ${(p.vw / 2).toFixed(1)}`, msg: 'панель hero по центру' });
          if (Math.abs(p.width - p.span6) > 1) rep.add({ rule: 'PANEL', page: label, selector: '.hero__panel', value: `ширина ${p.width.toFixed(1)} ≠ 6 колонок ${p.span6.toFixed(1)}`, msg: 'панель hero = 6 колонок' });
          if (p.bgA < 1) rep.add({ rule: 'PANEL', page: label, selector: '.hero__panel', value: `альфа тла ${p.bgA}`, msg: 'панель непрозора' });
          if (!p.h1In) rep.add({ rule: 'PANEL', page: label, selector: '.hero__panel', value: 'H1 поза панеллю', msg: 'H1 усередині панелі' });
          if (p.heroOver.length) rep.add({ rule: 'PANEL', page: label, selector: '.hero', value: p.heroOver.join('; '), msg: 'над фото hero немає оверлея/градієнта/тіні/фільтра' });
          if (heroCtl === null) { await page.addStyleTag({ content: '.hero--panel::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent,#000)}' }); const dd = await page.evaluate(PROBE); heroCtl = dd.panel.heroOver.length; }
        }
        if (ctl === null && d.stacks.length) { await page.addStyleTag({ content: '.lp-sec--stack{padding-top:calc(150 * var(--u)) !important}' }); const dd = await page.evaluate(PROBE); ctl = dd.stacks.filter((s) => Math.abs(s.gap - dd.gap5) > 1).length; }
        await page.close();
      }
    } finally { await L.close(); }
  }
  rep.info({ rule: 'STACK', msg: `стеків ${stackCount}, панелей hero ${panelCount} на ${o.widths.length * (o.scrollbar.length)} комбінаціях; контроль «розірвати стек» (padding-top 150u): ${ctl} порушень; контроль «оверлей» (градієнт на hero): ${heroCtl === null ? 'н/д — панелі hero зараз немає на жодній сторінці' : `${heroCtl} порушень`}` });
  if (stackCount && !ctl) rep.add({ rule: 'STACK', page: 'control', selector: 'контроль', value: '0 порушень', msg: 'розірваний стек НЕ дав порушення — перевірка не працює' });
  if (panelCount && !heroCtl) rep.add({ rule: 'PANEL', page: 'control', selector: 'контроль', value: '0 порушень', msg: 'градієнт на hero НЕ дав порушення — перевірка не працює' });
  return rep;
});
