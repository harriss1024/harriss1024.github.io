import { GRID_COLS, GRID_ROWS, CELL_W, CELL_H, GRID_X0, GRID_Y0 } from './config.js';

export function colToX(col) {
  return GRID_X0 + col * CELL_W + CELL_W / 2;
}

export function rowToY(row) {
  return GRID_Y0 + row * CELL_H + CELL_H / 2;
}

export function cellRect(col, row) {
  return {
    x: GRID_X0 + col * CELL_W,
    y: GRID_Y0 + row * CELL_H,
    w: CELL_W,
    h: CELL_H,
  };
}

export function pixelToCell(px, py) {
  const col = Math.floor((px - GRID_X0) / CELL_W);
  const row = Math.floor((py - GRID_Y0) / CELL_H);
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
  return { col, row };
}

export function gridXToPixel(gridX) {
  return GRID_X0 + gridX * CELL_W;
}

export function pixelToGridX(px) {
  return (px - GRID_X0) / CELL_W;
}
