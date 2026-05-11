import {
  PLANTS, SUNFLOWER_INTERVAL, SUNFLOWER_SUN_VALUE,
  PEASHOOTER_FIRE_INTERVAL,
  CHERRY_FUSE, POTATO_ARM_TIME, EXPLOSION_RADIUS_COLS,
} from './config.js';
import { colToX, rowToY } from './grid.js';
import { Sun } from './sun.js';
import { Pea } from './projectiles.js';
import { spawnExplosion, spawnFloatingText } from './particles.js';
import { play } from './audio.js';
import { getImage } from './assets.js';

function easeOut(t) { return 1 - (1 - t) * (1 - t); }

export class Plant {
  constructor(id, col, row) {
    this.id = id;
    this.cfg = PLANTS[id];
    this.col = col;
    this.row = row;
    this.x = colToX(col);
    this.y = rowToY(row);
    this.hp = this.cfg.hp;
    this.maxHp = this.cfg.hp;
    this.spawnT = 0;
    this.lifetime = 0;
    this.shake = 0;
    this.isDead = false;
  }

  update(dt, game) {
    this.spawnT = Math.min(this.spawnT + dt * 3.5, 1);
    this.lifetime += dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.hp <= 0) this.isDead = true;
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    this.shake = 0.15;
  }

  render(ctx) {
    const scale = 0.3 + 0.7 * easeOut(this.spawnT);
    const shakeX = this.shake > 0 ? (Math.random() * 4 - 2) : 0;
    ctx.save();
    ctx.translate(this.x + shakeX, this.y + 18);
    ctx.scale(scale, scale);
    this.draw(ctx);
    ctx.restore();
  }

  draw(ctx) { /* override */ }
}

export class Sunflower extends Plant {
  constructor(col, row) {
    super('sunflower', col, row);
    this.cycle = SUNFLOWER_INTERVAL * 0.55;
    this.pulse = 0;
    this.bob = Math.random() * Math.PI * 2;
  }

  update(dt, game) {
    super.update(dt, game);
    this.bob += dt * 1.5;
    this.cycle -= dt;
    this.pulse = Math.max(this.pulse - dt * 2.5, 0);
    if (this.cycle <= 0) {
      this.cycle = SUNFLOWER_INTERVAL;
      this.pulse = 1;
      game.suns.push(new Sun(this.x + (Math.random() * 20 - 10), this.y - 10, SUNFLOWER_SUN_VALUE, false));
    }
  }

  draw(ctx) {
    const img = getImage('sunflower');
    if (img) {
      drawSunflowerImage(ctx, img, this);
      return;
    }
    const sway = Math.sin(this.bob) * 0.05;
    ctx.save();
    ctx.rotate(sway);
    // stem
    ctx.fillStyle = '#3a8b3a';
    ctx.fillRect(-4, -8, 8, 30);
    // leaves
    ctx.fillStyle = '#4eaa4e';
    ctx.beginPath();
    ctx.ellipse(-12, 8, 10, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(12, 14, 10, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // petals
    const pulseScale = 1 + this.pulse * 0.18;
    ctx.save();
    ctx.translate(0, -22);
    ctx.scale(pulseScale, pulseScale);
    ctx.fillStyle = '#ffd24a';
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      ctx.save();
      ctx.rotate(a);
      const grad = ctx.createLinearGradient(0, -8, 0, -22);
      grad.addColorStop(0, '#ffe580');
      grad.addColorStop(1, '#f6a800');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, -18, 7, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // center
    const centerGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 14);
    centerGrad.addColorStop(0, '#a06a30');
    centerGrad.addColorStop(1, '#5a3010');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    // seeds dots
    ctx.fillStyle = '#3a1a08';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 6, Math.sin(a) * 6, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // smile
    ctx.strokeStyle = '#3a1a08';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 2, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }
}

export class Peashooter extends Plant {
  constructor(col, row) {
    super('peashooter', col, row);
    this.fireT = 0;
    this.firing = 0;
    this.bob = Math.random() * Math.PI * 2;
  }

  update(dt, game) {
    super.update(dt, game);
    this.bob += dt * 1.5;
    this.firing = Math.max(0, this.firing - dt * 6);
    const hasZombie = game.zombies.some(z =>
      z.row === this.row && z.state !== 'dying' && z.x > this.x);
    if (hasZombie) {
      this.fireT += dt;
      if (this.fireT >= PEASHOOTER_FIRE_INTERVAL) {
        this.fireT = 0;
        this.firing = 1;
        game.projectiles.push(new Pea(this.x + 10, this.row, false));
        play('shoot');
      }
    } else {
      this.fireT = Math.min(this.fireT + dt, PEASHOOTER_FIRE_INTERVAL);
    }
  }

  draw(ctx) {
    const img = getImage('peashooter');
    if (img) {
      drawPlantImage(ctx, img, this);
    } else {
      drawShooterBody(ctx, this, '#3eaa3e', '#2a7a2a', false);
    }
  }
}

// Draws a plant image anchored at bottom-center of the cell.
// Adds a subtle bob and a small "punch" forward when firing.
function drawPlantImage(ctx, img, plant) {
  const sway = Math.sin(plant.bob || 0) * 0.04;
  const punch = (plant.firing || 0) * 4;   // shifts right when firing
  const W = 80;
  const H = 90;
  ctx.save();
  ctx.rotate(sway);
  ctx.drawImage(img, -W / 2 + punch, -H + 16, W, H);
  ctx.restore();
}

// Sunflower has a pulse animation when producing a sun.
function drawSunflowerImage(ctx, img, plant) {
  const sway = Math.sin(plant.bob) * 0.04;
  const pulse = 1 + plant.pulse * 0.18;
  const W = 78;
  const H = 92;
  ctx.save();
  ctx.rotate(sway);
  ctx.scale(pulse, pulse);
  ctx.drawImage(img, -W / 2, -H + 16, W, H);
  ctx.restore();
}

export class SnowPea extends Plant {
  constructor(col, row) {
    super('snowpea', col, row);
    this.fireT = 0;
    this.firing = 0;
    this.bob = Math.random() * Math.PI * 2;
  }

  update(dt, game) {
    super.update(dt, game);
    this.bob += dt * 1.5;
    this.firing = Math.max(0, this.firing - dt * 6);
    const hasZombie = game.zombies.some(z =>
      z.row === this.row && z.state !== 'dying' && z.x > this.x);
    if (hasZombie) {
      this.fireT += dt;
      if (this.fireT >= PEASHOOTER_FIRE_INTERVAL) {
        this.fireT = 0;
        this.firing = 1;
        game.projectiles.push(new Pea(this.x + 10, this.row, true));
        play('shoot');
      }
    } else {
      this.fireT = Math.min(this.fireT + dt, PEASHOOTER_FIRE_INTERVAL);
    }
  }

  draw(ctx) {
    drawShooterBody(ctx, this, '#9fd3e8', '#5fa3c5', true);
  }
}

function drawShooterBody(ctx, plant, mainColor, darkColor, snow) {
  const sway = Math.sin(plant.bob) * 0.04;
  ctx.save();
  ctx.rotate(sway);
  // stem
  ctx.fillStyle = '#3a8b3a';
  ctx.fillRect(-4, -8, 8, 30);
  // leaves
  ctx.fillStyle = '#4eaa4e';
  ctx.beginPath();
  ctx.ellipse(-12, 12, 10, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(12, 18, 10, 5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // head
  ctx.save();
  ctx.translate(0, -20);
  const grad = ctx.createRadialGradient(-5, -7, 3, 0, 0, 20);
  grad.addColorStop(0, snow ? '#ffffff' : '#7eda7e');
  grad.addColorStop(1, mainColor);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  // top accent
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.arc(0, -2, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.arc(-3, -5, 8, 0, Math.PI * 2);
  ctx.fill();
  // mouth (firing animation)
  ctx.fillStyle = '#000';
  ctx.beginPath();
  if (plant.firing > 0.5) ctx.ellipse(13, 0, 6, 6, 0, 0, Math.PI * 2);
  else ctx.ellipse(13, 0, 5, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // muzzle
  ctx.fillStyle = darkColor;
  ctx.fillRect(11, -4, 4, 8);
  // eye
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-3, -3, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(-3, -2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-2, -3, 1, 0, Math.PI * 2); ctx.fill();

  if (snow) {
    // snowflake on forehead
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.translate(-10, -8);
      ctx.rotate(i * Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -5);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
  ctx.restore();
}

export class Wallnut extends Plant {
  constructor(col, row) {
    super('wallnut', col, row);
  }
  draw(ctx) {
    const stage = this.hp > this.maxHp * 2 / 3 ? 0 : this.hp > this.maxHp / 3 ? 1 : 2;
    // body
    const grad = ctx.createRadialGradient(-6, -28, 4, 0, -22, 30);
    grad.addColorStop(0, '#c89060');
    grad.addColorStop(0.6, '#a06a3a');
    grad.addColorStop(1, '#6a3a18');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, -22, 26, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    // shell texture
    ctx.fillStyle = '#7a4a2a';
    ctx.beginPath();
    ctx.ellipse(-10, -28, 8, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, -16, 7, 3, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-7, -22, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -22, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    const eyeOffset = stage === 2 ? 1 : 0;
    ctx.beginPath(); ctx.arc(-7 + eyeOffset, -22, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7 + eyeOffset, -22, 2.5, 0, Math.PI * 2); ctx.fill();
    // mouth
    ctx.strokeStyle = '#3a1a08';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (stage === 0) {
      ctx.arc(0, -12, 4, 0, Math.PI);
    } else {
      ctx.moveTo(-5, -10);
      ctx.lineTo(-2, -13);
      ctx.lineTo(2, -10);
      ctx.lineTo(5, -13);
    }
    ctx.stroke();
    // cracks
    if (stage >= 1) {
      ctx.strokeStyle = '#3d1a08';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-15, -38); ctx.lineTo(-10, -32); ctx.lineTo(-15, -25);
      ctx.moveTo(12, -8); ctx.lineTo(6, -14); ctx.lineTo(12, -20);
      ctx.stroke();
    }
    if (stage >= 2) {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-20, -10); ctx.lineTo(-5, -22); ctx.lineTo(-8, -38);
      ctx.moveTo(18, -28); ctx.lineTo(8, -22); ctx.lineTo(15, -10);
      ctx.stroke();
    }
  }
}

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
    // sparks every now and then
    if (Math.random() < dt * 8) {
      game.particles.push({
        x: this.x + (Math.random() * 30 - 15),
        y: this.y - 30 + (Math.random() * 10 - 5),
        vx: (Math.random() * 60 - 30),
        vy: -60 - Math.random() * 40,
        gravity: 200,
        r: 2,
        life: 0.3,
        t: 0,
        isDead: false,
        update(dt) {
          this.t += dt;
          if (this.t >= this.life) this.isDead = true;
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          this.vy += this.gravity * dt;
        },
        render(ctx) {
          const a = 1 - this.t / this.life;
          ctx.fillStyle = `rgba(255, 220, 80, ${a.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
          ctx.fill();
        },
      });
    }
    if (this.fuse <= 0) this.explode(game);
  }

  explode(game) {
    this.exploded = true;
    play('explode');
    spawnExplosion(game, this.x, this.y - 20);
    for (const z of game.zombies) {
      if (z.state === 'dying') continue;
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
    const r = Math.max(0, 1 - this.fuse / CHERRY_FUSE);
    const swell = 1 + r * 0.3;
    ctx.save();
    ctx.scale(swell, swell);
    // stem connector
    ctx.fillStyle = '#3a8b3a';
    ctx.fillRect(-3, -32, 6, 14);
    ctx.beginPath();
    ctx.moveTo(-3, -32); ctx.lineTo(-12, -38); ctx.lineTo(-3, -28); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, -32); ctx.lineTo(12, -38); ctx.lineTo(3, -28); ctx.fill();
    // two cherries
    const red = `rgb(${200 + flicker * 55 | 0}, ${20 + flicker * 30 | 0}, ${30})`;
    ctx.fillStyle = red;
    ctx.beginPath(); ctx.arc(-12, -12, 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -12, 18, 0, Math.PI * 2); ctx.fill();
    // shading
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(-12, -8, 18, 0.2 * Math.PI, 0.8 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -8, 18, 0.2 * Math.PI, 0.8 * Math.PI); ctx.fill();
    // highlights
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(-17, -18, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -18, 4, 0, Math.PI * 2); ctx.fill();
    // angry eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-12, -12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-12, -12, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -12, 2, 0, Math.PI * 2); ctx.fill();
    // angry brows
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -20); ctx.lineTo(-7, -16);
    ctx.moveTo(7, -16); ctx.lineTo(18, -20);
    ctx.stroke();
    ctx.restore();
  }
}

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
      if (this.armT <= 0) {
        this.armed = true;
        spawnFloatingText(game, this.x, this.y - 10, 'READY!', '#ff4');
      }
    } else {
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
    play('explode');
    spawnExplosion(game, this.x, this.y - 5);
    for (const z of game.zombies) {
      if (z.state === 'dying') continue;
      if (Math.abs(z.row - this.row) <= EXPLOSION_RADIUS_COLS &&
          Math.abs((z.x - this.x) / 80) <= EXPLOSION_RADIUS_COLS + 0.5) {
        z.hp = -9999;
        z.accessoryHp = 0;
      }
    }
    this.isDead = true;
  }

  draw(ctx) {
    if (!this.armed) {
      // buried: only top edge of potato visible, label
      ctx.fillStyle = '#a87c3a';
      ctx.beginPath();
      ctx.ellipse(0, 8, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-32, -10, 64, 16);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('准备中', 0, 1);
    } else {
      // armed: full potato + blinking red button
      const grad = ctx.createRadialGradient(-4, -4, 3, 0, 0, 22);
      grad.addColorStop(0, '#d4a070');
      grad.addColorStop(1, '#7a5020');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      // dark spots
      ctx.fillStyle = '#5a3010';
      ctx.beginPath(); ctx.ellipse(-10, -3, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8, 3, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-2, 6, 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      // button
      const blink = Math.sin(this.lifetime * 8) * 0.5 + 0.5;
      ctx.fillStyle = `rgb(${180 + blink * 75 | 0}, ${30 + blink * 30 | 0}, 30)`;
      ctx.beginPath(); ctx.arc(0, -10, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${(0.2 + blink * 0.4).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(-2, -12, 2, 0, Math.PI * 2); ctx.fill();
      // eyes
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(-7, 0, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, 0, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

const PLANT_CTORS = {
  sunflower: Sunflower,
  peashooter: Peashooter,
  wallnut: Wallnut,
  cherrybomb: CherryBomb,
  snowpea: SnowPea,
  potatomine: PotatoMine,
};

export function createPlant(id, col, row) {
  const Ctor = PLANT_CTORS[id];
  if (!Ctor) throw new Error('Unknown plant: ' + id);
  return new Ctor(col, row);
}

export function getPlantCtor(id) {
  return PLANT_CTORS[id];
}
