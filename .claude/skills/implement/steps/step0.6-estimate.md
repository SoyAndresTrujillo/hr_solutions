# Step 0.6: Story Point Estimate → ticket

Runs right after the Step 0.5 complexity gate, on **every** route — including the trivial route that
hands off to `/fix`, which never reaches Step 3. Skip only when there is no ticket ID (session-context
slug) or when `points:` already carries a value the user does not want changed.

## Inputs

Read nothing new. Estimate from what Step 0 already produced:
- `anchor-map.md` — API + Web row count, new-file count, migration rows, new endpoints, test files.
- The Step 0.5 complexity score and route.
- `ticket.md` — acceptance criteria count, whether behaviour is new or a visibility/branch change.

## Which hours

**Hours mean wall-clock effort with this pipeline** — Steps 1-6 session time plus human review, PR and
CI — not the hours the work would take a developer by hand. The two scales can come out ~6x apart
(e.g. ≈28 hand-hours vs ≈3-5h of session time); the ticket is pointed on the pipeline scale. State the
basis in the gate output so the number is never read on the wrong scale, and say so if the team's
board is still pointed on hand-hours — mixing the two corrupts velocity.

Exclude from the hours: waiting on a G0 approval, product-owner answers, or QA. Those are calendar, not
effort.

## Scale (team table)

Valid points are `estimateScale` in the config; `ticket.mjs estimate` rejects anything else. The table
below maps the default scale. The config scale differs → ask the user once for its hour mapping.

| Points | Hours | Analogy |
|--------|-------|---------|
| 1 | 0.5-2 | 30 mins to 2 hours |
| 2 | 4 | Half a day |
| 3 | 8 | A full day |
| 5 | 16-20 | Half week (2 to 3 days) |
| 8 | 40 | 1 week |
| 13 | 60 | 1 week and a half |
| 21 | 80 | 2 weeks |
| 34 | >80 | Too big — needs splitting |

## Method

1. Estimate **hours**, not points: sum the anchor-map work, then add the pipeline's own overhead —
   tests (team-rules §B6 applies to every new branch), the Step 5 gate, and Step 6 proof in the running
   app. Step 6 is routinely the long pole: check whether the role, account and data the ticket needs
   actually exist locally before assuming it is quick.
2. Map hours to the nearest bucket in the table. Never invent a value off the scale.
3. Adjust one bucket up for any of: a migration (§S5 G0 wait), a new feature-flag or permission key
   (`CLAUDE.md` §Customization round trip), 3+ modules touched, an email/PDF/background-job surface, or
   a bootstrap route (stack profile §Bootstrap as `M0-shared`).
4. Adjust one bucket down when the change is a pure visibility/flag branch over existing data with a
   sibling already shipped to copy.
5. Landing on **34** is a stop, not an estimate: report that the ticket needs splitting and ask the
   user how to proceed before Step 1.

## Approval gate (HARD STOP — AskUserQuestion)

Print, then ask Approve / Adjust / Skip ticket write:

```
Story point estimate: <points> (<hours>h, <analogy>) — pipeline wall-clock basis
Basis: <N> API files, <M> Web files, <K> new files, <migration? yes/no>, <endpoints> new endpoints
Drivers: <one line — what makes it this size>
Adjustment: <rule 3 or 4 applied, or none>
Ticket: <ID> points currently <value|empty> → <points>
```

- **Approve** → run the write.
- **Adjust** → ask for the number, re-validate it is in `estimateScale`, then write.
- **Skip ticket write** → record the estimate in the gate output only, continue.

Never write the field without an explicit approval in the same turn.

## Write

```bash
node .claude/skills/_lib/ticket.mjs estimate <ID> <points>
```

Run from the project root (not the worktree). Failure (value off the scale, ticket missing) → report it
once and continue; the estimate is not a blocker for the pipeline.
