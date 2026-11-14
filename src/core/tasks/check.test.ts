import { describe, expect, it } from 'vitest';
import { hasForbiddenWord } from '../../i18n';
import { createRng } from '../rng';
import { defaultSettings } from '../settings/defaults';
import { checkBomb } from './check';
import { generateTrefferTask } from './generate';
import type { FormenTask, KoerperTask } from './types';

const base = { id: '1-1', seed: 1, mode: 'treffer' as const, level: 1 as const };

const koerper: KoerperTask = {
  ...base,
  kind: 'koerper',
  choices: ['zylinder', 'kugel', 'wuerfel', 'pyramide'],
  target: 'zylinder',
  colors: ['#e0413a', '#2f7fd1', '#f2c230', '#3fa34d'],
  rightIndexes: [0],
};

const formen: FormenTask = {
  ...base,
  level: 2,
  kind: 'formen',
  choices: ['kreis', 'dreieck', 'quadrat', 'rechteck'],
  target: 'quadrat',
  colors: ['#e0413a', '#2f7fd1', '#f2c230', '#3fa34d'],
  looks: [1, 2, 3, 4].map(() => ({ scale: 1, turn: 0, aspect: 1 })),
  rightIndexes: [2],
};

describe('checkBomb', () => {
  it('a bomb on the target is a hit with no line', () => {
    expect(checkBomb(koerper, 0)).toEqual({ hit: true, named: '' });
    expect(checkBomb(formen, 2)).toEqual({ hit: true, named: '' });
  });

  it('a miss names what was hit with its article (FR-010)', () => {
    expect(checkBomb(koerper, 1)).toEqual({ hit: false, named: 'Das ist die Kugel.' });
    expect(checkBomb(koerper, 2).named).toBe('Das ist der Würfel.');
    expect(checkBomb(koerper, 3).named).toBe('Das ist die Pyramide.');
    expect(checkBomb(formen, 0).named).toBe('Das ist der Kreis.');
    expect(checkBomb(formen, 1).named).toBe('Das ist das Dreieck.');
    expect(checkBomb(formen, 3).named).toBe('Das ist das Rechteck.');
  });

  it('every miss line over generated tasks is kind (FR-041)', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const kind of ['koerper', 'formen'] as const) {
        const task = generateTrefferTask({ content: { kind, level: 1 }, settings: defaultSettings(), rng: createRng(seed), id: 'x', seed });
        task.choices.forEach((_, i) => {
          const r = checkBomb(task, i);
          expect(r.hit).toBe(task.rightIndexes.includes(i));
          if (!r.hit) expect(r.named).toMatch(/^Das ist (der|die|das) \S+\.$/);
          expect(hasForbiddenWord(r.named)).toBe(false);
        });
      }
    }
  });

  it('rejects a choice that does not exist', () => {
    expect(() => checkBomb(koerper, 4)).toThrow(RangeError);
  });
});
