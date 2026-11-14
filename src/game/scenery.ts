/**
 * The scenery of the round's backdrop (SkyView): trees, bushes and fences on the hills along the horizon, and a sun in
 * the sky. The pictures are Kenney "Background Elements Redux" files (README asset table), as plain data so the layout
 * has unit tests and the start screen can use the same files.
 *
 * Nothing stands in the play area: every picture fits in SCENERY_BAND, between the plane's height band and the top of
 * the field, where the targets, buildings, cards and grids start (y 390, paintLayout.ts `GRID_CARD`). The pictures are
 * drawn at the sky's depth, behind everything else, so even a falling crate or bomb passes in front of them.
 */
import { SKY_BOTTOM } from './world';

/** The scenery pictures in public/assets, with their size in pixels. */
export const SCENERY_FILES = {
  tree: { file: 'tree.png', width: 94, height: 204 },
  treePine: { file: 'treePine.png', width: 106, height: 254 },
  treeLong: { file: 'treeLong.png', width: 82, height: 249 },
  bush: { file: 'bush1.png', width: 120, height: 60 },
  tuft: { file: 'bush2.png', width: 53, height: 44 },
  fence: { file: 'fence.png', width: 104, height: 77 },
  sun: { file: 'sun.png', width: 128, height: 128 },
} as const;

export type SceneryPicture = keyof typeof SCENERY_FILES;

/** The band scenery may fill, in world units: below the plane and the top buttons, above the field. */
export const SCENERY_BAND = { top: 170, bottom: 390 } as const;

/** The top line of the hills at `x` (SkyView draws the hills with it). */
export function hillY(x: number): number {
  return SKY_BOTTOM - 34 + Math.sin(x / 190) * 22;
}

/** One placed picture: its box in world units, top left corner at (x, y). */
export interface SceneryItem {
  picture: SceneryPicture;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where each picture stands on the hills: its middle on x and its scale. Clusters at both sides, a few in between. */
const PLACES: ReadonlyArray<[SceneryPicture, number, number]> = [
  ['treePine', 60, 0.56],
  ['tree', 120, 0.62],
  ['tuft', 168, 0.7],
  ['bush', 215, 0.55],
  ['fence', 290, 0.5],
  ['fence', 345, 0.5],
  ['treeLong', 560, 0.46],
  ['tuft', 600, 0.6],
  ['bush', 930, 0.45],
  ['tree', 985, 0.5],
  ['fence', 1250, 0.5],
  ['bush', 1320, 0.5],
  ['treePine', 1385, 0.6],
  ['tree', 1450, 0.66],
  ['treeLong', 1510, 0.52],
  ['tuft', 1556, 0.7],
];

/** How far a picture's foot sinks into the hill, so it does not float on its edge. */
const FOOT = 8;
/** The sun: its middle and its size in world units. */
const SUN = { x: 1190, y: 238, size: 104 } as const;

/** Every scenery picture with its box, back to front (the sun first). */
export function sceneryLayout(): SceneryItem[] {
  const sun: SceneryItem = { picture: 'sun', x: SUN.x - SUN.size / 2, y: SUN.y - SUN.size / 2, width: SUN.size, height: SUN.size };
  return [
    sun,
    ...PLACES.map(([picture, x, scale]) => {
      const width = SCENERY_FILES[picture].width * scale;
      const height = SCENERY_FILES[picture].height * scale;
      const foot = hillY(x) + FOOT;
      return { picture, x: x - width / 2, y: foot - height, width, height };
    }),
  ];
}
