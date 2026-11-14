// Adapted from math-soccer src/app/keyboard.ts: the keys of contracts/screens.md.
/**
 * Keyboard map per screen (contracts/screens.md "Screens" and "Keys during a round"). Pure: keyToAction turns one key
 * event into an action for the current screen, or null when the key does nothing there.
 *
 * - Start screen: 1 starts "Treffer", 2 starts "Bauen und Malen", each only while its mode has a task kind allowed;
 *   Enter or Space start the mode of `?start=` (tests), "Treffer" without it; K opens the Hangar when it is on.
 * - Round: arrow keys move the marker, Tab switches between outlines and colors (Shift+Tab back), Enter or Space drop a
 *   bomb or color the marked place, digits type a height, Backspace clears it, F is "Fertig", H help, Escape pause.
 * - Paused: Enter, Space or Escape go on. Round end: Enter or Space play again. Hangar: Escape goes back.
 *
 * Keys with Ctrl, Alt or Meta stay with the browser, held Enter and Space do not repeat, and no key opens the parent
 * gate.
 */
import type { Mode } from '../core/types';

/** The fields of a KeyboardEvent the map reads. */
export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  shiftKey?: boolean;
  repeat: boolean;
}

export type KeyScreen = 'start' | 'round' | 'paused' | 'roundEnd' | 'hangar';

export type KeyAction =
  | { type: 'start'; mode: Mode }
  | { type: 'hangar' }
  | { type: 'back' }
  | { type: 'arrow'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  | { type: 'tab'; back: boolean }
  | { type: 'select' }
  | { type: 'digit'; digit: number }
  | { type: 'backspace' }
  | { type: 'done' }
  | { type: 'help' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'again' };

export interface KeyContext {
  /** The modes that can start now: a mode whose every task kind is off cannot. Both by default. */
  canStart?: Partial<Record<Mode, boolean>>;
  /** The parent's Hangar setting: K opens it only when it is on. */
  hangar?: boolean;
  /** What Enter and Space start on the start screen (`?start=` in tests). */
  enterStart?: Mode;
}

const ARROWS: Record<string, { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }> = {
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
};

export function keyToAction(event: KeyLike, screen: KeyScreen, context: KeyContext = {}): KeyAction | null {
  if (event.ctrlKey || event.altKey || event.metaKey) return null;
  const { key } = event;
  const isEnter = key === 'Enter';
  const isSpace = key === ' ' || key === 'Spacebar';
  if ((isEnter || isSpace) && event.repeat) return null;
  const can = (mode: Mode) => context.canStart?.[mode] ?? true;

  switch (screen) {
    case 'start': {
      if (event.repeat) return null;
      const mode: Mode | null = isEnter || isSpace ? (context.enterStart ?? 'treffer') : key === '1' ? 'treffer' : key === '2' ? 'bauenMalen' : null;
      if (mode !== null) return can(mode) ? { type: 'start', mode } : null;
      return (key === 'k' || key === 'K') && context.hangar === true ? { type: 'hangar' } : null;
    }
    case 'hangar':
      return key === 'Escape' ? { type: 'back' } : null;
    case 'paused':
      return isEnter || isSpace || key === 'Escape' ? { type: 'resume' } : null;
    case 'roundEnd':
      return isEnter || isSpace ? { type: 'again' } : null;
    case 'round': {
      const arrow = ARROWS[key];
      if (arrow) return { type: 'arrow', ...arrow };
      if (key === 'Tab') return { type: 'tab', back: event.shiftKey === true };
      if (isEnter || isSpace) return { type: 'select' };
      if (/^[0-9]$/.test(key)) return { type: 'digit', digit: Number(key) };
      if (key === 'Backspace') return { type: 'backspace' };
      if (key === 'f' || key === 'F') return event.repeat ? null : { type: 'done' };
      if (key === 'h' || key === 'H') return event.repeat ? null : { type: 'help' };
      if (key === 'Escape') return { type: 'pause' };
      return null;
    }
  }
}
