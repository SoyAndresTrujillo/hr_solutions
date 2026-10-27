---
paths:
  - "api/**/*.ts"
  - "web/**/*.ts"
  - "web/**/*.tsx"
---

# Code rules that apply on every edit

Loaded whenever product code is touched, inside or outside a pipeline. Each rule comes from a
repeated mistake (`.claude/tasks/lessons.md`) or a team rule (`.claude/skills/_shared/team-rules.md`)
and, where it can be, is regression-tested by `.claude/evals/`.

**How this file grows.** When a lesson names a rule the agent must see while editing, `/fix` Step 5.3
(or whoever writes the lesson) adds one line here under the matching heading, ending with the ticket
ID. One line per rule; the why stays in `lessons.md`. A rule that must always hold also becomes a hook
in `.claude/hooks/`; a class of agent mistake also gets a case in `.claude/evals/cases/`.

## Schemas and types

- A field the ticket calls required or mandatory is non-optional: no `?`, no `.optional()`, no
  default that hides a missing value. If backward compatibility worries you, flag it; do not
  downgrade the requirement.
- A schema file declares schemas only. A transform or validator shared by 2+ fields goes in its own
  file and is imported; that file imports nothing that imports the schema back (no barrel cycle).

## Web text

- No user-facing text is hardcoded in a component. Add the string to the catalog in stack profile
  §i18n and read it the same way the surrounding component does (team-rules §B9).

## Everywhere

- Follow an approved spec literally. A better idea is proposed in your answer, not implemented.
- No `as any`, `as unknown`, `as never` or `: any` (team-rules §B10, enforced by the `no-any-casts`
  hook). Declare or extend the type.
- No per-customer, per-role or per-ID literal branches (`if (customerId === 7)`). Route through
  `CLAUDE.md` §Customization (team-rules §S7).
