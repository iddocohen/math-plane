/**
 * The field of "Bauen" (FR-021, FR-024b, contracts/screens.md "Feedback contract"; prototype `digit`, `updCrates`,
 * `drawBauen`): the ground tiles and the stacks the child has built, with the selected square and the marked towers.
 *
 * - `cratesChanged` to a higher stack: the plane flies a pass, and when it is over the square each missing crate drops
 *   from it on a parachute, one after another, and lands on the stack with the crate sound. The stack grows as each
 *   crate lands.
 * - `cratesChanged` to a lower stack: crates still falling above the new height go, and the cubes above it vanish in a
 *   puff of smoke with the puff sound.
 * - A right "Fertig": the plane flies over trailing smoke in the building's color (the scene throws the confetti).
 * - A tap on a tower or its ground tile selects that square of the plan (FR-024b).
 *
 * The rules change the stacks at once; this view shows them as the crates land. It is busy while crates fall, so the
 * scene holds a "Fertig" until they have landed, as the prototype does.
 *
 * The landed stacks are drawn into a cached texture, redrawn when they change. Falling crates are images of their own
 * over it, so a frame with crates in the air draws no building.
 */
import type Phaser from 'phaser';
import type { RoundEvent, RoundState } from '../core/round/RoundController';
import type { BauenTask } from '../core/tasks/types';
import { FIELD, fieldProjector, fieldSquareAt, sizeOf, type Size } from './bauenLayout';
import { drawVornMark } from './BuildingView';
import { CachedTexture } from './cachedTexture';
import { CELEBRATE_SMOKE_MS, CHUTE_OPEN, cratesFor, stepCrates, type FallingCrate } from './crates';
import { PASS_SPEED } from './flight';
import { drawBuilding, drawCrate, isoProjector } from './iso';
import type { TaskView, TaskViewContext, TaskViewFactory } from './taskViews';
import { DEPTH } from './world';

/** The texture of the field, with the building's ground middle at (ORIGIN.x, ORIGIN.y). */
const BOX = { width: 600, height: 660 } as const;
const ORIGIN = { x: 300, y: 520 } as const;

/** One crate's texture is drawn with cubes this wide; the images scale to the field's cube. */
const CRATE_CUBE = 80;
const CRATE_BOX = { width: CRATE_CUBE * 2 + 90, height: CRATE_CUBE * 4 + 60 } as const;
/** Where the corner (0, 0, 0) of the crate's square is in its texture. */
const CRATE_ORIGIN = { x: CRATE_BOX.width / 2, y: CRATE_CUBE * 2.64 + 44 } as const;

class CratesView implements TaskView {
  private readonly field: CachedTexture;
  private readonly image: Phaser.GameObjects.Image;
  private readonly chuteKey: string;
  private readonly landingKey: string;
  private taskId: string | null = null;
  /** The stacks as landed so far. */
  private shown: number[][] = [];
  private crates: Array<{ crate: FallingCrate; image: Phaser.GameObjects.Image }> = [];
  private state: RoundState | null = null;
  private readonly onPointer: (p: Phaser.Input.Pointer) => void;

  constructor(private readonly ctx: TaskViewContext) {
    const { scene } = ctx;
    this.field = new CachedTexture(scene, 'bauen-field', BOX.width, BOX.height, 2);
    this.image = scene.add
      .image(FIELD.x, FIELD.y, this.field.key)
      .setScale(this.field.scale)
      .setOrigin(ORIGIN.x / BOX.width, ORIGIN.y / BOX.height)
      .setDepth(DEPTH.targets)
      .setVisible(false);
    this.chuteKey = this.crateTexture('crate-chute', true);
    this.landingKey = this.crateTexture('crate-landing', false);
    this.onPointer = (p) => this.tap(p.worldX, p.worldY);
    scene.input.on('pointerdown', this.onPointer);
  }

  show(state: RoundState): void {
    const task = state.task as BauenTask;
    const built = (state.taskState as { built?: number[][] } | null)?.built;
    if (!Array.isArray(built)) return this.hide();
    this.state = state;
    if (task.id !== this.taskId) {
      // A new task, or the round continued after a refresh: the stacks stand as the rules have them.
      this.taskId = task.id;
      this.clearCrates();
      this.shown = built.map((row) => [...row]);
    }
    this.redraw();
    this.image.setVisible(true);
  }

  event(e: RoundEvent, state: RoundState): void {
    const task = state.task as BauenTask;
    if (e.type === 'cratesChanged') {
      if (task.id !== this.taskId) return;
      this.changeStack(e.row, e.col, e.to);
    } else if (e.type === 'checked' && e.right) {
      this.ctx.plane.trailSmoke(task.color, CELEBRATE_SMOKE_MS);
      this.ensurePass();
    }
  }

  update(ms: number): void {
    if (this.crates.length === 0) return;
    const falling = this.crates.map((c) => c.crate);
    const landed = new Set(stepCrates(falling, ms));
    for (const c of landed) {
      this.shown[c.row]![c.col] = Math.max(this.shown[c.row]![c.col]!, c.tz + 1);
      this.ctx.sound('crate');
    }
    this.crates = this.crates.filter(({ crate, image }) => {
      if (landed.has(crate)) {
        image.destroy();
        return false;
      }
      this.place(crate, image);
      return true;
    });
    if (landed.size > 0) this.redraw();
  }

  busy(): boolean {
    return this.crates.length > 0;
  }

  hide(): void {
    this.state = null;
    this.taskId = null;
    this.clearCrates();
    this.image.setVisible(false);
  }

  destroy(): void {
    this.ctx.scene.input.off('pointerdown', this.onPointer);
    this.clearCrates();
    this.image.destroy();
  }

  private size(): Size {
    return sizeOf(this.shown);
  }

  private cube(): number {
    return FIELD.cube[this.size()];
  }

  private changeStack(row: number, col: number, to: number): void {
    const landed = this.shown[row]![col]!;
    const falling = this.crates.filter(({ crate }) => crate.row === row && crate.col === col).length;
    const have = landed + falling;
    if (to > have) {
      this.ensurePass();
      const P = fieldProjector(this.size());
      const plane = this.ctx.plane;
      const [sx, groundY] = P(col + 0.5, row + 0.5, 0);
      // The crates leave the plane when it is over the square, from its height.
      const fly = plane.flight.state();
      const delayMs = Math.max(0, ((sx - fly.x) / PASS_SPEED) * 1000);
      const fromZ = (groundY - plane.bombBay.y) / (1.1 * this.cube());
      for (const crate of cratesFor(row, col, have, to, fromZ, delayMs)) {
        const image = this.ctx.scene.add.image(0, 0, this.chuteKey).setDepth(DEPTH.targets + 1).setVisible(false);
        this.crates.push({ crate, image });
      }
      return;
    }
    if (to < have) {
      this.crates = this.crates.filter(({ crate, image }) => {
        if (crate.row !== row || crate.col !== col || crate.tz < to) return true;
        image.destroy();
        return false;
      });
      if (landed > to) {
        const [x, y] = fieldProjector(this.size())(col + 0.5, row + 0.5, landed);
        this.ctx.effects.puff(x, y);
        this.ctx.sound('puff');
        this.shown[row]![col] = to;
        this.redraw();
      }
    }
  }

  /** Sends the plane across unless it already flies a pass. */
  private ensurePass(): void {
    if (this.ctx.plane.flight.flying === 'pass') return;
    this.ctx.plane.startPass(null);
    this.ctx.sound('propeller');
  }

  private place(c: FallingCrate, image: Phaser.GameObjects.Image): void {
    if (c.delayMs > 0) {
      image.setVisible(false);
      return;
    }
    const [x, y] = fieldProjector(this.size())(c.col, c.row, c.z);
    const chute = c.z > c.tz + CHUTE_OPEN;
    image
      .setTexture(chute ? this.chuteKey : this.landingKey)
      .setOrigin(CRATE_ORIGIN.x / CRATE_BOX.width, CRATE_ORIGIN.y / CRATE_BOX.height)
      .setScale((this.cube() / CRATE_CUBE) * 0.5)
      .setPosition(x, y)
      .setVisible(true);
  }

  private clearCrates(): void {
    for (const { image } of this.crates) image.destroy();
    this.crates = [];
  }

  private redraw(): void {
    const state = this.state;
    if (state === null) return;
    const task = state.task as BauenTask;
    const selected = (state.taskState as { selected?: { row: number; col: number } } | null)?.selected ?? null;
    const framed = state.phase === 'aim' || state.phase === 'check' || state.phase === 'paused';
    const size = this.size();
    const s = this.cube();
    this.field.draw(JSON.stringify([task.id, this.shown, framed ? selected : null, state.marked]), (g) => {
      const P = drawBuilding(g, this.shown, ORIGIN.x, ORIGIN.y, s, task.color, {
        tiles: true,
        selected: framed ? selected : null,
        marked: new Set(state.marked),
      });
      drawVornMark(g, P, size, size, s);
    });
  }

  /** A crate texture (2 times finer than the world), with or without its parachute. */
  private crateTexture(key: string, chute: boolean): string {
    const texture = new CachedTexture(this.ctx.scene, key, CRATE_BOX.width, CRATE_BOX.height, 2);
    texture.draw(key, (g) => {
      const P = isoProjector(CRATE_ORIGIN.x, CRATE_ORIGIN.y, CRATE_CUBE);
      drawCrate(g, P, { row: 0, col: 0, z: 0, tz: chute ? -1 : 0 });
    });
    return texture.key;
  }

  /** A tap on a tower or its tile selects its square (FR-024b). */
  private tap(x: number, y: number): void {
    if (this.state === null || this.shown.length === 0) return;
    const square = fieldSquareAt(this.shown, x, y);
    if (square) this.ctx.input.select(square.row, square.col);
  }
}

export const cratesView: TaskViewFactory = { kinds: ['bauen'], create: (ctx) => new CratesView(ctx) };
