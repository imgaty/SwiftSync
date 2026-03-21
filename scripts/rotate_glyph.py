from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
import math

FONT_PATH = "/Users/hilarioferreira/.vscode/extensions/ztluwu.lucide-icons-0.3.3/dist/lucide-icons.woff"
font = TTFont(FONT_PATH)

glyf = font['glyf']
hmtx = font['hmtx']

src_name = 'editor-layout'
src_glyph = glyf[src_name]

width, lsb = hmtx[src_name]
print(f"Source: width={width}, lsb={lsb}, bbox=({src_glyph.xMin},{src_glyph.yMin},{src_glyph.xMax},{src_glyph.yMax})")

# Record source paths
recPen = RecordingPen()
src_glyph.draw(recPen, glyf)

# Center of bounding box
cx = (src_glyph.xMin + src_glyph.xMax) / 2
cy = (src_glyph.yMin + src_glyph.yMax) / 2

# 90 degrees clockwise rotation around center
angle = -math.pi / 2
cos_a = round(math.cos(angle), 10)
sin_a = round(math.sin(angle), 10)

# TransformPen matrix: (xx, xy, yx, yy, dx, dy)
# where x' = xx*x + yx*y + dx, y' = xy*x + yy*y + dy
xx = cos_a
xy = sin_a
yx = -sin_a
yy = cos_a
dx = -cos_a * cx + sin_a * cy + cx
dy = -sin_a * cx - cos_a * cy + cy

# Create rotated glyph
new_name = 'editor-layout-bottom'
ttPen = TTGlyphPen(None)
transformPen = TransformPen(ttPen, (xx, xy, yx, yy, dx, dy))
recPen.replay(transformPen)

new_glyph = ttPen.glyph()
new_glyph.recalcBounds(glyf)
print(f"New: bbox=({new_glyph.xMin},{new_glyph.yMin},{new_glyph.xMax},{new_glyph.yMax})")

# Add glyph to font
glyf[new_name] = new_glyph
hmtx[new_name] = (width, new_glyph.xMin)

# Update glyph order - must match glyf table
glyphOrder = font.getGlyphOrder()
if new_name not in glyphOrder:
    glyphOrder.append(new_name)
    font.setGlyphOrder(glyphOrder)

# Verify sync
print(f"GlyphOrder: {len(glyphOrder)}, glyf glyphs: {len(glyf.glyphs)}")

# Remap U+E196 to the new rotated glyph
cmap = font['cmap']
for table in cmap.tables:
    if hasattr(table, 'cmap') and 0xE196 in table.cmap:
        old = table.cmap[0xE196]
        table.cmap[0xE196] = new_name
        print(f"Remapped U+E196: '{old}' -> '{new_name}'")

font.flavor = 'woff'
font.save(FONT_PATH)
print("Font saved!")
font.close()
