// Copied from math-soccer src/app/NumberPad.tsx (which copied it from math-tank). Keys 0 to 4 only (a stack has 0 to 4
// cubes); a "Fertig" key takes the place of math-soccer's shoot key. Whether the pad shows is decided in
// src/core/view/screen.ts and src/app/useScreen.ts.
/**
 * On-screen number pad (FR-011) for "Bauen": keys 0 to 4, ⌫ and "Fertig". Each key does what the keyboard does: digits
 * and Backspace go to the scene like the keys (`onDigit`, `onBackspace`), "Fertig" like F (`onDone`).
 *
 * Keys never take focus (tabIndex -1, mousedown default prevented), so a physical keyboard keeps working next to the
 * pad. The pad is one row across the bottom of the round, where the field leaves room.
 */
import type { ReactNode } from 'react';
import { t } from '../i18n';
import { noFocus } from './noFocus';

/** The digits of the pad: the heights a stack can have. */
export const PAD_DIGITS = [0, 1, 2, 3, 4] as const;
export type PadDigit = (typeof PAD_DIGITS)[number];

interface Props {
  /** True while the child cannot write (the task is solved, pause, round end). */
  disabled: boolean;
  onDigit: (d: PadDigit) => void;
  onBackspace: () => void;
  onDone: () => void;
}

export function NumberPad({ disabled, onDigit, onBackspace, onDone }: Props) {
  const r = t().round;
  return (
    <div className="number-pad" data-testid="number-pad" role="group" aria-label={r.numberPad.label}>
      {PAD_DIGITS.map((d) => (
        <PadKey key={d} name={String(d)} disabled={disabled} onPress={() => onDigit(d)}>
          {d}
        </PadKey>
      ))}
      <PadKey name="backspace" label={r.numberPad.delete} disabled={disabled} onPress={onBackspace}>
        ⌫
      </PadKey>
      <PadKey name="done" disabled={disabled} onPress={onDone}>
        {r.done}
      </PadKey>
    </div>
  );
}

function PadKey({ name, label, disabled, onPress, children }: { name: string; label?: string; disabled: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`pad-key pad-key-${name}`}
      data-testid="pad-key"
      data-key={name}
      aria-label={label}
      aria-keyshortcuts={name === 'done' ? 'F' : undefined}
      disabled={disabled}
      {...noFocus}
      onKeyDown={(e) => e.preventDefault()}
      onClick={onPress}
    >
      {children}
    </button>
  );
}
