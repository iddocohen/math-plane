/**
 * Checks an answer (contracts/core-api.md "Tasks"). The RoundController decides hit or miss when the child taps
 * (research R9); these checks say what was hit, so a miss explains itself (FR-010).
 */
import { de } from '../../i18n/de';
import type { FlatShape, Solid } from '../types';
import type { TrefferTask } from './types';

export interface BombCheck {
  hit: boolean;
  /** The German line that names what a miss hit ("Das ist die Kugel."); empty on a hit. */
  named: string;
}

/** The name of a solid or shape with its nominative article: "die Kugel", "das Dreieck". */
export function nominative(task: TrefferTask, choice: number): string {
  if (task.kind === 'koerper') return de.names.solids[task.choices[choice] as Solid].nom;
  return de.names.shapes[task.choices[choice] as FlatShape].nom;
}

/** Bombing `choice` of `task`: a hit, or the line naming what it hit. */
export function checkBomb(task: TrefferTask, choice: number): BombCheck {
  if (choice < 0 || choice >= task.choices.length) throw new RangeError(`checkBomb: no choice ${choice}`);
  if (task.rightIndexes.includes(choice)) return { hit: true, named: '' };
  return { hit: false, named: de.feedback.missNamed(nominative(task, choice)) };
}
