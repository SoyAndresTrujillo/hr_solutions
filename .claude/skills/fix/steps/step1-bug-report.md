# Step 1: Repro + Symptom (Bug Report)

Subagent (`subagent_type: "backend"` or `"general-purpose"`):

1. Read `<out>/anchor-map.md`. Targeted ranges only for files >400 lines.
1.5. **Symptom source**, highest first — do not re-read the tracker:
   - `<out>/functional.md` from `/refiner` — outranks everything below when it exists.
   - `<out>/ticket.md` written by Step 0.
   - Args / session context.
   - `<out>/test-design/pict-model.md` when present — use its cases for the repro variants and the
     scope hints. Absent → skip, no log line needed.
2. From symptom + code: write `<out>/bug-report.md` (compressed style, `_shared/token-rules.md`).

## bug-report.md format
```markdown
## Symptom
<one line — what user/log sees>

## Repro
1. <step>
2. <step>
3. Expected: <X>. Actual: <Y>.

## Scope hints
- Variants affected (customers / feature flags): <list or "all">
- Roles affected: <list or "all">
- Env: <names from `environments` in the config — e.g. local / qa / production>

## Open questions
- Q1: <if any — block step 2 until answered>
```

## APPROVAL GATE (per router protocol)
```
Bug report for <ID>:
- Symptom: <line>
- Repro confidence: <high|med|low>
- Open questions: <count>

Saved: <out>/bug-report.md

Confirm repro. Proceed to root-cause?
```
Then `AskUserQuestion`. HARD STOP until answered.
