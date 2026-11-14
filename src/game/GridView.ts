/**
 * "Malen" and "Male an" (FR-009, FR-022, FR-023, FR-024a, contracts/screens.md "Keys during a round"; prototype
 * `drawMalen`, `toggleCell`, `doneMalen`): the building on the field with the eye at the side asked, and the card with
 * the paint grid on the right. The color row of "Male an" is in the overlay (app/ColorRow.tsx).
 *
 * - The eye says "Hier stehst du" beside the building, or "Hier fliegst du" above it for the view from above
 *   (BuildingView `eyeSpot`, `drawEye`).
 * - "Malen": the grid shows "unten" under a side view and "vorn" under the view from above. A tap on a square colors
 *   or empties it; the arrow keys move the marker and Enter or Space color or empty the marked square.
 * - "Male an": the grid shows the outlines of the view, drawn back to front, so a nearer outline covers a farther one.
 *   A tap is hit-tested front to back (`hitTest`) and fills the region with the color picked. The arrow keys move the
 *   marker over the outlines from left to right; Tab moves it to the color row and back. On the color row the arrow
 *   keys move it over the colors and Enter or Space pick the marked color and move the marker back to the outlines.
 *   Enter or Space on an outline fill it.
 * - Squares and outlines a wrong "Fertig" marked get a thick dashed orange outline and a "?" badge (FR-024a).
 * - The marker shows on the grid only after an arrow key or Tab, and goes after a tap (as the prototype's `S.kbd`).
 * - A right "Fertig": the plane flies across trailing smoke in the building's color, or the colors of its pieces.
 */
import type Phaser from 'phaser';
import type { MixedView, Outline } from '../core/geometry/mixed';
import { hitTest } from '../core/geometry/mixed';
import type { MaleAnState, MalenState } from '../core/round/BauenMalenRules';
import type { RoundEvent, RoundState } from '../core/round/RoundController';
import { regionPoint, regionsOf } from '../core/tasks/maleAn';
import type { MaleAnTask, MalenTask } from '../core/tasks/types';
import { t } from '../i18n';
import { FIELD, sizeOf, type Square } from './bauenLayout';
import { drawAnyBuilding, eyeLabel, eyeSpot, drawEye } from './BuildingView';
import { CachedTexture } from './cachedTexture';
import { drawCard, frameShown, movedSquare, underLabel } from './CardsView';
import { CELEBRATE_SMOKE_MS } from './crates';
import { dashedMark, questionBadge, type Point } from './iso';
import { CSS } from './palette';
import { gridBox, gridSquareAt, viewPointAt } from './paintLayout';
import type { SceneKey, TaskView, TaskViewContext, TaskViewFactory } from './taskViews';
import { DEPTH } from './world';

const GRID_LINE = '#9aa7c7';

type PaintTask = MalenTask | MaleAnTask;

/** The size of the grid of a task: columns and rows. */
export function gridSize(task: PaintTask): { cols: number; rows: number } {
  return task.kind === 'malen' ? { cols: task.expected.cells[0]?.length ?? 0, rows: task.expected.cells.length } : { cols: task.view.width, rows: task.view.height };
}

function sideOf(task: PaintTask): { rows: number; cols: number } {
  return task.kind === 'malen' ? { rows: task.building.length, cols: task.building[0]?.length ?? 0 } : { rows: task.building.rows, cols: task.building.cols };
}

/** The cube width of the building on the field. */
function cubeOf(task: PaintTask): number {
  return FIELD.cube[task.kind === 'malen' ? sizeOf(task.building) : task.building.rows >= 3 ? 3 : 2];
}

/** Draws the building of `task` on the field and the eye at the side asked, in world units. */
export function drawPaintBuilding(ctx: CanvasRenderingContext2D, task: PaintTask): void {
  const s = cubeOf(task);
  const color = task.kind === 'malen' ? task.color : CSS.ink;
  const P = drawAnyBuilding(ctx, task.building, FIELD.x, FIELD.y, s, color);
  const { rows, cols } = sideOf(task);
  const { eye, target } = eyeSpot(task.side, P, rows, cols);
  drawEye(ctx, eye[0], eye[1], target[0], target[1], eyeLabel(task.side));
}

/** The square of a "Malen" marker: a thick yellow frame (as the plan square of "Bauen"). */
function squareFrame(ctx: CanvasRenderingContext2D, x: number, y: number, c: number): void {
  ctx.save();
  ctx.strokeStyle = CSS.gold;
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.strokeRect(x + 3, y + 3, c - 6, c - 6);
  ctx.strokeStyle = '#b8901a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 1, y - 1, c + 2, c + 2);
  ctx.restore();
}

/** Draws the card of a "Malen" task: the grid with the painted squares, marks and the marker, in world units. */
export function drawPaintGrid(ctx: CanvasRenderingContext2D, task: MalenTask, state: MalenState, marked: ReadonlySet<string>, marker: Square | null): void {
  const { cols, rows } = gridSize(task);
  const box = gridBox(cols, rows);
  const { x0, y0, c } = box;
  drawCard(ctx, box.x, box.y, box.width, box.height, t().round.viewCard(task.side));
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      ctx.fillStyle = state.paint[r]?.[k] ? task.color : '#fff';
      ctx.fillRect(x0 + k * c, y0 + r * c, c, c);
      ctx.strokeStyle = GRID_LINE;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x0 + k * c, y0 + r * c, c, c);
    }
  }
  ctx.strokeStyle = CSS.ink;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x0, y0, cols * c, rows * c);
  for (const id of marked) {
    const [r, k] = id.split(',').map(Number) as [number, number];
    if (!(r >= 0 && r < rows && k >= 0 && k < cols)) continue;
    const x = x0 + k * c;
    const y = y0 + r * c;
    const inset = Math.max(5, c * 0.08);
    dashedMark(ctx, [[x + inset, y + inset], [x + c - inset, y + inset], [x + c - inset, y + c - inset], [x + inset, y + c - inset]], 5);
    questionBadge(ctx, x + c - inset - 2, y + inset + 2, Math.max(11, c * 0.13));
  }
  if (marker) squareFrame(ctx, x0 + marker.col * c, y0 + marker.row * c, c);
  textUnder(ctx, underLabel(task.side), x0 + (cols * c) / 2, y0 + rows * c + 20);
}

function textUnder(ctx: CanvasRenderingContext2D, s: string, x: number, y: number): void {
  ctx.font = "600 17px Fredoka, 'Trebuchet MS', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CSS.ink;
  ctx.fillText(s, x, y);
}

/** The outline `o` of a view `rows` high as a path on the grid at (x0, y0) with squares `c` wide. */
function outlinePath(ctx: CanvasRenderingContext2D, o: Outline, x0: number, y0: number, c: number, rows: number, inset = 0): void {
  const x = x0 + o.x * c;
  const y = y0 + (rows - o.y - o.h) * c;
  ctx.beginPath();
  if (o.shape === 'rect') ctx.rect(x + inset, y + inset, o.w * c - inset * 2, o.h * c - inset * 2);
  else ctx.arc(x + (o.w * c) / 2, y + (o.h * c) / 2, (o.w * c) / 2 - inset, 0, Math.PI * 2);
}

/** The outline as a polygon (a circle as 40 points), for the dashed mark. */
function outlinePolygon(o: Outline, x0: number, y0: number, c: number, rows: number, inset: number): Point[] {
  const x = x0 + o.x * c;
  const y = y0 + (rows - o.y - o.h) * c;
  if (o.shape === 'rect') {
    return [
      [x + inset, y + inset],
      [x + o.w * c - inset, y + inset],
      [x + o.w * c - inset, y + o.h * c - inset],
      [x + inset, y + o.h * c - inset],
    ];
  }
  const r = (o.w * c) / 2 - inset;
  return Array.from({ length: 40 }, (_, i): Point => [x + (o.w * c) / 2 + r * Math.cos((i / 40) * Math.PI * 2), y + (o.h * c) / 2 + r * Math.sin((i / 40) * Math.PI * 2)]);
}

/**
 * Draws the card of a "Male an" task in world units: the faint grid, the outlines back to front filled with the colors
 * chosen (white while empty), the marks with their "?" badge and the marker on an outline.
 */
export function drawRegionGrid(ctx: CanvasRenderingContext2D, task: MaleAnTask, state: MaleAnState, marked: ReadonlySet<string>, marker: number | null): void {
  const view: MixedView = task.view;
  const { cols, rows } = gridSize(task);
  const box = gridBox(cols, rows);
  const { x0, y0, c } = box;
  drawCard(ctx, box.x, box.y, box.width, box.height, t().round.viewCard(task.side));
  ctx.fillStyle = '#fff';
  ctx.fillRect(x0, y0, cols * c, rows * c);
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 1.2;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) ctx.strokeRect(x0 + k * c, y0 + r * c, c, c);
  for (const o of view.outlines) {
    outlinePath(ctx, o, x0, y0, c, rows);
    ctx.fillStyle = state.regionColors[o.pieceIndex] ?? '#fff';
    ctx.fill();
    ctx.strokeStyle = CSS.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.strokeStyle = CSS.ink;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x0, y0, cols * c, rows * c);
  for (const id of marked) {
    const index = Number(id.slice(1));
    const o = view.outlines.find((x) => x.pieceIndex === index);
    const p = regionPoint(view, index);
    if (!o || !p) continue;
    // The outline of a region partly covered by a nearer one is drawn whole, dashed, as its piece's shape.
    dashedMark(ctx, outlinePolygon(o, x0, y0, c, rows, 6), 5);
    questionBadge(ctx, x0 + p.x * c, y0 + (rows - p.y) * c, Math.max(12, c * 0.14));
  }
  if (marker !== null) {
    const o = view.outlines.find((x) => x.pieceIndex === marker);
    if (o) {
      ctx.save();
      outlinePath(ctx, o, x0, y0, c, rows, 4);
      ctx.strokeStyle = CSS.gold;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.restore();
    }
  }
  textUnder(ctx, underLabel(task.side), x0 + (cols * c) / 2, y0 + rows * c + 20);
}

/** The regions of `view` in the order the arrow keys walk them: left to right, then bottom to top. */
export function regionOrder(view: MixedView): number[] {
  const at = new Map(regionsOf(view).map((i) => [i, regionPoint(view, i)] as const));
  return [...at.keys()].filter((i) => at.get(i) !== null).sort((a, b) => at.get(a)!.x - at.get(b)!.x || at.get(a)!.y - at.get(b)!.y);
}

/** The texture of the building: wide and high enough for the eye on every side, the ground middle at ORIGIN. */
const BUILDING_BOX = { x: 110, y: 130, width: 900, height: 860 } as const;
/** The texture of the grid card: the right part of the world. */
const GRID_TEXTURE = { x: 960, y: 370, width: 560, height: 520 } as const;

function isPaintTask(task: RoundState['task']): task is PaintTask {
  return task.kind === 'malen' || task.kind === 'maleAn';
}

class GridView implements TaskView {
  private readonly building: CachedTexture;
  private readonly buildingImage: Phaser.GameObjects.Image;
  private readonly grid: CachedTexture;
  private readonly gridImage: Phaser.GameObjects.Image;
  private state: RoundState | null = null;
  /** True after an arrow key or Tab, until the next tap: the marker shows on the grid. */
  private keyboard = false;
  /** The outline the marker goes back to from the color row. */
  private lastRegion: number | null = null;
  private readonly onPointer: (p: Phaser.Input.Pointer) => void;

  constructor(private readonly ctx: TaskViewContext) {
    const { scene } = ctx;
    this.building = new CachedTexture(scene, 'paint-building', BUILDING_BOX.width, BUILDING_BOX.height, 2);
    this.buildingImage = scene.add.image(BUILDING_BOX.x, BUILDING_BOX.y, this.building.key).setScale(this.building.scale).setOrigin(0, 0).setDepth(DEPTH.targets - 1).setVisible(false);
    this.grid = new CachedTexture(scene, 'paint-grid', GRID_TEXTURE.width, GRID_TEXTURE.height, 2);
    this.gridImage = scene.add.image(GRID_TEXTURE.x, GRID_TEXTURE.y, this.grid.key).setScale(this.grid.scale).setOrigin(0, 0).setDepth(DEPTH.targets - 1).setVisible(false);
    this.onPointer = (p) => this.tap(p.worldX, p.worldY);
    scene.input.on('pointerdown', this.onPointer);
  }

  show(state: RoundState): void {
    const task = state.task;
    if (!isPaintTask(task) || state.taskState === null || typeof state.taskState !== 'object') return this.hide();
    if (this.state?.task.id !== task.id) {
      this.keyboard = false;
      this.lastRegion = null;
    }
    this.state = state;
    this.building.draw(`${task.id}`, (g) => {
      g.translate(-BUILDING_BOX.x, -BUILDING_BOX.y);
      drawPaintBuilding(g, task);
    });
    this.redrawGrid();
    this.buildingImage.setVisible(true);
    this.gridImage.setVisible(true);
  }

  event(e: RoundEvent, state: RoundState): void {
    if (e.type !== 'checked' || !e.right || !isPaintTask(state.task)) return;
    const task = state.task;
    const colors = task.kind === 'malen' ? [task.color] : task.palette;
    this.ctx.plane.trailSmoke(colors, CELEBRATE_SMOKE_MS);
    if (this.ctx.plane.flight.flying !== 'pass') {
      this.ctx.plane.startPass(null);
      this.ctx.sound('propeller');
    }
  }

  key(k: SceneKey, state: RoundState): boolean {
    const task = state.task;
    if (!isPaintTask(task)) return false;
    const input = this.ctx.input;
    if (task.kind === 'malen') {
      const look = state.taskState as MalenState;
      const { cols, rows } = gridSize(task);
      if (k.type === 'arrow') {
        const to = movedSquare(look.selected, k.dx, k.dy, Math.max(cols, rows));
        this.keyboard = true;
        input.select(Math.min(to.row, rows - 1), Math.min(to.col, cols - 1));
        this.redrawGrid();
        return true;
      }
      if (k.type === 'select') {
        this.keyboard = true;
        input.togglePaint(look.selected.row, look.selected.col);
        return true;
      }
      return false;
    }
    const look = state.taskState as MaleAnState;
    const order = regionOrder(task.view);
    const onColors = look.selected.row === 1;
    switch (k.type) {
      case 'tab': {
        this.keyboard = true;
        if (onColors) input.select(0, this.lastRegion ?? order[0]!);
        else input.select(1, look.color === null ? 0 : Math.max(0, task.palette.indexOf(look.color)));
        this.redrawGrid();
        return true;
      }
      case 'arrow': {
        this.keyboard = true;
        const step = k.dx + k.dy;
        if (onColors) {
          input.select(1, Math.max(0, Math.min(task.palette.length - 1, look.selected.col + Math.sign(k.dx))));
        } else {
          const at = Math.max(0, order.indexOf(look.selected.col));
          const next = order[Math.max(0, Math.min(order.length - 1, at + Math.sign(step)))]!;
          this.lastRegion = next;
          input.select(0, next);
        }
        this.redrawGrid();
        return true;
      }
      case 'select': {
        this.keyboard = true;
        if (onColors) {
          input.pickColor(task.palette[look.selected.col]!);
          input.select(0, this.lastRegion ?? order[0]!);
        } else input.fillRegion(look.selected.col);
        return true;
      }
      default:
        return false;
    }
  }

  hide(): void {
    this.state = null;
    this.buildingImage.setVisible(false);
    this.gridImage.setVisible(false);
  }

  destroy(): void {
    this.ctx.scene.input.off('pointerdown', this.onPointer);
    this.buildingImage.destroy();
    this.gridImage.destroy();
  }

  private redrawGrid(): void {
    const state = this.state;
    if (state === null || !isPaintTask(state.task)) return;
    const task = state.task;
    const marked = new Set(state.marked);
    const showMarker = this.keyboard && frameShown(state.phase);
    if (task.kind === 'malen') {
      const look = state.taskState as MalenState;
      const marker = showMarker ? look.selected : null;
      this.grid.draw(JSON.stringify([task.id, look.paint, state.marked, marker]), (g) => {
        g.translate(-GRID_TEXTURE.x, -GRID_TEXTURE.y);
        drawPaintGrid(g, task, look, marked, marker);
      });
      return;
    }
    const look = state.taskState as MaleAnState;
    const marker = showMarker && look.selected.row === 0 ? look.selected.col : null;
    if (look.selected.row === 0) this.lastRegion = look.selected.col;
    this.grid.draw(JSON.stringify([task.id, look.regionColors, state.marked, marker]), (g) => {
      g.translate(-GRID_TEXTURE.x, -GRID_TEXTURE.y);
      drawRegionGrid(g, task, look, marked, marker);
    });
  }

  /** A tap on a square colors or empties it ("Malen"); a tap on an outline fills it ("Male an"). */
  private tap(x: number, y: number): void {
    const state = this.state;
    if (state === null || !isPaintTask(state.task)) return;
    const task = state.task;
    const { cols, rows } = gridSize(task);
    if (task.kind === 'malen') {
      const square = gridSquareAt(cols, rows, x, y);
      if (!square) return;
      this.keyboard = false;
      this.ctx.input.togglePaint(square.row, square.col);
      return;
    }
    const p = viewPointAt(cols, rows, x, y);
    const index = p ? hitTest(task.view, p.x, p.y) : null;
    if (index === null) return;
    this.keyboard = false;
    this.ctx.input.fillRegion(index);
  }
}

export const gridView: TaskViewFactory = { kinds: ['malen', 'maleAn'], create: (ctx) => new GridView(ctx) };
