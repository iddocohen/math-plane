// Adapted from math-soccer src/game/effects.test.ts for the plane's effects.
import { describe, expect, it } from 'vitest';
import { PARTICLE_FILES } from '../assets';
import { createRng } from '../core/rng';
import { BOMB_STYLES, celebration, EFFECT_CAPACITY, hitBurst, IMAGE_FILL, imageScale, PARTICLE_IMAGE_SIZE, PARTICLE_TEXTURE_SIZE, smokePuff, TRAIL_CAPACITY, TRAIL_LIFE_MS, TRAIL_RATE, trailPuff } from './effects';
import { particleAt, particleEnd, type ParticleImage } from './particles';

const rand = () => {
  const rng = createRng(3);
  return () => rng.next();
};

describe('hit bursts (FR-042)', () => {
  it('start at the target, fit in the effect layer and end within 1.5 s', () => {
    for (const style of BOMB_STYLES) {
      const ps = hitBurst(style, 700, 650, rand());
      expect(ps.length).toBeGreaterThan(0);
      expect(ps.length).toBeLessThanOrEqual(EFFECT_CAPACITY / 2);
      for (const p of ps) {
        expect(Math.abs(p.x - 700)).toBeLessThanOrEqual(20);
        expect(p.y).toBe(650);
        expect(particleEnd(p)).toBeLessThanOrEqual(1500);
      }
    }
  });

  it('use no fire image: every image is a star, a twinkle, a sparkle, a flash or a light', () => {
    const images = new Set<string>();
    for (const style of BOMB_STYLES) for (const p of hitBurst(style, 0, 0, rand())) if (p.image) images.add(p.image);
    for (const image of images) expect(Object.keys(PARTICLE_FILES)).toContain(image);
    expect(Object.values(PARTICLE_FILES).some((f) => f.includes('fire'))).toBe(false);
  });

  it('confetti, the default style, throws stars and confetti pieces', () => {
    const shapes = new Set(hitBurst('confetti', 0, 0, rand()).map((p) => p.shape));
    expect(shapes).toEqual(new Set(['star', 'piece']));
  });
});

describe('smoke puff and trail', () => {
  it('a puff is soft grey dots that grow and drift slowly', () => {
    const ps = smokePuff(400, 500, rand());
    expect(ps).toHaveLength(12);
    for (const p of ps) {
      expect(p.shape).toBe('dot');
      expect(p.endSize!).toBeGreaterThan(p.size);
      expect(p.gravity ?? 0).toBe(0);
    }
  });

  it('a trail puff takes the trail color and fades within TRAIL_LIFE_MS', () => {
    const p = trailPuff(100, 120, 0xff8fb1, rand());
    expect(p.tint).toBe(0xff8fb1);
    expect(particleEnd(p)).toBe(TRAIL_LIFE_MS);
    expect(particleAt(p, TRAIL_LIFE_MS)).toBeNull();
  });

  it('the trail fits in its pool: rate times life stays below the capacity', () => {
    expect((TRAIL_RATE * TRAIL_LIFE_MS) / 1000 + 1).toBeLessThan(TRAIL_CAPACITY);
  });
});

describe('celebration', () => {
  it('throws confetti up from both bottom corners', () => {
    const ps = celebration(rand());
    expect(ps.length).toBeLessThanOrEqual(EFFECT_CAPACITY);
    expect(ps.some((p) => p.x < 200)).toBe(true);
    expect(ps.some((p) => p.x > 1400)).toBe(true);
    for (const p of ps) expect(p.vy!).toBeLessThan(0);
  });
});

describe('particle images', () => {
  it('scale an image so its visible middle is as wide as the shape', () => {
    for (const image of Object.keys(IMAGE_FILL) as ParticleImage[]) {
      expect(imageScale(image, 1) * PARTICLE_IMAGE_SIZE * IMAGE_FILL[image]).toBeCloseTo(PARTICLE_TEXTURE_SIZE);
    }
  });
});
