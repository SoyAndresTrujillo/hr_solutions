# Review instructions

Used by the AI review that `/create-pr` Step 2.5 runs before every PR, and by `/address-review`.
Owner: the Tech Lead (`techLead` in `.claude/kit.config.json`; `null` → the user). Tune monthly from
which findings proved useful, then run `/eval-config`.

The bar for every finding: **real, not a supposition.** Name the concrete inputs, state or timeline
that produce the wrong result, with `file:line`. No scenario → no finding.

## Read first

From the ticket folder `<out>` (`.claude/skills/_shared/output-location.md`), when present:
`ticket.md`, `functional.md`, `requirements-spec.md` or `root-cause.md`, `implementation-plan.md`,
`e2e-results*.md`. The diff is `<git.mainBranch>...HEAD`. Open the whole function around each hunk,
its callers and a sibling path before judging it.

## Passes — tag each finding with its pass

Rule IDs are `.claude/skills/_shared/team-rules.md`.

1. **Ticket** — does the change do what the ticket and the functional definition ask? Missing,
   incomplete or misapplied acceptance criteria. Does the diff still match `implementation-plan.md` /
   `root-cause.md`?
2. **Ripple** — what the diff does not show: other customers, roles and flags on shared code (S6); a
   field another flow overwrites later; an API value the web side drops; existing rows a new rule now
   rejects; endpoint, DTO or schema consumers not updated (S4).
3. **Scope** — changes outside the ticket (S1): refactors (S2), renames, unrelated edits.
4. **Architecture** — the change lives where it belongs (B1), respects the layers (B2), uses the
   established way (B3), reuses before creating (B4), routes per-customer / per-role / flag behaviour
   through `CLAUDE.md` §Customization (S7).
5. **Security** — data ownership filter and authorization check (S8), secrets (B7), personal data in
   logs or error messages, N+1 queries on a hot path (B8).

## Severity

- **Important** — breaks behaviour, leaks or corrupts data, or breaches a team rule (S1–S9, B1–B11).
  `/create-pr` stops on an Important finding until it is fixed, waived with a reason, or the PR is
  opened as a draft.
- **Nit** — everything else (naming, style, small simplifications). **Report at most 5 nits**;
  summarize the rest as a count.

## Do not report

- Generated files, lockfiles, the auto-generated parts of migrations.
- Anything the stack profile §Fast gate (lint, type check) already enforces.
- Pre-existing problems in lines the change did not touch, unless the change makes them reachable.
- Style preferences with no rule behind them.

## Output

A table, most severe first: `Severity | Pass | file:line | Issue | Scenario`. Then one line:
`<N> Important, <M> Nits`.
