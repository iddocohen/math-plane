/**
 * Where the choices of a "Treffer" task stand on the field (contracts/screens.md "Treffer slots"): 3 or 4 slots evenly
 * spaced from x 300 to 1300, every other one nearer (y 640 to 760), as the prototype's `SLOTS4` and `SLOTS3`.
 *
 * A slot's point is the ground middle of what stands there. The bomb aims at the middle of the target, which for a
 * solid is above the ground (`AIM_RISE`); US2 adds the rise of its buildings and cards.
 */
import type { TaskKind } from '../core/types';

export interface SlotPoint {
  x: number;
  y: number;
}

const FAR_Y = 640;
const NEAR_Y = 760;
const LEFT_X = 300;
const RIGHT_X = 1300;

/** The ground point of slot `slot` of `count` slots. */
export function slotPoint(count: number, slot: number): SlotPoint {
  const step = count > 1 ? (RIGHT_X - LEFT_X) / (count - 1) : 0;
  const x = count > 1 ? LEFT_X + step * slot : (LEFT_X + RIGHT_X) / 2;
  // With 4 slots the second and fourth are nearer; with 3 the middle one is.
  const near = count === 3 ? slot === 1 : slot % 2 === 1;
  return { x, y: near ? NEAR_Y : FAR_Y };
}

/** How far above its ground point the middle of a target is, by kind. */
export const AIM_RISE: Partial<Record<TaskKind, number>> = {
  koerper: 42,
  formen: 0,
};

/** Where a bomb on slot `slot` lands: the middle of the target standing there (research R9). */
export function aimPoint(kind: TaskKind, count: number, slot: number): SlotPoint {
  const p = slotPoint(count, slot);
  return { x: p.x, y: p.y - (AIM_RISE[kind] ?? 0) };
}
