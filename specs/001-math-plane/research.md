# Research: Mathe-Flieger

Decisions for the plan. Each lists the decision, why, and what else was considered. Sources: [source-prd.md](./source-prd.md), [spec.md](./spec.md), the [prototype](./prototype/index.html), and the math-soccer project at `~/dev/private/math-soccer` (its `package.json`, `vite.config.ts`, `playwright.config.ts`, `eslint.config.js`, `.github/workflows/pages.yml`, `src/` and `specs/001-math-soccer/`).

## R1. Stack and project setup

- **Decision**: Copy math-soccer's setup with the same pinned versions: TypeScript `~6.0.3`, Vite `~8.3.0`, React `~19.3.0`, Phaser `~4.2.0`, Zod `~4.6.0`, `uqr` 0.1.3, `vite-plugin-pwa` `~2.0.0`, Vitest `~5.1.0` (node and jsdom projects), Playwright `~1.64.0`, ESLint 10 with the rule that `src/core` imports no Phaser or React and never calls `Math.random`, pnpm `10.34.9`.
- **Rationale**: PRD section 15 decides the same stack as math-soccer, and approach A (copy, then adapt).
- **Alternatives**: a shared package (approach B) and plain canvas (approach C), both rejected in PRD section 14.

## R2. Layering

- **Decision**: As math-soccer:
  - `src/core/` holds all game and learning logic, engine-free, deterministic for a seed, unit tested.
  - `src/game/` holds Phaser views that draw controller state.
  - `src/app/` holds React screens and the overlay.
  - One `RoundController` owns round state and emits events; views never change state.
- **Rationale**: math-soccer's `MatchController` pattern made every rule testable without a browser, and copied screens expect it.
- **Alternatives**: logic inside Phaser scenes (prototype style). Rejected: not testable, and the prototype is throwaway (PRD section 5).

## R3. Coordinates of plans, buildings and views

- **Decision**: A building plan is `heights[row][col]`, row 0 at the back and the last row at the front ("vorn"), as the prototype. The isometric projection is the prototype's `isoP`: screen x = (col − row)·s, screen y = (col + row)·s/2 − z·1.1·s. The face with larger row is the lower-left face (front) and the face with larger col is the lower-right face (right side), matching PRD section 5. Views of a cube building, each a grid of filled squares with the ground at the bottom:
  - **vorn**: column j = col j, height = max over rows.
  - **rechts**: the viewer stands at the right and looks left, so their left is the front. Column j = row (n − 1 − j), height = max over cols.
  - **links**: the hidden back-left side. Column j = row j, height = max over cols.
  - **oben**: the plan footprint (height > 0), rows as in the plan, "vorn" at the bottom.
- **Rationale**: identical to the prototype's `viewOf`, which the parent reviewed, and to the help text "Geh in Gedanken nach rechts. Vorn ist jetzt links von dir." (PRD section 8).
- **Alternatives**: rotating the plan per side. Same result, harder to test against the prototype.

## R4. Readable cube buildings

- **Decision**: A generated cube building is accepted only when:
  - for every cell, `h[row][col] >= h[row+1][col+1]` (the prototype's rule, used as a fast pre-filter);
  - every non-empty stack passes a geometric check: its top face is projected with `isoPoint`, 5 points are sampled (center and 4 inner corners at 25% from the edges), and at least 3 of them are not covered by the projected box of any cube nearer to the viewer (larger row + col). This rejects `[[1,3],[3,1]]`, whose back stack is covered by its two front neighbors (critique E1, FR-024);
  - at least 4 (2×2) or 5 (3×3) cells have height > 0, and the highest stack is at least 2;
  - for "Malen", the asked view is neither all filled nor all empty, and at least two of its columns differ;
  - all heights are within the level's and the parent's limits.
  Generation tries up to 200 seeded candidates (the same bound applies to mixed buildings, critique E4); after that it uses a small built-in list of buildings that meet the rules (spec edge case).
- **Rationale**: The prototype rule is simple and tested by the parent. The fallback keeps a task available for every seed.

## R5. "Bauplan finden" variants

- **Decision**: Candidate variants of the right plan: mirror left-right, mirror front-back, turn by 90°, 180° and 270° (square plans), and change one stack by +1 or −1 within the limits (never to 0 on 2×2 levels with stacks 1 to 3). A candidate is kept only when its plan differs from the right plan and from every kept candidate. 2 variants are picked by the seeded Rng, preferring one structural variant (mirror or turn) and one stack change. Plans with every stack equal, and plans with fewer than 2 distinct variants, are rejected for this task (critique P2).
- **Rationale**: PRD 6.1 names exactly these variant kinds. Comparing plans cell by cell guarantees exactly one match (SC-005).

## R6. Mixed buildings (boxes, cylinders, spheres)

- **Decision**: A mixed building is a list of pieces, each with grid position, size and color:
  - box: footprint w×d of whole units, height of whole units, resting at z = 0 or on a box;
  - cylinder: standing, footprint 1×1 or 2×2, height of whole units, resting at z = 0 or on a box;
  - sphere: diameter 1 or 2, resting at z = 0 or on a box whose top covers its footprint.
  The view from a side maps each piece to a 2D outline in grid units: box → rectangle, cylinder → rectangle from the sides and circle from above, sphere → circle from every side. Each outline has a depth (distance from the viewer). The visible view is drawn back to front, so a nearer outline covers a farther one; a tap is hit-tested front to back. A building is accepted only when every piece shows at least a quarter of its outline area in each side used (so each region can be tapped) and pieces do not overlap in space. Shapes come from a small seeded set of templates (for example "Turm mit Kugel", "Dose neben Kiste", "Zwei Kisten mit Zylinder") placed with random colors, sizes and mirror, then checked.
- **Rationale**: Keeps PRD 6.2 rules (pieces on the grid, own colors, outlines on the grid) and lets "Male an" fill regions with a color per piece. Templates keep the drawing close to the workbook and make generation fast.
- **Alternatives**: free random placement. Rejected: produces many hidden or unreadable pieces.

## R7. Comparing views and picking wrong view cards

- **Decision**: A view has a canonical signature:
  - cube view: the filled grid as a string;
  - mixed view: the sorted list of visible outlines (shape, rectangle in grid units).
  Wrong cards for "Ansicht finden" come from, in order: the views from the other sides of the same building, the asked view mirrored, the asked view with one column changed (cube) or one piece removed (mixed). Cards whose signature equals the asked view or another card are dropped. When a building looks the same from two sides, both sides count as right, and no card with that signature is offered as wrong (spec edge case).
- **Rationale**: Exactly one right card (SC-005). Views from other sides train the hidden-side confusion the parent expects.

## R8. "Male an" checking

- **Decision**: Each visible region (one per visible piece) stores the color the child chose or none. "Fertig" marks every region whose color differs from its piece's color. The palette shows the building's distinct colors in a fixed order.
- **Rationale**: PRD 6.2 "Male an": tap a color, then each outline.

## R9. Bomb pass timing

- **Decision**: A pass takes 2.4 seconds across the scene. The bomb is released when the plane's x reaches the target's x minus the bomb's forward drift, and falls along a parabola that ends exactly at the target's center in 0.9 seconds. The controller decides hit or miss at tap time; the view only animates. During `pass` the controller ignores taps (FR-008). After a miss, the plane turns at the right edge and the controller reshuffles the slots before the next pass.
- **Rationale**: The bomb always lands on the chosen target (SC-004) because the landing point is the target, not physics.

## R10. Levels, mixing and adaptive difficulty

- **Decision**: Per mode, a level lists task kinds with content limits. Task selection: with probability 0.6 the current level's content, otherwise a uniformly chosen lower level's content (FR-029, at least half). Within "Bauen und Malen" levels with two kinds (level 5), kinds alternate. Adaptive rule as math-soccer's `adaptive.ts`: raise after 3 solved alone in a row, lower when 2 of the last 3 were not solved alone, per mode, clamped to the parent's start and hardest level, and a level whose every task kind is turned off is skipped (as math-soccer skips levels whose shapes are all off). The streak counts only tasks from the current level.
- **Rationale**: Keeps the math-soccer rule (PRD section 7) and makes review tasks not move the level.

## R11. Storage keys and versioning

- **Decision**: math-soccer's storage modules copied with keys `mathplane.settings.v1`, `mathplane.progress.v1`, `mathplane.records.v1`, `mathplane.hangar.v1`, `mathplane.round.v1`. Every value carries `version: 1`, is checked with Zod, and the copied `migrate.ts` handles later versions. Damaged data is kept under `<key>.unreadable` and reset with a notice, as math-soccer. Export, import and QR transfer carry settings, progress, records and Hangar.
- **Rationale**: PRD section 15 says "as math-soccer". Lists keyed by task kind and level (data-model.md) let later topics join (FR-055).

## R12. Mastery and "solved alone"

- **Decision**: An outcome is `alone` when the first try was right and no help step was used; otherwise `withHelp` (FR-035). Mastery per mode and task kind: at least 10 attempts and at least 8 of the last 10 `alone`, as math-soccer's `mastery.ts`. math-soccer's guess detection is not copied, because tapping replaces typing and the "one bomb per pass" plus auto-help rules already stop guessing (PRD section 8).

## R13. Sounds

- **Decision**: Copy math-soccer's `sfx.ts` structure: each sound is a bundled file with a synthesized fallback. Reuse `coin.mp3`, `fanfare.mp3` and `pop.mp3` license entries from math-soccer. New sounds (propeller hum, bomb whistle, soft hit pop, crate landing) start as synthesized sounds in code, as the prototype does. Recorded CC0 files are added only after their license page has been checked; the build does not depend on them.
- **Rationale**: PRD section 13. Checking new licenses needs a web visit, and fallbacks make the game complete without them.

## R14. Publishing

- **Decision**: Copy `pages.yml` with `--base=/math-plane/`. After the first green local build: `gh repo create iddocohen/math-plane --public --source . --push`, then turn on Pages with the GitHub Action as source (`gh api -X POST repos/iddocohen/math-plane/pages -f build_type=workflow`), then confirm the workflow run and the page.
- **Rationale**: PRD section 15 grants these actions.

## R15. Help content

- **Decision**: Per task kind, help step 1 is a German sentence from `de.ts`; step 2 is a pointer (target blinks; one wrong plan square shows its number; the view appears faintly in the grid; the right color shows on one region); step 3 shows the answer (target marked with a big arrow; the full plan shown faintly; the full view shown faintly; all region colors shown as dots), and the child places it. Auto-open after 2 misses (FR-034).

## R17. Shapes, marks and selection (critique P3, P5, P6)

- **Decision**: Rechteck aspect between 1.6 and 2.2; Quadrat, Kreis and Dreieck vary in size and turn by up to 20°. Wrong marks are a thick dashed warm-orange outline plus a "?" badge; the selected plan square has a thick yellow frame. Plan squares are selectable by tap on the plan card and on the field tile.

## R18. Controller split and pass fallback (critique E2, E3)

- **Decision**: `RoundController` holds phases, help, outcomes, stars, pause and storage of the round; `TrefferRules` and `BauenMalenRules` hold the mode-specific steps. During `pass` the controller sets a fallback from `now()`: if the view has not called `landBomb()` within the pass time plus 1 second, the controller lands the bomb itself. Pause stops the fallback.

## R19. Drawing cost and versions (critique E6, E9)

- **Decision**: Buildings, plan cards and view cards are drawn into cached textures and redrawn only when they change (crates, colors, marks). `pnpm-lock.yaml` is copied from math-soccer before `pnpm install`, so dependency versions match a known-good set.

## R16. Personal bests

- **Decision**: "Treffer": most hits in a round with the same number of bombs. "Bauen und Malen": most tasks solved alone in a round with the same number of tasks. Shown on the end screen when "Rekorde zeigen" is on.
