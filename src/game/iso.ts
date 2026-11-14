/**
 * Isometric drawing helpers ported from the prototype (specs/001-math-plane/prototype/index.html: `drawBox`,
 * `drawBuilding`, `drawCrate`, `drawSolid`). They draw on a 2D canvas context, so a view draws a building or a card
 * once into a cached texture (cachedTexture.ts) and redraws it only when it changes (research R19).
 *
 * Coordinates are the core's (core/geometry/iso.ts `isoPoint`): `col` grows to the lower right, `row` to the lower
 * left (toward "vorn"), `z` up. A plan is `plan[row][col]`, the number of cubes on that square. Mark ids are
 * `"row,col"`, as the rules use them.
 *
 * Every piece is drawn back to front (painter's order): squares with a smaller `row + col` are further back.
 */
import { isoPoint } from '../core/geometry/iso';
import { CSS, shade } from './palette';

export type Point = readonly [number, number];
/** Projects a point of the building's grid to the canvas. */
export type Projector = (col: number, row: number, z: number) => Point;

/** The projector with the grid's corner (0, 0, 0) at (ox, oy), a cube `s` wide. */
export function isoProjector(ox: number, oy: number, s: number): Projector {
  return (col, row, z) => {
    const p = isoPoint(col, row, z, s);
    return [ox + p.x, oy + p.y];
  };
}

/** The projector that puts the middle of the ground of a `rows` by `cols` plan at (cx, cy), as the prototype's `bOrigin`. */
export function buildingProjector(rows: number, cols: number, cx: number, cy: number, s: number): Projector {
  return isoProjector(cx - ((cols - rows) / 2) * s, cy - ((cols + rows) / 4) * s, s);
}

const EDGE = 'rgba(0,0,0,.35)';

/** A filled polygon with an optional outline. */
export function poly(ctx: CanvasRenderingContext2D, pts: readonly Point[], fill: string | CanvasGradient, stroke: string | null = EDGE, lw = 1.3): void {
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** A box from (x, y, z) that is dx by dy by dz: its top, right and front faces, lit from the upper left. */
export function drawBox(ctx: CanvasRenderingContext2D, P: Projector, x: number, y: number, z: number, dx: number, dy: number, dz: number, color: string, alpha = 1): void {
  ctx.globalAlpha = alpha;
  poly(ctx, [P(x, y, z + dz), P(x + dx, y, z + dz), P(x + dx, y + dy, z + dz), P(x, y + dy, z + dz)], shade(color, 1.25));
  poly(ctx, [P(x + dx, y, z + dz), P(x + dx, y + dy, z + dz), P(x + dx, y + dy, z), P(x + dx, y, z)], shade(color, 0.72));
  poly(ctx, [P(x, y + dy, z + dz), P(x + dx, y + dy, z + dz), P(x + dx, y + dy, z), P(x, y + dy, z)], color);
  ctx.globalAlpha = 1;
}

/**
 * The ellipse a circle of diameter `d` on the ground grid becomes in the projection: half as high as it is wide. A
 * cube `s` wide on screen.
 */
export function isoEllipse(d: number, s: number): { rx: number; ry: number } {
  const rx = (d / 2) * s * Math.SQRT2;
  return { rx, ry: rx / 2 };
}

/** An upright cylinder of diameter `d` and height `h` standing on (col, row, z), filling a d by d footprint. */
export function drawCylinder(ctx: CanvasRenderingContext2D, P: Projector, s: number, col: number, row: number, z: number, d: number, h: number, color: string): void {
  const [cx, cy] = P(col + d / 2, row + d / 2, z);
  const top = cy - h * 1.1 * s;
  const { rx, ry } = isoEllipse(d, s);
  const g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  g.addColorStop(0, shade(color, 0.75));
  g.addColorStop(0.4, shade(color, 1.1));
  g.addColorStop(1, shade(color, 0.6));
  ctx.beginPath();
  ctx.moveTo(cx - rx, top);
  ctx.lineTo(cx - rx, cy);
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(cx + rx, top);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, top, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(color, 1.25);
  ctx.fill();
  ctx.stroke();
}

/** The drawn radius of a sphere of diameter `d`: a little wider than the footprint's circle is high, so it reads round. */
export function sphereRadius(d: number, s: number): number {
  return (d / 2) * s * 1.25;
}

/** A sphere of diameter `d` resting on (col, row, z), centered over its d by d footprint. */
export function drawSphere(ctx: CanvasRenderingContext2D, P: Projector, s: number, col: number, row: number, z: number, d: number, color: string): void {
  const [cx, cy] = P(col + d / 2, row + d / 2, z + d / 2);
  const r = sphereRadius(d, s);
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.12, cx, cy, r);
  g.addColorStop(0, shade(color, 1.5));
  g.addColorStop(1, shade(color, 0.7));
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.3)';
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

/** A square pyramid on a d by d footprint at (col, row, z), `h` high: its front and right faces. */
export function drawPyramid(ctx: CanvasRenderingContext2D, P: Projector, col: number, row: number, z: number, d: number, h: number, color: string): void {
  const apex = P(col + d / 2, row + d / 2, z + h);
  poly(ctx, [P(col, row + d, z), P(col + d, row + d, z), apex], color);
  poly(ctx, [P(col + d, row, z), P(col + d, row + d, z), apex], shade(color, 0.72));
}

/** A crate on its way down or landed (prototype `drawCrate`); with `tz` below `z` it still hangs from its parachute. */
export interface Crate {
  row: number;
  col: number;
  /** Its height now, in cubes. */
  z: number;
  /** The height it lands at. */
  tz: number;
}

export function drawCrate(ctx: CanvasRenderingContext2D, P: Projector, c: Crate): void {
  drawBox(ctx, P, c.col + 0.05, c.row + 0.05, c.z, 0.9, 0.9, 0.9, CSS.crate);
  const a = P(c.col + 0.05, c.row + 0.95, c.z + 0.45);
  const b = P(c.col + 0.95, c.row + 0.95, c.z + 0.45);
  ctx.strokeStyle = 'rgba(90,50,10,.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  if (c.z > c.tz + 0.25) {
    const top = P(c.col + 0.5, c.row + 0.5, c.z + 0.9);
    const chute = P(c.col + 0.5, c.row + 0.5, c.z + 2.4);
    const r = 34;
    ctx.strokeStyle = 'rgba(60,60,60,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(top[0] - 14, top[1]);
    ctx.lineTo(chute[0] - r, chute[1]);
    ctx.moveTo(top[0] + 14, top[1]);
    ctx.lineTo(chute[0] + r, chute[1]);
    ctx.stroke();
    ctx.fillStyle = CSS.parachute;
    ctx.beginPath();
    ctx.arc(chute[0], chute[1], r, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(chute[0], chute[1]);
    ctx.arc(chute[0], chute[1], r, Math.PI * 1.33, Math.PI * 1.66);
    ctx.fill();
  }
}

/** A thick dashed warm-orange outline around a polygon, for a place a wrong "Fertig" marked (FR-024a). */
export function dashedMark(ctx: CanvasRenderingContext2D, pts: readonly Point[], lw = 4): void {
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = CSS.mark;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** The "?" badge next to a marked place (FR-024a). */
export function questionBadge(ctx: CanvasRenderingContext2D, x: number, y: number, r = 13): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = CSS.mark;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = `600 ${Math.round(r * 1.5)}px Fredoka, 'Trebuchet MS', sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x, y + 1);
}

export interface BuildingOptions {
  /** Draw the ground squares as tiles, as the build field does; otherwise a soft shadow. */
  tiles?: boolean;
  /** The selected square: a yellow tile, and a thick yellow frame on the top of its stack (on the tile when empty). */
  selected?: { row: number; col: number } | null;
  /** Squares a wrong "Fertig" marked, as `"row,col"`: an orange tile, a dashed outline around the tower and a "?" badge. */
  marked?: ReadonlySet<string>;
  /** Crates falling onto or standing on the stacks. */
  crates?: readonly Crate[];
  /** One color per cube in turn instead of one for all. */
  colors?: readonly string[];
}

/**
 * A cube building over `plan` with its ground middle at (cx, cy) and cubes `s` wide (prototype `drawBuilding`).
 * Returns the projector, so a caller can place marks, labels or tap areas on the same grid.
 */
export function drawBuilding(ctx: CanvasRenderingContext2D, plan: readonly (readonly number[])[], cx: number, cy: number, s: number, color: string, opt: BuildingOptions = {}): Projector {
  const rows = plan.length;
  const cols = plan[0]?.length ?? 0;
  const P = buildingProjector(rows, cols, cx, cy, s);
  const marked = opt.marked ?? new Set<string>();
  if (opt.tiles) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const sel = opt.selected?.row === row && opt.selected.col === col;
        const fill = sel ? CSS.selected : marked.has(`${row},${col}`) ? 'rgba(255,170,80,.6)' : 'rgba(255,255,255,.28)';
        poly(ctx, [P(col, row, 0), P(col + 1, row, 0), P(col + 1, row + 1, 0), P(col, row + 1, 0)], fill, 'rgba(255,255,255,.7)', 1.5);
      }
    }
  } else {
    const [mx, my] = P(cols / 2, rows / 2, 0);
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.beginPath();
    ctx.ellipse(mx, my + 2, (cols + rows) * s * 0.55, (cols + rows) * s * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let d = 0; d <= cols + rows - 2; d++) {
    for (let row = 0; row < rows; row++) {
      const col = d - row;
      if (col < 0 || col >= cols) continue;
      const h = plan[row]![col]!;
      for (let z = 0; z < h; z++) drawBox(ctx, P, col, row, z, 1, 1, 1, opt.colors ? opt.colors[(col + row + z) % opt.colors.length]! : color);
      for (const c of opt.crates ?? []) if (c.col === col && c.row === row) drawCrate(ctx, P, c);
    }
  }
  const sel = opt.selected;
  if (opt.tiles && sel && sel.row >= 0 && sel.row < rows && sel.col >= 0 && sel.col < cols) {
    // The thick yellow frame on the top of the selected stack, or on its tile when it has no cube.
    const h = plan[sel.row]![sel.col]!;
    const frame = (z: number) => [P(sel.col, sel.row, z), P(sel.col + 1, sel.row, z), P(sel.col + 1, sel.row + 1, z), P(sel.col, sel.row + 1, z)];
    selectedFrame(ctx, frame(h));
  }
  for (const id of marked) {
    const [row, col] = id.split(',').map(Number) as [number, number];
    if (!(row >= 0 && row < rows && col >= 0 && col < cols)) continue;
    const h = plan[row]![col]!;
    dashedMark(ctx, towerOutline(P, row, col, h));
    const [bx, by] = P(col + 0.5, row + 0.5, h);
    questionBadge(ctx, bx, by - s * 0.6);
  }
  return P;
}

/** The thick yellow frame of a selected square (FR-024a). */
export function selectedFrame(ctx: CanvasRenderingContext2D, pts: readonly Point[], lw = 5): void {
  ctx.save();
  ctx.strokeStyle = CSS.gold;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/**
 * The outline of the tower on (`row`, `col`), `h` cubes high, as drawn with `P`: the hexagon around its top, right and
 * front faces, or the ground square when it has no cube.
 */
export function towerOutline(P: Projector, row: number, col: number, h: number): Point[] {
  if (h <= 0) return [P(col, row, 0), P(col + 1, row, 0), P(col + 1, row + 1, 0), P(col, row + 1, 0)];
  return [P(col, row, h), P(col + 1, row, h), P(col + 1, row, 0), P(col + 1, row + 1, 0), P(col, row + 1, 0), P(col, row + 1, h)];
}

/**
 * Remembers what a cached texture shows: `changed(signature)` is true the first time and whenever the signature differs
 * from the last one, so a view redraws a building or a card only when it changes (research R19).
 */
export function redrawGate(): (signature: string) => boolean {
  let last: string | null = null;
  return (signature) => {
    if (signature === last) return false;
    last = signature;
    return true;
  };
}
