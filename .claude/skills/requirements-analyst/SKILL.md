---
name: requirements-analyst
description: Transform vague or incomplete tickets into comprehensive, actionable development specifications. Use when the user says 'analyze ticket', 'requirements analysis', 'spec this ticket', 'analyze this task', 'requirements-analyst', or provides a ticket description that needs clarification and detailed spec writing.
---

# Software Requirements Analyst

Transform vague or incomplete tickets into comprehensive, actionable development specifications that minimize bugs and reduce rework.

> **Output**: ALL specification output goes to `<out>/requirements-spec.md` — `<out>` resolved by
> `.claude/skills/_shared/output-location.md` (parent from the ticket's `parent:` frontmatter, so the
> spec lands in `<docsDir>/<PARENT>/<ID>/` when the ticket has one — never flat beside it).
> **No Implementation**: This skill produces specs, not code. Implementation comes after spec approval.

---

## File Map

This skill is split across multiple files to keep token usage low. Read the relevant file when you reach that phase of work — do NOT pre-load everything.

| File | When to read | Contents |
|------|-------------|----------|
| `workflow.md` | After Step 1, when starting Step 2 (codebase exploration) | Detailed Steps 1-4 with anti-hallucination 3-phase verification loop, Agent Behavior Rules |
| `spec-framework.md` | During Step 3 Phase A (drafting spec) and Phase C (final refinement) | All output templates: TASK ANALYSIS REPORT, BUSINESS CONTEXT, CRITICAL QUESTIONS CHECKLIST, USE CASES UC1-UC7, ACCEPTANCE CRITERIA, TESTING CHECKLIST, ASSUMPTIONS & RISKS, COMMUNICATION TEMPLATE, DECISION LOG |
| `project-checks.md` | During Step 2 Phase B (gap detection) and Step 3 (drafting + critic review) | Project guardrails drawn from `CLAUDE.md`, `.claude/rules/`, the stack profile and team rules (data isolation, permissions, customization routes, side effects, audit, user-facing text) and the Three Questions Rule |

---

## Workflow Overview

> Anti-hallucination strategy: Steps 2 and 3 use multi-phase verification loops. Steps 1, 4, 5 are single-pass.

1. **Step 1 — Parse Input** (single pass): Extract ticket ID, raw description, domain area, resolve `<out>`
2. **Step 2 — Explore Codebase** (3-phase verified): Phase A (3 parallel subagents: API / Web / Data & Schema) → Phase B (consolidate + detect contradictions) → Phase C (re-verify against source)
3. **Step 3 — Generate Spec** (3-phase critique loop): Phase A (draft from verified exploration) → Phase B (critic subagent review) → Phase C (refine based on critic findings)
4. **Step 4 — Present Summary** (single pass): Brief chat summary of verification, confidence score, complexity, top questions, risks, file location
5. **Step 5 — PICT Test Design** (optional — only when `/pict-test-designer` is installed and the heuristic passes): generate the shared-contract `pict-model.md` for downstream skills

Read `workflow.md` for the full step-by-step procedure with subagent prompts and report structures.

---

## Step 5 — PICT Test Design (optional)

**Availability check first.** `/pict-test-designer` is an optional external plugin. It is installed
when it appears in the session's skill list or `.claude/skills/pict-test-designer/SKILL.md` exists.
Not installed → log *"PICT skipped — /pict-test-designer not installed. Downstream skills will run
without PICT context."* and end the skill. Never block on it.

When installed, evaluate the PICT heuristic gate after Step 4 completes.

### Heuristic Gate

Invoke `/pict-test-designer` IF ALL hold:

| Signal | Threshold |
|---|---|
| Distinct input params | ≥ 3 |
| Values per param (avg) | ≥ 2 |
| Cross-param interactions in spec | Yes |
| Multi-role × multi-customer × multi-action signals | Strong trigger |
| Security boundary (data isolation, role-based access) | Strong trigger |

### Action

When gate passes:
1. Invoke `/pict-test-designer` with the ticket ID and the path `<out>/requirements-spec.md`.
2. It writes `<out>/test-design/pict-model.md` with the frozen contract sections (`## PICT Model`, `## Generated Test Cases`, `## Critical Paths`, `## QA Notes`).
3. Present the model to the user for approval — once approved, it becomes the **shared contract** read by `/implement` Step 1 and `/fix` Step 1 (registry: `_shared/output-location.md`).

### Skip Conditions

- Single-parameter feature (e.g. add one field to the employee profile)
- Pure cosmetic / copy change
- No combinatorial interactions

When skipped, log: *"PICT gate failed — feature is single-path. Downstream skills will run without PICT context."*

### Read Contract for Downstream Skills

The plugin's own `SKILL.md` → "Cross-Skill Invocation Contract" section says which skills read or write which sections of `pict-model.md`.

### Criterion Coverage Rule

For every Acceptance Criterion in the spec, ensure at least one PICT case maps to it (cite case # in `## Critical Paths`). If a criterion has no matching case → either add the case to the PICT model OR flag `MODEL-GAP` in `## QA Notes`. Downstream steps use this to check criterion ↔ case ↔ code alignment per row.

---

## Non-Negotiable Rules

- **EXPLORE FIRST** — Always search the codebase for existing patterns before writing the spec
- **WRITE TO FILE** — All output goes to `<out>/requirements-spec.md`
- **BE SPECIFIC** — Replace all placeholders with actual values from codebase exploration
- **FLAG UNKNOWNS** — Mark every assumption with "CLARIFICATION NEEDED"
- **PROJECT CONTEXT** — Every spec must address data isolation, permissions, and audit logging (see `project-checks.md`)
- **COPY-PASTE READY** — Acceptance criteria and testing checklist should be directly pasteable into the ticket's `## Acceptance criteria` (use templates from `spec-framework.md` verbatim)
- **NEVER SKIP VERIFICATION** — Steps 2 and 3 MUST complete all 3 phases. Do not shortcut to save time
- **SUBAGENTS ARE MANDATORY** — Step 2 Phase A requires 3 parallel subagents; Step 3 Phase B requires 1 critic subagent. Do not inline these as mental steps — actually launch the subagents
- **NO UNVERIFIED CLAIMS** — Every technical claim in the final spec must be either VERIFIED (confirmed by reading code) or marked CLARIFICATION NEEDED. There is no middle ground
- **CONTRADICTIONS ARE SIGNALS** — When subagents disagree, that's the most valuable signal. Spend extra effort resolving contradictions — they reveal where hallucinations happened
- **CONFIDENCE SCORE IS TRUTHFUL** — The X/10 score reflects actual verification, not optimism. A score of 6/10 with stated unknowns is better than 9/10 with hidden assumptions
