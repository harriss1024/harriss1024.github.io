import { CANVAS_W, COLORS, PLANTS } from './config.js';
import { getImage } from './assets.js';

const CARD_W = 70;
const CARD_H = 86;
const CARD_GAP = 4;
const CARD_BAR_X = 110;
const CARD_BAR_Y = 4;

const CARD_ORDER = ['sunflower', 'peashooter', 'wallnut', 'cherrybomb', 'snowpea', 'potatomine'];

const PAUSE_BTN = { x: 700, y: 12, w: 32, h: 32 };

export function getCardOrder() { return CARD_ORDER; }

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

export function pauseButtonHit(x, y) {
  return x >= PAUSE_BTN.x && x <= PAUSE_BTN.x + PAUSE_BTN.w &&
         y >= PAUSE_BTN.y && y <= PAUSE_BTN.y + PAUSE_BTN.h;
}

export function endScreenButtonHit(x, y) {
  return x >= CANVAS_W / 2 - 100 && x <= CANVAS_W / 2 + 100 &&
         y >= 350 && y <= 410;
}

export function renderUI(ctx, game) {
  drawSunCounter(ctx, game);
  drawCardBar(ctx, game);
  drawWaveProgress(ctx, game);
  drawPauseButton(ctx, game);
  drawTutorial(ctx, game);
  drawBanner(ctx, game);
  if (game.paused && !game.over) drawPauseOverlay(ctx);
  if (game.over) drawEndScreen(ctx, game);
}

function drawSunCounter(ctx, game) {
  ctx.fillStyle = '#3d2410';
  ctx.fillRect(8, 12, 96, 36);
  ctx.fillStyle = COLORS.woodLight;
  ctx.fillRect(10, 14, 92, 32);
  // sun icon
  const grad = ctx.createRadialGradient(28, 30, 4, 28, 30, 14);
  grad.addColorStop(0, '#fff8a3');
  grad.addColorStop(1, '#e89d00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(28, 30, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a36b00';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // count
  ctx.fillStyle = '#000';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.sun, 73, 38);
}

function drawCardBar(ctx, game) {
  for (let i = 0; i < CARD_ORDER.length; i++) {
    const id = CARD_ORDER[i];
    const cfg = PLANTS[id];
    const r = getCardRect(i);
    const cooldown = game.cardCooldowns[id] || 0;
    const cooldownPct = cooldown > 0 ? Math.min(cooldown / cfg.cooldown, 1) : 0;
    const insufficient = game.sun < cfg.cost;

    // shadow / border
    ctx.fillStyle = '#3d2410';
    ctx.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    // bg
    const grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    grad.addColorStop(0, '#e0bb88');
    grad.addColorStop(1, '#b08a55');
    ctx.fillStyle = grad;
    ctx.fillRect(r.x, r.y, r.w, r.h);

    // icon
    drawCardIcon(ctx, id, r.x + r.w / 2, r.y + 30);

    // cost label background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(r.x, r.y + r.h - 18, r.w, 18);
    // sun glyph
    ctx.fillStyle = COLORS.sunGold;
    ctx.beginPath();
    ctx.arc(r.x + 12, r.y + r.h - 9, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cfg.cost, r.x + r.w / 2 + 6, r.y + r.h - 5);

    if (cooldownPct > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(r.x, r.y, r.w, r.h * cooldownPct);
    }
    if (insufficient) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    if (game.selectedPlant === id) {
      ctx.strokeStyle = COLORS.sunGold;
      ctx.lineWidth = 3;
      ctx.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
    }
  }
}

function drawCardIcon(ctx, id, cx, cy) {
  // Prefer the user-supplied image if it has loaded.
  const img = getImage(id);
  if (img) {
    const size = 46;
    ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    return;
  }
  ctx.save();
  ctx.translate(cx, cy);
  switch (id) {
    case 'sunflower': drawSunflowerIcon(ctx); break;
    case 'peashooter': drawShooterIcon(ctx, '#3eaa3e', '#2a7a2a', false); break;
    case 'wallnut': drawWallnutIcon(ctx); break;
    case 'cherrybomb': drawCherryIcon(ctx); break;
    case 'snowpea': drawShooterIcon(ctx, '#9fd3e8', '#5fa3c5', true); break;
    case 'potatomine': drawPotatoIcon(ctx); break;
  }
  ctx.restore();
}

function drawSunflowerIcon(ctx) {
  ctx.fillStyle = '#ffd24a';
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, -12, 5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#7a4a1a';
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a1a08';
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 4, Math.sin(a) * 4, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawShooterIcon(ctx, mainColor, darkColor, snow) {
  ctx.fillStyle = mainColor;
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = darkColor;
  ctx.beginPath(); ctx.arc(0, -2, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(11, 0, 5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-3, -3, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(-3, -2, 2, 0, Math.PI * 2); ctx.fill();
  if (snow) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.translate(-8, -7);
      ctx.rotate(i * Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -3);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawWallnutIcon(ctx) {
  const grad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 18);
  grad.addColorStop(0, '#c89060');
  grad.addColorStop(1, '#7a4a2a');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(0, 0, 17, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-5, -2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(-5, -2, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -2, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a1a08';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, 6, 3, 0, Math.PI); ctx.stroke();
}

function drawCherryIcon(ctx) {
  ctx.fillStyle = '#3a8b3a';
  ctx.fillRect(-2, -16, 4, 8);
  ctx.fillStyle = '#d8313a';
  ctx.beginPath(); ctx.arc(-7, 2, 11, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(7, 2, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.arc(-10, -3, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -3, 3, 0, Math.PI * 2); ctx.fill();
}

function drawPotatoIcon(ctx) {
  const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 16);
  grad.addColorStop(0, '#d4a070');
  grad.addColorStop(1, '#7a5020');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(0, 4, 17, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a3010';
  ctx.beginPath(); ctx.ellipse(-7, -1, 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, 5, 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c44';
  ctx.beginPath(); ctx.arc(0, -4, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(-5, 2, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, 2, 1.2, 0, Math.PI * 2); ctx.fill();
}

function drawWaveProgress(ctx, game) {
  const cx = CANVAS_W - 90;
  const cy = 28;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('波次', cx - 6, cy + 4);
  for (let i = 0; i < 3; i++) {
    const x = cx + i * 22;
    const isActive = i === game.currentWave - 1 && !game.wavesFinished;
    const isPast = i < game.currentWave - 1 || (game.wavesFinished && i < game.currentWave);
    if (isPast) {
      ctx.fillStyle = '#4caf50';
    } else if (isActive) {
      const pulse = (Math.sin(performance.now() / 200) + 1) / 2;
      ctx.fillStyle = `rgb(${200 + 55 * pulse | 0}, ${100 + 100 * pulse | 0}, 50)`;
    } else {
      ctx.fillStyle = '#666';
    }
    ctx.beginPath();
    ctx.arc(x, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawPauseButton(ctx, game) {
  ctx.fillStyle = '#3d2410';
  ctx.fillRect(PAUSE_BTN.x - 2, PAUSE_BTN.y - 2, PAUSE_BTN.w + 4, PAUSE_BTN.h + 4);
  ctx.fillStyle = COLORS.woodLight;
  ctx.fillRect(PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.w, PAUSE_BTN.h);
  ctx.fillStyle = '#3d2410';
  if (game.paused) {
    ctx.beginPath();
    ctx.moveTo(PAUSE_BTN.x + 10, PAUSE_BTN.y + 6);
    ctx.lineTo(PAUSE_BTN.x + 26, PAUSE_BTN.y + 16);
    ctx.lineTo(PAUSE_BTN.x + 10, PAUSE_BTN.y + 26);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(PAUSE_BTN.x + 8, PAUSE_BTN.y + 7, 6, 18);
    ctx.fillRect(PAUSE_BTN.x + 18, PAUSE_BTN.y + 7, 6, 18);
  }
}

function drawTutorial(ctx, game) {
  if (!game.showTutorial) return;
  const alpha = game.time < 9 ? 1 : (10 - game.time);
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(160, 240, 680, 110);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('收集天空掉落的阳光，种下向日葵以积累更多阳光', 500, 280);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#ffe580';
  ctx.fillText('准备防守僵尸的进攻！', 500, 318);
  ctx.restore();
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
  ctx.globalAlpha = Math.max(0, alpha);
  // dark band
  ctx.fillStyle = 'rgba(40, 0, 0, 0.85)';
  ctx.fillRect(0, 240, CANVAS_W, 100);
  ctx.fillStyle = 'rgba(180, 30, 30, 0.55)';
  ctx.fillRect(0, 240, CANVAS_W, 100);
  // text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  const shake = Math.sin(t * 30) * 4;
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 8;
  ctx.fillText(game.banner.text, CANVAS_W / 2 + shake, 305);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPauseOverlay(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, CANVAS_W, 600);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 12;
  ctx.fillText('暂停', CANVAS_W / 2, 320);
  ctx.shadowBlur = 0;
  ctx.font = '20px sans-serif';
  ctx.fillText('点击继续按钮恢复游戏', CANVAS_W / 2, 360);
}

function drawEndScreen(ctx, game) {
  // backdrop
  ctx.fillStyle = game.victory ? 'rgba(20, 80, 30, 0.8)' : 'rgba(60, 10, 10, 0.85)';
  ctx.fillRect(0, 0, CANVAS_W, 600);

  // title
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 12;
  ctx.fillStyle = game.victory ? '#ffe580' : '#ff7070';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.victory ? '🌻 胜利！🌻' : '☠ 你被吃掉了 ☠', CANVAS_W / 2, 220);

  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(
    game.victory ? '你成功守住了草坪！' : '僵尸吃掉了你的脑子！',
    CANVAS_W / 2, 280
  );
  ctx.shadowBlur = 0;

  // restart button
  const bx = CANVAS_W / 2 - 100;
  const by = 350;
  const grad = ctx.createLinearGradient(bx, by, bx, by + 60);
  grad.addColorStop(0, '#f6c244');
  grad.addColorStop(1, '#c8800a');
  ctx.fillStyle = grad;
  ctx.fillRect(bx, by, 200, 60);
  ctx.strokeStyle = '#3d2410';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, 200, 60);
  ctx.fillStyle = '#3d2410';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('再玩一次', CANVAS_W / 2, by + 40);
}
