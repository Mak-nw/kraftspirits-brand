#!/usr/bin/env node
// check-ds: автоперевірка дизайн-системи (реалізація design-machine/04-token-grouping/check-ds.md, адаптована під правила site_brand).
//   node tools/qa/check-ds.mjs [--url http://localhost:5200/] [--pages index,catalog,product?id=gin-yasnyi] [--widths 1920] [--scrollbar classic|none|both]
//                              [--static-only | --dynamic-only] [--rules S1,S4,D5] [--no-build | --reuse-build] [--json] [--out dir]
// Код виходу: 0 — немає порушень, 1 — є, 2 — збій інструмента. Статичні S1–S9 і динамічні D1–D10 — див. tools/qa/README.md.
import { join } from 'node:path';
import { Report, runMain, ROOT, QA_DIR } from './lib.mjs';
import { runStatic, loadAllow, isAllowed, buildDist } from './ds-static.mjs';
import { runDynamic } from './ds-dynamic.mjs';

await runMain('check-ds', { widths: '1920', scrollbar: 'classic', dpr: '1' }, async (o) => {
  const rep = new Report('check-ds');
  const allow = loadAllow(join(QA_DIR, 'check-ds.allow.json'));
  o.rules = o.rules ? new Set(String(o.rules).split(',').map((s) => s.trim().toUpperCase())) : null;
  const want = (set) => !o.rules || [...set].some((r) => o.rules.has(r));
  const doStatic = !o.dynamicOnly && want(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9']);
  const doDynamic = !o.staticOnly && want(['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10']);

  if (doStatic) {
    let dist = o.dist ? join(ROOT, o.dist) : join(o.out, 'dist');
    if (!o.noBuild && !o.dist && (!o.rules || ['S7', 'S9'].some((r) => o.rules.has(r)))) {
      const b = buildDist(dist, { reuse: !!o.reuseBuild });
      if (!b.ok) { rep.note(`vite build не вдалась (S7/S9 пропущено): ${(b.stderr || '').slice(0, 300)}`); dist = null; }
    } else if (o.noBuild) dist = null;
    const s = runStatic({ allow, dist, rules: o.rules });
    for (const v of s.items) { if (isAllowed(allow, v)) { rep.stats.allowed = (rep.stats.allowed || 0) + 1; continue; } rep.add({ ...v, file: v.line ? `${v.file}:${v.line}` : v.file }); }
    for (const i of s.infos) rep.info(i);
    rep.stats.static = s.stats;
  }
  if (doDynamic) await runDynamic(o, allow, rep);
  // винятки також фільтрують динамічні записи
  rep.items = rep.items.filter((v) => !isAllowed(allow, v));
  return rep;
});
