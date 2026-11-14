// Adapted from math-soccer playwright.config.ts (which copied it from math-tank). The Fire tablet projects and
// tests/e2e/silk.ts are left out: Fire tablets are not a target of Mathe-Flieger. The ports are 4373 and 4374, not
// math-soccer's 4273 and 4274, so `reuseExistingServer` never tests math-soccer's build.
import { defineConfig, devices } from '@playwright/test';
import { GAME_WAIT } from './tests/e2e/gameWait';

/** Specs that run only in the iPad projects. */
const DEVICE_SPECS = /devices\.spec\.ts$/;
/** The smoke test of the build for GitHub Pages runs only in the `base-path` project. */
const BASE_PATH_SPEC = /basePath\.spec\.ts$/;
/** The frame rate check runs only in the `performance` project, after every other project. */
const PERFORMANCE_SPEC = /performance\.spec\.ts$/;
/**
 * As math-soccer: Chromium draws WebGL with the graphics card only when asked; headless it uses software rendering
 * (SwiftShader). On macOS the performance project uses Metal through ANGLE.
 */
const GPU_ARGS = process.platform === 'darwin' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [];
/** The game as GitHub Pages serves it: built with `--base=/math-plane/` into its own folder, on its own port. */
const BASE_PATH_URL = 'http://localhost:4374/math-plane/';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Every worker runs a browser that renders the round scene; PW_WORKERS changes the number for one run.
  workers: Number(process.env.PW_WORKERS) || 4,
  // Specs that play a round wait on game state for up to GAME_WAIT (tests/e2e/gameWait.ts) per step.
  timeout: 60_000,
  expect: { timeout: GAME_WAIT },
  use: {
    baseURL: 'http://localhost:4373',
    trace: 'on-first-retry',
  },
  projects: [
    // Test runs stay silent.
    { name: 'chromium', testIgnore: [DEVICE_SPECS, BASE_PATH_SPEC, PERFORMANCE_SPEC], use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--mute-audio'] } } },
    { name: 'firefox', testIgnore: [DEVICE_SPECS, BASE_PATH_SPEC, PERFORMANCE_SPEC], use: { ...devices['Desktop Firefox'], launchOptions: { firefoxUserPrefs: { 'media.volume_scale': '0.0' } } } },
    { name: 'webkit', testIgnore: [DEVICE_SPECS, BASE_PATH_SPEC, PERFORMANCE_SPEC], use: { ...devices['Desktop Safari'] } },
    // iPad held sideways and upright, in WebKit with touch. They run only the device specs.
    { name: 'ipad-landscape', testMatch: DEVICE_SPECS, use: { ...devices['iPad Mini landscape'] } },
    { name: 'ipad-portrait', testMatch: DEVICE_SPECS, use: { ...devices['iPad Mini'] } },
    // The build for GitHub Pages under /math-plane/, in Chromium.
    { name: 'base-path', testMatch: BASE_PATH_SPEC, use: { ...devices['Desktop Chrome'], baseURL: BASE_PATH_URL, launchOptions: { args: ['--mute-audio'] } } },
    // The frame rate in Chromium, after all other projects so no other browser renders at the same time.
    // `--no-deps` runs it alone.
    {
      name: 'performance',
      testMatch: PERFORMANCE_SPEC,
      dependencies: ['chromium', 'firefox', 'webkit', 'ipad-landscape', 'ipad-portrait', 'base-path'],
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--mute-audio', ...GPU_ARGS] } },
    },
  ],
  webServer: [
    {
      command: 'pnpm build && pnpm preview --port 4373 --strictPort',
      url: 'http://localhost:4373',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Its own output folder, so the two builds do not overwrite each other.
      command: 'pnpm exec vite build --base=/math-plane/ --outDir dist-base && pnpm exec vite preview --base=/math-plane/ --outDir dist-base --port 4374 --strictPort',
      url: BASE_PATH_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
