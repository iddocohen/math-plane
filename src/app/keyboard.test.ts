// Adapted from math-soccer src/app/keyboard.test.ts for the keys of contracts/screens.md.
import { describe, expect, it } from 'vitest';
import { keyToAction, type KeyLike } from './keyboard';

const press = (key: string, extra: Partial<KeyLike> = {}): KeyLike => ({ key, ctrlKey: false, altKey: false, metaKey: false, repeat: false, ...extra });

describe('start screen keys', () => {
  it('1 starts "Treffer" and 2 starts "Bauen und Malen"', () => {
    expect(keyToAction(press('1'), 'start')).toEqual({ type: 'start', mode: 'treffer' });
    expect(keyToAction(press('2'), 'start')).toEqual({ type: 'start', mode: 'bauenMalen' });
  });

  it('a mode with every task kind off does not start', () => {
    expect(keyToAction(press('2'), 'start', { canStart: { bauenMalen: false } })).toBeNull();
    expect(keyToAction(press('1'), 'start', { canStart: { bauenMalen: false } })).toEqual({ type: 'start', mode: 'treffer' });
  });

  it('Enter and Space start the mode of ?start=, "Treffer" without it', () => {
    expect(keyToAction(press('Enter'), 'start')).toEqual({ type: 'start', mode: 'treffer' });
    expect(keyToAction(press(' '), 'start', { enterStart: 'bauenMalen' })).toEqual({ type: 'start', mode: 'bauenMalen' });
    expect(keyToAction(press('Enter', { repeat: true }), 'start')).toBeNull();
  });

  it('K opens the Hangar only when it is on', () => {
    expect(keyToAction(press('k'), 'start', { hangar: true })).toEqual({ type: 'hangar' });
    expect(keyToAction(press('K'), 'start', { hangar: false })).toBeNull();
  });

  it('keys with Ctrl, Alt or Meta stay with the browser', () => {
    for (const mod of ['ctrlKey', 'altKey', 'metaKey'] as const) expect(keyToAction(press('1', { [mod]: true }), 'start')).toBeNull();
  });
});

describe('round keys', () => {
  it('arrows move the marker, Tab switches, Enter and Space select', () => {
    expect(keyToAction(press('ArrowLeft'), 'round')).toEqual({ type: 'arrow', dx: -1, dy: 0 });
    expect(keyToAction(press('ArrowDown'), 'round')).toEqual({ type: 'arrow', dx: 0, dy: 1 });
    expect(keyToAction(press('Tab'), 'round')).toEqual({ type: 'tab', back: false });
    expect(keyToAction(press('Tab', { shiftKey: true }), 'round')).toEqual({ type: 'tab', back: true });
    expect(keyToAction(press('Enter'), 'round')).toEqual({ type: 'select' });
    expect(keyToAction(press(' '), 'round')).toEqual({ type: 'select' });
  });

  it('digits type, Backspace clears, F is "Fertig", H help, Escape pause', () => {
    expect(keyToAction(press('3'), 'round')).toEqual({ type: 'digit', digit: 3 });
    expect(keyToAction(press('Backspace'), 'round')).toEqual({ type: 'backspace' });
    expect(keyToAction(press('f'), 'round')).toEqual({ type: 'done' });
    expect(keyToAction(press('H'), 'round')).toEqual({ type: 'help' });
    expect(keyToAction(press('Escape'), 'round')).toEqual({ type: 'pause' });
    expect(keyToAction(press('x'), 'round')).toBeNull();
  });

  it('start keys do nothing during a round: 1 types a digit', () => {
    expect(keyToAction(press('1'), 'round')).toEqual({ type: 'digit', digit: 1 });
  });
});

describe('pause, round end and Hangar keys', () => {
  it('Enter, Space or Escape go on after a pause', () => {
    for (const key of ['Enter', ' ', 'Escape']) expect(keyToAction(press(key), 'paused')).toEqual({ type: 'resume' });
    expect(keyToAction(press('1'), 'paused')).toBeNull();
  });

  it('Enter or Space play again at the round end, Escape does not', () => {
    expect(keyToAction(press('Enter'), 'roundEnd')).toEqual({ type: 'again' });
    expect(keyToAction(press(' '), 'roundEnd')).toEqual({ type: 'again' });
    expect(keyToAction(press('Escape'), 'roundEnd')).toBeNull();
  });

  it('Escape leaves the Hangar', () => {
    expect(keyToAction(press('Escape'), 'hangar')).toEqual({ type: 'back' });
  });
});
