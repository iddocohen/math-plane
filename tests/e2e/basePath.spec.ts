// Adapted from math-soccer tests/e2e/basePath.spec.ts (which copied it from math-tank): /math-plane/ replaces
// /math-soccer/, and a short "Treffer" round the soccer round.
/**
 * The published game under a sub-path (T072, FR-057). GitHub Pages serves the game at
 * https://iddocohen.github.io/math-plane/, built with `vite build --base=/math-plane/`. The Playwright project
 * `base-path` builds the game the same way into `dist-base/` and serves it at http://localhost:4374/math-plane/
 * (playwright.config.ts). This smoke test loads the game there, plays one whole round, and checks that every request
 * stays under /math-plane/ and succeeds, that the bundled files load from there, and that the service worker and the
 * web app manifest use the sub-path.
 */
import { expect, seedStorage, startRound, test } from './fixtures';
import { SETTINGS_KEY } from '../../src/core/storage/storage';
import { PARTICLE_FILES } from '../../src/assets';
import { BUNDLED } from '../../src/audio/sfx';
import { playTrefferRound, shortRounds } from './play';

const BASE = '/math-plane/';

test('the game built for /math-plane/ loads, plays a round and requests nothing outside /math-plane/', async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  expect(new URL(baseURL!).pathname).toBe(BASE);
  const origin = new URL(baseURL!).origin;
  const requests: string[] = [];
  const failed: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });
  await seedStorage(page, { [SETTINGS_KEY]: shortRounds() });

  // Relative to baseURL, so the page opens at /math-plane/.
  await page.goto('./?seed=8&speed=4&test=1');
  expect(new URL(page.url()).pathname).toBe(BASE);
  await expect(page.getByTestId('start')).toBeVisible();

  // The manifest and its start address stay under /math-plane/, so "Zum Home-Bildschirm" opens the game there.
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifestUrl = new URL(manifestHref!, page.url());
  expect(manifestUrl.pathname.startsWith(BASE)).toBe(true);
  const manifest = (await (await page.request.get(manifestUrl.href)).json()) as { start_url: string };
  expect(new URL(manifest.start_url, manifestUrl).pathname).toBe(BASE);

  // The service worker controls only /math-plane/.
  const scope = await page.evaluate(() => navigator.serviceWorker.ready.then((r) => r.scope));
  expect(new URL(scope).pathname).toBe(BASE);

  const round = await startRound(page, '1');
  await playTrefferRound(page, round, 5);

  const outside = requests.filter((url) => {
    if (url.startsWith('data:') || url.startsWith('blob:')) return false;
    const u = new URL(url);
    return u.origin !== origin || !u.pathname.startsWith(BASE);
  });
  expect(outside).toEqual([]);
  expect(failed).toEqual([]);
  // The bundled files load from /math-plane/assets/ (src/assets.ts `assetUrl`).
  const paths = requests.map((url) => (url.startsWith('http') ? new URL(url).pathname : url));
  for (const file of [...Object.values(PARTICLE_FILES), ...Object.values(BUNDLED)]) expect(paths, file).toContain(`${BASE}assets/${file}`);
});
