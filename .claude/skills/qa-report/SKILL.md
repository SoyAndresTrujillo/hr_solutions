---
name: qa-report
description: "Verify a deployed fix on the QA environment (or another configured environment) and publish the result to its ticket: run the ticket's scenarios against the deployed app (UI, API or both), save the evidence, build the comment from the ticket + functional definition + evidence, attach every file, append the same section to qa-results.md, and set the ticket status from the outcome. Use on '/qa-report <ID>', 'verify this on QA', 'post the QA result to the ticket', 'post the result with evidences', 'comment the test results on the ticket'."
model: opus
---

# /qa-report — Verify on QA, then publish the result to the ticket

Two halves: **run the ticket's scenarios against the deployed build**, then turn that run into
one ticket comment plus its attachments, with `qa-results.md` as the local source of record.

`/bug-bundle` covers the local phase and stops at deploy. This skill picks up from there.

**Skip the run only when the evidence already exists and came from the target environment.**
Local evidence is not QA evidence — a local run proves the code, not the deployed build, the
QA data or the QA configuration. If all you have is a local run, either do the QA run here or
say plainly in the comment that the result is local and unverified on QA.

Normally gated **one ticket at a time**, unlike `/bug-bundle`.

**Model routing** — `model: opus`, effort left to inherit. `opus` because the output is
outward-facing and ungated: the verdict comes from reading screenshots and quoting strings,
and a wrong PASS lands on a team-visible ticket with no downstream check to catch it. No
`effort:` — a skill's model and effort apply only to the turn that invoked it; this skill
dispatches no subagents.

Args: `<ID> [--env <name>]` — `<name>` is a key of `environments` in `.claude/kit.config.json`,
default `qa`. `<out>` from `_shared/output-location.md`.

---

## Prerequisites (check first, fail fast)

1. **The environment exists.** Read `environments.<env>` from the config. `null` or missing →
   print `environments.<env> is not configured in .claude/kit.config.json — /qa-report has
   nothing to verify against. Configure it, or verify locally with /e2e.` and **stop cleanly**
   (CONTRACT rule 8). `production` is never a valid target.
2. **Credentials** for that environment: the env vars named in `e2e.credentialsEnv` (or
   `environments.<env>.credentialsEnv`), read from `e2e.envFile`. Missing → ask once, never
   substitute another environment or account silently. Never print their values.
3. **The build under test** is identifiable and actually deployed:
   `gh pr view <n> --json mergedAt,mergeCommit` plus the deploy (`deploy.<env>` in the config
   names its workflows; `gh run list --workflow <wf> --commit <sha>` shows whether it ran). A
   result with no build reference is not publishable — ask.
4. **Ticket.** `node .claude/skills/_lib/ticket.mjs ingest <ID> <out>` (`_shared/ticket-ingest.md`).
   A round covering several tickets → one comment per ticket, each scoped to that ticket's rows.

---

## Phase 1 — Run it on QA

### 1.1 Pick the surface from the ticket

**First: does `<out>/qa/e2e.mjs` already exist?** `/implement` Step 6, `/fix` Step 5 and
`/bug-bundle` Phase 3 leave the scenario behind. Re-run it against the deployed build before
anything else — same file, the environment name instead of `local`:

```bash
node <out>/qa/e2e.mjs qa
```

It writes `results-qa.json` beside the local run's file, so the deployed result is diffable
against the local one case by case, and Phase 4's comment is built from it. Hand-drive only
what the scenario cannot reach. No scenario exists → write one per `.claude/skills/e2e/SKILL.md`
§Write the scenario; it is reusable for the re-verification round.

The ticket decides what to drive. Read its steps to reproduce before choosing.

| Ticket is about | Drive | Evidence |
|---|---|---|
| Anything visible — layout, wording, field state, icons, order | the **deployed app in a browser** (`/e2e`) | screenshot per case, plus the DOM reading that makes it objective (geometry, `disabled`, the string) |
| Server behaviour only — status codes, payloads, persistence, validation the UI never shows | the **deployed API** (`/api-verify` method, base URL `environments.<env>.api`) | request/response saved verbatim as JSON, plus the record read back |
| A rule the user triggers in the UI and the server enforces | **both** — act in the UI, confirm the persisted state through the API (`s.api()`) | screenshot + the API read-back |

A visible bug verified only through the API is not verified. Only measuring the rendered page
catches a fix that every automated gate passed and that was never actually implemented.

### 1.2 Where to point

Web `environments.<env>.web`, API `environments.<env>.api`. Log in through the session
(`e2e.loginFlow`) or, for the API alone, per `CLAUDE.md` §Auth with the same credentials. A
scenario that needs a role no configured account has is "not verifiable with the credentials
available" — say so, do not approximate it with another role.

### 1.3 Build the matrix

One row per **bug × variant × role/configuration the ticket names**. Fill it in; do not eyeball it.

- Every bug needs at least one **control** row: the valid case that must still work. A pass
  claim without a control is not a pass.
- A variant the environment cannot exercise (the feature flag is off there, the role has no
  account) is **"not applicable — <reason>"**, never a pass.
- Carry the matrix forward from `<PARENT>/e2e-results-<round>.md` when `/bug-bundle` produced
  one — the QA round exercises the same matrix against the deployed build, not a fresh guess.
- Any mismatch → re-run the **failing rows plus their control row** after the fix; run the full
  matrix once at the end, after the last fix lands. Two failed rounds on the same row means the
  root cause is wrong — re-diagnose rather than re-run.

### 1.4 Reaching persisted state

Read persisted state through the deployed API (`s.api()` or `/api-verify`). The **code under
test is always the deployed app** — never a local server pointed at the environment's data.
Direct database access is out of scope for this skill; if a precondition cannot be created
through the app, ask the user.

### 1.5 What the run may change

- **Leave the records the run created.** They are the evidence. List every id in the comment.
- **Revert anything that changes access**: a password or a role change goes back to what it
  was, immediately, and the revert is read back and reported.
- Flipping a configuration flag to satisfy a precondition is allowed — record the before value
  and say whether you left it or restored it.
- Never point a run or a comment at production.

### 1.6 Evidence

Save into `<out>/qa/`:

- screenshots per case, named `<ID>-<case>-<env>.png` (the session writes `<case>-<env>.png`);
- files the app produced (failed-records CSV, exports, generated PDFs) **unedited**, plus the
  inputs that produced them;
- raw API responses as `.json`, status code included.

Unedited is the point: a cropped or retyped artifact is not evidence.

### 1.7 Traps

Browser traps (toast fade, dev-server idle, synthetic events on custom selects, absent vs empty,
per-role evidence overwrite) are **already solved inside `/e2e`'s `session.mjs`** — see
`.claude/skills/e2e/SKILL.md` §Traps already handled in `session.mjs`. App-specific traps are
the `Note:` rows in `.claude/skills/e2e/flows/README.md`.

QA-round traps that are this skill's own:

| Trap | What happens | Fix |
|---|---|---|
| QA data drifts between rounds | the record or configuration you tested last round is gone or changed | re-read the precondition at the start of each round and record what you found |
| the deploy has not finished | you verify the previous build and report its behaviour as the fix's | confirm the deploy run for the merge commit completed before Phase 1 |

---

## Phase 2 — Collect the expectations

**Expected behaviour comes from two sources only — the ticket and the functional definition.**
Nothing else defines what "correct" means here.

- The ticket: `<out>/ticket.md`, re-ingested fresh with `ticket.mjs ingest <ID> <out>` — the
  ticket may have moved since the fix was written.
- The functional definition: `<out>/functional.md` from `/refiner`. Its acceptance criteria and
  edge cases are the checklist the report answers. Missing → say so in the comment and report
  against the ticket alone.

Do **not** source expectations from implementation notes — `bug-report.md`, `root-cause.md`,
phase docs, `requirements-spec.md`, the diff. Those describe what was built; the report has to
say whether what was built matches what was asked for, and reading them first turns the report
into an echo of the implementation.

Then read the raw evidence for the **actual** results: quote strings verbatim from
`results-<env>.json`, the failed-records file, the API JSON or the screenshot — never a
remembered value. Earlier rounds in `qa-results.md` are fair game for history (what previously
failed), not for expectations.

---

## Phase 3 — Decide the verdict

`PASS` only when every expected outcome matched **and** a control case proves nothing regressed.
No control case → say so; a pass claim without one is not a pass.
`FAIL` → the mismatch is the headline, with the exact actual value.
Partial → `PASS with N open item(s)`, listed.

---

## Phase 4 — Write the comment

Draft to `<out>/ticket-comment[-N].md` (`-N` = the round, from the second round on). Plain
markdown, **no headings** — `ticket.mjs comment` adds a dated heading and an `Attachments:` list
itself. Short lines and `- ` bullets.

Structure that has worked:

```
<Verdict> — <env>, <date>, <build under test: PR #NNN merged as <sha>, deployed to <env>>

<How it was tested: URL, role(s), surface (UI / API / both), what was varied.>

<Run 1 id + scope> — N passed / M failed:
- <case> -> "<actual>" OK
- <case> -> "<actual>" — expected "<expected>"
- Control: <valid case> -> behaved normally, <record id> created (no false rejection)

<Run 2 …>

<Side effects: what the rejected cases did NOT create, and how that was checked.>

<Open items needing a QA/product answer.>

Evidence attached: <file1>, <file2> — <what they are, "downloaded from <env>, unedited">.

Records created in <env>: <ids>, left in place as evidence.

<Anything found off-ticket, labelled as such, with the ticket it belongs to.>
```

Rules that keep these comments trustworthy:
- Name the environment in the first line. If any part of the result is not from it, say which
  part and why.
- Quote actual strings verbatim, including trailing punctuation — wording differences are
  usually the bug.
- Name every record the run created, and every configuration value it changed, with what it
  was before.
- Off-ticket findings go in their own paragraph, marked off-ticket, never mixed into the verdict.
- No internal references — no CLAUDE.md, skills, agents, local paths. Refer to files by their
  attachment name only, spelled exactly as attached.
- No self-attribution (team-rules §D3).

---

## Phase 5 — Post

**Only when the user asks** (team-rules §D2). Show the draft first when the verdict is FAIL or
it names another ticket.

```bash
node .claude/skills/_lib/ticket.mjs comment <ID> <out>/ticket-comment[-N].md --attach <f1> <f2> ...
```

The script appends the comment under a dated heading and copies each attachment next to the
ticket with a link. There is no edit: a re-post of the same round is a new comment, so get the
draft right first and never post a near-duplicate.

Attach the unedited downloads, the inputs that produced them, the screenshots the verdict rests
on, and `results-<env>.json`.

---

## Phase 6 — Set the ticket status from the outcome

**Re-read the status immediately before transitioning** — statuses drift while you work.

```bash
node .claude/skills/_lib/ticket.mjs status <ID>
node .claude/skills/_lib/ticket.mjs transition <ID> --to "<STATUS>"
```

| Verdict | Status |
|---|---|
| FAIL | `statusFlow.qaFail` from the config — the comment carries the exact mismatch, so whoever picks it up starts from the failure |
| PASS with open items | leave it where it is and name the open item in the comment; the open item is a product call, not a status |
| PASS | `statusFlow.qaPass` when it is non-null; `null` → leave the status to QA unless the user asks otherwise |

Leave the **parent ticket** alone — never transition a parent from a child's run
(`_shared/ticket-ingest.md`).

---

## Phase 7 — Record locally

Append the same result to `<out>/qa-results.md` as a new dated section — markdown tables fine
here — and update any earlier "still to do" line that this round closes. Report the comment,
the attachment names and the status change.

---

## Re-verification rounds

A fix shipped after a failed round gets a **new** comment (`ticket-comment-N.md`), not an edit
of the old one: QA needs the history. Head it with the new build (`PR #NNN, merged as <sha>,
deployed to <env>`), restate the failing case, and show it passing. Re-run the scenario with
`open({ resume: true })` and `R<N> · ` case prefixes when only a subset is re-run.

---

## Deliverables

```
<out>/
├── qa/                        # scenario, results-<env>.json, screenshots, downloads, API JSON — unedited
├── ticket-comment[-N].md      # what was posted
└── qa-results.md              # dated section per round
```

---

## Safety

- Configured non-production environments only. Never point a verification run or its comment
  at production.
- Comments are outward-facing — post when the user asks, and show the draft first if the
  verdict is FAIL or names another ticket.
- Never state a result the evidence does not contain. "Not verified" is a valid line; a guess
  is not.
- Credentials from env only, never in a comment, doc, attachment or saved log.
