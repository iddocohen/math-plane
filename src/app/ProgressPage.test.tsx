// Structure adapted from math-soccer src/app/ProgressPage.test.tsx.
/**
 * Progress page (T062, FR-048, FR-049): per mode the current level, a table per level and kind, a table per side, the
 * personal bests, and two resets that ask first.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultSettings } from '../core/settings/defaults';
import { memoryKeyValue } from '../core/storage/keyValue';
import { emptyHangar, emptyProgress, emptyRecords, type AttemptRecord } from '../core/storage/schemas';
import { HANGAR_KEY, loadHangar, loadProgress, loadRecords, saveHangar, saveRecords, SETTINGS_KEY } from '../core/storage/storage';
import { t } from '../i18n';
import { createPersistence } from './persistence';
import { ProgressPage } from './ProgressPage';

const P = t().progressPage;

function attempt(extra: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    mode: 'treffer',
    kind: 'koerper',
    level: 1,
    outcome: 'alone',
    helpStep: 0,
    misses: 0,
    ms: 4000,
    at: '2026-11-14T12:00:00.000Z',
    ...extra,
  };
}

function setup() {
  const kv = memoryKeyValue();
  saveHangar(kv, { ...emptyHangar(), stars: 12 });
  const records = emptyRecords();
  records.best['treffer:10'] = 7;
  records.best['bauenMalen:5'] = 3;
  saveRecords(kv, records);
  const persistence = createPersistence(kv);
  persistence.recordAttempt(attempt(), defaultSettings());
  persistence.recordAttempt(attempt({ outcome: 'withHelp', helpStep: 2 }), defaultSettings());
  persistence.recordAttempt(attempt({ mode: 'bauenMalen', kind: 'malen', level: 3, side: 'oben', outcome: 'withHelp', helpStep: 1 }), defaultSettings());
  render(<ProgressPage persistence={persistence} onClose={() => {}} />);
  return { kv };
}

const cells = (row: Element) => [...row.children].map((c) => c.textContent);

afterEach(cleanup);

describe('ProgressPage (T062)', () => {
  it('shows the current level of each mode', () => {
    setup();
    expect(screen.getByTestId('progress-level-treffer').textContent).toBe('Stufe jetzt: Stufe 1: Körper');
    expect(screen.getByTestId('progress-level-bauenMalen').textContent).toBe('Stufe jetzt: Stufe 1: Kleine Baupläne');
  });

  it('shows per level and kind the tasks solved alone and with help, and "gemeistert"', () => {
    setup();
    const table = screen.getByTestId('progress-levels-treffer');
    const headers = [...table.querySelectorAll('th[scope="col"]')].map((h) => h.textContent);
    expect(headers).toEqual(['Stufe', 'Aufgabe', 'allein', 'mit Hilfe', 'gemeistert']);
    expect(cells(table.querySelector('tr[data-level="1"]')!)).toEqual(['Stufe 1: Körper', 'Körper finden', '1', '1', P.masteredNo]);
    expect(cells(table.querySelector('tr[data-level="2"]')!)).toEqual(['Stufe 2: Formen', 'Formen finden', '0', '0', P.masteredNo]);
    const bm = screen.getByTestId('progress-levels-bauenMalen');
    expect(cells(bm.querySelector('tr[data-level="3"]')!)).toEqual(['Stufe 3: Vorn und oben', 'Malen', '0', '1', P.masteredNo]);
    expect(bm.querySelectorAll('tr[data-level="5"]')).toHaveLength(2);
  });

  it('shows per side the view tasks solved alone and with help', () => {
    setup();
    const table = screen.getByTestId('progress-sides-bauenMalen');
    expect(cells(table.querySelector('tr[data-kind="malen"][data-side="oben"]')!)).toEqual(['Malen', 'oben', '0', '1']);
    expect(cells(table.querySelector('tr[data-kind="maleAn"][data-side="links"]')!)).toEqual(['Male an', 'links', '0', '0']);
    expect(screen.getByTestId('progress-sides-treffer').querySelectorAll('tbody tr')).toHaveLength(4);
  });

  it('lists the personal bests', () => {
    setup();
    const lines = [...screen.getByTestId('progress-bests').querySelectorAll('li')].map((li) => li.textContent);
    expect(lines).toEqual(['Treffer: 7 Treffer mit 10 Bomben', 'Bauen und Malen: 3 von 5 Aufgaben allein']);
  });

  it('asks before resetting, then empties the progress and keeps the stars and the bests', () => {
    const { kv } = setup();
    fireEvent.click(screen.getByRole('button', { name: P.reset }));
    expect(screen.getByRole('alertdialog').textContent).toContain(P.resetConfirm);
    fireEvent.click(screen.getByRole('button', { name: P.resetNo }));
    expect(loadProgress(kv).value.attempts).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: P.reset }));
    fireEvent.click(screen.getByRole('button', { name: P.resetYes }));
    expect(loadProgress(kv).value).toEqual(emptyProgress());
    expect(loadHangar(kv).value.stars).toBe(12);
    expect(screen.getByText(P.resetDone)).toBeTruthy();
    expect(screen.getByText(P.empty)).toBeTruthy();
    expect(screen.getByTestId('progress-bests')).toBeTruthy();
  });

  it('"Alles zurücksetzen" asks first with a reminder to save, then clears progress, bests and stars; the settings stay', () => {
    const { kv } = setup();
    kv.set(SETTINGS_KEY, JSON.stringify(defaultSettings()));
    const settingsBefore = kv.get(SETTINGS_KEY);
    fireEvent.click(screen.getByRole('button', { name: P.resetAll }));
    const question = screen.getByRole('alertdialog').textContent!;
    expect(question).toContain(P.resetAllConfirm);
    expect(question).toContain('sichert ihn vorher');
    fireEvent.click(screen.getByRole('button', { name: P.resetNo }));
    expect(loadHangar(kv).value.stars).toBe(12);

    fireEvent.click(screen.getByRole('button', { name: P.resetAll }));
    fireEvent.click(screen.getByRole('button', { name: P.resetAllYes }));
    expect(loadProgress(kv).value.attempts).toHaveLength(0);
    expect(JSON.parse(kv.get(HANGAR_KEY)!)).toEqual(emptyHangar());
    expect(loadRecords(kv).value).toEqual(emptyRecords());
    expect(kv.get(SETTINGS_KEY)).toBe(settingsBefore);
    expect(screen.getByText(P.resetAllDone)).toBeTruthy();
    expect(screen.getByText(P.empty)).toBeTruthy();
    expect(screen.getByText(P.noBests)).toBeTruthy();
  });

  it('"Alles zurücksetzen" that stored only part says so, not that nothing changed', () => {
    const persistence = { ...createPersistence(memoryKeyValue()), resetAll: () => ({ ok: false, partial: true }) };
    render(<ProgressPage persistence={persistence} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: P.resetAll }));
    fireEvent.click(screen.getByRole('button', { name: P.resetAllYes }));
    expect(screen.getByText(P.resetAllPartial)).toBeTruthy();
    expect(screen.queryByText(P.resetAllFailed)).toBeNull();
  });
});
