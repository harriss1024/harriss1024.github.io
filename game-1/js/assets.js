// Asset loader. Pre-loads images and exposes them by name.
// Returns null until an image is loaded so callers can fall back.

const images = {};
const status = {};

export function loadImage(name, src) {
  status[name] = 'loading';
  const img = new Image();
  img.onload = () => { status[name] = 'loaded'; };
  img.onerror = () => { status[name] = 'error'; console.warn('Asset failed:', src); };
  img.src = src;
  images[name] = img;
}

export function getImage(name) {
  return status[name] === 'loaded' ? images[name] : null;
}

export function preloadAssets() {
  loadImage('peashooter', 'images/peashooter.png');
  loadImage('sunflower', 'images/sunflower.png');
  loadImage('zombie_basic', 'images/zombie.png');
  // walk-cycle frames (overrides static zombie_basic when all loaded)
  for (let i = 0; i < 5; i++) {
    loadImage(`zombie_walk_${i}`, `images/zombie_walk_${i}.png`);
  }
}

// Pick the best zombie frame for the current walk phase.
// Returns null if frames haven't loaded yet (caller falls back).
export function getZombieWalkFrame(phase01, frameCount = 5) {
  // Try to use frame animation
  const idx = Math.floor(phase01 * frameCount) % frameCount;
  return getImage(`zombie_walk_${idx}`);
}
