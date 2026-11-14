// Adapted from math-soccer tests/e2e/noExternalRequests.spec.ts (which copied it from math-tank): a short round of each
// mode replaces the soccer round.
/**
 * No external services (T068, FR-057): every request made while the game loads and while one whole round of each mode
 * is played goes to the game's own origin (or is a data: or blob: URL). No analytics, fonts, CDNs or tracking; all art
 * and sound are bundled files (README asset table) or made in code.
 */
import { expect, seedStorage, startRound, test } from './fixtures';
import { SETTINGS_KEY } from '../../src/core/storage/storage';
import { PARTICLE_FILES } from '../../src/assets';
import { BUNDLED } from '../../src/audio/sfx';
import { backToStart, playBauenRound, playTrefferRound, shortRounds } from './play';

test('loading and playing a round of each mode sends no request to another origin', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const origin = new URL(baseURL!).origin;
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await seedStorage(page, { [SETTINGS_KEY]: shortRounds() });
  await page.goto('/?seed=8&speed=4&test=1');
  let round = await startRound(page, '1');
  await playTrefferRound(page, round, 5);
  await backToStart(page);
  round = await startRound(page, '2');
  await playBauenRound(page, round, 3);

  expect(requests.length).toBeGreaterThan(0);
  const foreign = requests.filter((url) => !url.startsWith('data:') && !url.startsWith('blob:') && new URL(url).origin !== origin);
  expect(foreign).toEqual([]);
  // The particle images and the sound files come from the game's own files (FR-058).
  const own = requests.filter((url) => url.startsWith(origin)).map((url) => new URL(url).pathname);
  for (const file of [...Object.values(PARTICLE_FILES), ...Object.values(BUNDLED)]) expect(own.some((path) => path.endsWith(`/assets/${file}`)), file).toBe(true);
});
