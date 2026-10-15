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
  // що входить у ціну (рішення замовника 15.10: «власність, сертифікат»). Інших пунктів НЕ вигадувати.
  includeOwnership: 'Бочка у вашій власності',
  includeCertificate: 'Сертифікат на бочку',
  // СЛОТ: нейтральний рядок, доки замовник не дасть умов (зберігання, візити, розлив, терміни). Замінити на конкретні пункти тут.
  includeMore: 'Інші умови обговоримо під час замовлення',
  cost200: `€${NB}15,66`,
  cost50: `€${NB}20,83`,
  // міцність: у бочку / питна
  abvIn: '63%',
  abvOut: '40%',
  // «частка ангелів» (рішення замовника 15.10): показувати числом, але ОБОВ'ЯЗКОВО як приблизне — знак ≈ і підпис «орієнтовно».
  // Число = умовні втрати з розрахунку в дрібному тексті (disclaimer), не технологічна норма.
  angelsShare: '≈15%',
  angelsNote: 'орієнтовно',
  // СЛОТ: смакові ноти вин для «Подальшої витримки» (2–3 слова від замовника). Порожньо — рядок під регіоном не показується (CSS :empty).
  finishNotes: { marsala: '', madeira: '', port: '', sherry: '' },
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
    includeMore: b.includeMore,
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
