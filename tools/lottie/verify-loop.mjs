// Перевірка зацикленості Lottie етапів: рендер кадрів у lottie-web (svg) і піксельна різниця на шві.
// node tools/lottie/verify-loop.mjs [--out=DIR] [--only=3] [--dir=каталог з json] [--frames=0,20,...]
//  · seam: кадр 0 vs кадр T (копія з op=T+1) — має бути 0 пікселів різниці;
//  · плавність: різниця (T−1 → T) порівнюється з типовою різницею сусідніх кадрів усередині циклу (шов не гостріший за решту).
import puppeteer from 'puppeteer-core';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const out = resolve(args.out || '/tmp/lottie-out'); mkdirSync(out, { recursive: true });
const only = args.only ? String(args.only).padStart(2, '0') : null;
const sheetFrames = (args.frames || '0,20,40,60,80,100').split(',').map(Number);
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'], userDataDir: resolve(out, '.profile') });
let fail = 0;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 480, height: 480, deviceScaleFactor: 1 });
  await page.setContent('<body style="margin:0;background:#223520"><div id="a" style="width:240px;height:240px"></div></body>');
  await page.addScriptTag({ content: readFileSync(resolve(root, 'node_modules/lottie-web/build/player/lottie_light.min.js'), 'utf8') });
  const shot = async (f) => {
    await page.evaluate((fr) => { window.__a.goToAndStop(fr, true); return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }, f);
    return page.screenshot({ clip: { x: 0, y: 0, width: 240, height: 240 }, type: 'png' });
  };
  const diff = (a, b) => page.evaluate(async (x, y) => {
    const dec = async (s) => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(bm.width, bm.height); const g = c.getContext('2d'); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, bm.width, bm.height).data; };
    const A = await dec(x), B = await dec(y); let n = 0, sum = 0;
    for (let i = 0; i < A.length; i += 4) { const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2])); sum += d; if (d > 8) n++; }
    return { px: n, mean: +(sum / (A.length / 4)).toFixed(4) };
  }, a.toString('base64'), b.toString('base64'));

  const stems = args.names ? String(args.names).split(',') : Array.from({ length: 8 }, (_, i) => `process-${String(i + 1).padStart(2, '0')}`);   // --names=barrel-01-pour,… — інші набори анімацій (gen-barrels.mjs)
  for (const stem of stems) {
    const n = stem;
    if (only && only !== n.replace(/^process-/, '')) continue;
    const data = JSON.parse(readFileSync(resolve(args.dir ? resolve(args.dir) : resolve(root, 'public/assets/lottie'), `${stem}.json`), 'utf8'));
    const T = data.op;
    data.op = T + 1; data.layers.forEach((l) => { l.op = T + 1; }); // тестова копія: кадр T існує
    await page.evaluate((d) => { if (window.__a) window.__a.destroy(); window.__a = lottie.loadAnimation({ container: document.getElementById('a'), renderer: 'svg', loop: false, autoplay: false, animationData: d }); }, data);
    const f0 = await shot(0), fT = await shot(T);
    const seam = await diff(f0, fT);
    // типова різниця сусідніх кадрів та різниця на шві (T−1 → T, 0 → 1)
    const fTm1 = await shot(T - 1), f1 = await shot(1);
    const dSeamA = await diff(fTm1, fT), dSeamB = await diff(f0, f1);
    let maxN = 0, sumN = 0, cnt = 0, prev = f0;
    for (let f = 1; f < T; f += 3) { const cur = await shot(f); const d = await diff(prev, cur); maxN = Math.max(maxN, d.px); sumN += d.px; cnt++; prev = cur; }
    // метрика шва: середня абсолютна різниця КОЖНОЇ пари сусідніх кадрів (1…T); шов = пари (T−2…T) і (1…3) навколо стику; max шва ≤ 1.5 × середня циклу
    const dm = []; let pv = f0;
    for (let f = 1; f <= T; f++) { const cur = await shot(f); dm[f] = (await diff(pv, cur)).mean; pv = cur; }
    if (args.dump) console.log(dm.slice(1).map((v) => v.toFixed(2)).join(" "));
    const avgAll = dm.slice(1).reduce((a, b) => a + b, 0) / T;
    const seamMax = Math.max(dm[T], dm[1]); // пари (T−1→T) і (0→1) — безпосередньо на стику
    const inner = Math.max(...dm.slice(2, T)); // найгостріший крок усередині циклу (в process-01 тики дають піки ≈0.5 і всередині)
    const seamOk = seamMax <= Math.max(avgAll * 1.5, inner) + 0.002; // шов не гостріший за 1.5× середню АБО за найгостріший внутрішній крок
    const ok = seam.px === 0 && seam.mean === 0 && dSeamA.px <= maxN * 1.5 + 5 && seamOk;
    if (!ok) fail++;
    console.log(`process-${n} T=${T}  seam(0≡T): ${seam.px}px mean=${seam.mean}  | Δ(T-1→T)=${dSeamA.px}px  Δ(0→1)=${dSeamB.px}px  | Δ межі кадрів (крок 3): max=${maxN}px avg=${(sumN / cnt).toFixed(1)}px  | шов: max=${seamMax.toFixed(4)} avg=${avgAll.toFixed(4)} inner=${inner.toFixed(4)} ×${(seamMax / (avgAll || 1)).toFixed(2)} ${seamOk ? '' : 'SEAM-FAIL'}  ${ok ? 'OK' : 'FAIL'}`);
    for (const f of sheetFrames) { const b = await shot(f); (await import('node:fs')).writeFileSync(resolve(out, `${stem}-f${String(f).padStart(3, '0')}.png`), b); }
    (await import('node:fs')).writeFileSync(resolve(out, `${stem}-seamT.png`), fT);
  }
} finally { await browser.close(); }
process.exit(fail ? 1 : 0);
