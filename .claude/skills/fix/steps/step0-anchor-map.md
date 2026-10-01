# Step 0: Resolve Input + Anchor Map

1. Determine input mode. Get `<ID>` + symptom description. Resolve `<out>` and the parent with
   `.claude/skills/_shared/output-location.md`.
2. **PR-shape question (every invocation) via `AskUserQuestion`.** Skip only if `<out>/pr-shape.md`
   already exists for this bug — reuse its value. Invoked by `/bug-bundle` → `bundle-fix`, no question.
   - **single** → one PR for this fix
   - **bundle** → part of a multi-bug PR (typically a parent ticket's bug round)
3. **Branch setup — before writing anything** (`_shared/team-rules.md` §D1). Branch name is the bare
   ticket ID; `git.worktreesDir` and `git.mainBranch` come from `.claude/kit.config.json`.
   - **single** → branch `<ID>`. Already on it (or inside its worktree) → stay. Else:
     ```bash
     git worktree add <git.worktreesDir>/<ID> -b <ID> <git.mainBranch>
     ```
     Branch already exists (resume) → same command without `-b <ID>`, ending in `<ID>`.
   - **bundle** → the round shares ONE branch named after the parent, `<PARENT>`. `/bug-bundle`
     creates it; a standalone bundle run joins it the same way (create it with the command above,
     `<PARENT>` in place of `<ID>`, if the round has not started one).
   - Never `checkout -b` in the main checkout. From here on every code edit, gate, test and commit
     runs inside the worktree (absolute paths). `<out>` and every `ticket.mjs` call stay in the main
     checkout (`_shared/output-location.md`): one copy of docs and tickets, not one per worktree.
4. Create `<out>` if missing. Persist the PR-shape answer to `<out>/pr-shape.md` as a single line:
   `single-fix` or `bundle-fix`. NO other content — `/create-pr` reads only the first non-empty line.
5. Check existing artifacts in `<out>` — if bug-report/root-cause/patch docs exist, ask: reuse and skip
   ahead, or regenerate?
6. **Ticket ingest — run it here, once.** Follow `.claude/skills/_shared/ticket-ingest.md`: it writes
   `<out>/ticket.md` (+ `images/`) and carries its own HARD-STOP approval gate. **No later step
   re-reads the tracker** — every one reads the file this step wrote. A ticket too underspecified to
   work from is a refinement problem, not a pipeline problem: stop and point the user at `/refiner`
   rather than inventing behaviour.
7. **Start the ticket.** Re-read the status (`node .claude/skills/_lib/ticket.mjs status <ID>`).
   Already at `statusFlow.started` → skip. Else
   `node .claude/skills/_lib/ticket.mjs transition <ID> --to "<statusFlow.started>"`. Never the parent.
8. Dispatch `subagent_type: "Explore"` — **never pass a cheaper `model` here.** This pass IS the
   codebase exploration and its `Reuse candidate (file:L)` column feeds the root cause and the patch
   phases; a lazily-grepped `none` propagates:
   - Find files implicated by symptom (grep error messages, function names, route paths).
   - Map call sites of suspect function/component.
   - Identify nearest test file for regression coverage.
   - **RETURN the complete anchor map markdown as its final message.** Explore is read-only — MUST NOT attempt Write. Prompt must state: _"Your final message IS the anchor-map.md content, nothing else. Do not write files."_
9. **Main context writes** returned content to `<out>/anchor-map.md` via Write tool. Malformed return
   (missing tables) → re-dispatch once with format reminder; else fall back to `general-purpose` agent
   (has Write) — leave it at the session model, this is the recovery path.

## Anchor map format

> Table shape, the citation rules and the Explore-retry rule live in
> `.claude/skills/_shared/anchor-map.md`. Read it once; the layout below is the filled-in example.
```markdown
## Suspect anchors

### BE
| File | Line | Symbol | Why suspect | Reuse candidate (file:L) | Test file |
|------|------|--------|-------------|--------------------------|-----------|
| payroll.service | L573 | calculateNet() | Stack trace points here | roundCurrency @ common/money:14 | payroll.service.test |

### FE
| File | Line | Symbol | Why suspect | Reuse candidate (file:L) | Test file |
|------|------|--------|-------------|--------------------------|-----------|
| useLeaveBalance | L42 | useLeaveBalance() | Balance stale after approval | useLeaveRequests @ leave/hooks/useLeaveRequests:18 | useLeaveBalance.test |

### Glossary
<short codes if needed>
```

## Reuse + playbook tagging rules
- `Reuse candidate` required for every row. `none` only if grep confirms zero hit.
- Customization rows (per-customer, per-role, feature flag): cite the route from `CLAUDE.md`
  §Customization, never an inline conditional site.
- Suspect row matches a smell from `.claude/design-patterns/PATTERN_PLAYBOOK.md` **Smell Index**
  (status `if`-chain → State, inline flag/role checks → Strategy, etc.) → tag row with smell +
  candidate pattern for the Step 2 architect. Bug fixes prefer Reused/Extended — `New` pattern only if
  the minimal patch genuinely requires it.
