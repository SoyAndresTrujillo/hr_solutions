# Step 1: Requirements Analysis

Turn the ticket into a spec whose every technical claim is backed by code that was actually read.

Dispatch one sub-agent (`subagent_type: "backend"`, or `"general-purpose"` when the work is web-heavy)
carrying the boilerplate from `_shared/token-rules.md` plus the assignment below.

## Sources, in priority order

1. `<out>/functional.md` — a `/refiner` definition, when one exists. It outranks everything: the
   behaviour is already settled with the product owner. Any question still open in `<out>/questions.md`
   becomes `CLARIFICATION NEEDED`, never a guess.
2. `<out>/ticket.md` written by Step 0. **Do not re-read the tracker.**
3. Session context (input mode 2).

Plus, when present, `<out>/test-design/pict-model.md` (optional PICT plugin, written by
`/requirements-analyst`). Its parameters, values and constraints become `## Constraints` lines, and
its case IDs are listed under `## Test design` so Steps 3–6 can cite them. It never overrides the
functional definition — a clash is a `CLARIFICATION NEEDED`. Absent → log
`pict-model.md not present — skipped` and continue.

The **Step 0 anchor map is the codebase exploration.** Read it; do not launch a second exploration pass
on top of it. Follow up only on a specific gap the anchor map leaves open, and say which gap.

## Phase A — draft

Write `<out>/requirements-spec.md` in compressed form (`_shared/token-rules.md` → Document compression):

```markdown
## Constraints
- Q-A: <one line per resolved question or constraint>

## Scope
- API: <modules, services, schemas touched>
- Web: <pages, components, forms, views touched>

## Test design
- <PICT case IDs, when pict-model.md exists — else omit the section>

## Risks
1. <risk + mitigation pointer>
```

Rules for the draft:
- Every technical claim cites a real `file:L` from the anchor map or from a read the agent performed.
- Anything the anchor map does not cover is marked `CLARIFICATION NEEDED`. Never guess.
- Use the actual table, column, endpoint and component names. Never invent a path or a symbol.
- Bootstrap (empty project): claims about code that does not exist yet cite the stack profile §Layout
  path it will live at, marked `new`.

**Task type detection:** a bug fix with a known root cause gets a lighter spec. Skip sections that do
not apply — the spec matches the task's complexity, not a fixed template.

## Phase B — critic pass

Launch **one** critic subagent (`general-purpose`, inheriting the router's model — this is the
adversarial half of the step, never pass a cheaper `model`) whose only job is to challenge the draft,
with the draft path and read access to the repo. It verifies every file reference, every
entity/column/relationship claim against the data models (stack profile §Layout: schema + repository
files), and every "existing pattern" claim; then it checks for the gaps below. It returns
`VERIFIED` / `UNVERIFIED` / `WRONG` / `MISSING` lists and a blunt confidence score out of 10.

The critic's report is **disposable** — consumed in reasoning, never written to disk.

### Gaps the critic must check

- **Data isolation** — whose data is this; does every query keep the ownership filter (team-rules §S8)?
- **Permissions** — which roles can do this, which cannot, which flags gate it?
- **Customization** — can a customer, role or feature flag change this behaviour? Route per
  `CLAUDE.md` §Customization (§S7).
- **Async side effects** — does this trigger a background job, queue message, email or notification?
- **Audit** — should the action be logged?
- **Form-to-DB mapping** — the data models are rarely flat; name every table a form field lands in.
- **Lifecycle** — how does it interact with the existing states of the record (draft, submitted,
  approved, cancelled…)?
- **Shared code** — does it change code used by other roles or flows (§S6)?
- **User-facing labels** — flag any text (UI, email, notification, PDF, error message) and name where
  it is sourced (stack profile §i18n, §B9); no hardcoded entity names.

### The three questions

When in doubt, answer these before writing the claim: What happens when this fails? Who can and cannot
do this? How does this affect other parts of the system?

## Phase C — refine

Fold the critic's findings into the spec. `WRONG` claims are corrected against the cited code;
`UNVERIFIED` claims become `CLARIFICATION NEEDED`; `MISSING` concerns get a section. The confidence
score is honest — 6/10 with named unknowns beats 9/10 with hidden assumptions.

## APPROVAL GATE (per router protocol)

```
Requirements analysis complete for <ID>.

Summary:
- Complexity: <rating>
- Scope: <backend/frontend/both>
- Sources: <functional.md | ticket.md | session> <+ pict-model.md>
- Key risks: <top 2-3>
- Open questions: <count>
- Confidence: <X>/10

Spec saved to: <out>/requirements-spec.md
```
Then `AskUserQuestion`: Approve / Request changes / Regenerate. HARD STOP until answered.
