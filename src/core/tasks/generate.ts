/**
 * Makes the task of a content (contracts/core-api.md "Tasks", data-model.md "Task"). Every random number comes from
 * the request's `rng`, so a round seed makes the same tasks again.
 *
 * - "Körper finden" (FR-016): 4 different solids from Würfel, Quader, Zylinder, Kugel and Pyramide, each in its own
 *   color; one of them is the target.
 * - "Formen finden" (FR-017, FR-024c, research R17): Kreis, Dreieck, Quadrat and Rechteck, each once and in its own
 *   color. The Rechteck's long side is 1.6 to 2.2 times its short side; the other shapes vary in size and turn by up to
 *   20 degrees.
 *
 * "Bauplan finden" and "Ansicht finden" (US2) have no generator yet: until they do, their content makes a "Körper
 * finden" or "Formen finden" task with the content's level, so a round on levels 3 to 5 still plays.
 */
import type { Rng } from '../rng';
import type { TaskRequest } from '../round/rules';
import { FLAT_SHAPES, SOLIDS, type Level } from '../types';
import { PIECE_COLORS } from './colors';
import type { FormenTask, KoerperTask, ShapeLook, Task } from './types';

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
    case 'ansichtFinden':
      // Stand-in until US2 (T040) builds these kinds.
      return rng.next() < 0.5 ? generateKoerper(rng, ident) : generateFormen(rng, ident);
    case 'bauen':
    case 'malen':
    case 'maleAn':
      throw new RangeError(`generateTask: no generator for ${content.kind} yet`);
  }
}
