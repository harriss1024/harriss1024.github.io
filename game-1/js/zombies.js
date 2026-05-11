import { ZOMBIES, GRID_COLS } from './config.js';
import { rowToY, gridXToPixel } from './grid.js';
import { spawnZombieDeathSoul } from './particles.js';
import { play } from './audio.js';
import { getImage, getZombieWalkFrame } from './assets.js';

export class Zombie {
  constructor(type, row) {
    this.type = type;
    this.cfg = ZOMBIES[type];
    this.hp = this.cfg.hp;
    this.accessoryHpMax = this.cfg.accessoryHp || 0;
    this.accessoryHp = this.accessoryHpMax;
    this.row = row;
    this.gridX = GRID_COLS;
    this.x = gridXToPixel(this.gridX);
    this.y = rowToY(row);
    this.speed = this.cfg.speed;
    this.state = 'walking';
    this.biteTimer = 0;
    this.target = null;
    this.slowT = 0;
    this.dyingT = 0;
    this.spawnFade = 0;
    this.legPhase = Math.random() * Math.PI * 2;
    this.armPhase = Math.random() * Math.PI * 2;
    this.isDead = false;
    play('zombieMoan');
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
      spawnZombieDeathSoul(game, this.x, this.y);
      return;
    }

    const slow = this.slowT > 0 ? 0.5 : 1;

    if (this.state === 'walking') {
      this.gridX -= (this.speed * slow / 80) * dt;
      this.x = gridXToPixel(this.gridX);
      this.legPhase += dt * 5 * slow;
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
      this.armPhase += dt * 8;
      this.biteTimer += dt;
      if (this.biteTimer >= this.cfg.biteInterval) {
        this.biteTimer = 0;
        this.target.takeDamage(this.cfg.biteDamage);
        play('bite');
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
      ctx.rotate(k * Math.PI / 2.2);
      ctx.globalAlpha *= (1 - k);
      this.draw(ctx);
      ctx.restore();
      return;
    }
    ctx.translate(this.x, this.y);
    this.draw(ctx);
    if (this.slowT > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(120, 200, 240, 0.45)';
      ctx.fillRect(-30, -100, 60, 110);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  draw(ctx) {
    // Prefer frame-based walk animation if frames are loaded, otherwise
    // fall back to single static image, otherwise canvas drawing.
    const phase01 = ((this.legPhase / (Math.PI * 2)) % 1 + 1) % 1;
    const eating = this.state === 'eating';
    // When eating, lock to a single mid-stride frame so the zombie stops walking
    const walkFrame = getZombieWalkFrame(eating ? 0.4 : phase01);

    if (walkFrame) {
      drawZombieFrame(ctx, walkFrame, this, eating);
    } else {
      const staticImg = getImage('zombie_basic');
      if (staticImg) {
        drawZombieImage(ctx, staticImg, this);
      } else {
        drawBasicZombieBody(ctx, this);
      }
    }

    if (this.type === 'cone') drawCone(ctx, this.accessoryHp, this.accessoryHpMax);
    if (this.type === 'bucket') drawBucket(ctx, this.accessoryHp, this.accessoryHpMax);
  }
}

// Draws a frame of the zombie walk-cycle sprite sheet.
// Frames already encode pose; we add only minimal extra polish:
// - When eating, head-shake jitter to simulate biting
// - Otherwise no extra distortion (the frames carry the animation themselves)
function drawZombieFrame(ctx, img, z, eating) {
  const W = 95;
  const H = 130;
  let dx = 0, dy = 0, tilt = 0;
  if (eating) {
    dx = Math.sin(z.legPhase * 8) * 1.2;
    dy = Math.sin(z.legPhase * 4) * 1.5;
    tilt = -0.04;  // slight forward lean
  }
  ctx.save();
  if (tilt) ctx.rotate(tilt);
  // Anchor at bottom-center: feet roughly at y=14, head extends up to y≈-116
  ctx.drawImage(img, -W / 2 + dx, -H + 14 + dy, W, H);
  ctx.restore();
}

// Renders the zombie body image with a layered shambling-walk animation.
// We only have one frame, so we fake walking via:
//   1. Vertical bob (body rises mid-stride, drops on foot-strike)
//   2. Alternating tilt (body leans left/right with each step)
//   3. Foot-strike squash (vertical compression on impact for weight)
//   4. Asymmetric drift (zombies don't walk straight — slight wobble)
//   5. Idle micro-sway when eating, with head-shake from biting
function drawZombieImage(ctx, img, z) {
  const W = 90;
  const H = 130;
  const eating = z.state === 'eating';
  const phase = z.legPhase;

  let bobY, tilt, squashY, dx;

  if (eating) {
    // Eating: forward lean + small head-shake bobbing rhythm
    bobY = Math.sin(phase * 5) * 2;
    tilt = -0.06 + Math.sin(phase * 6) * 0.015;  // lean forward (left)
    squashY = 1;
    dx = Math.sin(phase * 6) * 1.2;
  } else {
    // Walking shamble:
    // - sin(phase) gives one full gait cycle (2 steps) per 2π
    // - abs(sin(phase * 2)) gives the up-down lift each step (peaks at mid-stride)
    const stride = Math.abs(Math.sin(phase));            // 0..1, one bump per step
    const sideTilt = Math.sin(phase * 0.5);              // -1..1, alternates each gait cycle
    bobY = -stride * 5;                                  // body lifts up while in stride
    tilt = sideTilt * 0.07 - 0.02;                       // ±4 deg lean, slight forward bias
    squashY = 1 - (1 - stride) * 0.05;                   // squash 5% at foot-strike (stride=0)
    dx = Math.cos(phase * 0.5) * 1.5;                    // gentle side-to-side drift
  }

  ctx.save();
  ctx.translate(dx, 0);
  ctx.rotate(tilt);
  ctx.scale(1, squashY);
  // Anchor: feet at y≈14, head up to y≈-116
  ctx.drawImage(img, -W / 2, -H + 14 + bobY, W, H);
  ctx.restore();
}

function drawBasicZombieBody(ctx, z) {
  const eating = z.state === 'eating';
  const legSwing = Math.sin(z.legPhase) * 5;
  // legs
  ctx.fillStyle = '#5a6a3a';
  ctx.fillRect(-10 + legSwing, -10, 8, 20);
  ctx.fillStyle = '#4a5a2a';
  ctx.fillRect(2 - legSwing, -10, 8, 20);
  // shoes
  ctx.fillStyle = '#2a1a08';
  ctx.fillRect(-12 + legSwing, 8, 11, 4);
  ctx.fillRect(0 - legSwing, 8, 11, 4);
  // body / shirt
  ctx.fillStyle = '#7a8a5a';
  ctx.fillRect(-15, -45, 30, 38);
  // shirt details (tattered)
  ctx.fillStyle = '#3d4a2a';
  ctx.beginPath();
  ctx.moveTo(-15, -28); ctx.lineTo(-10, -22);
  ctx.lineTo(-4, -28); ctx.lineTo(2, -22);
  ctx.lineTo(8, -28); ctx.lineTo(15, -22);
  ctx.lineTo(15, -8); ctx.lineTo(-15, -8);
  ctx.closePath();
  ctx.fill();
  // shirt collar
  ctx.fillStyle = '#3d4a2a';
  ctx.beginPath();
  ctx.moveTo(-15, -45);
  ctx.lineTo(-8, -41); ctx.lineTo(-2, -45); ctx.lineTo(4, -41); ctx.lineTo(10, -45); ctx.lineTo(15, -41);
  ctx.lineTo(15, -34); ctx.lineTo(-15, -34);
  ctx.closePath();
  ctx.fill();
  // arms reaching forward
  const armReach = eating ? Math.sin(z.armPhase) * 4 : 0;
  ctx.fillStyle = '#a8b888';
  ctx.fillRect(-26 - armReach, -40, 12, 6);
  ctx.fillRect(-30 - armReach, -36, 6, 6);
  ctx.fillRect(-26 - armReach, -34, 12, 6);
  // tie
  ctx.fillStyle = '#7c2222';
  ctx.beginPath();
  ctx.moveTo(0, -34); ctx.lineTo(-4, -28); ctx.lineTo(0, -16); ctx.lineTo(4, -28);
  ctx.closePath();
  ctx.fill();
  // head
  const headBob = eating ? Math.sin(z.legPhase * 4) * 2 : Math.sin(z.legPhase) * 1;
  ctx.save();
  ctx.translate(-2, -55 + headBob);
  ctx.rotate(-0.08);
  // neck
  ctx.fillStyle = '#5a6a3a';
  ctx.fillRect(-4, 6, 8, 6);
  // skull
  ctx.fillStyle = '#a8b888';
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  // hair tuft
  ctx.fillStyle = '#3d2410';
  ctx.beginPath();
  ctx.moveTo(-12, -10); ctx.lineTo(-8, -16); ctx.lineTo(-2, -12);
  ctx.lineTo(4, -16); ctx.lineTo(10, -10); ctx.lineTo(8, -6); ctx.lineTo(-10, -6);
  ctx.closePath();
  ctx.fill();
  // eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-5, -2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(-4, -1, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -1, 1.5, 0, Math.PI * 2); ctx.fill();
  // mouth
  ctx.strokeStyle = '#3d2410';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (eating) {
    ctx.moveTo(-7, 8); ctx.lineTo(-3, 11); ctx.lineTo(0, 8); ctx.lineTo(3, 11); ctx.lineTo(7, 8);
  } else {
    ctx.moveTo(-7, 9); ctx.lineTo(7, 9);
  }
  ctx.stroke();
  // teeth hint
  ctx.fillStyle = '#fff';
  ctx.fillRect(-2, 8, 2, 2);
  ctx.fillRect(2, 8, 2, 2);
  ctx.restore();
}

function drawCone(ctx, accessoryHp, maxHp) {
  const stage = accessoryHp > maxHp * 2 / 3 ? 0 : accessoryHp > maxHp / 3 ? 1 : 2;
  ctx.save();
  ctx.translate(-2, -68);
  // cone body
  const grad = ctx.createLinearGradient(-14, 12, 14, -22);
  grad.addColorStop(0, '#c66010');
  grad.addColorStop(0.5, '#e88830');
  grad.addColorStop(1, '#a04808');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-14, 12);
  ctx.lineTo(14, 12);
  ctx.lineTo(2, -22);
  ctx.lineTo(-2, -22);
  ctx.closePath();
  ctx.fill();
  // stripes
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-12, 4); ctx.lineTo(12, 4);
  ctx.moveTo(-9, -4); ctx.lineTo(9, -4);
  ctx.moveTo(-5, -12); ctx.lineTo(5, -12);
  ctx.stroke();
  // damage stages
  if (stage >= 1) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -22); ctx.lineTo(-3, -16); ctx.lineTo(3, -10);
    ctx.stroke();
  }
  if (stage >= 2) {
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-5, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, 6, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a3018';
    ctx.beginPath();
    ctx.moveTo(-14, 12); ctx.lineTo(-12, 6); ctx.lineTo(-9, 12); ctx.fill();
  }
  ctx.restore();
}

function drawBucket(ctx, accessoryHp, maxHp) {
  const stage = accessoryHp > maxHp * 2 / 3 ? 0 : accessoryHp > maxHp / 3 ? 1 : 2;
  ctx.save();
  ctx.translate(-2, -76);
  // body
  const grad = ctx.createLinearGradient(-15, 18, 15, -8);
  grad.addColorStop(0, '#6a6a6a');
  grad.addColorStop(0.5, '#a8a8a8');
  grad.addColorStop(1, '#7a7a7a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-15, 18);
  ctx.lineTo(15, 18);
  ctx.lineTo(13, -8);
  ctx.lineTo(-13, -8);
  ctx.closePath();
  ctx.fill();
  // top rim
  ctx.fillStyle = '#5a5a5a';
  ctx.fillRect(-15, -10, 30, 4);
  // rivets
  ctx.fillStyle = '#3a3a3a';
  ctx.beginPath(); ctx.arc(-11, -2, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(11, -2, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-11, 12, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(11, 12, 1.5, 0, Math.PI * 2); ctx.fill();
  // stage damage
  if (stage >= 1) {
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.moveTo(-7, 12); ctx.lineTo(0, 4); ctx.lineTo(5, 12); ctx.fill();
  }
  if (stage >= 2) {
    ctx.fillStyle = '#7a4a1a';
    ctx.beginPath(); ctx.arc(-8, 5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, 14, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.moveTo(13, -8); ctx.lineTo(10, -4); ctx.lineTo(13, 0); ctx.fill();
  }
  ctx.restore();
}

function sameCell(plant, zombie) {
  if (plant.row !== zombie.row) return false;
  return Math.abs(zombie.x - plant.x) < 32;
}

function findTargetPlant(game, zombie) {
  for (const p of game.plants) {
    if (p.row !== zombie.row || p.isDead) continue;
    if (zombie.x - 14 < p.x + 24 && zombie.x + 6 > p.x - 24) {
      return p;
    }
  }
  return null;
}

export function createZombie(type, row) {
  return new Zombie(type, row);
}
