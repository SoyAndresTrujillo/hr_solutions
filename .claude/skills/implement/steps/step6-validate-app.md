# Step 6: Validate Behaviour in the Running App

**Mandatory.** Tests passing is not "it works". The only way out is the explicit
`NOT APP-VERIFIABLE` verdict below — never a silent skip.

This file owns §6.1–§6.3 for every caller: `_shared/module-cascade.md` §3e (per-module proof) applies
them too.

## 6.1 Collect expectations FIRST

**Expected behaviour comes from two sources only: the ticket and the refinement.** `/qa-report` applies
the same rule when it re-runs this proof against a deployed build.

- Ticket: `<out>/ticket.md`, written at Step 0. Do **not** re-read the tracker — Step 0 owns the ingest.
- Functional definition: `<out>/functional.md` from `/refiner`, when one exists — its **Acceptance
  criteria** and **Edge cases** are the checklist. No refiner output → the ticket's own acceptance
  criteria are the checklist.

Do **NOT** source expectations from `implementation-plan.md`, the phase docs, or the diff. Those
describe what was *built*; this step says whether what was built matches what was *asked for*. Reading
them first turns the check into an echo of the implementation.

## 6.2 Pick the driver (scope tag from Step 2)

| Scope / shape | Driver |
|---|---|
| `BACKEND` (API-only) | `/api-verify` — it owns getting a token (stack profile §Auth, `CLAUDE.md` §Auth) and hitting the running API without a UI. |
| `FRONTEND` | `/e2e`. Check its flow library index for an existing flow FIRST, then write the scenario to `<out>/qa/e2e.mjs` and run it against `local`. Login, session, waits and the evidence file are solved there — do not re-solve them. |
| `BOTH` | One `/e2e` scenario: API calls for the rule + the browser for the visible result, same session. |
| Bulk-import flow | `/import-e2e` — a specialisation of `/e2e`, same session and flows. |
| Stack not up | `/run-app` — it owns launch + health (stack profile §Run locally, `environments.local` in the config). |

**A UI action `/e2e` has no flow for → add the flow, don't inline it.** One flow file in the `/e2e`
flow library plus one row in its index, and the next ticket reuses it. Flows perform and return; the
assertions stay in `<out>/qa/e2e.mjs`.

## 6.2a After a module cascade

Step 4 already proved each module's exit-criteria rows (`_shared/module-cascade.md` §3e) and grew
`<out>/qa/e2e.mjs` module by module. This step is the **integration pass**, not a first look:

- Re-run the whole `<out>/qa/e2e.mjs` — a later module can break an earlier module's rows.
- Run every row a module handoff marked `DEFERRED → M<k>`. A deferred row still open here is `FAIL`
  or an open item, never dropped.
- Add one row per cross-module flow (each `Depends on` edge in `Module order`), end to end, with its
  control row.

## 6.3 Build the coverage matrix explicitly

One row per **acceptance criterion × variant × role / customization family** (`CLAUDE.md`
§Customization). Fill it in — do not eyeball it. Skipping this is how a whole role or flag family goes
untested and the user catches it instead of the process.

| # | AC | Variant | Role / family | Input | Expected (from §6.1, verbatim) | Actual (verbatim) | Control? | Verdict | Evidence |
|---|----|---------|---------------|-------|--------------------------------|-------------------|----------|---------|----------|

- **Every criterion needs a control row** — a fully valid input that must still succeed. A pass claim
  without a control is not a pass.
- **One request, many rows** where the module allows it: vary a single field per row and submit the
  whole matrix at once — one run, one artifact, every message at once.
- **Prove a negative behaviourally** when nothing queryable exists: repeat the rejected input
  unchanged. If a record had leaked, the repeat would take a different path and fail differently.
  Same error ⇒ nothing leaked.
- **Async work** (background jobs, imports): poll until the settled state is complete, not just the
  status flag, before reading a result.
- **On a mismatch: fix, then re-run the failing rows plus their control row** — not the whole matrix.
  Two failed rounds on the same row means the root cause is wrong; stop and return to Step 2.
- Local data gaps (no account with the needed role, no reference rows): seed the minimum with an
  `up`/`down` script, run, revert, **verify the revert**, and say so. Never leave seeded rows behind.

## 6.4 Record the evidence

Write `<out>/e2e-results.md`: full matrix, **verbatim** actual strings (never a remembered value),
records created locally, anything seeded and reverted. Raw artifacts (downloaded files, created-record
JSON, screenshots) under `<out>/qa/`.

**Generate the matrix from `<out>/qa/results-local.json`, do not retype it.** `/e2e` writes one row per
case with the actual value and a screenshot name; copying by hand is how a remembered value gets in.
The file's `created` list is the "records created" paragraph. `/api-verify` runs record their
request/response pairs under `<out>/qa/` the same way.

## 6.5 Verdict — exactly four outcomes

| Verdict | Bar |
|---|---|
| `PASS` | Every criterion matched **and** the control case held |
| `FAIL` | The mismatch is the headline, with the exact actual value |
| `PASS with N open item(s)` | Listed individually |
| `NOT APP-VERIFIABLE — <reason>` | Pure migration / infra-only / type-only refactor. Reason stated in the report. |

**STOP and report.** Do not push, open a PR, or post to the ticket — those are outward-facing and need
the user's ship-word (team-rules §D2). The user tests the change themselves before it leaves the
machine. (WIP checkpoint commits from Step 4 stay local.)

`<out>/qa/e2e.mjs` is a **deliverable of this step, not scratch** — it is the handoff to `/qa-report`,
which re-runs the same file against the deployed build (`environments.qa` in the config; `null` → no QA
phase, `/qa-report` says so and stops). Any flow it needed belongs in the `/e2e` flow library, indexed,
before Step 6 closes.

**Next steps (suggest, never run):**
- Optional review → `/code-reviewer` on the branch.
- `push` / `ship` / `create PR` → `/create-pr`.
- "Post the QA result" → `/qa-report`, which consumes the evidence this step produced.
