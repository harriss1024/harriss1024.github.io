import { CANVAS_W, CANVAS_H, PLANTS } from './config.js';
import { GameState } from './game.js';
import { Input } from './input.js';
import { renderScene } from './renderer.js';
import { cardAt, pauseButtonHit, endScreenButtonHit } from './ui.js';
import { createPlant, getPlantCtor } from './plants.js';
import { pixelToCell, colToX, rowToY } from './grid.js';
import { spawnMowers } from './mower.js';
import { level1 } from './levels.js';
import { spawnHit, spawnPlantingPoof } from './particles.js';
import { play } from './audio.js';
import { createZombie } from './zombies.js';
import { preloadAssets } from './assets.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// HiDPI / Retina-friendly canvas:
// Game logic uses 1000×600 logical coords, but the canvas backing buffer
// is rendered at 2×–3× density so high-res character images stay crisp
// after both downsampling and the CSS transform-based fit-to-window scale.
const BACKING_SCALE = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);
canvas.width = CANVAS_W * BACKING_SCALE;
canvas.height = CANVAS_H * BACKING_SCALE;
canvas.style.width = CANVAS_W + 'px';
canvas.style.height = CANVAS_H + 'px';
ctx.scale(BACKING_SCALE, BACKING_SCALE);
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

preloadAssets();

const game = new GameState();
const input = new Input(canvas);

game.onHitParticles = (x, y, snow) => spawnHit(game, x, y, snow);

spawnMowers(game);
game.loadLevel(level1);

const TIMESTEP = 1000 / 60;
let lastTime = performance.now();
let accumulator = 0;

function update(dt) {
  for (const click of input.drainClicks()) {
    handleClick(click.x, click.y);
  }
  game.update(dt);
  game.cullDead();
}

function occupied(col, row) {
  return game.plants.some(p => p.col === col && p.row === row && !p.isDead);
}

function handleClick(x, y) {
  // end screen restart
  if (game.over) {
    if (endScreenButtonHit(x, y)) location.reload();
    return;
  }

  // pause toggle (always available)
  if (pauseButtonHit(x, y)) {
    game.paused = !game.paused;
    return;
  }

  if (game.paused) return;

  // 1) collect sun
  for (const sun of game.suns) {
    if (!sun.collected && sun.hitTest(x, y)) {
      sun.collect(50, 30);
      game.sun += sun.value;
      play('collectSun');
      return;
    }
  }

  // 2) plant card click
  const id = cardAt(x, y);
  if (id) {
    if (game.selectedPlant === id) {
      game.selectedPlant = null;
      return;
    }
    const cfg = PLANTS[id];
    const cd = game.cardCooldowns[id] || 0;
    if (game.sun >= cfg.cost && cd <= 0) {
      game.selectedPlant = id;
    }
    return;
  }

  // 3) plant placement
  if (game.selectedPlant) {
    const cell = pixelToCell(x, y);
    if (cell && !occupied(cell.col, cell.row)) {
      const pid = game.selectedPlant;
      const cfg = PLANTS[pid];
      if (game.sun >= cfg.cost) {
        game.plants.push(createPlant(pid, cell.col, cell.row));
        game.sun -= cfg.cost;
        game.cardCooldowns[pid] = cfg.cooldown;
        game.selectedPlant = null;
        play('plant');
        spawnPlantingPoof(game, colToX(cell.col), rowToY(cell.row) + 30);
      }
      return;
    }
    if (cell) return; // clicked on occupied cell — keep selection
    // clicked outside grid: deselect
    game.selectedPlant = null;
    return;
  }
}

function render() {
  renderScene(ctx, game);

  // ghost plant preview
  if (game.selectedPlant && !game.over && !game.paused) {
    const cell = pixelToCell(input.mouseX, input.mouseY);
    if (cell) {
      const x = 70 + cell.col * 80;
      const y = 90 + cell.row * 96;
      const isOccupied = occupied(cell.col, cell.row);
      ctx.fillStyle = isOccupied ? 'rgba(255, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(x, y, 80, 96);
      ctx.strokeStyle = isOccupied ? 'rgba(255, 80, 80, 0.7)' : 'rgba(255, 230, 100, 0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, 78, 94);
      if (!isOccupied) {
        const Ctor = getPlantCtor(game.selectedPlant);
        if (Ctor) {
          const ghost = new Ctor(cell.col, cell.row);
          ghost.spawnT = 1;
          ctx.save();
          ctx.globalAlpha = 0.55;
          ghost.render(ctx);
          ctx.restore();
        }
      }
    }
  }
}

function loop(now) {
  accumulator += now - lastTime;
  lastTime = now;
  // clamp to avoid spiral of death after tab inactivity
  if (accumulator > 250) accumulator = 250;
  while (accumulator >= TIMESTEP) {
    update(TIMESTEP / 1000);
    accumulator -= TIMESTEP;
  }
  render();
  requestAnimationFrame(loop);
}

function fitCanvas() {
  const container = document.getElementById('game-container');
  const scale = Math.min(
    container.clientWidth / CANVAS_W,
    container.clientHeight / CANVAS_H
  );
  canvas.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', fitCanvas);
window.addEventListener('orientationchange', fitCanvas);
fitCanvas();

requestAnimationFrame(loop);

// optional: dev hooks for debugging — toggle via ?dev in URL
if (location.search.includes('dev')) {
  window.game = game;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'z') game.zombies.push(createZombie('basic', Math.floor(Math.random() * 5)));
    if (e.key === 'x') game.zombies.push(createZombie('cone', Math.floor(Math.random() * 5)));
    if (e.key === 'c') game.zombies.push(createZombie('bucket', Math.floor(Math.random() * 5)));
    if (e.key === 's') game.sun += 100;
  });
  console.log('Dev mode: window.game exposed; z/x/c spawn zombies; s adds 100 sun');
}
