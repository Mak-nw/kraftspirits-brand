#!/usr/bin/env node
// Слайди мініатюр сторінки товару з generative/slider (3:4, 1728×2304) → public/assets/img/slider/*.webp (спільні для всього бренду).
// Використання: node tools/make-slide.mjs            (усі 4 слайди)   |   node tools/make-slide.mjs <ключ>
// Великі (lg): YasnoCraft 900:968 → 1800×1936, Bazylsprings 866:875 → 1732×1750, webp q85. Мініатюри: 126:167 → 252×334 / 160:212 → 320×424, webp q82.
// Режими: cover — кроп по висоті з зсувом oy (частка вільної висоти), сюжет не обрізається; extend — фото вужче за слот, боки добудовуються
// продовженням крайової колонки тла з плавним затуханням тіні (як hero у import-bottle.mjs; окрема копія алгоритму).
// Потрібні python3 з Pillow і cwebp. Нічого поза public/assets/img/slider не пишеться.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = resolve(root, '../generative/slider');
const outDir = resolve(root, 'public/assets/img/slider');
mkdirSync(outDir, { recursive: true });
const SLIDES = {
  'yc-gin-studio':    { src: 'gin-studio.png',    slot: [900, 968], thumb: [126, 167], mode: 'extend', oy: 0 },
  'yc-gin-herbs':     { src: 'gin-herbs.png',     slot: [900, 968], thumb: [126, 167], mode: 'cover', oy: 0.35, q: 48 },
  'bs-whisky-studio': { src: 'whisky-studio.png', slot: [866, 875], thumb: [160, 212], mode: 'extend', oy: 0 },
  'bs-whisky-wheat':  { src: 'whisky-wheat.png',  slot: [866, 875], thumb: [160, 212], mode: 'cover', oy: 0.62, q: 72 },
};
const py = `
import sys
from PIL import Image, ImageFilter
src, lg, th, sw, sh, tw_, th_, mode, oy = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6]), int(sys.argv[7]), sys.argv[8], float(sys.argv[9])
im = Image.open(src).convert('RGB'); w, h = im.size
R = sw/sh; tw = round(h*R)
def ext_side(x0, n, left):
    strip = im.crop((x0, 0, x0+4, h)).resize((1, h), Image.BOX).resize((9, h)).filter(ImageFilter.GaussianBlur(3)).crop((4, 0, 5, h))
    px = list(strip.getdata()); D = n*0.95; RR = 150; data = [None]*(n*h); cols = []
    for c in range(3):
        e = [p[c] for p in px]
        mx = [max(e[max(0, y-RR):y+RR+1]) for y in range(h)]
        b = []
        for y in range(h):
            seg = mx[max(0, y-30):y+31]; b.append(sum(seg)/len(seg))
        cols.append((e, [max(0.0, b[y]-e[y]-1.0) for y in range(h)]))
    for y in range(h):
        for k in range(n):
            t = (n-1-k) if left else k
            f = max(0.0, 1.0-(t+1)/D)**2
            data[y*n+k] = tuple(min(255, max(0, round(e[y] + s[y]*(1.0-f)))) for e, s in cols)
    out = Image.new('RGB', (n, h)); out.putdata(data); return out
if mode == 'extend' and tw > w:
    pad = tw - w; l = pad//2; r = pad - l
    cv = Image.new('RGB', (tw, h)); cv.paste(im, (l, 0))
    cv.paste(ext_side(0, l, True), (0, 0)); cv.paste(ext_side(w-4, r, False), (l+w, 0)); big = cv
else:
    ch = round(w/R)  # кроп по висоті
    top = round((h-ch)*oy); big = im.crop((0, top, w, top+ch))
big.resize((sw*2, sh*2), Image.LANCZOS).save(lg)
# мініатюра: повний кадр 3:4, мінімальний кроп до відношення мініатюри
tr = tw_/th_; cw = min(w, round(h*tr)); chh = round(cw/tr); x = (w-cw)//2; y = (h-chh)//2
im.crop((x, y, x+cw, y+chh)).resize((tw_*2, th_*2), Image.LANCZOS).save(th)
`;
const only = process.argv[2];
for (const [key, c] of Object.entries(SLIDES)) {
  if (only && only !== key) continue;
  const tl = resolve(outDir, `.tmp-${key}-lg.png`), tt = resolve(outDir, `.tmp-${key}-thumb.png`);
  execFileSync('python3', ['-c', py, resolve(srcDir, c.src), tl, tt, ...c.slot, ...c.thumb, c.mode, String(c.oy)].map(String));
  execFileSync('cwebp', ['-q', String(c.q || 85), '-m', '6', tl, '-o', resolve(outDir, `${key}-lg.webp`)], { stdio: 'ignore' });
  execFileSync('cwebp', ['-q', '82', '-m', '6', tt, '-o', resolve(outDir, `${key}-thumb.webp`)], { stdio: 'ignore' });
  execFileSync('rm', [tl, tt]);
  console.log(`${key}: ${c.mode} ${c.slot.join(':')}`);
}
