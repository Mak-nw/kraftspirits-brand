// Усі словники української (en/index.js — дзеркало; npm run qa:i18n звіряє ключі). Новий файл словника = рядок тут і в en/index.js.
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
import about from './about.js';
import faq from './faq.js';
import legal from './legal.js';
export const files = { common, js, home, shared, catalog, cart, contacts, feedback, product, cocktails, about, faq, legal };
export default Object.assign({}, ...Object.values(files));
