---
name: implement
description: Full-stack implementation pipeline that takes a task (a local ticket or conversation context) from requirements to verified, working code. Runs ticket ingest, anchor map, complexity gate, estimate, requirements analysis, architectural plan with module order, phase planning, a module-by-module build/test/prove cascade, a targeted type/lint/test gate on the changed files, and behaviour validation in the running app, with user approval gates between steps. Use when the user says 'implement', 'implement this', 'implement task', 'build this ticket', '/implement <ID>', '/implement <ID> <PARENT> "short description"', or '/implement "use the conversation about X"' (session mode).
model: opus
effort: high
---

# /implement — Full Implementation Pipeline (thin router)

Task description → approved phases → code → green gate → proven in the running app. Sequential, with
hard approval gates between steps.

## Just-in-time loading (token rule)

This file is a router. Step detail lives in `.claude/skills/implement/steps/`. **Read a step file only
when entering that step. Never preload the whole `steps/` tree.**

Shared rules in `.claude/skills/_shared/`, read once at Step 0:
- `token-rules.md` — budget rules, pointer-not-paste, subagent prompt boilerplate
- `output-location.md` — `<out>` paths, parent-ticket detection, auto-numbering, artifact registry
- `ticket-ingest.md` — ticket ingest through `_lib/ticket.mjs` and its approval gate
- `team-rules.md` — the team's A/B/C/D development rules and the G0 approval gate. Cite by ID, never restate

Read on demand, never restated: `module-cascade.md` (Steps 2, 3, 4) · `verify-commands.md` (Steps 4, 5) ·
`anchor-map.md` (Step 0) · `reuse-audit.md` (Steps 2, 3).

Project config: `.claude/kit.config.json` (keys named in the steps). Stack commands and layout: the
stack profile `.claude/stacks/<stack>.md` (`stack` in the config).

## Workflow Orchestration

Source of truth: `CLAUDE.md` (auto-loaded into every subagent) + `_shared/team-rules.md`. **Prompts
point, never paste** — they carry the boilerplate block from `_shared/token-rules.md` → "Subagent
prompt boilerplate" and nothing more of the project's rules.

**Agents:** `Explore` (returns, never writes) · `architect` · `backend` · `frontend` ·
`general-purpose`. Each agent's model and effort come from its own frontmatter
(`.claude/agents/*.md`); built-ins inherit this router's model. Never pass a cheaper `model` at
dispatch.

## Input Modes

1. Ticket: `/implement <ID> [PARENT] "short description"` — missing ID → ask; missing parent → parent
   detection in `_shared/output-location.md`, else ask once (skip if standalone).
2. Session context: `/implement "use the conversation about the leave balance going negative"` —
   synthesize the conversation; ask for the ID + parent. No ticket yet → offer `ticket.mjs new`
   (`_shared/ticket-ingest.md`).

**The ticket is ingested once, at Step 0.** No later step re-reads the tracker — every step reads
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
| 0 + 0.5 | `steps/step0-anchor-map.md` | Resolve input, ticket ingest, resume detection, Explore pre-pass (main writes the anchor map), branch + worktree setup, ticket → `statusFlow.started`, complexity gate routing | `ticket.md` / `anchor-map.md` / worktree `<ID>` | ingest gate, routing report |
| 0.6 | `steps/step0.6-estimate.md` | Story point estimate from the anchor map + complexity score, written with `ticket.mjs estimate` | `points:` on the ticket | GATE |
| 1 | `steps/step1-requirements.md` | Requirements analysis via subagent + critic (reads `functional.md`, `test-design/pict-model.md` when present) | `requirements-spec.md` | GATE |
| 2 | `steps/step2-arch-plan.md` | Impact analysis + arch plan via `architect` (Reuse + Pattern audit, **Module order**, G0 check) | `implementation-plan.md` | GATE |
| 3 | `steps/step3-phases.md` | Specialist phase docs per scope (BOTH = BE→FE sequential), grouped by module | `NNNa_backend_phases.md` / `NNNb_frontend_phases.md` | GATE |
| 4 | `steps/step4-implementation.md` | **Module cascade** (`_shared/module-cascade.md`): per module, in order — develop BE→FE → test → fix (≤2 rounds) → prove its rows in the app → handoff → gate → WIP checkpoint | code + tests + `module-handoff/M*.md` | GATE per module |
| 5 | `steps/step5-verify-gate.md` | Cross-module integration gate over the whole branch: fast gate + covering test files, one at a time, bounded at 2 rounds | green branch | — |
| 6 | `steps/step6-validate-app.md` | Integration proof in the running app: full `qa/e2e.mjs`, every `DEFERRED` row, cross-module flows; coverage matrix + evidence | `e2e-results.md`, `qa/` | STOP — ship-word required |

Complexity gate may skip steps: trivial → hand off to `/fix`; lightweight → skip Step 2; bootstrap
(empty project) → always full. Step 0.6 runs on every route, before any skip.

**Refinement:** a functional definition is `/refiner`'s job, not this pipeline's. If the ticket is
underspecified, stop and say so rather than inventing behaviour in Step 1.

**Review:** `/code-reviewer` is not part of this pipeline. The user may run it on the branch after
Step 6, before `/create-pr`.

## Error Handling

- Sub-agent fails or returns incomplete → do not proceed, report.
- User rejects a step → ask what to change, re-run that step only.
- Requirements too vague → stop at Step 1, present the open questions.
- Subagent exceeds the budget guard → report progress, ask continue/adjust.
- G0 trigger (refactor, migration, new dependency) → stop at Step 2 until approval is recorded (team-rules §G0).
- Module fails its test, fix or app rows → stop at that module; the next module never starts (`_shared/module-cascade.md` §3d–§3e).
- Context summarized mid-pipeline → re-read this router + the current step file, restate gate state. In Step 4, the last `APPROVED` handoff is the last passed module gate (`module-cascade.md` §6).

## Quick Reference

```
/implement HR-42 "add leave balance carry-over"
/implement HR-57 HR-50 "payslip PDF shows overtime line"
/implement "use the conversation about the leave balance going negative"
```

Input → [ticket ingest → GATE] → [Explore → anchor map → worktree → complexity gate] → [estimate → GATE]
→ Requirements → [GATE] → Arch plan + module order → [GATE] → Phases by module → [GATE] →
[M1 build → test → fix → app rows → GATE] → [M2 …] → … → Integration gate → Validate in app → STOP
