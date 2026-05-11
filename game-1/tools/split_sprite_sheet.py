#!/usr/bin/env python3
"""Split a sprite sheet into N transparent PNG frames.

Designed for AI-generated walk-cycle sheets. Handles:
  - Grid layout with optional empty trailing cells (e.g. 5 frames in a 3x2 grid)
  - White outer border AND magenta in-cell background — both become transparent,
    using connected-component flood-fill from edges so internal whites/magentas
    (eye whites, etc.) survive.
  - Optional top crop per cell to remove numeric labels ("1", "2", …).
  - Optional auto-trim to the character's tight bounding box.

Usage:
  python3 tools/split_sprite_sheet.py <sheet.png> <out-prefix> \\
    --grid 3x2 --frames 5 \\
    [--top-crop 60] [--trim] [--padding 8]

Example:
  python3 tools/split_sprite_sheet.py images/zombie_groups.png images/zombie_walk \\
      --grid 3x2 --frames 5 --top-crop 70 --trim
  → produces images/zombie_walk_0.png … images/zombie_walk_4.png
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_dilation


def is_bg_pixel(arr, ref_colors, tolerance=40):
    """Mask of pixels close to any reference color (RGB only)."""
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    mask = np.zeros(r.shape, dtype=bool)
    for cr, cg, cb in ref_colors:
        m = (np.abs(r.astype(int) - cr) <= tolerance) & \
            (np.abs(g.astype(int) - cg) <= tolerance) & \
            (np.abs(b.astype(int) - cb) <= tolerance)
        mask |= m
    return mask


def detect_runs(white_frac, threshold=0.85, expected=None):
    """Given a 1D array of white-fraction per index, find runs of "content"
    (where white_frac < threshold)."""
    is_content = white_frac < threshold
    ranges = []
    in_run = False
    run_start = 0
    for i, c in enumerate(is_content):
        if c and not in_run:
            run_start = i
            in_run = True
        elif not c and in_run:
            ranges.append((run_start, i))
            in_run = False
    if in_run:
        ranges.append((run_start, len(is_content)))

    if ranges:
        avg = np.median([r1 - r0 for r0, r1 in ranges])
        ranges = [r for r in ranges if (r[1] - r[0]) >= avg * 0.4]

    if expected is not None and len(ranges) != expected:
        return None
    return ranges


def detect_cell_grid(sheet, n_cols, n_rows):
    """Detect cell column and row boundaries.

    Strategy: rows first (gaps are usually clean) → then columns scanned ONLY
    within the first row band (where characters are less likely to spill into
    column gaps).
    """
    r, g, b = sheet[..., 0], sheet[..., 1], sheet[..., 2]
    is_white = (r > 240) & (g > 240) & (b > 240)

    # Detect row bands by averaging across all columns
    row_white = is_white.mean(axis=1)
    row_ranges = detect_runs(row_white, expected=n_rows)
    if row_ranges is None:
        return None, None

    # Detect columns using ONLY the first row band (top band has cleaner gaps)
    y0, y1 = row_ranges[0]
    col_white = is_white[y0:y1].mean(axis=0)
    col_ranges = detect_runs(col_white, expected=n_cols)
    if col_ranges is None:
        return None, None

    return col_ranges, row_ranges


def keep_largest_blob(arr, min_size_ratio=0.05):
    """Keep only the largest connected component of opaque pixels.
    Useful when characters from neighboring cells leak across cell borders.
    """
    alpha = arr[..., 3]
    opaque = alpha > 10
    if not opaque.any():
        return arr
    labeled, n = label(opaque)
    if n <= 1:
        return arr
    sizes = np.bincount(labeled.ravel())
    sizes[0] = 0  # ignore background label
    largest_label = int(sizes.argmax())
    largest_size = sizes[largest_label]
    # If multiple "characters" exist, drop everything smaller than the largest
    keep = labeled == largest_label
    drop = opaque & ~keep
    arr[drop, 3] = 0
    return arr


def remove_edge_connected_bg(arr, bg_colors, tolerance=40):
    """Set alpha=0 on background pixels connected to any image edge."""
    h, w = arr.shape[:2]
    bg_candidate = is_bg_pixel(arr, bg_colors, tolerance)
    labeled, _ = label(bg_candidate)
    edge_labels = set()
    edge_labels.update(labeled[0, :].tolist())
    edge_labels.update(labeled[-1, :].tolist())
    edge_labels.update(labeled[:, 0].tolist())
    edge_labels.update(labeled[:, -1].tolist())
    edge_labels.discard(0)
    if not edge_labels:
        return arr
    keep_mask = np.isin(labeled, list(edge_labels))
    arr[keep_mask, 3] = 0
    # Soft feather to reduce jaggies
    boundary = binary_dilation(keep_mask) & ~keep_mask
    arr[boundary, 3] = np.minimum(arr[boundary, 3], 200)
    return arr


def trim_to_content(arr, padding=8):
    """Crop to the bounding box of opaque pixels, with given padding."""
    alpha = arr[..., 3]
    rows = np.any(alpha > 10, axis=1)
    cols = np.any(alpha > 10, axis=0)
    if not rows.any() or not cols.any():
        return arr
    r0, r1 = np.argmax(rows), len(rows) - 1 - np.argmax(rows[::-1])
    c0, c1 = np.argmax(cols), len(cols) - 1 - np.argmax(cols[::-1])
    r0 = max(0, r0 - padding)
    r1 = min(arr.shape[0] - 1, r1 + padding)
    c0 = max(0, c0 - padding)
    c1 = min(arr.shape[1] - 1, c1 + padding)
    return arr[r0:r1 + 1, c0:c1 + 1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet', help='input sprite sheet PNG')
    ap.add_argument('out_prefix', help='output prefix, e.g. images/zombie_walk')
    ap.add_argument('--grid', required=True, help='grid layout, e.g. 3x2 (cols x rows)')
    ap.add_argument('--frames', type=int, required=True, help='number of valid frames')
    ap.add_argument('--top-crop', type=int, default=0, help='pixels to crop off the top of each cell (for number labels)')
    ap.add_argument('--bg', nargs='*', default=['#FFFFFF', '#FF00FF'],
                    help='background colors in hex (default: white + magenta)')
    ap.add_argument('--tolerance', type=int, default=45, help='RGB tolerance for bg detection')
    ap.add_argument('--trim', action='store_true', help='crop each frame to character bounding box')
    ap.add_argument('--padding', type=int, default=12, help='padding around character when --trim')
    ap.add_argument('--align', choices=['none', 'bottom-center'], default='bottom-center',
                    help='align all frames so feet-center is at the same canvas position (default: bottom-center)')
    args = ap.parse_args()

    cols, rows = map(int, args.grid.lower().split('x'))
    img = Image.open(args.sheet).convert('RGBA')
    sheet = np.array(img)
    H, W = sheet.shape[:2]

    # Auto-detect actual cell boundaries by finding white-gap rows/cols.
    # AI sprite sheets often have padding between cells; even-grid split
    # will bisect characters when characters extend toward cell edges.
    cell_x_ranges, cell_y_ranges = detect_cell_grid(sheet, cols, rows)

    if cell_x_ranges and cell_y_ranges:
        print(f'Auto-detected cell layout:')
        print(f'  columns: {cell_x_ranges}')
        print(f'  rows:    {cell_y_ranges}')
    else:
        # fall back to even split
        cw = W // cols
        ch = H // rows
        cell_x_ranges = [(c * cw, (c + 1) * cw) for c in range(cols)]
        cell_y_ranges = [(r * ch, (r + 1) * ch) for r in range(rows)]
        print('Auto-detect failed; using even-grid split')

    cell_w = max(x1 - x0 for x0, x1 in cell_x_ranges)
    cell_h = max(y1 - y0 for y0, y1 in cell_y_ranges)

    bg_colors = []
    for hexs in args.bg:
        h = hexs.lstrip('#')
        bg_colors.append((int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)))

    print(f'Sheet: {W}x{H}  | grid {cols}x{rows} | cell {cell_w}x{cell_h}')
    print(f'Frames: {args.frames}  | top-crop: {args.top_crop}px  | bg colors: {bg_colors}')

    out_dir = os.path.dirname(args.out_prefix) or '.'
    os.makedirs(out_dir, exist_ok=True)

    # Pass 1: extract cells, remove backgrounds, compute per-frame opaque bbox
    raw_frames = []
    bboxes = []
    frame_idx = 0
    for r in range(rows):
        for c in range(cols):
            if frame_idx >= args.frames:
                break
            x0, x1 = cell_x_ranges[c]
            y_start, y_end = cell_y_ranges[r]
            y0 = y_start + args.top_crop
            y1 = y_end
            cell = sheet[y0:y1, x0:x1].copy()
            cell = remove_edge_connected_bg(cell, bg_colors, args.tolerance)
            cell = keep_largest_blob(cell)
            raw_frames.append(cell)

            alpha = cell[..., 3]
            rows_mask = np.any(alpha > 10, axis=1)
            cols_mask = np.any(alpha > 10, axis=0)
            if rows_mask.any() and cols_mask.any():
                r0 = int(np.argmax(rows_mask))
                r1 = int(len(rows_mask) - 1 - np.argmax(rows_mask[::-1]))
                c0 = int(np.argmax(cols_mask))
                c1 = int(len(cols_mask) - 1 - np.argmax(cols_mask[::-1]))
            else:
                r0, r1, c0, c1 = 0, cell.shape[0] - 1, 0, cell.shape[1] - 1
            bboxes.append((r0, r1, c0, c1))
            frame_idx += 1

    # Pass 2: compute output canvas size and per-frame anchor offsets
    if args.align == 'bottom-center':
        # max width above/below the foot center; max height above the feet
        max_above = 0   # pixels above feet (feet at bottom)
        max_left = 0    # pixels left of feet center
        max_right = 0   # pixels right of feet center
        for cell, (r0, r1, c0, c1) in zip(raw_frames, bboxes):
            cx = (c0 + c1) // 2
            max_above = max(max_above, r1 - r0)
            max_left = max(max_left, cx - c0)
            max_right = max(max_right, c1 - cx)
        out_w = max_left + max_right + 2 * args.padding
        out_h = max_above + 2 * args.padding
        anchor_x = max_left + args.padding
        anchor_y = out_h - args.padding
        print(f'Aligned canvas: {out_w}x{out_h}  (anchor at {anchor_x},{anchor_y})')
    else:
        out_w = cell_w
        out_h = cell_h - args.top_crop

    # Pass 3: write aligned frames
    for i, (cell, (r0, r1, c0, c1)) in enumerate(zip(raw_frames, bboxes)):
        if args.align == 'bottom-center':
            cx = (c0 + c1) // 2
            char_w = c1 - c0 + 1
            char_h = r1 - r0 + 1
            out = np.zeros((out_h, out_w, 4), dtype=np.uint8)
            # paste so character's bottom-center lands at (anchor_x, anchor_y)
            paste_x = anchor_x - (cx - c0)
            paste_y = anchor_y - char_h
            out[paste_y:paste_y + char_h, paste_x:paste_x + char_w] = cell[r0:r1 + 1, c0:c1 + 1]
        else:
            out = cell

        out_path = f'{args.out_prefix}_{i}.png'
        Image.fromarray(out).save(out_path)
        opaque = (out[..., 3] > 10).sum()
        total = out.shape[0] * out.shape[1]
        print(f'  frame {i}: {out.shape[1]}x{out.shape[0]} ({100*opaque/total:.1f}% opaque)  -> {out_path}')

    print(f'\nDone — produced {len(raw_frames)} frames')


if __name__ == '__main__':
    main()
