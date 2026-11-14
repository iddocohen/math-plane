/**
 * The choices of a "Treffer" task standing in the field slots (FR-007, FR-008, FR-012), shared by SolidsView and
 * ShapesView; US2's buildings and view cards can use it with their own art.
 *
 * - Each choice is drawn once into its own cached texture (research R19) and stands at its slot (slots.ts).
 * - A tap on a slot calls `tapChoice(slot)`; the RoundController ignores it outside `aim`.
 * - The keyboard marker, a dashed yellow ring on the ground, shows once an arrow key was pressed. Arrows move it from
 *   slot to slot; Enter or Space bombs the marked slot.
 * - A hit target disappears in its burst. After a miss the choices walk to their new slots (`slotsShuffled`) after a
 *   short pause, so the child sees the puff first; the view is busy until they stand.
 */
import Phaser from 'phaser';
import type { RoundEvent, RoundState } from '../core/round/RoundController';
import type { TaskBase } from '../core/round/rules';
import type { TaskKind } from '../core/types';
import { CachedTexture } from './cachedTexture';
import { slotPoint, type SlotPoint } from './slots';
import type { SceneKey, TaskView, TaskViewContext, TaskViewFactory } from './taskViews';
import { DEPTH } from './world';

/** How a kind's choices look. */
export interface TargetArt<T extends TaskBase> {
  /** The texture box in world units, with the ground middle of the choice at (originX, originY). */
  box: { width: number; height: number; originX: number; originY: number };
  /** The radius of the tap area around the target's middle. */
  tapRadius: number;
  /** How far above the ground point the target's middle is. */
  rise: number;
  /** The keyboard marker ring: its radii and how far below the ground point its middle is. */
  marker: { rx: number; ry: number; below: number };
  /** How many choices the task has. */
  count(task: T): number;
  /** What choice `i` looks like, so its texture is drawn only when this changes. */
  signature(task: T, i: number): string;
  /** Draws choice `i` with its ground middle at (0, 0), in world units. */
  draw(ctx: CanvasRenderingContext2D, task: T, i: number): void;
}

/** The pause after a miss before the choices move, and how long they walk. */
export const MOVE_DELAY_MS = 450;
export const MOVE_MS = 600;
const MAX_CHOICES = 4;
const RESOLUTION = 2;

interface Choice {
  texture: CachedTexture;
  image: Phaser.GameObjects.Image;
  from: SlotPoint;
  to: SlotPoint;
  gone: boolean;
}

function slotsOf(state: RoundState): number[] {
  const slots = (state.taskState as { slots?: unknown } | null)?.slots;
  return Array.isArray(slots) ? (slots as number[]) : [];
}

function drawMarker(ctx: CanvasRenderingContext2D, rx: number, ry: number): void {
  ctx.strokeStyle = 'rgba(255,230,90,.95)';
  ctx.lineWidth = 6;
  ctx.setLineDash([15, 9]);
  ctx.beginPath();
  ctx.ellipse(rx + 6, ry + 6, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
}

class TargetsView<T extends TaskBase> implements TaskView {
  private readonly choices: Choice[] = [];
  private readonly zones: Phaser.GameObjects.Zone[] = [];
  private readonly marker: Phaser.GameObjects.Image;
  private taskId: string | null = null;
  private count = 0;
  private markerSlot = 0;
  private markerShown = false;
  private moveMs: number | null = null;
  private visible = false;
  private phase: RoundState['phase'] = 'aim';

  constructor(
    private readonly ctx: TaskViewContext,
    private readonly art: TargetArt<T>,
    prefix: string,
  ) {
    const scene = ctx.scene;
    const { box } = art;
    for (let i = 0; i < MAX_CHOICES; i++) {
      const texture = new CachedTexture(scene, `${prefix}-${i}`, box.width, box.height, RESOLUTION);
      const image = scene.add.image(0, 0, texture.key).setScale(texture.scale).setOrigin(box.originX / box.width, box.originY / box.height).setVisible(false);
      this.choices.push({ texture, image, from: { x: 0, y: 0 }, to: { x: 0, y: 0 }, gone: false });
      const zone = scene.add.zone(0, 0, art.tapRadius * 2, art.tapRadius * 2);
      zone.setInteractive(new Phaser.Geom.Circle(art.tapRadius, art.tapRadius, art.tapRadius), Phaser.Geom.Circle.Contains);
      zone.on('pointerdown', () => this.tap(i));
      zone.disableInteractive();
      this.zones.push(zone);
    }
    const { rx, ry } = art.marker;
    const markerTexture = new CachedTexture(scene, `${prefix}-marker`, rx * 2 + 12, ry * 2 + 12, RESOLUTION);
    markerTexture.draw('marker', (g) => drawMarker(g, rx, ry));
    this.marker = scene.add.image(0, 0, markerTexture.key).setScale(markerTexture.scale).setDepth(DEPTH.targets - 0.5).setVisible(false);
  }

  show(state: RoundState): void {
    const task = state.task as T;
    this.visible = true;
    this.phase = state.phase;
    const slots = slotsOf(state);
    if (task.id !== this.taskId) this.reset(task, slots);
    this.count = slots.length;
    this.zones.forEach((zone, slot) => {
      const p = slotPoint(this.count, slot);
      zone.setPosition(p.x, p.y - this.art.rise);
      if (slot < this.count && state.phase === 'aim') zone.setInteractive();
      else zone.disableInteractive();
    });
    this.choices.forEach((c, i) => c.image.setVisible(i < this.count && !c.gone));
    this.placeMarker();
  }

  event(e: RoundEvent, state: RoundState): void {
    if (e.type === 'bombLanded' && e.hit) {
      const c = this.choices[e.choice];
      if (c) c.gone = true;
    } else if (e.type === 'slotsShuffled') {
      this.choices.forEach((c, i) => {
        c.from = this.pointOf(c);
        const slot = e.slots.indexOf(i);
        if (slot >= 0) c.to = slotPoint(e.slots.length, slot);
      });
      this.moveMs = -MOVE_DELAY_MS;
    }
    this.phase = state.phase;
  }

  key(k: SceneKey, state: RoundState): boolean {
    const n = slotsOf(state).length;
    if (n === 0) return false;
    if (k.type === 'arrow') {
      const step = k.dx !== 0 ? k.dx : k.dy;
      if (step === 0) return false;
      // The first arrow shows the marker where it is; later arrows move it.
      if (this.markerShown) this.markerSlot = (this.markerSlot + step + n) % n;
      this.markerShown = true;
      this.placeMarker();
      return true;
    }
    if (k.type === 'select') {
      this.markerShown = true;
      this.ctx.input.tapChoice(this.markerSlot);
      this.placeMarker();
      return true;
    }
    return false;
  }

  update(ms: number): void {
    if (this.moveMs === null) return;
    this.moveMs += ms;
    const k = Math.max(0, Math.min(1, this.moveMs / MOVE_MS));
    // Ease in and out, with a small hop so the walk reads as a move.
    const e = k * k * (3 - 2 * k);
    for (const c of this.choices) {
      const hop = Math.sin(Math.PI * k) * 26;
      this.place(c, { x: c.from.x + (c.to.x - c.from.x) * e, y: c.from.y + (c.to.y - c.from.y) * e - hop });
    }
    if (k >= 1) this.moveMs = null;
  }

  busy(): boolean {
    return this.moveMs !== null;
  }

  hide(): void {
    this.visible = false;
    this.taskId = null;
    this.moveMs = null;
    for (const c of this.choices) c.image.setVisible(false);
    for (const z of this.zones) z.disableInteractive();
    this.marker.setVisible(false);
  }

  destroy(): void {
    for (const c of this.choices) c.image.destroy();
    for (const z of this.zones) z.destroy();
    this.marker.destroy();
  }

  private tap(slot: number): void {
    if (!this.visible) return;
    this.markerSlot = slot;
    this.ctx.input.tapChoice(slot);
  }

  private reset(task: T, slots: number[]): void {
    this.taskId = task.id;
    this.moveMs = null;
    const n = Math.min(this.art.count(task), MAX_CHOICES);
    this.choices.forEach((c, i) => {
      c.gone = false;
      if (i >= n) return;
      c.texture.draw(this.art.signature(task, i), (g) => {
        g.translate(this.art.box.originX, this.art.box.originY);
        this.art.draw(g, task, i);
      });
      const slot = slots.indexOf(i);
      const p = slotPoint(slots.length, Math.max(0, slot));
      c.from = p;
      c.to = p;
      this.place(c, p);
    });
    this.markerSlot = Math.min(this.markerSlot, Math.max(0, slots.length - 1));
  }

  private pointOf(c: Choice): SlotPoint {
    return { x: c.image.x, y: c.image.y };
  }

  private place(c: Choice, p: SlotPoint): void {
    c.image.setPosition(p.x, p.y).setDepth(DEPTH.targets + p.y / 10_000);
  }

  private placeMarker(): void {
    const show = this.visible && this.markerShown && this.phase === 'aim' && this.count > 0;
    this.marker.setVisible(show);
    if (!show) return;
    const p = slotPoint(this.count, this.markerSlot);
    this.marker.setPosition(p.x, p.y + this.art.marker.below);
  }
}

/** A view factory for `kinds` drawn with `art`; `prefix` names its textures. */
export function targetsViewFactory<T extends TaskBase>(kinds: readonly TaskKind[], prefix: string, art: TargetArt<T>): TaskViewFactory {
  return { kinds, create: (ctx) => new TargetsView(ctx, art, prefix) };
}
