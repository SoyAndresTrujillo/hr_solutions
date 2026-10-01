# Reuse + Pattern audit — table shape

Produced in the planning step (arch plan / root cause), consumed by phase docs and every
implementation subagent.

| Need | Existing target (file:L) | Decision | Pattern (if new) | Justify |
|------|--------------------------|----------|------------------|---------|

- `Decision` ∈ Reused / Extended / Replaced / New.
- `Justify` is mandatory for Replaced or New — cite the reuse exit clause in `CLAUDE.md` §Reuse.
- Required whenever the change adds a prop, branch, helper or extension point. Skip only for pure
  deletions and value-only changes.
- Before naming a pattern, read `.claude/design-patterns/PATTERN_PLAYBOOK.md` (match layer + trigger)
  and respect its guardrails and per-layer "avoid" list.
- Phases consume `Existing target` when Decision = Reused/Extended. A parallel implementation of an
  existing target is a plan rejection.

## Sanctioned pattern set

Strategy · Template Method · Facade · State · Builder · Command · Factory Method ·
Chain of Responsibility · Adapter · Proxy · Decorator · Composite · Observer · Opt-in flag.

## Per-pipeline deltas

- `/implement` — required for every scope; the architect fills it from the anchor map. `Pattern` is
  mandatory when Decision = New or Extended-with-a-new-abstraction.
- `/fix` — a row is required when the patch adds a prop, branch, helper or extension point. Fixes
  default to Reused/Extended; `New` needs the exit clause. Inline conditionals on a customer or role
  name are a plan rejection.
