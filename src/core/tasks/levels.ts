/**
 * The level ladders of both modes (FR-028 to FR-032, research R10). Each level lists its task kinds and the content
 * they use: plan limits for cube buildings, the sides asked, and whether buildings get cylinders and spheres.
 *
 * - `levelRange` is the parent's range of a mode without the levels whose every kind is off.
 * - `currentLevel`, `levelUp` and `levelDown` keep a level inside that range (FR-031).
 * - `pickContent` takes the current level's content with probability 0.6, otherwise a lower level's (FR-029), and caps
 *   it by the parent's building limits (FR-032).
 */
import { de } from '../../i18n/de';
import type { PlanLimits } from '../geometry/plan';
import type { Rng } from '../rng';
import type { Settings } from '../settings/schema';
import { LEVELS as LEVEL_NUMBERS, SIDES, type Level, type Mode, type Side, type TaskKind } from '../types';

/** What one task kind of a level asks for. Fields a kind does not use are left out. */
export interface ContentDef {
  kind: TaskKind;
  /** Size and stacks of cube buildings (plan tasks, cube views). */
  plan?: PlanLimits;
  /** The sides a view task may ask about. */
  sides?: readonly Side[];
  /** Buildings with cylinders and spheres (FR-019, FR-023, FR-027). */
  mixed?: boolean;
}

export interface LevelDef {
  level: Level;
  /** German name, from de.ts (FR-028). */
  name: string;
  /** The kinds of the level, in the order they alternate (FR-020). */
  contents: readonly ContentDef[];
}

/** The content of one task after the parent's limits, with the level it comes from. */
export interface Content {
  kind: TaskKind;
  level: Level;
  plan?: PlanLimits;
  sides?: Side[];
  mixed?: boolean;
}

/** How often a task comes from the current level (research R10, FR-029: at least half). */
export const CURRENT_LEVEL_SHARE = 0.6;

const FRONT_TOP: readonly Side[] = ['vorn', 'oben'];
const ALL_SIDES: readonly Side[] = SIDES;
/** Cube buildings for view tasks: 3×3 with stacks 0 to 3, as the prototype's `genBuilding(3)`. */
const VIEW_PLAN: PlanLimits = { size: 3, minStack: 0, maxStack: 3 };

const names = de.levels.names;

/** The ladders of FR-028, easiest first. */
export const LEVELS: Record<Mode, readonly LevelDef[]> = {
  treffer: [
    { level: 1, name: names.treffer[1], contents: [{ kind: 'koerper' }] },
    { level: 2, name: names.treffer[2], contents: [{ kind: 'formen' }] },
    { level: 3, name: names.treffer[3], contents: [{ kind: 'bauplanFinden', plan: { size: 2, minStack: 1, maxStack: 3 } }] },
    { level: 4, name: names.treffer[4], contents: [{ kind: 'ansichtFinden', plan: VIEW_PLAN, sides: FRONT_TOP, mixed: false }] },
    { level: 5, name: names.treffer[5], contents: [{ kind: 'ansichtFinden', plan: VIEW_PLAN, sides: ALL_SIDES, mixed: true }] },
  ],
  bauenMalen: [
    { level: 1, name: names.bauenMalen[1], contents: [{ kind: 'bauen', plan: { size: 2, minStack: 1, maxStack: 3 } }] },
    { level: 2, name: names.bauenMalen[2], contents: [{ kind: 'bauen', plan: { size: 3, minStack: 0, maxStack: 3 } }] },
    { level: 3, name: names.bauenMalen[3], contents: [{ kind: 'malen', plan: VIEW_PLAN, sides: FRONT_TOP }] },
    { level: 4, name: names.bauenMalen[4], contents: [{ kind: 'malen', plan: VIEW_PLAN, sides: ALL_SIDES }] },
    {
      level: 5,
      name: names.bauenMalen[5],
      contents: [
        { kind: 'maleAn', sides: ALL_SIDES, mixed: true },
        { kind: 'malen', plan: VIEW_PLAN, sides: ALL_SIDES },
      ],
    },
  ],
};

export function levelDef(mode: Mode, level: Level): LevelDef {
  return LEVELS[mode][level - 1]!;
}

/** The level's contents whose kind the parent left on. */
function allowedContents(mode: Mode, level: Level, settings: Pick<Settings, 'kinds'>): ContentDef[] {
  return levelDef(mode, level).contents.filter((c) => settings.kinds[c.kind]);
}

function offered(mode: Mode, level: Level, settings: Pick<Settings, 'kinds'>): boolean {
  return allowedContents(mode, level, settings).length > 0;
}

/**
 * The levels the child can play in `mode`: the parent's start to hardest level, without levels whose every kind is off.
 * When every level of the range is off, the nearest offered level below the range stands in, else the nearest above.
 * Empty only when every kind of the mode is off (the start screen then shows its note).
 */
export function levelRange(mode: Mode, settings: Pick<Settings, 'levels' | 'kinds'>): Level[] {
  const { start, hardest } = settings.levels[mode];
  const range = LEVEL_NUMBERS.filter((l) => l >= start && l <= hardest && offered(mode, l, settings));
  if (range.length > 0) return range;
  const below = LEVEL_NUMBERS.filter((l) => l < start && offered(mode, l, settings));
  if (below.length > 0) return [below[below.length - 1]!];
  const above = LEVEL_NUMBERS.find((l) => l > hardest && offered(mode, l, settings));
  return above === undefined ? [] : [above];
}

/**
 * `stored` moved into the range: up to the next offered level, or down to the top one (FR-031). With adaptive
 * difficulty off it is the first level of the range. Level 1 when the range is empty.
 */
export function currentLevel(mode: Mode, stored: number, settings: Pick<Settings, 'levels' | 'kinds' | 'adaptive'>): Level {
  const range = levelRange(mode, settings);
  if (range.length === 0) return 1;
  if (!settings.adaptive) return range[0]!;
  return range.find((l) => l >= stored) ?? range[range.length - 1]!;
}

/** The next offered level up, or `level` at the top of the range. */
export function levelUp(mode: Mode, level: Level, settings: Pick<Settings, 'levels' | 'kinds'>): Level {
  return levelRange(mode, settings).find((l) => l > level) ?? level;
}

/** The next offered level down, or `level` at the bottom of the range. */
export function levelDown(mode: Mode, level: Level, settings: Pick<Settings, 'levels' | 'kinds'>): Level {
  const lower = levelRange(mode, settings).filter((l) => l < level);
  return lower[lower.length - 1] ?? level;
}

/**
 * The sides of `wanted` the parent left on. When none is left, the closest content within the limits is every side the
 * parent left on (FR-032).
 */
function capSides(wanted: readonly Side[], settings: Pick<Settings, 'buildings'>): Side[] {
  const on = SIDES.filter((s) => settings.buildings.sides[s]);
  const kept = wanted.filter((s) => settings.buildings.sides[s]);
  return kept.length > 0 ? kept : on;
}

/** Plan limits within the parent's largest plan and highest stack (FR-032). */
function capPlan(plan: PlanLimits, settings: Pick<Settings, 'buildings'>): PlanLimits {
  const size = Math.min(plan.size, settings.buildings.maxPlan) as 2 | 3;
  const maxStack = Math.min(plan.maxStack, settings.buildings.maxStack);
  return { size, minStack: Math.min(plan.minStack, maxStack), maxStack };
}

/**
 * One content of a level after the parent's building limits (FR-032). "Male an" with cylinders and spheres off keeps
 * its kind; its generator then uses boxes only, the closest content within the limits.
 */
export function capContent(def: ContentDef, level: Level, settings: Pick<Settings, 'buildings'>): Content {
  const out: Content = { kind: def.kind, level };
  if (def.plan) out.plan = capPlan(def.plan, settings);
  if (def.sides) out.sides = capSides(def.sides, settings);
  if (def.mixed !== undefined) out.mixed = def.mixed && settings.buildings.mixedPieces;
  return out;
}

/**
 * The content of the next task at `level` (research R10, FR-029). With probability 0.6, or when no lower level is
 * offered, the content comes from `level`; otherwise from a lower offered level of the range, each equally likely.
 * Within a level with more than one allowed kind the kinds alternate: the kind after `previous`, or the first kind when
 * `previous` is not one of them (FR-020).
 */
export function pickContent(mode: Mode, level: Level, settings: Settings, rng: Rng, previous: TaskKind | null = null): Content {
  const range = levelRange(mode, settings);
  const lower = range.filter((l) => l < level);
  const chosen = lower.length === 0 || rng.next() < CURRENT_LEVEL_SHARE ? level : rng.pick(lower);
  const contents = allowedContents(mode, chosen, settings);
  if (contents.length === 0) throw new RangeError(`pickContent: level ${chosen} of ${mode} has every kind off`);
  const at = contents.findIndex((c) => c.kind === previous);
  const def = contents[(at + 1) % contents.length]!;
  return capContent(def, chosen, settings);
}
