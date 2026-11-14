/**
 * Where the plane is, as plain data so the motion has unit tests (FR-004, FR-006, research R9). PlaneView draws it.
 *
 * The plane always crosses the field from left to right:
 * - `cruise`: between bombs it flies slowly across, as the prototype does.
 * - `pass`: a bomb pass, fast enough to cross from START_X to TURN_X in PASS_MS. It reports `release` once when it
 *   reaches the release point the view asked for, and `passEnd` when it reaches TURN_X.
 * - `turn`: at the right edge it turns around, climbing and getting smaller, as if it flew away into the sky.
 * - `back`: small and high, it flies back to the left behind the clouds, then starts a new cruise.
 *
 * A new pass can start at any time; the plane then comes in again from the left edge (`START_X`), as the prototype's
 * `startPass` does. The plane bobs ±PLANE_BOB around the middle of its height band.
 */
import { PASS_MS } from '../core/round/RoundController';
import { PLANE_BOB, PLANE_Y, WORLD_WIDTH } from './world';

export type FlightMode = 'cruise' | 'pass' | 'turn' | 'back';

/** Where a crossing starts, off the left edge. */
export const START_X = -170;
/** Where the plane starts its turn, near the right edge. */
export const TURN_X = WORLD_WIDTH - 100;
/** The prototype's cruising speed (150 in a 1024-wide world). */
export const CRUISE_SPEED = (150 * WORLD_WIDTH) / 1024;
/** A bomb pass crosses from START_X to TURN_X in PASS_MS. */
export const PASS_SPEED = (TURN_X - START_X) / (PASS_MS / 1000);
export const TURN_MS = 1000;
/** How far the plane moves on to the right while it turns. */
const TURN_REACH = 90;
/** The far plane, flying back: its height and size. */
export const FAR_Y = 52;
export const FAR_SCALE = 0.45;
const BACK_SPEED = CRUISE_SPEED * 1.6;
/** The middle of the height band. */
export const CRUISE_Y = (PLANE_Y.min + PLANE_Y.max) / 2;
/** Bobbing: radians per second of the sine. */
const BOB_RATE = 2.2;

export type FlightEvent = 'release' | 'passEnd';

export interface FlightState {
  mode: FlightMode;
  x: number;
  y: number;
  /** 1 facing right, -1 facing left; in between while turning. */
  facing: number;
  scale: number;
  /** A slight tilt in radians. */
  tilt: number;
}

export class Flight {
  private mode: FlightMode = 'cruise';
  private x: number;
  private ms = 0;
  private turnMs = 0;
  private turnFromX = 0;
  private releaseX: number | null = null;

  constructor(x = START_X) {
    this.x = x;
  }

  /** Starts a bomb pass from the left edge; `releaseX` is where `release` fires, or null for no bomb. */
  startPass(releaseX: number | null): void {
    this.mode = 'pass';
    this.x = START_X;
    this.releaseX = releaseX;
  }

  get flying(): FlightMode {
    return this.mode;
  }

  /** Moves the plane on by `ms`; returns what happened on the way. */
  step(ms: number): FlightEvent[] {
    const events: FlightEvent[] = [];
    this.ms += ms;
    const s = ms / 1000;
    switch (this.mode) {
      case 'cruise':
      case 'pass': {
        const speed = this.mode === 'pass' ? PASS_SPEED : CRUISE_SPEED;
        this.x += speed * s;
        if (this.mode === 'pass' && this.releaseX !== null && this.x >= this.releaseX) {
          this.releaseX = null;
          events.push('release');
        }
        if (this.x >= TURN_X) {
          if (this.mode === 'pass') {
            if (this.releaseX !== null) events.push('release');
            this.releaseX = null;
            events.push('passEnd');
          }
          this.mode = 'turn';
          this.turnMs = 0;
          this.turnFromX = TURN_X;
          this.x = TURN_X;
        }
        break;
      }
      case 'turn':
        this.turnMs += ms;
        if (this.turnMs >= TURN_MS) {
          this.mode = 'back';
          this.x = this.turnFromX;
        }
        break;
      case 'back':
        this.x -= BACK_SPEED * s;
        if (this.x <= START_X) {
          this.mode = 'cruise';
          this.x = START_X;
        }
        break;
    }
    return events;
  }

  state(): FlightState {
    const bob = Math.sin((this.ms / 1000) * BOB_RATE) * PLANE_BOB;
    const tilt = Math.sin((this.ms / 1000) * BOB_RATE + 1) * 0.03;
    switch (this.mode) {
      case 'cruise':
      case 'pass':
        return { mode: this.mode, x: this.x, y: CRUISE_Y + bob, facing: 1, scale: 1, tilt };
      case 'turn': {
        const k = Math.min(1, this.turnMs / TURN_MS);
        return {
          mode: 'turn',
          x: this.turnFromX + Math.sin(Math.PI * k) * TURN_REACH,
          y: CRUISE_Y + bob * (1 - k) + (FAR_Y - CRUISE_Y) * k,
          facing: Math.cos(Math.PI * k),
          scale: 1 + (FAR_SCALE - 1) * k,
          tilt: -0.25 * Math.sin(Math.PI * k),
        };
      }
      case 'back':
        return { mode: 'back', x: this.x, y: FAR_Y + bob * FAR_SCALE, facing: -1, scale: FAR_SCALE, tilt: tilt * FAR_SCALE };
    }
  }
}
