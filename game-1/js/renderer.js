import {
  CANVAS_W, CANVAS_H,
  GRID_X0, GRID_Y0, GRID_COLS, GRID_ROWS, CELL_W, CELL_H,
  COLORS,
} from './config.js';
import { renderUI } from './ui.js';

export function renderScene(ctx, game) {
  drawSky(ctx);
  drawHouse(ctx);
  drawLawn(ctx);
  drawSpawnArea(ctx);
  drawTopBarBg(ctx);

  for (const m of game.mowers) m.render(ctx);

  // Sort plants and zombies by y for correct layering (back to front)
  const sortedPlants = [...game.plants].sort((a, b) => a.y - b.y);
  for (const p of sortedPlants) p.render(ctx);

  for (const s of game.suns) s.render(ctx);

  const sortedZombies = [...game.zombies].sort((a, b) => a.y - b.y);
  for (const z of sortedZombies) z.render(ctx);

  for (const p of game.projectiles) p.render(ctx);
  for (const p of game.particles) p.render(ctx);

  renderUI(ctx, game);
}

function drawSky(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, GRID_Y0);
  grad.addColorStop(0, '#87ceeb');
  grad.addColorStop(1, '#b9e3f5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, GRID_Y0);
  // distant clouds
  drawCloud(ctx, 200, 35, 0.6);
  drawCloud(ctx, 540, 22, 0.8);
  drawCloud(ctx, 820, 45, 0.5);
}

function drawCloud(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(-30, 0, 18, 0, Math.PI * 2);
  ctx.arc(0, -10, 22, 0, Math.PI * 2);
  ctx.arc(28, -2, 18, 0, Math.PI * 2);
  ctx.arc(15, 8, 16, 0, Math.PI * 2);
  ctx.arc(-12, 8, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHouse(ctx) {
  // wall
  const wallGrad = ctx.createLinearGradient(0, GRID_Y0, GRID_X0, GRID_Y0);
  wallGrad.addColorStop(0, '#e8d090');
  wallGrad.addColorStop(1, COLORS.houseWall);
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, GRID_Y0, GRID_X0, CANVAS_H - GRID_Y0);

  // roof gable on top of wall
  ctx.fillStyle = COLORS.houseRoof;
  ctx.beginPath();
  ctx.moveTo(0, GRID_Y0);
  ctx.lineTo(GRID_X0, GRID_Y0 - 35);
  ctx.lineTo(GRID_X0, GRID_Y0);
  ctx.closePath();
  ctx.fill();
  // roof shingles texture
  ctx.strokeStyle = '#3d2410';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, GRID_Y0 - i * 8);
    ctx.lineTo(GRID_X0 - i * 16, GRID_Y0 - 35 + i * 8);
    ctx.stroke();
  }

  // door
  ctx.fillStyle = '#3d2410';
  ctx.fillRect(GRID_X0 - 30, GRID_Y0 + 130, 22, 50);
  ctx.fillStyle = '#ffd24a';
  ctx.beginPath();
  ctx.arc(GRID_X0 - 14, GRID_Y0 + 158, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // windows
  drawWindow(ctx, 12, GRID_Y0 + 30);
  drawWindow(ctx, 12, GRID_Y0 + 250);
  drawWindow(ctx, 38, GRID_Y0 + 30);
  drawWindow(ctx, 38, GRID_Y0 + 250);
}

function drawWindow(ctx, x, y) {
  ctx.fillStyle = '#3d2410';
  ctx.fillRect(x - 1, y - 1, 22, 32);
  const grad = ctx.createLinearGradient(x, y, x, y + 30);
  grad.addColorStop(0, '#a8d4ff');
  grad.addColorStop(1, '#5e9cd6');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, 20, 30);
  ctx.strokeStyle = '#3d2410';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + 10, y); ctx.lineTo(x + 10, y + 30);
  ctx.moveTo(x, y + 15); ctx.lineTo(x + 20, y + 15);
  ctx.stroke();
}

function drawLawn(ctx) {
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const isLight = (r + c) % 2 === 0;
      ctx.fillStyle = isLight ? COLORS.lawnLight : COLORS.lawnDark;
      ctx.fillRect(GRID_X0 + c * CELL_W, GRID_Y0 + r * CELL_H, CELL_W, CELL_H);
    }
  }
  // subtle grid lines
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  for (let r = 0; r <= GRID_ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(GRID_X0, GRID_Y0 + r * CELL_H);
    ctx.lineTo(GRID_X0 + GRID_COLS * CELL_W, GRID_Y0 + r * CELL_H);
    ctx.stroke();
  }
  for (let c = 0; c <= GRID_COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(GRID_X0 + c * CELL_W, GRID_Y0);
    ctx.lineTo(GRID_X0 + c * CELL_W, GRID_Y0 + GRID_ROWS * CELL_H);
    ctx.stroke();
  }
}

function drawSpawnArea(ctx) {
  const x = GRID_X0 + GRID_COLS * CELL_W;
  // tombstones / soil patch
  const soilGrad = ctx.createLinearGradient(x, GRID_Y0, CANVAS_W, GRID_Y0);
  soilGrad.addColorStop(0, '#5a3018');
  soilGrad.addColorStop(1, COLORS.spawnSoil);
  ctx.fillStyle = soilGrad;
  ctx.fillRect(x, GRID_Y0, CANVAS_W - x, GRID_ROWS * CELL_H);
  // tombstone hint
  ctx.fillStyle = '#777';
  ctx.fillRect(x + 5, GRID_Y0 + 10, 18, 28);
  ctx.beginPath();
  ctx.arc(x + 14, GRID_Y0 + 10, 9, Math.PI, 0);
  ctx.fill();
}

function drawTopBarBg(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, GRID_Y0);
  grad.addColorStop(0, '#5a3a1a');
  grad.addColorStop(1, '#3d2410');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, 50);
  // wood plank lines
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (let y = 12; y < 50; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
  }
}
