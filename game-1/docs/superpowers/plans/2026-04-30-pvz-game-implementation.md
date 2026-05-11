# Plants vs Zombies Web Game v1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-level, fully playable PvZ web game per the design spec at `docs/superpowers/specs/2026-04-30-pvz-game-design.md`.

**Architecture:** Vanilla ES Modules, HTML5 Canvas 2D, fixed-step game loop, modular entity system. No build step — `index.html` opens directly in a browser.

**Tech Stack:** HTML5 Canvas, ES Modules, Web Audio API, vanilla JavaScript (no frameworks, no bundler).

**Verification approach:** Each phase ends with a manual smoke test (open `index.html` in a browser, perform specific actions, observe expected behavior). Game code is heavily visual/temporal — automated unit tests for rendering and timing have low value, so we rely on focused manual checks at every commit.

**Working directory:** `/Users/harris/www/harris/harris-1024.github.io/game-1/`

---

## File Structure (final)

```
game-1/
├── index.html
├── css/
│   └── style.css
└── js/
    ├── main.js          # Entry, game loop
    ├── config.js        # All numeric constants
    ├── game.js          # GameState class
    ├── grid.js          # Coordinate conversion
    ├── plants.js        # 6 plants
    ├── zombies.js       # 3 zombies
    ├── projectiles.js   # Pea, snow pea
    ├── sun.js           # Sun entity
    ├── particles.js     # Particle effects
    ├── mower.js         # Lawnmower
    ├── renderer.js      # Canvas drawing
    ├── ui.js            # Cards, counters, screens
    ├── input.js         # Mouse + touch
    ├── audio.js         # Web Audio synthesis
    └── levels.js        # Level configs
```

---

## Phase 1: Project Skeleton

**Goal:** Have an `index.html` that opens in browser and shows a black canvas at correct internal dimensions, with a no-op game loop running.

### Task 1.1: HTML entry

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/main.js`

- [ ] **Step 1: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>植物大战僵尸</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="game-container">
    <canvas id="game-canvas" width="1000" height="600"></canvas>
  </div>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `css/style.css`**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #222; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
#game-container {
  width: 100vw; height: 100vh;
  display: flex; align-items: center; justify-content: center;
}
#game-canvas {
  background: #000;
  image-rendering: pixelated;
  transform-origin: center center;
  touch-action: none;
}
```

- [ ] **Step 3: Write minimal `js/main.js`**

```javascript
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const TIMESTEP = 1000 / 60;
let lastTime = performance.now();
let accumulator = 0;

function update(dt) {
  // empty for now
}

function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
}

function loop(now) {
  accumulator += now - lastTime;
  lastTime = now;
  while (accumulator >= TIMESTEP) {
    update(TIMESTEP / 1000);
    accumulator -= TIMESTEP;
  }
  render();
  requestAnimationFrame(loop);
}

function fitCanvas() {
  const container = document.getElementById('game-container');
  const scale = Math.min(container.clientWidth / 1000, container.clientHeight / 600);
  canvas.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

requestAnimationFrame(loop);
```

- [ ] **Step 4: Verify**

Open `index.html` in a browser. Expected:
- Black canvas centered on screen, "Loading..." text visible
- Canvas scales to fit window when resized
- No console errors

- [ ] **Step 5: Commit**

```bash
git add index.html css/style.css js/main.js
git commit -m "feat(game-1): project skeleton with empty game loop"
```

---

## Phase 2: Config and Game State Skeleton

**Goal:** Centralize all numeric constants in `config.js` and create a `GameState` skeleton in `game.js`.

### Task 2.1: Config constants

**Files:**
- Create: `js/config.js`

- [ ] **Step 1: Write `js/config.js`**

```javascript
export const CANVAS_W = 1000;
export const CANVAS_H = 600;

export const GRID_COLS = 9;
export const GRID_ROWS = 5;
export const CELL_W = 80;
export const CELL_H = 96;
export const GRID_X0 = 70;
export const GRID_Y0 = 90;

export const STARTING_SUN = 50;
export const SKY_SUN_INTERVAL = 10;
export const SKY_SUN_VALUE = 25;
export const SKY_SUN_LIFETIME = 10;
export const SUNFLOWER_INTERVAL = 24;
export const SUNFLOWER_SUN_VALUE = 25;

export const PROJECTILE_SPEED = 350;
export const PEA_DAMAGE = 20;
export const PEASHOOTER_FIRE_INTERVAL = 1.4;
export const SNOW_PEA_SLOW_FACTOR = 0.5;
export const SNOW_PEA_SLOW_DURATION = 4;

export const PLANTS = {
  sunflower:    { id: 'sunflower',    name: '向日葵',     cost: 50,  cooldown: 7.5,  hp: 300 },
  peashooter:   { id: 'peashooter',   name: '豌豆射手',   cost: 100, cooldown: 7.5,  hp: 300 },
  wallnut:      { id: 'wallnut',      name: '坚果墙',     cost: 50,  cooldown: 30,   hp: 4000 },
  cherrybomb:   { id: 'cherrybomb',   name: '樱桃炸弹',   cost: 150, cooldown: 50,   hp: Infinity },
  snowpea:      { id: 'snowpea',      name: '寒冰射手',   cost: 175, cooldown: 7.5,  hp: 300 },
  potatomine:   { id: 'potatomine',   name: '土豆雷',     cost: 25,  cooldown: 30,   hp: Infinity },
};

export const ZOMBIES = {
  basic:   { id: 'basic',   name: '普通僵尸', hp: 200,  speed: 32, biteDamage: 50, biteInterval: 0.5 },
  cone:    { id: 'cone',    name: '路障僵尸', hp: 560,  speed: 32, biteDamage: 50, biteInterval: 0.5, accessoryHp: 360 },
  bucket:  { id: 'bucket',  name: '铁桶僵尸', hp: 1300, speed: 32, biteDamage: 50, biteInterval: 0.5, accessoryHp: 1100 },
};

export const CHERRY_FUSE = 1.2;
export const POTATO_ARM_TIME = 14;
export const EXPLOSION_RADIUS_COLS = 1;

export const COLORS = {
  lawnLight: '#9ec648',
  lawnDark:  '#8ab83a',
  houseWall: '#f5e1a4',
  houseRoof: '#5d3a1a',
  spawnSoil: '#6b4226',
  woodDark:  '#8b5a2b',
  woodLight: '#d4a574',
  sunGold:   '#ffcc33',
  iceBlue:   '#9fd3e8',
  dangerRed: '#c44',
};
```

- [ ] **Step 2: Commit**

```bash
git add js/config.js
git commit -m "feat(game-1): add config constants module"
```

### Task 2.2: GameState skeleton

**Files:**
- Create: `js/game.js`
- Modify: `js/main.js`

- [ ] **Step 1: Write `js/game.js`**

```javascript
import { STARTING_SUN } from './config.js';

export class GameState {
  constructor() {
    this.sun = STARTING_SUN;
    this.time = 0;            // seconds since game start
    this.paused = false;
    this.over = false;
    this.victory = false;

    this.plants = [];
    this.zombies = [];
    this.projectiles = [];
    this.suns = [];
    this.particles = [];
    this.mowers = [];

    this.selectedPlant = null;
    this.cardCooldowns = {};  // { plantId: secondsRemaining }
    this.lastSkySunAt = 0;

    this.currentWave = 0;     // 0 = not started, 1/2/3 = active
    this.wavesFinished = false;
    this.zombiesScheduled = []; // [{ time, type, row }]
    this.zombiesSpawned = 0;
    this.zombiesTotal = 0;
  }

  update(dt) {
    if (this.paused || this.over) return;
    this.time += dt;
    // future phases populate this
  }

  cullDead() {
    this.plants = this.plants.filter(p => !p.isDead);
    this.zombies = this.zombies.filter(z => !z.isDead);
    this.projectiles = this.projectiles.filter(p => !p.isDead);
    this.suns = this.suns.filter(s => !s.isDead);
    this.particles = this.particles.filter(p => !p.isDead);
    this.mowers = this.mowers.filter(m => !m.isDead);
  }
}
```

- [ ] **Step 2: Update `js/main.js` to use GameState**

Replace contents with:

```javascript
import { CANVAS_W, CANVAS_H } from './config.js';
import { GameState } from './game.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const game = new GameState();

const TIMESTEP = 1000 / 60;
let lastTime = performance.now();
let accumulator = 0;

function update(dt) {
  game.update(dt);
  game.cullDead();
}

function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Sun: ${game.sun}  Time: ${game.time.toFixed(1)}s`, 20, 40);
}

function loop(now) {
  accumulator += now - lastTime;
  lastTime = now;
  while (accumulator >= TIMESTEP) {
    update(TIMESTEP / 1000);
    accumulator -= TIMESTEP;
  }
  render();
  requestAnimationFrame(loop);
}

function fitCanvas() {
  const container = document.getElementById('game-container');
  const scale = Math.min(container.clientWidth / CANVAS_W, container.clientHeight / CANVAS_H);
  canvas.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

requestAnimationFrame(loop);
```

- [ ] **Step 3: Verify**

Reload `index.html`. Expected: black canvas with "Sun: 50  Time: 0.0s" counting up. No console errors.

- [ ] **Step 4: Commit**

```bash
git add js/game.js js/main.js
git commit -m "feat(game-1): add GameState skeleton and integrate with loop"
```

---

## Phase 3: Grid System

**Goal:** Coordinate conversion utilities + visual grid.

### Task 3.1: Grid module

**Files:**
- Create: `js/grid.js`

- [ ] **Step 1: Write `js/grid.js`**

```javascript
import { GRID_COLS, GRID_ROWS, CELL_W, CELL_H, GRID_X0, GRID_Y0 } from './config.js';

export function colToX(col)   { return GRID_X0 + col * CELL_W + CELL_W / 2; }
export function rowToY(row)   { return GRID_Y0 + row * CELL_H + CELL_H / 2; }
export function cellRect(col, row) {
  return { x: GRID_X0 + col * CELL_W, y: GRID_Y0 + row * CELL_H, w: CELL_W, h: CELL_H };
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
```

- [ ] **Step 2: Commit**

```bash
git add js/grid.js
git commit -m "feat(game-1): add grid coordinate utilities"
```

---

## Phase 4: Renderer Foundation

**Goal:** Draw the lawn background (sky, house, lawn rows, spawn area, grid lines).

### Task 4.1: Renderer module — background

**Files:**
- Create: `js/renderer.js`
- Modify: `js/main.js`

- [ ] **Step 1: Write `js/renderer.js`**

```javascript
import { CANVAS_W, CANVAS_H, GRID_X0, GRID_Y0, GRID_COLS, GRID_ROWS, CELL_W, CELL_H, COLORS } from './config.js';

export function render(ctx, game) {
  drawSky(ctx);
  drawHouse(ctx);
  drawLawn(ctx);
  drawSpawnArea(ctx);
  drawGridDebug(ctx); // remove later
  drawTopBar(ctx, game);
}

function drawSky(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, GRID_Y0);
  grad.addColorStop(0, '#87ceeb');
  grad.addColorStop(1, '#b9e3f5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, GRID_Y0);
}

function drawHouse(ctx) {
  ctx.fillStyle = COLORS.houseWall;
  ctx.fillRect(0, GRID_Y0, GRID_X0, CANVAS_H - GRID_Y0);
  ctx.fillStyle = COLORS.houseRoof;
  ctx.beginPath();
  ctx.moveTo(0, GRID_Y0);
  ctx.lineTo(GRID_X0, GRID_Y0 - 30);
  ctx.lineTo(GRID_X0, GRID_Y0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3d2410';
  ctx.fillRect(GRID_X0 - 25, GRID_Y0 + 100, 18, 40);
  ctx.fillStyle = '#7faaff';
  ctx.fillRect(15, GRID_Y0 + 50, 30, 30);
  ctx.fillRect(15, GRID_Y0 + 200, 30, 30);
}

function drawLawn(ctx) {
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const isLight = (r + c) % 2 === 0;
      ctx.fillStyle = isLight ? COLORS.lawnLight : COLORS.lawnDark;
      ctx.fillRect(GRID_X0 + c * CELL_W, GRID_Y0 + r * CELL_H, CELL_W, CELL_H);
    }
  }
}

function drawSpawnArea(ctx) {
  const x = GRID_X0 + GRID_COLS * CELL_W;
  ctx.fillStyle = COLORS.spawnSoil;
  ctx.fillRect(x, GRID_Y0, CANVAS_W - x, GRID_ROWS * CELL_H);
}

function drawGridDebug(ctx) {
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
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

function drawTopBar(ctx, game) {
  ctx.fillStyle = COLORS.woodDark;
  ctx.fillRect(0, 0, CANVAS_W, GRID_Y0);
  drawSky(ctx);
}
```

- [ ] **Step 2: Update `js/main.js`**

Replace render function:

```javascript
import { render as renderScene } from './renderer.js';

// ...

function render() {
  renderScene(ctx, game);
}
```

- [ ] **Step 3: Verify**

Reload. Expected: Sky at top, house with door+windows on left, 5×9 alternating green lawn, brown spawn strip on right. No errors.

- [ ] **Step 4: Commit**

```bash
git add js/renderer.js js/main.js
git commit -m "feat(game-1): render lawn scene background"
```

---

## Phase 5: Sun Entity

**Goal:** Sun drops from sky every 10s, falls, sits on lawn, pulsates, expires after 10s. Click to collect (deferred to Phase 7 input — for now just spawn and render).

### Task 5.1: Sun entity

**Files:**
- Create: `js/sun.js`
- Modify: `js/game.js`

- [ ] **Step 1: Write `js/sun.js`**

```javascript
import { SKY_SUN_VALUE, SKY_SUN_LIFETIME, COLORS, GRID_X0, GRID_Y0, GRID_COLS, GRID_ROWS, CELL_W, CELL_H } from './config.js';

export class Sun {
  constructor(x, y, value, fromSky = true) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.vy = fromSky ? 50 : 0;        // px/s falling speed
    this.targetY = fromSky ? GRID_Y0 + Math.random() * (GRID_ROWS * CELL_H - 60) + 30 : y;
    this.life = SKY_SUN_LIFETIME;
    this.age = 0;
    this.collected = false;
    this.flyTo = null;     // {x, y} target when collected
    this.flyT = 0;
    this.flyStart = null;
    this.startX = x;
    this.startY = y;
    this.fromSunflower = !fromSky;
    if (this.fromSunflower) {
      // sunflower-spawned suns hop a bit
      this.vy = -120;
      this.gravity = 350;
      this.targetY = y + 30;
    }
    this.isDead = false;
  }

  update(dt) {
    if (this.collected) {
      this.flyT += dt;
      const t = Math.min(this.flyT / 0.5, 1);
      const ease = 1 - (1 - t) * (1 - t);
      this.x = this.flyStart.x + (this.flyTo.x - this.flyStart.x) * ease;
      this.y = this.flyStart.y + (this.flyTo.y - this.flyStart.y) * ease;
      if (t >= 1) this.isDead = true;
      return;
    }

    if (this.fromSunflower) {
      this.y += this.vy * dt;
      this.vy += this.gravity * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.vy = 0;
      }
    } else if (this.y < this.targetY) {
      this.y += this.vy * dt;
      if (this.y > this.targetY) this.y = this.targetY;
    }

    if (this.y >= this.targetY) {
      this.age += dt;
      if (this.age > this.life) this.isDead = true;
    }
  }

  collect(targetX, targetY) {
    if (this.collected) return;
    this.collected = true;
    this.flyTo = { x: targetX, y: targetY };
    this.flyStart = { x: this.x, y: this.y };
    this.flyT = 0;
  }

  render(ctx) {
    const t = performance.now() / 300;
    const pulse = 1 + Math.sin(t) * 0.05;
    const r = 22 * pulse;
    const grad = ctx.createRadialGradient(this.x, this.y, 4, this.x, this.y, r);
    grad.addColorStop(0, '#fff8a3');
    grad.addColorStop(0.6, COLORS.sunGold);
    grad.addColorStop(1, '#e89d00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a36b00';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  hitTest(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= 30 * 30;
  }
}

export function spawnSkySun(game) {
  const x = GRID_X0 + Math.random() * GRID_COLS * CELL_W;
  game.suns.push(new Sun(x, -20, SKY_SUN_VALUE, true));
}
```

- [ ] **Step 2: Wire sky-sun spawning into `game.js`**

Update `update(dt)` in `GameState`:

```javascript
import { SKY_SUN_INTERVAL } from './config.js';
import { spawnSkySun } from './sun.js';

// inside update(dt):
this.time += dt;
if (this.time - this.lastSkySunAt >= SKY_SUN_INTERVAL) {
  spawnSkySun(this);
  this.lastSkySunAt = this.time;
}
for (const s of this.suns) s.update(dt);
```

- [ ] **Step 3: Render suns in `renderer.js`**

Add at end of `render()`:

```javascript
for (const s of game.suns) s.render(ctx);
```

- [ ] **Step 4: Verify**

Reload. Expected: every 10 seconds a yellow glowing sun falls from top and lands somewhere on the lawn, sits pulsing, then disappears after 10s. Multiple can coexist.

- [ ] **Step 5: Commit**

```bash
git add js/sun.js js/game.js js/renderer.js
git commit -m "feat(game-1): sky-falling sun entity with pulse animation"
```

---

## Phase 6: Input System and Sun Collection

**Goal:** Click on a sun → fly to top-left counter → game.sun increases.

### Task 6.1: Input module

**Files:**
- Create: `js/input.js`
- Modify: `js/main.js`

- [ ] **Step 1: Write `js/input.js`**

```javascript
import { CANVAS_W, CANVAS_H } from './config.js';

export class Input {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.mouseX = 0;
    this.mouseY = 0;
    this.clickQueue = [];

    canvas.addEventListener('mousedown', (e) => this.onDown(e.clientX, e.clientY));
    canvas.addEventListener('mousemove', (e) => this.onMove(e.clientX, e.clientY));
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onDown(t.clientX, t.clientY);
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onMove(t.clientX, t.clientY);
    }, { passive: false });
  }

  toCanvas(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width * CANVAS_W;
    const y = (clientY - rect.top) / rect.height * CANVAS_H;
    return { x, y };
  }

  onDown(cx, cy) {
    const { x, y } = this.toCanvas(cx, cy);
    this.mouseX = x;
    this.mouseY = y;
    this.clickQueue.push({ x, y });
  }

  onMove(cx, cy) {
    const { x, y } = this.toCanvas(cx, cy);
    this.mouseX = x;
    this.mouseY = y;
  }

  drainClicks() {
    const q = this.clickQueue;
    this.clickQueue = [];
    return q;
  }
}
```

- [ ] **Step 2: Process clicks in `main.js`**

```javascript
import { Input } from './input.js';

const input = new Input(canvas, game);

function update(dt) {
  for (const click of input.drainClicks()) {
    handleClick(click.x, click.y);
  }
  game.update(dt);
  game.cullDead();
}

function handleClick(x, y) {
  // sun collection
  for (const sun of game.suns) {
    if (!sun.collected && sun.hitTest(x, y)) {
      sun.collect(50, 30);   // top-left counter target
      game.sun += sun.value;
      return;
    }
  }
}
```

- [ ] **Step 3: Verify**

Reload, wait for sun to fall. Click on it. Expected: sun flies to top-left and disappears, the "Sun: NN" counter increases by 25.

- [ ] **Step 4: Commit**

```bash
git add js/input.js js/main.js
git commit -m "feat(game-1): input handling and sun collection"
```

---

## Phase 7: UI Module — Sun counter, plant cards (visual only)

**Goal:** Polished sun counter at top-left. Plant card bar at top-right area showing all 6 plants with cost, cooldown overlay, click selection.

### Task 7.1: UI rendering

**Files:**
- Create: `js/ui.js`
- Modify: `js/renderer.js`
- Modify: `js/main.js`

- [ ] **Step 1: Write `js/ui.js`**

```javascript
import { CANVAS_W, COLORS, PLANTS } from './config.js';

const CARD_W = 70;
const CARD_H = 80;
const CARD_GAP = 6;
const CARD_BAR_X = 100;
const CARD_BAR_Y = 5;

const CARD_ORDER = ['sunflower', 'peashooter', 'wallnut', 'cherrybomb', 'snowpea', 'potatomine'];

export function getCardRect(index) {
  return {
    x: CARD_BAR_X + index * (CARD_W + CARD_GAP),
    y: CARD_BAR_Y,
    w: CARD_W,
    h: CARD_H,
  };
}

export function cardAt(x, y) {
  for (let i = 0; i < CARD_ORDER.length; i++) {
    const r = getCardRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      return CARD_ORDER[i];
    }
  }
  return null;
}

export function renderUI(ctx, game) {
  drawSunCounter(ctx, game);
  drawCardBar(ctx, game);
  drawWaveProgress(ctx, game);
  if (game.selectedPlant) drawPlantPreview(ctx, game);
  drawBanner(ctx, game);
  if (game.over) drawEndScreen(ctx, game);
}

function drawSunCounter(ctx, game) {
  ctx.fillStyle = '#3d2410';
  ctx.fillRect(8, 10, 84, 36);
  ctx.fillStyle = COLORS.sunGold;
  ctx.beginPath();
  ctx.arc(28, 28, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.sun, 68, 34);
}

function drawCardBar(ctx, game) {
  for (let i = 0; i < CARD_ORDER.length; i++) {
    const id = CARD_ORDER[i];
    const cfg = PLANTS[id];
    const r = getCardRect(i);
    const cooldown = game.cardCooldowns[id] || 0;
    const cooldownPct = cooldown > 0 ? Math.min(cooldown / cfg.cooldown, 1) : 0;
    const insufficient = game.sun < cfg.cost;

    // bg
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    ctx.fillStyle = COLORS.woodLight;
    ctx.fillRect(r.x, r.y, r.w, r.h);

    // mini plant icon (placeholder shape, real drawing comes later)
    drawCardIcon(ctx, id, r.x + r.w / 2, r.y + r.h / 2 - 8);

    // cost
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cfg.cost, r.x + r.w / 2, r.y + r.h - 6);

    // cooldown overlay (gray fills from top down to bottom proportional to remaining)
    if (cooldownPct > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(r.x, r.y, r.w, r.h * cooldownPct);
    }
    // insufficient overlay
    if (insufficient) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    // selection
    if (game.selectedPlant === id) {
      ctx.strokeStyle = COLORS.sunGold;
      ctx.lineWidth = 3;
      ctx.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
    }
  }
}

function drawCardIcon(ctx, id, cx, cy) {
  // Simple iconic shapes; full plant drawing reused later
  switch (id) {
    case 'sunflower':
      ctx.fillStyle = '#ffd24a';
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, 8, 5, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#7a4a1a';
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'peashooter':
      ctx.fillStyle = '#3eaa3e';
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(cx + 10, cy, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'wallnut':
      ctx.fillStyle = '#a06a3a';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 18, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(cx - 5, cy - 3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 5, cy - 3, 2, 0, Math.PI * 2); ctx.fill();
      break;
    case 'cherrybomb':
      ctx.fillStyle = '#d8313a';
      ctx.beginPath(); ctx.arc(cx - 7, cy + 3, 12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 7, cy + 3, 12, 0, Math.PI * 2); ctx.fill();
      break;
    case 'snowpea':
      ctx.fillStyle = '#9fd3e8';
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(cx + 10, cy, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'potatomine':
      ctx.fillStyle = '#a87c3a';
      ctx.beginPath(); ctx.ellipse(cx, cy + 4, 18, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c44';
      ctx.beginPath(); ctx.arc(cx, cy - 2, 4, 0, Math.PI * 2); ctx.fill();
      break;
  }
}

function drawWaveProgress(ctx, game) {
  const cx = CANVAS_W - 80;
  const cy = 28;
  for (let i = 0; i < 3; i++) {
    const x = cx + i * 22;
    ctx.fillStyle = i < game.currentWave ? '#4caf50' : '#666';
    if (i === game.currentWave - 1 && !game.wavesFinished) {
      const pulse = (Math.sin(performance.now() / 200) + 1) / 2;
      ctx.fillStyle = `rgb(${200 + 55 * pulse}, ${100 + 100 * pulse}, 50)`;
    }
    ctx.beginPath();
    ctx.arc(x, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawPlantPreview(ctx, game) {
  // overrides of input cursor; actual implementation in input phase
}

function drawBanner(ctx, game) {
  if (!game.banner) return;
  const t = game.banner.t;
  const total = game.banner.duration;
  const phase = t / total;
  let alpha = 1;
  if (phase < 0.15) alpha = phase / 0.15;
  else if (phase > 0.85) alpha = (1 - phase) / 0.15;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(180, 30, 30, 0.85)';
  ctx.fillRect(0, 250, CANVAS_W, 100);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  const shake = Math.sin(t * 30) * 4;
  ctx.fillText(game.banner.text, CANVAS_W / 2 + shake, 310);
  ctx.restore();
}

function drawEndScreen(ctx, game) {
  ctx.fillStyle = game.victory ? 'rgba(20,80,30,0.7)' : 'rgba(80,20,20,0.7)';
  ctx.fillRect(0, 0, CANVAS_W, 600);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.victory ? '胜利！' : '僵尸吃掉了你的脑子！', CANVAS_W / 2, 250);
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = COLORS.sunGold;
  ctx.fillRect(CANVAS_W / 2 - 100, 320, 200, 60);
  ctx.fillStyle = '#000';
  ctx.fillText('再玩一次', CANVAS_W / 2, 360);
}

export function endScreenButtonHit(x, y) {
  return x >= CANVAS_W / 2 - 100 && x <= CANVAS_W / 2 + 100 && y >= 320 && y <= 380;
}
```

- [ ] **Step 2: Use UI in `renderer.js`**

```javascript
import { renderUI } from './ui.js';

// at end of render():
renderUI(ctx, game);
```

- [ ] **Step 3: Replace placeholder text in `main.js`**

Remove the `Sun: ... Time: ...` debug text from `render()` (now drawn by UI).

- [ ] **Step 4: Wire card click selection**

In `main.js`'s `handleClick`:

```javascript
import { cardAt } from './ui.js';

function handleClick(x, y) {
  // 1) sun collection
  for (const sun of game.suns) {
    if (!sun.collected && sun.hitTest(x, y)) {
      sun.collect(50, 30);
      game.sun += sun.value;
      return;
    }
  }
  // 2) card selection
  const id = cardAt(x, y);
  if (id) {
    if (game.selectedPlant === id) {
      game.selectedPlant = null;
    } else {
      const cfg = PLANTS[id];
      const cd = game.cardCooldowns[id] || 0;
      if (game.sun >= cfg.cost && cd <= 0) {
        game.selectedPlant = id;
      }
    }
    return;
  }
  // 3) deselect on misclick
  if (game.selectedPlant) game.selectedPlant = null;
}
```

Add import for `PLANTS` at top of main.js.

- [ ] **Step 5: Tick down card cooldowns in `game.js update`**

```javascript
for (const id in this.cardCooldowns) {
  this.cardCooldowns[id] -= dt;
  if (this.cardCooldowns[id] <= 0) delete this.cardCooldowns[id];
}
```

- [ ] **Step 6: Verify**

Reload. Expected: 6 plant cards visible at top, sun counter top-left shows 50, three wave dots top-right (all gray). Click a card with enough sun → gold border appears. Cards dim when sun is insufficient. No errors.

- [ ] **Step 7: Commit**

```bash
git add js/ui.js js/renderer.js js/main.js js/game.js
git commit -m "feat(game-1): UI bar, sun counter, plant cards with selection"
```

---

## Phase 8: Plant System — Sunflower

**Goal:** Place sunflower on grid, it produces sun every 24s.

### Task 8.1: Plants module + Sunflower

**Files:**
- Create: `js/plants.js`
- Modify: `js/main.js`
- Modify: `js/game.js`
- Modify: `js/renderer.js`

- [ ] **Step 1: Write `js/plants.js`**

```javascript
import { PLANTS, SUNFLOWER_INTERVAL, SUNFLOWER_SUN_VALUE, COLORS } from './config.js';
import { colToX, rowToY } from './grid.js';
import { Sun } from './sun.js';

export class Plant {
  constructor(id, col, row) {
    this.id = id;
    this.cfg = PLANTS[id];
    this.col = col;
    this.row = row;
    this.x = colToX(col);
    this.y = rowToY(row);
    this.hp = this.cfg.hp;
    this.spawnT = 0;
    this.lifetime = 0;
    this.cooldown = 0;
    this.isDead = false;
  }

  update(dt, game) {
    this.spawnT = Math.min(this.spawnT + dt, 1);
    this.lifetime += dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.hp <= 0) this.isDead = true;
  }

  takeDamage(dmg) {
    this.hp -= dmg;
  }

  render(ctx) {
    const scale = 0.3 + 0.7 * easeOut(this.spawnT);
    ctx.save();
    ctx.translate(this.x, this.y + 20);
    ctx.scale(scale, scale);
    this.draw(ctx);
    ctx.restore();
  }

  draw(ctx) { /* override */ }
}

function easeOut(t) { return 1 - (1 - t) * (1 - t); }

export class Sunflower extends Plant {
  constructor(col, row) {
    super('sunflower', col, row);
    this.cycle = SUNFLOWER_INTERVAL * 0.5; // first sun a bit faster after spawn
    this.pulse = 0;
  }

  update(dt, game) {
    super.update(dt, game);
    this.cycle -= dt;
    this.pulse = Math.max(this.pulse - dt * 3, 0);
    if (this.cycle <= 0) {
      this.cycle = SUNFLOWER_INTERVAL;
      this.pulse = 1;
      game.suns.push(new Sun(this.x + (Math.random() * 20 - 10), this.y - 20, SUNFLOWER_SUN_VALUE, false));
    }
  }

  draw(ctx) {
    // stem
    ctx.fillStyle = '#3a8b3a';
    ctx.fillRect(-4, -10, 8, 35);
    // petals
    const pulseScale = 1 + this.pulse * 0.2;
    ctx.fillStyle = '#ffd24a';
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      ctx.save();
      ctx.translate(0, -25);
      ctx.rotate(a);
      ctx.scale(pulseScale, pulseScale);
      ctx.beginPath();
      ctx.ellipse(0, -18, 8, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // center
    ctx.save();
    ctx.translate(0, -25);
    ctx.scale(pulseScale, pulseScale);
    ctx.fillStyle = '#7a4a1a';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    // seeds dots
    ctx.fillStyle = '#3a1a08';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 7, Math.sin(a) * 7, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

const PLANT_CTORS = {
  sunflower: Sunflower,
};

export function createPlant(id, col, row) {
  const Ctor = PLANT_CTORS[id];
  if (!Ctor) throw new Error('Unknown plant: ' + id);
  return new Ctor(col, row);
}

export function registerPlantCtor(id, Ctor) {
  PLANT_CTORS[id] = Ctor;
}
```

- [ ] **Step 2: Wire plant placement in `main.js`**

```javascript
import { pixelToCell } from './grid.js';
import { createPlant } from './plants.js';

function handleClick(x, y) {
  // ... sun collection, card selection unchanged ...

  // 4) place plant
  if (game.selectedPlant) {
    const cell = pixelToCell(x, y);
    if (cell && !occupied(cell.col, cell.row)) {
      const id = game.selectedPlant;
      const cfg = PLANTS[id];
      if (game.sun >= cfg.cost) {
        game.plants.push(createPlant(id, cell.col, cell.row));
        game.sun -= cfg.cost;
        game.cardCooldowns[id] = cfg.cooldown;
        game.selectedPlant = null;
      }
    }
  }
}

function occupied(col, row) {
  return game.plants.some(p => p.col === col && p.row === row);
}
```

- [ ] **Step 3: Update plants in game.js**

```javascript
// inside update(dt):
for (const p of this.plants) p.update(dt, this);
```

- [ ] **Step 4: Render plants**

In `renderer.js`, after lawn drawing and before suns:

```javascript
// inside render():
const sortedPlants = [...game.plants].sort((a, b) => a.y - b.y);
for (const p of sortedPlants) p.render(ctx);
```

- [ ] **Step 5: Add cell highlight overlay in `main.js`**

Replace `render()` in `main.js`:

```javascript
function render() {
  renderScene(ctx, game);
  // cell highlight overlay while a plant is selected
  if (game.selectedPlant) {
    const cell = pixelToCell(input.mouseX, input.mouseY);
    if (cell) {
      const x = 70 + cell.col * 80;
      const y = 90 + cell.row * 96;
      ctx.fillStyle = occupied(cell.col, cell.row)
        ? 'rgba(255,0,0,0.25)'
        : 'rgba(0,255,0,0.25)';
      ctx.fillRect(x, y, 80, 96);
    }
  }
}
```

(Phase 19 replaces the colored overlay with a ghost-plant preview.)

- [ ] **Step 6: Verify**

Reload. Click sunflower card (cost 50, you have 50). Click on a lawn cell. Expected:
- Sunflower appears with pop-in animation
- Sun counter goes to 0
- Card grays out and shows cooldown shrinking
- ~12 seconds later the sunflower hops a sun next to it; click to collect; counter +25
- Try clicking the sunflower's cell again with another card → red overlay shows occupied

- [ ] **Step 7: Commit**

```bash
git add js/plants.js js/main.js js/game.js js/renderer.js
git commit -m "feat(game-1): sunflower plant with placement and sun production"
```

---

## Phase 9: Zombies — Basic Zombie

**Goal:** Spawn a basic zombie via dev shortcut, watch it walk left across the lawn.

### Task 9.1: Zombies module

**Files:**
- Create: `js/zombies.js`
- Modify: `js/game.js`
- Modify: `js/renderer.js`
- Modify: `js/main.js`

- [ ] **Step 1: Write `js/zombies.js`**

```javascript
import { ZOMBIES, GRID_COLS, COLORS } from './config.js';
import { rowToY, gridXToPixel, pixelToGridX } from './grid.js';

export class Zombie {
  constructor(type, row) {
    this.type = type;
    this.cfg = ZOMBIES[type];
    this.hp = this.cfg.hp;
    this.accessoryHp = this.cfg.accessoryHp || 0;
    this.row = row;
    this.gridX = GRID_COLS;       // start at right edge
    this.x = gridXToPixel(this.gridX);
    this.y = rowToY(row);
    this.speed = this.cfg.speed;  // px/s
    this.state = 'walking';        // walking | eating | dying
    this.biteTimer = 0;
    this.target = null;
    this.slowT = 0;                // remaining slow seconds
    this.dyingT = 0;
    this.spawnFade = 0;            // 0->1 fade-in
    this.legPhase = Math.random() * Math.PI * 2;
    this.isDead = false;
  }

  update(dt, game) {
    this.spawnFade = Math.min(this.spawnFade + dt * 2, 1);
    if (this.slowT > 0) this.slowT -= dt;

    if (this.state === 'dying') {
      this.dyingT += dt;
      if (this.dyingT > 0.6) this.isDead = true;
      return;
    }

    if (this.hp <= 0) {
      this.state = 'dying';
      return;
    }

    const slow = this.slowT > 0 ? 0.5 : 1;

    if (this.state === 'walking') {
      this.gridX -= (this.speed * slow / 80) * dt;
      this.x = gridXToPixel(this.gridX);
      this.legPhase += dt * 6 * slow;

      // check for plant in front
      const target = findTargetPlant(game, this);
      if (target) {
        this.state = 'eating';
        this.target = target;
        this.biteTimer = 0;
      }
    } else if (this.state === 'eating') {
      if (!this.target || this.target.isDead || !sameCell(this.target, this)) {
        this.state = 'walking';
        this.target = null;
        return;
      }
      this.biteTimer += dt;
      if (this.biteTimer >= this.cfg.biteInterval) {
        this.biteTimer = 0;
        this.target.takeDamage(this.cfg.biteDamage);
      }
    }
  }

  takeDamage(dmg) {
    if (this.accessoryHp > 0) {
      const used = Math.min(this.accessoryHp, dmg);
      this.accessoryHp -= used;
      dmg -= used;
    }
    if (dmg > 0) this.hp -= dmg;
  }

  applySlow(seconds) {
    this.slowT = Math.max(this.slowT, seconds);
  }

  getFrontX() {
    return this.x - 14;
  }

  render(ctx) {
    ctx.save();
    ctx.globalAlpha = this.spawnFade;
    if (this.state === 'dying') {
      const k = this.dyingT / 0.6;
      ctx.translate(this.x, this.y);
      ctx.rotate(k * Math.PI / 2);
      ctx.globalAlpha *= (1 - k);
      this.draw(ctx);
      ctx.restore();
      return;
    }
    ctx.translate(this.x, this.y);
    if (this.slowT > 0) {
      ctx.fillStyle = 'rgba(159,211,232,0.3)';
    }
    this.draw(ctx);
    if (this.slowT > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(159,211,232,0.45)';
      ctx.fillRect(-30, -90, 60, 100);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    // hp accessory bar (debug)
    // ctx.fillStyle = '#000'; ctx.fillText(this.hp, this.x - 10, this.y - 80);
  }

  draw(ctx) {
    drawBasicZombieBody(ctx, this.legPhase, this.state === 'eating');
  }
}

export function drawBasicZombieBody(ctx, legPhase, eating) {
  // legs (animated)
  const legSwing = Math.sin(legPhase) * 6;
  ctx.fillStyle = '#5a6a3a';
  ctx.fillRect(-10 + legSwing, -10, 8, 20);
  ctx.fillRect(2 - legSwing, -10, 8, 20);
  // body
  ctx.fillStyle = '#7a8a5a';
  ctx.fillRect(-14, -45, 28, 38);
  // tattered shirt collar
  ctx.fillStyle = '#3d4a2a';
  ctx.beginPath();
  ctx.moveTo(-14, -40);
  ctx.lineTo(-10, -36);
  ctx.lineTo(-4, -42);
  ctx.lineTo(2, -36);
  ctx.lineTo(8, -40);
  ctx.lineTo(14, -36);
  ctx.lineTo(14, -30);
  ctx.lineTo(-14, -30);
  ctx.closePath();
  ctx.fill();
  // arm reaching forward
  ctx.fillStyle = '#7a8a5a';
  ctx.fillRect(-22, -38, 10, 6);
  ctx.fillRect(-26, -34, 6, 6);
  // head
  const headBob = eating ? Math.sin(legPhase * 4) * 2 : 0;
  ctx.save();
  ctx.translate(-2, -55 + headBob);
  ctx.rotate(-0.1);
  ctx.fillStyle = '#a8b888';
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // eye
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(2, -2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-6, -2, 2, 0, Math.PI * 2); ctx.fill();
  // mouth
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (eating) {
    ctx.moveTo(-6, 6); ctx.lineTo(-2, 9); ctx.lineTo(2, 6); ctx.lineTo(6, 9);
  } else {
    ctx.moveTo(-6, 7); ctx.lineTo(6, 7);
  }
  ctx.stroke();
  ctx.restore();
}

function sameCell(plant, zombie) {
  if (plant.row !== zombie.row) return false;
  const px = plant.x;
  return Math.abs(zombie.x - px) < 30;
}

function findTargetPlant(game, zombie) {
  for (const p of game.plants) {
    if (p.row !== zombie.row || p.isDead) continue;
    // zombie front edge has reached plant's column
    if (zombie.x - 14 < p.x + 24 && zombie.x + 6 > p.x - 24) {
      return p;
    }
  }
  return null;
}

const ZOMBIE_DRAWERS = {
  basic: (ctx, z) => drawBasicZombieBody(ctx, z.legPhase, z.state === 'eating'),
};

export function createZombie(type, row) {
  return new Zombie(type, row);
}
```

- [ ] **Step 2: Update zombies in game.js**

```javascript
// inside update(dt):
for (const z of this.zombies) z.update(dt, this);
```

- [ ] **Step 3: Render zombies in renderer.js**

After plants:

```javascript
const sortedZombies = [...game.zombies].sort((a, b) => a.y - b.y);
for (const z of sortedZombies) z.render(ctx);
```

- [ ] **Step 4: Add dev shortcut in main.js**

```javascript
import { createZombie } from './zombies.js';

window.addEventListener('keydown', (e) => {
  if (e.key === 'z') game.zombies.push(createZombie('basic', Math.floor(Math.random() * 5)));
});
```

- [ ] **Step 5: Verify**

Reload. Press `z` key. Expected: a zombie fades in at the right edge in a random row and walks left, legs alternating. Press `z` multiple times for multiple zombies.

- [ ] **Step 6: Commit**

```bash
git add js/zombies.js js/game.js js/renderer.js js/main.js
git commit -m "feat(game-1): basic zombie entity with walking animation"
```

---

## Phase 10: Plants — Peashooter + Projectiles

**Goal:** Place peashooter; when zombies in same row, fire peas; peas hit zombies and deal damage.

### Task 10.1: Projectiles module

**Files:**
- Create: `js/projectiles.js`
- Modify: `js/plants.js`
- Modify: `js/game.js`
- Modify: `js/renderer.js`

- [ ] **Step 1: Write `js/projectiles.js`**

```javascript
import { PROJECTILE_SPEED, PEA_DAMAGE, SNOW_PEA_SLOW_DURATION, CANVAS_W } from './config.js';
import { rowToY } from './grid.js';

export class Pea {
  constructor(x, row, snow = false) {
    this.x = x;
    this.row = row;
    this.y = rowToY(row) - 30;
    this.snow = snow;
    this.dmg = PEA_DAMAGE;
    this.isDead = false;
    this.trail = [];
  }

  update(dt, game) {
    this.trail.push({ x: this.x, y: this.y, life: 0.2 });
    for (const t of this.trail) t.life -= dt;
    this.trail = this.trail.filter(t => t.life > 0);

    this.x += PROJECTILE_SPEED * dt;
    if (this.x > CANVAS_W + 20) { this.isDead = true; return; }

    for (const z of game.zombies) {
      if (z.row !== this.row || z.isDead || z.state === 'dying') continue;
      if (this.x >= z.getFrontX() && this.x <= z.x + 10) {
        z.takeDamage(this.dmg);
        if (this.snow) z.applySlow(SNOW_PEA_SLOW_DURATION);
        this.isDead = true;
        spawnHitParticles(game, this.x, this.y, this.snow);
        return;
      }
    }
  }

  render(ctx) {
    for (const t of this.trail) {
      ctx.fillStyle = this.snow ? 'rgba(159,211,232,0.4)' : 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 4 * (t.life / 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = this.snow ? '#9fd3e8' : '#9be870';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.snow ? '#5a8aa0' : '#4a7a30';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function spawnHitParticles(game, x, y, snow) {
  // forward-decl; use particles module if available
  if (typeof game.spawnHitParticles === 'function') game.spawnHitParticles(x, y, snow);
}
```

- [ ] **Step 2: Add Peashooter in `js/plants.js`**

```javascript
import { Pea } from './projectiles.js';
import { PEASHOOTER_FIRE_INTERVAL } from './config.js';

export class Peashooter extends Plant {
  constructor(col, row) {
    super('peashooter', col, row);
    this.fireT = 0;
    this.firing = 0;
  }

  update(dt, game) {
    super.update(dt, game);
    this.firing = Math.max(0, this.firing - dt * 6);

    const hasZombie = game.zombies.some(z =>
      z.row === this.row && z.state !== 'dying' && z.x > this.x);

    if (hasZombie) {
      this.fireT += dt;
      if (this.fireT >= PEASHOOTER_FIRE_INTERVAL) {
        this.fireT = 0;
        this.firing = 1;
        game.projectiles.push(new Pea(this.x + 10, this.row, false));
      }
    } else {
      this.fireT = Math.min(this.fireT + dt, PEASHOOTER_FIRE_INTERVAL);
    }
  }

  draw(ctx) {
    // stem
    ctx.fillStyle = '#3a8b3a';
    ctx.fillRect(-4, -10, 8, 35);
    // leaf
    ctx.fillStyle = '#4eaa4e';
    ctx.beginPath();
    ctx.ellipse(-12, 8, 10, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // head
    ctx.save();
    ctx.translate(0, -25);
    ctx.fillStyle = '#3eaa3e';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a7a2a';
    ctx.beginPath();
    ctx.arc(0, -2, 12, 0, Math.PI * 2);
    ctx.fill();
    // mouth
    ctx.fillStyle = '#000';
    ctx.beginPath();
    if (this.firing > 0.5) ctx.ellipse(11, 0, 5, 5, 0, 0, Math.PI * 2);
    else ctx.ellipse(11, 0, 4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // eye
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-3, -3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-3, -3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// register at bottom of plants.js, before createPlant:
registerPlantCtor('peashooter', Peashooter);
```

(Important: `registerPlantCtor` must be called after `Peashooter` is defined. Since `PLANT_CTORS` already has `sunflower`, just add `registerPlantCtor('peashooter', Peashooter);` at the bottom of the file after the class.)

- [ ] **Step 3: Update projectiles in `game.js`**

```javascript
// inside update(dt):
for (const p of this.projectiles) p.update(dt, this);
```

- [ ] **Step 4: Render projectiles in `renderer.js`**

After zombies:

```javascript
for (const p of game.projectiles) p.render(ctx);
```

- [ ] **Step 5: Verify**

Reload. Place a peashooter. Press `z` to spawn a zombie in the same row. Expected:
- Peashooter shoots peas with white trails
- Peas hit zombie, zombie's HP decreases (use console: `game.zombies[0].hp`)
- After ~10 hits zombie dies and falls over

- [ ] **Step 6: Commit**

```bash
git add js/projectiles.js js/plants.js js/game.js js/renderer.js
git commit -m "feat(game-1): peashooter and pea projectile combat"
```

---

## Phase 11: Plants — Wall-nut, Snow Pea

### Task 11.1: Wall-nut

**Files:**
- Modify: `js/plants.js`

- [ ] **Step 1: Add Wall-nut class**

```javascript
export class Wallnut extends Plant {
  draw(ctx) {
    const stage = this.hp > this.cfg.hp * 2 / 3 ? 0 : this.hp > this.cfg.hp / 3 ? 1 : 2;
    ctx.fillStyle = '#a06a3a';
    ctx.beginPath();
    ctx.ellipse(0, -22, 26, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a4a2a';
    ctx.beginPath();
    ctx.ellipse(0, -22, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-6, -22, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -22, 3, 0, Math.PI * 2); ctx.fill();
    // mouth
    ctx.beginPath();
    ctx.arc(0, -14, 4, 0, Math.PI);
    ctx.stroke();
    // cracks
    if (stage >= 1) {
      ctx.strokeStyle = '#3d1a08';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10, -34); ctx.lineTo(-7, -28); ctx.lineTo(-12, -22);
      ctx.moveTo(8, -10); ctx.lineTo(4, -16); ctx.lineTo(10, -20);
      ctx.stroke();
    }
    if (stage >= 2) {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-15, -10); ctx.lineTo(-2, -20); ctx.lineTo(-5, -32);
      ctx.moveTo(14, -25); ctx.lineTo(6, -18); ctx.lineTo(12, -8);
      ctx.stroke();
    }
  }
}
registerPlantCtor('wallnut', Wallnut);
```

- [ ] **Step 2: Verify**

Place wallnut, send zombies. Expected: zombie eats wallnut, cracks appear in 3 stages, finally destroyed.

- [ ] **Step 3: Commit**

```bash
git add js/plants.js
git commit -m "feat(game-1): wall-nut plant with damage stages"
```

### Task 11.2: Snow Pea

- [ ] **Step 1: Add SnowPea class in `js/plants.js`**

```javascript
export class SnowPea extends Peashooter {
  constructor(col, row) {
    super(col, row);
    this.id = 'snowpea';
    this.cfg = PLANTS.snowpea;
    this.hp = this.cfg.hp;
  }

  update(dt, game) {
    Plant.prototype.update.call(this, dt, game);
    this.firing = Math.max(0, this.firing - dt * 6);
    const hasZombie = game.zombies.some(z =>
      z.row === this.row && z.state !== 'dying' && z.x > this.x);
    if (hasZombie) {
      this.fireT += dt;
      if (this.fireT >= PEASHOOTER_FIRE_INTERVAL) {
        this.fireT = 0;
        this.firing = 1;
        game.projectiles.push(new Pea(this.x + 10, this.row, true));
      }
    } else {
      this.fireT = Math.min(this.fireT + dt, PEASHOOTER_FIRE_INTERVAL);
    }
  }

  draw(ctx) {
    // similar to peashooter but blue tones
    ctx.fillStyle = '#3a8b3a';
    ctx.fillRect(-4, -10, 8, 35);
    ctx.fillStyle = '#4eaa4e';
    ctx.beginPath();
    ctx.ellipse(-12, 8, 10, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(0, -25);
    const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 18);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#7ec0e0');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    // snowflake on forehead
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.translate(0, -4);
      ctx.rotate(i * Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#000';
    ctx.beginPath();
    if (this.firing > 0.5) ctx.ellipse(11, 0, 5, 5, 0, 0, Math.PI * 2);
    else ctx.ellipse(11, 0, 4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-3, -3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-3, -3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
registerPlantCtor('snowpea', SnowPea);
```

- [ ] **Step 2: Verify**

Place snow pea (need 175 sun — use dev hack: in console `game.sun = 999`). Send a zombie. Expected: snow pea fires blue peas; on hit, zombie tints blue and walks ~50% slower for 4 seconds.

- [ ] **Step 3: Commit**

```bash
git add js/plants.js
git commit -m "feat(game-1): snow pea plant with slow effect"
```

---

## Phase 12: Plants — Cherry Bomb, Potato Mine

### Task 12.1: Cherry Bomb (instant explosion)

**Files:**
- Modify: `js/plants.js`
- Create: `js/particles.js`

- [ ] **Step 1: Write `js/particles.js`**

```javascript
export class Particle {
  constructor(opts) {
    Object.assign(this, opts);
    this.t = 0;
    this.isDead = false;
  }
  update(dt) {
    this.t += dt;
    if (this.t >= this.life) { this.isDead = true; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += (this.gravity || 0) * dt;
  }
  render(ctx) {
    const alpha = 1 - this.t / this.life;
    ctx.fillStyle = this.color.replace('ALPHA', alpha.toFixed(2));
    ctx.beginPath();
    const r = this.r * (1 - this.t / this.life * 0.5);
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function spawnExplosion(game, cx, cy) {
  // shockwave
  game.particles.push(new Shockwave(cx, cy));
  // smoke + sparks
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 200;
    game.particles.push(new Particle({
      x: cx, y: cy,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50,
      gravity: 200,
      r: 4 + Math.random() * 6,
      life: 0.6 + Math.random() * 0.4,
      color: `rgba(${200 + Math.random() * 55 | 0}, ${80 + Math.random() * 100 | 0}, 30, ALPHA)`,
    }));
  }
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 30 + Math.random() * 100;
    game.particles.push(new Particle({
      x: cx, y: cy,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: 8 + Math.random() * 6,
      life: 0.8,
      color: `rgba(80, 80, 80, ALPHA)`,
    }));
  }
}

export class Shockwave {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.t = 0;
    this.life = 0.35;
    this.isDead = false;
  }
  update(dt) {
    this.t += dt;
    if (this.t >= this.life) this.isDead = true;
  }
  render(ctx) {
    const k = this.t / this.life;
    const r = 30 + k * 130;
    ctx.strokeStyle = `rgba(255, 255, 220, ${(1 - k).toFixed(2)})`;
    ctx.lineWidth = 8 * (1 - k);
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function spawnHit(game, x, y, snow) {
  const color = snow ? 'rgba(180, 230, 255, ALPHA)' : 'rgba(220, 240, 80, ALPHA)';
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 80;
    game.particles.push(new Particle({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
      gravity: 220,
      r: 2.5,
      life: 0.4,
      color,
    }));
  }
}

export function spawnPlantingPoof(game, x, y) {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 30 + Math.random() * 50;
    game.particles.push(new Particle({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      gravity: 150,
      r: 4,
      life: 0.5,
      color: 'rgba(180, 130, 80, ALPHA)',
    }));
  }
}
```

- [ ] **Step 2: Wire particles in `game.js`**

Add to `update(dt)`:

```javascript
for (const p of this.particles) p.update(dt);
```

Add helper for hit particles (used by Pea):

```javascript
import { spawnHit, spawnPlantingPoof } from './particles.js';

// inside GameState constructor or as method:
spawnHitParticles(x, y, snow) { spawnHit(this, x, y, snow); }
```

- [ ] **Step 3: Render particles in `renderer.js`**

After zombies, projectiles:

```javascript
for (const p of game.particles) p.render(ctx);
```

- [ ] **Step 4: Add CherryBomb to `plants.js`**

```javascript
import { spawnExplosion } from './particles.js';
import { CHERRY_FUSE, EXPLOSION_RADIUS_COLS } from './config.js';

export class CherryBomb extends Plant {
  constructor(col, row) {
    super('cherrybomb', col, row);
    this.fuse = CHERRY_FUSE;
    this.exploded = false;
  }

  update(dt, game) {
    super.update(dt, game);
    if (this.exploded) return;
    this.fuse -= dt;
    if (this.fuse <= 0) {
      this.explode(game);
    }
  }

  explode(game) {
    this.exploded = true;
    spawnExplosion(game, this.x, this.y - 20);
    for (const z of game.zombies) {
      if (Math.abs(z.row - this.row) <= EXPLOSION_RADIUS_COLS &&
          Math.abs((z.x - this.x) / 80) <= EXPLOSION_RADIUS_COLS + 0.5) {
        z.hp = -9999;
        z.accessoryHp = 0;
      }
    }
    this.isDead = true;
  }

  draw(ctx) {
    const flicker = Math.sin(this.lifetime * 30) * 0.5 + 0.5;
    ctx.fillStyle = '#3a8b3a';
    ctx.fillRect(-3, -28, 6, 12);
    // two cherries
    ctx.fillStyle = `rgb(${200 + flicker * 55 | 0}, ${20 + flicker * 30 | 0}, ${30 + flicker * 30 | 0})`;
    ctx.beginPath(); ctx.arc(-12, -10, 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -10, 18, 0, Math.PI * 2); ctx.fill();
    // highlights
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(-16, -16, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -16, 4, 0, Math.PI * 2); ctx.fill();
    // angry eyes
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-12, -10, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -10, 2, 0, Math.PI * 2); ctx.fill();
  }
}
registerPlantCtor('cherrybomb', CherryBomb);
```

- [ ] **Step 5: Verify**

Set sun: console `game.sun = 999`. Place cherry bomb where zombies are. Expected: 1.2s fuse with cherry color flicker, then explosion (white shockwave + orange particles + smoke), all zombies in 3×3 area die instantly.

- [ ] **Step 6: Commit**

```bash
git add js/particles.js js/plants.js js/game.js js/renderer.js
git commit -m "feat(game-1): cherry bomb with explosion particles"
```

### Task 12.2: Potato Mine

- [ ] **Step 1: Add PotatoMine class**

```javascript
import { POTATO_ARM_TIME } from './config.js';

export class PotatoMine extends Plant {
  constructor(col, row) {
    super('potatomine', col, row);
    this.armT = POTATO_ARM_TIME;
    this.armed = false;
    this.exploded = false;
  }

  update(dt, game) {
    super.update(dt, game);
    if (this.exploded) return;
    if (!this.armed) {
      this.armT -= dt;
      if (this.armT <= 0) this.armed = true;
    } else {
      // detect zombie in same cell
      for (const z of game.zombies) {
        if (z.row !== this.row || z.state === 'dying') continue;
        if (Math.abs(z.x - this.x) < 35) {
          this.detonate(game);
          return;
        }
      }
    }
  }

  detonate(game) {
    this.exploded = true;
    spawnExplosion(game, this.x, this.y - 5);
    for (const z of game.zombies) {
      if (Math.abs(z.row - this.row) <= 1 &&
          Math.abs((z.x - this.x) / 80) <= 1.5) {
        z.hp = -9999;
        z.accessoryHp = 0;
      }
    }
    this.isDead = true;
  }

  draw(ctx) {
    if (!this.armed) {
      // buried: only top of potato + label
      ctx.fillStyle = '#a87c3a';
      ctx.beginPath();
      ctx.ellipse(0, 8, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('准备中...', 0, -2);
    } else {
      // armed: full potato with red button
      ctx.fillStyle = '#a87c3a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5a20';
      // spots
      ctx.beginPath(); ctx.ellipse(-8, -2, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6, 2, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
      // button
      const blink = Math.sin(this.lifetime * 6) * 0.5 + 0.5;
      ctx.fillStyle = `rgb(${200 + blink * 55 | 0}, 30, 30)`;
      ctx.beginPath(); ctx.arc(0, -8, 5, 0, Math.PI * 2); ctx.fill();
      // eyes
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(-6, 1, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, 1, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}
registerPlantCtor('potatomine', PotatoMine);
```

- [ ] **Step 2: Verify**

Place potato mine in path of an incoming zombie. Expected: gray "准备中..." label for 14s; after that, it pops up as a brown potato with blinking red button; zombie steps on → explodes 3×3.

- [ ] **Step 3: Commit**

```bash
git add js/plants.js
git commit -m "feat(game-1): potato mine with arming and detonation"
```

---

## Phase 13: Zombies — Cone, Bucket

### Task 13.1: Variants

**Files:**
- Modify: `js/zombies.js`

- [ ] **Step 1: Add accessory drawing**

Add to `js/zombies.js` (after `drawBasicZombieBody`):

```javascript
export function drawCone(ctx, accessoryHp, maxHp) {
  const stage = accessoryHp > maxHp * 2 / 3 ? 0 : accessoryHp > maxHp / 3 ? 1 : 2;
  ctx.save();
  ctx.translate(-2, -65);
  ctx.fillStyle = '#e08020';
  ctx.beginPath();
  ctx.moveTo(-14, 12);
  ctx.lineTo(14, 12);
  ctx.lineTo(2, -22);
  ctx.lineTo(-2, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a05010';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-10, 4); ctx.lineTo(10, 4);
  ctx.moveTo(-7, -4); ctx.lineTo(7, -4);
  ctx.moveTo(-3, -12); ctx.lineTo(3, -12);
  ctx.stroke();
  if (stage >= 1) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -22); ctx.lineTo(-3, -16); ctx.lineTo(2, -10);
    ctx.stroke();
  }
  if (stage >= 2) {
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-4, 0, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, 6, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawBucket(ctx, accessoryHp, maxHp) {
  const stage = accessoryHp > maxHp * 2 / 3 ? 0 : accessoryHp > maxHp / 3 ? 1 : 2;
  ctx.save();
  ctx.translate(-2, -75);
  ctx.fillStyle = '#9a9a9a';
  ctx.beginPath();
  ctx.moveTo(-15, 18);
  ctx.lineTo(15, 18);
  ctx.lineTo(13, -8);
  ctx.lineTo(-13, -8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7a7a7a';
  ctx.fillRect(-15, -10, 30, 4);
  // rivets
  ctx.fillStyle = '#5a5a5a';
  ctx.beginPath(); ctx.arc(-11, -8, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(11, -8, 1.5, 0, Math.PI * 2); ctx.fill();
  if (stage >= 1) {
    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(0, 0); ctx.lineTo(4, 8); ctx.fill();
  }
  if (stage >= 2) {
    ctx.fillStyle = '#7a4a1a';
    ctx.beginPath(); ctx.arc(-8, 4, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, 12, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
```

- [ ] **Step 2: Update `draw()` in `Zombie` to switch by type**

```javascript
  draw(ctx) {
    drawBasicZombieBody(ctx, this.legPhase, this.state === 'eating');
    if (this.type === 'cone') drawCone(ctx, this.accessoryHp, this.cfg.accessoryHp);
    if (this.type === 'bucket') drawBucket(ctx, this.accessoryHp, this.cfg.accessoryHp);
  }
```

- [ ] **Step 3: Update dev shortcut in main.js**

```javascript
window.addEventListener('keydown', (e) => {
  if (e.key === 'z') game.zombies.push(createZombie('basic', Math.floor(Math.random() * 5)));
  if (e.key === 'x') game.zombies.push(createZombie('cone', Math.floor(Math.random() * 5)));
  if (e.key === 'c') game.zombies.push(createZombie('bucket', Math.floor(Math.random() * 5)));
});
```

- [ ] **Step 4: Verify**

Press `x`: cone zombie appears, takes more hits before cone breaks. Press `c`: bucket zombie even tougher. Watch accessory damage stages visually.

- [ ] **Step 5: Commit**

```bash
git add js/zombies.js js/main.js
git commit -m "feat(game-1): cone and bucket zombie variants"
```

---

## Phase 14: Lawnmower

### Task 14.1: Mower

**Files:**
- Create: `js/mower.js`
- Modify: `js/game.js`
- Modify: `js/renderer.js`

- [ ] **Step 1: Write `js/mower.js`**

```javascript
import { GRID_X0, GRID_ROWS, COLORS } from './config.js';
import { rowToY } from './grid.js';

export class Mower {
  constructor(row) {
    this.row = row;
    this.x = GRID_X0 - 30;
    this.y = rowToY(row);
    this.state = 'idle'; // idle | running | done
    this.speed = 0;
    this.isDead = false;
  }

  update(dt, game) {
    if (this.state === 'idle') {
      // trigger if any zombie reached column 0
      for (const z of game.zombies) {
        if (z.row !== this.row || z.state === 'dying') continue;
        if (z.x <= GRID_X0 + 60) {
          this.state = 'running';
          this.speed = 100;
          break;
        }
      }
    } else if (this.state === 'running') {
      this.speed = Math.min(this.speed + 800 * dt, 600);
      this.x += this.speed * dt;
      // kill zombies in same row that we touch
      for (const z of game.zombies) {
        if (z.row !== this.row || z.state === 'dying') continue;
        if (Math.abs(z.x - this.x) < 30) {
          z.hp = -9999;
          z.accessoryHp = 0;
          // also fling: cosmetic, just kill
        }
      }
      if (this.x > 1100) {
        this.state = 'done';
        this.isDead = true;
      }
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y + 20);
    // body
    ctx.fillStyle = '#c33';
    ctx.fillRect(-22, -14, 44, 18);
    // wheels
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(-14, 4, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, 4, 6, 0, Math.PI * 2); ctx.fill();
    // blade
    ctx.fillStyle = '#999';
    ctx.fillRect(-26, -8, 6, 12);
    // handle
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(15, -14); ctx.lineTo(28, -28);
    ctx.stroke();
    ctx.restore();
  }
}

export function spawnMowers(game) {
  for (let r = 0; r < GRID_ROWS; r++) game.mowers.push(new Mower(r));
}
```

- [ ] **Step 2: Spawn mowers on game start in `main.js`**

```javascript
import { spawnMowers } from './mower.js';

// after creating game:
spawnMowers(game);
```

- [ ] **Step 3: Update mowers in `game.js`**

```javascript
for (const m of this.mowers) m.update(dt, this);
```

- [ ] **Step 4: Render mowers in `renderer.js`**

After lawn, before plants:

```javascript
for (const m of game.mowers) m.render(ctx);
```

- [ ] **Step 5: Verify**

Reload. 5 red mowers visible at left edge of each row. Spawn a zombie (`z`) without planting anything. When it reaches the house, mower triggers, accelerates rightward, kills the zombie, exits screen, mower disappears.

- [ ] **Step 6: Commit**

```bash
git add js/mower.js js/game.js js/main.js js/renderer.js
git commit -m "feat(game-1): lawnmower fail-safe per row"
```

---

## Phase 15: Wave System / Level 1

### Task 15.1: Levels module

**Files:**
- Create: `js/levels.js`
- Modify: `js/game.js`
- Modify: `js/main.js`

- [ ] **Step 1: Write `js/levels.js`**

```javascript
export const level1 = {
  id: 'level1',
  name: '关卡 1',
  startingSun: 50,
  waves: [
    {
      triggerTime: 10,
      announceText: null,
      zombies: [
        { type: 'basic', delay: 0 },
        { type: 'basic', delay: 6 },
        { type: 'basic', delay: 12 },
        { type: 'basic', delay: 18 },
        { type: 'basic', delay: 24 },
      ],
    },
    {
      triggerTime: 45,
      announceText: '一大波僵尸即将来袭！',
      zombies: [
        { type: 'basic', delay: 0 },
        { type: 'basic', delay: 4 },
        { type: 'cone',  delay: 8 },
        { type: 'basic', delay: 13 },
        { type: 'basic', delay: 17 },
        { type: 'cone',  delay: 22 },
        { type: 'basic', delay: 27 },
        { type: 'cone',  delay: 32 },
        { type: 'basic', delay: 37 },
        { type: 'basic', delay: 42 },
      ],
    },
    {
      triggerTime: 95,
      announceText: '最终大波僵尸！',
      zombies: [
        { type: 'basic',  delay: 0 },
        { type: 'cone',   delay: 3 },
        { type: 'basic',  delay: 6 },
        { type: 'cone',   delay: 9 },
        { type: 'bucket', delay: 13 },
        { type: 'basic',  delay: 17 },
        { type: 'cone',   delay: 21 },
        { type: 'basic',  delay: 25 },
        { type: 'cone',   delay: 28 },
        { type: 'bucket', delay: 32 },
        { type: 'cone',   delay: 36 },
        { type: 'basic',  delay: 40 },
        { type: 'bucket', delay: 44 },
        { type: 'basic',  delay: 48 },
        { type: 'bucket', delay: 52 },
      ],
    },
  ],
};
```

- [ ] **Step 2: Wire wave logic in `game.js`**

Add fields to constructor:

```javascript
this.level = null;
this.banner = null;
this.tutorialUntil = 10;
```

Add method:

```javascript
loadLevel(level) {
  this.level = level;
  this.sun = level.startingSun;
  this.zombiesScheduled = [];
  for (let i = 0; i < level.waves.length; i++) {
    const w = level.waves[i];
    for (const z of w.zombies) {
      this.zombiesScheduled.push({
        time: w.triggerTime + z.delay,
        type: z.type,
        wave: i + 1,
      });
    }
  }
  this.zombiesTotal = this.zombiesScheduled.length;
}
```

In `update(dt)`, replace any prior wave/spawn handling with:

```javascript
import { createZombie } from './zombies.js';

// ... at top of update after this.time += dt:
if (this.level) {
  // wave announcements
  for (let i = 0; i < this.level.waves.length; i++) {
    const w = this.level.waves[i];
    if (w._announced) continue;
    if (this.time >= w.triggerTime) {
      this.currentWave = i + 1;
      if (w.announceText) {
        this.banner = { text: w.announceText, t: 0, duration: 1.8 };
      }
      w._announced = true;
    }
  }
  // spawn scheduled zombies
  for (let i = this.zombiesScheduled.length - 1; i >= 0; i--) {
    const s = this.zombiesScheduled[i];
    if (this.time >= s.time) {
      const row = Math.floor(Math.random() * 5);
      this.zombies.push(createZombie(s.type, row));
      this.zombiesSpawned++;
      this.zombiesScheduled.splice(i, 1);
    }
  }
  if (this.zombiesScheduled.length === 0) this.wavesFinished = true;
}

// banner timer
if (this.banner) {
  this.banner.t += dt;
  if (this.banner.t >= this.banner.duration) this.banner = null;
}

// tutorial display
this.showTutorial = this.time < this.tutorialUntil;
```

- [ ] **Step 3: Load level in `main.js`**

```javascript
import { level1 } from './levels.js';

game.loadLevel(level1);
```

Remove the dev keyboard shortcuts for spawning (or keep them behind `?dev` query string for testing).

- [ ] **Step 4: Tutorial render in `ui.js`**

Add to `renderUI`:

```javascript
function drawTutorial(ctx, game) {
  if (!game.showTutorial) return;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(180, 250, 640, 90);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('收集天空掉落的阳光，种下向日葵以积累更多阳光', 500, 290);
  ctx.fillText('准备防守僵尸的进攻！', 500, 322);
}
```

Call it at the end of `renderUI`.

- [ ] **Step 5: Verify**

Reload. Expected:
- Tutorial banner shown for first 10 seconds
- At t=10s, first wave begins (5 basic zombies trickling in)
- At t=45s, "一大波僵尸即将来袭！" red banner appears, mixed wave starts
- At t=95s, final wave, includes bucket zombies
- Wave dots top-right indicate progress

- [ ] **Step 6: Commit**

```bash
git add js/levels.js js/game.js js/main.js js/ui.js
git commit -m "feat(game-1): level 1 with 3-wave progression and announcements"
```

---

## Phase 16: Win/Lose Detection

### Task 16.1: End conditions

**Files:**
- Modify: `js/game.js`
- Modify: `js/main.js`

- [ ] **Step 1: Add win/lose check in game.js update**

```javascript
// near end of update, before particles update:
this.checkEnd();
```

```javascript
checkEnd() {
  if (this.over) return;
  // lose: any zombie crossed left bound and that row's mower is gone
  for (const z of this.zombies) {
    if (z.x < 50 && z.state !== 'dying') {
      const mowerActive = this.mowers.some(m => m.row === z.row);
      if (!mowerActive) {
        this.over = true;
        this.victory = false;
        return;
      }
    }
  }
  // win: all waves spawned, no live zombies, sustained 3 seconds
  if (this.wavesFinished) {
    const liveZombies = this.zombies.some(z => z.state !== 'dying');
    if (!liveZombies) {
      this.winTimer = (this.winTimer || 0) + 1 / 60;
      if (this.winTimer >= 3) {
        this.over = true;
        this.victory = true;
      }
    } else {
      this.winTimer = 0;
    }
  }
}
```

(Note: this uses fixed dt assumption since `checkEnd` is called inside fixed-step `update`. The 1/60 increment matches `TIMESTEP / 1000`.)

- [ ] **Step 2: Restart on click of end-screen button**

In `main.js handleClick`:

```javascript
import { endScreenButtonHit } from './ui.js';

// at the very start of handleClick:
if (game.over) {
  if (endScreenButtonHit(x, y)) {
    location.reload();
  }
  return;
}
```

- [ ] **Step 3: Verify**

Try to lose: don't plant anything, let zombies through. After 5 mowers used in same row → "僵尸吃掉了你的脑子！" + restart button.

Try to win: dev-shortcut spawn nothing and console-edit `game.zombiesScheduled = []; game.wavesFinished = true;` → after 3s "胜利！" appears.

Click "再玩一次" → page reloads.

- [ ] **Step 4: Commit**

```bash
git add js/game.js js/main.js
git commit -m "feat(game-1): victory and defeat detection with restart"
```

---

## Phase 17: Audio System

### Task 17.1: Web Audio sound effects

**Files:**
- Create: `js/audio.js`
- Modify: multiple (call sites)

- [ ] **Step 1: Write `js/audio.js`**

```javascript
let ctx = null;
let unlocked = false;

function ensureCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() {
  if (unlocked) return;
  ensureCtx();
  unlocked = true;
}

function envelope(node, t0, attack, decay, peak, sustain) {
  const g = node.gain;
  g.cancelScheduledValues(t0);
  g.setValueAtTime(0, t0);
  g.linearRampToValueAtTime(peak, t0 + attack);
  g.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t0 + attack + decay);
}

function tone({ freq, freqEnd, type = 'sine', duration = 0.2, volume = 0.3, attack = 0.01, decay }) {
  const c = ensureCtx();
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 0.001), t0 + duration);
  envelope(gain, t0, attack, decay ?? duration - attack, volume, 0.0001);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noiseBurst({ duration = 0.2, volume = 0.4, lowpass = 1500 }) {
  const c = ensureCtx();
  const t0 = c.currentTime;
  const buffer = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(lowpass, t0);
  const gain = c.createGain();
  envelope(gain, t0, 0.005, duration, volume, 0.0001);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

const SOUNDS = {
  collectSun: () => tone({ freq: 1200, freqEnd: 1600, type: 'sine', duration: 0.25, volume: 0.35 }),
  plant:      () => tone({ freq: 200,  freqEnd: 100,  type: 'triangle', duration: 0.18, volume: 0.4 }),
  shoot:      () => tone({ freq: 300,  freqEnd: 600,  type: 'sine', duration: 0.08, volume: 0.25 }),
  hit:        () => noiseBurst({ duration: 0.06, volume: 0.3, lowpass: 800 }),
  iceHit:     () => tone({ freq: 2000, freqEnd: 2600, type: 'sine', duration: 0.18, volume: 0.3 }),
  explode:    () => noiseBurst({ duration: 0.45, volume: 0.6, lowpass: 600 }),
  bite:       () => { tone({ freq: 200, type: 'square', duration: 0.05, volume: 0.2 });
                      setTimeout(() => tone({ freq: 240, type: 'square', duration: 0.05, volume: 0.2 }), 80); },
  zombieMoan: () => tone({ freq: 100,  freqEnd: 70,   type: 'sawtooth', duration: 0.6, volume: 0.25 }),
  mower:      () => tone({ freq: 100,  freqEnd: 400,  type: 'sawtooth', duration: 0.35, volume: 0.4 }),
  alert:      () => { tone({ freq: 800, type: 'square', duration: 0.18, volume: 0.4 });
                      setTimeout(() => tone({ freq: 400, type: 'square', duration: 0.18, volume: 0.4 }), 200);
                      setTimeout(() => tone({ freq: 800, type: 'square', duration: 0.18, volume: 0.4 }), 400);
                      setTimeout(() => tone({ freq: 400, type: 'square', duration: 0.18, volume: 0.4 }), 600); },
  victory:    () => { tone({ freq: 523, type: 'sine', duration: 0.18, volume: 0.5 });
                      setTimeout(() => tone({ freq: 659, type: 'sine', duration: 0.18, volume: 0.5 }), 180);
                      setTimeout(() => tone({ freq: 784, type: 'sine', duration: 0.4, volume: 0.5 }), 360); },
  defeat:     () => tone({ freq: 200, freqEnd: 80, type: 'sawtooth', duration: 0.8, volume: 0.5 }),
};

export function play(name) {
  if (!unlocked) return;
  const fn = SOUNDS[name];
  if (fn) fn();
}
```

- [ ] **Step 2: Unlock audio on first user input in `input.js`**

In `Input.onDown` first line:

```javascript
import { unlockAudio } from './audio.js';

onDown(cx, cy) {
  unlockAudio();
  // ... rest unchanged
}
```

- [ ] **Step 3: Wire sound calls**

| File | Where | Add |
|---|---|---|
| `main.js` | sun collect branch | `audio.play('collectSun');` |
| `main.js` | plant placed branch | `audio.play('plant');` |
| `plants.js` Peashooter `update` | after pushing pea | `audio.play('shoot');` |
| `plants.js` SnowPea `update` | after pushing pea | `audio.play('shoot');` |
| `projectiles.js` Pea `update` | on hit | `audio.play(this.snow ? 'iceHit' : 'hit');` |
| `plants.js` CherryBomb `explode` | first line | `audio.play('explode');` |
| `plants.js` PotatoMine `detonate` | first line | `audio.play('explode');` |
| `zombies.js` `Zombie` ctor | end | `audio.play('zombieMoan');` |
| `zombies.js` `update` eating tick | when bite triggers | `audio.play('bite');` |
| `mower.js` Mower `update` state→running | after setting state | `audio.play('mower');` |
| `game.js` setting `banner` for wave 2/3 | after `this.banner = ...` | `audio.play('alert');` |
| `game.js` `checkEnd` victory branch | after `this.victory = true;` | `audio.play('victory');` |
| `game.js` `checkEnd` defeat branch | after setting `this.over` | `audio.play('defeat');` |

For each: add `import { play } from './audio.js';` at top.

- [ ] **Step 4: Verify**

Reload, click around. Expected: clicking suns plays "ding"; planting plays "thud"; peashooter shooting plays "pew"; cherry bomb explosion plays loud noise; zombies moan when entering. Press a sun first to unlock audio (browser policy).

- [ ] **Step 5: Commit**

```bash
git add js/audio.js js/input.js js/main.js js/plants.js js/projectiles.js js/zombies.js js/mower.js js/game.js
git commit -m "feat(game-1): Web Audio synthesized sound effects"
```

---

## Phase 18: Pause Button + Mobile Orientation

### Task 18.1: Pause

**Files:**
- Modify: `js/ui.js`
- Modify: `js/main.js`

- [ ] **Step 1: Add pause button rendering in `ui.js`**

```javascript
const PAUSE_BTN = { x: 700, y: 14, w: 28, h: 28 };

function drawPauseButton(ctx, game) {
  ctx.fillStyle = '#3d2410';
  ctx.fillRect(PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.w, PAUSE_BTN.h);
  ctx.fillStyle = '#fff';
  if (game.paused) {
    ctx.beginPath();
    ctx.moveTo(PAUSE_BTN.x + 8, PAUSE_BTN.y + 6);
    ctx.lineTo(PAUSE_BTN.x + 22, PAUSE_BTN.y + 14);
    ctx.lineTo(PAUSE_BTN.x + 8, PAUSE_BTN.y + 22);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(PAUSE_BTN.x + 7, PAUSE_BTN.y + 6, 5, 16);
    ctx.fillRect(PAUSE_BTN.x + 16, PAUSE_BTN.y + 6, 5, 16);
  }
}

export function pauseButtonHit(x, y) {
  return x >= PAUSE_BTN.x && x <= PAUSE_BTN.x + PAUSE_BTN.w &&
         y >= PAUSE_BTN.y && y <= PAUSE_BTN.y + PAUSE_BTN.h;
}
```

Call `drawPauseButton(ctx, game)` inside `renderUI`.

Add pause overlay at end of `renderUI`:

```javascript
if (game.paused) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, CANVAS_W, 600);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('暂停', CANVAS_W / 2, 300);
}
```

- [ ] **Step 2: Hook pause click in `main.js`**

```javascript
import { pauseButtonHit } from './ui.js';

// in handleClick, before sun-collection branch:
if (pauseButtonHit(x, y)) {
  game.paused = !game.paused;
  return;
}
```

- [ ] **Step 3: Verify**

Click pause button → game freezes, dim overlay + "暂停" text. Click again → resumes.

- [ ] **Step 4: Commit**

```bash
git add js/ui.js js/main.js
git commit -m "feat(game-1): pause button"
```

### Task 18.2: Mobile orientation prompt

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

- [ ] **Step 1: Add orientation prompt in CSS**

Append to `style.css`:

```css
#rotate-prompt {
  display: none;
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.85);
  color: #fff;
  z-index: 100;
  align-items: center; justify-content: center;
  font-size: 22px;
  text-align: center;
  padding: 40px;
}
@media (max-width: 900px) and (orientation: portrait) {
  #rotate-prompt { display: flex; }
}
```

- [ ] **Step 2: Add prompt div to `index.html`**

```html
<body>
  <div id="rotate-prompt">📱 请将设备横屏以游玩</div>
  <div id="game-container">
    ...
```

- [ ] **Step 3: Verify**

Open in mobile (or Chrome devtools → device emulation → iPhone portrait). Expected: black overlay with rotate prompt. Switch to landscape: overlay disappears, game playable.

- [ ] **Step 4: Commit**

```bash
git add index.html css/style.css
git commit -m "feat(game-1): mobile portrait rotation prompt"
```

---

## Phase 19: Final Polish

### Task 19.1: Plant placement preview enhancement

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Replace simple preview with semi-transparent plant icon**

In `main.js`, after `renderScene(ctx, game)`:

```javascript
import { Sunflower, Peashooter, Wallnut, CherryBomb, SnowPea, PotatoMine } from './plants.js';

const PREVIEW_CTORS = {
  sunflower: Sunflower, peashooter: Peashooter, wallnut: Wallnut,
  cherrybomb: CherryBomb, snowpea: SnowPea, potatomine: PotatoMine,
};

// preview overlay logic:
if (game.selectedPlant) {
  const cell = pixelToCell(input.mouseX, input.mouseY);
  if (cell) {
    const r = { x: 70 + cell.col * 80, y: 90 + cell.row * 96, w: 80, h: 96 };
    const valid = !occupied(cell.col, cell.row);
    ctx.fillStyle = valid ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    if (valid) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      const Ctor = PREVIEW_CTORS[game.selectedPlant];
      const ghost = new Ctor(cell.col, cell.row);
      ghost.spawnT = 1;
      ghost.render(ctx);
      ctx.restore();
    }
  }
}
```

- [ ] **Step 2: Verify**

Select sunflower card. Expected: while moving the mouse over the lawn, a transparent sunflower follows the grid cells. Red overlay on occupied cells.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat(game-1): planting preview with ghost plant"
```

### Task 19.2: Remove debug grid lines

- [ ] **Step 1: In `renderer.js`, remove or reduce alpha of `drawGridDebug`**

Either delete the function call from `render()`, or change the stroke style to `'rgba(0,0,0,0.04)'` for a subtle hint.

- [ ] **Step 2: Commit**

```bash
git add js/renderer.js
git commit -m "polish(game-1): tone down debug grid lines"
```

### Task 19.3: Sun spawn poof particles

- [ ] **Step 1: In `main.js` plant-placement branch, add poof**

```javascript
import { spawnPlantingPoof } from './particles.js';

// after creating plant:
spawnPlantingPoof(game, colToX(cell.col), rowToY(cell.row) + 30);
```

(Add `colToX`, `rowToY` imports.)

- [ ] **Step 2: Commit**

```bash
git add js/main.js
git commit -m "polish(game-1): poof particles when planting"
```

---

## Phase 20: Final Verification & Tuning

### Task 20.1: Full playthrough test

- [ ] **Step 1: Open `index.html` in Chrome desktop**

Play one full round:
- Tutorial appears for 10s
- Place sunflowers; collect sun
- Wave 1 (5 basic zombies) defended
- Wave 2 alert + 10 mixed zombies
- Wave 3 with bucket zombies
- Reach victory screen

If too hard: reduce wave 3 bucket count from 4 to 3 in `levels.js`. If too easy: increase basic zombie count.

If too slow: speed up zombies in `config.js` (`speed: 32` → `40`). If too fast: reduce.

- [ ] **Step 2: Mobile playthrough**

Open in mobile Safari (or Chrome devtools mobile emulation, landscape). Verify:
- Canvas fills screen, ratio preserved
- Touch tap collects suns and selects cards
- Touch tap places plants
- Pause button works on touch

- [ ] **Step 3: Commit any tuning changes**

```bash
git add js/levels.js js/config.js
git commit -m "tune(game-1): final difficulty balancing"
```

### Task 20.2: README

- [ ] **Step 1: Create `game-1/README.md`**

```markdown
# 植物大战僵尸 v1.0

网页版植物大战僵尸单关卡 demo。

## 玩法

直接在浏览器打开 `index.html`。

- 收集天空掉落的阳光（点击）
- 选中底部植物卡片，再点击草坪格子种植
- 防守 3 波僵尸进攻
- 僵尸到达左侧时小推车会自动启动（每行限用一次）

## 6 种植物

| 植物 | 阳光 | 用途 |
|---|---|---|
| 🌻 向日葵 | 50 | 产阳光 |
| 🌱 豌豆射手 | 100 | 远程攻击 |
| 🌰 坚果墙 | 50 | 高血量肉盾 |
| 🍒 樱桃炸弹 | 150 | 大范围秒杀 |
| ❄️ 寒冰射手 | 175 | 攻击 + 减速 |
| 🥔 土豆雷 | 25 | 武装后接触爆炸 |

## 操作

- **桌面**：鼠标点击
- **移动端**：横屏 + 触屏 tap
- **暂停**：右上角按钮
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(game-1): add README"
```

---

## Verification Checklist (matches design spec §13)

- [ ] Double-click `index.html` opens and runs in Chrome/Safari
- [ ] Complete one level run with no errors in console
- [ ] All 6 plants playable with correct cost/cooldown/behavior
- [ ] All 3 zombie types appear with correct HP and speed
- [ ] 3 waves trigger at 10s / 45s / 95s
- [ ] Sun economy matches spec (50 start, 25 per drop every 10s, 25 per sunflower every 24s)
- [ ] Victory shows "胜利！" with restart button
- [ ] Defeat shows "僵尸吃掉了你的脑子！" with restart button
- [ ] All 13 sound effects audible after first user interaction
- [ ] iPhone landscape Safari plays correctly
- [ ] All JS code split into modules per §6.6 of design spec
