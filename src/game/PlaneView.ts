/**
 * The red plane with its pilot (FR-004, FR-006, prototype `drawPlane`), drawn in code. The body, wings, cockpit, pilot,
 * hat and tail picture go into a cached texture that is redrawn only when the look changes (Hangar, T067); the
 * propeller spins as its own small shape every frame. The motion comes from flight.ts.
 *
 * Look parameters: the body color, the picture on the tail, the smoke color of the trail (none by default), and the
 * pilot's hat. The plane trails smoke when the look has a smoke color, or for a while after `trailSmoke` (a right
 * "Malen" answer flies off in the building's color, T054).
 */
import Phaser from 'phaser';
import { CachedTexture } from './cachedTexture';
import type { ParticleLayer } from './EffectsView';
import { TRAIL_RATE, trailPuff } from './effects';
import { Flight, type FlightEvent } from './flight';
import { CSS, hexToNumber, shade } from './palette';
import { DEPTH } from './world';

export const TAIL_PICTURES = ['star', 'heart', 'flower', 'none'] as const;
export type TailPicture = (typeof TAIL_PICTURES)[number];
export const PILOT_HATS = ['cap', 'helmet', 'crown', 'party', 'none'] as const;
export type PilotHat = (typeof PILOT_HATS)[number];

export interface PlaneLook {
  /** The body color, `#rrggbb`. */
  color: string;
  tail: TailPicture;
  /** The trail's color, `#rrggbb`, or null for no trail. */
  smoke: string | null;
  hat: PilotHat;
}

/** The prototype's plane: red with a white star on the tail and a brown cap, no trail. */
export const DEFAULT_LOOK: PlaneLook = { color: '#e0413a', tail: 'star', smoke: null, hat: 'cap' };

/** The prototype drew the plane for a 1024-wide world; this one is 1600 wide. */
export const PLANE_SCALE = 1.5;
/** The texture's box in the prototype's plane units, with the plane's middle at (BOX.x, BOX.y). */
const BOX = { width: 140, height: 84, x: 72, y: 50 } as const;
const RESOLUTION = 2;
/** Where the plane is when a round starts. */
export const PLANE_START_X = 260;

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r);
  ctx.fill();
}

function flower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = CSS.gold;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function hat(ctx: CanvasRenderingContext2D, kind: PilotHat): void {
  switch (kind) {
    case 'cap':
      ctx.fillStyle = '#7a4a1e';
      ctx.fillRect(8, -21, 12, 4);
      break;
    case 'helmet':
      ctx.fillStyle = '#f2f2f2';
      ctx.beginPath();
      ctx.arc(14, -16, 7, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#2f7fd1';
      ctx.fillRect(7, -17, 14, 2);
      break;
    case 'crown':
      ctx.fillStyle = CSS.gold;
      ctx.beginPath();
      ctx.moveTo(8, -18);
      ctx.lineTo(8, -26);
      ctx.lineTo(11, -21);
      ctx.lineTo(14, -27);
      ctx.lineTo(17, -21);
      ctx.lineTo(20, -26);
      ctx.lineTo(20, -18);
      ctx.closePath();
      ctx.fill();
      break;
    case 'party':
      ctx.fillStyle = '#ff8fb1';
      ctx.beginPath();
      ctx.moveTo(9, -18);
      ctx.lineTo(19, -18);
      ctx.lineTo(14, -32);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = CSS.gold;
      ctx.beginPath();
      ctx.arc(14, -32, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'none':
      break;
  }
}

/** Draws the plane without its propeller in the prototype's units, its middle at (0, 0), facing right. */
export function drawPlaneBody(ctx: CanvasRenderingContext2D, look: PlaneLook): void {
  const edge = 'rgba(0,0,0,.3)';
  const polygon = (pts: Array<[number, number]>, fill: string, stroke: string | null) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  };
  // Tail and back wing.
  polygon([[-48, -4], [-60, -30], [-44, -30], [-30, -6]], shade(look.color, 0.85), edge);
  polygon([[-6, -2], [16, -16], [26, -16], [12, 0]], shade(look.color, 0.7), null);
  // Body with a shine.
  ctx.beginPath();
  ctx.ellipse(0, 0, 52, 15, 0, 0, Math.PI * 2);
  ctx.fillStyle = look.color;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.fillStyle = '#ffffff55';
  ctx.beginPath();
  ctx.ellipse(-4, -6, 38, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cockpit and pilot.
  ctx.beginPath();
  ctx.ellipse(14, -12, 14, 10, 0, Math.PI, 0);
  ctx.fillStyle = '#bfe8ff';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(14, -14, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c99b';
  ctx.fill();
  hat(ctx, look.hat);
  // Front wing and nose.
  polygon([[-10, 4], [22, 4], [10, 22], [-18, 22]], CSS.gold, edge);
  ctx.fillStyle = CSS.gold;
  ctx.beginPath();
  ctx.arc(52, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  // The picture on the tail.
  ctx.fillStyle = '#fff';
  if (look.tail === 'star') star(ctx, -48, -20, 6);
  else if (look.tail === 'heart') heart(ctx, -48, -20, 5);
  else if (look.tail === 'flower') flower(ctx, -48, -20, 6);
}

/** Where a bomb leaves the plane and where the trail starts, relative to the plane's middle, in world units. */
export const BOMB_BAY = { x: 10 * PLANE_SCALE, y: 18 * PLANE_SCALE } as const;
const EXHAUST = { x: -46 * PLANE_SCALE, y: 6 * PLANE_SCALE } as const;

export class PlaneView {
  /** The round starts with the plane already over the field, so the child sees it at once. */
  readonly flight = new Flight(PLANE_START_X);
  private readonly container: Phaser.GameObjects.Container;
  private readonly propeller: Phaser.GameObjects.Rectangle;
  private readonly texture: CachedTexture;
  private look: PlaneLook = DEFAULT_LOOK;
  private ms = 0;
  private smokeMs = 0;
  private smokeColors: readonly string[] = [];
  private puffs = 0;
  private owed = 0;
  private onRelease: (() => void) | null = null;
  private onPassEnd: (() => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly trail: ParticleLayer,
    look: PlaneLook = DEFAULT_LOOK,
  ) {
    this.texture = new CachedTexture(scene, 'plane-body', BOX.width * PLANE_SCALE, BOX.height * PLANE_SCALE, RESOLUTION);
    const body = scene.add.image(0, 0, this.texture.key).setScale(this.texture.scale);
    body.setOrigin(BOX.x / BOX.width, BOX.y / BOX.height);
    this.propeller = scene.add.rectangle(56 * PLANE_SCALE, 0, 3 * PLANE_SCALE, 10, 0x505050, 0.55);
    this.container = scene.add.container(0, 0, [body, this.propeller]).setDepth(DEPTH.plane);
    this.setLook(look);
    this.place();
  }

  /** Shows a look at once; the texture is redrawn only when it changed. */
  setLook(look: PlaneLook): void {
    this.look = look;
    this.texture.draw(JSON.stringify(look), (ctx) => {
      ctx.scale(PLANE_SCALE, PLANE_SCALE);
      ctx.translate(BOX.x, BOX.y);
      drawPlaneBody(ctx, look);
    });
  }

  /**
   * Starts a bomb pass from the left edge. `onRelease` runs when the plane reaches `releaseX`, `onPassEnd` when it
   * reaches the right edge and turns.
   */
  startPass(releaseX: number | null, onRelease: (() => void) | null = null, onPassEnd: (() => void) | null = null): void {
    this.onRelease = onRelease;
    this.onPassEnd = onPassEnd;
    this.flight.startPass(releaseX);
  }

  /**
   * Trails smoke in `color` for `ms`, on top of the look's own trail (a right "Fertig", FR-021 to FR-023). A list of
   * colors takes turns puff by puff, so a building of several colors ("Male an") trails all of them.
   */
  trailSmoke(color: string | readonly string[], ms: number): void {
    this.smokeColors = typeof color === 'string' ? [color] : color;
    this.smokeMs = this.smokeColors.length > 0 ? ms : 0;
  }

  /** The bomb bay in world units now. */
  get bombBay(): { x: number; y: number } {
    const s = this.flight.state();
    return { x: s.x + BOMB_BAY.x * s.facing * s.scale, y: s.y + BOMB_BAY.y * s.scale };
  }

  update(ms: number): void {
    this.ms += ms;
    for (const e of this.flight.step(ms)) this.handle(e);
    this.place();
    // The propeller blade, seen from the side, grows and shrinks as it spins.
    this.propeller.setSize(3 * PLANE_SCALE, (Math.abs(Math.sin((this.ms / 1000) * 40)) * 22 + 4) * 2 * PLANE_SCALE);
    this.smokeMs = Math.max(0, this.smokeMs - ms);
    const colors = this.smokeMs > 0 ? this.smokeColors : this.look.smoke === null ? [] : [this.look.smoke];
    if (colors.length === 0) {
      this.owed = 0;
      return;
    }
    const s = this.flight.state();
    this.owed += (ms * TRAIL_RATE * s.scale) / 1000;
    for (; this.owed >= 1; this.owed -= 1) {
      const tint = hexToNumber(colors[this.puffs++ % colors.length]!);
      this.trail.spawn([trailPuff(s.x + EXHAUST.x * s.facing * s.scale, s.y + EXHAUST.y * s.scale, tint, Math.random)]);
    }
  }

  private handle(e: FlightEvent): void {
    const fn = e === 'release' ? this.onRelease : this.onPassEnd;
    if (e === 'release') this.onRelease = null;
    else this.onPassEnd = null;
    fn?.();
  }

  private place(): void {
    const s = this.flight.state();
    this.container.setPosition(s.x, s.y).setScale(s.facing * s.scale, s.scale).setRotation(s.tilt);
    // Flying back far away, the plane is behind the clouds.
    this.container.setDepth(s.mode === 'back' ? DEPTH.planeFar : DEPTH.plane);
  }

  destroy(): void {
    this.container.destroy();
  }
}
