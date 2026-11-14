/**
 * Buildings on the field (FR-005, FR-018, FR-019, FR-025): cube buildings and buildings with mixed pieces, each with a
 * "vorn" mark at its front, drawn in the fixed isometric view of the prototype.
 *
 * - `drawAnyBuilding` draws a cube plan or a mixed building with its ground middle at (cx, cy) and returns the
 *   projector, so callers can place marks on the same grid.
 * - `drawEye` and `eyeSpot` show where the child stands (or flies, for "oben") to look at the building, as the
 *   prototype's `drawEye`. "Malen" and "Male an" (US4) can use them beside their own building.
 * - `buildingTargetsView`: the 3 buildings of "Bauplan finden" as bomb targets in the field slots (TargetsView).
 * - `buildingView`: the building of "Ansicht finden" on the left of the field, with the eye at the side asked.
 */
import type Phaser from 'phaser';
import type { MixedBuilding, Piece } from '../core/geometry/mixed';
import type { Plan } from '../core/geometry/plan';
import type { RoundState } from '../core/round/RoundController';
import { isMixedBuilding, type AnsichtFindenTask, type BauplanFindenTask } from '../core/tasks/types';
import type { Side } from '../core/types';
import { t } from '../i18n';
import { CachedTexture } from './cachedTexture';
import { buildingProjector, drawBox, drawBuilding, drawCylinder, drawSphere, poly, type Projector } from './iso';
import { CSS } from './palette';
import { AIM_RISE } from './slots';
import { targetsViewFactory, type TargetArt } from './TargetsView';
import type { TaskView, TaskViewContext, TaskViewFactory } from './taskViews';
import { DEPTH } from './world';

const FONT = "Fredoka, 'Trebuchet MS', sans-serif";

/** A line of text with a dark rim, so it reads on grass and on the sky. */
export function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color = '#fff'): void {
  ctx.font = `600 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.28;
  ctx.strokeStyle = 'rgba(36,50,74,.55)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** The "vorn" mark below the front face of a building drawn with `P` (FR-005), as the prototype places it. */
export function drawVornMark(ctx: CanvasRenderingContext2D, P: Projector, rows: number, cols: number, s: number): void {
  const [x, y] = P(cols / 2, rows, 0);
  label(ctx, t().round.front, x - s * 0.9, y + s * 0.55, Math.max(15, Math.round(s * 0.4)));
}

/** True when `a` must be drawn before `b`: it lies wholly behind, to the left of, or below `b`. */
function behind(a: Piece, b: Piece): boolean {
  return a.col + a.w <= b.col || a.row + a.d <= b.row || a.z + a.h <= b.z;
}

/** The pieces in painter's order, back to front: each piece after every piece behind it. */
export function paintOrder(pieces: readonly Piece[]): number[] {
  const left = pieces.map((_, i) => i);
  const out: number[] = [];
  while (left.length > 0) {
    // The piece with the fewest pieces still to draw behind it; zero for any arrangement without overlaps.
    let best = 0;
    let fewest = Infinity;
    left.forEach((i, at) => {
      const n = left.filter((j) => j !== i && behind(pieces[j]!, pieces[i]!) && !behind(pieces[i]!, pieces[j]!)).length;
      if (n < fewest) {
        fewest = n;
        best = at;
      }
    });
    out.push(left.splice(best, 1)[0]!);
  }
  return out;
}

/** A building with mixed pieces, its ground middle at (cx, cy), a grid square `s` wide; returns the projector. */
export function drawMixedBuilding(ctx: CanvasRenderingContext2D, b: MixedBuilding, cx: number, cy: number, s: number): Projector {
  const P = buildingProjector(b.rows, b.cols, cx, cy, s);
  const [mx, my] = P(b.cols / 2, b.rows / 2, 0);
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.beginPath();
  ctx.ellipse(mx, my + 2, (b.cols + b.rows) * s * 0.55, (b.cols + b.rows) * s * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  // The ground squares, faint, so the grid of the views can be read on the field too.
  for (let row = 0; row < b.rows; row++) {
    for (let col = 0; col < b.cols; col++) poly(ctx, [P(col, row, 0), P(col + 1, row, 0), P(col + 1, row + 1, 0), P(col, row + 1, 0)], 'rgba(255,255,255,.14)', 'rgba(255,255,255,.4)', 1);
  }
  for (const i of paintOrder(b.pieces)) {
    const p = b.pieces[i]!;
    if (p.kind === 'box') drawBox(ctx, P, p.col, p.row, p.z, p.w, p.d, p.h, p.color);
    else if (p.kind === 'cylinder') drawCylinder(ctx, P, s, p.col, p.row, p.z, p.w, p.h, p.color);
    else drawSphere(ctx, P, s, p.col, p.row, p.z, p.w, p.color);
  }
  return P;
}

/** A cube building (its plan) or a building with mixed pieces, with the "vorn" mark; returns the projector. */
export function drawAnyBuilding(ctx: CanvasRenderingContext2D, building: Plan | MixedBuilding, cx: number, cy: number, s: number, color: string): Projector {
  const rows = isMixedBuilding(building) ? building.rows : building.length;
  const cols = isMixedBuilding(building) ? building.cols : (building[0]?.length ?? 0);
  const P = isMixedBuilding(building) ? drawMixedBuilding(ctx, building, cx, cy, s) : drawBuilding(ctx, building, cx, cy, s, color);
  drawVornMark(ctx, P, rows, cols, s);
  return P;
}

/**
 * Where the eye stands for `side` and the point of the building it looks at, in the grid of a building of `rows` by
 * `cols` drawn with `P` (prototype `drawMalen` spots): in front, at the right, at the back left, or high above.
 */
export function eyeSpot(side: Side, P: Projector, rows: number, cols: number): { eye: readonly [number, number]; target: readonly [number, number] } {
  const target = P(cols / 2, rows / 2, 1.2);
  const spots: Record<Side, readonly [number, number]> = {
    vorn: P(cols / 2, rows + 2.2, 0.3),
    rechts: P(cols + 2.2, rows / 2, 0.3),
    links: P(-2.4, rows / 2 - 1.4, 0.2),
    oben: P(cols / 2 - 1.2, rows / 2 - 1.2, 5.2),
  };
  return { eye: spots[side], target };
}

/** The eye with a dashed arrow to the building and its label (prototype `drawEye`): "Hier stehst du" or "Hier fliegst du". */
export function drawEye(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number, text: string): void {
  const a = Math.atan2(ty - y, tx - x);
  const ex = tx - Math.cos(a) * 26;
  const ey = ty - Math.sin(a) * 26;
  ctx.save();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 7]);
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.restore();
  poly(
    ctx,
    [
      [ex + Math.cos(a) * 14, ey + Math.sin(a) * 14],
      [ex + Math.cos(a + 2.4) * 12, ey + Math.sin(a + 2.4) * 12],
      [ex + Math.cos(a - 2.4) * 12, ey + Math.sin(a - 2.4) * 12],
    ],
    '#fff',
    null,
  );
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y, 18, 11, 0, 0, Math.PI * 2);
  ctx.strokeStyle = CSS.ink;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#2f7fd1';
  ctx.beginPath();
  ctx.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 3, 6, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, text, x, y + 42, 18);
}

/** The eye's label for `side`: "Hier fliegst du" above the building, "Hier stehst du" beside it. */
export function eyeLabel(side: Side): string {
  return side === 'oben' ? t().round.flyHere : t().round.standHere;
}

// ---------------------------------------------------------------- "Bauplan finden" targets

/** The cube width of the buildings of "Bauplan finden": the prototype's 30 at 1.5 times its size. */
export const TARGET_CUBE = 46;

export const BUILDINGS_ART: TargetArt<BauplanFindenTask> = {
  box: { width: 280, height: 290, originX: 140, originY: 220 },
  tapRadius: 110,
  rise: AIM_RISE.bauplanFinden!,
  marker: { rx: 120, ry: 46, below: 10 },
  count: (task) => task.choices.length,
  signature: (task, i) => `${JSON.stringify(task.choices[i])}:${task.colors[i]}`,
  draw: (ctx, task, i) => {
    const plan = task.choices[i]!;
    // A 3×3 plan gets smaller cubes, so it fits its slot.
    const s = (TARGET_CUBE * 2) / Math.max(2, plan.length);
    drawAnyBuilding(ctx, plan, 0, 0, s, task.colors[i]!);
  },
};

export const buildingTargetsView = targetsViewFactory(['bauplanFinden'], 'building', BUILDINGS_ART);

// ---------------------------------------------------------------- "Ansicht finden" building

/** Where the building of "Ansicht finden" stands: its ground middle, left of the 3 card slots (slots.ts). */
export const ASKED_BUILDING = { x: 250, y: 690, cube: 44 } as const;
/** Its texture box, with the building's ground middle at (originX, originY); room for the eye on every side. */
const ASKED_BOX = { width: 500, height: 520, originX: 250, originY: 370 } as const;

/** Draws the building of `task` and the eye at the side asked, the building's ground middle at (0, 0). */
export function drawAskedBuilding(ctx: CanvasRenderingContext2D, task: AnsichtFindenTask): void {
  const s = ASKED_BUILDING.cube;
  const rows = isMixedBuilding(task.building) ? task.building.rows : task.building.length;
  const cols = isMixedBuilding(task.building) ? task.building.cols : (task.building[0]?.length ?? 0);
  const P = drawAnyBuilding(ctx, task.building, 0, 0, s, task.color);
  const { eye, target } = eyeSpot(task.side, P, rows, cols);
  drawEye(ctx, eye[0], eye[1], target[0], target[1], eyeLabel(task.side));
}

class AskedBuildingView implements TaskView {
  private readonly texture: CachedTexture;
  private readonly image: Phaser.GameObjects.Image;

  constructor(ctx: TaskViewContext) {
    this.texture = new CachedTexture(ctx.scene, 'asked-building', ASKED_BOX.width, ASKED_BOX.height, 2);
    this.image = ctx.scene.add
      .image(ASKED_BUILDING.x, ASKED_BUILDING.y, this.texture.key)
      .setScale(this.texture.scale)
      .setOrigin(ASKED_BOX.originX / ASKED_BOX.width, ASKED_BOX.originY / ASKED_BOX.height)
      .setDepth(DEPTH.targets - 1)
      .setVisible(false);
  }

  show(state: RoundState): void {
    const task = state.task as AnsichtFindenTask;
    this.texture.draw(`${task.id}:${task.side}`, (g) => {
      g.translate(ASKED_BOX.originX, ASKED_BOX.originY);
      drawAskedBuilding(g, task);
    });
    this.image.setVisible(true);
  }

  hide(): void {
    this.image.setVisible(false);
  }

  destroy(): void {
    this.image.destroy();
  }
}

export const buildingView: TaskViewFactory = { kinds: ['ansichtFinden'], create: (ctx) => new AskedBuildingView(ctx) };
