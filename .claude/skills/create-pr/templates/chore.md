# chore template

When: `chore(...)` commit. Dependency bumps, CI/workflow tweaks, config, build tooling, lint config,
git hooks.

Labels: `dependencies` (deps only) OR `infrastructure` (CI / workflows / infra-as-code). No `bug` label.

> **Description shape is fixed** — `.claude/skills/_shared/team-rules.md` §C2: one context sentence
> (5 lines max), then a flat bullet list, then `Modified flows:`, then `Env vars:` (omit when empty).
> No group headings and no bold subsections inside the bullet list; each fact stated once.

```markdown
## Description 📝

<One context sentence: what changed and why, with the exact version bumps or workflow file names.
5 lines max.>

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

- `<ID>` <!-- replace section with `> N/A` if no ticket -->

## FYI 🙋

- <Breaking changes in bumped deps and how they were resolved.>
- <Workflows added/modified, what they trigger on, secrets needed.>
- <Local dev impact: requires a dependency reinstall, requires an env var, etc.>

## Screenshots 📸

> N/A.

## Test ✍️

Automated checks:
- [ ] Fast gate green on the changed files of every touched workspace (`.claude/skills/_shared/verify-commands.md` §Fast gate).
- [ ] Test files covering the changed files pass (stack profile §Targeted tests — one file at a time, under `testLock`).
- [ ] CI workflow run on this PR is green.
- [ ] Local dev still boots after the change (stack profile §Run locally; reinstall deps if they moved).

<!-- For dependency bumps, paste the relevant outdated-report / changelog notes inline. -->
```
