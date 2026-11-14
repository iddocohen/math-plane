# Mathe-Flieger

A geometry game in the browser for a child in grade 2, with a German user interface. A small red plane flies over a grass field. The child finds solids, flat shapes, building plans and views, builds buildings from plans and colors views on a grid.

Play it at [iddocohen.github.io/math-plane](https://iddocohen.github.io/math-plane/). It runs in Chrome and Firefox on a computer and in Safari on an iPad. After the first visit it also works offline.

## What the game is for

Grade 2 geometry in Germany asks children to name solids and flat shapes, to read and write building plans (a grid where each square holds the number of cubes stacked on it) and to tell what a building looks like from the front, the top, the right and the left. The game practices these skills in short rounds:

- Every task can be solved alone or with help in three steps.
- A mistake never costs stars or progress, and no screen says "falsch" or "verloren".
- The level rises and falls with the child, separately for each mode.
- The child earns stars and spends them in the Hangar on looks for the plane.

The game was built from a product description ([specs/001-math-plane/source-prd.md](specs/001-math-plane/source-prd.md)) and its specification, plan and task list in [specs/001-math-plane/](specs/001-math-plane/).

## How to play

The start screen has two big buttons: "Treffer" (key 1) and "Bauen und Malen" (key 2). Each button shows the child's current level in that mode.

### "Treffer"

The banner names what to find, for example "Triff den Zylinder!". The child taps the right target on the field, or moves the marker with the arrow keys and presses Enter or Space. The plane flies over and drops one bomb.

- A hit bursts the target into stars and gives one star.
- A miss shows a soft puff and names what was hit ("Das ist die Kugel."). The choices change places and the task stays.
- A round has 10 bombs. It ends when the last bomb has landed, with "8 Treffer mit 10 Bomben".

The five levels:

1. "Körper": find a Würfel, Quader, Zylinder, Kugel or Pyramide.
2. "Formen": find a Kreis, Dreieck, Quadrat or Rechteck, seen from above.
3. "Baupläne finden": find the building that matches a plan card.
4. "Ansichten vorn und oben": find the view of a building from the front or the top.
5. "Alle Seiten": views from every side, also of buildings with cylinders and spheres.

### "Bauen und Malen"

A round has 5 tasks and no bombs. The child can try each task as often as needed and presses "Fertig" (key F) to check it.

- "Bauen": the card "So soll es aussehen" shows a building. The child writes its plan, one square at a time, with the number keys or the number pad (0 to 4). Each number drops crates on parachutes onto the field.
- "Malen": the child colors the view of a cube building on a grid, from the side the eye shows ("Hier stehst du") or from above ("Hier fliegst du").
- "Male an": the grid shows the outlines of a view. The child taps a color and then the outlines to fill them.

After a wrong "Fertig", only the wrong stacks, squares or outlines get a dashed orange mark with a "?". A right "Fertig" gives 3 stars.

The five levels are "Kleine Baupläne" (2 by 2), "Große Baupläne" (3 by 3), "Vorn und oben", "Rechts und links" and "Male an".

### Keys and buttons

| Key | Button | What it does |
|-----|--------|--------------|
| 1, 2 | "Treffer", "Bauen und Malen" | Start a round on the start screen |
| Arrow keys | Tap on the field or grid | Move the marker |
| Enter, Space | Tap | Drop a bomb, color a square, fill an outline |
| 0 to 4, Backspace | Number pad | Write or clear a plan square in "Bauen" |
| F | "Fertig" | Check a "Bauen und Malen" task |
| H | Yellow "?" | Next help step: a hint sentence, then a pointer, then the answer |
| Escape | Pause | Pause; Enter, Space or Escape go on |
| K | "Hangar" | Open the Hangar from the start screen |

After two misses on the same task, the first help step opens by itself. "Zum Start" asks "Runde beenden?" before it leaves a round. Reloading the page during a round continues the round.

### The Hangar

Stars buy looks for the plane in five groups: Farbe, Heckbild, Rauch, Bomben and Mütze. An item of up to 20 stars is bought with one tap. A dearer item asks "Für N Sterne kaufen?" first. The Hangar opens from the start screen, or from the plane icon during a round, which pauses the round.

## Guide for parents

- **Open the parent area:** hold the gear icon for 2 seconds. A short tap or a key does not open it, so a child does not open it by chance. The round pauses while it is open. The menu offers "Einstellungen" and "Fortschritt".
- **Settings ("Einstellungen"):**
  - "Stufen": the first and the hardest level of each mode, and "Passt sich dem Kind an". With it on, the level rises after 3 tasks in a row solved alone and falls when 2 of the last 3 tasks needed help. It stays between the two levels you set.
  - "Themen": turn each task kind on or off.
  - "Gebäude": the largest plan (2 by 2 or 3 by 3), the highest stack (2 to 4), the sides used, and whether buildings have cylinders and spheres.
  - "Runde": bombs per "Treffer" round (5 to 20) and tasks per "Bauen und Malen" round (3 to 10).
  - "Ton": "Geräusche" (sound effects) and "Vorlesen" (off by default). "Vorlesen" reads each task aloud with the browser's German voice and adds a speaker button that reads it again.
  - "Bedienung": "Zahlenfeld" (automatic shows the number pad on touch screens), "Uhr zeigen", "Rekorde zeigen" and "Punkt nach voller Hilfe" (whether a task solved after the third help step still earns stars).
  - "Hangar und Sterne": turn the Hangar and the stars off.
  - Saved settings apply when the settings page closes. Settings that change tasks apply from the next task. The running round keeps its length.
- **Progress ("Fortschritt"):** per mode, the current level and, per level and task kind, how many tasks the child solved alone and with help. View tasks are also listed per side. A task kind counts as "gemeistert" after at least 10 tries with at least 8 of the last 10 solved alone. The page also shows the personal bests, "Fortschritt zurücksetzen" and "Alles zurücksetzen". Each reset asks first.
- **Backup ("Daten"):** "Daten sichern" downloads settings, progress, bests and Hangar data to a file, and "Daten laden" loads that file. "QR-Code" moves the same data to another browser by QR code or link.

All data stays in the browser where the game runs (`localStorage`, under keys that start with `mathplane.`). No data goes to a server.

- When stored data cannot be read, the game keeps a copy and the start screen shows a short note. When a later version can read the copy, the settings page offers "Kopie wiederherstellen".
- Safari on an iPhone or iPad deletes the data of a website that was not opened during 7 days of Safari use. Add the game to the Home Screen (Share, then "Zum Home-Bildschirm") and play it from there to keep the progress through a break.
- Clearing browser data deletes the progress. Save it with "Daten sichern" first.
- A new version loads in the background. During a round it waits, and the round end says "Neue Version, startet gleich".

## Development

Requirements: Node.js 22 or later and pnpm 10.

```sh
pnpm install
pnpm dev          # development server
pnpm lint
pnpm typecheck
pnpm test         # unit tests (Vitest)
pnpm build        # production build in dist/
pnpm preview      # serve the production build
pnpm exec playwright install chromium firefox webkit
pnpm e2e          # browser tests (Playwright)
```

`pnpm e2e` builds the game and serves it on port 4373, and a second build for GitHub Pages under `/math-plane/` on port 4374. A server already running on one of these ports is used as it is, so stop it first to test fresh code. The tests run in Chromium, Firefox and WebKit, on an iPad Mini held sideways and upright (`devices.spec.ts`) and under `/math-plane/` (`basePath.spec.ts`).

The last project checks the frame rate in Chromium (`performance.spec.ts`), after every other project has finished. `pnpm exec playwright test --project=performance --no-deps` runs it alone. Without a graphics card it is skipped.

Test hooks in the address: `?seed=N` fixes the tasks, `?speed=N` makes play time run N times as fast, and `?test=1` writes the answer into the round element (`data-answer`). The full list is in [specs/001-math-plane/contracts/screens.md](specs/001-math-plane/contracts/screens.md).

Every push to `main` publishes the game to GitHub Pages with [.github/workflows/pages.yml](.github/workflows/pages.yml). The workflow runs lint, type check and unit tests, then builds with `vite build --base=/math-plane/`.

Many parts are copied from [math-soccer](https://iddocohen.github.io/math-soccer/) and adapted: storage, data transfer, the parent gate, the number pad, speech, sounds, the offline cache and the test setup. Each copied file says so in its first lines.

## Assets and licenses

The game bundles a few free asset files in `public/assets/`. The license of each file was checked on its source page before use (FR-058). The files ship with the build and the offline cache, so the game makes no request to other sites.

| Use | File | Asset | Author | License | Source |
|-----|------|-------|--------|---------|--------|
| Hit | `pop.mp3` | partypopper (freesound 26349), mono; reused from math-soccer | Streety | CC0 1.0 | [freesound.org/s/26349](https://freesound.org/s/26349) |
| Buying in the Hangar | `coin.mp3` | Coin Pickup (freesound 478647), trimmed to 0.8 s, mono; reused from math-soccer | Phenala | CC0 1.0 | [freesound.org/s/478647](https://freesound.org/s/478647) |
| Celebration | `fanfare.mp3` | Success Fanfare Trumpets (freesound 456966), trimmed to 1.9 s with a fade, mono; reused from math-soccer | FunWithSound | CC0 1.0 | [freesound.org/s/456966](https://freesound.org/s/456966) |
| Plane flying over | `propeller.mp3` | Cartoon Propeller (Loop) Small and Fast (freesound 741363), trimmed to 1.2 s with fades, mono, 15 dB quieter | Mish7913 | CC0 1.0 | [freesound.org/people/Mish7913/sounds/741363](https://freesound.org/people/Mish7913/sounds/741363/) |
| Falling bomb | `whistle.mp3` | Falling Bomb.wav (freesound 506313), sped up to 1.0 s at the same pitch, with fades, mono | Daleonfire | CC0 1.0 | [freesound.org/people/Daleonfire/sounds/506313](https://freesound.org/people/Daleonfire/sounds/506313/) |
| Crate landing | `crate.mp3` | Impact Sounds, `impactWood_heavy_000.ogg`, mono with a short fade | Kenney | CC0 1.0 | [kenney.nl/assets/impact-sounds](https://kenney.nl/assets/impact-sounds) |
| Stars, sparkles and light | `star_04.png`, `star_06.png`, `star_07.png`, `flare_01.png`, `light_01.png` | Particle Pack, white versions scaled to 64 px and tinted in code; reused from math-soccer | Kenney | CC0 1.0 | [kenney.nl/assets/particle-pack](https://kenney.nl/assets/particle-pack) |
| Text and headings | `Fredoka.ttf` | Fredoka (variable TTF); reused from math-soccer | The Fredoka Project Authors | SIL Open Font License 1.1 (text in `public/assets/OFL.txt`) | [fonts.google.com/specimen/Fredoka](https://fonts.google.com/specimen/Fredoka) |

The propeller and whistle files come from the freesound preview of each sound, because a full download needs a login. Every sound also has a version made in code, which plays when its file cannot load.

The app icons in `public/icons/` are drawn for this game. The plane, the solids, the shapes, the buildings, the crates, the parachutes, the field and the sky are drawn in code.
