#!/usr/bin/env node
// hero-vh (HV): hero-екран = висота в'юпорта на ВСІХ сторінках, де він є (рішення замовника 224a3702: «херо екран по вюпорту на всіх сторінках»).
// Метод: scrollY = 0, hero.bottom = innerHeight ±1 px (вікна не нижчі за --size-hero-min-h: 660u / 360 px — нижче hero лишається вищим за вікно,
// щоб не стискати контент: перевіряється окремо «hero ≥ мін.» і «контент (заголовок/кнопка) всередині hero, під зоною шапки»); на головній <1200 напис
// YASNOCRAFT / BAZYLSPRINGS по центру hero по горизонталі (≤ 0.5 px); по вертикалі на <1200 група стоїть НАД КОРКОМ пляшки на фото (коментар замовника: «над корком, але не на білому небі»):
// низ групи = верх корка − ½ висоти BAZYLSPRINGS (токен --ratio-hero-cork-top × висота hero, ≤ 1 px; не вище шапки), а верх корка за самим фото (рядок 376 з 1086 px, cover-кроп) вище за низ групи на ≥ 8 px (крім вікон, де hero мін. висоти не вміщає групу над корком — тоді група під шапкою).
// Позитивний контроль (у тому ж прогоні): примусова висота hero 1086px МАЄ дати порушення. Параметри: --widths (пари WxH через `x`), --pages.
import { Report, runMain, launch, openPage, pageUrl, pageSpec, sleep, waitStable } from './lib.mjs';

const VPS = ['1920x1080', '1440x900', '1280x720', '390x844', '768x1024', '1024x768', '2560x1440', '3440x1440', '320x568', '844x390', '1199x800', '360x740', '440x956', '767x1024'];
const CORK_IMG_Y = 376; // верх корка на home-hero-bg.webp (1920×1086), виміряно по файлу: перший рядок корка в колонках пляшки
const PAGES = 'index,about,barrels,excursions,events,b2b,en/index,en/b2b';

await runMain('hero-vh', { widths: '1200', scrollbar: 'none', pages: PAGES, vps: VPS.join(',') }, async (o) => {
  const rep = new Report('hero-vh'); let n = 0; let ctl = null; let ctl2 = null;
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
          return { top: q.top, bottom: q.bottom, h: q.height, ih: innerHeight, vw: document.documentElement.clientWidth, bar: bar?.bottom ?? 0, ct: cr?.top, cb: cr?.bottom, lg, bsh: document.querySelector('.hero__logo--bs')?.getBoundingClientRect().height, lgs: lgs && { t: lgs.top, b: lgs.bottom }, minH, cork: (() => { const im = e.querySelector('.hero__bg'); if (!im || !im.naturalWidth) return null; const sc = Math.max(q.width / im.naturalWidth, q.height / im.naturalHeight); const ratio = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ratio-hero-cork-top')); const hh = document.createElement('div'); hh.style.cssText = 'position:absolute;visibility:hidden;width:var(--size-header-h)'; document.body.appendChild(hh); const hdr = hh.getBoundingClientRect().width; hh.remove(); return { img: (q.height - im.naturalHeight * sc) / 2 + 376 * sc, ratio, hdr }; })() };
        });
        const m = await measure(); if (!m) { await page.close(); continue; }
        n++;
        const tall = m.minH > m.ih + 1; // вікно нижче мінімуму: hero вищий за вікно (очікувано)
        if (!tall && Math.abs(m.bottom - m.ih) > 1) rep.add({ rule: 'HV', page: label, selector: '.hero', value: `bottom ${m.bottom.toFixed(1)} ≠ innerHeight ${m.ih}`, msg: 'hero має займати висоту в’юпорта' });
        if (tall && m.h + 1 < m.minH) rep.add({ rule: 'HV', page: label, selector: '.hero', value: `h ${m.h.toFixed(1)} < мін. ${m.minH.toFixed(1)}`, msg: 'hero нижчий за --size-hero-min-h' });
        if (Math.abs(m.top) > 1) rep.add({ rule: 'HV', page: label, selector: '.hero', value: `top ${m.top.toFixed(1)}`, msg: 'hero починається не з верху екрана' });
        if (m.ct !== undefined && (m.ct < m.bar - 1 || m.cb > m.h + 1)) rep.add({ rule: 'HV', page: label, selector: '.hero__content', value: `content ${m.ct.toFixed(0)}…${m.cb.toFixed(0)}, шапка до ${m.bar.toFixed(0)}, hero ${m.h.toFixed(0)}`, msg: 'контент hero під шапкою / у межах hero' });
        if (w < 1200 && !tall && m.cb !== undefined && m.h - m.cb < 0.3 * m.h - 1) rep.add({ rule: 'HV', page: label, selector: '.hero__content', value: `під блоком ${(m.h - m.cb).toFixed(0)} < 20% hero (${(0.2 * m.h).toFixed(0)})`, msg: 'блок «заголовок + кнопка» на <1200 піднято: низ ≥ 20% висоти hero (125371bc; 20% — правка замовника після 0c6910c)' });
        if (m.lg.length) {
          for (const c of m.lg) if (Math.abs(c - m.vw / 2) > 0.5) rep.add({ rule: 'HV', page: label, selector: '.hero__logo', value: `центр ${c.toFixed(1)} ≠ ${m.vw / 2}`, msg: 'написи головної по центру' });
          if (w < 1200 && m.lgs && m.cork) {
            const { img, ratio, hdr } = m.cork; const exp = Math.max(hdr, ratio * m.h - (m.lgs.b - m.lgs.t) - 0.5 * m.bsh); const clamped = ratio * m.h - (m.lgs.b - m.lgs.t) - 0.5 * m.bsh < hdr;
            if (Math.abs(m.lgs.t - exp) > 1) rep.add({ rule: 'HV', page: label, selector: '.hero__logos', value: `top ${m.lgs.t.toFixed(1)} ≠ ${exp.toFixed(1)}`, msg: 'написи головної над корком: низ = верх корка − ½ BAZYLSPRINGS (не вище шапки)' });
            if (m.lgs.t < m.bar - 1) rep.add({ rule: 'HV', page: label, selector: '.hero__logos', value: `top ${m.lgs.t.toFixed(1)} < шапка ${m.bar.toFixed(1)}`, msg: 'написи головної не під шапкою' });
            if (!clamped && img - m.lgs.b < 8) rep.add({ rule: 'HV', page: label, selector: '.hero__logos', value: `низ ${m.lgs.b.toFixed(1)}, корок за фото ${img.toFixed(1)}`, msg: 'низ групи лого має бути вище верху корка пляшки (за самим фото) на ≥ 8 px' });
            if (!clamped && Math.abs(img - ratio * m.h) > 0.02 * m.h) rep.add({ rule: 'HV', page: label, selector: '.hero__bg', value: `корок за фото ${img.toFixed(1)} vs токен ${(ratio * m.h).toFixed(1)}`, msg: '--ratio-hero-cork-top розійшовся з реальним положенням корка (cover-кроп)' });
          }
        }
        if (ctl === null && spec.name === 'index' && w === 1440) { // позитивний контроль: примусова висота
          await page.addStyleTag({ content: '.hero { height: 1086px !important; }' }); await sleep(150);
          const mc = await measure(); ctl = Math.abs(mc.bottom - mc.ih) > 1 ? 1 : 0;
        }
        if (ctl2 === null && spec.name === 'index' && w === 390) { // позитивний контроль 2: група лого по центру hero (стара позиція) МАЄ порушити «над корком»
          await page.addStyleTag({ content: '.hero__logos { top: 50% !important; }' }); await sleep(150);
          const mc = await measure(); ctl2 = mc.cork && mc.cork.img - mc.lgs.b < 8 ? 1 : 0;
        }
        await page.close();
      }
    }
  } finally { await L.close(); }
  rep.info({ rule: 'HV', msg: `вимірів ${n}; позитивний контроль (hero 1086px): ${ctl} порушень; контроль «лого по центру»: ${ctl2} порушень` });
  if (ctl === 0) rep.add({ rule: 'HV', page: 'control', selector: 'контроль', value: '0 порушень', msg: 'примусова висота hero НЕ дала порушення — перевірка не працює' });
  if (ctl2 === 0) rep.add({ rule: 'HV', page: 'control', selector: 'контроль', value: '0 порушень', msg: 'лого по центру hero НЕ дали порушення «над корком» — перевірка не працює' });
  return rep;
});
