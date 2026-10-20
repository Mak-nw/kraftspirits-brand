// Події для секції «не знаєте з чого почати?» (головна, Figma 194:1290).
// Джерело добірок: site/kraftspirits/src/data/occasions.json (лише читання); slugs звірені з products.js.
// title — підпис чіпа (Figma 224:3737: рівно 4 чіпи — «подарунок / колекція / дегустація / бар/ресторан»; рішення замовника: верстати цю версію,
// 5-го чіпа немає). label — повна назва події (для скрінрідера). Слайдер завжди відкривається на першій події (gift): окремого стану «intro» немає.
// image — шлях від кореня public без початкового «/» (JS додає import.meta.env.BASE_URL).
export const OCCASIONS = [
  { id: 'gift', title: 'подарунок', label: 'Подарунок', image: 'assets/img/occasions/gift.webp', slugs: ['gin-yasnyi', 'calvados-5', 'fruit-watermelon'] },
  { id: 'collection', title: 'колекція', label: 'У колекцію', image: 'assets/img/occasions/collection.webp', slugs: ['fruit-watermelon', 'whiskey-white', 'gin-barrel'] },
  { id: 'tasting', title: 'дегустація', label: 'Для дегустації', image: 'assets/img/occasions/tasting.webp', slugs: ['calvados-5', 'calvados-3', 'whiskey-white'] },
  { id: 'bar', title: 'бар/ресторан', label: 'Для бару й ресторану', image: 'assets/img/occasions/bar.webp', slugs: ['gin-yasnyi', 'gin-garden', 'gin-barrel'] },
];

