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
  // скільки пляшок 0,7 л і вартість вмісту однієї пляшки (+ форма слова за числом: 383 пляшки, 96 пляшок)
  bottles200: 383,
  bottles50: 96,
  bottles200Word: 'пляшки',
  bottles50Word: 'пляшок',
  // що входить у ціну (рішення замовника 15.10: «власність, сертифікат»; рев'ю 395a73a7/f733e520 — рядок «інші умови» прибрано). Інших пунктів НЕ вигадувати.
  includeOwnership: 'Бочка у вашій власності',
  includeCertificate: 'Сертифікат на бочку',
  cost200: `€${NB}15,66`,
  cost50: `€${NB}20,83`,
  // міцність: у бочку / питна
  abvIn: '63%',
  abvOut: '40%',
  // «частка ангелів» (рішення замовника 15.10): показувати числом, але ОБОВ'ЯЗКОВО як приблизне — знак ≈ і підпис «орієнтовно».
  // Число = умовні втрати з розрахунку в дрібному тексті (disclaimer), не технологічна норма.
  angelsShare: '≈15%',
  angelsNote: 'орієнтовно',
  // Смакові ноти для «Подальшої витримки» — ЧЕРНЕТКА (замовник 15.10 попросив придумати): загальновідомі ноти СТИЛЮ вина, з-під якого бочка
  // (марсала «оро», мадера, портвейн тоні, херес олоросо), орієнтовні — не опис конкретних бочок; по 3 слова, щоб плашки були рівні.
  // Замовник може уточнити тут; порожнє значення — рядок під регіоном не показується (CSS :empty).
  finishNotes: { marsala: 'абрикос, мед, мигдаль', madeira: 'карамель, кава, цедра', port: 'інжир, родзинки, ірис', sherry: 'горіх, чорнослив, прянощі' },
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
    bottles200Word: b.bottles200Word,
    bottles50Word: b.bottles50Word,
    includeOwnership: b.includeOwnership,
    includeCertificate: b.includeCertificate,
    cost200: b.cost200,
    cost50: b.cost50,
    abvIn: b.abvIn,
    abvOut: b.abvOut,
    angelsShare: b.angelsShare,
    angelsNote: b.angelsNote,
    notesMarsala: b.finishNotes.marsala,
    notesMadeira: b.finishNotes.madeira,
    notesPort: b.finishNotes.port,
    notesSherry: b.finishNotes.sherry,
    disclaimer: b.disclaimer,
  };
}
