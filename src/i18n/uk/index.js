// Усі словники української (en/index.js — дзеркало; npm run qa:i18n звіряє ключі). Новий файл словника = рядок тут і в en/index.js.
import common from './common.js';
import js from './js.js';
import home from './home.js';
export const files = { common, js, home };
export default Object.assign({}, ...Object.values(files));
