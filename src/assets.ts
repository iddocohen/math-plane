// Adapted from math-soccer src/assets.ts: the files Mathe-Flieger bundles (README asset table).
/**
 * The bundled asset files in public/assets (FR-058). Their URLs follow the Vite base path, so the build for GitHub
 * Pages under /math-plane/ finds them too. Every file ships with the build: no request leaves the site.
 */
import type { ParticleImage } from './game/particles';

/** The URL of a file in public/assets under the base path of the build. */
export function assetUrl(name: string): string {
  return `${import.meta.env.BASE_URL}assets/${name}`;
}

/** The Kenney particle images, white on transparent and 64 px wide, tinted in code. */
export const PARTICLE_FILES: Record<ParticleImage, string> = {
  twinkle: 'star_04.png',
  star: 'star_07.png',
  sparkle: 'star_06.png',
  flare: 'flare_01.png',
  light: 'light_01.png',
  smoke: 'smoke_07.png',
};

/** Fredoka with the system fonts as fallback; the same list as `font-family` in src/app/styles.css. */
export const GAME_FONT = "Fredoka, 'Trebuchet MS', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
/** The weight the scene draws text with; the variable font goes from 300 to 700. */
export const GAME_FONT_WEIGHT = 600;

/**
 * Resolves when Fredoka is loaded, or after `timeoutMs` (or at once without the Font Loading API), so a canvas drawn
 * after it uses the font when it is there and the system font when it is not.
 */
export function fontReady(timeoutMs = 1500): Promise<void> {
  const fonts = typeof document === 'undefined' ? undefined : document.fonts;
  if (!fonts) return Promise.resolve();
  const loaded = fonts.load(`${GAME_FONT_WEIGHT} 32px Fredoka`).then(
    () => undefined,
    () => undefined,
  );
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([loaded, timeout]);
}
