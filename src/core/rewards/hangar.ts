// Structure adapted from math-soccer src/core/rewards/lockerRoom.ts (`award` and the star table); buying and choosing
// items follow with the item list.
/**
 * Stars and the Hangar (FR-036, FR-044, data-model.md "Hangar"). Pure functions; the app stores the result under
 * `mathplane.hangar.v1`. Stars are never taken away after a mistake: only buying an item lowers the balance (FR-041).
 * Nothing here reaches task selection or the difficulty (FR-045).
 */
import type { Settings } from '../settings/schema';
import type { Hangar } from '../storage/schemas';
import type { Outcome, TaskKind } from '../types';

/** Stars per hit in "Treffer" and per finished task in "Bauen und Malen" (FR-044). */
export const STARS = { hit: 1, task: 3 } as const;

/** The task kinds of "Bauen und Malen", which earn `STARS.task` per finished task. */
const BUILD_PAINT_KINDS: ReadonlySet<TaskKind> = new Set<TaskKind>(['bauen', 'malen', 'maleAn']);

/** The help step that shows the answer (research R15). */
export const FULL_HELP_STEP = 3;

/**
 * The stars for one solved task (FR-036, FR-044): 1 for a "Treffer" hit, 3 for a "Bauen", "Malen" or "Male an" task,
 * and 0 after help step 3 when the parent turned "Punkt nach voller Hilfe" off. The outcome does not change the
 * stars: help never costs stars (FR-033).
 */
export function starsFor(kind: TaskKind, _outcome: Outcome, helpStep: number, settings: Pick<Settings, 'pointAfterFullHelp'>): number {
  if (helpStep >= FULL_HELP_STEP && !settings.pointAfterFullHelp) return 0;
  return BUILD_PAINT_KINDS.has(kind) ? STARS.task : STARS.hit;
}

/** Adds `n` stars to the balance; anything but a whole number above 0 changes nothing. */
export function award(h: Hangar, n: number): Hangar {
  if (!Number.isInteger(n) || n <= 0) return h;
  return { ...h, owned: [...h.owned], chosen: { ...h.chosen }, stars: h.stars + n };
}
