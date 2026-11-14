// T053: the color row of "Male an" in the round overlay (FR-023, contracts/screens.md `data-testid="palette"`).
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MaleAnState } from '../core/round/BauenMalenRules';
import { RoundController } from '../core/round/RoundController';
import { defaultSettings } from '../core/settings/defaults';
import { emptyProgress } from '../core/storage/schemas';
import type { MaleAnTask } from '../core/tasks/types';
import { ColorRow } from './ColorRow';
import { rulesFor } from './modeRules';
import { RoundOverlay } from './RoundOverlay';

afterEach(cleanup);

describe('ColorRow', () => {
  it('shows one button per color, marks the picked one and the keyboard marker, and picks on tap', () => {
    const onPick = vi.fn();
    render(<ColorRow palette={['#e0413a', '#2f7fd1']} picked="#2f7fd1" marker={0} disabled={false} onPick={onPick} />);
    const row = screen.getByTestId('palette');
    const buttons = row.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]!.getAttribute('aria-label')).toBe('Rot');
    expect(buttons[0]!.className).toContain('marked');
    expect(buttons[1]!.className).toContain('picked');
    expect(buttons[1]!.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(buttons[0]!);
    expect(onPick).toHaveBeenCalledWith('#e0413a');
  });
});

describe('RoundOverlay color row', () => {
  function overlay(level: 4 | 5) {
    const settings = defaultSettings();
    settings.levels.bauenMalen = { start: level, hardest: level };
    const rules = rulesFor('bauenMalen');
    const controller = new RoundController({ rules, settings, progress: emptyProgress(), seed: 4, now: () => 0 });
    const view = () =>
      render(
        <RoundOverlay
          controller={controller}
          state={controller.state()}
          rules={rules}
          banner=""
          message={null}
          test={false}
          numberPad={false}
          showClock={false}
          onHangar={null}
          onPause={() => {}}
          onHome={() => {}}
          onDone={() => {}}
          onSceneKey={() => {}}
        />,
      );
    return { controller, view };
  }

  it('shows the building\'s colors during "Male an", and a tap picks the color', () => {
    const { controller, view } = overlay(5);
    const task = controller.state().task as MaleAnTask;
    expect(task.kind).toBe('maleAn');
    view();
    const buttons = screen.getByTestId('palette').querySelectorAll('button');
    expect([...buttons].map((b) => b.dataset.color)).toEqual(task.palette);
    fireEvent.click(buttons[1]!);
    expect((controller.state().taskState as MaleAnState).color).toBe(task.palette[1]);
  });

  it('shows no color row during "Malen"', () => {
    const { controller, view } = overlay(4);
    expect(controller.state().task.kind).toBe('malen');
    view();
    expect(screen.queryByTestId('palette')).toBeNull();
  });
});
