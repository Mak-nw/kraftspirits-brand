// Дані сторінки «Івенти» (events.html) — посадкова сторінка за шаблоном lp (src/data/lp-schema.js, docs/page-template.md); збірка — за сторінкою-шаблоном excursions.js.
// Рішення замовника: B2B і Івенти — ДВІ ОКРЕМІ СТОРІНКИ без вкладок і перемикача; B2B — src/data/b2b.js. Стилістика Опуса (3380ba4 / cad89c5): hero з коричневим градієнтом, фото distillery-tour.
// Тексти — з документа замовника YASNOCRAFT_B2B_та_Івенти.docx; факти лише з нього, без нових цін і обіцянок. [потрібно уточнити] — видимі плейсхолдери для замовника.
// Ритм кімнат: hero (fade brown) → tiles warm · circle · about · loose (3 арки) → tiles warm join (3 арки) → steps deep · deck split → card warm pad 40 → card stack (фото зліва)
// Медіа: ПЛЕЙСХОЛДЕРИ — наявні кадри проєкту; у `slot` — ТЗ на зйомку. Нових зображень не генеровано.
// Тема — src/styles/themes/excursions.css (YasnoCraft: зелений + коричневий).
const PH = (what) => `ПЛЕЙСХОЛДЕР (кадр з наявних). Потрібне фото: ${what}`;

export const events = {
  slug: 'events',
  theme: 'excursions',
  metaTitle: 'Івенти на дистилерії YasnoCraft: заходи від 30 гостей',
  metaDescription: 'Проведіть захід серед мідних кубів і бочок на дистилерії YasnoCraft під Києвом: від 30 до 200 гостей, ділова частина, екскурсія виробництвом і дегустація.',
  sections: [
    {
      type: 'hero', id: 'events-hero',
      title: 'Зробіть вашу подію унікальною', titleCols: 6, titleSize: 'large',
      lead: 'Організуйте захід серед мідних кубів, бочок і запаху солоду: ділова зустріч, екскурсія виробництвом і вечір дегустації в одному місці.',   // [потрібно уточнити] у документі «текст для прикладу – доопрацювати»; скорочено
      img: '/assets/img/distillery-tour.webp', alt: 'Гості на екскурсії в цеху дистилерії YasnoCraft',
      slot: PH('івент у залі дистилерії: гості за столами, мідні куби позаду, горизонталь ≥ 2400 px; низ кадру спокійний під коричневий градієнт'),
      fade: 'brown',   // коричневий градієнт знизу → перехід у коричневу кімнату «Що є на локації»
      cta: { text: 'Обговорити подію', href: 'feedback.html?topic=events', variant: 'beige' },
    },
    {
      // 6 пунктів документа — дві секції по 3 картки-арки (tiles circle + look about, як «Дегустація» на excursions), cols 8; 6 в один ряд рвуть назви, тому 3 + 3 у спільній кімнаті (друга — join)
      type: 'tiles', id: 'events-venue', room: 'warm', shape: 'circle', look: 'about', cols: 8, loose: true,
      kicker: 'Івенти', title: 'Що є на локації',
      items: [
        { key: 'capacity', name: 'Місткість', origin: 'Від 30\nдо 200 гостей', img: '/assets/img/occasions/bar.webp', alt: 'Світла зала дистилерії', tone: 'brown', zoom: 1.25, slot: PH('зала з гостями за столами, загальний план') },
        { key: 'food', name: 'Харчування', origin: 'Кейтеринг\nза вашим запитом', img: '/assets/img/excursions-tex-snacks.webp', alt: 'Дошка з горіхами й закусками', tone: 'brown', slot: PH('фуршетний стіл / кейтеринг на заході') },
        { key: 'atmosphere', name: 'Атмосфера', origin: 'Справжнє виробництво\nзамість банкетного залу', img: '/assets/img/home-tour-barrels.webp', alt: 'Бочки YasnoCraft', tone: 'brown', slot: PH('бочки й куби як декорація заходу, гості поруч') },
      ],
    },
    {
      type: 'tiles', id: 'events-safety', room: 'warm', join: true, shape: 'circle', look: 'about', cols: 8,
      title: 'Світло, звук і безпека',   // [потрібно уточнити] у документі один список «Що є на локації»; заголовок другої трійки додано
      items: [
        { key: 'power', name: 'Без перебоїв', origin: 'Стабільне світло\nта інтернет', img: '/assets/img/excursions-shop.webp', alt: 'Освітлена вітрина з пляшками', tone: 'brown', slot: PH('зала ввечері при робочому світлі') },
        { key: 'shelter', name: 'Укриття', origin: 'Сертифіковане бомбосховище\nна території', img: '/assets/img/barrels-tex-char.webp', alt: '', tone: 'brown', slot: PH('вхід до укриття на території [потрібно уточнити: чи можна знімати]') },
        { key: 'tech', name: 'Техніка', origin: 'Звукове обладнання\nта проєктор', img: '/assets/img/excursions-price-bg.webp', alt: 'Освітлений цех з мідними кубами', tone: 'brown', slot: PH('сцена: екран проєктора й колонки в залі') },
      ],
    },
    {
      type: 'steps', id: 'events-evening', room: 'deep', deck: true, split: true,
      kicker: 'Програма', title: 'Формат вечора',
      items: [
        { key: 'business', value: '1', title: 'Ділова частина', text: 'Конференція, стратегічна сесія, презентація або зустріч із партнерами',
          img: '/assets/img/about-opening.webp', alt: '', imgPos: 'top', slot: PH('ділова частина в залі: презентація з екраном, гості за столами') },
        { key: 'tour', value: '2', title: 'Екскурсія виробництвом', text: 'Гості проходять шлях від зерна до розливу',
          img: '/assets/img/excursions-deck-modern.webp', alt: '', slot: PH('група гостей у цеху біля мідних кубів') },
        { key: 'tasting', value: '3', title: 'Дегустація', text: 'Віскі, джини, бренді та настоянки YasnoCraft', tags: ['Віскі', 'Джини', 'Бренді', 'Настоянки'],
          img: '/assets/img/excursions-deck-place.webp', alt: '', slot: 'Кадр наявний (дегустаційний стіл із келихами). Краще — стіл заходу з гостями' },
        { key: 'talk', value: '4', title: 'Час для спілкування', text: 'Вільний час після програми [потрібно уточнити: тривалість і формат]',   // у документі лише назва кроку, без опису
          img: '/assets/img/hero-home.webp', alt: '', slot: PH('гості спілкуються з келихами серед мідних кубів, тепле вечірнє світло') },
      ],
    },
    {
      type: 'card', id: 'events-apply', room: 'warm', pad: 40,
      kicker: 'Івенти', title: 'Розкажіть про вашу подію',   // [потрібно уточнити] заголовок і текст блоку придумані за структурою excursions
      text: 'Опишіть захід: формат, кількість гостей і бажану дату. Повернемось з пропозицією [потрібно уточнити: ціни й умови оренди].',
      img: '/assets/img/excursions-hero-ecopark.webp', alt: 'Територія дистилерії з висоти: будівлі, галявини, поля й дороги навколо', slot: PH('вечір на дистилерії: гості, келихи, тепле світло, 6:5'),
      cta: { text: 'Обговорити подію', href: 'feedback.html?topic=events' },
    },
    {
      type: 'card', id: 'apply', stack: true, photoFirst: true,   // стек під «Розкажіть про вашу подію» в тій самій кімнаті, фото ліворуч
      kicker: 'Заявка', title: 'Залиште заявку на захід',   // [потрібно уточнити] текст блоку придуманий за структурою excursions
      text: 'Напишіть, коли плануєте захід і скільки буде гостей, і ми підберемо формат вечора на дистилерії.',
      img: '/assets/img/home-tour-distillery.webp', alt: 'Мідний перегінний куб у світлому цеху дистилерії', slot: PH('команда дистилерії на зустрічі з клієнтом, 6:5'),
      cta: { text: 'Залишити заявку', href: 'feedback.html?topic=events' },
    },
  ],
};
