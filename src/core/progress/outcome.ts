/** How a task went (FR-035, research R12). */
import type { Outcome } from '../types';

/**
 * `alone` when the first try (first bomb or first "Fertig") was right and no help step was used; otherwise `withHelp`.
 */
export function outcomeOf(firstTryRight: boolean, helpStep: number): Outcome {
  return firstTryRight && helpStep === 0 ? 'alone' : 'withHelp';
}
