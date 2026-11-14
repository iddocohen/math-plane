---
description: "Task list for Mathe-Flieger"
---

# Tasks: Mathe-Flieger

**Input**: Design documents from `specs/001-math-plane/`: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/core-api.md](./contracts/core-api.md), [contracts/screens.md](./contracts/screens.md), [quickstart.md](./quickstart.md), visual reference [prototype/index.html](./prototype/index.html).

**Reference project**: `~/dev/private/math-soccer` (absolute path `/Users/iddo/dev/private/math-soccer`). "Copy" means: copy the named file, keep a first-line comment `// Adapted from math-soccer <path>.` (or `// Copied from ...` when unchanged), rename `mathsoccer`/`Mathe-Kicker`/soccer concepts to `mathplane`/`Mathe-Flieger`/plane concepts, and remove what this spec does not need (cup, wall, keeper, shootout, torwand, family, time challenge, chart, hints, Fire tablet projects). Copy the matching `*.test.ts(x)` with the file and adapt it.

**Tests**: The plan requires Vitest for `src/core` and `src/app` and Playwright against the build, so test tasks are included. Unit tests sit next to their module (`*.test.ts`).

**Format**: `[ID] [P?] [Story] Description`. [P] = can run in parallel (different files, no dependency on an unfinished task).

## Phase 1: Setup

- [X] T001 Copy tooling from math-soccer into the repository root: `package.json` (name `math-plane`, same scripts and pinned versions), `pnpm-lock.yaml`, `tsconfig.json`, `eslint.config.js`, `index.html` (title "Mathe-Flieger", theme color `#7ec8f0`), `src/globals.d.ts`; run `pnpm install` (research R1, R19)
- [X] T002 Copy `vite.config.ts` from math-soccer; manifest name and short_name "Mathe-Flieger", sky-blue background and theme colors; keep the Vitest node and jsdom projects and the PWA workbox settings
- [X] T003 [P] Copy `playwright.config.ts` from math-soccer with ports 4373 and 4374, base path `/math-plane/`, projects chromium, firefox, webkit, ipad-landscape, ipad-portrait, base-path, performance; remove the Fire tablet projects and `tests/e2e/silk.ts` use
- [X] T004 [P] Copy `.github/workflows/pages.yml` from math-soccer with `--base=/math-plane/` and the comment naming `https://iddocohen.github.io/math-plane/` (R14)
- [X] T005 [P] Create `public/icons/icon.svg`, `public/icons/icon-192.png`, `public/icons/icon-512.png` showing the red plane on sky blue (draw the SVG; render the PNGs from it with a script in the scratchpad)
- [X] T006 [P] Copy reused assets from math-soccer `public/assets/` to `public/assets/`: `Fredoka.ttf`, `OFL.txt`, `star_04.png`, `star_06.png`, `star_07.png`, `flare_01.png`, `light_01.png`, `coin.mp3`, `fanfare.mp3`, `pop.mp3`; copy their license rows from math-soccer `README.md` into a new `README.md` asset table (FR-058)
- [X] T007 [P] Copy `src/core/rng.ts`, `src/core/util.ts` and their tests from math-soccer
- [X] T008 [P] Create `src/i18n/de.ts` and `src/i18n/index.ts` (structure from math-soccer) with all German strings of contracts/screens.md and the help sentences of research R15; copy and adapt `src/i18n/de.test.ts` so it fails on "falsch", "verloren" and any string longer than 8 words except help sentences (FR-040, FR-041)
- [X] T009 Verify `pnpm lint`, `pnpm typecheck`, `pnpm test` pass on the empty skeleton with `src/main.tsx` rendering a placeholder

## Phase 2: Foundational (blocks all stories)

- [X] T010 [P] Implement `src/core/types.ts`: `Mode = 'treffer' | 'bauenMalen'`, `Side = 'vorn' | 'oben' | 'rechts' | 'links'`, `TaskKind = 'koerper' | 'formen' | 'bauplanFinden' | 'ansichtFinden' | 'bauen' | 'malen' | 'maleAn'`, `Solid`, `FlatShape`, `Outcome = 'alone' | 'withHelp'` (data-model.md)
- [X] T011 [P] Implement `src/core/settings/schema.ts`, `defaults.ts`, `validate.ts` with every field and default of data-model.md "Settings" (`round.bombs` int 5..20 default 10, `round.tasks` int 3..10 default 5, `buildings.maxPlan` `2 | 3` default 3, `buildings.maxStack` `2 | 3 | 4` default 3, levels `{start: 1..5, hardest: 1..5}` default `{1, 5}` per mode, all kinds and sides on); cross-field rules `start <= hardest`, at least one side on; tests in `settings.test.ts`
- [X] T012 Copy `src/core/storage/` (`keyValue.ts`, `storage.ts`, `migrate.ts`, `exportImport.ts`, `schemas.ts`) and tests from math-soccer with keys `mathplane.settings.v1`, `mathplane.progress.v1`, `mathplane.records.v1`, `mathplane.hangar.v1`, `mathplane.round.v1`; schemas for Progress, Records, Hangar and StoredRound from data-model.md; drop the cup kind (R11)
- [X] T013 [P] Copy `src/core/transfer/transfer.ts`, `qr.ts` and tests from math-soccer, carrying settings, progress, records and Hangar
- [X] T014 [P] Implement `src/core/geometry/plan.ts`: `mirrorLR`, `mirrorFB`, `rotate90`, `plansEqual`, `changeOne`; tests in `plan.test.ts`
- [X] T015 [P] Implement `src/core/geometry/iso.ts` `isoPoint(col, row, z, s)` with the prototype projection x = (col − row)·s, y = (col + row)·s/2 − z·1.1·s (R3); tests
- [X] T016 Implement `isReadable(plan)` and `generateCubePlan(rng, limits)` in `src/core/geometry/plan.ts`: prototype pre-filter `h[r][c] >= h[r+1][c+1]`, then the 5-point top-face visibility check (at least 3 of 5 points not covered by a nearer cube); at least 4 (2×2) or 5 (3×3) non-empty cells; highest stack ≥ 2; at most 200 tries, then a built-in list of readable plans per size and stack limit; tests: `[[1,3],[3,1]]` rejected, 500 seeds all readable (R4, critique E1, E7)
- [X] T017 [P] Implement `src/core/geometry/views.ts`: `cubeView(plan, side, gridHeight)` exactly as research R3 (vorn: column j = col j; rechts: column j = row n−1−j; links: column j = row j; oben: footprint, plan rows); `signature`, `viewsEqual`; tests compare with the prototype's `viewOf` on fixed plans
- [X] T018 Implement `src/core/tasks/levels.ts`: `LEVELS` for both modes with German names and content from FR-028; `levelRange(mode, settings)` skipping levels whose kinds are all off; `pickContent(mode, level, settings, rng)` with 0.6 current level else a uniformly chosen lower level, kinds alternating within a level (R10); content capped by `buildings` limits with the closest content (FR-032); tests
- [X] T019 Implement `src/core/progress/outcome.ts` (`outcomeOf(firstTryRight, helpStep)`, FR-035) and adapt `src/core/progress/adaptive.ts` and `mastery.ts` from math-soccer: per mode level, raise after 3 current-level tasks alone in a row, lower when 2 of the last 3 current-level tasks were not alone, clamp to settings; mastery 10 attempts and 8 of last 10 alone per `mode:kind`; counts keyed `mode:kind:level` and `mode:kind:side`; `MAX_ATTEMPTS` 2000; tests (R10, R12)
- [X] T020 Implement `src/core/rewards/hangar.ts` `award`, `starsFor(kind, outcome, helpStep, settings)` (1 per Treffer hit, 3 per Bauen/Malen/Male an task, 0 after help step 3 when `pointAfterFullHelp` is off) and `src/core/records/records.ts` (bests keyed `treffer:<bombs>` and `bauenMalen:<tasks>`, R16); tests
- [X] T021 Implement `src/core/round/RoundController.ts` with phases `aim | pass | feedback | check | celebrate | paused | ended`, events from contracts/core-api.md, help step state, misses, auto-help after 2 misses (FR-034), outcome recording, stars, bests, pause and elapsed time paused while paused or hidden, `applySettings` (FR-054), stored round save and restore; mode-specific logic delegated to `TrefferRules` / `BauenMalenRules` interfaces in `src/core/round/rules.ts` (R18); tests in `RoundController.test.ts` with a stub rules object
- [X] T022 Copy `src/app/persistence.ts` and test from math-soccer, adapted to the five mathplane kinds (no cup); `resetAll`, `backups`, `restoreBackups`
- [X] T023 [P] Copy `src/audio/speaker.ts` and test from math-soccer; adapt `src/audio/sfx.ts` and test: sounds `propeller`, `whistle`, `hit`, `miss`, `crate`, `puff`, `cheer`, `coin`, `fanfare`, each synthesized in code (shapes from the prototype's `SND`) with the bundled file when one exists; "Geräusche" switch (FR-043, R13)
- [X] T024 Create `src/game/createGame.ts` (adapted from math-soccer) and `src/game/RoundScene.ts` with world 1600×1000 scaled to fit; `src/game/SkyView.ts` (sky gradient, drifting clouds, grass field with a faint square grid) and `src/game/PlaneView.ts` (red plane with pilot drawn in code from the prototype, propeller, bobbing ±8, left-to-right passes, turn at the right edge, color/tail/smoke/hat parameters) (FR-001, FR-004, FR-006)
- [X] T025 [P] Implement `src/game/iso.ts` drawing helpers ported from the prototype (`drawBox`, `drawBuilding` with tiles, crates, selection and dashed marks, `drawCylinder`, `drawSphere`, `drawPyramid`) using `isoPoint`; buildings and cards drawn into cached textures redrawn only on change (R19)
- [X] T026 [P] Adapt `src/game/particles.ts` and `src/game/effects.ts` from math-soccer for stars, confetti, smoke puffs and water splash (no fire, FR-042)
- [X] T027 Create `src/app/App.tsx`, `useScreen.ts`, `useController.ts`, `useKeyboard.ts`, `keyboard.ts` adapted from math-soccer for screens start, round, pause, round end, parent gate, settings, progress, Hangar, transfer; `src/main.tsx` (copied, with `<html data-version>`), `src/app/buildInfo.ts`, `noFocus.ts`, `swUpdate.ts` copied; `src/app/styles.css` with Fredoka and the sky palette
- [X] T028 Create `src/app/StartScreen.tsx`: title, big buttons "Treffer" (`data-start="treffer"`, key 1) and "Bauen und Malen" (`data-start="bauenMalen"`, key 2) with the current level name, `data-mode-state="empty"` note when no kind is allowed, Hangar button (K) and star total, gear, fullscreen, reset and save notices; `?start=` and `?seed=`, `?speed=`, `?test=1` hooks (contracts/screens.md)
- [X] T029 Create `src/app/RoundOverlay.tsx`: banner, message line, bomb bay or "Aufgabe 2 von 5", clock when on, yellow "?" help button, "Fertig", pause, home, fullscreen, gear, Hangar icon; `data-testid="round"` with every data attribute of contracts/screens.md; `data-answer` only with `?test=1`
- [X] T030 Adapt `src/app/PauseScreen.tsx` and `src/app/RoundEnd.tsx` (with tests) from math-soccer: "8 Treffer mit 10 Bomben" or "5 Aufgaben geschafft", encouraging line, record line when "Rekorde zeigen" is on, stars earned, "Nochmal" (Enter, Space), "Zurück"; never "verloren" (FR-037, FR-038)

**Checkpoint**: the app starts, shows the sky, field and plane, and both start buttons open an empty round screen.

## Phase 3: User Story 1 - Bomb the right solid or flat shape (P1) 🎯 MVP

**Goal**: "Treffer" levels 1 and 2 are playable end to end.
**Independent Test**: quickstart scenario 1 and 2.

- [X] T031 [P] [US1] Implement `koerper` and `formen` generation in `src/core/tasks/generate.ts`: 4 distinct solids from Würfel, Quader, Zylinder, Kugel, Pyramide in distinct colors, or 4 flat shapes (Rechteck aspect 1.6 to 2.2, others varied in size and turn up to 20°, FR-024c); exactly one answer; tests over 500 seeds
- [X] T032 [P] [US1] Implement `checkBomb` in `src/core/tasks/check.ts` returning hit and the German name line for a miss ("Das ist die Kugel.")
- [X] T033 [US1] Implement `src/core/round/TrefferRules.ts`: slots, `tapChoice` only in `aim`, one bomb per pass, `landBomb`, hit → star, celebrate, next task; miss → reshuffle slots so at least the hit choice moves, plane turns; bomb bay counts down; round ends after the last bomb; fallback landing timer of pass time + 1 s (R9, R18, FR-008, FR-014, FR-015); tests including "taps during pass are ignored"
- [X] T034 [P] [US1] Implement `src/game/SolidsView.ts` and `src/game/ShapesView.ts` drawing solids in isometric and flat shapes from above, as the prototype `drawSolid` and `drawFlat`, with tap areas, the keyboard marker and slot moves (FR-002, FR-003)
- [X] T035 [US1] Implement `src/game/BombView.ts`: release when the plane reaches the target, parabola ending at the target center in 0.9 s, burst by bomb style (stars and confetti default), soft smoke puff on a miss; propeller and whistle sounds; calls `landBomb()` (R9)
- [X] T036 [US1] Wire "Treffer" into `RoundScene.ts`, `RoundOverlay.tsx` and `App.tsx`: banner "Triff den Zylinder!", "Treffer!", miss line, keyboard arrows plus Enter or Space (FR-012)
- [X] T037 [US1] Playwright `tests/e2e/treffer.spec.ts` with fixtures copied from math-soccer (`fixtures.ts`, `gameWait.ts`, `layout.ts`): keyboard-only round of 10 bombs, hit and miss feedback, reshuffle, one bomb per pass, end screen and "Nochmal"

**Checkpoint**: MVP playable.

## Phase 4: User Story 2 - Find building plans and views (P1)

**Goal**: "Treffer" levels 3 to 5.
**Independent Test**: quickstart scenario 3.

- [X] T038 [P] [US2] Implement `planVariants` in `src/core/geometry/plan.ts`: mirror LR, mirror FB, turns, one stack ±1 within limits (never 0 on 2×2 levels); distinct from the plan and each other; reject uniform plans and plans with fewer than 2 variants (R5, critique P2); tests over 500 seeds
- [X] T039 [P] [US2] Implement `src/core/geometry/mixed.ts`: pieces (box, cylinder 1×1 or 2×2, sphere diameter 1 or 2), templates, `generateMixed` with no overlaps, support on boxes, each piece at least a quarter visible per side used, 200 tries then built-in list; `mixedView` with outlines sorted back to front, `hitTest` front to back, `signature` (R6, R7, critique E4); tests
- [X] T040 [US2] Implement `bauplanFinden` and `ansichtFinden` generation in `src/core/tasks/generate.ts` and checks in `check.ts`: 2×2 plans with stacks 1 to 3 on level 3; cube buildings with vorn/oben on level 4; all sides and mixed buildings on level 5 within settings; wrong cards from other sides, mirrored view, one changed column or removed piece; `rightIndexes` for equal sides (R7); miss line "Das ist die Ansicht von links."; tests: exactly one right card over 500 seeds
- [X] T041 [P] [US2] Implement `src/game/BuildingView.ts` (cube and mixed buildings with "vorn" marks) and `src/game/CardsView.ts` (plan card, "Getroffen" card, view cards with grid or outlines, "unten"/"vorn" labels) (FR-005)
- [X] T042 [US2] Wire plan and view tasks into `TrefferRules.ts`, `RoundScene.ts` and the overlay; "Getroffen" card after a miss (FR-018)
- [X] T043 [US2] Playwright `tests/e2e/trefferViews.spec.ts`: start level 3 and level 5 via seeded settings; one right building per card, "Getroffen" card after a miss, side asked covers all four sides on level 5

## Phase 5: User Story 3 - Complete building plans in "Bauen" (P1)

**Goal**: "Bauen und Malen" levels 1 and 2.
**Independent Test**: quickstart scenario 4.

- [X] T044 [P] [US3] Implement `bauen` generation (2×2 stacks 1..3 on level 1, 3×3 stacks 0..3 on level 2, within settings) and `checkPlan` (empty squares count as wrong) in `src/core/tasks/`; tests
- [X] T045 [US3] Implement `src/core/round/BauenMalenRules.ts` for "Bauen": select square, `typeHeight` 0..4 (ignore other input), `clearHeight`, marker moves to the next square, events `cratesChanged`, `done` → marks or celebrate, round of `round.tasks` tasks, kinds alternating (FR-020, FR-021); tests
- [X] T046 [P] [US3] Implement `src/game/CratesView.ts`: crates on parachutes drop onto the stack timed with a plane pass, removal with a puff, crate landing sound (prototype `digit`, `updCrates`)
- [X] T047 [US3] Implement the plan grid UI in `src/game/CardsView.ts` (or `PlanInputView.ts`): "So soll es aussehen" card, tappable plan squares and field tiles to select (FR-024b), thick yellow frame on the selected square, dashed orange marks with "?" badge on wrong squares and towers (FR-024a)
- [X] T048 [US3] Copy `src/app/NumberPad.tsx` and test from math-soccer with keys 0 to 4, Backspace and "Fertig"; shown by the `numberPad` setting during "Bauen" (FR-011)
- [X] T049 [US3] Wire "Bauen" into `App.tsx`, `RoundScene.ts` and `RoundOverlay.tsx`; Playwright `tests/e2e/bauen.spec.ts`: build with one wrong stack, only that tower marked, fix, 3 stars

## Phase 6: User Story 4 - "Malen" and "Male an" (P1)

**Goal**: "Bauen und Malen" levels 3 to 5.
**Independent Test**: quickstart scenario 5.

- [X] T050 [P] [US4] Implement `malen` generation (readable cube building, view not all filled or empty and at least two columns differ, sides per level and settings) and `checkPaint` in `src/core/tasks/`; tests over 500 seeds (FR-024)
- [X] T051 [P] [US4] Implement `maleAn` generation (mixed building, side, palette of the building's distinct colors) and `checkRegions` in `src/core/tasks/`; tests
- [X] T052 [US4] Extend `BauenMalenRules.ts` with `togglePaint`, `pickColor`, `fillRegion`, `done` for both kinds; level 5 mixes "Male an" and "Malen" (FR-022, FR-023); tests
- [X] T053 [US4] Implement `src/game/GridView.ts`: paint grid with "unten" or "vorn" label, outline regions drawn back to front and hit-tested with `hitTest`, color row (`data-testid="palette"`), marker for keyboard (arrows, Tab between outlines and colors, Enter or Space), dashed marks with "?" badge (FR-024a); eye "Hier stehst du" or "Hier fliegst du" at the asked side in `BuildingView.ts`
- [X] T054 [US4] Right view: plane flies off trailing smoke in the building's color (`PlaneView.ts`); wire "Malen" and "Male an" into the scene and overlay
- [X] T055 [US4] Playwright `tests/e2e/malen.spec.ts`: level 4 view with one extra square marked only there; level 5 "Male an" with one wrong color marked only there

## Phase 7: User Story 5 - Help in steps (P1)

**Goal**: three help steps for every kind and auto-help.
**Independent Test**: quickstart scenario 6.

- [X] T056 [P] [US5] Implement `src/core/tasks/help.ts` `helpFor(task, state, step)` for all seven kinds as research R15 (sentence, pointer, answer); tests
- [X] T057 [US5] Render help in the scene and overlay: blinking target, one wrong plan square's number, faint view in the grid, faint full plan, color dots on regions; H and the yellow "?" button; auto-open after 2 misses and next step per further miss (FR-033, FR-034)
- [X] T058 [US5] Playwright `tests/e2e/help.spec.ts`: three H presses per mode, auto-help after 2 misses, no star or extra bomb lost, outcome recorded as withHelp

## Phase 8: User Story 6 - Parent settings and progress (P1)

**Goal**: parent gate, settings, adaptive levels, progress, backup.
**Independent Test**: quickstart scenario 7.

- [X] T059 [P] [US6] Copy `src/app/ParentGate.tsx`, `src/app/useHold.ts` and tests from math-soccer (hold 2 s, short tap and keys do nothing, game pauses) (FR-050)
- [X] T060 [US6] Implement `src/app/SettingsPage.tsx` with groups Stufen, Themen, Gebäude, Runde, Ton, Bedienung, Hangar, Daten (FR-051), structure copied from math-soccer; start and hardest level kept in order; "Kopie wiederherstellen"; version and build date; tests
- [X] T061 [P] [US6] Copy `src/app/TransferDialog.tsx` and test from math-soccer; "Daten sichern", "Daten laden", "QR-Code" in settings (FR-053)
- [X] T062 [US6] Implement `src/core/progress/summarize.ts` and `src/app/ProgressPage.tsx`: per mode current level; table per level and kind (alone, with help, "gemeistert"); table per side for view kinds; bests; "Fortschritt zurücksetzen", "Alles zurücksetzen" with confirmation (FR-048, FR-049); tests
- [X] T063 [US6] Connect adaptive levels to the round: level up line "Neue Stufe: Große Baupläne!", nothing on level down, current level per mode kept across rounds and sessions, settings applied on close (FR-030, FR-031, FR-054)
- [X] T064 [US6] Playwright `tests/e2e/settings.spec.ts` and `tests/e2e/persistence.spec.ts` (adapted from math-soccer): gate, start level 3 for Treffer, kind off, reload keeps settings, progress counts, export and import

## Phase 9: User Story 7 - Stars and the Hangar (P3)

**Goal**: spend stars on looks.
**Independent Test**: quickstart scenario 8.

- [X] T065 [P] [US7] Implement `src/core/rewards/items.ts` and `buy`, `choose` in `hangar.ts`: categories plane color, tail picture, smoke color, bomb style (confetti default, water balloon, stars, bubbles), pilot hat; one free default per category; prices 10 to 60 stars; tests that looks never reach task generation (FR-045)
- [X] T066 [US7] Implement `src/app/Hangar.tsx` adapted from math-soccer `LockerRoom.tsx`: preview plane, groups, "noch N Sterne", Escape back; opens from the start screen and pauses a round (FR-046)
- [X] T067 [US7] Apply looks in `PlaneView.ts` and `BombView.ts` at once; hide Hangar and stars when "Hangar und Sterne" is off; Playwright `tests/e2e/hangar.spec.ts`

## Phase 10: Polish and cross-cutting

- [X] T068 [P] Copy and adapt `tests/e2e/offline.spec.ts` and `tests/e2e/noExternalRequests.spec.ts` from math-soccer; play a round of each mode offline (SC-008, FR-057)
- [X] T069 [P] Copy and adapt `tests/e2e/pauseResume.spec.ts` and `leaveEarly.spec.ts`; refresh during a round continues it (stored round)
- [X] T070 [P] Adapt `tests/e2e/speech.spec.ts`: "Vorlesen" reads the banner; no speech API means no error
- [X] T071 [P] `tests/e2e/devices.spec.ts` for ipad-landscape and ipad-portrait: field, cards and grid fit without scroll, paint grid squares at least 44 CSS px, number pad shows for "Bauen" (critique P7, FR-056)
- [X] T072 [P] Adapt `tests/e2e/basePath.spec.ts` and `tests/e2e/performance.spec.ts` from math-soccer
- [X] T073 [P] Words check: Playwright walk over every screen asserting no "falsch" or "verloren" (SC-009)
- [X] T073a [P] Look for CC0 recordings of a propeller hum, a bomb whistle, a soft hit pop and a crate landing (for example on kenney.nl or opengameart.org); check each license on the asset's own page; bundle passing files in `public/assets/` and wire them in `src/audio/sfx.ts` with the synthesized sound as fallback; skip any sound whose license cannot be confirmed (PRD section 13, FR-043)
- [X] T074 Write `README.md`: what the game is for, how to play (both modes), parent guide (gate, settings, progress, backup), development commands, and the asset table with author, license and source for every bundled file (FR-058)
- [X] T075 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm e2e`; fix failures
- [ ] T076 Publish (R14, FR-060): `gh auth status`; `gh repo create iddocohen/math-plane --public --source . --push`; `gh api -X POST repos/iddocohen/math-plane/pages -f build_type=workflow`; wait for the "Build and publish to GitHub Pages" run; confirm `https://iddocohen.github.io/math-plane/` loads. If `gh` is not logged in, record the blocker in the implement report

## Dependencies

- Phase 1 → Phase 2 → stories.
- US1 (Phase 3) first: it builds the bomb pass used by US2.
- US2 depends on US1 (TrefferRules, BombView) and on T038/T039.
- US3 depends on Phase 2 only. US4 depends on US3 (BauenMalenRules) and on T039 (mixed buildings).
- US5 depends on at least one kind per mode (US1, US3); its help content covers all kinds, so run it after US4.
- US6 depends on Phase 2; its e2e tests need US1 and US3.
- US7 depends on Phase 2 and the plane and bomb views.
- Polish after all stories; T076 last.

## Parallel examples

- Phase 2: T010, T011, T013, T014, T015, T017 in parallel; then T016, T018, T019.
- US1: T031, T032, T034 in parallel, then T033, T035, T036, T037.
- US2: T038, T039, T041 in parallel, then T040, T042, T043.
- US4: T050, T051 in parallel.

## Implementation strategy

1. MVP: Phases 1 to 3 give a playable "Treffer" with solids and shapes.
2. Add US2, US3, US4 for the grade 2 content, then US5 help, US6 parent controls, US7 Hangar.
3. Each story ends with its Playwright spec green before the next starts.
