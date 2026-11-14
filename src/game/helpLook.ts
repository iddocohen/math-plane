/**
 * The help step a view draws (FR-033, research R15, core/tasks/help.ts). `HelpLook.of(state)` computes `helpFor` once
 * per task and step and keeps it, so a pointer that depends on the child's state ("Bauen": the first wrong square;
 * "Male an": the first region not filled right) stays where it opened while the child goes on. A new task or a new
 * step computes it again; step 0 is null.
 */
import type { RoundState } from '../core/round/RoundController';
import { helpFor, type HelpMark } from '../core/tasks/help';
import type { Task } from '../core/tasks/types';

export class HelpLook {
  private key = '';
  private mark: HelpMark | null = null;

  /** The mark of the help step open in `state`, or null when the step draws nothing. */
  of(state: RoundState): HelpMark | null {
    const key = `${state.task.id}:${state.helpStep}`;
    if (key !== this.key) {
      this.key = key;
      this.mark = helpFor(state.task as Task, state.taskState, state.helpStep)?.mark ?? null;
    }
    return this.mark;
  }
}

/** The faint alpha of a help drawing: a pointer, or the answer at step 3, which shows more. */
export const HELP_ALPHA = { pointer: 0.3, answer: 0.5 } as const;

/** How fast a target blinks, in play-time milliseconds per full blink. */
export const BLINK_MS = 700;

/** The alpha of a blinking target at play time `ms`: from 1 down to 0.3 and back. */
export function blinkAlpha(ms: number): number {
  return 0.65 + 0.35 * Math.cos((ms / BLINK_MS) * Math.PI * 2);
}
