/**
 * The path of a falling bomb (research R9), as plain numbers so it has unit tests. BombView draws it.
 */
import type { SlotPoint } from './slots';

/** How long the bomb falls (research R9). */
export const FALL_MS = 900;
/** How far before the target the bomb leaves the plane: it keeps some of the plane's speed while it falls. */
export const BOMB_DRIFT = 220;

/**
 * Where the bomb is `ms` after its release from `from` toward `to`: straight across and falling faster and faster, so
 * it ends exactly at `to` after FALL_MS. It turns its nose down on the way.
 */
export function bombAt(from: SlotPoint, to: SlotPoint, ms: number): { x: number; y: number; rotation: number; done: boolean } {
  const p = Math.max(0, Math.min(1, ms / FALL_MS));
  return { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p * p, rotation: 0.3 + p * 1.1, done: p >= 1 };
}
