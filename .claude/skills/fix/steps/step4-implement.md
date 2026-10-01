# Step 4: Implementation (Post-Approval)

Dispatch single specialist subagent per scope (fixes are small — no parallel split):
- BE only → 1 `backend` agent
- FE only → 1 `frontend` agent
- BOTH → BE sequential, then FE

**Patch spans 2+ business modules** (`.claude/rules/modules/README.md`) → do not dispatch it in one
go. Group the patch phases by module and run `.claude/skills/_shared/module-cascade.md` §3: one module
at a time, test → fix → prove → handoff → gate, the regression test landing in the module that owns
the root cause. One module → the single dispatch below, unchanged.

## Subagent prompt template
```
<ID> <BE|FE> fix. Phases P1-P<N>.

Root cause: <one line from root-cause.md>
Patch plan: <out>/root-cause.md
Phases: <out>/NNN*_patch.md
Anchor map: <out>/anchor-map.md

Rules:
<paste the boilerplate block from `_shared/token-rules.md` → "Subagent prompt boilerplate", unchanged>
- Minimal diff. No unrelated edits. No refactor (`_shared/team-rules.md` §S1, §S2).
- Regression test MUST fail on pre-patch code (run once before patching to confirm) — then pass after.
- Follow the pattern named in the Step 2 audit. New pattern need → `.claude/design-patterns/PATTERN_PLAYBOOK.md` (layer + trigger).

Verify after all phases: the fast gate in `.claude/skills/_shared/verify-commands.md`, plus the
regression test file via stack profile §Targeted tests under `flock <testLock>` — one test process at
a time machine-wide (`_shared/verify-commands.md`).

Return result as JSON matching this shape (no prose around it):
{
  "phases_done": "P1-P<N>",
  "files_modified": <int>,
  "regression_prepatch_fail": <bool>,
  "regression_postpatch_pass": <bool>,
  "tsc_new_errors": <int>,
  "eslint_clean": <bool>,
  "blocked": ["<item>", ...] or []
}
```

`tsc_new_errors` / `eslint_clean` = the typecheck and lint halves of the stack profile §Fast gate,
whatever tools the profile names.

## Main context verification

After the subagent returns, main runs the **fast gate** from
`.claude/skills/_shared/verify-commands.md` plus the regression test file (stack profile §Targeted
tests, under the lock). Nothing else. Do not restate the commands here.

Report (include `blocked` array from agent JSON). Errors → dispatch ONE targeted fix agent scoped to
THIS round's filtered errors only. Still failing after a 2nd round, or error count not dropping
(oscillation) → STOP: likely **wrong root cause → return to Step 2** (AskUserQuestion). Do NOT keep
dispatching fix agents past 2 rounds.

When this step is clean, continue to `steps/step5-verify-and-pr.md`.
