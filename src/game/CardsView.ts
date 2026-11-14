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
 */
import type Phaser from 'phaser';
import type { MixedView } from '../core/geometry/mixed';
import type { Plan } from '../core/geometry/plan';
import type { CubeView } from '../core/geometry/views';
import type { RoundState } from '../core/round/RoundController';
import { isCubeCard, isMixedBuilding, type AnsichtFindenTask, type BauplanFindenTask } from '../core/tasks/types';
import type { Side } from '../core/types';
import { t } from '../i18n';
import { CSS, shade } from './palette';
import { CachedTexture } from './cachedTexture';
import { AIM_RISE, PLAN_CARD } from './slots';
import { targetsViewFactory, type TargetArt } from './TargetsView';
import type { TaskView, TaskViewContext, TaskViewFactory } from './taskViews';
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

/** A building plan: white squares with their stack numbers, "vorn" below (prototype `drawPlan`, FR-005). */
export function drawPlanGrid(ctx: CanvasRenderingContext2D, plan: Plan, x0: number, y0: number, c: number): void {
  const rows = plan.length;
  const cols = plan[0]?.length ?? 0;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x = x0 + k * c;
      const y = y0 + r * c;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, c, c);
      ctx.strokeStyle = CSS.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, c, c);
      text(ctx, String(plan[r]![k]), x + c / 2, y + c / 2 + 2, c * 0.55);
    }
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
