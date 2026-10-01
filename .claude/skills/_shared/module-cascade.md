# Module cascade — build, test, fix and gate one business module at a time

Single source of truth for how an implementation pipeline executes its phases. Used by `/implement`
Step 4 and by `/fix` Step 4 when a patch spans 2+ modules.
Never restate it in a step file — point here.

**Why:** building every module and testing once at the end lets a wrong contract in the first module
leak into every later one, and the failure surfaces only in Step 6, far from its cause. The cascade
proves each module before the next one consumes it, and hands the next module what was *actually*
built, not what was planned.

## 1. Module order (written at Step 2, in `implementation-plan.md`)

A **module** is a business module listed in `.claude/rules/modules/README.md` (e.g. employees,
payroll, leave). A project still being bootstrapped defines its modules in Step 2 and adds one
`rules/modules/<module>.md` per module when the cascade finishes it. Its **children** are the
sub-areas the ticket touches inside it (a route, a service, a page, a hook). Cross-cutting
prerequisites — migrations, shared types, feature-flag keys, i18n keys, project scaffolding — form
`M0-shared` when present.

```markdown
## Module order
| # | Module | Children | BE phases | FE phases | Depends on | Consumes | Exit criteria (AC) |
|---|--------|----------|-----------|-----------|------------|----------|--------------------|
| M0 | shared | migration, feature-flag key | P1 | P1 | — | — | AC-3 (flag default) |
| M1 | employees | employees.service create, EmployeeForm | P1-P3 | P1-P2 | M0 | flag key | AC-1, AC-2 |
| M2 | payroll | payslip builder | P1-P2 | — | M1 | `getEmployee()` signature | AC-4 |
```

- Order is dependency order: a module that produces a contract (endpoint, DTO, exported function,
  table column) comes before the modules that consume it.
- Every acceptance criterion lands in exactly one module's `Exit criteria`. A criterion that only a
  cross-module flow can prove goes to the **last** module it touches.
- Step 2 skipped (lightweight route) → Step 3 writes the `Module order` table at the top of the
  first phase doc instead. The cascade never runs without one.
- One module touched → a one-row table. The cascade still runs; it is one module with one gate.

## 2. Phase docs (Step 3) — grouped by module

Phase docs keep their files (`NNNa_backend_phases.md`, `NNNb_frontend_phases.md`) but group phases
under a module heading, numbered per module:

```markdown
# M1 — employees
Exit criteria: AC-1, AC-2
Consumes: M0 flag key `showMarkup`

## M1.P1 — <goal title>
...
```

## 3. The loop (Step 4) — one module at a time, in `Module order`

Never two modules in parallel. Within a module: backend, then frontend (the FE consumes the BE
contract of the same module). Dispatch with the Agent tool — each module ends in a user gate, so a
Workflow run cannot span modules.

For each module `Mi`:

**a. Read handoffs.** Main lists `<output-folder>/module-handoff/M*.md` for every approved module and
passes the paths to the agent. The agent reads them before coding.
- Real code differs from the plan on a **contract** (signature, endpoint, field name, type) → the
  handoff wins. The agent adapts its phase steps to the real contract and returns the delta in
  `deviations`.
- Real code differs on **behaviour** (the rule itself, what the user sees) → the agent does not
  adapt. It returns `blocked` and main stops for the user.

**b. Develop.** Dispatch the `Mi` BE phases to the backend agent, then the `Mi` FE phases to the
frontend agent. Prompt template: the pipeline's Step 4 file, with `Phases: <path> § Mi` and
`Handoffs: <paths>`. Result JSON = the pipeline's schema plus:

```json
{
  "module": "M1-employees",
  "contracts": [{ "kind": "function|endpoint|dto|column|hook|component", "name": "", "at": "file:L", "shape": "" }],
  "deviations": [{ "planned": "", "actual": "", "why": "" }]
}
```

**c. Test.** Main runs the fast gate and the targeted tests from `_shared/verify-commands.md`,
scoped to this module's files only:

```bash
git diff --name-only HEAD; git ls-files --others --exclude-standard
```

The WIP checkpoint (step h) keeps `HEAD` at the previous approved module, so this list is exactly
`Mi`'s change. One test file at a time, under the lock.

**d. Fix.** Bounded per `_shared/verify-commands.md` → "Failure handling": 2 rounds, each scoped to
that round's errors. Still failing after round 2, or error count not dropping → **STOP**. Report;
the next module does not start.

**e. Prove the module in the app.** Run this module's `Exit criteria` rows of the coverage matrix
with the Step 6 driver (`/api-verify` for API-only, `/e2e` for web or both). Rules owned by
`implement/steps/step6-validate-app.md` §6.1–6.3: expectations from the ticket and refinement only,
a control row per criterion. Append the scenario to `qa/e2e.mjs` — the file grows module by module
and Step 6 re-runs it whole.
- A row that cannot run yet (its UI lands in a later module, the stack cannot reach it) → mark
  `DEFERRED → M<k>: <reason>`. Never a silent skip. Pure type/migration module → `NOT
  APP-VERIFIABLE — <reason>`.
- A mismatch → fix, re-run the failing rows plus their control row. Two failed rounds on the same
  row → STOP, the plan is wrong, return to Step 2.

**f. Write the handoff** — main writes `<output-folder>/module-handoff/M<i>-<module>.md` from the
agent JSON and the gate results:

```markdown
# M1 — employees — PENDING
Checkpoint: —
Files: <list>
Contracts produced: | kind | name | at | shape |
Deviations from plan: | planned | actual | why |
Gate: tsc 0 · eslint clean · tests <n> pass (<files>) · fix rounds <n>
App proof: | AC | row | verdict | evidence |
Deferred: | AC | to | reason |
Reopened: <earlier modules touched by this one, or none>
```

**g. MODULE GATE — HARD STOP.**

```
Module M<i>/<N> — <module> — <ID>

Built: <files, count>   Contracts: <names>
Deviations: <none | list>
Tests: tsc 0 · eslint clean · <n> spec files pass · fix rounds <n>
App proof: <n> rows PASS · <n> DEFERRED → M<k> · controls held
Reopened: <none | M<j>: files, regression re-run result>
Next: M<i+1> — <module> (consumes: <contracts>)
```

`AskUserQuestion`: Approve — checkpoint and continue to M<i+1> / Request changes — re-run M<i> only /
Stop the pipeline. Never start `M<i+1>` in the same turn as the gate.

**h. Checkpoint — only after Approve.** Commit this module locally, no push, then set the handoff header to `APPROVED <date>` and `Checkpoint: <short sha>`:

```bash
git add <Mi files> && git commit -m "wip(<ID>): M1 employees"
```

No attribution trailer. Never push — outward-facing actions keep their own ship-word. The PR is
squash-merged, so WIP commits never reach `main` as separate commits. On "Request changes" the
module stays uncommitted and is re-run in place.

## 4. Reopening an approved module

`Mi` needs a change in an approved `Mj` (`j < i`) → do it inside `Mi`, then:

1. Re-run `Mj`'s covering tests and `Mj`'s proven app rows (regression) alongside `Mi`'s.
2. Record it under `Reopened:` in `Mi`'s handoff and in the `Mi` gate summary.
3. A **behaviour** change to `Mj` is not a reopen — it is a plan change. STOP, return to Step 2.

## 5. After the last module

The pipeline's integration steps run over the whole branch (`main...HEAD` + uncommitted):
- Targeted verification gate across every module's files (`implement/steps/step5-verify-gate.md`).
- Full app validation (`implement/steps/step6-validate-app.md`): the whole `qa/e2e.mjs`, every
  `DEFERRED` row, and one row per cross-module flow in `Module order` (`Depends on` edges).

## 6. Resume after context summarization

State lives on disk: the last handoff marked `APPROVED` is the last passed gate, and `git log` shows
its checkpoint. Re-read this file and the current step file, then restate: "M1..M<k> approved,
resuming M<k+1>".
