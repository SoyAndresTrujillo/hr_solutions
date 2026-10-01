# Step 4: Implementation (Post-Approval)

When the user approves the phases and says "proceed" / "implement" / "go":

## Dispatch: module cascade

Execute the approved phases **one business module at a time**, in the `Module order` from Step 2.
Each module is developed, tested, fixed and proven in the app, then stops at a **module gate**
before the next module starts. The loop, the handoff file, the WIP checkpoint and the gate template
are owned by `.claude/skills/_shared/module-cascade.md` §3–§6. Read it now; do not restate it.

Per module `Mi`: `backend` agent for the `Mi` BE phases, then `frontend` agent for the `Mi` FE phases
(Agent tool, sequential). A module with no BE or no FE phases skips that agent. Never two modules at
once — the next module reads the previous module's handoff.

All code work happens in the Step 0 worktree (`<git.worktreesDir>/<ID>`, branch `<ID>`); the WIP
checkpoint commits land there, never pushed (team-rules §D2).

Result schema (all dispatch modes):
```json
{
  "type": "object",
  "properties": {
    "phases_done": { "type": "string" },
    "files_modified": { "type": "integer" },
    "tsc_new_errors": { "type": "integer" },
    "eslint_clean": { "type": "boolean" },
    "tests_pass": { "type": "integer" },
    "tests_fail": { "type": "integer" },
    "blocked": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["phases_done", "files_modified", "tsc_new_errors", "eslint_clean", "blocked"]
}
```

`tsc_new_errors` / `eslint_clean` = the typecheck and lint halves of stack profile §Fast gate, whatever
tools the profile names. Plus the cascade fields (`module`, `contracts`, `deviations`) from
`module-cascade.md` §3b.

> Agents carry their method in their own definition; project context comes from the auto-loaded
> `CLAUDE.md`. Do not re-inline either into a prompt.

## Subagent prompt template

```
<ID> <BE|FE> module M<i> — <module>. Phases M<i>.P1-P<N>.

Worktree (all edits, gates and tests run here): <absolute path to <git.worktreesDir>/<ID>>

Constraints:
- Q-A: <one line>

Anchor map: <path>
Phases: <path> § M<i>
Handoffs (read first, real contracts win over the plan): <module-handoff/M*.md paths | none>

Rules:
<paste the boilerplate block from `_shared/token-rules.md` → "Subagent prompt boilerplate", unchanged>
- Follow the pattern named in the Step 2 audit. New pattern need → `.claude/design-patterns/PATTERN_PLAYBOOK.md` (layer + trigger).

Verify after all phases: the fast gate in `.claude/skills/_shared/verify-commands.md`.
```

Paths, never pasted file text. The agent reads the anchor map and the phase doc itself.

## Main context verification — per module

After each module's agents return, main runs the module's **test → fix → app proof → handoff → gate**
from `.claude/skills/_shared/module-cascade.md` §3c–§3h. The fast gate, targeted tests and the
bounded fix rounds are owned by `.claude/skills/_shared/verify-commands.md` — do not restate them.
The app proof (§3e) follows `steps/step6-validate-app.md` §6.1–§6.3 and appends to `<out>/qa/e2e.mjs`.
Report the `blocked` arrays in the module gate. A module that stops (round 2 still failing, a
behaviour deviation, a failed app row twice) ends Step 4 — the next module never starts.

After the last module is approved, continue to Step 5 (cross-module integration gate).
