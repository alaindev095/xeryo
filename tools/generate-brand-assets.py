#!/usr/bin/env python3
"""
Regenerates Xeryo's raster brand assets (optional tool, not needed to run the site):

  assets/images/xeryo-social-preview.png   1200x630 Open Graph / X card image
  assets/icons/xeryo-logo-512.png          512x512 logo (Organization schema, manifest)
  assets/icons/icon-192.png                192x192 manifest icon
  assets/icons/apple-touch-icon.png        180x180 iOS home-screen icon
  favicon.ico                              16/32/48 px favicon for crawlers and old browsers

Requires Pillow:  pip install pillow
Run from the project root:  python3 tools/generate-brand-assets.py
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INK = (10, 10, 10)
PAPER = (255, 255, 255)
GRAY_LINE = (58, 58, 58)
GRAY_TEXT = (168, 168, 168)

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf",
    "/usr/share/fonts/truetype/inter/Inter-SemiBold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "C:/Windows/Fonts/segoeuib.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
]
FONT_REGULAR_CANDIDATES = [
    "/usr/share/fonts/opentype/inter/Inter-Regular.otf",
    "/usr/share/fonts/truetype/inter/Inter-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]


def load_font(candidates, size):
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    sys.exit("No usable font found; edit FONT_CANDIDATES in this script.")


def draw_mark(draw, cx, cy, size, color, scale=1):
    """The Xeryo symbol: one full diagonal crossed by a broken diagonal."""
    unit = size * scale / 24.0
    stroke = max(1, round(2.2 * unit * (24 / 16)))  # heavier than the SVG for small sizes
    ox, oy = cx - 12 * unit, cy - 12 * unit

    def p(x, y):
        return (ox + x * unit, oy + y * unit)

    def line(a, b):
        draw.line([p(*a), p(*b)], fill=color, width=stroke)
        r = stroke / 2
        for x, y in (a, b):
            px, py = p(x, y)
            draw.ellipse([px - r, py - r, px + r, py + r], fill=color)

    line((4, 4), (20, 20))
    line((20, 4), (14.4, 9.6))
    line((9.6, 14.4), (4, 20))


def supersampled(width, height, painter, factor=4):
    image = Image.new("RGB", (width * factor, height * factor), INK)
    painter(ImageDraw.Draw(image), factor)
    return image.resize((width, height), Image.LANCZOS)


def icon(size, rounded=False):
    def paint(draw, f):
        s = size * f
        draw_mark(draw, s / 2, s / 2, s * 0.56, PAPER)

    img = supersampled(size, size, paint)
    if rounded:
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=size * 0.22, fill=255)
        out = Image.new("RGBA", img.size, (0, 0, 0, 0))
        out.paste(img, (0, 0), mask)
        return out
    return img


def social_preview():
    w, h = 1200, 630

    def paint(draw, f):
        # Growing nested squares, anchored bottom-right, echoing the homepage motif.
        # Kept clear of the headline so no text overlaps the artwork.
        unit = 50
        ax, ay = 1110 * f, 540 * f
        for i in range(1, 6):
            s = unit * i * f
            box = [ax - s, ay - s, ax, ay]
            if i == 1:
                draw.rectangle(box, fill=PAPER)
            else:
                draw.rectangle(box, outline=GRAY_LINE, width=2 * f)
        draw.line([(ax - unit * 5 * f, ay - unit * 5 * f), (ax, ay)], fill=PAPER, width=3 * f)

        draw_mark(draw, 120 * f + 28 * f, 120 * f + 28 * f, 56 * f, PAPER)
        draw.text((192 * f, 118 * f), "Xeryo", font=load_font(FONT_CANDIDATES, 58 * f), fill=PAPER)

        headline = load_font(FONT_CANDIDATES, 68 * f)
        y = 262 * f
        for line in ("Building technology", "for what comes next."):
            draw.text((120 * f, y), line, font=headline, fill=PAPER)
            y += 88 * f

        draw.text(
            (120 * f, 500 * f),
            "One product today. A bigger vision for tomorrow.",
            font=load_font(FONT_REGULAR_CANDIDATES, 28 * f),
            fill=GRAY_TEXT,
        )

    return supersampled(w, h, paint, factor=3)


def main():
    icons_dir = os.path.join(ROOT, "assets", "icons")
    images_dir = os.path.join(ROOT, "assets", "images")
    os.makedirs(icons_dir, exist_ok=True)
    os.makedirs(images_dir, exist_ok=True)

    social_preview().save(os.path.join(images_dir, "xeryo-social-preview.png"), optimize=True)
    icon(512).save(os.path.join(icons_dir, "xeryo-logo-512.png"), optimize=True)
    icon(192).save(os.path.join(icons_dir, "icon-192.png"), optimize=True)
    icon(180).save(os.path.join(icons_dir, "apple-touch-icon.png"), optimize=True)

    base = icon(256, rounded=True)
    base.save(os.path.join(ROOT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    print("Brand assets written.")


if __name__ == "__main__":
    main()
