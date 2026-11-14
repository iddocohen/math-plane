// Adapted from math-soccer src/globals.d.ts: the speed hook is named for Mathe-Flieger.
/** Set by `define` in vite.config.ts (src/app/buildInfo.ts). */
declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;

interface Window {
  /** The test speed-up hook at run time (contracts/screens.md "Test hooks"); read only when the page has `?speed=`. */
  mathPlaneSpeed?: number;
}
