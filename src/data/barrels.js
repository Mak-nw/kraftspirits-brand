// Дані сторінки «Ф'ючерсні бочки Bazylsprings» (barrels.html) за схемою шаблону посадкової сторінки (src/data/lp-schema.js, docs/page-template.md).
// Сторінка = ці дані + медіа (шляхи нижче) + тема src/styles/themes/barrels.css. Розмітку будує vite.config.js (<!--@page barrels-->) з partials/lp/*.
// Єдине джерело чисел і текстів із банера замовника: змінюйте значення тут (поля = поля адмінки).
const NB = ' '; // нерозривний пробіл: «€ 6 000» не розривається між рядками

// числа (рішення замовника 15.10): ціна, вихід пляшок 0,7 л, вартість вмісту однієї пляшки, міцність, «частка ангелів»
const B50 = { size: '50 L', liters: 50, price: `€${NB}2${NB}000`, bottles: 96, bottlesWord: 'пляшок', cost: `€${NB}20,83` };
const B200 = { size: '200 L', liters: 200, price: `€${NB}6${NB}000`, bottles: 383, bottlesWord: 'пляшки', cost: `€${NB}15,66` };
// що входить у ціну: рядок фактів «Сертифікат | Бочка у вашій власності» (замовник 20.10.2026 — замість смуги «що входить»); інших пунктів НЕ вигадувати.
// Смакові ноти «Подальшої витримки» — ЧЕРНЕТКА (замовник 15.10 попросив придумати): загальновідомі ноти СТИЛЮ вина (марсала «оро», мадера, портвейн тоні,
// херес олоросо), орієнтовні — не опис конкретних бочок; по 3 слова, щоб плашки були рівні. Порожнє значення — рядок не показується.
const NOTES = { marsala: 'абрикос, мед, мигдаль', madeira: 'карамель, кава, цедра', port: 'інжир, родзинки, ірис', sherry: 'горіх, чорнослив, прянощі' };
const DISCLAIMER = 'Розрахунок наведено для початкової міцності дистиляту 63% та умовних втрат 15% під час витримки. Кількість пляшок і вартість є орієнтовними та можуть відрізнятися залежно від тривалості витримки та інших факторів. У вартість не включено тару, розлив, податки та інші витрати.';
const TEX = (n, name) => `Фото-текстура «${name}»: AI-кадр (${n}, Seedream 5 Pro) — за потреби замінити на макрозйомку`;
const HEAD = (wine) => `Фото: днище бочки з-під ${wine} (зйомка або AI за ТЗ IMG-4) — замінить гравюру на плашці`;

export const barrels = {
  slug: 'barrels',
  theme: 'barrels',
  metaTitle: "Ф'ючерсні бочки Bazylsprings — YasnoCraft × Bazylsprings",
  metaDescription: "Ф'ючерсні бочки Bazylsprings: екс-бурбонові бочки Wild Turkey з Кентуккі з американського дубу, 200 L і 50 L. Від бочки до пляшки, орієнтовний вихід пляшок 0,7 л, подальша витримка та ціна.",
  sections: [
    {
      type: 'hero', id: '',
      title: "Ф'ючерсні бочки Bazylsprings",
      img: '/assets/img/barrels-hero.webp', alt: '',
      slot: 'Фото hero: наявний AI-кадр barrels-hero.webp; за ТЗ IMG-1 — асиметричний кадр (бочки праворуч) або нова зйомка',
      fade: 'brown',   // градієнт знизу вгору від коричневого --color-brown (рішення замовника 19.10: «градієнт на першому коричневого кольору»; наступна кімната — warm = той самий коричневий, шва нема); текст hero — світлий
      cta: { text: 'Переглянути ціни', href: '#price', variant: 'light' },   // світла кнопка: темна (тон сторінки, teal) на фото без градієнта давала нетекстовий контраст медіана 3.3:1 / p10 2.1:1 (verify-E3-B, дефект 3)
    },
    {
      type: 'layers', id: 'benefits', room: 'warm', look: 'about', shape: 'barrel',
      kicker: 'Переваги бочок', title: 'Що дає бочка',
      items: [
        { key: 'char', icon: 'barrels-char', title: 'Сильний обпал', text: 'Формує глибину та структуру', img: '/assets/img/barrels-tex-char.webp', slot: TEX('IMG-T1', 'обпалена клепка') },
        { key: 'caramel', icon: 'barrels-caramel', title: 'Карамелізація целюлози', text: 'Надає солодкі ванільні відтінки', img: '/assets/img/barrels-tex-caramel.webp', slot: TEX('IMG-T2', 'карамелізований шар дерева') },
        { key: 'toast', icon: 'barrels-toast', title: 'Ароматичні сполуки', text: 'Збагачують букет складними нотами', img: '/assets/img/barrels-tex-toast.webp', slot: TEX('IMG-T3', 'підсмажена поверхня дуба') },
        { key: 'oak', icon: 'barrels-oak', title: 'Феноли та смак', text: 'Додають пряність, дубові й димні нюанси', img: '/assets/img/barrels-tex-oak.webp', slot: TEX('IMG-T4', 'світлий дуб') },
      ],
    },
    {
      type: 'steps', id: 'how', room: 'deep',
      title: 'Від бочки до вашої пляшки',
      deck: true, split: true,   // стікі-колода: ліворуч текст на синьому тлі, праворуч Lottie-анімація кроку (gen-barrels.mjs)
      items: [
        { key: 'pour', value: '63%', title: 'Заливка', text: 'У бочку заливається дистилят міцністю близько 63%', lottie: '/assets/lottie/barrel-01-pour.json', alt: 'Анімація: дистилят ллється в бочку, рівень піднімається' },
        // «частка ангелів» (рішення замовника 15.10): число як приблизне — знак ≈; наближеність пояснює дрібний текст у «Ціні»
        { key: 'angels', value: '≈15%', title: 'Витримка', text: 'Під час витримки приблизно 15% спирту природно випаровується («частка ангелів»)', lottie: '/assets/lottie/barrel-02-angels.json', alt: 'Анімація: з бочки піднімаються частки ангелів' },
        { key: 'bottle', value: '40%', title: 'Розлив', text: 'Після дозрівання віскі доводиться до питної міцності 40% та розливається у пляшки 0,7 л', lottie: '/assets/lottie/barrel-03-bottle.json', alt: 'Анімація: пляшка наповнюється віскі' },
      ],
    },
    {
      type: 'compare', id: 'profit', room: 'warm', reveal: false,   // замовник [b63a7396]: без анімації появи (групи, кімнати, count-up)
      title: 'Скільки пляшок ви отримаєте?',
      groups: [
        // кімнати-погреби (рішення замовника 19.10: «погріб у перспективі», бочка по центру кімнати): обидві кімнати однакової ширини: span 5 (колонки 1–5 і 6–10); різницю ×4 дають глибина (прольоти) й розмір бочки;
        // під кімнатою по центру ОДИН великий рядок «200 Л ≈ 383 ПЛЯШКИ» (label літри + ≈ + count + countWord; відгук 1a979e42), нижче вартість однієї пляшки (рядка «по 0,7 л» немає — рев'ю 7bb3bec5; unit у групі необов'язковий); розмір бочки з liters, стелажі з count (1 проліт = 48 пляшок); media/cellar-barrels
        { key: 'b50', label: `${B50.liters} л`, liters: B50.liters, span: 5, align: 'center', accent: true, count: B50.bottles, approx: true, countWord: B50.bottlesWord, cellar: 'cellar-barrels',
          facts: [{ value: `≈ ${B50.cost}`, label: 'вартість вмісту однієї пляшки' }] },
        { key: 'b200', label: `${B200.liters} л`, liters: B200.liters, span: 5, align: 'center', count: B200.bottles, approx: true, countWord: B200.bottlesWord, cellar: 'cellar-barrels',
          facts: [{ value: `≈ ${B200.cost}`, label: 'вартість вмісту однієї пляшки' }] },
      ],
    },
    {
      type: 'tiles', id: 'next', room: 'warm', join: true,
      title: 'Подальша витримка',
      lead: `Бочки з-під марсали, мадери, портвейну, хересу${NB}— кожна додає свій унікальний відтінок смаку`,
      items: [
        { key: 'marsala', engraving: 'engraving-barrels-head', icon: 'barrels-grape', name: 'Marsala', origin: 'Сицилія, Італія', notes: NOTES.marsala, slot: HEAD('марсали') },
        { key: 'madeira', engraving: 'engraving-barrels-head', icon: 'barrels-mountain', name: 'Madeira', origin: 'Мадейра, Португалія', notes: NOTES.madeira, slot: HEAD('мадери') },
        { key: 'port', engraving: 'engraving-barrels-head', icon: 'barrels-glass', name: 'Port', origin: 'Долина Дору, Португалія', notes: NOTES.port, slot: HEAD('портвейну') },
        { key: 'sherry', engraving: 'engraving-barrels-head', icon: 'barrels-sun', name: 'Sherry', origin: 'Херес, Іспанія', notes: NOTES.sherry, slot: HEAD('хересу') },
      ],
    },
    {
      type: 'offers', id: 'price', room: 'deep', look: 'about',
      scene: 'scene-barrels-route', airy: true,   // замовник 20.10.2026: векторна панорама «Шлях бочки» замість фото; airy — панелі 50u, рядки шапки 30u
      title: 'Ціна',
      route: { from: 'Кентуккі (США)', to: 'Київ (Україна)', icon: 'barrels-ship' },
      lead: DISCLAIMER,
      items: [B50, B200].map((b) => ({
        key: `b${b.size.replace(/\D/g, '')}`, title: `Бочка ${b.size}`, price: b.price,
        facts: [{ dt: 'Пляшок по 0,7 л', dd: `≈ ${b.bottles}${NB}шт.` }, { dt: 'Вартість вмісту однієї пляшки', dd: `≈ ${b.cost}` }, { dt: 'Бочка у вашій власності', dd: 'Сертифікат' }],
        cta: { text: 'замовити', href: `feedback.html?topic=barrel&size=${b.size.replace(/\D/g, '')}` },
      })),
    },
  ],
};
