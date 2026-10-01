# Questions and Options — [TASK TITLE]

> Every question has an id `Q-##` matching its marker in `functional.md`.
> This is the only place where questions, options and decisions are recorded.
>
> When a question is hard to grasp in the abstract, put one short concrete example right in it — a line
> like "e.g. request A sent Monday, request B Tuesday for the same days — which counts?" removes more
> doubt than another sentence of explanation.
>
> **Status:** `OPEN` · `TO DECIDE` (options are on the table) · `RESOLVED`
> Once resolved, the decision is copied into the spec body, the marker is removed, and the entry
> moves down to "Resolved". The developer reads a clean spec and the "why" is not lost.
>
> **If you are answering offline:** write your answer in the **Decision** line and nothing else.
> Do not touch `Status` — it is recalculated the next time the task is refined. A non-empty Decision
> is how it knows the question was answered.

---

## Open

<!-- Copy this block for each new question. Delete the lines you do not use. -->

### Q-01 · Leave balance when a request expires

- **Status:** OPEN · **Decides:** Product owner
- **Question:** When a leave request expires with no manager decision, are the days held against the
  employee's leave balance given back, or do they stay reserved?
- **Decision:** —

### Q-02 · Wording of the answer-by field

- **Status:** TO DECIDE · **Decides:** Product owner
- **Question:** How is the deadline presented to the employee filling in the request?
- **Options:**
  - **A** — Label "Needs an answer by", nothing else. _(shortest; the employee may not realize the
    manager is locked out afterwards)_
  - **B** — Same label plus "Your manager cannot answer after this date". _(clearer)_ ← recommended
- **Decision:** —

### Q-04 · Requests already pending

- **Status:** TO DECIDE · **Decides:** Product owner · **⚠️ Needs dev input before asking the product owner**
- **Question:** Requests that are already pending have no deadline. What should they show?
- **Options:**
  - **A** — Leave them with no deadline; they never expire. _(nothing changes for requests in flight;
    two kinds of request coexist in the history)_
  - **B** — Give them a deadline calculated from the day they were sent. _(uniform behavior; requests
    sent long ago would expire the moment this ships)_
- **Decision:** —

### Q-05 · Notification when a request expires

- **Status:** OPEN · **Decides:** Product owner
- **Question:** When a request expires with no decision, is anyone notified, and who?
- **Decision:** —

---

## Resolved

> History. Never deleted: it is the record of why each thing was decided.

### Q-03 · Maximum window before expiration

- **Decided by:** Product owner, 2026-07-20
- **Question:** Is there an upper limit on how far out the answer-by date can be set?
- **Decision:** No limit — any future date is valid. Reflected in the spec ✔
