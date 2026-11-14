/**
 * The rules object of each mode for the RoundController (research R18). This is the one place the app picks them, so
 * a mode's rules replace its stand-in below without a change to App.tsx: "Treffer" runs with `trefferRules` (T033);
 * `BauenMalenRules` (T045) replaces the "Bauen und Malen" stand-in.
 *
 * Until then "Bauen und Malen" runs with stand-in rules: the task has its kind, level and side but nothing to answer,
 * every input is ignored and "Fertig" solves the task, so a round can still be played to its end.
 */
import type { BauenMalenRules, ModeRules, TaskBase } from '../core/round/rules';
import { trefferRules } from '../core/round/TrefferRules';
import type { Mode } from '../core/types';

const base = {
  createTask: ({ content, id, seed }: Parameters<ModeRules['createTask']>[0]): TaskBase => ({
    id,
    seed,
    kind: content.kind,
    mode: content.kind === 'bauen' || content.kind === 'malen' || content.kind === 'maleAn' ? 'bauenMalen' : 'treffer',
    level: content.level,
    ...(content.sides?.[0] ? { side: content.sides[0] } : {}),
  }),
  createState: () => null,
  restoreState: () => null,
};

const bauenMalenStandIn: BauenMalenRules = {
  ...base,
  mode: 'bauenMalen',
  apply: () => null,
  check: () => ({ right: true, marked: [] }),
};

/** The rules of `mode`. */
export function rulesFor(mode: Mode): ModeRules {
  return mode === 'treffer' ? (trefferRules as unknown as ModeRules) : bauenMalenStandIn;
}
