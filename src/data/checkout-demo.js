// Демо-довідники для checkout.html (статична симуляція): області, міста, відділення/поштомати «Нової пошти».
// Справжні дані (живий пошук міст і відділень) віддає плагін доставки WooCommerce; тут — короткий довідник, щоб показати поведінку залежних полів. Адрес відділень не вигадуємо: лише номери.
export const NP_AREAS = [
  { value: 'kyiv', label: 'м. Київ' },
  { value: 'kyivska', label: 'Київська область' },
  { value: 'lvivska', label: 'Львівська область' },
  { value: 'odeska', label: 'Одеська область' },
  { value: 'kharkivska', label: 'Харківська область' },
  { value: 'dniprovska', label: 'Дніпропетровська область' },
];
export const NP_CITIES = {
  kyiv: ['Київ'],
  kyivska: ['Біла Церква', 'Бориспіль', 'Бровари', 'Ірпінь'],
  lvivska: ['Дрогобич', 'Львів', 'Стрий'],
  odeska: ['Одеса', 'Чорноморськ'],
  kharkivska: ['Харків', 'Чугуїв'],
  dniprovska: ['Дніпро', 'Кривий Ріг'],
};
export const npWarehouses = () => [
  { value: 'w1', label: 'Відділення №1' },
  { value: 'w2', label: 'Відділення №2' },
  { value: 'w5', label: 'Відділення №5 (до 30 кг)' },
  { value: 'p10', label: 'Поштомат №10' },
  { value: 'p27', label: 'Поштомат №27' },
];
export const SHIPPING_LABELS = { np: 'Нова пошта: відділення або поштомат', courier: 'Кур\'єр по Києву', pickup: 'Самовивіз з дистилерії' };
export const PAYMENT_LABELS = { card: 'Оплата карткою онлайн', bacs: 'Оплата за реквізитами' };
