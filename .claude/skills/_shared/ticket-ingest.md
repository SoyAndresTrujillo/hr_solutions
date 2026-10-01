# Ticket ingest — shared by implement, fix, bug-bundle, code-reviewer, qa-report

Tickets are local markdown files: `<ticketsDir>/<ID>.md` (config `.claude/kit.config.json`). The only
interface is `node .claude/skills/_lib/ticket.mjs` — never hand-edit ticket frontmatter.

## Ingest (Step 0 of every pipeline)

```bash
node .claude/skills/_lib/ticket.mjs ingest <ID> <out>
```

- `<out>` from `_shared/output-location.md`.
- Writes `<out>/ticket.md` and copies attachments to `<out>/images/`.
- Ticket missing → offer to create it: `ticket.mjs new --type <t> --title "<t>" [--parent <P>]`, then
  ask the user to fill `## Description` and `## Acceptance criteria` (or fill them from the
  conversation and show the result). Never invent acceptance criteria.

**Approval gate (HARD STOP — AskUserQuestion):** show `Saved: <out>/ticket.md (<N> attachment(s))` plus
the file, ask Approve / Request changes / Regenerate. Do not enter Step 1 in the same turn.

## Other tracker operations (same script)

| Need | Command |
|---|---|
| Children of a parent (bug round) | `ticket.mjs list <PARENT>` |
| Current status | `ticket.mjs status <ID>` |
| Move status | `ticket.mjs transition <ID> --to "<STATUS>"` (names from `statusFlow`) |
| Comment + evidence | `ticket.mjs comment <ID> <file.md> --attach <files…>` |
| Story points | `ticket.mjs estimate <ID> <points>` |

Re-read the status right before any transition. Never transition a parent ticket from a child's pipeline.
