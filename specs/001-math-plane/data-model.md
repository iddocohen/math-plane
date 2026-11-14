# Data Model: Mathe-Flieger

Types live in `src/core/`. Stored types are Zod schemas in `src/core/storage/schemas.ts` and `src/core/settings/schema.ts`. Every stored value has `version: 1`.

## Geometry

### Plan (`core/geometry/plan.ts`)

- `heights: number[][]`, `rows × cols`, each 0 to 4. Row 0 is the back, the last row is "vorn" (research R3).
- Operations: `mirrorLR`, `mirrorFB`, `rotate90`, `equals`, `changeOne`.
- Rules: 2×2 or 3×3 in this version (FR-028); generated plans respect the readability rule (R4).

### CubeView (`core/geometry/views.ts`)

- `side: 'vorn' | 'oben' | 'rechts' | 'links'`.
- `cells: boolean[][]`, row 0 at the top; for side views the bottom row is the ground ("unten"), for `oben` the bottom row is "vorn".
- `height`: for side views, the parent's highest stack (so every side view of a level has the same grid size); for `oben`, the plan's rows.
- `signature: string` (R7).

### Piece and MixedBuilding (`core/geometry/mixed.ts`)

- `Piece`: `kind: 'box' | 'cylinder' | 'sphere'`, `col`, `row`, `z` (grid units), `w`, `d`, `h` (box), `size` (1 or 2, cylinder footprint or sphere diameter), `color` (palette name).
- `MixedBuilding`: `pieces: Piece[]`, `cols`, `rows`.
- Validation: pieces do not overlap in space; a piece above z = 0 rests on a box that covers its footprint; every piece shows at least a quarter of its outline in every side used (R6).

### Outline and MixedView

- `Outline`: `pieceIndex`, `shape: 'rect' | 'circle'`, `x`, `y`, `w`, `h` (grid units in view space, y up), `depth`.
- `MixedView`: `side`, `outlines` sorted back to front, `width`, `height`, `signature`.
- `hitTest(view, point) → pieceIndex | null` (front to back).

## Tasks

### TaskKind

`'koerper' | 'formen' | 'bauplanFinden' | 'ansichtFinden' | 'bauen' | 'malen' | 'maleAn'`. Kept as a list in `core/tasks/kinds.ts` so later kinds can join (FR-055).

### Mode

`'treffer' | 'bauenMalen'`.

### Task (`core/tasks/types.ts`), a union by kind

- Common: `id`, `kind`, `mode`, `level`, `seed`.
- `koerper`: `choices: Solid[]` (4, distinct kinds), `answer: Solid`, colors per choice.
- `formen`: `choices: FlatShape[]` (4), `answer`.
- `bauplanFinden`: `plan: Plan`, `buildings: Plan[]` (3), `answerIndex`.
- `ansichtFinden`: `building: Plan | MixedBuilding`, `side`, `cards: (CubeView | MixedView)[]` (3), `rightIndexes: number[]` (usually one; more only when two sides look the same, R7).
- `bauen`: `target: Plan`, `color`.
- `malen`: `building: Plan`, `side`, `expected: CubeView`, `color`.
- `maleAn`: `building: MixedBuilding`, `side`, `view: MixedView`, `palette: string[]`.

`Solid = 'wuerfel' | 'quader' | 'zylinder' | 'kugel' | 'pyramide'`; `FlatShape = 'kreis' | 'dreieck' | 'quadrat' | 'rechteck'`.

### TaskState (inside the round)

- `misses: number` (wrong bombs or wrong "Fertig").
- `helpStep: 0 | 1 | 2 | 3`.
- `slots: number[]` ("Treffer": which choice stands in which field slot; reshuffled after a miss).
- `lastHit: number | null` ("Treffer": index hit, for the "Getroffen" card and the miss line).
- `planInput: (number | null)[][]` ("Bauen"), `built: number[][]` (stacks on the field).
- `paint: boolean[][]` ("Malen"), `regionColors: (string | null)[]` ("Male an").
- `marked: string[]` (cells or regions marked after a wrong "Fertig").
- `startedAt`, `firstTryRight: boolean | null`.

## Round (`core/round/RoundController.ts`)

- `mode`, `phase: 'aim' | 'pass' | 'feedback' | 'check' | 'celebrate' | 'paused' | 'ended'`.
- "Treffer": `bombsTotal`, `bombsLeft`, `hits`.
- "Bauen und Malen": `tasksTotal`, `tasksDone`, `solvedAlone`.
- `task`, `taskState`, `level`, `elapsedMs` (paused while paused or hidden).
- State transitions:
  - `aim` → `pass` on tap/Enter on a target ("Treffer"); taps ignored in `pass`.
  - `pass` → `feedback` when the bomb lands; hit → `celebrate` → next task or `ended`; miss → `aim` with reshuffled slots, or `ended` when `bombsLeft` = 0.
  - `aim` → `check` on "Fertig" ("Bauen und Malen"); right → `celebrate` → next task or `ended`; wrong → `aim` with `marked`.
  - any → `paused` and back.
- Stored under `mathplane.round.v1` so a refresh continues the round; discarded when it no longer fits the settings.

## Learning

### AttemptRecord (FR-047)

`mode`, `kind`, `level`, `side?`, `outcome: 'alone' | 'withHelp'`, `helpStep`, `misses`, `ms`, `at`.

### Progress (`mathplane.progress.v1`)

- `attempts: AttemptRecord[]` (latest 2000, as math-soccer `MAX_ATTEMPTS`).
- `levels: Record<Mode, number>` (current level per mode, FR-031).
- `recent: Record<Mode, Outcome[]>` (last 6 current-level outcomes, for adaptive).
- `counts: Record<string, { alone: number; withHelp: number; window: Outcome[] }>` keyed `mode:kind:level` and `mode:kind:side` (FR-048). `window` holds the last 10 outcomes for mastery (R12).

### Records (`mathplane.records.v1`)

`best: Record<string, number>` keyed `treffer:<bombs>` or `bauenMalen:<tasks>` (R16).

## Settings (`mathplane.settings.v1`, FR-051)

| Field | Type | Default |
|---|---|---|
| `levels.treffer` | `{ start: 1..5, hardest: 1..5 }` | `{1, 5}` |
| `levels.bauenMalen` | `{ start: 1..5, hardest: 1..5 }` | `{1, 5}` |
| `adaptive` | boolean | true |
| `kinds` | `Record<TaskKind, boolean>` | all true |
| `buildings.maxPlan` | `2 \| 3` | 3 |
| `buildings.maxStack` | `2 \| 3 \| 4` | 3 |
| `buildings.sides` | `Record<Side, boolean>` | all true |
| `buildings.mixedPieces` | boolean | true |
| `round.bombs` | int 5..20 | 10 |
| `round.tasks` | int 3..10 | 5 |
| `sound.effects` | boolean | true |
| `sound.speech` | boolean | false |
| `numberPad` | `'auto' \| 'always' \| 'never'` | `'auto'` |
| `showClock` | boolean | false |
| `showRecords` | boolean | true |
| `pointAfterFullHelp` | boolean | true |
| `hangar` | boolean | true |

Cross-field rules (`validate.ts`): `start <= hardest`; at least one side on; `vorn` or `oben` stays on when every other side is off (a side view always exists).

## Hangar (`mathplane.hangar.v1`)

- `stars: number` (never decreases except by buying).
- `owned: string[]` item ids.
- `chosen: { planeColor, tail, smoke, bomb, hat }`.
- Items (`core/rewards/items.ts`): id, category, price, look data. Prices and list are builder choices (PRD section 15); every category has a free default item.
