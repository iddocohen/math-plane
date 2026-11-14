import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../settings/defaults';
import { emptyHangar } from '../storage/schemas';
import { award, starsFor } from './hangar';

describe('starsFor (FR-036, FR-044)', () => {
  const on = defaultSettings();
  const off = { ...defaultSettings(), pointAfterFullHelp: false };

  it('gives 1 star per "Treffer" hit and 3 per "Bauen", "Malen" or "Male an" task', () => {
    for (const kind of ['koerper', 'formen', 'bauplanFinden', 'ansichtFinden'] as const) expect(starsFor(kind, 'alone', 0, on)).toBe(1);
    for (const kind of ['bauen', 'malen', 'maleAn'] as const) expect(starsFor(kind, 'alone', 0, on)).toBe(3);
  });

  it('gives the same stars with help, also after help step 3 while "Punkt nach voller Hilfe" is on', () => {
    expect(starsFor('bauen', 'withHelp', 2, on)).toBe(3);
    expect(starsFor('bauen', 'withHelp', 3, on)).toBe(3);
    expect(starsFor('koerper', 'withHelp', 3, on)).toBe(1);
  });

  it('gives 0 after help step 3 when "Punkt nach voller Hilfe" is off, and the usual stars before it', () => {
    expect(starsFor('malen', 'withHelp', 3, off)).toBe(0);
    expect(starsFor('formen', 'withHelp', 3, off)).toBe(0);
    expect(starsFor('malen', 'withHelp', 2, off)).toBe(3);
  });
});

describe('award', () => {
  it('adds whole stars above 0 and never takes any away', () => {
    const h = emptyHangar();
    expect(award(h, 3).stars).toBe(3);
    expect(award(award(h, 3), 1).stars).toBe(4);
    expect(award(h, 0)).toBe(h);
    expect(award(h, -2)).toBe(h);
    expect(award(h, 1.5)).toBe(h);
  });

  it('returns a new Hangar and keeps the chosen look', () => {
    const h = emptyHangar();
    const next = award(h, 2);
    expect(next).not.toBe(h);
    expect(next.chosen).toEqual(h.chosen);
    expect(h.stars).toBe(0);
  });
});
