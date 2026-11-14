// Adapted from math-soccer src/game/effects.ts: the plane's effects replace the ball trails and goal effects.
/**
 * The looks of the scene's effects as particle lists (particles.ts), with no Phaser here, so the round and the Hangar
 * preview draw the same particles and the lists have unit tests. Nothing burns or explodes (FR-042): a hit bursts into
 * stars and confetti, a miss makes a soft puff of smoke, and the other bomb styles splash water, scatter stars or blow
 * bubbles.
 *
 * - `hitBurst`: the burst where a bomb lands on the right target, by bomb style (prototype `burst(..., CELEB, 'star')`
 *   and `'confetti'`).
 * - `smokePuff`: the soft grey puff on a missed target or a removed crate (prototype `burst(..., 'smoke')`).
 * - `trailPuff`: one puff of the plane's smoke trail (prototype `kind: 'trail'`).
 * - `celebration`: confetti flying up from both bottom corners after a right "Fertig".
 *
 * Speeds and sizes are the prototype's, scaled from its 1024-wide world to the 1600-wide one. Sizes are scales of the
 * particle textures, which are PARTICLE_TEXTURE_SIZE pixels wide.
 */
import { CELEBRATION, SMOKE, WATER } from './palette';
import type { ParticleImage, ParticleInit } from './particles';
import { WORLD_HEIGHT, WORLD_WIDTH } from './world';
import { BOMB_STYLES, type BombStyle } from '../core/rewards/items';

/** The dot, star and confetti textures are this many pixels wide. */
export const PARTICLE_TEXTURE_SIZE = 32;
/** The particle images are this many pixels wide. */
export const PARTICLE_IMAGE_SIZE = 64;
/** How much of its width each particle image fills with its visible middle. */
export const IMAGE_FILL: Record<ParticleImage, number> = { twinkle: 0.3, star: 0.6, sparkle: 0.22, flare: 0.15, light: 0.6, smoke: 0.7 };

/** The scale of a particle's image for the scale `scale` of its drawn shape. */
export function imageScale(image: ParticleImage, scale: number): number {
  return (scale * PARTICLE_TEXTURE_SIZE) / (PARTICLE_IMAGE_SIZE * IMAGE_FILL[image]);
}
/** A confetti piece in the texture: a rectangle this wide and high, centered. */
export const PIECE_SIZE = { width: 12, height: 20 } as const;

/** The prototype's world was 1024 wide; this world is 1600 wide. */
const K = WORLD_WIDTH / 1024;
/** The prototype's pull on falling particles, scaled. */
const GRAVITY = 420 * K;

/** The bomb styles of the Hangar (core/rewards/items.ts): confetti is the default. */
export { BOMB_STYLES, type BombStyle };

/** The most particles alive at once in the effect layer, and in the trail layer. */
export const EFFECT_CAPACITY = 160;
export const TRAIL_CAPACITY = 90;
/** Every trail puff fades within this long. */
export const TRAIL_LIFE_MS = 1600;
/** Trail puffs per second while the plane trails smoke (prototype: 0.9 per frame at 60 frames). */
export const TRAIL_RATE = 54;

const scaleFor = (diameter: number) => diameter / PARTICLE_TEXTURE_SIZE;
const spread = (rand: () => number, half: number) => (rand() * 2 - 1) * half;

/** One particle thrown out from (x, y) in a random direction, as the prototype's `burst`. */
function thrown(rand: () => number, x: number, y: number, speed: number, lift: number): Pick<ParticleInit, 'x' | 'y' | 'vx' | 'vy'> {
  const a = rand() * Math.PI * 2;
  const v = (60 + rand() * speed) * K;
  return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - lift * K };
}

/** Stars thrown out and falling, `n` of them. */
function stars(rand: () => number, x: number, y: number, n: number, colors: readonly number[]): ParticleInit[] {
  return Array.from({ length: n }, (_, i) => {
    const size = scaleFor((8 + rand() * 10) * K);
    return {
      shape: 'star',
      image: 'star',
      ...thrown(rand, x, y, 320, 140),
      gravity: GRAVITY,
      life: 800 + rand() * 700,
      size,
      endSize: size * 0.7,
      rotation: rand() * 6,
      spin: spread(rand, 5),
      tint: colors[i % colors.length]!,
      glow: true,
    } satisfies ParticleInit;
  });
}

/** Confetti pieces thrown out and falling, `n` of them. */
function confetti(rand: () => number, x: number, y: number, n: number): ParticleInit[] {
  return Array.from({ length: n }, (_, i) => ({
    shape: 'piece',
    ...thrown(rand, x, y, 300, 140),
    gravity: GRAVITY,
    life: 800 + rand() * 700,
    size: (0.5 + rand() * 0.5) * K,
    rotation: rand() * 6,
    spin: spread(rand, 10),
    fadeFrom: 0.5,
    tint: CELEBRATION[i % CELEBRATION.length]!,
  }));
}

/** The Kenney smoke puff at a random angle, turning by up to `spin` either way. */
function smokeLook(rand: () => number, spin: number): Pick<ParticleInit, 'image' | 'rotation' | 'spin'> {
  return { image: 'smoke', rotation: rand() * 6, spin: spread(rand, spin) };
}

/**
 * Soft dots that drift, slow down and grow, `n` of them: smoke (`smoke` true, drawn with the Kenney smoke puff and
 * turning slowly) or bubbles.
 */
function puffs(rand: () => number, x: number, y: number, n: number, colors: readonly number[], speed: number, diameter: number, smoke = false): ParticleInit[] {
  return Array.from({ length: n }, (_, i) => {
    const size = scaleFor((diameter + rand() * diameter * 0.8) * K);
    return {
      shape: 'dot',
      ...(smoke ? smokeLook(rand, 1) : {}),
      ...thrown(rand, x, y, speed, 20),
      life: 800 + rand() * 700,
      size,
      endSize: size * 1.8,
      alpha: 0.9,
      tint: colors[i % colors.length]!,
    } satisfies ParticleInit;
  });
}

/** Water drops thrown up and falling back, `n` of them. */
function splash(rand: () => number, x: number, y: number, n: number): ParticleInit[] {
  return Array.from({ length: n }, (_, i) => {
    const size = scaleFor((6 + rand() * 8) * K);
    return {
      shape: 'dot',
      x: x + spread(rand, 20),
      y,
      vx: spread(rand, 220) * K,
      vy: -(200 + rand() * 260) * K,
      gravity: GRAVITY * 1.6,
      life: 700 + rand() * 500,
      size,
      endSize: size * 0.6,
      fadeFrom: 0.6,
      tint: WATER[i % WATER.length]!,
    } satisfies ParticleInit;
  });
}

/** The burst on a hit target, by bomb style. `rand` gives numbers in [0, 1). */
export function hitBurst(style: BombStyle, x: number, y: number, rand: () => number): ParticleInit[] {
  switch (style) {
    case 'confetti':
      return [...stars(rand, x, y, 36, CELEBRATION), ...confetti(rand, x, y, 30)];
    case 'stars':
      return [...stars(rand, x, y, 50, [0xffd23f, 0xffffff, 0xffe066])];
    case 'water':
      return [...splash(rand, x, y, 44), ...stars(rand, x, y, 10, [0xffffff])];
    case 'bubbles':
      return [...puffs(rand, x, y, 30, [0xbfe8ff, 0xffffff, 0xffc4e1], 160, 14), ...stars(rand, x, y, 10, CELEBRATION)];
  }
}

/** The soft puff of smoke on a missed target or a removed crate. */
export function smokePuff(x: number, y: number, rand: () => number): ParticleInit[] {
  return puffs(rand, x, y, 12, SMOKE, 90, 20, true);
}

/** One puff of the plane's smoke trail at (x, y), in the trail color `tint`. */
export function trailPuff(x: number, y: number, tint: number, rand: () => number): ParticleInit {
  const size = scaleFor(16 * K);
  return {
    shape: 'dot',
    x,
    y: y + spread(rand, 4),
    ...smokeLook(rand, 1.5),
    vx: -40 * K,
    vy: spread(rand, 10) * K,
    life: TRAIL_LIFE_MS,
    size,
    endSize: size * 2.6,
    alpha: 0.85,
    tint,
  };
}

/** Confetti flying up from both bottom corners, for a right "Fertig" or a level up. */
export function celebration(rand: () => number): ParticleInit[] {
  const out: ParticleInit[] = [];
  for (const side of [-1, 1] as const) {
    const x0 = side < 0 ? 60 : WORLD_WIDTH - 60;
    for (let k = 0; k < 36; k++) {
      out.push({
        shape: 'piece',
        x: x0 + spread(rand, 30),
        y: WORLD_HEIGHT + 10,
        vx: -side * (220 + rand() * 420),
        vy: -(880 + rand() * 280),
        gravity: 1100,
        delay: rand() * 120,
        life: 1000 + rand() * 100,
        size: 1,
        rotation: rand() * Math.PI,
        spin: spread(rand, 9),
        fadeFrom: 0.7,
        tint: CELEBRATION[k % CELEBRATION.length]!,
      });
    }
  }
  return out;
}
