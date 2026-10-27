# Ticket comment — the short shape every skill uses

Applies to **every** comment a skill writes through `node .claude/skills/_lib/ticket.mjs comment`, and
to comments written by hand. Not to be confused with the `<out>/ticket-comment[-N].md` drafts, which
follow this shape.

## Why

A comment exists to give the approver (`techLead.name` in `.claude/kit.config.json`; `null` = the user)
what they need to decide. They read the code for details and ask when they need more. A long comment
hides the decision.

## Format

Use this shape. Skip any section that does not apply. **The whole comment has at most 10 bullets.**

- **Summary:** what was done, 1 to 3 bullets.
- **Findings:** what you found, one line each.
- **Decisions:** what you decided, one line each, with its reason.
- **Needs:** who must do what (approval, question, action), if anything.
- **Links:** only if relevant (PR, attachment, related ticket).

```markdown
@<github handle> <one-line context, optional>

**Summary:**
- <what was done>

**Findings:**
- <one finding>

**Decisions:**
- <decision>, because <reason>.

**Needs:**
- <person>: <action>.

**Links:**
- PR: <url>
```

## Rules

1. Count bullets before writing. More than 10: cut, merge, or move detail to the PR body or an attached
   file, and link it under **Links**.
2. One line per bullet. No sub-bullets, no tables, no headings, no long code blocks. A single short
   command in backticks is allowed only when the Needs bullet asks someone to run it.
3. No history or narration ("first I tried...", "as discussed..."). Present state and what is needed.
4. Written for people: no internal paths (`.claude/...`), skills, memory, or AI tooling.
5. Never paste a secret value (tokens, passwords, keys). Name the variable only.
6. Mention only the people who must act (`techLead.github` for the approver); put their ask under
   **Needs**.
7. When a long artifact is requested (runbook, analysis), attach it with `--attach` and keep the comment
   in this shape; the attachment is listed under it automatically.
8. Updating an existing comment: rewrite that dated section of `<ticketsDir>/<ID>.md` in this shape, do
   not append a second one below it.
9. No self-attribution lines (`_shared/team-rules.md` §D3).

## Write

Ticket comments are local files — no outward gate here; a calling skill's own gate still applies.

```bash
node .claude/skills/_lib/ticket.mjs comment <ID> <file.md> [--attach <file> ...]
```

Then re-read the ticket (`ticket.mjs show <ID>`) and check: bullet count ≤ 10, attachments listed.
