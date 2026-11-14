import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RoundController } from '../core/round/RoundController';
import type { ModeRules } from '../core/round/rules';
import { defaultSettings } from '../core/settings/defaults';
import { emptyProgress } from '../core/storage/schemas';
import type { Mode } from '../core/types';
import { rulesFor } from './modeRules';
import { RoundOverlay, roundData } from './RoundOverlay';

afterEach(cleanup);

function round(mode: Mode, rules: ModeRules = rulesFor(mode)) {
  const controller = new RoundController({ rules, settings: defaultSettings(), progress: emptyProgress(), seed: 7, now: () => 0 });
  return { controller, rules, state: controller.state() };
}

function show(mode: Mode, over: { test?: boolean; showClock?: boolean; rules?: ModeRules } = {}) {
  const { controller, rules, state } = round(mode, over.rules);
  render(
    <RoundOverlay
      controller={controller}
      state={state}
      rules={rules}
      banner="Triff den Zylinder!"
      message="Treffer!"
      test={over.test ?? false}
      numberPad={false}
      showClock={over.showClock ?? false}
      onHangar={null}
      onPause={() => {}}
      onHome={() => {}}
    />,
  );
  return screen.getByTestId('round');
}

describe('roundData (contracts/screens.md)', () => {
  it('carries every data attribute of the round element', () => {
    const { state, rules } = round('treffer');
    expect(Object.keys(roundData(state, rules, { test: false, numberPad: false })).sort()).toEqual(
      [
        'data-mode',
        'data-phase',
        'data-kind',
        'data-level',
        'data-side',
        'data-help',
        'data-misses',
        'data-bombs-left',
        'data-hits',
        'data-tasks-done',
        'data-answer',
        'data-slots',
        'data-marked',
        'data-number-pad',
      ].sort(),
    );
  });

  it('fills data-answer only with ?test=1', () => {
    const rules: ModeRules = { ...rulesFor('treffer'), answer: () => '2' };
    const { state } = round('treffer', rules);
    expect(roundData(state, rules, { test: true, numberPad: false })['data-answer']).toBe('2');
    expect(roundData(state, rules, { test: false, numberPad: false })['data-answer']).toBe('');
  });
});

describe('RoundOverlay', () => {
  it('"Treffer" shows the banner, the message and the bomb bay, no "Fertig"', () => {
    const el = show('treffer');
    expect(el.getAttribute('data-mode')).toBe('treffer');
    expect(el.getAttribute('data-phase')).toBe('aim');
    expect(el.getAttribute('data-bombs-left')).toBe('10');
    expect(screen.getByTestId('banner').textContent).toBe('Triff den Zylinder!');
    expect(screen.getByTestId('message').textContent).toBe('Treffer!');
    expect(screen.getByTestId('bombs').getAttribute('aria-label')).toBe('10 Bomben übrig');
    expect(screen.queryByTestId('done')).toBeNull();
  });

  it('"Bauen und Malen" shows "Aufgabe 1 von 5" and "Fertig"', () => {
    show('bauenMalen');
    expect(screen.getByTestId('task-counter').textContent).toBe('Aufgabe 1 von 5');
    expect(screen.getByTestId('done').textContent).toBe('Fertig');
    expect(screen.queryByTestId('bombs')).toBeNull();
  });

  it('shows the clock only when "Uhr zeigen" is on', () => {
    show('treffer');
    expect(screen.queryByTestId('clock')).toBeNull();
    cleanup();
    show('treffer', { showClock: true });
    expect(screen.getByTestId('clock').textContent).toBe('Zeit: 0:00');
  });

  it('the yellow "?" asks the controller for help', () => {
    const { controller, rules, state } = round('treffer');
    render(<RoundOverlay controller={controller} state={state} rules={rules} banner="" message={null} test={false} numberPad={false} showClock={false} onHangar={null} onPause={() => {}} onHome={() => {}} />);
    screen.getByTestId('help').click();
    expect(controller.state().helpStep).toBe(1);
  });
});
