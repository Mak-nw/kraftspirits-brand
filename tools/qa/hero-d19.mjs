// D19: hero з фото — БЕЗ оверлея, незалежно від allow (рішення замовника a2289410: «фото без градієнта й без оверлея»). Правило НЕ фільтрується allow.json
// (isAllowed повертає false для D19), щоб виняток D14/D8 (контраст) не заглушив майбутній оверлей. Опис — tools/qa/README.md (розділ D19).
//
// Перевіряється кожен елемент: корінь hero (`.hero`, `.hero__bg`), УСІ його предки до html та ВСІ нащадки (крім інтерактивних контролів — кнопок/посилань: їхній box-shadow/фон — стани контролу, не шар поверх фото).
// Забороняється (computed, у станах, коли reveal/parallax вимкнено):
//   filter ≠ none · backdrop-filter ≠ none · mask-image/mask ≠ none · mix-blend-mode ≠ normal · opacity < 1 ·
//   box-shadow ≠ none (крім самих панелей з текстом — .hero__panel, що мають власну рамку/тінь компонента: вони не покривають фото) ·
//   background-image з gradient(…) · заливка background-color з alpha > 0 у нащадка, що покриває ≥ 50% площі hero (шар-оверлей) ·
//   ::before / ::after з content і (фон/градієнт/тінь/filter/backdrop-filter).
// ДОЗВОЛЕНИЙ ВИПАДОК (рішення замовника 53422015, `hero.fade`): рівно ОДИН лінійний градієнт знизу вгору від токен-кольору до transparent на `.hero::after` (клас `hero--fade-<токен>`):
//   computed background-image = linear-gradient(to top, <rgb токена --color-<fade>> 0%, rgba(…,0) 100%); без filter/backdrop-filter/mask/blend/box-shadow/фону/opacity<1; ::before hero і всі нащадки лишаються під забороною.
//   Дозвіл дійсний лише коли в даних сторінки є `hero.fade` з тим самим значенням (звіряє ds-dynamic.mjs з src/data/<сторінка>.js); без даних той самий градієнт — порушення.
// Поруч збирається `inkLight`: чи `--lp-hero-ink` на hero = `--color-light` (умова чинності allow D14/D8 для hero екскурсій).

export const D19_DEFAULTS = {
  heroSelectors: ['.hero', '.hero__bg'],
  controlSelectors: ['a', 'button', '.btn', '.nav-cell', '.chip', '.arrow-btn', 'input', 'select', 'textarea', 'label'],
  panelSelectors: ['.hero__panel'],   // панель з текстом усередині hero (контакти) — не шар поверх усього фото
  coverMin: 0.5,                      // частка площі hero, від якої заливка нащадка = оверлей
};

export function COLLECT_D19(cfg) {
  const out = { heroes: [], offenders: [], inkLight: null, ink: null, light: null, fade: null };
  const roots = [...document.querySelectorAll(cfg.heroSelectors.join(','))].filter((e) => !e.closest('template'));
  if (!roots.length) return out;
  const nameOf = (el) => { const c = (typeof el.className === 'string' ? el.className.trim().split(/\s+/) : []).filter((x) => !/^(is-|js-|has-|in-view|reveal)/.test(x)).slice(0, 2); return el.tagName.toLowerCase() + (c.length ? `.${c.join('.')}` : ''); };
  const alpha = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return c === 'transparent' ? 0 : 1; const p = m[1].split(/[,/ ]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
  const ctl = cfg.controlSelectors.join(','), pnl = cfg.panelSelectors.join(',');
  const seen = new Set();
  const hero = roots.find((e) => e.classList.contains('hero')) || roots[0];
  const hr = hero.getBoundingClientRect(); const heroArea = Math.max(1, hr.width * hr.height);
  out.heroes = roots.map(nameOf);
  const probe = (css) => { const t = document.createElement('i'); t.style.cssText = `position:absolute;visibility:hidden;color:${css}`; document.body.appendChild(t); const c = getComputedStyle(t).color; t.remove(); return c; };
  { const raw = getComputedStyle(hero).getPropertyValue('--lp-hero-ink').trim(); if (raw) { out.ink = probe(raw); out.light = probe('var(--color-light)'); out.inkLight = out.ink === out.light; } }
  const check = (el, role) => {
    if (seen.has(el)) return; seen.add(el);
    const cs = getComputedStyle(el); const n = nameOf(el);
    const add = (prop, value) => out.offenders.push({ el: n, role, prop, value: String(value).slice(0, 90) });
    const isImg = el.tagName === 'IMG';
    if (cs.filter !== 'none') add('filter', cs.filter);
    if ((cs.backdropFilter || cs.webkitBackdropFilter || 'none') !== 'none') add('backdrop-filter', cs.backdropFilter || cs.webkitBackdropFilter);
    // іконка DS (.icon — CSS-маска за визначенням, components/icon.css) — не шар поверх фото, якщо мала (≤ 1% площі hero): напр. факти hero «Про дім»; велика .icon лишається порушенням
    const mk = cs.maskImage || cs.webkitMaskImage || 'none';
    const smallIcon = el.classList.contains('icon') && (() => { const r = el.getBoundingClientRect(); return r.width * r.height <= 0.01 * heroArea; })();
    if (mk !== 'none' && !smallIcon) add('mask', mk);
    if (cs.mixBlendMode !== 'normal') add('mix-blend-mode', cs.mixBlendMode);
    if (parseFloat(cs.opacity) < 0.999) add('opacity', cs.opacity);
    if (cs.boxShadow !== 'none' && !(pnl && el.matches(pnl)) && role !== 'ancestor') add('box-shadow', cs.boxShadow);
    if (/gradient\(/.test(cs.backgroundImage)) add('background-image', cs.backgroundImage);
    if (role === 'descendant' && !isImg && alpha(cs.backgroundColor) > 0.02 && !(pnl && el.closest(pnl))) {
      const r = el.getBoundingClientRect(); if (r.width * r.height >= cfg.coverMin * heroArea) add('background-color (шар-оверлей)', `${cs.backgroundColor} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    for (const ps of ['::before', '::after']) {
      const p = getComputedStyle(el, ps); if (p.content === 'none' || p.content === 'normal' || p.display === 'none') continue;
      const bad = [];
      // hero.fade: єдиний дозволений градієнт — на `.hero::after` (корінь hero з класом hero--fade-<токен>)
      let fadeOk = false;
      if (ps === '::after' && role === 'hero' && el.classList.contains('hero')) {
        const fm = [...el.classList].map((c) => c.match(/^hero--fade-(\w+)$/)).find(Boolean);
        const gm = p.backgroundImage.match(/^linear-gradient\(to top, (rgb\([^)]*\)) 0%, (rgba\([^)]*,\s*0\)) 100%\)$/);
        if (fm && gm) {
          const tokenRgb = probe(`var(--color-${fm[1]})`);
          out.fade = { cls: fm[1], from: gm[1], to: gm[2], token: tokenRgb, tokenOk: gm[1] === tokenRgb, single: (p.backgroundImage.match(/gradient\(/g) || []).length === 1 };
          fadeOk = out.fade.tokenOk && out.fade.single;
          if (!out.fade.tokenOk) bad.push(`градієнт не від токена --color-${fm[1]} (${gm[1]} ≠ ${tokenRgb})`);
        }
      }
      if (alpha(p.backgroundColor) > 0.02) bad.push(`фон ${p.backgroundColor}`);
      if (/gradient\(/.test(p.backgroundImage) && !fadeOk) bad.push('градієнт');
      if (fadeOk && parseFloat(p.opacity) < 0.999) bad.push(`opacity ${p.opacity}`);
      if (fadeOk && ((p.maskImage || p.webkitMaskImage || 'none') !== 'none' || p.mixBlendMode !== 'normal')) bad.push('mask/mix-blend-mode');
      if (p.boxShadow !== 'none') bad.push('box-shadow');
      if (p.filter !== 'none') bad.push('filter');
      if ((p.backdropFilter || 'none') !== 'none') bad.push('backdrop-filter');
      if (parseFloat(p.opacity) < 0.999 && bad.length) bad.push(`opacity ${p.opacity}`);
      if (bad.length) add(`${ps}`, bad.join(', '));
    }
  };
  for (const r of roots) {
    check(r, 'hero');
    for (let a = r.parentElement; a; a = a.parentElement) check(a, 'ancestor');
    for (const d of r.querySelectorAll('*')) { if (d.closest('template') || (ctl && d.closest(ctl))) continue; if (getComputedStyle(d).display === 'none') continue; check(d, 'descendant'); }
  }
  return out;
}
