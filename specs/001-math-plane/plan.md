# Implementation Plan: Mathe-Flieger

**Branch**: `main` (spec directory `001-math-plane`) | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-math-plane/spec.md`, source PRD [source-prd.md](./source-prd.md), visual reference [prototype/index.html](./prototype/index.html)

## Summary

A static, offline-capable browser game. A Phaser 4 canvas draws a 2D scene: sky with clouds, a red cartoon plane with a pilot, and a grass field with solids, flat shapes and cube buildings in the prototype's fixed isometric view. Two modes share one `RoundController`: "Treffer" (tap a target, one bomb per pass, 10 bombs per round) and "Bauen und Malen" (complete plans with parachute crates, color views on a grid, fill outlines of mixed buildings; 5 tasks per round). A React overlay shows the banner, help, round end, parent gate, settings, progress, Hangar and transfer dialog. All geometry (plans, views, mixed buildings, variants), task generation, checking, help, adaptive levels and mastery live in engine-free TypeScript under `src/core/`, deterministic for a seed and covered by Vitest. Storage, transfer, parent gate, number pad, speech, sounds with fallbacks, PWA and publishing are copied from math-soccer and adapted.

## Technical Context

**Language/Version**: TypeScript `~6.0.3`, strict, ES2022 target

**Primary Dependencies**: Phaser `~4.2.0`, React `~19.3.0`, Vite `~8.3.0` with `@vitejs/plugin-react`, `vite-plugin-pwa` `~2.0.0`, Zod `~4.6.0`, `uqr` 0.1.3 (research R1)

**Storage**: Browser `localStorage`, keys `mathplane.*.v1` (research R11)

**Testing**: Vitest `~5.1.0` (node project for `src/core`, jsdom project for `src/app`); Playwright `~1.64.0` against the production build (chromium, firefox, webkit, ipad-landscape, ipad-portrait, base-path)

**Target Platform**: Current Firefox and Chrome on a computer, Safari on iPad (landscape and portrait). Phones are not a target.

**Project Type**: Single-page web application, static files, no backend

**Performance Goals**: 60 frames per second on a laptop, at least 30 on an iPad; round scene shown within 3 seconds of a start button; a bomb pass of 2.4 seconds (R9)

**Constraints**: Offline after the first load; no network request leaves the site; no external fonts or CDNs; free licenses only; encouraging feedback only; no timer by default; no 3D engine

**Scale/Scope**: One player per browser; 9 screens; 2 modes; 7 task kinds; 10 levels (5 per mode); plans up to 3×3

## Constitution Check

`.specify/memory/constitution.md` is the unfilled template, so no ratified principles apply. The plan is checked against the PRD's ground rules (section 3) and anti-goals (section 2), as math-soccer did:

| Gate | Status |
|---|---|
| No punishing word, sound or loss after a mistake (FR-041) | Pass: forbidden-word test over `src/i18n/de.ts`; stars only grow; bombs are the only thing used up |
| No tap-through answers (anti-goal, FR-008, FR-009, FR-034) | Pass: one bomb per pass enforced in the controller; no per-square checks; auto-help after 2 misses; outcome "withHelp" after any miss |
| No violence (FR-042) | Pass: effects are stars, confetti, smoke, water only |
| Rewards never make the math easier (FR-045) | Pass: Hangar data never reaches task generation or bomb count |
| Data stays in the browser, no request leaves the site (FR-057) | Pass: copied `noExternalRequests` e2e test |
| Free licenses only (FR-058) | Pass: drawn art and synthesized sound by default; reused math-soccer assets keep their README entries |

Re-checked after Phase 1 design: unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/001-math-plane/
├── source-prd.md         # approved design, verbatim
├── spec.md
├── plan.md               # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── core-api.md       # engine-free modules
│   └── screens.md        # screens, keys, feedback, test hooks
├── prototype/index.html  # throwaway visual reference
├── checklists/requirements.md
└── tasks.md              # from /speckit-tasks
```

### Source Code (repository root)

```text
index.html
package.json              # copied from math-soccer, name math-plane
vite.config.ts            # copied, manifest "Mathe-Flieger"
tsconfig.json eslint.config.js playwright.config.ts   # copied; ports 4373/4374; no Fire tablet projects
.github/workflows/pages.yml                           # copied, --base=/math-plane/
public/icons/ public/assets/                          # Fredoka, Kenney particles, coin/fanfare/pop sounds (reused)
src/
├── main.tsx
├── assets.ts
├── app/                  # React (copied and adapted where marked)
│   ├── App.tsx  useScreen.ts  useController.ts  useKeyboard.ts  keyboard.ts
│   ├── StartScreen.tsx
│   ├── RoundOverlay.tsx  # banner, message, bombs or task counter, help, Fertig, palette
│   ├── PauseScreen.tsx   RoundEnd.tsx                # adapted
│   ├── ParentGate.tsx  useHold.ts                    # copied
│   ├── SettingsPage.tsx  ProgressPage.tsx            # structure copied, content new
│   ├── Hangar.tsx                                    # adapted from LockerRoom.tsx
│   ├── NumberPad.tsx  TransferDialog.tsx  swUpdate.ts  persistence.ts  buildInfo.ts  noFocus.ts  # copied
│   └── styles.css
├── game/                 # Phaser views over controller state
│   ├── createGame.ts  RoundScene.ts
│   ├── SkyView.ts        # sky, clouds, grass field
│   ├── PlaneView.ts      # plane, pilot, bobbing, Hangar looks, smoke trail
│   ├── BombView.ts       # bomb path and burst styles
│   ├── iso.ts            # drawBox, drawCylinder, drawSphere, drawBuilding (from the prototype)
│   ├── SolidsView.ts  ShapesView.ts  BuildingView.ts  CratesView.ts
│   ├── CardsView.ts      # plan cards, view cards, "Getroffen" card
│   ├── GridView.ts       # paint grid and outline regions
│   ├── particles.ts  effects.ts                      # adapted from math-soccer
│   └── palette.ts
├── audio/
│   ├── sfx.ts            # adapted: propeller, whistle, pop, crate, puff, cheer; files with fallbacks
│   └── speaker.ts        # copied
├── core/
│   ├── rng.ts  util.ts  types.ts                     # copied
│   ├── geometry/         # plan, views, mixed, iso
│   ├── tasks/            # kinds, levels, generate, check, help
│   ├── round/            # RoundController, events, stored round
│   ├── progress/         # outcome, adaptive, mastery, summarize
│   ├── rewards/          # hangar, items
│   ├── records/          # personal bests
│   ├── settings/         # schema, defaults, validate
│   ├── storage/          # copied, mathplane keys
│   └── transfer/         # copied
└── i18n/ de.ts index.ts
tests/e2e/                # Playwright specs and fixtures (fixtures, gameWait, layout copied)
README.md                 # how to play, parent guide, asset list
```

**Structure Decision**: Single web project with math-soccer's layout. `src/core` is the testable heart; `src/game` and `src/app` are views over `RoundController`.

## Key design decisions

1. **Prototype coordinates** (R3): plans, the isometric projection and the four views use exactly the prototype's conventions, so the parent-reviewed look and the hidden-side logic carry over.
2. **Readable buildings by rule plus fallback list** (R4): every generated building is checked; a built-in list covers the rare seed where generation fails.
3. **Variants checked by equality** (R5, R7): exactly one right choice is guaranteed by comparing plans and view signatures.
4. **Mixed buildings as pieces with painter's-order outlines** (R6): one model draws them in isometric, computes views, and hit-tests "Male an" regions.
5. **Controller decides, view animates** (R2, R9): hit or miss is decided at tap time; the bomb path always ends at the target.
6. **One bomb per pass and auto-help** (FR-008, FR-034): enforced in `RoundController`, tested in core, not in the scene.
7. **Copy, then adapt math-soccer modules**; each copied file keeps a header comment naming its origin, as math-soccer did with math-tank.
8. **Levels are data** (FR-055): `LEVELS` and `TaskKind` are lists; progress keys are strings `mode:kind:level`, so later topics add entries without migration.

## Phasing (maps to spec priorities)

1. **Setup**: copy tooling, CI, PWA, i18n, Rng, storage, transfer; settings schema; empty scene.
2. **Foundation**: geometry (plan, views, mixed, iso), levels, task generation and checks, `RoundController`, sky/field/plane views, start screen, round overlay, round end.
3. **US1 (P1)**: "Treffer" with Körper and Formen: bomb pass, hit and miss feedback, reshuffle, bomb bay, end screen.
4. **US2 (P1)**: "Bauplan finden" and "Ansicht finden", cards, mixed buildings in view tasks.
5. **US3 (P1)**: "Bauen" with plan input, number pad, crates.
6. **US4 (P1)**: "Malen" and "Male an".
7. **US5 (P1)**: help steps and auto-help for every kind.
8. **US6 (P1)**: parent gate, settings, progress records, adaptive levels, mastery, progress page, backup and transfer.
9. **US7 (P3)**: stars, Hangar, looks.
10. **Polish**: offline, iPad layout, speech, pause, fullscreen, refresh keeps the round, e2e tests, performance check, README with asset list, GitHub repository and Pages (R14).

## Risks

- **Mixed building generation produces unreadable views**: mitigated by templates and the visibility check (R6), with unit tests over many seeds.
- **Views that look the same from two sides**: handled by accepting every equal side (R7) and tested.
- **Copied math-soccer code drags in soccer concepts**: copied modules are trimmed; tests come with them.
- **iPad layout with grid, card and field side by side**: the world is scaled as math-soccer; portrait stacks the grid below the field (layout tested in the ipad-portrait project).
- **Publishing needs network and `gh` auth**: if `gh` is not logged in, the publish task records the blocker and the local build stays complete.

## Complexity Tracking

No gate violations to justify.
