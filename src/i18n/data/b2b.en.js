// English overlay on src/data/b2b.js (B2B page only; sections by index; only text fields). DRAFT: needs a native read; [to be confirmed: …] placeholders mirror the Ukrainian [потрібно уточнити: …] for the client.
const NB = ' '; // non-breaking space: «3,660 L» does not break
export default {
  metaTitle: 'B2B at the YasnoCraft distillery: bottling and production',
  metaDescription: 'Private label bottling, gift sets and certificates, and contract production at the YasnoCraft distillery near Kyiv. We reply to every request within 1 working day.',
  sections: [
    { title: 'A distillery that works for your brand', lead: 'A full cycle from grain to bottle near Kyiv. We bottle drinks under your label, assemble gift sets and produce to your recipe.', alt: 'The YasnoCraft distillery building among fields and ponds', cta: { text: 'Leave a request' } },
    { kicker: 'B2B', title: 'Four ways to work together', items: [
      { title: 'Private label bottling', text: 'Gin, brandy, tincture or liqueur under your label: your own drink that builds recognition' },
      { title: 'Gift sets', text: 'You choose the contents, we pack it with your logo. Inside: drinks from our distillery' },
      { title: 'Gift certificates', text: 'A certificate for a tour with a tasting. The recipient picks the date themselves' },
      { title: 'Contract production', text: 'We make drinks to your recipe or develop one together with our team' },
    ] },
    { kicker: 'Production', title: 'What we have for this', lead: 'You can launch your own line without building a production site: we handle distilling, cask ageing, blending, filtering and bottling at one distillery.', items: [
      { title: 'Capacity', value: `up to 400${NB}L`, text: 'of drinks per shift' },
      { title: 'Wash still', value: `3,660${NB}L`, text: 'Classic still: distilling in a pot still or through plates' },
      { title: 'Spirit still', value: `2,420${NB}L`, text: 'Also classic: a pot still or plates, your choice' },
      { title: 'Vacuum still', value: `410${NB}L`, text: 'Up to 7 plates and a gin basket. Low temperature keeps fruit and botanical aroma' },
    ] },
    { kicker: 'Working together', title: 'How we work', items: [
      { title: 'Request', text: 'Leave a request and we will reply within 1 working day' },
      { title: 'Proposal', text: 'We send terms, a composition or a recipe for your task and budget' },
      { title: 'Contract', text: 'We work with companies and sole proprietors: contract, invoice and closing documents', tags: ['Companies', 'Sole proprietors'] },
      { title: 'Delivery', text: 'We make the order and hand it over on the agreed date' },
    ] },
    { kicker: 'Gift sets', title: 'Gifts with your logo', text: 'For partners, clients and your team. You choose the contents of the set, we design the packaging with your logo, and inside are drinks from our own distillery.', alt: 'Shelves with YasnoCraft bottles', cta: { text: 'Learn more' } },
    { kicker: 'Request', title: 'Tell us about your task', text: 'Tell us what you need: bottling under your brand, gift sets, certificates or production to your recipe. We reply within 1 working day.', alt: 'Glasses above a tasting table', cta: { text: 'Leave a request' } },
  ],
};
