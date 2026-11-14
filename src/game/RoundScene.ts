/**
 * The Phaser scene of one round (plan "Project Structure", research R2, R9): the sky and the field (SkyView), the plane
 * (PlaneView), the effects (EffectsView), and the views of the task kinds (taskViews.ts) over the RoundController's
 * state. The controller decides every outcome; the scene only animates and calls it back.
 *
 * - Subscribes to the controller in create() and unsubscribes on shutdown. Every event goes to the task views of the
 *   current kind, then every view gets the new state.
 * - Play time: every frame moves the views on by the frame time times `speed()` (the test hook `?speed=`), and not at
 *   all while the round is paused, so a paused round holds still.
 * - A bomb pass (`passStarted`) sends the plane across, then the task views get the event: BombView restarts the
 *   pass with its release point and lands the bomb. Whenever no view lands it, `controller.tick()` does after the
 *   fallback time (research R18).
 * - After a miss (`feedback`) or a solved task (`celebrate`), the scene waits NEXT_DELAY_MS of play time and until no
 *   view is busy, then calls `next()`. A right "Fertig" throws confetti. A "Fertig" while a view is busy (crates
 *   still falling in "Bauen") waits until it is done (`done()`).
 * - While the scene runs, the canvas carries `data-scene="round"`, so end-to-end tests wait for the scene before they
 *   press keys that go to it.
 */
import Phaser from 'phaser';
import type { SoundName } from '../audio/sfx';
import type { Phase, RoundController, RoundEvent, RoundState } from '../core/round/RoundController';
import type { BombStyle } from './effects';
import type { HangarLook } from '../core/rewards/hangar';
import { EffectsView, loadParticleImages } from './EffectsView';
import { DEFAULT_LOOK, PlaneView } from './PlaneView';
import { SkyView } from './SkyView';
import { TASK_VIEWS, type SceneKey, type TaskView, type TaskViewContext, type TaskViewFactory } from './taskViews';

/** How long a hit, a miss or a solved task shows before the round goes on. */
export const NEXT_DELAY_MS = 1500;

export interface RoundSceneOptions {
  /** How fast play time runs: 1, or the test hook's factor. Read every frame. */
  speed: () => number;
  /** The look chosen in the Hangar, read when the scene starts; the prototype's plane and confetti without it. */
  look?: () => HangarLook;
  /** Plays a sound effect; silent without it. */
  sound?: (name: SoundName) => void;
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
  /** A "Fertig" held until no view is busy. */
  private doneWaiting = false;
  private state!: RoundState;
  /** The bomb style of the Hangar; BombView reads it on every hit. */
  private bombStyle: BombStyle = 'confetti';

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
    this.doneWaiting = false;
    this.sky = new SkyView(this);
    this.effects = new EffectsView(this);
    const look = this.options.look?.() ?? { ...DEFAULT_LOOK, bomb: 'confetti' };
    this.plane = new PlaneView(this, this.effects.trail, look);
    this.bombStyle = look.bomb;
    const ctx: TaskViewContext = {
      scene: this,
      input: this.controller,
      plane: this.plane,
      effects: this.effects,
      playMs: () => this.playMs,
      phase: () => this.state.phase,
      sound: (name) => this.options.sound?.(name),
      bombStyle: () => this.bombStyle,
    };
    this.views = TASK_VIEWS.map((factory) => ({ factory, view: factory.create(ctx) }));
    this.unsubscribe = this.controller.subscribe((e) => this.onEvent(e));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.teardown, this);
    this.state = this.controller.state();
    this.showState();
    this.waitIfDone(this.state.phase);
    this.game.canvas?.setAttribute('data-scene', ROUND_SCENE);
    this.markLook(look);
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
    if (this.doneWaiting && !this.current().some(({ view }) => view.busy?.(this.state.phase))) {
      this.doneWaiting = false;
      this.controller.done();
    }
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

  /**
   * "Fertig": checks at once, or, while a view is still busy (crates falling), once it is done, as the prototype does.
   */
  done(): void {
    if (this.current().some(({ view }) => view.busy?.(this.state.phase))) this.doneWaiting = true;
    else this.controller.done();
  }

  /** Shows the look chosen in the Hangar at once: the plane now, the bomb style from the next burst. */
  showLook(look: HangarLook): void {
    this.plane?.setLook(look);
    this.bombStyle = look.bomb;
    this.markLook(look);
  }

  /** For tests: the canvas carries the look the scene uses (`data-plane-color`, `data-bomb-style` and so on). */
  private markLook(look: HangarLook): void {
    const canvas = this.game.canvas;
    if (!canvas) return;
    canvas.setAttribute('data-plane-color', look.color);
    canvas.setAttribute('data-plane-tail', look.tail);
    canvas.setAttribute('data-plane-hat', look.hat);
    canvas.setAttribute('data-plane-smoke', look.smoke?.join(' ') ?? 'none');
    canvas.setAttribute('data-bomb-style', look.bomb);
  }

  private current(): Array<{ factory: TaskViewFactory; view: TaskView }> {
    const kind = this.state.task.kind;
    return this.views.filter(({ factory }) => factory.kinds.includes(kind));
  }

  private onEvent(e: RoundEvent): void {
    const before = this.state;
    this.state = this.controller.state();
    // The plane starts the pass before the views see it, so a view can restart it with a release point.
    if (e.type === 'passStarted') this.plane.startPass(null);
    for (const { view } of this.current()) view.event?.(e, this.state);
    if (e.type === 'taskStarted') this.doneWaiting = false;
    if (e.type === 'checked' && e.right) this.effects.celebrate();
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
    this.game?.canvas?.removeAttribute('data-scene');
    this.unsubscribe?.();
    this.unsubscribe = null;
    for (const { view } of this.views) view.destroy();
    this.views = [];
    this.effects?.destroy();
    this.plane?.destroy();
  }
}
