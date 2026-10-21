// D16 — hug/padding кнопок (рішення замовника: «для кнопок зробити hug по ширині, аби врахував падінги»).
// Кнопка із заливкою/рамкою = ширина вмісту + горизонтальні падінги (як hug contents в autolayout), а не фіксована/обмежена ширина, що з'їдає падінги.
// Для кожного цілі (allow.json → dynamic.d16.targets: селектор + мін. падінг як CSS-вираз із токенів) у станах default / hover / focus-visible (CDP forcePseudoState):
//   (а) scrollWidth ≤ clientWidth (+tolerancePx) — вміст не обрізається/не вилазить;
//   (б) відступ вмісту (текст, іконка, зображення; позиціонування absolute/fixed ігнорується) від лівого і правого краю border-box ≥ мін. падінг − tolerancePx.
// Винятки (d16.exclude) документовані в allow.json: чіпи/таби/перемикач об'єму (текст без заливки, hover-плашка виходить назовні псевдоелементом), catalog-nav__item, select__button, кнопки-картинки, квадратні контроли карти.
// Позитивний контроль (controlD16): у цій самій сторінці вмикається <style>, що ламає ширину цілей (width:min-content, padding 0, max-width) → перевірка МАЄ впасти, інакше сама D16 зламана.

export const D16_DEFAULTS = {
  tolerancePx: 1,
  targets: [
    { name: '.nav-cell', sel: '.nav-cell:not(.nav-cell--square)', min: 'var(--header3-menu-item-px)' },
    { name: '.btn', sel: '.btn', min: 'calc(var(--space-5) + var(--border-hairline) + var(--space-btn-pr-arrow))' },
    { name: '.arrow-btn', sel: '.arrow-btn', min: 'calc(var(--space-5) + var(--border-hairline))' },
    { name: '.topic-tile', sel: '.topic-tile', min: 'calc(var(--space-20) + var(--border-hairline))' },
    { name: '.select', sel: '.select:not(.select--field)', min: 'var(--space-select-px)' },
    { name: 'a.remove', sel: 'a.remove', min: 'var(--space-5)' },
  ],
};

/** у браузері: cfg = { targets:[{name,sel,min}], breakCss? } -> [{ name, el, text, w, sw, cw, gapL, gapR, req, state }] (state додає Node) */
export function COLLECT_D16(cfg) {
  const out = [];
  const pxOf = (expr) => { const t = document.createElement('div'); t.style.cssText = `position:absolute;visibility:hidden;height:0;width:${expr}`; document.body.appendChild(t); const w = t.getBoundingClientRect().width; t.remove(); return w; };
  const nameOf = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '');
  const extent = (root) => {
    let l = Infinity, r = -Infinity;
    const take = (a, b) => { if (b - a > 0.01) { l = Math.min(l, a); r = Math.max(r, b); } };
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) {
          if (!c.nodeValue.trim()) continue;
          const rg = document.createRange(); rg.selectNodeContents(c);
          for (const q of rg.getClientRects()) take(q.left, q.right);
        } else if (c.nodeType === 1) {
          const cs = getComputedStyle(c);
          if (cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed') continue;
          const hasKids = [...c.childNodes].some((k) => (k.nodeType === 1) || (k.nodeType === 3 && k.nodeValue.trim()));
          if (!hasKids) { const b = c.getBoundingClientRect(); take(b.left, b.right); } else walk(c);
        }
      }
    };
    walk(root);
    return [l, r];
  };
  const seen = new Set();
  for (const t of cfg.targets) {
    const req = pxOf(t.min);
    for (const el of document.querySelectorAll(t.sel)) {
      if (seen.has(el) || el.closest('template')) continue;
      const b = el.getBoundingClientRect();
      if (b.width < 1 || b.height < 1 || el.checkVisibility?.() === false) continue;
      seen.add(el);
      const [l, r] = extent(el);
      out.push({ name: t.name, el: nameOf(el), text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28), w: b.width, sw: el.scrollWidth, cw: el.clientWidth, gapL: Number.isFinite(l) ? l - b.left : null, gapR: Number.isFinite(r) ? b.right - r : null, req });
    }
  }
  return out;
}

/** три стани: default / hover / focus-visible через CDP; повертає плаский список записів із полем state */
export async function probeD16(page, cfg = D16_DEFAULTS, { sleepMs = 120 } = {}) {
  const cdp = await page.createCDPSession();
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const res = [];
  const run = (state) => page.evaluate(COLLECT_D16, cfg).then((a) => a.forEach((x) => res.push({ ...x, state })));
  try {
    await run('default');
    const sels = cfg.targets.map((t) => t.sel).join(',');
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const q = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: sels });
    for (const state of ['hover', 'focus-visible']) {
      for (const nodeId of q.nodeIds) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [state] }).catch(() => {});
      await new Promise((r) => setTimeout(r, sleepMs));
      await run(state === 'hover' ? 'hover' : 'focus');
      for (const nodeId of q.nodeIds) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] }).catch(() => {});
    }
  } finally { await cdp.detach().catch(() => {}); }
  return res;
}

/** records: [{ label, data }] -> [{ page, selector, value, msg }] */
export function analyzeD16(collect, A = {}) {
  const tol = A.tolerancePx ?? D16_DEFAULTS.tolerancePx;
  const out = []; const seen = new Set();
  for (const c of collect) {
    for (const d of c.data) {
      const bad = [];
      if (d.sw > d.cw + tol) bad.push(`вміст ширший за кнопку: scrollWidth ${d.sw} > clientWidth ${d.cw}`);
      if (d.gapL != null && d.gapL < d.req - tol) bad.push(`відступ вмісту зліва ${d.gapL.toFixed(1)}px < падінг ${d.req.toFixed(1)}px`);
      if (d.gapR != null && d.gapR < d.req - tol) bad.push(`відступ вмісту справа ${d.gapR.toFixed(1)}px < падінг ${d.req.toFixed(1)}px`);
      if (!bad.length) continue;
      const k = `${c.label}|${d.el}|${d.text}|${bad.join(';')}`;
      if (seen.has(k)) continue; seen.add(k);
      out.push({ page: `${c.label} [${d.state}]`, selector: `${d.el} «${d.text}»`, value: `ширина ${d.w.toFixed(1)}px`, msg: `${bad.join('; ')} (hug: ширина = вміст + падінги)` });
    }
  }
  return out;
}

/** позитивний контроль: ламає ширину цілей у поточній сторінці й повертає кількість порушень (має бути > 0); стилі прибираються */
export async function controlD16(page, cfg = D16_DEFAULTS, A = {}) {
  const sels = cfg.targets.map((t) => t.sel);
  const css = sels.map((s) => `${s}{width:min-content !important;max-width:min-content !important;padding-inline:0 !important;overflow:visible !important}`).join('\n');
  const handle = await page.addStyleTag({ content: css });
  let n = 0;
  try {
    await new Promise((r) => setTimeout(r, 100));
    const data = await probeD16(page, cfg);
    n = analyzeD16([{ label: 'control', data }], A).length;
  } finally { await page.evaluate((h) => h.remove(), handle).catch(() => {}); }
  return n;
}
