// Перевірка механіки стрічки арок: клавіші, перетягування, snap, reduced-motion, пауза при прихованій вкладці, навантаження.
// node tools/lottie/test-interaction.mjs --url http://localhost:5341/ [--base /]
import puppeteer from 'puppeteer-core';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
const a = Object.fromEntries(process.argv.slice(2).map((x) => { const [k, v] = x.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const url = (a.url || 'http://localhost:5341/').replace(/\/$/, '') + '/about.html?age=ok&reveal=off&parallax=off';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox'], userDataDir: mkdtempSync(join(tmpdir(), 'lt-')) });
const res = {};
try {
  const page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.querySelector('#place').scrollIntoView()); await sleep(800);
  const st = () => page.evaluate(() => { const v = document.querySelector('[data-process-viewport]'); const its = [...document.querySelectorAll('.about-process__item')]; return { left: Math.round(v.scrollLeft), pitch: Math.round(its[1].offsetLeft - its[0].offsetLeft), max: Math.round(v.scrollWidth - v.clientWidth), pageX: scrollX }; });
  res.initial = await st();
  await page.focus('[data-process-viewport]');
  await page.keyboard.press('ArrowRight'); await sleep(900); res.afterRight = await st();
  await page.keyboard.press('ArrowRight'); await sleep(900); res.afterRight2 = await st();
  await page.keyboard.press('ArrowLeft'); await sleep(900); res.afterLeft = await st();
  await page.keyboard.press('End'); await sleep(1400); res.afterEnd = await st();
  await page.keyboard.press('Home'); await sleep(1400); res.afterHome = await st();
  // перетягування мишею: на 500 px ліворуч → ~1 арка
  await page.mouse.move(1400, 600); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(1400 - i * 50, 600); await sleep(16); } await page.mouse.up(); await sleep(1200); res.afterDrag = await st();
  // горизонтальне колесо
  await page.mouse.move(1400, 600); await page.mouse.wheel({ deltaX: 600, deltaY: 0 }); await sleep(1200); res.afterWheelX = await st();
  // вертикальне колесо НЕ перехоплюється стрічкою (скрол сторінки)
  const y0 = await page.evaluate(() => scrollY); await page.mouse.wheel({ deltaY: 200 }); await sleep(700); res.verticalWheelMovesPage = (await page.evaluate(() => scrollY)) !== y0;
  // анімація йде: svg міняється між кадрами
  await page.evaluate(() => document.querySelector('#place').scrollIntoView()); await sleep(500);
  const snap = () => page.evaluate(() => [...document.querySelectorAll('.about-process__anim svg')].map((s) => s.innerHTML.length + ':' + s.querySelectorAll('g[transform]').length + ':' + [...s.querySelectorAll('g[transform]')].slice(0, 12).map((g) => g.getAttribute('transform')).join('|').length));
  const s1 = await page.evaluate(() => [...document.querySelectorAll('.about-process__anim svg')].map((s) => s.outerHTML)); await sleep(700);
  const s2 = await page.evaluate(() => [...document.querySelectorAll('.about-process__anim svg')].map((s) => s.outerHTML));
  res.animatingAll8 = s1.every((x, i) => x !== s2[i]);
  // навантаження: середній час кадру на 3 с (rAF)
  res.fpsAvg = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(Math.round(n / 3)); }; requestAnimationFrame(f); }));
  // reduced-motion
  const p2 = await browser.newPage(); await p2.setViewport({ width: 1920, height: 1080 });
  await p2.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p2.goto(url, { waitUntil: 'networkidle0' }); await sleep(1500);
  const r1 = await p2.evaluate(() => [...document.querySelectorAll('.about-process__anim svg')].map((s) => s.outerHTML)); await sleep(900);
  const r2 = await p2.evaluate(() => [...document.querySelectorAll('.about-process__anim svg')].map((s) => s.outerHTML));
  res.reducedStatic = r1.length === 8 && r1.every((x, i) => x === r2[i]) && r1.every((x) => x.includes('<path'));
} finally { await browser.close(); }
console.log(JSON.stringify(res, null, 1));
