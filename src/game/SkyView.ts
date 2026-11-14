/**
 * The backdrop of every round (FR-001, prototype `drawBg`): a sky gradient with drifting clouds, a band of hills, and
 * the grass field with a faint square grid. Each cloud is an image that drifts to the right and comes back in on the
 * left.
 *
 * The scenery (scenery.ts) stands on the hills: Kenney trees, bushes, fences and a sun, bundled files that the scene
 * loads in its preload (`loadSceneryImages`). The sky, hills, field and scenery are drawn into one cached texture,
 * again only when the set of loaded scenery pictures changes. The clouds are Kenney clouds too (CLOUD_FILES). A
 * picture whose file did not load is left out, and the clouds fall back to the cloud drawn in code.
 */
import Phaser from 'phaser';
import { assetUrl } from '../assets';
import { CachedTexture } from './cachedTexture';
import { CSS } from './palette';
import { CLOUD_FILES, hillY, SCENERY_FILES, sceneryLayout, type SceneryItem, type SceneryPicture } from './scenery';
import { DEPTH, FIELD_GRID, SKY_BOTTOM, WORLD_HEIGHT, WORLD_WIDTH } from './world';

const BACKDROP = 'sky-backdrop';
const CLOUD = 'sky-cloud';
/** The width of the Kenney cloud files. */
const CLOUD_FILE_WIDTH = 300;
const cloudKey = (i: number) => `sky-cloud-${i}`;
const sceneryKey = (p: SceneryPicture) => `sky-${p}`;

/** Queues the scenery and cloud pictures that are not loaded yet; call it in the scene's preload. */
export function loadSceneryImages(scene: Phaser.Scene): void {
  for (const [picture, { file }] of Object.entries(SCENERY_FILES) as Array<[SceneryPicture, { file: string }]>) {
    if (!scene.textures.exists(sceneryKey(picture))) scene.load.image(sceneryKey(picture), assetUrl(file));
  }
  CLOUD_FILES.forEach((file, i) => {
    if (!scene.textures.exists(cloudKey(i))) scene.load.image(cloudKey(i), assetUrl(file));
  });
}
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

/** A scenery picture placed on the backdrop, with its loaded image. */
type PlacedPicture = SceneryItem & { image: CanvasImageSource };

function drawBackdrop(ctx: CanvasRenderingContext2D, scenery: readonly PlacedPicture[]): void {
  const sky = ctx.createLinearGradient(0, 0, 0, SKY_BOTTOM);
  sky.addColorStop(0, CSS.skyTop);
  sky.addColorStop(1, CSS.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD_WIDTH, SKY_BOTTOM);
  // Hills along the horizon.
  ctx.fillStyle = CSS.hills;
  ctx.beginPath();
  ctx.moveTo(0, SKY_BOTTOM);
  for (let x = 0; x <= WORLD_WIDTH; x += 20) ctx.lineTo(x, hillY(x));
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
  // The scenery over the hills, back to front.
  for (const p of scenery) ctx.drawImage(p.image, p.x, p.y, p.width, p.height);
}

/** The cloud is drawn opaque and shown at CLOUD_ALPHA, so the circles do not show where they overlap. */
const CLOUD_ALPHA = 0.85;
/** The Kenney clouds have their own shading and show almost opaque. */
const KENNEY_CLOUD_ALPHA = 0.95;

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
    // Drawn once per session; later rounds reuse the textures. The backdrop is drawn again only when another set of
    // scenery pictures has loaded, recorded in the texture's customData.
    const scenery = sceneryLayout()
      .filter((item) => scene.textures.exists(sceneryKey(item.picture)))
      .map((item) => ({ ...item, image: scene.textures.get(sceneryKey(item.picture)).getSourceImage() as CanvasImageSource }));
    const loaded = [...new Set(scenery.map((p) => p.picture))].join(' ');
    const drawn = scene.textures.exists(BACKDROP) ? (scene.textures.get(BACKDROP).customData as { scenery?: string }).scenery : undefined;
    if (drawn !== loaded) {
      new CachedTexture(scene, BACKDROP, WORLD_WIDTH, WORLD_HEIGHT).draw('backdrop', (ctx) => drawBackdrop(ctx, scenery));
      (scene.textures.get(BACKDROP).customData as { scenery?: string }).scenery = loaded;
    }
    scene.add.image(0, 0, BACKDROP).setOrigin(0, 0).setDepth(DEPTH.sky);
    if (!scene.textures.exists(CLOUD)) new CachedTexture(scene, CLOUD, CLOUD_SIZE.width, CLOUD_SIZE.height, 2).draw('cloud', drawCloud);
    const kenney = CLOUD_FILES.every((_, i) => scene.textures.exists(cloudKey(i)));
    this.clouds = cloudLayout(rand).map((spec, i) => {
      // A Kenney cloud as wide as the drawn one at the same scale.
      const image = kenney
        ? scene.add.image(spec.x, spec.y, cloudKey(i % CLOUD_FILES.length)).setScale((spec.scale * CLOUD_SIZE.width) / CLOUD_FILE_WIDTH).setAlpha(KENNEY_CLOUD_ALPHA)
        : scene.add.image(spec.x, spec.y, CLOUD).setScale(spec.scale / 2).setAlpha(CLOUD_ALPHA);
      return { spec, x: spec.x, image: image.setOrigin(0, 0.5).setDepth(DEPTH.clouds) };
    });
  }

  /** Moves the clouds on by `ms` of play time. */
  update(ms: number): void {
    for (const c of this.clouds) {
      c.x = driftX(c.x, (ms / 1000) * CLOUD_SPEED * c.spec.scale, CLOUD_SIZE.width * c.spec.scale);
      c.image.x = c.x;
    }
  }
}
