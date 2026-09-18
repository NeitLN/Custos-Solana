"""Build original Custos SVG assets; outline the locally licensed Manrope wordmark.

Run from the repo root: python scripts/brand/tao-logo-custos.py
Requires fontTools with WOFF2 support for the wordmark export only.
The website consumes the generated SVGs, with no runtime dependency on Python.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'apps/demo-wallet/public/brand'
OUT.mkdir(parents=True, exist_ok=True)

# An open, faceted C and a separate checkpoint at its mouth.
C_PATH = 'M24 6H43L55 18L45 28L37 20H30L20 30V34L30 44H37L45 36L55 46L43 58H24L6 40V24Z'
CHECKPOINT = 'M54 26L60 32L54 38L48 32Z'


def mark(primary, accent):
    return f'<path fill="{primary}" d="{C_PATH}"/><path fill="{accent}" d="{CHECKPOINT}"/>'


def svg(name, body, width=64, height=64):
    (OUT / name).write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" fill="none">'
        f'<title>Custos</title>{body}</svg>\n', encoding='utf-8')


svg('custos-symbol.svg', mark('#146C60', '#146C60'))
svg('custos-symbol-light.svg', mark('#F5F7F4', '#B9DE87'))
svg('custos-symbol-mono.svg', mark('#102F28', '#102F28'))
svg('custos-favicon.svg', '<rect width="64" height="64" rx="15" fill="#102F28"/>'
    '<g transform="translate(8 8) scale(.75)">'+mark('#F5F7F4','#B9DE87')+'</g>')

# Paths make the downloaded logo independent of installed fonts.
font = TTFont(ROOT / 'apps/demo-wallet/public/landing/fonts/manrope-800-latin.woff2')
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
cursor = 0
letters = []
for character in 'Custos':
    glyph_name = cmap[ord(character)]
    pen = SVGPathPen(glyphs)
    glyphs[glyph_name].draw(pen)
    letters.append(f'<path transform="translate({cursor} 0)" d="{pen.getCommands()}"/>')
    cursor += font['hmtx'][glyph_name][0] - 20
scale = 46 / font['head'].unitsPerEm
width = round(82 + cursor * scale + 6)
for name, primary, accent, text in [
    ('custos-logo.svg','#146C60','#146C60','#102F28'),
    ('custos-logo-light.svg','#F5F7F4','#B9DE87','#F5F7F4'),
]:
    svg(name, mark(primary,accent)+f'<g transform="translate(82 49) scale({scale} {-scale})" fill="{text}">'
        + ''.join(letters) + '</g>', width, 64)
print(f'Generated 6 SVGs in {OUT}')
