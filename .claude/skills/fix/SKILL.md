---
name: fix
description: "Bug-fix pipeline. Repro → root-cause → minimal patch → regression test → verify in the app → PR. Lighter than /implement — no greenfield architecture step; enforces minimal diff and root-cause discipline. Args: `<ID> [<PARENT>] [\"short bug description\"]`, or a quoted description alone (session context). Use when the user says 'fix', '/fix <ID>', 'bug fix', 'patch this', 'fix this bug', or reports a defect with a ticket ID."
model: opus
effort: high
---

# /fix — Bug-Fix Pipeline (thin router)

> **Model routing** — `opus` / `high`, same reasoning as `/implement`: the step files route the workers, and this router is what decides whether a root cause is actually the root cause and whether a gate passed. Root-cause discipline is the whole value of this pipeline over a patch.

Repro → root cause → minimal patch → regression test → verify → PR. Sequential, with hard approval
gates between steps.

## Just-in-time loading (token rule)

This file is a router. Step detail lives in `.claude/skills/fix/steps/`. **Read a step file only when
entering that step. Never preload the whole `steps/` tree.**

Shared rules in `.claude/skills/_shared/`, read once at Step 0:
- `token-rules.md` — budget rules, pointer-not-paste, subagent prompt boilerplate
- `output-location.md` — output paths (`<out>`), parent-ticket detection, auto-numbering
- `ticket-ingest.md` — local ticket ingest + its approval gate, and every other tracker operation
- `team-rules.md` — the team's A/B/C/D development rules and the G0 approval gate. Cite by ID, never restate

Read on demand, never restated: `verify-commands.md` (Steps 4, 5) · `anchor-map.md` (Step 0) ·
`reuse-audit.md` (Step 2) · `module-cascade.md` (Step 4, multi-module patches only).

Project values (branches, statuses, approver, environments) come from `.claude/kit.config.json`.
Commands come from the stack profile `.claude/stacks/<stack>.md` (`stack` in the config).

## Workflow Orchestration

Source of truth: `CLAUDE.md` (auto-loaded into every subagent) and `_shared/token-rules.md`.
**Subagent prompts carry the boilerplate block from `token-rules.md` → "Subagent prompt boilerplate"
and nothing more of the project's rules.**

**Agents:** `Explore` (returns, never writes) · `backend` · `frontend` · `architect` ·
`code-reviewer` · `general-purpose`. Slim by design — project context comes from the auto-loaded
`CLAUDE.md`; never re-inline it into a prompt.

## Input Modes

1. Ticket: `/fix <ID> [<PARENT>] "short bug description"` — missing ID → ask; missing parent → ask
   once if the bug belongs to a parent ticket (skip if standalone). Parent detection:
   `_shared/output-location.md`.
2. Session context: `/fix "the null employee id we saw in the logs"` — synthesize the conversation;
   ask for the ID + parent (or a slug). No ticket yet → offer to create one
   (`_shared/ticket-ingest.md` → `ticket.mjs new --type bug`).

**The ticket is ingested once, at Step 0.** No later step re-reads the tracker for it; every step reads
`<out>/ticket.md`.

## Approval Gate Protocol (every gate)

> **HARD STOP.** Each gate is a genuine user decision point.
> 1. Present the gate summary (template in the step file).
> 2. `AskUserQuestion`: Approve — continue / Request changes / Regenerate this step.
> 3. Never execute the next step in the same turn as artifact generation without approval.
> 4. "Request changes" → ask what, re-run the current step only.
> 5. **After context summarization:** re-read this SKILL.md + the current step file; restate the
>    approved-gate state in the first message after resume.

## Pipeline

| Step | Read first | Does | Output | Gate |
|------|-----------|------|--------|------|
| 0 | `steps/step0-anchor-map.md` | Resolve input, PR-shape question, branch setup (team-rules §D1), ticket ingest, status → `statusFlow.started`, Explore pre-pass (main writes the anchor map) | `ticket.md` / `pr-shape.md` / `anchor-map.md` | ingest + PR-shape |
| 1 | `steps/step1-bug-report.md` | Repro + symptom via subagent | `bug-report.md` | GATE |
| 2 | `steps/step2-root-cause.md` | Root cause + minimal-patch plan via `architect` (Reuse + Pattern audit) | `root-cause.md` | GATE |
| 3 | `steps/step3-patch-phases.md` | Patch phases per scope, ≤1 file each, last phase = regression test; G0 check | `NNNa_backend_patch.md` / `NNNb_frontend_patch.md` | GATE |
| 4 | `steps/step4-implement.md` | Single agent per scope, JSON result, main verifies with the fast gate (bounded, 2 rounds) | code + tests | — |
| 5 | `steps/step5-verify-and-pr.md` | Changed-file gate, prove the fix in the running app, then PR on the ship-word | `e2e-results.md`, `qa/`, PR | STOP — ship-word required |

All outputs land in `<out>` (`_shared/output-location.md`).

**Root cause, not symptom.** Before patching, grep every caller of the function being changed. One
guard in the shared function is a smaller diff than a guard in every caller — and patching only the
path the ticket names leaves every sibling caller broken.

## Error Handling

- Subagent fails or scope creeps → STOP, report.
- Root cause unclear after Step 2 → present alternatives, do not guess.
- Repro fails → return to Step 1, do not patch.
- Regression test passes pre-patch → root cause wrong, return to Step 2.
- Still failing after 2 verify-fix rounds, or the error count is not dropping (oscillation) → wrong
  root cause, return to Step 2. Do not keep dispatching fix agents.
- Context summarized mid-pipeline → re-read this router + the current step file, restate gate state.

## Differences vs `/implement`

| Concern | `/implement` | `/fix` |
|---------|--------------|--------|
| Step 1 | Requirements analysis | Bug report (repro) |
| Step 2 | Architectural plan | Root cause + minimal-patch plan |
| Step 3 | Greenfield phases | Patch phases (≤1 file each, last = test) |
| Step 4 | Module cascade, BE then FE per module | Single agent per scope, sequential (cascade only when 2+ modules) |
| Mandatory | Reuse-first + pattern audit | Reuse-first + **minimal diff** + **regression test** |
| Output prefix | `NNNa_backend_phases.md` | `NNNa_backend_patch.md` |

## Quick Reference

```
/fix HR-42 "net pay rounds down for part-time employees"
/fix HR-57 HR-50 "leave balance not refreshed after approval"
/fix "the null employee id we saw in the logs"
```

Input → [PR-shape → branch → ticket ingest → GATE] → [Explore → anchor map] → Bug report → [GATE] →
Root cause → [GATE] → Patch phases → [GATE] → Implement → Changed-file gate → Verify in app → [PR] → Done
