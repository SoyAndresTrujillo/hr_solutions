# Code Review: {{TICKET_ID}} — {{SHORT_DESCRIPTION}}

**Branch:** {{BRANCH_NAME}}
**Commit:** `{{COMMIT_HASH}}` — `{{COMMIT_MESSAGE}}`
**Date:** {{DATE}}

---

## Scope

{{SCOPE_DESCRIPTION}}

---

## Critical Issues (must fix)

{{CRITICAL_ISSUES}}

---

## Warnings (should fix)

{{WARNINGS}}

---

## Suggestions (nice to have)

{{SUGGESTIONS}}

---

## Team rules compliance

One row per rule the diff could violate. `n/a` when the diff cannot touch it. Rules and IDs:
`.claude/skills/_shared/team-rules.md`.

| Rule | Status | Notes |
|---|---|---|
{{TEAM_RULES_ROWS}}

---

## Requirements Compliance

| Requirement | Status | Notes |
|---|---|---|
{{REQUIREMENTS_ROWS}}

---

## Positive Highlights

{{POSITIVE_HIGHLIGHTS}}

---

## Metrics

| Metric | Value |
|---|---|
| Files reviewed | {{FILES_COUNT}} |
| Critical issues | {{CRITICAL_COUNT}} |
| Warnings | {{WARNINGS_COUNT}} |
| Suggestions | {{SUGGESTIONS_COUNT}} |
