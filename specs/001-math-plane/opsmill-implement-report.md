# Implementation report: Mathe-Flieger

- **Feature**: Mathe-Flieger, a browser game for learning solids, flat shapes, building plans and views
- **Spec directory**: `specs/001-math-plane`
- **Base commit**: `24b12d2` (end of prep)
- **Head commit**: `14c351a` before this report
- **Status**: DONE (all 77 tasks complete; local-pass evidence for every new test; full review by the pr-review-toolkit plugin)
- **Published**: repository https://github.com/iddocohen/math-plane, game https://iddocohen.github.io/math-plane/ (workflow run 43593377678: build and deploy succeeded; the page returns HTTP 200 with title "Mathe-Flieger")

## 1. Chunk ledger

| # | Chunk (tasks.md phase) | Tasks | ✅ / ⚠️ / ❌ | Commit | Flagged decisions |
|---|---|---|---|---|---|
| 1 | Phase 1 Setup | T001–T009 | 9 / 0 / 0 | `8cbbde7` | Kept math-soccer's four forbidden words ("falsch", "verloren", "Fehler", "schlecht"); storage notices are exempt from the 8-word limit; some German help lines were written new. |
| 2 | Phase 2 Foundational, part a | T010–T016 | 7 / 0 / 0 | `316f677` | Dropped math-soccer's stored-data baseline (new app); `Plan` is a plain `number[][]`; a point on a nearer stack's outline counts as covered in the readability check; the rule "vorn or oben stays on" was not implemented (only "at least one side on"). |
| 3 | Phase 2 Foundational, part b | T017–T023 | 7 / 0 / 0 | `1a69617` | Controller API: `tick()`, `setHidden()`, `toStored()`, events `phaseChanged` and `attemptRecorded`; a bomb counts when it lands; review tasks come only from levels inside the parent's range. |
| 4 | Phase 2 Foundational, part c | T024–T030 | 7 / 0 / 0 | `bb5b1c0` | `TASK_VIEWS` registry for scene views; `answer?()` added to the rules interface for the test hook. |
| 5 | Phase 3 US1 Treffer solids and shapes | T031–T037 | 7 / 0 / 0 | `81e906f` | `data-scene="round"` added so tests wait for the scene; the hit choice always moves after a miss. |
| 6 | Phase 4 US2 plans and views | T038–T043 | 6 / 0 / 0 | `62c3512` | Three-slot tasks stand at x 560 to 1300 with the plan card or building on the left (contracts updated); mixed-view signatures are built from the rendered picture. |
| 7 | Phase 5 US3 Bauen | T044–T049 | 6 / 0 / 0 | `995fe2d` | New `select(row, col)` input and `inputApplied` event (contracts updated); "Fertig" waits while crates fall; crate gap 450 ms instead of 220 ms. |
| 8 | Phase 6 US4 Malen and Male an | T050–T055 | 6 / 0 / 0 | `d9ad60c` | 2×2 plans never ask for the top view (always full); no color is preselected in "Male an"; checks return marked ids only (contracts updated). |
| 9 | Phase 7 US5 help | T056–T058 | 3 / 0 / 0 | `b3955f4` | The step-2 pointer is fixed when the step opens; auto-help text follows the miss line. |
| 10 | Phase 8 US6 parent and progress | T059–T064 | 6 / 0 / 0 | `f85dd9d` | Start and hardest level move together so they never cross; "QR-Code" shows the code on demand; gear test id `parent-gate`. |
| 11 | Phase 9 US7 Hangar | T065–T067 | 3 / 0 / 0 | `07b0bee` | Free defaults `planeColor.red`, `tail.star`, `smoke.none`, `bomb.confetti`, `hat.cap`; items over 20 stars ask first; plane drawing shared in `src/game/planeArt.ts`. |
| 12 | Phase 10 Polish | T068–T075, T073a | 9 / 0 / 0 | `51128a3` | Fixed two product bugs: "Vorlesen" did not read the task, and the upright iPad grid had 40.8 px squares (now 45.6 px). Bundled 3 CC0 sounds from freesound preview files. |
| 13 | Review fixes | review findings | n/a | `14c351a` | See section 4. |
| 14 | T076 Publish (orchestrator) | T076 | 1 / 0 / 0 | pushed `14c351a` | Run by the orchestrator after the review, as the PRD section 15 allows. |

## 2. Tasks not completed

None. Every task in tasks.md is `[X]`.

## 3. Local-pass evidence

Environment for all rows: macOS (Darwin 25.6.0, arm64), Node v25.6.1, Vitest 5.1.0, Playwright 1.64. Rows aggregate the chunk reports; file-level rows list the per-file pass line the chunk returned.

| Test id | Type | Run command | Passed at | Environment | Verbatim pass line |
|---|---|---|---|---|---|
| `src/i18n/de.test.ts`, `src/core/rng.test.ts`, `src/core/util.test.ts` | unit | `pnpm exec vitest run --reporter=verbose` | 2026-11-14T09:00:06Z | node | `Tests  27 passed (27)` |
| `src/core/settings/settings.test.ts`, `storage/storage.test.ts`, `transfer/transfer.test.ts`, `transfer/qr.test.ts`, `geometry/iso.test.ts`, `geometry/plan.test.ts` | unit | `pnpm vitest run src/core/settings src/core/storage src/core/transfer src/core/geometry --reporter=verbose` | 2026-11-14T09:07:58Z | node | `Tests  71 passed (71)` |
| `src/core/geometry/views.test.ts` | unit | `pnpm vitest run <file>` | 2026-11-14T09:21:38Z | node | `Tests  6 passed (6)` |
| `src/core/tasks/levels.test.ts` | unit | same | 2026-11-14T09:21:40Z | node | `Tests  15 passed (15)` |
| `src/core/progress/adaptive.test.ts` | unit | same | 2026-11-14T09:21:44Z | node | `Tests  12 passed (12)` |
| `src/core/rewards/hangar.test.ts` | unit | same | 2026-11-14T09:21:49Z | node | `Tests  5 passed (5)` |
| `src/core/records/records.test.ts` | unit | same | 2026-11-14T09:21:54Z | node | `Tests  4 passed (4)` |
| `src/core/round/RoundController.test.ts` | unit | same | 2026-11-14T09:21:56Z | node | `Tests  27 passed (27)` |
| `src/app/persistence.test.ts` | unit | same | 2026-11-14T09:22:01Z | jsdom | `Tests  19 passed (19)` |
| `src/audio/speaker.test.ts` | unit | same | 2026-11-14T09:22:05Z | node | `Tests  6 passed (6)` |
| `src/audio/sfx.test.ts` | unit | same | 2026-11-14T09:22:08Z | node | `Tests  29 passed (29)` |
| `src/game/*.test.ts`, `src/core/view/screen.test.ts`, `src/app/{keyboard,roundText,playClock,swUpdate,useScreen}.test.ts`, `src/app/{RoundEnd,PauseScreen,RoundOverlay}.test.tsx` | unit | `pnpm exec vitest run --reporter=verbose <files>` | 2026-11-14T09:41:20Z | node, jsdom | `Tests  100 passed (100)` |
| `tests/e2e/smoke.spec.ts` | e2e | `pnpm e2e --project=chromium tests/e2e/smoke.spec.ts` | 2026-11-14T09:41:52Z | Chromium | `4 passed (11.2s)` |
| `src/core/tasks/generate.test.ts`, `check.test.ts`, `round/TrefferRules.test.ts`, `game/slots.test.ts`, `app/roundText.test.ts` | unit | `pnpm exec vitest run <files> --reporter=verbose` | 2026-11-14T09:58:04Z | node, jsdom | `Tests  31 passed (31)` |
| `tests/e2e/treffer.spec.ts` (3 tests) | e2e | `pnpm exec playwright test --project=chromium tests/e2e/treffer.spec.ts tests/e2e/smoke.spec.ts` (then firefox, webkit) | 2026-11-14T09:58:10Z / 09:58:44Z / 09:59:04Z | Chromium, Firefox, WebKit | `7 passed (32.6s)`; `7 passed (17.6s)`; `7 passed (15.4s)` |
| `src/core/geometry/planVariants.test.ts`, `mixed.test.ts`, `tasks/generateViews.test.ts` (+ modified generate, TrefferRules, slots tests) | unit | `pnpm vitest run <6 files>` | 2026-11-14T10:16:30Z | node | `Tests  48 passed (48)` |
| `tests/e2e/trefferViews.spec.ts` (2 tests) | e2e | `pnpm playwright test tests/e2e/trefferViews.spec.ts tests/e2e/treffer.spec.ts --project=chromium --project=firefox --project=webkit` | 2026-11-14T10:15:27Z | Chromium, Firefox, WebKit | `15 passed (57.2s)` |
| `bauen.test.ts`, `BauenMalenRules.test.ts`, `crates.test.ts`, `bauenLayout.test.ts`, `NumberPad.test.tsx` (+ modified RoundOverlay, RoundController, check tests) | unit | `pnpm vitest run <8 files> --reporter=verbose` | 2026-11-14T10:34:10Z | node, jsdom | `Tests 72 passed (72)` |
| `tests/e2e/bauen.spec.ts` (2 tests) | e2e | `pnpm exec playwright test --project=chromium --project=firefox --project=webkit` | 2026-11-14T10:33:45Z | Chromium, Firefox, WebKit | `33 passed (56.6s)` |
| `malen.test.ts`, `maleAn.test.ts`, `BauenMalenRules.test.ts`, `ColorRow.test.tsx`, `paintLayout.test.ts` | unit | `pnpm -s vitest run <5 files>` | 2026-11-14T10:46:04Z | node, jsdom | `Tests  49 passed (49)` |
| `tests/e2e/malen.spec.ts` (2 tests) | e2e | `pnpm -s exec playwright test tests/e2e/malen.spec.ts --project=chromium --project=firefox --project=webkit` | 2026-11-14T10:47:36Z | Chromium, Firefox, WebKit | `6 passed (27.1s)` |
| `src/core/tasks/help.test.ts`, `src/game/helpLook.test.ts`, `src/app/roundText.test.ts` | unit | `pnpm vitest run <3 files> --reporter=verbose` | 2026-11-14T10:57:43Z | node, jsdom | `Tests  20 passed (20)` |
| `tests/e2e/help.spec.ts` (9 tests) | e2e | `pnpm exec playwright test --project=chromium --project=firefox --project=webkit` | 2026-11-14T10:57:39Z | Chromium, Firefox, WebKit | `66 passed (1.7m)` |
| `ParentGate.test.tsx`, `TransferDialog.test.tsx`, `SettingsPage.test.tsx`, `ProgressPage.test.tsx`, `summarize.test.ts` (+ RoundController, roundText) | unit | `pnpm vitest run <7 files>` | 2026-11-14T11:11:02Z | node, jsdom | `Tests  91 passed (91)` |
| `tests/e2e/settings.spec.ts` (3), `tests/e2e/persistence.spec.ts` (2) | e2e | `pnpm exec playwright test --project=chromium --project=firefox --project=webkit --reporter=list` | 2026-11-14T11:10:56Z | Chromium, Firefox, WebKit | `81 passed (2.2m)` |
| `items.test.ts`, `hangar.test.ts`, `Hangar.test.tsx`, `de.test.ts` | unit | `npx vitest run src/core/rewards src/app/Hangar.test.tsx src/i18n/de.test.ts` | 2026-11-14T11:26:51Z | node, jsdom | `Tests  41 passed (41)` |
| `tests/e2e/hangar.spec.ts` (2 tests) | e2e | `npx playwright test --project=chromium --project=firefox --project=webkit` | 2026-11-14T11:24:54Z | Chromium, Firefox, WebKit | `87 passed (1.8m)` |
| `offline`, `noExternalRequests`, `pauseResume`, `leaveEarly`, `speech`, `words`, `devices`, `basePath`, `performance` specs; `src/game/paintLayout.test.ts` | e2e, unit | `pnpm e2e --reporter=list` | 2026-11-14T11:47:41Z | all projects (Chromium, Firefox, WebKit, ipad-landscape, ipad-portrait, base-path, performance on Metal) | `132 passed (4.5m)` |
| Review-fix tests (restore seed, Ansicht fuzz, look-alike variants, fallback warnings, round schema, ErrorBoundary, `pauseResume.spec.ts:101`, `loadFailure.spec.ts:11`) | unit, e2e | `pnpm vitest run --reporter=verbose <files>`; `pnpm e2e` | 2026-11-14T12:04:12Z (unit); e2e started 12:04:08Z | node, jsdom; all projects | `Tests  65 passed (65)`; `138 passed (4.1m)` |

Final full suites at head: `pnpm test` gave 549 passed; `pnpm e2e` gave `138 passed (4.1m)`.

## 4. Review findings

Review mode: plugin (pr-review-toolkit)

Agents: code-reviewer, pr-test-analyzer, silent-failure-hunter, type-design-analyzer, comment-analyzer, then code-simplifier (its edits recorded as low findings and discarded).

| Severity | File | Summary | Outcome |
|---|---|---|---|
| high | `src/core/round/RoundController.ts` | A refresh restored a different task, because restore used the new round seed | Fixed in `14c351a` |
| high (crash) | `src/core/tasks/generate.ts` | "Ansicht finden" threw `RangeError` for some mixed buildings and stopped the round | Fixed in `14c351a` |
| high | `src/app/App.tsx` | Game chunk load failure left a blank screen with no catch | Fixed in `14c351a` (friendly screen, log) |
| high | `src/app` | No React error boundary | Fixed in `14c351a` |
| high | `src/core/round/RoundController.ts` | `state()` returned mutable internals | Fixed in `14c351a` (deep readonly types, `lastBomb` copied) |
| high | `src/core/storage/schemas.ts` | Stored round counts not checked across fields | Fixed in `14c351a` |
| high | `src/core/geometry/plan.ts` | `Plan` type does not encode size or height range | Deferred: values are checked by generators and schemas; a branded type is a larger refactor |
| high | `src/core/tasks/types.ts` | Parallel arrays `choices`, `colors`, `looks` | Deferred: refactor; tests cover equal lengths |
| high | `src/core/transfer/qr.ts`, `src/app/swUpdate.ts`, tests | Stale requirement numbers from math-soccer | Fixed in `14c351a` |
| medium | `src/core/round/RoundController.ts` | Restore failure deleted the round silently | Fixed (console.warn) |
| medium | `src/core/geometry/mixed.ts` and other generators | Fallbacks silent; final mixed fallback unchecked | Fixed (warn; fallback checked for sides) |
| medium | `src/app/App.tsx` | `saveRound(null)` result not reported | Fixed |
| medium | `src/audio/sfx.ts` | A failed sound file is never retried in the session | Deferred: synthesized fallback plays |
| medium | `src/app/App.tsx` | `#save=` link flow has no end-to-end test | Deferred |
| medium | `src/core/storage/storage.test.ts` | Migration path untested beyond version 1 | Deferred: no version 2 yet |
| medium | `src/core/round/RoundController.test.ts` | Auto-help in "Bauen und Malen" only tested in e2e | Deferred |
| medium | `RoundController.test.ts` | Narrowing "Schwerste Stufe" during a round not tested | Deferred |
| medium | type design | `Piece` not a union by kind; settings schema alone allows start above hardest; `CubeView.signature` stored beside cells; flat `RoundState` | Deferred |
| low | `src/core/geometry/plan.ts` | 3×3 "Bauplan finden" could show a wrong building that looks the same | Fixed in `14c351a` (not reachable at current levels) |
| low | `src/audio/speaker.ts`, `storage.ts`, `swUpdate.ts` | Swallowed errors without a log | Deferred |
| low | test analyzer | Import can lower the star count (FR-044 intent unclear); `treffer.spec.ts:160` tap timing; no sad-sound assertion; second right index untested | Deferred |
| low | type design | `isTrefferTask` by field presence; `AnsichtFindenTask.color`; mutable `STARTER`; string formats unchecked | Deferred |
| low | `src/core/view/screen.ts:14` | Cites "math-tank FR-102" | Deferred |
| low | `src/app/NumberPad.tsx:1` | Comment "a stack has 0 to 4 cubes" | Deferred |
| low (simplifier) | `src/app/App.tsx:447` | Nested ternary for `keyScreen` | Deferred (edit discarded) |
| low (simplifier) | `src/core/round/RoundController.ts:480` | Nested ternary for restored phase | Deferred |
| low (simplifier) | `src/game/GridView.ts:58` | Nested ternary in `cubeOf` | Deferred |
| low (simplifier) | `src/core/round/BauenMalenRules.ts:92` | `bauenRules.createTask` repeats `taskOf` | Deferred |
| low (simplifier) | `src/core/round/TrefferRules.ts:54` | `as number` casts in `restoreState` | Deferred |
| low (simplifier) | `src/core/round/TrefferRules.ts:37` | `indexOf` before the length check in `reshuffle` | Deferred |
| low (simplifier) | `src/core/tasks/bauen.ts:38` | Redundant null checks in `checkPlan` | Deferred |

## 5. Autonomous decisions

- Chunking: Phase 2 (21 tasks) was split into three chunks (T010–T016, T017–T023, T024–T030). Every other phase was one chunk.
- T076 (publish) was run by the orchestrator after the review instead of inside the polish chunk, so the published commit is the reviewed one. The source PRD (section 15) allowed creating the public repository `iddocohen/math-plane`, pushing, and turning on GitHub Pages; this overrides the pipeline's default of not pushing.
- Pages was turned on right after the first push. The first workflow run (43593377678) still built and deployed successfully.
- Type-design findings that need refactors (branded `Plan`, merged choice arrays, `Piece` union) were deferred; the cheap high items were fixed.
- The bundled propeller and whistle sounds are freesound preview copies of CC0 recordings (full downloads need a login). Nobody has listened to the whistle yet.
- Settings rule "vorn or oben stays on when every other side is off" (data-model.md) was not implemented; only "at least one side on" is enforced.

## 6. Suggested next steps

1. Play both modes on the iPad and listen to the new sounds, especially the bomb whistle.
2. Open https://iddocohen.github.io/math-plane/ on the iPad and add it to the home screen for offline play.
3. Address the deferred medium findings, starting with the `#save=` end-to-end test and auto-help unit tests for "Bauen und Malen".
4. Run `/speckit.opsmill.extract` after reviewing this report.
