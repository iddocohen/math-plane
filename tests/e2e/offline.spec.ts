// Adapted from math-soccer tests/e2e/offline.spec.ts (which copied it from math-tank): a short round of each mode
// replaces the soccer round, and the precache check lists Mathe-Flieger's bundled files.
/**
 * Offline play (T068, FR-057, SC-008). Against the production build: the first load installs the service worker, which
 * precaches the whole game; once it controls the page, the browser goes offline, the page reloads from the cache, and
 * a whole "Treffer" round (5 bombs) and a whole "Bauen und Malen" round (3 tasks) are played. Each answer comes from
 * `data-answer` (`?test=1`).
 */
import { expect, seedStorage, startRound, test } from './fixtures';
import { SETTINGS_KEY } from '../../src/core/storage/storage';
import { PARTICLE_FILES } from '../../src/assets';
import { BUNDLED } from '../../src/audio/sfx';
import { backToStart, playBauenRound, playTrefferRound, shortRounds } from './play';

/** Every bundled file the game loads: the particle images, the sound files and the font. */
const ASSET_FILES = [...Object.values(PARTICLE_FILES), ...Object.values(BUNDLED), 'Fredoka.ttf'];

test('after one load the game starts and plays a round of each mode offline, also after a reload', async ({ page, context, browserName }) => {
  test.setTimeout(150_000);
  await seedStorage(page, { [SETTINGS_KEY]: shortRounds() });
  await page.goto('/?seed=4&speed=4&test=1');
  await expect(page.getByTestId('start')).toBeVisible();
  const supported = await page.evaluate(() => 'serviceWorker' in navigator);
  // As math-soccer: only where the browser under Playwright offers service workers at all.
  test.skip(!supported, `${browserName} under Playwright offers no service worker here (checked on a real iPad instead)`);

  // The service worker installs and precaches; after a reload it controls the page.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  // The game chunk (Phaser) also comes from the cache: the round starts and the bombs fall.
  let round = await startRound(page, '1');
  await playTrefferRound(page, round, 5);
  await backToStart(page);
  round = await startRound(page, '2');
  await playBauenRound(page, round, 3);
  await context.setOffline(false);
});

test('the precache holds every bundled image, sound and font file', async ({ page, browserName }) => {
  await page.goto('/');
  await expect(page.getByTestId('start')).toBeVisible();
  const supported = await page.evaluate(() => 'serviceWorker' in navigator);
  test.skip(!supported, `${browserName} under Playwright offers no service worker here`);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) urls.push(new URL(request.url).pathname);
    return urls;
  });
  for (const file of ASSET_FILES) expect(cached.some((path) => path.endsWith(`/assets/${file}`)), file).toBe(true);
});
