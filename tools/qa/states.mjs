#!/usr/bin/env node
// states: стани кнопок (default / hover / focus / active / disabled [+ selected]) — computed значення з реальних елементів проти розв'язаних токенів
// --btn-<варіант>-<властивість>-<стан> (tokens.css, README «Токени кнопок»). Також перевіряє транзиції станів (default/hover = --btn-transition-duration ≥ 0.3s,
// focus/active = --btn-transition-duration-focus 0.15s) і товщину фокус-кільця.
//   node tools/qa/states.mjs [--url …] [--widths 1920] [--scrollbar classic|none] [--only btn,nav-cell] [--json]
// Сімейства: btn(gold|light|beige|green|teal|outline), nav-cell(outline|fill|ghost), arrow-btn, chip, chip-picker, nav-link(+on-light), quantity (cart: .quantity__btn).
// НЕ покрито (немає загальної DOM-схеми; перевіряються лише через design-system.html вручну): select, check, row-faq, row-product, catnav, thumb, volume, choice.
import { Report, runMain, launch, openPage, pageUrl, pageSpec, matrix, tokens, normColors, safeHover, unhover, waitStable, sleep } from './lib.mjs';

const BAD_CLS = ['is-hover', 'is-focus', 'is-pressed', 'is-disabled', 'is-forced']; // демо design-system з примусовими станами (is-active — лише для не-чіпів)
const SELF = ':self';

/** інвентар родин: sel — селектор кандидатів; match(el) — уточнення варіанта; props: бере computed з елемента (селектор усередині або :self) */
const FAMILIES = [
  ...['gold', 'light', 'beige', 'green', 'teal', 'outline'].map((v) => ({
    family: 'btn', variant: v, token: v, sel: `.btn--${v}`,
    match: null,
    props: { bg: { el: '.btn__inner', css: 'backgroundColor' }, text: { el: '.btn__inner', css: 'color' }, border: { el: SELF, css: 'borderTopColor' } },
    trans: '.btn__inner', ring: 'btn', states: ['default', 'hover', 'focus', 'active', 'disabled'],
  })),
  ...['outline', 'fill', 'ghost'].map((v) => ({
    family: 'nav-cell', variant: v, token: `nav-${v}`, sel: `.nav-cell--${v}`, match: (el) => !el.matches(':disabled, [aria-disabled="true"]'),
    props: { bg: { el: SELF, css: 'backgroundColor' }, text: { el: SELF, css: 'color' }, ...(v === 'ghost' ? {} : { border: { el: SELF, css: 'borderTopColor' } }) },
    trans: SELF, ring: 'focus', states: ['default', 'hover', 'focus', 'active', 'disabled'],
  })),
  { family: 'arrow-btn', variant: 'arrow', token: 'arrow', sel: '.arrow-btn:not(.arrow-btn--light)', props: { bg: { el: SELF, css: 'backgroundColor' }, border: { el: SELF, css: 'borderTopColor' }, 'icon-filter': { el: 'img', css: 'filter', raw: true } }, trans: SELF, ring: 'focus', states: ['default', 'hover', 'focus', 'active', 'disabled'] },
  { family: 'arrow-btn', variant: 'arrow-light', token: 'light', sel: '.arrow-btn--light', props: { bg: { el: SELF, css: 'backgroundColor' }, border: { el: SELF, css: 'borderTopColor', token: 'arrow-light' } }, trans: SELF, ring: 'focus', states: ['default', 'hover', 'focus', 'active', 'disabled'] }, // заливка = токени btn--light, рамка = --btn-arrow-light-border-* (темно-зелена, 2 hairline, незмінна в станах); шеврон темний без інверсії (фільтр none в усіх станах)
  // степер кількості (cart: .quantity__btn «+»): власних токенів --btn-* немає, очікування — з базових токенів (--color-green/--color-beige, --btn-active-mix); перехід у всіх станах = --btn-transition-duration; disabled — нативний атрибут
  { family: 'quantity', variant: 'qty-btn', token: 'qty', sel: '.quantity__btn:last-of-type', props: { bg: { el: SELF, css: 'backgroundColor' }, text: { el: SELF, css: 'color' } }, trans: SELF, ring: 'focus', states: ['default', 'hover', 'focus', 'active', 'disabled'], disabledAttr: 'disabled', transAll: true,
    expRaw: (tk, state) => { const g = tk['--color-green']?.value, b = tk['--color-beige']?.value, mix = tk['--btn-active-mix']?.raw; return { default: { bg: 'transparent', text: g }, hover: { bg: g, text: b }, focus: { bg: g, text: b }, active: { bg: `color-mix(in srgb, ${g} ${mix}, rgb(0,0,0))`, text: b }, disabled: { bg: 'transparent', text: g } }[state]; } },
  { family: 'chip', variant: 'chip', token: 'chip', sel: '.chip', match: (el) => !el.closest('.picker') && !el.classList.contains('is-active') && el.getAttribute('aria-pressed') !== 'true', props: { text: { el: SELF, css: 'color' } }, trans: SELF, ring: 'focus', states: ['default', 'hover', 'focus'] },
  { family: 'chip', variant: 'chip (selected)', token: 'chip', sel: '.chip', match: (el) => !el.closest('.picker') && (el.classList.contains('is-active') || el.getAttribute('aria-pressed') === 'true'), props: { text: { el: SELF, css: 'color' } }, trans: SELF, states: ['selected'] },
  { family: 'chip', variant: 'chip-picker', token: 'chip-picker', sel: '.picker .chip', match: (el) => !el.classList.contains('is-active') && el.getAttribute('aria-pressed') !== 'true', props: { text: { el: SELF, css: 'color' } }, trans: SELF, ring: 'focus', states: ['default', 'hover', 'focus'] },
  { family: 'chip', variant: 'chip-picker (selected)', token: 'chip-picker', sel: '.picker .chip', match: (el) => el.classList.contains('is-active') || el.getAttribute('aria-pressed') === 'true', props: { text: { el: SELF, css: 'color' } }, trans: SELF, states: ['selected'] },
  { family: 'nav-link', variant: 'navlink', token: 'navlink', sel: 'a.nav-link', match: (el) => !el.classList.contains('nav-link--on-light') && !el.classList.contains('nav-cell'), props: { text: { el: SELF, css: 'color' } }, trans: SELF, ring: 'focus', states: ['default', 'hover', 'focus'] },
  { family: 'nav-link', variant: 'navlink-light', token: 'navlink-light', sel: 'a.nav-link.nav-link--on-light', props: { text: { el: SELF, css: 'color' } }, trans: SELF, ring: 'focus', states: ['default', 'hover', 'focus'] },
];
const POOL = ['index', 'cart', 'catalog', 'product?id=gin-yasnyi', 'product?id=whiskey-white', 'feedback', 'barrels', '404', 'design-system'];

/** знайти придатний видимий елемент; у design-system пропускаємо демо із примусовими класами станів */
async function findEl(page, fam) {
  return (await page.evaluateHandle((sel, matchSrc, bad) => {
    const match = matchSrc ? eval(`(${matchSrc})`) : null;
    for (const el of document.querySelectorAll(sel)) {
      if (el.closest('template, [data-age-gate], [id^="__"]')) continue;
      if (bad.some((c) => el.closest('.' + c))) continue;
      if (!el.classList.contains('chip') && el.classList.contains('is-active')) continue;
      if (el.matches(':disabled, [aria-disabled="true"]')) continue;
      if (!el.checkVisibility?.({ checkVisibilityCSS: true }) || el.getBoundingClientRect().width < 4) continue;
      if (match && !match(el)) continue;
      // елемент має бути реально досяжним: видимий (opacity), не pointer-events:none, не закритий накладкою (напр. закрите випадне меню)
      let op = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity);
      if (op < 0.9 || getComputedStyle(el).pointerEvents === 'none') continue;
      const r0 = el.getBoundingClientRect();
      scrollTo({ top: Math.max(0, r0.top + scrollY - innerHeight * 0.55), behavior: 'instant' });
      const r = el.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!t || !(el === t || el.contains(t))) continue;
      return el;
    }
    return null;
  }, fam.sel, fam.match ? fam.match.toString() : null, BAD_CLS)).asElement();
}

const read = (h, fam) => h.evaluate((root, props, trans) => {
  const out = {};
  for (const [k, { el, css }] of Object.entries(props)) { const t = el === ':self' ? root : root.querySelector(el) || root; out[k] = getComputedStyle(t)[css]; }
  const te = trans === ':self' ? root : root.querySelector(trans) || root;
  const cs = getComputedStyle(te);
  out.__transition = cs.transitionDuration; out.__opacity = getComputedStyle(root).opacity;
  const rs = getComputedStyle(root); out.__ring = { w: parseFloat(rs.outlineWidth) || 0, style: rs.outlineStyle, offset: parseFloat(rs.outlineOffset) || 0 };
  return out;
}, fam.props, fam.trans);

const maxSec = (s) => Math.max(...String(s).split(',').map((x) => (x.includes('ms') ? parseFloat(x) / 1000 : parseFloat(x)) || 0));

export async function runStates(o) {
  const rep = new Report('states');
  const only = o.only ? new Set(String(o.only).split(',')) : null;
  const fams = FAMILIES.filter((f) => !only || only.has(f.family) || only.has(f.variant));
  let checked = 0, skipped = []; const ctl = { n: null };
  for (const combo of matrix(o, { dprs: [o.dpr[0]] })) {
    const L = await launch({ scrollbar: combo.scrollbar, chrome: o.chrome, out: o.out });
    try {
      const todo = new Set(fams.map((f) => f.variant + '|' + f.family));
      let tk = null;
      for (const spec0 of POOL) {
        if (!todo.size) break;
        const spec = pageSpec(spec0);
        const page = await openPage(L.browser, pageUrl(o.url, spec, 'static'), { width: combo.width, height: o.height, dpr: 1, settle: false });
        await waitStable(page, { selector: spec.name === 'product' ? '.product-volume, h1' : null });
        if (!tk) tk = await tokens(page);
        for (const fam of fams) {
          const key = fam.variant + '|' + fam.family;
          if (!todo.has(key)) continue;
          const h = await findEl(page, fam);
          if (!h) continue;
          todo.delete(key);
          await checkFamily(page, h, fam, tk, rep, `${spec.label}@${combo.width}${combo.scrollbar === 'classic' ? '' : '/none'}`);
          checked++;
          if (fam.expRaw) { // позитивний контроль: підміна hover-заливки степера (--qty-bg-hover) МАЄ дати порушення
            let n = 0; const st = await page.addStyleTag({ content: '.quantity{--qty-bg-hover:rgb(255,0,0)!important}' });
            await checkFamily(page, h, { ...fam, states: ['hover'] }, tk, { add() { n++; }, note() {} }, 'control');
            await st.evaluate((el) => el.remove()); ctl.n = n;
          }
        }
        await page.close().catch(() => {});
      }
      for (const k of todo) skipped.push(k.replace('|', '/'));
    } finally { await L.close(); }
  }
  if (ctl.n === 0) rep.add({ rule: 'ST1', page: 'control', selector: 'quantity [hover]', value: '0 порушень', msg: 'контроль (--qty-bg-hover: red) НЕ дав порушення — перевірка степера не працює' });
  rep.stats = { variantsChecked: checked, skipped };
  if (skipped.length) rep.note(`не знайдено елемента для: ${skipped.join(', ')}`);
  rep.note('не покрито: select, check, row-faq, row-product, catnav, thumb, volume, choice (див. шапку states.mjs)');
  return rep;
}

async function checkFamily(page, h, fam, tk, rep, where) {
  const sel = `.${fam.family === 'nav-link' ? 'nav-link' : fam.family}${fam.variant.match(/^(outline|fill|ghost)$/) && fam.family === 'nav-cell' ? `--${fam.variant}` : ''}`;
  const nm = await h.evaluate((el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''));
  const label = `${fam.family}:${fam.variant} (${nm})`;
  const tokVal = (prop, state) => tk[`--btn-${fam.props[prop]?.token || fam.token}-${prop}-${state}`]?.value; // props[p].token — власний префікс токена властивості (arrow-light: рамка)
  const mkExp = async (state) => {
    const exp = {};
    if (fam.expRaw) { const r = fam.expRaw(tk, state), ks = Object.keys(fam.props), n = await normColors(page, ks.map((k) => r[k])); ks.forEach((k, i) => { exp[k] = n[i]; }); return exp; }
    const colorProps = Object.keys(fam.props).filter((p) => !fam.props[p].raw);
    const raws = colorProps.map((p) => tokVal(p, state));
    const norm = raws.some((x) => x === undefined) ? null : await normColors(page, raws);
    colorProps.forEach((p, i) => { exp[p] = raws[i] === undefined ? undefined : norm[i]; });
    for (const p of Object.keys(fam.props)) if (fam.props[p].raw) exp[p] = tk[`--btn-${fam.token}-${p}-${state}`]?.raw;
    return exp;
  };
  const cmp = async (state, actual, exp, dur) => {
    // кольори → нормалізація
    const keys = Object.keys(fam.props);
    const colorKeys = keys.filter((k) => !fam.props[k].raw);
    const norm = await normColors(page, colorKeys.map((k) => actual[k]));
    colorKeys.forEach((k, i) => {
      const e = exp[k]; if (e === undefined) return; // токена цього стану немає (напр. ghost без border)
      const a = norm[i];
      const eq = a.slice(0, 3).every((v, j) => Math.abs(v - e[j]) <= 2) && Math.abs(a[3] - e[3]) <= 0.02;
      // повністю прозорий колір: канали не важливі
      const bothClear = a[3] === 0 && e[3] === 0;
      if (!eq && !bothClear) rep.add({ rule: 'ST1', page: where, selector: `${label} [${state}] ${k}`, value: `actual rgba(${a.join(',')}) ≠ --btn-${fam.token}-${k}-${state} rgba(${e.join(',')})`, msg: 'computed ≠ токен стану' });
    });
    for (const k of keys.filter((x) => fam.props[x].raw)) {
      const e = exp[k]; if (e === undefined) continue;
      const a = String(actual[k]).replace(/\s+/g, ''), ee = String(e).replace(/\s+/g, '');
      if (a !== ee && !(ee === 'none' && a === 'none')) rep.add({ rule: 'ST1', page: where, selector: `${label} [${state}] ${k}`, value: `actual ${actual[k]} ≠ ${e}`, msg: 'computed ≠ токен стану' });
    }
    // транзиції
    const t = maxSec(actual.__transition);
    if (dur != null && Math.abs(t - dur) > 0.011) rep.add({ rule: 'ST2', page: where, selector: `${label} [${state}]`, value: `transition ${t}s ≠ ${dur}s`, msg: 'тривалість переходу не за політикою' });
    if ((state === 'default' || state === 'hover') && t < 0.3) rep.add({ rule: 'ST2', page: where, selector: `${label} [${state}]`, value: `${t}s`, msg: 'перехід швидший за 0.3s' });
  };
  const durFast = (tk['--btn-transition-duration']?.value ?? 450) / 1000, durFocus = fam.transAll ? durFast : (tk['--btn-transition-duration-focus']?.value ?? 150) / 1000;

  const settle = () => sleep(650);
  // default
  await unhover(page); await h.evaluate((el) => el.blur?.());
  await h.evaluate((el) => { const r = el.getBoundingClientRect(); scrollTo({ top: Math.max(0, r.top + scrollY - innerHeight * 0.55), behavior: 'instant' }); });
  await unhover(page); await settle();
  if (fam.states.includes('default')) { const a = await read(h, fam); await cmp('default', a, await mkExp('default'), durFast); }
  if (fam.states.includes('selected')) { const a = await read(h, fam); await cmp('selected', a, await mkExp('selected'), null); }
  // hover
  if (fam.states.includes('hover')) {
    const hv = await safeHover(page, h);
    if (!hv.ok) rep.add({ rule: 'ST0', page: where, selector: `${label} [hover]`, value: hv.reason, msg: 'не вдалося навести курсор (:hover)' });
    else { const a = await read(h, fam); await cmp('hover', a, await mkExp('hover'), durFast); }
    await unhover(page); await settle();
  }
  // focus (клавіатурний)
  const focusable = await h.evaluate((el) => el.tabIndex >= 0 && !el.matches(':disabled'));
  if (fam.states.includes('focus') && !focusable) rep.note(`${label} @ ${where}: елемент не фокусований (демо) — focus пропущено`);
  if (fam.states.includes('focus') && focusable) {
    await unhover(page);
    await page.keyboard.press('Shift'); // модальність «клавіатура» → :focus-visible
    await h.evaluate((el) => el.focus({ focusVisible: true }));
    await settle();
    const fv = await h.evaluate((el) => el.matches(':focus-visible'));
    if (!fv) rep.add({ rule: 'ST0', page: where, selector: `${label} [focus]`, value: ':focus-visible не встановився', msg: 'фокус без :focus-visible' });
    else {
      const a = await read(h, fam); await cmp('focus', a, await mkExp('focus'), durFocus);
      const wTok = tk[fam.ring === 'btn' ? '--btn-focus-ring-width' : '--focus-ring-width']?.value ?? tk['--focus-ring-width']?.value;
      if (fam.ring && wTok !== undefined && (a.__ring.style === 'none' || Math.abs(a.__ring.w - wTok) > 0.5)) rep.add({ rule: 'ST3', page: where, selector: `${label} [focus]`, value: `outline ${a.__ring.style} ${a.__ring.w}px ≠ токен ${wTok}px`, msg: 'фокус-кільце не за токеном' });
    }
    await h.evaluate((el) => el.blur()); await settle();
  }
  // active (натиснуто; відпускаємо ПОЗА елементом, щоб не було click)
  if (fam.states.includes('active')) {
    const pt = await h.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(pt.x, pt.y); await sleep(100);
    await page.mouse.down(); await sleep(450);
    const isActive = await h.evaluate((el) => el.matches(':active'));
    if (!isActive) rep.add({ rule: 'ST0', page: where, selector: `${label} [active]`, value: ':active не встановився', msg: 'не вдалося натиснути' });
    else { const a = await read(h, fam); await cmp('active', a, await mkExp('active'), durFocus); }
    await page.mouse.move(1, 1); await page.mouse.up(); await settle();
  }
  // disabled (тимчасово aria-disabled="true"; після перевірки знімаємо)
  if (fam.states.includes('disabled')) {
    await h.evaluate((el, at) => el.setAttribute(at, at === 'disabled' ? '' : 'true'), fam.disabledAttr || 'aria-disabled');
    await unhover(page); await settle();
    const a = await read(h, fam);
    await cmp('disabled', a, await mkExp('disabled'), null);
    const opTok = tk['--btn-disabled-opacity']?.value;
    if (opTok !== undefined && Math.abs(parseFloat(a.__opacity) - opTok) > 0.01) rep.add({ rule: 'ST1', page: where, selector: `${label} [disabled] opacity`, value: `${a.__opacity} ≠ --btn-disabled-opacity ${opTok}`, msg: 'opacity disabled ≠ токен' });
    // hover по disabled не змінює значень
    const hv = await safeHover(page, h);
    if (hv.ok) { const a2 = await read(h, fam); const keys = Object.keys(fam.props); const diff = keys.filter((k) => a2[k] !== a[k]); if (diff.length) rep.add({ rule: 'ST1', page: where, selector: `${label} [disabled+hover]`, value: diff.map((k) => `${k}: ${a[k]} → ${a2[k]}`).join('; '), msg: 'disabled змінюється на hover' }); }
    await h.evaluate((el, at) => el.removeAttribute(at), fam.disabledAttr || 'aria-disabled'); await unhover(page);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await runMain('states', { widths: '1920', scrollbar: 'classic' }, runStates);
