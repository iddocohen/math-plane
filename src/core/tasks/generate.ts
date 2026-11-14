/**
 * Makes the task of a content (contracts/core-api.md "Tasks", data-model.md "Task"). Every random number comes from
 * the request's `rng`, so a round seed makes the same tasks again.
 *
 * - "Körper finden" (FR-016): 4 different solids from Würfel, Quader, Zylinder, Kugel and Pyramide, each in its own
 *   color; one of them is the target.
 * - "Formen finden" (FR-017, FR-024c, research R17): Kreis, Dreieck, Quadrat and Rechteck, each once and in its own
 *   color. The Rechteck's long side is 1.6 to 2.2 times its short side; the other shapes vary in size and turn by up to
 *   20 degrees.
 * - "Bauplan finden" (FR-018, research R5): a plan that is not uniform and has at least 2 close variants; the right
 *   building and 2 variants stand on the field.
 * - "Ansicht finden" (FR-019, research R7): one building, a cube building or, where the content allows, a building
 *   with mixed pieces half of the time; the side asked from the content's sides; the right view card and 2 wrong ones.
 * - "Bauen" (FR-021): a readable cube building within the content's plan limits (bauen.ts).
 * - "Malen" (FR-022, FR-024): a readable cube building and a side whose view is worth painting (malen.ts). Side views
 *   are as high as the parent's highest stack.
 * - "Male an" (FR-023, research R8): a building with mixed pieces, or boxes only when the content says so, seen from
 *   one side, within the parent's largest plan and highest stack (maleAn.ts).
 */
import { generateMixed, mirrorMixedView, mixedView, withoutPiece, carriesOther, type MixedBuilding } from '../geometry/mixed';
import { FALLBACK_PLANS, GENERATE_TRIES, generateCubePlan, hasVariants, meetsRules, plansEqual, planVariants, type Plan, type PlanLimits } from '../geometry/plan';
import { cubeView, mirrorCubeView, oneColumnChanged } from '../geometry/views';
import type { Rng } from '../rng';
import type { TaskRequest } from '../round/rules';
import { FLAT_SHAPES, SIDES, SOLIDS, type Level, type Side } from '../types';
import { generateBauen } from './bauen';
import { generateMaleAn, MALE_AN_PLAN } from './maleAn';
import { generateMalen, MALEN_PLAN } from './malen';
import { PIECE_COLORS } from './colors';
import { isTrefferTask, type AnsichtFindenTask, type BauplanFindenTask, type FormenTask, type KoerperTask, type ShapeLook, type Task, type TrefferTask, type ViewCard } from './types';

/** How many choices stand on the field in "Körper finden" and "Formen finden". */
export const CHOICE_COUNT = 4;
/** The Rechteck's long side over its short side (FR-024c). */
export const RECT_ASPECT = { min: 1.6, max: 2.2 } as const;
/** How far Kreis, Dreieck and Quadrat turn, in degrees, and how much their size varies (research R17). */
export const MAX_TURN = 20;
export const SHAPE_SCALE = { min: 0.8, max: 1.15 } as const;

interface Ident {
  id: string;
  seed: number;
  level: Level;
}

function between(rng: Rng, min: number, max: number): number {
  return min + rng.next() * (max - min);
}

function colorsFor(rng: Rng, n: number): string[] {
  return rng.shuffled(PIECE_COLORS).slice(0, n);
}

export function generateKoerper(rng: Rng, ident: Ident): KoerperTask {
  const choices = rng.shuffled(SOLIDS).slice(0, CHOICE_COUNT);
  const answer = rng.int(0, choices.length - 1);
  return { ...ident, kind: 'koerper', mode: 'treffer', choices, target: choices[answer]!, colors: colorsFor(rng, choices.length), rightIndexes: [answer] };
}

function lookOf(rng: Rng, shape: (typeof FLAT_SHAPES)[number]): ShapeLook {
  if (shape === 'rechteck') return { scale: 1, turn: 0, aspect: between(rng, RECT_ASPECT.min, RECT_ASPECT.max) };
  return { scale: between(rng, SHAPE_SCALE.min, SHAPE_SCALE.max), turn: between(rng, -MAX_TURN, MAX_TURN), aspect: 1 };
}

export function generateFormen(rng: Rng, ident: Ident): FormenTask {
  const choices = rng.shuffled(FLAT_SHAPES).slice(0, CHOICE_COUNT);
  const answer = rng.int(0, choices.length - 1);
  return {
    ...ident,
    kind: 'formen',
    mode: 'treffer',
    choices,
    target: choices[answer]!,
    colors: colorsFor(rng, choices.length),
    looks: choices.map((c) => lookOf(rng, c)),
    rightIndexes: [answer],
  };
}

/** How many buildings stand on the field in "Bauplan finden" and how many cards lie there in "Ansicht finden". */
export const CARD_COUNT = 3;
/** Plans of "Bauplan finden" when the level gives none (FR-028 level 3). */
export const BAUPLAN_PLAN: PlanLimits = { size: 2, minStack: 1, maxStack: 3 };
/** Cube buildings of "Ansicht finden" when the level gives none (as levels.ts `VIEW_PLAN`). */
export const VIEW_PLAN: PlanLimits = { size: 3, minStack: 0, maxStack: 3 };
/** The share of "Ansicht finden" buildings with cylinders and spheres where the content allows them. */
export const MIXED_SHARE = 0.5;

/** A plan for "Bauplan finden": readable, not uniform, with at least 2 variants (research R5, critique P2). */
function bauplan(rng: Rng, limits: PlanLimits): Plan {
  for (let i = 0; i < GENERATE_TRIES; i++) {
    const p = generateCubePlan(rng, limits);
    if (hasVariants(p, limits)) return p;
  }
  const fits = FALLBACK_PLANS[limits.size].filter((p) => meetsRules(p, limits) && hasVariants(p, limits));
  if (fits.length === 0) throw new RangeError(`bauplanFinden: no plan fits ${JSON.stringify(limits)}`);
  return rng.pick(fits).map((row) => [...row]);
}

export function generateBauplanFinden(rng: Rng, ident: Ident, limits: PlanLimits = BAUPLAN_PLAN): BauplanFindenTask {
  const plan = bauplan(rng, limits);
  const choices = rng.shuffled([plan.map((row) => [...row]), ...planVariants(plan, rng, limits, CARD_COUNT - 1)]);
  const rightIndexes = choices.flatMap((c, i) => (plansEqual(c, plan) ? [i] : []));
  return { ...ident, kind: 'bauplanFinden', mode: 'treffer', plan, choices, colors: colorsFor(rng, choices.length), rightIndexes };
}

type AnyView = ViewCard['view'];

/** The views of `building` from every side. */
function viewsOf(building: Plan | MixedBuilding, gridHeight: number): Record<Side, AnyView> {
  const of = (side: Side): AnyView => (Array.isArray(building) ? cubeView(building, side, gridHeight) : mixedView(building, side));
  return { vorn: of('vorn'), oben: of('oben'), rechts: of('rechts'), links: of('links') };
}

const sizeOf = (v: AnyView): string => ('cells' in v ? `${v.cells[0]?.length ?? 0}x${v.cells.length}` : `${v.width}x${v.height}`);

/**
 * The wrong cards for the view from `side` (research R7), in groups: the views from the other sides; the asked view
 * mirrored; the asked view with one column changed (cube) or one piece removed (mixed, only pieces that carry
 * nothing, so nothing floats). Cards equal to the asked view or to an earlier card are dropped, and so are cards of
 * another size than the asked view, which would give the answer away.
 */
function wrongGroups(building: Plan | MixedBuilding, views: Record<Side, AnyView>, side: Side): AnyView[][] {
  const asked = views[side];
  const seen = new Set([asked.signature]);
  const keep = (vs: AnyView[]) =>
    vs.filter((v) => {
      if (seen.has(v.signature) || sizeOf(v) !== sizeOf(asked)) return false;
      seen.add(v.signature);
      return true;
    });
  const others = keep(SIDES.filter((s) => s !== side).map((s) => views[s]));
  if (Array.isArray(building)) {
    const cube = asked as ReturnType<typeof cubeView>;
    return [others, keep([mirrorCubeView(cube)]), keep(oneColumnChanged(cube))];
  }
  const mixed = asked as ReturnType<typeof mixedView>;
  const removable = building.pieces.flatMap((_, i) => (carriesOther(building, i) ? [] : [i]));
  const removed = removable.map((i) => withoutPiece(mixed, i)).filter((v) => v.outlines.length > 0);
  return [others, keep([mirrorMixedView(mixed)]), keep(removed)];
}

/** 2 wrong cards: one from another side when there is one, then one from a random group of the rest. */
function pickWrong(rng: Rng, groups: AnyView[][]): AnyView[] {
  const pools = groups.map((g) => rng.shuffled(g));
  const picked: AnyView[] = [];
  if (pools[0]!.length > 0) picked.push(pools[0]!.shift()!);
  while (picked.length < CARD_COUNT - 1) {
    const left = pools.filter((p) => p.length > 0);
    if (left.length === 0) throw new RangeError('ansichtFinden: too few wrong cards');
    picked.push(rng.pick(left).shift()!);
  }
  return picked;
}

export function generateAnsichtFinden(rng: Rng, ident: Ident, content: TaskRequest['content']): AnsichtFindenTask {
  const sides = content.sides && content.sides.length > 0 ? content.sides : (['vorn', 'oben'] as Side[]);
  const side = rng.pick(sides);
  const limits = content.plan ?? VIEW_PLAN;
  const building: Plan | MixedBuilding =
    content.mixed && rng.next() < MIXED_SHARE
      ? generateMixed(rng, { size: limits.size, maxStack: Math.max(2, limits.maxStack), sides, mixed: true })
      : generateCubePlan(rng, limits);
  const views = viewsOf(building, limits.maxStack);
  const asked = views[side];
  const cards = rng.shuffled([asked, ...pickWrong(rng, wrongGroups(building, views, side))]);
  const choices: ViewCard[] = cards.map((view) => ({ view, shows: SIDES.filter((s) => views[s].signature === view.signature) }));
  const rightIndexes = choices.flatMap((c, i) => (c.view.signature === asked.signature ? [i] : []));
  return { ...ident, kind: 'ansichtFinden', mode: 'treffer', side, building, color: rng.pick(PIECE_COLORS), choices, rightIndexes };
}

/** The task of `request.content`, with the request's id, seed and level. */
export function generateTask(request: TaskRequest): Task {
  const { content, rng, id, seed } = request;
  const ident: Ident = { id, seed, level: content.level };
  switch (content.kind) {
    case 'koerper':
      return generateKoerper(rng, ident);
    case 'formen':
      return generateFormen(rng, ident);
    case 'bauplanFinden':
      return generateBauplanFinden(rng, ident, content.plan);
    case 'ansichtFinden':
      return generateAnsichtFinden(rng, ident, content);
    case 'bauen':
      return generateBauen(rng, ident, content.plan);
    case 'malen':
      return generateMalen(rng, ident, content.sides ?? [], content.plan ?? MALEN_PLAN, request.settings.buildings.maxStack);
    case 'maleAn': {
      // The level gives "Male an" no plan limits; the parent's largest plan and highest stack still apply (FR-032).
      const { maxPlan, maxStack } = request.settings.buildings;
      const limits = content.plan ?? { ...MALE_AN_PLAN, size: Math.min(MALE_AN_PLAN.size, maxPlan) as 2 | 3, maxStack: Math.min(MALE_AN_PLAN.maxStack, maxStack) };
      return generateMaleAn(rng, ident, content.sides ?? [], content.mixed ?? true, limits);
    }
  }
}

/** The task of a "Treffer" content; throws for a kind of "Bauen und Malen". */
export function generateTrefferTask(request: TaskRequest): TrefferTask {
  const task = generateTask(request);
  if (!isTrefferTask(task)) throw new RangeError(`generateTrefferTask: ${request.content.kind} is no "Treffer" kind`);
  return task;
}
