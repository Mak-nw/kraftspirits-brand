// Карта на contacts.html: MapLibre GL + OpenFreeMap (без ключа), стиль positron, перефарбований у палітру сайту.
// Підключається ЛИШЕ на сторінці контактів; maplibre-gl і його CSS — динамічним import(): окремі чанки, на інших сторінках не вантажаться.
// Кольори й розміри — тільки з токенів `--map-*` (tokens.css) через getComputedStyle(:root); координати — з data-атрибутів (src/data/contacts.js).
// Збій (немає WebGL, помилка стилю/мережі, таймаут) -> показуємо статичну заглушку `.contacts-map__fallback` з кнопкою «Відкрити в OpenStreetMap».
// Ліцензії/атрибуція: OpenFreeMap, OpenMapTiles, дані © OpenStreetMap contributors (ODbL) — видима в кутку, не ховати (README, «Мапа контактів»).

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const LOAD_TIMEOUT_MS = 15000;
const MIN_ZOOM = 5;
const MAX_ZOOM = 17;
// рядок збігається з attribution у TileJSON OpenFreeMap (https://tiles.openfreemap.org/planet): MapLibre зводить однакові до одного; тут — гарантія, що атрибуція є завжди
const ATTRIBUTION = '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';
const UI_TEXT = { // переклад службових рядків MapLibre (ключі з default_locale бібліотеки)
  'CooperativeGesturesHandler.WindowsHelpText': 'Щоб змінити масштаб, утримуйте Ctrl і прокручуйте',
  'CooperativeGesturesHandler.MacHelpText': 'Щоб змінити масштаб, утримуйте ⌘ і прокручуйте',
  'CooperativeGesturesHandler.MobileHelpText': 'Рухайте мапу двома пальцями',
  'Map.Title': 'Мапа',
  'Marker.Title': 'Дистилерія YasnoCraft × Bazylsprings',
};

const root = document.documentElement;
const rootStyle = getComputedStyle(root);
const token = (name) => rootStyle.getPropertyValue(name).trim();
const tokenNumber = (name) => parseFloat(token(name));

// токен-колір (hex / color-mix / var-суміш) -> rgb(): MapLibre не розуміє color-mix, тож розв'язуємо через canvas
const colorCtx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
function resolveColor(name) {
  const value = token(name);
  if (!colorCtx || !value) return null;
  colorCtx.clearRect(0, 0, 1, 1);
  colorCtx.fillStyle = 'rgb(1, 2, 3)'; // сентинел: якщо значення не розібрано, колір лишиться ним
  colorCtx.fillStyle = value;
  colorCtx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = colorCtx.getImageData(0, 0, 1, 1).data;
  if (r === 1 && g === 2 && b === 3 && a === 255) return null;
  return `rgb(${r}, ${g}, ${b})`;
}

function mapPalette() {
  const names = ['land', 'landuse', 'water', 'park', 'wood', 'building', 'road', 'road-major', 'casing', 'rail', 'boundary', 'text', 'halo'];
  return Object.fromEntries(names.map((n) => [n, resolveColor(`--map-${n}`)]));
}

// перефарбування шарів стилю positron (id шарів — з https://tiles.openfreemap.org/styles/positron)
function paintStyle(map) {
  const C = mapPalette();
  const haloWidth = tokenNumber('--map-halo-width');
  const set = (id, prop, val) => {
    if (val == null || Number.isNaN(val)) return;
    try { map.setPaintProperty(id, prop, val); } catch { /* шару/властивості немає в цій версії стилю */ }
  };
  for (const l of map.getStyle().layers) {
    const id = l.id;
    if (l.type === 'background') set(id, 'background-color', C.land);
    else if (l.type === 'symbol') {
      set(id, 'text-color', C.text); set(id, 'text-halo-color', C.halo); set(id, 'text-halo-width', haloWidth);
      if (id.includes('shield')) map.setLayoutProperty(id, 'visibility', 'none'); // дорожні щити (US/міжнародні) — зайві й сірі
      else map.setLayoutProperty(id, 'text-field', ['coalesce', ['get', 'name:uk'], ['get', 'name']]); // лише українська назва (стиль за замовчуванням: латиниця + місцева в два рядки)
    } else if (id === 'water') set(id, 'fill-color', C.water);
    else if (id === 'waterway') set(id, 'line-color', C.water);
    else if (id === 'park') { set(id, 'fill-color', C.park); set(id, 'fill-opacity', tokenNumber('--map-park-opacity')); }
    else if (id.startsWith('landcover')) { set(id, 'fill-color', C.wood); set(id, 'fill-opacity', tokenNumber('--map-wood-opacity')); }
    else if (id.startsWith('landuse')) set(id, 'fill-color', C.landuse);
    else if (id === 'building') { set(id, 'fill-color', C.building); set(id, 'fill-opacity', 1); set(id, 'fill-outline-color', C.casing); }
    else if (id.startsWith('aeroway')) set(id, l.type === 'fill' ? 'fill-color' : 'line-color', C.landuse);
    else if (id.startsWith('railway')) set(id, 'line-color', C.rail);
    else if (id.startsWith('boundary')) set(id, 'line-color', C.boundary);
    else if (l.type === 'line' && id.includes('casing')) set(id, 'line-color', C.casing);
    else if (l.type === 'line' && (id.includes('major') || id.includes('motorway') || id.startsWith('tunnel'))) set(id, 'line-color', C['road-major']);
    else if (l.type === 'line' && (id.startsWith('highway') || id.startsWith('road'))) set(id, 'line-color', C.road);
    else if (l.type === 'fill' && id.startsWith('road')) set(id, 'fill-color', C.road);
  }
  // підпис населеного пункту — під точкою координат (маркер стоїть над нею й не закриває назву)
  for (const id of ['label_village', 'label_town', 'label_city', 'label_city_capital', 'label_other']) {
    if (!map.getLayer(id)) continue;
    map.setLayoutProperty(id, 'text-anchor', 'top');
    map.setLayoutProperty(id, 'text-offset', [0, 0.5]);
  }
}

// маркер: голівка-«крапля» з іконкою pin; кінчик крапельки = координата (anchor: bottom)
function createMarkerElement() {
  const el = document.createElement('div');
  el.className = 'contacts-map__pin';
  el.innerHTML = '<span class="contacts-map__pin-shape"></span><span class="icon icon--pin contacts-map__pin-icon" aria-hidden="true"></span>';
  return el;
}

// кнопки зуму в стилі кнопок сайту (власний контрол замість стандартного: іконки лише через токени/шрифт)
function createZoomControl() {
  let map; let box; let plus; let minus;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const button = (cls, label, glyph, onClick) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = `contacts-map__zoom t-chip ${cls}`; b.setAttribute('aria-label', label); b.textContent = glyph;
    b.addEventListener('click', onClick);
    return b;
  };
  const sync = () => { plus.disabled = map.getZoom() >= MAX_ZOOM - 0.01; minus.disabled = map.getZoom() <= MIN_ZOOM + 0.01; };
  return {
    onAdd(m) {
      map = m;
      box = document.createElement('div');
      box.className = 'maplibregl-ctrl contacts-map__zoom-group';
      plus = button('contacts-map__zoom--plus', 'Збільшити масштаб', '+', () => map.zoomIn(reduced() ? { duration: 0 } : undefined));
      minus = button('contacts-map__zoom--minus', 'Зменшити масштаб', '−', () => map.zoomOut(reduced() ? { duration: 0 } : undefined));
      box.append(plus, minus);
      map.on('zoom', sync); sync();
      return box;
    },
    onRemove() { map.off('zoom', sync); box.remove(); map = undefined; },
  };
}

async function initMap(host) {
  const canvas = host.querySelector('[data-contacts-map-canvas]');
  const fallback = host.querySelector('.contacts-map__fallback');
  const lat = parseFloat(host.dataset.lat);
  const lng = parseFloat(host.dataset.lng);
  const zoom = parseFloat(host.dataset.zoom);
  if (!canvas || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

  let map = null;
  let done = false;
  let timer = 0;
  const fail = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    try { map?.remove(); } catch { /* карта могла не ініціалізуватись */ }
    canvas.hidden = true;
    if (fallback) fallback.hidden = false;
    host.classList.add('is-fallback');
  };

  try {
    // воркер maplibre-gl 6 лежить окремим файлом поруч із бібліотекою; у збірці Vite його не бачить сам — віддаємо як asset (?url) і вказуємо явно
    const [maplibre, worker] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'), import('maplibre-gl/dist/maplibre-gl.css')]);
    const { Map: MapGL, Marker, AttributionControl, setWorkerUrl } = maplibre;
    setWorkerUrl(new URL(worker.default, location.href).href);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    map = new MapGL({
      container: canvas,
      style: STYLE_URL,
      center: [lng, lat],
      zoom: Number.isFinite(zoom) ? zoom : 14,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      attributionControl: false,
      cooperativeGestures: true, // колесо без Ctrl/⌘ прокручує сторінку, а не масштабує мапу
      locale: UI_TEXT,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      fadeDuration: reduced ? 0 : 150,
    });
    // карта — фон вікна: картка контактів зліва перекриває її частину → центр і маркер у вільній частині (padding.left = ширина картки до її правого краю)
    const card = host.closest('.contacts-window')?.querySelector('.contacts-info');
    const applyPadding = () => { if (!card) return; const left = Math.max(0, card.getBoundingClientRect().right - host.getBoundingClientRect().left); map.setPadding({ left, right: 0, top: 0, bottom: 0 }); };
    applyPadding();
    map.jumpTo({ center: [lng, lat] });
    map.on('resize', () => { applyPadding(); map.jumpTo({ center: [lng, lat] }); });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation?.();
    map.addControl(new AttributionControl({ compact: false, customAttribution: ATTRIBUTION }), 'bottom-right');
    canvas.querySelector('.maplibregl-ctrl-attrib')?.classList.add('t-caption'); // атрибуція — сторонній вузол MapLibre: роль ставить JS (як для підказки нижче)
    map.addControl(createZoomControl(), 'top-right');
    canvas.querySelectorAll('.maplibregl-desktop-message, .maplibregl-mobile-message').forEach((n) => n.classList.add('t-kicker')); // підказка «Ctrl + прокрутка» — сторонні вузли MapLibre (його .screen має власний font-size 1.4em, тож роль — на повідомленнях)
    new Marker({ element: createMarkerElement(), anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);

    map.on('style.load', () => paintStyle(map));
    map.once('load', () => { done = true; clearTimeout(timer); host.classList.add('is-ready'); });
    map.on('error', (e) => { if (!done && !e.tile) fail(); }); // помилка стилю/джерела до першого рендеру; одиничні тайли ігноруємо
    timer = setTimeout(fail, LOAD_TIMEOUT_MS);
  } catch {
    fail();
  }
}

document.querySelectorAll('[data-contacts-map]').forEach(initMap);
