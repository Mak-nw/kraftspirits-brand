// Контакти — ЄДИНЕ джерело даних сторінки contacts.html і feedback.html (адреса, координати, телефон, e-mail, теми звернення).
// Використовується: vite.config.js (підставляє %contacts.*% у HTML під час збірки/dev), src/js/contact-form.js (теми, e-mail для mailto-запасного каналу).
// Файл — чистий ESM без import.meta/DOM, бо його читає і Node (конфіг Vite), і браузер.
//
// !!! TODO «ПІДТВЕРДИТИ точні координати виробництва» !!!
// Замовник НЕ надав точну адресу (вулиця/номер) і координати. Тут стоять ПРИБЛИЗНІ координати центру
// села Ясногородка (Фастівський район, Київська область; OSM node 337523794, Nominatim) — маркер на мапі
// показує село, а не будівлю. Увага: у Київській області є ще одна Ясногородка (Вишгородський район,
// 50.8477, 30.3985); обрано Фастівську, бо так сказано в старих текстах сайту (site_old). Підтвердити.
// Коли замовник надішле точну адресу: заповнити `street`, `lat`, `lng`, підняти `zoom` до 16–17 і прибрати `approx`.
// Телефон і e-mail — плейсхолдери з футера, НЕ підтверджені замовником.

export const contacts = {
  address: {
    line: 'Київська область, с. Ясногородка', // як у футері; точну вулицю додати в street (і в line), коли замовник надішле
    street: null,
    approx: true,
  },
  lat: 50.353432,
  lng: 30.011221,
  zoom: 14,
  phone: { display: '+380 44 000 00 00', tel: '+380440000000' },
  email: 'shop@yasnobazyl.com',
  // Теми звернення (value — у ?topic=…, label — плитка вибору й тема листа, hint — підказка в полі повідомлення). Порядок = порядок плиток; невідомий ?topic= ігнорується (тема не обрана).
  topics: [
    { value: 'excursion', label: 'Екскурсії', hint: 'Бажана дата, кількість гостей, побажання до екскурсії' },
    { value: 'barrel', label: 'Бочкова торгівля', hint: 'Який об’єм бочки цікавить, кількість, строки' },
    { value: 'order', label: 'Замовлення та доставка', hint: 'Номер замовлення або що саме хочете замовити, місто доставки' },
    { value: 'horeca', label: 'Співпраця для закладів', hint: 'Назва закладу, місто, що саме цікавить' },
    { value: 'b2b', label: 'B2B-співпраця', hint: 'Назва компанії, що цікавить (розлив, набори, сертифікати, контрактне виробництво), орієнтовний обсяг' },
    { value: 'events', label: 'Івенти', hint: 'Формат заходу, кількість гостей, бажана дата' },
    { value: 'consult', label: 'Консультація з інших питань', hint: 'Опишіть питання, і ми підкажемо' },
  ],
};

// Приблизне співвідношення рамки мапи (ширина:висота) — лише для розрахунку bbox вбудованої мапи OSM
const MAP_ASPECT = 940 / 720; // панель мапи на 1920: ≈ 940×720 (7/12 ширини, висота панелей)
const MAP_TILE_PX = 256;

// bbox для embed.html: охоплення за zoom (OSM-плитка 256 px), центр = точка
function bbox({ lat, lng, zoom }) {
  const lonSpan = (360 / 2 ** zoom) * (940 / MAP_TILE_PX);
  const latSpan = (lonSpan / MAP_ASPECT) * Math.cos((lat * Math.PI) / 180);
  const f = (n) => n.toFixed(6);
  return [f(lng - lonSpan / 2), f(lat - latSpan / 2), f(lng + lonSpan / 2), f(lat + latSpan / 2)].join(',');
}

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Плитки теми (radiogroup на feedback.html): готовий HTML — ключі *Html у vite.config.js підставляються без екранування (екранування тут)
function topicTiles(topics) {
  return topics
    .map((t, i) => `<button class="topic-tile t-btn" type="button" role="radio" aria-checked="false" tabindex="${i === 0 ? 0 : -1}" data-value="${esc(t.value)}"><span class="topic-tile__label">${esc(t.label)}</span></button>`)
    .join('\n            ');
}

// Похідні рядки для HTML-плейсхолдерів %contacts.<ключ>% (екранування робить vite.config.js)
export function contactsView(c = contacts) {
  const { lat, lng, zoom } = c;
  return {
    address: c.address.line,
    phoneDisplay: c.phone.display,
    phoneHref: `tel:${c.phone.tel}`,
    email: c.email,
    emailHref: `mailto:${c.email}`,
    lat: String(lat),
    lng: String(lng),
    zoom: String(zoom),
    osmEmbed: `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox(c))}&layer=mapnik&marker=${lat}%2C${lng}`,
    osmView: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom + 2}/${lat}/${lng}`,
    gmapsView: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    gmapsRoute: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    topicOptions: c.topics.map((t) => `${t.value}:${t.label}`).join('|'),
    topicTilesHtml: topicTiles(c.topics),
  };
}
