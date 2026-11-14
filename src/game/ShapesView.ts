/**
 * "Formen finden" (FR-003, FR-017, FR-024c): the flat shapes lie on the field drawn straight from above, so a square
 * stays a square, as the prototype's `drawFlat` at 1.5 times its size. Each shape has its own size and turn, and the
 * Rechteck its own length (core/tasks/generate.ts). Slots, taps, the marker and the moves come from TargetsView.
 */
import type { FormenTask, ShapeLook } from '../core/tasks/types';
import type { FlatShape } from '../core/types';
import { shade } from './palette';
import { AIM_RISE } from './slots';
import { targetsViewFactory, type TargetArt } from './TargetsView';

export const SHAPE_SCALE = 1.5;
/** The Rechteck's short side in the prototype's units (its long side is `aspect` times longer). */
const RECT_SHORT = 44;

function path(ctx: CanvasRenderingContext2D, k: FlatShape, look: ShapeLook): void {
  ctx.beginPath();
  switch (k) {
    case 'kreis':
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      break;
    case 'quadrat':
      ctx.rect(-30, -30, 60, 60);
      break;
    case 'rechteck': {
      const long = RECT_SHORT * look.aspect;
      ctx.rect(-long / 2, -RECT_SHORT / 2, long, RECT_SHORT);
      break;
    }
    case 'dreieck':
      ctx.moveTo(-6, -42);
      ctx.lineTo(38, 30);
      ctx.lineTo(-40, 26);
      ctx.closePath();
      break;
  }
}

/** One flat shape with its middle at (0, 0) in the prototype's units, seen from above (prototype `drawFlat`). */
export function drawFlat(ctx: CanvasRenderingContext2D, k: FlatShape, color: string, look: ShapeLook): void {
  ctx.save();
  ctx.rotate((look.turn * Math.PI) / 180);
  ctx.scale(look.scale, look.scale);
  ctx.save();
  ctx.translate(3, 3);
  path(ctx, k, look);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.fill();
  ctx.restore();
  path(ctx, k, look);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2.5 / look.scale;
  ctx.strokeStyle = shade(color, 0.6);
  ctx.stroke();
  ctx.restore();
}

export const SHAPES_ART: TargetArt<FormenTask> = {
  box: { width: 180, height: 180, originX: 90, originY: 90 },
  tapRadius: 90,
  rise: AIM_RISE.formen!,
  // Seen from above, the ring around a shape is a circle.
  marker: { rx: 82, ry: 82, below: 0 },
  count: (task) => task.choices.length,
  signature: (task, i) => JSON.stringify([task.choices[i], task.colors[i], task.looks[i]]),
  draw: (ctx, task, i) => {
    ctx.scale(SHAPE_SCALE, SHAPE_SCALE);
    drawFlat(ctx, task.choices[i]!, task.colors[i]!, task.looks[i]!);
  },
};

export const shapesView = targetsViewFactory(['formen'], 'shape', SHAPES_ART);
