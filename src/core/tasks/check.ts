/**
 * Checks an answer (contracts/core-api.md "Tasks"). The RoundController decides hit or miss when the child taps
 * (research R9); these checks say what was hit, so a miss explains itself (FR-010).
 */
import { de } from '../../i18n/de';
import type { FlatShape, Solid } from '../types';
import type { FormenTask, KoerperTask, TrefferTask } from './types';

export interface BombCheck {
  hit: boolean;
  /** The German line that names what a miss hit ("Das ist die Kugel."); empty on a hit. */
  named: string;
}

/** The name of a solid or shape with its nominative article: "die Kugel", "das Dreieck". */
export function nominative(task: KoerperTask | FormenTask, choice: number): string {
  if (task.kind === 'koerper') return de.names.solids[task.choices[choice] as Solid].nom;
  return de.names.shapes[task.choices[choice] as FlatShape].nom;
}

/** The line that names a missed choice: the solid or shape, the side a view card shows, or the other plan. */
function missLine(task: TrefferTask, choice: number): string {
  switch (task.kind) {
    case 'koerper':
    case 'formen':
      return de.feedback.missNamed(nominative(task, choice));
    case 'bauplanFinden':
      // The "Getroffen" card shows the plan of the building hit (FR-018).
      return de.feedback.missPlan;
    case 'ansichtFinden': {
      const shown = task.choices[choice]!.shows.find((s) => s !== task.side);
      return shown ? de.feedback.missView(shown) : de.feedback.missViewOther;
    }
  }
}

/** Bombing `choice` of `task`: a hit, or the line naming what it hit. */
export function checkBomb(task: TrefferTask, choice: number): BombCheck {
  if (choice < 0 || choice >= task.choices.length) throw new RangeError(`checkBomb: no choice ${choice}`);
  if (task.rightIndexes.includes(choice)) return { hit: true, named: '' };
  return { hit: false, named: missLine(task, choice) };
}
