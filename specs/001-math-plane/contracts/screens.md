# Contract: screens, keys and test hooks

World size 1600 by 1000, scaled to fit, as math-soccer. Sky y 0 to 380 with clouds; the plane flies at y 90 to 150, left to right, bobbing ±8. Grass field y 380 to 1000. Banner (task line) at the top of the overlay. "Treffer" slots: 3 or 4 target slots on the field, y 640 to 760: 4 slots evenly spaced at x 300 to 1300, 3 slots (buildings, view cards) at x 560 to 1300, so the plan card or the building asked about stands on the left. Card positions: plan card and "Getroffen" card on the left (x 40 to 420), view cards on the field slots; in "Ansicht finden" the building asked about stands on the left with the eye at the side asked. "Bauen und Malen": the building on the field centered at (560, 640); the plan or paint grid on the right (x 960 to 1500); the "So soll es aussehen" card on the left.

## Screens

| Screen | Built with | Opens from | Content and keys |
|---|---|---|---|
| Start | React | App load | Title "Mathe-Flieger"; two big buttons "Treffer" (`data-start="treffer"`, key 1) and "Bauen und Malen" (`data-start="bauenMalen"`, key 2), each showing its current level name; "Hangar" button (key K) and star total when the Hangar is on; gear (hold 2 s); fullscreen; a reset or save notice (`data-testid="start-notice-reset"`, `data-testid="start-notice-save"`) as math-soccer. A mode whose every allowed task kind is off shows a short note and does not start (`data-mode-state="empty"`). |
| Round | Phaser + React overlay | A start button | Scene; overlay with the banner (`data-testid="banner"`), the message line (`data-testid="message"`), the bomb bay ("Treffer", `data-testid="bombs"`) or task counter ("Aufgabe 2 von 5"), the clock when on, the yellow "?" help button, "Fertig" (`data-testid="done"`, "Bauen und Malen"), pause, home ("Zum Start"), fullscreen, gear, Hangar icon; the number pad by setting while a "Bauen" task is shown; the color row (`data-testid="palette"`) for "Male an". `data-testid="round"` carries `data-mode`, `data-phase`, `data-kind`, `data-level`, `data-side`, `data-help`, `data-misses`, `data-bombs-left`, `data-hits`, `data-tasks-done`, `data-answer` (test only, see below), `data-slots`, `data-marked`, `data-number-pad`. |
| Pause | React overlay | Escape, pause button; home button asks "Runde beenden?" | `data-testid="pause-screen"` with `data-kind` `pause` or `quit`; "Weiter" (Enter, Space, Escape), "Zum Start" (no key). As math-soccer. |
| Round end | React overlay | Last bomb landed or last task finished | "8 Treffer mit 10 Bomben" or "5 Aufgaben geschafft", an encouraging line, "Neuer Rekord!" or "Dein Rekord: 9" (when "Rekorde zeigen" is on), stars earned; "Nochmal" (Enter, Space), "Zurück". |
| Parent gate | React | Gear held 2 s | Menu "Einstellungen", "Fortschritt". No key opens it. |
| Settings | React | Parent menu | Groups Stufen, Themen, Gebäude, Runde, Ton, Bedienung, Hangar, Daten (FR-051); version and build date; "Kopie wiederherstellen" when a readable kept copy exists. |
| Progress | React | Parent menu | Per mode: current level; table per level and task kind (alone, with help, "gemeistert"); table per side for view tasks; personal bests; "Fortschritt zurücksetzen", "Alles zurücksetzen" with confirmation. |
| Hangar | React | "Hangar" or K on the start screen; the Hangar icon during a round (pauses it) | Preview plane on a sky strip; groups Farbe, Heckbild, Rauch, Bomben, Mütze; locked items show "noch N Sterne"; Escape or "Zurück". `data-testid="hangar"`, items `data-testid="item-<id>"` with `data-owned`, `data-chosen`. |
| Transfer dialog | React | Link with `#save=` | As math-soccer. |

## Keys during a round

- Arrow keys move the marker: over target slots ("Treffer"), plan squares ("Bauen"), grid squares ("Malen"), outlines and then the color row ("Male an"; Tab switches between outlines and colors).
- Enter or Space: drop a bomb on the marked target; color or uncolor the marked square; fill the marked outline with the chosen color.
- Tap a plan square on the plan card or its tile on the field: select it (thick yellow frame).
- Digits 0 to 4: type the marked plan square's height ("Bauen"); the marker then moves to the next square. Backspace clears the marked square.
- F: "Fertig". H: help. Escape: pause.

## Feedback contract

| Event | Scene | Sound | Message |
|---|---|---|---|
| Hit | bomb lands, target bursts into stars and confetti (or the chosen bomb style) | soft hit pop, fanfare-like chime | "Treffer!" |
| Miss | soft puff of smoke on the hit target; the plane turns; choices change places | soft low pop | "Das ist die Kugel." / "Das ist die Ansicht von links." / "Getroffen" card shows the plan |
| Crate added | crate falls on a parachute and lands on the stack | crate landing | none |
| Crate removed | puff | soft puff | none |
| Right "Fertig" | confetti; plane flies off trailing smoke in the building's color | cheer | "Super gebaut!" / "Genau so sieht es von rechts aus!" / "Schön angemalt!" |
| Wrong "Fertig" | wrong towers, squares or outlines marked with a thick dashed warm-orange outline and a "?" badge | soft sound | "Fast! Schau dir die markierten Stellen an." |
| Level up | as a right answer | as a right answer | "Neue Stufe: Große Baupläne!" |
| Help step | pointer or faint answer | none | the hint sentence (step 1) |

No message uses "falsch" or "verloren" (FR-041).

## Test hooks

- `?seed=N`: round seed.
- `?speed=N`: play time runs N times as fast (as math-soccer); `window.mathPlaneSpeed` changes it while running.
- `?start=treffer|bauenMalen`: what Enter starts on the start screen.
- `data-answer` on the round element is filled only when `?test=1` is present, so specs can pick the right or a wrong choice. Without it, the attribute is empty.
- Settings seeded into `localStorage` before load (`seedStorage` fixture), as math-soccer.
- `<html data-version>` as math-soccer.
