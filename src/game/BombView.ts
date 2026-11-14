/**
 * The bomb of a "Treffer" pass (FR-008, FR-014, research R9). The RoundController decided hit or miss at the tap; this
 * view only animates it, so the bomb always lands on the chosen target (SC-004):
 *
 * - `passStarted`: the plane comes in from the left (PlaneView) and releases the bomb when its bomb bay is
 *   `BOMB_DRIFT` before the target, with a whistle.
 * - The bomb falls along a parabola that ends at the target's middle after `FALL_MS`, then the view calls
 *   `landBomb()`. When the controller's fallback timer lands the bomb first (research R18), the bomb in the air goes.
 * - `bombLanded`: a hit bursts by the bomb style (stars and confetti by default); a miss makes a soft puff of smoke.
 *   The hit and miss sounds and the propeller come from the app on the same events.
 */
import type Phaser from 'phaser';
import type { RoundEvent, RoundState } from '../core/round/RoundController';
import type { TaskKind } from '../core/types';
import { CachedTexture } from './cachedTexture';
import { poly } from './iso';
import { bombAt, BOMB_DRIFT } from './bombPath';
import { aimPoint, type SlotPoint } from './slots';
import type { TaskView, TaskViewContext, TaskViewFactory } from './taskViews';
import { DEPTH } from './world';

const SCALE = 1.5;
const BOX = { width: 50, height: 30, x: 25, y: 15 } as const;

/** The bomb in the prototype's units, its middle at (0, 0), nose to the right. */
export function drawBomb(ctx: CanvasRenderingContext2D): void {
  poly(ctx, [[-14, -5], [-22, -10], [-22, 10], [-14, 5]], '#ffd23f', 'rgba(0,0,0,.3)');
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#2e3d63';
  ctx.fill();
  ctx.fillStyle = '#ffffff66';
  ctx.beginPath();
  ctx.ellipse(-3, -4, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

interface Fall {
  from: SlotPoint;
  to: SlotPoint;
  ms: number;
}

function slotCount(state: RoundState): number {
  const slots = (state.taskState as { slots?: unknown } | null)?.slots;
  return Array.isArray(slots) ? slots.length : 0;
}

class BombView implements TaskView {
  private readonly image: Phaser.GameObjects.Image;
  /** Counts passes, so a release from an earlier pass does nothing. */
  private pass = 0;
  private fall: Fall | null = null;

  constructor(private readonly ctx: TaskViewContext) {
    const texture = new CachedTexture(ctx.scene, 'bomb', BOX.width * SCALE, BOX.height * SCALE, 2);
    texture.draw('bomb', (g) => {
      g.scale(SCALE, SCALE);
      g.translate(BOX.x, BOX.y);
      drawBomb(g);
    });
    this.image = ctx.scene.add.image(0, 0, texture.key).setScale(texture.scale).setDepth(DEPTH.effects - 1).setVisible(false);
  }

  show(): void {}

  event(e: RoundEvent, state: RoundState): void {
    if (e.type === 'passStarted') {
      const pass = ++this.pass;
      const to = aimPoint(state.task.kind, slotCount(state), e.slot);
      const plane = this.ctx.plane;
      // The plane's x is its middle; the bomb leaves from the bomb bay, a little further forward.
      const releaseX = to.x - BOMB_DRIFT - (plane.bombBay.x - plane.flight.state().x);
      plane.startPass(releaseX, () => this.release(pass, to));
    } else if (e.type === 'bombLanded') {
      this.fall = null;
      this.image.setVisible(false);
      const at = aimPoint(state.task.kind, slotCount(state), e.slot);
      if (e.hit) this.ctx.effects.hit(this.ctx.bombStyle(), at.x, at.y);
      else this.ctx.effects.puff(at.x, at.y);
    }
  }

  update(ms: number): void {
    const fall = this.fall;
    if (fall === null) return;
    fall.ms += ms;
    const b = bombAt(fall.from, fall.to, fall.ms);
    this.image.setPosition(b.x, b.y).setRotation(b.rotation);
    if (b.done) {
      this.fall = null;
      this.image.setVisible(false);
      this.ctx.input.landBomb();
    }
  }

  busy(): boolean {
    return this.fall !== null;
  }

  hide(): void {
    this.fall = null;
    this.image.setVisible(false);
  }

  destroy(): void {
    this.image.destroy();
  }

  private release(pass: number, to: SlotPoint): void {
    if (pass !== this.pass || this.ctx.phase() !== 'pass') return;
    const from = this.ctx.plane.bombBay;
    this.fall = { from, to, ms: 0 };
    this.image.setPosition(from.x, from.y).setVisible(true);
    this.ctx.sound('whistle');
  }
}

/** The kinds a bomb falls on; US2 adds "Bauplan finden" and "Ansicht finden". */
export const BOMB_KINDS: readonly TaskKind[] = ['koerper', 'formen', 'bauplanFinden', 'ansichtFinden'];

export const bombView: TaskViewFactory = { kinds: BOMB_KINDS, create: (ctx) => new BombView(ctx) };
