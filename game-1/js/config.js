// Canvas dimensions (internal logical resolution)
export const CANVAS_W = 1000;
export const CANVAS_H = 600;

// Grid layout
export const GRID_COLS = 9;
export const GRID_ROWS = 5;
export const CELL_W = 80;
export const CELL_H = 96;
export const GRID_X0 = 70;
export const GRID_Y0 = 90;

// Sun economy
export const STARTING_SUN = 50;
export const SKY_SUN_INTERVAL = 5;      // seconds between sky-sun drops
export const SKY_SUN_VALUE = 25;
export const SKY_SUN_LIFETIME = 10;     // seconds before uncollected sun expires
export const SUNFLOWER_INTERVAL = 24;
export const SUNFLOWER_SUN_VALUE = 25;

// Combat
export const PROJECTILE_SPEED = 350;
export const PEA_DAMAGE = 20;
export const PEASHOOTER_FIRE_INTERVAL = 1.4;
export const SNOW_PEA_SLOW_FACTOR = 0.5;
export const SNOW_PEA_SLOW_DURATION = 4;

// Plants
export const PLANTS = {
  sunflower:  { id: 'sunflower',  name: '向日葵',   cost: 50,  cooldown: 7.5, hp: 300 },
  peashooter: { id: 'peashooter', name: '豌豆射手', cost: 100, cooldown: 7.5, hp: 300 },
  wallnut:    { id: 'wallnut',    name: '坚果墙',   cost: 50,  cooldown: 30,  hp: 4000 },
  cherrybomb: { id: 'cherrybomb', name: '樱桃炸弹', cost: 150, cooldown: 50,  hp: Infinity },
  snowpea:    { id: 'snowpea',    name: '寒冰射手', cost: 175, cooldown: 7.5, hp: 300 },
  potatomine: { id: 'potatomine', name: '土豆雷',   cost: 25,  cooldown: 30,  hp: Infinity },
};

// Zombies
export const ZOMBIES = {
  basic:  { id: 'basic',  name: '普通僵尸', hp: 200,  speed: 32, biteDamage: 50, biteInterval: 0.5 },
  cone:   { id: 'cone',   name: '路障僵尸', hp: 200,  speed: 32, biteDamage: 50, biteInterval: 0.5, accessoryHp: 360 },
  bucket: { id: 'bucket', name: '铁桶僵尸', hp: 200,  speed: 32, biteDamage: 50, biteInterval: 0.5, accessoryHp: 1100 },
};

// Special timers
export const CHERRY_FUSE = 1.2;
export const POTATO_ARM_TIME = 14;
export const EXPLOSION_RADIUS_COLS = 1;

// Visual palette
export const COLORS = {
  lawnLight: '#9ec648',
  lawnDark:  '#8ab83a',
  houseWall: '#f5e1a4',
  houseRoof: '#5d3a1a',
  spawnSoil: '#6b4226',
  woodDark:  '#8b5a2b',
  woodLight: '#d4a574',
  sunGold:   '#ffcc33',
  iceBlue:   '#9fd3e8',
  dangerRed: '#c44',
};
