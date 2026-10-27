# hr_solutions — Dev Guide

Installed by agent-kit. Keep this file short: it is auto-loaded into every session and every subagent.
Project facts go here; workflow rules live in `.claude/skills/_shared/`.

## Workflow

- Pipelines: `/refiner` → `/implement` | `/fix` | `/bug-bundle` → `/create-pr` → `/ship` → `/qa-report`
  → `/deploy-all` | `/cherry-pick-deploy`. Side: `/address-review`, `/rebase-main`,
  `/review-implementation`, `/code-reviewer`, `/requirements-analyst`, `/eval-config`.
  Map: `.claude/skills/README.md`.
- Hooks enforce what prose cannot (`.claude/settings.json`). When one stops you, fix the cause; never
  delete its marker or edit `settings.json` mid-task.
- Tickets are local files in `tickets/` — only through `node .claude/skills/_lib/ticket.mjs`.
- Team rules: `.claude/skills/_shared/team-rules.md`. Verification: `.claude/skills/_shared/verify-commands.md`.
- Config: `.claude/kit.config.json`. Stack commands: `.claude/stacks/node-react-vite.md`.
- After any correction from the user: add the lesson to `.claude/tasks/lessons.md`, then route it:
  a rule the agent must see while editing → one line in `.claude/rules/code-rules.md`; a rule that
  must always hold → a hook in `.claude/hooks/` plus its case in `.claude/hooks/test-hooks.sh`; a
  class of agent mistake → an eval case in `.claude/evals/cases/` (run with `/eval-config`).
- After editing this file, a rule, a skill, an agent, a hook or the model routing: run `/eval-config`.
- Every pipeline run keeps a live checklist in `<out>/progress.md` (`_shared/progress-tree.md`).

## Testing

- Changed files only, one test process at a time under `flock <testLock>` — commands in
  `.claude/skills/_shared/verify-commands.md` + stack profile §Targeted tests. Never a full-repo suite.
- During /fix, `.claude/state/test-lock.json` limits test edits to the regression spec (`test-lock` hook).

## Git

- Never commit to the main branch. Branch = bare ticket ID, in a worktree under `git.worktreesDir`.
- Commits: `feat(<ID>): …`, `fix(<ID>): …`, `wip(<ID>): …`. No self-attribution (team-rules §D3).
- Push, PR, merge, tag and deploy need an explicit OK (§D2); the `outward-gate` hook asks before
  each one. Migrations and new dependencies need `<out>/g0-approved.md` first (`g0-gate` hook).

## Stack

Profile `node-react-vite` — see `.claude/stacks/node-react-vite.md` §Layout. Decisions taken at bootstrap:

- Database / ORM: none (mock data in code, HR-1)
- Auth: none (public read-only)
- TypeScript pinned ~6.0 (typescript-eslint peer <6.1); lint = ESLint flat config per workspace

## Reuse

- Reuse-first order: (1) reuse existing → (2) extend existing → (3) create new with a named pattern
  from `.claude/design-patterns/PATTERN_PLAYBOOK.md`.
- Grep the repo for an existing function, service, hook, component or helper before writing new code.
  Cite the target `file:L` in the phase doc.
- Never author the same logic at two call sites: extract when the second copy would appear.
- **Exit clause:** if reuse forces a >20% rewrite of the target or adds unrelated coupling, justify it
  in the phase doc, then create new with a declared pattern.
- No `any` / `unknown` casts. Extend types.

## Customization

Where per-customer, per-role and feature-flag behavior lives. Fill as the app grows; until then:

- Feature flags: _(route, e.g. `<api>/src/common/flags.ts` + `useFlag()` hook)_
- Roles / permissions: _(route, e.g. authorization middleware + `usePermissions()` hook)_
- Access denial belongs in middleware/guards, never inside a service body.
- Never inline `if (customer === 'X')` or `if (role === 'Y')` in business code.

## Auth

None — public read-only app, no login (HR-1 Q-G). Automation needs no token.

## Modules

Business modules and their docs: `.claude/rules/modules/README.md`.
