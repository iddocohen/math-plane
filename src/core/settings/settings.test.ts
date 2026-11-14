// Adapted from math-soccer src/core/settings/settings.test.ts: the Mathe-Flieger settings (FR-051).
import { describe, expect, it } from 'vitest';
import { parseSettings } from '../storage/migrate';
import { SIDES, TASK_KINDS } from '../types';
import { defaultSettings } from './defaults';
import { settingsSchema, type Settings } from './schema';
import { validateSettings, type SettingsErrorKey } from './validate';

function withChanges(change: (s: Settings) => void): Settings {
  const s = defaultSettings();
  change(s);
  return s;
}

function keys(s: Settings): SettingsErrorKey[] {
  return validateSettings(s).map((e) => e.key);
}

const schemaAccepts = (s: unknown) => settingsSchema.safeParse(s).success;

describe('defaultSettings (data-model "Settings", defaults as listed)', () => {
  it('passes the schema and every rule', () => {
    expect(schemaAccepts(defaultSettings())).toBe(true);
    expect(validateSettings(defaultSettings())).toEqual([]);
  });

  it('has the listed values', () => {
    const s = defaultSettings();
    expect(s.version).toBe(1);
    expect(s.levels).toEqual({ treffer: { start: 1, hardest: 5 }, bauenMalen: { start: 1, hardest: 5 } });
    expect(s.adaptive).toBe(true);
    for (const k of TASK_KINDS) expect(s.kinds[k]).toBe(true);
    expect(Object.keys(s.kinds)).toHaveLength(TASK_KINDS.length);
    expect(s.buildings.maxPlan).toBe(3);
    expect(s.buildings.maxStack).toBe(3);
    for (const side of SIDES) expect(s.buildings.sides[side]).toBe(true);
    expect(s.buildings.mixedPieces).toBe(true);
    expect(s.round).toEqual({ bombs: 10, tasks: 5 });
    expect(s.sound).toEqual({ effects: true, speech: false, music: true });
    expect(s.numberPad).toBe('auto');
    expect(s.showClock).toBe(false);
    expect(s.showRecords).toBe(true);
    expect(s.pointAfterFullHelp).toBe(true);
    expect(s.hangar).toBe(true);
  });

  it('gives a new object on every call', () => {
    const a = defaultSettings();
    a.kinds.bauen = false;
    expect(defaultSettings().kinds.bauen).toBe(true);
  });
});

describe('settingsSchema limits', () => {
  it('accepts bombs 5 to 20 and tasks 3 to 10, and refuses values outside', () => {
    for (const bombs of [5, 20]) expect(schemaAccepts(withChanges((s) => (s.round.bombs = bombs)))).toBe(true);
    for (const bombs of [4, 21, 7.5]) expect(schemaAccepts(withChanges((s) => (s.round.bombs = bombs)))).toBe(false);
    for (const tasks of [3, 10]) expect(schemaAccepts(withChanges((s) => (s.round.tasks = tasks)))).toBe(true);
    for (const tasks of [2, 11]) expect(schemaAccepts(withChanges((s) => (s.round.tasks = tasks)))).toBe(false);
  });

  it('accepts plans 2 or 3, stacks 2 to 4 and levels 1 to 5 only', () => {
    const raw = (change: (s: Record<string, unknown> & Settings) => void) => {
      const s = defaultSettings() as Record<string, unknown> & Settings;
      change(s);
      return s;
    };
    expect(schemaAccepts(raw((s) => (s.buildings.maxPlan = 2)))).toBe(true);
    expect(schemaAccepts(raw((s) => ((s.buildings as { maxPlan: number }).maxPlan = 4)))).toBe(false);
    expect(schemaAccepts(raw((s) => (s.buildings.maxStack = 4)))).toBe(true);
    expect(schemaAccepts(raw((s) => ((s.buildings as { maxStack: number }).maxStack = 1)))).toBe(false);
    expect(schemaAccepts(raw((s) => ((s.levels.treffer as { start: number }).start = 0)))).toBe(false);
    expect(schemaAccepts(raw((s) => ((s.levels.bauenMalen as { hardest: number }).hardest = 6)))).toBe(false);
  });

  it('refuses a missing task kind or side', () => {
    const s = defaultSettings() as unknown as { kinds: Record<string, boolean>; buildings: { sides: Record<string, boolean> } };
    delete s.kinds.maleAn;
    expect(schemaAccepts(s)).toBe(false);
    const t = defaultSettings() as unknown as { buildings: { sides: Record<string, boolean> } };
    delete t.buildings.sides.links;
    expect(schemaAccepts(t)).toBe(false);
  });
});

describe('validateSettings (rules across fields)', () => {
  it('refuses a start level above the hardest level, per mode', () => {
    const s = withChanges((x) => (x.levels.bauenMalen = { start: 4, hardest: 2 }));
    expect(validateSettings(s)).toEqual([{ key: 'levelOrder', path: 'levels.bauenMalen' }]);
    expect(keys(withChanges((x) => (x.levels.treffer = { start: 3, hardest: 3 })))).toEqual([]);
  });

  it('needs at least one side on', () => {
    const allOff = withChanges((x) => (x.buildings.sides = { vorn: false, oben: false, rechts: false, links: false }));
    expect(validateSettings(allOff)).toEqual([{ key: 'noSide', path: 'buildings.sides' }]);
    expect(keys(withChanges((x) => (x.buildings.sides = { vorn: false, oben: true, rechts: false, links: false })))).toEqual([]);
  });

  it('checks bombs and tasks per round, a fraction as notInteger', () => {
    expect(keys(withChanges((x) => (x.round.bombs = 21)))).toEqual(['bombs']);
    expect(keys(withChanges((x) => (x.round.tasks = 2)))).toEqual(['tasks']);
    expect(keys(withChanges((x) => (x.round.tasks = 4.5)))).toEqual(['notInteger']);
  });
});

describe('parseSettings (storage and export files)', () => {
  it('gives the settings back when the schema and every rule pass, and null otherwise', () => {
    expect(parseSettings(defaultSettings())).toEqual(defaultSettings());
    expect(parseSettings(withChanges((x) => (x.levels.treffer = { start: 5, hardest: 1 })))).toBeNull();
    expect(parseSettings({ ...defaultSettings(), version: 2 })).toBeNull();
    expect(parseSettings('settings')).toBeNull();
  });
});
