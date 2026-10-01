# Step 5: Verify in the running app, then PR

## 5.0 Changed-file gate

Step 4 proved the patch files and the regression test. Before the app run, run the full changed-file
gate from `.claude/skills/_shared/verify-commands.md` over the whole branch: its §Changed files list,
the §Fast gate on every file in it, and §Targeted tests for every covering test file — one file at a
time, under the lock. No full-repo lint, build or suite. Failures follow its "Failure handling"
(2 rounds, then STOP → Step 2).

## 5.1 Verify — mandatory for anything user-visible

Tests passing is not "it works". Pick the driver by scope tag:

| Scope | Driver |
|---|---|
| UI-visible | `/e2e` — reuse a flow from its flow library, write `<out>/qa/e2e.mjs`, run it `local`. Evidence lands in `<out>/results-local.json` plus one screenshot per case, and `/qa-report` re-runs the same file against the deployed build. |
| API-only | `/api-verify` — it owns the auth recipe (stack profile §Auth). Or an integration test. |
| Stack not up | `/run-app` — it owns launch + health (stack profile §Run locally, `environments.local`). |
| Pure migration / infra / type-only | `NOT APP-VERIFIABLE — <reason>`, stated in the report. Never a silent skip. |

Keep a coverage matrix either way — shape owned by `.claude/skills/bug-bundle/SKILL.md` →
`## Phase 3`. Every criterion needs a control row. On a mismatch, re-run the **failing rows plus their
control row**, not the whole matrix; two failed rounds on the same row means the root cause is wrong →
return to Step 2. Write the matrix and verdicts to `<out>/e2e-results.md`.

`<out>/qa/e2e.mjs` is a deliverable, not scratch — it is the handoff to `/qa-report`.

## 5.2 PR — only on the ship-word

User says "ship" / "create PR" / "push" → invoke `/create-pr` (team-rules §D2: that word is the explicit
OK; never push without it). It reads `<out>/pr-shape.md` (written at Step 0) for the template choice.
The changed-file gate already ran in 5.0; `/create-pr` re-runs only the stack profile §Fast gate as a
last check before pushing — it never runs a full lint, build or test suite, so 5.0 is not optional.

PR title: `fix(<ID>): <one-line cause>` (team-rules §C1). Body per §C2, carrying symptom, root cause,
patch summary, and whether a regression test was added plus its path. No attribution (§D3). A bug-fix
PR merges on green CI plus the user's go-ahead — no Tech Lead approval (§C3a).

## 5.3 Self-improvement

If the root cause reveals a recurring class of mistake, append it to `.claude/tasks/lessons.md`. Three
or more similar bugs → propose a rule for `CLAUDE.md` (§Reuse or §Customization).
