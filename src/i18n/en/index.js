// All English dictionaries (mirror of uk/index.js; npm run qa:i18n compares the keys).
import common from './common.js';
import js from './js.js';
import home from './home.js';
export const files = { common, js, home };
export default Object.assign({}, ...Object.values(files));
