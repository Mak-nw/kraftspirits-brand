// All English dictionaries (mirror of uk/index.js; npm run qa:i18n compares the keys).
import common from './common.js';
import js from './js.js';
import home from './home.js';
import shared from './shared.js';
import catalog from './catalog.js';
import cart from './cart.js';
import contacts from './contacts.js';
import feedback from './feedback.js';
import product from './product.js';
import cocktails from './cocktails.js';
export const files = { common, js, home, shared, catalog, cart, contacts, feedback, product, cocktails };
export default Object.assign({}, ...Object.values(files));
