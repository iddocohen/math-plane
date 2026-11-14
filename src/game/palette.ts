/**
 * The colors of the scene, taken from the prototype (specs/001-math-plane/prototype/index.html). CSS strings are for the
 * 2D canvas drawings (iso.ts, SkyView, PlaneView); numbers are for Phaser tints.
 */
export const CSS = {
  ink: '#24324a',
  skyTop: '#5fb4ef',
  skyBottom: '#bfe6ff',
  hills: '#86c96d',
  grassTop: '#7cc46a',
  grassBottom: '#4f9b45',
  gold: '#ffd23f',
  /** The dashed marks of a wrong "Fertig" (FR-024a). */
  mark: '#ef7d22',
  /** The selected plan square or tile. */
  selected: 'rgba(255,230,120,.85)',
  crate: '#c98a3c',
  parachute: '#ff6b6b',
} as const;

/** The five building and target colors of the prototype (`PAL`); the tasks carry them (core/tasks/colors.ts). */
export { PIECE_COLORS } from '../core/tasks/colors';

/** The celebration colors of the prototype (`CELEB`). */
export const CELEBRATION = [0xffd23f, 0xff8fb1, 0x7ee0ff, 0x9be27a, 0xffffff] as const;
export const SMOKE = [0xd9d9d9, 0xbdbdbd, 0xffffff] as const;
export const WATER = [0x7ec8f0, 0x4aa8e0, 0xd8f2ff] as const;

/** `#rrggbb` as a number for Phaser. */
export function hexToNumber(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

/** A number color as `#rrggbb`. */
export function numberToHex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

/**
 * A color made lighter (`f` > 1, toward white) or darker (`f` < 1), as the prototype's `shade`. Returns `rgb(r,g,b)`.
 */
export function shade(hex: string, f: number): string {
  const n = hexToNumber(hex);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f))),
  );
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
