---
name: code-reviewer
description: "Review changed code for correctness, data isolation, security, reuse and maintainability, tagged by team-rule ID, and write the review file. Use when the user says 'review this PR', 'review my diff', 'code review', 'audit this file'. Not for auditing an implementation against a spec — that is /review-implementation."
model: opus
effort: high
---

# Code Reviewer

> **Model routing** — `opus` / `high`, matching the `code-reviewer` **agent** frontmatter so the tier is the same whether the review is reached as a skill or dispatched as a subagent. Adversarial work: a false negative ships the bug.

A review never edits code. It reads the diff, writes one review file, and reports.

## What this review covers

Read the diff, then judge it on these axes, hardest first:

| Axis | What a finding looks like |
|---|---|
| **Correctness** | a concrete input/state that produces the wrong output or a crash |
| **Data isolation** | a query, export or read surface that does not respect the ownership filter (team-rules §S8) — e.g. a manager's endpoint that returns leave requests outside their team |
| **Security** | injection, XSS, auth bypass, a permission checked on the client only, a secret in a log |
| **Reuse** | a new helper/hook/service that duplicates one already in the repo — cite the existing `file:L` |
| **Maintainability** | an `any`/`unknown` cast, a hardcoded customer or role name, a branch nobody can follow at 3am |
| **Team rules** | a violation of `.claude/skills/_shared/team-rules.md`, cited by rule ID |

The team rules are the sixth axis, and the one with no other home. Read
`.claude/skills/_shared/team-rules.md` once; never restate a rule body in the review. Tag each finding
with its ID so the author can look it up:

| ID | Look for |
|---|---|
| S1 | the diff touches a feature the ticket does not name — scope creep |
| S2 | a refactor riding along inside a feature or fix PR, or with no recorded G0 approval |
| S4 | an endpoint or request/response schema changed without its consumers updated in the same PR |
| S5 | a migration with no `down`, no backfill, or no recorded G0 approval; a data repair done by script instead of a migration |
| S6 | shared code changed with no evidence in the PR that the other customers, roles or flows still behave the same |
| S7 | per-customer, per-role or feature-flag behavior written inline instead of through a `CLAUDE.md` §Customization route |
| S8 | a query or endpoint that skips the ownership filter or the authorization check |
| B1, B2 | logic written where it was easy rather than where it belongs — business logic in a controller, a helper parked in an unrelated file (layers: stack profile §Layout) |
| B3 | a second way to do something the project already does one way (API calls, request validation, error handling, responses) |
| B5 | a new entry in `package.json` with no recorded G0 approval |
| B6 | new or corrected business logic with no unit test covering it |
| B7 | a secret, credential, token or test auth file in the diff; a new env var missing from `.env.example` |
| B8 | an N+1 read that one consolidated query would replace |
| B9 | user-facing text hardcoded instead of the i18n catalog (stack profile §i18n) |
| B10 | an `any` / `unknown` cast where a type can be declared |
| B11 | a comment over 3 lines, a comment restating obvious code, arrows or emoji in a comment |
| C2 | the PR description does not follow the required shape |

Project rules, in review order:

- **Never `any` or `unknown` casts.** Reach model and interface props through their declared types;
  extend the interface instead of casting. `Object.assign()` over spread-plus-cast.
- **Every query respects the ownership filter** (§S8). A missing filter is a BLOCKER, not a nit.
- **Customer / role / flag behaviour routes through `CLAUDE.md` §Customization** (§S7). An inline
  `if (customer === 'X')` or `if (role === 'Y')` in business code is a BLOCKER.
- **Access denial lives in middleware/guards**, not in a service body.
- **Migrations** ship with a working `down` and their backfill. A migration already applied in production is never edited. Creating one needs a recorded G0 approval (`team-rules.md` §S5).

Verdicts: ✅ ALIGNED · ⚠️ MINOR · 🛑 BLOCKER. Every finding names `file:L` and the failure it causes.
A finding you cannot state as a concrete failure is a preference — drop it.

## Step 1 — Ticket oracle (read first)

With a ticket ID (argument, or the branch name — team-rules §D1 makes the branch the bare ID), resolve
`<out>` with `.claude/skills/_shared/output-location.md` and ingest:

```bash
node .claude/skills/_lib/ticket.mjs ingest <ID> <out>
```

The ticket's `## Description` and `## Acceptance criteria` are the oracle for §S1 and for
Requirements Compliance. When `<out>/functional.md` exists (from `/refiner`) it outranks the ticket.
The `_shared/ticket-ingest.md` approval gate does not apply here: the ticket is read as an oracle,
nothing is built from it. Ticket missing → review without an oracle, say so in `## Scope`, and fill
Requirements Compliance with `n/a — no ticket`.

## Step 2 — Scope

Changed files: `_shared/verify-commands.md` §Changed files (base `git.mainBranch` from the config),
unless the user named a narrower scope (a PR, a commit, a file). Read each changed file for full
context, plus the imports, types and tests it touches.

## Step 3 — Prior review and prior audit

**Follow-up.** An initial review for this ticket/branch already exists (see Output location) → this
is a follow-up: use `templates/follow-up-review.md`, re-check every prior finding, and set `Base
review` to the **actual filename** of the initial review.

**Prior-audit awareness (MANDATORY when a base audit is passed).** When the user invokes the skill with
`--base-audit <path>` (or includes a prior audit doc reference in args), follow this baseline-aware flow:

1. **Read the prior audit** at the given path. Identify all items marked `RESOLVED`, `STALE`, or `FALSE` (verdicts that mean "do not re-flag").
2. **Build a no-re-flag list** of `file:line` anchors + finding labels from those items.
3. **During review, for each candidate finding:**
   - If the finding matches an entry in the no-re-flag list → mark as `RECONFIRMED RESOLVED` in a separate section instead of re-flagging in Critical / Warning / Suggestion.
   - If the finding does NOT match → emit normally.
4. **Output template addition:** include a section `## Reconfirmed Resolved (from prior audit)` between `## Suggestions` and `## Team rules compliance` (initial review; the follow-up template already has it). List each cross-referenced item with one line: `- <ID> <file:L>: <verdict in prior audit>`.

Goal: avoid reasserting items the user already decided. The reviewer's job on a follow-up pass is to flag NEW issues + verify resolutions still hold, NOT to repeat the original finding list.

**Auto-detect mode:** a path the user passes whose filename contains `AUDIT` / `audit` under `<docsDir>` or `.claude/code-reviews/` (including `<out>/audit/spec-audit*.md` from `/review-implementation`) is treated as a base audit even without the flag.

**Reasserted-but-fixed handling:** If the user explicitly asks to re-review an item marked RESOLVED in the prior audit, run the verification independently (re-read code at cited line), but tag the output as `RE-VERIFIED RESOLVED` or `REGRESSION DETECTED` — do not duplicate the original audit's reasoning chain.

## Step 4 — Review

- **≤15 changed files** → review inline against §What this review covers.
- **>15 changed files** → dispatch the `code-reviewer` agent, one per workspace with changes (`<api>`,
  `<web>`, then everything else as one group), all in one message so they run in parallel. Each prompt
  carries: the ticket path (`<out>/ticket.md`, plus `functional.md` when present), that group's file
  list, the template path, the no-re-flag list when a base audit applies, the line "Review only —
  never edit files; return the template's section bodies, do not write the review file", and the
  boilerplate from `_shared/token-rules.md` §Subagent prompt boilerplate. Main merges the returned
  sections, de-duplicates cross-workspace findings (an API contract change and its web consumer are
  one S4 finding), and writes the one file.

## Step 5 — Fast gate, read-only

Run the stack profile §Fast gate (typecheck + lint) on the changed files **without `--fix`** — a review
never edits code. Typecheck errors and lint errors in changed files are findings (B10 for casts;
otherwise Warnings). Errors outside the changed files are pre-existing: mention them in `## Scope`,
never as findings.

## Output location

| Case | Initial review | Follow-up review |
|---|---|---|
| Ticket known | `<out>/code-review.md` | `<out>/code-review-followup-<short-sha>.md` |
| No ticket | `.claude/code-reviews/<branch>.md` | `.claude/code-reviews/<branch>-followup-<short-sha>.md` |

`<short-sha>` = `git rev-parse --short HEAD`. `<out>` rows are in the `_shared/output-location.md`
registry.

**Templates (MANDATORY):**

Before writing ANY review file, you MUST:
1. Read the appropriate template file using the Read tool
2. Use that template's exact structure as the base for your output
3. Replace all `{{PLACEHOLDERS}}` with actual findings — do NOT generate the document structure from scratch

| Review type | Template to read first |
|---|---|
| Initial review | `templates/initial-review.md` |
| Follow-up review | `templates/follow-up-review.md` |

If a section has no findings (e.g., no critical issues), write "None." under the heading — do NOT remove the section.

**Content rules:**
- Never add attribution lines, signatures, or "reviewed by" footers to review files (team-rules §D3). The review content must end cleanly with the last section of findings.

## Step 6 — Report

Tell the user: the file path, counts per verdict, and the BLOCKERs one line each (`file:L` + failure).
Fixes are not this skill's job — BLOCKERs go to `/fix`; the user decides.
