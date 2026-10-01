# feature template

When: `feat(<ID>)` commit. New functionality (vs bug fix).

Labels: `enhancement`, plus `frontend` / `backend` / `infrastructure` based on files.

> **Description shape is fixed** — `.claude/skills/_shared/team-rules.md` §C2: one context sentence
> (5 lines max), then a flat bullet list, then `Modified flows:`, then `Env vars:` (omit when empty).
> No group headings and no bold subsections inside the bullet list; each fact stated once.

```markdown
## Description 📝

<One context sentence: what this PR adds and over which part of the system. 5 lines max.>

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

### API contract changes <!-- omit if web-only -->

- `<METHOD> <route>` — <new endpoint | added field | optional → required>.
- Schema/DTO: <field name + type + validation>.
- Migration: <migration file name and behavior, or N/A>.

## Ticket 🎟️

<!-- Case A: ticket has a parent — list the parent first, then the ticket. -->
- `<PARENT-ID>` (parent ticket) <!-- omit line if no parent ticket -->
- `<ID>`
<!-- Case B: the ticket IS the parent — drop the parent line above and tag the ticket itself: -->
<!-- - `<ID>` (parent ticket) -->

## FYI 🙋

- <Dependencies on other in-flight PRs.>
- <Feature flag / customization route (CLAUDE.md §Customization), default state, rollout plan.>
- <Follow-up tickets created.>

## Screenshots 📸

<!-- Required for visible-UI features. Attach before/after or new-state captures. -->

> <Screenshot or video required>

## Test ✍️

Setup: <prereqs — role, account, feature flag, dev server (stack profile §Run locally)>.

**<ID>** — <happy-path walkthrough>.

Acceptance criteria:
- [ ] <Criterion 1 from the ticket.>
- [ ] <Criterion 2.>
- [ ] <Criterion 3.>
- [ ] Feature is gated behind the documented flag; flag off → no behavior change.
- [ ] Web test files covering the change pass (stack profile §Targeted tests — one file at a time, under `testLock`).
- [ ] API test files covering the change pass (stack profile §Targeted tests — one file at a time, under `testLock`).
```
