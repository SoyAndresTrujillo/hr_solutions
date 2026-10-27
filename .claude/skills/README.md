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
│   ├─ /address-review <PR> (review threads + failing checks, never merges) ──▶ /ship
│   └─ /rebase-main (when the PR is behind or conflicting)
│
├─ MERGE + QA
│   ├─ /ship ──▶ /qa-report
│   └─ /qa-report ──▶ /e2e (scenario on the QA environment)
│
├─ RELEASE
│   ├─ /deploy-all ────────── tag <remote>/<main> HEAD → staging / production
│   └─ /cherry-pick-deploy ── last production tag → cherry-pick → tag → staging / production
│         both run _shared/tag-deploy.md T0–T4
│
├─ REVIEW (user-run)
│   ├─ /review-implementation ──routes──▶ /fix | /bug-bundle | /implement
│   └─ /code-reviewer ──(large diffs)──▶ ◆code-reviewer
│
└─ CONFIG
    └─ /eval-config ◀── config-change-reminder hook (after editing CLAUDE.md, rules, skills, agents, hooks)

Underneath every step (hooks, `.claude/settings.json`): secrets-guard · outward-gate · g0-gate ·
test-lock · no-any-casts · no-customer-literals · config-change-reminder.
```

## Pipelines

```
/implement <ID> [PARENT] "desc"
├─ S0   ⚙ ticket ingest ⛔ · branch <ID> in a worktree · ◆Explore ▣ anchor-map.md, progress.md
├─ S0.5 complexity: trivial → /fix · light (skip S2) · full · empty project → bootstrap M0
├─ S0.6 ⚙ ticket.mjs estimate ⛔
├─ S1   draft ◆ + critic ◇ functional.md, pict-model.md ▣ requirements-spec.md ⛔
├─ S2   ◆architect ▣ implementation-plan.md (+ Module order, reuse audit) · G0 ⛔ ▣ g0-approved.md
├─ S3   ◆backend → ◆frontend ▣ NNNa/NNNb phases ⛔
├─ S4   module cascade: per module ◆backend→◆frontend → tests → ≤2 fixes ▣ module-handoff ⛔ → wip commit
├─ S5   changed-file gate
└─ S6   /api-verify | /e2e | /import-e2e ▣ qa/e2e.mjs, e2e-results.md ⛔ ship-word ──▶ /create-pr

/fix <ID> [PARENT] "desc"
├─ S0 ingest + PR shape ▣ pr-shape.md, progress.md · branch · ◆Explore ⛔
├─ S1 ▣ bug-report.md ⛔ · S2 ◆architect ▣ root-cause.md ⛔ · S3 patch phases (G0 ▣ g0-approved.md) ⛔
├─ S4 test lock ▣ .claude/state/test-lock.json → implement (cascade when 2+ modules, ≤2 fix rounds) → unlock
└─ S5 /e2e | /api-verify ▣ qa/e2e.mjs ⛔ ship-word ──▶ /create-pr · ▣ tasks/lessons.md → rules/code-rules.md | hook | eval case

/bug-bundle <PARENT>
├─ P1 ⚙ ticket.mjs list + git log ▣ <PARENT>/bug-bundle-<round>.md, progress-<round>.md ⛔
├─ P2 ──▶ /fix per bug · P3 local matrix ▣ e2e-results-<round>.md
├─ P4 ──▶ /create-pr (bundle-fix, one review) · P5 ⚙ ticket.mjs comment --attach root-cause, e2e-results, review-findings / transition
└─ ──▶ /qa-report per ticket after deploy

/create-pr → fast gate → commit → ◆code-reviewer + REVIEW.md ▣ review-findings.md ⛔ Important → ⛔ push → template (◇ pr-shape.md, root-cause.md) → gh pr create → gh pr comment + ⚙ ticket.mjs comment --attach → ⚙ transition prOpened
/ship      → ⚙ comment + prOpened → CI (red → triage ▣ ci-triage.md) → ciGreen → deploy workflows → C3 ⛔ squash-merge (outward-gate) → QA deploy ──▶ /qa-report
/address-review <PR> → threads + checks → fix one at a time → ⛔ push → reply per thread → stop before merge
/qa-report → /e2e on qa → verdict ▣ ticket-comment.md ⛔ post → ⚙ transition qaFail|qaPass ▣ qa-results.md
/cherry-pick-deploy → ⛔ list → ⛔ env → cherry-pick → ⛔ tag push → ⛔ deploy → health check
/deploy-all → ⛔ env → main health → ⛔ list → ⛔ tag push → ⛔ deploy → health check
/refiner S6 → ⛔ approve → ⚙ ticket.mjs comment --attach functional.md
/eval-config → run cases in background → compare baseline → ⛔ replace baseline
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
| `_shared/ticket-comment.md` | short comment shape (≤10 bullets) | every `ticket.mjs comment` |
| `_shared/progress-tree.md` | live run checklist + resume | implement, fix, bug-bundle, sdlc-metrics |
| `_shared/tag-deploy.md` | env choice, tag, workflows, health (T0–T4) | deploy-all, cherry-pick-deploy |
| `REVIEW.md` | AI review passes + severity | create-pr S2.5, address-review |
| `evals/` | config regression cases | eval-config |
| `scripts/sdlc-metrics.mjs` | monthly process report | user |
| `_shared/output-location.md` | `<out>` + artifact registry | every skill that writes docs |
| `_shared/token-rules.md`, `anchor-map.md`, `reuse-audit.md` | dispatch + planning shapes | implement, fix, architect |
| `design-patterns/PATTERN_PLAYBOOK.md` | sanctioned patterns per layer | planning steps, agents |
| `rules/*.md`, `rules/modules/*.md` | path-scoped rules, module list | auto-loaded; module-cascade, refiner |
| `rules/code-rules.md` | lesson-derived editing rules | auto-loaded on product code; fed by fix S5.3, address-review |
| `hooks/*.cjs` | secrets, outward actions, G0, test lock, casts, literals, config reminder | every tool call (`settings.json`); self-check `hooks/test-hooks.sh` |
| `tasks/lessons.md` | rules learned from corrections | fix S5, user |
