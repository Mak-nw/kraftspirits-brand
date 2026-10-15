// Генерує JSON Schema (draft 2020-12) шаблону посадкової сторінки з src/data/lp-schema.js → docs/page-template.schema.json.
// Запуск: node tools/lp-schema-json.mjs. Джерело правди — lp-schema.js (його ж перевіряє збірка); JSON — для адмінки/валідаторів.
import { writeFileSync } from 'node:fs';
import { SCHEMA } from '../src/data/lp-schema.js';

const conv = (d) => {
  switch (d.type) {
    case 'text': return { type: 'string', maxLength: d.max };
    case 'url': return { type: 'string', pattern: '^[^"<>\\s]+$' };
    case 'id': case 'partial': case 'icon': return { type: 'string', pattern: '^[a-z0-9-]+$' };
    case 'enum': return { enum: d.values, ...(d.def !== undefined ? { default: d.def } : {}) };
    case 'number': return { type: 'number' };
    case 'bool': return { type: 'boolean' };
    case 'list': return { type: 'array', minItems: d.min, maxItems: d.max, items: d.of.type === 'section' ? { $ref: '#/$defs/section' } : conv(d.of) };
    case 'object': return obj(d.fields);
    default: return {};
  }
};
const obj = (fields, extra = {}) => {
  const properties = {}; const required = [];
  for (const [k, d] of Object.entries(fields)) { properties[k] = k === 'type' ? { type: 'string' } : conv(d); if (d.req) required.push(k); }
  return { type: 'object', additionalProperties: false, properties, required, ...extra };
};
const sections = Object.entries(SCHEMA.sections).map(([type, fields]) => {
  const o = obj(fields); o.properties.type = { const: type }; o.title = type; return o;
});
const out = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'page-template.schema.json',
  title: 'Шаблон посадкової сторінки (lp) — дані сторінки',
  description: 'Згенеровано з src/data/lp-schema.js (node tools/lp-schema-json.mjs). Додаткові правила (сума span = 12, кількість пунктів ділить 12, wall/list взаємовиключні, медіа арки/плитки обовʼязкове) — у validatePage().',
  ...obj(SCHEMA.page),
  $defs: { section: { oneOf: sections } },
};
writeFileSync(new URL('../docs/page-template.schema.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log('docs/page-template.schema.json: секцій', sections.length);
