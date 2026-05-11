import { CANVAS_W, CANVAS_H } from './config.js';
import { unlockAudio } from './audio.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouseX = 0;
    this.mouseY = 0;
    this.clickQueue = [];

    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.onDown(e.clientX, e.clientY);
    });
    canvas.addEventListener('mousemove', (e) => this.onMove(e.clientX, e.clientY));

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onMove(t.clientX, t.clientY);
      this.onDown(t.clientX, t.clientY);
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onMove(t.clientX, t.clientY);
    }, { passive: false });

    // suppress context menu on right-click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  toCanvas(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width * CANVAS_W;
    const y = (clientY - rect.top) / rect.height * CANVAS_H;
    return { x, y };
  }

  onDown(cx, cy) {
    unlockAudio();
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
