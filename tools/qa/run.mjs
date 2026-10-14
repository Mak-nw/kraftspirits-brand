#!/usr/bin/env node
// qa: агрегатор. Швидкий smoke (за замовч.: ширина 1920): check-ds (static) + links + hscroll + states.
//   node tools/qa/run.mjs [--full] [--with arch,cls,check-ds-dynamic] [--url …] [--json]
// --full: 3 ширини (1200,1440,1920) × dpr 1,2 × classic+none + повний check-ds (static+dynamic) + arch + cls.
import { join } from 'node:path';
import { Report, runMain, QA_DIR } from './lib.mjs';
import { runStatic, loadAllow, isAllowed, buildDist } from './ds-static.mjs';
import { runDynamic } from './ds-dynamic.mjs';
import { runLinks } from './links.mjs';
import { runHscroll, DEFAULT_WIDTHS } from './hscroll.mjs';
import { runStates } from './states.mjs';
import { runArch, ARCH_WIDTHS } from './arch.mjs';
import { runCls } from './cls.mjs';

async function checkDs(o, dynamic) {
  const rep = new Report('check-ds');
  const allow = loadAllow(join(QA_DIR, 'check-ds.allow.json'));
  const dist = join(o.out, 'dist'); const b = buildDist(dist, { reuse: !!o.reuseBuild });
  const s = runStatic({ allow, dist: b.ok ? dist : null });
  for (const v of s.items) if (!isAllowed(allow, v)) rep.add({ ...v, file: v.line ? `${v.file}:${v.line}` : v.file });
  for (const i of s.infos) rep.info(i);
  if (dynamic) { o.rules = null; await runDynamic(o, allow, rep); rep.items = rep.items.filter((v) => !isAllowed(allow, v)); }
  return rep;
}

const full = process.argv.includes('--full');
await runMain('qa', full ? { widths: '1200,1440,1920', dpr: '1,2', scrollbar: 'both' } : { widths: '1920', dpr: '1', scrollbar: 'classic' }, async (o) => {
  o.full = full || o.full;
  const only = o.with ? String(o.with).split(',') : [];
  const reps = [];
  const step = async (name, fn) => { const t = Date.now(); process.stderr.write(`▶ ${name}… `); const r = await fn(); process.stderr.write(`${((Date.now() - t) / 1000).toFixed(0)}s, ${r.items.length} порушень\n`); reps.push(r); };
  await step('check-ds', () => checkDs(o, o.full));
  await step('links', () => runLinks({ ...o }));
  await step('hscroll', () => runHscroll({ ...o, widths: o.full ? o.widths : [1200, 1440, 1920] }));
  await step('states', () => runStates({ ...o }));
  if (o.full || only.includes('arch')) await step('arch', () => runArch({ ...o, widths: o.full ? ARCH_WIDTHS.split(',').map(Number) : o.widths }));
  if (o.full || only.includes('cls')) await step('cls', () => runCls({ ...o, runs: o.runs || 3, pagesList: ['index', 'catalog', 'product?id=gin-yasnyi'] }));
  return reps;
});
