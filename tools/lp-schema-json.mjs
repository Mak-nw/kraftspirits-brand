// Генерує JSON Schema (draft 2020-12) шаблону посадкової сторінки з src/data/lp-schema.js → docs/page-template.schema.json.
// Запуск: node tools/lp-schema-json.mjs. ЄДИНЕ джерело — lp-schema.js (SCHEMA + RULES + PAGE_RULES): ті самі ліміти, шаблони й перехресні правила, що перевіряє збірка (validatePage).
// Правила, які JSON Schema не виражає (сума span = 12, унікальність id/key, якорі, файлові перевірки), перелічені в «x-rules» і в docs/page-template.md («Додаткові перевірки»).
// Паритет JS ≡ JSON доводить tools/qa/lp-contract.mjs (ajv на корпусі «валідні + зіпсовані» дані).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SCHEMA, RULES, PAGE_RULES, FILE_RULES, URL_SOURCE, wordPattern, MAX_WORD, BTN_WORD, GRID_COLS, divisors } from '../src/data/lp-schema.js';

const nullable = (s, req) => (req ? s : { ...s, type: [].concat(s.type, 'null') });
const conv = (d) => {
  switch (d.type) {
    case 'text': return { ...nullable({ type: 'string', maxLength: d.max }, d.req), ...(d.req ? { minLength: 1 } : {}), pattern: wordPattern(d.word) };
    case 'url': return nullable({ type: 'string', pattern: d.req ? `^(?:${URL_SOURCE})$` : `^(?:|${URL_SOURCE})$` }, d.req);
    case 'id': case 'partial': case 'icon': return nullable({ type: 'string', pattern: d.req ? '^[a-z0-9-]+$' : '^[a-z0-9-]*$' }, d.req);
    case 'enum': return { enum: d.req ? d.values : [...d.values, '', null], ...(d.def !== undefined ? { default: d.def } : {}) };
    case 'number': return nullable({ type: d.int ? 'integer' : 'number', ...(d.min !== undefined ? { minimum: d.min } : {}), ...(d.max !== undefined ? { maximum: d.max } : {}) }, d.req);
    case 'bool': return nullable({ type: 'boolean' }, d.req);
    case 'list': {
      const s = nullable({ type: 'array', minItems: d.min, maxItems: d.max, items: d.of.type === 'section' ? { $ref: '#/$defs/section' } : conv(d.of) }, d.req);
      if (d.divides) { // кількість ділить 12: з min…max лише допустимі значення
        const ok = divisors(d);
        if (ok.length !== d.max - d.min + 1) s.anyOf = ok.map((n) => ({ minItems: n, maxItems: n }));
        if (!d.req) s.anyOf = s.anyOf ? [{ type: 'null' }, ...s.anyOf] : undefined;
      }
      return s;
    }
    case 'object': return obj(d.fields, {}, d.req);
    default: return {};
  }
};
function obj(fields, extra = {}, req = true) {
  const properties = {}; const required = [];
  for (const [k, d] of Object.entries(fields)) { properties[k] = k === 'type' ? { type: 'string' } : conv(d); if (d.req) required.push(k); }
  return { type: req ? 'object' : ['object', 'null'], additionalProperties: false, properties, required, ...extra };
}

/** розкладає правило на потрібний підсхемний вузол (секція або items списку) */
const applyRule = (schema, r) => {
  if (!r.json) return;
  const target = r.path ? schema.properties[r.path].items : schema;
  (target.allOf ||= []).push(r.json);
};

const sectionSchema = (type) => {
  const o = obj(SCHEMA.sections[type]); o.properties.type = { const: type }; o.title = type;
  for (const r of RULES) if (r.types.includes(type)) applyRule(o, r);
  return o;
};
export function buildJsonSchema() {
  const types = Object.keys(SCHEMA.sections);
  const nonHero = types.filter((t) => t !== 'hero');

  const page = obj(SCHEMA.page);
  page.properties.sections = { type: 'array', minItems: 1, maxItems: SCHEMA.page.sections.max, prefixItems: [{ $ref: '#/$defs/hero' }], items: { $ref: '#/$defs/section' } };

  const xrules = [
    ...RULES.map((r) => ({ id: r.id, scope: r.types.join(', '), expressed: !!r.json, rule: r.doc })),
    ...PAGE_RULES.map((r) => ({ id: r.id, scope: 'page', expressed: !!r.json, rule: r.doc })),
    ...FILE_RULES.map((r) => ({ id: r.id, scope: 'files', expressed: false, rule: r.doc })),
  ];

  const out = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'page-template.schema.json',
    title: 'Шаблон посадкової сторінки (lp) — дані сторінки',
    description: `Згенеровано з src/data/lp-schema.js (node tools/lp-schema-json.mjs) — те саме джерело, що й перевірка збірки (validatePage). Порожнє значення необов'язкового поля ('' / null / відсутнє) = поле не задано. Ліміти — у кодових точках; слово без пробілу ≤ ${MAX_WORD} (у тексті кнопки ≤ ${BTN_WORD}); кількість пунктів layers/tiles/offers ділить ${GRID_COLS}. Правила з "expressed": false JSON Schema виразити не може — їх треба реалізувати в адмінці окремо (див. "x-rules" і docs/page-template.md → «Додаткові перевірки»).`,
    ...page,
    'x-rules': xrules,
    $defs: {
      hero: sectionSchema('hero'),
      section: { oneOf: nonHero.map(sectionSchema) },
    },
  };
  return out;
}

export const JSON_SCHEMA_PATH = new URL('../docs/page-template.schema.json', import.meta.url);
export const jsonSchemaText = () => JSON.stringify(buildJsonSchema(), null, 2) + '\n';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(JSON_SCHEMA_PATH, jsonSchemaText());
  const x = buildJsonSchema()['x-rules'];
  console.log(`docs/page-template.schema.json: секцій ${Object.keys(SCHEMA.sections).length}, правил ${x.length} (виражено в JSON: ${x.filter((r) => r.expressed).length})`);
}
