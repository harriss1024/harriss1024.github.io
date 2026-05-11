import { STARTING_SUN, SKY_SUN_INTERVAL } from './config.js';
import { spawnSkySun } from './sun.js';
import { createZombie } from './zombies.js';
import { play } from './audio.js';

export class GameState {
  constructor() {
    this.sun = STARTING_SUN;
    this.time = 0;
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
    this.cardCooldowns = {};
    this.lastSkySunAt = 0;

    this.currentWave = 0;
    this.wavesFinished = false;
    this.zombiesScheduled = [];
    this.zombiesSpawned = 0;
    this.zombiesTotal = 0;

    this.level = null;
    this.banner = null;
    this.tutorialUntil = 10;
    this.showTutorial = true;
    this.winTimer = 0;
  }

  loadLevel(level) {
    this.level = level;
    this.sun = level.startingSun;
    this.zombiesScheduled = [];
    for (let i = 0; i < level.waves.length; i++) {
      const w = level.waves[i];
      // ensure no leftover state
      w._announced = false;
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

  update(dt) {
    if (this.paused || this.over) {
      // banner can still tick down so it doesn't get stuck
      return;
    }
    this.time += dt;

    // tutorial
    this.showTutorial = this.time < this.tutorialUntil;

    // sky-sun drops only after tutorial settles
    if (this.time - this.lastSkySunAt >= SKY_SUN_INTERVAL) {
      spawnSkySun(this);
      this.lastSkySunAt = this.time;
    }

    // card cooldowns
    for (const id in this.cardCooldowns) {
      this.cardCooldowns[id] -= dt;
      if (this.cardCooldowns[id] <= 0) delete this.cardCooldowns[id];
    }

    // wave triggers + scheduled zombie spawns
    if (this.level) {
      for (let i = 0; i < this.level.waves.length; i++) {
        const w = this.level.waves[i];
        if (w._announced) continue;
        if (this.time >= w.triggerTime) {
          this.currentWave = i + 1;
          if (w.announceText) {
            this.banner = { text: w.announceText, t: 0, duration: 1.8 };
            play('alert');
          }
          w._announced = true;
        }
      }
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

    // banner countdown
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.duration) this.banner = null;
    }

    // entity updates
    for (const s of this.suns) s.update(dt);
    for (const p of this.plants) p.update(dt, this);
    for (const z of this.zombies) z.update(dt, this);
    for (const p of this.projectiles) p.update(dt, this);
    for (const m of this.mowers) m.update(dt, this);
    for (const p of this.particles) p.update(dt);

    this.checkEnd(dt);
  }

  checkEnd(dt) {
    if (this.over) return;

    // lose: any zombie crossed the left bound and that row's mower is gone
    for (const z of this.zombies) {
      if (z.x < 50 && z.state !== 'dying') {
        const mowerActive = this.mowers.some(m => m.row === z.row && m.state !== 'done');
        if (!mowerActive) {
          this.over = true;
          this.victory = false;
          play('defeat');
          return;
        }
      }
    }

    // win: all waves spawned, no live zombies, sustained 3 seconds
    if (this.wavesFinished) {
      const liveZombies = this.zombies.some(z => z.state !== 'dying');
      if (!liveZombies) {
        this.winTimer += dt;
        if (this.winTimer >= 3) {
          this.over = true;
          this.victory = true;
          play('victory');
        }
      } else {
        this.winTimer = 0;
      }
    }
  }

  cullDead() {
    this.plants = this.plants.filter(p => !p.isDead);
    this.zombies = this.zombies.filter(z => !z.isDead);
    this.projectiles = this.projectiles.filter(p => !p.isDead);
    this.suns = this.suns.filter(s => !s.isDead);
    this.particles = this.particles.filter(p => !p.isDead);
    this.mowers = this.mowers.filter(m => !m.isDead);
  }

  spawnHitParticles(x, y, snow) {
    // delegated to particles module via main.js to avoid circular import
    if (this.onHitParticles) this.onHitParticles(x, y, snow);
  }
}
