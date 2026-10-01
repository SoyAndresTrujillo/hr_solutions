# refactor template

When: `refactor(<ID>)` commit. Behavior-preserving structural change (no new feature, no bug fix).

**Preconditions (`.claude/skills/_shared/team-rules.md` §S2):** the refactor has a recorded G0 approval
on the ticket from the Tech Lead (`techLead.name` in `.claude/kit.config.json`; `null` → the user),
it ships in this PR alone — never folded into a feature or fix PR — and it preserves existing behavior
unless the Tech Lead agreed otherwise.

Labels: `refactor`, plus `frontend` / `backend` based on files.

> **Description shape is fixed** — `.claude/skills/_shared/team-rules.md` §C2: one context sentence
> (5 lines max), then a flat bullet list, then `Modified flows:`, then `Env vars:` (omit when empty).
> No group headings and no bold subsections inside the bullet list; each fact stated once.

```markdown
## Description 📝

<One context sentence: what was restructured, over which part of the system, and the behavioral
equivalence claim. 5 lines max.>

- <Behavior unit 1 — something the system now does, validates or shows differently, verifiable on its own.>
- <Behavior unit 2.>
- <Behavior unit 3.>
- <Behavior unit 4 — typically 4-8 bullets total. One line each. One feature's plumbing (scheduler, provider, config, env vars) goes in a single bullet, not one per file.>

Modified flows:
- <Flow in plain language, e.g. leave request approval>
- <Flow, e.g. payroll run export>

<!-- Omit the whole Env vars section when no environment variable changed. -->
Env vars:
- Added `<VAR_NAME>`
- Removed `<VAR_NAME>`

### Behavioral equivalence

This change is intended to be behavior-preserving. Concretely:
- <Public API / component contract unchanged: …>
- <Existing tests pass without modification: …>
- <Any deliberate behavioral diff: …, or "None".>

## Ticket 🎟️

- `<PARENT-ID>` (parent ticket) <!-- omit line if no parent ticket -->
- `<ID>` — G0 approval recorded in its comments

## FYI 🙋

- <Motivation: tech debt ticket, deprecation, perf, readability metric.>
- <Before/after numbers if applicable (file size, function length, type coverage, perf).>
- <Tests modified intentionally — name them and why.>

## Screenshots 📸

> N/A — refactor; no UI change expected.

## Test ✍️

Setup: <dev server (stack profile §Run locally) if user-flow verification is needed; otherwise omit>.

Equivalence verification:
- [ ] Web test files covering the refactored code pass unchanged (stack profile §Targeted tests — one file at a time, under `testLock`).
- [ ] API test files covering the refactored code pass unchanged (stack profile §Targeted tests — one file at a time, under `testLock`).
- [ ] Manual smoke: <one happy-path flow that exercises the refactored surface — describe.>

### Risk & blast radius

- **Surface area**: <files / modules / public APIs touched.>
- **Callers affected**: <count + critical ones to review.>
- **Rollback plan**: <how to revert if a regression surfaces post-merge.>
```
