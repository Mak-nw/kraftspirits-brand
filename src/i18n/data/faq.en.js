// English overlay on src/data/faq.js: key = group slug; items[] by index { q, a }. DRAFT like the Ukrainian source (facts not yet confirmed by the client). Glossary: docs/i18n.md.
export default {
  order: {
    title: 'Orders and delivery',
    items: [
      { q: 'How do I place an order?', a: [
        'Pick a drink in the catalogue, choose the size on the product card and add it to your cart. In the cart, enter your contact details and delivery address and place the order. Payment methods are shown at checkout.',
        'There is no minimum order: you can order a single bottle.',
      ] },
      { q: 'Where and how do you deliver?', a: [
        'We deliver across Ukraine with Nova Poshta (to a branch or parcel locker). In Kyiv there is a courier, and pickup is possible too. We ship within 1–2 working days of payment, and the parcel is usually on its way for 1–3 days.',
        'Delivery is charged at the carrier’s rates and is free for orders over ₴3,000. You will see the exact cost in the cart before you pay.',
      ] },
      { q: 'Who can receive an order?', a: 'Only an adult, meaning 18 or older. Age is confirmed through Diia before payment and on delivery. Without confirmation the parcel will not be handed over and returns to us.' },
      { q: 'What should I do if a bottle arrives damaged?', a: [
        'Check the parcel when you collect it. If a bottle is broken or leaking, record it with the courier and take a photo.',
        'Write to us within 3 days through the contact form, with the topic “Orders and delivery”. We will replace the bottle or refund you.',
      ] },
      { q: 'Can I return or exchange a drink?', a: 'Returns and exchanges follow current legislation. If something is wrong with a drink, write to us. We look at every case individually and suggest a solution.' },
    ],
  },
  drinks: {
    title: 'About the drinks',
    items: [
      { q: 'How do YasnoCraft and Bazylsprings differ?', a: [
        'They are two brands of one distillery. YasnoCraft makes gin, calvados, fruit schnapps, tinctures and Fruit in a Bottle.',
        'Bazylsprings is a Ukrainian whisky house: White Whiskey, Barley Spirit and Oak Notes, where flavour is shaped by ageing and the barrel.',
      ] },
      { q: 'What sizes and strengths do the drinks come in?', a: 'We bottle in 0.5 L and 0.7 L. Some products come in both sizes, and the price on the product card changes with the size. Strength depends on the drink, from 30% ABV for tinctures to 45% for whisky and barrel-aged gin. Exact figures are on each product card.' },
      { q: 'How much do the drinks cost?', a: 'Catalogue prices currently run from ₴590 to ₴3,200 per bottle, depending on the drink and the size. The current price is always shown on the product card and in the cart.' },
      { q: 'How should I store a bottle?', a: 'Keep it upright in a cool, dark place, away from direct sunlight and sudden temperature changes. Close an opened bottle firmly with its cork so the aroma stays as the distiller intended.' },
      { q: 'How do I serve the drinks, and are there cocktail recipes?', a: 'Every product card has a “How to serve” section. Classic cocktails made with our drinks, with ingredients and method, are collected on the Cocktails page.' },
    ],
  },
  tours: {
    title: 'Tours',
    items: [
      { q: 'What does a tour include?', a: 'We show you the whole path from grain to bottle: copper stills, fermentation and the barrel hall. Guests finish with a tasting in our tasting room. A tour takes about 2 hours.' },
      { q: 'When are the tours and how much do they cost?', a: [
        'Tours run every Saturday and Sunday at 12:00 and 15:00, and on weekdays for groups of 6 or more by arrangement. A group is up to 12 guests.',
        'With a tasting the price is ₴750 per person. For drivers and guests who do not plan to taste, it is ₴400.',
      ] },
      { q: 'How do I book?', a: [
        'Send a request through the contact form with the topic “Tours”, giving your preferred date and the number of guests. Groups are small, so we recommend booking at least 5 days ahead.',
        'We confirm the booking within one working day and send the exact address and directions.',
      ] },
      { q: 'Can I bring children, or come without proof of age?', a: 'A tour with a tasting is for adult guests aged 18 and over. We may ask for an ID at the entrance.' },
      { q: 'Can I reschedule or cancel?', a: 'Yes. Write to us at least 48 hours before the start and we will move the tour to another date or cancel the booking free of charge.' },
    ],
  },
  barrels: {
    title: 'Barrel Futures',
    items: [
      { q: 'What is a barrel future?', a: [
        'It is a Bazylsprings whisky barrel that you buy now while it matures in our barrel hall in Yasnohorodka. The barrel becomes yours, and you receive a certificate for it.',
        'We use ex-bourbon Wild Turkey barrels from Kentucky, made of American oak.',
      ] },
      { q: 'Which casks are available and what do they cost?', a: [
        'A 50 L cask costs €2,000 and yields about 96 bottles of 0.7 L. A 200 L cask costs €6,000, about 383 bottles.',
        'We fill the cask with distillate at 63% ABV and bottle the whisky at 40%. The estimate allows for a nominal loss of about 15% during ageing (the “angels’ share”), so the number of bottles is approximate. Packaging, bottling and taxes are not included in the price of the barrel.',
      ] },
      { q: 'How long is the ageing, and who decides when to bottle?', a: 'The minimum ageing period is 3 years, after that you choose. Before bottling we send you a sample from your barrel or let you taste it here, and you decide whether to bottle now or let it keep maturing.' },
      { q: 'Can I visit my barrel?', a: 'Yes, by appointment through the contact form with the topic “Barrel trade”. Twice a year such a visit, with a sample from your barrel, is included in the price.' },
      { q: 'How do I pay for a barrel, and what happens after bottling?', a: [
        'We sign a contract. The price is in euros, payable in hryvnia at the National Bank of Ukraine rate on the day of payment.',
        'After ageing we bottle the whisky at the distillery in 0.7 L bottles, with the cost of bottles and bottling calculated separately. You can collect the bottles at the distillery or have them delivered. Further ageing in marsala, madeira, port or sherry casks is also possible, and we agree its terms separately.',
      ] },
    ],
  },
  contact: {
    title: 'Contacts and answers',
    items: [
      { q: 'How can I contact you?', a: [
        'The contact form is the easiest way: choose a topic and your message goes straight to the right person.',
        'You can also write to %contacts.email% or call %contacts.phoneDisplay% on working days from 10:00 to 18:00.',
      ] },
      { q: 'How quickly do you reply?', a: 'We reply to e-mails and form requests within one working day. If your message arrives at the weekend, we reply on the first working day.' },
      { q: 'Where is the distillery?', a: '%contacts.address%. There is no walk-in access: you can come on a tour or for a visit to your own barrel by appointment. We send the exact address and route with the confirmation.' },
      { q: 'Do you work with bars and restaurants?', a: 'Yes. Write through the contact form with the topic “Venue partnerships”, giving the venue name, the city and what you are interested in. We discuss terms for venues individually.' },
    ],
  },
};
