// Позиції каталогу (14). Джерело: site/kraftspirits/src/data/products.json + site/catalog.md (лише читання).
// price — мінімальна ціна серед об'ємів (₴), null — ціни немає. Barley Spirit (0.7 л, 2190) і Oak Notes (0.5 л, 1990) — ціни-плейсхолдери з catalog.md, ще не затверджені клієнтом.
// Сторінка товару YasnoCraft (новий макет 205:2430): hero = велике студійне фото (є у всіх 11 позицій YasnoCraft; hero 900:968, джерело generative/newbottles); gallery[i] = { thumb, large } — 2 мініатюри-накладки (126×167), СПІЛЬНІ для всіх 11 позицій: slider/yc-gin-studio-*, slider/yc-gin-herbs-* (джерело generative/slider, tools/make-slide.mjs); клік замінює велике фото, повторний — повертає hero. Bazylsprings (194:1520): hero = студійне фото (1732×1750, джерело generative/newbottles, whisky-*.png; всі 3 віскі); gallery = 2 мініатюри-накладки всередині фото-фрейму (однакова розкладка YC/BS), спільні для всіх 3: slider/bs-whisky-studio-*, slider/bs-whisky-wheat-*.
// status 'available' — позиція доступна (картка з посиланням, ціна, покупка) для всіх позицій. image — шлях від кореня public (без початкового «/»), null → плейсхолдер.
export const BRANDS = [
  { id: 'yasnocraft', label: 'YasnoCraft' },
  { id: 'bazylsprings', label: 'Bazylsprings' },
];

export const CATEGORIES = [
  { id: 'gin', label: 'Джин' },
  { id: 'calvados', label: 'Кальвадос' },
  { id: 'schnapps', label: 'Фруктові шнапси' },
  { id: 'tinctures', label: 'Настоянки' },
  { id: 'whisky', label: 'Віскі' },
  { id: 'fruit-in-bottle', label: 'Фрукт у пляшці' },
];

export const PRODUCTS = [
  {
    "id": 1,
    "slug": "gin-yasnyi",
    "name": "Джин Ясногородський",
    "nameLines": [
      "Джин",
      "Ясногородський"
    ],
    "brand": "yasnocraft",
    "category": "gin",
    "kind": "Лондонський сухий джин",
    "notes": "Ялівець, цитрус, свіжі трави",
    "abv": 43,
    "volumes": [
      {
        "l": 0.5,
        "price": 850
      },
      {
        "l": 0.7,
        "price": 1150
      }
    ],
    "price": 850,
    "badge": "Хіт",
    "description": "Прозорий, зібраний, чистий. Основа лінійки YasnoCraft: ялівець без перебору, цитрусова цедра та трави з сезонного саду. Три перегонки — і жодного зайвого.",
    "image": "assets/img/products/gin-yasnyi.webp",
    "hero": "assets/img/product-hero-yasnyi-new.webp",
    "gallery": [
      { "thumb": "assets/img/slider/yc-gin-studio-thumb.webp", "large": "assets/img/slider/yc-gin-studio-lg.webp" },
      { "thumb": "assets/img/slider/yc-gin-herbs-thumb.webp", "large": "assets/img/slider/yc-gin-herbs-lg.webp" }
    ],
    "status": "available"
  },
  {
    "id": 2,
    "slug": "gin-garden",
    "name": "Джин Садовий",
    "nameLines": [
      "Джин",
      "Садовий"
    ],
    "brand": "yasnocraft",
    "category": "gin",
    "kind": "Садовий джин",
    "notes": "Базилік, огірок, лайм",
    "abv": 42,
    "volumes": [
      {
        "l": 0.5,
        "price": 790
      }
    ],
    "price": 790,
    "badge": "Новинка",
    "description": "Легший і зеленіший за класику: свіжий базилік, огірок і лайм. Добре працює в коктейлях із травами.",
    "image": "assets/img/products/gin-garden.webp",
    "hero": "assets/img/product-hero-gin-garden-new.webp",
    "gallery": [
      { "thumb": "assets/img/slider/yc-gin-studio-thumb.webp", "large": "assets/img/slider/yc-gin-studio-lg.webp" },
      { "thumb": "assets/img/slider/yc-gin-herbs-thumb.webp", "large": "assets/img/slider/yc-gin-herbs-lg.webp" }
    ],
    "status": "available"
  },
  {
    "id": 3,
    "slug": "gin-barrel",
    "name": "Джин Бочковий",
    "nameLines": [
      "Джин",
      "Бочковий"
    ],
    "brand": "yasnocraft",
    "category": "gin",
    "kind": "Джин, витриманий у дубі",
    "notes": "Ваніль, ялівець, дуб",
    "abv": 45,
    "volumes": [
      {
        "l": 0.5,
        "price": 1250
      }
    ],
    "price": 1250,
    "badge": "Хіт",
    "description": "Той самий дистилят, що дозрів у дубовій бочці. Солом'яний колір, м'які тони ванілі, ялівець як основа. Для неспішної дегустації.",
    "image": "assets/img/products/gin-barrel.webp",
    "hero": "assets/img/product-hero-gin-barrel-new.webp",
    "gallery": [
      { "thumb": "assets/img/slider/yc-gin-studio-thumb.webp", "large": "assets/img/slider/yc-gin-studio-lg.webp" },
      { "thumb": "assets/img/slider/yc-gin-herbs-thumb.webp", "large": "assets/img/slider/yc-gin-herbs-lg.webp" }
    ],
    "status": "available"
  },
  {
    "id": 4,
    "slug": "calvados-3",
    "name": "Кальвадос 3 роки",
    "nameLines": [
      "Кальвадос",
      "3 роки"
    ],
    "brand": "yasnocraft",
    "category": "calvados",
    "kind": "Яблучний бренді, витримка 3 роки",
    "notes": "Печене яблуко, ваніль, спеції",
    "abv": 40,
    "volumes": [
      {
        "l": 0.7,
        "price": 1490
      }
    ],
    "price": 1490,
    "badge": "Хіт",
    "description": "Молодий яблучний дистилят із київських садів. Три роки в дубі дають м'якість і тепло, не затуляючи яблуко.",
    "image": "assets/img/products/calvados-3.webp",
    "hero": "assets/img/product-hero-calvados-3-new.webp",
    "gallery": [
      { "thumb": "assets/img/slider/yc-gin-studio-thumb.webp", "large": "assets/img/slider/yc-gin-studio-lg.webp" },
      { "thumb": "assets/img/slider/yc-gin-herbs-thumb.webp", "large": "assets/img/slider/yc-gin-herbs-lg.webp" }
    ],
    "status": "available"
  },
  {
    "id": 5,
    "slug": "calvados-5",
    "name": "Кальвадос 5 років",
    "nameLines": [
      "Кальвадос",
      "5 років"
    ],
    "brand": "yasnocraft",
    "category": "calvados",
    "kind": "Яблучний бренді, бочкова витримка",
    "notes": "Сушене яблуко, мед, дуб",
    "abv": 40,
    "volumes": [
      {
        "l": 0.7,
        "price": 1950
      }
    ],
    "price": 1950,
    "badge": "Хіт",
    "description": "П'ять років у дубовій бочці: глибокий бурштин, сушене яблуко, мед і тонка деревність. Подарунок для поціновувача.",
    "image": "assets/img/products/calvados-5.webp",
    "hero": "assets/img/product-hero-calvados-5-new.webp",
    "gallery": [
      { "thumb": "assets/img/slider/yc-gin-studio-thumb.webp", "large": "assets/img/slider/yc-gin-studio-lg.webp" },
      { "thumb": "assets/img/slider/yc-gin-herbs-thumb.webp", "large": "assets/img/slider/yc-gin-herbs-lg.webp" }
    ],
    "status": "available"
  },
  {
    "id": 6,
    "slug": "schnapps-plum",
    "name": "Шнапс сливовий",
    "nameLines": [
      "Шнапс",
      "сливовий"
    ],
    "brand": "yasnocraft",
    "category": "schnapps",
    "kind": "Дистилят зі сливи",
    "notes": "Стигла слива, мигдаль, чистий фініш",
    "abv": 40,
    "volumes": [
      {
        "l": 0.5,
        "price": 680
      }
    ],
    "price": 680,
    "badge": "Хіт",
    "description": "Прозорий дистилят із повністю стиглих слив. Аромат фрукта і трохи кісточки, без цукру й ароматизаторів.",
    "image": "assets/img/products/schnapps-plum.webp",
    "hero": "assets/img/product-hero-schnapps-plum-new.webp",
    "gallery": [
      { "thumb": "assets/img/slider/yc-gin-studio-thumb.webp", "large": "assets/img/slider/yc-gin-studio-lg.webp" },
      { "thumb": "assets/img/slider/yc-gin-herbs-thumb.webp", "large": "assets/img/slider/yc-gin-herbs-lg.webp" }
    ],
    "status": "available"
  },
  {
    "id": 7,
    "slug": "schnapps-pear",
    "name": "Шнапс грушевий",
    "nameLines": [
      "Шнапс",
      "грушевий"
    ],
    "brand": "yasnocraft",
    "category": "schnapps",
    "kind": "Дистилят із груші",
    "notes": "Груша, мед, квітковий цвіт",
    "abv": 40,
    "volumes": [
      {
        "l": 0.5,
        "price": 720
      }
    ],
    "price": 720,
    "badge": "Хіт",
    "description": "Ніжний, ароматний, виразно грушевий. Фрукт у центрі, без домінування спирту.",
    "image": "assets/img/products/schnapps-pear.webp",
    "hero": "assets/img/product-hero-schnapps-pear-new.webp",
    "gallery": [
      { "thumb": "assets/img/slider/yc-gin-studio-thumb.webp", "large": "assets/img/slider/yc-gin-studio-lg.webp" },
      { "thumb": "assets/img/slider/yc-gin-herbs-thumb.webp", "large": "assets/img/slider/yc-gin-herbs-lg.webp" }
    ],
    "status": "available"
  },
  {
    "id": 8,
    "slug": "schnapps-cherry",
    "name": "Шнапс вишневий",
    "nameLines": [
      "Шнапс",
      "вишневий"
    ],
    "brand": "yasnocraft",
    "category": "schnapps",
    "kind": "Дистилят із вишні",
    "notes": "Вишня, кісточка, марципан",
    "abv": 40,
    "volumes": [
      {
        "l": 0.5,
        "price": 700
      }
    ],
    "price": 700,
    "badge": "Новинка",
    "description": "Вишня разом із кісточкою: яскравий аромат, легка мигдальна нотка. Сезонний реліз.",
    "image": "assets/img/products/schnapps-cherry.webp",
    "hero": "assets/img/product-hero-schnapps-cherry-new.webp",
    "gallery": [
      { "thumb": "assets/img/slider/yc-gin-studio-thumb.webp", "large": "assets/img/slider/yc-gin-studio-lg.webp" },
      { "thumb": "assets/img/slider/yc-gin-herbs-thumb.webp", "large": "assets/img/slider/yc-gin-herbs-lg.webp" }
    ],
    "status": "available"
  },
  {
    "id": 9,
    "slug": "tincture-herbal",
    "name": "Настоянка трав'яна",
    "nameLines": [
      "Настоянка",
      "трав'яна"
    ],
    "brand": "yasnocraft",
    "category": "tinctures",
    "kind": "Трав'яна настоянка",
    "notes": "М'ята, чебрець, кора",
    "abv": 35,
    "volumes": [
      {
        "l": 0.5,
        "price": 590
      }
    ],
    "price": 590,
    "badge": "Хіт",
    "description": "Збір сухих і свіжих трав на чистому дистиляті. Глибока, трохи гірка, з довгим трав'яним післясмаком.",
    "image": "assets/img/products/tincture-herbal.webp",
    "hero": "assets/img/product-hero-tincture-herbal-new.webp",
    "gallery": [
      { "thumb": "assets/img/slider/yc-gin-studio-thumb.webp", "large": "assets/img/slider/yc-gin-studio-lg.webp" },
      { "thumb": "assets/img/slider/yc-gin-herbs-thumb.webp", "large": "assets/img/slider/yc-gin-herbs-lg.webp" }
    ],
    "status": "available"
  },
  {
    "id": 10,
    "slug": "tincture-rowan",
    "name": "Настоянка горобинова",
    "nameLines": [
      "Настоянка",
      "горобинова"
    ],
    "brand": "yasnocraft",
    "category": "tinctures",
    "kind": "Настоянка на горобині",
    "notes": "Горобина, мед, легка гіркота",
    "abv": 30,
    "volumes": [
      {
        "l": 0.5,
        "price": 620
      }
    ],
    "price": 620,
    "badge": null,
    "description": "Настояна на ягодах горобини з краплею меду. Рубіновий колір і чесна гіркота.",
    "image": "assets/img/products/tincture-rowan.webp",
    "hero": "assets/img/product-hero-tincture-rowan-new.webp",
    "gallery": [
      { "thumb": "assets/img/slider/yc-gin-studio-thumb.webp", "large": "assets/img/slider/yc-gin-studio-lg.webp" },
      { "thumb": "assets/img/slider/yc-gin-herbs-thumb.webp", "large": "assets/img/slider/yc-gin-herbs-lg.webp" }
    ],
    "status": "available"
  },
  {
    "id": 11,
    "slug": "fruit-watermelon",
    "name": "Фрукт у пляшці Кавун",
    "nameLines": [
      "Фрукт у пляшці",
      "Кавун"
    ],
    "brand": "yasnocraft",
    "category": "fruit-in-bottle",
    "kind": "Колекційна пляшка з кавуном всередині",
    "notes": "Кавун, чистий дистилят, об'єкт у склі",
    "abv": 40,
    "volumes": [
      {
        "l": 0.7,
        "price": 3200
      }
    ],
    "price": 3200,
    "badge": "Ліміт",
    "description": "Кавун дозріває всередині пляшки, і тільки потім її заливають дистилятом. Колекційний подарунок, єдина така позиція в нашій лінійці. Кількість обмежена.",
    "image": "assets/img/products/fruit-watermelon.webp",
    "hero": "assets/img/product-hero-fruit-watermelon-new.webp",
    "gallery": [
      { "thumb": "assets/img/slider/yc-gin-studio-thumb.webp", "large": "assets/img/slider/yc-gin-studio-lg.webp" },
      { "thumb": "assets/img/slider/yc-gin-herbs-thumb.webp", "large": "assets/img/slider/yc-gin-herbs-lg.webp" }
    ],
    "status": "available"
  },
  {
    "id": 12,
    "slug": "whiskey-white",
    "name": "White Whiskey",
    "nameLines": [
      "White",
      "Whiskey"
    ],
    "brand": "bazylsprings",
    "category": "whisky",
    "kind": "Невитриманий зерновий дистилят",
    "notes": "Зерно, ваніль, чистий солод",
    "abv": 45,
    "volumes": [
      {
        "l": 0.5,
        "price": 1690
      }
    ],
    "price": 1690,
    "badge": null,
    "description": "Невитриманий зерновий дистилят: чисте зерно, чиста вода і м'яка ванільна нотка. Перше місце на Ukrainian Craft Spirits Awards.",
    "image": "assets/img/products/whiskey-white.webp",
    "hero": "assets/img/product-hero-whiskey-white-new.webp",
    "gallery": [
      { "thumb": "assets/img/slider/bs-whisky-studio-thumb.webp", "large": "assets/img/slider/bs-whisky-studio-lg.webp" },
      { "thumb": "assets/img/slider/bs-whisky-wheat-thumb.webp", "large": "assets/img/slider/bs-whisky-wheat-lg.webp" }
    ],
    "status": "available"
  },
  {
    "id": 13,
    "slug": "barley-spirit",
    "name": "Barley Spirit",
    "nameLines": [
      "Barley",
      "Spirit"
    ],
    "brand": "bazylsprings",
    "category": "whisky",
    "kind": "Невитриманий ячмінний дистилят",
    "notes": "Ячмінний солод, хліб, чиста вода",
    "abv": 45,
    "volumes": [
      {
        "l": 0.7,
        "price": 2190
      }
    ],
    "price": 2190,
    "badge": null,
    "description": "Білий дистилят з ячмінного солоду. Чистий і прозорий, з м'яким хлібним тоном; добре тримає форму в коктейлі й просто з льодом.",
    "image": "assets/img/products/barley-spirit.webp",
    "hero": "assets/img/product-hero-barley-spirit-new.webp",
    "gallery": [
      { "thumb": "assets/img/slider/bs-whisky-studio-thumb.webp", "large": "assets/img/slider/bs-whisky-studio-lg.webp" },
      { "thumb": "assets/img/slider/bs-whisky-wheat-thumb.webp", "large": "assets/img/slider/bs-whisky-wheat-lg.webp" }
    ],
    "status": "available"
  },
  {
    "id": 14,
    "slug": "oak-notes",
    "name": "Oak Notes",
    "nameLines": [
      "Oak",
      "Notes"
    ],
    "brand": "bazylsprings",
    "category": "whisky",
    "kind": "Настоянка на дубовій клепці, тип віскі",
    "notes": "Дуб, ваніль, карамель, спеції",
    "abv": 42,
    "volumes": [
      {
        "l": 0.5,
        "price": 1990
      }
    ],
    "price": 1990,
    "badge": "Новинка",
    "description": "Зерновий дистилят, настояний на дубовій клепці: бурштиновий колір, тепла деревна глибина, ваніль і м'які спеції. Обмежена партія.",
    "image": "assets/img/products/oak-notes.webp",
    "hero": "assets/img/product-hero-oak-notes-new.webp",
    "gallery": [
      { "thumb": "assets/img/slider/bs-whisky-studio-thumb.webp", "large": "assets/img/slider/bs-whisky-studio-lg.webp" },
      { "thumb": "assets/img/slider/bs-whisky-wheat-thumb.webp", "large": "assets/img/slider/bs-whisky-wheat-lg.webp" }
    ],
    "status": "available"
  }
];
