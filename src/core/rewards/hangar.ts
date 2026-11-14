// Structure adapted from math-soccer src/core/rewards/lockerRoom.ts (`award`, the star table, `buy`, `equip` as
// `choose`, `starsNeeded`).
/**
 * Stars and the Hangar (FR-036, FR-044, data-model.md "Hangar"). Pure functions; the app stores the result under
 * `mathplane.hangar.v1`. Stars are never taken away after a mistake: only buying an item lowers the balance (FR-041),
 * and never below 0.
 *
 * - `buy` takes the price and chooses the item; `choose` chooses an owned or free item at no cost.
 * - `chosenId` and `lookOf` read the chosen look; an unknown, wrong or not owned stored id shows the free default of
 *   its category, so stored data from an older item list still loads.
 *
 * Nothing here reaches task selection or the difficulty (FR-045).
 */
import type { Settings } from '../settings/schema';
import { HANGAR_CATEGORIES, STARTER, type Hangar, type HangarCategory } from '../storage/schemas';
import type { Outcome, TaskKind } from '../types';
import { isFree, itemById, type BombStyle, type PilotHat, type TailPicture } from './items';

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

/** Prices up to this many stars buy at once; dearer items ask "Für N Sterne kaufen?" first (src/app/Hangar.tsx). */
export const ASK_ABOVE = 20;

export function isOwned(h: Hangar, id: string): boolean {
  return isFree(id) || (itemById(id) !== undefined && h.owned.includes(id));
}

/** Stars still needed for an item ("noch N Sterne"); 0 when the balance reaches its price or it is owned. */
export function starsNeeded(h: Hangar, id: string): number {
  const item = itemById(id);
  return item && !isOwned(h, id) ? Math.max(0, item.price - h.stars) : 0;
}

export function canBuy(h: Hangar, id: string): boolean {
  const item = itemById(id);
  return item !== undefined && !isOwned(h, id) && item.price <= h.stars;
}

/** Takes the price, adds the item and chooses it; null when it is unknown, owned already or too dear. */
export function buy(h: Hangar, id: string): Hangar | null {
  if (!canBuy(h, id)) return null;
  const item = itemById(id)!;
  return { ...h, stars: h.stars - item.price, owned: [...h.owned, id], chosen: { ...h.chosen, [item.category]: id } };
}

/** Chooses an owned or free item for its category; an unknown or not owned item changes nothing. */
export function choose(h: Hangar, id: string): Hangar {
  const item = itemById(id);
  if (!item || !isOwned(h, id)) return h;
  return { ...h, owned: [...h.owned], chosen: { ...h.chosen, [item.category]: id } };
}

/** The chosen item of a category, or the free default when the stored id is unknown, of another category or not owned. */
export function chosenId(h: Hangar, category: HangarCategory): string {
  const id = h.chosen[category];
  const item = itemById(id);
  return item && item.category === category && isOwned(h, id) ? id : STARTER[category];
}

/** Everything the chosen items change: the plane (src/game/PlaneView.ts) and the bomb burst (src/game/BombView.ts). */
export interface HangarLook {
  /** The plane's body color, `#rrggbb`. */
  color: string;
  tail: TailPicture;
  /** The trail's colors, or null for no trail. */
  smoke: readonly string[] | null;
  hat: PilotHat;
  bomb: BombStyle;
}

/** The look of the chosen items. */
export function lookOf(h: Hangar): HangarLook {
  const ids = Object.fromEntries(HANGAR_CATEGORIES.map((c) => [c, chosenId(h, c)])) as Record<HangarCategory, string>;
  return lookOfIds(ids);
}

/** The look of one id per category; an unknown id gives the free default's look. */
export function lookOfIds(ids: Record<HangarCategory, string>): HangarLook {
  const look = (c: HangarCategory) => (itemById(ids[c]) ?? itemById(STARTER[c])!).look;
  const out = { color: '', tail: 'star', smoke: null, hat: 'cap', bomb: 'confetti' } as HangarLook;
  for (const c of HANGAR_CATEGORIES) {
    const l = look(c);
    if (l.category === 'planeColor') out.color = l.color;
    else if (l.category === 'tail') out.tail = l.tail;
    else if (l.category === 'smoke') out.smoke = l.smoke;
    else if (l.category === 'bomb') out.bomb = l.bomb;
    else out.hat = l.hat;
  }
  return out;
}
