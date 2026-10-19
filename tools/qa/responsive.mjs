#!/usr/bin/env node
// responsive: перевірки адаптиву (docs/responsive.md) для ширин поза діапазоном 1200–1920 (і на ньому — без змін, лише контроль).
//   node tools/qa/responsive.mjs [--url http://localhost:PORT/] [--pages index,catalog,…] [--widths 320,360,375,390,430,600,768,834,1024,1100,2560,3440] [--rules R1,R2,…] [--json]
// Правила (динамічні, у браузері; сторінка в статичному режимі ?age=ok&reveal=off&parallax=off):
//   R1  жодного горизонтального скролу/зрізу сторінки (lib.hscroll: scrollWidth і елементи за межами в'юпорта)
//   R2  touch-цілі ≥ 44×44 px (лише ширини ≤ 1199): видимі a/button/input/select/textarea/summary/[role=button|tab|radio|switch], окрім посилань усередині суцільного тексту (є сусідній текст),
//       елементів із .hit-area-псевдо та перекритих (елемент у точці центру — не він і не нащадок/предок)
//   R3  текст не виходить за межі в'юпорта/контейнера, що кліпає (overflow hidden/clip/auto), і слова не рвуться посеред (overflow-wrap: anywhere у h1/h2 ‒ перевіряє D17)
//   R4  розмір шрифту видимого тексту ≥ 11 px (ширини ≤ 1199) — читабельність
//   R5  перетин текстових блоків: прямокутники тексту двох різних елементів (не предок/нащадок) перетинаються > 25% меншого
//   R6  ключові елементи: h1 видимий у в'юпорті по ширині; кнопка «меню» ≥ 44 px (≤ 1023); футер; main непорожній; картинки не розтягнуті (aspect рендера ≈ натуральний або object-fit cover/contain)
import { Report, runMain, launch, openPage, pageUrl, pageSpec, matrix, hscroll, hscrollBad, waitStable, sleep } from './lib.mjs';

export const RESP_WIDTHS = '320,360,375,390,430,600,768,834,1024,1100,2560,3440';
const ALL = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];

async function probe(page, width) {
  return page.evaluate((width) => {
    const out = { touch: [], text: [], small: [], overlap: [], key: [], stretch: [] };
    const vw = document.documentElement.clientWidth;
    const nm = (el) => { const p = []; for (let n = el; n && n.nodeType === 1 && p.length < 3; n = n.parentElement) p.unshift(n.tagName.toLowerCase() + (n.id ? `#${n.id}` : '') + [...n.classList].slice(0, 2).map((x) => `.${x}`).join('')); return p.join(' > '); };
    const visible = (el) => { if (el.closest('template, [hidden], [inert], noscript, [aria-hidden="true"]') && !el.matches('input, button, a')) return false; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const gated = !!document.querySelector('.age-gate:not([hidden])');
    // R2
    if (width <= 1199) {
      const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=radio], [role=switch]';
      for (const el of document.querySelectorAll(sel)) {
        if (!visible(el) || el.closest('.visually-hidden, .lp-sr, .screen-reader-text, .maplibregl-ctrl-attrib, .maplibregl-canvas-container')) continue;
        if (el.matches('.check__input, .cocktail__zoom')) continue;
        let r = el.getBoundingClientRect(); let hit = el;
        // hit-area: псевдо ::after розтягує клікабельну зону на батьківський блок — міряємо найближчого позиціонованого предка
        const cs = getComputedStyle(el); const after = getComputedStyle(el, '::after');
        if (el.classList.contains('hit-area') || (after.content !== 'none' && after.position === 'absolute' && after.inset === '0px')) { let p = el.parentElement; while (p && getComputedStyle(p).position === 'static') p = p.parentElement; if (p) { r = p.getBoundingClientRect(); hit = p; } }
        // посилання всередині суцільного тексту: поруч є текст того ж батька
        if (el.tagName === 'A' && cs.display === 'inline') { const par = el.parentElement; const own = [...par.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).length; if (own) continue; }
        // скрол-зона / відео-контроль
        if (r.bottom < 0 || r.top > 1e6) continue;
        if (r.width < 43.5 || r.height < 43.5) {
          // справжня область дотику може бути більшою за бокс (псевдоелемент ::after, padding предка): перевіряємо hit-тестом точок на ±21.5 px від центру по «короткій» осі
          el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
          const rr = el.getBoundingClientRect(); const cx = rr.left + rr.width / 2, cy = rr.top + rr.height / 2;
          const pts = []; if (rr.width < 43.5) pts.push([cx - 21.5, cy], [cx + 21.5, cy]); if (rr.height < 43.5) pts.push([cx, cy - 21.5], [cx, cy + 21.5]);
          const okHit = pts.every(([x, y]) => { if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return true; const t = document.elementFromPoint(x, y); return !!t && (el.contains(t) || t.contains(el) && !['BODY', 'HTML', 'MAIN', 'SECTION'].includes(t.tagName) && (t.closest('a, button, summary, label') === el.closest('a, button, summary, label'))); });
          if (okHit) continue;
          out.touch.push({ el: nm(el), w: +r.width.toFixed(1), h: +r.height.toFixed(1), text: (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28) });
        }
      }
    }
    // R3 + R4 + R5: текстові вузли
    const rg = document.createRange(); const rects = [];
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const clipOf = (el) => { for (let p = el; p && p !== document.body && p !== document.documentElement; p = p.parentElement) { const cs = getComputedStyle(p); if (/(hidden|clip|auto|scroll)/.test(cs.overflowX) && p !== el) return p; } return null; };
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const t = n.textContent.trim(); const pe = n.parentElement;
      if (!t || !pe || pe.closest('template, script, style, noscript, [hidden], .visually-hidden, .lp-sr, .screen-reader-text, [inert], svg, .maplibregl-map, [data-age-gate]') && !gated) continue;
      if (pe.closest('script, style, template, noscript, svg')) continue;
      if (pe.closest('details:not([open]) > :not(summary)')) continue; /* закритий акордеон: вміст не відображається */
      if (width >= 1024 && pe.closest('.about-track')) continue; /* pinned-трек про-нас: стрічка арок поза екраном за задумом (їде від скролу) */
      if (!visible(pe)) continue;
      const cs = getComputedStyle(pe);
      if ([...(function* () { for (let p = pe; p && p !== document.body; p = p.parentElement) yield p; })()].some((p) => getComputedStyle(p).clipPath !== 'none' && /inset\(50%\)/.test(getComputedStyle(p).clipPath))) continue; /* візуально прихований текст для читачів екрана */
      rg.selectNodeContents(n);
      const rs = [...rg.getClientRects()].filter((x) => x.width > 0.5 && x.height > 0.5); if (!rs.length) continue;
      let l = Infinity, r = -Infinity, tp = Infinity, bt = -Infinity; for (const x of rs) { l = Math.min(l, x.left); r = Math.max(r, x.right); tp = Math.min(tp, x.top); bt = Math.max(bt, x.bottom); }
      // R3: за межі в'юпорта або кліпаючого предка (елемент у горизонтальній прокрутці/каруселі виключено: предок з overflow auto/scroll)
      const clip = clipOf(pe);
      let boundL = 0, boundR = vw, scroller = false;
      for (let p = pe; p && p !== document.body && p !== document.documentElement; p = p.parentElement) { if (/(auto|scroll)/.test(getComputedStyle(p).overflowX) && p.scrollWidth > p.clientWidth + 1) { scroller = true; break; } }
      if (clip) { const cr = clip.getBoundingClientRect(); boundL = Math.max(boundL, cr.left); boundR = Math.min(boundR, cr.right); }
      if (!scroller && (r > boundR + 1.5 || l < boundL - 1.5)) out.text.push({ el: nm(pe), text: t.replace(/\s+/g, ' ').slice(0, 30), l: +l.toFixed(1), r: +r.toFixed(1), bound: [+boundL.toFixed(1), +boundR.toFixed(1)] });
      // R4
      const fs = parseFloat(cs.fontSize);
      if (width <= 1199 && fs < 11 - 0.01) out.small.push({ el: nm(pe), fs: +fs.toFixed(1), text: t.slice(0, 24) });
      // R5
      if (rects.length < 6000 && !scroller && !pe.closest('.site-header__bar')) for (const x of rs) { const ins = (x.bottom - x.top) * 0.2; rects.push({ pe, l: x.left, r: x.right, t: x.top + ins, b: x.bottom - ins, deck: pe.closest('.lp-steps__card') }); } /* fixed-пілюля header перекриває контент за задумом; рядок скорочено на 20% по висоті (content-area шрифту вища за рядок) */
    }
    // R5: попарний перетин (різні елементи, не предок/нащадок)
    rects.sort((a, b) => a.t - b.t);
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j]; if (b.t > a.b) break;
      if (a.pe === b.pe || a.pe.contains(b.pe) || b.pe.contains(a.pe)) continue;
      if (a.deck && b.deck && a.deck !== b.deck) continue; /* sticky-колода кроків: картки накладаються за задумом */
      const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (w > 2 && h > 2 && h > 0.4 * Math.min(a.b - a.t, b.b - b.t)) { const small = Math.min((a.r - a.l) * (a.b - a.t), (b.r - b.l) * (b.b - b.t)); if (w * h > 0.25 * small) out.overlap.push({ a: nm(a.pe), b: nm(b.pe), ta: a.pe.textContent.trim().slice(0, 16), tb: b.pe.textContent.trim().slice(0, 16), area: Math.round(w * h) }); }
    }
    // R6
    const h1 = document.querySelector('h1');
    if (!gated) {
      if (!h1) out.key.push({ msg: 'немає h1' }); else { const r = h1.getBoundingClientRect(); const cs = getComputedStyle(h1); if (cs.display !== 'none' && (r.left < -1 || r.right > vw + 1)) out.key.push({ msg: `h1 за межами в'юпорта: ${r.left.toFixed(0)}…${r.right.toFixed(0)}` }); }
      if (!document.querySelector('.site-footer')) out.key.push({ msg: 'немає футера' });
      const mb = document.querySelector('.site-header__menu-btn'); if (mb) { const r = mb.getBoundingClientRect(); if (r.width < 1) out.key.push({ msg: 'кнопка «меню» не видима' }); else if (width <= 1199 && (r.height < 43.5 || r.width < 43.5)) out.key.push({ msg: `кнопка «меню» ${r.width.toFixed(0)}×${r.height.toFixed(0)} < 44` }); }
      const main = document.querySelector('main'); if (main && main.getBoundingClientRect().height < 100) out.key.push({ msg: 'main порожній (<100px)' });
    }
    for (const im of document.querySelectorAll('img')) {
      if (!visible(im) || !im.naturalWidth) continue; const cs = getComputedStyle(im);
      if (/cover|contain|scale-down|none/.test(cs.objectFit) && cs.objectFit !== 'fill') continue;
      const r = im.getBoundingClientRect(); const a = r.width / r.height, n = im.naturalWidth / im.naturalHeight;
      if (r.width > 24 && Math.abs(a / n - 1) > 0.04 && !im.closest('svg')) out.stretch.push({ el: nm(im), render: +a.toFixed(3), natural: +n.toFixed(3) });
    }
    return out;
  }, width);
}

export async function runResp(o) {
  const rep = new Report('responsive');
  const rules = o.rules ? new Set(String(o.rules).split(',').map((s) => s.trim().toUpperCase())) : new Set(ALL);
  const L = await launch({ scrollbar: 'none', chrome: o.chrome, out: o.out });
  let n = 0;
  try {
    for (const spec0 of o.pagesList) {
      const spec = pageSpec(spec0);
      for (const w of o.widths) for (let attempt = 0; attempt < 3; attempt++) {
        const before = rep.items.length;
        let page;
        try {
        const h = w < 768 ? 800 : w < 1200 ? 1000 : 1080;
        page = await openPage(L.browser, pageUrl(o.url, spec, 'static'), { width: w, height: h, dpr: 1, settle: false });
        await waitStable(page, { selector: spec.name === 'catalog' ? '.product-card--catalog' : null }); await sleep(250);
        const H = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < H; y += 800) { await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y); await sleep(25); }
        await page.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.getElementById('__review-host')?.remove(); }); await sleep(spec.name === 'about' ? 2200 : 250); /* about: інерція pinned-треку */
        const label = `${spec.label}@${w}`; n++;
        if (rules.has('R1')) { const hs = await hscroll(page); if (hscrollBad(hs)) rep.add({ rule: 'R1', page: label, selector: hs.offenders[0]?.el || 'html', value: `scrollWidth ${hs.scrollWidth}/${hs.clientWidth}, ${hs.offenders.slice(0, 3).map((x) => `${x.el} [${x.left}…${x.right}]`).join('; ') || 'елементів поза в\'юпортом немає'}`, msg: 'горизонтальний скрол/зріз' }); }
        const p = await probe(page, w);
        if (rules.has('R2')) for (const t of dedupe(p.touch, (x) => x.el + x.text)) rep.add({ rule: 'R2', page: label, selector: t.el, value: `${t.w}×${t.h} «${t.text}»`, msg: 'touch-ціль < 44px' });
        if (rules.has('R3')) for (const t of dedupe(p.text, (x) => x.el + x.text)) rep.add({ rule: 'R3', page: label, selector: t.el, value: `«${t.text}» ${t.l}…${t.r} поза ${t.bound[0]}…${t.bound[1]}`, msg: 'текст виходить за межі' });
        if (rules.has('R4')) for (const t of dedupe(p.small, (x) => x.el)) rep.add({ rule: 'R4', page: label, selector: t.el, value: `${t.fs}px «${t.text}»`, msg: 'шрифт < 11px' });
        if (rules.has('R5')) for (const t of dedupe(p.overlap, (x) => x.a + x.b)) rep.add({ rule: 'R5', page: label, selector: `${t.a}  ×  ${t.b}`, value: `«${t.ta}» × «${t.tb}» ${t.area}px²`, msg: 'тексти перетинаються' });
        if (rules.has('R6')) { for (const t of p.key) rep.add({ rule: 'R6', page: label, selector: 'page', value: t.msg, msg: 'ключовий елемент' }); for (const t of dedupe(p.stretch, (x) => x.el)) rep.add({ rule: 'R6', page: label, selector: t.el, value: `render ${t.render} vs natural ${t.natural}`, msg: 'зображення розтягнуте' }); }
        await page.close().catch(() => {});
        break;
        } catch (e) { rep.items.length = before; await page?.close().catch(() => {}); if (attempt === 2) rep.add({ rule: 'R0', page: `${spec.label}@${w}`, selector: 'qa', value: String(e.message).slice(0, 120), msg: 'збій заміру (dev-сервер перезавантажив сторінку?)' }); else await sleep(1500); }
      }
    }
  } finally { await L.close(); }
  rep.note(`${n} замірів (сторінок ${o.pagesList.length} × ширин ${o.widths.length})`);
  return rep;
}
const dedupe = (arr, key) => { const m = new Map(); for (const x of arr) if (!m.has(key(x))) m.set(key(x), x); return [...m.values()]; };
if (import.meta.url === `file://${process.argv[1]}`) await runMain('responsive', { widths: RESP_WIDTHS, scrollbar: 'none' }, runResp);
