#!/usr/bin/env python3
"""Фавікон site_brand: біла «Y» (EB Garamond 600) на --color-green з src/styles/tokens.css.

Створює:
  public/favicon.svg          квадрат зі скругленням, гліф переведено в path (шрифт не потрібен)
  public/favicon-32.png       32×32, RGBA зі скругленням
  public/favicon.ico          16/32/48 (PNG-записи всередині ICO)
  public/apple-touch-icon.png 180×180, без прозорості, повний квадрат (iOS сам маскує кути)

Запуск з кореня site_brand:
  python3 tools/make-favicon.py
Потрібно: fonttools, brotli (для woff2), pillow.
  pip install fonttools brotli pillow
Шрифт: public/assets/fonts/eb-garamond-latin.woff2 (variable, wght 400–800), інстанс wght=600.
"""
import io
import re
import struct
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
TOKENS = ROOT / "src/styles/tokens.css"
FONT = ROOT / "public/assets/fonts/eb-garamond-latin.woff2"
PUBLIC = ROOT / "public"

GLYPH = "Y"
WEIGHT = 600
TEXT_COLOR = "#ffffff"   # у tokens.css білого токена немає
PADDING = 0.15           # відступ від краю до гліфа
CORNER = 0.125           # радіус скруглення = 12.5% сторони
SS = 8                   # суперсемплінг для растеризації


def token_color(name: str) -> str:
    m = re.search(r"--" + re.escape(name) + r":\s*(#[0-9a-fA-F]{6})\s*;", TOKENS.read_text("utf-8"))
    if not m:
        sys.exit(f"Токен --{name} не знайдено в {TOKENS}")
    return m.group(1).lower()


BG = token_color("color-green")


def load_glyph():
    font = TTFont(str(FONT))
    font = instantiateVariableFont(font, {"wght": WEIGHT})
    gs = font.getGlyphSet()
    name = font.getBestCmap()[ord(GLYPH)]
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    return gs, name, bp.bounds  # (xMin, yMin, xMax, yMax) в одиницях шрифту


def layout(size: float, bounds):
    """Повертає (scale, tx, ty): перетворення glyph-юнітів у координати сторінки size×size."""
    xmin, ymin, xmax, ymax = bounds
    inner = size * (1 - 2 * PADDING)
    gh, gw = ymax - ymin, xmax - xmin
    s = min(inner / gh, inner / gw)           # вписати в квадрат padding-бокса
    cx, cy = (xmin + xmax) / 2, (ymin + ymax) / 2
    tx = size / 2 - s * cx
    ty = size / 2 + s * cy                     # вісь Y у SVG донизу
    return s, tx, ty


def glyph_path(size: float = 512) -> str:
    gs, name, bounds = load_glyph()
    s, tx, ty = layout(size, bounds)
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    gs[name].draw(TransformPen(pen, (s, 0, 0, -s, tx, ty)))
    return pen.getCommands()


class FlattenPen(BasePen):
    """Розгортає криві в полігони для растеризації через Pillow."""

    def __init__(self, glyphSet, steps=24):
        super().__init__(glyphSet)
        self.contours, self.cur, self.steps = [], [], steps

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            a, b, c = (1 - t) ** 2, 2 * (1 - t) * t, t * t
            self.cur.append((a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]))

    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
            self.cur.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
                             a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))

    def _closePath(self):
        if len(self.cur) > 2:
            self.contours.append(self.cur)
        self.cur = []

    _endPath = _closePath


def render(px: int, rounded: bool) -> Image.Image:
    """Растеризує іконку px×px. rounded=False — повний квадрат без прозорості (RGB)."""
    big = px * SS
    k = big / 512.0  # координати 512-простору -> пікселі суперсемплу
    bg_rgb = tuple(int(BG[i:i + 2], 16) for i in (1, 3, 5))

    shape = Image.new("L", (big, big), 0)
    d = ImageDraw.Draw(shape)
    r = CORNER * 512 * k if rounded else 0
    d.rounded_rectangle([0, 0, big - 1, big - 1], radius=r, fill=255)

    gs, name, bounds = load_glyph()
    s, tx, ty = layout(512, bounds)
    pen = FlattenPen(gs)
    gs[name].draw(TransformPen(pen, (s * k, 0, 0, -s * k, tx * k, ty * k)))
    glyph = Image.new("L", (big, big), 0)
    gd = ImageDraw.Draw(glyph)
    for c in pen.contours:
        gd.polygon(c, fill=255)

    if rounded:
        img = Image.new("RGBA", (big, big), bg_rgb + (0,))
        img.putalpha(shape)
        white = Image.new("RGBA", (big, big), (255, 255, 255, 255))
        img.paste(white, (0, 0), glyph)
        return img.resize((px, px), Image.LANCZOS)
    img = Image.new("RGB", (big, big), bg_rgb)
    img.paste((255, 255, 255), (0, 0), glyph)
    return img.resize((px, px), Image.LANCZOS)


def write_ico(path: Path, sizes):
    """ICO з PNG-записами (підтримується з Windows Vista)."""
    blobs = []
    for px in sizes:
        buf = io.BytesIO()
        render(px, rounded=True).save(buf, format="PNG")
        blobs.append((px, buf.getvalue()))
    header = struct.pack("<HHH", 0, 1, len(blobs))
    offset = 6 + 16 * len(blobs)
    entries = b""
    for px, data in blobs:
        wh = 0 if px >= 256 else px
        entries += struct.pack("<BBBBHHII", wh, wh, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
    path.write_bytes(header + entries + b"".join(d for _, d in blobs))


def main():
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
        f'<rect width="512" height="512" rx="{CORNER * 512:g}" fill="{BG}"/>'
        f'<path fill="{TEXT_COLOR}" d="{glyph_path(512)}"/>'
        "</svg>\n"
    )
    (PUBLIC / "favicon.svg").write_text(svg, encoding="utf-8")
    render(32, rounded=True).save(PUBLIC / "favicon-32.png", optimize=True)
    render(180, rounded=False).save(PUBLIC / "apple-touch-icon.png", optimize=True)
    write_ico(PUBLIC / "favicon.ico", [16, 32, 48])
    print(f"ok: фон {BG}, гліф '{GLYPH}' wght={WEIGHT}, файли записано в {PUBLIC}")


if __name__ == "__main__":
    main()
