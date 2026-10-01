# Step 3: Patch Phases

Based on scope, dispatch specialist subagent(s). Prompts carry the boilerplate from
`.claude/skills/_shared/token-rules.md` → "Subagent prompt boilerplate" (CLAUDE.md is auto-loaded — no paste).

- BACKEND only: `subagent_type: "backend"` → `<out>/NNNa_backend_patch.md`
- FRONTEND only: `subagent_type: "frontend"` → `<out>/NNNb_frontend_patch.md`
- BOTH (rare for fixes): SEQUENTIAL — BE first → FE second (FE reads BE patch for contract changes).

`NNN` auto-numbering: `.claude/skills/_shared/output-location.md`.

## Patch phase format (compressed)
```markdown
## P1 — <goal title>
Goal: <one line>
Depends: none

### Steps
1. <file> L<n> <symbol> → <where exactly>:
   ```
   <literal code to insert/change>
   ```
2. <next step — cite reuse anchor file:L when consuming existing target>

### Verify
Stack profile §Fast gate — typecheck filtered to <scope file> + lint <file> with fix.

## P2 — Regression test
Goal: lock fix behavior
Depends: P1

### Steps
1. <test file> → add describe block "<bug repro case>" with both directions (e.g. flag off / flag on).

### Verify
Stack profile §Targeted tests — <test file> only, under `flock <testLock>`.
```

## Phase rules
- Each phase ≤ 1 file ideally. Multi-file only by tight coupling.
- Last phase ALWAYS = regression test.
- Each phase has a `Verify` block (fast gate + targeted test) that points at the stack profile section —
  never a pasted command.
- No phase touches files outside `root-cause.md` blast radius without flagging.
- **Team rules** — `.claude/skills/_shared/team-rules.md` applies. §S1 keeps the patch inside the
  ticket, §S4 makes an endpoint or schema change update its consumers in the same patch, §B6 gives the
  fixed logic a unit test.
- **Reuse compliance** — phases consume `Existing target` (file:L) from the Step 2 audit when
  Decision = Reused/Extended. Cite anchor per step. Parallel implementation of existing target = phase
  rejection.
- **Pattern compliance** — follow the pattern named in the Step 2 audit. New pattern mid-phase →
  consult `.claude/design-patterns/PATTERN_PLAYBOOK.md` (layer + trigger), declare in phase doc,
  respect its guardrails and "Not used" list. Inline `if (customer === 'X')` / `if (role === 'Y')` =
  rejection (§S7).

## G0 gate — check before the approval gate

Same three triggers as `/implement` Step 2: refactor (§S2), migration (§S5), new dependency (§B5) in
`.claude/skills/_shared/team-rules.md`. A fix that hits one **stops here** with the G0 proposal draft
(what / why / risk) and waits for the approver's confirmation: `techLead.name` in
`.claude/kit.config.json`, or **the user** when it is `null`. Record both parts on the ticket per
team-rules §G0 (`ticket.mjs comment <ID> <file>`). A fix rarely needs a refactor — if the phases want
one, the usual answer is a narrower patch, not an approval request (§S2: an approved refactor ships in
its own PR anyway).

## APPROVAL GATE (per router protocol)
```
Patch phases for <ID>:
- Phases: <N>
- New tests: <N>
- Files modified: <count>
- G0: <none | S2/S5/B5 — approved by <approver> on <date>>

Saved: <list>

Approve to implement?
```
Then `AskUserQuestion`. HARD STOP until answered.
