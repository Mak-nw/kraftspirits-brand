#!/usr/bin/env node
// links: обхід усіх внутрішніх <a href> на всіх сторінках: HTTP 200 (з урахуванням base), цілі якорів існують, не 404; матриця «звідки → куди».
//   node tools/qa/links.mjs [--url http://localhost:5200/ | https://mak-nw.github.io/kraftspirits-brand/] [--pages …] [--matrix] [--delay 60]
import { Report, runMain, launch, openPage, pageUrl, pageSpec, waitStable, sleep, outFile } from './lib.mjs';
import { writeFileSync } from 'node:fs';

export async function runLinks(o) {
  const rep = new Report('links');
  const L = await launch({ scrollbar: 'none', chrome: o.chrome, out: o.out });
  const base = new URL(o.url);
  const edges = []; // { from, href, abs, text }
  const pageInfo = new Map(); // abs page url (без hash) -> { status, ids:Set }
  try {
    // 1) зібрати посилання з кожної сторінки
    for (const spec0 of o.pagesList) {
      const spec = pageSpec(spec0);
      const page = await openPage(L.browser, pageUrl(o.url, spec, 'static'), { width: 1440, height: o.height, settle: false });
      await waitStable(page, { selector: spec.name === 'catalog' ? '.product-card--catalog a, .product-card--catalog' : null });
      const data = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
        const names = [...document.querySelectorAll('a[name]')].map((e) => e.getAttribute('name'));
        const links = [...document.querySelectorAll('a[href]')].filter((a) => !a.closest('template')).map((a) => ({ raw: a.getAttribute('href'), abs: a.href, text: (a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) }));
        return { ids: [...ids, ...names], links, baseURI: document.baseURI };
      });
      pageInfo.set(page.url().split('#')[0].split('?')[0] + '|' + spec.query, { status: page.__status, ids: new Set(data.ids), spec });
      pageInfo.get(page.url().split('#')[0].split('?')[0] + '|' + spec.query).label = spec.label;
      for (const l of data.links) edges.push({ from: spec.label, ...l });
      if (page.__status >= 400) rep.add({ rule: 'L1', page: spec.label, selector: 'сторінка', value: `HTTP ${page.__status}`, msg: 'сама сторінка недоступна' });
      await page.close().catch(() => {});
    }
    // 2) унікальні цілі
    const targets = new Map(); // key (abs without hash) -> { hashes:Set, froms }
    const SERVICE = ['age', 'reveal', 'parallax'];
    const clean = (abs) => { const u = new URL(abs); for (const k of SERVICE) u.searchParams.delete(k); return u; }; // службові параметри перевірок не є частиною посилання
    for (const e of edges) {
      let u; try { u = clean(e.abs); e.abs = u.href; } catch { rep.add({ rule: 'L2', page: e.from, selector: `a[href="${e.raw}"]`, value: e.raw, msg: 'некоректний URL' }); continue; }
      if (!/^https?:$/.test(u.protocol)) continue; // mailto:, tel:
      const internal = u.origin === base.origin;
      if (!internal) { e.external = true; continue; }
      const key = u.origin + u.pathname + u.search;
      const t = targets.get(key) || { hashes: new Set(), froms: [], url: key };
      if (u.hash) t.hashes.add(u.hash.slice(1)); t.froms.push(e); targets.set(key, t);
    }
    const ext = new Set(edges.filter((e) => e.external).map((e) => e.abs));
    // 3) перевірити статус і якорі
    const verified = new Map();
    for (const [key, t] of targets) {
      const probe = await openPage(L.browser, key, { width: 1440, height: o.height, settle: false });
      await waitStable(probe);
      const ids = new Set(await probe.evaluate(() => [...document.querySelectorAll('[id]')].map((e) => e.id).concat([...document.querySelectorAll('a[name]')].map((e) => e.getAttribute('name')))));
      // 404.html на GitHub Pages віддає 404 для невідомих шляхів: статус 404 (сторінка 404.html у збірці) — теж порушення для цілей
      verified.set(key, { status: probe.__status, finalUrl: probe.url(), ids });
      const bad = probe.__status >= 400;
      const isNotFoundPage = await probe.evaluate(() => /Сторінка не знайдена/i.test(document.title + ' ' + (document.querySelector('h1')?.textContent || '')));
      for (const e of t.froms) {
        if (bad) rep.add({ rule: 'L1', page: e.from, selector: `a[href="${e.raw}"] «${e.text}»`, value: `HTTP ${probe.__status}`, msg: 'внутрішнє посилання веде на 4xx/5xx' });
        else if (isNotFoundPage && !/404/.test(key)) rep.add({ rule: 'L1', page: e.from, selector: `a[href="${e.raw}"] «${e.text}»`, value: '200, але сторінка «не знайдена»', msg: 'посилання веде на 404-вміст' });
      }
      if (!bad) for (const h of t.hashes) {
        if (h && !ids.has(decodeURIComponent(h)) && !isDynamicHash(h)) for (const e of t.froms.filter((x) => new URL(x.abs).hash === `#${h}`)) rep.add({ rule: 'L3', page: e.from, selector: `a[href="${e.raw}"] «${e.text}»`, value: `#${h}`, msg: 'якір відсутній на цільовій сторінці' });
      }
      await probe.close().catch(() => {});
      if (o.delay) await sleep(Number(o.delay));
    }
    // 4) якорі в межах поточної сторінки (href="#x") — перевіряються через targets (abs = поточна сторінка + #x), окремо не потрібно.
    // 5) матриця «звідки → куди»
    const matrix = {};
    for (const e of edges) { if (e.external) continue; let u; try { u = new URL(e.abs); } catch { continue; } if (!/^https?:$/.test(u.protocol)) continue; if (u.origin !== base.origin) continue; const to = (u.pathname.replace(base.pathname, '') || 'index.html') + u.search + u.hash; (matrix[e.from] ||= new Set()).add(to); }
    const mx = Object.fromEntries(Object.entries(matrix).map(([k, v]) => [k, [...v].sort()]));
    rep.stats = { pages: o.pagesList.length, links: edges.length, internalTargets: targets.size, external: ext.size, matrix: mx };
    if (o.matrix) {
      const all = Object.values(mx); const common = all[0]?.filter((t) => all.every((v) => v.includes(t))) || [];
      console.log(`  спільні (на всіх ${all.length} сторінках: хедер/футер): ${common.join('  ')}`);
      for (const [k, v] of Object.entries(mx)) console.log(`  ${k} → ${v.filter((t) => !common.includes(t)).join('  ') || '(лише спільні)'}`);
    }
    try { writeFileSync(outFile(o, 'links-matrix.json'), JSON.stringify(mx, null, 2)); } catch {}
    rep.note(`сторінок ${o.pagesList.length}, посилань ${edges.length}, унікальних внутрішніх цілей ${targets.size}, зовнішніх ${ext.size} (зовнішні не перевіряються); матриця: ${outFile(o, 'links-matrix.json')}`);
  } finally { await L.close(); }
  return rep;
}
// каталог читає hash як категорію: #gift-sets → фільтр gift-sets (за README), тому для catalog.html хеші-категорії не є якорями DOM
const isDynamicHash = (h) => /^(all|gin|calvados|schnapps|tinctures|whisky|fruit-in-bottle|gift-sets)$/.test(h);
if (import.meta.url === `file://${process.argv[1]}`) await runMain('links', { widths: '1440' }, runLinks);
