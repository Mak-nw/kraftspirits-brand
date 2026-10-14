// DEV-ПРЕВ'Ю: 4 варіанти стилізації карти. Координати — з src/data/contacts.js; кольори — з computed-токенів :root.
import { contacts, contactsView } from '../src/data/contacts.js';

const { lat, lng, zoom } = contacts;
const view = contactsView(contacts);
const css = getComputedStyle(document.documentElement);
const tok = (name) => css.getPropertyValue(name).trim();
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { // t — частка a
  const A = hex2rgb(tok(a)), B = hex2rgb(tok(b));
  return `rgb(${A.map((v, i) => Math.round(v * t + B[i] * (1 - t))).join(',')})`;
};

// 1: OSM iframe
document.getElementById('osm-frame').src = view.osmEmbed;

// 2: Leaflet + CARTO Voyager
{
  const map = L.map('map2', { center: [lat, lng], zoom, zoomControl: true, attributionControl: true });
  for (const [layer, opts] of [['World_Light_Gray_Base', { maxNativeZoom: 16 }], ['World_Light_Gray_Reference', { maxNativeZoom: 16 }]]) {
    L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${layer}/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19, ...opts,
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ; Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
  }
  const icon = L.divIcon({ className: 'mv-pin-img', html: '<img src="/assets/icons/pin.svg" alt="">', iconSize: [44, 44], iconAnchor: [22, 42] });
  L.marker([lat, lng], { icon, keyboard: false }).addTo(map);
  for (const c of ['mv-tint', 'mv-tint-gold']) { const d = document.createElement('div'); d.className = c; map.getContainer().appendChild(d); }
}

// 3: MapLibre + OpenFreeMap, перефарбування шарів палітрою
{
  const C = {
    land: tok('--color-beige'),
    landuse: mix('--color-beige', '--color-gold', 0.8),
    water: mix('--color-teal', '--color-beige', 0.28),
    park: mix('--color-green', '--color-beige', 0.26),
    wood: mix('--color-green', '--color-beige', 0.32),
    building: mix('--color-gold', '--color-beige', 0.35),
    road: tok('--color-light'),
    roadMajor: mix('--color-gold', '--color-light', 0.45),
    casing: mix('--color-gold', '--color-beige', 0.55),
    rail: mix('--color-green', '--color-beige', 0.25),
    boundary: mix('--color-gold', '--color-beige', 0.7),
    text: tok('--color-green'),
    halo: tok('--color-light'),
  };
  const map = new maplibregl.Map({ container: 'map3', style: 'https://tiles.openfreemap.org/styles/positron', center: [lng, lat], zoom, attributionControl: { compact: true } });
  map.on('style.load', () => {
    const set = (id, prop, val) => { try { map.setPaintProperty(id, prop, val); } catch (e) { /* шару немає в стилі */ } };
    for (const l of map.getStyle().layers) {
      const id = l.id;
      if (l.type === 'background') set(id, 'background-color', C.land);
      else if (l.type === 'symbol') { set(id, 'text-color', C.text); set(id, 'text-halo-color', C.halo); set(id, 'text-halo-width', 1.4); }
      else if (id === 'water') { set(id, 'fill-color', C.water); }
      else if (id === 'waterway') set(id, 'line-color', C.water);
      else if (id === 'park') { set(id, 'fill-color', C.park); set(id, 'fill-opacity', 0.85); }
      else if (id.startsWith('landcover')) { set(id, 'fill-color', C.wood); set(id, 'fill-opacity', 0.7); }
      else if (id.startsWith('landuse')) set(id, 'fill-color', C.landuse);
      else if (id === 'building') { set(id, 'fill-color', C.building); set(id, 'fill-opacity', 1); set(id, 'fill-outline-color', C.casing); }
      else if (id.startsWith('aeroway')) { set(id, l.type === 'fill' ? 'fill-color' : 'line-color', C.landuse); }
      else if (id.startsWith('railway')) set(id, 'line-color', C.rail);
      else if (id.startsWith('boundary')) set(id, 'line-color', C.boundary);
      else if (l.type === 'line' && id.includes('casing')) set(id, 'line-color', C.casing);
      else if (l.type === 'line' && (id.includes('major') || id.includes('motorway'))) set(id, 'line-color', C.roadMajor);
      else if (l.type === 'line' && id.startsWith('highway')) set(id, 'line-color', C.road);
      else if (l.type === 'line' && id.startsWith('tunnel')) set(id, 'line-color', C.roadMajor);
      else if (l.type === 'line' && id.startsWith('road')) set(id, 'line-color', C.road);
      else if (l.type === 'fill' && id.startsWith('road')) set(id, 'fill-color', C.road);
    }
  });
  const el = document.createElement('div'); el.className = 'mv-marker'; el.innerHTML = '<i></i>';
  new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map);
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
}

// 4: статична схема (детермінована декоративна сітка)
{
  const svg = document.getElementById('schema');
  const W = 940, H = 720, cx = W / 2, cy = H / 2;
  const roads = [];
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const xs = [-60, 130, 300, 470, 640, 810, 1000], ys = [-60, 110, 250, 400, 560, 780];
  xs.forEach((x) => roads.push(`M${x + rnd() * 30 - 15},-40 C${x + 40 + rnd() * 50},${H * 0.3} ${x - 40 - rnd() * 50},${H * 0.7} ${x + rnd() * 30 - 15},${H + 40}`));
  ys.forEach((y) => roads.push(`M-40,${y + rnd() * 20 - 10} C${W * 0.3},${y + 30 + rnd() * 30} ${W * 0.7},${y - 30 - rnd() * 30} ${W + 40},${y + rnd() * 20 - 10}`));
  const major = [`M-40,${cy + 90} C${W * 0.3},${cy + 40} ${W * 0.6},${cy + 160} ${W + 40},${cy + 60}`, `M${cx - 180},-40 C${cx - 140},${H * 0.4} ${cx - 220},${H * 0.7} ${cx - 160},${H + 40}`];
  svg.innerHTML = `
    <rect class="land" width="${W}" height="${H}"/>
    <path class="water" d="M-20,600 C150,540 260,660 420,620 C560,585 640,700 760,${H + 20} L-20,${H + 20}Z"/>
    <path class="park" d="M600,60 L880,40 L900,230 L690,260 Z"/>
    <path class="park" d="M40,150 L200,120 L230,260 L70,300 Z"/>
    <rect class="block" x="${cx - 120}" y="${cy - 90}" width="90" height="60" rx="6"/>
    <rect class="block" x="${cx + 40}" y="${cy + 30}" width="110" height="70" rx="6"/>
    <rect class="block" x="${cx + 60}" y="${cy - 120}" width="80" height="55" rx="6"/>
    ${roads.map((d) => `<path class="road-c" stroke-width="11" d="${d}"/>`).join('')}
    ${major.map((d) => `<path class="road-c" stroke-width="22" d="${d}"/>`).join('')}
    ${roads.map((d) => `<path class="road" stroke-width="7" d="${d}"/>`).join('')}
    ${major.map((d) => `<path class="road" stroke-width="16" d="${d}"/>`).join('')}`;
  const pin = document.createElement('div'); pin.className = 'mv-pin4'; pin.innerHTML = '<i></i>';
  pin.style.cssText = ''; // позиція — у CSS (центр панелі)
  document.getElementById('map4').appendChild(pin);
  document.getElementById('open-osm').href = view.osmView;
}
