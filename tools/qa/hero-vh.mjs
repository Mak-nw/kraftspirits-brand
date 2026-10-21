#!/usr/bin/env node
// hero-vh (HV): hero-екран = висота в'юпорта на ВСІХ сторінках, де він є (рішення замовника 224a3702: «херо екран по вюпорту на всіх сторінках»).
// Метод: scrollY = 0, hero.bottom = innerHeight ±1 px (вікна не нижчі за --size-hero-min-h: 660u / 360 px — нижче hero лишається вищим за вікно,
// щоб не стискати контент: перевіряється окремо «hero ≥ мін.» і «контент (заголовок/кнопка) всередині hero, під зоною шапки»); на головній <1200 напис
// YASNOCRAFT / BAZYLSPRINGS по центру hero по горизонталі (≤ 0.5 px) і між шапкою та низом по вертикалі (≤ 1 px).
// Позитивний контроль (у тому ж прогоні): примусова висота hero 1086px МАЄ дати порушення. Параметри: --widths (пари WxH через `x`), --pages.
import { Report, runMain, launch, openPage, pageUrl, pageSpec, sleep, waitStable } from './lib.mjs';

const VPS = ['1920x1080', '1440x900', '1280x720', '390x844', '768x1024', '1024x768', '2560x1440', '3440x1440', '320x568', '844x390', '1199x800'];
const PAGES = 'index,about,barrels,excursions,events,b2b,en/index,en/b2b';

await runMain('hero-vh', { widths: '1200', scrollbar: 'none', pages: PAGES, vps: VPS.join(',') }, async (o) => {
  const rep = new Report('hero-vh'); let n = 0; let ctl = null;
  const L = await launch({ scrollbar: 'none', chrome: o.chrome, out: o.out });
  try {
    for (const spec of o.pagesList.map(pageSpec)) {
      for (const vp of String(o.vps).split(',')) {
        const [w, h] = vp.split('x').map(Number);
        const label = `${spec.label}@${vp}`;
        const page = await openPage(L.browser, pageUrl(o.url, spec, 'static'), { width: w, height: h, dpr: 1 });
        await waitStable(page); await sleep(250);
        const measure = () => page.evaluate(() => {
          const e = document.querySelector('.hero'); if (!e) return null;
          const q = e.getBoundingClientRect(); const bar = document.querySelector('.site-header__bar')?.getBoundingClientRect();
          const c = e.querySelector('.hero__content, .about-hero__content'); const cr = c?.getBoundingClientRect();
          const lg = [...e.querySelectorAll('.hero__logo')].map((x) => { const r = x.getBoundingClientRect(); return (r.left + r.right) / 2; });
          const lgs = e.querySelector('.hero__logos')?.getBoundingClientRect();
          const pr = document.createElement('div'); pr.style.cssText = 'position:absolute;visibility:hidden;width:var(--size-hero-min-h)'; document.body.appendChild(pr); const minH = pr.getBoundingClientRect().width; pr.remove();
          return { top: q.top, bottom: q.bottom, h: q.height, ih: innerHeight, vw: document.documentElement.clientWidth, bar: bar?.bottom ?? 0, ct: cr?.top, cb: cr?.bottom, lg, bsh: document.querySelector('.hero__logo--bs')?.getBoundingClientRect().height, lgs: lgs && { t: lgs.top, b: lgs.bottom }, minH };
        });
        const m = await measure(); if (!m) { await page.close(); continue; }
        n++;
        const tall = m.minH > m.ih + 1; // вікно нижче мінімуму: hero вищий за вікно (очікувано)
        if (!tall && Math.abs(m.bottom - m.ih) > 1) rep.add({ rule: 'HV', page: label, selector: '.hero', value: `bottom ${m.bottom.toFixed(1)} ≠ innerHeight ${m.ih}`, msg: 'hero має займати висоту в’юпорта' });
        if (tall && m.h + 1 < m.minH) rep.add({ rule: 'HV', page: label, selector: '.hero', value: `h ${m.h.toFixed(1)} < мін. ${m.minH.toFixed(1)}`, msg: 'hero нижчий за --size-hero-min-h' });
        if (Math.abs(m.top) > 1) rep.add({ rule: 'HV', page: label, selector: '.hero', value: `top ${m.top.toFixed(1)}`, msg: 'hero починається не з верху екрана' });
        if (m.ct !== undefined && (m.ct < m.bar - 1 || m.cb > m.h + 1)) rep.add({ rule: 'HV', page: label, selector: '.hero__content', value: `content ${m.ct.toFixed(0)}…${m.cb.toFixed(0)}, шапка до ${m.bar.toFixed(0)}, hero ${m.h.toFixed(0)}`, msg: 'контент hero під шапкою / у межах hero' });
        if (w < 1200 && !tall && m.cb !== undefined && m.h - m.cb < 0.3 * m.h - 1) rep.add({ rule: 'HV', page: label, selector: '.hero__content', value: `під блоком ${(m.h - m.cb).toFixed(0)} < 30% hero (${(0.3 * m.h).toFixed(0)})`, msg: 'блок «заголовок + кнопка» на <1200 піднято: низ ≥ 30% висоти hero (125371bc)' });
        if (m.lg.length) {
          for (const c of m.lg) if (Math.abs(c - m.vw / 2) > 0.5) rep.add({ rule: 'HV', page: label, selector: '.hero__logo', value: `центр ${c.toFixed(1)} ≠ ${m.vw / 2}`, msg: 'написи головної по центру' });
          if (w < 1200 && m.lgs) { const free = m.h - m.bar; const lift = w < 768 ? 0.2 * m.bsh : 0; const mid = m.bar + free / 2 - lift; const lc = (m.lgs.t + m.lgs.b) / 2; if (Math.abs(lc - mid) > 1) rep.add({ rule: 'HV', page: label, selector: '.hero__logos', value: `центр по вертикалі ${lc.toFixed(1)} ≠ ${mid.toFixed(1)}`, msg: 'написи головної по центру між шапкою і низом (<1200; на <768 вище на 20% висоти BAZYLSPRINGS)' }); }
        }
        if (ctl === null && spec.name === 'index' && w === 1440) { // позитивний контроль: примусова висота
          await page.addStyleTag({ content: '.hero { height: 1086px !important; }' }); await sleep(150);
          const mc = await measure(); ctl = Math.abs(mc.bottom - mc.ih) > 1 ? 1 : 0;
        }
        await page.close();
      }
    }
  } finally { await L.close(); }
  rep.info({ rule: 'HV', msg: `вимірів ${n}; позитивний контроль (hero 1086px): ${ctl} порушень` });
  if (ctl === 0) rep.add({ rule: 'HV', page: 'control', selector: 'контроль', value: '0 порушень', msg: 'примусова висота hero НЕ дала порушення — перевірка не працює' });
  return rep;
});
