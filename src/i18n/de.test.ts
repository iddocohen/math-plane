// Adapted from math-soccer src/i18n/de.test.ts: Mathe-Flieger's texts and the 8-word limit (FR-040, FR-041).
import { describe, expect, it } from 'vitest';
import { de } from './de';
import { CHILD_SECTIONS, LONG_SECTIONS, MAX_WORDS, forbiddenWords, hasForbiddenWord, resetMessage, wordCount } from './index';

/**
 * Sample arguments for texts that take numbers or words. A function is called with each; a result that contains
 * "undefined" came from an argument of the wrong kind (a number for a side) and is skipped.
 */
const SAMPLES: Array<Array<number | string>> = [[1], [56], [8, 10], [3, 10], ['rechts'], ['oben'], ['die Kugel'], ['Ansichten vorn und oben'], [3, 2], [12, 3, 2]];

interface Text {
  path: string;
  text: string;
}

/** Every string in a value, with its path; functions are called with sample arguments. */
function collect(value: unknown, path: string, out: Text[]): void {
  if (typeof value === 'string') out.push({ path, text: value });
  else if (typeof value === 'function') {
    for (const args of SAMPLES) {
      const text = String((value as (...a: unknown[]) => unknown)(...args));
      if (!text.includes('undefined')) out.push({ path: `${path}(${args.join(', ')})`, text });
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, v] of Object.entries(value)) collect(v, `${path}.${key}`, out);
  }
}

function textsOf(sections: readonly string[]): Text[] {
  const out: Text[] = [];
  for (const section of sections) collect(de[section as keyof typeof de], section, out);
  return out;
}

const show = ({ path, text }: Text) => `${path}: ${text}`;

describe('child texts (FR-041)', () => {
  it('the forbidden list holds "falsch" and "verloren"', () => {
    expect(forbiddenWords).toContain('falsch');
    expect(forbiddenWords).toContain('verloren');
  });

  it('contain none of the forbidden words, case-insensitive and inside compounds', () => {
    const texts = textsOf(CHILD_SECTIONS);
    expect(texts.length).toBeGreaterThan(80);
    expect(texts.filter(({ text }) => hasForbiddenWord(text)).map(show)).toEqual([]);
  });

  it('the check catches a forbidden word inside a compound and in capitals', () => {
    expect(hasForbiddenWord('Das ist falsch.')).toBe(true);
    expect(hasForbiddenWord('Runde verloren')).toBe(true);
    expect(hasForbiddenWord('FALSCH')).toBe(true);
    expect(hasForbiddenWord('Noch ein Anflug!')).toBe(false);
  });

  it('every text function gives at least one text for the sample arguments', () => {
    const fns: string[] = [];
    const walk = (v: unknown, path: string) => {
      if (typeof v === 'function') fns.push(path);
      else if (typeof v === 'object' && v !== null) for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    walk(de, 'de');
    const texts = textsOf(Object.keys(de));
    for (const fn of fns) expect(texts.some(({ path }) => `de.${path}`.startsWith(`${fn}(`)), fn).toBe(true);
  });
});

describe('short child texts (FR-040)', () => {
  it(`no child text outside the help sentences and storage notices has more than ${MAX_WORDS} words`, () => {
    const short = CHILD_SECTIONS.filter((s) => !LONG_SECTIONS.includes(s));
    const texts = textsOf(short);
    expect(texts.length).toBeGreaterThan(60);
    expect(texts.filter(({ text }) => wordCount(text) > MAX_WORDS).map(show)).toEqual([]);
  });

  it('counts words at spaces', () => {
    expect(wordCount('Triff den Zylinder!')).toBe(3);
    expect(wordCount('  Fast!   Schau dir die markierten Stellen an. ')).toBe(7);
    expect(wordCount('a b c d e f g h i')).toBe(9);
  });
});

describe('texts from contracts/screens.md and spec.md', () => {
  it('start screen and round overlay', () => {
    expect(de.appName).toBe('Mathe-Flieger');
    expect([de.start.treffer, de.start.bauenMalen, de.start.hangar]).toEqual(['Treffer', 'Bauen und Malen', 'Hangar']);
    expect(de.round.taskOf(2, 5)).toBe('Aufgabe 2 von 5');
    expect([de.round.done, de.round.home, de.round.quitAsk]).toEqual(['Fertig', 'Zum Start', 'Runde beenden?']);
    expect([de.round.standHere, de.round.flyHere, de.round.target, de.round.hitCard]).toEqual([
      'Hier stehst du',
      'Hier fliegst du',
      'So soll es aussehen',
      'Getroffen',
    ]);
  });

  it('task banners', () => {
    expect(de.tasks.hitThe(de.names.solids.zylinder.acc)).toBe('Triff den Zylinder!');
    expect(de.tasks.hitThe(de.names.shapes.dreieck.acc)).toBe('Triff das Dreieck!');
    expect(de.tasks.bauplanFinden).toBe('Triff das Gebäude zu diesem Bauplan!');
    expect(de.tasks.ansichtFinden('rechts')).toBe('Welche Ansicht siehst du von rechts?');
  });

  it('feedback lines', () => {
    expect(de.feedback.hit).toContain('Treffer!');
    expect(de.feedback.missNamed(de.names.solids.kugel.nom)).toBe('Das ist die Kugel.');
    expect(de.feedback.missView('links')).toBe('Das ist die Ansicht von links.');
    expect(de.feedback.built).toBe('Super gebaut!');
    expect(de.feedback.viewRight('rechts')).toBe('Genau so sieht es von rechts aus!');
    expect(de.feedback.painted).toBe('Schön angemalt!');
    expect(de.feedback.almost).toBe('Fast! Schau dir die markierten Stellen an.');
    expect(de.feedback.levelUp(de.levels.names.bauenMalen[2])).toBe('Neue Stufe: Große Baupläne!');
  });

  it('level names of both modes (FR-028)', () => {
    expect(Object.values(de.levels.names.treffer)).toEqual(['Körper', 'Formen', 'Baupläne finden', 'Ansichten vorn und oben', 'Alle Seiten']);
    expect(Object.values(de.levels.names.bauenMalen)).toEqual(['Kleine Baupläne', 'Große Baupläne', 'Vorn und oben', 'Rechts und links', 'Male an']);
  });

  it('help sentences from the spec (US5)', () => {
    expect(de.help.solids.zylinder).toBe('Der Zylinder ist rund wie eine Dose. Oben hat er einen Kreis.');
    expect(de.help.sides.rechts).toBe('Geh in Gedanken nach rechts. Vorn ist jetzt links von dir.');
  });

  it('round end (FR-037)', () => {
    expect(de.roundEnd.hitsSummary(8, 10)).toBe('8 Treffer mit 10 Bomben');
    expect(de.roundEnd.tasksSummary(5)).toBe('5 Aufgaben geschafft');
    expect(de.roundEnd.newRecord).toBe('Neuer Rekord!');
    expect(de.roundEnd.record(9)).toBe('Dein Rekord: 9');
    expect([de.roundEnd.again, de.roundEnd.back]).toEqual(['Nochmal', 'Zurück']);
  });

  it('parent gate, settings groups and Hangar (FR-045, FR-051)', () => {
    expect([de.parent.settings, de.parent.progress]).toEqual(['Einstellungen', 'Fortschritt']);
    expect(Object.values(de.settings.groups)).toEqual(['Stufen', 'Themen', 'Gebäude', 'Runde', 'Ton', 'Bedienung', 'Hangar', 'Daten']);
    expect([de.settings.data.export, de.settings.data.import, de.settings.data.qr]).toEqual(['Daten sichern', 'Daten laden', 'QR-Code']);
    expect(de.settings.labels.hangar).toBe('Hangar und Sterne');
    expect(de.settings.labels.pointAfterFullHelp).toBe('Punkt nach voller Hilfe');
    expect(de.progressPage.columns.mastered).toBe('gemeistert');
    expect(Object.values(de.hangar.groups)).toEqual(['Farbe', 'Heckbild', 'Rauch', 'Bomben', 'Mütze']);
    expect(de.hangar.stillNeeded(5)).toBe('noch 5 Sterne');
  });
});

describe('resetMessage (FR-052)', () => {
  it('gives a note for each reset reason and none without a reset', () => {
    expect(resetMessage('none')).toBeNull();
    expect(resetMessage('invalid')).toBe(de.storage.reset.invalid);
    expect(resetMessage('newer')).toBe(de.storage.reset.newer);
    expect(resetMessage('unavailable')).toBe(de.storage.reset.unavailable);
  });
});
