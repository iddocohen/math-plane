/**
 * Help in three steps (FR-033, research R15). `helpFor(task, state, step)` says what a help step shows for the task
 * and the child's state: the sentence for the message line and the mark the scene draws.
 *
 * - Step 1: a hint in words; nothing is drawn. Per solid or shape for "Körper finden" and "Formen finden", per side
 *   asked for "Ansicht finden", "Malen" and "Male an", one sentence each for "Bauplan finden" and "Bauen".
 * - Step 2: a pointer. "Treffer": the right target blinks. "Bauen": the first wrong or empty plan square in reading
 *   order shows its number. "Malen": the view appears faintly in the grid. "Male an": the right color shows as a dot
 *   on the first region that is not filled with it.
 * - Step 3: the answer, which the child then places. "Treffer": a big arrow over the right target (it still blinks).
 *   "Bauen": the whole plan faintly. "Malen": the whole view, less faint. "Male an": a color dot on every region and
 *   the empty regions filled faintly.
 *
 * Step 0 shows nothing (null). Steps above 3 show step 3. The pointer of "Bauen" and "Male an" depends on the state,
 * so a view computes it once when the step opens (game/helpLook.ts) and keeps it until the step or the task changes.
 */
import type { Plan } from '../geometry/plan';
import type { Side } from '../types';
import { de } from '../../i18n/de';
import { regionsOf } from './maleAn';
import type { Task } from './types';

/** What a help step draws in the scene. */
export type HelpMark =
  /** "Treffer": the right choices blink (step 2), with a big arrow over them at step 3. Choice indexes, not slots. */
  | { type: 'target'; choices: number[]; arrow: boolean }
  /** "Bauen": the right heights drawn faintly; null where nothing is shown. */
  | { type: 'plan'; heights: (number | null)[][] }
  /** "Malen": the view drawn faintly over the grid; `strong` at step 3. */
  | { type: 'view'; cells: boolean[][]; strong: boolean }
  /** "Male an": a color dot on each region listed; `fill` also fills the empty regions faintly (step 3). */
  | { type: 'regions'; regions: Array<{ index: number; color: string }>; fill: boolean };

export interface HelpView {
  step: 1 | 2 | 3;
  /** The line for the message area; read aloud when "Vorlesen" is on. */
  sentence: string;
  /** Null at step 1. */
  mark: HelpMark | null;
}

/** The plan the child has written so far ("Bauen"), as BauenMalenRules `BauenState` holds it. */
function planInputOf(state: unknown): (number | null)[][] | null {
  const input = (state as { planInput?: unknown } | null)?.planInput;
  return Array.isArray(input) ? (input as (number | null)[][]) : null;
}

/** The colors filled so far ("Male an"), as BauenMalenRules `MaleAnState` holds them. */
function regionColorsOf(state: unknown): (string | null)[] {
  const colors = (state as { regionColors?: unknown } | null)?.regionColors;
  return Array.isArray(colors) ? (colors as (string | null)[]) : [];
}

/** The first square in reading order whose written height is not the plan's; the first square when all are right. */
export function firstWrongSquare(target: Plan, input: (number | null)[][] | null): { row: number; col: number } {
  for (let row = 0; row < target.length; row++) {
    for (let col = 0; col < target[row]!.length; col++) {
      if (input?.[row]?.[col] !== target[row]![col]) return { row, col };
    }
  }
  return { row: 0, col: 0 };
}

function sideSentence(side: Side | undefined): string {
  return de.help.sides[side ?? 'vorn'];
}

function hintSentence(task: Task): string {
  const help = de.help;
  switch (task.kind) {
    case 'koerper':
      return help.solids[task.target];
    case 'formen':
      return help.shapes[task.target];
    case 'bauplanFinden':
      return help.bauplanFinden;
    case 'ansichtFinden':
    case 'malen':
      return sideSentence(task.side);
    case 'maleAn':
      return `${sideSentence(task.side)} ${help.maleAn}`;
    case 'bauen':
      return help.bauen;
  }
}

/** What help step `step` shows for `task` with the child's `state` (the rules' task state); null at step 0. */
export function helpFor(task: Task, state: unknown, step: number): HelpView | null {
  if (!(step >= 1)) return null;
  const s = (step >= 3 ? 3 : Math.floor(step)) as 1 | 2 | 3;
  if (s === 1) return { step: 1, sentence: hintSentence(task), mark: null };
  const help = de.help;
  const answer = s === 3;
  switch (task.kind) {
    case 'koerper':
    case 'formen':
    case 'bauplanFinden':
    case 'ansichtFinden':
      return { step: s, sentence: answer ? help.answerTarget : help.pointerBlink, mark: { type: 'target', choices: [...task.rightIndexes], arrow: answer } };
    case 'bauen': {
      if (answer) return { step: s, sentence: help.answerPlan, mark: { type: 'plan', heights: task.target.map((row) => [...row]) } };
      const at = firstWrongSquare(task.target, planInputOf(state));
      const height = task.target[at.row]![at.col]!;
      const heights = task.target.map((row, r) => row.map((h, c) => (r === at.row && c === at.col ? h : null)));
      return { step: s, sentence: help.pointerCubes(height), mark: { type: 'plan', heights } };
    }
    case 'malen':
      return {
        step: s,
        sentence: answer ? help.answerView : help.pointerView,
        mark: { type: 'view', cells: task.expected.cells.map((row) => [...row]), strong: answer },
      };
    case 'maleAn': {
      const all = regionsOf(task.view)
        .sort((a, b) => a - b)
        .map((index) => ({ index, color: task.building.pieces[index]!.color }));
      if (answer) return { step: s, sentence: help.answerColors, mark: { type: 'regions', regions: all, fill: true } };
      const colors = regionColorsOf(state);
      const one = all.find((r) => colors[r.index] !== r.color) ?? all[0];
      return { step: s, sentence: help.pointerColor, mark: { type: 'regions', regions: one ? [one] : [], fill: false } };
    }
  }
}
