#!/usr/bin/env node
// ink-align: ПІКСЕЛЬНИЙ еталон вирівнювання контролів з підписом (D11 міряє те саме по layout + метриках шрифту; тут — по реальних пікселях).
//   node tools/qa/ink-align.mjs [--url …] [--pages feedback,design-system] [--widths 1200,1440,1728,1920] [--dpr 4] [--tol 0.5] [--icons] [--gate false]
// Метод (tools/qa/ink.mjs): знімок в'юпорта при dpr 3–4 «з» і «без» (бокс visibility:hidden, перший гліф color:transparent) → різниця = маска чорнила без впливу фону;
// центр боксу/іконки = середина рядків маски, центр тексту = середина рядків ПЕРШОГО гліфа (малу першу літеру міряємо як велику → cap-height).
// Чекбокси (допуск --tol, за замовч. 0.5px) → порушення; іконки в кнопках/nav/select/специфікаціях (--icons) → лише інформація (не вирівнюються цим компонентом).
// Увага: dpr задається емуляцією (setViewport) — Chrome в ній прив'язує базову лінію тексту й межі боксів до ЦІЛИХ CSS px; у справжньому hi-dpi — до пікселя пристрою.
import { Report, runMain, launch, openPage, pageUrl, pageSpec, matrix } from './lib.mjs';
import { inkPair } from './ink.mjs';

const CHECK = { boxSel: '.check__box', labelSel: '.check__label' };
const ICONS = [
  { name: 'btn__arrow', container: '.btn__inner', boxSel: '.btn__arrow' },
  { name: 'nav-cell icon', container: '.nav-cell', boxSel: 'img, svg, .icon' },
  { name: 'select__chevron', container: '.select__button', boxSel: '.select__chevron' },
  { name: 'icon у специфікації', container: '*:has(> .icon--bottle-0-7)', boxSel: '.icon--bottle-0-7' },
  { name: 'icon--strength', container: '*:has(> .icon--strength)', boxSel: '.icon--strength' },
];

export async function runInkAlign(o) {
  const rep = new Report('ink-align');
  const tol = Number(o.tol ?? 0.5); const dprs = o.dpr.filter((d) => d >= 3).length ? o.dpr.filter((d) => d >= 3) : [4];
  const combos = matrix({ ...o, dpr: dprs, scrollbar: ['classic'] });
  const pages = o.pages ? o.pagesList : ['feedback', 'design-system'];
  const L = await launch({ scrollbar: 'classic', chrome: o.chrome, out: o.out });
  let n = 0, max = 0; const icons = new Map();
  try {
    for (const c of combos) {
      const targets = pages.map((p) => ({ spec: pageSpec(p), mode: 'static', within: null }));
      if (o.gate !== 'false' && o.gate !== false) targets.push({ spec: pageSpec('index'), mode: 'gate', within: '[data-age-gate]' });
      for (const t of targets) {
        const page = await openPage(L.browser, pageUrl(o.url, t.spec, t.mode), { width: c.width, height: o.height, dpr: c.dpr });
        const label = `${t.mode === 'gate' ? 'ворота' : t.spec.label}@${c.width}/x${c.dpr}`;
        const r = await inkPair(page, { ...CHECK, within: t.within });
        if (r && !r.error) { n++; max = Math.max(max, Math.abs(r.delta)); if (Math.abs(r.delta) > tol) rep.add({ rule: 'D11p', page: label, selector: '.check', value: `бокс ${r.delta > 0 ? 'нижче' : 'вище'} на ${Math.abs(r.delta).toFixed(2)}px (допуск ${tol}; гліф «${r.glyph}», dpr ${r.dpr})`, msg: 'піксельний центр боксу ≠ центр великих літер першого рядка' }); }
        else if (r || t.mode === 'gate' || ['feedback', 'design-system'].includes(t.spec.name)) rep.add({ rule: 'D11p', page: label, selector: '.check', value: r ? JSON.stringify(r) : 'чекбокса не знайдено', msg: 'не вдалося виміряти' });
        if (o.icons && t.mode !== 'gate') {
          for (const ic of ICONS) {
            for (let k = 0; k < 3; k++) {
              const ri = await inkPair(page, { ...ic, nth: k }).catch(() => null);
              if (!ri || ri.error) break;
              const key = ic.name; const cur = icons.get(key);
              if (!cur || Math.abs(ri.delta) > Math.abs(cur.delta)) icons.set(key, { delta: ri.delta, at: label, glyph: ri.glyph });
              icons.get(key).n = (icons.get(key).n || 0) + 1;
            }
          }
        }
        await page.close().catch(() => {});
      }
    }
  } finally { await L.close(); }
  for (const [k, v] of icons) rep.info({ rule: 'D11p', msg: `${k}: найбільше піксельне відхилення центру іконки від cap-центру першого гліфа ${v.delta > 0 ? '+' : ''}${v.delta.toFixed(2)}px (${v.at}, «${v.glyph}»; вибірок ${v.n}) — інформаційно` });
  rep.stats = { samples: n, maxCheckPx: +max.toFixed(2) };
  rep.note(`чекбокси: ${n} піксельних замірів, найбільше відхилення ${max.toFixed(2)}px (допуск ${tol})`);
  return rep;
}
if (import.meta.url === `file://${process.argv[1]}`) await runMain('ink-align', { widths: '1200,1440,1728,1920', dpr: '4' }, runInkAlign);
