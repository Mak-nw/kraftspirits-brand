// English overlay on src/data/b2b.js (B2B page only; sections by index; only text fields). DRAFT: needs a native read; [to be confirmed: …] placeholders mirror the Ukrainian [потрібно уточнити: …] for the client.
const NB = ' '; // non-breaking space: «3,660 L» does not break
export default {
  metaTitle: 'B2B at the YasnoCraft distillery: bottling and production',
  metaDescription: 'Private label bottling, gift sets and certificates, and contract production at the YasnoCraft distillery near Kyiv. We reply to every request within 1 working day.',
  sections: [
    { title: 'A distillery that works for your brand', lead: 'A full cycle from grain to bottle near Kyiv. We bottle drinks under your label, assemble gift sets and produce to your recipe.', alt: 'The YasnoCraft distillery building among fields and ponds', cta: { text: 'Leave a request' } },
    {},   // ref 10 (two brand cards): texts come from the home page dictionary (t.home.choice.*)
    { title: 'Gift sets.', text: 'Gifts for partners, clients and your team, put together for your task. You choose the contents of the set, we design the packaging with your logo, and inside - drinks from our own distillery.', alt: 'A gift box with a ribbon and a bottle by the window', cta: { text: 'How the house works' } },
    { title: 'Gift certificates.', text: 'Give an experience instead of things. A certificate for a tour with a tasting at our distillery suits friends, colleagues, family or partners: you buy it, you give it, and the recipient picks the date.', alt: 'A terrace table with glasses against fields' },
    { title: 'Contract production.', text: 'We make drinks to your recipe or develop one together with our team. Suits brands that want to launch their own line without building a production site.', alt: 'A copper still in the distillery hall', items: [
      { title: 'Capacity:', text: 'up to 400 L of drinks per shift' },
      { title: 'Two classic stills:', text: 'wash (3,660 L) and spirit (2,420 L) - distilling in a pot still or through plates' },
      { title: 'Vacuum still:', text: '410 L, up to 7 plates and a gin basket; low distilling temperature keeps fruit and botanical aroma' },
      { title: 'Full cycle:', text: 'ageing zones, different cask types, blending, filtering and bottling' },
    ] },
    { kicker: 'Working together', title: 'How we work', items: [
      { title: 'Request', text: 'Leave a request and we will reply within 1 working day' },
      { title: 'Proposal', text: 'We send terms, a composition or a recipe for your task and budget' },
      { title: 'Contract', text: 'We work with companies and sole proprietors: contract, invoice and closing documents', tags: ['Companies', 'Sole proprietors'] },
      { title: 'Delivery', text: 'We make the order and hand it over on the agreed date' },
    ] },
    { kicker: 'Request', title: 'Tell us about your task', text: 'Tell us what you need: bottling under your brand, gift sets, certificates or production to your recipe. We reply within 1 working day.', alt: 'Glasses above a tasting table', cta: { text: 'Leave a request' } },
  ],
};
