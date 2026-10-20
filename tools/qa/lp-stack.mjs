#!/usr/bin/env node
// Геометрія «стека великих блоків» (lp: stack: true у card/place) і hero.panel — у браузері.  npm run qa:lp-stack
//   Стек: секція .lp-sec--stack має ТЕ САМЕ тло, що попередня (background-color), а відстань між нижнім краєм останнього блоку попередньої секції
//   і верхнім краєм першого блоку стекової = --grid-gap-panels (5u) ±1px; без верхнього відступу секції (padding-top стекової = 5u, padding-bottom попередньої = 0).
//   hero.panel (опція; зараз не вживається — перевірка спрацьовує, лише коли панель є): .hero__panel лежить усередині hero, по центру в'юпорта (±1px), шириною 6 колонок (--grid-span-6), непрозоре тло; H1 усередині панелі; над фото hero немає
//   оверлея (псевдоелементи, filter, backdrop-filter, градієнт у фоні — 0).
//   Позитивні контролі (в тому ж прогоні, на першій сторінці зі стеком): (а) «розірвати стек» — повернути секції власний відступ (padding-top 150u) → МАЄ бути порушення;
//   (б) «повернути оверлей» — на hero додати ::after з градієнтом → МАЄ бути порушення.
//   Колода steps (deck: true; .lp-steps__deck) — поведінка СКРОЛУ, на висотах вікна --deck-heights (типово 700,1080) для кожної ширини:
//   (1) у потоці (колода ще під вікном) зазор між картками = 5u ±1px; (2) у момент, коли картка j прилипла: top кожної картки i ≤ j = --offset-lp-deck-top + i × peek
//   (±1px), видима смужка попередньої = peek ≥ токена, наступна перекриває попередню (elementFromPoint у смужці перекриття належить наступній), колода вміщується у вікно;
//   (3) після останньої картки: усі картки відходять РАЗОМ (зсуви між ними = i × peek), низ секції = низ колоди + padding-bottom секції (без «діри» й залипання);
//   (4) prefers-reduced-motion: reduce — картки у потоці (position не sticky), зазор 5u. Контролі: margin-bottom: 0 («схлопування» на виході), position: static
//   (немає прилипання), z-index першої картки (порядок перекриття) — кожен МАЄ дати порушення.
// Код виходу: 0 — усе гаразд, 1 — порушення / контроль не спрацював, 2 — збій. Параметри: --url (за замовч. http://localhost:5200/), --widths, --scrollbar, --pages.
import { Report, runMain, launch, openPage, pageUrl, pageSpec, matrix, sleep } from './lib.mjs';

const PROBE = () => {
  const px = (expr) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;visibility:hidden;height:0;width:${expr}`; document.body.appendChild(d); const w = d.getBoundingClientRect().width; d.remove(); return w; };
  const gap5 = px('var(--grid-gap-panels)'); const span6 = px('var(--grid-span-6)'); const vw = document.documentElement.clientWidth;
  const bgOf = (el) => getComputedStyle(el).backgroundColor;
  const lastBlockBottom = (sec) => { const kids = [...sec.querySelectorAll('.tour-card, .lp-place__grid')]; return kids.length ? Math.max(...kids.map((k) => k.getBoundingClientRect().bottom)) : sec.getBoundingClientRect().bottom; };
  const firstBlockTop = (sec) => { const kids = [...sec.querySelectorAll('.tour-card, .lp-place__grid')]; return kids.length ? Math.min(...kids.map((k) => k.getBoundingClientRect().top)) : sec.getBoundingClientRect().top; };
  const stacks = [...document.querySelectorAll('.lp-sec--stack')].map((el) => { const prev = el.previousElementSibling; return { id: el.id, prevId: prev?.id || '', bg: bgOf(el), prevBg: prev ? bgOf(prev) : '', gap: firstBlockTop(el) - lastBlockBottom(prev), padTop: parseFloat(getComputedStyle(el).paddingTop), prevPadBottom: prev ? parseFloat(getComputedStyle(prev).paddingBottom) : -1, prevIsStackNext: !!prev?.classList.contains('lp-sec--stack-next'), afterPad: el.classList.contains('lp-sec--stack-after-pad') }; });
  const hp = document.querySelector('.hero__panel'); let panel = null;
  if (hp) {
    const hero = hp.closest('.hero'); const b = hp.getBoundingClientRect(); const cs = getComputedStyle(hp); const h1 = hp.querySelector('h1');
    const pseudo = (el) => ['::before', '::after'].some((p) => { const c = getComputedStyle(el, p); return c.content !== 'none' && c.content !== 'normal'; });
    const over = [hero, hero.querySelector('.hero__bg'), hero.querySelector('.hero__content')].filter(Boolean).flatMap((el) => { const c = getComputedStyle(el); const o = []; if (pseudo(el)) o.push('псевдоелемент'); if (c.filter !== 'none') o.push('filter'); if (c.backdropFilter && c.backdropFilter !== 'none') o.push('backdrop-filter'); if (/gradient/.test(c.backgroundImage)) o.push('gradient'); if (c.boxShadow !== 'none') o.push('box-shadow'); return o.map((x) => `${el.className.split(' ')[0]}: ${x}`); });
    panel = { cx: b.left + b.width / 2, vw, width: b.width, span6, bgA: parseFloat((cs.backgroundColor.match(/[\d.]+/g) || [0, 0, 0, 1])[3] ?? 1), h1In: !!h1, heroOver: over, imgOpacity: getComputedStyle(hero.querySelector('.hero__bg')).opacity };
  }
  return { gap5, stacks, panel };
};

/* ---------- колода steps (deck: true): скрол-поведінка sticky-карток ---------- */
const DECK_GEOM = () => {
  const px = (expr) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;visibility:hidden;height:0;width:${expr}`; document.body.appendChild(d); const w = d.getBoundingClientRect().width; d.remove(); return w; };
  const deck = document.querySelector('.lp-steps__deck'); const sec = deck.closest('section'); const cards = [...deck.children];
  const r = (el) => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right }; };
  return { vh: innerHeight, minH: px('var(--size-lp-deck-min-h)'), peek: px('var(--space-lp-deck-peek)'), offset: px('var(--offset-lp-deck-top)'), gap5: px('var(--grid-gap-panels)'), cards: cards.map(r), sec: r(sec), secPadB: parseFloat(getComputedStyle(sec).paddingBottom),
    next: sec.nextElementSibling ? r(sec.nextElementSibling) : null, pos: cards.map((c) => getComputedStyle(c).position), scrollY };
};
// хто зверху в смужці перекриття: точка трохи нижче верху картки i+1 (в межах картки i) має належати картці i+1
const DECK_TOPMOST = (i) => { const cards = [...document.querySelector('.lp-steps__deck').children]; const b = cards[i + 1].getBoundingClientRect(); const el = document.elementFromPoint(b.left + b.width * 0.75, Math.min(cards[i].getBoundingClientRect().bottom - 2, b.top + 4)); return el ? cards.findIndex((c) => c.contains(el)) : -1; };
async function deckCheck(page, label, add) {
  if (process.env.QA_DECK_LOG) console.error('deck', label); const g0 = await page.evaluate(DECK_GEOM); const n = g0.cards.length; const T = (i) => g0.offset + i * g0.peek; const res = { moments: [] };
  // (1) потік: колода нижче вікна
  await page.evaluate(() => { const d = document.querySelector('.lp-steps__deck'); scrollTo({ top: d.getBoundingClientRect().top + scrollY - innerHeight - 10, behavior: 'instant' }); }); await sleep(120);
  { const g = await page.evaluate(DECK_GEOM); for (let i = 0; i + 1 < n; i++) { const gap = g.cards[i + 1].top - g.cards[i].bottom; if (Math.abs(gap - g.gap5) > 1) add('DECK-FLOW', `картка ${i + 2}`, `зазор у потоці ${gap.toFixed(1)}px ≠ 5u ${g.gap5.toFixed(1)}px`, 'колода: зазор між картками в потоці = --grid-gap-panels'); } }
  // (2) момент прилипання кожної картки j
  for (let j = 0; j < n; j++) {
    for (let k = 0; k < 6; k++) { const g = await page.evaluate(DECK_GEOM); const d = g.cards[j].top - T(j); if (Math.abs(d) < 0.5) break; await page.evaluate((dy) => scrollBy({ top: dy, behavior: 'instant' }), d > 0 ? d : d - 1); await sleep(60); }
    if (j < n - 1) { await page.evaluate(() => scrollBy({ top: 40, behavior: 'instant' })); } await sleep(120); // ще 40px: прилипла картка не рухається (остання — ні: з нею колода одразу йде далі)
    const g = await page.evaluate(DECK_GEOM); const m = { j, tops: g.cards.map((c) => +c.top.toFixed(1)), strips: [] };
    for (let i = 0; i <= j; i++) if (Math.abs(g.cards[i].top - T(i)) > 1) add('DECK-STICK', `картка ${i + 1} (зібрано ${j + 1})`, `top ${g.cards[i].top.toFixed(1)} ≠ ${T(i).toFixed(1)} (offset + ${i} × peek)`, 'колода: картка прилипає під header зі зсувом кроку');
    for (let i = 0; i < j; i++) {
      const strip = g.cards[i + 1].top - g.cards[i].top; m.strips.push(+strip.toFixed(1));
      if (strip < g.peek - 1) add('DECK-PEEK', `картка ${i + 1} (зібрано ${j + 1})`, `видима смужка ${strip.toFixed(1)}px < peek ${g.peek.toFixed(1)}px`, 'колода: видно верхню смужку попередньої картки');
      const top = await page.evaluate(DECK_TOPMOST, i); if (top !== i + 1) add('DECK-OVER', `картка ${i + 2}`, `у смужці перекриття зверху картка ${top + 1}`, 'колода: наступна картка накладається на попередню');
    }
    if (j === n - 1 && g.cards[j].bottom > g.vh + 1) { // колода не вмістилась: порушення, якщо картка НЕ на мінімумі (висота за svh мала б вмістити); на мінімумі (дуже низьке широке вікно) — інфо
      const h = g.cards[j].bottom - g.cards[j].top;
      if (h > g.minH + 1) add('DECK-FIT', 'колода', `низ останньої картки ${g.cards[j].bottom.toFixed(1)} > вікно ${g.vh}`, 'колода вміщується у вікно (висота картки за svh)');
      else res.fitInfo = `картка на мінімумі ${h.toFixed(0)}px (вікно ${g.vh}): колода виступає на ${(g.cards[j].bottom - g.vh).toFixed(0)}px — вікно нижче за межу шаблону`;
    }
    res.moments.push(m);
  }
  // (3) вихід: прокрутити ще на висоту вікна — картки йдуть угору разом, смужки збережено, секція закінчується нормально
  await page.evaluate(() => scrollBy({ top: innerHeight * 0.6, behavior: 'instant' })); await sleep(150);
  { const g = await page.evaluate(DECK_GEOM); res.exit = g.cards.map((c) => +c.top.toFixed(1));
    if (!(g.cards[0].top < T(0) - 5)) add('DECK-EXIT', 'колода', `після останньої картки колода не рушила (top ${g.cards[0].top.toFixed(1)})`, 'колода: після останньої картки секція прокручується далі (без залипання)');
    for (let i = 1; i < n; i++) { const d = g.cards[i].top - g.cards[0].top; if (Math.abs(d - i * g.peek) > 1) add('DECK-EXIT', `картка ${i + 1}`, `на виході зсув від першої ${d.toFixed(1)}px ≠ ${i} × peek ${(i * g.peek).toFixed(1)}px`, 'колода: на виході картки йдуть разом, смужки не «схлопуються»'); }
    const tail = g.sec.bottom - g.cards[n - 1].bottom; if (Math.abs(tail - g.secPadB) > 1) add('DECK-EXIT', 'секція', `низ секції − низ колоди ${tail.toFixed(1)} ≠ padding-bottom ${g.secPadB}`, 'колода: секція закінчується одразу після колоди (без «діри»)');
    if (g.next && Math.abs(g.next.top - g.sec.bottom) > 1) add('DECK-EXIT', 'наступна секція', `зазор ${(g.next.top - g.sec.bottom).toFixed(1)}px`, 'наступна секція одразу після секції колоди'); }
  return res;
}

await runMain('lp-stack', { widths: '1200,1440,1728,1920', scrollbar: 'both', pages: 'excursions,barrels', deckHeights: '700,1080' }, async (o) => {
  const rep = new Report('lp-stack');
  let ctl = null; let heroCtl = null; let stackCount = 0; let panelCount = 0; let deckRuns = 0; let deckCtl = null; const deckLog = [];
  const deckHeights = String(o.deckHeights).split(',').map(Number).filter(Boolean);
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
        if (await page.$('.lp-steps__deck')) {
          for (const h of deckHeights) {
            const dl = `${label}×${h}`; const add = (rule, selector, value, msg) => rep.add({ rule, page: dl, selector, value, msg });
            await page.setViewport({ width: combo.width, height: h, deviceScaleFactor: 1 }); await sleep(250);
            const r = await deckCheck(page, dl, add); deckRuns++; deckLog.push(`${dl}${r.fitInfo ? ` [${r.fitInfo}]` : ''}: прилипання ${JSON.stringify(r.moments.at(-1).tops)} смужки ${JSON.stringify(r.moments.at(-1).strips)} вихід ${JSON.stringify(r.exit)}`);
            // (4) prefers-reduced-motion: картки в потоці
            await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await sleep(150);
            { const g = await page.evaluate(DECK_GEOM); if (g.pos.some((p) => p === 'sticky')) add('DECK-RM', 'картки', `position: ${[...new Set(g.pos)].join(',')}`, 'reduced-motion: без прилипання (звичайні блоки)');
              for (let i = 0; i + 1 < g.cards.length; i++) { const gap = g.cards[i + 1].top - g.cards[i].bottom; if (Math.abs(gap - g.gap5) > 1) add('DECK-RM', `картка ${i + 2}`, `зазор ${gap.toFixed(1)}px ≠ 5u`, 'reduced-motion: блоки в потоці з зазором 5u'); } }
            await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]); await sleep(100);
          }
          if (deckCtl === null) { // позитивні контролі (один раз): кожна поломка МАЄ дати порушення
            deckCtl = {};
            for (const [name, css] of [['margin-bottom: 0', '.lp-steps__card{margin-bottom:0 !important}'], ['position: static', '.lp-steps__card{position:static !important}'], ['z-index першої', '.lp-steps__card:first-child{z-index:9}']]) {
              const tag = await page.addStyleTag({ content: css }); let cnt = 0; await sleep(150);
              await deckCheck(page, 'control', () => { cnt++; }); deckCtl[name] = cnt; await tag.evaluate((el) => el.remove()); await sleep(150);
            }
          }
          await page.setViewport({ width: combo.width, height: 1080, deviceScaleFactor: 1 });
        }
        if (ctl === null && d.stacks.length) { await page.addStyleTag({ content: '.lp-sec--stack{padding-top:calc(150 * var(--u)) !important}' }); const dd = await page.evaluate(PROBE); ctl = dd.stacks.filter((s) => Math.abs(s.gap - dd.gap5) > 1).length; }
        await page.close();
      }
    } finally { await L.close(); }
  }
  rep.info({ rule: 'STACK', msg: `стеків ${stackCount}, панелей hero ${panelCount} на ${o.widths.length * (o.scrollbar.length)} комбінаціях; контроль «розірвати стек» (padding-top 150u): ${ctl} порушень; контроль «оверлей» (градієнт на hero): ${heroCtl === null ? 'н/д — панелі hero зараз немає на жодній сторінці' : `${heroCtl} порушень`}` });
  rep.info({ rule: 'DECK', msg: `колода steps: прогонів ${deckRuns} (висоти ${deckHeights.join(', ')}); контролі: ${deckCtl ? Object.entries(deckCtl).map(([k, v]) => `${k} → ${v} порушень`).join('; ') : 'н/д — колоди немає'}` });
  deckLog.filter((x) => process.env.QA_DECK_LOG || x.includes('[')).forEach((x) => console.log(`  ${x}`));
  if (deckCtl) for (const [k, v] of Object.entries(deckCtl)) if (!v) rep.add({ rule: 'DECK', page: 'control', selector: 'контроль', value: k, msg: 'поломка колоди НЕ дала порушення — перевірка не працює' });
  if (stackCount && !ctl) rep.add({ rule: 'STACK', page: 'control', selector: 'контроль', value: '0 порушень', msg: 'розірваний стек НЕ дав порушення — перевірка не працює' });
  if (panelCount && !heroCtl) rep.add({ rule: 'PANEL', page: 'control', selector: 'контроль', value: '0 порушень', msg: 'градієнт на hero НЕ дав порушення — перевірка не працює' });
  return rep;
});
