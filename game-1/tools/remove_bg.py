#!/usr/bin/env python3
"""Remove the solid background of a character image and write a properly
transparent PNG.

Default mode: 'white' — strips near-white backgrounds (works for default AI output).
Color mode:    pass `--bg <hex>` to target a chroma-key color (e.g. #FF00FF
               for magenta), which is far more accurate.

Algorithm:
  1. Build a mask of "background-like" pixels (close to the target color
     within `--tolerance`).
  2. Keep only connected components of that mask that touch the image edges —
     so internal pixels matching the bg color (rare) survive.
  3. Set alpha=0 for those pixels.
  4. Feather the alpha edge by 1 pixel to soften jaggies.

Usage:
  # White background (default)
  python3 tools/remove_bg.py images/x.png --inplace

  # Chroma-key magenta — far more accurate (recommended)
  python3 tools/remove_bg.py images/x.png --inplace --bg "#FF00FF"

  # Any specific color
  python3 tools/remove_bg.py images/x.png --inplace --bg "#00FFFF" --tolerance 40
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_dilation


def remove_background(input_path, output_path, threshold=230, bg_color=None,
                      tolerance=40, feather=True):
    img = Image.open(input_path).convert('RGBA')
    arr = np.array(img)
    h, w = arr.shape[:2]
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

    if bg_color is not None:
        # Chroma-key mode: target a specific RGB color
        br, bg, bb = bg_color
        dr = np.abs(r.astype(np.int32) - br)
        dg = np.abs(g.astype(np.int32) - bg)
        db = np.abs(b.astype(np.int32) - bb)
        bg_mask = (dr <= tolerance) & (dg <= tolerance) & (db <= tolerance)
    else:
        # White-background mode (legacy)
        near_white = (r >= threshold) & (g >= threshold) & (b >= threshold)
        max_c = np.maximum(np.maximum(r, g), b).astype(np.int32)
        min_c = np.minimum(np.minimum(r, g), b).astype(np.int32)
        low_sat = (max_c - min_c) <= 25
        bg_mask = near_white & low_sat

    # 2. Keep only connected components that touch any edge
    labeled, n_components = label(bg_mask)
    edge_labels = set()
    edge_labels.update(labeled[0, :].tolist())
    edge_labels.update(labeled[-1, :].tolist())
    edge_labels.update(labeled[:, 0].tolist())
    edge_labels.update(labeled[:, -1].tolist())
    edge_labels.discard(0)

    if not edge_labels:
        print('  ! no background touches the edges — nothing to remove')
        img.save(output_path)
        return

    keep_mask = np.isin(labeled, list(edge_labels))

    # 3. Apply transparency
    arr[keep_mask, 3] = 0

    # 4. Feather the edge: pixels right next to transparent regions get
    #    semi-transparency to soften jaggies
    if feather:
        boundary = binary_dilation(keep_mask) & ~keep_mask
        arr[boundary, 3] = np.minimum(arr[boundary, 3], 180)

    # 5. Stats
    transparent = int((arr[..., 3] == 0).sum())
    total = h * w
    print(f'  {transparent:,} / {total:,} pixels now transparent ({100*transparent/total:.1f}%)')

    Image.fromarray(arr).save(output_path)
    print(f'  saved {output_path}')


def parse_hex(s):
    s = s.lstrip('#')
    if len(s) != 6:
        raise argparse.ArgumentTypeError(f'expected hex color like #FF00FF, got {s}')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input', help='input PNG path')
    ap.add_argument('output', nargs='?', help='output PNG path (default: <input>_transparent.png)')
    ap.add_argument('--bg', type=parse_hex, default=None,
                    help='target background color as hex, e.g. "#FF00FF" (recommended for chroma-key generation)')
    ap.add_argument('--tolerance', type=int, default=40,
                    help='RGB tolerance around --bg color (default 40)')
    ap.add_argument('--threshold', type=int, default=230,
                    help='[white-bg mode only] brightness threshold (default 230, ignored if --bg set)')
    ap.add_argument('--no-feather', action='store_true', help='skip soft-edge feathering')
    ap.add_argument('--inplace', action='store_true', help='overwrite the input file')
    args = ap.parse_args()

    if args.inplace:
        out = args.input
    elif args.output:
        out = args.output
    else:
        base, ext = os.path.splitext(args.input)
        out = f'{base}_transparent{ext}'

    mode = f'chroma-key {args.bg}' if args.bg else f'white (threshold {args.threshold})'
    print(f'Processing {args.input}  ->  {out}  [mode: {mode}]')
    remove_background(args.input, out,
                      threshold=args.threshold,
                      bg_color=args.bg,
                      tolerance=args.tolerance,
                      feather=not args.no_feather)


if __name__ == '__main__':
    main()
