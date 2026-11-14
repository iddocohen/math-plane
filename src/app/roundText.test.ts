import { describe, expect, it } from 'vitest';
import type { TaskBase } from '../core/round/rules';
import { hasForbiddenWord } from '../i18n';
import { bannerText, helpLine, messageAfter } from './roundText';

const task = (over: Partial<TaskBase> & Record<string, unknown>): TaskBase => ({ id: '1-1', seed: 1, kind: 'koerper', mode: 'treffer', level: 1, ...over });

describe('bannerText', () => {
  it('names the target solid or shape with its article', () => {
    expect(bannerText(task({ kind: 'koerper', target: 'zylinder' }))).toBe('Triff den Zylinder!');
    expect(bannerText(task({ kind: 'formen', target: 'dreieck' }))).toBe('Triff das Dreieck!');
  });

  it('names the side of a view task', () => {
    expect(bannerText(task({ kind: 'ansichtFinden', side: 'links' }))).toBe('Welche Ansicht siehst du von links?');
    expect(bannerText(task({ kind: 'malen', mode: 'bauenMalen', side: 'rechts' }))).toBe('Male das Gebäude von rechts.');
  });

  it('shows the kind name when the task has no target yet', () => {
    expect(bannerText(task({ kind: 'koerper' }))).toBe('Körper finden');
  });
});

describe('messageAfter', () => {
  it('a hit says "Treffer!" or another hit line; a miss says the plane comes again', () => {
    expect(messageAfter({ type: 'bombLanded', hit: true, slot: 0, choice: 0 }, task({}), () => 0)).toBe('Treffer!');
    expect(messageAfter({ type: 'bombLanded', hit: false, slot: 0, choice: 1 }, task({}))).toBe('Noch ein Anflug!');
  });

  it('a miss on a solid or shape names what was hit (FR-010)', () => {
    const koerper = task({ choices: ['zylinder', 'kugel', 'wuerfel', 'quader'], target: 'zylinder', rightIndexes: [0], colors: [] });
    expect(messageAfter({ type: 'bombLanded', hit: false, slot: 3, choice: 1 }, koerper)).toBe('Das ist die Kugel.');
    const formen = task({ kind: 'formen', level: 2, choices: ['kreis', 'dreieck', 'quadrat', 'rechteck'], target: 'kreis', rightIndexes: [0], colors: [] });
    expect(messageAfter({ type: 'bombLanded', hit: false, slot: 0, choice: 1 }, formen)).toBe('Das ist das Dreieck.');
  });

  it('a right "Fertig" praises by kind; a wrong one asks to look at the marks', () => {
    const bauen = task({ kind: 'bauen', mode: 'bauenMalen' });
    expect(messageAfter({ type: 'checked', right: true, marked: [] }, bauen)).toBe('Super gebaut!');
    expect(messageAfter({ type: 'checked', right: false, marked: ['0,1'] }, bauen)).toBe('Fast! Schau dir die markierten Stellen an.');
    expect(messageAfter({ type: 'checked', right: true, marked: [] }, task({ kind: 'malen', mode: 'bauenMalen', side: 'rechts' }))).toBe(
      'Genau so sieht es von rechts aus!',
    );
  });

  it('a new task clears the line, other events leave it, and no line is punishing (FR-041)', () => {
    expect(messageAfter({ type: 'taskStarted', task: task({}) }, task({}))).toBeNull();
    expect(messageAfter({ type: 'phaseChanged', phase: 'aim' }, task({}))).toBeUndefined();
    for (const hit of [true, false]) expect(hasForbiddenWord(messageAfter({ type: 'bombLanded', hit, slot: 0, choice: 0 }, task({}))!)).toBe(false);
  });
});

describe('helpLine (FR-033)', () => {
  const zylinder = task({ kind: 'koerper', target: 'zylinder', rightIndexes: [2], choices: ['kugel', 'wuerfel', 'zylinder', 'quader'] });

  it('is null before help and the sentence of each step after', () => {
    expect(helpLine({ task: zylinder, taskState: null, helpStep: 0 })).toBeNull();
    expect(helpLine({ task: zylinder, taskState: null, helpStep: 1 })).toBe('Der Zylinder ist rund wie eine Dose. Oben hat er einen Kreis.');
    expect(helpLine({ task: zylinder, taskState: null, helpStep: 2 })).toBe('Schau, wo es blinkt.');
    expect(helpLine({ task: zylinder, taskState: null, helpStep: 3 })).toBe('Der Pfeil zeigt auf die Antwort.');
  });

  it('gives the side hint for a view task', () => {
    expect(helpLine({ task: task({ kind: 'malen', mode: 'bauenMalen', side: 'rechts' }), taskState: null, helpStep: 1 })).toBe('Geh in Gedanken nach rechts. Vorn ist jetzt links von dir.');
  });
});
