/**
 * The red plane with its pilot (FR-004, FR-006, prototype `drawPlane`), drawn in code. The body, wings, cockpit, pilot,
 * hat and tail picture go into a cached texture that is redrawn only when the look changes (Hangar, T067); the
 * propeller spins as its own small shape every frame. The motion comes from flight.ts.
 *
 * Look parameters (src/game/planeArt.ts, chosen in the Hangar): the body color, the picture on the tail, the smoke
 * colors of the trail (none by default), and the pilot's hat. `setLook` shows a new look at once, also in a paused
 * round under the Hangar. The plane trails smoke when the look has smoke colors, or for a while after `trailSmoke` (a
 * right "Malen" answer flies off in the building's color, T054).
 */
import Phaser from 'phaser';
import { CachedTexture } from './cachedTexture';
import type { ParticleLayer } from './EffectsView';
import { TRAIL_RATE, trailPuff } from './effects';
import { Flight, type FlightEvent } from './flight';
import { hexToNumber } from './palette';
import { DEFAULT_LOOK, drawPlaneBody, PLANE_BOX, type PlaneLook } from './planeArt';
import { DEPTH } from './world';

export { DEFAULT_LOOK, type PlaneLook };

/** The prototype drew the plane for a 1024-wide world; this one is 1600 wide. */
export const PLANE_SCALE = 1.5;
/** The texture's box in the prototype's plane units, with the plane's middle at (BOX.x, BOX.y). */
const BOX = PLANE_BOX;
const RESOLUTION = 2;
/** Where the plane is when a round starts. */
export const PLANE_START_X = 260;

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
    // The smoke and anything else of the Hangar look are not in the texture.
    this.texture.draw(JSON.stringify([look.color, look.tail, look.hat]), (ctx) => {
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
    const colors = this.smokeMs > 0 ? this.smokeColors : (this.look.smoke ?? []);
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
