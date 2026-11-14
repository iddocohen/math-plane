# Critique Report: Mathe-Flieger

**Date**: 2026-11-14
**Feature**: [spec.md](../spec.md)
**Plan**: [plan.md](../plan.md)
**Verdict**: ⚠️ PROCEED WITH UPDATES

---

## Executive Summary

The spec follows the PRD closely and keeps the anti-goals testable (one bomb per pass, no per-square checks, auto-help, "solved alone" only on a clean first try). The plan reuses math-soccer's proven layering and copies the prototype's coordinates, which removes most design risk. Four items must be fixed before tasks: the readability rule taken from the prototype does not guarantee that every stack can be seen, "Bauplan finden" can produce plans with fewer than 2 distinct variants, the wrong-answer marks rely on color alone, and plan squares cannot be selected by touch in the contract. The rest are recommendations.

---

## Product Lens Findings

### Problem Validation
| ID | Severity | Finding | Suggestion |
|----|----------|---------|------------|
| P1 | 💡 | The PRD says which parts are hardest is not known; the progress page is the only way to learn it, and its per-side table covers view tasks only. | Keep as is; also show per-side counts for "Ansicht finden" separately from "Malen" so the parent can tell choosing from drawing. Already covered by keys `mode:kind:side`. |

### User Value Assessment
| ID | Severity | Finding | Suggestion |
|----|----------|---------|------------|
| P2 | 🎯 | "Bauplan finden" needs 2 wrong buildings that differ from the plan and from each other. A plan with all equal stacks (for example all 2) is unchanged by mirror and turn, so only stack changes remain; at the limits (stacks 1 to 3) there may be too few. | Spec FR-018 and research R5: the generator rejects plans that yield fewer than 2 distinct variants, and rejects plans with every stack equal. |
| P3 | 💡 | "Formen finden" with Quadrat and Rechteck side by side: a rectangle close to square makes the task unfair. | Research: the rectangle's sides differ by at least a factor 1.6; triangles and circles vary in size and turn. |

### Alternative Approaches
| ID | Severity | Finding | Suggestion |
|----|----------|---------|------------|
| P4 | 💡 | Copying math-soccer means three copies of shared code (PRD 14 accepts this). | No change; keep origin header comments so later merges are possible. |

### Edge Cases & UX
| ID | Severity | Finding | Suggestion |
|----|----------|---------|------------|
| P5 | 🎯 | Wrong towers, squares and outlines are "marked in warm orange". Color alone fails for a child who cannot tell the colors apart, and in "Male an" the region itself is colored. math-soccer critique P6 required marks that differ by shape. | Spec FR-021 to FR-023 and the screens contract: a mark is a thick dashed outline plus a small "?" badge, not only a color. |
| P6 | 🎯 | The screens contract lets the child select plan squares only with arrow keys; on iPad without a keyboard there is no way to choose which square the number pad types into. | Contract: tapping a plan square (on the plan card or on the field tile) selects it; the selected square has a thick yellow frame. |
| P7 | 💡 | iPad portrait: the 1600×1000 world scaled into portrait makes the grid small. | Plan risk already notes it; add a layout test in the ipad-portrait project that the paint grid squares are at least 44 CSS px. |

### Success Measurement
| ID | Severity | Finding | Suggestion |
|----|----------|---------|------------|
| P8 | 💡 | SC-001 and SC-002 rely on the parent's observation and the progress page; fine for a family game. | No change. |

---

## Engineering Lens Findings

### Architecture Soundness
| ID | Severity | Finding | Suggestion |
|----|----------|---------|------------|
| E1 | 🎯 | Research R4 takes the prototype rule `h[r][c] >= h[r+1][c+1]`. It does not cover a stack hidden by its two front neighbors: plan `[[1,3],[3,1]]` passes the rule, but in the isometric drawing the back stack of 1 is fully covered by the two stacks of 3 (screen x ranges −2s..0 and 0..2s cover −s..s, and both rise above it). FR-024 is then broken. | R4: replace the rule with a geometric check in `isReadable`: project every stack's top face, sample 5 points (center and 4 inner corners), and require at least 3 of them not covered by any box nearer to the viewer; keep the prototype rule as a fast pre-filter. Unit test with `[[1,3],[3,1]]` rejected. |
| E2 | 💡 | `RoundController` will grow like math-soccer's 1415-line `MatchController`. | Split per mode: a shared controller for phases, help, outcome and stars, with `TrefferRules` and `BauenMalenRules` objects for the mode-specific steps. |

### Failure Mode Analysis
| ID | Severity | Finding | Suggestion |
|----|----------|---------|------------|
| E3 | 💡 | `landBomb()` is called by the view; if the tab is hidden during a pass, Phaser pauses tweens and the round could hang in `pass`. | Controller sets a fallback timer from `now()` and lands the bomb itself if the view has not called back within pass time + 1 s; pause stops that timer. |
| E4 | 💡 | Mixed-building generation by templates could loop on narrow parent limits (for example sides limited to `oben`). | Same rule as R4: bounded tries, then a built-in list per template. |

### Security & Privacy
| ID | Severity | Finding | Suggestion |
|----|----------|---------|------------|
| E5 | 💡 | Imported files and `#save=` links are untrusted input. | Already handled by the copied Zod validation; keep math-soccer's transfer tests. |

### Performance & Scalability
| ID | Severity | Finding | Suggestion |
|----|----------|---------|------------|
| E6 | 💡 | Redrawing isometric buildings every frame with Phaser Graphics on iPad. | Draw a building into a cached texture and redraw only when crates change, as math-soccer cached the board (its critique E4). |

### Testing Strategy
| ID | Severity | Finding | Suggestion |
|----|----------|---------|------------|
| E7 | 💡 | Generator guarantees (exactly one right choice, readable, never all filled) are statistical. | Property tests over 500 seeds per task kind and level in `src/core/tasks/generate.test.ts`. |

### Operational Readiness
| ID | Severity | Finding | Suggestion |
|----|----------|---------|------------|
| E8 | 💡 | Publishing depends on `gh` auth and network. | Plan already records a blocker if `gh` is not logged in. No change. |

### Dependencies & Integration
| ID | Severity | Finding | Suggestion |
|----|----------|---------|------------|
| E9 | 💡 | Pinned versions copied from math-soccer's lockfile range. | Copy `pnpm-lock.yaml` too, then `pnpm install`, so versions match a known-good set. |

---

## Cross-Lens Insights

| ID | Finding | Suggestion |
|----|---------|------------|
| X1 | E1 and FR-024 together: an unreadable building makes a right answer look wrong to the child, which is the strongest frustration trigger. | Fix E1 before tasks; it is the only correctness gap in the geometry. |

## Findings Summary

| ID | Lens | Severity | Category | Finding | Suggestion |
|----|------|----------|----------|---------|------------|
| P2 | Product | 🎯 | User value | Too few distinct plan variants possible | Reject uniform plans and plans with fewer than 2 variants |
| P5 | Product | 🎯 | UX | Marks by color only | Dashed outline plus "?" badge |
| P6 | Product | 🎯 | UX | No touch selection of plan squares | Tap a plan square or field tile to select |
| E1 | Engineering | 🎯 | Architecture | Readability rule misses stacks hidden by two neighbors | Geometric top-face visibility check |
| P1 | Product | 💡 | Problem | Hardest part unknown | Keep per-kind per-side keys |
| P3 | Product | 💡 | Value | Rectangle close to square | Aspect at least 1.6 |
| P7 | Product | 💡 | UX | Portrait grid size | Layout test, 44 px squares |
| E2 | Engineering | 💡 | Architecture | Large controller | Per-mode rules objects |
| E3 | Engineering | 💡 | Failure | Hang in `pass` when hidden | Fallback landing timer |
| E4 | Engineering | 💡 | Failure | Mixed generation under narrow limits | Bounded tries plus list |
| E6 | Engineering | 💡 | Performance | Per-frame redraw | Cache building textures |
| E7 | Engineering | 💡 | Testing | Statistical guarantees | 500-seed property tests |
| E9 | Engineering | 💡 | Dependencies | Version drift | Copy the lockfile |

## Resolution (autonomous run)

All four 🎯 items and recommendations P3, P7, E2, E3, E4, E6, E7 and E9 were applied to spec.md, research.md, plan.md and contracts/screens.md in the same run. P1, P4, P8, E5 and E8 needed no change.
