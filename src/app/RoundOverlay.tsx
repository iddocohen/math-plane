// Structure adapted from math-soccer src/app/MatchOverlay.tsx.
/**
 * The React overlay over the round scene (contracts/screens.md "Round"). The top bar has the home button ("Zum
 * Start"), the banner (`data-testid="banner"`), the yellow "?" help button, the Hangar icon (with the Hangar on), the
 * pause button, the fullscreen button and the gear. Below the banner is the message line (`data-testid="message"`).
 * At the bottom: the bomb bay in "Treffer" (`data-testid="bombs"`) or the task counter "Aufgabe 2 von 5", the clock
 * when "Uhr zeigen" is on, and "Fertig" (`data-testid="done"`) in "Bauen und Malen". `children` is the place for the
 * number pad (T048) and the color row (T053).
 *
 * `data-testid="round"` carries the state for tests (`roundData`): `data-mode`, `data-phase`, `data-kind`,
 * `data-level`, `data-side`, `data-help`, `data-misses`, `data-bombs-left`, `data-hits`, `data-tasks-done`,
 * `data-answer` (filled only with `?test=1`), `data-slots`, `data-marked` and `data-number-pad`.
 *
 * Buttons never take focus, so Enter and Space keep going to the game.
 */
import type { ReactNode } from 'react';
import type { RoundController, RoundState } from '../core/round/RoundController';
import type { ModeRules } from '../core/round/rules';
import { t } from '../i18n';
import { noFocus } from './noFocus';
import { requestFullscreen } from './StartScreen';
import { useElapsedMs } from './useController';

/** The data attributes of the round element (contracts/screens.md "Round" and "Test hooks"). */
export function roundData(state: RoundState, rules: ModeRules, options: { test: boolean; numberPad: boolean }): Record<string, string> {
  const answer = options.test ? (rules.answer?.(state.task, state.taskState) ?? '') : '';
  return {
    'data-mode': state.mode,
    'data-phase': state.phase,
    'data-kind': state.task.kind,
    'data-level': String(state.task.level),
    'data-side': state.task.side ?? '',
    'data-help': String(state.helpStep),
    'data-misses': String(state.misses),
    'data-bombs-left': String(state.bombsLeft),
    'data-hits': String(state.hits),
    'data-tasks-done': String(state.tasksDone),
    'data-answer': answer,
    'data-slots': rules.mode === 'treffer' ? rules.slots(state.taskState).join(',') : '',
    'data-marked': state.marked.join(' '),
    'data-number-pad': String(options.numberPad && state.task.kind === 'bauen'),
  };
}

function Clock({ controller }: { controller: RoundController }) {
  const ms = useElapsedMs(controller);
  return (
    <span className="round-clock" data-testid="clock">
      {t().roundEnd.time(ms)}
    </span>
  );
}

/** The bombs of the round as small bombs, the ones used faded, and "7 Bomben übrig" for screen readers. */
function BombBay({ left, total }: { left: number; total: number }) {
  const label = t().round.bombsLeft(left);
  return (
    <div className="bomb-bay" data-testid="bombs" data-left={left} role="status" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < left ? 'bomb' : 'bomb used'} aria-hidden="true" />
      ))}
      <span className="bomb-count" aria-hidden="true">
        {left}
      </span>
    </div>
  );
}

interface Props {
  controller: RoundController;
  state: RoundState;
  rules: ModeRules;
  banner: string;
  message: string | null;
  test: boolean;
  numberPad: boolean;
  showClock: boolean;
  /** Opens the Hangar over the round; null when the Hangar is off. */
  onHangar: (() => void) | null;
  onPause: () => void;
  onHome: () => void;
  gear?: ReactNode;
  children?: ReactNode;
}

export function RoundOverlay({ controller, state, rules, banner, message, test, numberPad, showClock, onHangar, onPause, onHome, gear, children }: Props) {
  const text = t().round;
  const canFullscreen = document.fullscreenEnabled === true;
  const taskNumber = Math.min(state.tasksDone + 1, state.tasksTotal);
  return (
    <div className="round-overlay" data-testid="round" lang="de" {...roundData(state, rules, { test, numberPad })}>
      <div className="round-top">
        <button type="button" className="pill-button" data-testid="home" {...noFocus} onClick={onHome}>
          <span aria-hidden="true">⌂ </span>
          {text.home}
        </button>
        <div className="banner" data-testid="banner">
          {banner}
        </div>
        <button type="button" className="help-button" data-testid="help" aria-label={text.help} aria-keyshortcuts="H" {...noFocus} onClick={() => controller.help()}>
          ?
        </button>
        {onHangar && (
          <button type="button" className="icon-button" data-testid="round-hangar" aria-label={text.hangar} {...noFocus} onClick={onHangar}>
            <span aria-hidden="true">✈</span>
          </button>
        )}
        <button type="button" className="icon-button" data-testid="pause" aria-label={text.pause} aria-keyshortcuts="Escape" {...noFocus} onClick={onPause}>
          <span aria-hidden="true">❚❚</span>
        </button>
        {canFullscreen && (
          <button type="button" className="icon-button" aria-label={text.fullscreen} {...noFocus} onClick={requestFullscreen}>
            <span aria-hidden="true">⛶</span>
          </button>
        )}
        {gear}
      </div>
      <p className={message ? 'message on' : 'message'} data-testid="message" role="status" aria-live="polite">
        {message ?? ''}
      </p>
      <div className="round-bottom">
        {state.mode === 'treffer' ? (
          <BombBay left={state.bombsLeft} total={state.bombsTotal} />
        ) : (
          <span className="task-counter" data-testid="task-counter">
            {text.taskOf(taskNumber, state.tasksTotal)}
          </span>
        )}
        {showClock && <Clock controller={controller} />}
        {children}
        {state.mode === 'bauenMalen' && (
          <button type="button" className="done-button" data-testid="done" aria-keyshortcuts="F" {...noFocus} onClick={() => controller.done()}>
            {text.done}
          </button>
        )}
      </div>
    </div>
  );
}
