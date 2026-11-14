/**
 * The rules of "Bauen und Malen" (FR-020 to FR-023, research R18). The RoundController keeps the phases, the round of
 * `round.tasks` tasks, the misses, help, stars and storage; the kinds alternate through `pickContent` (FR-020). These
 * rules make each task, apply the child's inputs, and check "Fertig".
 *
 * Each task kind has its own `KindRules` in `KIND_RULES`; the rules object hands every call to the rules of the task's
 * kind. Level 5 offers "Male an" and "Malen"; `pickContent` alternates them (FR-020).
 *
 * "Bauen" (FR-021, FR-024b, contracts/screens.md "Keys during a round"):
 * - State: `planInput` (what the child wrote, null for an empty square), `built` (the stacks on the field, the written
 *   heights) and `selected` (the square with the yellow frame).
 * - `select` moves the frame to a square: a tap on the plan or on the field, or the arrow keys.
 * - `typeHeight` writes 0 to 4 into a square; any other number is ignored. The stack on the field follows
 *   (`cratesChanged`, so the field drops or removes crates), the square's mark goes, and the frame moves to the next
 *   square in reading order (it stays on the last square).
 * - `clearHeight` empties a square: its stack goes and its mark goes.
 * - "Fertig" is right when every square holds the building's height; otherwise it marks the wrong squares, empty ones
 *   included (core/tasks/bauen.ts `checkPlan`).
 *
 * "Malen" (FR-009, FR-022):
 * - State: `paint` (the colored squares of the grid, row 0 at the top) and `selected` (the square of the keyboard
 *   marker).
 * - `select` moves the marker; `togglePaint` colors or empties a square, moves the marker there and takes its mark
 *   away. Nothing is checked before "Fertig".
 * - "Fertig" marks every square that differs from the view, extra and missing ones (core/tasks/malen.ts `checkPaint`).
 *
 * "Male an" (FR-009, FR-023, research R8):
 * - State: `regionColors` (the color filled into each piece's region, null while empty), `color` (the color picked,
 *   null at the start) and `selected`, the keyboard marker: `{ row: 0, col: <piece index> }` on an outline or
 *   `{ row: 1, col: <palette index> }` on the color row.
 * - `pickColor` picks a color of the palette; `fillRegion` fills a region with the picked color (ignored before a
 *   color is picked) and takes its mark away. A region can be filled again with another color.
 * - "Fertig" marks every region whose color is not its piece's color, empty ones included (`checkRegions`), as
 *   `"r<index>"`.
 */
import type { Plan } from '../geometry/plan';
import { PLAN_HEIGHT_MAX } from '../geometry/plan';
import type { Rng } from '../rng';
import { checkPlan, squareId, type PlanInput } from '../tasks/bauen';
import { generateTask } from '../tasks/generate';
import { checkRegions, regionId, regionPoint, regionsOf, type RegionColors } from '../tasks/maleAn';
import { checkPaint, emptyPaint, type Paint } from '../tasks/malen';
import type { BauenTask, MaleAnTask, MalenTask, Task } from '../tasks/types';
import type { TaskKind } from '../types';
import type { BauenMalenInput, BauenMalenRules as BauenMalenRulesShape, CratesChanged, InputResult, TaskBase, TaskRequest } from './rules';

/** The rules of one task kind of "Bauen und Malen". */
export interface KindRules<T extends TaskBase, S> {
  createTask(request: TaskRequest): T;
  createState(task: T, rng: Rng): S;
  restoreState(task: T, raw: unknown): S | null;
  apply(task: T, state: S, input: BauenMalenInput): InputResult<S> | null;
  check(task: T, state: S): { right: boolean; marked: string[] };
  answer?(task: T, state: S): string;
}

export interface Square {
  row: number;
  col: number;
}

/** The state of a "Bauen" task. */
export interface BauenState {
  planInput: PlanInput;
  built: number[][];
  selected: Square;
}

const inside = (plan: readonly (readonly unknown[])[], row: number, col: number) => Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < plan.length && col >= 0 && col < (plan[row]?.length ?? 0);

const isHeight = (h: unknown): h is number => Number.isInteger(h) && (h as number) >= 0 && (h as number) <= PLAN_HEIGHT_MAX;

/** The square after (`row`, `col`) in reading order, or the same square when it is the last. */
export function nextSquare(plan: Plan, row: number, col: number): Square {
  const cols = plan[0]?.length ?? 0;
  const i = row * cols + col + 1;
  return i < plan.length * cols ? { row: Math.floor(i / cols), col: i % cols } : { row, col };
}

/** `state` with the square (`row`, `col`) holding `typed` (null: empty) and its stack on the field following it. */
function write(state: BauenState, row: number, col: number, typed: number | null, selected: Square): InputResult<BauenState> {
  const from = state.built[row]![col]!;
  const to = typed ?? 0;
  const planInput = state.planInput.map((r) => [...r]);
  const built = state.built.map((r) => [...r]);
  planInput[row]![col] = typed;
  built[row]![col] = to;
  const events: CratesChanged[] = from === to ? [] : [{ type: 'cratesChanged', row, col, from, to }];
  return { state: { planInput, built, selected }, events, unmark: [squareId(row, col)] };
}

export const bauenRules: KindRules<BauenTask, BauenState> = {
  createTask: (request) => {
    const task = generateTask(request);
    if (task.kind !== 'bauen') throw new RangeError(`bauenRules: ${request.content.kind} is no "Bauen" content`);
    return task;
  },
  createState: (task) => ({
    planInput: task.target.map((row) => row.map(() => null)),
    built: task.target.map((row) => row.map(() => 0)),
    selected: { row: 0, col: 0 },
  }),
  restoreState: (task, raw) => {
    if (typeof raw !== 'object' || raw === null) return null;
    const { planInput, built, selected } = raw as Partial<BauenState>;
    const sameShape = (g: unknown, ok: (v: unknown) => boolean) =>
      Array.isArray(g) && g.length === task.target.length && g.every((row, r) => Array.isArray(row) && row.length === task.target[r]!.length && row.every(ok));
    if (!sameShape(planInput, (v) => v === null || isHeight(v)) || !sameShape(built, isHeight)) return null;
    if (typeof selected !== 'object' || selected === null || !inside(task.target, selected.row, selected.col)) return null;
    return { planInput: planInput!.map((r) => [...r]), built: built!.map((r) => [...r]), selected: { row: selected.row, col: selected.col } };
  },
  apply: (task, state, input) => {
    switch (input.type) {
      case 'select':
        if (!inside(task.target, input.row, input.col)) return null;
        return { state: { ...state, selected: { row: input.row, col: input.col } } };
      case 'typeHeight':
        if (!inside(task.target, input.row, input.col) || !isHeight(input.height)) return null;
        return write(state, input.row, input.col, input.height, nextSquare(task.target, input.row, input.col));
      case 'clearHeight':
        if (!inside(task.target, input.row, input.col)) return null;
        return write(state, input.row, input.col, null, { row: input.row, col: input.col });
      default:
        return null;
    }
  },
  check: (task, state) => {
    const marked = checkPlan(task.target, state.planInput);
    return { right: marked.length === 0, marked };
  },
  /** The building's plan, rows from the back to "vorn" split by "/", for example "3,2/2,1" (test hook `data-answer`). */
  answer: (task) => task.target.map((row) => row.join(',')).join('/'),
};

/** The task of `request` when it is of `kind`; throws otherwise. */
function taskOf<K extends Task['kind']>(kind: K, request: TaskRequest): Extract<Task, { kind: K }> {
  const task = generateTask(request);
  if (task.kind !== kind) throw new RangeError(`${kind}Rules: ${request.content.kind} is no ${kind} content`);
  return task as Extract<Task, { kind: K }>;
}

// ---------------------------------------------------------------- "Malen"

/** The state of a "Malen" task. */
export interface MalenState {
  paint: Paint;
  selected: Square;
}

export const malenRules: KindRules<MalenTask, MalenState> = {
  createTask: (request) => taskOf('malen', request),
  // The marker starts on the bottom left square, on the ground, as the prototype's `cur`.
  createState: (task) => ({ paint: emptyPaint(task.expected), selected: { row: task.expected.cells.length - 1, col: 0 } }),
  restoreState: (task, raw) => {
    if (typeof raw !== 'object' || raw === null) return null;
    const { paint, selected } = raw as Partial<MalenState>;
    const cells = task.expected.cells;
    const sameShape = Array.isArray(paint) && paint.length === cells.length && paint.every((row, r) => Array.isArray(row) && row.length === cells[r]!.length && row.every((v) => typeof v === 'boolean'));
    if (!sameShape || typeof selected !== 'object' || selected === null || !inside(paint!, selected.row, selected.col)) return null;
    return { paint: paint!.map((row) => [...row]), selected: { row: selected.row, col: selected.col } };
  },
  apply: (task, state, input) => {
    switch (input.type) {
      case 'select':
        if (!inside(state.paint, input.row, input.col)) return null;
        return { state: { ...state, selected: { row: input.row, col: input.col } } };
      case 'togglePaint': {
        if (!inside(state.paint, input.row, input.col)) return null;
        const paint = state.paint.map((row) => [...row]);
        paint[input.row]![input.col] = !paint[input.row]![input.col];
        return { state: { paint, selected: { row: input.row, col: input.col } }, unmark: [squareId(input.row, input.col)] };
      }
      default:
        return null;
    }
  },
  check: (task, state) => {
    const marked = checkPaint(task.expected, state.paint);
    return { right: marked.length === 0, marked };
  },
  /** The view as rows of `#` (colored) and `.` (empty) from the top, split by "/" (test hook `data-answer`). */
  answer: (task) => task.expected.signature,
};

// ---------------------------------------------------------------- "Male an"

/** The state of a "Male an" task. */
export interface MaleAnState {
  regionColors: RegionColors;
  color: string | null;
  /** The keyboard marker: row 0 is an outline (`col` its piece index), row 1 a color (`col` its palette index). */
  selected: Square;
}

/** The marker's place: an outline of the view or a color of the palette. */
function markerFits(task: MaleAnTask, at: Square): boolean {
  if (at.row === 0) return regionsOf(task.view).includes(at.col);
  return at.row === 1 && Number.isInteger(at.col) && at.col >= 0 && at.col < task.palette.length;
}

export const maleAnRules: KindRules<MaleAnTask, MaleAnState> = {
  createTask: (request) => taskOf('maleAn', request),
  // The marker starts on the color row: a color comes first.
  createState: (task) => ({ regionColors: task.building.pieces.map(() => null), color: null, selected: { row: 1, col: 0 } }),
  restoreState: (task, raw) => {
    if (typeof raw !== 'object' || raw === null) return null;
    const { regionColors, color, selected } = raw as Partial<MaleAnState>;
    const known = (c: unknown) => typeof c === 'string' && task.palette.includes(c);
    if (!Array.isArray(regionColors) || regionColors.length !== task.building.pieces.length || !regionColors.every((c) => c === null || known(c))) return null;
    if (!(color === null || known(color))) return null;
    if (typeof selected !== 'object' || selected === null || !markerFits(task, selected)) return null;
    return { regionColors: [...regionColors], color: color ?? null, selected: { row: selected.row, col: selected.col } };
  },
  apply: (task, state, input) => {
    switch (input.type) {
      case 'select':
        if (!markerFits(task, { row: input.row, col: input.col })) return null;
        return { state: { ...state, selected: { row: input.row, col: input.col } } };
      case 'pickColor': {
        const at = task.palette.indexOf(input.color);
        if (at < 0) return null;
        return { state: { ...state, color: input.color, selected: { row: 1, col: at } } };
      }
      case 'fillRegion': {
        if (state.color === null || !regionsOf(task.view).includes(input.index)) return null;
        const regionColors = [...state.regionColors];
        regionColors[input.index] = state.color;
        return { state: { ...state, regionColors, selected: { row: 0, col: input.index } }, unmark: [regionId(input.index)] };
      }
      default:
        return null;
    }
  },
  check: (task, state) => {
    const marked = checkRegions(task, state.regionColors).map(regionId);
    return { right: marked.length === 0, marked };
  },
  /**
   * The view's size as `<width>x<height>`, then each region as `<piece>:<color>@<x>,<y>`, split by spaces: the piece's
   * index, its color and a point inside its visible outline in grid units of the view, y up (test hook `data-answer`).
   */
  answer: (task) =>
    [`${task.view.width}x${task.view.height}`, ...regionsOf(task.view)
      .sort((a, b) => a - b)
      .map((i) => {
        const p = regionPoint(task.view, i);
        return `${i}:${task.building.pieces[i]!.color}@${p ? `${p.x.toFixed(3)},${p.y.toFixed(3)}` : '-'}`;
      })].join(' '),
};

type AnyKindRules = KindRules<TaskBase, unknown>;

/** The rules of each kind of "Bauen und Malen". */
export const KIND_RULES: Partial<Record<TaskKind, AnyKindRules>> = {
  bauen: bauenRules as unknown as AnyKindRules,
  malen: malenRules as unknown as AnyKindRules,
  maleAn: maleAnRules as unknown as AnyKindRules,
};

function of(kind: TaskKind): AnyKindRules {
  const rules = KIND_RULES[kind];
  if (!rules) throw new RangeError(`bauenMalenRules: ${kind} is no kind of "Bauen und Malen"`);
  return rules;
}

export const bauenMalenRules: BauenMalenRulesShape<TaskBase, unknown> = {
  mode: 'bauenMalen',
  createTask: (request) => of(request.content.kind).createTask(request),
  createState: (task, rng) => of(task.kind).createState(task, rng),
  restoreState: (task, raw) => of(task.kind).restoreState(task, raw),
  apply: (task, state, input) => of(task.kind).apply(task, state, input),
  check: (task, state) => of(task.kind).check(task, state),
  answer: (task, state) => of(task.kind).answer?.(task, state) ?? '',
};
