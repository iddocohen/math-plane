import { describe, expect, it } from 'vitest';
import type { RoundState } from '../core/round/RoundController';
import type { BauenTask } from '../core/tasks/types';
import { blinkAlpha, HelpLook } from './helpLook';

const bauen: BauenTask = { id: 't-1', seed: 1, kind: 'bauen', mode: 'bauenMalen', level: 1, target: [[2, 1], [3, 1]], color: '#e0413a' };

function state(over: { task?: BauenTask; planInput: (number | null)[][]; helpStep: number }): RoundState {
  return { task: over.task ?? bauen, taskState: { planInput: over.planInput }, helpStep: over.helpStep } as unknown as RoundState;
}

describe('HelpLook', () => {
  it('keeps the pointer where the step opened while the child writes, and moves it with the next step or task', () => {
    const look = new HelpLook();
    expect(look.of(state({ planInput: [[null, null], [null, null]], helpStep: 0 }))).toBeNull();
    const two = look.of(state({ planInput: [[null, null], [null, null]], helpStep: 2 }));
    expect(two).toEqual({ type: 'plan', heights: [[2, null], [null, null]] });
    // The child writes the square: the pointer stays on it.
    expect(look.of(state({ planInput: [[2, null], [null, null]], helpStep: 2 }))).toEqual(two);
    expect(look.of(state({ planInput: [[2, null], [null, null]], helpStep: 3 }))).toEqual({ type: 'plan', heights: bauen.target });
    // A new task with the same step computes it again.
    expect(look.of(state({ task: { ...bauen, id: 't-2' }, planInput: [[2, null], [null, null]], helpStep: 2 }))).toEqual({ type: 'plan', heights: [[null, 1], [null, null]] });
  });
});

describe('blinkAlpha', () => {
  it('goes from 1 down to 0.3 and back', () => {
    expect(blinkAlpha(0)).toBeCloseTo(1);
    expect(blinkAlpha(350)).toBeCloseTo(0.3);
    expect(blinkAlpha(700)).toBeCloseTo(1);
  });
});
