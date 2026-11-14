/**
 * The Phaser scene of one round (plan "Project Structure", research R2, R9): the sky and the field (SkyView), the plane
 * (PlaneView), the effects (EffectsView), and the views of the task kinds (taskViews.ts) over the RoundController's
 * state. The controller decides every outcome; the scene only animates and calls it back.
 *
 * - Subscribes to the controller in create() and unsubscribes on shutdown. Every event goes to the task views of the
 *   current kind, then every view gets the new state.
 * - Play time: every frame moves the views on by the frame time times `speed()` (the test hook `?speed=`), and not at
 *   all while the round is paused, so a paused round holds still.
 * - A bomb pass (`passStarted`) sends the plane across. The bomb view (T035) lands the bomb; until it exists, and
 *   whenever a view does not, `controller.tick()` lands it after the fallback time (research R18).
 * - After a miss (`feedback`) or a solved task (`celebrate`), the scene waits NEXT_DELAY_MS of play time and until no
 *   view is busy, then calls `next()`. A right "Fertig" throws confetti.
 */
import Phaser from 'phaser';
import type { Phase, RoundController, RoundEvent, RoundState } from '../core/round/RoundController';
import { EffectsView, loadParticleImages } from './EffectsView';
import { DEFAULT_LOOK, PlaneView, type PlaneLook } from './PlaneView';
import { SkyView } from './SkyView';
import { TASK_VIEWS, type SceneKey, type TaskView, type TaskViewContext, type TaskViewFactory } from './taskViews';

/** How long a hit, a miss or a solved task shows before the round goes on. */
export const NEXT_DELAY_MS = 1500;

export interface RoundSceneOptions {
  /** How fast play time runs: 1, or the test hook's factor. Read every frame. */
  speed: () => number;
  /** The plane's look from the Hangar. */
  look?: () => PlaneLook;
}

export const ROUND_SCENE = 'round';

export class RoundScene extends Phaser.Scene {
  private readonly controller: RoundController;
  private readonly options: RoundSceneOptions;
  private unsubscribe: (() => void) | null = null;
  private sky!: SkyView;
  private effects!: EffectsView;
  private plane!: PlaneView;
  private views: Array<{ factory: TaskViewFactory; view: TaskView }> = [];
  private playMs = 0;
  private nextAt: number | null = null;
  private state!: RoundState;

  constructor(controller: RoundController, options: RoundSceneOptions) {
    super(ROUND_SCENE);
    this.controller = controller;
    this.options = options;
  }

  preload(): void {
    loadParticleImages(this);
  }

  create(): void {
    this.playMs = 0;
    this.nextAt = null;
    this.sky = new SkyView(this);
    this.effects = new EffectsView(this);
    this.plane = new PlaneView(this, this.effects.trail, this.options.look?.() ?? DEFAULT_LOOK);
    const ctx: TaskViewContext = {
      scene: this,
      input: this.controller,
      plane: this.plane,
      effects: this.effects,
      playMs: () => this.playMs,
    };
    this.views = TASK_VIEWS.map((factory) => ({ factory, view: factory.create(ctx) }));
    this.unsubscribe = this.controller.subscribe((e) => this.onEvent(e));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.teardown, this);
    this.state = this.controller.state();
    this.showState();
    this.waitIfDone(this.state.phase);
  }

  update(_time: number, delta: number): void {
    this.controller.tick();
    if (this.state.phase === 'paused' || this.state.phase === 'ended') return;
    const ms = delta * Math.max(0, this.options.speed());
    this.playMs += ms;
    this.sky.update(ms);
    this.plane.update(ms);
    this.effects.update(ms);
    for (const { view } of this.current()) view.update?.(ms, this.state);
    if (this.nextAt !== null && this.playMs >= this.nextAt && !this.current().some(({ view }) => view.busy?.(this.state.phase))) {
      this.nextAt = null;
      this.controller.next();
    }
  }

  /** A key for the current task's views (arrows, Tab, Enter or Space, digits, Backspace). */
  key(k: SceneKey): boolean {
    let used = false;
    for (const { view } of this.current()) used = (view.key?.(k, this.state) ?? false) || used;
    return used;
  }

  /** Shows the look chosen in the Hangar at once. */
  showLook(look: PlaneLook): void {
    this.plane?.setLook(look);
  }

  private current(): Array<{ factory: TaskViewFactory; view: TaskView }> {
    const kind = this.state.task.kind;
    return this.views.filter(({ factory }) => factory.kinds.includes(kind));
  }

  private onEvent(e: RoundEvent): void {
    const before = this.state;
    this.state = this.controller.state();
    for (const { view } of this.current()) view.event?.(e, this.state);
    if (e.type === 'passStarted') this.plane.startPass(null);
    else if (e.type === 'checked' && e.right) this.effects.celebrate();
    else if (e.type === 'phaseChanged') this.waitIfDone(e.phase);
    if (e.type === 'taskStarted' && before.task.kind !== this.state.task.kind) {
      for (const { factory, view } of this.views) if (!factory.kinds.includes(this.state.task.kind)) view.hide();
    }
    this.showState();
  }

  private waitIfDone(phase: Phase): void {
    if (phase === 'feedback' || phase === 'celebrate') this.nextAt = this.playMs + NEXT_DELAY_MS;
    else if (phase !== 'paused') this.nextAt = null;
  }

  private showState(): void {
    for (const { view } of this.views) {
      if (this.current().some((c) => c.view === view)) view.show(this.state);
      else view.hide();
    }
  }

  private teardown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    for (const { view } of this.views) view.destroy();
    this.views = [];
    this.effects?.destroy();
    this.plane?.destroy();
  }
}
