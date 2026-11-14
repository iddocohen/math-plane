/**
 * "Körper finden" (FR-002, FR-016): the 4 solids on the field in the fixed isometric view, drawn as the prototype's
 * `drawSolid` at 1.5 times its size (the prototype's world was 1024 wide, this one is 1600). Slots, taps, the
 * keyboard marker and the moves after a miss come from TargetsView.
 */
import type { KoerperTask } from '../core/tasks/types';
import type { Solid } from '../core/types';
import { drawBox, isoProjector, poly } from './iso';
import { shade } from './palette';
import { AIM_RISE } from './slots';
import { targetsViewFactory, type TargetArt } from './TargetsView';

/** The prototype drew for a 1024-wide world. */
export const SOLID_SCALE = 1.5;

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** One solid with its ground middle at (0, 0) in the prototype's units (prototype `drawSolid`). */
export function drawSolid(ctx: CanvasRenderingContext2D, k: Solid, color: string): void {
  shadow(ctx, 0, 4, 46, 17);
  switch (k) {
    case 'wuerfel':
      drawBox(ctx, isoProjector(0, 0, 36), -0.5, -0.5, 0, 1, 1, 1, color);
      break;
    case 'quader':
      drawBox(ctx, isoProjector(0, 0, 30), -1, -0.5, 0, 2, 1, 0.85, color);
      break;
    case 'zylinder': {
      const rx = 31;
      const ry = 15;
      const h = 62;
      const g = ctx.createLinearGradient(-rx, 0, rx, 0);
      g.addColorStop(0, shade(color, 0.75));
      g.addColorStop(0.4, shade(color, 1.1));
      g.addColorStop(1, shade(color, 0.6));
      ctx.beginPath();
      ctx.moveTo(-rx, -h);
      ctx.lineTo(-rx, 0);
      ctx.ellipse(0, 0, rx, ry, 0, Math.PI, 0, true);
      ctx.lineTo(rx, -h);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -h, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = shade(color, 1.25);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'kugel': {
      const g = ctx.createRadialGradient(-10, -44, 4, 0, -32, 34);
      g.addColorStop(0, shade(color, 1.5));
      g.addColorStop(1, shade(color, 0.7));
      ctx.beginPath();
      ctx.arc(0, -32, 33, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.3)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      break;
    }
    case 'pyramide': {
      const P = isoProjector(0, 0, 40);
      const apex = P(0, 0, 1.6);
      poly(ctx, [P(-0.5, 0.5, 0), P(0.5, 0.5, 0), apex], color);
      poly(ctx, [P(0.5, -0.5, 0), P(0.5, 0.5, 0), apex], shade(color, 0.72));
      break;
    }
  }
}

export const SOLIDS_ART: TargetArt<KoerperTask> = {
  box: { width: 240, height: 200, originX: 120, originY: 150 },
  tapRadius: 90,
  rise: AIM_RISE.koerper!,
  // The prototype's hover ring on the ground around a solid.
  marker: { rx: 85, ry: 34, below: 9 },
  count: (task) => task.choices.length,
  signature: (task, i) => `${task.choices[i]}:${task.colors[i]}`,
  draw: (ctx, task, i) => {
    ctx.scale(SOLID_SCALE, SOLID_SCALE);
    drawSolid(ctx, task.choices[i]!, task.colors[i]!);
  },
};

export const solidsView = targetsViewFactory(['koerper'], 'solid', SOLIDS_ART);
