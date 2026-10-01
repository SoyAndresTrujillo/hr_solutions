---
name: bug-bundle
description: "Local development pipeline for a whole parent ticket's bug round: discover the pending bugs from the ticket tracker, fix them one by one via /fix, prove each fix against the locally running app, ship one bundled PR, then comment and transition each ticket. The parent may be any ticket type — epic, task, bug. Stops at deploy — QA verification afterwards belongs to /qa-report. Args: `<PARENT> [<round>]`. Use on '/bug-bundle <PARENT>', 'work the bug bundle', 'fix all the pending bugs for this epic/task/ticket', or when a QA round rejects a parent ticket and hands back a list of tickets."
model: opus
---

# /bug-bundle — parent-ticket bug round, development side

> **Model routing** — `opus`. `opus` because the run ends in a bundled PR and a status transition on every ticket in the round — outward-facing, multi-ticket, and a false "fixed" propagates to all of them.

Orchestration layer over `/fix` and `/create-pr`. It does not re-implement them — it decides what runs, in what order, with what evidence.

Team development rules, including the G0 approval gate this skill evaluates per bug: `.claude/skills/_shared/team-rules.md`. Cite by rule ID; never restate one. Tracker operations: `.claude/skills/_shared/ticket-ingest.md` (every command below is `node .claude/skills/_lib/ticket.mjs`). Project values (statuses, branches, approver, environments): `.claude/kit.config.json`.

**Boundary:** this skill covers the **local** phase, from the ticket list to a merge-ready PR with the tickets updated. It stops at deploy. Verifying the deployed build on QA and publishing per-ticket results is `/qa-report`'s job — do not restate its mechanics here.

Written from a real 7-ticket round (4 missing-required-field validations, 3 wrong-message fixes), where every trap listed below cost real time.

**Scope of what generalizes.** Phases 1, 2, 4, 5 and the evidence rules are module-independent — any parent-ticket bug round. Phase 3 shows a bulk-import verification and must be adapted per module; see "Adapting the recipe". Status names come from `statuses` / `statusFlow` / `doneStatuses` in the config.

---

## Shape

```
discover → fix loop (per bug: fix → tests → its matrix rows) → cross-bug matrix re-run → bundle PR → ticket admin → [deploy] → /qa-report
```

Runs **autonomously** end to end by default; report once at the PR. Ask at the start if the user wants a gate per bug instead — the per-step gates inside `/fix` are sized for a single bug, not for a batch of seven, and applying them to a bundle produces dozens of stops.

---

## Phase 1 — Discover

**The bugs are usually NOT only the parent's children.** A rejected round often links its bugs to the parent as blockers (`blocked_by:` on the parent) rather than as `parent:` children. `list` reads both:

```bash
node .claude/skills/_lib/ticket.mjs list <PARENT>
```

Prints the children and the linked blockers together, split into `PENDING` vs `HANDLED` — handled = status in `doneStatuses` (config); every other status, including an unknown one, counts as pending, so nothing is silently dropped. Some rows are admin children ("write test cases", "development") rather than bugs — label them; on some parents the bugs *are* the children.

Cross-check every handled ticket against git:

```bash
git log --oneline -40 --all --grep="<ID>"
```

A ticket whose status claims done but has **no commit, branch or working doc** is a finding — surface it, do not assume it is covered. (A real round had a ticket sitting in a done status with nothing implemented; it was a real, unfixed bug.)

Write the list to `<docsDir>/<PARENT>/bug-bundle-<round>.md`: one section per bug (repro, actual, expected with the **exact** message strings), a table grouping them by kind, and an "already fixed" table with commit refs.

**Gate:** show the list, confirm scope, then run.

---

## Phase 2 — Fix loop

**Branch first.** The whole round shares ONE branch named after the parent (`_shared/team-rules.md` §D1): already on `<PARENT>` (or inside its worktree) → stay; else
`git worktree add <git.worktreesDir>/<PARENT> -b <PARENT> <git.mainBranch>` (drop `-b <PARENT>` when the branch exists). Every `/fix` in the round runs inside that worktree and skips its own branch setup.

Per bug, follow `/fix`. **Budget:** `/fix` dispatches ~4 subagents per bug (architect, one specialist per scope, up to 2 verify-fix rounds). A 7-bug bundle is therefore ~28 dispatches on top of the shared Explore and the single regression agent — say the number out loud before starting a bundle over 5 bugs, and offer to split it.

Bundle-specific adjustments:

- **One shared anchor map for the whole bundle**, not one per bug. Dispatch a single `Explore` over the suspect subsystem asking for file:line per bug, a required-vs-optional table, a message-producer table, the test files, and gotchas. If the bugs share one file (they often do), the strategy changes from N agent dispatches to N surgical edits in one place.
- Per bug still write `bug-report.md` + `root-cause.md` + `pr-shape.md` (`bundle-fix`) in `<docsDir>/<PARENT>/<ID>/`.
- Ingest every ticket up front: `ticket.mjs ingest <ID> <docsDir>/<PARENT>/<ID>` (`_shared/ticket-ingest.md`).
- **Minimal diff, and keep sibling paths byte-identical.** If a shared helper is extracted, the untouched caller's test must stay untouched. An anti-regression test you had to edit is much weaker evidence than one that still passes as-is.
- **Per-customer / per-role scoping through the existing route**, never an inline literal — `CLAUDE.md` §Customization (§S7).
- **G0 gate, evaluated per bug.** A bug whose fix needs a refactor (§S2), a migration (§S5) or a new dependency (§B5) — `.claude/skills/_shared/team-rules.md` — stops that bug's `/fix` run at its Step 3 gate with the G0 proposal draft, and waits for the approver's confirmation on that ticket (`techLead.name` in the config; `null` → the user). The rest of the bundle continues; the blocked bug is reported as blocked, not silently dropped.
- **S3 applies to anything the round turns up that is not in the list.** A bug found while fixing another one: ask the user first; on yes, file it with `ticket.mjs new --type bug --title "<t>" --blocks <PARENT>` so it joins the round's list. It is folded into this bundle only if the user says so.
- Regression tests: one agent at the end for the whole bundle, not one per bug.
- **Prove each bug before starting the next.** Right after a bug's fix is green (fast gate + covering
  tests), run **that bug's rows** of the Phase 3 coverage matrix, control row included, with the
  Phase 3 driver. Mismatch → fix → re-run the failing rows plus their control; two failed rounds →
  wrong root cause, stop that bug and report it. Only a proven bug lets the loop move on — a later bug
  then builds on a fix that is known to work, not on one that only compiles. Record the rows in
  `e2e-results-<round>.md` as they pass.

### Evidence rules

- **Existing tests that go red are the proof.** If the patch changes behaviour, the old expectations must fail. Rewrite them and list every one with `file:L` and why.
- **Prove a failing suite is pre-existing, do not assert it.** Guarded stash → run → pop:
  ```bash
  BEFORE=$(git stash list | wc -l)
  git stash push -m "<label>" -- <paths>
  AFTER=$(git stash list | wc -l)   # must be BEFORE+1
  # run the suite, then:
  git stash list | head -1 | grep -q "<label>" && git stash pop
  ```
- **Absence checks.** For a wrong-message bug the fix is the *old* string disappearing. `grep -c` the old literal in the evidence and report the zero.

---

## Phase 3 — Local verification

Tests passing is not "it works". Drive the app running on the local stack (`/run-app` brings it up), before the PR.

**API-level is enough** — the UI adds login flakiness without covering more of the logic under test. Ask which the user wants; default to API when the local UI login is not already known-good. (Local data often carries credentials that match no known password; the `/api-verify` auth recipe — stack profile §Auth — sidesteps that entirely.)

Pattern used for an async bulk import:

1. Get a token without a UI login. Recipe owned by `/api-verify`; do not re-derive it.
2. Hit the **real** endpoint with a real file.
3. Poll the job record, then read the **server's own error output** and compare verbatim.
4. Read created records back to prove the happy path is unharmed.

### Coverage matrix — build it explicitly

One row per **bug × variant × customer/role/flag family**. Fill it in; do not eyeball it. Skipping this left a whole family untested for one ticket, and the user caught it rather than the process.

Every bug needs at least one **control** row — a fully valid input that must still succeed. A pass claim without a control is not a pass.

Two techniques worth reusing:

- **One request, many rows** where the module allows it: vary a single cell per row and put the whole matrix in one submission — one run, one error artifact, every message at once.
- **Prove a negative behaviourally** when nothing queryable exists: repeat the rejected input unchanged. If a record had leaked, the repeat would take a different code path and fail differently. Same error ⇒ nothing leaked.

### Local data gaps

Local data often lacks what a family needs (no manager with the right role, no reference rows), which blocks a whole family. Seed the minimum with an `up`/`down` script — seed scripts per stack profile §Migrations / the project's seeds — run, revert, then **verify the revert** and say so in the report. Never leave seeded rows behind.

### Traps

| Trap | What happens | Fix |
|---|---|---|
| Job status settles before its counts | `status=Completed` while counts/error file are still null → you read "no result" | Poll until counts are non-null **and** (no failures or the error artifact exists) |
| Error text contains commas | `awk -F','` truncates `must be one of: Full-time, Part-time, Contract.` to ` Contract."` | Parse the CSV quote-aware before quoting anything anywhere |
| Env parser drops keys with digits | `^[A-Z_]+=` silently skips `S3_BUCKET_NAME` → "Bucket is required" | `^[A-Z0-9_]+=` |
| Shell `cd` persists between calls | later relative paths resolve under the wrong root | absolute paths, or `cd <repo> &&` in every call |
| Watch-mode server restarts mid-run | `fetch failed` on the first call after a patch | wait for the port with `curl --retry --retry-connrefused`, re-run |

**Per bug, then whole bundle.** Each bug's rows already ran in Phase 2, right after its fix. Phase 3
is the **cross-bug pass**: re-run the full matrix once after the last fix lands — a later fix can
break an earlier bug's rows, especially when the bugs share a file. Any mismatch → fix → re-run the
**failing rows plus their control row**. Two failed rounds on the same row means the root cause is
wrong — stop and re-diagnose rather than re-running.

Record the result in `<docsDir>/<PARENT>/e2e-results-<round>.md`: the full matrix, the records created locally, and anything seeded and reverted.

### Adapting the recipe to another module

The four numbered steps are written around an **async bulk import** (job record + server-generated error file), the module this skill was built on. The phase structure, the matrix and the control-row rule are module-independent; the mechanics are not. Swap four slots:

| Slot | Bulk import (as written) | What to substitute |
|---|---|---|
| Trigger | `POST /employees/import` with a CSV | the endpoint or UI action under test |
| Settling signal | poll the job record until counts are non-null | the state that means "finished" — a synchronous response needs no polling |
| Evidence artifact | the error file the server generated | the response body, the persisted record, a screenshot |
| Negative proof | repeat the rejected input | any repeat that would take a different path if a record had leaked |

Driver by kind:

- **Synchronous API** bug: `/api-verify` — call it, assert status + body verbatim, read the record back.
- **Frontend** bug: **`/e2e`** — reuse a flow from its flow library, write `<docsDir>/<PARENT>/<ID>/qa/e2e.mjs`, run it `local`; it produces `results-local.json` + a screenshot per case, and `/qa-report` re-runs the same file against the deployed build.
- **Bulk import** bug: `/import-e2e`, the bulk-import specialisation.

Keep the matrix either way.

---

## Phase 4 — Bundle PR

`/create-pr` with the `bundle-fix` template, on the user's ship-word (team-rules §D2). Description shape is §C1/§C2 in `.claude/skills/_shared/team-rules.md` — `/create-pr` owns it, do not restate it here. A bug-fix PR needs no Tech Lead approval (§C3a); no attribution (§D3). Beyond the per-ticket table the body must carry:

- every **product decision** the bundle forces (a rule that contradicts the form, a previous decision reversed) — stated, not buried;
- the **absence checks**, and what was verified untouched;
- any pre-existing failure, with how it was proven pre-existing.

---

## Phase 5 — Ticket admin

Only after the PR exists. Per ticket whose fix is in the PR:

```bash
node .claude/skills/_lib/ticket.mjs comment <ID> <file.md> [--attach <files…>]
node .claude/skills/_lib/ticket.mjs status <ID>
node .claude/skills/_lib/ticket.mjs transition <ID> --to "<statusFlow.prOpened>"
```

- **Re-read the status immediately before transitioning.** Statuses drift while you work — a whole set can move between two reads in one session. Already at or past `statusFlow.prOpened` → leave it.
- A bug blocked at G0 or stopped after two failed rounds keeps its status; its comment says why.
- Comments are outward-facing: no internal paths, skills, or memory references. Restate rules in plain engineering terms. The PR link goes in the comment.
- Leave the **parent ticket** alone unless asked — its status is QA's call.

---

## Handoff — after deploy

This skill ends here. Once the build reaches QA (`environments.qa` in the config; `null` → say there is no QA environment and stop), run **`/qa-report`** per ticket: it re-runs the scenarios against the deployed build, publishes the evidence to the ticket and keeps `qa-results.md`. That loop is normally **gated one ticket at a time**, unlike this one.

Carry forward into it: the per-bug expected strings from Phase 1, and the coverage matrix from Phase 3 — the QA round should exercise the same matrix against the deployed build, not a fresh guess. Do not reuse the local evidence as QA evidence; a QA report needs a QA run and the deployed build's reference (the PR's merge commit).

---

## Deliverables

```
<docsDir>/<PARENT>/
├── bug-bundle-<round>.md          # the list + shape + already-fixed
├── e2e-results-<round>.md         # local verification matrix
└── <ID>/
    ├── ticket.md                  # ingested ticket (+ images/)
    ├── bug-report.md
    ├── root-cause.md
    ├── pr-shape.md                # bundle-fix
    └── qa/e2e.mjs                 # UI bugs only — handoff to /qa-report
```

`/qa-report` adds `ticket-comment[-N].md`, `qa-results.md` and more of `qa/` per ticket after deploy.

---

## Failure handling

- Ticket status contradicts the repository → report it, treat the bug as unfixed until proven otherwise.
- Matrix row fails after a fix attempt → back to root cause; two failed rounds on the same row means the root cause is wrong.
- A ticket's expected behaviour contradicts the app's own form → implement the ticket, flag the contradiction as off-ticket on the ticket and in the PR. Product decision, not a code decision.
