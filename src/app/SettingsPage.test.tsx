// Structure adapted from math-soccer src/app/SettingsPage.test.tsx.
/**
 * Settings page (T060, T061, FR-051, FR-053): every group, the level selects per mode kept in order, Save disabled
 * while invalid with errors next to the fields, saving through persistence, the data group with "Daten sichern",
 * "Daten laden" and "QR-Code", "Kopie wiederherstellen", and the build version.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../core/settings/defaults';
import { exportData } from '../core/storage/exportImport';
import { memoryKeyValue } from '../core/storage/keyValue';
import { emptyHangar, emptyProgress, emptyRecords } from '../core/storage/schemas';
import { HANGAR_KEY, loadSettings } from '../core/storage/storage';
import { t } from '../i18n';
import { createPersistence } from './persistence';
import { orderedRange, SettingsPage } from './SettingsPage';

const S = t().settings;
const L = S.labels;

function setup() {
  const kv = memoryKeyValue();
  const persistence = createPersistence(kv);
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(<SettingsPage persistence={persistence} onSaved={onSaved} onClose={onClose} now={() => new Date('2026-11-14T12:00:00')} />);
  return { kv, persistence, onSaved, onClose };
}

const saveButton = () => screen.getByRole('button', { name: S.save }) as HTMLButtonElement;
const group = (name: string) => screen.getByRole('group', { name });
const legends = () => [...document.querySelectorAll('fieldset.settings-group > legend')].map((l) => l.textContent);

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SettingsPage (T060, FR-051)', () => {
  it('shows the eight groups in order and the build version', () => {
    setup();
    expect(legends()).toEqual(['Stufen', 'Themen', 'Gebäude', 'Runde', 'Ton', 'Bedienung', 'Hangar', 'Daten']);
    expect(screen.getByTestId('build-version').textContent).toMatch(/^Version .+ vom .+$/);
  });

  it('"Stufen" has per mode "Stufe am Anfang" and "Schwerste Stufe" with the level names, and the adaptive switch', () => {
    setup();
    const treffer = group('Treffer');
    const start = within(treffer).getByLabelText(L.startLevel) as HTMLSelectElement;
    const hardest = within(treffer).getByLabelText(L.hardestLevel) as HTMLSelectElement;
    expect([...start.options].map((o) => o.textContent)).toEqual([
      'Stufe 1: Körper',
      'Stufe 2: Formen',
      'Stufe 3: Baupläne finden',
      'Stufe 4: Ansichten vorn und oben',
      'Stufe 5: Alle Seiten',
    ]);
    expect([start.value, hardest.value]).toEqual(['1', '5']);
    const bm = within(group('Bauen und Malen')).getByLabelText(L.startLevel) as HTMLSelectElement;
    expect(bm.options[1]!.textContent).toBe('Stufe 2: Große Baupläne');
    expect((within(group('Stufen')).getByLabelText(L.adaptive) as HTMLInputElement).checked).toBe(true);
  });

  it('saves start level 3 for "Treffer" and hands the settings to the app', () => {
    const { kv, onSaved } = setup();
    fireEvent.change(within(group('Treffer')).getByLabelText(L.startLevel), { target: { value: '3' } });
    fireEvent.click(saveButton());
    expect(loadSettings(kv).value.levels.treffer).toEqual({ start: 3, hardest: 5 });
    expect(loadSettings(kv).value.levels.bauenMalen).toEqual({ start: 1, hardest: 5 });
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ levels: { treffer: { start: 3, hardest: 5 }, bauenMalen: { start: 1, hardest: 5 } } }));
    expect(screen.getByText(S.saved)).toBeTruthy();
  });

  it('keeps the start and the hardest level in order', () => {
    const { kv } = setup();
    const treffer = group('Treffer');
    const start = within(treffer).getByLabelText(L.startLevel) as HTMLSelectElement;
    const hardest = within(treffer).getByLabelText(L.hardestLevel) as HTMLSelectElement;
    fireEvent.change(hardest, { target: { value: '2' } });
    fireEvent.change(start, { target: { value: '4' } });
    expect([start.value, hardest.value]).toEqual(['4', '4']);
    fireEvent.change(hardest, { target: { value: '3' } });
    expect([start.value, hardest.value]).toEqual(['3', '3']);
    expect(saveButton().disabled).toBe(false);
    fireEvent.click(saveButton());
    expect(loadSettings(kv).value.levels.treffer).toEqual({ start: 3, hardest: 3 });
  });

  it('orderedRange moves the other end along when the two would cross', () => {
    expect(orderedRange({ start: 1, hardest: 2 }, 'start', 4)).toEqual({ start: 4, hardest: 4 });
    expect(orderedRange({ start: 3, hardest: 5 }, 'hardest', 2)).toEqual({ start: 2, hardest: 2 });
    expect(orderedRange({ start: 2, hardest: 4 }, 'start', 3)).toEqual({ start: 3, hardest: 4 });
  });

  it('"Themen" lists the seven task kinds, all on, and saves one turned off', () => {
    const { kv } = setup();
    const topics = group('Themen');
    const names = ['Körper finden', 'Formen finden', 'Bauplan finden', 'Ansicht finden', 'Bauen', 'Malen', 'Male an'];
    expect(within(topics).getAllByRole('checkbox')).toHaveLength(7);
    for (const name of names) expect((within(topics).getByLabelText(name) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(topics).getByLabelText('Formen finden'));
    fireEvent.click(saveButton());
    expect(loadSettings(kv).value.kinds.formen).toBe(false);
  });

  it('"Gebäude" sets the largest plan, the highest stack, the sides and cylinders and spheres', () => {
    const { kv } = setup();
    const b = group('Gebäude');
    const plan = within(b).getByLabelText(L.maxPlan) as HTMLSelectElement;
    expect([...plan.options].map((o) => o.textContent)).toEqual(['2 × 2', '3 × 3']);
    const stack = within(b).getByLabelText(L.maxStack) as HTMLSelectElement;
    expect([...stack.options].map((o) => o.textContent)).toEqual(['2', '3', '4']);
    fireEvent.change(plan, { target: { value: '2' } });
    fireEvent.change(stack, { target: { value: '4' } });
    fireEvent.click(within(b).getByLabelText('rechts'));
    fireEvent.click(within(b).getByLabelText(L.roundPieces));
    fireEvent.click(saveButton());
    expect(loadSettings(kv).value.buildings).toEqual({ maxPlan: 2, maxStack: 4, sides: { vorn: true, oben: true, rechts: false, links: true }, mixedPieces: false });
  });

  it('refuses all sides off', () => {
    setup();
    const b = group('Gebäude');
    for (const side of ['vorn', 'oben', 'rechts', 'links']) fireEvent.click(within(b).getByLabelText(side));
    expect(within(b).getByText(t().settingsErrors.noSide)).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it('"Runde" checks bombs 5 to 20 and tasks 3 to 10', () => {
    const { kv } = setup();
    const round = group('Runde');
    fireEvent.change(within(round).getByLabelText(L.bombs), { target: { value: '21' } });
    expect(within(round).getByText(t().settingsErrors.bombs)).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
    fireEvent.change(within(round).getByLabelText(L.bombs), { target: { value: '15' } });
    fireEvent.change(within(round).getByLabelText(L.tasks), { target: { value: '2' } });
    expect(within(round).getByText(t().settingsErrors.tasks)).toBeTruthy();
    fireEvent.change(within(round).getByLabelText(L.tasks), { target: { value: '8' } });
    fireEvent.click(saveButton());
    expect(loadSettings(kv).value.round).toEqual({ bombs: 15, tasks: 8 });
  });

  it('"Ton", "Bedienung" and "Hangar" save their switches', () => {
    const { kv } = setup();
    fireEvent.click(within(group('Ton')).getByLabelText(L.soundEffects));
    fireEvent.click(within(group('Ton')).getByLabelText(L.soundSpeech));
    const controls = group('Bedienung');
    const pad = within(controls).getByLabelText(L.numberPad) as HTMLSelectElement;
    expect([...pad.options].map((o) => o.textContent)).toEqual(['automatisch', 'immer', 'nie']);
    fireEvent.change(pad, { target: { value: 'never' } });
    fireEvent.click(within(controls).getByLabelText(L.showClock));
    fireEvent.click(within(controls).getByLabelText(L.showRecords));
    fireEvent.click(within(controls).getByLabelText(L.pointAfterFullHelp));
    fireEvent.click(within(group('Hangar')).getByLabelText(L.hangar));
    fireEvent.click(saveButton());
    const s = loadSettings(kv).value;
    expect(s.sound).toEqual({ effects: false, speech: true, music: true });
    expect([s.numberPad, s.showClock, s.showRecords, s.pointAfterFullHelp, s.hangar]).toEqual(['never', true, false, false, false]);
  });

  it('"Schließen" calls onClose without saving', () => {
    const { kv, onClose, onSaved } = setup();
    fireEvent.click(screen.getByLabelText(L.showClock));
    fireEvent.click(screen.getByRole('button', { name: t().parent.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(loadSettings(kv).value.showClock).toBe(false);
  });
});

describe('data group (T061, FR-053)', () => {
  it('"Daten laden" stores a valid file and reports it; a wrong file changes nothing', async () => {
    const { kv, onSaved } = setup();
    const input = screen.getByTestId('import-file') as HTMLInputElement;
    const text = exportData({
      settings: { ...defaultSettings(), showClock: true },
      progress: emptyProgress(),
      records: emptyRecords(),
      hangar: { ...emptyHangar(), stars: 5 },
    });
    fireEvent.change(input, { target: { files: [new File([text], 'save.json')] } });
    await waitFor(() => expect(screen.getByText(S.data.imported)).toBeTruthy());
    expect(loadSettings(kv).value.showClock).toBe(true);
    expect(JSON.parse(kv.get(HANGAR_KEY)!).stars).toBe(5);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText(L.showClock) as HTMLInputElement).checked).toBe(true);

    fireEvent.change(input, { target: { files: [new File(['nope'], 'x.json')] } });
    await waitFor(() => expect(screen.getByText(S.data.importFailed.notJson)).toBeTruthy());
    expect(loadSettings(kv).value.showClock).toBe(true);
  });

  it('"Daten laden" that stored only part of the file says so, not that nothing changed', async () => {
    const real = createPersistence(memoryKeyValue());
    const persistence = { ...real, importText: () => ({ ok: false as const, reason: 'storePartial' as const }) };
    render(<SettingsPage persistence={persistence} onSaved={() => {}} onClose={() => {}} />);
    const input = screen.getByTestId('import-file') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([real.exportText()], 'save.json')] } });
    await waitFor(() => expect(screen.getByText(S.data.importFailed.storePartial)).toBeTruthy());
    expect(screen.queryByText(S.data.importFailed.storeFailed)).toBeNull();
  });

  it('"Daten sichern" downloads a dated file', () => {
    setup();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    fireEvent.click(screen.getByRole('button', { name: S.data.export }));
    expect(click).toHaveBeenCalledTimes(1);
    expect((click.mock.instances[0] as unknown as HTMLAnchorElement).download).toBe('mathe-flieger-2026-11-14.json');
  });

  it('"QR-Code" shows a transfer link with #save= and a QR code', async () => {
    setup();
    expect(screen.queryByTestId('transfer')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: S.data.qr }));
    const transfer = screen.getByTestId('transfer');
    await waitFor(() => expect(transfer.getAttribute('data-transfer-link')).toMatch(/#save=v1\./));
    expect(screen.getByTestId('transfer-qr')).toBeTruthy();
  });
});

describe('SettingsPage: kept copies', () => {
  const COPY = `${HANGAR_KEY}.unreadable`;

  it('offers a readable kept copy, restores it and reloads', () => {
    const kv = memoryKeyValue({ [COPY]: JSON.stringify({ ...emptyHangar(), stars: 30 }) });
    const onRestored = vi.fn();
    render(<SettingsPage persistence={createPersistence(kv)} onSaved={() => {}} onClose={() => {}} onRestored={onRestored} />);
    expect(screen.getByTestId('backup-notice').textContent).toContain('Sterne und Hangar');
    fireEvent.click(screen.getByRole('button', { name: t().parent.restoreBackup }));
    expect(onRestored).toHaveBeenCalledTimes(1);
    expect(JSON.parse(kv.get(HANGAR_KEY)!)).toMatchObject({ stars: 30 });
    expect(kv.get(COPY)).toBeNull();
  });

  it('shows a notice and changes nothing when the restore cannot be saved', () => {
    const inner = memoryKeyValue({ [COPY]: JSON.stringify({ ...emptyHangar(), stars: 30 }) });
    const kv = {
      get: (k: string) => inner.get(k),
      set: (k: string, v: string) => {
        if (k === HANGAR_KEY) throw new DOMException('quota', 'QuotaExceededError');
        inner.set(k, v);
      },
      remove: (k: string) => inner.remove(k),
    };
    const onRestored = vi.fn();
    render(<SettingsPage persistence={createPersistence(kv)} onSaved={() => {}} onClose={() => {}} onRestored={onRestored} />);
    fireEvent.click(screen.getByRole('button', { name: t().parent.restoreBackup }));
    expect(onRestored).not.toHaveBeenCalled();
    expect(screen.getByText(t().parent.restoreFailed)).toBeTruthy();
    expect(inner.get(COPY)).not.toBeNull();
  });

  it('offers nothing without a readable copy', () => {
    render(<SettingsPage persistence={createPersistence(memoryKeyValue({ [COPY]: '{"stars":' }))} onSaved={() => {}} onClose={() => {}} />);
    expect(screen.queryByTestId('backup-notice')).toBeNull();
  });
});
