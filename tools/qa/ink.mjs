// Піксельний (ink) замір вирівнювання «елемент ↔ перший гліф підпису» — еталон для D11 і для перевірки «на підозру».
// Метод: два знімки одного й того ж місця при високому DPR — звичайний і з приховано-прозорими елементом/гліфом; різниця знімків = маска «чорнила»
// БЕЗ впливу фону (візерунки, картки). Рядки маски з покриттям ≥ порогу від піку дають верх і низ чорнила → центр (у CSS px).
// Для тексту береться ПЕРШИЙ гліф першого рядка (Range по першому символу): для великої літери це cap-height (верх капітелі → базова лінія).
// Для чекбокса/іконки «елемент» = border-box (рамка/заливка/іконка), для .btn__arrow-подібних — будь-яка видима графіка всередині.

/** знімок clip (CSS px) -> base64 PNG; аналіз — у браузері через canvas (без зовнішніх залежностей) */
const shot = (page, clip, o) => page.screenshot({ clip: { ...clip, x: clip.x + o.sx, y: clip.y + o.sy }, type: 'png', encoding: 'base64' });
/** вертикальні межі маски різниці двох PNG у діапазонах x (пікселі знімка); bottom ексклюзивно */
async function inkRowsBoth(page, a64, b64, ranges, frac = 0.5)  /* ranges: [x0,x1,y0,y1] */ {
  return page.evaluate(async (a64, b64, ranges, frac) => {
    const load = async (b) => { const bm = await createImageBitmap(await (await fetch(`data:image/png;base64,${b}`)).blob()); const c = new OffscreenCanvas(bm.width, bm.height); const g = c.getContext('2d'); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, bm.width, bm.height); };
    const A = await load(a64), B = await load(b64);
    return ranges.map(([x0, x1, y0 = 0, y1 = 1e9]) => {
      const rows = new Float32Array(A.height);
      for (let y = Math.max(0, y0); y < Math.min(A.height, y1); y++) { let m = 0; for (let x = Math.max(0, x0); x < Math.min(A.width, x1); x++) { const i = (y * A.width + x) * 4; const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2])); if (d > m) m = d; } rows[y] = m; }
      const peak = Math.max(...rows); if (peak < 24) return null;
      let top = -1, bottom = -1; for (let y = 0; y < A.height; y++) if (rows[y] >= peak * frac && rows[y] > 0) { if (top < 0) top = y; bottom = y + 1; }
      return top < 0 ? null : { top, bottom, w: A.width };
    });
  }, a64, b64, ranges, frac);
}

/**
 * Міряє центр «графіки» (box) і центр чорнила першого гліфа підпису (label) у CSS px.
 * pair: { boxSel, labelSel, within? } — within = CSS-селектор батька, у якому шукати (перший видимий збіг).
 * Повертає { boxC, textC, delta (box−text; >0 = бокс нижче), glyph, boxH } або null.
 */
export async function inkPair(page, pair) {
  const dpr = page.viewport()?.deviceScaleFactor || 1;
  const has = await page.evaluate((p) => {
    const vis = (e) => e.getBoundingClientRect().width > 0 && e.checkVisibility?.({ checkVisibilityCSS: true });
    const root = p.within ? [...document.querySelectorAll(p.within)].find((e) => e.checkVisibility?.()) : document;
    if (!root) return false;
    let box, lab;
    if (p.container) { // іконка + текст у контейнері (.btn__inner, .nav-cell): label = елемент, що тримає перший текстовий вузол поза іконкою
      const c = [...root.querySelectorAll(p.container)].filter(vis)[p.nth || 0]; if (!c) return false;
      box = [...c.querySelectorAll(p.boxSel)].find(vis); if (!box) return false;
      const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n = tw.nextNode(); while (n && (!n.textContent.trim() || box.contains(n))) n = tw.nextNode(); if (!n) return false;
      lab = n.parentElement;
    } else {
      box = [...root.querySelectorAll(p.boxSel)].filter(vis)[p.nth || 0]; lab = [...root.querySelectorAll(p.labelSel)].filter(vis)[p.nth || 0];
    }
    if (!box || !lab) return false;
    window.__ink = { box, lab, skip: p.container ? box : null }; box.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); return true;
  }, pair);
  if (!has) return null;
  await new Promise((r) => setTimeout(r, 350));
  const raf2 = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await raf2();
  const info = await page.evaluate(() => {
    const { box, lab, skip } = window.__ink; const b = box.getBoundingClientRect();
    const tw = document.createTreeWalker(lab, NodeFilter.SHOW_TEXT); let n = tw.nextNode(); while (n && (!n.textContent.trim() || (skip && skip.contains(n)))) n = tw.nextNode();
    const s = n.textContent.search(/\S/); const ch = n.textContent[s]; const up = ch.toLocaleUpperCase('uk'); // перший малий гліф міряємо як велику літеру: «оптичний» орієнтир — cap-height, не x-height
    window.__ink.fix = null; if (up !== ch && up.length === 1) { n.replaceData(s, 1, up); window.__ink.fix = { n, s, ch }; }
    const rg = document.createRange(); rg.setStart(n, s); rg.setEnd(n, s + 1); const g = rg.getBoundingClientRect();
    return { glyph: n.textContent[s], b: { l: b.left, r: b.right, t: b.top, bt: b.bottom }, g: { l: g.left, r: g.right, t: g.top, b: g.bottom } };
  });
  const pad = 4, x0 = Math.floor(Math.min(info.b.l, info.g.l)) - pad, x1 = Math.ceil(Math.max(info.b.r, info.g.r)) + pad;
  const y0 = Math.floor(Math.min(info.b.t, info.g.t)) - pad, y1 = Math.ceil(Math.max(info.b.bt, info.g.b)) + pad;
  const snap = () => page.screenshot({ type: 'png', encoding: 'base64' }); // весь в'юпорт: піксель (x·dpr, y·dpr) = CSS-координата, без clip (clip залежить від скролу/ресайзу)
  const A = await snap();
  await page.evaluate(() => { const k = window.__ink; k.s = { bv: k.box.style.visibility, lc: k.lab.style.color, lt: k.lab.style.transition, bt: k.box.style.transition }; k.box.style.transition = 'none'; k.lab.style.transition = 'none'; k.box.style.visibility = 'hidden'; k.lab.style.color = 'transparent'; });
  await raf2();
  const B = await snap();
  await page.evaluate(() => { const k = window.__ink; k.box.style.visibility = k.s.bv; k.lab.style.color = k.s.lc; k.box.style.transition = k.s.bt; k.lab.style.transition = k.s.lt; if (k.fix) k.fix.n.replaceData(k.fix.s, 1, k.fix.ch); delete window.__ink; });
  const sx = dpr;
  const [bx, tx] = await inkRowsBoth(page, A, B, [[Math.round((info.b.l + 1) * sx), Math.round((info.b.r - 1) * sx), Math.round((y0) * sx), Math.round((y1) * sx)], [Math.round(info.g.l * sx), Math.round(info.g.r * sx), Math.round((info.g.t - 1) * sx), Math.round((info.g.b + 1) * sx)]]);
  if (!bx || !tx) return { error: 'немає чорнила', glyph: info.glyph, box: !!bx, text: !!tx };
  const boxC = (bx.top + bx.bottom) / 2 / sx, textC = (tx.top + tx.bottom) / 2 / sx;
  return { glyph: info.glyph, boxC, textC, delta: boxC - textC, boxH: (bx.bottom - bx.top) / sx, glyphH: (tx.bottom - tx.top) / sx, dpr };
}
