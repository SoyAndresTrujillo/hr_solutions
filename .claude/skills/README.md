# Skills — orchestration map

Legend: `──▶` invokes or hands off · `◆` agent · `⚙` script · `▣` writes · `◇` reads · `⛔` approval gate.
All docs live under `<out>` = `<docsDir>/[<PARENT>/]<ID>/` (`_shared/output-location.md`, which also
holds the artifact registry). Tickets live in `tickets/` and are touched only through `⚙ _lib/ticket.mjs`.

## Lifecycle

```
tickets/<ID>.md   (⚙ ticket.mjs new)
│
├─ DEFINE
│   ├─ /refiner ──────────────── functional definition, repo read-only
│   │     ◆gap-reviewer ∥ ◆surface-reviewer ▣ functional.md, questions.md
│   └─ /requirements-analyst ─── standalone spec ──▶ /pict-test-designer (if installed)
│         ▣ requirements-spec.md, test-design/pict-model.md
│
├─ BUILD
│   ├─ /implement ──(trivial: ≤3 files)──▶ /fix
│   ├─ /fix
│   └─ /bug-bundle <PARENT> ──(once per bug)──▶ /fix
│         all validate through ──▶ /api-verify | /e2e | /import-e2e | /run-app
│
├─ PR
│   ├─ /create-pr   ◀── /fix S5 · /bug-bundle P4 · /implement S6 (suggested)
│   └─ /rebase-main (when the PR is behind or conflicting)
│
├─ MERGE + QA
│   ├─ /ship ──▶ /qa-report
│   └─ /qa-report ──▶ /e2e (scenario on the QA environment)
│
├─ RELEASE
│   └─ /cherry-pick-deploy ── last production tag → cherry-pick → tag → staging / production
│
└─ REVIEW (user-run)
    ├─ /review-implementation ──routes──▶ /fix | /bug-bundle | /implement
    └─ /code-reviewer ──(large diffs)──▶ ◆code-reviewer
```

## Pipelines

```
/implement <ID> [PARENT] "desc"
├─ S0   ⚙ ticket ingest ⛔ · branch <ID> in a worktree · ◆Explore ▣ anchor-map.md
├─ S0.5 complexity: trivial → /fix · light (skip S2) · full · empty project → bootstrap M0
├─ S0.6 ⚙ ticket.mjs estimate ⛔
├─ S1   draft ◆ + critic ◇ functional.md, pict-model.md ▣ requirements-spec.md ⛔
├─ S2   ◆architect ▣ implementation-plan.md (+ Module order, reuse audit) · G0 ⛔
├─ S3   ◆backend → ◆frontend ▣ NNNa/NNNb phases ⛔
├─ S4   module cascade: per module ◆backend→◆frontend → tests → ≤2 fixes ▣ module-handoff ⛔ → wip commit
├─ S5   changed-file gate
└─ S6   /api-verify | /e2e | /import-e2e ▣ qa/e2e.mjs, e2e-results.md ⛔ ship-word ──▶ /create-pr

/fix <ID> [PARENT] "desc"
├─ S0 ingest + PR shape ▣ pr-shape.md · branch · ◆Explore ⛔
├─ S1 ▣ bug-report.md ⛔ · S2 ◆architect ▣ root-cause.md ⛔ · S3 patch phases (G0) ⛔
├─ S4 implement (cascade when 2+ modules, ≤2 fix rounds)
└─ S5 /e2e | /api-verify ▣ qa/e2e.mjs ⛔ ship-word ──▶ /create-pr · ▣ tasks/lessons.md

/bug-bundle <PARENT>
├─ P1 ⚙ ticket.mjs list + git log ▣ <PARENT>/bug-bundle-<round>.md ⛔
├─ P2 ──▶ /fix per bug · P3 local matrix ▣ e2e-results-<round>.md
├─ P4 ──▶ /create-pr (bundle-fix) · P5 ⚙ ticket.mjs comment/transition
└─ ──▶ /qa-report per ticket after deploy

/create-pr → fast gate → commit → ⛔ push → template (◇ pr-shape.md, root-cause.md) → gh pr create → ⚙ transition prOpened
/ship      → ⚙ comment + prOpened → CI → ciGreen → deploy workflows → C3 ⛔ squash-merge → QA deploy ──▶ /qa-report
/qa-report → /e2e on qa → verdict ▣ ticket-comment.md ⛔ post → ⚙ transition qaFail|qaPass ▣ qa-results.md
/cherry-pick-deploy → ⛔ list → ⛔ env → cherry-pick → ⛔ tag push → ⛔ deploy → health check
/rebase-main → preflight → rebase (conflicts ◆backend|◆frontend|◆architect) → gate → ⛔ force-with-lease
```

## Shared resources

| Resource | Owns | Used by |
|---|---|---|
| `.claude/kit.config.json` | project facts: prefix, statuses, branches, envs, deploy, tech lead | every skill and script |
| `.claude/stacks/<stack>.md` | every stack command and the layout | agents, verify-commands, run-app, api-verify |
| `_shared/team-rules.md` | S/B/C/D rules, G0 gate | all pipelines, agents |
| `_shared/verify-commands.md` | gate rules, test lock, 2-round cap | implement, fix, create-pr, rebase-main, agents |
| `_shared/module-cascade.md` | one module at a time + handoffs | implement S2-S6, fix S4 |
| `_shared/ticket-ingest.md` | ingest gate + tracker operations | implement, fix, bug-bundle, qa-report, code-reviewer |
| `_shared/output-location.md` | `<out>` + artifact registry | every skill that writes docs |
| `_shared/token-rules.md`, `anchor-map.md`, `reuse-audit.md` | dispatch + planning shapes | implement, fix, architect |
| `design-patterns/PATTERN_PLAYBOOK.md` | sanctioned patterns per layer | planning steps, agents |
| `rules/*.md`, `rules/modules/*.md` | path-scoped rules, module list | auto-loaded; module-cascade, refiner |
| `hooks/no-any-casts.cjs` | blocks `any`/`unknown` casts on Edit/Write | every edit |
| `tasks/lessons.md` | rules learned from corrections | fix S5, user |
