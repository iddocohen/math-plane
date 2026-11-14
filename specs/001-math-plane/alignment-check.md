# Spec/Ask Alignment Check: Mathe-Flieger

## Source

- [source-prd.md](./source-prd.md), a verbatim copy of `docs/superpowers/specs/2026-11-14-math-plane-design.md`, named by the user's request as the approved source PRD.
- The user's request: copy the PRD verbatim, use math-soccer as the reference for "as math-soccer", and use `prototype/index.html` as the visual reference.

## Verdict

⚠️ MINOR DRIFT (proceeding)

## Findings

| Severity | Category | PRD reference | Spec reference | Description |
|---|---|---|---|---|
| Minor | missing | Section 13, "New CC0 sounds to find" | FR-043 | The first spec required only fallback sounds made in code and did not ask for the new CC0 recordings. Fixed: FR-043 now asks for them, and task T073a looks for them and checks each license. |
| Minor | added | Section 3, tapping rules | FR-024a, FR-024b, FR-024c | Marks that differ by shape, touch selection of plan squares and a minimum rectangle aspect come from the critique. They make PRD rules work on iPad and for color-blind play; they do not change PRD behavior. |
| Minor | added | Section 12, "Themen" | Edge case "A task type turned off that a level needs" | The spec says what happens when the parent turns off every task type a mode can offer. The PRD does not say; this is a necessary clarification. |
| Minor | changed | Section 15, "one versioned settings object" | FR-052, research R11 | Settings, progress, bests and Hangar use separate versioned keys, as math-soccer's storage does. The PRD's "as math-soccer" takes precedence over the single-object wording. |

Every goal, non-goal, anti-goal, mode, task type, level table, help rule, round default, reward, progress view, parent setting and publishing step in the PRD has a matching requirement in spec.md (FR-001 to FR-060).

## Action

Proceed. The one missing item (CC0 sounds) was added to spec.md and tasks.md in this pass. No re-run of plan, critique or tasks is needed.
