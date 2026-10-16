// Рушій partials сайту (винесено з vite.config.js, щоб його використовували й плагін збірки, й інструменти: контрактна перевірка шаблону lp — tools/qa/lp-contract.mjs).
// Чистий Node (без vite). Директиви в HTML:
//   <!--@include name [k="v" …]-->  -> partials/name.html; {{key}} / {{key|типове}} / {{#key}}…{{/key}} (блок лише коли key непорожній)
//   <!--@each list name-->          -> partials/name.html для кожного елемента списку (поле-масив поточного елемента або lists[list])
//   <!--@page name-->               -> уся сторінка шаблону lp: partials/lp/page.html + секції (дані — getLpPage(name))
//   <!--@lp name id-->              -> одна секція сторінки lp (демо в design-system.html)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const INCLUDE_RE = /<!--@include ([\w/-]+)((?:\s+[\w-]+="[^"]*")*)\s*-->/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;
const EACH_RE = /<!--@each ([\w]+) ([\w/-]+)\s*-->/g;
const PAGE_RE = /<!--@page ([\w-]+)\s*-->/g;
const SECTIONS_RE = /<!--@sections\s*-->/g;
const LPSEC_RE = /<!--@lp ([\w-]+) ([\w-]+)\s*-->/g;
const BLOCK_RE = /\{\{#([\w-]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;

/**
 * @param {{ root: string, lists?: Record<string, any[]>, getLpPage?: (name: string) => any }} o
 *   root — корінь проєкту (там partials/); lists — списки для @each верхнього рівня; getLpPage — вигляд сторінки lp (lpView) за ім'ям
 * @returns {(html: string, scope?: object) => string}
 */
export function createRenderer({ root, lists = {}, getLpPage = () => null }) {
  const blocks = (tpl, params) => {
    // {{#key}}...{{/key}} — блок лише якщо параметр key непорожній; повтор — для вкладених блоків з іншим ключем
    let prev;
    do { prev = tpl; tpl = tpl.replace(BLOCK_RE, (__, key, body) => (params[key] && params[key].length !== 0 ? body : '')); } while (tpl !== prev);
    return tpl;
  };
  const fill = (tpl, params) => blocks(tpl, params)
    // {{key}} або {{key|типове значення}}
    .replace(/\{\{([\w-]+)(?:\|([^}]*))?\}\}/g, (__, key, def) => params[key] ?? def ?? '');
  const readPartial = (name) => readFileSync(resolve(root, 'partials', `${name}.html`), 'utf8');
  const lpPage = (name) => { const pg = getLpPage(name); if (!pg) throw new Error(`@page ${name}: немає даних сторінки (src/data/${name}.js за схемою lp-schema.js)`); return pg; };
  const lpSection = (s) => render(fill(readPartial(`lp/${s.type}`), s), s);
  const render = (html, scope = {}) =>
    html
      .replace(PAGE_RE, (_, name) => { const pg = lpPage(name); return render(fill(readPartial('lp/page'), pg), pg); })
      .replace(SECTIONS_RE, () => (scope.sections || []).map(lpSection).join(''))
      .replace(LPSEC_RE, (_, name, id) => { const s = lpPage(name).sections.find((x) => x.id === id); if (!s) throw new Error(`@lp ${name} ${id}: немає секції`); return lpSection(s); })
      .replace(EACH_RE, (_, key, name) => {
        const list = Array.isArray(scope[key]) ? scope[key] : lists[key] || [];
        const tpl = readPartial(name);
        return list.map((item) => render(fill(tpl, item), item)).join('');
      })
      .replace(INCLUDE_RE, (_, name, rawAttrs) => {
        const params = Object.fromEntries([...rawAttrs.matchAll(ATTR_RE)].map((m) => [m[1], m[2]]));
        return render(fill(readPartial(name), params));
      });
  return render;
}
