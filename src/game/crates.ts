/**
 * How crates fall in "Bauen" (prototype `digit`, `updCrates`): when each crate leaves the plane, how it sinks on its
 * parachute and drops the last bit, and when it lands. Pure, so it has unit tests; CratesView draws the crates.
 */

/**
 * The time between two crates dropping onto one square, in milliseconds. The prototype's 0.22 s let a higher crate,
 * which has one cube less to fall, land before the one under it; a crate needs 1 / CHUTE_SPEED s (385 ms) per cube, so
 * the gap is longer than that and every crate lands on one already there.
 */
export const CRATE_GAP_MS = 450;
/** How fast a crate sinks on its parachute, in cubes per second (prototype: 2.6). */
export const CHUTE_SPEED = 2.6;
/** How fast a crate speeds up after its parachute lets go, in cubes per second squared (prototype: 20). */
export const FALL_ACCEL = 20;
/** The parachute lets go this far above where the crate lands, in cubes (prototype: 0.25). */
export const CHUTE_OPEN = 0.25;
/** How long the plane trails smoke in the building's color after a right "Fertig". */
export const CELEBRATE_SMOKE_MS = 3000;

/** A crate on its way down, in play time. */
export interface FallingCrate {
  row: number;
  col: number;
  /** Its height now, in cubes. */
  z: number;
  /** The height it lands at: the number of cubes under it. */
  tz: number;
  /** Speed downward, in cubes per second. */
  vz: number;
  /** Play time left before it leaves the plane. */
  delayMs: number;
}

/**
 * Moves the crates on by `ms` (prototype `updCrates`). Returns the crates that landed; the others stay in `crates`,
 * moved on.
 */
export function stepCrates(crates: FallingCrate[], ms: number): FallingCrate[] {
  const landed: FallingCrate[] = [];
  for (let i = 0; i < crates.length; i++) {
    const c = crates[i]!;
    if (c.delayMs > 0) {
      c.delayMs -= ms;
      continue;
    }
    const s = ms / 1000;
    c.vz = c.z > c.tz + CHUTE_OPEN ? CHUTE_SPEED : c.vz + s * FALL_ACCEL;
    c.z -= c.vz * s;
    if (c.z <= c.tz) {
      c.z = c.tz;
      landed.push(c);
      crates.splice(i, 1);
      i--;
    }
  }
  return landed;
}

/**
 * The crates that bring the stack on (`row`, `col`) from `have` cubes (landed and falling) to `to` (prototype
 * `digit`): one per missing cube, the first leaving the plane after `delayMs`, each next `CRATE_GAP_MS` later, all
 * from height `fromZ`.
 */
export function cratesFor(row: number, col: number, have: number, to: number, fromZ: number, delayMs: number): FallingCrate[] {
  const out: FallingCrate[] = [];
  for (let k = have; k < to; k++) out.push({ row, col, z: Math.max(fromZ, k + 1), tz: k, vz: 0, delayMs: delayMs + (k - have) * CRATE_GAP_MS });
  return out;
}

