# single-fix template

When: `fix(<ID>)` commit with exactly one ticket ID across branch commits, and its `pr-shape.md`
says `single-fix`.

Labels: `bug`, plus `frontend` / `backend` based on file changes.

> **Description shape is fixed** — `.claude/skills/_shared/team-rules.md` §C2: one context sentence
> (5 lines max), then a flat bullet list, then `Modified flows:`, then `Env vars:` (omit when empty).
> No group headings and no bold subsections inside the bullet list; each fact stated once.

```markdown
## Description 📝

<One context sentence: what this PR fixes and over which part of the system. 5 lines max.>

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

## Ticket 🎟️

- `<PARENT-ID>` (parent ticket) <!-- omit line if no parent ticket -->
- `<ID>`

## FYI 🙋

- <Notes: stacking, deferred work, related PRs, test policy. Use `> N/A` if nothing.>

## Screenshots 📸

> N/A — behavioral fix. Verify per Test plan below.

<!-- For UI-visible fixes, attach before/after screenshots. -->

## Test ✍️

Setup: <prereqs — role, account, dev server (stack profile §Run locally)>.

**<ID>** — <step-by-step test steps and expected behavior>.

Regression sweep:
- [ ] <Adjacent flow check — e.g. other roles or customers sharing this code unchanged (team-rules §S6).>
- [ ] Web test files covering the change pass (stack profile §Targeted tests — one file at a time, under `testLock`). <!-- omit if API-only -->
- [ ] API test files covering the change pass (stack profile §Targeted tests — one file at a time, under `testLock`). <!-- omit if web-only -->
```
