// Structure adapted from math-soccer src/app/ProgressPage.tsx: tables per mode, level, task kind and side.
/**
 * Parent progress page (FR-048, FR-049, contracts/screens.md "Progress"). Opened from the parent menu, so it sits
 * behind the same gate as the settings. Per mode it shows the current level, a table per level and task kind (tasks
 * solved alone, with help, and whether the kind is "gemeistert"), and a table per side for the view kinds. Then the
 * personal bests as a plain list.
 *
 * "Fortschritt zurücksetzen" asks first and then empties the progress; the personal bests and the stars stay. "Alles
 * zurücksetzen" asks first, reminding the parent to save the data before, then clears progress, personal bests, stars
 * and the Hangar together or not at all; the settings stay.
 */
import { useMemo, useState } from 'react';
import { summarize, type BestRow, type ModeSummary } from '../core/progress/summarize';
import { levelDef } from '../core/tasks/levels';
import { t } from '../i18n';
import type { Persistence } from './persistence';

interface Props {
  persistence: Pick<Persistence, 'progress' | 'records' | 'settings' | 'resetProgress' | 'resetAll'>;
  onClose: () => void;
}

export function ProgressPage({ persistence, onClose }: Props) {
  const P = t().progressPage;
  const [progress, setProgress] = useState(() => persistence.progress());
  const [records, setRecords] = useState(() => persistence.records());
  const [resetNote, setResetNote] = useState<'ok' | 'failed' | null>(null);
  const [allNote, setAllNote] = useState<'ok' | 'failed' | 'partial' | null>(null);
  const settings = persistence.settings();
  const summary = useMemo(() => summarize(progress, records, settings), [progress, records, settings]);

  const reset = () => {
    const ok = persistence.resetProgress().ok;
    setProgress(persistence.progress());
    setResetNote(ok ? 'ok' : 'failed');
  };

  const resetAll = () => {
    const r = persistence.resetAll();
    setProgress(persistence.progress());
    setRecords(persistence.records());
    setAllNote(r.ok ? 'ok' : r.partial ? 'partial' : 'failed');
  };

  const askedReset = () => {
    setResetNote(null);
    setAllNote(null);
  };

  return (
    <div className="settings-page progress-page" role="dialog" aria-modal="true" aria-label={P.title} data-testid="progress-page" lang="de">
      <header className="settings-header">
        <h2>{P.title}</h2>
        <div className="settings-actions">
          <button type="button" onClick={onClose}>
            {P.close}
          </button>
        </div>
      </header>

      <div className="settings-notices" role="status" aria-live="polite">
        {resetNote === 'ok' && <p className="notice">{P.resetDone}</p>}
        {resetNote === 'failed' && <p className="notice warn">{P.resetFailed}</p>}
        {allNote === 'ok' && <p className="notice">{P.resetAllDone}</p>}
        {allNote === 'failed' && <p className="notice warn">{P.resetAllFailed}</p>}
        {allNote === 'partial' && <p className="notice warn">{P.resetAllPartial}</p>}
        {summary.empty && <p className="hint">{P.empty}</p>}
      </div>

      {summary.modes.map((m) => (
        <ModeSection key={m.mode} summary={m} />
      ))}

      <section className="progress-section">
        <h3>{P.bests}</h3>
        {summary.bests.length === 0 ? (
          <p className="hint">{P.noBests}</p>
        ) : (
          <ul className="progress-bests" data-testid="progress-bests">
            {summary.bests.map((b) => (
              <li key={`${b.mode}:${b.length}`} data-mode={b.mode}>
                {P.modes[b.mode]}: {bestLine(b)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="progress-section">
        <ConfirmReset label={P.reset} question={P.resetConfirm} yes={P.resetYes} no={P.resetNo} onAsk={askedReset} onConfirm={reset} />
        <ConfirmReset label={P.resetAll} question={P.resetAllConfirm} yes={P.resetAllYes} no={P.resetNo} onAsk={askedReset} onConfirm={resetAll} />
      </section>
    </div>
  );
}

function bestLine(b: BestRow): string {
  const P = t().progressPage;
  return b.mode === 'treffer' ? P.bestHits(b.best, b.length) : P.bestTasks(b.best, b.length);
}

/** One mode: its current level, the table per level and kind, and the table per side. */
function ModeSection({ summary }: { summary: ModeSummary }) {
  const m = t();
  const P = m.progressPage;
  const { mode, level } = summary;
  return (
    <section className="progress-section" data-testid={`progress-${mode}`} data-level={level ?? ''}>
      <h3>{P.modes[mode]}</h3>
      {level !== null && <p data-testid={`progress-level-${mode}`}>{P.currentLevel(m.levels.label(level, levelDef(mode, level).name))}</p>}
      <table className="progress-table" data-testid={`progress-levels-${mode}`}>
        <thead>
          <tr>
            <th scope="col">{P.columns.level}</th>
            <th scope="col">{P.columns.kind}</th>
            <th scope="col">{P.columns.alone}</th>
            <th scope="col">{P.columns.withHelp}</th>
            <th scope="col">{P.columns.mastered}</th>
          </tr>
        </thead>
        <tbody>
          {summary.levels.map((r) => (
            <tr key={`${r.level}:${r.kind}`} data-level={r.level} data-kind={r.kind}>
              <th scope="row">{m.levels.label(r.level, levelDef(mode, r.level).name)}</th>
              <td>{m.kinds[r.kind]}</td>
              <td>{r.alone}</td>
              <td>{r.withHelp}</td>
              <td>{r.mastered ? P.masteredYes : P.masteredNo}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="progress-table" data-testid={`progress-sides-${mode}`}>
        <thead>
          <tr>
            <th scope="col">{P.columns.kind}</th>
            <th scope="col">{P.columns.side}</th>
            <th scope="col">{P.columns.alone}</th>
            <th scope="col">{P.columns.withHelp}</th>
          </tr>
        </thead>
        <tbody>
          {summary.sides.map((r) => (
            <tr key={`${r.kind}:${r.side}`} data-kind={r.kind} data-side={r.side}>
              <th scope="row">{m.kinds[r.kind]}</th>
              <td>{m.names.sides[r.side]}</td>
              <td>{r.alone}</td>
              <td>{r.withHelp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/**
 * A reset button that asks first (as math-soccer): the button opens the question with "yes" and "no", and "yes" calls
 * onConfirm. onAsk runs when the question opens, so an earlier note goes away.
 */
function ConfirmReset({ label, question, yes, no, onAsk, onConfirm }: { label: string; question: string; yes: string; no: string; onAsk: () => void; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <div className="progress-reset" role="alertdialog" aria-label={label}>
        <p>{question}</p>
        <div className="data-buttons">
          <button
            type="button"
            className="primary"
            onClick={() => {
              onConfirm();
              setConfirming(false);
            }}
          >
            {yes}
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            {no}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="data-buttons">
      <button
        type="button"
        onClick={() => {
          onAsk();
          setConfirming(true);
        }}
      >
        {label}
      </button>
    </div>
  );
}
