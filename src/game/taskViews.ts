/**
 * How the views of the task kinds plug into the round scene (plan "Controller decides, view animates"). Later tasks add
 * their views here by adding a factory to TASK_VIEWS; RoundScene and App stay as they are. "Treffer" choices use TargetsView (SolidsView, ShapesView) and the
 * bomb of every "Treffer" kind falls in BombView. "Bauplan finden" shows the plan cards (CardsView) and its buildings as
 * targets (BuildingView); "Ansicht finden" shows its building with the eye (BuildingView) and its view cards as targets
 * (CardsView). "Bauen" shows its cards (CardsView) and the field with the crates (CratesView). "Malen" and "Male an"
 * show the building with the eye and the paint grid (GridView).
 *
 * - A view gets a `TaskViewContext`: the scene, the plane, the effects, and `input`, the small part of the
 *   RoundController a view may call. Tap areas call `input` (for example `tapChoice(slot)` on a solid, `typeHeight` from
 *   a plan square), so the controller decides every outcome.
 * - The scene calls `show` with every new round state and `event` with every controller event, on every view whose
 *   `kinds` include the current task's kind; a view hides itself for other kinds in `show`.
 * - Keys the scene owns (arrows, Tab, Enter or Space, digits, Backspace) go to `key` of the current task's views; the
 *   view moves its marker or calls `input`. "Fertig", help and pause go to the controller directly from the app.
 */
import type Phaser from 'phaser';
import type { SoundName } from '../audio/sfx';
import type { Phase, RoundEvent, RoundState } from '../core/round/RoundController';
import type { TaskKind } from '../core/types';
import { bombView } from './BombView';
import { buildingTargetsView, buildingView } from './BuildingView';
import { bauenCardsView, planCardsView, viewCardsView } from './CardsView';
import { cratesView } from './CratesView';
import { gridView } from './GridView';
import type { BombStyle } from './effects';
import type { EffectsView } from './EffectsView';
import type { PlaneView } from './PlaneView';
import { shapesView } from './ShapesView';
import { solidsView } from './SolidsView';

/** The calls a view may make on the round: every one is ignored when it does not fit the phase or the task. */
export interface RoundInput {
  tapChoice(slot: number): void;
  landBomb(): void;
  select(row: number, col: number): void;
  typeHeight(row: number, col: number, height: number): void;
  clearHeight(row: number, col: number): void;
  togglePaint(row: number, col: number): void;
  pickColor(color: string): void;
  fillRegion(index: number): void;
  done(): void;
}

/** A key the scene passes to the current task's views. */
export type SceneKey =
  | { type: 'arrow'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  | { type: 'tab'; back: boolean }
  | { type: 'select' }
  | { type: 'digit'; digit: number }
  | { type: 'backspace' };

export interface TaskViewContext {
  scene: Phaser.Scene;
  input: RoundInput;
  plane: PlaneView;
  effects: EffectsView;
  /** Play time in milliseconds since the scene started; it stops while the round is paused. */
  playMs(): number;
  /** The round's phase now. */
  phase(): Phase;
  /** Plays a sound effect (src/audio/sfx.ts); silent when the app gave no sounds. */
  sound(name: SoundName): void;
  /** How a hit bursts: the bomb style chosen in the Hangar, confetti by default. */
  bombStyle(): BombStyle;
}

export interface TaskView {
  /** Draws `state`; called with every new state while the round shows. */
  show(state: RoundState): void;
  /** A controller event, before `show` with the state after it. */
  event?(e: RoundEvent, state: RoundState): void;
  /** A key; true when the view used it. */
  key?(k: SceneKey, state: RoundState): boolean;
  /** One frame of play time. */
  update?(ms: number, state: RoundState): void;
  /**
   * True while the view still animates the end of a hit, a miss or a solved task, or crates still fall, so the scene
   * waits before it calls `next()` and holds a "Fertig" until the view is done.
   */
  busy?(phase: Phase): boolean;
  /** Hides everything the view shows; the task kind moved on to another view. */
  hide(): void;
  destroy(): void;
}

export interface TaskViewFactory {
  /** The task kinds the view draws. */
  kinds: readonly TaskKind[];
  create(ctx: TaskViewContext): TaskView;
}

/** The views of the task kinds. */
export const TASK_VIEWS: TaskViewFactory[] = [
  solidsView,
  shapesView,
  planCardsView,
  buildingTargetsView,
  buildingView,
  viewCardsView,
  bombView,
  bauenCardsView,
  cratesView,
  gridView,
];
