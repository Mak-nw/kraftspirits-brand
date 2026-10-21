#!/usr/bin/env node
// R7 (адаптив, docs/responsive.md §4а): у шапці (.site-header__bar) жодні логотипи/кнопки не перетинаються на 320…1199, в uk і en, на всіх сторінках.
//   node tools/qa/header-overlap.mjs [--url http://localhost:PORT/] [--pages index,catalog,…] [--widths …] [--locales uk,en] [--table] [--control]
// Елементи: видимі кнопки/посилання пілюлі (.nav-cell поза випадним меню) і зображення логотипів (.site-header__logo img). Зазор між прямокутниками (rect): max(dx, dy); < 0 = перетин.
// Пороги: кнопка↔кнопка ≥ 0; логотип↔логотип ≥ 0; логотип↔кнопка ≥ 8 px (320…1023) і ≥ 16 px (1024…1199).
// Позитивний контроль (--control, вмикається й у npm run qa:resp): у відкритій сторінці до кнопки мови додається margin-left:-60px (кнопка наїжджає на лого) — перевірка МАЄ дати порушення; 0 порушень = перевірка не працює.
import { Report, runMain, launch, openPage, pageUrl, pageSpec, waitStable, sleep, defaultPages } from './lib.mjs';

export const R7_WIDTHS = [320, 360, 375, 390, 430, 600, 768, 834, 1024, 1050, 1100, 1150, 1199];
const MIN_GAP = (w) => (w >= 1024 ? 16 : 8);

/** замір у браузері: прямокутники й попарні зазори елементів шапки */
export async function measureHeader(page, minLogo) {
  return page.evaluate((minLogo) => {
    const bar = document.querySelector('.site-header__bar');
    if (!bar) return { err: 'немає .site-header__bar' };
    const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0.5 && r.height > 0.5; };
    const nm = (el) => (el.matches('.site-header__logo img') ? 'логотип ' + el.alt : (el.getAttribute('aria-label') || el.textContent.trim().replace(/\s+/g, ' ') || el.className.split(' ')[0]).slice(0, 20));
    const items = [];
    for (const el of bar.querySelectorAll('.site-header__logo img, .nav-cell')) {
      if (el.closest('.site-header__menu') || !vis(el)) continue;
      const r = el.getBoundingClientRect();
      items.push({ el, name: nm(el), logo: el.matches('.site-header__logo img'), l: r.left, r: r.right, t: r.top, b: r.bottom });
    }
    const out = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      const gap = Math.max(a.l - b.r, b.l - a.r, a.t - b.b, b.t - a.b);
      const need = a.logo !== b.logo ? minLogo : 0;
      out.push({ a: a.name, b: b.name, gap: +gap.toFixed(1), need, cross: a.logo !== b.logo });
    }
    return { n: items.length, pairs: out };
  }, minLogo);
}

export async function runHeaderOverlap(o, { control = false, table = false } = {}) {
  const rep = new Report('R7 шапка: перетини');
  const locales = String(o.locales || 'uk,en').split(',').map((s) => s.trim()).filter(Boolean);
  const widths = o.r7Widths || R7_WIDTHS;
  const pages = (o.pagesList || defaultPages()).map((p) => pageSpec(p).name).filter((n, i, a) => a.indexOf(n) === i);
  const L = await launch({ scrollbar: 'none', chrome: o.chrome, out: o.out });
  const minGap = new Map(); let n = 0; let ctl = null;
  try {
    for (const loc of locales) for (const name of pages) {
      const spec = pageSpec((loc === 'en' ? 'en/' : '') + name.replace(/\?.*$/, '') + (name.includes('?') ? '' : ''));
      for (const w of widths) {
        let page;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            page = await openPage(L.browser, pageUrl(o.url, spec, 'static'), { width: w, height: w < 768 ? 800 : 1000, dpr: 1, settle: false });
            await waitStable(page); await sleep(120);
            if (page.__status >= 400) throw new Error('HTTP ' + page.__status);
            const m = await measureHeader(page, MIN_GAP(w)); n++;
            if (m.err) rep.add({ rule: 'R7', page: `${loc}/${name}@${w}`, selector: 'page', value: m.err, msg: 'шапку не знайдено' });
            else for (const p of m.pairs) {
              const key = `${p.a}×${p.b}@${w}`; minGap.set(key, Math.min(minGap.get(key) ?? 1e9, p.gap));
              if (p.gap < p.need) rep.add({ rule: 'R7', page: `${loc}/${name}@${w}`, selector: `${p.a}  ×  ${p.b}`, value: `зазор ${p.gap}px < ${p.need}px`, msg: 'елементи шапки перетинаються/надто близько' });
            }
            if (control && ctl === null && w >= 1024 && loc === 'uk' && name === 'index') {
              await page.evaluate(() => { const s = document.createElement('style'); s.textContent = '.site-header__lang-btn{margin-left:-80px!important}'; document.head.appendChild(s); });
              await sleep(80); const c = await measureHeader(page, MIN_GAP(w));
              ctl = c.pairs.filter((p) => p.gap < p.need).length;
            }
            break;
          } catch (e) { if (attempt === 2) rep.add({ rule: 'R0', page: `${loc}/${name}@${w}`, selector: 'qa', value: String(e.message).slice(0, 100), msg: 'збій заміру' }); else await sleep(1200); }
          finally { await page?.close().catch(() => {}); }
        }
      }
    }
  } finally { await L.close(); }
  if (control) {
    rep.note(`позитивний контроль (кнопка мови з margin-left:-80px): ${ctl} порушень`);
    if (!ctl) rep.add({ rule: 'R7', page: 'control', selector: 'контроль', value: '0 порушень', msg: 'навмисне перекриття НЕ виявлено — перевірка не працює' });
  }
  rep.note(`${n} замірів (локалі ${locales.join('/')} × сторінок ${pages.length} × ширин ${widths.length})`);
  if (table) { for (const [k, v] of [...minGap].filter(([k]) => /логотип/.test(k) && v < 60).sort()) console.log(k.padEnd(60), v); }
  return rep;
}
if (import.meta.url === `file://${process.argv[1]}`) await runMain('header-overlap', { widths: R7_WIDTHS.join(','), scrollbar: 'none', locales: 'uk,en' }, (o) => runHeaderOverlap({ ...o, r7Widths: o.widths }, { control: o.control !== false, table: !!o.table }));
