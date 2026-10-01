# hr_solutions — Dev Guide

Installed by agent-kit. Keep this file short: it is auto-loaded into every session and every subagent.
Project facts go here; workflow rules live in `.claude/skills/_shared/`.

## Workflow

- Pipelines: `/refiner` → `/implement` | `/fix` | `/bug-bundle` → `/create-pr` → `/ship` → `/qa-report`
  → `/cherry-pick-deploy`. Side: `/rebase-main`, `/review-implementation`, `/code-reviewer`,
  `/requirements-analyst`. Map: `.claude/skills/README.md`.
- Tickets are local files in `tickets/` — only through `node .claude/skills/_lib/ticket.mjs`.
- Team rules: `.claude/skills/_shared/team-rules.md`. Verification: `.claude/skills/_shared/verify-commands.md`.
- Config: `.claude/kit.config.json`. Stack commands: `.claude/stacks/node-react-vite.md`.
- After any correction from the user: add a rule to `.claude/tasks/lessons.md`.

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
