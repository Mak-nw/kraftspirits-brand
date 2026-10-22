#!/usr/bin/env node
// faq-icon: «+» / «−» картки FAQ (.acc--faq) стоїть рівно по ВЕРТИКАЛІ в центрі таба (CLAUDE.md п. (и): вирівнювання — виміром, не «на око»).
//   node tools/qa/faq-icon.mjs --url http://localhost:ПОРТ/ [--pages faq,about,en/faq,en/about] [--widths 320,360,390,440,768,1023,1199,1200,1440,1920] [--dpr 4] [--tol 0.5] [--mutate]
// Таб = border-box <details class="acc acc--faq"> (padding симетричний). Закритий: центр чорнила іконки = центр таба. Відкритий: іконка залишається в рядку-заголовку, тож еталон — центр <summary>.
// Чорнило іконки — ПІКСЕЛЬНО: знімок «з» і «без» (summary::after visibility:hidden), різниця = маска, центр = середина рядків маски (tools/qa/ink.mjs, dpr 4, допуск 0.5px).
// На кожній сторінці беремо найнижче (1 рядок) і найвище (2–3 рядки на вузьких ширинах) питання, обидва стани.
// --mutate = ПОЗИТИВНИЙ КОНТРОЛЬ: інжектує `summary::after { margin-top: 6px }` і очікує, що перевірка це ЛОВИТЬ (інакше сам інструмент зламаний → збій).
import { Report, runMain, launch, openPage, pageUrl, pageSpec, matrix } from './lib.mjs';
import { inkRowsBoth } from './ink.mjs';

const MUTATION = 'summary::after{margin-top:6px!important}';
const BASE_CSS = '.acc,.acc *,.acc *::after{transition:none!important}';
const HIDE = 'summary::after{visibility:hidden!important}';

export async function runFaqIcon(o) {
  const rep = new Report('faq-icon');
  const tol = Number(o.tol ?? 0.5);
  const dpr = o.dpr.filter((d) => d >= 3)[0] || 4;
  const pages = o.pages ? o.pagesList : ['faq', 'about', 'en/faq', 'en/about'];
  const mutate = o.mutate === true || o.mutate === 'true';
  const L = await launch({ scrollbar: 'classic', chrome: o.chrome, out: o.out });
  let n = 0, max = 0;
  try {
    for (const c of matrix({ ...o, dpr: [dpr], scrollbar: ['classic'] })) {
      for (const p of pages) {
        const spec = pageSpec(p);
        const page = await openPage(L.browser, pageUrl(o.url, spec, 'static'), { width: c.width, height: o.height, dpr });
        const label = `${spec.label}@${c.width}`;
        await page.evaluate((css) => { const s = document.createElement('style'); s.id = '__fi'; s.textContent = css; document.head.append(s); }, BASE_CSS + (mutate ? MUTATION : ''));
        const count = await page.evaluate(() => document.querySelectorAll('details.acc--faq').length);
        if (!count) { rep.add({ rule: 'FQI', page: label, selector: '.acc--faq', value: '', msg: 'карток FAQ не знайдено' }); await page.close().catch(() => {}); continue; }
        const idx = await page.evaluate(() => { const h = [...document.querySelectorAll('details.acc--faq')].map((d) => d.querySelector('summary').getBoundingClientRect().height); return [...new Set([h.indexOf(Math.min(...h)), h.indexOf(Math.max(...h))])]; });
        for (const i of idx) {
          for (const state of ['closed', 'open']) {
            const info = await page.evaluate(async (i, state) => {
              const all = [...document.querySelectorAll('details.acc--faq')], d = all[i];
              all.forEach((x) => { x.classList.remove('is-closing', 'is-animating'); x.open = x === d && state === 'open'; });
              d.scrollIntoView({ block: 'center', behavior: 'instant' });
              await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
              const s = d.querySelector('summary'), sr = s.getBoundingClientRect(), dr = d.getBoundingClientRect();
              const ic = getComputedStyle(s, '::after');
              const ref = state === 'open' ? sr : dr; // закритий: таб = details; відкритий: рядок-заголовок
              return { ref: (ref.top + ref.bottom) / 2, sumH: sr.height, l: sr.right - parseFloat(ic.width) - 2, r: sr.right + 2, t: sr.top - 4, b: sr.bottom + 4 };
            }, i, state);
            const shot = () => page.screenshot({ type: 'png', encoding: 'base64' }); // ВЕСЬ в'юпорт: clip-знімок при dpr 4 перебудовує макет (u-розміри) і зсуває рядки на 3–4px (як у ink.mjs)
            const A = await shot();
            await page.evaluate((h) => { document.getElementById('__fi').textContent += h; }, HIDE);
            const B = await shot();
            await page.evaluate((h) => { const s = document.getElementById('__fi'); s.textContent = s.textContent.replace(h, ''); }, HIDE);
            const [m] = await inkRowsBoth(page, A, B, [[Math.round(info.l * dpr), Math.round(info.r * dpr), Math.round(info.t * dpr), Math.round(info.b * dpr)]]);
            if (!m) { rep.add({ rule: 'FQI', page: label, selector: `.acc--faq #${i} ${state}`, value: '', msg: 'немає чорнила іконки — не вдалося виміряти' }); continue; }
            const inkC = (m.top + m.bottom) / 2 / dpr;
            const delta = inkC - info.ref; n++; max = Math.max(max, Math.abs(delta));
            if (Math.abs(delta) > tol) rep.add({ rule: 'FQI', page: label, selector: `.acc--faq #${i} ${state}`, value: `іконка ${delta > 0 ? 'нижче' : 'вище'} центру ${state === 'open' ? 'рядка-заголовка' : 'таба'} на ${Math.abs(delta).toFixed(2)}px (допуск ${tol}; summary ${info.sumH.toFixed(0)}px)`, msg: 'ink-центр «+»/«−» ≠ центр таба по вертикалі' });
          }
        }
        await page.close().catch(() => {});
      }
    }
  } finally { await L.close(); }
  rep.stats = { samples: n, maxPx: +max.toFixed(2) };
  rep.note(`іконки FAQ: ${n} піксельних замірів, найбільше відхилення ${max.toFixed(2)}px (допуск ${tol})${mutate ? ' — РЕЖИМ МУТАЦІЇ (позитивний контроль)' : ''}`);
  if (mutate) { // у режимі мутації «є порушення» = норма
    const caught = rep.items.length > 0;
    const out = new Report('faq-icon (позитивний контроль)');
    out.note(`мутація margin-top:6px на іконці: ${caught ? `ЛОВИТЬ (${rep.items.length} порушень, найбільше ${max.toFixed(2)}px)` : 'НЕ ЛОВИТЬ'}`);
    if (!caught) out.add({ rule: 'FQI', msg: 'позитивний контроль не спрацював: мутація не виявлена — інструмент зламаний' });
    return out;
  }
  return rep;
}
if (import.meta.url === `file://${process.argv[1]}`) await runMain('faq-icon', { widths: '320,360,390,440,768,1023,1199,1200,1440,1920', dpr: '4' }, runFaqIcon);
