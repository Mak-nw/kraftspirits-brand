#!/usr/bin/env node
// Скрін-оверлей сітки: малює 10 колонок (кольорові смуги) поверх сторінки + контури блоків, яких торкається D12
// (зелений — на межах колонок, жовтий — підозріле 0.5–1px, червоний — порушення >1px). Лише для звіту, у сайт нічого не додає.
//   node tools/qa/grid-overlay.mjs [--url http://localhost:5200/] [--pages index,catalog,"product?id=gin-yasnyi",contacts,barrels,cocktails]
//        [--widths 1440] [--profile catalog|product|auto] [--out reports/grid] [--full-page] [--no-blocks]
// За замовчуванням: auto = профіль сторінки з check-ds.allow.json (grid.pageProfile); файли <сторінка>-<ширина>.png у reports/grid/.
import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, openPage, pageUrl, pageSpec, waitStable, sleep, parseArgs, ROOT, QA_DIR, runMain, Report } from './lib.mjs';
import { COLLECT_GRID, GRID_DEFAULTS, analyzeGrid, gridFor } from './grid-d12.mjs';

const DEF_PAGES = 'index,catalog,product?id=gin-yasnyi,contacts,barrels,cocktails';

/** Малює оверлей у сторінці (виконується в браузері) */
function DRAW(arg) {
  const { grid, blocks, showBlocks, label } = arg;
  const old = document.getElementById('__grid-overlay'); if (old) old.remove();
  const root = document.createElement('div'); root.id = '__grid-overlay';
  const H = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  root.style.cssText = `position:absolute;left:0;top:0;width:${grid.vw}px;height:${H}px;pointer-events:none;z-index:2147483000`;
  const hues = ['rgba(255,60,60,0.16)', 'rgba(40,120,255,0.16)'];
  grid.starts.forEach((s, k) => {
    const c = document.createElement('div');
    c.style.cssText = `position:absolute;top:0;height:${H}px;left:${s}px;width:${grid.col}px;background:${hues[k % 2]};border-left:1px solid rgba(0,0,0,0.35);border-right:1px solid rgba(0,0,0,0.35);box-sizing:border-box`;
    const n = document.createElement('div'); n.textContent = String(k + 1);
    n.style.cssText = 'position:sticky;top:0;font:700 14px/18px monospace;color:#000;background:rgba(255,255,0,0.85);width:22px;text-align:center';
    c.appendChild(n); root.appendChild(c);
  });
  if (showBlocks) for (const b of blocks) {
    const col = b.status === 'fail' ? '#e00000' : b.status === 'suspect' ? '#e0a000' : '#00a040';
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:${b.L}px;top:${b.T}px;width:${b.W}px;height:${b.H}px;outline:2px ${b.status === 'ok' ? 'dashed' : 'solid'} ${col};outline-offset:-2px;box-sizing:border-box`;
    root.appendChild(d);
  }
  const tag = document.createElement('div'); tag.textContent = label;
  tag.style.cssText = 'position:fixed;left:8px;bottom:8px;font:700 13px/16px monospace;color:#fff;background:#000;padding:3px 6px;z-index:2147483001';
  root.appendChild(tag);
  document.body.appendChild(root);
}

export async function runOverlay(o) {
  const rep = new Report('grid-overlay');
  const allow = JSON.parse(readFileSync(join(QA_DIR, 'check-ds.allow.json'), 'utf8'));
  const cfg = { ...GRID_DEFAULTS, ...(allow.grid || {}), profiles: { ...GRID_DEFAULTS.profiles, ...(allow.grid?.profiles || {}) }, pageProfile: { ...GRID_DEFAULTS.pageProfile, ...(allow.grid?.pageProfile || {}) } };
  const pages = (o.pages ? o.pagesList : DEF_PAGES.split(/,(?![^"]*")/)).map((s) => s.replace(/^"|"$/g, ''));
  const widths = o.widths.length ? o.widths : [1440];
  const outDir = resolve(ROOT, o.outDir || 'reports/grid'); mkdirSync(outDir, { recursive: true });
  const L = await launch({ scrollbar: 'none', chrome: o.chrome, out: o.out });
  try {
    for (const w of widths) for (const pg of pages) {
      const spec = pageSpec(pg);
      const page = await openPage(L.browser, pageUrl(o.url, spec, 'static'), { width: w, height: o.height, dpr: 1, settle: false });
      await waitStable(page, { selector: spec.name === 'catalog' ? '.product-card--catalog' : null }); await sleep(500);
      const data = await page.evaluate(COLLECT_GRID, { ...cfg, root: null });
      const a = analyzeGrid(data, cfg, spec.name);
      const profName = o.profile && o.profile !== 'auto' ? o.profile : a.profile;
      const grid = gridFor(cfg.profiles[profName], data.vw, data.u, cfg.cols);
      const blocks = a.results.map((r) => ({ L: r.block.L, T: r.block.T, W: r.block.W, H: r.block.H, status: r.ev.status }));
      await page.evaluate(DRAW, { grid, blocks, showBlocks: !o.noBlocks, label: `${spec.label} @${w}px · сітка «${profName}»: 10 кол, поле ${cfg.profiles[profName].marginU}u, gap ${cfg.profiles[profName].gapU}u · блоків ${a.counts.total}: ✓${a.counts.ok} ~${a.counts.suspect} ✗${a.counts.fail}` });
      await sleep(150);
      const file = join(outDir, `${spec.name}${spec.query ? '-' + spec.query.replace(/[^a-z0-9]+/gi, '_') : ''}-${w}.png`);
      await page.screenshot({ path: file, fullPage: o.fullPage !== false });
      rep.info(`${file}  (профіль ${profName}; блоків ${a.counts.total}: норма ${a.counts.ok}, підозрілих ${a.counts.suspect}, порушень ${a.counts.fail})`);
      await page.close().catch(() => {});
    }
  } finally { await L.close(); }
  return rep;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runMain('grid-overlay', { widths: '1440', scrollbar: 'none', dpr: '1' }, (o) => runOverlay(o));
}
