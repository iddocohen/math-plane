/**
 * The plane's drawing without Phaser (prototype `drawPlane`), shared by the round's plane (PlaneView.ts) and the
 * Hangar's preview and item pictures (src/app/Hangar.tsx), so both show the same plane.
 *
 * The look comes from the Hangar (core/rewards/hangar.ts `HangarLook`): the body color, the picture on the tail, the
 * smoke colors of the trail and the pilot's hat. The bomb style is not part of the plane.
 */
import type { HangarLook } from '../core/rewards/hangar';
import type { PilotHat } from '../core/rewards/items';
import { CSS, shade } from './palette';

export type PlaneLook = Omit<HangarLook, 'bomb'>;

/** The prototype's plane: red with a white star on the tail and a brown cap, no trail (the free Hangar items). */
export const DEFAULT_LOOK: PlaneLook = { color: '#e0413a', tail: 'star', smoke: null, hat: 'cap' };

/** The box around the plane in the prototype's plane units, with the plane's middle at (x, y). */
export const PLANE_BOX = { width: 140, height: 84, x: 72, y: 50 } as const;

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r);
  ctx.fill();
}

function flower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = CSS.gold;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function lightning(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = CSS.gold;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.3, y - r);
  ctx.lineTo(x - r * 0.6, y + r * 0.15);
  ctx.lineTo(x - r * 0.05, y + r * 0.15);
  ctx.lineTo(x - r * 0.35, y + r);
  ctx.lineTo(x + r * 0.6, y - r * 0.2);
  ctx.lineTo(x + r * 0.05, y - r * 0.2);
  ctx.closePath();
  ctx.fill();
}

function sun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = CSS.gold;
  ctx.strokeStyle = CSS.gold;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function hat(ctx: CanvasRenderingContext2D, kind: PilotHat): void {
  switch (kind) {
    case 'cap':
      ctx.fillStyle = '#7a4a1e';
      ctx.fillRect(8, -21, 12, 4);
      break;
    case 'helmet':
      ctx.fillStyle = '#f2f2f2';
      ctx.beginPath();
      ctx.arc(14, -16, 7, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#2f7fd1';
      ctx.fillRect(7, -17, 14, 2);
      break;
    case 'bobble':
      ctx.fillStyle = '#d64545';
      ctx.beginPath();
      ctx.arc(14, -17, 7, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, -18, 14, 2.5);
      ctx.beginPath();
      ctx.arc(14, -25, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'party':
      ctx.fillStyle = '#ff8fb1';
      ctx.beginPath();
      ctx.moveTo(9, -18);
      ctx.lineTo(19, -18);
      ctx.lineTo(14, -32);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = CSS.gold;
      ctx.beginPath();
      ctx.arc(14, -32, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'cowboy':
      ctx.fillStyle = '#9a6332';
      ctx.beginPath();
      ctx.ellipse(14, -18, 11, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, -18);
      ctx.lineTo(9, -26);
      ctx.lineTo(14, -24);
      ctx.lineTo(19, -26);
      ctx.lineTo(20, -18);
      ctx.closePath();
      ctx.fill();
      break;
    case 'crown':
      ctx.fillStyle = CSS.gold;
      ctx.beginPath();
      ctx.moveTo(8, -18);
      ctx.lineTo(8, -26);
      ctx.lineTo(11, -21);
      ctx.lineTo(14, -27);
      ctx.lineTo(17, -21);
      ctx.lineTo(20, -26);
      ctx.lineTo(20, -18);
      ctx.closePath();
      ctx.fill();
      break;
  }
}

/** Draws the plane without its propeller in the prototype's units, its middle at (0, 0), facing right. */
export function drawPlaneBody(ctx: CanvasRenderingContext2D, look: PlaneLook): void {
  const edge = 'rgba(0,0,0,.3)';
  const polygon = (pts: Array<[number, number]>, fill: string, stroke: string | null) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  };
  // Tail and back wing.
  polygon([[-48, -4], [-60, -30], [-44, -30], [-30, -6]], shade(look.color, 0.85), edge);
  polygon([[-6, -2], [16, -16], [26, -16], [12, 0]], shade(look.color, 0.7), null);
  // Body with a shine.
  ctx.beginPath();
  ctx.ellipse(0, 0, 52, 15, 0, 0, Math.PI * 2);
  ctx.fillStyle = look.color;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.fillStyle = '#ffffff55';
  ctx.beginPath();
  ctx.ellipse(-4, -6, 38, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cockpit and pilot.
  ctx.beginPath();
  ctx.ellipse(14, -12, 14, 10, 0, Math.PI, 0);
  ctx.fillStyle = '#bfe8ff';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(14, -14, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c99b';
  ctx.fill();
  hat(ctx, look.hat);
  // Front wing and nose.
  polygon([[-10, 4], [22, 4], [10, 22], [-18, 22]], CSS.gold, edge);
  ctx.fillStyle = CSS.gold;
  ctx.beginPath();
  ctx.arc(52, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  // The picture on the tail.
  ctx.fillStyle = '#fff';
  if (look.tail === 'star') star(ctx, -48, -20, 6);
  else if (look.tail === 'heart') heart(ctx, -48, -20, 5);
  else if (look.tail === 'flower') flower(ctx, -48, -20, 6);
  else if (look.tail === 'lightning') lightning(ctx, -48, -20, 6);
  else sun(ctx, -48, -20, 7);
}

/**
 * Draws the plane with its propeller and a short trail of smoke puffs into a canvas of any size, for the Hangar:
 * the plane fills the canvas's height and sits right of the middle, so the trail has room on the left.
 */
export function drawPlanePicture(ctx: CanvasRenderingContext2D, width: number, height: number, look: PlaneLook): void {
  ctx.clearRect(0, 0, width, height);
  const scale = Math.min(height / PLANE_BOX.height, (width * 0.75) / PLANE_BOX.width);
  const cx = width - (PLANE_BOX.width - PLANE_BOX.x) * scale;
  const cy = PLANE_BOX.y * scale + (height - PLANE_BOX.height * scale) / 2;
  if (look.smoke !== null) {
    for (let i = 0; i < 6; i++) {
      const x = cx - (50 + i * 16) * scale;
      if (x < 0) break;
      ctx.globalAlpha = 0.85 - i * 0.12;
      ctx.fillStyle = look.smoke[i % look.smoke.length]!;
      ctx.beginPath();
      ctx.arc(x, cy + 6 * scale, (5 + i * 1.5) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  drawPlaneBody(ctx, look);
  ctx.fillStyle = 'rgba(80,80,80,.55)';
  ctx.fillRect(55, -14, 3, 28);
  ctx.restore();
}
