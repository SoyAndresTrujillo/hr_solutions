# Progress tree — live step / sub-step checklist for every pipeline run

Single source of truth for the progress file of `/implement`, `/fix` and `/bug-bundle`. Never restate
it in a step file — point here.

**Why:** a pipeline run is long and mostly happens inside subagents. Without a live record the user
cannot tell which step or sub-step is running, which gates passed, or where a dead session stopped.
The tree answers all three at a glance, from any terminal, while the skill runs.

## 1. File

| Pipeline | Path |
|---|---|
| `/implement`, `/fix` | `<out>/progress.md` |
| `/bug-bundle` | `<docsDir>/<PARENT>/progress-<round>.md` — one tree for the whole bundle |

Like every doc it lives in the main checkout, never in the ticket worktree (`output-location.md`).
A `/fix` run started by `/bug-bundle` does **not** create its own `progress.md`. It updates its bug's
branch in the bundle tree.

Watch it live from another terminal:

```bash
while :; do clear; cat <path>/progress.md; sleep 5; done
```

## 2. Format

```
<ID> — /<skill> — started <YYYY-MM-DD HH:MM> — updated <YYYY-MM-DD HH:MM>
Now: <step.sub-step> — <what is running, e.g. "frontend agent on M2 FE phases">

[x] 0   Ingest + anchor map
    [x] 0.1 resolve input (HR-42, parent HR-40)
    [x] 0.2 ticket ingest → ticket.md — approved 10:02
...
```

The header line always carries full timestamps — `started YYYY-MM-DD HH:MM`, `updated YYYY-MM-DD HH:MM`,
never `updated now` — and gate items always `— approved HH:MM`. The tree is machine-read for cycle-time
metrics, so these stay parseable.

| Marker | Meaning |
|---|---|
| `[ ]` | pending |
| `[~]` | running now — exactly one leaf at a time, and it matches the `Now:` line |
| `[x]` | done. Gate items add `— approved HH:MM` |
| `[!]` | stopped or blocked — always followed by the reason, e.g. `[!] d. fix — round 2 still 3 type errors` |
| `[-]` | skipped — always followed by the reason, e.g. `[-] 2 Plan — lightweight route` |

Leaf annotations stay short: the artifact it wrote (`→ root-cause.md`), the agent running it
(`(backend agent)`), or the one-line result (`types 0 · lint clean · 4 test files pass`).

## 3. Update rules

1. **Create it first.** Right after `<out>` exists (Step 0 / Phase 1), write the full skeleton for the
   pipeline (§5) with every item `[ ]`. Nothing else runs before it.
2. **Before** a sub-step starts, or before any agent dispatch: mark it `[~]` and rewrite `Now:`.
3. **After** it ends: mark it `[x]` (or `[!]` / `[-]` with the reason) and update `updated`.
4. **Gates:** a gate item becomes `[x] … — approved HH:MM` only after the user's Approve in
   `AskUserQuestion`. "Request changes" → the step's items go back to `[ ]` with
   `(changes requested HH:MM: <what>)` on the step line. Never mark a gate approved in advance.
5. **Expand as the plan becomes known.** Children that depend on an approved artifact are added when
   it is approved: modules (Step 4) after the phases gate, bugs (Phase 2) after the scope gate, test
   files (Step 5) once the changed-file list exists.
6. **Main context only.** Subagents never read or write the tree. Main updates it around each
   dispatch from the agent's returned JSON.
7. **One Edit per transition.** Change the affected lines, not the whole file. The file stays small —
   no logs, no pasted output.

## 4. Resume — the tree is the record of approval

At Step 0, if the progress file already exists, read it **before** checking artifacts:

- Resume at the first item that is not `[x]` or `[-]`. Say: "Resuming <ID> at <item>; <n> gates
  approved."
- An artifact on disk whose gate item is **not** `approved` was never approved. Re-present that gate;
  do not skip past it.
- A `[~]` item means the session died mid-step. Re-run that sub-step from its start.
- After context summarization, re-read the tree first — it is the gate state the router asks to
  restate.

No progress file but artifacts exist (a run from before this rule) → ask the user which steps were
approved, then write the tree with that answer.

## 5. Skeletons

Copy the skeleton for the pipeline. Sub-step numbers follow the step files.

### `/implement`

```
[ ] 0   Ingest + anchor map
    [ ] 0.1 resolve input
    [ ] 0.2 ticket ingest → ticket.md — gate
    [ ] 0.3 Explore pre-pass → anchor-map.md
    [ ] 0.4 branch <ID> in worktree · ticket → statusFlow.started
    [ ] 0.5 complexity route (full | lightweight | /fix | bootstrap)
[ ] 0.6 Estimate
    [ ] estimate — gate
    [ ] ticket.mjs estimate
[ ] 1   Requirements → requirements-spec.md
    [ ] A draft (agent)
    [ ] B critic pass (agent)
    [ ] C refine
    [ ] gate
[ ] 2   Plan → implementation-plan.md
    [ ] architect plan + module order (agent)
    [ ] G0 check (→ g0-approved.md when triggered)
    [ ] gate
[ ] 3   Phases
    [ ] BE phase doc (agent)
    [ ] FE phase doc (agent)
    [ ] gate
[ ] 4   Module cascade          ← one child per module, added after the Step 3 gate
    [ ] M<i> <module>
        [ ] a. read handoffs
        [ ] b. develop BE (agent)
        [ ] b. develop FE (agent)
        [ ] c. test (fast gate + covering test files)
        [ ] d. fix (round 1/2)
        [ ] e. app proof (<n> rows)
        [ ] f. handoff → module-handoff/M<i>-<module>.md
        [ ] g. gate
        [ ] h. WIP checkpoint
[ ] 5   Integration gate
    [ ] fast gate BE / FE
    [ ] covering test files (one leaf per file)
[ ] 6   App validation
    [ ] 6.1 expectations
    [ ] 6.2 driver + stack up
    [ ] 6.3 matrix run (full qa/e2e.mjs + DEFERRED + cross-module rows)
    [ ] 6.4 evidence → e2e-results.md
    [ ] 6.5 verdict — STOP, ship-word
```

### `/fix`

```
[ ] 0   Ingest + anchor map
    [ ] 0.1 resolve input
    [ ] 0.2 PR shape → pr-shape.md
    [ ] 0.3 branch in worktree
    [ ] 0.4 ticket ingest → ticket.md — gate
    [ ] 0.5 ticket → statusFlow.started
    [ ] 0.6 Explore pre-pass → anchor-map.md
[ ] 1   Bug report → bug-report.md
    [ ] repro (agent)
    [ ] gate
[ ] 2   Root cause → root-cause.md
    [ ] architect root cause (agent)
    [ ] gate
[ ] 3   Patch phases
    [ ] patch doc(s) (agent)
    [ ] G0 check (→ g0-approved.md when triggered)
    [ ] gate
[ ] 4   Implement           ← 2+ modules: one child per module with the /implement Step 4 leaves
    [ ] test lock written (allow = regression spec)
    [ ] regression spec fails pre-patch
    [ ] patch BE (agent)
    [ ] patch FE (agent)
    [ ] regression spec passes post-patch
    [ ] fast gate
    [ ] fix (round 1/2)
    [ ] test lock removed
[ ] 5   Verify in app
    [ ] 5.0 changed-file gate
    [ ] 5.1 driver + stack up
    [ ] 5.1 matrix run (+ control rows)
    [ ] 5.1 evidence → e2e-results.md
    [ ] verdict — STOP, ship-word
    [ ] 5.2 PR (/create-pr) — only after ship-word
    [ ] 5.3 lessons (+ rule line / eval case when it applies)
```

### `/bug-bundle`

```
[ ] 1   Discover
    [ ] ticket.mjs list
    [ ] git cross-check of "already handled"
    [ ] bug-bundle-<round>.md
    [ ] scope gate
[ ] 2   Fix loop              ← one child per bug, added after the scope gate
    [ ] shared anchor map (Explore)
    [ ] <ID> <one-line bug>
        [ ] bug-report.md
        [ ] root-cause.md (+ G0 check)
        [ ] patch
        [ ] fast gate + covering test files
        [ ] its matrix rows + control
    [ ] regression tests (one agent, whole bundle)
[ ] 3   Cross-bug matrix re-run → e2e-results-<round>.md
[ ] 4   Bundle PR (/create-pr)
[ ] 5   Ticket admin
    [ ] re-read statuses
    [ ] comments
    [ ] transitions
```

A bug blocked by G0 is `[!] <ID> — G0 waiting on <trigger>`; the rest of the bundle continues.
