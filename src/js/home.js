import { initAccordions } from './accordion.js';
import { initPicker } from './picker.js';

// Порядок важливий: спочатку picker замінює статичні чіпи/картку живими вузлами, і лише потім reveal
// спостерігає елементи. Статичний import reveal.js давав у prod-збірці виконання reveal раніше за picker.
initPicker();
initAccordions();
await import('./reveal.js');
await import('./parallax.js');
