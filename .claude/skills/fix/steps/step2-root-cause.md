# Step 2: Root-Cause + Minimal-Patch Plan

Subagent (`subagent_type: "architect"` — needs cross-file reasoning). Prompt carries the boilerplate
from `_shared/token-rules.md` (CLAUDE.md is auto-loaded — no paste) and names the output file
`<out>/root-cause.md`.

1. Read `<out>/bug-report.md` + `<out>/anchor-map.md`.
2. Trace data flow from input → defect.
3. Identify **single root cause**. If multiple, list + rank.
4. Propose **minimal patch**. No refactor. No unrelated cleanup (`_shared/team-rules.md` §S1, §S2).
5. Reuse-first check (`CLAUDE.md` §Reuse): existing guard/helper/hook already covers this?
   Per-customer / per-role / flag concern → must route via `CLAUDE.md` §Customization (§S7).
6. Blast radius: list every caller of changed symbol.

## root-cause.md format
```markdown
## Root cause
<one paragraph — what is wrong + why>

File: <path:L>
Symbol: <function/component>

## Why not surface fix
<why patching the symptom site is wrong — race, multiple callers, etc>

## Reuse + Pattern audit
| Need | Existing target (file:L) | Decision | Pattern (if new) | Justify |
|------|--------------------------|----------|------------------|---------|
| <e.g. role gate on payslip export> | <route from CLAUDE.md §Customization or local precedent> | Reused / Extended / Replaced / New | <sanctioned pattern or —> | <empty if Reused/Extended same shape> |

## Minimal patch plan
| File | Line | Change | Reuse target (file:L) |
|------|------|--------|-----------------------|

## Blast radius
- Callers of <symbol>: <count> — list file:L
- Tests touching <symbol>: <list>

## Regression test
- File: <existing test file> or NEW <path>
- Case: <what to assert — must FAIL on current code, PASS after patch>

## Scope tag
BACKEND | FRONTEND | BOTH
```

## Reuse + Pattern audit rules

Table shape, decision values, the sanctioned pattern set and the customization rules all live in
`.claude/skills/_shared/reuse-audit.md`. Read it; do not restate it here. The `/fix` deltas are in its
"Per-pipeline deltas" section.

## APPROVAL GATE (per router protocol)
```
Root cause for <ID>:
- Cause: <one line>
- Scope: <tag>
- Files touched: <count>
- Regression test: <new|extend>
- Blast radius: <N callers>

Saved: <out>/root-cause.md

Approve patch plan?
```
Then `AskUserQuestion`. HARD STOP until answered.
