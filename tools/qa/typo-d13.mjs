// D13 — «текст = лише ролі .t-*» (CLAUDE.md п. 5в). Динамічна частина: для КОЖНОГО текстового вузла сторінки (елемент із прямим текстом,
// а також input/select/textarea) береться обчислений типографічний підпис (family, size, weight, line-height, letter-spacing, text-transform, font-style)
// і зіставляється з таблицею ролей. Таблицю ролей збирає ця ж сторінка: для кожного `.t-*` із base.css створюється тимчасовий елемент і береться його
// computed на поточній ширині (тому масштаб --u враховано). Роль, що не задає text-transform (успадковує), має його «будь-який» (визначається за двома батьками: none/uppercase).
//   Порушення D13:  (а) нуль збігів із ролями — «текст поза ролями»;  (б) елемент має клас `.t-x`, але його стиль ≠ `.t-x` (роль перевизначена в CSS компонента).
//   Інформація:     збіг з роллю БЕЗ класу ролі (збіг «випадковий» — у розмітці роль не призначена); `noClass` = те саме, але стиль вузла ≠ стилю батька (не просте наслідування ролі предка; рекомендація: призначити клас ролі на елемент, НЕ fail); «одна семантика — одна роль» (кластеризація за тегом заголовка / BEM-суфіксом).
// Допуски: size/line-height 0.25/0.5px, letter-spacing 0.15px (allow.json → dynamic.d13).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

/** класи ролей `.t-*`, оголошені в base.css (файл ролей) */
export function roleClassesFromBase(root = ROOT) {
  const css = readFileSync(join(root, 'src/styles/base.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...new Set([...css.matchAll(/(?:^|\})\s*\.(t-[a-z0-9-]+)\s*\{/g)].map((m) => m[1]))];
}

/** Виконується в браузері: таблиця ролей + стислий список текстових вузлів (унікальні за path|підпис|класи ролей, з лічильником) */
export function COLLECT_D13(cfg) {
  const isState = (c) => /^(is-|js-|has-|age-ok|in-view|reveal|is_|qa-)/.test(c);
  const clsOf = (el) => (typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : []);
  const own = (el) => clsOf(el).filter((c) => !isState(c) && !/^t-/.test(c));
  const seg = (el) => el.tagName.toLowerCase() + (own(el).length ? '.' + own(el).slice(0, 2).join('.') : '');
  const pathOf = (el) => { const a = []; for (let n = el, d = 0; n && n !== document.body && d < 3; n = n.parentElement, d++) a.unshift(seg(n)); return a.join(' > '); };
  const sigOf = (cs) => ({ fam: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), size: parseFloat(cs.fontSize), w: String(cs.fontWeight), lh: cs.lineHeight === 'normal' ? 'normal' : parseFloat(cs.lineHeight), ls: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing), tt: cs.textTransform, fs: cs.fontStyle });

  // ---- таблиця ролей
  const mk = (tt) => { const w = document.createElement('div'); w.setAttribute('data-qa-d13', ''); w.style.cssText = `position:fixed;left:-9999px;top:0;visibility:hidden;text-transform:${tt}`; document.body.appendChild(w); return w; };
  const wNone = mk('none'), wUp = mk('uppercase');
  const roles = {};
  for (const r of cfg.roles) {
    const a = document.createElement('span'); a.className = r; a.textContent = 'Ag'; wNone.appendChild(a);
    const b = document.createElement('span'); b.className = r; b.textContent = 'Ag'; wUp.appendChild(b);
    const sa = sigOf(getComputedStyle(a)), sb = sigOf(getComputedStyle(b));
    roles[r] = { ...sa, tt: sa.tt === sb.tt ? sa.tt : '*' };
  }
  wNone.remove(); wUp.remove();

  // ---- вузли
  const skipTag = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE', 'META', 'LINK', 'OPTION', 'OPTGROUP']);
  const vis = (el) => el.checkVisibility?.({ checkOpacity: false, checkVisibilityCSS: true }) !== false;
  const root = cfg.root ? document.querySelector(cfg.root) : document.body;
  const out = new Map();
  if (root) for (const el of [root, ...root.querySelectorAll('*')]) {
    if (skipTag.has(el.tagName) || el.closest('template, svg, [id^="__"], [data-qa-d13]')) continue;
    let text = '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
      const t = (el.getAttribute('type') || 'text').toLowerCase();
      if (['hidden', 'checkbox', 'radio', 'range', 'file', 'image', 'color'].includes(t)) continue;
      text = (el.getAttribute('placeholder') || el.value || el.getAttribute('aria-label') || '(поле)') + '';
    } else {
      text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
    }
    if (!text) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || !vis(el)) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden') continue;
    const sig = sigOf(cs), roleCls = clsOf(el).filter((c) => /^t-[a-z0-9-]+$/.test(c));
    const tag = el.tagName.toLowerCase(), c0 = own(el)[0] || '';
    const anc = []; for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) for (const c of clsOf(n)) if (/^t-[a-z0-9-]+$/.test(c)) anc.push(c);
    const inh = !!el.parentElement && JSON.stringify(sig) === JSON.stringify(sigOf(getComputedStyle(el.parentElement))); // стиль вузла = стиль батька → чисте CSS-наслідування (роль задано предком)
    const bem = (c0.match(/__([a-z0-9-]+)$/) || [])[1] || '';
    const key = `${pathOf(el)}|${roleCls.join(' ')}|${JSON.stringify(sig)}`;
    const rec = out.get(key);
    if (rec) { rec.n++; continue; }
    out.set(key, { path: pathOf(el), anc, inh, tag, bem, own: own(el).slice(0, 3).join('.'), roleCls, sig, text: text.slice(0, 40), n: 1, region: el.closest('.site-header, header') ? 'header' : el.closest('.site-footer, footer') ? 'footer' : el.closest('[data-age-gate]') ? 'gate' : 'main' });
  }
  return { roles, nodes: [...out.values()] };
}

const eqNum = (a, b, t) => typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= t : a === b;
/** збіг підпису з роллю */
export function matchRole(s, r, T) {
  return s.fam === r.fam && s.w === r.w && s.fs === r.fs && eqNum(s.size, r.size, T.size) && eqNum(s.lh, r.lh, T.lh) && Math.abs(s.ls - r.ls) <= T.ls && (r.tt === '*' || r.tt === s.tt);
}
/** різниця підпису з роллю: [бал, опис] */
export function diffRole(s, r) {
  const d = []; let score = 0;
  if (s.fam !== r.fam) { d.push(`шрифт ${s.fam}→${r.fam}`); score += 6; }
  if (s.w !== r.w) { d.push(`вага ${s.w}→${r.w}`); score += 2; }
  if (s.fs !== r.fs) { d.push(`style ${s.fs}→${r.fs}`); score += 2; }
  if (Math.abs(s.size - r.size) > 0.25) { d.push(`розмір ${+s.size.toFixed(2)}→${+r.size.toFixed(2)}px`); score += 1 + Math.abs(s.size - r.size) / r.size * 8; }
  if (!eqNum(s.lh, r.lh, 0.5)) { d.push(`lh ${typeof s.lh === 'number' ? +s.lh.toFixed(1) : s.lh}→${typeof r.lh === 'number' ? +r.lh.toFixed(1) : r.lh}px`); score += 1; }
  if (Math.abs(s.ls - r.ls) > 0.15) { d.push(`ls ${+s.ls.toFixed(2)}→${+r.ls.toFixed(2)}px`); score += 1; }
  if (r.tt !== '*' && r.tt !== s.tt) { d.push(`регістр ${s.tt}→${r.tt}`); score += 2; }
  return [score, d.join(', ')];
}
export const fmtSig = (s) => `${s.fam} ${+s.size.toFixed(2)}/${typeof s.lh === 'number' ? +s.lh.toFixed(1) : s.lh} w${s.w} ls${+s.ls.toFixed(2)} ${s.tt}${s.fs !== 'normal' ? ' ' + s.fs : ''}`;
export function nearest(s, roles) {
  let best = null; for (const [name, r] of Object.entries(roles)) { const [sc, d] = diffRole(s, r); if (!best || sc < best.score) best = { role: name, score: sc, diff: d }; }
  return best;
}

export const D13_DEFAULTS = { size: 0.25, lh: 0.5, ls: 0.15 };
const SEM_BEM = new Set(['title', 'name', 'desc', 'description', 'text', 'caption', 'label', 'price', 'note', 'lead', 'kicker', 'num', 'value', 'sub', 'subtitle', 'meta', 'copy', 'body', 'term', 'hint', 'eyebrow']);
/** семантичний ключ вузла: заголовки h1–h3 / BEM-суфікс (`__desc`, `__title` …) */
export const semKey = (n) => (/^h[1-4]$/.test(n.tag) ? n.tag : SEM_BEM.has(n.bem) ? `__${n.bem}` : null);

/**
 * collect: [{ label, spec, width, sb, gate, data:{roles,nodes} }] → { violations:[…], implicit:[…], semantic:[…], dump }
 */
export function analyzeD13(collect, A = {}) {
  const T = { ...D13_DEFAULTS, ...(A || {}) };
  const violations = [], implicit = [], noClass = [], dump = [];
  const semantic = new Map(); // `${width}|${key}` → Map(sigStr → {pages:Set, ex:[]})
  for (const c of collect) {
    const entry = { label: c.label, page: c.spec.name, width: c.width, gate: !!c.gate, roles: c.data.roles, nodes: [] };
    for (const n of c.data.nodes) {
      const matches = Object.entries(c.data.roles).filter(([, r]) => matchRole(n.sig, r, T)).map(([k]) => k);
      const ownOk = n.roleCls.length === 0 ? null : n.roleCls.every((rc) => c.data.roles[rc] && matchRole(n.sig, c.data.roles[rc], T));
      const near = matches.length ? null : nearest(n.sig, c.data.roles);
      const nodeRec = { ...n, matches, ownOk, near };
      entry.nodes.push(nodeRec);
      const where = `${n.path}${n.roleCls.length ? '.' + n.roleCls.join('.') : ''}`;
      if (n.roleCls.length && !ownOk) violations.push({ kind: 'роль перевизначена', page: c.label, pageName: c.spec.name, width: c.width, selector: where, text: n.text, nodes: n.n, sig: n.sig, near: { role: n.roleCls[0], diff: c.data.roles[n.roleCls[0]] ? diffRole(n.sig, c.data.roles[n.roleCls[0]])[1] : 'роль не знайдена в base.css', score: 0 }, role: n.roleCls.join(' '), matches });
      else if (!matches.length) violations.push({ kind: 'поза ролями', page: c.label, pageName: c.spec.name, width: c.width, selector: where, text: n.text, nodes: n.n, sig: n.sig, near, role: '' });
      else if (!n.roleCls.length) { const rec = { page: c.label, pageName: c.spec.name, width: c.width, selector: n.path, text: n.text, nodes: n.n, sig: n.sig, matches, ancRoles: n.anc, inherited: n.inh }; implicit.push(rec); if (!n.inh) noClass.push(rec); } // стиль збігається з роллю за значеннями, `.t-*` на елементі немає, і стиль НЕ є чистим наслідуванням від батька (вузол сам задає начерк, що випадково = ролі)
      const sk = semKey(n);
      if (sk) {
        const k = `${c.width}|${sk}`; const m = semantic.get(k) || semantic.set(k, new Map()).get(k);
        const sid = matches.length ? matches.join('+') : `≈${nearest(n.sig, c.data.roles).role} (${fmtSig(n.sig)})`;
        const g = m.get(sid) || m.set(sid, { pages: new Set(), ex: [] }).get(sid);
        g.pages.add(c.spec.label || c.spec.name); if (g.ex.length < 3) g.ex.push(`${n.path} «${n.text.slice(0, 20)}»`);
      }
    }
    dump.push(entry);
  }
  const sem = [];
  for (const [k, m] of semantic) if (m.size > 1) { const [width, key] = k.split('|'); sem.push({ width: +width, key, variants: [...m].map(([sid, g]) => ({ role: sid, pages: [...g.pages], examples: g.ex })) }); }
  return { violations, implicit, noClass, semantic: sem, dump, tolerances: T };
}
