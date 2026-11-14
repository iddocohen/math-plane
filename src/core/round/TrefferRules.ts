/**
 * The rules of "Treffer" (FR-008, FR-014 to FR-019, research R9, R18). The RoundController keeps the phases, the bomb
 * bay, the one bomb per pass, the landing and its fallback timer; these rules make the task, say which choice stands
 * in which field slot, decide a hit, and move the choices after a miss.
 *
 * State of one task: `slots[i]` is the choice standing in field slot `i`; `lastHit` is the choice the last bomb hit,
 * for the miss line and the "Getroffen" card of "Bauplan finden" (FR-018, CardsView).
 *
 * Every kind works the same way: "Körper finden" and "Formen finden" stand 4 choices in the slots, "Bauplan finden"
 * its 3 buildings and "Ansicht finden" its 3 view cards. The choices of each task carry `rightIndexes`.
 */
import type { Rng } from '../rng';
import { generateTrefferTask } from '../tasks/generate';
import type { TrefferTask } from '../tasks/types';
import type { TrefferRules as TrefferRulesShape } from './rules';

export interface TrefferState {
  slots: number[];
  lastHit: number | null;
}

/** How often a reshuffle tries for an order that moves the hit choice before it turns the order by one place. */
const SHUFFLE_TRIES = 20;

function isOrderOf(slots: unknown, n: number): slots is number[] {
  if (!Array.isArray(slots) || slots.length !== n) return false;
  const seen = new Set<number>();
  for (const s of slots) {
    if (!Number.isInteger(s) || s < 0 || s >= n || seen.has(s)) return false;
    seen.add(s);
  }
  return true;
}

/** The choices in a new order in which `choice` stands in another slot than before (FR-008). */
export function reshuffle(slots: readonly number[], choice: number, rng: Rng): number[] {
  const before = slots.indexOf(choice);
  if (slots.length < 2) return [...slots];
  for (let i = 0; i < SHUFFLE_TRIES; i++) {
    const next = rng.shuffled(slots);
    if (next.indexOf(choice) !== before) return next;
  }
  return [...slots.slice(1), slots[0]!];
}

export const trefferRules: TrefferRulesShape<TrefferTask, TrefferState> = {
  mode: 'treffer',
  createTask: (request) => generateTrefferTask(request),
  createState: (task, rng) => ({ slots: rng.shuffled(task.choices.map((_, i) => i)), lastHit: null }),
  restoreState: (task, raw) => {
    if (typeof raw !== 'object' || raw === null) return null;
    const { slots, lastHit } = raw as Partial<TrefferState>;
    if (!isOrderOf(slots, task.choices.length)) return null;
    const hit = Number.isInteger(lastHit) && (lastHit as number) >= 0 && (lastHit as number) < task.choices.length ? (lastHit as number) : null;
    return { slots: [...slots], lastHit: hit };
  },
  choiceAt: (_task, state, slot) => state.slots[slot] ?? null,
  isHit: (task, choice) => task.rightIndexes.includes(choice),
  afterMiss: (_task, state, choice, rng) => ({ slots: reshuffle(state.slots, choice, rng), lastHit: choice }),
  slots: (state) => [...state.slots],
  /** The slots of the right choices, for example "2" (test hook `data-answer`). */
  answer: (task, state) =>
    state.slots
      .map((choice, slot) => (task.rightIndexes.includes(choice) ? slot : -1))
      .filter((slot) => slot >= 0)
      .join(','),
};
