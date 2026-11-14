/**
 * The rules object of each mode for the RoundController (research R18). This is the one place the app picks them, so
 * the mode rules replace the stand-ins below without a change to App.tsx: `TrefferRules` (T033) and `BauenMalenRules`
 * (T045).
 *
 * Until then a round runs with stand-in rules: the task has its kind, level and side but nothing to answer. In
 * "Treffer" no slot holds a choice, so taps do nothing; in "Bauen und Malen" every input is ignored and "Fertig"
 * solves the task, so a round can still be played to its end.
 */
import type { BauenMalenRules, ModeRules, TaskBase, TrefferRules } from '../core/round/rules';
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

const trefferStandIn: TrefferRules = {
  ...base,
  mode: 'treffer',
  choiceAt: () => null,
  isHit: () => false,
  afterMiss: (_task, state) => state,
  slots: () => [],
};

const bauenMalenStandIn: BauenMalenRules = {
  ...base,
  mode: 'bauenMalen',
  apply: () => null,
  check: () => ({ right: true, marked: [] }),
};

/** The rules of `mode`. */
export function rulesFor(mode: Mode): ModeRules {
  return mode === 'treffer' ? trefferStandIn : bauenMalenStandIn;
}
