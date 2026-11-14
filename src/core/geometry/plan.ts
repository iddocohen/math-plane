/**
 * Building plans of cube buildings (data-model.md "Plan", research R3 to R5). A plan is `heights[row][col]`: row 0 is
 * the back, the last row is "vorn", and each number is the height of the stack on that square, 0 to 4.
 */
import type { Rng } from '../rng';
import { isoPoint } from './iso';

export type Plan = number[][];

/** The highest stack a plan may hold. */
export const PLAN_HEIGHT_MAX = 4;

/** What a generated plan may hold: its size (2×2 or 3×3) and the lowest and highest stack. */
export interface PlanLimits {
  size: 2 | 3;
  minStack: number;
  maxStack: number;
}

/** Generation tries this many random plans before it takes one from the built-in list (research R4). */
export const GENERATE_TRIES = 200;

const copy = (p: Plan): Plan => p.map((row) => [...row]);

/** The plan seen in a mirror standing at its side: left and right swap. */
export function mirrorLR(p: Plan): Plan {
  return p.map((row) => [...row].reverse());
}

/** The plan seen in a mirror standing at its front: front and back swap. */
export function mirrorFB(p: Plan): Plan {
  return copy(p).reverse();
}

/** The plan turned by 90° clockwise, seen from above: the back row becomes the right column. */
export function rotate90(p: Plan): Plan {
  const rows = p.length;
  const cols = p[0]?.length ?? 0;
  return Array.from({ length: cols }, (_, r) => Array.from({ length: rows }, (_, c) => p[rows - 1 - c]![r]!));
}

/** True when both plans have the same size and the same height on every square. */
export function plansEqual(a: Plan, b: Plan): boolean {
  return a.length === b.length && a.every((row, r) => row.length === b[r]!.length && row.every((h, c) => h === b[r]![c]));
}

/**
 * The plan with the stack on (`row`, `col`) changed by `by`, or null when the new height leaves 0 to
 * `PLAN_HEIGHT_MAX`. Variants of research R5 apply the level's tighter limits on top.
 */
export function changeOne(p: Plan, row: number, col: number, by: number): Plan | null {
  const h = p[row]?.[col];
  if (h === undefined) throw new RangeError(`changeOne: no square at ${row}, ${col}`);
  const next = h + by;
  if (next < 0 || next > PLAN_HEIGHT_MAX) return null;
  const out = copy(p);
  out[row]![col] = next;
  return out;
}

/** Points sampled on a top face: the center and 4 inner corners at 25% from the edges (research R4). */
const TOP_SAMPLES: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.5],
  [0.25, 0.25],
  [0.75, 0.25],
  [0.25, 0.75],
  [0.75, 0.75],
];
/** At least this many of the samples must stay in view. */
const VISIBLE_MIN = 3;
/** Points on the outline of a nearer box count as covered, so the seam between two nearer stacks hides what is behind. */
const EPS = 1e-9;

type Point = { x: number; y: number };

/** The outline of a box's projection, a convex hexagon, counter-clockwise on screen (y down). */
function boxOutline(col: number, row: number, h: number): Point[] {
  const p = (c: number, r: number, z: number) => isoPoint(c, r, z, 1);
  // Going around: back corner top, right corner top and bottom, front corner bottom, left corner bottom and top.
  return [p(col, row, h), p(col + 1, row, h), p(col + 1, row, 0), p(col + 1, row + 1, 0), p(col, row + 1, 0), p(col, row + 1, h)];
}

/** True when `pt` lies inside or on the outline of the convex polygon `poly`. */
function covers(poly: Point[], pt: Point): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const cross = (b.x - a.x) * (pt.y - a.y) - (b.y - a.y) * (pt.x - a.x);
    if (Math.abs(cross) <= EPS) continue;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/**
 * True when every stack of the isometric drawing shows enough of its top (research R4). The prototype rule
 * `h[r][c] >= h[r+1][c+1]` filters first; then each stack's top face must keep at least 3 of 5 sampled points out of
 * the drawn box of every stack nearer to the viewer (larger row + col). `[[1,3],[3,1]]` passes the first rule and fails
 * the second (critique E1).
 */
export function isReadable(p: Plan): boolean {
  const rows = p.length;
  const cols = p[0]?.length ?? 0;
  for (let r = 0; r + 1 < rows; r++) {
    for (let c = 0; c + 1 < cols; c++) if (p[r]![c]! < p[r + 1]![c + 1]!) return false;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) if (p[r]![c]! > 0 && !topVisible(p, r, c)) return false;
  }
  return true;
}

/**
 * True when the top of the stack on (`row`, `col`) keeps at least 3 of 5 sampled points out of the drawn box of every
 * stack nearer to the viewer (the test of `isReadable`). For an empty square the top is the ground square.
 */
export function topVisible(p: Plan, row: number, col: number): boolean {
  const h = p[row]![col]!;
  const blockers: Point[][] = [];
  p.forEach((line, r) =>
    line.forEach((hb, c) => {
      if (hb > 0 && r + c > row + col) blockers.push(boxOutline(c, r, hb));
    }),
  );
  const visible = TOP_SAMPLES.filter(([dc, dr]) => {
    const pt = isoPoint(col + dc, row + dr, h, 1);
    return !blockers.some((b) => covers(b, pt));
  }).length;
  return visible >= VISIBLE_MIN;
}

/** Squares with a stack that a plan of `size` must have at least (research R4). */
export function minFilled(size: 2 | 3): number {
  return size === 2 ? 4 : 5;
}

/** True when `p` meets every rule of research R4 for `limits`: size, heights, filled squares, highest stack, readable. */
export function meetsRules(p: Plan, limits: PlanLimits): boolean {
  if (p.length !== limits.size || p.some((row) => row.length !== limits.size)) return false;
  const all = p.flat();
  if (all.some((h) => !Number.isInteger(h) || h < limits.minStack || h > limits.maxStack)) return false;
  if (all.filter((h) => h > 0).length < minFilled(limits.size)) return false;
  if (Math.max(...all) < 2) return false;
  return isReadable(p);
}

/**
 * Readable plans used when 200 random tries find none (research R4). Each size has plans with highest stack 2, 3 and
 * 4, and plans without empty squares, so every limit the levels and settings allow (stacks from 0 or 1 up to 2, 3 or
 * 4) finds at least one. plan.test.ts checks that each plan meets the rules.
 */
export const FALLBACK_PLANS: Readonly<Record<2 | 3, readonly Plan[]>> = {
  2: [
    [[2, 1], [1, 1]],
    [[2, 2], [1, 1]],
    [[3, 2], [2, 1]],
    [[3, 2], [1, 1]],
    [[4, 3], [2, 1]],
    [[4, 2], [3, 1]],
  ],
  3: [
    [[2, 1, 1], [1, 1, 0], [1, 0, 0]],
    [[2, 2, 1], [1, 1, 1], [1, 1, 1]],
    [[3, 2, 1], [2, 1, 0], [1, 0, 0]],
    [[3, 2, 1], [2, 1, 1], [1, 1, 1]],
    [[4, 3, 2], [3, 2, 1], [2, 1, 0]],
    [[4, 2, 1], [3, 1, 1], [1, 1, 1]],
  ],
};

/**
 * A readable cube building within `limits` (research R4): up to `GENERATE_TRIES` random plans, each square drawn from
 * `minStack` to `maxStack`; the first that meets every rule wins. When none does, a plan from `FALLBACK_PLANS` that
 * fits the limits is picked.
 */
export function generateCubePlan(rng: Rng, limits: PlanLimits): Plan {
  const { size, minStack, maxStack } = limits;
  for (let i = 0; i < GENERATE_TRIES; i++) {
    const p = Array.from({ length: size }, () => Array.from({ length: size }, () => rng.int(minStack, maxStack)));
    if (meetsRules(p, limits)) return p;
  }
  const fits = FALLBACK_PLANS[size].filter((p) => meetsRules(p, limits));
  console.warn(`generateCubePlan: using a built-in plan for ${JSON.stringify(limits)}`);
  if (fits.length === 0) throw new RangeError(`generateCubePlan: no plan fits ${JSON.stringify(limits)}`);
  return copy(rng.pick(fits));
}

/** How a variant of research R5 came from the plan: mirrored or turned, or with one stack changed. */
export type VariantKind = 'structural' | 'stack';

export interface PlanVariant {
  plan: Plan;
  kind: VariantKind;
}

/** True when every square holds the same stack. Such a plan is never used for "Bauplan finden" (critique P2). */
export function isUniform(p: Plan): boolean {
  const all = p.flat();
  return all.every((h) => h === all[0]);
}

/**
 * Every distinct variant of `p` within `limits` (research R5), structural ones first:
 *
 * - mirrored left-right and front-back, and, for a square plan, turned by 90°, 180° and 270°;
 * - one stack changed by +1 or -1, from `minStack` to `maxStack`; on a 2×2 plan never to 0.
 *
 * A variant is kept only when it differs from `p` and from every variant kept before it. Variants need not be readable
 * (research R4): a turned building often hides a low stack behind a tall one, and it still looks different from the
 * right building, which is readable.
 *
 * A stack change is kept only when the changed stack's top shows in both drawings (`topVisible`). Otherwise the
 * drawing can look the same as the right building: on a 3×3 plan a cube added on a square hidden behind nearer stacks
 * changes nothing that the child can see.
 */
export function planCandidates(p: Plan, limits: PlanLimits): PlanVariant[] {
  const lowest = limits.size === 2 ? Math.max(1, limits.minStack) : limits.minStack;
  const out: PlanVariant[] = [];
  const add = (plan: Plan | null, kind: VariantKind) => {
    if (plan === null || plansEqual(plan, p) || out.some((v) => plansEqual(v.plan, plan))) return;
    if (plan.flat().some((h) => h < lowest || h > limits.maxStack)) return;
    out.push({ plan, kind });
  };
  add(mirrorLR(p), 'structural');
  add(mirrorFB(p), 'structural');
  if (p.length === (p[0]?.length ?? 0)) {
    let turned = p;
    for (let i = 0; i < 3; i++) {
      turned = rotate90(turned);
      add(turned, 'structural');
    }
  }
  const visibleChange = (plan: Plan | null, r: number, c: number): Plan | null => (plan !== null && topVisible(p, r, c) && topVisible(plan, r, c) ? plan : null);
  p.forEach((row, r) =>
    row.forEach((_, c) => {
      add(visibleChange(changeOne(p, r, c, 1), r, c), 'stack');
      add(visibleChange(changeOne(p, r, c, -1), r, c), 'stack');
    }),
  );
  return out;
}

/**
 * `count` wrong buildings for the plan `p` (research R5): picked by `rng` from `planCandidates`, one structural variant
 * (mirror or turn) and one stack change first when both exist, then any. Never equal to `p` or to each other. Fewer
 * than `count` only when `p` has fewer variants; "Bauplan finden" rejects such plans (`hasVariants`).
 */
export function planVariants(p: Plan, rng: Rng, limits: PlanLimits, count: number): Plan[] {
  const all = rng.shuffled(planCandidates(p, limits));
  const picked: PlanVariant[] = [];
  for (const kind of ['structural', 'stack'] as const) {
    const first = all.find((v) => v.kind === kind && !picked.includes(v));
    if (first && picked.length < count) picked.push(first);
  }
  for (const v of all) if (picked.length < count && !picked.includes(v)) picked.push(v);
  return rng.shuffled(picked).map((v) => copy(v.plan));
}

/** True when `p` can be used for "Bauplan finden": not uniform, with at least `count` variants (critique P2). */
export function hasVariants(p: Plan, limits: PlanLimits, count = 2): boolean {
  return !isUniform(p) && planCandidates(p, limits).length >= count;
}
