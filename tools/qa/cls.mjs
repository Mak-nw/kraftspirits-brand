#!/usr/bin/env node
// cls: холодний CLS. N запусків; КОЖЕН у новому Chrome з чистим профілем, кеш вимкнено, опційно CPU throttle (--cpu 4).
//   node tools/qa/cls.mjs [--url …] [--pages index,catalog,product?id=gin-yasnyi] [--widths 1920] [--runs 5] [--cpu 4] [--max 0.01] [--wait 3000]
// Звіт: медіана/максимум на сторінку + джерела зсувів (layout-shift sources → селектор). Порушення: максимум > --max (за замовч. 0.01).
import { Report, runMain, launch, openPage, pageUrl, pageSpec, matrix, CLS_INIT, readCLS, median, sleep, fmt } from './lib.mjs';

export async function runCls(o) {
  const rep = new Report('cls');
  const runs = Number(o.runs) || 3, cpu = Number(o.cpu) || 0, max = o.max !== undefined ? Number(o.max) : 0.01, wait = Number(o.wait) || 3000;
  const table = [];
  for (const c of matrix(o, { dprs: [o.dpr[0]] })) {
    for (const spec0 of o.pagesList) {
      const spec = pageSpec(spec0); const vals = []; const srcCount = new Map();
      for (let i = 0; i < runs; i++) {
        const L = await launch({ scrollbar: c.scrollbar, chrome: o.chrome, out: o.out }); // новий процес + новий профіль = холодний старт
        try {
          const page = await openPage(L.browser, pageUrl(o.url, spec, 'static'), { width: c.width, height: o.height, dpr: c.dpr, cache: false, cpu, initScript: CLS_INIT, settle: false });
          await sleep(wait);
          const r = await readCLS(page);
          vals.push(r.value);
          for (const sh of r.shifts) for (const s of sh.sources) { const k = s.node; const e = srcCount.get(k) || { n: 0, v: 0, ex: `${s.prev.join(',')} → ${s.cur.join(',')}` }; e.n++; e.v += sh.v; srcCount.set(k, e); }
        } finally { await L.close(); }
      }
      const med = median(vals), mx = Math.max(...vals);
      const srcs = [...srcCount.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 4).map(([k, e]) => `${k} (Σ${fmt(e.v, 4)}; ${e.ex})`);
      table.push({ page: `${spec.label}@${c.width}${cpu ? `/cpu×${cpu}` : ''}`, runs: vals.map((v) => fmt(v, 4)), median: fmt(med, 4), max: fmt(mx, 4), sources: srcs });
      if (mx > max) rep.add({ rule: 'C1', page: `${spec.label}@${c.width}`, selector: srcs[0]?.split(' (')[0] || '(джерело не визначено)', value: `median ${fmt(med, 4)}, max ${fmt(mx, 4)} > ${max}`, msg: srcs.join(' | ') });
    }
  }
  rep.stats = { runs, cpu, table };
  for (const t of table) rep.note(`${t.page}: median ${t.median} max ${t.max} [${t.runs.join(' ')}]`);
  return rep;
}
if (import.meta.url === `file://${process.argv[1]}`) await runMain('cls', { widths: '1920', scrollbar: 'classic', pages: 'index,catalog,product?id=gin-yasnyi,product?id=whiskey-white' }, runCls);
