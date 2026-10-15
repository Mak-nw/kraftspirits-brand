// Ink-замір верху першого рядка заголовка блоку коктейлю (.cocktail__title) проти верху фото (.product-stage) і картки (.product-card) — dpr 4, різниця знімків «з/без» тексту.
// Верх = верх капітелі ПЕРШОЇ літери (рядок маски з покриттям ≥ 30% піку цього гліфа); гачок Ґ / риска Й / апостроф, що виходять над капітеллю, малим покриттям не рахуються.
import { launch, openPage, pageUrl, runMain, Report, sleep } from './lib.mjs';
const DEF = { dpr: '4', widths: '1200,1440,1728,1920', scrollbar: 'classic,none', url: 'http://localhost:5411/', pages: 'cocktails' };
runMain('cocktail-ink', DEF, async (o) => {
  const rep = new Report('cocktail-ink', o);
  const rows = []; const D = Number(o.dpr[0]) || 4;
  for (const sb of o.scrollbar) {
    const h = await launch({ scrollbar: sb, out: o.out });
    try {
      for (const w of o.widths) {
        const page = await openPage(h.browser, pageUrl(o.url, 'cocktails', 'static'), { width: w, height: 520, dpr: D });
        const n = await page.evaluate(() => document.querySelectorAll('.cocktail').length);
        for (let i = 0; i < n; i++) {
          await page.evaluate((i) => { const t = document.querySelectorAll('.cocktail')[i].querySelector('.cocktail__title'); scrollTo({ top: Math.round(t.getBoundingClientRect().top + scrollY - 160), behavior: 'instant' }); /* ціле зміщення скролу, як у користувача на dpr 1 */ }, i);
          await sleep(400);
          const g = await page.evaluate((i) => {
            const a = document.querySelectorAll('.cocktail')[i]; const t = a.querySelector('.cocktail__title'); window.__t = t;
            const r = (e) => { const b = e.getBoundingClientRect(); return { t: b.top, l: b.left, w: b.width, h: b.height }; };
            const rg = document.createRange(); rg.setStart(t.firstChild, 0); rg.setEnd(t.firstChild, 1);
            const f = rg.getBoundingClientRect();
            return { title: t.textContent.trim(), stage: r(a.querySelector('.product-stage')), card: a.querySelector('.product-card') ? r(a.querySelector('.product-card')) : null, tt: r(t), g: { t: f.top, b: f.bottom, l: f.left, r: f.right }, sy: scrollY, fs: parseFloat(getComputedStyle(t).fontSize) };
          }, i);
          const x0 = 0, y0 = 0; // знімок усього в'юпорта: піксель (x·4, y·4) = CSS-координата
          const A = await page.screenshot({ type: 'png', encoding: 'base64' });
          await page.evaluate(() => { window.__t.style.color = 'transparent'; });
          await sleep(50);
          const B = await page.screenshot({ type: 'png', encoding: 'base64' });
          await page.evaluate(() => { window.__t.style.color = ''; });
          const gx0 = Math.max(0, Math.floor((g.g.l - x0) * D)), gx1 = Math.ceil((g.g.r - x0) * D), gy0 = Math.floor((g.tt.t - 4) * D), gy1 = Math.ceil((g.g.b + 2) * D);
          const top = await page.evaluate(async (A, B, gx0, gx1, gy0, gy1) => {
            const load = async (b) => { const bm = await createImageBitmap(await (await fetch(`data:image/png;base64,${b}`)).blob()); const c = new OffscreenCanvas(bm.width, bm.height); const gg = c.getContext('2d'); gg.drawImage(bm, 0, 0); return gg.getImageData(0, 0, bm.width, bm.height); };
            const a = await load(A), b = await load(B); const rows = new Float32Array(a.height);
            for (let y = Math.max(0, gy0); y < Math.min(a.height, gy1); y++) { let c = 0; for (let x = gx0; x < Math.min(a.width, gx1); x++) { const k = (y * a.width + x) * 4; const d = Math.max(Math.abs(a.data[k] - b.data[k]), Math.abs(a.data[k + 1] - b.data[k + 1]), Math.abs(a.data[k + 2] - b.data[k + 2])); if (d > 24) c++; } rows[y] = c; }
            const peak = Math.max(...rows); let top = -1; for (let y = Math.max(0, gy0); y < Math.min(a.height, gy1); y++) if (rows[y] >= peak * 0.3) { top = y; break; }
            return top;
          }, A, B, gx0, gx1, gy0, gy1);
          const inkTop = y0 + top / D;
          rows.push({ capOff: +(inkTop - g.tt.t).toFixed(2), titleTop: +g.tt.t.toFixed(2), sb, w, i, title: g.title, d_stage: +(inkTop - g.stage.t).toFixed(2), d_card: g.card ? +(inkTop - g.card.t).toFixed(2) : null, stageTop: +g.stage.t.toFixed(2), cardTop: g.card ? +g.card.t.toFixed(2) : null, fs: g.fs });
        }
        await page.close();
      }
    } finally { await h.close(); }
  }
  const bad = rows.filter((r) => Math.abs(r.d_stage) > 1 || (r.d_card !== null && Math.abs(r.d_card) > 1));
  for (const r of rows) console.log(`fs ${r.fs} capOff ${r.capOff} title ${r.titleTop} stage ${r.stageTop} | ${r.sb} ${r.w} #${r.i + 1} ${r.title.padEnd(22)} stage ${String(r.d_stage).padStart(6)} card ${String(r.d_card).padStart(6)}${Math.abs(r.d_stage) > 1 || Math.abs(r.d_card ?? 0) > 1 ? '  <<<' : ''}`);
  console.log(`max |d|: ${Math.max(...rows.map((r) => Math.max(Math.abs(r.d_stage), Math.abs(r.d_card ?? 0))))}, >1px: ${bad.length}`);
  for (const b of bad) rep.add({ rule: 'INK', page: `${b.sb}@${b.w}`, selector: `#${b.i + 1} ${b.title}`, value: `stage ${b.d_stage} card ${b.d_card}` });
  rep.stats = { rows }; return rep;
});
