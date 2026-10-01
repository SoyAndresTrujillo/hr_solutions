# Output location + auto-numbering — every skill that writes docs

`<docsDir>` comes from `.claude/kit.config.json` (default `.claude/docs/ai`). This is the handoff bus:
every artifact one skill leaves for another lives here. **No skill writes docs anywhere else** — one
exception: `/code-reviewer` with no ticket writes `.claude/code-reviews/<branch>.md`.

## Location — `<out>`

- With a parent ticket: `<docsDir>/<PARENT>/<ID>/`
- Standalone (the ticket is itself a parent, or has none): `<docsDir>/<ID>/`
- No ticket at all: `<docsDir>/<kebab-slug>/`

Docs and tickets always live in the **main checkout**, never inside a ticket worktree — otherwise each
worktree grows its own copy. Code, gates, tests and WIP commits run in the worktree.

## Parent detection

1. The ticket's `parent:` frontmatter field → use it.
2. The ticket's ID appears in another ticket's `blocked_by:` → that ticket is the parent.
3. `<docsDir>/<PARENT>/` already exists for a ticket named in the args → nest under it.
4. User passed a 2nd positional ID → treat as parent.
5. Else ask once before creating the folder.

## Auto-numbering (`NNNa_*.md` / `NNNb_*.md`)

List files in `<out>` matching `[0-9][0-9][0-9]*.md`, take the highest prefix + 1, start at `001`.

## Artifact registry — who writes, who reads

| File in `<out>` | Writer | Readers |
|---|---|---|
| `ticket.md`, `images/` | ticket-ingest (implement, fix, bug-bundle, code-reviewer, qa-report) | every later step |
| `functional.md`, `questions.md` | refiner | implement S1+S6, fix S1, qa-report P2, code-reviewer |
| `requirements-spec.md` | implement S1, requirements-analyst | implement S2, review-implementation |
| `test-design/pict-model.md` | requirements-analyst (optional PICT) | implement S1, fix S1 (when present) |
| `anchor-map.md` | implement S0, fix S0 | every later step |
| `implementation-plan.md` | implement S2 | implement S3-S6 |
| `NNNa_backend_*.md`, `NNNb_frontend_*.md` | implement S3, fix S3 | implement/fix S4 |
| `module-handoff/M<i>-<module>.md` | module-cascade | next module, resume |
| `bug-report.md`, `root-cause.md` | fix S1, S2 | create-pr (body) |
| `pr-shape.md` | fix S0, bug-bundle | create-pr |
| `qa/e2e.mjs`, `e2e-results.md`, `results-<env>.json` | e2e via implement S6 / fix S5 / bug-bundle P3 | qa-report P1 |
| `ticket-comment[-N].md`, `qa-results.md` | qa-report | qa-report next round |
| `ship-comment.md` | ship P1 | — (posted as the ticket comment) |
| `audit/spec-audit[-N].md` | review-implementation | user |
| `code-review[-followup-<sha>].md` | code-reviewer | code-reviewer follow-up |
| `<PARENT>/bug-bundle-<round>.md`, `<PARENT>/e2e-results-<round>.md` | bug-bundle | qa-report |
