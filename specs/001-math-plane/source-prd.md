# Mathe-Flieger: a browser game for learning solids, flat shapes and views

Date: 2026-11-14
Status: draft for the parent's review. Once approved, this document is the source PRD for `/speckit.opsmill.auto`, the same way [the math-soccer PRD](https://github.com/iddocohen/math-soccer/blob/main/specs/001-math-soccer/source-prd.md) fed the math-soccer spec.

## 1. Why this game exists

The child plays [math-tank](https://iddocohen.github.io/math-tank/) (Mathe-Panzer) and [math-soccer](https://iddocohen.github.io/math-soccer/) (Mathe-Kicker). Both games turn a worksheet skill into a game he wants to play. The parent wants the same for geometry.

The child's workbook is Jo-Jo Mathematik, grade 2 (Cornelsen). The parent shared two pages:

- **"Würfelgebäude" (page 16):** match cube buildings to their building plans ("Baupläne"), and complete missing plans. A building plan is a grid seen from above, and each number is the height of the stack on that square.
- **"Ansichten von Körpern":** buildings made of blocks, cylinders and spheres are drawn in 3D. The child colors their outlines from the front, top, left and right ("Male an"), and then draws the views of another building himself ("Zeichne die Ansichten").

The parent's starting idea: a plane drops bombs on the right geometric form, and the child colors views. The parent wants to cover grades 1 to 3 of Jo-Jo geometry over time.

Not known: which parts of these pages the child finds hardest. The parent did not say. Adaptive difficulty and the progress page (sections 7 and 11) must show it.

## 2. Goals, non-goals and anti-goals

Goals:

- He can name and find the solids (Würfel, Quader, Zylinder, Kugel, Pyramide) and flat shapes (Kreis, Dreieck, Quadrat, Rechteck).
- He can go from a cube building to its building plan and back.
- He can tell what a building looks like from the front, top, left and right, including the side he cannot see.
- He wants to play another round. That counts more than the number of correct answers, the same as in math-tank and math-soccer.
- The parent controls levels, topics and difficulty, and views his progress.

Non-goals for the first version:

- A real 3D engine or a rotating camera. The game is 2D and draws the buildings in a fixed isometric view.
- The grade 2 and 3 topics listed under "later" in section 4.
- Multiplayer, accounts or a server.

Anti-goals (the game fails even if it works technically):

- Any punishing word, sound or loss of progress after a mistake. No "falsch", no "verloren".
- A way to get every answer by tapping through the choices without thinking.
- Violence. Bombs burst into stars, confetti or smoke. No fire, no rubble, no people.
- Rewards that make the math easier. Rewards are only looks.

## 3. Ground rules carried over from math-soccer and math-tank

The builder should read the [math-soccer spec](https://github.com/iddocohen/math-soccer/blob/main/specs/001-math-soccer/spec.md) and copy its behavior where this document says "as math-soccer".

- German interface. Optional spoken tasks ("Vorlesen").
- Target devices: Firefox and Chrome on a computer, and Safari on iPad. Phones are not a requirement.
- Help in steps, each step without penalty (section 9).
- Adaptive difficulty, on by default, never beyond the parent's limits.
- A progress page for the parent ("Fortschritt").
- Parent settings behind the gear icon, opened by holding it for 2 seconds. A short click does nothing, and no key opens it.
- Data stays in the browser. Backup by file download and by QR code or link, as math-soccer.
- Works offline after the first load (installable web app). No request leaves the site.
- No timer by default. An optional clock and personal bests, compared only with his own results.
- Stars and a shop for looks, as the math-tank garage and the math-soccer locker room.

One rule changes. In math-soccer he always answers by typing a number, and the goal cannot be tapped. Here he may click or tap the field, because most geometry answers are a choice or a colored square, not a number. The parent's rule: clicking is allowed where it makes sense and does not give him an easy way out. So:

- **Tapping is the answer:** he taps a solid to bomb it, taps a view to choose it, or taps a square to color it.
- **One bomb per pass:** after a miss the plane turns, the choices change places, and he answers again. He cannot tap every choice in one go.
- **No check per square:** he colors as many squares as he wants and then presses "Fertig". Only then are wrong squares marked.
- **A miss explains itself:** the wrong choice shows what it is, for example "Das ist der Zylinder." or the building plan of the building he hit.
- **Numbers stay typed:** stack heights and later counts (squares, perimeter) use the number keys or the on-screen number pad, as both games. On iPad the number pad setting is automatic, always or never, as math-soccer.
- **Keyboard only still works:** arrow keys move a marker, Space or Enter drops or colors, H opens help, Escape pauses.

## 4. Topics from grades 1 to 3

Source: the contents pages of the Jo-Jo Mathematik copy templates for [grade 1](https://www.cornelsen.de/_Resources/Persistent/9/a/7/6/9a76c85e9cdca4d9e65caa548d7774174245b2ad/Jo-Jo%20Mathe_1_KV.pdf), [grade 2](https://www.cornelsen.de/_Resources/Persistent/3/e/7/9/3e79e59b44dc4a42b8fb1858e2501b251bd6a80e/Jo-Jo%20Mathe_2_KV.pdf) and [grade 3](https://www.cornelsen.de/_Resources/Persistent/0/3/7/b/037ba1e794cf4463dce2fa9daf3c90fc580bc938/Jo-Jo%20Mathe_3_KV-1.pdf). The workbook pages themselves were not available, so the exact tasks per grade are not known beyond these chapter names and the two pages the parent shared.

| Grade | Jo-Jo chapter | In the game | When |
|---|---|---|---|
| 1 | Würfel, Quader, Zylinder und Kugel | "Triff den Zylinder!" (Treffer) | First release |
| 1 | Quadrat, Rechteck, Dreieck, Kreis | "Triff den Kreis!" (Treffer) | First release |
| 2 | Ansichten | Coloring views (Malen) and choosing views | First release |
| 2 | Würfelgebäude | Matching plans (Treffer) and writing plans (Bauen) | First release |
| 1, 2 | Bild und Spiegelbild, Achsensymmetrie | Coloring the mirror half, with the runway as mirror line | Later |
| 2 | Muster und Ornamente, Flächen zeichnen | The plane's colored smoke continues a pattern on the grid | Later |
| 3 | Würfelnetze und Quadernetze | A dropped box unfolds. Which net is it? | Later |
| 3 | Umfang und Flächeninhalt | A crop-dusting plane sprays a field. How many squares, how long is the fence? | Later |

"Later" topics come as amendments after playtesting, the way math-soccer grew through 23 amendments. The first release must not block them:

- The field is a square grid seen from above.
- Levels, settings and saved progress are lists that new topics can join.

## 5. The scene

A throwaway [prototype](../../../prototype/index.html) shows the look and both modes. It is not code to build on. Copy it to `specs/001-math-plane/prototype/` as the visual reference, as math-soccer did.

- 2D. Sky and clouds at the top, a grass field below.
- Solids, flat shapes and cube buildings stand on the field in an isometric view: the front of a building is its lower-left face, and its right side is its lower-right face. This matches the drawings in the workbook.
- Flat shapes lie on the field and are drawn straight from above, so a square looks like a square.
- A small red cartoon plane with a pilot crosses the top of the screen from left to right, bobbing gently. It is drawn in code, so Hangar looks fit it (section 11).
- Every building and every building plan shows which side is "vorn".

## 6. Game modes

The start screen has two big buttons, "Treffer" and "Bauen und Malen". Keys 1 and 2 start them.

### 6.1 Treffer (bombs)

- The banner states the task. He taps the target, or moves the marker with the arrow keys and presses Enter.
- The plane starts a pass from the left and drops one bomb that lands on the chosen target.
- **Hit:** the target bursts into stars and confetti, "Treffer!", one star. A new task follows.
- **Miss:** a soft puff of smoke, a soft sound, and a line that names what he hit. The choices change places and the plane comes round again.
- **Bomb bay:** a round has 10 bombs by default (parent setting). Only bombs get used up. There are no hearts. The end screen says, for example, "8 Treffer mit 10 Bomben", and shows his best.

Task types, chosen by the current level:

- **Körper finden:** 4 solids from Würfel, Quader, Zylinder, Kugel, Pyramide, in different colors. "Triff den Zylinder!"
- **Formen finden:** Kreis, Dreieck, Quadrat, Rechteck on the ground. "Triff das Dreieck!"
- **Bauplan finden:** a building plan on a card, and 3 cube buildings on the field. "Triff das Gebäude zu diesem Bauplan!" The wrong buildings are close variants: mirrored, turned, or one stack changed. After a miss, a second card "Getroffen" shows the plan of the building he hit, so he can compare.
- **Ansicht finden:** a building on the field and 3 view cards. "Welche Ansicht siehst du von rechts?" He bombs the right card. From level 5 the buildings include cylinders and spheres, whose views contain circles (see 6.2).

### 6.2 Bauen und Malen (crates and colored smoke)

A round has 5 tasks by default (parent setting). No bombs and no hearts, because he gets as many tries as he needs. The tasks alternate:

- **Bauen (complete the building plan):**
  - A card shows the finished building ("So soll es aussehen").
  - He fills in the building plan square by square, typing 0 to 4.
  - For each number, crates drop on parachutes and build the stack on the field. Typing a smaller number removes crates with a puff.
  - "Fertig" checks the plan. Wrong towers are marked on the plan and on the field.
- **Malen (draw a view):**
  - A cube building stands on the field.
  - An eye with "Hier stehst du" shows where he stands: vorn, rechts, links (the hidden back-left side), or "Hier fliegst du" for oben.
  - He colors squares of a grid. The grid shows "unten" under side views and "vorn" under the top view.
  - "Fertig" checks it, and wrong squares are marked. When the view is right, the plane flies off trailing smoke in the building's color.
- **Male an (color the outlines):** this matches exercise 1 of the views page. The outlines of a view are drawn on the grid, including circles for cylinders and spheres. He taps a color from the building's colors, then taps each outline to fill it. "Fertig" checks it (design call, from the worksheet).

Buildings used in Bauen and Malen are generated so that every stack can be counted in the drawing. For example, a stack is never fully hidden behind a taller one. A view in Malen is never all filled or all empty.

Buildings with cylinders and spheres (design call after the builder check). They look like the workbook drawings, but stay on the grid so the same renderer and view logic can be used:

- A building is a few pieces placed on the grid: boxes of whole grid units (for example 1×1×2 or 2×1×1), standing cylinders with a 1×1 or 2×2 footprint, and spheres with a diameter of 1 or 2 units, resting on the ground or on a box.
- Each piece has its own color, as in the workbook.
- A piece's view is its outline on the grid: a box is a rectangle, a standing cylinder is a rectangle from the side and a circle from above, a sphere is a circle from every side.
- These buildings appear only in "Ansicht finden" and "Male an". "Bauen" and "Malen" keep pure cube buildings, because a building plan counts cubes and a colored square cannot draw a circle.

## 7. Levels and adaptive difficulty

Each mode has its own ladder of levels and its own current level, so both start buttons always have tasks (design call after the builder check).

"Treffer":

| Level | Name | Content |
|---|---|---|
| 1 | Körper | Körper finden |
| 2 | Formen | Formen finden |
| 3 | Baupläne finden | Bauplan finden, 2×2 plans, stacks of 1 to 3 |
| 4 | Ansichten vorn und oben | Ansicht finden, cube buildings, views from the front and the top |
| 5 | Alle Seiten | Ansicht finden, all four sides, buildings with cylinders and spheres |

"Bauen und Malen":

| Level | Name | Content |
|---|---|---|
| 1 | Kleine Baupläne | Bauen, 2×2 plans, stacks of 1 to 3 |
| 2 | Große Baupläne | Bauen, 3×3 plans, stacks of 0 to 3 |
| 3 | Vorn und oben | Malen, views from the front and the top |
| 4 | Rechts und links | Malen, all four sides |
| 5 | Male an | Male an, all four sides, buildings with cylinders and spheres, mixed with Malen |

- A level offers its own content plus the content of the levels below it, so earlier skills keep coming back now and then.
- Adaptive difficulty as math-soccer: up one level after 3 tasks in a row solved alone, down one when 2 of the last 3 were not solved alone (section 8 says what counts as alone). A new level shows a short line such as "Neue Stufe: Große Baupläne!". A level going down shows nothing.
- Never below the parent's starting level or above the hardest level, set per mode.
- Each mode keeps its current level between rounds.

## 8. Help

As math-soccer, help gets more explicit step by step and never costs anything. H or the yellow "?" button.

1. A hint in words, for example "Der Zylinder ist rund wie eine Dose. Oben hat er einen Kreis." or "Geh in Gedanken nach rechts. Vorn ist jetzt links von dir."
2. A pointer: the right target blinks, one wrong square of the plan shows its number, or the view appears faintly in the grid.
3. The answer is shown, and he places it himself.

What counts (design call after the builder check, so guessing never looks like mastery):

- **Solved alone:** right on the first try (first bomb, or first "Fertig") with no help step used.
- **Solved with help:** any miss, any wrong "Fertig", or any help step before the right answer. This is what adaptive difficulty and the progress page use.
- **After 2 misses on the same task,** help step 1 opens by itself. After each further miss, the next step opens. This stops ruling out the choices one pass at a time from being the fastest way through.
- A miss never costs stars already earned, and in Treffer it only uses a bomb.

"Punkt nach voller Hilfe" as math-soccer: the parent decides whether a task solved with full help still earns a star.

## 9. Rounds and end screen

- "Treffer": 10 bombs per round by default.
- "Bauen und Malen": 5 tasks per round by default.
- The end screen shows hits or finished tasks, an encouraging line and his personal best. Never "verloren". "Nochmal" or Enter starts a new round.
- Pause with Escape or the pause button, and the "Zum Start" button asks first, as math-soccer.

## 10. Rewards: the Hangar

As the math-tank garage and the math-soccer locker room:

- Stars: 1 per hit in Treffer, 3 per finished Bauen, Malen or Male an task. A task solved after full help follows the "Punkt nach voller Hilfe" setting.
- In the "Hangar" he spends stars on looks:
  - plane color
  - a picture on the tail
  - smoke color
  - bomb style, for example confetti or a water balloon
  - the pilot's hat
- He never loses stars. The parent can turn the Hangar off.

## 11. Progress tracking

Per mode, per level and per task type, the progress page shows how many tasks he solved alone and how many with help. For views it also shows each side (vorn, oben, rechts, links), because the hidden side may be the hardest. A task type counts as mastered after repeated solves without help.

## 12. Parent settings

Groups and defaults (German labels as the other games where they exist):

- **Stufen:** per mode, "Stufe am Anfang" (1) and "Schwerste Stufe" (5), and "Passt sich dem Kind an" (on).
- **Themen:** each task type on or off (all on).
- **Gebäude:** largest plan (3×3), highest stack (3), sides used (all four), cylinders and spheres in buildings (on).
- **Runde:** bombs per round (10, range 5 to 20), tasks per round (5, range 3 to 10).
- **Ton:** "Geräusche", "Vorlesen" (off).
- **Bedienung:** "Zahlenfeld" (automatic), "Uhr zeigen" (off), "Rekorde zeigen" (on), "Punkt nach voller Hilfe" (on).
- **Hangar:** "Hangar und Sterne" (on).
- **Daten:** "Daten sichern", "Daten laden", "QR-Code", as math-soccer.

## 13. Assets

All files are bundled. Each license is checked on the asset's own page before use, and the README lists every asset with its author, license and source link, as [math-soccer amendment 03](https://github.com/iddocohen/math-soccer/blob/main/specs/001-math-soccer/amendment-03-free-assets.md).

- **Reuse from math-soccer:** the Fredoka font (OFL), the Kenney particle images (stars, sparks, smoke) and the coin and fanfare sounds. Their licenses were already checked for math-soccer.
- **Drawn in code:** the plane, solids, flat shapes, cube buildings, crates and parachutes, the field and the sky. The buildings must be drawn in code because the game generates them from building plans.
- **New CC0 sounds** to find: propeller hum, falling bomb whistle, soft hit pop, crate landing. Every sound has a sound made in code as fallback, as math-soccer.
- Candidate plane art, not checked yet: Kenney ["Tappy Plane"](https://kenney.nl/assets/tappy-plane) (side view) and ["Pixel Shmup"](https://kenney.nl/assets/pixel-shmup) (top view). Only used if they fit the code-drawn style and the Hangar looks.

## 14. Approaches considered

- **A. Copy math-soccer's setup and code, then run auto speckit.** Same tools, and shared parts are copied, as math-soccer did from math-tank. Shared code then exists in three copies. **Chosen by the parent.**
- **B. Move the shared parts into a package used by all three games.** One fix reaches every game, but it changes math-tank and math-soccer first, and an autonomous run should not touch games the child already plays.
- **C. Plain canvas like the prototype, without Phaser and React.** Smallest code, but it moves away from the other games, and the settings, progress and transfer screens would be rebuilt instead of copied.

## 15. How it gets made

Decided:

- Same stack as math-soccer: Vite, TypeScript, React for menus and settings, Phaser 4 for the game scene, Zod for versioned settings, Vitest and Playwright for tests, pnpm, vite-plugin-pwa for offline play.
- Settings stored as math-soccer: one versioned settings object in the browser, checked with Zod, with migrations between versions.
- Copy from math-soccer and adapt, rather than rewrite: parent gate, settings page structure, progress page, number pad, round end screen, data backup and QR transfer, sound switches with fallback sounds, locker room (as the Hangar).
- Repository `~/dev/private/math-plane`, published by a GitHub Action on every push to `main`, built with `--base=/math-plane/`, as math-soccer's `pages.yml`. The GitHub repository `iddocohen/math-plane` does not exist yet (checked 2026-11-14). The parent allowed the build to create it as a public repository with `gh`, push to it, and turn on GitHub Pages with the GitHub Action as source, so the game is playable at `https://iddocohen.github.io/math-plane/` when the run finishes.
- spec-kit set up as in math-soccer, with the Claude integration and the `opsmill`, `critique` and `checkpoint` extensions. `.specify/` and `.claude/` are in `.gitignore`.
- spec-kit produces `specs/001-math-plane/spec.md` from this document.

Left to the builder:

- Code structure, and how much is copied from math-soccer versus written new.
- Exact drawing of the plane, solids and effects, guided by the prototype.
- The exact pieces, sizes and colors of the buildings with cylinders and spheres, within the rules in section 6.2.
- Star prices and the list of Hangar items.
- The order of task types inside a level.
