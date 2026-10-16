// Скріншоти секції 3 about (стрічка арок) у кілька моментів анімації + контроль консолі/мережі/hscroll.
// node tools/lottie/shot-section.mjs --url=http://localhost:5341/ --out=DIR [--width=1920] [--scroll=N (арок)] [--notitle] [--tag=ім'я]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const a = Object.fromEntries(process.argv.slice(2).map((x) => { const [k, v] = x.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const url = (a.url || 'http://localhost:5341/') .replace(/\/$/, '') + '/about.html?age=ok&reveal=off&parallax=off';
const out = resolve(a.out || '/tmp/lottie-shots'); mkdirSync(out, { recursive: true });
const width = Number(a.width || 1920), height = Number(a.height || 1080);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox'], userDataDir: resolve(out, '.profile') });
try {
  const page = await browser.newPage();
  const log = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => log.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => log.push('requestfailed: ' + r.url()));
  page.on('response', (r) => { if (r.status() >= 400) log.push(r.status() + ' ' + r.url()); });
  await page.setViewport({ width, height });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate((y) => { document.querySelector('#place').scrollIntoView(); }, 0);
  if (a.notitle) await page.addStyleTag({ content: '.about-place .about__grid{visibility:hidden}' });
  if (a.scroll) await page.evaluate((n) => { const v = document.querySelector('[data-process-viewport]'); const its = document.querySelectorAll('.about-process__item'); v.style.scrollSnapType = 'none'; v.scrollLeft = n * (its[1].offsetLeft - its[0].offsetLeft); }, Number(a.scroll));
  await new Promise((r) => setTimeout(r, 1500));
  const info = await page.evaluate(() => {
    const q = (s) => document.querySelector(s); const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
    const arches = [...document.querySelectorAll('.about-process__arch')].map(r);
    const links = [...document.querySelectorAll('.about-process__link')].map(r);
    return { viewport: r(q('.about-process__viewport')), arches: arches.slice(0, 4), links: links.slice(0, 3), scrollW: document.documentElement.scrollWidth, innerW: innerWidth, svgs: document.querySelectorAll('.about-process__anim svg').length };
  });
  console.log(JSON.stringify(info));
  const el = await page.$('#place');
  for (let k = 0; k < 3; k++) { await el.screenshot({ path: resolve(out, `place-${width}${a.tag ? '-' + a.tag : ''}-t${k}.png`) }); await new Promise((r) => setTimeout(r, 700)); }
  if (log.length) console.log('LOG:\n' + log.join('\n'));
} finally { await browser.close(); }
