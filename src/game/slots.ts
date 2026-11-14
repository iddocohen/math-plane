/**
 * Where the choices of a "Treffer" task stand on the field (contracts/screens.md "Treffer slots"), every other one
 * nearer (y 640 to 760), as the prototype's `SLOTS4` and `SLOTS3`:
 *
 * - 4 slots (solids, shapes) evenly spaced from x 300 to 1300;
 * - 3 slots (buildings, view cards) from x 560 to 1300, so the plan card or the building asked about has the left of
 *   the field, as in the prototype, whose 3 slots also leave the left free.
 *
 * A slot's point is the ground middle of what stands there. The bomb aims at the middle of the target, which for a
 * solid, a building or a card is above the ground (`AIM_RISE`).
 */
import type { TaskKind } from '../core/types';

export interface SlotPoint {
  x: number;
  y: number;
}

const FAR_Y = 640;
const NEAR_Y = 760;
const LEFT_X = 300;
/** The first of 3 slots: right of the plan card and the building asked about (x 40 to 420 and its eye). */
const LEFT_X_3 = 560;
const RIGHT_X = 1300;

/** The ground point of slot `slot` of `count` slots. */
export function slotPoint(count: number, slot: number): SlotPoint {
  const left = count === 3 ? LEFT_X_3 : LEFT_X;
  const step = count > 1 ? (RIGHT_X - left) / (count - 1) : 0;
  const x = count > 1 ? left + step * slot : (left + RIGHT_X) / 2;
  // With 4 slots the second and fourth are nearer; with 3 the middle one is.
  const near = count === 3 ? slot === 1 : slot % 2 === 1;
  return { x, y: near ? NEAR_Y : FAR_Y };
}

/** How far above its ground point the middle of a target is, by kind. */
export const AIM_RISE: Partial<Record<TaskKind, number>> = {
  koerper: 42,
  formen: 0,
  /** The middle of a cube building (BuildingView). */
  bauplanFinden: 70,
  /** The middle of a standing view card (CardsView). */
  ansichtFinden: 120,
};

/** Where a bomb on slot `slot` lands: the middle of the target standing there (research R9). */
export function aimPoint(kind: TaskKind, count: number, slot: number): SlotPoint {
  const p = slotPoint(count, slot);
  return { x: p.x, y: p.y - (AIM_RISE[kind] ?? 0) };
}

/** The plan card and the "Getroffen" card below it, in world units (contracts/screens.md: x 40 to 420; CardsView). */
export const PLAN_CARD = { x: 50, y: 400, width: 240, height: 250, gap: 24, grid: 150 } as const;
