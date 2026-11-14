/**
 * The rules object of each mode for the RoundController (research R18). This is the one place the app picks them:
 * "Treffer" runs with `trefferRules`, "Bauen und Malen" with `bauenMalenRules` (core/round/BauenMalenRules.ts).
 */
import { bauenMalenRules } from '../core/round/BauenMalenRules';
import type { ModeRules } from '../core/round/rules';
import { trefferRules } from '../core/round/TrefferRules';
import type { Mode } from '../core/types';

/** The rules of `mode`. */
export function rulesFor(mode: Mode): ModeRules {
  return mode === 'treffer' ? (trefferRules as unknown as ModeRules) : (bauenMalenRules as ModeRules);
}
