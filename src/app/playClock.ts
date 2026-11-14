/**
 * The clock the RoundController reads (`now`), with the test hook `?speed=N` (contracts/screens.md "Test hooks"):
 * play time runs `speed()` times as fast as real time. It starts at the real date, so recorded attempts carry a date
 * near the real one. `speed()` is read on every call, so `window.mathPlaneSpeed` can change it while the page runs.
 */
export interface PlayClock {
  now(): number;
}

export function createPlayClock(speed: () => number, realNow: () => number = () => performance.now(), epoch: number = Date.now()): PlayClock {
  let last = realNow();
  let played = 0;
  return {
    now() {
      const t = realNow();
      played += Math.max(0, t - last) * Math.max(0, speed());
      last = t;
      return epoch + played;
    },
  };
}

/** The `seed` query parameter as a non-negative integer, or undefined (as math-soccer). */
export function seedFromUrl(search: string): number | undefined {
  const raw = new URLSearchParams(search).get('seed');
  if (raw === null || !/^\d{1,10}$/.test(raw)) return undefined;
  return Number(raw) >>> 0;
}

/** The `speed` query parameter as a factor from 0 to 1000, or undefined without it (as math-soccer). */
export function speedFromUrl(search: string): number | undefined {
  const raw = new URLSearchParams(search).get('speed');
  if (raw === null || !/^\d{1,4}(\.\d+)?$/.test(raw)) return undefined;
  return Math.min(1000, Number(raw));
}

/** The factor play time runs at: 1, unless the page was opened with `?speed=` (then `window.mathPlaneSpeed` may change it). */
export function playSpeed(fromUrl: number | undefined): number {
  if (fromUrl === undefined) return 1;
  const live = typeof window === 'undefined' ? undefined : window.mathPlaneSpeed;
  return typeof live === 'number' && live >= 0 && Number.isFinite(live) ? live : fromUrl;
}

/** True when the page was opened with `?test=1`: `data-answer` is then filled. */
export function testFromUrl(search: string): boolean {
  return new URLSearchParams(search).get('test') === '1';
}
