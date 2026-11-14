/**
 * Cards of "Bauplan finden" and "Ansicht finden" (FR-005, FR-018, FR-019, FR-026), drawn like the workbook pages and
 * the prototype's `card` and `drawPlan`:
 *
 * - The plan card "Bauplan" on the left of the field: the plan's squares with their numbers and "vorn" below. After a
 *   miss, the "Getroffen" card below it shows the plan of the building hit, with a dot in that building's color.
 * - View cards standing in the field slots as bomb targets (TargetsView): a grid with the filled squares of a cube
 *   view, or the outlines of a mixed view on a faint grid, back to front. "unten" below a side view, "vorn" below the
 *   view from above.
 *
 * `drawPlanGrid` and `drawViewGrid` take a box in world units, so "Bauen", "Malen" and "Male an" (US3, US4) can draw
 * their plan and paint grids with them.
 *
 * "Bauen" (FR-021, FR-024a, FR-024b, `bauenCardsView`): the card "So soll es aussehen" with the finished building on
 * the left, and the plan card "Bauplan" on the right with the plan written so far. The selected square has a thick
 * yellow frame; squares a wrong "Fertig" marked have a thick dashed orange frame and a "?" badge. A tap on a plan
 * square selects it; the arrow keys move the frame, digits write the selected square and Backspace empties it. The
 * rules ignore digits above 4. The field with the crates is CratesView. Help step 2 shows the right number of one
 * wrong or empty square faintly in blue; step 3 shows every right number that is not written yet (research R15).
 */
import type Phaser from 'phaser';
import type { MixedView } from '../core/geometry/mixed';
import type { Plan } from '../core/geometry/plan';
import type { CubeView } from '../core/geometry/views';
import type { RoundState } from '../core/round/RoundController';
import type { HelpMark } from '../core/tasks/help';
import { isCubeCard, isMixedBuilding, type AnsichtFindenTask, type BauenTask, type BauplanFindenTask } from '../core/tasks/types';
import type { Side } from '../core/types';
import { t } from '../i18n';
import { dashedMark, questionBadge } from './iso';
import { CSS, shade } from './palette';
import { planInputBox, planSquareAt, sizeOf, TARGET_CARD, type Square } from './bauenLayout';
import { drawAnyBuilding } from './BuildingView';
import { CachedTexture } from './cachedTexture';
import { HelpLook } from './helpLook';
import { AIM_RISE, PLAN_CARD } from './slots';
import { targetsViewFactory, type TargetArt } from './TargetsView';
import type { SceneKey, TaskView, TaskViewContext, TaskViewFactory } from './taskViews';
import { DEPTH } from './world';

const FONT = "Fredoka, 'Trebuchet MS', sans-serif";
const GRID_LINE = '#9aa7c7';

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string = CSS.ink): void {
  ctx.font = `600 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A white card with rounded corners and an optional title at the top (prototype `card`). */
export function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title?: string): void {
  ctx.fillStyle = 'rgba(0,0,0,.14)';
  roundRect(ctx, x + 4, y + 6, w, h, 16);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  if (title) text(ctx, title, x + w / 2, y + 22, 20);
}

/** What a plan grid shows besides the numbers ("Bauen", FR-024a). */
export interface PlanGridOptions {
  /** The selected square: a thick yellow frame. */
  selected?: { row: number; col: number } | null;
  /** Squares a wrong "Fertig" marked, as `"row,col"`: a thick dashed orange frame and a "?" badge. */
  marked?: ReadonlySet<string>;
  /**
   * Help (research R15): right heights drawn faintly in blue on a light blue square, null where nothing shows. In an
   * empty square the number stands in the middle; beside a written number it stands small in the lower left corner.
   */
  ghost?: readonly (readonly (number | null)[])[] | null;
  /** How strong the faint heights are, 0 to 1. */
  ghostAlpha?: number;
}

const HELP_BLUE = '#2f7fd1';
/** How strong the help numbers on the plan are: one number at step 2, the whole plan at step 3. */
const PLAN_GHOST_ALPHA = { one: 0.6, full: 0.45 } as const;

/**
 * A building plan: white squares with their stack numbers, "vorn" below (prototype `drawPlan`, FR-005). A square with
 * null stays empty, as a plan the child has not written yet.
 */
export function drawPlanGrid(ctx: CanvasRenderingContext2D, plan: readonly (readonly (number | null)[])[], x0: number, y0: number, c: number, opt: PlanGridOptions = {}): void {
  const rows = plan.length;
  const cols = plan[0]?.length ?? 0;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x = x0 + k * c;
      const y = y0 + r * c;
      const selected = opt.selected?.row === r && opt.selected.col === k;
      ctx.fillStyle = selected ? '#fff3b0' : '#fff';
      ctx.fillRect(x, y, c, c);
      ctx.strokeStyle = CSS.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, c, c);
      const v = plan[r]![k];
      const g = opt.ghost?.[r]?.[k];
      if (g !== null && g !== undefined && g !== v) {
        ctx.save();
        ctx.fillStyle = 'rgba(47,127,209,.14)';
        ctx.fillRect(x + 2, y + 2, c - 4, c - 4);
        ctx.globalAlpha = opt.ghostAlpha ?? 0.5;
        if (v === null || v === undefined) text(ctx, String(g), x + c / 2, y + c / 2 + 2, c * 0.55, HELP_BLUE);
        else text(ctx, String(g), x + c * 0.2, y + c * 0.8, c * 0.26, HELP_BLUE);
        ctx.restore();
      }
      if (v !== null && v !== undefined) text(ctx, String(v), x + c / 2, y + c / 2 + 2, c * 0.55);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      if (!opt.marked?.has(`${r},${k}`)) continue;
      const x = x0 + k * c;
      const y = y0 + r * c;
      const inset = Math.max(5, c * 0.08);
      dashedMark(ctx, [[x + inset, y + inset], [x + c - inset, y + inset], [x + c - inset, y + c - inset], [x + inset, y + c - inset]], 5);
      questionBadge(ctx, x + c - inset - 2, y + inset + 2, Math.max(11, c * 0.13));
    }
  }
  const sel = opt.selected;
  if (sel && sel.row >= 0 && sel.row < rows && sel.col >= 0 && sel.col < cols) {
    // Drawn last and wider than the grid lines, so the frame reads over its neighbors' lines.
    const x = x0 + sel.col * c;
    const y = y0 + sel.row * c;
    ctx.save();
    ctx.strokeStyle = CSS.gold;
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    ctx.strokeRect(x + 1, y + 1, c - 2, c - 2);
    ctx.strokeStyle = '#b8901a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, c + 6, c + 6);
    ctx.restore();
  }
  text(ctx, t().round.front, x0 + (cols * c) / 2, y0 + rows * c + 18, 17);
}

/** The size of a view in grid squares: columns and rows. */
export function viewSize(view: CubeView | MixedView): { cols: number; rows: number } {
  return isCubeCard(view) ? { cols: view.cells[0]?.length ?? 0, rows: view.cells.length } : { cols: view.width, rows: view.height };
}

/**
 * A view on its grid with the top left corner at (x0, y0), squares `c` wide: filled squares of a cube view in `color`,
 * or the outlines of a mixed view in their pieces' colors, back to front (FR-026). `under` is written below: "unten"
 * for a side view, "vorn" for the view from above. `colors` gives the color of each piece of a mixed view.
 */
export function drawViewGrid(
  ctx: CanvasRenderingContext2D,
  view: CubeView | MixedView,
  x0: number,
  y0: number,
  c: number,
  color: string,
  under: string,
  colors: readonly string[] = [],
): void {
  const { cols, rows } = viewSize(view);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x0, y0, cols * c, rows * c);
  if (isCubeCard(view)) {
    view.cells.forEach((row, r) =>
      row.forEach((on, k) => {
        if (!on) return;
        ctx.fillStyle = color;
        ctx.fillRect(x0 + k * c, y0 + r * c, c, c);
      }),
    );
  }
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 1.5;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) ctx.strokeRect(x0 + k * c, y0 + r * c, c, c);
  if (!isCubeCard(view)) {
    for (const o of view.outlines) {
      // Grid units have y up; the canvas has y down.
      const x = x0 + o.x * c;
      const y = y0 + (rows - o.y - o.h) * c;
      ctx.beginPath();
      if (o.shape === 'rect') ctx.rect(x, y, o.w * c, o.h * c);
      else ctx.arc(x + (o.w * c) / 2, y + (o.h * c) / 2, (o.w * c) / 2, 0, Math.PI * 2);
      ctx.fillStyle = shade(colors[o.pieceIndex] ?? color, 1.15);
      ctx.fill();
      ctx.strokeStyle = CSS.ink;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
  ctx.strokeStyle = CSS.ink;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x0, y0, cols * c, rows * c);
  text(ctx, under, x0 + (cols * c) / 2, y0 + rows * c + 18, 17);
}

/** The word below a view of `side`: "vorn" for the view from above, "unten" for a side view. */
export function underLabel(side: Side): string {
  return side === 'oben' ? t().round.front : t().round.bottom;
}

// ---------------------------------------------------------------- view cards

/** The view card in world units: its ground middle at (0, 0). */
export const VIEW_CARD = { width: 200, height: 236, grid: 150 } as const;

/** Draws view card `i` of `task` standing on the ground at (0, 0). */
export function drawViewCard(ctx: CanvasRenderingContext2D, task: AnsichtFindenTask, i: number): void {
  const { view } = task.choices[i]!;
  const { width, height, grid } = VIEW_CARD;
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.ellipse(0, 0, width * 0.5, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  drawCard(ctx, -width / 2, -height, width, height);
  const { cols, rows } = viewSize(view);
  const c = grid / Math.max(cols, rows, 1);
  const x0 = -(cols * c) / 2;
  const y0 = -height + 18 + (grid - rows * c) / 2;
  const colors = isMixedBuilding(task.building) ? task.building.pieces.map((p) => p.color) : [];
  // Every card of a task reads as the side asked, so the word below gives nothing away.
  drawViewGrid(ctx, view, x0, y0, c, task.color, underLabel(task.side), colors);
}

export const VIEW_CARDS_ART: TargetArt<AnsichtFindenTask> = {
  box: { width: VIEW_CARD.width + 20, height: VIEW_CARD.height + 40, originX: VIEW_CARD.width / 2 + 10, originY: VIEW_CARD.height + 14 },
  tapRadius: 115,
  rise: AIM_RISE.ansichtFinden!,
  marker: { rx: 118, ry: 34, below: 8 },
  count: (task) => task.choices.length,
  signature: (task, i) => `${task.id}:${task.choices[i]!.view.signature}`,
  draw: drawViewCard,
};

export const viewCardsView = targetsViewFactory(['ansichtFinden'], 'view-card', VIEW_CARDS_ART);

// ---------------------------------------------------------------- plan card and "Getroffen"


function lastHit(state: RoundState): number | null {
  const hit = (state.taskState as { lastHit?: unknown } | null)?.lastHit;
  return typeof hit === 'number' ? hit : null;
}

/** Draws the plan card at (0, 0) and, when `hit` is a building of `task`, the "Getroffen" card below it. */
export function drawPlanCards(ctx: CanvasRenderingContext2D, task: BauplanFindenTask, hit: number | null): void {
  const { width, height, gap, grid } = PLAN_CARD;
  const card = (y: number, title: string, plan: Plan) => {
    drawCard(ctx, 0, y, width, height, title);
    const c = grid / Math.max(plan.length, plan[0]?.length ?? 0);
    drawPlanGrid(ctx, plan, (width - (plan[0]?.length ?? 0) * c) / 2, y + 46, c);
  };
  card(0, t().round.planCard, task.plan);
  if (hit === null || task.rightIndexes.includes(hit) || !task.choices[hit]) return;
  const y = height + gap;
  card(y, t().round.hitCard, task.choices[hit]);
  // A dot in the color of the building hit, so the child sees which building the card belongs to.
  ctx.beginPath();
  ctx.arc(width - 30, y + 22, 10, 0, Math.PI * 2);
  ctx.fillStyle = task.colors[hit]!;
  ctx.fill();
  ctx.strokeStyle = CSS.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
}

class PlanCardsView implements TaskView {
  private readonly texture: CachedTexture;
  private readonly image: Phaser.GameObjects.Image;

  constructor(ctx: TaskViewContext) {
    const h = PLAN_CARD.height * 2 + PLAN_CARD.gap + 10;
    this.texture = new CachedTexture(ctx.scene, 'plan-cards', PLAN_CARD.width + 10, h, 2);
    this.image = ctx.scene.add.image(PLAN_CARD.x, PLAN_CARD.y, this.texture.key).setScale(this.texture.scale).setOrigin(0, 0).setDepth(DEPTH.targets - 1).setVisible(false);
  }

  show(state: RoundState): void {
    const task = state.task as BauplanFindenTask;
    const hit = lastHit(state);
    this.texture.draw(`${task.id}:${hit}`, (g) => drawPlanCards(g, task, hit));
    this.image.setVisible(true);
  }

  hide(): void {
    this.image.setVisible(false);
  }

  destroy(): void {
    this.image.destroy();
  }
}

export const planCardsView: TaskViewFactory = { kinds: ['bauplanFinden'], create: (ctx) => new PlanCardsView(ctx) };

// ---------------------------------------------------------------- "Bauen": target card and plan card

/** The state of a "Bauen" task as the cards read it (core/round/BauenMalenRules.ts `BauenState`). */
interface BauenLook {
  planInput: (number | null)[][];
  selected: Square;
}

function bauenLook(state: RoundState): BauenLook | null {
  const s = state.taskState as Partial<BauenLook> | null;
  return s && Array.isArray(s.planInput) && s.selected ? (s as BauenLook) : null;
}

/** The frame shows only while the child writes, not while the task is solved (prototype `S.busy`). */
export function frameShown(phase: RoundState['phase']): boolean {
  return phase === 'aim' || phase === 'check' || phase === 'paused';
}

/** The square the arrow keys move to from `from`, kept inside a plan of `size`. */
export function movedSquare(from: Square, dx: number, dy: number, size: number): Square {
  const clamp = (v: number) => Math.max(0, Math.min(size - 1, v));
  return { row: clamp(from.row + dy), col: clamp(from.col + dx) };
}

/** Draws the card "So soll es aussehen" with the finished building, its top left corner at (0, 0). */
export function drawTargetCard(ctx: CanvasRenderingContext2D, task: BauenTask): void {
  const { width, height, cube } = TARGET_CARD;
  drawCard(ctx, 0, 0, width, height, t().round.target);
  const size = sizeOf(task.target);
  drawAnyBuilding(ctx, task.target, width / 2, TARGET_CARD.groundY, cube[size], task.color);
}

/**
 * Draws the plan card "Bauplan" with the plan written so far, as placed by `planInputBox`, at the world origin. `help`
 * is the plan mark of an open help step: one right height at step 2, all of them at step 3.
 */
export function drawPlanInput(ctx: CanvasRenderingContext2D, look: BauenLook, marked: ReadonlySet<string>, framed: boolean, help: HelpMark | null = null): void {
  const size = sizeOf(look.planInput as number[][]);
  const box = planInputBox(size);
  drawCard(ctx, box.x, box.y, box.width, box.height, t().round.planCard);
  const ghost = help?.type === 'plan' ? help.heights : null;
  // One number alone (step 2) shows a little stronger than the whole plan (step 3), which stays faint.
  const full = ghost !== null && ghost.every((row) => row.every((h) => h !== null));
  drawPlanGrid(ctx, look.planInput, box.x0, box.y0, box.c, {
    selected: framed ? look.selected : null,
    marked,
    ghost,
    ghostAlpha: full ? PLAN_GHOST_ALPHA.full : PLAN_GHOST_ALPHA.one,
  });
}

/** The plan card's texture: the right part of the world, wide enough for a 3×3 plan. */
const PLAN_TEXTURE = { x: 960, y: 380, width: 540, height: 480 } as const;

class BauenCardsView implements TaskView {
  private readonly target: CachedTexture;
  private readonly targetImage: Phaser.GameObjects.Image;
  private readonly plan: CachedTexture;
  private readonly planImage: Phaser.GameObjects.Image;
  private state: RoundState | null = null;
  private readonly help = new HelpLook();
  private readonly onPointer: (p: Phaser.Input.Pointer) => void;

  constructor(private readonly ctx: TaskViewContext) {
    const { scene } = ctx;
    this.target = new CachedTexture(scene, 'bauen-target', TARGET_CARD.width + 10, TARGET_CARD.height + 10, 2);
    this.targetImage = scene.add.image(TARGET_CARD.x, TARGET_CARD.y, this.target.key).setScale(this.target.scale).setOrigin(0, 0).setDepth(DEPTH.targets - 1).setVisible(false);
    this.plan = new CachedTexture(scene, 'bauen-plan', PLAN_TEXTURE.width, PLAN_TEXTURE.height, 2);
    this.planImage = scene.add.image(PLAN_TEXTURE.x, PLAN_TEXTURE.y, this.plan.key).setScale(this.plan.scale).setOrigin(0, 0).setDepth(DEPTH.targets - 1).setVisible(false);
    this.onPointer = (p) => this.tap(p.worldX, p.worldY);
    scene.input.on('pointerdown', this.onPointer);
  }

  show(state: RoundState): void {
    this.state = state;
    const task = state.task as BauenTask;
    const look = bauenLook(state);
    if (look === null) return this.hide();
    this.target.draw(`${task.id}`, (g) => drawTargetCard(g, task));
    const marked = new Set(state.marked);
    const framed = frameShown(state.phase);
    const help = this.help.of(state);
    this.plan.draw(JSON.stringify([task.id, look.planInput, look.selected, state.marked, framed, help]), (g) => {
      g.translate(-PLAN_TEXTURE.x, -PLAN_TEXTURE.y);
      drawPlanInput(g, look, marked, framed, help);
    });
    this.targetImage.setVisible(true);
    this.planImage.setVisible(true);
  }

  key(k: SceneKey, state: RoundState): boolean {
    const look = bauenLook(state);
    if (look === null) return false;
    const { row, col } = look.selected;
    const input = this.ctx.input;
    switch (k.type) {
      case 'arrow': {
        const to = movedSquare(look.selected, k.dx, k.dy, look.planInput.length);
        input.select(to.row, to.col);
        return true;
      }
      case 'digit':
        input.typeHeight(row, col, k.digit);
        return true;
      case 'backspace':
        input.clearHeight(row, col);
        return true;
      default:
        return false;
    }
  }

  hide(): void {
    this.state = null;
    this.targetImage.setVisible(false);
    this.planImage.setVisible(false);
  }

  destroy(): void {
    this.ctx.scene.input.off('pointerdown', this.onPointer);
    this.targetImage.destroy();
    this.planImage.destroy();
  }

  /** A tap on a plan square selects it (FR-024b). */
  private tap(x: number, y: number): void {
    const look = this.state ? bauenLook(this.state) : null;
    if (look === null) return;
    const square = planSquareAt(sizeOf(look.planInput as number[][]), x, y);
    if (square) this.ctx.input.select(square.row, square.col);
  }
}

export const bauenCardsView: TaskViewFactory = { kinds: ['bauen'], create: (ctx) => new BauenCardsView(ctx) };
