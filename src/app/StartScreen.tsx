// Structure adapted from math-soccer src/app/StartScreen.tsx.
/**
 * Start screen (contracts/screens.md "Start"): the title, and two big buttons "Treffer" (`data-start="treffer"`, key 1)
 * and "Bauen und Malen" (`data-start="bauenMalen"`, key 2), each with the mode's current level name. A mode whose every
 * allowed task kind is off shows a short note instead of its level and does not start (`data-mode-state="empty"`). The
 * keys, and `?start=` in tests, are handled by the app's keyboard listener (keyboard.ts).
 *
 * The gear sits at the top right, next to the fullscreen button, which shows only where the browser lets a page use
 * fullscreen. The parent gate (T059) passes the gear in as `gear`.
 *
 * With the Hangar on (FR-044), a "Hangar" button (K) and the star total (`data-testid="star-total"`) show below the
 * start buttons; with it off, both are hidden.
 *
 * Notices: when stored data was reset on load (`data-testid="start-notice-reset"`), or a save failed during play
 * (`data-testid="start-notice-save"`), a short note shows below the title with "OK" to close it. It never blocks the
 * start buttons or their keys.
 */
import type { ReactNode } from 'react';
import type { Mode } from '../core/types';
import { t } from '../i18n';

/** Asks the browser for fullscreen; a refusal leaves the game as it is. */
export function requestFullscreen(): void {
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen().catch(() => {
    // Some browsers refuse fullscreen; the game still works.
  });
}

/** One start button: its mode, its current level as "Stufe 1: Körper", or null when every kind of the mode is off. */
export interface ModeButton {
  mode: Mode;
  level: string | null;
}

interface Props {
  modes: readonly ModeButton[];
  onStart: (mode: Mode) => void;
  gear?: ReactNode;
  /** The star balance and how to open the Hangar; null when the parent turned the Hangar off. */
  hangar?: { stars: number; onOpen: () => void } | null;
  /** Short notes for the parent, each a list of lines, closed with "OK"; nothing shows when empty. */
  notices?: ReadonlyArray<{ id: string; lines: readonly string[]; onDismiss: () => void }>;
}

const KEY: Record<Mode, string> = { treffer: '1', bauenMalen: '2' };

export function StartScreen({ modes, onStart, gear, hangar = null, notices = [] }: Props) {
  const text = t();
  const canFullscreen = document.fullscreenEnabled === true;
  return (
    <main className="start" lang="de" data-testid="start">
      <div className="top-right">
        {gear}
        {canFullscreen && (
          <button type="button" className="icon-button" aria-label={text.start.fullscreen} onClick={requestFullscreen}>
            <span aria-hidden="true">⛶</span>
          </button>
        )}
      </div>
      <h1 className="start-title">{text.appName}</h1>
      {notices.length > 0 && (
        <div className="start-notices" role="status" aria-live="polite">
          {notices.map((n) => (
            <div key={n.id} className="notice warn" data-testid={`start-notice-${n.id}`}>
              {n.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <button type="button" className="secondary-button" onClick={n.onDismiss}>
                {text.start.dismiss}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="start-buttons">
        {modes.map(({ mode, level }) => (
          <button
            key={mode}
            type="button"
            className={`start-button start-${mode}`}
            data-start={mode}
            data-mode-state={level === null ? 'empty' : 'ready'}
            aria-keyshortcuts={KEY[mode]}
            aria-disabled={level === null ? 'true' : undefined}
            onClick={() => {
              if (level !== null) onStart(mode);
            }}
          >
            {text.start[mode]}
            <small className="start-level">{level ?? text.start.modeEmpty}</small>
            <span className="start-key" aria-hidden="true">
              {KEY[mode]}
            </span>
          </button>
        ))}
      </div>
      {hangar && (
        <div className="start-hangar">
          <span className="star-total" data-testid="star-total" aria-label={text.start.starsLabel(hangar.stars)}>
            {text.start.stars(hangar.stars)}
          </span>
          <button type="button" data-testid="open-hangar" aria-keyshortcuts="K" onClick={hangar.onOpen}>
            {text.start.hangar}
            <span className="start-key" aria-hidden="true">
              {' '}
              K
            </span>
          </button>
        </div>
      )}
    </main>
  );
}
