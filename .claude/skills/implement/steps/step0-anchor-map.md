# Step 0: Resolve Input + Resume Detection + Explore Pre-Pass + Branch Setup + Complexity Gate

1. Determine input mode (ticket / session context). Extract or ask for the ID (prefix = `ticketPrefix`
   in the config) + description.
2. Create the output folder `<out>` if needed (location rules: `.claude/skills/_shared/output-location.md`).
3. Check existing artifacts in `<out>`:
   - `requirements-spec.md` exists → ask: _"Requirements spec exists. Use it and skip to Step 2, or regenerate?"_
   - `implementation-plan.md` also exists → ask: _"Implementation plan exists too. Skip to Step 3 (phases), or redo from Step 2?"_
   - `module-handoff/M*.md` exist → resume Step 4 per `_shared/module-cascade.md` §6.
3.5. **Ticket ingest — run it here, once.** Follow `.claude/skills/_shared/ticket-ingest.md`
   (`node .claude/skills/_lib/ticket.mjs ingest <ID> <out>`): it writes `<out>/ticket.md` (+ `images/`)
   and carries its own HARD-STOP approval gate. **No later step re-reads the tracker** — every one reads
   the file this step wrote. A ticket too underspecified to work from is a refinement problem, not a
   pipeline problem: stop and point the user at `/refiner` rather than inventing behaviour.
4. Dispatch `subagent_type: "Explore"` — **never pass a cheaper `model` here.** This pass IS the
   codebase exploration (Step 1 forbids a second one), and its `Reuse candidate (file:L)` column feeds
   the Step 2 audit and the Step 3 phases. A lazily-grepped `none` propagates all the way to a
   parallel implementation of an existing target:
   - Identify all files to be modified (from the ticket)
   - Gather exact line numbers for edit targets (types, functions, imports, JSX/template insertion points)
   - Map existing patterns (naming, import styles, test patterns)
   - Empty project → list the stack profile §Layout paths the change will create, `Line` = `new`
   - **RETURN the complete anchor map markdown as its final message.** Explore is read-only — MUST NOT
     attempt Write. Prompt must state: _"Your final message IS the anchor-map.md content, nothing else.
     Do not write files."_
5. **Main context writes** the returned content to `<out>/anchor-map.md` via Write. Malformed return
   (missing tables) → re-dispatch once with a format reminder; else fall back to `general-purpose`
   (has Write) — the recovery path.
6. **Branch setup** — see "Branch + worktree" below. Runs before Step 0.5; no code is written before it.

## Anchor map format

> Table shape, the citation rules and the Explore-retry rule live in
> `.claude/skills/_shared/anchor-map.md`. Read it once; the layout below is the filled-in example.

```markdown
## Anchors

### API
| File | Line | Symbol | Why relevant / suspect | Reuse candidate (file:L) | Test file |
|------|------|--------|------------------------|--------------------------|-----------|
| <api>/src/modules/leave/leave.service.ts | 118 | approve() | Insert balance check before save | assertBalance: leave.service.ts:64 | leave.service.test.ts |

### Web
| File | Line | Symbol | Why relevant / suspect | Reuse candidate (file:L) | Test file |
|------|------|--------|------------------------|--------------------------|-----------|
| <web>/src/modules/leave/components/LeaveRequestForm.tsx | 42 | after dates row | Insert balance hint | useLeaveBalance: hooks/useLeaveBalance.ts:9 | LeaveRequestForm.test.tsx |

### Glossary
<short codes, e.g. CO = carry-over days>
```

## Reuse candidate column rules

- Required for every row. `none` only if grep confirms zero hit.
- Customization rows (per-customer, per-role, feature flag): cite the route from `CLAUDE.md`
  §Customization, never an inline conditional site.
- Helper/component rows: grep by behaviour, cite the hit. The subagent must run `grep -rn` before
  declaring `none`.
- Row matches a smell from `.claude/design-patterns/PATTERN_PLAYBOOK.md` **Smell Index** (status
  `if`-chain → State, per-customer `if` chain → Strategy, oversized service → Facade split) → tag the
  row with the smell + candidate pattern for the Step 2 architect.

## Branch + worktree (team-rules §D1)

Code is written only on branch `<ID>`, in its own worktree. Config keys: `git.mainBranch`,
`git.worktreesDir`.

1. Already on branch `<ID>` (`git branch --show-current`) → nothing to do.
2. `git worktree list` shows `<git.worktreesDir>/<ID>` → reuse it (resume).
3. Else:
   ```bash
   git worktree add <git.worktreesDir>/<ID> -b <ID> <git.mainBranch>
   ```
   Branch `<ID>` exists without a worktree → `git worktree add <git.worktreesDir>/<ID> <ID>`.
4. **No git repo** (empty project) or `<git.mainBranch>` has no commit yet → ask the user **once**
   whether to run `git init -b <git.mainBranch>` and create an empty root commit
   (`git commit --allow-empty -m "chore: initial commit"`, no attribution trailer — §D3). Never do it
   silently. Declined → stop; the pipeline does not write code outside a branch.

From here on, every code edit, gate, test and WIP commit runs inside the worktree (absolute paths).
`<out>` and every `ticket.mjs` call stay at the project root (the main checkout): docs and tickets
are one copy, not one per worktree. Session mode with no ticket (slug only) → the branch is the slug.

**Start the ticket.** Re-read the status (`ticket.mjs status <ID>`); if it is not already
`statusFlow.started` or later, run
`node .claude/skills/_lib/ticket.mjs transition <ID> --to "<statusFlow.started>"`. Never transition a
parent from a child's pipeline (`_shared/ticket-ingest.md`).

## Step 0.5: Complexity Gate

After the anchor map is written, classify scope. Goal: avoid full Spec/Plan/Phases overhead for
trivial diffs.

**Score inputs (from anchor-map.md):** file count (API + Web rows), new-file count, DB migration
presence, new endpoint count, bootstrap signal.

| Score | Path | Skip |
|-------|------|------|
| **Bootstrap:** empty project — no project manifest (for the Node profile, no `package.json`) | **Full pipeline**, stack profile §Bootstrap is `M0-shared` in the Step 2 `Module order`. Never downgraded by `--quick`. | none |
| ≤3 files, 0 new files, 0 DB, 0 new endpoints, est. <50 net lines | **Hand off to `/fix`.** Writes minimal repro+patch+test directly from the anchor map. | Steps 1, 2, 3 |
| 4-10 files OR 1-2 new files, 0 DB, ≤1 new endpoint | **Lightweight path.** Write `requirements-spec.md` (Step 1) but SKIP the Step 2 architect. Phase docs directly from spec + anchor map; Step 3 writes the `Module order` table (`module-cascade.md` §1). | Step 2 |
| 11+ files OR DB migration OR 2+ new endpoints OR new module surface | **Full pipeline.** | none |

**User overrides:** `--quick` / "small fix" / "trivial" / "1-line" / "tiny tweak" / "just <verb>" →
force `/fix`. `--full` / "design carefully" / "architect this" / "I want a plan" → force full pipeline.

**Tell the user the routing decision:**
```
Complexity gate: <score> → <path>
Anchor map shows N files, M new files<, bootstrap: stack profile §Bootstrap as M0-shared>.
Branch: <ID> in <git.worktreesDir>/<ID>. Ticket: <status>.
Routing to <full | lightweight | /fix>.
Override: rerun with --full or --quick if needed.
```

**Next:** Step 0.6 (`steps/step0.6-estimate.md`) — story point estimate. Runs on every route,
including the trivial `/fix` handoff, before the route is taken.
