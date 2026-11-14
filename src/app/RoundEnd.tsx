// Structure adapted from math-soccer src/app/RoundEnd.tsx.
/**
 * Round end (contracts/screens.md "Round end", FR-037, FR-038): the result, "8 Treffer mit 10 Bomben" in "Treffer" or
 * "5 Aufgaben geschafft" in "Bauen und Malen", an encouraging line, and the personal best when the parent left
 * "Rekorde zeigen" on: "Neuer Rekord!", or "Dein Rekord: 9" in small neutral text. Nothing compares the numbers and
 * nothing says "verloren". With the Hangar on, the stars earned in the round show as "+6 Sterne"; with "Uhr zeigen" on,
 * the time of the round.
 *
 * "Nochmal" (or Enter or Space, through the app's keyboard listener) starts a new round of the same mode without a
 * page reload; "Zurück" goes back to the start screen. When a new version waits, a short neutral line says so
 * (`data-testid="update-note"`); "Zurück" and "Nochmal" then apply it (swUpdate.ts).
 */
import type { Mode } from '../core/types';
import { t } from '../i18n';

export interface RoundRecord {
  newRecord: boolean;
  /** The best for this mode and round length after the round, or null when there is none. */
  best: number | null;
}

interface Props {
  mode: Mode;
  /** "Treffer": the hits and the bombs of the round. */
  hits: number;
  bombs: number;
  /** "Bauen und Malen": the tasks finished. */
  tasksDone: number;
  /** The personal best, or null when records are not shown. */
  record: RoundRecord | null;
  /** Stars earned in the round, or null when the Hangar is off. */
  stars?: number | null;
  /** The time of the round, or null when the clock is off. */
  elapsedMs?: number | null;
  /** Which encouraging line shows (an index into the lines). */
  cheer?: number;
  /** A new version waits and applies on "Zurück" or "Nochmal". */
  updateWaiting?: boolean;
  onAgain: () => void;
  onBack: () => void;
}

export function RoundEnd({ mode, hits, bombs, tasksDone, record, stars = null, elapsedMs = null, cheer = 0, updateWaiting = false, onAgain, onBack }: Props) {
  const text = t().roundEnd;
  const result = mode === 'treffer' ? text.hitsSummary(hits, bombs) : text.tasksSummary(tasksDone);
  const heading = text.cheer[((cheer % text.cheer.length) + text.cheer.length) % text.cheer.length]!;
  return (
    <div className="round-end" data-testid="round-end" data-mode={mode} role="dialog" aria-modal="true" aria-label={heading}>
      <h2>{heading}</h2>
      <p className="round-result" data-testid="round-result">
        {result}
      </p>
      {elapsedMs !== null && (
        <p className="round-time" data-testid="round-time">
          {text.time(elapsedMs)}
        </p>
      )}
      {stars !== null && (
        <p className="round-stars" data-testid="round-stars">
          {text.stars(stars)}
        </p>
      )}
      {record?.newRecord ? (
        <p className="new-record" data-testid="new-record">
          {text.newRecord}
        </p>
      ) : record?.best != null ? (
        <p className="record" data-testid="record">
          {text.record(record.best)}
        </p>
      ) : null}
      {updateWaiting && (
        <p className="update-note" data-testid="update-note">
          {text.updateWaiting}
        </p>
      )}
      <div className="round-end-buttons">
        <button type="button" className="primary" aria-keyshortcuts="Enter Space" onClick={onAgain}>
          {text.again}
        </button>
        <button type="button" onClick={onBack}>
          {text.back}
        </button>
      </div>
    </div>
  );
}
