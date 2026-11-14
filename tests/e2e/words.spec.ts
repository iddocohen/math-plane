/**
 * Words check (T073, FR-041, SC-009): a walk over every screen finds no punishing word. An init script records every
 * text and label the page ever shows, so a message that shows only briefly at a raised `?speed=` is still checked.
 *
 * The walk: the start screen; the Hangar; in "Treffer" every level, each with a miss, all three help steps, the pause
 * screen and "Runde beenden?"; in "Bauen und Malen" every level, each with a wrong "Fertig", all three help steps and
 * the pause screen; a whole round of each mode to its round end; the parent menu, "Einstellungen" and "Fortschritt".
 * The words are `forbiddenWords` from src/i18n/index.ts ("falsch", "verloren" and two more), case-insensitive, also
 * inside compounds.
 */
import type { Locator, Page } from '@playwright/test';
import { expect, sceneReady, seedStorage, startRound, test } from './fixtures';
import { HANGAR_KEY, ROUND_KEY, SETTINGS_KEY } from '../../src/core/storage/storage';
import { emptyHangar } from '../../src/core/storage/schemas';
import type { Settings } from '../../src/core/settings/schema';
import type { TaskKind } from '../../src/core/types';
import { aimPoint } from '../../src/game/slots';
import { forbiddenWords } from '../../src/i18n';
import { screenPoint } from './layout';
import { openParentPage } from './parent';
import { backToStart, playBauenRound, playTrefferRound, shortRounds } from './play';

declare global {
  interface Window {
    /** Every text and label the page showed. */
    __texts?: Set<string>;
  }
}

/** Records the text of every element and every `aria-label`, `title` and `alt` while the page runs. */
function recordTexts(): void {
  window.__texts = new Set();
  const take = () => {
    const body = document.body;
    if (!body) return;
    window.__texts!.add(body.innerText);
    for (const el of body.querySelectorAll('[aria-label], [title], [alt]')) {
      for (const name of ['aria-label', 'title', 'alt']) {
        const v = el.getAttribute(name);
        if (v) window.__texts!.add(v);
      }
    }
  };
  new MutationObserver(take).observe(document, { childList: true, subtree: true, characterData: true, attributes: true });
}

/** The texts recorded so far in this test, across reloads. */
const seen: string[] = [];

/** Adds the texts the page recorded since it loaded to `seen`. */
async function harvest(page: Page): Promise<void> {
  seen.push(...(await page.evaluate(() => [...(window.__texts ?? [])])));
}

/** Writes `settings` to storage, drops a stored round and reloads at the start screen. */
async function useSettings(page: Page, settings: Settings): Promise<void> {
  await harvest(page);
  await page.evaluate(
    ([sk, rk, value]) => {
      window.localStorage.setItem(sk, value);
      window.localStorage.removeItem(rk);
    },
    [SETTINGS_KEY, ROUND_KEY, JSON.stringify(settings)] as const,
  );
  await page.reload();
  await expect(page.getByTestId('start')).toBeVisible();
}

function withLevel(mode: 'treffer' | 'bauenMalen', level: 1 | 2 | 3 | 4 | 5): Settings {
  const s = shortRounds();
  s.levels[mode] = { start: level, hardest: level };
  s.adaptive = false;
  return s;
}

/** Opens the three help steps with H. */
async function allHelp(page: Page, round: Locator): Promise<void> {
  for (let step = 1; step <= 3; step++) {
    await page.keyboard.press('h');
    await expect(round).toHaveAttribute('data-help', String(step));
  }
}

/** The pause screen, then "Runde beenden?" and "Zum Start". */
async function pauseAndLeave(page: Page, round: Locator): Promise<void> {
  await expect(round).not.toHaveAttribute('data-phase', 'pass');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-screen')).toHaveAttribute('data-kind', 'pause');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pause-screen')).toBeHidden();
  await page.getByTestId('home').click();
  await expect(page.getByTestId('pause-screen')).toHaveAttribute('data-kind', 'quit');
  await page.getByTestId('pause-home').click();
  await expect(page.getByTestId('start')).toBeVisible();
}

/** Bombs a wrong target of the "Treffer" task shown and waits for the miss. */
async function miss(page: Page, round: Locator): Promise<void> {
  await expect(round).toHaveAttribute('data-phase', 'aim');
  const d = await round.evaluate((el) => ({ ...(el as HTMLElement).dataset }));
  const slots = (d.slots ?? '').split(',').map(Number);
  const answer = (d.answer ?? '').split(',').map(Number);
  const wrong = slots.findIndex((_, slot) => !answer.includes(slot));
  const aim = aimPoint(d.kind as TaskKind, slots.length, wrong);
  const p = await screenPoint(page, aim.x, aim.y);
  await page.mouse.click(p.x, p.y);
  await expect(round).toHaveAttribute('data-misses', String(Number(d.misses) + 1));
}

test('no screen shows "falsch", "verloren" or another punishing word', async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(recordTexts);
  await seedStorage(page, { [SETTINGS_KEY]: shortRounds(), [HANGAR_KEY]: { ...emptyHangar(), stars: 40 } }, { once: true });
  await page.goto('/?seed=5&speed=4&test=1');
  await expect(page.getByTestId('start')).toBeVisible();

  // The Hangar from the start screen.
  await page.getByTestId('open-hangar').click();
  await expect(page.getByTestId('hangar')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start')).toBeVisible();

  for (const level of [1, 2, 3, 4, 5] as const) {
    await useSettings(page, withLevel('treffer', level));
    const round = await startRound(page, '1');
    await miss(page, round);
    await expect(round).toHaveAttribute('data-phase', 'aim');
    await allHelp(page, round);
    await pauseAndLeave(page, round);
  }

  for (const level of [1, 2, 3, 4, 5] as const) {
    await useSettings(page, withLevel('bauenMalen', level));
    const round = await startRound(page, '2');
    // "Fertig" with nothing written or painted is a wrong check: it marks and says so kindly.
    await page.keyboard.press('f');
    await expect(round).toHaveAttribute('data-misses', '1');
    await allHelp(page, round);
    await pauseAndLeave(page, round);
  }

  // A whole round of each mode to its round end.
  await useSettings(page, shortRounds());
  let round = await startRound(page, '1');
  await playTrefferRound(page, round, 5);
  await backToStart(page);
  round = await startRound(page, '2');
  await playBauenRound(page, round, 3);
  // "Nochmal" starts a new round; then the parent screens over it.
  await page.keyboard.press('Enter');
  await sceneReady(page);
  const settings = await openParentPage(page, 'Einstellungen');
  await settings.getByRole('button', { name: 'Schließen' }).click();
  const progress = await openParentPage(page, 'Fortschritt');
  await progress.getByRole('button', { name: 'Schließen' }).click();

  await harvest(page);
  // The walk reached every screen: the pause screen, "Runde beenden?", both round ends, the Hangar and the parent pages.
  const all = seen.join('\n');
  for (const shown of ['Pause', 'Runde beenden?', 'Treffer mit 5 Bomben', '3 Aufgaben geschafft', 'Hangar', 'Einstellungen', 'Fortschritt']) {
    expect(all, shown).toContain(shown);
  }
  for (const word of forbiddenWords) {
    const found = seen.filter((s) => s.toLowerCase().includes(word.toLowerCase()));
    expect(found, `"${word}" shown`).toEqual([]);
  }
});
