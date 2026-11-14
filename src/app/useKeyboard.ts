// Adapted from math-soccer src/app/useKeyboard.ts.
/**
 * One `keydown` listener on window. keyToAction decides what a key does on the current screen; handled keys call
 * preventDefault so the page does not scroll and no focused button is clicked. `screen` null means keys do nothing.
 * The listener is attached in a layout effect, before the browser paints, so a key pressed as soon as the start
 * screen shows is not lost.
 */
import { useLayoutEffect, useRef } from 'react';
import type { RoundController } from '../core/round/RoundController';
import type { SceneKey } from '../game/taskViews';
import { keyToAction, type KeyAction, type KeyContext, type KeyScreen } from './keyboard';

export interface KeyboardOptions extends KeyContext {
  screen: KeyScreen | null;
  onAction: (action: KeyAction) => void;
}

export function useKeyboard(options: KeyboardOptions): void {
  const latest = useRef(options);
  latest.current = options;

  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { screen, onAction, ...context } = latest.current;
      if (screen === null || isTextField(event.target)) return;
      const action = keyToAction(event, screen, context);
      if (action === null) return;
      event.preventDefault();
      onAction(action);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

/**
 * Round actions: "Fertig", help and pause go to the controller; the marker keys go to the scene's task views
 * (`sceneKey`). Returns false for actions the round does not handle (start, again, back).
 */
export function applyRoundAction(controller: RoundController, sceneKey: (k: SceneKey) => void, action: KeyAction): boolean {
  switch (action.type) {
    case 'arrow':
    case 'tab':
    case 'select':
    case 'digit':
    case 'backspace':
      sceneKey(action);
      return true;
    case 'done':
      controller.done();
      return true;
    case 'help':
      controller.help();
      return true;
    case 'pause':
      controller.pause();
      return true;
    case 'resume':
      controller.resume();
      return true;
    case 'start':
    case 'hangar':
    case 'back':
    case 'again':
      return false;
  }
}

/** Parent screens have text fields; typing there must not reach the game. */
function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
}
