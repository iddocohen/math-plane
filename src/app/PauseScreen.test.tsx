import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PauseScreen } from './PauseScreen';

afterEach(cleanup);

describe('PauseScreen', () => {
  it('says "Pause" after the pause key and asks "Runde beenden?" after the home button', () => {
    render(<PauseScreen kind="pause" onResume={() => {}} onHome={() => {}} />);
    expect(screen.getByTestId('pause-screen').getAttribute('data-kind')).toBe('pause');
    expect(screen.getByRole('heading').textContent).toBe('Pause');
    cleanup();
    render(<PauseScreen kind="quit" onResume={() => {}} onHome={() => {}} />);
    expect(screen.getByRole('heading').textContent).toBe('Runde beenden?');
  });

  it('"Weiter" goes on and "Zum Start" goes home; neither takes focus', () => {
    const calls: string[] = [];
    render(<PauseScreen kind="quit" onResume={() => calls.push('resume')} onHome={() => calls.push('home')} />);
    const resume = screen.getByTestId('pause-resume');
    const home = screen.getByTestId('pause-home');
    expect(resume.textContent).toBe('Weiter');
    expect(home.textContent).toBe('Zum Start');
    expect(resume.tabIndex).toBe(-1);
    expect(home.tabIndex).toBe(-1);
    resume.click();
    home.click();
    expect(calls).toEqual(['resume', 'home']);
  });
});
