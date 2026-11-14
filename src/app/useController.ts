// Adapted from math-soccer src/app/useController.ts.
/**
 * React bridge to the RoundController (research R2). `useRoundState` re-renders on every controller event, not on the
 * passing of time, so the round does not re-render the whole app every frame; `useElapsedMs` gives the time to the
 * clock alone, which reads it a few times a second.
 *
 * The controller's `state()` makes a new object on every call, so the bridge keeps one snapshot per event.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { RoundController, RoundState } from '../core/round/RoundController';

/** The controller's state, new after every event. */
export function useRoundState(controller: RoundController): RoundState {
  const cache = useRef<{ controller: RoundController; state: RoundState } | null>(null);
  const subscribe = useCallback(
    (onChange: () => void) =>
      controller.subscribe(() => {
        cache.current = { controller, state: controller.state() };
        onChange();
      }),
    [controller],
  );
  const getSnapshot = useCallback(() => {
    if (cache.current === null || cache.current.controller !== controller) cache.current = { controller, state: controller.state() };
    return cache.current.state;
  }, [controller]);
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** How often the clock reads the time played. */
export const CLOCK_TICK_MS = 250;

/** The time played, re-rendering only the component that shows it, every CLOCK_TICK_MS. */
export function useElapsedMs(controller: RoundController): number {
  const [ms, setMs] = useState(() => controller.state().elapsedMs);
  useEffect(() => {
    const id = setInterval(() => setMs(controller.state().elapsedMs), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, [controller]);
  return ms;
}
