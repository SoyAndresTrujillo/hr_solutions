# Follow-up Review: {{TICKET_ID}} — Commit `{{COMMIT_HASH}}`

**Branch:** {{BRANCH_NAME}}
**Commit:** `{{COMMIT_HASH}}` — `{{COMMIT_MESSAGE}}`
**Date:** {{DATE}}
**Base review:** [{{BASE_REVIEW_FILENAME}}](./{{BASE_REVIEW_FILENAME}})

---

## Resolved Issues

{{RESOLVED_ISSUES}}

---

## Still Open

{{STILL_OPEN_ISSUES}}

---

## New Issues

{{NEW_ISSUES}}

---

## Reconfirmed Resolved (from prior audit)

> Only populate when invoked with `--base-audit <path>` or when a prior audit doc is detected.
> One line per item: `- <ID> <file:L>: <prior verdict + brief evidence>`.
> Use this section to acknowledge items the user already decided — do NOT re-flag in Critical / Warning / Suggestion.

{{RECONFIRMED_RESOLVED}}

---

## Updated Requirements Compliance

| Requirement | Status | Notes |
|---|---|---|
{{REQUIREMENTS_ROWS}}

---

## Summary

| Category | Original | Resolved | Still Open |
|---|---|---|---|
| Critical | {{CRITICAL_ORIGINAL}} | {{CRITICAL_RESOLVED}} | {{CRITICAL_OPEN}} |
| Warnings | {{WARNINGS_ORIGINAL}} | {{WARNINGS_RESOLVED}} | {{WARNINGS_OPEN}} |
| Suggestions | {{SUGGESTIONS_ORIGINAL}} | {{SUGGESTIONS_RESOLVED}} | {{SUGGESTIONS_OPEN}} |

{{FINAL_ASSESSMENT}}
