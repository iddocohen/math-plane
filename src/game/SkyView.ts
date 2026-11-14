/**
 * The backdrop of every round (FR-001, prototype `drawBg`): a sky gradient with drifting clouds, a band of hills, and
 * the grass field with a faint square grid. The sky, hills and field are drawn once into a cached texture; each cloud
 * is an image of one cloud texture that drifts to the right and comes back in on the left.
 */
import Phaser from 'phaser';
import { CachedTexture } from './cachedTexture';
import { CSS } from './palette';
import { DEPTH, FIELD_GRID, SKY_BOTTOM, WORLD_HEIGHT, WORLD_WIDTH } from './world';

const BACKDROP = 'sky-backdrop';
const CLOUD = 'sky-cloud';
/** The cloud texture's size at scale 1. */
const CLOUD_SIZE = { width: 150, height: 90 } as const;
/** The prototype's cloud speed, 12 px per second at scale 1 in a 1024-wide world. */
const CLOUD_SPEED = (12 * WORLD_WIDTH) / 1024;

/** One cloud: where it starts and how big it is. */
export interface CloudSpec {
  x: number;
  y: number;
  scale: number;
}

/** Clouds spread over the sky; `rand` gives numbers in [0, 1). */
export function cloudLayout(rand: () => number, count = 6): CloudSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    x: (i * (WORLD_WIDTH + 300)) / count + rand() * 120 - 150,
    y: 60 + rand() * 230,
    scale: 0.8 + rand() * 0.8,
  }));
}

/** The x a cloud reaches after drifting `dx` from `x`: it leaves on the right and comes back in on the left. */
export function driftX(x: number, dx: number, width: number): number {
  const span = WORLD_WIDTH + 2 * width;
  return ((((x + dx + width) % span) + span) % span) - width;
}

function drawBackdrop(ctx: CanvasRenderingContext2D): void {
  const sky = ctx.createLinearGradient(0, 0, 0, SKY_BOTTOM);
  sky.addColorStop(0, CSS.skyTop);
  sky.addColorStop(1, CSS.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD_WIDTH, SKY_BOTTOM);
  // Hills along the horizon.
  ctx.fillStyle = CSS.hills;
  ctx.beginPath();
  ctx.moveTo(0, SKY_BOTTOM);
  for (let x = 0; x <= WORLD_WIDTH; x += 40) ctx.lineTo(x, SKY_BOTTOM - 34 + Math.sin(x / 190) * 22);
  ctx.lineTo(WORLD_WIDTH, SKY_BOTTOM + 20);
  ctx.lineTo(0, SKY_BOTTOM + 20);
  ctx.fill();
  const grass = ctx.createLinearGradient(0, SKY_BOTTOM - 10, 0, WORLD_HEIGHT);
  grass.addColorStop(0, CSS.grassTop);
  grass.addColorStop(1, CSS.grassBottom);
  ctx.fillStyle = grass;
  ctx.fillRect(0, SKY_BOTTOM - 10, WORLD_WIDTH, WORLD_HEIGHT - SKY_BOTTOM + 10);
  // The faint square grid on the field.
  ctx.strokeStyle = 'rgba(255,255,255,.09)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = FIELD_GRID / 2; x < WORLD_WIDTH; x += FIELD_GRID) {
    ctx.moveTo(x, SKY_BOTTOM);
    ctx.lineTo(x, WORLD_HEIGHT);
  }
  for (let y = SKY_BOTTOM + FIELD_GRID / 2; y < WORLD_HEIGHT; y += FIELD_GRID) {
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_WIDTH, y);
  }
  ctx.stroke();
}

/** The cloud is drawn opaque and shown at CLOUD_ALPHA, so the circles do not show where they overlap. */
const CLOUD_ALPHA = 0.85;

function drawCloud(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#ffffff';
  // The prototype's four circles, scaled by 1.5 and moved into the texture.
  for (const [dx, dy, r] of [
    [0, 0, 26],
    [24, -8, 22],
    [46, 0, 20],
    [22, 6, 22],
  ] as const) {
    ctx.beginPath();
    ctx.arc(40 + dx * 1.5, 50 + dy * 1.5, r * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class SkyView {
  private readonly clouds: Array<{ image: Phaser.GameObjects.Image; spec: CloudSpec; x: number }>;

  constructor(scene: Phaser.Scene, rand: () => number = Math.random) {
    // Drawn once per session; later rounds reuse the textures.
    if (!scene.textures.exists(BACKDROP)) new CachedTexture(scene, BACKDROP, WORLD_WIDTH, WORLD_HEIGHT).draw('backdrop', drawBackdrop);
    scene.add.image(0, 0, BACKDROP).setOrigin(0, 0).setDepth(DEPTH.sky);
    if (!scene.textures.exists(CLOUD)) new CachedTexture(scene, CLOUD, CLOUD_SIZE.width, CLOUD_SIZE.height, 2).draw('cloud', drawCloud);
    this.clouds = cloudLayout(rand).map((spec) => ({
      spec,
      x: spec.x,
      image: scene.add.image(spec.x, spec.y, CLOUD).setOrigin(0, 0.5).setScale(spec.scale / 2).setAlpha(CLOUD_ALPHA).setDepth(DEPTH.clouds),
    }));
  }

  /** Moves the clouds on by `ms` of play time. */
  update(ms: number): void {
    for (const c of this.clouds) {
      c.x = driftX(c.x, (ms / 1000) * CLOUD_SPEED * c.spec.scale, CLOUD_SIZE.width * c.spec.scale);
      c.image.x = c.x;
    }
  }
}
