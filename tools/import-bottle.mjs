#!/usr/bin/env node
// Імпорт нового фото пляшки з generative/newbottles → hero-webp (900:968 YC / 866:875 BS) (+ інструкція для вирізу).
// Використання: node tools/import-bottle.mjs <файл.png|jpg> [slug]
// Без залежностей npm. Потрібні python3 з Pillow (перевірка: python3 -c "import PIL") і cwebp (або Pillow-webp).
// Slug визначається з імені файлу: (1) таблиця синонімів tools/bottle-map.json ("synonyms": ім'я файлу → slug); (2) slug === ім'я або slug закінчується на "-<ім'я>"; неоднозначність/невідоме → помилка.
// Hero-файл: product-hero-<slug>-new.webp (виняток: "heroNames" у bottle-map.json, напр. gin-yasnyi → yasnyi).
// Режим вирізу: node tools/import-bottle.mjs --cutout <виріз-з-альфою.png> <slug> — збирає public/assets/img/products/<slug>.webp (800x1060, висота 740, низ y=902, по центру, webp q84).
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, extname, resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const map = existsSync(resolve(root, 'tools/bottle-map.json')) ? JSON.parse(readFileSync(resolve(root, 'tools/bottle-map.json'), 'utf8')) : {};
if (process.argv[2] === '--cutout') {
  const [, , , cut, slugC] = process.argv;
  if (!cut || !slugC || !existsSync(cut)) { console.error('Використання: node tools/import-bottle.mjs --cutout <виріз.png> <slug>'); process.exit(1); }
  const dst = resolve(root, `public/assets/img/products/${slugC}.webp`);
  const pyc = `
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
H = 740
im = Image.open(src).convert('RGBA')
a = im.split()[-1].point(lambda v: 0 if v < 6 else v); im.putalpha(a)
im = im.crop(a.point(lambda v: 255 if v > 24 else 0).getbbox())
im = im.resize((round(im.width*H/im.height), H), Image.LANCZOS)
cv = Image.new('RGBA', (800, 1060), (0,0,0,0)); cv.paste(im, (400 - im.width//2, 902 - H), im)
cv.save(dst, 'WEBP', quality=84, method=6)
`;
  execFileSync('python3', ['-c', pyc, cut, dst]);
  console.log('Виріз: ' + dst.replace(root + '/', ''));
  process.exit(0);
}
const [, , input, slugArg] = process.argv;
if (!input) { console.error('Використання: node tools/import-bottle.mjs <файл> [slug]'); process.exit(1); }
if (!existsSync(input)) { console.error('Файл не знайдено: ' + input); process.exit(1); }

const slugs = [...readFileSync(resolve(root, 'src/data/products.js'), 'utf8').matchAll(/"slug":\s*"([^"]+)"/g)].map((m) => m[1]);
const key = basename(input, extname(input)).toLowerCase();
let slug = slugArg || map.synonyms?.[key];
if (!slug) {
  const hit = slugs.filter((s) => s === key || s.endsWith('-' + key));
  if (hit.length !== 1) {
    console.error(hit.length ? `Неоднозначно для "${key}": ${hit.join(', ')} — вкажіть slug другим аргументом.` : `Невідомий товар для "${key}". Slug-и: ${slugs.join(', ')}`);
    process.exit(2);
  }
  slug = hit[0];
} else if (!slugs.includes(slug)) { console.error('Невідомий slug: ' + slug); process.exit(2); }

const short = map.heroNames?.[slug] || slug;
// Пропорція hero за брендом: YasnoCraft 900:968 (за замовчуванням), Bazylsprings 866:875 (слот 194:1520) — "heroRatio" у bottle-map.json.
const brand = readFileSync(resolve(root, 'src/data/products.js'), 'utf8').split(`"slug": "${slug}"`)[1]?.match(/"brand":\s*"([^"]+)"/)?.[1];
const [RW, RH] = map.heroRatio?.[brand] || [900, 968];
const out = resolve(root, `public/assets/img/product-hero-${short}-new.webp`);
mkdirSync(dirname(out), { recursive: true });
const tmp = resolve(root, 'tools/.tmp-hero.png');

// Кроп/розширення до відношення 900:968: пляшка ніколи не обрізається. Якщо фото вужче за потрібне відношення —
// боки добудовуються продовженням крайової колонки фону з плавним затуханням тіні (без шва); якщо ширше — кроп по центру ширини.
const py = `
import sys
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); w, h = im.size
R = int(sys.argv[3])/int(sys.argv[4]); tw = round(h*R)
if tw >= w:
    pad = tw - w; l = pad//2; r = pad - l
    canvas = Image.new('RGB', (tw, h))
    canvas.paste(im, (l, 0))
    # Добудова боків без шва (без повтору/дзеркала). Для кожного рядка y (працюємо як з ПРАВИМ краєм; лівий — дзеркально):
    #  1) тренд фону/тіні перед краєм: M1 (30 стовпців перед фезер-зоною) і M2 (ще 60 px ліворуч) -> нахил m, значення на краю E(y);
    #  2) у фезер-зоні F=40 px біля самого краю оригіналу додається плавна поправка (E - фактичний край), що прибирає темний «обідок» краю фото
    #     (віньєтка джерела ~2-3 рівні) — пляшка далеко, зміна лише біля країв;
    #  3) за межею тінь (глибина d0 = верхня огинаюча тла b(y) - E) плавно затухає до чистого тла за (1 - t/D)^p, D ~ вся смуга, p підбирається так,
    #     щоб нахил на стику збігався з нахилом тіні в оригіналі (без зламу градієнта). Тло без тіні продовжується константою E(y).
    F = 40
    def vblur(vals, sg):
        K = int(3*sg); ker = [2.718281828**(-(i*i)/(2.0*sg*sg)) for i in range(-K, K+1)]; out = []
        for y in range(h):
            acc = 0.0; ws = 0.0
            for i in range(-K, K+1):
                yy = y+i
                if 0 <= yy < h: wgt = ker[i+K]; acc += vals[yy]*wgt; ws += wgt
            out.append(acc/ws)
        return out
    def side(img, n):
        W = img.size[0]
        def colmean(x0, x1):
            st = img.crop((x0, 0, x1, h)).resize((1, h), Image.BOX)
            d = list(st.getdata()); return [[p[c] for p in d] for c in range(3)]
        M1 = colmean(W-F-30, W-F); M2 = colmean(W-F-90, W-F-60); EA = colmean(W-4, W)
        D = n*0.95; patch = img.crop((W-F, 0, W, h)).convert('RGB'); pd = list(patch.getdata()); ed = [None]*(n*h)
        chans = []
        for c in range(3):
            m = vblur([(M1[c][y]-M2[c][y])/60.0 for y in range(h)], 6)
            m1 = vblur(M1[c], 5); ea = vblur(EA[c], 5)
            mx0 = [max(m1[max(0, y-150):y+151]) for y in range(h)]
            # поза тінню (запас тла над рівнем <= 3) нахил обмежується ±0.015/px: на пласкому тлі велика екстраполяція лише підсилює муар джерела
            ms = [max(-0.03, min(0.03, v)) for v in m]  # нахил продовження на пласкому тлі (затухає експоненційно, без зламу градієнта)
            m = [m[y] if mx0[y]-m1[y] > 3 else max(-0.015, min(0.015, m[y])) for y in range(h)]
            E = [m1[y] + m[y]*(F+15) for y in range(h)]
            mx = [max(E[max(0, y-150):y+151]) for y in range(h)]
            bb = [sum(mx[max(0, y-30):y+31])/len(mx[max(0, y-30):y+31]) for y in range(h)]
            chans.append((E, [E[y]-ea[y] for y in range(h)], m, [max(0.0, bb[y]-E[y]-1.0) for y in range(h)], ms))
        for y in range(h):
            for x in range(F):
                t = (x+1)/F; r = t*t*(3-2*t); px = pd[y*F+x]
                pd[y*F+x] = tuple(min(255, max(0, round(px[c] + chans[c][1][y]*r))) for c in range(3))
            for k in range(n):
                vals = []
                for c in range(3):
                    E, off, m, d0, ms = chans[c]
                    if d0[y] <= 0: vals.append(E[y] + ms[y]*60.0*(1.0-2.718281828**(-(k+1)/60.0))); continue
                    p = min(6.0, max(1.0, D*max(m[y], 0.0)/d0[y]))
                    g = max(0.0, 1.0-(k+1)/D)**p
                    vals.append(E[y] + d0[y]*(1.0-g))
                ed[y*n+k] = tuple(min(255, max(0, round(v))) for v in vals)
        ext = Image.new('RGB', (n, h)); ext.putdata(ed)
        patch.putdata(pd)
        return patch, ext
    if r:
        pt, ex = side(im, r); canvas.paste(pt, (l+w-F, 0)); canvas.paste(ex, (l+w, 0))
    if l:
        pt, ex = side(im.transpose(Image.FLIP_LEFT_RIGHT), l)
        canvas.paste(pt.transpose(Image.FLIP_LEFT_RIGHT), (l, 0)); canvas.paste(ex.transpose(Image.FLIP_LEFT_RIGHT), (0, 0))
    im = canvas
else:
    x = (w - tw)//2; im = im.crop((x, 0, x+tw, h))
im.resize((int(sys.argv[3])*2, int(sys.argv[4])*2), Image.LANCZOS).save(dst)
`;
execFileSync('python3', ['-c', py, input, tmp, String(RW), String(RH)]);
execFileSync('cwebp', ['-q', '85', '-m', '6', tmp, '-o', out], { stdio: 'ignore' });
execFileSync('rm', [tmp]);

console.log(`Товар: ${slug}\nHero: ${out.replace(root + '/', '')} (${RW*2}x${RH*2}, відношення ${RW}:${RH})\n
ДАЛІ (агент вручну):
1. Виріз: відправити ТІЛЬКИ ${input} у сервіс видалення фону (mcp ...images_remove_background; ~3 кредити; перевірити баланс), отримати PNG з альфою.
2. (node tools/import-bottle.mjs --cutout <png з альфою> ${slug} робить це автоматично) Звести виріз у 800x1060 на прозорому тлі по центру, низ пляшки як у product-card-gin-barrel.webp, альфа на краях = 0; webp q84 з альфою → public/assets/img/products/${slug}.webp (бекап старого — у scratchpad).
3. src/data/products.js (НЕ автоматично), для "${slug}":
   - "hero": "assets/img/${out.split('/').pop()}" (gallery не додавати)
   - "image": "assets/img/products/${slug}.webp"
   - прибрати "catalogImage", якщо він був (каталог тоді бере image)
4. Записати ассети й джерело в MEDIA.md; npm run build; перевірити product/catalog/picker візуально.`);
