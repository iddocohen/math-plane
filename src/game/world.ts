/**
 * The world the scene draws in (contracts/screens.md): 1600 by 1000 units, scaled to fit the screen. The sky reaches
 * down to SKY_BOTTOM, the grass field fills the rest, and the plane flies between PLANE_Y.min and PLANE_Y.max.
 */
export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1000;
/** Where the grass field starts. */
export const SKY_BOTTOM = 380;
/** The height band the plane flies in; it bobs ±PLANE_BOB around the middle. */
export const PLANE_Y = { min: 90, max: 150 } as const;
export const PLANE_BOB = 8;
/** The side of one square of the faint grid on the field. */
export const FIELD_GRID = 80;

/** Depths, back to front. */
export const DEPTH = {
  sky: 0,
  clouds: 1,
  // The plane flying back far away: behind the clouds.
  planeFar: 0.5,
  targets: 10,
  effects: 20,
  plane: 30,
  trail: 29,
  front: 40,
} as const;
