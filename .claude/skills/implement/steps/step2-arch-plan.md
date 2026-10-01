# Step 2: Impact Analysis + Architectural Plan

Architect sub-agent (`subagent_type: "architect"`). Prompt carries the `_shared/token-rules.md`
boilerplate plus the paths below — the agent definition carries its own method.

1. Read `<out>/requirements-spec.md` + `<out>/anchor-map.md`
2. Analyze impact — components, modules, files, DB tables, consumers (team-rules §S4)
3. Create the implementation plan (compressed): affected files w/ line numbers, DB changes, API
   changes, web changes, dependencies, **Scope tag** `BACKEND` / `FRONTEND` / `BOTH`, **Module order**
   (business modules in dependency order, each with its exit criteria — shape and rules in
   `.claude/skills/_shared/module-cascade.md` §1)
4. Bootstrap route (empty project) → `M0-shared` is the stack profile §Bootstrap, one phase per
   bootstrap step; the plan also names the modules the project will start with.

Save to: `<out>/implementation-plan.md`

## Plan format
```markdown
## Scope: BOTH

## Reuse + Pattern audit
| Need | Existing target (file:L) | Decision | Pattern (if new) | Justify |
|------|--------------------------|----------|------------------|---------|
| Flag gate for carry-over field | <route from CLAUDE.md §Customization> | Reused (add flag key) | — | — |

## BE changes
| File | Action | Depends on |
|------|--------|-----------|

## FE changes
| File | Action | Depends on |
|------|--------|-----------|

## API contract
<endpoint deltas: method, path, +fields w/ types, status codes, authorization>

## Module order
| # | Module | Children | BE phases | FE phases | Depends on | Consumes | Exit criteria (AC) |
|---|--------|----------|-----------|-----------|------------|----------|--------------------|
```

## Reuse + Pattern audit rules

Table shape, decision values, the sanctioned pattern set and the customization rules all live in
`.claude/skills/_shared/reuse-audit.md`. Read it; do not restate it here. The `/implement` deltas are in
its "Per-pipeline deltas" section.

## G0 gate — check before the approval gate

Scan the plan for the three triggers in `.claude/skills/_shared/team-rules.md`: a refactor (§S2), a
migration (§S5), a new library or dependency (§B5 — the stack profile §Bootstrap pre-approved set is
exempt while bootstrapping). Any hit and the pipeline **stops here** — Step 3 does not run. Read
`team-rules.md` → "G0 — traceability" for what the record must contain, then emit:

```
G0 approval required before implementation — <ID>

Trigger: <S2 refactor | S5 migration | B5 new dependency>

Record this on the ticket as the developer proposal
(node .claude/skills/_lib/ticket.mjs comment <ID> <proposal.md>):
  What: <the change>
  Why: <why it is needed for this ticket>
  Risk: <what it can break, and the rollback>

Then <techLead.name (techLead.github) from the config | you, the user — techLead is null> confirms on
the same ticket.
```

Then `AskUserQuestion`: G0 recorded — continue / Drop the trigger from the plan / Regenerate the plan.
Never assume approval. A refactor that is approved still ships in its own PR (§S2).

## APPROVAL GATE (per router protocol)
```
Implementation plan complete for <ID>.

Scope: <BACKEND / FRONTEND / BOTH>
Module order: M0 <module> → M1 <module> → … (<N> module gates in Step 4)
DB changes: <yes/no + summary>
G0 triggers: <none | S2 refactor / S5 migration / B5 dependency — approval recorded on the ticket>
API changes: <yes/no + summary>
Files to modify: <count>

Plan saved to: <out>/implementation-plan.md
```
Then `AskUserQuestion`: Approve / Request changes / Regenerate. HARD STOP until answered.
