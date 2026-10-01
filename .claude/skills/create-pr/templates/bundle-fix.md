# bundle-fix template

When: branch commits contain `fix(<ID>)` referencing **2 or more distinct** ticket IDs (a parent's bug
round), or any `pr-shape.md` says `bundle-fix`.

Labels: `bug`, plus `frontend` / `backend` based on file changes.

> **Description shape is fixed** — `.claude/skills/_shared/team-rules.md` §C2: one context sentence
> (5 lines max), then a flat bullet list, then `Modified flows:`, then `Env vars:` (omit when empty).
> No group headings and no bold subsections inside the bullet list; each fact stated once.

```markdown
## Description 📝

<One context sentence: parent-ticket context and what the bundle accomplishes. 5 lines max.>

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

<!-- The per-ticket index below is the one table C2 allows: it maps bullets to sub-tickets. -->
| Ticket | Scope | Summary |
|--------|-------|---------|
| <ID-1> | <API \| Web \| API+Web> | <one-line summary> |
| <ID-2> | <API \| Web \| API+Web> | <one-line summary> |
| <ID-3> | <API \| Web \| API+Web> | <one-line summary> |
<!-- One row per sub-ticket -->

## Tickets 🎟️

- `<PARENT-ID>` (parent ticket)
- `<ID-1>`
- `<ID-2>`
- `<ID-3>`

## FYI 🙋

- <Notes: test policy across the bundle, related closed PRs, mid-bundle reworks, deferred sub-tickets.>

## Screenshots 📸

> N/A — behavioral fixes. Verify manually per Test plan below.

<!-- Attach screenshots for visible-UI sub-tickets only. -->

## Test ✍️

Setup: <prereqs — role, account, dev server (stack profile §Run locally)>.

**<ID-1>** — <step-by-step test steps and expected behavior>.

**<ID-2>** — <step-by-step test steps and expected behavior>.

**<ID-3>** — <step-by-step test steps and expected behavior>.

Regression sweep:
- [ ] <Unaffected role / customer / flow sharing the changed code still works as before (team-rules §S6).>
- [ ] Web test files covering the change pass (stack profile §Targeted tests — one file at a time, under `testLock`).
- [ ] API test files covering the change pass (stack profile §Targeted tests — one file at a time, under `testLock`).
```
