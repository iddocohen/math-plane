/**
 * Buildings with mixed pieces: boxes, standing cylinders and spheres on the grid (data-model.md "Piece and
 * MixedBuilding", research R6 and R7, FR-025, FR-026).
 *
 * Coordinates are those of cube plans (research R3): `col` grows to the right, `row` grows toward "vorn", `z` grows up.
 * Each piece fills the box from (`col`, `row`, `z`) that is `w` by `d` by `h` units. A cylinder stands upright on a
 * `size` by `size` footprint; a sphere has diameter `size`, so `w`, `d` and `h` all equal it.
 *
 * The view from a side maps each piece to its outline in grid units (y up): a box is a rectangle, a cylinder a
 * rectangle from the sides and a circle from above, a sphere a circle from every side. Outlines are sorted back to
 * front, so drawing them in order lets a nearer outline cover a farther one; `hitTest` goes front to back.
 *
 * Side mapping (as cube views, research R3):
 * - vorn: x = col, the viewer stands at the front.
 * - rechts: the viewer stands at the right and looks left, so their left is the front: x = rows - row - d.
 * - links: the viewer stands at the left and looks right, so their left is the back: x = row.
 * - oben: the footprint, "vorn" at the bottom: x = col, y = rows - row - d.
 */
import type { Rng } from '../rng';
import { PIECE_COLORS } from '../tasks/colors';
import { SIDES, type Side } from '../types';

export type PieceKind = 'box' | 'cylinder' | 'sphere';

export interface Piece {
  kind: PieceKind;
  col: number;
  row: number;
  z: number;
  /** Size along `col`, `row` and `z`, in grid units. */
  w: number;
  d: number;
  h: number;
  /** Footprint of a cylinder or diameter of a sphere: 1 or 2. Boxes have none. */
  size?: 1 | 2;
  /** A `#rrggbb` color; every piece of a building has its own (FR-025). */
  color: string;
}

export interface MixedBuilding {
  pieces: Piece[];
  cols: number;
  rows: number;
  /** The height of side views, so every side view of a level has the same size (as cube views). */
  height: number;
}

/** What a generated building may hold. */
export interface MixedLimits {
  /** The grid is `size` by `size`. */
  size: 2 | 3;
  /** The highest a piece may reach; the side views are this high. At least 2. */
  maxStack: number;
  /** The sides the building is viewed from; every piece must show in each (research R6). */
  sides: readonly Side[];
  /** False: boxes only (cylinders and spheres switched off, FR-032). */
  mixed: boolean;
}

export interface Outline {
  pieceIndex: number;
  shape: 'rect' | 'circle';
  /** Lower left corner and size in grid units of the view, y up. A circle fills its square. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Distance from the viewer to the piece's middle; larger is farther. */
  depth: number;
}

export interface MixedView {
  side: Side;
  /** Back to front. */
  outlines: Outline[];
  width: number;
  height: number;
  /** Equal pictures have equal signatures (research R7, `mixedSignature`). */
  signature: string;
}

/** Generation tries this many random buildings before it takes one from the built-in list (research R6, critique E4). */
export const MIXED_TRIES = 200;
/** Each piece must show at least this share of its outline in every side used (research R6). */
export const MIN_VISIBLE = 0.25;
/** Samples per grid unit for visible areas and signatures. */
const RES = 8;

type Shape = Omit<Piece, 'color'>;

const box = (col: number, row: number, z: number, w: number, d: number, h: number): Shape => ({ kind: 'box', col, row, z, w, d, h });
const cylinder = (col: number, row: number, z: number, size: 1 | 2, h: number): Shape => ({ kind: 'cylinder', col, row, z, w: size, d: size, h, size });
const sphere = (col: number, row: number, z: number, size: 1 | 2): Shape => ({ kind: 'sphere', col, row, z, w: size, d: size, h: size, size });

// ---------------------------------------------------------------- views

/** The outline of piece `p` (number `i`) seen from `side` in a building of `rows` by `cols`. */
function outlineOf(p: Shape, i: number, side: Side, rows: number, cols: number, top: number): Outline {
  const round = p.kind === 'sphere' || (p.kind === 'cylinder' && side === 'oben');
  const shape = round ? 'circle' : 'rect';
  switch (side) {
    case 'vorn':
      return { pieceIndex: i, shape, x: p.col, y: p.z, w: p.w, h: p.h, depth: rows - p.row - p.d / 2 };
    case 'rechts':
      return { pieceIndex: i, shape, x: rows - p.row - p.d, y: p.z, w: p.d, h: p.h, depth: cols - p.col - p.w / 2 };
    case 'links':
      return { pieceIndex: i, shape, x: p.row, y: p.z, w: p.d, h: p.h, depth: p.col + p.w / 2 };
    case 'oben':
      return { pieceIndex: i, shape, x: p.col, y: rows - p.row - p.d, w: p.w, h: p.d, depth: top - p.z - p.h / 2 };
  }
}

/** True when the point (x, y) lies inside the outline. */
export function inOutline(o: Outline, x: number, y: number): boolean {
  if (o.shape === 'rect') return x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h;
  const r = o.w / 2;
  const dx = x - (o.x + r);
  const dy = y - (o.y + r);
  return dx * dx + dy * dy <= r * r;
}

/** The outline on top at (x, y), front to back: its piece, or null on empty ground (research R6). */
export function hitTest(v: Pick<MixedView, 'outlines'>, x: number, y: number): number | null {
  for (let i = v.outlines.length - 1; i >= 0; i--) if (inOutline(v.outlines[i]!, x, y)) return v.outlines[i]!.pieceIndex;
  return null;
}

/**
 * The picture as text (research R7): the view sampled 8 times per grid unit, each sample labeled with the region on
 * top, regions numbered in the order they first appear, run-length coded. Two views get the same signature exactly
 * when they show the same regions with the same outlines, whatever pieces or sides they come from. A piece hidden
 * behind another adds nothing, and two pieces side by side differ from one long piece by the line between them.
 */
export function mixedSignature(v: Pick<MixedView, 'outlines' | 'width' | 'height'>): string {
  const labels = new Map<number, number>();
  const runs: string[] = [];
  let last = '';
  let count = 0;
  for (let sy = 0; sy < v.height * RES; sy++) {
    for (let sx = 0; sx < v.width * RES; sx++) {
      const hit = hitTest(v, (sx + 0.5) / RES, (sy + 0.5) / RES);
      let label = '.';
      if (hit !== null) {
        if (!labels.has(hit)) labels.set(hit, labels.size);
        label = String(labels.get(hit));
      }
      if (label === last) count += 1;
      else {
        if (count > 0) runs.push(`${last}${count}`);
        last = label;
        count = 1;
      }
    }
  }
  runs.push(`${last}${count}`);
  return `${v.width}x${v.height}:${runs.join(',')}`;
}

function viewOf(side: Side, outlines: Outline[], width: number, height: number): MixedView {
  const view = { side, outlines, width, height, signature: '' };
  view.signature = mixedSignature(view);
  return view;
}

/** The view of `b` from `side`: outlines back to front (research R6). */
export function mixedView(b: MixedBuilding, side: Side): MixedView {
  const top = b.height + 1;
  const outlines = b.pieces.map((p, i) => outlineOf(p, i, side, b.rows, b.cols, top)).sort((a, c) => c.depth - a.depth || a.pieceIndex - c.pieceIndex);
  const width = side === 'rechts' || side === 'links' ? b.rows : b.cols;
  const height = side === 'oben' ? b.rows : b.height;
  return viewOf(side, outlines, width, height);
}

/** The view seen in a mirror: left and right swap (a wrong card, research R7). */
export function mirrorMixedView(v: MixedView): MixedView {
  return viewOf(
    v.side,
    v.outlines.map((o) => ({ ...o, x: v.width - o.x - o.w })),
    v.width,
    v.height,
  );
}

/** The view without the outline of piece `pieceIndex` (a wrong card, research R7). */
export function withoutPiece(v: MixedView, pieceIndex: number): MixedView {
  return viewOf(
    v.side,
    v.outlines.filter((o) => o.pieceIndex !== pieceIndex),
    v.width,
    v.height,
  );
}

/** The share of each piece's outline that shows in `v`, by piece index. */
export function visibleShares(v: MixedView, pieces: number): number[] {
  const shares = Array.from({ length: pieces }, () => 0);
  v.outlines.forEach((o, at) => {
    const nearer = v.outlines.slice(at + 1);
    let inside = 0;
    let shown = 0;
    for (let sy = 0; sy < o.h * RES; sy++) {
      for (let sx = 0; sx < o.w * RES; sx++) {
        const x = o.x + (sx + 0.5) / RES;
        const y = o.y + (sy + 0.5) / RES;
        if (!inOutline(o, x, y)) continue;
        inside += 1;
        if (!nearer.some((n) => inOutline(n, x, y))) shown += 1;
      }
    }
    shares[o.pieceIndex] = inside === 0 ? 0 : shown / inside;
  });
  return shares;
}

// ---------------------------------------------------------------- rules

function overlaps(a: Shape, b: Shape): boolean {
  return a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.d && b.row < a.row + a.d && a.z < b.z + b.h && b.z < a.z + a.h;
}

/** The box that carries `p`: its top is at `p.z` and covers `p`'s footprint. */
function carrier(pieces: readonly Shape[], p: Shape): Shape | undefined {
  return pieces.find((b) => b.kind === 'box' && b !== p && b.z + b.h === p.z && b.col <= p.col && b.col + b.w >= p.col + p.w && b.row <= p.row && b.row + b.d >= p.row + p.d);
}

/** True when some piece rests on `p`. */
export function carriesOther(b: MixedBuilding, index: number): boolean {
  const p = b.pieces[index]!;
  return b.pieces.some((q) => q !== p && carrier([p], q) === p);
}

/**
 * Why `b` breaks a rule of research R6, or null when it keeps them all: pieces inside the grid and below
 * `height`, no two pieces sharing space, every piece above the ground resting on a box that covers its footprint, and
 * every piece showing at least a quarter of its outline from each of `sides`.
 */
export function mixedProblem(b: MixedBuilding, sides: readonly Side[]): string | null {
  const { pieces } = b;
  if (pieces.length < 2) return 'fewer than 2 pieces';
  for (const p of pieces) {
    if (p.col < 0 || p.row < 0 || p.z < 0 || p.col + p.w > b.cols || p.row + p.d > b.rows || p.z + p.h > b.height) return 'piece outside the grid';
    if (p.kind !== 'box' && !(p.w === p.d && (p.size === 1 || p.size === 2) && p.w === p.size)) return 'bad size';
    if (p.kind === 'sphere' && p.h !== p.size) return 'bad sphere';
    if (p.z > 0 && !carrier(pieces, p)) return 'piece floats';
  }
  for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) if (overlaps(pieces[i]!, pieces[j]!)) return 'pieces overlap';
  for (const side of sides) {
    const shares = visibleShares(mixedView(b, side), pieces.length);
    if (shares.some((s) => s < MIN_VISIBLE)) return `a piece hides from ${side}`;
  }
  return null;
}

// ---------------------------------------------------------------- generation

type Recipe = (rng: Rng, n: number, top: number) => Shape[];

const at = (rng: Rng, n: number, w: number) => rng.int(0, Math.max(0, n - w));

/**
 * Templates (research R6): a few pieces in a typical arrangement, placed with random sizes and positions. The rules
 * then decide; a template that does not fit the grid or the sides is simply tried again.
 */
const RECIPES: Readonly<Record<string, Recipe>> = {
  /** "Turm mit Kugel": a long box with a ball on one end. */
  turmMitKugel: (rng, n, top) => {
    const long = rng.next() < 0.5;
    const w = long ? 2 : 1;
    const d = long ? 1 : 2;
    const h = rng.int(1, Math.max(1, top - 1));
    const base = box(at(rng, n, w), at(rng, n, d), 0, w, d, h);
    const ball = sphere(base.col + rng.int(0, w - 1), base.row + rng.int(0, d - 1), h, 1);
    return [base, ball];
  },
  /** "Dose neben Kiste": a box and a can beside it. */
  doseNebenKiste: (rng, n, top) => {
    const w = rng.int(1, 2);
    const d = rng.int(1, 2);
    const crate = box(at(rng, n, w), at(rng, n, d), 0, w, d, rng.int(1, top));
    const can = cylinder(at(rng, n, 1), at(rng, n, 1), 0, 1, rng.int(1, top));
    return [crate, can];
  },
  /** "Zwei Kisten mit Zylinder": two boxes, a can on the wider one. */
  zweiKistenMitZylinder: (rng, n, top) => {
    const wide = box(at(rng, n, 2), at(rng, n, 1), 0, 2, 1, 1);
    const tall = box(at(rng, n, 1), at(rng, n, 1), 0, 1, 1, rng.int(1, top));
    const can = cylinder(wide.col + rng.int(0, 1), wide.row, 1, 1, rng.int(1, top - 1));
    return [wide, tall, can];
  },
  /** "Große Kugel": a ball of diameter 2 beside a tower. */
  grosseKugel: (rng, n, top) => [sphere(at(rng, n, 2), at(rng, n, 2), 0, 2), box(at(rng, n, 1), at(rng, n, 1), 0, 1, 1, rng.int(1, top))],
  /** "Große Dose": a can with a 2×2 footprint and a ball or a box beside it. */
  grosseDose: (rng, n, top) => {
    const can = cylinder(at(rng, n, 2), at(rng, n, 2), 0, 2, rng.int(1, top));
    const other = rng.next() < 0.5 ? sphere(at(rng, n, 1), at(rng, n, 1), 0, 1) : box(at(rng, n, 1), at(rng, n, 1), 0, 1, 1, rng.int(1, top));
    return [can, other];
  },
  /** "Kugel vor der Mauer": a wall at the back, a ball and a can in front of it. */
  kugelVorMauer: (rng, n, top) => {
    const wall = box(0, 0, 0, n, 1, rng.int(1, top));
    return [wall, sphere(at(rng, n, 1), rng.int(1, n - 1), 0, 1), cylinder(at(rng, n, 1), rng.int(1, n - 1), 0, 1, rng.int(1, top))];
  },
};

/** Boxes only, for buildings without cylinders and spheres (FR-032). */
const BOX_RECIPES: Readonly<Record<string, Recipe>> = {
  zweiKisten: (rng, n, top) => [box(at(rng, n, 2), at(rng, n, 1), 0, 2, 1, rng.int(1, top)), box(at(rng, n, 1), at(rng, n, 1), 0, 1, 1, rng.int(1, top))],
  kisteAufKiste: (rng, n, top) => {
    const base = box(at(rng, n, 2), at(rng, n, 2), 0, 2, 2, 1);
    return [base, box(base.col + rng.int(0, 1), base.row + rng.int(0, 1), 1, 1, 1, rng.int(1, top - 1)), box(at(rng, n, 1), at(rng, n, 1), 0, 1, 1, rng.int(1, top))];
  },
};

/**
 * Buildings used when 200 random tries find none (critique E4). Each keeps every rule for all four sides on its grid
 * with side views 2 high, so it fits every limit the settings allow; mixed.test.ts checks this.
 */
export const FALLBACK_MIXED: Readonly<Record<'mixed' | 'boxes', Readonly<Record<2 | 3, readonly (readonly Shape[])[]>>>> = {
  mixed: {
    3: [
      [box(0, 0, 0, 2, 1, 2), sphere(1, 1, 0, 1), cylinder(2, 2, 0, 1, 1)],
      [box(0, 0, 0, 2, 1, 1), sphere(0, 0, 1, 1), cylinder(2, 1, 0, 1, 2)],
      [cylinder(0, 0, 0, 2, 1), box(2, 2, 0, 1, 1, 2)],
    ],
    2: [
      [box(0, 0, 0, 2, 1, 1), sphere(1, 0, 1, 1), cylinder(0, 1, 0, 1, 1)],
      [box(0, 0, 0, 1, 1, 2), sphere(1, 1, 0, 1)],
    ],
  },
  boxes: {
    3: [[box(0, 0, 0, 2, 1, 2), box(1, 1, 0, 1, 1, 1), box(2, 2, 0, 1, 1, 1)]],
    2: [[box(0, 0, 0, 2, 1, 1), box(0, 0, 1, 1, 1, 1), box(1, 1, 0, 1, 1, 1)]],
  },
};

function mirrored(shapes: readonly Shape[], n: number): Shape[] {
  return shapes.map((p) => ({ ...p, col: n - p.col - p.w }));
}

function colored(rng: Rng, shapes: readonly Shape[]): Piece[] {
  const colors = rng.shuffled(PIECE_COLORS);
  return shapes.map((p, i) => ({ ...p, color: colors[i % colors.length]! }));
}

/**
 * A building of a few pieces within `limits` (research R6): up to `MIXED_TRIES` times a random template, placed and
 * maybe mirrored, until one keeps every rule; then a building from `FALLBACK_MIXED`. With `mixed` true the building
 * has at least one cylinder or sphere.
 */
export function generateMixed(rng: Rng, limits: MixedLimits): MixedBuilding {
  const n = limits.size;
  const top = Math.max(2, limits.maxStack);
  const recipes = Object.values(limits.mixed ? RECIPES : BOX_RECIPES);
  const sides = limits.sides.length > 0 ? limits.sides : SIDES;
  const make = (shapes: readonly Shape[]): MixedBuilding => ({ pieces: colored(rng, shapes), cols: n, rows: n, height: top });
  for (let i = 0; i < MIXED_TRIES; i++) {
    let shapes = rng.pick(recipes)(rng, n, top);
    if (rng.next() < 0.5) shapes = mirrored(shapes, n);
    const b = make(shapes);
    if (mixedProblem(b, sides) === null) return b;
  }
  const list = FALLBACK_MIXED[limits.mixed ? 'mixed' : 'boxes'][n];
  return make(rng.pick(list));
}
