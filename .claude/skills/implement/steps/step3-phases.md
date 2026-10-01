# Step 3: Specialist Implementation Phases

Based on the **scope from Step 2**, dispatch specialist sub-agents for phase-by-phase plans.

Sub-agent prompts carry the `_shared/token-rules.md` boilerplate plus:
- **Use anchor map line numbers** — offset/limit reads for files >400 lines
- **Compressed format** — no prose, tabular where possible
- **Literal before/after snippets** for complex edits
- **Each phase has a verification command** — pointer to stack profile §Fast gate, scoped to the phase files
- **Group by module** — phases sit under the `Module order` headings from Step 2 (`# M1 — <module>` →
  `## M1.P1`), with each module's exit criteria and consumed contracts. Shape:
  `.claude/skills/_shared/module-cascade.md` §2. A phase that fits no module, or needs a module out of
  order → back to Step 2. Lightweight route (Step 2 skipped) → the first phase doc opens with the
  `Module order` table (`module-cascade.md` §1).
- **Reuse compliance** — phases consume `Existing target` from the Step 2 audit when Decision =
  Reused/Extended. Cite `file:L` per phase step. A new reuse candidate surfaces → grep first, cite the
  hit; declare `New` only with the exit-clause justification (`CLAUDE.md` §Reuse). Parallel
  implementation of an existing target = rejection.
- **Team rules** — `.claude/skills/_shared/team-rules.md` applies to every phase. Cite by ID; never
  paste. §B1/§B2 decide which file a step writes to (stack profile §Layout), §B6 makes every logic
  phase carry unit tests, §B9 sends every UI string to the i18n catalog (stack profile §i18n), §B11
  caps comments.
- **G0 re-check** — a phase that introduces a refactor (§S2), a migration (§S5) or a new dependency
  (§B5) that Step 2 did not clear sends the pipeline back to the Step 2 G0 gate. Do not dispatch
  Step 4 on an uncleared trigger.
- **Pattern compliance** — follow the pattern decided in the Step 2 audit. A new pattern surfaces →
  consult `.claude/design-patterns/PATTERN_PLAYBOOK.md` (layer + trigger), declare it in the phase doc,
  respect its guardrails and the per-layer "Avoid" lines. An inline `if (customer === 'X')` / `if (role === 'Y')` =
  rejection (§S7).

| Scope | Agent | Output |
|-------|-------|--------|
| BACKEND only | `backend` | `NNNa_backend_phases.md` |
| FRONTEND only | `frontend` | `NNNb_frontend_phases.md` |
| BOTH | **SEQUENTIAL**: BE first → FE second (FE reads BE phases for API contracts) | both files |

Agents read: requirements spec + implementation plan + anchor map. `NNN` auto-numbering:
`.claude/skills/_shared/output-location.md`.

## Phase format
```markdown
# M1 — <module>
Exit criteria: AC-1, AC-2
Consumes: <contract from an earlier module | none>

## M1.P1 — <goal title>
Goal: <one line>
Depends: none

### Steps
1. <file> L<n> <symbol> → <where>:
   ```ts
   <literal code>
   ```

### Verify
<stack profile §Fast gate command for this workspace, filtered to the phase files>
```

## APPROVAL GATE (per router protocol)
```
Implementation phases complete for <ID>.

Files created: <list with paths>
Phase summary (per module):
- M1 <module>: BE <N> · FE <N> · exit AC-…
- M2 <module>: BE <N> · FE <N> · exit AC-…
```
Then `AskUserQuestion`: Approve / Request changes / Regenerate. HARD STOP until answered.
