import { PROJECTILE_SPEED, PEA_DAMAGE, SNOW_PEA_SLOW_DURATION, CANVAS_W } from './config.js';
import { rowToY } from './grid.js';
import { spawnHit } from './particles.js';
import { play } from './audio.js';

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
    this.trail.push({ x: this.x, y: this.y, life: 0.18 });
    for (const t of this.trail) t.life -= dt;
    this.trail = this.trail.filter(t => t.life > 0);

    this.x += PROJECTILE_SPEED * dt;
    if (this.x > CANVAS_W + 20) { this.isDead = true; return; }

    for (const z of game.zombies) {
      if (z.row !== this.row || z.isDead || z.state === 'dying') continue;
      if (this.x >= z.getFrontX() && this.x <= z.x + 12) {
        z.takeDamage(this.dmg);
        if (this.snow) z.applySlow(SNOW_PEA_SLOW_DURATION);
        spawnHit(game, this.x, this.y, this.snow);
        play(this.snow ? 'iceHit' : 'hit');
        this.isDead = true;
        return;
      }
    }
  }

  render(ctx) {
    for (const t of this.trail) {
      const a = (t.life / 0.18).toFixed(2);
      ctx.fillStyle = this.snow ? `rgba(159,211,232,${a})` : `rgba(180, 240, 130, ${a})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 5 * (t.life / 0.18), 0, Math.PI * 2);
      ctx.fill();
    }
    const grad = ctx.createRadialGradient(this.x - 2, this.y - 2, 1, this.x, this.y, 7);
    if (this.snow) {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#7fc3e0');
    } else {
      grad.addColorStop(0, '#dffbb0');
      grad.addColorStop(1, '#5fa830');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.snow ? '#3a6a80' : '#2e6a18';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}
