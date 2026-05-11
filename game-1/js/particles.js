export class Particle {
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx || 0;
    this.vy = opts.vy || 0;
    this.gravity = opts.gravity || 0;
    this.r = opts.r || 4;
    this.life = opts.life || 0.5;
    this.color = opts.color || 'rgba(255,255,255,ALPHA)';
    this.shrink = opts.shrink ?? true;
    this.t = 0;
    this.isDead = false;
  }

  update(dt) {
    this.t += dt;
    if (this.t >= this.life) { this.isDead = true; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
  }

  render(ctx) {
    const alpha = 1 - this.t / this.life;
    ctx.fillStyle = this.color.replace('ALPHA', alpha.toFixed(2));
    const r = this.shrink ? this.r * (1 - this.t / this.life * 0.5) : this.r;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.1, r), 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Shockwave {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.t = 0;
    this.life = 0.4;
    this.isDead = false;
  }
  update(dt) {
    this.t += dt;
    if (this.t >= this.life) this.isDead = true;
  }
  render(ctx) {
    const k = this.t / this.life;
    const r = 30 + k * 150;
    ctx.strokeStyle = `rgba(255, 255, 220, ${(1 - k).toFixed(2)})`;
    ctx.lineWidth = 10 * (1 - k);
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.stroke();
    // inner glow
    ctx.fillStyle = `rgba(255, 180, 60, ${(0.4 * (1 - k)).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class FloatingText {
  constructor(x, y, text, color = '#fff') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.t = 0;
    this.life = 0.5;
    this.isDead = false;
  }
  update(dt) {
    this.t += dt;
    this.y -= 30 * dt;
    if (this.t >= this.life) this.isDead = true;
  }
  render(ctx) {
    const alpha = 1 - this.t / this.life;
    ctx.fillStyle = this.color;
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}

export function spawnExplosion(game, cx, cy) {
  game.particles.push(new Shockwave(cx, cy));
  // sparks
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 80 + Math.random() * 220;
    game.particles.push(new Particle({
      x: cx, y: cy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 60,
      gravity: 220,
      r: 3 + Math.random() * 5,
      life: 0.5 + Math.random() * 0.4,
      color: `rgba(${200 + (Math.random() * 55) | 0}, ${80 + (Math.random() * 100) | 0}, 30, ALPHA)`,
    }));
  }
  // smoke
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 25 + Math.random() * 80;
    game.particles.push(new Particle({
      x: cx, y: cy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 40,
      r: 8 + Math.random() * 8,
      life: 0.7 + Math.random() * 0.3,
      color: 'rgba(80, 80, 80, ALPHA)',
      shrink: false,
    }));
  }
}

export function spawnHit(game, x, y, snow) {
  const color = snow ? 'rgba(180, 230, 255, ALPHA)' : 'rgba(220, 240, 80, ALPHA)';
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 80;
    game.particles.push(new Particle({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 40,
      gravity: 250,
      r: 2.5,
      life: 0.4,
      color,
    }));
  }
}

export function spawnSnowflakes(game, x, y) {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 30 + Math.random() * 50;
    game.particles.push(new Particle({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 30,
      gravity: 80,
      r: 2,
      life: 0.6,
      color: 'rgba(220, 240, 255, ALPHA)',
    }));
  }
}

export function spawnPlantingPoof(game, x, y) {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 30 + Math.random() * 50;
    game.particles.push(new Particle({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 60,
      gravity: 200,
      r: 4,
      life: 0.45,
      color: 'rgba(180, 130, 80, ALPHA)',
    }));
  }
}

export function spawnZombieDeathSoul(game, x, y) {
  for (let i = 0; i < 4; i++) {
    game.particles.push(new Particle({
      x: x + (Math.random() * 20 - 10),
      y: y - 30,
      vx: (Math.random() * 30 - 15),
      vy: -40 - Math.random() * 30,
      r: 6 + Math.random() * 4,
      life: 1,
      color: 'rgba(255, 255, 255, ALPHA)',
      shrink: false,
    }));
  }
}

export function spawnFloatingText(game, x, y, text, color) {
  game.particles.push(new FloatingText(x, y, text, color));
}
