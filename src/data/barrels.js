// Дані сторінки «Ф'ючерсні бочки Bazylsprings» (barrels.html). Єдине джерело чисел і текстів із банера замовника.
// У HTML підставляються через %barrels.<ключ>% (vite.config.js → barrelsView); лічильники в src/js/barrels.js читають data-count-to із DOM.
const NB = ' '; // нерозривний пробіл: «€ 6 000» не розривається між рядками

export const barrels = {
  title: "Ф'ючерсні бочки Bazylsprings",
  subtitle: 'Екс-бурбонові бочки Wild Turkey з Кентуккі з американського дубу',
  route: { from: 'Кентуккі (США)', to: 'Київ (Україна)' },
  // ціни (формат «€ 6 000»)
  price200: `€${NB}6${NB}000`,
  price50: `€${NB}2${NB}000`,
  // скільки пляшок 0,7 л і вартість вмісту однієї пляшки
  bottles200: 383,
  bottles50: 96,
  cost200: `€${NB}15,66`,
  cost50: `€${NB}20,83`,
  // міцність: у бочку / питна
  abvIn: '63%',
  abvOut: '40%',
  disclaimer:
    'Розрахунок наведено для початкової міцності дистиляту 63% та умовних втрат 15% під час витримки. Кількість пляшок і вартість є орієнтовними та можуть відрізнятися залежно від тривалості витримки та інших факторів. У вартість не включено тару, розлив, податки та інші витрати.',
};

// плоский вигляд для %barrels.key% у HTML
export function barrelsView(b) {
  return {
    title: b.title,
    subtitle: b.subtitle,
    routeFrom: b.route.from,
    routeTo: b.route.to,
    price200: b.price200,
    price50: b.price50,
    bottles200: b.bottles200,
    bottles50: b.bottles50,
    cost200: b.cost200,
    cost50: b.cost50,
    abvIn: b.abvIn,
    abvOut: b.abvOut,
    disclaimer: b.disclaimer,
  };
}
