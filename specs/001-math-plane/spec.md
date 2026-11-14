# Feature Specification: Mathe-Flieger, a browser game for learning solids, flat shapes and views

**Feature Branch**: `main` (spec directory `001-math-plane`)

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Build the game described in docs/superpowers/specs/2026-11-14-math-plane-design.md. That document is the approved source PRD: copy it verbatim to the feature folder as source-prd.md, as math-soccer did, and treat it as the user's input. Use /Users/iddo/dev/private/math-soccer as the reference project for everything the PRD marks "as math-soccer", and the prototype in prototype/index.html as the visual reference." The design document is stored verbatim in [source-prd.md](./source-prd.md). The visual reference is stored in [prototype/index.html](./prototype/index.html).

## Overview

A child in grade 2 (about 7 to 8 years old, with low frustration tolerance) plays a 2D plane game in the browser. The child already plays the sibling games math-tank (Mathe-Panzer) and math-soccer (Mathe-Kicker). This game trains the geometry chapters of the child's workbook, Jo-Jo Mathematik (Cornelsen):

- naming and finding solids (Würfel, Quader, Zylinder, Kugel, Pyramide) and flat shapes (Kreis, Dreieck, Quadrat, Rechteck)
- going from a cube building to its building plan ("Bauplan") and back
- telling what a building looks like from the front, top, left and right, including the side the child cannot see

A small red cartoon plane crosses the sky above a grass field. In mode "Treffer" the child picks a target on the field and the plane drops one bomb on it; a hit bursts into stars and confetti. In mode "Bauen und Malen" the child completes building plans, colors views on a grid and fills outlines with color, with as many tries as needed. The game never punishes a mistake.

A parent sets levels, topics, building sizes, round length and sounds behind a gate that a child does not open by accident, and views the child's progress per mode, level, task type and side. Where this spec says "as math-soccer", the behavior of the math-soccer specification (`~/dev/private/math-soccer/specs/001-math-soccer/spec.md` and its amendments) applies, adapted from soccer to planes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bomb the right solid or flat shape in "Treffer" (Priority: P1)

The child presses "Treffer" (or key 1). Four solids stand on the field in different colors, and the banner says "Triff den Zylinder!". The child taps the cylinder, or moves the marker with the arrow keys and presses Enter. The plane starts a pass from the left and drops one bomb that lands on the chosen solid. On a hit, the cylinder bursts into stars and confetti, "Treffer!" appears and the child earns one star. On a miss, a soft puff of smoke appears with a soft sound and the line "Das ist die Kugel.", the solids change places, and the plane comes round again. When the 10 bombs are used up, the end screen says, for example, "8 Treffer mit 10 Bomben" and shows the child's best.

**Why this priority**: This is the smallest playable game. It covers the grade 1 chapters on solids and flat shapes, and it introduces the plane, the bomb rule and the end screen that all other task types use.

**Independent Test**: With default settings, start "Treffer" with the keyboard only, play a full round of 10 bombs on level 1, and confirm that every bomb lands on the chosen target, that a hit shows stars and confetti and a new task, that a miss names the solid hit and moves the choices, and that the end screen and "Nochmal" work.

**Acceptance Scenarios**:

1. **Given** the start screen, **When** the child presses 1 or taps "Treffer", **Then** within 3 seconds the field shows 4 solids in different colors, the banner names one of them ("Triff den Zylinder!"), and the plane flies across the top of the screen.
2. **Given** the task "Triff den Zylinder!", **When** the child taps the cylinder, **Then** the plane makes a pass, drops one bomb that lands on the cylinder, the cylinder bursts into stars and confetti, "Treffer!" appears, the star total goes up by 1, the bomb counter goes down by 1, and a new task follows.
3. **Given** the task "Triff den Zylinder!", **When** the child taps the sphere, **Then** the bomb lands on the sphere with a soft puff of smoke and a soft sound, the line "Das ist die Kugel." appears, the bomb counter goes down by 1, the solids change places, and the same task stays.
4. **Given** a bomb is falling, **When** the child taps another target, **Then** no second bomb drops during that pass.
5. **Given** level 2 is reached, **When** a "Formen finden" task appears, **Then** flat shapes lie on the field drawn straight from above (a square looks like a square), and the banner says, for example, "Triff das Dreieck!".
6. **Given** the last bomb of the round has landed, **When** its effect ends, **Then** the end screen shows the hits and bombs ("8 Treffer mit 10 Bomben"), an encouraging line and the personal best, and never the word "verloren".
7. **Given** the end screen, **When** the child presses Enter or taps "Nochmal", **Then** a new round starts without a page reload.

---

### User Story 2 - Find building plans and views in "Treffer" (Priority: P1)

On higher "Treffer" levels, the child matches buildings and their plans and picks views. In "Bauplan finden", a card shows a building plan and 3 cube buildings stand on the field: "Triff das Gebäude zu diesem Bauplan!". The wrong buildings are close variants of the right one. After a miss, a second card "Getroffen" shows the plan of the building the child hit. In "Ansicht finden", one building stands on the field and 3 view cards lie beside it: "Welche Ansicht siehst du von rechts?". From level 5, buildings include cylinders and spheres, whose views contain circles.

**Why this priority**: This is the core of the grade 2 pages the parent shared ("Würfelgebäude" and "Ansichten von Körpern") in the bomb mode.

**Independent Test**: Set "Treffer" to start at level 3, play a round, and confirm that each plan card matches exactly one building on the field, that the wrong buildings differ from the right one only by a mirror, a turn or one stack, and that a miss shows the "Getroffen" card. Then start at level 5 and confirm that view tasks ask about all four sides and that some buildings contain cylinders or spheres.

**Acceptance Scenarios**:

1. **Given** a "Bauplan finden" task, **When** it appears, **Then** a card shows a 2×2 building plan with stacks of 1 to 3 and a "vorn" mark, and 3 cube buildings stand on the field, each with a "vorn" mark, and exactly one of them matches the plan.
2. **Given** a "Bauplan finden" task, **When** the child bombs a wrong building, **Then** a second card "Getroffen" appears beside the plan card and shows the building plan of the building that was hit.
3. **Given** a "Bauplan finden" task, **When** the wrong buildings are generated, **Then** each one is the right building mirrored, turned, or with one stack changed, and none of them also matches the plan or another wrong building. Plans with every stack equal are never used for this task.
4. **Given** an "Ansicht finden" task on level 4, **When** it appears, **Then** one cube building stands on the field and 3 view cards lie on the field, the banner asks for the view from the front ("vorn") or from the top ("oben"), and exactly one card is that view.
5. **Given** an "Ansicht finden" task on level 5, **When** it appears, **Then** the side asked can be vorn, oben, rechts or links, and the building may contain cylinders and spheres whose views show circles.
6. **Given** an "Ansicht finden" task, **When** the child bombs a wrong card, **Then** a line names which side the bombed card shows (for example "Das ist die Ansicht von links."), the cards change places, and the task stays.

---

### User Story 3 - Complete building plans in "Bauen" (Priority: P1)

The child presses "Bauen und Malen" (or key 2). A card shows the finished building ("So soll es aussehen"). The child fills in the building plan square by square, typing 0 to 4. For each number, crates drop on parachutes and build the stack on the field; typing a smaller number removes crates with a puff. The child presses "Fertig". If the plan is right, the task is finished and the child earns 3 stars. If not, the wrong towers are marked on the plan and on the field, and the child corrects them.

**Why this priority**: Writing a plan is the second half of the "Würfelgebäude" page, and it is the first content of the "Bauen und Malen" mode.

**Independent Test**: Start "Bauen und Malen" on level 1, complete a plan with one wrong stack, press "Fertig", confirm that only that tower is marked on the plan and on the field, correct it, press "Fertig" again and confirm the task finishes with 3 stars.

**Acceptance Scenarios**:

1. **Given** the start screen, **When** the child presses 2 or taps "Bauen und Malen", **Then** a round of 5 tasks starts and a "Bauen" task shows a card "So soll es aussehen" with the target building and an empty building plan with a "vorn" mark.
2. **Given** a plan square is selected, **When** the child types 3, **Then** 3 crates drop on parachutes onto that square of the field and form a stack of 3.
3. **Given** a stack of 3 on a square, **When** the child types 1 on that square, **Then** 2 crates are removed with a puff and a stack of 1 remains.
4. **Given** a plan with one wrong stack, **When** the child presses "Fertig", **Then** that square is marked on the plan and its tower is marked on the field, no other square is marked, and the child can correct it.
5. **Given** a right plan, **When** the child presses "Fertig", **Then** the task is finished, the child earns 3 stars (or follows "Punkt nach voller Hilfe" when full help was used), and the next task follows.
6. **Given** the child types a digit above 4 or a non-digit key, **When** a square is selected, **Then** the plan does not change.

---

### User Story 4 - Draw views in "Malen" and color outlines in "Male an" (Priority: P1)

A cube building stands on the field. An eye with "Hier stehst du" shows where the child stands: vorn, rechts, links (the hidden back-left side), or "Hier fliegst du" for oben. The child colors squares of a grid that shows "unten" under side views and "vorn" under the top view, then presses "Fertig". Wrong squares are marked. When the view is right, the plane flies off trailing smoke in the building's color. On level 5, "Male an" tasks appear: the outlines of a view are drawn on the grid, including circles for cylinders and spheres. The child taps a color from the building's colors and then taps each outline to fill it, then presses "Fertig".

**Why this priority**: This is the "Ansichten von Körpern" page ("Zeichne die Ansichten" and "Male an"), and the part the parent expects may be hardest.

**Independent Test**: Start "Bauen und Malen" on level 4, color a view from the right with one extra square, press "Fertig", confirm only that square is marked, fix it, and confirm the plane trails colored smoke. Start on level 5 and complete a "Male an" task with one outline in the wrong color, and confirm only that outline is marked.

**Acceptance Scenarios**:

1. **Given** a "Malen" task with the side "rechts", **When** it appears, **Then** the eye with "Hier stehst du" stands at the building's right side, and the grid shows "unten" under it.
2. **Given** a "Malen" task with the side "oben", **When** it appears, **Then** the marker says "Hier fliegst du" above the building, and the grid shows "vorn" under it.
3. **Given** a "Malen" grid, **When** the child taps squares or moves the marker and presses Space, **Then** each square toggles between colored and empty, and nothing is checked until "Fertig".
4. **Given** a view with one extra colored square and one missing square, **When** the child presses "Fertig", **Then** exactly those 2 squares are marked and the child can correct them.
5. **Given** a right view, **When** the child presses "Fertig", **Then** the plane flies off trailing smoke in the building's color, and the child earns 3 stars.
6. **Given** a "Male an" task, **When** it appears, **Then** the grid shows the outlines of one view of a building made of boxes, cylinders and spheres, and a row of the building's colors to choose from.
7. **Given** a "Male an" task, **When** the child taps a color and then an outline, **Then** that outline fills with the color, and the child can change it before "Fertig".
8. **Given** a "Male an" task with one outline in a wrong color or empty, **When** the child presses "Fertig", **Then** only that outline is marked.

---

### User Story 5 - Get help in steps (Priority: P1)

When the child is stuck, help gets more explicit step by step, as math-soccer. Help never costs anything. It opens with H or the yellow "?" button, and after 2 misses on the same task it opens by itself.

**Why this priority**: Without help in steps, a child with low frustration tolerance stops playing, and in "Treffer" the child could rule out choices one pass at a time instead of thinking.

**Independent Test**: In any task type, press H three times and confirm that step 1 shows a hint in words, step 2 shows a pointer, step 3 shows the answer that the child then places, and that no star or bomb is taken away. Then miss twice on one "Treffer" task and confirm help step 1 opens by itself.

**Acceptance Scenarios**:

1. **Given** a task, **When** the child presses H once, **Then** help step 1 shows a hint in words, for example "Der Zylinder ist rund wie eine Dose. Oben hat er einen Kreis." or "Geh in Gedanken nach rechts. Vorn ist jetzt links von dir."
2. **Given** help step 1 is showing, **When** the child presses H again, **Then** help step 2 shows a pointer: the right target blinks, one wrong square of the plan shows its number, or the view appears faintly in the grid.
3. **Given** help step 2 is showing, **When** the child presses H again, **Then** help step 3 shows the answer, and the child places it (bombs it, types it or colors it).
4. **Given** a "Treffer" task, **When** the child misses twice on it, **Then** help step 1 opens by itself, and each further miss opens the next step.
5. **Given** help was used, **When** the task is solved, **Then** no star, bomb or progress was taken away, and the task is recorded as solved with help.

---

### User Story 6 - Set up the game and view progress as a parent (Priority: P1)

The parent opens settings by holding the gear icon for 2 seconds, as math-soccer. The parent sets per mode the starting level and the hardest level, adaptive difficulty, which task types are on, building sizes, round length, sounds, input, the Hangar, and backs up data. The progress page shows, per mode, level and task type, how many tasks the child solved alone and with help, and for views each side.

**Why this priority**: The parent controls levels, topics and difficulty and wants to see which parts are hardest. The PRD states that this is not known yet.

**Independent Test**: Hold the gear for 2 seconds, set "Treffer" to start at level 3, turn off "Formen finden", play a round, and confirm the tasks follow the settings. Open the progress page and confirm counts per mode, level, task type and side.

**Acceptance Scenarios**:

1. **Given** any screen, **When** the parent taps the gear briefly or presses any key, **Then** settings do not open. **When** the parent holds the gear for 2 seconds, **Then** settings open and the game pauses.
2. **Given** settings are open, **When** the parent sets "Stufe am Anfang" for "Treffer" to 3, **Then** the next "Treffer" round starts at level 3, and adaptive difficulty never goes below 3.
3. **Given** the parent set "Schwerste Stufe" for "Bauen und Malen" to 2, **When** the child solves many tasks alone, **Then** the level never goes above 2.
4. **Given** the parent changed settings, **When** the browser is closed and opened again, **Then** the settings are kept.
5. **Given** the progress page, **When** the parent opens it, **Then** it shows per mode, level and task type how many tasks were solved alone and with help, which task types are mastered, and for view tasks the counts per side (vorn, oben, rechts, links).
6. **Given** the settings page, **When** the parent uses "Daten sichern", "Daten laden" or the QR code, **Then** settings, progress, bests and Hangar data move to a file or another browser, as math-soccer.

---

### User Story 7 - Earn stars and change the plane in the Hangar (Priority: P3)

The child earns stars: 1 per hit in "Treffer" and 3 per finished "Bauen", "Malen" or "Male an" task. In the "Hangar" the child spends stars on looks: plane color, a picture on the tail, smoke color, bomb style and the pilot's hat. Looks never change the math.

**Why this priority**: Rewards keep the child coming back, but the game is playable and useful without them.

**Independent Test**: Earn stars in a round, open the Hangar, buy a plane color and a bomb style, and confirm the new looks appear in the next round and that stars never go down after a mistake.

**Acceptance Scenarios**:

1. **Given** the child hit a target, **When** the hit is shown, **Then** the star total goes up by 1 and never goes down for a miss.
2. **Given** the child has enough stars, **When** the child buys a plane color in the Hangar and chooses it, **Then** the plane has that color at once and in the next round.
3. **Given** a bomb style "Wasserbombe" is chosen, **When** a bomb lands, **Then** it bursts as a water balloon and the hit or miss rules are unchanged.
4. **Given** the parent turned "Hangar und Sterne" off, **When** the child plays, **Then** the Hangar and the star total are hidden.

---

### Edge Cases

- **Tapping during a pass**: while a bomb is falling or the plane is turning, taps and Enter are ignored; one bomb per pass.
- **Tapping the field outside any target**: no bomb is dropped and no bomb is used.
- **Last bomb is a miss**: the round ends after its effect; the end screen still shows the hits and the best, with an encouraging line.
- **A task type turned off that a level needs**: the level offers the remaining task types of that level and the levels below. If the parent turns off every task type that a mode's level range can offer, the start button of that mode shows a short note for the parent and does not start a round.
- **"Stufe am Anfang" above "Schwerste Stufe"**: the settings page does not allow it; changing one moves the other to stay in order.
- **Building generation**: generated buildings never hide a stack fully behind a taller one in "Bauen" and "Malen", and a "Malen" view is never all filled or all empty. If generation cannot meet these rules within a fixed number of tries, a building from a small built-in list that meets them is used.
- **Two buildings with the same plan in "Bauplan finden"**: never offered; a variant that matches the plan is replaced.
- **Two view cards that look the same in "Ansicht finden"**: never offered; every card differs from the right view.
- **A view that is the same from two sides** (for example a symmetric building): the task accepts any card or coloring that equals the asked view.
- **"Bauen" stack heights above the parent's highest stack**: the plan accepts 0 to 4 as typed input, but generated target buildings never exceed the parent's highest stack (default 3).
- **Browser refresh during a round**: the round continues, as math-soccer.
- **Stored data damaged or from an older version**: settings, progress and Hangar data are migrated or reset with a short message, as math-soccer.
- **Sound blocked by the browser until the first interaction**: sound starts after the first key press or tap.
- **Speech not available in the browser**: "Vorlesen" does nothing and the game plays normally.
- **iPad portrait and landscape**: the field, cards and grid fit the screen in both orientations without scrolling during play.

## Requirements *(mandatory)*

### Functional Requirements

**Scene and plane**

- **FR-001**: The game MUST show a 2D scene: sky and clouds at the top and a grass field below. The look MUST follow the [prototype](./prototype/index.html).
- **FR-002**: Solids and cube buildings MUST stand on the field in a fixed isometric view: the front of a building is its lower-left face and its right side is its lower-right face, as in the workbook drawings. There MUST be no 3D engine and no rotating camera.
- **FR-003**: Flat shapes MUST lie on the field drawn straight from above, so a square looks like a square.
- **FR-004**: A small red cartoon plane with a pilot MUST cross the top of the screen from left to right, bobbing gently. It MUST be drawn in code so that Hangar looks can change it.
- **FR-005**: Every building and every building plan MUST show which side is "vorn".
- **FR-006**: The field MUST be a square grid seen from above, so that later topics (mirror halves, patterns, nets, perimeter and area) can use it.

**Answer input and the tapping rules**

- **FR-007**: The child MUST be able to answer by tapping or clicking the field: tapping a solid, shape, building or view card to bomb it, and tapping a grid square or outline to color it.
- **FR-008**: In "Treffer" the plane MUST drop exactly one bomb per pass. After a miss, the plane MUST turn, the choices MUST change places, and the child answers again. Taps during a pass MUST be ignored.
- **FR-009**: In "Malen" and "Male an" the game MUST NOT check single squares or outlines while the child colors. Wrong squares or outlines MUST be marked only after "Fertig".
- **FR-010**: A miss MUST explain itself: the wrong choice is named ("Das ist der Zylinder."), or for "Bauplan finden" the plan of the building hit is shown on a "Getroffen" card.
- **FR-011**: Stack heights MUST be typed with the number keys or the on-screen number pad. The number pad setting MUST be automatic, always or never, as math-soccer (automatic shows it without a fine pointer or on a screen narrower than 1100 CSS px).
- **FR-012**: The whole game MUST be playable with the keyboard only: arrow keys move a marker, Space or Enter drops a bomb or colors a square, H opens help, Escape pauses, Backspace clears a typed digit, and keys 1 and 2 start "Treffer" and "Bauen und Malen" on the start screen.

**Mode "Treffer"**

- **FR-013**: The start screen MUST show two big buttons, "Treffer" and "Bauen und Malen".
- **FR-014**: The banner MUST state the task. A hit MUST burst the target into stars and confetti, show "Treffer!", give one star and start a new task. A miss MUST show a soft puff of smoke, play a soft sound and show a line that names what was hit.
- **FR-015**: A "Treffer" round MUST have a bomb bay of 10 bombs by default (parent setting, 5 to 20). Only bombs MUST be used up; there MUST be no hearts. The round ends when the last bomb has landed.
- **FR-016**: "Körper finden" MUST show 4 solids chosen from Würfel, Quader, Zylinder, Kugel and Pyramide, in different colors, with exactly one matching the task.
- **FR-017**: "Formen finden" MUST show flat shapes chosen from Kreis, Dreieck, Quadrat and Rechteck, with exactly one matching the task.
- **FR-018**: "Bauplan finden" MUST show a plan card and 3 cube buildings. The wrong buildings MUST be close variants of the right one (mirrored, turned, or one stack changed) and MUST NOT match the plan or each other. A plan MUST be used only when it yields at least 2 such variants. After a miss, a "Getroffen" card MUST show the plan of the building hit.
- **FR-019**: "Ansicht finden" MUST show one building and 3 view cards and ask for the view from one side ("Welche Ansicht siehst du von rechts?"). Exactly one card MUST equal the asked view. From level 5, buildings MUST include cylinders and spheres.

**Mode "Bauen und Malen"**

- **FR-020**: A "Bauen und Malen" round MUST have 5 tasks by default (parent setting, 3 to 10), with no bombs and no hearts and unlimited tries per task. Task types MUST alternate within the round when the level offers more than one.
- **FR-021**: "Bauen" MUST show a card "So soll es aussehen" with the finished building, and an empty building plan that the child fills square by square with 0 to 4. Each typed number MUST drop crates on parachutes to build that stack on the field; a smaller number MUST remove crates with a puff. "Fertig" MUST check the plan and mark wrong towers on the plan and on the field.
- **FR-022**: "Malen" MUST show a cube building, an eye with "Hier stehst du" at the side asked (vorn, rechts, links) or "Hier fliegst du" for oben, and an empty grid with "unten" under side views and "vorn" under the top view. "Fertig" MUST check the view and mark wrong squares. A right view MUST make the plane fly off trailing smoke in the building's color.
- **FR-023**: "Male an" MUST draw the outlines of one view on the grid, including circles for cylinders and spheres, and offer the building's colors. The child MUST tap a color and then tap outlines to fill them. "Fertig" MUST check every outline and mark wrong or empty ones.
- **FR-024**: Buildings in "Bauen" and "Malen" MUST be generated so that every stack can be counted in the drawing: no stack is hidden behind taller stacks in front of it, alone or together, and most of every stack's top face is visible. A "Malen" view MUST never be all filled or all empty.
- **FR-024a**: Marks after a wrong "Fertig" (towers, squares, outlines) and the selected plan square MUST differ by shape as well as color: a mark is a thick dashed outline with a small "?" badge, and the selected square has a thick yellow frame (critique P5).
- **FR-024b**: In "Bauen" the child MUST be able to select a plan square by tapping it on the plan or its tile on the field, so the number pad works without a keyboard (critique P6).
- **FR-024c**: In "Formen finden" a Rechteck MUST have sides that differ by at least a factor 1.6, so it is never mistaken for a Quadrat (critique P3).

**Buildings with cylinders and spheres**

- **FR-025**: A building with mixed pieces MUST be a few pieces placed on the grid: boxes of whole grid units (for example 1×1×2 or 2×1×1), standing cylinders with a 1×1 or 2×2 footprint, and spheres with a diameter of 1 or 2 units resting on the ground or on a box. Each piece MUST have its own color.
- **FR-026**: A piece's view MUST be its outline on the grid: a box is a rectangle, a standing cylinder is a rectangle from the side and a circle from above, a sphere is a circle from every side.
- **FR-027**: Buildings with cylinders and spheres MUST appear only in "Ansicht finden" and "Male an". "Bauen" and "Malen" MUST use pure cube buildings.

**Levels and adaptive difficulty**

- **FR-028**: Each mode MUST have its own ladder of 5 levels and its own current level:
  - "Treffer": 1 Körper (Körper finden); 2 Formen (Formen finden); 3 Baupläne finden (Bauplan finden, 2×2 plans, stacks of 1 to 3); 4 Ansichten vorn und oben (Ansicht finden, cube buildings, front and top views); 5 Alle Seiten (Ansicht finden, all four sides, buildings with cylinders and spheres).
  - "Bauen und Malen": 1 Kleine Baupläne (Bauen, 2×2 plans, stacks of 1 to 3); 2 Große Baupläne (Bauen, 3×3 plans, stacks of 0 to 3); 3 Vorn und oben (Malen, front and top views); 4 Rechts und links (Malen, all four sides); 5 Male an (Male an, all four sides, buildings with cylinders and spheres, mixed with Malen).
- **FR-029**: A level MUST offer its own content plus the content of the levels below it, so earlier skills come back now and then. Most tasks (at least half) MUST come from the current level.
- **FR-030**: Adaptive difficulty MUST be on by default and MUST work per mode, as math-soccer: up one level after 3 tasks in a row solved alone, down one level when 2 of the last 3 tasks were not solved alone. Going up MUST show a short line such as "Neue Stufe: Große Baupläne!". Going down MUST show nothing.
- **FR-031**: The level MUST never go below the parent's "Stufe am Anfang" or above the parent's "Schwerste Stufe" for that mode. Each mode MUST keep its current level between rounds and sessions.
- **FR-032**: Parent building limits ("Gebäude") MUST cap the content of every level: largest plan, highest stack, sides used, and whether cylinders and spheres appear. When a limit removes a level's distinctive content (for example sides limited to vorn and oben on "Rechts und links"), the level MUST offer the closest content within the limits.

**Help and what counts**

- **FR-033**: Help MUST come in three steps, opened with H or the yellow "?" button, as math-soccer: (1) a hint in words; (2) a pointer (the right target blinks, one wrong square of the plan shows its number, or the view appears faintly in the grid); (3) the answer is shown and the child places it. Help MUST never cost stars, bombs or progress.
- **FR-034**: After 2 misses or wrong "Fertig" presses on the same task, help step 1 MUST open by itself, and each further miss MUST open the next step.
- **FR-035**: A task MUST count as **solved alone** only if it is right on the first try (first bomb or first "Fertig") with no help step used. Any miss, any wrong "Fertig" or any help step before the right answer MUST count as **solved with help**. Adaptive difficulty and the progress page MUST use this.
- **FR-036**: The parent setting "Punkt nach voller Hilfe" (on by default) MUST decide whether a task solved after help step 3 still earns stars, as math-soccer.

**Rounds and end screen**

- **FR-037**: The end screen MUST show hits ("8 Treffer mit 10 Bomben") or finished tasks, an encouraging line and the personal best for that mode. It MUST never show "verloren". "Nochmal" or Enter MUST start a new round without a page reload.
- **FR-038**: Pause MUST work with Escape or the pause button. "Zum Start" MUST ask before leaving the round, as math-soccer.
- **FR-039**: There MUST be no timer by default. The parent setting "Uhr zeigen" (off) MUST show a clock during play. Personal bests MUST compare only with the child's own results, and "Rekorde zeigen" (on) MUST show them.

**Words, sounds and the anti-goals**

- **FR-040**: All child-facing text MUST be German and short. Tasks MUST be readable aloud with the browser's speech when the parent turns "Vorlesen" on (off by default).
- **FR-041**: The game MUST NOT use the words "falsch" or "verloren", sad or punishing sounds, or any loss of stars or progress after a mistake.
- **FR-042**: Bombs MUST burst into stars, confetti, smoke or water. There MUST be no fire, no rubble and no people hit.
- **FR-043**: Sound effects MUST be switchable with "Geräusche". Every recorded sound MUST have a sound made in code as fallback, as math-soccer.

**Rewards: the Hangar**

- **FR-044**: The child MUST earn 1 star per hit in "Treffer" and 3 stars per finished "Bauen", "Malen" or "Male an" task. Stars MUST never be taken away.
- **FR-045**: The "Hangar" MUST let the child spend stars on looks: plane color, a picture on the tail, smoke color, bomb style (for example confetti or a water balloon) and the pilot's hat. Looks MUST NOT change the math, the difficulty or the number of bombs.
- **FR-046**: The Hangar MUST open from the start screen and during a round (the round pauses), as math-soccer's locker room. The parent MUST be able to turn "Hangar und Sterne" off, which hides the Hangar and the star total.

**Progress**

- **FR-047**: The game MUST record every task with: mode, level, task type, side asked (for view tasks), whether it was solved alone or with help, the highest help step used, the number of misses or wrong "Fertig" presses, and the time taken.
- **FR-048**: The progress page ("Fortschritt") MUST show, per mode, per level and per task type, how many tasks were solved alone and how many with help. For view tasks ("Ansicht finden", "Malen", "Male an") it MUST also show each side (vorn, oben, rechts, links).
- **FR-049**: A task type MUST count as mastered after repeated solves without help, with the same rule as math-soccer's mastery (at least 10 attempts and at least 8 of the last 10 solved alone).

**Parent settings and storage**

- **FR-050**: Settings and the progress page MUST open only after holding the gear icon for 2 seconds. A short click or any key MUST NOT open them, and opening them MUST pause the game.
- **FR-051**: The settings MUST cover these groups and defaults:
  - **Stufen**: per mode "Stufe am Anfang" (1) and "Schwerste Stufe" (5), and "Passt sich dem Kind an" (on).
  - **Themen**: each task type on or off (all on).
  - **Gebäude**: largest plan (3×3), highest stack (3), sides used (all four), cylinders and spheres in buildings (on).
  - **Runde**: bombs per round (10, range 5 to 20), tasks per round (5, range 3 to 10).
  - **Ton**: "Geräusche" (on), "Vorlesen" (off).
  - **Bedienung**: "Zahlenfeld" (automatic), "Uhr zeigen" (off), "Rekorde zeigen" (on), "Punkt nach voller Hilfe" (on).
  - **Hangar**: "Hangar und Sterne" (on).
  - **Daten**: "Daten sichern", "Daten laden", "QR-Code".
- **FR-052**: Settings, progress records, personal bests, current levels and Hangar data MUST be stored in the browser with a version number and checked on load, kept across sessions, and migrated or reset on load when old or damaged, as math-soccer.
- **FR-053**: Data backup MUST work as math-soccer: download and load a file ("Daten sichern", "Daten laden"), and move to another browser by QR code or link.
- **FR-054**: Saved settings MUST apply when the settings page closes, as math-soccer: settings that shape tasks apply from the next task, round length stays for the running round, display settings apply at once.
- **FR-055**: Levels, task types, settings and saved progress MUST be kept as lists that new topics can join, so the "later" topics of the PRD (mirror halves, patterns, nets, perimeter and area) can be added as amendments without migrating away existing data.

**Devices, offline, assets and publishing**

- **FR-056**: The game MUST run in current Firefox and Chrome on a computer and in Safari on iPad. Phones are not a target.
- **FR-057**: After the first load, the game MUST work offline and MUST be installable to the home screen. No request MAY leave the site.
- **FR-058**: Every bundled asset MUST have a free license checked on its own page before use, and the README MUST list every asset with author, license and source link, as math-soccer amendment 03. The Fredoka font, the Kenney particle images and the coin and fanfare sounds MAY be reused from math-soccer.
- **FR-059**: The plane, solids, flat shapes, cube buildings, crates, parachutes, the field and the sky MUST be drawn in code.
- **FR-060**: The game MUST be published to `https://iddocohen.github.io/math-plane/` on every push to `main`. The parent allowed the build to create the public GitHub repository `iddocohen/math-plane`, push to it and turn on GitHub Pages with the GitHub Action as source.

### Key Entities

- **Settings**: the parent's choices (FR-051), versioned and stored in the browser.
- **Mode**: "Treffer" or "Bauen und Malen", each with its own level ladder, current level and personal best.
- **Level**: number, German name, and the task types and building limits it offers.
- **Task type**: Körper finden, Formen finden, Bauplan finden, Ansicht finden, Bauen, Malen, Male an. New task types can join later.
- **Building**: a set of pieces on the grid with a "vorn" side. A cube building is described by its building plan; a mixed building also holds boxes, cylinders and spheres with colors.
- **Building plan**: a grid of stack heights seen from above, with a "vorn" side.
- **View**: what a building looks like from vorn, oben, rechts or links: a grid of filled squares for cube buildings, or a set of colored outlines (rectangles and circles) for mixed buildings.
- **Task**: one item to solve, with its type, level, target, choices (for "Treffer"), side asked, misses and help step.
- **Round**: mode, bombs left or tasks left, hits or finished tasks, current task, paused state.
- **Task record**: one entry per task for progress (FR-047).
- **Personal best**: most hits per round ("Treffer") and most tasks solved alone per round ("Bauen und Malen").
- **Hangar**: star balance, owned items, chosen plane color, tail picture, smoke color, bomb style and hat.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The child chooses to play another round in at least half of the sessions, as the parent observes (the main goal, as math-tank and math-soccer).
- **SC-002**: After two weeks of play, the share of tasks solved alone rises for at least one task type, as shown on the progress page.
- **SC-003**: A round can be started from the start screen and the first answer given within 10 seconds, with the keyboard only and with touch only.
- **SC-004**: In 100% of bomb drops, the bomb lands on the target the child chose.
- **SC-005**: In 100% of generated tasks, exactly one choice is right ("Treffer"), every stack is countable in the drawing ("Bauen", "Malen"), and no "Malen" view is all filled or all empty.
- **SC-006**: A child cannot finish a "Treffer" task by tapping every choice in one pass: at most one bomb drops per pass.
- **SC-007**: Animations run without visible stutter on an iPad and a typical laptop in Firefox and Chrome.
- **SC-008**: The game starts and plays a full round of each mode with the network turned off after the first load.
- **SC-009**: No child-facing screen uses a punishing word or sound, checked against FR-041 on every screen.
- **SC-010**: The game is playable at `https://iddocohen.github.io/math-plane/` when the build finishes.

## Assumptions

- The child is the same child who plays math-tank and math-soccer, and their ground rules apply where the PRD says so.
- The German title is "Mathe-Flieger", from the PRD title.
- The builder uses the same stack and project setup as math-soccer, as the PRD decides in section 15; this spec does not restate it.
- The mastery rule (10 attempts, 8 of the last 10 solved alone) is taken from math-soccer, because the PRD says only "after repeated solves without help".
- "Most tasks from the current level" is set to at least half; the PRD says only that earlier skills "keep coming back now and then".
- The personal best for "Bauen und Malen" counts tasks solved alone, because every round finishes all its tasks; the PRD does not say what the best is for this mode.
- Star prices, the list of Hangar items, the exact drawing, the pieces and colors of mixed buildings and the order of task types inside a level are left to the builder (PRD section 15).
- The exact Jo-Jo tasks per grade beyond the chapter names and the two shared pages are not known (PRD section 4).
- Which parts the child finds hardest is not known (PRD section 1); the progress page is meant to show it.
- The "later" topics in PRD section 4 are out of scope for this version.
