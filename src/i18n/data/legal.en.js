// DRAFT: needs legal review. English overlay on src/data/legal.js (key = document slug; sections[] by index { title, body[] }). A reference translation only:
// legal force belongs to the Ukrainian text. [PLACEHOLDERS] mirror the Ukrainian [ПЛЕЙСХОЛДЕРИ] that the client/lawyer must fill in. Glossary: docs/i18n.md.
const NAME = '[FULL LEGAL NAME OF THE COMPANY / SOLE TRADER]';
const CODE = '[EDRPOU / RNOKPP CODE]';
const ADDR = '[REGISTERED ADDRESS]';
const DPO = '[NAME OR POSITION OF THE PERSON RESPONSIBLE FOR PERSONAL DATA PROTECTION]';
const PAY = '[PAYMENT SERVICE NAME]';
const HOST = '[HOSTING PROVIDER NAME]';
const LIC = '[SERIES AND NUMBER OF THE LICENCE FOR RETAIL SALE OF ALCOHOLIC DRINKS]';
const NOTE = 'This English text is a reference translation; the Ukrainian text prevails.';
export default {
  privacy: {
    title: 'Privacy and personal data processing policy',
    lead: 'How the YasnoCraft × Bazylsprings distillery collects, uses, stores and protects the personal data of website visitors and customers. Version of [DATE]. ' + NOTE,
    updated: '[DATE]. ' + NOTE,
    sections: [
      { title: 'General provisions', body: [
        `1.1. This Policy sets out how personal data is processed and protected by ${NAME} (the “Controller”, “we”) when it receives it from users of the YasnoCraft × Bazylsprings website (the “Website”), online shop customers, tour guests and participants in the Barrel Futures programme.`,
        '1.2. The Policy is drawn up in accordance with the Constitution of Ukraine, the Law of Ukraine “On Personal Data Protection”, the Law of Ukraine “On Electronic Commerce”, the Law of Ukraine “On Consumer Rights Protection” and other legislation of Ukraine.',
        `1.3. Personal data controller: ${NAME}, code ${CODE}, address: ${ADDR}, e-mail: %contacts.email%, phone: %contacts.phoneDisplay%. Person responsible for personal data protection: ${DPO}.`,
        '1.4. By using the Website, sending a message through the contact form or placing an order, you confirm that you have read this Policy. Consent to the processing of personal data is given by ticking the relevant box in the form or by placing an order (acceptance of the public offer).',
        '1.5. The Website is intended only for people aged 18 and over. We do not knowingly collect the personal data of minors.',
      ] },
      { title: 'What data we collect', body: [
        '2.1. Contact form: name, phone and/or e-mail, topic and text of the message. A phone number or e-mail is needed so that we can reply; you give the other data of your own accord.',
        '2.2. Online shop orders: first and last name, phone, e-mail, delivery address or Nova Poshta branch (parcel locker), contents of the order, amount and payment status, date of birth or details of age confirmation (see clause 2.5).',
        `2.3. Payment: we do not receive or store payment card details. The payment is processed by ${PAY} under its own rules and the PCI DSS standard; we receive only the payment status and its identifier.`,
        '2.4. Tours and the Barrel Futures programme: name, phone, e-mail, preferred date of the visit, number of guests; to conclude a barrel purchase contract, the buyer’s passport details, taxpayer registration number, address and bank details to the extent the contract requires.',
        '2.5. Age confirmation: the fact that you have confirmed you are an adult on the Website is stored only on your device (see the Cookies Policy). When you place an order and on delivery we may ask you to confirm your age through the Diia app or an identity document; we do not keep copies of documents, only the fact that the check took place.',
        `2.6. Technical data: IP address, browser and device type, date and time of the request, page address, recorded automatically in the server logs of the hosting provider ${HOST} to keep the Website running and secure. The Website uses no web analytics tools or marketing trackers; if any appear, this Policy and the Cookies Policy will be updated.`,
      ] },
      { title: 'Purposes and grounds for processing', body: [
        '3.1. Concluding and performing the sales contract: accepting and confirming the order, payment, delivery, contact about the order, handling returns and claims. Ground: concluding and performing a transaction to which the data subject is a party.',
        '3.2. Answering enquiries, booking tours, consultations, correspondence about the Barrel Futures programme. Ground: the data subject’s consent and the conclusion of a transaction.',
        '3.3. Meeting legal requirements: checking that buyers of alcoholic drinks are adults, keeping accounting and tax records, fiscal receipts, answering lawful requests from public authorities. Ground: performance of the Controller’s obligation under the law.',
        '3.4. Website security and performance: server logs, protection against abuse. Ground: the Controller’s legitimate interests, which do not infringe your rights.',
        '3.5. We send marketing mailings (news, offers) only with your separate consent, which you can withdraw at any time; there is currently no such mailing on the Website.',
        '3.6. We process only the data needed for the stated purposes and do not use it for other purposes without your consent or a direct requirement of the law.',
      ] },
      { title: 'Transfer to third parties', body: [
        '4.1. We do not sell personal data or pass it to third parties for their own purposes.',
        '4.2. To fulfil an order, data is received only by those without whom it cannot be done: the Nova Poshta delivery service (name, phone, the recipient’s address or branch, description of the shipment), the courier service in Kyiv, the pickup point, to the extent needed for handover and age checks.',
        `4.3. The payment is processed by ${PAY}; the Website logs are kept by ${HOST}; messages from the contact form are sent to our mailbox %contacts.email% [AND/OR THROUGH A FORM-HANDLING SERVICE, NAME, IF CONNECTED].`,
        '4.4. On the Contacts page an interactive map is loaded by a third-party map tile service, OpenFreeMap: when the map loads, your browser sends it your IP address and technical request headers. We pass no other data to this service.',
        '4.5. Data is provided to public authorities only in the cases and in the manner expressly established by law (on a properly drawn-up request, a court decision and so on).',
        '4.6. Personal data is not transferred outside Ukraine, except where the server of a service we have chosen (hosting, e-mail, payment) is located abroad; in that case we choose providers with an adequate level of data protection. [LAWYER: LIST OF SERVICES AND COUNTRIES, IF THERE IS A CROSS-BORDER TRANSFER.]',
      ] },
      { title: 'Retention periods', body: [
        '5.1. Contact form data and correspondence: for 12 months after the matter is resolved, if no contractual relationship arose from it.',
        '5.2. Order data and settlement documents: for the periods set by accounting and tax legislation (at least 1,095 days from the date of filing the relevant reports), and for claims until the limitation periods expire.',
        '5.3. Data processed on the basis of consent: until the consent is withdrawn or the purpose of processing is achieved, whichever comes first.',
        '5.4. The fact of age confirmation is stored on your device for up to 30 days (if you chose “Remember my choice”) or until the browser tab is closed.',
        '5.5. When the retention period ends, data is deleted or anonymised.',
      ] },
      { title: 'Your rights', body: [
        '6.1. Under Article 8 of the Law of Ukraine “On Personal Data Protection” you have the right to: know the sources from which your personal data was collected, where it is held, the purpose of processing and the persons to whom it is passed; access your data and information on the terms of its processing; demand the amendment or destruction of data that is processed unlawfully or is inaccurate; object to processing; withdraw consent to processing; complain to the Ukrainian Parliament Commissioner for Human Rights or to a court; use legal remedies if data protection legislation is violated.',
        '6.2. To exercise your rights, write to %contacts.email% or use the contact form. We will reply within 30 calendar days of receiving your request; to protect your data we may ask you to confirm your identity.',
        '6.3. Withdrawing consent does not affect the lawfulness of processing carried out before the withdrawal, and does not stop processing that is needed to perform a concluded contract or to meet legal requirements (for example, keeping settlement documents).',
      ] },
      { title: 'Data protection', body: [
        '7.1. We take organisational and technical measures to protect personal data against accidental loss, destruction, unlawful processing and unauthorised access: only employees who need it for their work and are bound to confidentiality have access to data; the connection to the Website is protected by HTTPS; order data is kept in systems with restricted access.',
        '7.2. Payment data is processed only on the side of a payment service certified to the PCI DSS standard.',
        '7.3. In the event of a data breach that may put your rights at risk, we will notify you and, where necessary, the competent authorities in the manner provided by law.',
      ] },
      { title: 'Cookies and local storage', body: [
        '8.1. The Website does not use advertising or analytics cookies. To make the Website work we store only technical data on your device: the fact of age confirmation and the contents of your cart. None of this data is sent to our server or allows you to be identified.',
        '8.2. The list of records, how long they are kept and how to manage them are described in the Cookies Policy (the “Cookies” page in the footer of the Website).',
      ] },
      { title: 'Changes to the Policy', body: [
        '9.1. We may update this Policy, in particular if legislation, services or the ways we process data change. The new version takes effect from the date given in the introduction and is published on this page.',
        '9.2. If changes significantly affect the processing of your data, we will also notify you by e-mail, if we have your address.',
      ] },
      { title: 'Contacts', body: [
        `10.1. For questions about the processing of personal data, contact: ${NAME}, ${ADDR}; e-mail: %contacts.email%; phone: %contacts.phoneDisplay% (working days, 10:00 to 18:00); person responsible: ${DPO}.`,
        '10.2. Production: %contacts.address%. There is no walk-in access to the distillery; visits are by appointment.',
      ] },
    ],
  },
  offer: {
    title: 'Public offer',
    lead: 'A contract for the distance retail sale of alcoholic drinks through the YasnoCraft × Bazylsprings online shop, and the website rules. Version of [DATE]. ' + NOTE,
    updated: '[DATE]. ' + NOTE,
    sections: [
      { title: 'Terms', body: [
        `1.1. Seller: ${NAME}, code ${CODE}, address: ${ADDR}, licence for the retail sale of alcoholic drinks ${LIC}.`,
        '1.2. Buyer: an adult individual with full legal capacity, aged 18 or over, who has accepted this Offer by placing an order on the Website.',
        '1.3. Website: the YasnoCraft × Bazylsprings online shop website on which this Offer is published; Goods: alcoholic drinks and gift sets shown in the Website catalogue; Order: a request to buy Goods placed by the Buyer through the Website; Acceptance: full and unconditional acceptance of the terms of the Offer by placing an Order.',
        '1.4. Information about the Barrel Futures programme and tours is placed on the Website for reference; the corresponding contracts are concluded separately and this Offer does not apply to them, except for the “Website rules” section.',
      ] },
      { title: 'Subject matter and acceptance', body: [
        '2.1. This Offer is the Seller’s proposal to conclude a distance retail sales contract for the Goods in accordance with Articles 633, 641 and 698 of the Civil Code of Ukraine, the Law of Ukraine “On Electronic Commerce” and the Law of Ukraine “On Consumer Rights Protection”.',
        '2.2. The contract is considered concluded from the moment of Acceptance: clicking the button to place the Order on the Website after reading the Offer, the Privacy Policy and the terms of delivery, payment and returns. An electronic contract concluded in this way has the legal force of a written contract.',
        '2.3. The Seller may amend the Offer; the new version applies from the date of publication on the Website and to Orders placed after that date.',
      ] },
      { title: 'Age 18+', body: [
        '3.1. Selling alcoholic drinks to persons under 18 is prohibited (Article 15-3 of the Law of Ukraine “On State Regulation of the Production and Circulation of Ethyl Alcohol, Alcoholic Distillates, Alcoholic Drinks, Tobacco Products, Liquids Used in Electronic Cigarettes, and Fuel”).',
        '3.2. By placing an Order, the Buyer confirms that they are 18 or over and that the Goods are not intended to be passed to minors. Age is confirmed through the Diia app before payment and on receipt of the Order; a courier, a member of the delivery service or a pickup point has the right to ask for an identity document.',
        '3.3. If age is not confirmed, the Seller (the carrier) refuses to hand over the Goods and the Order is cancelled. The refund procedure in this case is described in the terms of delivery, payment and returns.',
      ] },
      { title: 'Placing an order', body: [
        '4.1. The Buyer chooses the Goods in the catalogue, selects the size on the product card, adds the item to the cart and in the cart gives their name, phone, e-mail and the delivery method and address. There is no minimum Order value.',
        `4.2. After the Order is placed, the Seller confirms it by phone or e-mail [CONFIRMATION METHOD] within one working day. The Seller may refuse an Order if the Goods are out of stock, the Buyer has not confirmed their age or has given incomplete or inaccurate data.`,
        '4.3. Prices on the Website are in hryvnia and include VAT and excise duty. The price of the Goods is fixed when the Order is confirmed. The delivery cost is not included in the price of the Goods and is calculated in the cart.',
        '4.4. Photographs of the Goods on the Website are illustrative; the colour of the drink and the packaging may differ slightly. Volume, strength and composition are given on the product card and on the label.',
      ] },
      { title: 'Payment', body: [
        `5.1. Payment methods are available when the Order is placed: [LIST OF METHODS: online payment by bank card through ${PAY} / payment by bank details / other]. The Goods are dispatched after payment is received.`,
        '5.2. A settlement document (fiscal receipt) is given to the Buyer in electronic form at the e-mail provided, or with the Goods, in accordance with the legislation on the use of cash registers.',
        '5.3. The Seller does not receive or store payment card details; the payment is processed by the payment service.',
      ] },
      { title: 'Delivery', body: [
        '6.1. Delivery is by Nova Poshta (to a branch or parcel locker) across Ukraine, by courier in Kyiv, or by pickup. Timing, cost and the collection procedure are described on the “Delivery, payment and returns” page, which forms an integral part of this Offer.',
        '6.2. Ownership of the Goods and the risk of their accidental damage pass to the Buyer when the Goods are handed to the Buyer or a person authorised by them after the age check.',
        '6.3. The Buyer must inspect the Goods on receipt. Damage found at handover is recorded in a report with the member of the delivery service or the courier.',
      ] },
      { title: 'Quality and returns', body: [
        '7.1. The Seller guarantees that the Goods comply with the requirements of the legislation of Ukraine, carry excise tax stamps and are labelled in the state language.',
        '7.2. Alcoholic drinks are foodstuffs and cannot be exchanged or returned if they are of proper quality (List of goods of proper quality that are not subject to exchange (return), approved by Resolution of the Cabinet of Ministers of Ukraine No. 172 of 19 March 1994).',
        '7.3. If defects in the Goods are found (a damaged or leaking bottle, a mismatch with the order), the Buyer has the rights provided by Article 8 of the Law of Ukraine “On Consumer Rights Protection”: replacement of the Goods, a refund or another solution by agreement. How to make a claim is described on the “Delivery, payment and returns” page.',
      ] },
      { title: 'Website rules', body: [
        '8.1. The Website is intended only for people aged 18 and over. The visitor confirms their age on entering the Website; information about alcoholic drinks is given for reference and is not an encouragement to drink. Excessive drinking is harmful to your health.',
        '8.2. All Website materials, including texts, photographs, the YasnoCraft and Bazylsprings logos and the design, are objects of the Seller’s intellectual property rights or are used by the Seller on lawful grounds. Copying, reproducing and using the materials for commercial purposes without the Seller’s written consent is prohibited.',
        '8.3. The user undertakes to give accurate data, not to take actions that disrupt the Website or infringe the rights of others, and not to use the Website to buy Goods in order to pass them to minors.',
        '8.4. The Website may contain links to third-party resources (the delivery service, the payment service, maps). The Seller is not responsible for their content or policies.',
        '8.5. Users’ personal data is processed in accordance with the Privacy and Personal Data Processing Policy; the data stored in the browser is described in the Cookies Policy.',
      ] },
      { title: 'Liability', body: [
        '9.1. The Parties are liable for non-performance or improper performance of the terms of the contract in accordance with the legislation of Ukraine.',
        '9.2. The Seller is not liable for a delay in delivery caused by the carrier, for the impossibility of handover because of inaccurate data or the Buyer’s absence, or for harm caused by using the Goods contrary to the rules for their consumption.',
        '9.3. The Parties are released from liability for non-performance of obligations resulting from force majeure (hostilities, natural disasters, decisions of public authorities and so on), confirmed in the manner established by law, for the duration of such circumstances.',
      ] },
      { title: 'Other terms', body: [
        '10.1. The legislation of Ukraine applies to the relations of the Parties. Disputes are resolved by negotiation; if no agreement is reached, in court under the established jurisdiction.',
        '10.2. Claims about Orders are accepted at the e-mail %contacts.email% or through the contact form with the topic “Orders and delivery” and are considered within [CLAIM REVIEW PERIOD] days.',
        '10.3. If any provision of the Offer is found invalid, this does not affect the validity of the remaining provisions.',
        `10.4. Seller’s details: ${NAME}; code ${CODE}; address: ${ADDR}; licence ${LIC}; bank details: [IBAN, BANK NAME]; e-mail: %contacts.email%; phone: %contacts.phoneDisplay%.`,
      ] },
    ],
  },
  cookies: {
    updated: '[DATE]. ' + NOTE,
    title: 'Cookies policy',
    lead: 'What data the YasnoCraft × Bazylsprings website stores in your browser, why, and how to manage it. Version of [DATE]. ' + NOTE,
    sections: [
      { title: 'What cookies and local storage are', body: [
        '1.1. Cookies are small text files that a website stores in the browser and reads on later visits. Browser local storage (localStorage and sessionStorage) works in a similar way: the data is kept on your device and is available only to this website.',
        '1.2. This Policy is part of the Privacy and Personal Data Processing Policy and explains which records the Website creates, what for and how long they are kept.',
        `1.3. Website controller: ${NAME}, e-mail: %contacts.email%.`,
      ] },
      { title: 'What we store', body: [
        '2.1. Age confirmation (the ks_age_ok record). The Website is about alcoholic drinks, so on entry we ask you to confirm that you are 18 or over. If you turned on “Remember my choice on this device”, the answer is stored in localStorage for 30 days; if not, only in sessionStorage until the tab is closed. The record contains only the fact of confirmation and the time; it is strictly necessary and is not sent to the server.',
        '2.2. Cart (the ks_cart record). The list of chosen drinks, their size and quantity are stored in localStorage so that the cart does not disappear between pages and visits. The record stays until you empty the cart or clear the browser storage. Cart data reaches us only when you place an order.',
        '2.3. Technical cookies of the payment service and the delivery service may be created on their pages during payment or parcel tracking; they are governed by the policies of those services.',
        '2.4. The Website does not use analytics, advertising or social cookies. If we add web analytics, this Policy will be updated and data collection will start only after your consent, where the law requires it.',
      ] },
      { title: 'Third-party services', body: [
        '3.1. On the Contacts page the interactive map loads map tiles from a third-party service, OpenFreeMap (tiles.openfreemap.org). When the map loads, your browser sends this service your IP address and standard request headers. The map loads only on the Contacts page; this service sets no cookies on our Website.',
        '3.2. The fonts, images and scripts of the Website are hosted on our server and are not loaded from third-party content delivery networks.',
      ] },
      { title: 'How to manage them', body: [
        '4.1. You can delete the Website’s records at any time or block their creation in your browser settings (the “Privacy” or “Site data” section). Instructions are in the help of Chrome, Safari, Firefox and Edge.',
        '4.2. Consequences: after the records are deleted, the Website will ask you to confirm your age again and the cart will be empty. If the browser blocks local storage completely (for example, in private mode), age confirmation will be requested on every page and the cart will not be kept between pages.',
        '4.3. You can switch off “Remember my choice” simply by not turning the toggle on during age confirmation; the answer is then stored only until the tab is closed.',
      ] },
      { title: 'Changes to the Policy', body: [
        '5.1. We update this Policy when the list of records or third-party services changes. The date of the current version is given in the introduction.',
        '5.2. Send questions about cookies to %contacts.email% or through the contact form.',
      ] },
    ],
  },
  delivery: {
    updated: '[DATE]. ' + NOTE,
    title: 'Delivery, payment and returns',
    lead: 'How we ship orders, when and how you can pay, what to do with a damaged bottle and when a return is possible. An integral part of the public offer. Version of [DATE]. ' + NOTE,
    sections: [
      { title: 'Delivery methods', body: [
        '1.1. Nova Poshta: to a branch or parcel locker anywhere in Ukraine, except temporarily occupied territories and territories where the carrier does not operate.',
        '1.2. Courier in Kyiv: [DAYS AND HOURS OF COURIER DELIVERY].',
        '1.3. Pickup: [ADDRESS AND OPENING HOURS OF THE PICKUP POINT].',
        '1.4. We do not ship abroad: sending alcoholic drinks in international shipments is restricted by carriers’ rules and customs legislation.',
      ] },
      { title: 'Timing and cost', body: [
        '2.1. We ship orders within 1–2 working days of receiving payment. Delivery by Nova Poshta usually takes 1–3 days depending on the city; we send the waybill number to your phone or e-mail.',
        '2.2. Delivery by Nova Poshta is charged at the carrier’s rates; for orders of ₴3,000 or more delivery is free. The cost of courier delivery in Kyiv is [COST]. You see the exact amount in the cart before you pay.',
        '2.3. We pack bottles in protective packaging. In severe frost or heat we may hold a shipment for a day or two so the drink does not suffer, and we will tell you.',
      ] },
      { title: 'Receiving and age', body: [
        '3.1. Only an adult (18 or over) can receive an order. Age is confirmed through the Diia app before payment and on receipt; a courier or carrier employee has the right to ask for an identity document.',
        '3.2. If the recipient has not confirmed their age, the parcel is not handed over and returns to us. In that case we refund the price of the goods less the actual cost of delivery and return within [REFUND PERIOD] days of the parcel coming back.',
        '3.3. A parcel that is not collected from the branch or parcel locker within the carrier’s storage period is returned to us; the terms of clause 3.2 apply in the same way.',
      ] },
      { title: 'Payment', body: [
        `4.1. Payment methods are available when you place the order: [LIST OF METHODS: online payment by bank card through ${PAY} / payment by bank details / other]. We ship after payment is received. Cash on delivery is [AVAILABLE / NOT AVAILABLE].`,
        '4.2. Prices are in hryvnia and include taxes. We do not see or store card details: the payment is processed by the payment service.',
        '4.3. We send the fiscal receipt to your e-mail or put it in the parcel.',
      ] },
      { title: 'Inspection on receipt', body: [
        '5.1. Please inspect the parcel when you collect it. If a bottle is broken, leaking or does not match your order, record it with the delivery service employee (a damage report) and photograph the packaging and the bottle.',
        '5.2. Write to us within 3 days of receipt through the contact form with the topic “Orders and delivery” or at %contacts.email%, attaching photos and the order number. We will replace the bottle or refund you, as you prefer.',
      ] },
      { title: 'Returns and exchanges', body: [
        '6.1. Alcoholic drinks are foodstuffs and cannot be exchanged or returned if they are of proper quality, as provided by the List of goods of proper quality that are not subject to exchange (return), approved by Resolution of the Cabinet of Ministers of Ukraine No. 172 of 19 March 1994. So, unfortunately, a sealed bottle that you simply did not like cannot be returned.',
        '6.2. We accept goods of improper quality (a damaged or leaking bottle, a factory defect, a mismatch with the order) for review in accordance with Article 8 of the Law of Ukraine “On Consumer Rights Protection”: at your choice, replacement with the same or another product with the price recalculated, or a refund. We refund in the same way the payment was made, no later than 7 days from the day the claim is satisfied.',
        '6.3. Before the order is shipped you can cancel it without giving a reason: write or call us and we will refund the full amount within [REFUND PERIOD] days.',
        '6.4. Gift sets and non-alcoholic accessories (if they are in the catalogue) can be returned or exchanged within 14 days, provided that their presentation, seals and the settlement document are intact (Article 9 of the Law of Ukraine “On Consumer Rights Protection”).',
      ] },
      { title: 'Contacts', body: [
        '7.1. Questions about orders: the contact form with the topic “Orders and delivery”, e-mail %contacts.email%, phone %contacts.phoneDisplay% on working days from 10:00 to 18:00. We reply within one working day.',
        `7.2. Seller: ${NAME}, ${ADDR}.`,
      ] },
    ],
  },
  'age-policy': {
    updated: '[DATE]. ' + NOTE,
    title: 'Age 18+ and responsible drinking policy',
    lead: 'Why the website and shop are open only to adults, how we check age and what we consider a responsible attitude to strong drinks. Version of [DATE]. ' + NOTE,
    sections: [
      { title: 'Only from 18', body: [
        '1.1. The legislation of Ukraine prohibits selling alcoholic drinks to persons under 18 and allows the seller to require a document confirming age (Article 15-3 of the Law of Ukraine “On State Regulation of the Production and Circulation of Ethyl Alcohol, Alcoholic Distillates, Alcoholic Drinks, Tobacco Products, Liquids Used in Electronic Cigarettes, and Fuel”).',
        '1.2. So the website, the online shop, tours with tastings and the Barrel Futures programme of YasnoCraft × Bazylsprings are open only to adults. We do not sell drinks to minors and do not hand them to people who buy for minors.',
      ] },
      { title: 'How we check age', body: [
        '2.1. On entry to the website we ask you to confirm that you are 18 or over. The answer is stored only on your device (see the Cookies Policy); it does not replace a document check.',
        '2.2. Before an order is paid, age is confirmed through the Diia app, and on handover a courier, a member of the delivery service or a pickup point may ask for an identity document. Without age confirmation the parcel is not handed over.',
        '2.3. On tours and tastings we may ask for a document at the entrance. A tour with a tasting is for guests aged 18 and over only.',
        '2.4. We have the right to refuse a sale or handover if there are reasonable doubts about the recipient’s age or condition, or if in our view the order is meant for minors.',
      ] },
      { title: 'Responsible drinking', body: [
        '3.1. Excessive drinking is harmful to your health. Our drinks are made for getting to know a flavour slowly and attentively, not for quantity.',
        '3.2. We advise against drinking alcohol during pregnancy and breastfeeding, before driving or operating machinery, together with medicines, and in health conditions where alcohol is contraindicated. If in doubt, consult a doctor. The information on the website is not medical advice.',
        '3.3. Drink water, take your time and plan how you will get home. If you or someone close to you feels that drinking is getting out of control, ask for help from a family doctor or a specialist support service: [NAME AND PHONE OF A SUPPORT SERVICE, IF THE CLIENT WISHES TO INCLUDE ONE].',
      ] },
      { title: 'Advertising and communications', body: [
        '4.1. We follow Article 22 of the Law of Ukraine “On Advertising”: we do not address messages to minors, do not show them in our materials, do not link drinking to sporting, physical or intellectual achievements and do not claim that alcohol is good for your health.',
        '4.2. All materials on the website and our social networks carry a warning about the harm of excessive drinking. Mailings, if you subscribe to them, are sent only to adults and can be cancelled at any time.',
      ] },
      { title: 'Reporting a violation', body: [
        '5.1. If you believe our product has reached a minor or one of our partners has broken the 18+ rule, write to %contacts.email% or through the contact form. We will look into every report.',
      ] },
    ],
  },
  'barrels-terms': {
    updated: '[DATE]. ' + NOTE,
    title: 'Barrel Futures programme terms',
    lead: 'The main terms of buying a barrel of Bazylsprings whisky for ageing: what the price includes, how payment, storage and bottling work. The contract is concluded separately. Version of [DATE]. ' + NOTE,
    sections: [
      { title: 'What it is', body: [
        '1.1. The Barrel Futures programme is the purchase of a barrel of Bazylsprings distillate that is aged in our barrel hall in Yasnohorodka. The barrel passes into the buyer’s ownership, and a certificate is issued for it. We use ex-bourbon Wild Turkey barrels from Kentucky, made of American oak.',
        '1.2. Information about barrels on the website (prices, number of bottles, periods) is for reference and is not a public offer. The purchase of a barrel is formalised by a separate written contract between the buyer and the seller; if the website and the contract differ, the contract prevails.',
        `1.3. Seller: ${NAME}, code ${CODE}, address: ${ADDR}.`,
        '1.4. A participant in the programme can be an adult individual or a legal entity. All visits, sample tastings and receipt of the finished whisky are only for persons aged 18 and over.',
      ] },
      { title: 'Price and payment', body: [
        '2.1. A 50 L cask costs €2,000 and a 200 L cask costs €6,000. The price includes the barrel in your ownership, the distillate, storage and ageing in our barrel hall, and a certificate for the barrel. Packaging, bottling, excise tax and other taxes and fees at bottling, and delivery of the finished bottles are not included in the price of the barrel and are calculated separately.',
        '2.2. The price in the contract is given in euros; payment is made in hryvnia at the official rate of the National Bank of Ukraine on the day of payment, unless the contract provides otherwise. The payment procedure (full prepayment or a payment schedule) is set by the contract. [LAWYER / ACCOUNTANT: CONTRACT CURRENCY AND SETTLEMENT PROCEDURE.]',
        '2.3. Current prices are given on the Barrel Futures page; the price is fixed at the time the contract is signed.',
      ] },
      { title: 'Storage and ageing', body: [
        '3.1. We fill the barrel with distillate at 63% ABV. The minimum ageing period is 3 years; after that the buyer chooses the period. Before bottling we send you a sample from the barrel or let you taste it here, and the buyer decides whether to bottle the whisky now or leave it to mature.',
        '3.2. The barrel is kept in the barrel hall of the distillery in Yasnohorodka under conditions accepted for whisky ageing. The risk of natural losses during ageing (the “angels’ share”, about 15% by estimate) is borne by the buyer; the seller’s liability for the safety of the barrel and distillate against other risks is set by the contract and [INSURANCE: YES / NO].',
        '3.3. You can visit your barrel by appointment through the contact form with the topic “Barrel trade”; twice a year such a visit, with a sample from the barrel, is included in the price.',
        '3.4. Further ageing in marsala, madeira, port or sherry casks is possible; its terms and cost are discussed separately.',
      ] },
      { title: 'Bottling and collection', body: [
        '4.1. After ageing we bottle the whisky at the distillery in 0.7 L bottles at 40% ABV. As an estimate, a 50 L cask yields 96 bottles and a 200 L cask 383 bottles; the number depends on the length of ageing and is approximate.',
        '4.2. The cost of bottles, bottling, labels, excise tax stamps and other mandatory payments is calculated at the time of bottling and paid by the buyer separately.',
        '4.3. The finished bottles can be collected at the distillery or delivered across Ukraine under the rules described on the “Delivery, payment and returns” page; the recipient’s age is checked on handover. Whisky from your own barrel is for personal consumption; selling bottles to third parties without the relevant licences is prohibited by law.',
      ] },
      { title: 'Transfer of rights and withdrawal', body: [
        '5.1. The buyer may transfer rights to the barrel to another adult with the seller’s written agreement and reissue of the certificate. [LAWYER: ASSIGNMENT PROCEDURE.]',
        '5.2. The terms of early termination of the contract, refunds and what happens to the distillate in that case are set by the contract. [LAWYER: TERMINATION TERMS.]',
        '5.3. The personal data of barrel buyers is processed in accordance with the Privacy and Personal Data Processing Policy.',
      ] },
      { title: 'Contacts', body: [
        '6.1. Questions about barrels: the contact form with the topic “Barrel trade”, e-mail %contacts.email%, phone %contacts.phoneDisplay%. We reply within one working day.',
      ] },
    ],
  },
};
