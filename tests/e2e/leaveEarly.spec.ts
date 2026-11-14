// Adapted from math-soccer tests/e2e/leaveEarly.spec.ts: the round screen of Mathe-Flieger and a bomb instead of a
// shot.
/**
 * Leaving the first round before the game has run a frame (createGame.ts). The game is created when the round screen
 * first shows and boots a moment later. A round left before the boot must not leave a scene removal queued, or the
 * removal takes the next round's scene when the game wakes, and the next bomb never lands.
 *
 * An init script leaves the round as soon as the game's canvas is in the page: it presses Escape and clicks "Zum
 * Start" on the pause screen in the same task, before the game's textures are ready. The test then lets the game boot,
 * starts a new round and checks that a bomb falls and lands. Every wait is on data-* state, never a fixed sleep.
 */
import { expect, startRound, test } from './fixtures';
import { hitTarget } from './play';

declare global {
  interface Window {
    /** True once the init script left the round before the game booted. */
    __leftEarly?: boolean;
    /** The `data-phase` values of the round, in order. */
    __phases?: string[];
  }
}

test('a round left before the game ran a frame does not break the next round', async ({ page }) => {
  await page.addInitScript(() => {
    window.__leftEarly = false;
    window.__phases = [];
    let pressed = false;
    new MutationObserver(() => {
      if (window.__leftEarly) return;
      if (!pressed && document.querySelector('main.round canvas')) {
        pressed = true;
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      }
      const home = document.querySelector<HTMLElement>('[data-testid="pause-home"]');
      if (pressed && home) {
        home.click();
        window.__leftEarly = true;
      }
    }).observe(document, { childList: true, subtree: true });
    new MutationObserver((records) => {
      for (const r of records) window.__phases!.push((r.target as Element).getAttribute('data-phase') ?? '');
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-phase'] });
  });
  await page.goto('/?seed=11&test=1');
  await expect(page.getByTestId('start')).toBeVisible();
  await page.keyboard.press('1');
  await page.waitForFunction(() => window.__leftEarly === true);
  await expect(page.getByTestId('start')).toBeVisible();
  // The game boots and runs its first frame while the start screen shows; then it sleeps. Ten frames of the page give
  // it that time.
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        let n = 0;
        const frame = () => (++n >= 10 ? done() : requestAnimationFrame(frame));
        requestAnimationFrame(frame);
      }),
  );

  const round = await startRound(page, '1');
  await page.evaluate(() => window.__phases!.splice(0));
  await hitTarget(page, round);
  await expect(round).toHaveAttribute('data-bombs-left', '9');
  await expect(round).toHaveAttribute('data-phase', 'aim');
  const phases = await page.evaluate(() => window.__phases!);
  expect(phases).toContain('pass');
  expect(phases.at(-1)).toBe('aim');
});
