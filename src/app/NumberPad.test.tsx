// Copied from math-soccer src/app/NumberPad.test.tsx (which copied it from math-tank): keys 0 to 4, ⌫ and "Fertig"
// instead of 0 to 9, ⌫ and the shoot key. The automatic setting is tested in src/core/view/screen.test.ts and
// src/app/useScreen.test.ts.
/**
 * FR-011: the on-screen number pad. Its keys act like the keyboard's digits, Backspace and F, never take focus, and are
 * at least 48 by 48 CSS pixels through the class `pad-key`.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '../i18n';
import { NumberPad } from './NumberPad';

function setup(over: { disabled?: boolean } = {}) {
  const onDigit = vi.fn();
  const onBackspace = vi.fn();
  const onDone = vi.fn();
  render(<NumberPad disabled={over.disabled ?? false} onDigit={onDigit} onBackspace={onBackspace} onDone={onDone} />);
  return { onDigit, onBackspace, onDone };
}

const key = (k: string) => screen.getByTestId('number-pad').querySelector(`[data-key="${k}"]`) as HTMLButtonElement | null;

afterEach(cleanup);

describe('NumberPad (FR-011)', () => {
  it('has the keys 0 to 4, ⌫ and "Fertig", and no 5 to 9', () => {
    setup();
    const keys = screen.getAllByTestId('pad-key').map((b) => b.getAttribute('data-key'));
    expect(keys).toEqual(['0', '1', '2', '3', '4', 'backspace', 'done']);
    for (const d of ['5', '6', '7', '8', '9']) expect(key(d)).toBeNull();
    expect(key('backspace')!.getAttribute('aria-label')).toBe(t().round.numberPad.delete);
    expect(key('done')!.textContent).toBe(t().round.done);
  });

  it('taps type digits, ⌫ deletes and "Fertig" checks, like the keyboard', () => {
    const { onDigit, onBackspace, onDone } = setup();
    fireEvent.click(key('4')!);
    fireEvent.click(key('0')!);
    fireEvent.click(key('backspace')!);
    fireEvent.click(key('done')!);
    expect(onDigit.mock.calls).toEqual([[4], [0]]);
    expect(onBackspace).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('keys never take focus and carry the pad-key class (48 by 48 CSS pixels at least)', () => {
    setup();
    for (const b of screen.getAllByTestId('pad-key')) {
      expect(b.getAttribute('tabindex')).toBe('-1');
      expect(b.classList.contains('pad-key')).toBe(true);
      expect(b.getAttribute('type')).toBe('button');
    }
  });

  it('disabled keys do nothing', () => {
    const { onDigit, onDone } = setup({ disabled: true });
    fireEvent.click(key('3')!);
    fireEvent.click(key('done')!);
    expect(key('3')!.disabled).toBe(true);
    expect(onDigit).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
