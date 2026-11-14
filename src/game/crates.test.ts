// T046: how crates fall in "Bauen" (prototype `digit`, `updCrates`).
import { describe, expect, it } from 'vitest';
import { CHUTE_SPEED, CRATE_GAP_MS, cratesFor, stepCrates, type FallingCrate } from './crates';

/** Steps the crates in frames of 16 ms until all landed; returns each crate's landing time. */
function run(crates: FallingCrate[]): Map<FallingCrate, number> {
  const landed = new Map<FallingCrate, number>();
  let ms = 0;
  while (crates.length > 0 && ms < 60_000) {
    ms += 16;
    for (const c of stepCrates(crates, 16)) landed.set(c, ms);
  }
  return landed;
}

describe('cratesFor', () => {
  it('makes one crate per missing cube, each landing one higher and leaving the plane a gap later', () => {
    const crates = cratesFor(1, 2, 1, 4, 6.5, 500);
    expect(crates.map((c) => c.tz)).toEqual([1, 2, 3]);
    expect(crates.map((c) => c.delayMs)).toEqual([500, 500 + CRATE_GAP_MS, 500 + 2 * CRATE_GAP_MS]);
    for (const c of crates) expect(c).toMatchObject({ row: 1, col: 2, z: 6.5, vz: 0 });
    expect(cratesFor(0, 0, 3, 3, 6.5, 0)).toEqual([]);
    expect(cratesFor(0, 0, 3, 1, 6.5, 0)).toEqual([]);
  });

  it('never starts a crate below where it lands', () => {
    expect(cratesFor(0, 0, 0, 4, 1, 0).every((c) => c.z > c.tz)).toBe(true);
  });
});

describe('stepCrates', () => {
  it('waits for the delay, sinks on the parachute, then lands exactly on its height', () => {
    const c: FallingCrate = { row: 0, col: 0, z: 5, tz: 2, vz: 0, delayMs: 100 };
    const crates = [c];
    stepCrates(crates, 50);
    expect(c.z).toBe(5);
    stepCrates(crates, 60);
    stepCrates(crates, 100);
    expect(c.vz).toBe(CHUTE_SPEED);
    expect(c.z).toBeLessThan(5);
    const landed = run(crates);
    expect(landed.has(c)).toBe(true);
    expect(c.z).toBe(2);
    expect(crates).toEqual([]);
  });

  it('lands the crates of one stack bottom first', () => {
    const crates = cratesFor(0, 0, 0, 3, 6, 0);
    const [a, b, c] = crates as [FallingCrate, FallingCrate, FallingCrate];
    const landed = run(crates);
    expect(landed.get(a)!).toBeLessThanOrEqual(landed.get(b)!);
    expect(landed.get(b)!).toBeLessThanOrEqual(landed.get(c)!);
  });
});
