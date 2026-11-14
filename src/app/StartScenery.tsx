/**
 * The picture behind the start screen: a sun, Kenney clouds drifting across the sky, a band of hills with trees,
 * bushes and fences at both sides, and the child's plane (its Hangar look) flying across. The same Kenney files as the
 * round's backdrop (src/game/scenery.ts, SkyView.ts).
 *
 * It is decoration only: hidden from screen readers, behind the title and buttons, and it takes no taps. The clouds and
 * the plane move with CSS animations, which stop when the system asks for reduced motion (styles.css).
 */
import type { ReactElement } from 'react';
import { assetUrl } from '../assets';
import type { HangarLook } from '../core/rewards/hangar';
import { SCENERY_FILES, type SceneryPicture } from '../game/scenery';
import { PlanePicture } from './Hangar';

/** The pictures on the horizon: which one, its middle in % of the width, and its height in % of the screen height. */
const HORIZON: ReadonlyArray<[SceneryPicture, number, number]> = [
  ['treePine', 4, 17],
  ['tree', 9, 14],
  ['bush', 14, 4],
  ['fence', 19, 5],
  ['tuft', 24, 3.5],
  ['treeLong', 40, 9],
  ['tuft', 62, 3],
  ['fence', 76, 5],
  ['bush', 82, 4],
  ['tree', 88, 15],
  ['treePine', 93, 12],
  ['treeLong', 97, 14],
];

/** The drifting clouds: file, height in % of the screen, % from the top, seconds per crossing, and a start delay. */
const CLOUDS: ReadonlyArray<[string, number, number, number, number]> = [
  ['cloud1.png', 11, 6, 70, -10],
  ['cloud2.png', 13, 16, 95, -60],
  ['cloud3.png', 9, 24, 80, -35],
  ['cloud4.png', 12, 10, 110, -85],
];

export function StartScenery({ look }: { look: HangarLook | null }): ReactElement {
  return (
    <div className="start-scenery" aria-hidden="true">
      <img className="start-sun" src={assetUrl(SCENERY_FILES.sun.file)} alt="" />
      {CLOUDS.map(([file, height, top, seconds, delay]) => (
        <img
          key={file}
          className="start-cloud"
          src={assetUrl(file)}
          alt=""
          style={{ height: `${height}vh`, top: `${top}%`, animationDuration: `${seconds}s`, animationDelay: `${delay}s` }}
        />
      ))}
      {look && (
        <div className="start-plane">
          <PlanePicture look={look} width={150} height={66} className="start-plane-picture" />
        </div>
      )}
      <svg className="start-hills" viewBox="0 0 1600 60" preserveAspectRatio="none">
        <path d="M0 60 L0 26 C200 4 420 4 640 24 S1080 50 1300 22 S1520 10 1600 18 L1600 60 Z" />
      </svg>
      {HORIZON.map(([picture, x, height], i) => (
        <img
          key={`${picture}-${i}`}
          className="start-horizon"
          src={assetUrl(SCENERY_FILES[picture].file)}
          alt=""
          style={{ left: `${x}%`, height: `${height}vh` }}
        />
      ))}
    </div>
  );
}
