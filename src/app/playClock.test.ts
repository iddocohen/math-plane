import { afterEach, describe, expect, it } from 'vitest';
import { createPlayClock, playSpeed, seedFromUrl, speedFromUrl, testFromUrl } from './playClock';

afterEach(() => {
  delete window.mathPlaneSpeed;
});

describe('createPlayClock (?speed=)', () => {
  it('runs as fast as real time at speed 1 and N times as fast at speed N', () => {
    let real = 0;
    let speed = 1;
    const clock = createPlayClock(
      () => speed,
      () => real,
      1000,
    );
    expect(clock.now()).toBe(1000);
    real = 500;
    expect(clock.now()).toBe(1500);
    speed = 4;
    real = 600;
    expect(clock.now()).toBe(1900);
  });

  it('never runs backwards', () => {
    let real = 100;
    const clock = createPlayClock(
      () => 2,
      () => real,
      0,
    );
    real = 50;
    expect(clock.now()).toBe(0);
  });
});

describe('query parameters', () => {
  it('reads the seed, the speed and the test flag', () => {
    expect(seedFromUrl('?seed=42')).toBe(42);
    expect(seedFromUrl('?seed=-1')).toBeUndefined();
    expect(speedFromUrl('?speed=8')).toBe(8);
    expect(speedFromUrl('?speed=fast')).toBeUndefined();
    expect(testFromUrl('?test=1')).toBe(true);
    expect(testFromUrl('?test=0')).toBe(false);
  });

  it('window.mathPlaneSpeed changes the speed only when the page has ?speed=', () => {
    window.mathPlaneSpeed = 3;
    expect(playSpeed(undefined)).toBe(1);
    expect(playSpeed(10)).toBe(3);
  });
});
