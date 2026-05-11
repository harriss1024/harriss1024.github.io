import { GRID_X0, GRID_ROWS } from './config.js';
import { rowToY } from './grid.js';
import { play } from './audio.js';

export class Mower {
  constructor(row) {
    this.row = row;
    this.x = GRID_X0 - 28;
    this.y = rowToY(row);
    this.state = 'idle';
    this.speed = 0;
    this.bladePhase = 0;
    this.isDead = false;
  }

  update(dt, game) {
    if (this.state === 'idle') {
      for (const z of game.zombies) {
        if (z.row !== this.row || z.state === 'dying') continue;
        if (z.x <= GRID_X0 + 50) {
          this.state = 'running';
          this.speed = 80;
          play('mower');
          break;
        }
      }
    } else if (this.state === 'running') {
      this.speed = Math.min(this.speed + 1000 * dt, 700);
      this.x += this.speed * dt;
      this.bladePhase += dt * 25;
      for (const z of game.zombies) {
        if (z.row !== this.row || z.state === 'dying') continue;
        if (Math.abs(z.x - this.x) < 30) {
          z.hp = -9999;
          z.accessoryHp = 0;
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
    ctx.translate(this.x, this.y + 22);
    // body
    const grad = ctx.createLinearGradient(0, -16, 0, 8);
    grad.addColorStop(0, '#e44');
    grad.addColorStop(1, '#a22');
    ctx.fillStyle = grad;
    ctx.fillRect(-22, -14, 44, 18);
    // top stripe
    ctx.fillStyle = '#fff';
    ctx.fillRect(-22, -10, 44, 2);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MOWER', 0, -1);
    // wheels
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-14, 6, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, 6, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#666';
    ctx.beginPath(); ctx.arc(-14, 6, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, 6, 3, 0, Math.PI * 2); ctx.fill();
    // blade (spinning when running)
    ctx.save();
    ctx.translate(-26, -2);
    if (this.state === 'running') {
      ctx.rotate(this.bladePhase);
      ctx.fillStyle = 'rgba(200,200,200,0.5)';
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillRect(-1, -10, 2, 20);
      }
    } else {
      ctx.fillStyle = '#999';
      ctx.fillRect(-3, -8, 6, 16);
    }
    ctx.restore();
    // handle
    ctx.strokeStyle = '#222';
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
