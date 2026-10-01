# Project-Specific Considerations

> Guidance the spec MUST address. Each item is high-value: missing it leads to bugs, rework, or
> production incidents. The checks are generic; the **answers** come from the project's own sources —
> read them, never assume.

## Where the project answers come from

| Source | Gives you |
|---|---|
| `CLAUDE.md` §Customization | the routes for per-customer, per-role and feature-flag behavior |
| `CLAUDE.md` §Auth, stack profile §Auth | how a user is identified and authorized |
| `CLAUDE.md` §Modules, `.claude/rules/modules/*.md` | module lifecycles, cross-module dependencies, gotchas |
| `.claude/rules/*.md` | path-scoped rules for the API and web workspaces |
| stack profile `.claude/stacks/<stack>.md` §Layout, §Migrations, §i18n | where schemas, migrations and UI text live |
| `.claude/skills/_shared/team-rules.md` | the rule IDs cited below |

## Special Considerations

- **Always check data isolation (team-rules §S8):** Who owns the records this feature reads or
  writes (an employee's own leave requests, a manager's team, one company's payroll)? Does every
  query keep that filter?
- **Always check permissions:** What roles are required (employee, manager, HR admin, payroll admin)?
  Where is access denied — middleware/guard, never a service body (`CLAUDE.md` §Customization).
- **Always check customization routes (§S7):** Can a customer, role or feature flag change this
  behavior? Name the route from `CLAUDE.md` §Customization; never an inline conditional.
- **Always check async side effects:** Does this trigger background jobs, queued work, scheduled
  runs (e.g. a nightly payroll calculation), emails or outbound integrations?
- **Always check audit requirements:** Should this action be logged (who approved the leave request,
  who changed a salary, when)?
- **Always check form-to-data mapping:** Every form field → request schema → stored field. A field the
  schema does not declare is dropped.
- **Always check lifecycle interactions:** How does this interact with the module's existing states
  (a leave request's Pending → Approved → Taken; a payroll run's Draft → Closed)? Read the module doc.
- **Always check consumers (§S4):** An endpoint, schema or exported contract that changes updates
  every consumer.
- **Always check data changes (§S5):** New or changed stored data needs a migration with a working
  `down` and a rule for existing records.
- **Always check user-facing text (§B9):** Labels, emails, notifications, exports, error messages —
  sourced from the i18n catalog (stack profile §i18n) when the project has one; no hardcoded text.
- **Always check configuration (§B7):** A new env var is registered in `.env.example`.

## Three Questions Rule

When in doubt, always ask:
1. What happens when this fails?
2. Who can and cannot do this?
3. How does this affect other parts of the system?
