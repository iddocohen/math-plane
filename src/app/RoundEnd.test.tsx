// Adapted from math-soccer src/app/RoundEnd.test.tsx for the results of both modes.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { hasForbiddenWord } from '../i18n';
import { RoundEnd } from './RoundEnd';

afterEach(cleanup);

type Props = Parameters<typeof RoundEnd>[0];

function show(over: Partial<Props> = {}, calls: string[] = []) {
  render(
    <RoundEnd
      mode="treffer"
      hits={8}
      bombs={10}
      tasksDone={0}
      record={null}
      onAgain={() => calls.push('again')}
      onBack={() => calls.push('back')}
      {...over}
    />,
  );
}

describe('RoundEnd result (FR-037)', () => {
  it('"Treffer" shows the hits with the bombs', () => {
    show();
    expect(screen.getByTestId('round-result').textContent).toBe('8 Treffer mit 10 Bomben');
  });

  it('"Bauen und Malen" shows the tasks finished', () => {
    show({ mode: 'bauenMalen', tasksDone: 5 });
    expect(screen.getByTestId('round-result').textContent).toBe('5 Aufgaben geschafft');
  });

  it('shows an encouraging line and never a punishing word, even with no hit', () => {
    show({ hits: 0, cheer: 1 });
    const dialog = screen.getByTestId('round-end');
    expect(dialog.querySelector('h2')!.textContent).toBe('Toll gemacht!');
    expect(hasForbiddenWord(dialog.textContent ?? '')).toBe(false);
    expect(dialog.textContent).not.toMatch(/verloren/i);
  });
});

describe('RoundEnd record line (FR-038)', () => {
  it('says "Neuer Rekord!" for a new best', () => {
    show({ record: { newRecord: true, best: 8 } });
    expect(screen.getByTestId('new-record').textContent).toBe('Neuer Rekord!');
    expect(screen.queryByTestId('record')).toBeNull();
  });

  it('names the best otherwise', () => {
    show({ record: { newRecord: false, best: 9 } });
    expect(screen.getByTestId('record').textContent).toBe('Dein Rekord: 9');
  });

  it('shows no record line when "Rekorde zeigen" is off', () => {
    show({ record: null });
    expect(screen.queryByTestId('record')).toBeNull();
    expect(screen.queryByTestId('new-record')).toBeNull();
  });
});

describe('RoundEnd stars, time and buttons', () => {
  it('shows the stars earned only with the Hangar on', () => {
    show({ stars: 6 });
    expect(screen.getByTestId('round-stars').textContent).toBe('+6 Sterne');
    cleanup();
    show({ stars: null });
    expect(screen.queryByTestId('round-stars')).toBeNull();
  });

  it('shows the time only with the clock on', () => {
    show({ elapsedMs: 340_000 });
    expect(screen.getByTestId('round-time').textContent).toBe('Zeit: 5:40');
  });

  it('"Nochmal" plays again and "Zurück" goes back', () => {
    const calls: string[] = [];
    show({}, calls);
    screen.getByText('Nochmal').click();
    screen.getByText('Zurück').click();
    expect(calls).toEqual(['again', 'back']);
  });

  it('names a waiting new version in one short line', () => {
    show({ updateWaiting: true });
    expect(screen.getByTestId('update-note').textContent).toBe('Neue Version, startet gleich');
  });
});
