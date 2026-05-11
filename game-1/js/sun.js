import {
  SKY_SUN_VALUE, SKY_SUN_LIFETIME,
  GRID_X0, GRID_Y0, GRID_COLS, GRID_ROWS, CELL_W, CELL_H,
  COLORS,
} from './config.js';

export class Sun {
  constructor(x, y, value, fromSky = true) {
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.value = value;
    this.fromSky = fromSky;
    this.fromSunflower = !fromSky;

    if (fromSky) {
      this.vy = 110;
      this.targetY = GRID_Y0 + 20 + Math.random() * (GRID_ROWS * CELL_H - 60);
    } else {
      // sunflower: hop up + gravity drop
      this.vx = (Math.random() * 80 - 40);
      this.vy = -180;
      this.gravity = 500;
      this.targetY = y + 30;
    }

    this.life = SKY_SUN_LIFETIME;
    this.age = 0;
    this.collected = false;
    this.flyTo = null;
    this.flyT = 0;
    this.flyStart = null;
    this.isDead = false;

    // visual
    this.spinT = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.spinT += dt * 1.5;

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
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += this.gravity * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.vy = 0;
        this.vx = 0;
      }
    } else if (this.y < this.targetY) {
      this.y += this.vy * dt;
      if (this.y > this.targetY) this.y = this.targetY;
    }

    if (this.fromSunflower ? this.vy === 0 : this.y >= this.targetY) {
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
    const pulse = 1 + Math.sin(this.spinT * 2) * 0.06;
    const r = 22 * pulse;
    // outer glow
    const glow = ctx.createRadialGradient(this.x, this.y, 8, this.x, this.y, r + 8);
    glow.addColorStop(0, 'rgba(255, 240, 120, 0.5)');
    glow.addColorStop(1, 'rgba(255, 200, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r + 8, 0, Math.PI * 2);
    ctx.fill();
    // body
    const grad = ctx.createRadialGradient(this.x - 5, this.y - 5, 4, this.x, this.y, r);
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
    // rays
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.spinT);
    ctx.strokeStyle = 'rgba(255, 230, 120, 0.7)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(r + 2, 0);
      ctx.lineTo(r + 6, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  hitTest(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= 32 * 32;
  }
}

export function spawnSkySun(game) {
  const x = GRID_X0 + 20 + Math.random() * (GRID_COLS * CELL_W - 40);
  game.suns.push(new Sun(x, -20, SKY_SUN_VALUE, true));
}
