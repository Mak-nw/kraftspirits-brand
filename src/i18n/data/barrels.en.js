// English overlay on src/data/barrels.js (sections by index; only text fields). Numbers formatted for English (€2,000, 20.83). DRAFT: copy pass done, needs a native read. Glossary: docs/i18n.md.
const NB = ' ';
export default {
  metaTitle: 'Bazylsprings Barrel Futures — YasnoCraft × Bazylsprings',
  metaDescription: 'Bazylsprings Barrel Futures: ex-bourbon Wild Turkey barrels from Kentucky, made of American oak, 200 L and 50 L. From barrel to bottle, the estimated yield of 0.7 L bottles, further ageing and price.',
  sections: [
    { title: 'Bazylsprings Barrel Futures', cta: { text: 'See prices' } },
    { kicker: 'Why barrels', title: 'What the barrel gives', items: [
      { title: 'Heavy char', text: 'Builds depth and structure' },
      { title: 'Caramelised cellulose', text: 'Brings sweet vanilla shades' },
      { title: 'Aromatic compounds', text: 'Enrich the bouquet with complex notes' },
      { title: 'Phenols and flavour', text: 'Add spice, oak and smoky nuances' },
    ] },
    { title: 'From barrel to your bottle', items: [
      { title: 'Filling', text: 'The barrel is filled with distillate at about 63% ABV', alt: 'Animation: distillate pours into a barrel and the level rises' },
      { title: 'Ageing', text: 'During ageing about 15% of the spirit evaporates naturally (the “angels’ share”)', alt: 'Animation: the angels’ share rises from the barrel' },
      { title: 'Bottling', text: 'After maturing, the whisky is brought down to drinking strength of 40% ABV and bottled in 0.7 L bottles', alt: 'Animation: a bottle fills with whisky' },
    ] },
    { title: 'How many bottles will you get?', groups: [
      { label: '50 L', countWord: 'bottles', facts: [{ value: '≈ €20.83', label: 'cost per bottle' }] },
      { label: '200 L', countWord: 'bottles', facts: [{ value: '≈ €15.66', label: 'cost per bottle' }] },
    ] },
    { title: 'Further ageing', lead: `Casks that held marsala, madeira, port or sherry${NB}— each adds its own shade of flavour`, items: [
      { origin: 'Sicily, Italy', notes: 'apricot, honey, almond' },
      { origin: 'Madeira, Portugal', notes: 'caramel, coffee, zest' },
      { origin: 'Douro Valley, Portugal', notes: 'fig, raisin, toffee' },
      { origin: 'Jerez, Spain', notes: 'nut, prune, spice' },
    ] },
    { title: 'Price', route: { from: 'Kentucky (USA)', to: 'Kyiv (Ukraine)' },
      lead: 'The estimate assumes a starting distillate strength of 63% ABV and a nominal 15% loss during ageing. The number of bottles and the cost are approximate and may differ depending on the length of ageing and other factors. Packaging, bottling, taxes and other costs are not included.',
      items: [
        { title: '50 L cask', price: `€${NB}2,000`, facts: [{ dt: 'Bottles of 0.7 L', dd: `≈ 96${NB}pcs` }, { dt: 'Cost per bottle', dd: '≈ €20.83' }, { dt: 'The barrel is yours', dd: 'Certificate' }], cta: { text: 'order' } },
        { title: '200 L cask', price: `€${NB}6,000`, facts: [{ dt: 'Bottles of 0.7 L', dd: `≈ 383${NB}pcs` }, { dt: 'Cost per bottle', dd: '≈ €15.66' }, { dt: 'The barrel is yours', dd: 'Certificate' }], cta: { text: 'order' } },
      ] },
  ],
};
