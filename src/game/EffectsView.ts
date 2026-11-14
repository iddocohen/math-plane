// Adapted from math-soccer src/game/EffectsView.ts: one effect layer and one trail layer for the plane.
/**
 * Draws the effects of effects.ts with Phaser images. The looks come from effects.ts and the motion from particles.ts;
 * this file only draws them.
 *
 * - The shapes (dot, star, confetti piece) are generated textures. The Kenney particle images are bundled files that
 *   the scene loads in its preload (`loadParticleImages`); a particle with an image draws it, tinted, and falls back to
 *   its shape when the file did not load.
 * - Each layer is a ParticlePool of images: an image is made the first time its slot is used and reused for every
 *   later particle, so a hit makes no new objects after the first ones.
 * - The scene moves the layers on in its update() with the play time, and not while the round is paused.
 */
import Phaser from 'phaser';
import { assetUrl, PARTICLE_FILES } from '../assets';
import { celebration, EFFECT_CAPACITY, hitBurst, imageScale, PARTICLE_TEXTURE_SIZE, PIECE_SIZE, smokePuff, TRAIL_CAPACITY, type BombStyle } from './effects';
import { ParticlePool, type ParticleImage, type ParticleInit, type ParticleShape } from './particles';
import { DEPTH } from './world';

const KEY: Record<ParticleShape, string> = { dot: 'fx-dot', star: 'fx-star', piece: 'fx-piece' };
const IMAGE_KEY: Record<ParticleImage, string> = {
  twinkle: 'fx-img-twinkle',
  star: 'fx-img-star',
  sparkle: 'fx-img-sparkle',
  flare: 'fx-img-flare',
  light: 'fx-img-light',
};

/** Queues the particle images that are not loaded yet; call it in the scene's preload. */
export function loadParticleImages(scene: Phaser.Scene): void {
  for (const [image, key] of Object.entries(IMAGE_KEY) as [ParticleImage, string][]) {
    if (!scene.textures.exists(key)) scene.load.image(key, assetUrl(PARTICLE_FILES[image]));
  }
}

/** Creates the particle textures that do not exist yet: a soft dot, a star and a confetti piece. */
export function ensureFxTextures(scene: Phaser.Scene): void {
  const paint = (key: string, draw: (g: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const texture = scene.textures.createCanvas(key, PARTICLE_TEXTURE_SIZE, PARTICLE_TEXTURE_SIZE);
    if (!texture) return;
    draw(texture.getContext());
    texture.refresh();
  };
  const S = PARTICLE_TEXTURE_SIZE;
  paint(KEY.dot, (g) => {
    const soft = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    soft.addColorStop(0, 'rgb(255 255 255 / 100%)');
    soft.addColorStop(0.6, 'rgb(255 255 255 / 90%)');
    soft.addColorStop(1, 'rgb(255 255 255 / 0%)');
    g.fillStyle = soft;
    g.fillRect(0, 0, S, S);
  });
  paint(KEY.star, (g) => {
    g.fillStyle = '#ffffff';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? S / 2 : S / 5;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      g.lineTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  });
  paint(KEY.piece, (g) => {
    g.fillStyle = '#ffffff';
    g.fillRect((S - PIECE_SIZE.width) / 2, (S - PIECE_SIZE.height) / 2, PIECE_SIZE.width, PIECE_SIZE.height);
  });
}

/** A pool of particle images at one depth. */
export class ParticleLayer {
  readonly pool: ParticlePool<Phaser.GameObjects.Image>;

  constructor(scene: Phaser.Scene, capacity: number, depth: number) {
    const styled = new WeakMap<Phaser.GameObjects.Image, ParticleInit>();
    this.pool = new ParticlePool(
      capacity,
      () => scene.add.image(0, 0, KEY.dot).setDepth(depth).setVisible(false),
      (image, p, s) => {
        if (p === null || s === null) {
          image.setVisible(false);
          return;
        }
        const withImage = p.image !== undefined && scene.textures.exists(IMAGE_KEY[p.image]);
        const key = withImage ? IMAGE_KEY[p.image!] : KEY[p.shape];
        const newTexture = image.texture.key !== key;
        if (newTexture) image.setTexture(key);
        if (newTexture || styled.get(image) !== p) {
          styled.set(image, p);
          image.setBlendMode(p.glow ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL).setTint(p.tint);
        }
        const scale = withImage ? imageScale(p.image!, s.scale) : s.scale;
        image.setPosition(s.x, s.y).setScale(scale).setAlpha(s.alpha).setRotation(s.rotation).setVisible(true);
      },
    );
  }

  spawn(ps: readonly ParticleInit[]): void {
    for (const p of ps) this.pool.spawn(p);
  }

  destroy(): void {
    this.pool.forEachObject((image) => image.destroy());
  }
}

/** The bursts, puffs and confetti of a round, and the plane's smoke trail. */
export class EffectsView {
  readonly trail: ParticleLayer;
  private readonly front: ParticleLayer;

  constructor(scene: Phaser.Scene) {
    ensureFxTextures(scene);
    this.front = new ParticleLayer(scene, EFFECT_CAPACITY, DEPTH.effects);
    this.trail = new ParticleLayer(scene, TRAIL_CAPACITY, DEPTH.trail);
  }

  /** The burst on a hit target. */
  hit(style: BombStyle, x: number, y: number): void {
    this.front.spawn(hitBurst(style, x, y, Math.random));
  }

  /** A soft puff of smoke (a miss, a removed crate). */
  puff(x: number, y: number): void {
    this.front.spawn(smokePuff(x, y, Math.random));
  }

  /** Confetti from both bottom corners. */
  celebrate(): void {
    this.front.spawn(celebration(Math.random));
  }

  /** True while particles of a burst show. */
  get running(): boolean {
    return this.front.pool.active > 0;
  }

  update(ms: number): void {
    this.front.pool.step(ms);
    this.trail.pool.step(ms);
  }

  clear(): void {
    this.front.pool.clear();
    this.trail.pool.clear();
  }

  destroy(): void {
    this.front.destroy();
    this.trail.destroy();
  }
}
