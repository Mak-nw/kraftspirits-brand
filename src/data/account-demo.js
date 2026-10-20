// Демо-дані для account.html («Мій кабінет»): СИМУЛЯЦІЯ шаблонів WooCommerce myaccount/* без бекенду.
// Справжній акаунт, замовлення, нотатки й ТТН віддасть WooCommerce та плагін доставки «Нова пошта»; тут — заглушки, щоб показати вигляд усіх станів.
// Позиції замовлень посилаються на src/data/products.js (slug + об'єм): назви й ціни беруться звідти (wc-common.resolveLines), тут лише склад (slug, volume, qty).
// Усі дати й номери вигадані; ТТН — демо-номер (14 цифр), не реальна накладна.

export const DEMO_USER = {
  first: 'Олена', last: 'Коваленко', email: 'olena@example.com', phone: '+380 50 123 45 67',
  address: { area: 'kyivska', city: 'Бровари', warehouse: 'w1' }, // ключі довідників checkout-demo.js (NP_AREAS / NP_CITIES / npWarehouses)
};

// Етапи відстеження (порядок = порядок у таймлайні). Статус замовлення задає поточний етап (STATUS.step).
export const TRACK_STEPS = ['Прийнято', 'Оплачено', 'Збирається', 'Передано Новій пошті', 'В дорозі', 'Доставлено'];

// Статуси замовлення WooCommerce (ключ = суфікс класу tr--status-*): підпис і індекс поточного етапу таймлайна (cancelled — без таймлайна).
export const STATUS = {
  pending: { label: 'Очікує оплати', step: 0 },
  processing: { label: 'В обробці', step: 2 },
  shipped: { label: 'Відправлено', step: 4 },
  completed: { label: 'Виконано', step: 5 },
  cancelled: { label: 'Скасовано', step: -1 },
};

export const NOVA_POSHTA_TRACKING = 'https://novaposhta.ua/tracking/?cargo_number=';
export const ORDERS_PER_PAGE = 4;

const DELIVERY = 'Київська область, Бровари, Відділення №1';
const NAME = 'Олена Коваленко';
// at — час етапу (ISO); етапи, яких ще не було, не вказуються. note — нотатки для клієнта (від новішої до старішої, як у WooCommerce).
export const ORDERS = [
  {
    number: '10431', date: '2026-10-14T18:42:00', status: 'pending', payment: 'card', shipping: 'np',
    lines: [{ slug: 'gin-yasnyi', volume: 0.7, qty: 1 }, { slug: 'calvados-3', volume: 0.7, qty: 1 }],
    events: ['2026-10-14T18:42:00'], ttn: '',
    notes: [{ at: '2026-10-14T18:43:00', text: 'Замовлення прийнято. Очікуємо оплату: посилання на оплату надіслано на e-mail.' }],
    customer: { name: NAME, phone: '+380 50 123 45 67', email: 'olena@example.com', delivery: DELIVERY },
  },
  {
    number: '10427', date: '2026-10-09T11:05:00', status: 'processing', payment: 'card', shipping: 'np',
    lines: [{ slug: 'gin-yasnyi', volume: 0.7, qty: 2 }, { slug: 'calvados-3', volume: 0.7, qty: 1 }, { slug: 'whiskey-white', volume: 0.5, qty: 1 }],
    events: ['2026-10-09T11:05:00', '2026-10-09T11:09:00', '2026-10-10T09:30:00'], ttn: '',
    notes: [
      { at: '2026-10-10T09:30:00', text: 'Замовлення передано на склад. Вік 18+ підтверджується через «Дію» під час отримання.' },
      { at: '2026-10-09T11:09:00', text: 'Оплату отримано.' },
    ],
    customer: { name: NAME, phone: '+380 50 123 45 67', email: 'olena@example.com', delivery: DELIVERY },
  },
  {
    number: '10388', date: '2026-09-28T16:20:00', status: 'shipped', payment: 'card', shipping: 'np',
    lines: [{ slug: 'calvados-5', volume: 0.7, qty: 1 }, { slug: 'schnapps-pear', volume: 0.5, qty: 2 }],
    events: ['2026-09-28T16:20:00', '2026-09-28T16:24:00', '2026-09-29T10:10:00', '2026-09-29T17:45:00', '2026-09-30T08:15:00'], ttn: '20450912345678',
    notes: [
      { at: '2026-09-29T17:45:00', text: 'Замовлення передано «Новій пошті». Номер експрес-накладної: 20450912345678.' },
      { at: '2026-09-28T16:24:00', text: 'Оплату отримано.' },
    ],
    customer: { name: NAME, phone: '+380 50 123 45 67', email: 'olena@example.com', delivery: DELIVERY },
  },
  {
    number: '10352', date: '2026-09-12T13:10:00', status: 'completed', payment: 'bacs', shipping: 'np',
    lines: [{ slug: 'tincture-rowan', volume: 0.5, qty: 2 }, { slug: 'gin-garden', volume: 0.5, qty: 1 }],
    events: ['2026-09-12T13:10:00', '2026-09-12T15:00:00', '2026-09-13T10:00:00', '2026-09-13T16:30:00', '2026-09-14T07:50:00', '2026-09-15T12:20:00'], ttn: '20450987654321',
    notes: [{ at: '2026-09-15T12:20:00', text: 'Замовлення отримано. Дякуємо, що обрали YasnoCraft!' }],
    customer: { name: NAME, phone: '+380 50 123 45 67', email: 'olena@example.com', delivery: 'Київ, Відділення №5 (до 30 кг)' },
  },
  {
    number: '10301', date: '2026-08-30T09:35:00', status: 'completed', payment: 'card', shipping: 'np',
    lines: [{ slug: 'oak-notes', volume: 0.5, qty: 1 }],
    events: ['2026-08-30T09:35:00', '2026-08-30T09:38:00', '2026-08-30T14:00:00', '2026-08-31T10:40:00', '2026-08-31T18:05:00', '2026-09-01T11:15:00'], ttn: '20450955512345',
    notes: [{ at: '2026-09-01T11:15:00', text: 'Замовлення отримано.' }],
    customer: { name: NAME, phone: '+380 50 123 45 67', email: 'olena@example.com', delivery: DELIVERY },
  },
  {
    number: '10244', date: '2026-08-05T20:15:00', status: 'cancelled', payment: 'card', shipping: 'np',
    lines: [{ slug: 'fruit-watermelon', volume: 0.7, qty: 1 }],
    events: ['2026-08-05T20:15:00'], ttn: '',
    notes: [{ at: '2026-08-07T10:00:00', text: 'Замовлення скасовано: оплату не отримано протягом 48 годин.' }],
    customer: { name: NAME, phone: '+380 50 123 45 67', email: 'olena@example.com', delivery: DELIVERY },
  },
];
