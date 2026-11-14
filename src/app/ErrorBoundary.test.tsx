import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasForbiddenWord } from '../i18n';
import { ErrorBoundary, StuckScreen } from './ErrorBoundary';

afterEach(cleanup);

function Broken(): never {
  throw new Error('drawing failed');
}

describe('ErrorBoundary', () => {
  it('shows its children while nothing throws', () => {
    render(
      <ErrorBoundary>
        <p data-testid="child">Runde</p>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('child').textContent).toBe('Runde');
    expect(screen.queryByTestId('stuck-screen')).toBeNull();
  });

  it('logs a render error and shows a friendly line with "Neu laden"', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.fn();
    try {
      render(
        <ErrorBoundary onReload={reload}>
          <Broken />
        </ErrorBoundary>,
      );
      const stuck = screen.getByTestId('stuck-screen');
      const line = screen.getByRole('heading').textContent!;
      expect(line).toBe('Das Spiel klemmt gerade.');
      expect(hasForbiddenWord(line)).toBe(false);
      expect(stuck.getAttribute('role')).toBe('alertdialog');
      const button = screen.getByTestId('stuck-button');
      expect(button.textContent).toBe('Neu laden');
      button.click();
      expect(reload).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith('Mathe-Flieger: a screen could not be shown', expect.any(Error), expect.anything());
    } finally {
      error.mockRestore();
    }
  });
});

describe('StuckScreen', () => {
  it('shows the friendly line with the button it is given', () => {
    const onClick = vi.fn();
    render(<StuckScreen button="Zum Start" onClick={onClick} />);
    expect(screen.getByRole('heading').textContent).toBe('Das Spiel klemmt gerade.');
    screen.getByTestId('stuck-button').click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
