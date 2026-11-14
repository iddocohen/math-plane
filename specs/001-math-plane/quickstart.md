# Quickstart: validate Mathe-Flieger

## Prerequisites

- Node 22 and pnpm 10 (as math-soccer).
- `pnpm install` in the repository root.
- For publishing: `gh auth status` shows a login for `iddocohen`.

## Automated checks

```bash
pnpm lint
pnpm typecheck
pnpm test                    # Vitest: core geometry, tasks, controller, progress, storage; app screens
pnpm build
pnpm e2e                     # Playwright against the build: chromium, firefox, webkit, iPad, base path
```

Expected: every command exits 0.

## Manual scenarios

Run `pnpm dev`, open the printed address. Each scenario maps to a user story in [spec.md](./spec.md).

1. **Treffer, solids (US1)**: press 1. Four solids stand on the field and the banner names one. Tap a wrong one: a soft puff, "Das ist ...", the solids move, the bomb counter drops by 1. Tap the right one: stars and confetti, "Treffer!", +1 star. Use all 10 bombs: the end screen reads "N Treffer mit 10 Bomben". Press Enter: a new round starts.
2. **One bomb per pass (SC-006)**: during a pass, tap all other targets quickly. Only one bomb drops.
3. **Plans and views (US2)**: in settings set "Treffer" start level 3. Each plan card matches one building; a miss shows a "Getroffen" card. Set start level 5: view tasks ask for all four sides, and some buildings have cylinders or spheres.
4. **Bauen (US3)**: press 2. Type heights; crates drop on parachutes; a smaller number removes crates with a puff. Leave one tower wrong and press "Fertig": only that tower is marked on the plan and on the field.
5. **Malen and Male an (US4)**: set "Bauen und Malen" start level 4. Color a view with one extra square; "Fertig" marks only that square. Fix it: the plane trails smoke in the building's color. At level 5, fill outlines with colors; a wrong color is marked after "Fertig".
6. **Help (US5)**: press H three times on any task: a sentence, then a pointer, then the answer to place. Miss twice on one "Treffer" task: help step 1 opens by itself.
7. **Parent (US6)**: tap the gear briefly: nothing. Hold it 2 seconds: the parent menu opens and the round pauses. Change settings, reload: they stay. Open "Fortschritt": counts per mode, level, task kind and side. Use "Daten sichern", then "Daten laden".
8. **Hangar (US7)**: earn stars, open the Hangar, buy a plane color and a bomb style; the next pass shows them.
9. **Offline (SC-008)**: after one load, turn the network off and reload; play a round of each mode.
10. **Keyboard only (FR-012)**: play one round of each mode without the mouse.
11. **iPad (FR-056)**: in Safari on iPad, both orientations: field, cards and grid fit; the number pad shows for "Bauen".

## Published game (SC-010)

After a push to `main`, the "Build and publish to GitHub Pages" workflow passes and `https://iddocohen.github.io/math-plane/` serves the game.
