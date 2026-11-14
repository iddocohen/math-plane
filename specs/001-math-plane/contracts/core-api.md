# Contract: engine-free core modules

All modules under `src/core/` are pure TypeScript with no Phaser or React import and no `Math.random` (ESLint rule copied from math-soccer). Randomness comes from `Rng` (`core/rng.ts`, copied from math-soccer). Types are in [data-model.md](../data-model.md).

## Geometry

```ts
// core/geometry/plan.ts
mirrorLR(p: Plan): Plan; mirrorFB(p: Plan): Plan; rotate90(p: Plan): Plan;
plansEqual(a: Plan, b: Plan): boolean;
isReadable(p: Plan): boolean;                        // research R4
generateCubePlan(rng: Rng, limits: PlanLimits): Plan; // R4, falls back to the built-in list
planVariants(p: Plan, rng: Rng, limits: PlanLimits, count: number): Plan[]; // R5, never equal to p or each other

// core/geometry/views.ts
cubeView(p: Plan, side: Side, gridHeight: number): CubeView; // R3
viewsEqual(a: View, b: View): boolean;

// core/geometry/mixed.ts
generateMixed(rng: Rng, limits: MixedLimits): MixedBuilding; // R6
mixedView(b: MixedBuilding, side: Side): MixedView;
hitTest(v: MixedView, x: number, y: number): number | null;

// core/geometry/iso.ts (shared by views and tests)
isoPoint(col: number, row: number, z: number, s: number): { x: number; y: number };
```

## Tasks

```ts
// core/tasks/levels.ts
LEVELS: Record<Mode, LevelDef[]>;             // FR-028, names in de.ts
levelRange(mode, settings): number[];          // skips levels with every kind off
pickContent(mode, level, settings, rng): { kind: TaskKind; level: number }; // R10
// core/tasks/generate.ts
generateTask(mode, kind, level, settings, rng): Task;
// core/tasks/check.ts
checkBomb(task, choiceIndex): { hit: boolean; named: string };   // named = German line key for a miss
checkPlan(target: Plan, input): string[];              // core/tasks/bauen.ts: wrong squares as "row,col"
checkPaint(expected: CubeView, paint): string[];      // core/tasks/malen.ts: wrong squares as "row,col"
checkRegions(task, colors): number[];                 // core/tasks/maleAn.ts: piece indexes of wrong or empty regions
// core/tasks/help.ts
helpFor(task, state, step): HelpView;          // R15
```

## Round

```ts
// core/round/RoundController.ts
class RoundController {
  constructor(opts: { mode; settings; progress; hangar; seed; now: () => number; stored?: StoredRound });
  state(): RoundState;
  subscribe(fn: (e: RoundEvent) => void): () => void;
  tapChoice(slot: number): void;       // ignored outside 'aim'
  landBomb(): void;                    // the view calls it when the bomb animation ends
  select(row, col): void;              // "Bauen": select a plan square (tap or arrow keys, FR-024b)
  typeHeight(row, col, h): void; clearHeight(row, col): void;
  togglePaint(row, col): void;
  pickColor(color): void; fillRegion(index): void;
  done(): void;                        // "Fertig"
  help(): void; pause(): void; resume(): void; quit(): void;
  next(): void;                        // after a celebration
  applySettings(s: Settings): void;    // FR-054
}
```

Events: `passStarted`, `bombLanded {hit, slot}`, `slotsShuffled`, `cratesChanged {row, col, from, to}`, `checked {right, marked}`, `inputApplied` (after every input that changed the task state), `helpOpened {step}`, `taskStarted`, `levelUp {name}`, `starsAwarded {n}`, `roundEnded {summary}`.

## Learning, storage, rewards

```ts
// core/progress/outcome.ts
outcomeOf(firstTryRight: boolean, helpStep: number): 'alone' | 'withHelp'; // FR-035
// core/progress/adaptive.ts (adapted from math-soccer)
recordAttempt(p: Progress, a: AttemptRecord, settings): Progress;
levelRaised(before, after, mode): number | null;
// core/progress/mastery.ts (copied)
isMastered(window: Outcome[]): boolean;
// core/progress/summarize.ts
summarize(p: Progress, r: Records, settings): ProgressSummary;
// core/rewards/hangar.ts
award(h: Hangar, n: number): Hangar; buy(h, itemId): Hangar | null; choose(h, itemId): Hangar;
starsFor(kind, outcome, helpStep, settings): number; // FR-036, FR-044
// core/storage/*, core/transfer/* copied from math-soccer with mathplane keys
```
