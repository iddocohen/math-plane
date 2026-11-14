/**
 * The picture behind the start screen: a sun, Kenney clouds drifting across the sky, a band of hills with trees,
 * bushes and fences at both sides, and the child's plane (its Hangar look) flying across. The same Kenney files as the
 * round's backdrop (src/game/scenery.ts, SkyView.ts).
 *
 * It is decoration only: hidden from screen readers, behind the title and buttons, and it takes no taps. The clouds and
 * the plane move with CSS animations, which stop when the system asks for reduced motion (styles.css).
 */
import { memo, type ReactElement } from 'react';
import { assetUrl } from '../assets';
import type { HangarLook } from '../core/rewards/hangar';
import { CLOUD_FILES, SCENERY_FILES, type SceneryPicture } from '../game/scenery';
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

/**
 * The drifting clouds, each with a file from CLOUD_FILES in turn: height in % of the screen, % from the top, seconds
 * per crossing, a start delay, and where it stays in % of the width when the system asks for reduced motion.
 */
const CLOUDS: ReadonlyArray<[number, number, number, number, number]> = [
  [11, 6, 70, -10, 24],
  [13, 16, 95, -60, 72],
  [9, 24, 80, -35, 4],
  [12, 10, 110, -85, 86],
];

/** Memoized: the start screen re-renders often, and the scenery changes only with the plane's look. */
export const StartScenery = memo(function StartScenery({ look }: { look: HangarLook | null }): ReactElement {
  return (
    <div className="start-scenery" aria-hidden="true">
      <img className="start-sun" src={assetUrl(SCENERY_FILES.sun.file)} alt="" />
      {CLOUDS.map(([height, top, seconds, delay, still], i) => (
        <img
          key={i}
          className="start-cloud"
          src={assetUrl(CLOUD_FILES[i % CLOUD_FILES.length] ?? '')}
          alt=""
          style={{
            height: `${height}vh`,
            top: `${top}%`,
            animationDuration: `${seconds}s`,
            animationDelay: `${delay}s`,
            ['--still-left' as string]: `${still}%`,
          }}
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
});
