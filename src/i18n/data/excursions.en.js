// English overlay on src/data/excursions.js (sections by index; only text fields). Prices: ₴ symbol, no conversion. DRAFT: needs a native read; [to be confirmed: …] placeholders mirror the Ukrainian [потрібно уточнити: …] for the client.
export default {
  metaTitle: 'Tours and tastings at the YasnoCraft distillery',
  metaDescription: 'A tour of the YasnoCraft distillery in Yasnohorodka and a tasting of 4 or 8 drinks with snacks. ₴1,500 / ₴3,800 per person, groups of 6 or more, from 24 October.',
  sections: [
    { title: 'See how Ukrainian whisky is born', alt: 'Aerial view of the Yasnohorodka eco-park: buildings, lawns, fields and roads around', cta: { text: 'Choose a format' } },
    { kicker: 'What to expect', title: 'One visit, four experiences', items: [
      { title: 'Distillery tour', text: 'The production process, the equipment and the YasnoCraft philosophy' },
      { title: 'Tasting of 4 or 8 drinks', text: 'Newmake, pumpkin spirit, gin and whisky, in two formats' },
      { title: 'Snacks with every glass', text: 'Nuts, crackers and dry jam; in the larger format, cured meats and cheeses' },
      { title: 'Groups of 6 or more', text: 'For friends, colleagues or special occasions' },
    ] },
    { kicker: 'Distillery tour', title: 'From grain to bottle, with your own eyes', lead: 'We walk you through the distillery halls and explain how modern production works, where we come from and why we do things this way. No lecture: we show, and you ask about anything.', items: [
      { title: 'Modern production', text: 'The distillery equipment and how it works in a real cycle', alt: 'Copper stills and columns in the distillery hall' },
      { title: 'Our story and philosophy', text: 'Why YasnoCraft appeared in Yasnohorodka and what “clean distillate” means to us', alt: 'Barrel cellar: oak barrels on racks and an old cooper’s bench' },
      { title: 'From grain to bottle', text: 'Every stage of the process, from raw material to the finished bottle, in order', alt: 'Grain and ears of wheat, a copper vessel of distillate and a bottle of whisky on a wooden table' },
      { title: 'Your place in the story', text: 'A chance to take part in making Ukrainian whisky', alt: 'A tasting table with a row of whisky glasses' },
    ] },
    { kicker: 'Tasting', title: 'Four characters in one row', lead: 'We lead the tasting from clear to aged: first the clean distillate, then a seasonal drink, gin and whisky. That way you can hear what the grain gives, what the botanicals give and what the barrel gives.', items: [
      { alt: 'A bottle of unaged whisky', name: 'Newmake', origin: 'Clean grain\ndistillate' },
      { alt: 'A glass of pumpkin spirit, a yellow drink on a dark background', name: 'Pumpkin spirit', origin: 'A seasonal drink\nwith a Ukrainian character' },
      { alt: 'A bottle of Yasnyi gin', name: 'Gin', origin: 'Signature,\nbotanical' },
      { alt: 'A bottle of aged whisky', name: 'Whisky', origin: 'Aged,\nrich flavour' },
    ] },
    { kicker: 'Formats', title: 'Which tasting format to choose?', lead: 'Both formats include the tour and snacks, for a group of 6 or more. The difference is depth: the larger format brings four whiskies of different characters and two gins, and cured meats and cheeses join the table.', items: [
      { unit: 'drinks', items: [
        { title: 'Newmake', text: 'Clean grain distillate' },
        { title: 'Pumpkin spirit', text: 'A seasonal drink with a Ukrainian character' },
        { title: 'Gin', text: 'Signature, botanical' },
        { title: 'Whisky', text: 'Aged, with a rich flavour' },
      ], facts: [{ label: 'Snacks', value: 'Nuts, crackers and dry jam' }, { label: 'Group', value: 'from 6 people' }] },
      { unit: 'drinks', items: [
        { title: 'Whisky', text: '4 samples: aged, with different characters' },
        { title: 'Gin', text: '2 samples: a classic and a signature gin' },
        { title: 'Pumpkin spirit', text: '1 sample: a seasonal drink with a Ukrainian character' },
        { title: 'Newmake', text: '1 sample: clean grain distillate' },
      ], facts: [{ label: 'Snacks', value: 'Nuts, crackers, dry jam, cured meats and cheeses' }, { label: 'Group', value: 'from 6 people' }] },
    ] },
    { kicker: 'Price', title: 'Choose a format and book a date', lead: 'The price is per person and already includes the tour, the tasting and snacks. Groups of 6 or more. Tours run from 24 October.', items: [
      { title: 'Tour\n+ 4 drinks', price: '₴1,500', priceNote: 'per person', facts: [{ dt: 'Drinks' }, { dt: 'Snacks', dd: 'nuts, crackers, dry jam' }, { dt: 'Group', dd: 'from 6 people' }], includes: ['Distillery tour', 'Snacks for the tasting'], cta: { text: 'Book' } },
      { title: 'Tour\n+ 8 drinks', price: '₴3,800', priceNote: 'per person', facts: [{ dt: 'Drinks' }, { dt: 'Snacks', dd: '+ cured meats and cheeses' }, { dt: 'Group', dd: 'from 6 people' }], includes: ['Distillery tour', 'Snacks with cured meats and cheeses'], cta: { text: 'Book' } },
    ] },
    { kicker: 'The distillery shop', title: 'Take home what you liked', list: [
      'Unique samples: limited batches and special releases',
      'Gift sets for special occasions',
      'YasnoCraft souvenirs that keep the distillery’s atmosphere',
    ], alt: 'The shop window at the distillery with gift sets', cta: { text: 'View the catalogue' } },
    { kicker: 'Our location', title: 'Yasnohorodka Eco Park', lead: 'The distillery stands in the grounds of the Yasnohorodka family eco-park, so you can combine the tour with a walk and some rest.', facts: [
      { label: 'Address', value: 'Kyiv Region, Fastiv District, Yasnohorodka village, 46 Dovhyi Brid St' },
      { label: 'Eco-park', value: 'In the grounds of the Yasnohorodka family eco-park' },
      { label: 'Hours', value: 'Mon–Fri, 11:00–18:00\nTours by appointment' },
    ], ctas: [{ text: 'Book' }] },
    { title: 'Before you travel', items: [
      { q: 'What is included in the price?', a: 'The distillery tour, a tasting of 4 or 8 drinks and snacks with it. ₴1,500 or ₴3,800 per person, depending on the format.' },
      { q: 'How do the 4-drink and 8-drink formats differ?', a: 'The 4-drink format has newmake, pumpkin spirit, gin and whisky, with nuts, crackers and dry jam. The 8-drink format has four whiskies of different characters, two gins, pumpkin spirit and newmake, and cured meats and cheeses join the snacks.' },
      { q: 'How many people should be in a group?', a: 'A group is 6 people or more. The format suits friends, colleagues or special occasions. If your party is a different size, message us.' },
      { q: 'How do I book?', a: 'Message us in Instagram Direct or call 067 712 59 90. Tours run from 24 October. We will confirm the booking terms when you get in touch.' },
      { q: 'How long does a tour with a tasting take?', a: 'Please ask about the duration when you book.' },
      { q: 'Can I come with children?', a: 'The distillery is in the grounds of the Yasnohorodka family eco-park. Alcohol tasting is only for guests aged 18 and over. Please ask about visiting with children when you book.' },
      { q: 'Where is the distillery and how do I get there?', a: 'Kyiv Region, Fastiv District, Yasnohorodka village, 46 Dovhyi Brid St, in the grounds of the Yasnohorodka family eco-park. We will tell you how to get there when you book.' },
    ] },
  ],
};
