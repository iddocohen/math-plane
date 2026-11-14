// Adapted from math-soccer src/game/createGame.ts: one round scene over a RoundController per round.
/**
 * Phaser 4 game setup (research R2). The canvas draws a fixed world of 1600 by 1000 units (contracts/screens.md) and
 * is scaled to fit its parent with the aspect ratio kept (`Scale.FIT`). The background is transparent so the page
 * color shows around the letterbox. Phaser's own sound system is off: sounds come from src/audio/sfx.ts.
 *
 * A ResizeObserver on the parent fits the canvas whenever the parent changes size; Chrome on iOS can send no resize
 * event after the device turns.
 *
 * One game for the whole session: the app creates it the first time a round shows and keeps it, with its canvas, its
 * WebGL context and the generated textures. Each round gets a new RoundScene over its own controller (`enter`), so no
 * state of the last round is carried over; leaving the round screen removes the scene and puts the game loop to sleep
 * (`leave`), so the start screen and the Hangar draw no frames.
 */
import Phaser from 'phaser';
import type { RoundController } from '../core/round/RoundController';
import type { PlaneLook } from './PlaneView';
import { ROUND_SCENE, RoundScene, type RoundSceneOptions } from './RoundScene';
import type { SceneKey } from './taskViews';
import { WORLD_HEIGHT, WORLD_WIDTH } from './world';

export interface GameHandle {
  game: Phaser.Game;
  /** Starts a new round scene over `controller` and wakes the game loop. */
  enter(controller: RoundController): void;
  /** Removes the round scene and puts the game loop to sleep; textures and the canvas stay. */
  leave(): void;
  /** A key for the scene's task views; true when one used it. */
  key(k: SceneKey): boolean;
  /** "Fertig": the scene holds it while crates still fall (RoundScene `done`). */
  done(): void;
  /** Shows the look chosen in the Hangar at once. */
  showLook(look: PlaneLook): void;
  destroy(): void;
}

export function createGame(parent: HTMLElement, controller: RoundController, options: RoundSceneOptions): GameHandle {
  let scene = new RoundScene(controller, options);
  // The controller of the scene that shows, and true while the round screen shows.
  let current = controller;
  let active = true;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    transparent: true,
    banner: false,
    audio: { noAudio: true },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
    },
    scene,
  });
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => fit(game, parent)) : null;
  observer?.observe(parent);

  const removeScene = () => {
    if (game.scene.getScene(ROUND_SCENE)) game.scene.remove(ROUND_SCENE);
  };
  const sleep = () => {
    removeScene();
    game.loop.sleep();
  };
  // The game boots after a frame; a round left before it ran is put to sleep after its first frame. Not in POST_STEP:
  // the scene manager is still processing then, so the removal would be queued and would remove the next round's
  // scene when the loop wakes.
  const sleepIfLeft = () => {
    if (!active) sleep();
  };
  // A round entered before the game booted starts once it has.
  let pending: RoundController | null = null;
  game.events.once(Phaser.Core.Events.READY, () => {
    if (pending === null || !active) return;
    const next = pending;
    pending = null;
    start(next);
  });
  const start = (next: RoundController) => {
    removeScene();
    current = next;
    scene = new RoundScene(next, options);
    game.scene.add(ROUND_SCENE, scene, true);
  };

  return {
    game,
    enter(next) {
      if (active && next === current) return;
      active = true;
      if (!game.isRunning) {
        pending = next;
        return;
      }
      start(next);
      // The parent may have been out of the page: fit the canvas before the first frame.
      fit(game, parent);
      game.loop.wake();
    },
    leave() {
      if (!active) return;
      active = false;
      pending = null;
      if (game.isRunning) sleep();
      else game.events.once(Phaser.Core.Events.POST_RENDER, sleepIfLeft);
    },
    key: (k) => (active ? scene.key(k) : false),
    done: () => {
      if (active && game.isRunning) scene.done();
      else current.done();
    },
    showLook: (look) => {
      if (active) scene.showLook(look);
    },
    destroy: () => {
      observer?.disconnect();
      game.destroy(true);
    },
  };
}

function fit(game: Phaser.Game, parent: HTMLElement): void {
  const scale = game.scale;
  // Before boot the scale manager has no canvas yet; it fits the canvas itself when it starts. A parent out of the
  // page has no size: the canvas is fitted when it comes back.
  if (!scale?.canvas || !parent.isConnected) return;
  scale.getParentBounds();
  scale.refresh();
}
