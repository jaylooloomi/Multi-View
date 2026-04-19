#!/usr/bin/env python3
"""Generate Multi-View Chrome extension icons at 16, 32, 48, and 128px."""

import os
from PIL import Image, ImageDraw

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# Color palette
BG_COLOR        = (13, 13, 13, 255)       # #0d0d0d  near-black background
SCREEN_COLOR    = (26, 26, 46, 255)       # #1a1a2e  dark blue-grey screen fill
GAP_COLOR       = (51, 51, 51, 255)       # #333333  grid gap / separator
PLAY_COLOR      = (255, 80, 40, 255)      # red-orange play triangle


def draw_icon(size: int, padding: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # --- Outer rounded rectangle (background) ---
    corner_r = max(2, size // 10)
    draw.rounded_rectangle(
        [0, 0, size - 1, size - 1],
        radius=corner_r,
        fill=BG_COLOR,
    )

    # --- 2×2 grid of screens ---
    inner = size - 2 * padding          # total drawable area
    gap = max(1, size // 24)            # gap between cells

    cell_w = (inner - gap) // 2
    cell_h = (inner - gap) // 2

    positions = [
        (padding,           padding),            # top-left
        (padding + cell_w + gap, padding),       # top-right
        (padding,           padding + cell_h + gap),  # bottom-left
        (padding + cell_w + gap, padding + cell_h + gap),  # bottom-right
    ]

    cell_corner = max(1, size // 32)

    for i, (x, y) in enumerate(positions):
        draw.rounded_rectangle(
            [x, y, x + cell_w - 1, y + cell_h - 1],
            radius=cell_corner,
            fill=SCREEN_COLOR,
        )

    # --- Play triangle on bottom-right cell ---
    bx, by = positions[3]
    cx = bx + cell_w // 2
    cy = by + cell_h // 2

    tri_h = max(3, int(cell_h * 0.45))
    tri_w = max(2, int(tri_h * 0.87))   # equilateral-ish

    t_left   = (cx - tri_w // 2,     cy - tri_h // 2)
    t_right  = (cx - tri_w // 2 + tri_w, cy)
    t_bottom = (cx - tri_w // 2,     cy + tri_h // 2)

    draw.polygon([t_left, t_right, t_bottom], fill=PLAY_COLOR)

    return img


SIZES = {
    128: 8,
    48:  3,
    32:  2,
    16:  1,
}

for size, padding in SIZES.items():
    icon = draw_icon(size, padding)
    path = os.path.join(OUTPUT_DIR, f"icon{size}.png")
    icon.save(path, "PNG")
    print(f"Saved {path}  ({size}x{size})")

print("Done.")
