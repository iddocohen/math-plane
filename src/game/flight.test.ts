import { describe, expect, it } from 'vitest';
import { PASS_MS } from '../core/round/RoundController';
import { CRUISE_Y, FAR_SCALE, Flight, START_X, TURN_MS, TURN_X } from './flight';
import { PLANE_BOB, PLANE_Y } from './world';

/** Steps the flight in frames of 1/60 s for `ms`, collecting events with the time they happened. */
function run(f: Flight, ms: number, frame = 1000 / 60): Array<{ at: number; event: string }> {
  const out: Array<{ at: number; event: string }> = [];
  for (let t = 0; t < ms; t += frame) for (const event of f.step(frame)) out.push({ at: t + frame, event });
  return out;
}

describe('Flight (FR-004, FR-006)', () => {
  it('a pass crosses from the left edge to the turn in PASS_MS, releasing once at the asked point', () => {
    const f = new Flight(600);
    f.startPass(800);
    expect(f.state().x).toBe(START_X);
    const events = run(f, PASS_MS + 100);
    expect(events.map((e) => e.event)).toEqual(['release', 'passEnd']);
    const passEnd = events[1]!.at;
    expect(passEnd).toBeGreaterThan(PASS_MS - 50);
    expect(passEnd).toBeLessThan(PASS_MS + 50);
  });

  it('flies left to right, then turns at the right edge and comes back small and high', () => {
    const f = new Flight();
    let lastX = f.state().x;
    while (f.flying === 'cruise') {
      f.step(50);
      const s = f.state();
      if (s.mode === 'cruise') {
        expect(s.x).toBeGreaterThan(lastX);
        expect(s.facing).toBe(1);
      }
      lastX = s.x;
    }
    expect(f.flying).toBe('turn');
    expect(f.state().x).toBeGreaterThanOrEqual(TURN_X);
    run(f, TURN_MS);
    expect(f.flying).toBe('back');
    expect(f.state().facing).toBe(-1);
    expect(f.state().scale).toBe(FAR_SCALE);
    while (f.flying === 'back') f.step(50);
    expect(f.flying).toBe('cruise');
    expect(f.state().x).toBe(START_X);
  });

  it('bobs ±8 inside the height band while it crosses', () => {
    const f = new Flight();
    const ys: number[] = [];
    for (let i = 0; i < 300 && f.flying === 'cruise'; i++) {
      f.step(1000 / 60);
      ys.push(f.state().y);
    }
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(CRUISE_Y - PLANE_BOB - 0.01);
    expect(Math.max(...ys)).toBeLessThanOrEqual(CRUISE_Y + PLANE_BOB + 0.01);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(PLANE_BOB);
    expect(CRUISE_Y - PLANE_BOB).toBeGreaterThanOrEqual(PLANE_Y.min);
    expect(CRUISE_Y + PLANE_BOB).toBeLessThanOrEqual(PLANE_Y.max);
  });

  it('a pass without a release point only ends', () => {
    const f = new Flight();
    f.startPass(null);
    expect(run(f, PASS_MS + 100).map((e) => e.event)).toEqual(['passEnd']);
  });
});
