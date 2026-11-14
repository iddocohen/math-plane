/**
 * The rules of "Bauen und Malen" (FR-020 to FR-023, research R18). The RoundController keeps the phases, the round of
 * `round.tasks` tasks, the misses, help, stars and storage; the kinds alternate through `pickContent` (FR-020). These
 * rules make each task, apply the child's inputs, and check "Fertig".
 *
 * Each task kind has its own `KindRules` in `KIND_RULES`; the rules object hands every call to the rules of the task's
 * kind. "Bauen" is here. "Malen" and "Male an" (US4) add their own entry to `KIND_RULES`. Until then their tasks run
 * as stand-ins (`STAND_IN`): the task has its kind, level and side, every input is ignored and "Fertig" solves it, so
 * levels 3 to 5 can be played to the end.
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
 */
import type { Plan } from '../geometry/plan';
import { PLAN_HEIGHT_MAX } from '../geometry/plan';
import type { Rng } from '../rng';
import { checkPlan, squareId, type PlanInput } from '../tasks/bauen';
import { generateTask } from '../tasks/generate';
import type { BauenTask } from '../tasks/types';
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

const inside = (plan: Plan, row: number, col: number) => Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < plan.length && col >= 0 && col < (plan[row]?.length ?? 0);

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

/** A task of a kind whose rules come later (US4): "Fertig" solves it, inputs are ignored. */
const STAND_IN: KindRules<TaskBase, null> = {
  createTask: ({ content, id, seed }) => ({
    id,
    seed,
    kind: content.kind,
    mode: 'bauenMalen',
    level: content.level,
    ...(content.sides?.[0] ? { side: content.sides[0] } : {}),
  }),
  createState: () => null,
  restoreState: () => null,
  apply: () => null,
  check: () => ({ right: true, marked: [] }),
};

type AnyKindRules = KindRules<TaskBase, unknown>;

/** The rules of each kind of "Bauen und Malen"; US4 adds `malen` and `maleAn`. */
export const KIND_RULES: Partial<Record<TaskKind, AnyKindRules>> = {
  bauen: bauenRules as unknown as AnyKindRules,
};

const of = (kind: TaskKind): AnyKindRules => KIND_RULES[kind] ?? (STAND_IN as AnyKindRules);

export const bauenMalenRules: BauenMalenRulesShape<TaskBase, unknown> = {
  mode: 'bauenMalen',
  createTask: (request) => of(request.content.kind).createTask(request),
  createState: (task, rng) => of(task.kind).createState(task, rng),
  restoreState: (task, raw) => of(task.kind).restoreState(task, raw),
  apply: (task, state, input) => of(task.kind).apply(task, state, input),
  check: (task, state) => of(task.kind).check(task, state),
  answer: (task, state) => of(task.kind).answer?.(task, state) ?? '',
};
