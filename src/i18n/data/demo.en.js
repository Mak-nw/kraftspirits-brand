// English overlay on the demo data of the checkout and account pages (src/data/checkout-demo.js, account-demo.js): a simulation, real data will come from WooCommerce + Nova Poshta.
// Region, city and branch labels double as stored values, so they are translated together. Arrays by index.
const DELIVERY = 'Kyiv Region, Brovary, Branch No. 1';
const NAME = 'Olena Kovalenko';
const CUSTOMER = { name: NAME, delivery: DELIVERY };
export default {
  checkout: {
    areas: [{ label: 'Kyiv' }, { label: 'Kyiv Region' }, { label: 'Lviv Region' }, { label: 'Odesa Region' }, { label: 'Kharkiv Region' }, { label: 'Dnipropetrovsk Region' }],
    cities: { kyiv: ['Kyiv'], kyivska: ['Bila Tserkva', 'Boryspil', 'Brovary', 'Irpin'], lvivska: ['Drohobych', 'Lviv', 'Stryi'], odeska: ['Odesa', 'Chornomorsk'], kharkivska: ['Kharkiv', 'Chuhuiv'], dniprovska: ['Dnipro', 'Kryvyi Rih'] },
    warehouses: [{ label: 'Branch No. 1' }, { label: 'Branch No. 2' }, { label: 'Branch No. 5 (up to 30 kg)' }, { label: 'Parcel locker No. 10' }, { label: 'Parcel locker No. 27' }],
    shipping: { np: 'Nova Poshta: branch or parcel locker', courier: 'Courier in Kyiv', pickup: 'Pickup from the distillery' },
    payment: { card: 'Pay by card online', bacs: 'Pay by bank transfer' },
  },
  account: {
    user: { first: 'Olena', last: 'Kovalenko', address: { city: 'Brovary' } },
    steps: ['Received', 'Paid', 'Being packed', 'Handed to Nova Poshta', 'On the way', 'Delivered'],
    status: { pending: { label: 'Awaiting payment' }, processing: { label: 'Processing' }, shipped: { label: 'Shipped' }, completed: { label: 'Completed' }, cancelled: { label: 'Cancelled' } },
    orders: [
      { notes: [{ text: 'Order received. Awaiting payment: the payment link has been sent to your e-mail.' }], customer: CUSTOMER },
      { notes: [{ text: 'The order has been passed to the warehouse. Age 18+ is confirmed through Diia on receipt.' }, { text: 'Payment received.' }], customer: CUSTOMER },
      { notes: [{ text: 'The order has been handed to Nova Poshta. Waybill number: 20450912345678.' }, { text: 'Payment received.' }], customer: CUSTOMER },
      { notes: [{ text: 'Order received. Thank you for choosing YasnoCraft!' }], customer: { name: NAME, delivery: 'Kyiv, Branch No. 5 (up to 30 kg)' } },
      { notes: [{ text: 'Order received.' }], customer: CUSTOMER },
      { notes: [{ text: 'Order cancelled: payment was not received within 48 hours.' }], customer: CUSTOMER },
    ],
  },
};
