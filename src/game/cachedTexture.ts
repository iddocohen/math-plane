/**
 * A canvas texture that a view draws a building, a card or the background into, redrawn only when what it shows
 * changes (research R19). The view passes a signature of what it draws, for example the plan and the marks as JSON;
 * the same signature again draws nothing, so a frame costs one image and no drawing.
 *
 * `resolution` draws the canvas that many times finer than the world, so the texture stays sharp when the game is
 * scaled up on a large screen.
 */
import Phaser from 'phaser';
import { redrawGate } from './iso';

export class CachedTexture {
  readonly key: string;
  private readonly texture: Phaser.Textures.CanvasTexture;
  private readonly changed = redrawGate();
  private readonly resolution: number;

  constructor(scene: Phaser.Scene, key: string, width: number, height: number, resolution = 1) {
    this.key = key;
    this.resolution = resolution;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const texture = scene.textures.createCanvas(key, Math.ceil(width * resolution), Math.ceil(height * resolution));
    if (!texture) throw new Error(`cachedTexture: no canvas texture ${key}`);
    this.texture = texture;
  }

  /** Draws with `draw` in world units when `signature` differs from the last one; true when it drew. */
  draw(signature: string, draw: (ctx: CanvasRenderingContext2D) => void): boolean {
    if (!this.changed(signature)) return false;
    const ctx = this.texture.getContext();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.texture.width, this.texture.height);
    ctx.setTransform(this.resolution, 0, 0, this.resolution, 0, 0);
    draw(ctx);
    this.texture.refresh();
    return true;
  }

  /** The scale an image of this texture needs to show it at world size. */
  get scale(): number {
    return 1 / this.resolution;
  }
}
