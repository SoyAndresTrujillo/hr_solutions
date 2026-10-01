---
name: review-implementation
description: "Audit ALREADY-IMPLEMENTED code against an UPDATED spec .md and produce a traceability gap report — report only, zero code changes, stops for approval before any fix work. Use on '/review-implementation', 'audit the implementation against the spec', 'review the implementation against the spec', 'gap report', 'spec compliance', 'does the code match the spec', 'what is missing vs the spec', 'audit this against the new spec', 'audita la implementacion contra el spec', 'que falta vs el spec'. Do NOT use for: writing the fix (that is /fix for one gap, /bug-bundle for a parent ticket's worth, or /implement for new build), auditing a ticket nothing has been built for yet (that is /refiner), or reviewing a pull request for defects and code quality (that is /code-reviewer)."
model: opus
effort: high
---
# /review-implementation — audit shipped code against an updated spec

> **Model routing** — `opus` / `high`. Report-only, but it is the audit that decides whether shipped code matches the spec — the "implemented but inert" and dead-code passes are exactly the kind of thing a cheaper read skims past, and nothing downstream re-checks it.

Input: spec `.md` plus code scope. Output: one gap report with `file:line` behind every claim, then **STOP**. No patch, no branch, no migration — plan at end proposed, never executed.

---

## Source hierarchy — settle this before Phase 0

| Rank | Source | Rule |
|---|---|---|
| 1 | the `.md` spec the user supplied | **Wins. Always.** |
| 2 | older task text — the ticket, `functional.md`, `requirements-spec.md`, phase docs | Loses to the `.md`. |
| 3 | the code | Evidence, never authority. |

- Old text disagreeing with `.md` is **NOT a code defect.** Goes to report §8, own section. Do not file as bug; do not "fix" code back to old text. There is no defect and no repro: a spec change is an amend, not a bug-fix pipeline.
- **Calculations / formulas** (payroll deductions, leave accrual, overtime) belong to a separate calculations spec when the project keeps one, not to the `.md`. Never flag a formula missing, never invent one, never re-derive from code and present as expected. Anything calculation-shaped → §9 "Pending validation against the calculations spec".
- Spec silence is not authority to delete — verdict "**Silence, not a drop**".
- Declare the authority order in the report preamble, in one or two lines.

---

## Output location

`<out>/audit/spec-audit.md` — `<out>` from `.claude/skills/_shared/output-location.md` (registry row
`audit/spec-audit.md`). Second round → `spec-audit-2.md`, then `-3`…

Fallbacks: whole-parent audit → `<docsDir>/<PARENT>/audit/spec-audit.md`. No ticket →
`<docsDir>/<slug>/audit/spec-audit.md`. Never inside `<api>` or `<web>` — this skill is read-only on
product code.

If the user asks for a path outside `<docsDir>`, decline and use `<out>` — `_shared/output-location.md`: no skill writes docs anywhere else.
Run `git check-ignore -v <out>/audit/spec-audit.md` once; if `<docsDir>` is gitignored, **say out loud
in the handoff that the report is gitignored** — it never shows up in a PR diff.

---

## Phases

Run collector first (see below) — gives scope and first warning list:

```sh
"$(git rev-parse --show-toplevel)"/.claude/skills/review-implementation/collect.sh [range]
```

### Phase 0 — normalize the spec into atomic requirements
Split `.md` into `REQ-001…`, one assertion each. Include IMPLICIT ones prose only implies: **validations, state transitions, order of operations, formats, permissions and roles, user-facing messages, error handling**. Keep spec's own labels (BR-xx / AC-xx / Q-xx / §n) in own column so reader can cross-check by label as well as by line.
**Show numbered list and stop for confirmation before Phase 1.**

### Phase 1 — map each REQ to real code
One row per REQ. **Read the function body, never the name** — `applyLeaveAccrual` may accrue nothing. Every cell carries a `file:line` you actually opened; write `NOT VERIFIED` rather than guess. Cite the spec in full once (`functional.md:293`), then degrade to bare `:299` in the same context.

### Phase 2 — classify
`IMPLEMENTED` · `PARTIALLY-DIVERGENT` · `NOT IMPLEMENTED` · `NOT VERIFIABLE`.
**Run inert checklist below before writing any IMPLEMENTED.** That is the whole point of this skill.

### Phase 3 — edge cases
Each row: scenario → current behaviour (`file:line`) → expected per spec (`:NNN`) → severity. Cover, minimum: nulls · numeric and date boundaries · empty collection · single-element collection · duplicates · concurrency · timeouts · invalid intermediate states · timezones and date formats · permissions and roles · idempotency · rollback on partial failure.

### Phase 4 — dead code orphaned by the scope change
Everything old scope needed and new `.md` does not. Each entry marked `SAFE TO DELETE` (no caller, no export, no test) or `REQUIRES CONFIRMATION` — and prove with caller grep, not hunch.

### Phase 4.5 — scope (`_shared/team-rules.md` §S1)
Does the implementation touch anything the spec does not name? One row per out-of-spec surface:
`file:line` → what it changes → which rule permits it (§S2 approved refactor, §S3 agreed bug fix, §S4
consumer of a changed endpoint or schema) or `UNJUSTIFIED`. `UNJUSTIFIED` rows are gaps, same as a missing
REQ. Read the rules; do not restate them in the report.

### Phase 5 — genuine logic errors independent of the spec
Real defects found on the way. Keep separate from spec gaps; they route to `/fix`, spec gaps do not.

---

## Implemented but inert — check these before writing IMPLEMENTED

Ways code exists, reads correct in the diff, and does nothing. **A reviewer who skips this section will
mark dead code IMPLEMENTED.** Each row names the mechanism; the concrete file locations come from the
stack profile §Layout.

| # | Surface | Why it reads as implemented | Detect |
|---|---|---|---|
| 1 | **Request schema not declaring the key** | Web sends it, network tab shows it, service written for it. Object schemas commonly strip unknown keys by default — no 400, no log. A service unit test that builds the input as a literal never crosses the validator. | Grep the key in the module's schema file. Check the **create** and **update** schemas separately — each flow has its own, and a derived update schema may omit or rename it. |
| 2 | **Hand-maintained column list omits the field** | Column exists in migration, model and DB. Left out of an explicit select/projection it reads `undefined`, and `x != null` / `x ?? y` quietly takes the *other* arm. Nothing throws. | Grep the repository for explicit select lists, diff each against the fields the consumer reads. Ask: **is any read used as a MODE PREDICATE** (e.g. "has a custom accrual rate → use it, else the policy default")? |
| 3 | **A later unconditional assignment discards the payload** | Schema declares the key, validation passes, value arrives — and a derivation overwrites it (e.g. the typed leave days replaced by days recomputed from the dates). The diff shows only the derivation, which reads correct. | Grep every assignment to the field in the service. **Order is load-bearing:** the honour-the-payload branch must come after the derivation it overrides. |
| 4 | **Form field with validation that never runs** | Rules render and never execute: the field is not registered with the form library, or the form has no submit handler, so validation is never triggered. | For each field with rules: is it registered (the form library's `name` / `register`)? Does the form have a submit handler that runs validation? `collect.sh` FORM flags the file-level case. |
| 5 | **Flag or permission defined but never read — or read but never loaded** | The flag exists in the registry and in config, but no code path reads it; or a component reads it from a hook that only loads the keys it was asked for, so it keeps its compiled-in default forever. Types cannot catch it. | Grep every reader of the flag key (`CLAUDE.md` §Customization route). Per reader, confirm the key is actually requested/loaded, and that the web default agrees with the stored value. |
| 6 | **First-render default feeds a one-shot consumer** | Async-loaded flags/permissions/user data start `undefined`, so the first render uses the default. Harmless for display (a flicker), permanent for anything one-shot. | Grep the value feeding a form's initial values, a `useState(...)` initializer, a redirect, or an effect whose dependency list omits it — those never re-read. |
| 7 | **Migration that does nothing, or cannot be undone** | Insert-if-absent (`ON CONFLICT DO NOTHING`, skip-duplicates) on an already-occupied key exits 0 and is recorded as applied — the row never exists. A migration with no working `down` breaks rollback (team-rules §S5). A seeded key misspelled against the code's registry is written under a name nothing reads. | Per migration: is the unique key already occupied? Is there a `down` that reverses it? Cross-check every seeded key against the registry in code. |
| 8 | **Route or middleware defined but not mounted** | The route file, handler and tests exist; the router is never registered in the app factory, or the auth/validation middleware is defined but not applied to that route. Tests that call the handler directly pass. Web twin: a page component not added to the router. | Grep the route/page/middleware name at the registration point (app factory, router file). `collect.sh` UNUSED flags new files with no importer. |
| 9 | **Hook, component or helper created but unused** | Written, typed, tested in isolation — and never imported by the screen that needs it. | Grep importers. A new file whose only importer is its test is inert. |
| 10 | **i18n key used but missing from the catalog** | `t('leave.expired')` renders the raw key or a fallback; the diff shows a correct-looking call. | Grep each new key in the catalog (stack profile §i18n). |
| 11 | **Env var read but not registered** | Code reads the variable; it is missing from the config schema and `.env.example`, so every environment gets `undefined` and silently takes the default path (team-rules §B7). | `collect.sh` ENV flags vars added in the diff and absent from every `.env.example`; also check the env config schema. |

---

## Report shape

Sections in this order, numbered. Tables over prose.

| § | Section | Contract |
|---|---|---|
| 1 | Executive summary | Coverage % (REQs IMPLEMENTED / total) + top 3 risks, one line each. |
| 2 | Traceability table | Columns: `REQ \| Spec label + :NNN \| Target file:L \| Verdict \| Evidence \| Fix if BLOCKER/MODEL-GAP`. One row per REQ. `Evidence` quotes or names what the target line does; the last column says the fix only for BLOCKER or MODEL-GAP rows and is empty otherwise. |
| 3 | Not implemented | Ordered by impact, not by REQ number. |
| 4 | Partially implemented / divergent | What it does vs what the spec rules. |
| 5 | Edge cases | Phase 3 table. |
| 6 | Dead code | `SAFE TO DELETE` / `REQUIRES CONFIRMATION`. |
| 7 | Logic errors | Real defects, spec-independent. Route to `/fix`. |
| 8 | Contradictions: previous text vs the `.md` | Not defects. Amend the docs, not the code. |
| 9 | Pending validation against the calculations spec | Everything calculation-shaped. Never a verdict. |
| 10 | PO questions | Numbered, each answerable **yes/no or with one data point**. |

Verdict vocabulary — a closed set, do not invent one:
- Rows: `ALIGNED` (matches the spec) · `MINOR` (diverges, no user-visible harm) · `MODEL-GAP` (the spec
  itself is missing a case the code must handle) · `BLOCKER` (user-visible divergence or data risk) ·
  `NOTE` (context, no action) · `RESOLVED` (was a gap in an earlier round, now fixed).
- Tally, under §1: `CONFIRMS` / `CONTRADICTS` / `NEW` / `STILL_OPEN`, each with a count. Keep a bucket in
  the table at count 0 rather than deleting it.

Two more habits:
- **Publish confidence.** Name what you did *not* verify, and state what silence means — e.g. "Anything not named in §3-§9 is implemented as the spec says."
- **Anchors drift; claims do not.** Every citation also quotes or names its target, so a stale line number is navigation friction, not mis-instruction. Grep the quoted text before rejecting a claim over a line number.

---

## collect.sh

```
"$(git rev-parse --show-toplevel)"/.claude/skills/review-implementation/collect.sh [commit-range]   # default <git.mainBranch>...HEAD
```
The script re-roots itself (`git rev-parse --show-toplevel`), so it runs from anywhere in the repo — but
the *path* must be absolute or you get `no such file or directory` from every cwd except this directory.
It reads `workspaces` and `git.mainBranch` from `.claude/kit.config.json` (defaults `api` / `web` /
`main`).
Prints changed files grouped by area (api / web / migrations / tests / docs / other), diffstat, and a
`WARNINGS` list flagging the **mechanically detectable** surfaces above: SCHEMA (row 1), SELECT (row 2),
FORM (row 4), ACCESS (rows 5, 6, 8), MIGRATION and SEED (row 7), UNUSED (rows 8, 9), ENV (row 11). Rows 3
(later assignment discarding payload), 6 (first-render default) and 10 (missing i18n key) have no
reliable detector and need a manual read. A warning is a **read this file's body** instruction, not a
finding.

---

## Safety

- **Read-only on product code.** Nothing under `<api>` or `<web>` is edited by this skill, for any reason.
- Prioritised plan (blockers → functional → cleanup) written into report and **not executed**. Stop and ask. Fixes go to `/fix` (one defect), `/bug-bundle` (parent ticket's worth) or `/implement` (spec gaps); doc contradictions go to neither.
- Never state a result the evidence does not contain. `NOT VERIFIED` is a valid verdict; a guess is not.
- Coverage % is REQs, not lines. Say which denominator you used.
